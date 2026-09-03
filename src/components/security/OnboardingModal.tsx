import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { Surface } from '../common/Card';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { createVault } from '../../services/storage';
import { isAcceptablePassword } from '../../services/crypto';
import { useAuth } from '../../context/AuthContext';
import { Shield, KeyRound, Sparkles } from 'lucide-react';
import type { CurrencyCode, NumberFormatType } from '../../types';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInitialSetup?: boolean;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  isInitialSetup = true,
}) => {
  const { setSessionCredentials, refreshVaultList } = useAuth();

  const [vaultName, setVaultName] = useState(isInitialSetup ? 'My Vault' : '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  const [numberFormat, setNumberFormat] = useState<NumberFormatType>('indian');
  const [fyStartMonth, setFyStartMonth] = useState<number>(4); // April Indian FY
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultName.trim()) {
      setError('Please provide a name for this vault');
      return;
    }
    const acceptability = isAcceptablePassword(password);
    if (!acceptability.valid) {
      setError(acceptability.reason || 'High-end password required (min 10 characters, uppercase, lowercase, numbers, and symbols).');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const { vault, key } = await createVault({
        name: vaultName.trim(),
        password,
        currency,
        numberFormat,
        fyStartMonth,
        isPrimary: isInitialSetup,
      });

      await refreshVaultList();
      setSessionCredentials(vault, key);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create vault');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex-shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold">
              {isInitialSetup ? 'Initialize Secure Vault' : 'Create Enclave Vault'}
            </span>
          </div>
        </div>
      }
      description={
        isInitialSetup
          ? 'Setup your encrypted personal finance vault. Everything is encrypted and stored locally on this device.'
          : 'Create an independent, separately encrypted vault (e.g. for parents, spouse, or business).'
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-medium">
            {error}
          </div>
        )}

        <Input
          label="Vault Name"
          placeholder="e.g. My Vault, Mom's Finances, Business Petty Cash"
          value={vaultName}
          onChange={(e) => setVaultName(e.target.value)}
          required
        />

        <div className="space-y-2">
          <Input
            type="password"
            label="Master Password (Crucial)"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            leftIcon={<KeyRound className="w-4 h-4" />}
          />
          <PasswordStrengthMeter password={password} />
        </div>

        <Input
          type="password"
          label="Confirm Master Password"
          placeholder="Repeat master password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          leftIcon={<KeyRound className="w-4 h-4" />}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <Select
            label="Base Currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
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

          <Select
            label="Number System"
            value={numberFormat}
            onChange={(e) => setNumberFormat(e.target.value as NumberFormatType)}
            options={[
              { value: 'indian', label: 'Indian (1,00,000 / Lakhs)' },
              { value: 'international', label: 'International (100,000 / M)' },
            ]}
          />
        </div>

        <Select
          label="Financial Year Start"
          value={String(fyStartMonth)}
          onChange={(e) => setFyStartMonth(parseInt(e.target.value, 10))}
          options={[
            { value: '4', label: 'April to March (Indian Financial Year)' },
            { value: '1', label: 'January to December (Calendar Year)' },
            { value: '7', label: 'July to June (Australian FY)' },
            { value: '10', label: 'October to September (US FY)' },
          ]}
        />

        <Surface className="p-3 text-xs text-slate-600 dark:text-slate-400 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Zero-Server Cryptographic Isolation</span>
          </div>
          <p className="leading-relaxed text-[11px]">
            Your master password is never transmitted anywhere. An AES-256-GCM key is derived locally using PBKDF2 with 250,000 SHA-256 iterations.
          </p>
        </Surface>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full sm:w-auto"
            isLoading={isCreating}
          >
            {isInitialSetup ? 'Initialize Vault' : 'Create Enclave'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
