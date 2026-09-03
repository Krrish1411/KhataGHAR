import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { useVault } from '../../context/VaultContext';
import { formatDateISO } from '../../utils/dates';
import type { PeopleLedgerEntry, PeopleEntryType, CurrencyCode, Account } from '../../types';
import { Users2, ArrowUpRight, ArrowDownLeft, HandCoins, Landmark } from 'lucide-react';

interface PeopleEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryToEdit?: PeopleLedgerEntry;
  initialType?: PeopleEntryType;
}

export const PeopleEntryModal: React.FC<PeopleEntryModalProps> = ({
  isOpen,
  onClose,
  entryToEdit,
  initialType = 'lent',
}) => {
  const { addPeopleEntry, updatePeopleEntry, accounts, activeVault } = useVault();

  const [type, setType] = useState<PeopleEntryType>(entryToEdit?.type || initialType);
  const [contactName, setContactName] = useState(entryToEdit?.contactName || '');
  const [contactPhone, setContactPhone] = useState(entryToEdit?.contactPhone || '');
  const [accountId, setAccountId] = useState(entryToEdit?.accountId || (accounts.length > 0 ? accounts[0].id : ''));
  const [amount, setAmount] = useState(entryToEdit?.amount ? String(entryToEdit.amount) : '');
  const [currency, setCurrency] = useState<CurrencyCode>(entryToEdit?.currency || activeVault?.currency || 'INR');
  const [date, setDate] = useState(entryToEdit?.date || formatDateISO(new Date()));
  const [dueDate, setDueDate] = useState(entryToEdit?.dueDate || '');
  const [hasInterest, setHasInterest] = useState(entryToEdit?.hasInterest || false);
  const [interestRate, setInterestRate] = useState(entryToEdit?.interestRate ? String(entryToEdit.interestRate) : '');
  const [notes, setNotes] = useState(entryToEdit?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim()) {
      setError('Please provide a contact or person name');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please provide a valid positive amount');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (entryToEdit) {
        await updatePeopleEntry({
          ...entryToEdit,
          contactName: contactName.trim(),
          contactPhone: contactPhone.trim() || undefined,
          accountId: accountId || undefined,
          type,
          amount: numAmount,
          currency,
          date,
          dueDate: dueDate || undefined,
          hasInterest,
          interestRate: hasInterest && interestRate ? parseFloat(interestRate) : undefined,
          notes: notes.trim() || undefined,
        });
      } else {
        await addPeopleEntry({
          contactName: contactName.trim(),
          contactPhone: contactPhone.trim() || undefined,
          accountId: accountId || undefined,
          type,
          amount: numAmount,
          currency,
          date,
          dueDate: dueDate || undefined,
          hasInterest,
          interestRate: hasInterest && interestRate ? parseFloat(interestRate) : undefined,
          notes: notes.trim() || undefined,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save entry');
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
          <Users2 className="w-5 h-5 text-brand-500" />
          <span>{entryToEdit ? 'Edit Ledger Record' : 'Add People Ledger Entry'}</span>
        </div>
      }
      description="Record informal money lent to, borrowed from, or held for family, friends, or help"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Type Selector Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-navy-900 rounded-xl">
          <button
            type="button"
            onClick={() => setType('lent')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-1 rounded-xl text-xs font-bold transition-all ${
              type === 'lent'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>I Lent Out</span>
          </button>

          <button
            type="button"
            onClick={() => setType('borrowed')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-1 rounded-xl text-xs font-bold transition-all ${
              type === 'borrowed'
                ? 'bg-rose-500 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>I Borrowed</span>
          </button>

          <button
            type="button"
            onClick={() => setType('holding')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-1 rounded-xl text-xs font-bold transition-all ${
              type === 'holding'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <HandCoins className="w-3.5 h-3.5" />
            <span>Holding for Others</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Person / Contact Name"
            placeholder="e.g. Ramesh Uncle, Priya, Amit"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Phone Number (Optional)"
            placeholder="e.g. 9876543210"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            step="any"
            label="Amount"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            tabularNums
            required
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
            ]}
          />
        </div>

        {/* Account Linked with this entry */}
        {accounts.length > 0 && (
          <div className="p-3.5 bg-slate-50 dark:bg-navy-800/80 rounded-2xl border border-slate-200/80 dark:border-navy-700/80 space-y-1">
            <Select
              label={
                type === 'holding'
                  ? 'Which of your accounts is holding this money?'
                  : type === 'lent'
                  ? 'Which account did you lend this money from?'
                  : 'Which account received the borrowed funds?'
              }
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              options={[
                { value: '', label: 'None / General (Not tied to a specific account)' },
                ...accounts.map((a: Account) => ({
                  value: a.id,
                  label: `${a.name} (${a.currency} ${a.balance.toFixed(2)})`,
                })),
              ]}
              helperText="Enables you to see exactly where held/lent money sits in your accounts."
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="date"
            label="Transaction Date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          <Input
            type="date"
            label="Expected Due Date (Optional)"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        {/* Optional Interest Terms */}
        <div className="p-3.5 bg-slate-50 dark:bg-navy-800/80 rounded-2xl border border-slate-200 dark:border-navy-700 space-y-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={hasInterest}
              onChange={(e) => setHasInterest(e.target.checked)}
              className="rounded text-brand-500 focus:ring-brand-500 w-4 h-4"
            />
            <span>Apply Annual Interest Rate (%)</span>
          </label>

          {hasInterest && (
            <Input
              type="number"
              step="any"
              label="Annual Interest %"
              placeholder="e.g. 12"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              tabularNums
            />
          )}
        </div>

        <Input
          label="Purpose / Notes"
          placeholder="e.g. Holding family wedding funds, emergency advance"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {entryToEdit ? 'Update Entry' : 'Save Entry'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
