import React, { useState } from 'react';
import { useVault } from '../../context/VaultContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { ShieldAlert, KeyRound, CheckCircle2, Lock } from 'lucide-react';

export const VaultRecoveryModal: React.FC = () => {
  const { needsMigrationRecovery, recoverVaultData, dismissMigrationRecovery } = useVault();
  const { lockVault, activeVault } = useAuth();

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  if (!needsMigrationRecovery) return null;

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsRecovering(true);
    setError('');

    try {
      const result = await recoverVaultData(password);
      if (result.success) {
        setSuccessCount(result.count);
        setTimeout(() => {
          setPassword('');
          setSuccessCount(null);
        }, 2000);
      } else {
        setError(result.error || 'Incorrect master password. Please try again.');
      }
    } catch (err: any) {
      setError(err?.message || 'Data recovery failed. Please check your password.');
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <Modal
      isOpen={needsMigrationRecovery}
      onClose={dismissMigrationRecovery}
      title={
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-ink text-base">Vault Data Migration Required</h3>
            <p className="text-xs text-ink-muted">Upgrade to 600,000 PBKDF2 iterations</p>
          </div>
        </div>
      }
    >
      <div className="space-y-4 pt-2">
        {successCount !== null ? (
          <div className="p-4 rounded-xl bg-pine-500/10 border border-pine-500/20 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-pine-500 mx-auto" />
            <h4 className="font-semibold text-pine-600 dark:text-pine-400">All Records Restored!</h4>
            <p className="text-xs text-ink-muted">
              Successfully migrated {successCount} encrypted records to modern 600,000 PBKDF2 iterations.
            </p>
          </div>
        ) : (
          <form onSubmit={handleRecover} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-ground-elevated border border-line text-xs text-ink-muted leading-relaxed space-y-2">
              <p>
                KhataGHAR detected saved accounts, transactions, and notes in your vault{' '}
                <strong className="text-ink font-semibold">"{activeVault?.name || 'My Vault'}"</strong> from an earlier version.
              </p>
              <p>
                To complete the security upgrade and restore all your records, please enter your master password once below.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-ink-muted flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                Master Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Enter your vault password..."
                autoFocus
                required
              />
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={lockVault}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs"
              >
                <Lock className="w-3.5 h-3.5" />
                Lock Vault
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isRecovering || !password.trim()}
                className="flex-1 text-xs"
              >
                {isRecovering ? 'Restoring Records...' : 'Restore All Data'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
