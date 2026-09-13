import React, { useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { useVault } from '../../context/VaultContext';
import { P2PSyncSession, type P2PProgress } from '../../services/p2pSync';
import { importPlainSnapshot } from '../../services/backup';
import type { VaultData } from '../../types';
import {
  Smartphone,
  Laptop,
  ArrowLeftRight,
  ShieldCheck,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';

export const P2PSyncCard: React.FC = () => {
  const { activeVault, refreshVaultList, setSessionCredentials } = useAuth();
  const {
    accounts,
    transactions,
    categories,
    peopleLedger,
    budgets,
    goals,
    assets,
    liabilities,
    documents,
    plannedExpenses,
    notes,
    folders,
    reloadVaultData,
  } = useVault();

  const getDecryptedVaultData = (): VaultData => ({
    accounts,
    transactions,
    categories,
    peopleLedger,
    budgets,
    goals,
    assets,
    liabilities,
    documents,
    plannedExpenses,
    notes,
    folders,
  });

  const [activeMode, setActiveMode] = useState<'send' | 'receive'>('send');
  const [sessionPin, setSessionPin] = useState<string | null>(null);
  const [inputPin, setInputPin] = useState('');
  const [progress, setProgress] = useState<P2PProgress>({
    status: 'idle',
    message: '',
  });
  const [hasCopiedPin, setHasCopiedPin] = useState(false);
  const [syncSession, setSyncSession] = useState<P2PSyncSession | null>(null);

  // Host session (Send data to another phone/PC)
  const handleStartHostSession = async () => {
    if (!activeVault) return;
    const session = new P2PSyncSession((p) => {
      setProgress(p);
      if (p.pin) setSessionPin(p.pin);
    });
    setSyncSession(session);

    try {
      const data = getDecryptedVaultData();
      const payload = {
        vaultMeta: activeVault,
        data,
        timestamp: new Date().toISOString(),
      };
      await session.hostSession(payload);
    } catch (err: any) {
      setProgress({
        status: 'error',
        message: 'Failed to initialize pairing session: ' + err.message,
      });
    }
  };

  // Client session (Receive data by entering 6-digit PIN)
  const handleJoinSession = async () => {
    if (!inputPin.trim()) return;

    const session = new P2PSyncSession((p) => {
      setProgress(p);
    });
    setSyncSession(session);

    try {
      await session.joinSession(inputPin.trim(), async (receivedPayload) => {
        if (!receivedPayload.vaultMeta || !receivedPayload.data) {
          throw new Error('Invalid vault payload received.');
        }

        const snapshotJson = JSON.stringify({
          app: 'KhataGHAR',
          format: 'khataghar-portable-snapshot',
          version: 2,
          isEncrypted: false,
          vaultMeta: receivedPayload.vaultMeta,
          data: receivedPayload.data,
        });

        const imported = await importPlainSnapshot(
          snapshotJson,
          inputPin.trim(),
          `${receivedPayload.vaultMeta.name} (Synced)`
        );

        await refreshVaultList();
        setSessionCredentials(imported.vault, imported.key);
        await reloadVaultData();
      });
    } catch (err: any) {
      setProgress({
        status: 'error',
        message: 'Sync failed: ' + err.message,
      });
    }
  };

  const handleCopyPin = () => {
    if (!sessionPin) return;
    navigator.clipboard.writeText(sessionPin.replace(/\s+/g, ''));
    setHasCopiedPin(true);
    setTimeout(() => setHasCopiedPin(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Title Header */}
      <div>
        <h3 className="font-display font-bold text-base sm:text-lg text-ink">
          P2P Encrypted Device Sync (6-Digit PIN)
        </h3>
        <p className="text-xs text-ink/60 mt-0.5">
          Synchronize your entire financial vault directly between your PC and Android phone over an end-to-end encrypted channel. Zero cloud servers, zero tracking.
        </p>
      </div>

      {/* Main Sync Card */}
      <div className="rounded-2xl border border-line bg-card p-5 sm:p-6 space-y-5 shadow-sm lift">
        {/* Device pairing illustration banner */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-pine-50/70 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-card border border-line grid place-items-center text-pine-600 shadow-2xs">
              <ArrowLeftRight className="w-5 h-5" />
            </span>
            <div>
              <div className="font-display font-bold text-sm text-ink flex items-center gap-2">
                <span>End-to-End Encrypted Wire (AES-256-GCM)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pine-600 text-white">
                  Zero-Knowledge
                </span>
              </div>
              <p className="text-xs text-ink/60 mt-0.5">
                The 6-digit PIN securely derives a one-time encryption key via PBKDF2. No third party can read your data.
              </p>
            </div>
          </div>
        </div>

        {/* Segmented Mode Selector: Send vs Receive */}
        <div className="flex p-1 rounded-xl bg-moss border border-line max-w-sm">
          <button
            onClick={() => {
              setActiveMode('send');
              setProgress({ status: 'idle', message: '' });
              setSessionPin(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeMode === 'send'
                ? 'bg-card text-ink shadow-2xs border border-line'
                : 'text-ink/60 hover:text-ink'
            }`}
          >
            <Laptop className="w-3.5 h-3.5 text-pine-600" />
            <span>Send from this Device</span>
          </button>
          <button
            onClick={() => {
              setActiveMode('receive');
              setProgress({ status: 'idle', message: '' });
              setSessionPin(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeMode === 'receive'
                ? 'bg-card text-ink shadow-2xs border border-line'
                : 'text-ink/60 hover:text-ink'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-pine-600" />
            <span>Receive on this Device</span>
          </button>
        </div>

        {/* Send Mode: Generate PIN */}
        {activeMode === 'send' && (
          <div className="space-y-4">
            {!sessionPin ? (
              <div className="space-y-2">
                <p className="text-xs text-ink/70">
                  Ready to stream current vault <b>"{activeVault?.name}"</b> to another phone or computer.
                </p>
                <Button
                  onClick={handleStartHostSession}
                  variant="primary"
                  size="sm"
                >
                  <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                  <span>Generate 6-Digit Pairing PIN</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-3 p-5 rounded-xl border border-line bg-card/60 text-center">
                <span className="text-xs text-ink/60 font-semibold block">
                  Enter this PIN on your target device:
                </span>

                <div className="flex items-center justify-center gap-3">
                  <div className="font-mono font-black text-3xl sm:text-4xl text-pine-700 dark:text-pine-400 tracking-wider">
                    {sessionPin}
                  </div>
                  <button
                    onClick={handleCopyPin}
                    className="p-2 rounded-xl border border-line bg-card hover:bg-moss text-ink/70 transition-colors cursor-pointer"
                    title="Copy PIN"
                  >
                    {hasCopiedPin ? <Check className="w-4 h-4 text-pine-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-ink/50 pt-1">
                  <span className="w-2 h-2 rounded-full bg-pine-500 animate-ping" />
                  <span>Listening for connection…</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Receive Mode: Enter 6-digit PIN */}
        {activeMode === 'receive' && (
          <div className="space-y-4">
            <p className="text-xs text-ink/70">
              Enter the 6-digit pairing PIN shown on the sending device:
            </p>

            <div className="flex items-center gap-2 max-w-sm">
              <input
                type="text"
                placeholder="e.g. 849201"
                maxLength={7}
                value={inputPin}
                onChange={(e) => setInputPin(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl border border-line bg-card font-mono text-lg font-bold tracking-widest text-ink placeholder:text-ink/30 outline-none focus:border-pine-500"
              />
              <Button
                onClick={handleJoinSession}
                variant="primary"
                size="sm"
                disabled={!inputPin.trim() || progress.status === 'connecting'}
              >
                <span>Connect & Sync</span>
              </Button>
            </div>
          </div>
        )}

        {/* Status Message Strip */}
        {progress.message && (
          <div
            className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              progress.status === 'synced'
                ? 'bg-pine-50 dark:bg-pine-950/40 border-pine-200 text-pine-700 dark:text-pine-300'
                : progress.status === 'error'
                ? 'bg-flare-50 dark:bg-flare-950/40 border-flare-200 text-flare-700 dark:text-flare-300'
                : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 text-indigo-700 dark:text-indigo-300'
            }`}
          >
            {progress.status === 'synced' ? (
              <CheckCircle2 className="w-4 h-4 text-pine-600 shrink-0" />
            ) : progress.status === 'error' ? (
              <AlertCircle className="w-4 h-4 text-flare-600 shrink-0" />
            ) : (
              <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
            )}
            <span>{progress.message}</span>
          </div>
        )}
      </div>
    </div>
  );
};
