import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { useVault } from '../../context/VaultContext';
import { syncEngine, detectPlatform } from '../../services/sync/syncEngine';
import { importPlainSnapshot } from '../../services/backup';
import type { SyncStatus, SyncPeerInfo, DeviceStats } from '../../services/sync/syncTypes';
import type { VaultData, VaultMeta } from '../../types';
import { sendNativeNotification, requestNotificationPermission } from '../../utils/nativeNotification';
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
  Crown,
  Download,
  Upload,
  Layers,
  Sparkles,
  Bell,
  Unlink,
  Monitor,
} from 'lucide-react';

interface P2PSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const P2PSyncModal: React.FC<P2PSyncModalProps> = ({ isOpen, onClose }) => {
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

  const [activeTab, setActiveTab] = useState<'host' | 'join'>('host');
  const [sessionPin, setSessionPin] = useState<string | null>(syncEngine.getActivePin());
  const [inputPin, setInputPin] = useState('');
  const [status, setStatus] = useState<SyncStatus>(syncEngine.getStatus());
  const [connectedPeer, setConnectedPeer] = useState<SyncPeerInfo | null>(syncEngine.getConnectedPeer());
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [hasCopiedPin, setHasCopiedPin] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMasterEstablished, setIsMasterEstablished] = useState(() => syncEngine.isMasterEstablished());
  const [notificationsAllowed, setNotificationsAllowed] = useState(false);

  const localPlatform = useMemo(() => detectPlatform(), []);
  const localDeviceName = useMemo(() => {
    if (localPlatform === 'macos') return 'MacBook / Mac Desktop';
    if (localPlatform === 'windows') return 'Windows Workstation';
    if (localPlatform === 'linux') return 'Linux Desktop';
    if (localPlatform === 'android') return 'Android Phone';
    return 'Web Browser Device';
  }, [localPlatform]);

  const localStats: DeviceStats = useMemo(() => ({
    accountsCount: accounts.length,
    transactionsCount: transactions.length,
    assetsCount: assets.length,
    notesCount: notes ? notes.length : 0,
    peopleCount: peopleLedger.length,
    isFreshSeed: transactions.length === 0 && accounts.length <= 2,
  }), [accounts.length, transactions.length, assets.length, notes, peopleLedger.length]);

  // Register state getters and listeners on mount
  useEffect(() => {
    syncEngine.registerLocalStateGetter(() => ({
      data: getDecryptedVaultData(),
      meta: activeVault || undefined,
    }));

    const unsubStatus = syncEngine.onStatusChange((newStatus, peer) => {
      setStatus(newStatus);
      if (peer) setConnectedPeer(peer);
      setIsMasterEstablished(syncEngine.isMasterEstablished());
    });

    const unsubState = syncEngine.onStateApply(async (receivedState, receivedMeta) => {
      try {
        const metaToUse: VaultMeta = receivedMeta || activeVault || {
          id: 'synced-vault-' + Date.now(),
          name: 'KhataGHAR Enclave',
          salt: 'salt',
          verifier: 'verifier',
          createdAt: new Date().toISOString(),
          currency: 'INR',
          numberFormat: 'indian',
          fyStartMonth: 4,
          isPrimary: true,
          includeInFamilyOverview: true,
          autoLockMinutes: 5,
          exchangeRates: { USD: 86.5, EUR: 92.0, GBP: 110.0 },
        };

        const snapshotJson = JSON.stringify({
          app: 'KhataGHAR',
          format: 'khataghar-portable-snapshot',
          version: 2,
          isEncrypted: false,
          vaultMeta: metaToUse,
          data: receivedState,
        });

        const imported = await importPlainSnapshot(
          snapshotJson,
          sessionPin || 'khataghar-sync-pin',
          `${metaToUse.name} (Synced)`
        );

        await refreshVaultList();
        setSessionCredentials(imported.vault, imported.key);
        await reloadVaultData();

        setStatusMessage('Vault successfully updated and verified!');
      } catch (e: any) {
        console.error('[Sync] Failed to apply received state:', e);
        setStatusMessage('Failed to import synced vault: ' + e.message);
      }
    });

    const unsubMaster = syncEngine.onMasterSetup((event) => {
      setIsMasterEstablished(true);
      setStatusMessage(`Master sync complete! Primary source: ${event.masterDeviceName}`);
    });

    // Check notification permissions
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationsAllowed(Notification.permission === 'granted');
    }

    return () => {
      unsubStatus();
      unsubState();
      unsubMaster();
    };
  }, [activeVault, sessionPin]);

  // Host: Generate PIN
  const handleStartHosting = async () => {
    try {
      setIsSyncing(true);
      setStatusMessage('Initializing encrypted host session...');
      const pin = await syncEngine.hostSession(localDeviceName, (msg) => {
        setStatusMessage(msg);
      });
      setSessionPin(pin);
    } catch (err: any) {
      setStatusMessage('Failed to create host session: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Join: Connect using PIN
  const handleJoinSession = async () => {
    if (!inputPin.trim()) return;
    try {
      setIsSyncing(true);
      setStatusMessage(`Searching for host session with PIN ${inputPin}...`);
      await syncEngine.joinWithPin(inputPin.trim(), localDeviceName, (msg) => {
        setStatusMessage(msg);
      });
      setSessionPin(inputPin.trim());
    } catch (err: any) {
      setStatusMessage('Failed to connect: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Master Selection 1: Make Local Master (Push clean clone, overwrite peer to avoid duplicates)
  const handleMakeLocalMaster = async () => {
    if (!activeVault) return;
    try {
      setIsSyncing(true);
      setStatusMessage('Pushing verified master vault to connected peer...');
      const data = getDecryptedVaultData();
      await syncEngine.forceCloneToPeer(data, activeVault, localDeviceName);
      setIsMasterEstablished(true);
      setStatusMessage(`This device is now Master! Cloned ${accounts.length} accounts & ${transactions.length} entries to ${connectedPeer?.deviceName}.`);
    } catch (err: any) {
      setStatusMessage('Failed to clone master: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Master Selection 2: Make Peer Master (Pull from remote)
  const handleMakePeerMaster = async () => {
    try {
      setIsSyncing(true);
      setStatusMessage(`Awaiting clean master vault clone from ${connectedPeer?.deviceName || 'peer'}...`);
      await syncEngine.sendRoleSelection('clone_to_peer', connectedPeer?.deviceName || 'Peer Device');
    } catch (err: any) {
      setStatusMessage('Error requesting remote master: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Two-Way Sync
  const handlePushFullSync = async () => {
    if (!activeVault) return;
    try {
      setIsSyncing(true);
      setStatusMessage('Broadcasting live vault updates to peer...');
      const data = getDecryptedVaultData();
      await syncEngine.broadcastFullState(data, activeVault);
      setStatusMessage('Live synchronization complete!');
    } catch (err: any) {
      setStatusMessage('Sync failed: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    await syncEngine.disconnect(true);
    setSessionPin(null);
    setConnectedPeer(null);
    setInputPin('');
    setStatusMessage('Device pairing disconnected.');
  };

  const handleCopyPin = () => {
    if (!sessionPin) return;
    navigator.clipboard.writeText(sessionPin.replace(/\s+/g, ''));
    setHasCopiedPin(true);
    setTimeout(() => setHasCopiedPin(false), 2000);
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotificationsAllowed(granted);
    if (granted) {
      sendNativeNotification({
        title: 'KhataGHAR Notifications Enabled',
        body: 'You will receive desktop & device notifications when vaults synchronize.',
      });
    }
  };

  const renderPlatformIcon = (platform?: string) => {
    switch (platform) {
      case 'android':
        return <Smartphone className="w-5 h-5 text-emerald-600" />;
      case 'windows':
      case 'linux':
      case 'macos':
        return <Laptop className="w-5 h-5 text-pine-600" />;
      default:
        return <Monitor className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-pine-50 dark:bg-pine-950/40 text-pine-600 border border-pine-200/60 dark:border-pine-800/40 shadow-xs">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold text-ink">
                P2P Device Sync & Pairing
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pine-600 text-white shadow-2xs">
                Zero-Knowledge
              </span>
            </div>
            <span className="block text-xs text-ink/50">
              Direct device-to-device encrypted wire via 6-digit numeric PIN
            </span>
          </div>
        </div>
      }
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Top Connection Status Ribbon */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-moss/70 border border-line text-xs">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                status === 'connected'
                  ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                  : status === 'syncing'
                  ? 'bg-amber-500 animate-ping'
                  : status === 'waiting'
                  ? 'bg-amber-400 animate-pulse'
                  : status === 'connecting'
                  ? 'bg-blue-500 animate-spin'
                  : 'bg-ink/30'
              }`}
            />
            <span className="font-bold text-ink">
              {status === 'connected'
                ? `Connected to ${connectedPeer?.deviceName || 'Peer'}`
                : status === 'syncing'
                ? 'Syncing vault records...'
                : status === 'waiting'
                ? 'Waiting for peer to enter PIN...'
                : status === 'connecting'
                ? 'Connecting to peer...'
                : 'Not Paired'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!notificationsAllowed && (
              <button
                onClick={handleEnableNotifications}
                className="text-[11px] font-semibold text-pine-600 dark:text-pine-400 hover:underline flex items-center gap-1 cursor-pointer"
                title="Enable Native OS Notifications"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Enable Alerts</span>
              </button>
            )}
            {status === 'connected' && (
              <button
                onClick={handleDisconnect}
                className="text-[11px] font-semibold text-flare-600 dark:text-flare-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Unlink className="w-3 h-3" />
                <span>Unlink</span>
              </button>
            )}
          </div>
        </div>

        {/* Mode Selector (When Not Connected) */}
        {status !== 'connected' && (
          <div className="space-y-4">
            <div className="flex p-1 rounded-xl bg-moss border border-line max-w-sm mx-auto">
              <button
                onClick={() => {
                  setActiveTab('host');
                  setStatusMessage('');
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'host'
                    ? 'bg-card text-ink shadow-2xs border border-line'
                    : 'text-ink/60 hover:text-ink'
                }`}
              >
                <Upload className="w-3.5 h-3.5 text-pine-600" />
                <span>Send / Host PIN</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('join');
                  setStatusMessage('');
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'join'
                    ? 'bg-card text-ink shadow-2xs border border-line'
                    : 'text-ink/60 hover:text-ink'
                }`}
              >
                <Download className="w-3.5 h-3.5 text-pine-600" />
                <span>Receive / Enter PIN</span>
              </button>
            </div>

            {/* Host View */}
            {activeTab === 'host' && (
              <div className="space-y-4 text-center p-5 rounded-2xl border border-line bg-card/60">
                {!sessionPin ? (
                  <div className="space-y-3">
                    <p className="text-xs text-ink/70 max-w-md mx-auto">
                      Generate a temporary 6-digit PIN on this device. Enter the same PIN on your phone or other computer to link them securely.
                    </p>
                    <Button
                      onClick={handleStartHosting}
                      variant="primary"
                      size="md"
                      disabled={isSyncing}
                    >
                      <KeyRound className="w-4 h-4 mr-2" />
                      <span>Generate 6-Digit Pairing PIN</span>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <span className="text-xs text-ink/60 font-semibold block uppercase tracking-wider">
                      Pairing PIN (Enter on Target Device)
                    </span>
                    <div className="flex items-center justify-center gap-3">
                      <div className="font-mono font-black text-4xl sm:text-5xl text-pine-700 dark:text-pine-400 tracking-widest py-2 px-6 rounded-2xl bg-pine-50/80 dark:bg-pine-950/40 border border-pine-200 dark:border-pine-800">
                        {sessionPin}
                      </div>
                      <button
                        onClick={handleCopyPin}
                        className="p-3 rounded-xl border border-line bg-card hover:bg-moss text-ink/70 transition-colors cursor-pointer shadow-2xs"
                        title="Copy PIN"
                      >
                        {hasCopiedPin ? <Check className="w-5 h-5 text-pine-600" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-xs text-ink/50 pt-1">
                      <span className="w-2 h-2 rounded-full bg-pine-500 animate-ping" />
                      <span>Broadcasting secure channel... waiting for connection</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Join View */}
            {activeTab === 'join' && (
              <div className="space-y-4 p-5 rounded-2xl border border-line bg-card/60 max-w-md mx-auto text-center">
                <span className="text-xs text-ink/70 block">
                  Enter the 6-digit PIN displayed on your host device:
                </span>
                <div className="flex items-center justify-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="849201"
                    maxLength={7}
                    value={inputPin}
                    onChange={(e) => setInputPin(e.target.value.replace(/\D/g, ''))}
                    className="w-48 text-center px-4 py-2.5 rounded-xl border border-line bg-card font-mono text-2xl font-bold tracking-widest text-ink placeholder:text-ink/20 outline-none focus:border-pine-500"
                  />
                  <Button
                    onClick={handleJoinSession}
                    variant="primary"
                    size="md"
                    disabled={inputPin.length < 6 || isSyncing}
                  >
                    <span>Connect</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CONNECTED STATE: Master Device Selection vs Active Sync Hub */}
        {status === 'connected' && (
          <div className="space-y-5">
            {/* Step 1: Initial Master Device Selection Dialog */}
            {!isMasterEstablished ? (
              <div className="space-y-4 p-5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 shadow-sm">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm text-ink">
                      Initial Pairing: Choose Primary Master Device
                    </h4>
                    <p className="text-xs text-ink/70 mt-0.5">
                      To prevent duplicate entries and account clutter, select which device holds your verified data. That device will clone its vault cleanly to the other:
                    </p>
                  </div>
                </div>

                {/* Side-by-Side Device Comparison Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {/* Left Device Card: This Device */}
                  <div className="p-4 rounded-xl border border-pine-300 dark:border-pine-800 bg-card shadow-xs flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {renderPlatformIcon(localPlatform)}
                          <span className="font-bold text-xs text-ink">{localDeviceName}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pine-100 text-pine-800 dark:bg-pine-900/60 dark:text-pine-300">
                          This Device
                        </span>
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-ink/70">
                        <div className="flex justify-between">
                          <span>Accounts:</span>
                          <b className="text-ink">{localStats.accountsCount}</b>
                        </div>
                        <div className="flex justify-between">
                          <span>Transactions:</span>
                          <b className="text-ink">{localStats.transactionsCount}</b>
                        </div>
                        <div className="flex justify-between">
                          <span>Assets &amp; Liabilities:</span>
                          <b className="text-ink">{localStats.assetsCount}</b>
                        </div>
                        <div className="flex justify-between">
                          <span>Notes &amp; Folders:</span>
                          <b className="text-ink">{localStats.notesCount}</b>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={handleMakeLocalMaster}
                      variant="primary"
                      size="sm"
                      className="w-full justify-center"
                      disabled={isSyncing}
                    >
                      <Crown className="w-3.5 h-3.5 mr-1 text-amber-300" />
                      <span>Make This Device Master</span>
                    </Button>
                  </div>

                  {/* Right Device Card: Connected Peer */}
                  <div className="p-4 rounded-xl border border-line bg-card shadow-xs flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {renderPlatformIcon(connectedPeer?.platform)}
                          <span className="font-bold text-xs text-ink">
                            {connectedPeer?.deviceName || 'Connected Peer'}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-moss text-ink/60 border border-line">
                          Remote
                        </span>
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-ink/70">
                        <div className="flex justify-between">
                          <span>Accounts:</span>
                          <b className="text-ink">{connectedPeer?.stats?.accountsCount ?? '—'}</b>
                        </div>
                        <div className="flex justify-between">
                          <span>Transactions:</span>
                          <b className="text-ink">{connectedPeer?.stats?.transactionsCount ?? '—'}</b>
                        </div>
                        <div className="flex justify-between">
                          <span>Assets &amp; Liabilities:</span>
                          <b className="text-ink">{connectedPeer?.stats?.assetsCount ?? '—'}</b>
                        </div>
                        <div className="flex justify-between">
                          <span>Notes:</span>
                          <b className="text-ink">{connectedPeer?.stats?.notesCount ?? '—'}</b>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={handleMakePeerMaster}
                      variant="secondary"
                      size="sm"
                      className="w-full justify-center"
                      disabled={isSyncing}
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      <span>Pull Master from Remote</span>
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* Step 2: Active Established Sync Hub */
              <div className="space-y-4 p-5 rounded-2xl bg-pine-50/50 dark:bg-pine-950/20 border border-pine-200 dark:border-pine-800/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-pine-600 text-white shadow-sm">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-sm text-ink flex items-center gap-2">
                        <span>Vaults Paired &amp; Synchronized</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                          Live Active
                        </span>
                      </h4>
                      <p className="text-xs text-ink/60 mt-0.5">
                        Linked with <b>{connectedPeer?.deviceName}</b> ({connectedPeer?.platform}). Any subsequent changes sync seamlessly both ways.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    onClick={handlePushFullSync}
                    variant="primary"
                    size="sm"
                    disabled={isSyncing}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Sync Now</span>
                  </Button>
                  <Button
                    onClick={() => setIsMasterEstablished(false)}
                    variant="secondary"
                    size="sm"
                  >
                    <Crown className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                    <span>Change Master Device</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Live Status Message Banner */}
        {statusMessage && (
          <div className="p-3 rounded-xl border border-line bg-card text-xs font-semibold flex items-center gap-2.5 text-ink animate-in fade-in">
            {isSyncing ? (
              <RefreshCw className="w-4 h-4 text-pine-600 animate-spin shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Bottom Footer Information */}
        <div className="pt-2 border-t border-line flex items-center justify-between text-[11px] text-ink/50">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-pine-600" />
            <span>End-to-End Encrypted Wire (AES-256-GCM)</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
