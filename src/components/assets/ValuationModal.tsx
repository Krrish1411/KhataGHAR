import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useVault } from '../../context/VaultContext';
import { formatDateISO } from '../../utils/dates';
import type { Asset } from '../../types';
import { TrendingUp } from 'lucide-react';

interface ValuationModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset;
}

export const ValuationModal: React.FC<ValuationModalProps> = ({
  isOpen,
  onClose,
  asset,
}) => {
  const { addValuationLog } = useVault();

  const [value, setValue] = useState(String(asset.currentValue));
  const [date, setDate] = useState(formatDateISO(new Date()));
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numVal = parseFloat(value);
    if (isNaN(numVal) || numVal < 0) {
      setError('Please provide a valid market valuation');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await addValuationLog(asset.id, {
        date,
        value: numVal,
        note: note.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update valuation');
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
          <TrendingUp className="w-5 h-5 text-brand-500" />
          <span>Update Valuation for {asset.name}</span>
        </div>
      }
      description="Record a new market valuation to track asset appreciation over time"
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        <Input
          type="number"
          step="any"
          label="New Market Valuation"
          placeholder="0.00"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          tabularNums
          autoFocus
          required
        />

        <Input
          type="date"
          label="Valuation Date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />

        <Input
          label="Valuation Note / Source"
          placeholder="e.g. Annual property re-assessment, Mutual fund NAV update"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Save Valuation Log
          </Button>
        </div>
      </form>
    </Modal>
  );
};
