import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { useVault } from '../../context/VaultContext';
import type { Account, AccountType, AccountTag, CurrencyCode } from '../../types';
import { Landmark, Wallet } from 'lucide-react';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountToEdit?: Account;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  accountToEdit,
}) => {
  const { addAccount, updateAccount, activeVault } = useVault();

  const [name, setName] = useState(accountToEdit?.name || '');
  const [type, setType] = useState<AccountType>(accountToEdit?.type || 'bank');
  const [currency, setCurrency] = useState<CurrencyCode>(accountToEdit?.currency || 'INR');
  const [balance, setBalance] = useState(accountToEdit?.balance !== undefined ? String(accountToEdit.balance) : '0');
  const [tag, setTag] = useState<AccountTag>(accountToEdit?.tag || 'personal');
  const [isVisibleOnDashboard, setIsVisibleOnDashboard] = useState(accountToEdit?.isVisibleOnDashboard ?? true);
  const [institutionName, setInstitutionName] = useState(accountToEdit?.institutionName || '');
  const [accountNumberLast4, setAccountNumberLast4] = useState(accountToEdit?.accountNumberLast4 || '');
  const [notes, setNotes] = useState(accountToEdit?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide an account name');
      return;
    }

    const numBalance = parseFloat(balance);
    if (isNaN(numBalance)) {
      setError('Please provide a valid balance');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (accountToEdit) {
        await updateAccount({
          ...accountToEdit,
          name: name.trim(),
          type,
          currency,
          balance: numBalance,
          tag,
          isVisibleOnDashboard,
          institutionName: institutionName.trim() || undefined,
          accountNumberLast4: accountNumberLast4.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      } else {
        await addAccount({
          name: name.trim(),
          type,
          currency,
          balance: numBalance,
          initialBalance: numBalance,
          tag,
          isVisibleOnDashboard,
          institutionName: institutionName.trim() || undefined,
          accountNumberLast4: accountNumberLast4.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save account');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Landmark className="w-5 h-5 text-brand-500" />
          <span>{accountToEdit ? 'Edit Account' : 'Add New Account'}</span>
        </div>
      }
      description="Track bank balances, cash, digital wallets, and credit cards"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        <Input
          label="Account Name"
          placeholder="e.g. HDFC Salary, Emergency Cash, SBI Savings"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Account Type"
            value={type}
            onChange={(e) => setType(e.target.value as AccountType)}
            options={[
              { value: 'bank', label: 'Bank Account' },
              { value: 'cash', label: 'Cash in Hand' },
              { value: 'credit_card', label: 'Credit Card' },
              { value: 'wallet', label: 'Digital Wallet (Paytm/Amazon)' },
              { value: 'upi', label: 'UPI Linked Account' },
              { value: 'investment', label: 'Investment / Demat' },
              { value: 'other', label: 'Other' },
            ]}
          />

          <Select
            label="Currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
            options={[
              { value: 'INR', label: 'INR (₹)' },
              { value: 'USD', label: 'USD ($)' },
              { value: 'EUR', label: 'EUR (€)' },
              { value: 'GBP', label: 'GBP (£)' },
              { value: 'AED', label: 'AED (د.إ)' },
              { value: 'SGD', label: 'SGD (S$)' },
            ]}
          />
        </div>

        <Input
          type="number"
          step="any"
          label="Current Balance"
          placeholder="0.00"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          tabularNums
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Bank / Institution (Optional)"
            placeholder="e.g. HDFC Bank, ICICI"
            value={institutionName}
            onChange={(e) => setInstitutionName(e.target.value)}
          />

          <Input
            label="Last 4 Digits (Optional)"
            placeholder="e.g. 4821"
            maxLength={4}
            value={accountNumberLast4}
            onChange={(e) => setAccountNumberLast4(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Tag (Household / Personal)"
            value={tag}
            onChange={(e) => setTag(e.target.value as AccountTag)}
            options={[
              { value: 'personal', label: 'Personal Account' },
              { value: 'household', label: 'Household Shared' },
            ]}
          />

          <div className="flex flex-col justify-center space-y-1.5 pt-4">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isVisibleOnDashboard}
                onChange={(e) => setIsVisibleOnDashboard(e.target.checked)}
                className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
              />
              <span>Show on Dashboard</span>
            </label>
          </div>
        </div>

        <Input
          label="Notes (Optional)"
          placeholder="e.g. Primary salary account"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {accountToEdit ? 'Update Account' : 'Create Account'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
