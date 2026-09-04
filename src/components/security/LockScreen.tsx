import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Modal } from '../common/Modal';
import { OnboardingModal } from './OnboardingModal';
import { WelcomeLandingView } from '../welcome/WelcomeLandingView';
import { importVaultEncrypted } from '../../services/backup';
import { Lock, Unlock, Shield, Plus, Upload, KeyRound, CheckCircle2, Sparkles } from 'lucide-react';

export const LockScreen: React.FC = () => {
  const { allVaults, activeVault, unlockVaultWithPassword, setActiveVaultMeta, refreshVaultList } = useAuth();

  const [showWelcomeLanding, setShowWelcomeLanding] = useState(allVaults.length === 0);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [shake, setShake] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);

  // Restore state
  const [backupFileText, setBackupFileText] = useState('');
  const [backupFileName, setBackupFileName] = useState('');
  const [backupSecret, setBackupSecret] = useState('');
  const [restoreError, setRestoreError] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

  const selectedVault = activeVault || allVaults[0];

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !selectedVault) return;

    setIsUnlocking(true);
    setError('');

    try {
      const success = await unlockVaultWithPassword(selectedVault.id, password);
      if (!success) {
        setError('Incorrect master password for this vault.');
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    } catch (err) {
      setError('Unlock failed. Please try again.');
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBackupFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      setBackupFileText(evt.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backupFileText || !backupSecret) return;

    setIsRestoring(true);
    setRestoreError('');

    try {
      await importVaultEncrypted(backupFileText, backupSecret);
      await refreshVaultList();
      setIsRestoreOpen(false);
      setBackupFileText('');
      setBackupSecret('');
      setError('');
    } catch (err: any) {
      setRestoreError(err?.message || 'Restore failed. Check file and password.');
    } finally {
      setIsRestoring(false);
    }
  };

  if (showWelcomeLanding || allVaults.length === 0) {
    return (
      <WelcomeLandingView
        canGoBackToLock={allVaults.length > 0}
        onBackToLock={() => setShowWelcomeLanding(false)}
      />
    );
  }

  return (
    <div
      style={{ zoom: 1.25 }}
      className="min-h-screen bg-ground text-ink flex flex-col items-center justify-center p-4 relative select-none"
    >
      <div className="w-full max-w-md space-y-6 my-auto">
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-pine-600 text-white shadow-button-primary mb-2">
            <Lock className="w-7 h-7 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink font-display" translate="no">
            KhataGHAR
          </h1>
          <p className="text-xs text-ink/60">
            Encrypted On-Device Financial Enclave
          </p>
        </div>

        {/* Unlock Card */}
        <div
          className={`bg-card border border-line rounded-3xl p-6 sm:p-7 shadow-card transition-transform lift ${
            shake ? 'animate-shake' : ''
          }`}
        >
          {/* Vault Selector if multiple vaults */}
          {allVaults.length > 1 && (
            <div className="mb-4">
              <label className="block text-xs font-bold text-ink/60 uppercase tracking-wider mb-1.5">
                Select Enclave Vault
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {allVaults.map((vault) => {
                  const isSelected = selectedVault?.id === vault.id;
                  return (
                    <button
                      key={vault.id}
                      type="button"
                      onClick={() => {
                        setActiveVaultMeta(vault);
                        setError('');
                        setPassword('');
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-pine-500/60 bg-pine-50 dark:bg-pine-950/40 text-pine-700 dark:text-pine-300 font-bold shadow-xs'
                          : 'border-line bg-moss/70 hover:bg-moss text-ink/80'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Shield className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-pine-600 dark:text-pine-400' : 'text-ink/40'}`} />
                        <span className="text-xs font-semibold truncate">{vault.name}</span>
                        {vault.isPrimary && (
                          <span className="text-[10px] bg-card text-ink/60 px-1.5 py-0.2 rounded font-normal border border-line">
                            Primary
                          </span>
                        )}
                      </div>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-pine-600 dark:text-pine-400 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <form onSubmit={handleUnlock} className="space-y-4">
            <Input
              type="password"
              label={`Master Password (${selectedVault?.name || 'Vault'})`}
              placeholder="Enter master password…"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              error={error}
              autoFocus
              required
              leftIcon={<KeyRound className="w-4 h-4" />}
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              isLoading={isUnlocking}
            >
              <Unlock className="w-4 h-4 mr-1.5" />
              <span>Unlock Vault</span>
            </Button>
          </form>

          {/* Secondary Options */}
          <div className="mt-5 pt-3.5 border-t border-line flex items-center justify-between text-xs text-ink/60">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 hover:text-pine-600 font-medium transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Vault</span>
            </button>
            <button
              onClick={() => setIsRestoreOpen(true)}
              className="flex items-center gap-1.5 hover:text-pine-600 font-medium transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Restore Backup</span>
            </button>
          </div>

          {/* Full Screen Feature Guide & Tour */}
          <div className="mt-3.5 pt-3 border-t border-line text-center">
            <button
              type="button"
              onClick={() => setShowWelcomeLanding(true)}
              className="text-xs font-bold text-pine-600 dark:text-pine-400 hover:underline inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Explore Features & Simple Language Guide</span>
            </button>
          </div>
        </div>

        {/* Security Info */}
        <div className="text-center text-[11px] text-ink/45 flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-pine-600/70" />
          <span>AES-256-GCM Encrypted at Rest • Zero Server Telemetry</span>
        </div>
      </div>

      {/* Onboarding / New Vault Modal */}
      {isCreateOpen && (
        <OnboardingModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          isInitialSetup={false}
        />
      )}

      {/* Restore Backup Modal */}
      {isRestoreOpen && (
        <Modal
          isOpen={isRestoreOpen}
          onClose={() => setIsRestoreOpen(false)}
          title="Restore Encrypted Backup"
          description="Select a Khata Ghar backup file (.json) and enter the password or 12-word recovery phrase used during export."
          maxWidth="md"
        >
          {restoreError && (
            <div className="p-3 mb-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs rounded-xl">
              {restoreError}
            </div>
          )}

          <form onSubmit={handleRestoreSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Backup File
              </label>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                required
                className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 dark:file:bg-navy-800 file:text-slate-700 dark:file:text-slate-200 hover:file:bg-slate-200 cursor-pointer"
              />
              {backupFileName && (
                <p className="text-[11px] text-emerald-500 mt-1">Selected: {backupFileName}</p>
              )}
            </div>

            <Input
              type="password"
              label="Backup Password or 12-Word Phrase"
              placeholder="Enter password or phrase…"
              value={backupSecret}
              onChange={(e) => setBackupSecret(e.target.value)}
              required
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsRestoreOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isRestoring}
                disabled={!backupFileText || !backupSecret}
              >
                Decrypt & Restore
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
