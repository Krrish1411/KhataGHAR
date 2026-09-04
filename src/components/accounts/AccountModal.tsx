import React, { useState, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { useVault } from '../../context/VaultContext';
import { formatCurrency } from '../../utils/formatters';
import { isTxAfterBaseline } from '../../utils/dates';
import type { Account, AccountType, AccountTag, CurrencyCode } from '../../types';
import { Landmark, Wallet, ShieldCheck } from 'lucide-react';

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
  const { addAccount, updateAccount, transactions, peopleLedger } = useVault();

  const [name, setName] = useState(accountToEdit?.name || '');
  const [type, setType] = useState<AccountType>(accountToEdit?.type || 'bank');
  const [currency, setCurrency] = useState<CurrencyCode>(accountToEdit?.currency || 'INR');
  const [initialBalance, setInitialBalance] = useState(
    accountToEdit?.initialBalance !== undefined
      ? String(accountToEdit.type === 'credit_card' ? Math.abs(accountToEdit.initialBalance) : accountToEdit.initialBalance)
      : (accountToEdit?.balance !== undefined
          ? String(accountToEdit.type === 'credit_card' ? Math.abs(accountToEdit.balance) : accountToEdit.balance)
          : '0')
  );
  const [balanceAsOfDate, setBalanceAsOfDate] = useState(
    accountToEdit?.balanceAsOfDate || new Date().toISOString().split('T')[0]
  );
  const [tag, setTag] = useState<AccountTag>(accountToEdit?.tag || 'personal');
  const [isVisibleOnDashboard, setIsVisibleOnDashboard] = useState(accountToEdit?.isVisibleOnDashboard ?? true);
  const [institutionName, setInstitutionName] = useState(accountToEdit?.institutionName || '');
  const [accountNumberLast4, setAccountNumberLast4] = useState(accountToEdit?.accountNumberLast4 || '');
  const [notes, setNotes] = useState(accountToEdit?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Calculate activity since baseline date
  const ledgerActivity = useMemo(() => {
    if (!accountToEdit) return 0;
    let net = 0;
    transactions.forEach((tx) => {
      if (isTxAfterBaseline(tx.date, balanceAsOfDate)) {
        const amt = Math.abs(Number(tx.amount)) || 0;
        if (tx.accountId === accountToEdit.id && tx.type === 'expense') net -= amt;
        if (tx.accountId === accountToEdit.id && tx.type === 'income') net += amt;
        if (tx.accountId === accountToEdit.id && tx.type === 'transfer') net -= amt;
        if (tx.toAccountId === accountToEdit.id && tx.type === 'transfer') net += amt;
      }
    });
    peopleLedger.forEach((entry) => {
      if (entry.accountId === accountToEdit.id && isTxAfterBaseline(entry.date, balanceAsOfDate)) {
        const delta = entry.type === 'lent' ? -entry.amount : entry.amount;
        net += delta;
      }
      (entry.settlements || []).forEach((s) => {
        if (s.accountId === accountToEdit.id && isTxAfterBaseline(s.date, balanceAsOfDate)) {
          const sDelta = entry.type === 'lent' ? s.amount : -s.amount;
          net += sDelta;
        }
      });
    });
    return Math.round((net + Number.EPSILON) * 100) / 100;
  }, [accountToEdit, transactions, peopleLedger, balanceAsOfDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide an account name');
      return;
    }

    const cleanBalance = (initialBalance || '').trim();
    const rawNum = cleanBalance === '' ? 0 : parseFloat(cleanBalance);
    if (isNaN(rawNum)) {
      setError('Please provide a valid numeric opening balance or 0');
      return;
    }

    const parsed = Math.round((rawNum + Number.EPSILON) * 100) / 100;
    // Credit card outstanding balance is stored as a negative liability balance
    const finalInitial = type === 'credit_card' ? -Math.abs(parsed) : parsed;

    setIsSubmitting(true);
    setError('');

    try {
      const finalDate = balanceAsOfDate || new Date().toISOString().split('T')[0];
      if (accountToEdit) {
        // Recompute current balance = new fixed initial balance + ledger activity post-baseline
        const finalCurrentBalance = Math.round((finalInitial + ledgerActivity + Number.EPSILON) * 100) / 100;

        await updateAccount({
          ...accountToEdit,
          name: name.trim(),
          type,
          currency,
          initialBalance: finalInitial,
          balance: finalCurrentBalance,
          balanceAsOfDate: finalDate,
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
          initialBalance: finalInitial,
          balance: finalInitial,
          balanceAsOfDate: finalDate,
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
          <div className="w-8 h-8 rounded-xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 grid place-items-center text-pine-600">
            {type === 'bank' ? <Landmark className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
          </div>
          <span>{accountToEdit ? 'Edit Account Enclave' : 'Create New Account'}</span>
        </div>
      }
      description={
        accountToEdit
          ? 'Update account details and baseline ledger parameters.'
          : 'Add a new bank, wallet, cash reserve, or credit card to your encrypted ledger.'
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-flare-50 dark:bg-flare-950/30 text-flare-700 dark:text-flare-300 rounded-xl text-xs border border-flare-200 dark:border-flare-800/40">
            {error}
          </div>
        )}

        <Input
          label="Account Name"
          placeholder="e.g. HDFC Salary, Emergency Cash, ICICI Amazon Pay Card"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            type="number"
            step="any"
            label={type === 'credit_card' ? 'Opening Debt (as of date)' : 'Opening / Initial Balance'}
            helperText="Fixed baseline balance on opening date. Remains unchanged unless you edit it."
            placeholder="0.00"
            value={initialBalance}
            onChange={(e) => setInitialBalance(e.target.value)}
            tabularNums
          />

          <Input
            type="date"
            label="Opening Date (Balance As Of)"
            helperText="Txns on or before this date won't alter your baseline"
            value={balanceAsOfDate}
            onChange={(e) => setBalanceAsOfDate(e.target.value)}
          />
        </div>

        {accountToEdit && (
          <div className="p-3.5 rounded-xl bg-moss/70 border border-line text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 text-pine-700 dark:text-pine-400 font-bold text-[11px] mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Baseline Protection Active</span>
            </div>
            <div className="flex justify-between items-center text-ink/70">
              <span>Opening / Initial Balance (Fixed):</span>
              <span className="font-mono font-bold text-ink">
                {formatCurrency(parseFloat(initialBalance || '0') || 0, currency)}
              </span>
            </div>
            <div className="flex justify-between items-center text-ink/70">
              <span>Ledger Activity (Post-{balanceAsOfDate}):</span>
              <span className={`font-mono font-bold ${ledgerActivity >= 0 ? 'text-pine-700 dark:text-pine-400' : 'text-flare-600'}`}>
                {ledgerActivity >= 0 ? '+' : ''}{formatCurrency(ledgerActivity, currency)}
              </span>
            </div>
            <div className="flex justify-between items-center text-ink pt-1.5 border-t border-line font-bold">
              <span>Calculated Running Balance:</span>
              <span className="font-mono font-extrabold text-sm">
                {formatCurrency(
                  (type === 'credit_card' ? -1 : 1) * ((parseFloat(initialBalance || '0') || 0) + ledgerActivity),
                  currency
                )}
              </span>
            </div>
          </div>
        )}

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
