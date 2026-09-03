import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { useVault } from '../../context/VaultContext';
import type { Budget, BudgetPeriod } from '../../types';
import { PieChart } from 'lucide-react';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgetToEdit?: Budget;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  onClose,
  budgetToEdit,
}) => {
  const { categories, addBudget, updateBudget } = useVault();

  const expenseCategories = categories.filter((c) => c.type === 'expense' && !c.parentId);

  const [categoryId, setCategoryId] = useState(
    budgetToEdit?.categoryId || (expenseCategories.length > 0 ? expenseCategories[0].id : '')
  );
  const [amount, setAmount] = useState(budgetToEdit ? String(budgetToEdit.amount) : '');
  const [period, setPeriod] = useState<BudgetPeriod>(budgetToEdit?.period || 'monthly');
  const [rollover, setRollover] = useState(budgetToEdit?.rollover || false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please provide a valid budget amount');
      return;
    }

    if (!categoryId) {
      setError('Please select a category');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (budgetToEdit) {
        await updateBudget({
          ...budgetToEdit,
          categoryId,
          amount: numAmount,
          period,
          rollover,
        });
      } else {
        await addBudget({
          categoryId,
          amount: numAmount,
          period,
          rollover,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save budget');
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
          <PieChart className="w-5 h-5 text-brand-500" />
          <span>{budgetToEdit ? 'Edit Budget Cap' : 'Set Category Budget'}</span>
        </div>
      }
      description="Define spending limits per category to stay on track"
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        <Select
          label="Category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          options={expenseCategories.map((c) => ({
            value: c.id,
            label: c.name,
          }))}
        />

        <Input
          type="number"
          step="any"
          label="Budget Limit Amount"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          tabularNums
          autoFocus
          required
        />

        <Select
          label="Budget Period"
          value={period}
          onChange={(e) => setPeriod(e.target.value as BudgetPeriod)}
          options={[
            { value: 'monthly', label: 'Monthly' },
            { value: 'quarterly', label: 'Quarterly' },
            { value: 'yearly', label: 'Yearly' },
          ]}
        />

        <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={rollover}
            onChange={(e) => setRollover(e.target.checked)}
            className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
          />
          <span>Rollover unused budget to next month</span>
        </label>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {budgetToEdit ? 'Update Budget' : 'Set Budget'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
