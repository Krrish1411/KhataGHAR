import React, { useState, useEffect } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { useVault } from '../../context/VaultContext';
import { syncEngine } from '../../services/sync/syncEngine';
import { P2PSyncModal } from '../sync/P2PSyncModal';
import {
  Smartphone,
  Laptop,
  ArrowLeftRight,
  ShieldCheck,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Crown,
  Layers,
  Sparkles,
} from 'lucide-react';

export const P2PSyncCard: React.FC = () => {
  const { activeVault } = useAuth();
  const { accounts, transactions } = useVault();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState(syncEngine.getStatus());
  const [connectedPeer, setConnectedPeer] = useState(syncEngine.getConnectedPeer());
  const [isMasterEstablished, setIsMasterEstablished] = useState(() => syncEngine.isMasterEstablished());

  useEffect(() => {
    const unsub = syncEngine.onStatusChange((status, peer) => {
      setSyncStatus(status);
      if (peer) setConnectedPeer(peer);
      setIsMasterEstablished(syncEngine.isMasterEstablished());
    });
    return unsub;
  }, []);

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

      {/* Main Card */}
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

        {/* Live Pairing Status Bar */}
        <div className="p-4 rounded-xl border border-line bg-moss/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`w-3 h-3 rounded-full shrink-0 ${
                syncStatus === 'connected'
                  ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                  : syncStatus === 'syncing'
                  ? 'bg-amber-500 animate-ping'
                  : syncStatus === 'waiting'
                  ? 'bg-amber-400 animate-pulse'
                  : syncStatus === 'connecting'
                  ? 'bg-blue-500 animate-spin'
                  : 'bg-ink/30'
              }`}
            />
            <div>
              <span className="font-bold text-xs text-ink block">
                {syncStatus === 'connected'
                  ? `Paired with ${connectedPeer?.deviceName || 'Remote Peer'}`
                  : syncStatus === 'syncing'
                  ? 'Transferring encrypted vault data...'
                  : syncStatus === 'waiting'
                  ? 'Waiting for device to connect...'
                  : 'No active device pair linked'}
              </span>
              <span className="text-[11px] text-ink/50 block">
                {isMasterEstablished
                  ? 'Primary master established: vaults mirror cleanly with zero duplication.'
                  : 'First-time setup: select which device is master to avoid clutter.'}
              </span>
            </div>
          </div>

          <Button
            onClick={() => setIsModalOpen(true)}
            variant="primary"
            size="sm"
          >
            <KeyRound className="w-3.5 h-3.5 mr-1.5" />
            <span>Open P2P Sync Hub</span>
          </Button>
        </div>

        {/* Feature Points */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs text-ink/70">
          <div className="p-3 rounded-xl border border-line bg-card/60 space-y-1">
            <div className="font-bold text-ink flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-500" />
              <span>Master Device Selection</span>
            </div>
            <p className="text-[11px] text-ink/50">
              Pick which device holds verified data so initial sync clones cleanly without duplicates.
            </p>
          </div>

          <div className="p-3 rounded-xl border border-line bg-card/60 space-y-1">
            <div className="font-bold text-ink flex items-center gap-1.5">
              <ArrowLeftRight className="w-3.5 h-3.5 text-pine-600" />
              <span>Instant Local Relay</span>
            </div>
            <p className="text-[11px] text-ink/50">
              Zero open ports, zero port-forwarding. Works seamlessly across Wi-Fi and mobile networks.
            </p>
          </div>

          <div className="p-3 rounded-xl border border-line bg-card/60 space-y-1">
            <div className="font-bold text-ink flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Native Notifications</span>
            </div>
            <p className="text-[11px] text-ink/50">
              Get immediate alerts on desktop & Android when a sync completes or pairing links.
            </p>
          </div>
        </div>
      </div>

      {/* P2P Sync Dialog Modal */}
      {isModalOpen && (
        <P2PSyncModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};
