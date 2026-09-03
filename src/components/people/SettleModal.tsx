import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { useVault } from '../../context/VaultContext';
import { formatDateISO } from '../../utils/dates';
import { formatCurrency } from '../../utils/formatters';
import type { PeopleLedgerEntry } from '../../types';
import { CheckCircle2, HandCoins } from 'lucide-react';

interface SettleModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: PeopleLedgerEntry;
}

export const SettleModal: React.FC<SettleModalProps> = ({
  isOpen,
  onClose,
  entry,
}) => {
  const { addSettlement, accounts, activeVault } = useVault();

  const totalSettled = entry.settlements.reduce((sum, s) => sum + s.amount, 0);
  const remainingDue = Math.max(0, entry.amount - totalSettled);

  const [settleAmount, setSettleAmount] = useState(String(remainingDue));
  const [date, setDate] = useState(formatDateISO(new Date()));
  const [accountId, setAccountId] = useState(accounts.length > 0 ? accounts[0].id : '');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(settleAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid repayment amount');
      return;
    }

    if (numAmount > remainingDue + 0.01) {
      setError(`Amount cannot exceed remaining balance of ${remainingDue.toFixed(2)}`);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await addSettlement(entry.id, {
        date,
        amount: numAmount,
        note: note.trim() || undefined,
        accountId: accountId || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to record repayment');
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
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <span>Record Settlement / Repayment</span>
        </div>
      }
      description={`Record payment for ${entry.contactName}`}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Balance Status Summary */}
        <div className="p-3 bg-slate-50 dark:bg-navy-800/80 rounded-xl border border-slate-200 dark:border-navy-700 flex justify-between items-center text-xs">
          <div>
            <span className="text-slate-500 dark:text-slate-400 block">Total Principal</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">
              {formatCurrency(entry.amount, entry.currency, activeVault?.numberFormat)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 dark:text-slate-400 block">Remaining Due</span>
            <span className="font-bold text-brand-600 dark:text-brand-400 font-mono">
              {formatCurrency(remainingDue, entry.currency, activeVault?.numberFormat)}
            </span>
          </div>
        </div>

        <Input
          type="number"
          step="any"
          label="Repayment Amount"
          placeholder="0.00"
          value={settleAmount}
          onChange={(e) => setSettleAmount(e.target.value)}
          tabularNums
          autoFocus
          required
        />

        <Input
          type="date"
          label="Settlement Date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />

        {accounts.length > 0 && (
          <Select
            label="Linked Account (Optional balance adjustment)"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            options={[
              { value: '', label: 'None (Do not adjust bank/cash balance)' },
              ...accounts.map((a) => ({
                value: a.id,
                label: `${a.name} (${a.currency} ${a.balance.toFixed(2)})`,
              })),
            ]}
            helperText={
              entry.type === 'lent'
                ? 'Selected account will be credited (+)'
                : 'Selected account will be debited (-)'
            }
          />
        )}

        <Input
          label="Note / Reference (Optional)"
          placeholder="e.g. GPay repayment, Cash handed over"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Record Repayment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
