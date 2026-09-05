import React, { useState, useEffect } from 'react';
import { useVault } from '../../context/VaultContext';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import type { Transaction, TransactionType, Account, Category } from '../../types';
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Edit3 } from 'lucide-react';

import { getCategoryEmoji } from '../common/IconRenderer';

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  onClose,
  transaction,
}) => {
  const { accounts, categories, updateTransaction, activeVault } = useVault();

  const [type, setType] = useState<TransactionType>(transaction.type);
  const [amount, setAmount] = useState<string>(String(transaction.amount));
  const [date, setDate] = useState<string>(transaction.date);
  const [accountId, setAccountId] = useState<string>(transaction.accountId);
  const [toAccountId, setToAccountId] = useState<string>(transaction.toAccountId || '');
  const [categoryId, setCategoryId] = useState<string>(transaction.categoryId || '');
  const [note, setNote] = useState<string>(transaction.note || '');
  const [tagsInput, setTagsInput] = useState<string>((transaction.tags || []).join(', '));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setType(transaction.type);
    setAmount(String(transaction.amount));
    setDate(transaction.date);
    setAccountId(transaction.accountId);
    setToAccountId(transaction.toAccountId || '');
    setCategoryId(transaction.categoryId || '');
    setNote(transaction.note || '');
    setTagsInput((transaction.tags || []).join(', '));
    setError('');
  }, [transaction]);

  const filteredCategories = categories.filter((c) => c.type === type && !c.hidden && !c.parentId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsedAmt = Math.round((parseFloat(amount) + Number.EPSILON) * 100) / 100;
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    if (!accountId) {
      setError('Please select an account');
      return;
    }

    if (type === 'transfer' && !toAccountId) {
      setError('Please select a destination account for the transfer');
      return;
    }

    if (type === 'transfer' && accountId === toAccountId) {
      setError('Source and destination accounts must be different');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedTags = tagsInput
        .split(/[,#\s]+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const updatedTx: Transaction = {
        ...transaction,
        type,
        amount: parsedAmt,
        date,
        accountId,
        toAccountId: type === 'transfer' ? toAccountId : undefined,
        categoryId: type !== 'transfer' ? (categoryId || undefined) : undefined,
        note: note.trim() || undefined,
        tags: parsedTags.length > 0 ? parsedTags : undefined,
      };

      await updateTransaction(updatedTx);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update transaction');
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
          <Edit3 className="w-5 h-5 text-pine-600" />
          <span>Edit Transaction</span>
        </div>
      }
      description="Updating this entry will automatically recalculate and adjust connected account balances."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-flare-50 dark:bg-flare-950/60 border border-flare-200 dark:border-flare-800 text-flare-600 dark:text-flare-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Type Selector */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-moss/80 rounded-xl border border-line">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              type === 'expense'
                ? 'bg-flare-600 text-white shadow-xs'
                : 'text-ink/65 hover:text-ink'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Expense</span>
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              type === 'income'
                ? 'bg-pine-600 text-white shadow-xs'
                : 'text-ink/65 hover:text-ink'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Income</span>
          </button>
          <button
            type="button"
            onClick={() => setType('transfer')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              type === 'transfer'
                ? 'bg-skyx-600 text-white shadow-xs'
                : 'text-ink/65 hover:text-ink'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Transfer</span>
          </button>
        </div>

        {/* Amount & Date */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            step="any"
            label={`Amount (${activeVault?.currency || 'INR'})`}
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            tabularNums
            required
            autoFocus
          />
          <Input
            type="date"
            label="Date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        {/* Accounts Selection */}
        {type === 'transfer' ? (
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="From Account (Debit)"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              options={accounts.map((a: Account) => ({
                value: a.id,
                label: `${a.name} (${a.currency} ${a.balance.toFixed(2)})`,
              }))}
            />
            <Select
              label="To Account (Credit)"
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              options={accounts
                .filter((a) => a.id !== accountId)
                .map((a: Account) => ({
                  value: a.id,
                  label: `${a.name} (${a.currency} ${a.balance.toFixed(2)})`,
                }))}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              options={accounts.map((a: Account) => ({
                value: a.id,
                label: `${a.name} (${a.currency} ${a.balance.toFixed(2)})`,
              }))}
            />
            <Select
              label="Category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              options={[
                { value: '', label: 'Uncategorized' },
                ...filteredCategories.map((c: Category) => ({
                  value: c.id,
                  label: `${getCategoryEmoji(c.icon, c.type)} ${c.name}`,
                })),
              ]}
            />
          </div>
        )}

        {/* Note / Description */}
        <Input
          label="Note / Description"
          placeholder="e.g. Swiggy order, Grocery run, Client invoice"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {/* Tags */}
        <Input
          label="Tags (Comma separated)"
          placeholder="e.g. personal, food, reimbursable"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
        />

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving changes…' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
