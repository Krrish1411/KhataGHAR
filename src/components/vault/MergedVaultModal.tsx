import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Badge } from '../common/Badge';
import { PasswordStrengthMeter } from '../security/PasswordStrengthMeter';
import { createMergedVault, loadAndDecryptVault } from '../../services/storage';
import { isAcceptablePassword } from '../../services/crypto';
import { useAuth } from '../../context/AuthContext';
import { useVault } from '../../context/VaultContext';
import { Layers, Shield, Lock, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import type { CurrencyCode, NumberFormatType, VaultData, VaultMeta } from '../../types';

interface MergedVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MergedVaultModal: React.FC<MergedVaultModalProps> = ({ isOpen, onClose }) => {
  const { allVaults, activeVault, refreshVaultList, setSessionCredentials } = useAuth();
  const activeVaultContextData = useVault();

  const [mergedName, setMergedName] = useState('Consolidated Family Vault');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>(activeVault?.currency || 'INR');
  const [numberFormat, setNumberFormat] = useState<NumberFormatType>(activeVault?.numberFormat || 'indian');

  // Selected vaults to include (keyed by vault.id)
  const [selectedVaultIds, setSelectedVaultIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    allVaults.forEach((v) => {
      // Exclude existing merged vaults by default
      if (!v.isMerged) initial[v.id] = true;
    });
    return initial;
  });

  // Passwords entered for non-active vaults
  const [vaultPasswords, setVaultPasswords] = useState<Record<string, string>>({});

  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');

  const handleToggleVault = (vaultId: string) => {
    setSelectedVaultIds((prev) => ({
      ...prev,
      [vaultId]: !prev[vaultId],
    }));
  };

  const handlePasswordChange = (vaultId: string, val: string) => {
    setVaultPasswords((prev) => ({
      ...prev,
      [vaultId]: val,
    }));
  };

  const handleCreateMergedVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!mergedName.trim()) {
      setError('Please provide a name for the merged vault');
      return;
    }

    const acceptability = isAcceptablePassword(password);
    if (!acceptability.valid) {
      setError(
        acceptability.reason ||
          'High-end password required (min 10 characters, uppercase, lowercase, numbers, and symbols).'
      );
      return;
    }

    if (password !== confirmPassword) {
      setError('Master passwords do not match.');
      return;
    }

    const targetVaults = allVaults.filter((v) => selectedVaultIds[v.id]);
    if (targetVaults.length < 2) {
      setError('Please select at least 2 vaults to merge into this consolidated enclave.');
      return;
    }

    // Check that passwords have been entered for all selected locked vaults
    for (const v of targetVaults) {
      if (activeVault && v.id === activeVault.id) continue;
      if (!vaultPasswords[v.id]) {
        setError(`Please enter the master password for "${v.name}" to decrypt its records.`);
        return;
      }
    }

    setIsProcessing(true);
    setProgressMsg('Decrypting source vaults...');

    try {
      const sourceVaultsData: Array<{ vault: VaultMeta; data: VaultData }> = [];

      for (const v of targetVaults) {
        if (activeVault && v.id === activeVault.id) {
          // Use in-memory active data
          sourceVaultsData.push({
            vault: v,
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
          setProgressMsg(`Decrypting "${v.name}"...`);
          const decrypted = await loadAndDecryptVault(v.id, vaultPasswords[v.id]);
          if (!decrypted) {
            throw new Error(`Incorrect password for vault "${v.name}". Please check the password.`);
          }
          sourceVaultsData.push({
            vault: decrypted.vault,
            data: decrypted.data,
          });
        }
      }

      setProgressMsg('Consolidating accounts and encrypting merged enclave...');
      const { vault: newMergedVault, key: newMergedKey } = await createMergedVault({
        name: mergedName.trim(),
        password,
        currency,
        numberFormat,
        sourceVaultsData,
      });

      await refreshVaultList();
      setSessionCredentials(newMergedVault, newMergedKey);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create merged vault');
    } finally {
      setIsProcessing(false);
      setProgressMsg('');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-pine-500/10 text-pine-600 border border-pine-500/20 flex-shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold">Consolidate & Merge Multi-Vault</span>
          </div>
        </div>
      }
      description="Combines records across family vaults into a unified enclave with its own independent master password."
      maxWidth="lg"
    >
      <form onSubmit={handleCreateMergedVault} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Merged Vault Details */}
        <div className="p-4 rounded-2xl bg-card border border-line space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-ink/70 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-pine-600" />
            <span>1. New Merged Vault Credentials</span>
          </h4>

          <div className="space-y-3">
            <Input
              label="Merged Vault Name"
              value={mergedName}
              onChange={(e) => setMergedName(e.target.value)}
              placeholder="e.g. Consolidated Family Vault, Master Household"
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="New Master Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose strong master password"
                required
              />
              <Input
                label="Confirm Master Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                required
              />
            </div>

            <PasswordStrengthMeter password={password} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <Select
                label="Display Currency"
                value={currency}
                onChange={(e: any) => setCurrency(e.target.value as CurrencyCode)}
                options={[
                  { value: 'INR', label: 'INR (₹) — Indian Rupee' },
                  { value: 'USD', label: 'USD ($) — US Dollar' },
                  { value: 'EUR', label: 'EUR (€) — Euro' },
                  { value: 'GBP', label: 'GBP (£) — British Pound' },
                  { value: 'AED', label: 'AED (د.إ) — UAE Dirham' },
                  { value: 'SGD', label: 'SGD (S$) — Singapore Dollar' },
                ]}
              />

              <Select
                label="Number Format"
                value={numberFormat}
                onChange={(e: any) => setNumberFormat(e.target.value as NumberFormatType)}
                options={[
                  { value: 'indian', label: 'Indian (1,00,000 / Lakhs / Crores)' },
                  { value: 'international', label: 'International (100,000 / Millions)' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Vault Selection & Authentication */}
        <div className="p-4 rounded-2xl bg-card border border-line space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink/70 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-mari-600" />
              <span>2. Select Source Vaults & Authorize Decryption</span>
            </h4>
            <span className="text-[11px] text-ink/50">
              {allVaults.filter((v) => selectedVaultIds[v.id]).length} of {allVaults.length} selected
            </span>
          </div>

          <p className="text-[11.5px] text-ink/60">
            Because KhataGHAR utilizes 100% zero-knowledge local encryption, you must provide each vault's password to decrypt and merge its accounts and transaction histories.
          </p>

          <div className="space-y-2.5 max-h-60 overflow-y-auto custom-scrollbar pr-1">
            {allVaults.map((vault) => {
              const isSelected = Boolean(selectedVaultIds[vault.id]);
              const isActive = activeVault?.id === vault.id;

              return (
                <div
                  key={vault.id}
                  className={`p-3 rounded-xl border transition-all space-y-2 ${
                    isSelected
                      ? 'border-pine-400/60 bg-pine-50/20 dark:bg-pine-950/20'
                      : 'border-line bg-moss/30 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-ink">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleVault(vault.id)}
                        className="rounded border-line text-pine-600 focus:ring-pine-500 cursor-pointer"
                      />
                      <span>{vault.name}</span>
                      {vault.isPrimary && <Badge tone="mari">Primary</Badge>}
                      {vault.isMerged && <Badge tone="sky">Merged</Badge>}
                    </label>

                    {isActive ? (
                      <span className="text-[11px] font-semibold text-pine-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Active & Decrypted</span>
                      </span>
                    ) : (
                      <span className="text-[10.5px] text-ink/40">Requires Password</span>
                    )}
                  </div>

                  {/* Password Input for locked vaults */}
                  {isSelected && !isActive && (
                    <div className="pt-1">
                      <Input
                        type="password"
                        value={vaultPasswords[vault.id] || ''}
                        onChange={(e) => handlePasswordChange(vault.id, e.target.value)}
                        placeholder={`Master password for "${vault.name}"`}
                        className="text-xs !py-1.5"
                        required
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl border border-line bg-card hover:bg-moss text-xs font-semibold text-ink transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isProcessing}
            className="px-5 py-2.5 rounded-xl bg-pine-700 hover:bg-pine-600 active:scale-[0.97] text-white text-xs font-bold shadow-sm shadow-pine-900/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isProcessing ? progressMsg || 'Merging...' : 'Generate Merged Vault'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
