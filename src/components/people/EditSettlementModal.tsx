import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { useVault } from '../../context/VaultContext';
import { formatCurrency } from '../../utils/formatters';
import type { PeopleLedgerEntry, SettlementRecord } from '../../types';
import { Edit2, ArrowUpRight, ArrowDownLeft, HandCoins } from 'lucide-react';

interface EditSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: PeopleLedgerEntry;
  settlement: SettlementRecord;
}

export const EditSettlementModal: React.FC<EditSettlementModalProps> = ({
  isOpen,
  onClose,
  entry,
  settlement,
}) => {
  const { updateSettlement, accounts, activeVault } = useVault();

  const [amount, setAmount] = useState(String(settlement.amount));
  const [date, setDate] = useState(settlement.date);
  const [accountId, setAccountId] = useState(settlement.accountId || '');
  const [note, setNote] = useState(settlement.note || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAmount(String(settlement.amount));
      setDate(settlement.date);
      setAccountId(settlement.accountId || '');
      setNote(settlement.note || '');
      setError('');
    }
  }, [isOpen, settlement]);

  const otherSettled = entry.settlements
    .filter((s) => s.id !== settlement.id)
    .reduce((sum, s) => sum + s.amount, 0);
  const maxAllowable = entry.amount > 0 ? Math.max(0, entry.amount - otherSettled) : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive settlement amount');
      return;
    }

    if (maxAllowable !== undefined && numAmount > maxAllowable + 0.01) {
      setError(`Amount cannot exceed the remaining balance limit of ${maxAllowable.toFixed(2)}`);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await updateSettlement(entry.id, settlement.id, {
        amount: numAmount,
        date,
        accountId: accountId || undefined,
        note: note.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update settlement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getActionTitle = () => {
    if (entry.type === 'lent') return 'Edit Repayment Received';
    if (entry.type === 'borrowed') return 'Edit Loan Repaid';
    return 'Edit Holding Returned';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Edit2 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          <span>{getActionTitle()}</span>
        </div>
      }
      description={`Update settlement record for ${entry.contactName}`}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Parent Entry Context Summary */}
        <div className="p-3 bg-slate-50 dark:bg-navy-800/80 rounded-xl border border-slate-200 dark:border-navy-700 flex justify-between items-center text-xs">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="font-bold text-slate-800 dark:text-slate-200">{entry.contactName}</span>
              <Badge
                tone={entry.type === 'lent' ? 'pine' : entry.type === 'borrowed' ? 'flare' : 'sky'}
                size="xs"
              >
                {entry.type === 'lent' ? 'Lent' : entry.type === 'borrowed' ? 'Borrowed' : 'Holding'}
              </Badge>
            </div>
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
              Principal: {formatCurrency(entry.amount, entry.currency, activeVault?.numberFormat)}
            </span>
          </div>

          {maxAllowable !== undefined && (
            <div className="text-right">
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Max Settlement Cap</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-xs">
                {formatCurrency(maxAllowable, entry.currency, activeVault?.numberFormat)}
              </span>
            </div>
          )}
        </div>

        <Input
          type="number"
          step="any"
          label="Settlement Amount"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
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
            label="Linked Account (Balance adjustment)"
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
          placeholder="e.g. GPay repayment, Cash returned"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Update Settlement
          </Button>
        </div>
      </form>
    </Modal>
  );
};
