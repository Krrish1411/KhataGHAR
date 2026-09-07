import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { unlockVault, reSyncMergedVault } from '../../services/storage';
import { deriveKey, verifyKey } from '../../services/crypto';
import { useAuth } from '../../context/AuthContext';
import { useVault } from '../../context/VaultContext';
import {
  RefreshCw,
  Shield,
  Lock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  KeyRound,
} from 'lucide-react';
import type { VaultData, VaultMeta } from '../../types';

interface SyncMergedVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  mergedVault: VaultMeta;
}

export const SyncMergedVaultModal: React.FC<SyncMergedVaultModalProps> = ({
  isOpen,
  onClose,
  mergedVault,
}) => {
  const { allVaults, activeVault, sessionKey, refreshVaultList } = useAuth();
  const activeVaultContextData = useVault();

  // Find constituent source vaults
  const constituentIds = mergedVault.mergedSourceVaultIds || [];
  const constituentVaults = allVaults.filter(
    (v) => !v.isMerged && (constituentIds.length === 0 || constituentIds.includes(v.id))
  );

  const isMergedActiveSession = activeVault?.id === mergedVault.id && Boolean(sessionKey);

  const [mergedPassword, setMergedPassword] = useState('');
  const [vaultPasswords, setVaultPasswords] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handlePasswordChange = (vaultId: string, val: string) => {
    setVaultPasswords((prev) => ({
      ...prev,
      [vaultId]: val,
    }));
  };

  const handleSyncSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSuccess(false);

    if (constituentVaults.length === 0) {
      setError('No constituent source vaults found to sync with.');
      return;
    }

    // 1. Resolve Merged Vault Key
    let finalMergedKey: CryptoKey;
    if (isMergedActiveSession && sessionKey) {
      finalMergedKey = sessionKey;
    } else {
      if (!mergedPassword) {
        setError(`Please enter the master password for "${mergedVault.name}".`);
        return;
      }
      try {
        const key = await deriveKey(mergedPassword, mergedVault.salt);
        const valid = await verifyKey(key, mergedVault.verifier);
        if (!valid) {
          setError(`Incorrect master password for "${mergedVault.name}".`);
          return;
        }
        finalMergedKey = key;
      } catch (err: any) {
        setError(err?.message || 'Failed to authenticate merged vault.');
        return;
      }
    }

    // 2. Validate passwords for locked constituent vaults
    for (const v of constituentVaults) {
      if (activeVault && v.id === activeVault.id) continue;
      if (!vaultPasswords[v.id]) {
        setError(`Please enter the master password for "${v.name}" to decrypt its latest records.`);
        return;
      }
    }

    setIsSyncing(true);
    setProgressMsg('Decrypting latest entries from source vaults...');

    try {
      const sourceVaultsData: Array<{ vault: VaultMeta; key: CryptoKey; data: VaultData }> = [];

      for (const v of constituentVaults) {
        if (activeVault && v.id === activeVault.id && sessionKey) {
          // Use in-memory active data
          sourceVaultsData.push({
            vault: v,
            key: sessionKey,
            data: {
              accounts: activeVaultContextData.accounts,
              transactions: activeVaultContextData.transactions,
              categories: activeVaultContextData.categories,
              peopleLedger: activeVaultContextData.peopleLedger,
              budgets: activeVaultContextData.budgets,
              goals: activeVaultContextData.goals,
              assets: activeVaultContextData.assets,
              liabilities: activeVaultContextData.liabilities,
              documents: activeVaultContextData.documents,
            },
          });
        } else {
          setProgressMsg(`Decrypting latest records for "${v.name}"...`);
          const decrypted = await unlockVault(v.id, vaultPasswords[v.id]);
          if (!decrypted) {
            throw new Error(`Incorrect password for vault "${v.name}". Please check the password.`);
          }
          sourceVaultsData.push({
            vault: decrypted.vault,
            key: decrypted.key,
            data: decrypted.data,
          });
        }
      }

      setProgressMsg('Consolidating latest transactions, balances, and assets...');
      await reSyncMergedVault({
        mergedVault,
        mergedVaultKey: finalMergedKey,
        sourceVaultsData,
      });

      await refreshVaultList();

      if (activeVault?.id === mergedVault.id) {
        await activeVaultContextData.reloadVaultData();
      }

      setProgressMsg('Synchronization complete!');
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Failed to sync merged vault.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-mari-500/10 text-mari-600 border border-mari-500/20 flex-shrink-0">
            <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold">
              Re-Sync Merged Enclave
            </span>
          </div>
        </div>
      }
      description={`Pull the latest transactions, updated accounts, and new assets from constituent vaults into "${mergedVault.name}".`}
      maxWidth="md"
    >
      <form onSubmit={handleSyncSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs rounded-xl font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isSuccess && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs rounded-xl font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{mergedVault.name} has been synchronized with all latest updates!</span>
          </div>
        )}

        {/* Merged Vault Authentication (if not currently active) */}
        {!isMergedActiveSession && (
          <div className="p-3.5 rounded-2xl bg-moss/70 border border-line space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink">
                Master Password for "{mergedVault.name}"
              </span>
              <Badge tone="sky" size="xs">
                Target Enclave
              </Badge>
            </div>
            <Input
              type="password"
              placeholder="Enter master password for the merged vault"
              value={mergedPassword}
              onChange={(e) => setMergedPassword(e.target.value)}
              required
              leftIcon={<KeyRound className="w-4 h-4" />}
            />
          </div>
        )}

        {/* Source Constituent Vaults */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-ink uppercase tracking-wider">
              Constituent Source Vaults ({constituentVaults.length})
            </span>
            <span className="text-[11px] text-ink/45">
              Zero-knowledge authorization
            </span>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
            {constituentVaults.map((v) => {
              const isActive = activeVault?.id === v.id;
              return (
                <div
                  key={v.id}
                  className="p-3 rounded-xl border border-line bg-card space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-pine-600" />
                      <span className="text-xs font-bold text-ink">{v.name}</span>
                    </div>
                    {isActive ? (
                      <Badge tone="pine" size="xs">
                        Current Session (Ready)
                      </Badge>
                    ) : (
                      <Badge tone="gray" size="xs">
                        Requires Password
                      </Badge>
                    )}
                  </div>

                  {!isActive && (
                    <Input
                      type="password"
                      placeholder={`Password for ${v.name}`}
                      value={vaultPasswords[v.id] || ''}
                      onChange={(e) => handlePasswordChange(v.id, e.target.value)}
                      required
                      leftIcon={<Lock className="w-3.5 h-3.5" />}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Status progress message */}
        {isSyncing && progressMsg && (
          <div className="p-3 rounded-xl bg-mari-50 dark:bg-mari-950/40 border border-mari-200 dark:border-mari-800 text-mari-700 dark:text-mari-300 text-xs font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4 animate-spin shrink-0" />
            <span>{progressMsg}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSyncing}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSyncing}
          >
            <span className="flex items-center gap-1.5">
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sync & Re-consolidate Now</span>
            </span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
