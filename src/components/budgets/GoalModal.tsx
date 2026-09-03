import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { useVault } from '../../context/VaultContext';
import { formatDateISO } from '../../utils/dates';
import type { SavingsGoal, CurrencyCode } from '../../types';
import { Target } from 'lucide-react';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalToEdit?: SavingsGoal;
}

export const GoalModal: React.FC<GoalModalProps> = ({
  isOpen,
  onClose,
  goalToEdit,
}) => {
  const { addGoal, updateGoal, activeVault } = useVault();

  const [name, setName] = useState(goalToEdit?.name || '');
  const [targetAmount, setTargetAmount] = useState(goalToEdit ? String(goalToEdit.targetAmount) : '');
  const [currentAmount, setCurrentAmount] = useState(goalToEdit ? String(goalToEdit.currentAmount) : '0');
  const [targetDate, setTargetDate] = useState(
    goalToEdit?.targetDate ||
      formatDateISO(new Date(new Date().setFullYear(new Date().getFullYear() + 1)))
  );
  const [currency, setCurrency] = useState<CurrencyCode>(goalToEdit?.currency || activeVault?.currency || 'INR');
  const [notes, setNotes] = useState(goalToEdit?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a goal name');
      return;
    }

    const numTarget = parseFloat(targetAmount);
    const numCurrent = parseFloat(currentAmount) || 0;

    if (isNaN(numTarget) || numTarget <= 0) {
      setError('Please enter a valid target amount');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (goalToEdit) {
        await updateGoal({
          ...goalToEdit,
          name: name.trim(),
          targetAmount: numTarget,
          currentAmount: numCurrent,
          targetDate,
          currency,
          notes: notes.trim() || undefined,
          isCompleted: numCurrent >= numTarget,
        });
      } else {
        await addGoal({
          name: name.trim(),
          targetAmount: numTarget,
          currentAmount: numCurrent,
          targetDate,
          currency,
          notes: notes.trim() || undefined,
          isCompleted: numCurrent >= numTarget,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save savings goal');
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
          <Target className="w-5 h-5 text-brand-500" />
          <span>{goalToEdit ? 'Edit Savings Goal' : 'Create Savings Goal'}</span>
        </div>
      }
      description="Track milestone savings for vacation, emergency fund, vehicle, or house downpayment"
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        <Input
          label="Goal Name"
          placeholder="e.g. Europe Trip 2027, New Car Downpayment"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            step="any"
            label="Target Amount"
            placeholder="0.00"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            tabularNums
            required
          />

          <Input
            type="number"
            step="any"
            label="Current Saved Amount"
            placeholder="0.00"
            value={currentAmount}
            onChange={(e) => setCurrentAmount(e.target.value)}
            tabularNums
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="date"
            label="Target Completion Date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
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
            ]}
          />
        </div>

        <Input
          label="Notes / Strategy"
          placeholder="e.g. Save 15,000 every month in recurring deposit"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {goalToEdit ? 'Update Goal' : 'Save Goal'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
