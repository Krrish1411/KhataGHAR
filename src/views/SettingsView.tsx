import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Card } from '../components/common/Card';
import { PasswordStrengthMeter } from '../components/security/PasswordStrengthMeter';
import { OnboardingModal } from '../components/security/OnboardingModal';
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
  Lock,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { activeVault, sessionKey, lockVault, refreshVaultList, setActiveVaultMeta } =
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
    updateVaultSettings,
    loadDemoData,
  } = useVault();
  const { theme, setTheme } = useTheme();

  const [isNewVaultOpen, setIsNewVaultOpen] = useState(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [demoSuccess, setDemoSuccess] = useState('');

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

  // Change Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Backup Export State
  const [backupSecret, setBackupSecret] = useState('');
  const [use12WordPhrase, setUse12WordPhrase] = useState(false);
  const [generatedPhrase, setGeneratedPhrase] = useState('');
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
      await changeVaultPassword(activeVault, sessionKey, newPassword);
      setPasswordChangeSuccess('Password changed successfully! Locking vault to enforce re-authentication…');
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
                      ? 'border-pine-400 bg-pine-50/70 dark:bg-pine-950/50 text-pine-700 dark:text-pine-300 font-bold'
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
                <span className="text-[11px] font-bold text-pine-700 dark:text-pine-400 block">
                  Write down these 12 words in order:
                </span>
                <div className="p-2.5 rounded-lg bg-card border border-line font-mono text-xs font-bold text-ink tracking-wide">
                  {generatedPhrase}
                </div>
              </div>
            ) : (
              <Input
                type="password"
                label="Backup Decryption Password"
                placeholder="Password to protect this file…"
                value={backupSecret}
                onChange={(e) => setBackupSecret(e.target.value)}
              />
            )}

            <Button
              onClick={handleExportBackup}
              variant="primary"
              size="sm"
              isLoading={isExporting}
            >
              <Download className="w-4 h-4 mr-1.5" />
              <span>Download Encrypted File</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Demo Data & Accounts */}
      <div className="space-y-3">
        <h3 className="font-display font-bold text-xs uppercase tracking-wider text-pine-700 dark:text-pine-400 px-1 flex items-center gap-2">
          <Database className="w-4 h-4 text-pine-600" />
          <span>Demo Data & Accounts</span>
        </h3>

        <div className="rounded-2xl border border-line bg-card w-full p-5 sm:p-6 space-y-3.5 shadow-sm lift">
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink/70">Current Ledger Size</span>
            <span className="font-mono font-bold text-ink num">
              {transactions.length} entries · {accounts.length} accounts
            </span>
          </div>

          <div className="pt-1">
            <Button
              variant="outline"
              size="sm"
              isLoading={isLoadingDemo}
              onClick={handleLoadDemo}
            >
              <Sparkles className="w-4 h-4 mr-1.5 text-pine-600" />
              <span>Load Realistic Indian Demo Data</span>
            </Button>
          </div>

          <p className="text-[11px] text-ink/50 leading-relaxed">
            Populates 4 accounts (HDFC, Cash, Paytm, SBI Credit Card), 4 months of transactions (Salary, Rent, SIP, Swiggy, Groceries), custodial funds (sister Priya & friend Amit), budgets, goals, and planned bills.
          </p>

          {demoSuccess && (
            <div className="p-3 rounded-xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 text-pine-800 dark:text-pine-200 text-xs font-semibold">
              {demoSuccess}
            </div>
          )}
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
                          ? 'border-pine-400 bg-pine-50/70 dark:bg-pine-950/50 text-ink'
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
                          ? 'border-pine-400 bg-pine-50/70 dark:bg-pine-950/50 text-ink'
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

{/* Onboarding Modal */}
      {isNewVaultOpen && (
        <OnboardingModal
          isOpen={isNewVaultOpen}
          onClose={() => setIsNewVaultOpen(false)}
          isInitialSetup={false}
        />
      )}
    </div>
  );
};
