import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeftRight,
  ShieldCheck,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Laptop,
  X,
  Eye,
  EyeOff,
  Copy,
  Sparkles,
  Lock,
} from 'lucide-react';
import { syncEngine, detectPlatform } from '../../services/sync/syncEngine';
import type { SyncStatus, SyncPeerInfo } from '../../services/sync/syncTypes';
import type { VaultData, VaultMeta } from '../../types';
import { db } from '../../db';
import { generateSalt, deriveKey, generateVerifier, encryptData } from '../../services/crypto';
import { generateUUID } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useBodyScrollLock } from '../../utils/scrollLock';

interface WelcomeP2PSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const WelcomeP2PSyncModal: React.FC<WelcomeP2PSyncModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { setSessionCredentials, refreshVaultList } = useAuth();
  useBodyScrollLock(isOpen);

  const [activeTab, setActiveTab] = useState<'join' | 'host'>('join');
  const [pinInput, setPinInput] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [status, setStatus] = useState<SyncStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [connectedPeer, setConnectedPeer] = useState<SyncPeerInfo | null>(null);
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Local device identifier
  const [localDeviceName] = useState(() => {
    const platform = detectPlatform();
    const platName =
      platform === 'android' ? 'Android Phone' :
      platform === 'macos' ? 'Mac' :
      platform === 'windows' ? 'Windows PC' :
      platform === 'linux' ? 'Linux Desktop' : 'Web Device';
    return `${platName} (${Math.floor(100 + Math.random() * 900)})`;
  });

  // Keep ref of password so listener has fresh value
  const passwordRef = useRef(masterPassword);
  useEffect(() => {
    passwordRef.current = masterPassword;
  }, [masterPassword]);

  // Handle incoming state
  const handleApplyState = async (receivedState: VaultData, receivedMeta?: VaultMeta) => {
    try {
      setIsProcessing(true);
      setStatusMessage('Encrypting records locally with master key...');

      const pwdToUse = passwordRef.current.trim();
      if (!pwdToUse) {
        setErrorMsg('Please enter your Master Vault Password below to encrypt and unlock this device.');
        setIsProcessing(false);
        return;
      }

      const newSalt = generateSalt();
      const newKey = await deriveKey(pwdToUse, newSalt);
      const verifier = await generateVerifier(newKey);

      const restoredVault: VaultMeta = {
        ...(receivedMeta || {}),
        id: generateUUID(),
        name: receivedMeta?.name || 'My Master Vault',
        currency: receivedMeta?.currency || 'INR',
        numberFormat: receivedMeta?.numberFormat || 'indian',
        fyStartMonth: receivedMeta?.fyStartMonth || 4,
        includeInFamilyOverview: receivedMeta?.includeInFamilyOverview ?? true,
        autoLockMinutes: receivedMeta?.autoLockMinutes ?? 15,
        exchangeRates: receivedMeta?.exchangeRates || { USD: 83.5, EUR: 90.2, GBP: 105.4, AED: 22.7, SGD: 62.1, CAD: 61.2, AUD: 54.8 },
        isPrimary: true,
        createdAt: new Date().toISOString(),
        salt: newSalt,
        verifier,
      };

      await db.vaults.put(restoredVault);

      const encryptedRecords: Array<{
        id: string;
        vaultId: string;
        type: any;
        iv: string;
        ciphertext: string;
        updatedAt: string;
      }> = [];

      const types: Array<{ type: any; items: any[] }> = [
        { type: 'account', items: receivedState.accounts || [] },
        { type: 'transaction', items: receivedState.transactions || [] },
        { type: 'category', items: receivedState.categories || [] },
        { type: 'people', items: receivedState.peopleLedger || [] },
        { type: 'budget', items: receivedState.budgets || [] },
        { type: 'goal', items: receivedState.goals || [] },
        { type: 'asset', items: receivedState.assets || [] },
        { type: 'liability', items: receivedState.liabilities || [] },
        { type: 'document', items: receivedState.documents || [] },
        { type: 'plan', items: receivedState.plannedExpenses || [] },
        { type: 'note', items: (receivedState as any).notes || [] },
        { type: 'folder', items: (receivedState as any).folders || [] },
      ];

      for (const group of types) {
        for (const item of group.items) {
          item.vaultId = restoredVault.id;
          const enc = await encryptData(item, newKey);
          encryptedRecords.push({
            id: item.id,
            vaultId: restoredVault.id,
            type: group.type,
            iv: enc.iv,
            ciphertext: enc.ciphertext,
            updatedAt: item.updatedAt || new Date().toISOString(),
          });
        }
      }

      await db.records.bulkPut(encryptedRecords);

      // Persist master sync settings
      localStorage.setItem('khataghar_sync_masterEstablished', 'true');
      localStorage.setItem('khataghar_sync_masterRole', 'secondary');
      localStorage.setItem('khataghar_welcome_seen', 'true');
      if (connectedPeer?.deviceName) {
        localStorage.setItem('khataghar_sync_masterDeviceName', connectedPeer.deviceName);
      }

      setStatusMessage('Vault successfully synced & encrypted!');
      await refreshVaultList();
      setSessionCredentials(restoredVault, newKey);

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('[WelcomeSync] Sync error:', err);
      setErrorMsg(err?.message || 'Failed to encrypt and store synced vault.');
      setStatusMessage('');
    } finally {
      setIsProcessing(false);
    }
  };

  // Setup sync listeners on mount
  useEffect(() => {
    if (!isOpen) return;

    const unsubStatus = syncEngine.onStatusChange((newStatus, peer) => {
      setStatus(newStatus);
      if (peer) setConnectedPeer(peer);
    });

    const unsubState = syncEngine.onStateApply(async (receivedState, receivedMeta) => {
      await handleApplyState(receivedState, receivedMeta);
    });

    return () => {
      unsubStatus();
      unsubState();
    };
  }, [isOpen, connectedPeer]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  // Format 6-digit PIN display
  const formatPinDisplay = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 6);
    if (cleaned.length > 3) {
      return `${cleaned.slice(0, 3)} · ${cleaned.slice(3)}`;
    }
    return cleaned;
  };

  // Join Existing Session
  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pinInput.replace(/\D/g, '');
    if (cleanPin.length !== 6) {
      setErrorMsg('Please enter a valid 6-digit numeric PIN.');
      return;
    }
    if (!masterPassword.trim()) {
      setErrorMsg('Please enter your Master Vault Password to encrypt this device.');
      return;
    }

    setErrorMsg('');
    setIsProcessing(true);
    setStatusMessage('Locating existing device on encrypted relay...');

    try {
      await syncEngine.joinWithPin(cleanPin, localDeviceName, (msg: string) => {
        setStatusMessage(msg);
      });

      setStatusMessage('Connected! Requesting master vault payload...');
      await syncEngine.requestFullSync();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not connect to host device. Verify PIN and ensure KhataGHAR is open.');
      setIsProcessing(false);
    }
  };

  // Host Session
  const handleStartHosting = async () => {
    setErrorMsg('');
    setIsProcessing(true);
    setStatusMessage('Generating encrypted pairing session...');
    try {
      const pin = await syncEngine.hostSession(localDeviceName, (msg) => {
        setStatusMessage(msg);
      });
      setGeneratedPin(pin);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to initialize host pairing session.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyPin = () => {
    if (!generatedPin) return;
    navigator.clipboard.writeText(generatedPin);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in duration-150 select-none bg-black/80 backdrop-blur-md"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-3xl border border-line bg-card flex flex-col overflow-hidden shadow-2xl transition-all my-auto">
        {/* Ambient Top Glow */}
        <div className="pointer-events-none absolute -top-16 left-1/2 h-32 w-64 -translate-x-1/2 rounded-full blur-3xl opacity-20 bg-pine-500" />

        {/* Top Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-pine-600 via-pine-400 to-pine-600 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4 shrink-0 bg-moss/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-pine-500/30 bg-pine-500/10 text-pine-600 dark:text-pine-400 shadow-sm shrink-0">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-display text-sm sm:text-base font-extrabold tracking-tight truncate text-ink">
                  Direct P2P Device Sync
                </h3>
                <span className="rounded-full border border-pine-500/30 bg-pine-500/10 px-2 py-0.5 text-[9.5px] font-bold text-pine-700 dark:text-pine-300 shrink-0">
                  Zero Cloud
                </span>
              </div>
              <p className="text-[11px] text-ink/55 truncate">
                Instantly link this device to your existing KhataGHAR vault
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-line p-1.5 text-ink/40 hover:text-ink hover:bg-card transition cursor-pointer shrink-0 ml-2"
            aria-label="Close sync modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex border-b border-line bg-moss/30 px-5 pt-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('join');
              setErrorMsg('');
            }}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'join'
                ? 'border-pine-600 text-pine-700 dark:text-pine-300'
                : 'border-transparent text-ink/50 hover:text-ink'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Join Existing Session (Enter PIN)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('host');
              setErrorMsg('');
              if (!generatedPin) handleStartHosting();
            }}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'host'
                ? 'border-pine-600 text-pine-700 dark:text-pine-300'
                : 'border-transparent text-ink/50 hover:text-ink'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Host Session (Generate PIN)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-flare-100/80 dark:bg-flare-950/40 border border-flare-500/30 text-flare-700 dark:text-flare-300 text-xs font-medium flex items-start gap-2.5 anim-fade">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-flare-600" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          {statusMessage && (
            <div className="p-3 rounded-xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/80 dark:border-pine-800/40 text-pine-800 dark:text-pine-300 text-xs font-semibold flex items-center gap-2 anim-fade">
              <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${status === 'syncing' ? 'animate-spin' : ''}`} />
              <span className="truncate">{statusMessage}</span>
            </div>
          )}

          {/* TAB 1: JOIN (Enter PIN from other device) */}
          {activeTab === 'join' && (
            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-ink">
                  1. Enter 6-Digit Pairing PIN
                </label>
                <p className="text-[11.5px] text-ink/55">
                  Open KhataGHAR on your other device &gt; click <b>P2P Sync</b> in the top bar or sidebar, and enter the displayed PIN.
                </p>
                <div className="relative pt-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    placeholder="e.g. 482 · 915"
                    value={formatPinDisplay(pinInput)}
                    onChange={(e) => {
                      const numOnly = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setPinInput(numOnly);
                    }}
                    className="w-full text-center font-mono font-black text-2xl sm:text-3xl tracking-widest py-3 px-4 rounded-2xl border-2 border-line bg-card text-ink focus:border-pine-500 outline-none shadow-inner"
                    maxLength={9}
                    required
                  />
                </div>
              </div>

              {/* Master Password Input */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-ink">
                  2. Master Vault Password
                </label>
                <p className="text-[11.5px] text-ink/55">
                  Enter your existing vault password. KhataGHAR will derive a local AES-256 key to secure your records on this device.
                </p>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter existing vault password…"
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    className="w-full pr-10 pl-3.5 py-2.5 rounded-xl border border-line bg-card text-ink text-xs font-semibold focus:border-pine-500 outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink cursor-pointer p-1"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                disabled={isProcessing || pinInput.replace(/\D/g, '').length !== 6 || !masterPassword.trim()}
                className="w-full min-h-[46px] rounded-2xl bg-pine-700 hover:bg-pine-600 active:scale-[0.98] disabled:opacity-50 text-white font-display font-bold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Connecting &amp; Mirroring Enclave…</span>
                  </>
                ) : (
                  <>
                    <ArrowLeftRight className="w-4 h-4" />
                    <span>Connect &amp; Sync Master Vault</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: HOST (Generate PIN on this device) */}
          {activeTab === 'host' && (
            <div className="space-y-4">
              <div className="text-center space-y-2 py-2">
                <span className="text-[11.5px] font-bold text-ink/60 uppercase tracking-wider block">
                  Pairing PIN for other device
                </span>

                {generatedPin ? (
                  <div className="flex items-center justify-center gap-3">
                    <span className="font-mono text-3xl sm:text-4xl font-black text-pine-600 dark:text-pine-400 tracking-widest bg-moss/70 px-5 py-2.5 rounded-2xl border border-line">
                      {formatPinDisplay(generatedPin)}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyPin}
                      className="p-3 rounded-2xl border border-line bg-card hover:bg-moss text-ink transition cursor-pointer"
                      title="Copy PIN"
                    >
                      {isCopied ? <CheckCircle2 size={20} className="text-pine-600" /> : <Copy size={20} />}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartHosting}
                    disabled={isProcessing}
                    className="px-5 py-2.5 rounded-2xl bg-pine-700 hover:bg-pine-600 text-white font-bold text-xs shadow-sm cursor-pointer"
                  >
                    Generate New Pairing PIN
                  </button>
                )}

                <p className="text-[11px] text-ink/50 max-w-sm mx-auto pt-1">
                  On your other device, go to P2P Sync &gt; Join Session, and enter this 6-digit code.
                </p>
              </div>

              {/* Master Password Input for when data arrives */}
              <div className="space-y-1.5 pt-2 border-t border-line">
                <label className="block text-xs font-bold text-ink">
                  Master Password to secure this device
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter master password…"
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    className="w-full pr-10 pl-3.5 py-2.5 rounded-xl border border-line bg-card text-ink text-xs font-semibold focus:border-pine-500 outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink cursor-pointer p-1"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Peer Connected Status */}
              {connectedPeer && (
                <div className="p-3.5 rounded-2xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200 text-pine-800 dark:text-pine-200 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-pine-600" />
                    <span>Connected to <b>{connectedPeer.deviceName}</b></span>
                  </div>
                  <button
                    type="button"
                    disabled={isProcessing || !masterPassword.trim()}
                    onClick={() => syncEngine.requestFullSync()}
                    className="px-3 py-1.5 rounded-xl bg-pine-700 hover:bg-pine-600 text-white font-bold text-xs disabled:opacity-50 cursor-pointer"
                  >
                    Pull Master
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Zero Cloud Guarantee Badge */}
          <div className="p-3 rounded-2xl bg-moss/60 border border-line flex items-start gap-2.5 text-xs text-ink/65 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-pine-600 dark:text-pine-400 shrink-0 mt-0.5" />
            <span>
              End-to-end encrypted wire (AES-256-GCM) with random 50,000-iteration PBKDF2 keys derived directly from the numeric PIN. Zero cloud storage or intermediary logs.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-line px-5 py-3 text-xs shrink-0 bg-moss/40">
          <span className="text-[11px] text-ink/45">
            This Device: <b className="text-ink/70">{localDeviceName}</b>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line bg-card hover:bg-moss px-3.5 py-1.5 text-xs font-semibold text-ink transition cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
