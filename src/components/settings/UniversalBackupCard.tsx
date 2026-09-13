import React, { useState, useRef } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { useAuth } from '../../context/AuthContext';
import { useVault } from '../../context/VaultContext';
import { exportVaultEncrypted, importVaultEncrypted, importPlainSnapshot } from '../../services/backup';
import type { VaultData } from '../../types';
import {
  Download,
  Lock,
  Upload,
  AlertTriangle,
  ShieldCheck,
  Smartphone,
  Laptop,
  CheckCircle2,
  FileDown,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';

export const UniversalBackupCard: React.FC = () => {
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

  // Export Plain Modal
  const [isPlainWarningOpen, setIsPlainWarningOpen] = useState(false);
  const [isExportingPlain, setIsExportingPlain] = useState(false);

  // Password-Protect Export Modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [confirmExportPassword, setConfirmExportPassword] = useState('');
  const [showExportPassword, setShowExportPassword] = useState(false);
  const [isExportingProtected, setIsExportingProtected] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPassword, setImportPassword] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [pendingFileContent, setPendingFileContent] = useState<string | null>(null);
  const [isPendingEncrypted, setIsPendingEncrypted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Export Plain Portable Snapshot (.khataghar)
  const handleConfirmPlainExport = async () => {
    if (!activeVault) return;
    setIsExportingPlain(true);
    try {
      const data = getDecryptedVaultData();
      const payload = {
        app: 'KhataGHAR',
        format: 'khataghar-portable-snapshot',
        version: 2,
        isEncrypted: false,
        exportedAt: new Date().toISOString(),
        vaultMeta: activeVault,
        data,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/octet-stream',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `KhataGHAR_Snapshot_${activeVault.name.replace(/\s+/g, '_')}_${dateStr}.khataghar`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsPlainWarningOpen(false);
    } catch (err: any) {
      console.error('Failed to export plain snapshot:', err);
      alert('Failed to export snapshot: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsExportingPlain(false);
    }
  };

  // 2. Export Password-Protected Backup (.khataghar)
  const handlePasswordProtectedExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (!exportPassword) {
      setPasswordError('Please enter a password.');
      return;
    }
    if (exportPassword !== confirmExportPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    if (exportPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      return;
    }

    if (!activeVault) return;
    setIsExportingProtected(true);

    try {
      const data = getDecryptedVaultData();
      const encryptedBackupJson = await exportVaultEncrypted(
        activeVault,
        data,
        exportPassword
      );

      const blob = new Blob([encryptedBackupJson], {
        type: 'application/octet-stream',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `KhataGHAR_Protected_${activeVault.name.replace(/\s+/g, '_')}_${dateStr}.khataghar`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setIsPasswordModalOpen(false);
      setExportPassword('');
      setConfirmExportPassword('');
    } catch (err: any) {
      setPasswordError('Export failed: ' + (err?.message || 'Encryption error'));
    } finally {
      setIsExportingProtected(false);
    }
  };

  // 3. File Selected for Import (.khataghar / .json)
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError('');
    setImportSuccess('');
    setImportPassword('');

    try {
      const text = await file.text();
      setPendingFileContent(text);

      // Inspect if plain snapshot or encrypted
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        setImportError('Invalid backup file: Not valid JSON/khataghar data.');
        setIsImportModalOpen(true);
        return;
      }

      if (parsed.format === 'khataghar-portable-snapshot' && !parsed.isEncrypted) {
        // Direct unencrypted snapshot
        setIsPendingEncrypted(false);
        setIsImportModalOpen(true);
      } else {
        // Password-encrypted file
        setIsPendingEncrypted(true);
        setIsImportModalOpen(true);
      }
    } catch (err: any) {
      setImportError('Failed to read file: ' + err.message);
      setIsImportModalOpen(true);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Execute Import
  const handleExecuteImport = async () => {
    if (!pendingFileContent) return;
    setIsImporting(true);
    setImportError('');

    try {
      if (!isPendingEncrypted) {
        // Restore plain snapshot: requires a password to protect the imported vault on device
        if (!importPassword) {
          setImportError('Please enter a password to protect this vault on your device.');
          setIsImporting(false);
          return;
        }

        const imported = await importPlainSnapshot(pendingFileContent, importPassword);
        setImportSuccess(`Successfully imported vault "${imported.vault.name}"!`);
        await refreshVaultList();
        setTimeout(async () => {
          setIsImportModalOpen(false);
          setSessionCredentials(imported.vault, imported.key);
          await reloadVaultData();
        }, 1200);
      } else {
        // Restore password-protected backup
        if (!importPassword) {
          setImportError('Please enter the backup password.');
          setIsImporting(false);
          return;
        }

        const imported = await importVaultEncrypted(pendingFileContent, importPassword);
        setImportSuccess(`Successfully decrypted and imported vault "${imported.vault.name}"!`);
        await refreshVaultList();
        setTimeout(async () => {
          setIsImportModalOpen(false);
          setSessionCredentials(imported.vault, imported.key);
          await reloadVaultData();
        }, 1200);
      }
    } catch (err: any) {
      setImportError('Import failed: ' + (err?.message || 'Incorrect password or corrupted backup'));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Title Header matching user reference */}
      <div>
        <h3 className="font-display font-bold text-base sm:text-lg text-ink">
          Vault Backups & Migration
        </h3>
        <p className="text-xs text-ink/60 mt-0.5">
          Everything is encrypted at rest using your local device key. Export portable snapshots or create password-protected backups for safe cloud storage.
        </p>
      </div>

      {/* Reference UI Card */}
      <div className="rounded-2xl border border-line bg-card p-5 sm:p-6 space-y-4 shadow-sm lift">
        {/* Title Bar with PC <-> Phone Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-8 h-8 rounded-xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 grid place-items-center text-pine-600">
              <Download className="w-4 h-4" />
            </span>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-sm text-ink">
                Universal Backup & Migration (.khataghar)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                <Laptop className="w-3 h-3" />
                <span>PC ↔ Phone</span>
                <Smartphone className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>

        <p className="text-xs text-ink/65 leading-relaxed">
          Complete portable database snapshot with all accounts, transactions, people, budgets, notes, and attachments. 100% compatible across Desktop, Android, and Web.
        </p>

        {/* 3 Action Buttons Row */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {/* Button 1: Export Portable Snapshot */}
          <Button
            onClick={() => setIsPlainWarningOpen(true)}
            variant="primary"
            size="sm"
            className="shadow-sm"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            <span>Export Portable Snapshot (.khataghar)</span>
          </Button>

          {/* Button 2: Password-Protect */}
          <Button
            onClick={() => {
              setPasswordError('');
              setExportPassword('');
              setConfirmExportPassword('');
              setIsPasswordModalOpen(true);
            }}
            variant="outline"
            size="sm"
          >
            <Lock className="w-3.5 h-3.5 mr-1.5 text-pine-600" />
            <span>Password-Protect (.khataghar)</span>
          </Button>

          {/* Button 3: Import Backup */}
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".khataghar,.json,.sqlite,.db"
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="sm"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5 text-ink/70" />
              <span>Import Backup (.khataghar / .json)</span>
            </Button>
          </div>
        </div>

        {/* Security Tip Alert Box matching reference */}
        <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300/60 dark:border-amber-800/50 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">Security Tip: </span>
            Unencrypted portable snapshots are intended for easy migration or trusted offline drives. Delete snapshot files after use or use password protection if uploading to cloud storage.
          </div>
        </div>
      </div>

      {/* ⚠️ Plain Snapshot Warning Modal */}
      <Modal
        isOpen={isPlainWarningOpen}
        onClose={() => setIsPlainWarningOpen(false)}
        title="Export Unencrypted Snapshot?"
        description="Review security guidelines before generating a portable file"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 space-y-2">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Unencrypted Financial Snapshot</span>
            </div>
            <p className="text-xs text-amber-900/80 dark:text-amber-200/80 leading-relaxed">
              This `.khataghar` portable file contains raw readable records of your balances, accounts, transactions, and notes. Anyone with access to this file will be able to inspect your entire financial history.
            </p>
          </div>

          <div className="space-y-1.5 text-xs text-ink/70">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-pine-600 shrink-0" />
              <span>Intended for rapid transfer between your own trusted offline devices.</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-pine-600 shrink-0" />
              <span>For Google Drive, Dropbox, or email, use <b>Password-Protect</b> instead.</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
            <Button
              variant="ghost"
              onClick={() => setIsPlainWarningOpen(false)}
              disabled={isExportingPlain}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmPlainExport}
              isLoading={isExportingPlain}
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              <span>Download Portable Snapshot</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* 🔒 Password-Protect Export Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Password-Protect Vault Backup"
        description="Creates an AES-256-GCM zero-knowledge encrypted .khataghar file"
        maxWidth="md"
      >
        <form onSubmit={handlePasswordProtectedExport} className="space-y-4">
          <div className="p-3 rounded-xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 flex items-center gap-2 text-xs text-pine-800 dark:text-pine-300">
            <ShieldCheck className="w-4 h-4 text-pine-600 shrink-0" />
            <span>Encrypted with PBKDF2 (100,000 iterations) + AES-256-GCM. Safe for cloud storage.</span>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <Input
                type={showExportPassword ? 'text' : 'password'}
                label="Backup Password"
                placeholder="Choose a strong backup passphrase"
                value={exportPassword}
                onChange={(e) => setExportPassword(e.target.value)}
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowExportPassword(!showExportPassword)}
                className="absolute right-3 top-8 text-ink/40 hover:text-ink cursor-pointer"
              >
                {showExportPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div>
              <Input
                type={showExportPassword ? 'text' : 'password'}
                label="Confirm Backup Password"
                placeholder="Re-enter backup passphrase"
                value={confirmExportPassword}
                onChange={(e) => setConfirmExportPassword(e.target.value)}
                required
              />
              {confirmExportPassword && (
                <div className="mt-1 text-[11px] flex items-center gap-1">
                  {exportPassword === confirmExportPassword ? (
                    <span className="text-pine-600 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> Passwords match
                    </span>
                  ) : (
                    <span className="text-flare-600 font-semibold">
                      Passwords do not match
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {passwordError && (
            <div className="p-2.5 rounded-xl bg-flare-50 dark:bg-flare-950/40 border border-flare-200 text-flare-700 dark:text-flare-300 text-xs font-semibold">
              {passwordError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsPasswordModalOpen(false)}
              disabled={isExportingProtected}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isExportingProtected}
              disabled={!exportPassword || exportPassword !== confirmExportPassword}
            >
              <Lock className="w-3.5 h-3.5 mr-1.5" />
              <span>Encrypt & Export (.khataghar)</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* 📥 Import Backup Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Vault Backup"
        description="Restore your financial database from .khataghar snapshot or backup"
        maxWidth="md"
      >
        <div className="space-y-4">
          {isPendingEncrypted ? (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 text-xs text-pine-800 dark:text-pine-300 flex items-center gap-2">
                <Lock className="w-4 h-4 text-pine-600 shrink-0" />
                <span>This backup is password-protected. Enter the passphrase used during export.</span>
              </div>

              <Input
                type="password"
                label="Passphrase"
                placeholder="Enter backup password"
                value={importPassword}
                onChange={(e) => setImportPassword(e.target.value)}
                autoFocus
              />
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-moss border border-line text-xs text-ink/75 leading-relaxed">
              Unencrypted portable snapshot detected. Ready to restore accounts, ledger records, notes, and folders into your workspace.
            </div>
          )}

          {importError && (
            <div className="p-2.5 rounded-xl bg-flare-50 dark:bg-flare-950/40 border border-flare-200 text-flare-700 dark:text-flare-300 text-xs font-semibold">
              {importError}
            </div>
          )}

          {importSuccess && (
            <div className="p-2.5 rounded-xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200 text-pine-700 dark:text-pine-300 text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-pine-600 shrink-0" />
              <span>{importSuccess}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
            <Button
              variant="ghost"
              onClick={() => setIsImportModalOpen(false)}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleExecuteImport}
              isLoading={isImporting}
              disabled={Boolean(isPendingEncrypted && !importPassword)}
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              <span>Restore & Open Vault</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
