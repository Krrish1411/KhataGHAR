import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import { useTheme } from '../context/ThemeContext';
import { useConfirm } from '../context/DialogContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Card } from '../components/common/Card';
import { PasswordStrengthMeter } from '../components/security/PasswordStrengthMeter';
import { OnboardingModal } from '../components/security/OnboardingModal';
import { SyncMergedVaultModal } from '../components/vault/SyncMergedVaultModal';
import {
  exportVaultEncrypted,
  importVaultEncrypted,
  downloadFile,
  generate12WordPassphrase,
} from '../services/backup';
import { changeVaultPassword, deleteVaultCompletely } from '../services/storage';
import { isAcceptablePassword, hashStringSHA256, deriveKey, encryptData } from '../services/crypto';
import type { CurrencyCode, NumberFormatType, Account, Transaction } from '../types';
import {
  Settings,
  KeyRound,
  Download,
  Upload,
  Sun,
  Moon,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Database,
  Sparkles,
  Plus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  EyeOff,
  Eye,
  Lock,
  Tags,
  X,
  Check,
  Edit2,
  Keyboard,
  RotateCcw,
  Copy,
  Layers,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { IconRenderer } from '../components/common/IconRenderer';
import { APP_SHORTCUTS, formatKeyDisplay } from '../services/shortcuts';

export const SettingsView: React.FC = () => {
  const { activeVault, sessionKey, lockVault, refreshVaultList, setActiveVaultMeta, setSessionCredentials } =
    useAuth();
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
    notes,
    folders,
    updateVaultSettings,
    addCategory,
    updateCategory,
    deleteCategory,
    resetCategoriesToDefault,
    loadDemoData,
    reconcileAccounts,
  } = useVault();
  const { theme, setTheme } = useTheme();
  const confirm = useConfirm();

  const [vaultNameInput, setVaultNameInput] = useState(activeVault?.name || '');
  const [vaultNameSuccess, setVaultNameSuccess] = useState('');

  useEffect(() => {
    if (activeVault?.name) {
      setVaultNameInput(activeVault.name);
    }
  }, [activeVault?.name]);

  const handleRenameVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVault || !vaultNameInput.trim()) return;
    await updateVaultSettings({ name: vaultNameInput.trim() });
    setVaultNameSuccess('Vault renamed successfully!');
    setTimeout(() => setVaultNameSuccess(''), 3000);
  };

  const [isNewVaultOpen, setIsNewVaultOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [demoSuccess, setDemoSuccess] = useState('');
  const [isReconciling, setIsReconciling] = useState(false);
  const [reconcileSuccess, setReconcileSuccess] = useState('');

  // Category Management state
  const [catNewName, setCatNewName] = useState('');
  const [catNewType, setCatNewType] = useState<'expense' | 'income'>('expense');
  const [catNewEssential, setCatNewEssential] = useState<boolean>(false);
  const [catEditId, setCatEditId] = useState<string | null>(null);
  const [catEditName, setCatEditName] = useState('');
  const [catEditIsEssential, setCatEditIsEssential] = useState<boolean>(false);
  const [catFilter, setCatFilter] = useState<'all' | 'expense' | 'income'>('all');

  // Keyboard Shortcuts Customization state
  const [recordingActionId, setRecordingActionId] = useState<string | null>(null);

  useEffect(() => {
    if (!recordingActionId) return;

    const handleRecordKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        setRecordingActionId(null);
        return;
      }

      // Ignore modifier-only key presses
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) {
        return;
      }

      const rawKey = e.key.toLowerCase();
      const currentCustom = activeVault?.customShortcuts || {};
      const updated = { ...currentCustom, [recordingActionId]: rawKey };

      updateVaultSettings({ customShortcuts: updated });
      setRecordingActionId(null);
    };

    window.addEventListener('keydown', handleRecordKey, { capture: true });
    return () => window.removeEventListener('keydown', handleRecordKey, { capture: true });
  }, [recordingActionId, activeVault?.customShortcuts, updateVaultSettings]);

  const handleResetShortcut = (actionId: string) => {
    const currentCustom = { ...(activeVault?.customShortcuts || {}) };
    delete currentCustom[actionId];
    updateVaultSettings({ customShortcuts: currentCustom });
  };

  const handleResetAllShortcuts = async () => {
    const ok = await confirm({
      title: 'Reset Keyboard Shortcuts',
      description: 'Reset all keyboard shortcuts to their factory defaults?',
      confirmText: 'Reset Defaults',
      variant: 'warning',
    });
    if (ok) {
      updateVaultSettings({ customShortcuts: {} });
    }
  };

  const handleLoadDemo = async () => {
    setIsLoadingDemo(true);
    setDemoSuccess('');
    try {
      await loadDemoData();
      setDemoSuccess('Realistic Indian demo dataset loaded! (4 accounts, 4 months of transactions, custodial funds, budgets & goals)');
    } catch (err) {
      console.error('Failed to load demo data:', err);
    } finally {
      setIsLoadingDemo(false);
    }
  };

  const handleReconcile = async () => {
    const ok = await confirm({
      title: 'Reconcile Account Balances',
      description: "Recalculate and reconcile all account balances based on your complete double-entry ledger? Fixed opening balances will be preserved, and only transactions after each account's opening date will apply.",
      confirmText: 'Run Reconciliation',
      variant: 'primary',
    });
    if (!ok) {
      return;
    }
    setIsReconciling(true);
    setReconcileSuccess('');
    try {
      await reconcileAccounts();
      setReconcileSuccess('All account balances reconciled successfully against ledger records!');
      setTimeout(() => setReconcileSuccess(''), 5000);
    } catch (err) {
      console.error('Failed to reconcile accounts:', err);
    } finally {
      setIsReconciling(false);
    }
  };

  // Change Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Backup Export State
  const [backupSecret, setBackupSecret] = useState('');
  const [confirmBackupSecret, setConfirmBackupSecret] = useState('');
  const [showBackupPassword, setShowBackupPassword] = useState(false);
  const [showConfirmBackupPassword, setShowConfirmBackupPassword] = useState(false);
  const [use12WordPhrase, setUse12WordPhrase] = useState(false);
  const [generatedPhrase, setGeneratedPhrase] = useState('');
  const [copiedPhrase, setCopiedPhrase] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Backup Restore State
  const [restoreFileText, setRestoreFileText] = useState('');
  const [restoreSecret, setRestoreSecret] = useState('');
  const [restoreError, setRestoreError] = useState('');
  const [restoreSuccess, setRestoreSuccess] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

  const handleUpdateBaseCurrency = async (val: CurrencyCode) => {
    await updateVaultSettings({ currency: val });
  };

  const handleUpdateNumberFormat = async (val: NumberFormatType) => {
    await updateVaultSettings({ numberFormat: val });
  };

  const handleUpdateFyStart = async (val: number) => {
    await updateVaultSettings({ fyStartMonth: val });
  };

  // Change Master Password Handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVault || !sessionKey) return;

    const acceptability = isAcceptablePassword(newPassword);
    if (!acceptability.valid) {
      setPasswordChangeError(acceptability.reason || 'High-end password required (min 10 characters, uppercase, lowercase, numbers, symbols).');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordChangeError('Passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    setPasswordChangeError('');
    setPasswordChangeSuccess('');

    try {
      const { updatedVault, newKey } = await changeVaultPassword(activeVault, sessionKey, newPassword);
      setSessionCredentials(updatedVault, newKey);
      await refreshVaultList();
      setPasswordChangeSuccess('Password changed successfully! Re-encryption complete. Locking vault to enforce re-authentication…');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => {
        lockVault();
      }, 2000);
    } catch (err: any) {
      setPasswordChangeError(err.message || 'Failed to update vault password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Duress PIN & Decoy Vault State
  const [decoyEnabled, setDecoyEnabled] = useState(activeVault?.decoyConfig?.enabled || false);
  const [decoyMode, setDecoyMode] = useState<'full_dummy' | 'mirror_scaled'>(activeVault?.decoyConfig?.mode || 'mirror_scaled');
  const [decoyScaleFactor, setDecoyScaleFactor] = useState<number>(activeVault?.decoyConfig?.scaleFactor || 25);
  const [decoyPin, setDecoyPin] = useState('');
  const [confirmDecoyPin, setConfirmDecoyPin] = useState('');
  const [decoyMsg, setDecoyMsg] = useState('');
  const [decoyErr, setDecoyErr] = useState('');

  // Auto-lock tab switch
  const [autoLockTab, setAutoLockTab] = useState(localStorage.getItem('khata_auto_lock_tab_switch') === 'true');

  const handleToggleAutoLockTab = (val: boolean) => {
    setAutoLockTab(val);
    localStorage.setItem('khata_auto_lock_tab_switch', String(val));
  };

  const handleSaveDecoy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVault) return;
    setDecoyErr('');
    setDecoyMsg('');

    if (decoyEnabled) {
      if (!decoyPin && !activeVault.decoyConfig?.pinHash) {
        setDecoyErr('Please choose a 4-8 digit Decoy PIN.');
        return;
      }
      let pinHash = activeVault.decoyConfig?.pinHash || '';
      let encryptedSnapshot = activeVault.decoyConfig?.encryptedSnapshot;

      if (decoyPin) {
        if (decoyPin.length < 4) {
          setDecoyErr('Decoy PIN must be at least 4 digits/characters.');
          return;
        }
        if (decoyPin !== confirmDecoyPin) {
          setDecoyErr('Decoy PINs do not match.');
          return;
        }
        pinHash = await hashStringSHA256(decoyPin);

        try {
          const decoyKey = await deriveKey(decoyPin, activeVault.salt);
          const scaledAccs: Account[] = (accounts.length > 0 ? accounts : [
            {
              id: 'decoy-acc-1',
              vaultId: activeVault.id,
              name: 'Daily Wallet / Pocket Cash',
              type: 'wallet' as const,
              currency: activeVault.currency || 'INR',
              balance: 1850,
              isVisibleOnDashboard: true,
              tag: 'personal' as const,
              updatedAt: new Date().toISOString(),
            },
            {
              id: 'decoy-acc-2',
              vaultId: activeVault.id,
              name: 'Primary Savings Bank',
              type: 'bank' as const,
              currency: activeVault.currency || 'INR',
              balance: 4200,
              isVisibleOnDashboard: true,
              tag: 'personal' as const,
              updatedAt: new Date().toISOString(),
            },
          ]).map((a) => ({
            ...a,
            balance: Math.min(4800, Math.max(240, Math.round(a.balance / decoyScaleFactor))),
          }));

          const scaledTxs: Transaction[] = (transactions.length > 0 ? transactions.slice(0, 40) : [
            {
              id: 'decoy-tx-1',
              vaultId: activeVault.id,
              date: new Date().toISOString().split('T')[0],
              amount: 45,
              type: 'expense' as const,
              currency: activeVault.currency || 'INR',
              accountId: scaledAccs[0].id,
              categoryId: categories[0]?.id || 'decoy-cat-1',
              note: 'Chai & snacks',
              updatedAt: new Date().toISOString(),
            },
            {
              id: 'decoy-tx-2',
              vaultId: activeVault.id,
              date: new Date().toISOString().split('T')[0],
              amount: 180,
              type: 'expense' as const,
              currency: activeVault.currency || 'INR',
              accountId: scaledAccs[0].id,
              categoryId: categories[0]?.id || 'decoy-cat-1',
              note: 'Groceries & milk',
              updatedAt: new Date().toISOString(),
            },
          ]).map((t) => ({
            ...t,
            amount: Math.max(20, Math.round(t.amount / decoyScaleFactor)),
          }));

          encryptedSnapshot = await encryptData(
            { accounts: scaledAccs, transactions: scaledTxs, categories },
            decoyKey
          );
        } catch (encErr) {
          console.warn('Failed to pre-encrypt decoy snapshot:', encErr);
        }
      }

      await updateVaultSettings({
        decoyConfig: {
          enabled: true,
          pinHash,
          mode: decoyMode,
          scaleFactor: decoyScaleFactor,
          encryptedSnapshot,
        },
      });
      setDecoyMsg('Decoy Vault configuration saved! Entering this PIN on the lock screen will trigger the decoy vault.');
      setDecoyPin('');
      setConfirmDecoyPin('');
    } else {
      await updateVaultSettings({
        decoyConfig: {
          enabled: false,
          pinHash: '',
          mode: decoyMode,
          scaleFactor: decoyScaleFactor,
        },
      });
      setDecoyMsg('Decoy Vault disabled.');
    }
  };

  // Generate 12-Word Passphrase for Backup
  const handleGenerate12Word = () => {
    const phrase = generate12WordPassphrase();
    setGeneratedPhrase(phrase);
    setBackupSecret(phrase);
  };

  // Export Encrypted Backup
  const handleExportBackup = async () => {
    if (!activeVault || !sessionKey) return;
    if (!backupSecret || backupSecret.length < 8) {
      alert('Please provide a backup password or passphrase of at least 8 characters.');
      return;
    }

    if (!use12WordPhrase && backupSecret !== confirmBackupSecret) {
      alert('Backup passwords do not match. Please verify your confirmation password.');
      return;
    }

    setIsExporting(true);
    try {
      const backupJson = await exportVaultEncrypted(
        activeVault,
        {
          accounts,
          transactions,
          categories,
          peopleLedger,
          budgets,
          goals,
          assets,
          liabilities,
          documents,
          notes,
          folders,
        },
        backupSecret
      );

      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `KhataGhar_Backup_${activeVault.name.replace(/\s+/g, '_')}_${dateStr}.khataghar`;
      downloadFile(backupJson, filename, 'application/json');
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle file select for restore
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setRestoreFileText(event.target?.result as string);
      setRestoreError('');
    };
    reader.readAsText(file);
  };

  // Restore Vault Handler
  const handleRestoreBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreFileText || !restoreSecret) {
      setRestoreError('Please select a backup file and provide its password / phrase.');
      return;
    }

    setIsRestoring(true);
    setRestoreError('');
    setRestoreSuccess('');

    try {
      const restored = await importVaultEncrypted(restoreFileText, restoreSecret);
      setRestoreSuccess(`Vault "${restored.vault.name}" successfully restored and encrypted!`);
      await refreshVaultList();
      setActiveVaultMeta(restored.vault);
    } catch (err: any) {
      setRestoreError(err.message || 'Failed to decrypt and restore backup file.');
    } finally {
      setIsRestoring(false);
    }
  };

  // Delete Vault Completely
  const handleDeleteVault = async () => {
    if (!activeVault) return;
    const confirmName = prompt(
      `DANGER: To delete "${activeVault.name}" forever, type its exact name:`
    );

    if (confirmName === activeVault.name) {
      await deleteVaultCompletely(activeVault.id);
      window.location.reload();
    } else if (confirmName !== null) {
      alert('Vault name does not match. Deletion cancelled.');
    }
  };

  return (
    <div className="space-y-8 w-full max-w-[1600px] mx-auto px-1 sm:px-2 pb-20 anim-fade">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 grid place-items-center text-pine-600">
          <Settings className="w-4 h-4" />
        </span>
        <div>
          <h1 className="font-display font-extrabold text-[22px] sm:text-[24px] tracking-tight text-ink">
            Vault Settings & Enclave Control
          </h1>
          <p className="text-xs text-ink/50 mt-0.5">
            Configure currency formatting, automatic timeouts, master keys, and encrypted backups
          </p>
        </div>
      </div>

      {/* General & Formatting Preferences */}
      <div className="space-y-3">
        <h3 className="font-display font-bold text-xs uppercase tracking-wider text-ink/75 px-1">
          General & Formatting Preferences
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {/* Vault Name / Renaming */}
          <div className="rounded-2xl border border-line bg-card p-4 sm:p-5 space-y-2.5 shadow-sm lift sm:col-span-2 xl:col-span-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="block text-xs font-bold text-ink">
                  Vault Name & Identification
                </span>
                <span className="block text-[11.5px] text-ink/55 mt-0.5">
                  Customize the display name for this encrypted financial enclave.
                </span>
              </div>
              {vaultNameSuccess && (
                <span className="text-xs text-pine-600 font-semibold bg-pine-50 dark:bg-pine-950/50 px-2.5 py-1 rounded-lg border border-pine-200">
                  {vaultNameSuccess}
                </span>
              )}
            </div>
            <form onSubmit={handleRenameVault} className="flex gap-2 pt-1 max-w-md">
              <Input
                value={vaultNameInput}
                onChange={(e) => setVaultNameInput(e.target.value)}
                placeholder="Vault name (e.g. Personal Finances, Vault Hub)"
                className="flex-1"
                required
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-pine-700 hover:bg-pine-600 active:scale-[0.97] text-white text-xs font-bold shadow-xs cursor-pointer transition-all shrink-0"
              >
                Rename Vault
              </button>
            </form>
          </div>

          {/* Merged Vault Re-Sync (if this active vault is a merged enclave) */}
          {activeVault?.isMerged && (
            <div className="rounded-2xl border border-mari-200/80 dark:border-mari-800/60 bg-mari-50/30 dark:bg-mari-950/20 p-4 sm:p-5 space-y-3 shadow-sm lift sm:col-span-2 xl:col-span-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-mari-500/10 text-mari-600 border border-mari-500/20 grid place-items-center">
                      <Layers className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-xs font-bold text-ink">
                      Merged Enclave Synchronization
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-mari-100 dark:bg-mari-900/50 text-mari-700 dark:text-mari-300 text-[10.5px] font-bold">
                      Multi-Source
                    </span>
                  </div>
                  <p className="text-[11.5px] text-ink/65 max-w-2xl leading-relaxed">
                    This vault is a consolidated enclave that aggregates financial records from multiple independent vaults. Whenever new transactions, account balance changes, or asset additions occur in source vaults, you can pull the latest encrypted records into this vault.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSyncModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-mari-700 hover:bg-mari-600 active:scale-[0.97] text-white text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-all shrink-0 self-start sm:self-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync Latest Data from Source Vaults</span>
                </button>
              </div>
            </div>
          )}

          {/* Theme */}
          <div className="rounded-2xl border border-line bg-card p-4 sm:p-5 space-y-2.5 shadow-sm lift">
            <label className="block text-xs font-semibold text-ink">
              Theme Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'dark', label: 'Dark', icon: Moon },
                { id: 'light', label: 'Light', icon: Sun },
                { id: 'system', label: 'System', icon: RefreshCw },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id as any)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    theme === t.id
                      ? 'border-pine-500 bg-pine-50/80 dark:bg-pine-950/60 text-pine-700 dark:text-pine-300 font-bold ring-2 ring-pine-500 ring-offset-1 ring-offset-card shadow-xs scale-[1.02]'
                      : 'border-line bg-moss/50 text-ink/70 hover:text-ink'
                  }`}
                >
                  <t.icon className="w-3.5 h-3.5 mb-1" />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Number System */}
          <div className="rounded-2xl border border-line bg-card p-4 sm:p-5 space-y-2 shadow-sm lift">
            <Select
              label="Numbering Format"
              value={activeVault?.numberFormat || 'indian'}
              onChange={(e: any) =>
                handleUpdateNumberFormat(e.target.value as NumberFormatType)
              }
              options={[
                { value: 'indian', label: 'Indian System (1,00,000 / Lakhs / Crores)' },
                { value: 'international', label: 'International System (100,000 / Millions)' },
              ]}
              helperText="Determines comma grouping across all screens"
            />
          </div>

          {/* Base Currency */}
          <div className="rounded-2xl border border-line bg-card p-4 sm:p-5 space-y-2 shadow-sm lift">
            <Select
              label="Base Currency"
              value={activeVault?.currency || 'INR'}
              onChange={(e: any) =>
                handleUpdateBaseCurrency(e.target.value as CurrencyCode)
              }
              options={[
                { value: 'INR', label: 'INR (₹) — Indian Rupee' },
                { value: 'USD', label: 'USD ($) — US Dollar' },
                { value: 'EUR', label: 'EUR (€) — Euro' },
                { value: 'GBP', label: 'GBP (£) — British Pound' },
                { value: 'AED', label: 'AED (د.إ) — UAE Dirham' },
                { value: 'SGD', label: 'SGD (S$) — Singapore Dollar' },
                { value: 'CAD', label: 'CAD (CA$) — Canadian Dollar' },
                { value: 'AUD', label: 'AUD (A$) — Australian Dollar' },
              ]}
            />
          </div>

          {/* Financial Year Start */}
          <div className="rounded-2xl border border-line bg-card p-4 sm:p-5 space-y-2 shadow-sm lift">
            <Select
              label="Financial Year Start"
              value={String(activeVault?.fyStartMonth || 4)}
              onChange={(e: any) => handleUpdateFyStart(Number(e.target.value))}
              options={[
                { value: '1', label: 'January (Calendar Year)' },
                { value: '4', label: 'April (Indian Fiscal Year)' },
                { value: '7', label: 'July (Australian Fiscal Year)' },
                { value: '10', label: 'October (US Federal Year)' },
              ]}
              helperText="Defines the 'This FY' date range boundary"
            />
          </div>

          {/* Tab Switch Auto-Lock */}
          <div className="rounded-2xl border border-line bg-card p-4 sm:p-5 space-y-2.5 shadow-sm lift sm:col-span-2 xl:col-span-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-xs font-bold text-ink">
                  Lock on Tab Switch or Minimizing Browser
                </span>
                <span className="block text-[11.5px] text-ink/55 mt-0.5">
                  Instantly wipes session key from browser memory whenever you switch tabs or minimize the window.
                </span>
              </div>
              <input
                type="checkbox"
                checked={autoLockTab}
                onChange={(e) => handleToggleAutoLockTab(e.target.checked)}
                className="w-4 h-4 rounded text-pine-600 accent-pine-600"
              />
            </div>
          </div>
        </div>
      </div>

            {/* 2-Column Responsive Grid: Eliminates dead space & balances cards side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Access, Backups & Datasets */}
        <div className="space-y-6">
{/* Master Password Re-Encryption */}
      <div className="space-y-3">
        <h3 className="font-display font-bold text-xs uppercase tracking-wider text-ink/75 px-1 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-pine-600" />
          <span>Change Master Password (Re-encrypt Vault)</span>
        </h3>

        <div className="rounded-2xl border border-line bg-card w-full p-5 sm:p-6 space-y-4 shadow-sm lift">
          <p className="text-xs text-ink/60 leading-relaxed">
            Changing your password derives a new PBKDF2-SHA256 key and re-encrypts every single record in this vault atomically.
          </p>

          {passwordChangeSuccess && (
            <div className="p-3 rounded-xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 text-pine-800 dark:text-pine-200 text-xs font-semibold">
              {passwordChangeSuccess}
            </div>
          )}

          {passwordChangeError && (
            <div className="p-3 rounded-xl bg-flare-100/70 border border-flare-500/30 text-flare-600 text-xs font-semibold">
              {passwordChangeError}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3">
            <Input
              type="password"
              label="New Master Password"
              placeholder="Enter new password…"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />

            {newPassword && <PasswordStrengthMeter password={newPassword} />}

            <Input
              type="password"
              label="Confirm New Password"
              placeholder="Re-enter new password…"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isChangingPassword}
            >
              <span>Update Password & Re-encrypt</span>
            </Button>
          </form>
        </div>
      </div>

      {/* Backup & Export */}
      <div className="space-y-3">
        <h3 className="font-display font-bold text-xs uppercase tracking-wider text-ink/75 px-1 flex items-center gap-2">
          <Download className="w-4 h-4 text-pine-600" />
          <span>Export Encrypted Backup (.khataghar)</span>
        </h3>

        <div className="rounded-2xl border border-line bg-card w-full p-5 sm:p-6 space-y-4 shadow-sm lift">
          <p className="text-xs text-ink/60 leading-relaxed">
            Export a zero-knowledge encrypted backup file containing all accounts, transactions, documents, and ledger entries.
          </p>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-ink">
              <input
                type="checkbox"
                id="use12words"
                checked={use12WordPhrase}
                onChange={(e) => {
                  setUse12WordPhrase(e.target.checked);
                  if (e.target.checked) handleGenerate12Word();
                  else {
                    setGeneratedPhrase('');
                    setBackupSecret('');
                  }
                }}
                className="rounded text-pine-600 focus:ring-pine-500 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="use12words" className="cursor-pointer font-semibold">
                Generate 12-Word Passphrase for this backup
              </label>
            </div>

            {use12WordPhrase && generatedPhrase ? (
              <div className="p-3.5 rounded-xl bg-moss/70 border border-line space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-pine-700 dark:text-pine-400 block">
                    Write down these 12 words in order:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedPhrase);
                        setCopiedPhrase(true);
                        setTimeout(() => setCopiedPhrase(false), 2000);
                      }}
                      className="px-2 py-1 rounded-lg border border-line bg-card hover:bg-moss text-[10.5px] font-semibold text-ink flex items-center gap-1 cursor-pointer transition-all"
                    >
                      {copiedPhrase ? <Check className="w-3 h-3 text-pine-600" /> : <Copy className="w-3 h-3 text-pine-600" />}
                      <span>{copiedPhrase ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const blob = new Blob([`KhataGHAR 12-Word Recovery Key\nCreated: ${new Date().toLocaleString()}\nVault: ${activeVault?.name}\n\nRecovery Words:\n${generatedPhrase}\n\nKeep this file private and secure!`], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${(activeVault?.name || 'khataghar').toLowerCase().replace(/\s+/g, '_')}_recovery_key.txt`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="px-2 py-1 rounded-lg border border-line bg-card hover:bg-moss text-[10.5px] font-semibold text-ink flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <Download className="w-3 h-3 text-pine-600" />
                      <span>Download .txt</span>
                    </button>
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-card border border-line font-mono text-xs font-bold text-ink tracking-wide select-all">
                  {generatedPhrase}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-1">
                    <span>Backup Decryption Password</span>
                    <button
                      type="button"
                      onClick={() => setShowBackupPassword(!showBackupPassword)}
                      className="text-pine-600 hover:text-pine-700 flex items-center gap-1 font-semibold cursor-pointer lowercase"
                    >
                      {showBackupPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showBackupPassword ? 'hide' : 'show'}</span>
                    </button>
                  </div>
                  <input
                    type={showBackupPassword ? 'text' : 'password'}
                    placeholder="Enter strong password (min 8 chars)…"
                    value={backupSecret}
                    onChange={(e) => setBackupSecret(e.target.value)}
                    className="w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-xs text-ink font-mono placeholder:text-ink/30 outline-none focus:border-pine-500 focus:ring-2 focus:ring-pine-500/20"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-1">
                    <span>Confirm Backup Password</span>
                    <button
                      type="button"
                      onClick={() => setShowConfirmBackupPassword(!showConfirmBackupPassword)}
                      className="text-pine-600 hover:text-pine-700 flex items-center gap-1 font-semibold cursor-pointer lowercase"
                    >
                      {showConfirmBackupPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showConfirmBackupPassword ? 'hide' : 'show'}</span>
                    </button>
                  </div>
                  <input
                    type={showConfirmBackupPassword ? 'text' : 'password'}
                    placeholder="Re-enter password to confirm…"
                    value={confirmBackupSecret}
                    onChange={(e) => setConfirmBackupSecret(e.target.value)}
                    className={`w-full rounded-xl border bg-card px-3.5 py-2.5 text-xs text-ink font-mono placeholder:text-ink/30 outline-none transition-all ${
                      confirmBackupSecret.length > 0
                        ? backupSecret === confirmBackupSecret && backupSecret.length >= 8
                          ? 'border-pine-500 ring-2 ring-pine-500/20'
                          : 'border-flare-500 ring-2 ring-flare-500/20'
                        : 'border-line focus:border-pine-500'
                    }`}
                  />
                </div>

                {/* Match indicator feedback */}
                {confirmBackupSecret.length > 0 && (
                  <div
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                      backupSecret === confirmBackupSecret && backupSecret.length >= 8
                        ? 'bg-pine-50 dark:bg-pine-950/60 border-pine-200 dark:border-pine-800 text-pine-700 dark:text-pine-300'
                        : 'bg-flare-50 dark:bg-flare-950/60 border-flare-200 dark:border-flare-800 text-flare-700 dark:text-flare-300'
                    }`}
                  >
                    {backupSecret === confirmBackupSecret && backupSecret.length >= 8 ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-pine-600 shrink-0" />
                        <span>Passwords match! You are safe to download your encrypted backup.</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-flare-600 shrink-0" />
                        <span>
                          {backupSecret !== confirmBackupSecret
                            ? 'Passwords do not match. Please ensure both fields are identical to avoid losing access.'
                            : 'Password must be at least 8 characters long.'}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            <Button
              onClick={handleExportBackup}
              variant="primary"
              size="sm"
              isLoading={isExporting}
              disabled={!use12WordPhrase && (backupSecret.length < 8 || backupSecret !== confirmBackupSecret)}
            >
              <Download className="w-4 h-4 mr-1.5" />
              <span>Download Encrypted File</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Ledger Maintenance & Demo Data */}
      <div className="space-y-3">
        <h3 className="font-display font-bold text-xs uppercase tracking-wider text-pine-700 dark:text-pine-400 px-1 flex items-center gap-2">
          <Database className="w-4 h-4 text-pine-600" />
          <span>Ledger Maintenance & Demo Data</span>
        </h3>

        <div className="rounded-2xl border border-line bg-card w-full p-5 sm:p-6 space-y-4 shadow-sm lift">
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink/70">Current Ledger Size</span>
            <span className="font-mono font-bold text-ink num">
              {transactions.length} entries · {accounts.length} accounts · {peopleLedger.length} people records
            </span>
          </div>

          {/* Reconcile Section */}
          <div className="pt-3 border-t border-line/60 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="font-bold text-xs text-ink flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-pine-600" />
                  <span>Reconcile Account Balances</span>
                </div>
                <p className="text-[11px] text-ink/50 leading-relaxed">
                  Recalculates all balances from the complete double-entry transaction ledger and people records, preserving opening balances.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                isLoading={isReconciling}
                onClick={handleReconcile}
                className="shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-pine-600" />
                <span>Reconcile Balances</span>
              </Button>
            </div>
            {reconcileSuccess && (
              <div className="p-2.5 rounded-xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 text-pine-800 dark:text-pine-200 text-xs font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-pine-600 shrink-0" />
                <span>{reconcileSuccess}</span>
              </div>
            )}
          </div>

          {/* Demo Data Section */}
          <div className="pt-3 border-t border-line/60 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="font-bold text-xs text-ink flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-pine-600" />
                  <span>Load Realistic Indian Demo Data</span>
                </div>
                <p className="text-[11px] text-ink/50 leading-relaxed">
                  Populates 4 accounts (HDFC, Cash, Paytm, SBI Credit Card), 4 months of transactions, custodial funds, budgets & goals.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                isLoading={isLoadingDemo}
                onClick={handleLoadDemo}
                className="shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-pine-600" />
                <span>Load Demo Data</span>
              </Button>
            </div>
            {demoSuccess && (
              <div className="p-2.5 rounded-xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 text-pine-800 dark:text-pine-200 text-xs font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-pine-600 shrink-0" />
                <span>{demoSuccess}</span>
              </div>
            )}
          </div>
        </div>
      </div>

              </div>

        {/* Right Column: Decoy Camouflage, Recovery & Danger Zone */}
        <div className="space-y-6">
{/* Duress PIN & Decoy Vault */}
      <div className="space-y-3">
        <h3 className="font-display font-bold text-xs uppercase tracking-wider text-ink/75 px-1 flex items-center gap-2">
          <EyeOff className="w-4 h-4 text-mari-600" />
          <span>Duress PIN & Decoy Vault (Physical Coercion Shield)</span>
        </h3>

        <div className="rounded-2xl border border-line bg-card w-full p-5 sm:p-6 space-y-4 shadow-sm lift">
          {/* Plain language explanation banner */}
          <div className="p-3.5 rounded-xl bg-mari-100/60 dark:bg-mari-950/40 border border-mari-400/40 space-y-1 text-xs">
            <span className="font-bold text-mari-800 dark:text-mari-300 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              What is a Duress PIN & Decoy Vault?
            </span>
            <p className="text-ink/75 leading-relaxed">
              If an attacker, thief, or hostile party forces you to unlock your phone, enter your <b>Decoy PIN</b> instead of your master password.
              The app opens seamlessly into a harmless, believable decoy ledger without any warning banner.
            </p>
          </div>

          {decoyMsg && (
            <div className="p-3 rounded-xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 text-pine-800 dark:text-pine-200 text-xs font-semibold">
              {decoyMsg}
            </div>
          )}

          {decoyErr && (
            <div className="p-3 rounded-xl bg-flare-100/70 border border-flare-500/30 text-flare-600 text-xs font-semibold">
              {decoyErr}
            </div>
          )}

          <form onSubmit={handleSaveDecoy} className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <span className="block text-xs font-bold text-ink">
                  Enable Decoy Vault Protection
                </span>
                <span className="block text-[11px] text-ink/50">
                  {activeVault?.decoyConfig?.enabled ? 'Active — protected by Decoy PIN' : 'Currently disabled'}
                </span>
              </div>
              <input
                type="checkbox"
                checked={decoyEnabled}
                onChange={(e) => setDecoyEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-pine-600 accent-pine-600"
              />
            </div>

            {decoyEnabled && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">
                    Decoy Mode Type
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDecoyMode('mirror_scaled')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        decoyMode === 'mirror_scaled'
                          ? 'border-pine-500 bg-pine-50/80 dark:bg-pine-950/60 text-ink ring-2 ring-pine-500 ring-offset-1 ring-offset-card shadow-sm scale-[1.01]'
                          : 'border-line bg-moss/50 text-ink/65 hover:text-ink'
                      }`}
                    >
                      <span className="block text-xs font-bold">1. Mirror Camouflage (Recommended)</span>
                      <span className="block text-[11px] text-ink/60 mt-0.5">
                        Shows your real merchants and dates, but scaled down to small pocket balances (₹1k–₹4k). Completely strips properties, gold, and documents!
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDecoyMode('full_dummy')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        decoyMode === 'full_dummy'
                          ? 'border-pine-500 bg-pine-50/80 dark:bg-pine-950/60 text-ink ring-2 ring-pine-500 ring-offset-1 ring-offset-card shadow-sm scale-[1.01]'
                          : 'border-line bg-moss/50 text-ink/65 hover:text-ink'
                      }`}
                    >
                      <span className="block text-xs font-bold">2. Full Innocent Dummy</span>
                      <span className="block text-[11px] text-ink/60 mt-0.5">
                        Loads an independent preset ledger with harmless mundane expenses (milk, vegetables, chai) and tiny pocket cash.
                      </span>
                    </button>
                  </div>
                </div>

                {decoyMode === 'mirror_scaled' && (
                  <div>
                    <Select
                      label="Balance Reduction Scale Factor"
                      value={String(decoyScaleFactor)}
                      onChange={(e) => setDecoyScaleFactor(Number(e.target.value))}
                      options={[
                        { value: '20', label: '20× Reduction (e.g. ₹50,000 becomes ₹2,500)' },
                        { value: '25', label: '25× Reduction (e.g. ₹1,00,000 becomes ₹4,000)' },
                        { value: '50', label: '50× Reduction (e.g. ₹1,00,000 becomes ₹2,000)' },
                        { value: '100', label: '100× Reduction (Ultra modest)' },
                      ]}
                      helperText="Divides real amounts and balances so your recent history looks genuine but poor"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    type="password"
                    label={activeVault?.decoyConfig?.pinHash ? 'Update Decoy PIN (Optional)' : 'Set Decoy PIN (4–8 digits)'}
                    placeholder="e.g. 1984 or 4321"
                    value={decoyPin}
                    onChange={(e) => setDecoyPin(e.target.value)}
                  />
                  <Input
                    type="password"
                    label="Confirm Decoy PIN"
                    placeholder="Re-enter PIN…"
                    value={confirmDecoyPin}
                    onChange={(e) => setConfirmDecoyPin(e.target.value)}
                  />
                </div>
              </div>
            )}

            <Button type="submit" variant="primary" size="sm">
              <span>Save Decoy Vault Settings</span>
            </Button>
          </form>
        </div>
      </div>

      {/* Restore Backup */}
      <div className="space-y-3">
        <h3 className="font-display font-bold text-xs uppercase tracking-wider text-ink/75 px-1 flex items-center gap-2">
          <Upload className="w-4 h-4 text-pine-600" />
          <span>Restore Encrypted Backup File</span>
        </h3>

        <div className="rounded-2xl border border-line bg-card w-full p-5 sm:p-6 space-y-4 shadow-sm lift">
          <p className="text-xs text-ink/60 leading-relaxed">
            Restore a `.khataghar` backup file from another device or cold storage.
          </p>

          {restoreSuccess && (
            <div className="p-3 rounded-xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 text-pine-800 dark:text-pine-200 text-xs font-semibold">
              {restoreSuccess}
            </div>
          )}

          {restoreError && (
            <div className="p-3 rounded-xl bg-flare-100/70 border border-flare-500/30 text-flare-600 text-xs font-semibold">
              {restoreError}
            </div>
          )}

          <form onSubmit={handleRestoreBackup} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Select .khataghar file
              </label>
              <input
                type="file"
                accept=".khataghar,.json"
                onChange={handleFileSelect}
                className="block w-full text-xs text-ink/60 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-moss file:text-ink hover:file:bg-pine-50 cursor-pointer"
                required
              />
            </div>

            <Input
              type="password"
              label="Backup Password or 12-Word Phrase"
              placeholder="Enter backup secret…"
              value={restoreSecret}
              onChange={(e) => setRestoreSecret(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isRestoring}
            >
              <Upload className="w-4 h-4 mr-1.5" />
              <span>Decrypt & Restore Vault</span>
            </Button>
          </form>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="space-y-3">
        <h3 className="font-display font-bold text-xs text-flare-600 uppercase tracking-wider px-1 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>Danger Zone</span>
        </h3>

        <div className="rounded-2xl border border-flare-500/40 bg-flare-100/10 w-full p-5 sm:p-6 space-y-3 shadow-sm">
          <div>
            <h4 className="font-display font-bold text-sm text-ink">
              Delete This Vault Irreversibly
            </h4>
            <p className="text-xs text-ink/50 mt-0.5">
              Permanently wipes every encrypted record in "{activeVault?.name}" from this device's IndexedDB.
            </p>
          </div>

          <Button
            onClick={handleDeleteVault}
            variant="danger"
            size="sm"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            <span>Delete "{activeVault?.name}"</span>
          </Button>
        </div>
      </div>

        </div>
      </div>

      {/* ── CATEGORY MANAGEMENT ─────────────────────────────────── */}
      <div className="rounded-2xl border border-line bg-card p-5 sm:p-6 space-y-4 shadow-sm lift">
        <div className="flex items-center justify-between pb-2 border-b border-line gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Tags className="w-4 h-4 text-pine-600" />
            <h3 className="font-display font-bold text-sm text-ink">Category Management</h3>
            <span className="text-[11px] text-ink/50 bg-moss px-2 py-0.5 rounded-full font-medium">
              {categories.filter((c) => !c.parentId && !c.hidden).length} active ({categories.filter((c) => !c.parentId).length} total)
            </span>
          </div>
          <button
            type="button"
            onClick={async () => {
              const ok = await confirm({
                title: 'Reset Categories',
                description: 'Reset categories to the clean standard set? Custom categories will be removed, but your past transaction history and balances will remain completely safe.',
                confirmText: 'Reset to Defaults',
                variant: 'warning',
              });
              if (ok) {
                await resetCategoriesToDefault();
              }
            }}
            className="px-2.5 py-1 rounded-lg bg-moss hover:bg-pine-100 dark:hover:bg-pine-950/40 text-pine-700 dark:text-pine-300 border border-line text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-all"
            title="Reset to clean standard categories"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset to Standard</span>
          </button>
        </div>

        {/* Add New Category */}
        <div className="p-3.5 rounded-2xl bg-moss/50 border border-line space-y-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink/50">Add Custom Category</p>
          <div className="flex flex-wrap gap-2">
            <select
              value={catNewType}
              onChange={(e) => {
                const t = e.target.value as 'expense' | 'income';
                setCatNewType(t);
                if (t === 'income') setCatNewEssential(true);
              }}
              className="px-2 py-2 rounded-xl border border-line bg-card text-xs font-semibold text-ink outline-none focus:border-pine-500 cursor-pointer shrink-0"
            >
              <option value="expense">🔴 Expense</option>
              <option value="income">🟢 Income</option>
            </select>
            {catNewType === 'expense' && (
              <button
                type="button"
                onClick={() => setCatNewEssential(!catNewEssential)}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  catNewEssential
                    ? 'bg-pine-100 border-pine-300 text-pine-800 dark:bg-pine-950/60 dark:border-pine-700 dark:text-pine-300'
                    : 'bg-moss border-line text-ink/60 hover:text-ink'
                }`}
                title="Toggle Essential (Need) vs Discretionary (Want)"
              >
                {catNewEssential ? '⭐ Essential (Need)' : '🎯 Discretionary (Want)'}
              </button>
            )}
            <input
              type="text"
              placeholder="Category name…"
              value={catNewName}
              onChange={(e) => setCatNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && catNewName.trim()) {
                  addCategory({
                    name: catNewName.trim(),
                    type: catNewType,
                    icon: catNewType === 'expense' ? '🔴' : '🟢',
                    isEssential: catNewType === 'expense' ? catNewEssential : true,
                  });
                  setCatNewName('');
                }
              }}
              className="flex-1 min-w-[140px] px-3 py-2 rounded-xl border border-line bg-card text-xs text-ink outline-none focus:border-pine-500"
            />
            <button
              type="button"
              disabled={!catNewName.trim()}
              onClick={() => {
                if (!catNewName.trim()) return;
                addCategory({
                  name: catNewName.trim(),
                  type: catNewType,
                  icon: catNewType === 'expense' ? '🔴' : '🟢',
                  isEssential: catNewType === 'expense' ? catNewEssential : true,
                });
                setCatNewName('');
              }}
              className="px-3 py-2 rounded-xl bg-pine-700 hover:bg-pine-600 text-white text-xs font-bold flex items-center gap-1 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5">
          {(['all', 'expense', 'income'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setCatFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer capitalize ${catFilter === f ? 'bg-pine-700 text-white' : 'bg-moss text-ink/60 hover:text-ink'}`}
            >
              {f === 'all' ? 'All' : f === 'expense' ? '🔴 Expense' : '🟢 Income'}
            </button>
          ))}
        </div>

        {/* Category List */}
        <div className="space-y-1.5 max-h-72 overflow-y-auto custom-scrollbar pr-0.5">
          {categories
            .filter((c) => !c.parentId && (catFilter === 'all' || c.type === catFilter))
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((cat) => (
              catEditId === cat.id ? (
                <div
                  key={cat.id}
                  className="p-3.5 rounded-2xl border-2 border-pine-500/80 bg-card shadow-sm space-y-3 anim-fade"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-pine-700 dark:text-pine-300">
                      Editing Category
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        cat.type === 'expense'
                          ? 'bg-flare-100 text-flare-700 dark:bg-flare-900/30 dark:text-flare-300'
                          : 'bg-pine-100 text-pine-700 dark:bg-pine-900/30 dark:text-pine-300'
                      }`}
                    >
                      {cat.type}
                    </span>
                  </div>

                  <div>
                    <label className="text-[10.5px] font-bold uppercase text-ink/50 block mb-1">
                      Category Name
                    </label>
                    <input
                      type="text"
                      value={catEditName}
                      onChange={(e) => setCatEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && catEditName.trim()) {
                          updateCategory({
                            ...cat,
                            name: catEditName.trim(),
                            isEssential: cat.type === 'expense' ? catEditIsEssential : cat.isEssential,
                          });
                          setCatEditId(null);
                        }
                        if (e.key === 'Escape') setCatEditId(null);
                      }}
                      autoFocus
                      className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-line bg-card outline-none focus:border-pine-500 text-ink"
                    />
                  </div>

                  {cat.type === 'expense' && (
                    <div className="space-y-1.5">
                      <label className="text-[10.5px] font-bold uppercase text-ink/50 block">
                        Classification (50/30/20 Rule)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setCatEditIsEssential(true)}
                          className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                            catEditIsEssential
                              ? 'bg-pine-100/70 border-pine-500 text-pine-800 dark:bg-pine-950/60 dark:text-pine-200 shadow-xs'
                              : 'bg-moss/40 border-line text-ink/60 hover:text-ink'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold text-xs">
                            <span>⭐</span>
                            <span>Essential Need</span>
                          </div>
                          <p className="text-[10px] text-ink/50 mt-0.5">Rent, Groceries, Healthcare, Utility</p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCatEditIsEssential(false)}
                          className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                            !catEditIsEssential
                              ? 'bg-amber-100/70 border-amber-500 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200 shadow-xs'
                              : 'bg-moss/40 border-line text-ink/60 hover:text-ink'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold text-xs">
                            <span>🎯</span>
                            <span>Discretionary Want</span>
                          </div>
                          <p className="text-[10px] text-ink/50 mt-0.5">Dining, Shopping, Travel, Entertainment</p>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-line">
                    <button
                      type="button"
                      onClick={() => setCatEditId(null)}
                      className="px-3 py-1.5 rounded-xl border border-line bg-card hover:bg-moss text-xs font-semibold text-ink cursor-pointer transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!catEditName.trim()}
                      onClick={() => {
                        if (catEditName.trim()) {
                          updateCategory({
                            ...cat,
                            name: catEditName.trim(),
                            isEssential: cat.type === 'expense' ? catEditIsEssential : cat.isEssential,
                          });
                          setCatEditId(null);
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-pine-700 hover:bg-pine-600 text-white text-xs font-bold shadow-xs cursor-pointer transition-all disabled:opacity-40"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  key={cat.id}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all ${
                    cat.hidden
                      ? 'opacity-40 border-dashed border-line'
                      : 'border-line bg-card/60 hover:bg-moss/50'
                  }`}
                >
                  <div className="w-7 h-7 rounded-xl bg-moss/80 border border-line flex items-center justify-center shrink-0 text-pine-700 dark:text-pine-300">
                    <IconRenderer name={cat.icon} className="w-3.5 h-3.5" />
                  </div>

                  <span className="flex-1 text-xs font-semibold text-ink truncate">{cat.name}</span>

                  {cat.type === 'expense' && (
                    <button
                      type="button"
                      onClick={() => updateCategory({ ...cat, isEssential: !cat.isEssential })}
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 transition-all cursor-pointer border ${
                        cat.isEssential
                          ? 'bg-pine-100 border-pine-300 text-pine-700 dark:bg-pine-900/40 dark:border-pine-800 dark:text-pine-300 hover:bg-pine-200'
                          : 'bg-moss border-line text-ink/60 hover:text-ink'
                      }`}
                      title="Click to toggle Essential (Need) vs Discretionary (Want)"
                    >
                      {cat.isEssential ? '⭐ Essential' : 'Discretionary'}
                    </button>
                  )}

                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                      cat.type === 'expense'
                        ? 'bg-flare-100 text-flare-700 dark:bg-flare-900/30 dark:text-flare-300'
                        : 'bg-pine-100 text-pine-700 dark:bg-pine-900/30 dark:text-pine-300'
                    }`}
                  >
                    {cat.type}
                  </span>

                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setCatEditId(cat.id);
                        setCatEditName(cat.name);
                        setCatEditIsEssential(Boolean(cat.isEssential));
                      }}
                      className="p-1 rounded-lg text-ink/40 hover:text-ink hover:bg-moss transition-all cursor-pointer"
                      title="Edit Category"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateCategory({ ...cat, hidden: !cat.hidden })}
                      className="p-1 rounded-lg text-ink/40 hover:text-ink hover:bg-moss transition-all cursor-pointer"
                      title={cat.hidden ? 'Show in dropdowns' : 'Hide from dropdowns'}
                    >
                      {cat.hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await confirm({
                          title: 'Delete Category',
                          description: `Delete category "${cat.name}"? This cannot be undone.`,
                          confirmText: 'Delete Category',
                          variant: 'danger',
                        });
                        if (ok) {
                          deleteCategory(cat.id);
                        }
                      }}
                      className="p-1 rounded-lg text-ink/40 hover:text-flare-600 hover:bg-flare-50 dark:hover:bg-flare-900/20 transition-all cursor-pointer"
                      title="Delete category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            ))}
          {categories.filter((c) => !c.parentId && (catFilter === 'all' || c.type === catFilter)).length === 0 && (
            <p className="text-xs text-ink/40 text-center py-4">No categories found for this filter.</p>
          )}
        </div>

        <p className="text-[11px] text-ink/40">
          👁 Hidden categories are invisible in dropdowns but existing transactions keep their category. Deleted categories cascade to subcategories.
        </p>
      </div>

      {/* ── KEYBOARD SHORTCUTS CUSTOMIZATION ─────────────────────── */}
      <div className="rounded-2xl border border-line bg-card p-5 sm:p-6 space-y-4 shadow-sm lift">
        <div className="flex items-center justify-between pb-2 border-b border-line gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-pine-600" />
            <h3 className="font-display font-bold text-sm text-ink">Keyboard Shortcuts</h3>
            <span className="text-[11px] text-ink/50 bg-moss px-2 py-0.5 rounded-full font-medium">
              Customizable Hotkeys
            </span>
          </div>
          <button
            type="button"
            onClick={handleResetAllShortcuts}
            className="px-2.5 py-1 rounded-lg bg-moss hover:bg-pine-100 dark:hover:bg-pine-950/40 text-pine-700 dark:text-pine-300 border border-line text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-all"
            title="Reset all shortcuts to defaults"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset All to Defaults</span>
          </button>
        </div>

        <p className="text-xs text-ink/60 leading-relaxed">
          Navigate and record entries at lightning speed across KhataGHAR. Click any shortcut badge to rebind it to your preferred key.
        </p>

        {recordingActionId && (
          <div className="p-3.5 rounded-xl bg-pine-50 dark:bg-pine-950/60 border-2 border-pine-500 animate-pulse flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-pine-800 dark:text-pine-200 font-semibold">
              <Keyboard className="w-4 h-4 text-pine-600 animate-bounce" />
              <span>
                Press any key on your keyboard to assign to <b>{APP_SHORTCUTS.find((s) => s.id === recordingActionId)?.name}</b>... (or press <b>Esc</b> to cancel)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setRecordingActionId(null)}
              className="px-2.5 py-1 rounded-lg bg-card border border-line text-xs font-bold text-ink hover:bg-moss cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="space-y-4">
          {(['Actions', 'Navigation', 'General'] as const).map((cat) => {
            const items = APP_SHORTCUTS.filter((s) => s.category === cat);
            if (items.length === 0) return null;

            return (
              <div key={cat} className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-ink/45 px-1">
                  {cat === 'Actions' ? '⚡ Quick Actions' : cat === 'Navigation' ? '🧭 View Navigation' : '🛠️ General'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {items.map((s) => {
                    const customKey = activeVault?.customShortcuts?.[s.id];
                    const activeKey = customKey || s.defaultKey;
                    const isRecording = recordingActionId === s.id;
                    const isCustomized = Boolean(customKey && customKey.toLowerCase() !== s.defaultKey.toLowerCase());

                    return (
                      <div
                        key={s.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                          isRecording
                            ? 'border-pine-500 ring-2 ring-pine-500 bg-pine-50/70 dark:bg-pine-950/50 shadow-sm'
                            : 'border-line bg-card/60 hover:bg-moss/40'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <span className="block text-xs font-bold text-ink truncate">
                            {s.name}
                          </span>
                          <span className="block text-[10.5px] text-ink/50 truncate">
                            {s.description}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setRecordingActionId(isRecording ? null : s.id)}
                            className={`px-2.5 py-1 rounded-lg border font-mono text-xs font-bold transition-all cursor-pointer ${
                              isRecording
                                ? 'bg-pine-600 text-white border-pine-600 ring-2 ring-pine-400 ring-offset-1 animate-pulse'
                                : isCustomized
                                ? 'bg-pine-100 dark:bg-pine-900/40 text-pine-800 dark:text-pine-200 border-pine-300 dark:border-pine-700 shadow-xs'
                                : 'bg-moss border-line text-ink hover:border-pine-400 hover:bg-card'
                            }`}
                            title="Click to rebind this key"
                          >
                            {isRecording ? 'Press Key…' : formatKeyDisplay(activeKey)}
                          </button>

                          {isCustomized && (
                            <button
                              type="button"
                              onClick={() => handleResetShortcut(s.id)}
                              className="p-1 rounded-lg text-ink/40 hover:text-pine-600 hover:bg-moss transition-colors cursor-pointer"
                              title="Reset to default key"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Onboarding Modal */}
      {isNewVaultOpen && (
        <OnboardingModal
          isOpen={isNewVaultOpen}
          onClose={() => setIsNewVaultOpen(false)}
          isInitialSetup={false}
        />
      )}

      {/* Sync Merged Vault Modal */}
      {isSyncModalOpen && activeVault && (
        <SyncMergedVaultModal
          isOpen={isSyncModalOpen}
          onClose={() => setIsSyncModalOpen(false)}
          mergedVault={activeVault}
        />
      )}
    </div>
  );
};
