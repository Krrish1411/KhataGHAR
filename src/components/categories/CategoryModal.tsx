import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { useVault } from '../../context/VaultContext';
import type { Category } from '../../types';
import { Tag, Plus, Check } from 'lucide-react';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'expense' | 'income';
  onCategoryCreated?: (newCategory: Category) => void;
}

const PRESET_ICONS = ['🛒', '🍔', '⚡', '🏥', '✈️', '🎓', '🎬', '👗', '💼', '📈', '🎁', '🚗', '🏠', '📱', '🏋️', '☕'];
const PRESET_COLORS = ['#10b981', '#0284c7', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#64748b'];

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  defaultType = 'expense',
  onCategoryCreated,
}) => {
  const { addCategory } = useVault();

  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>(defaultType);
  const [icon, setIcon] = useState('🛒');
  const [color, setColor] = useState('#10b981');
  const [isEssential, setIsEssential] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setName('');
      setType(defaultType);
      setIcon(defaultType === 'income' ? '💼' : '🛒');
      setColor(defaultType === 'income' ? '#10b981' : '#f59e0b');
      setIsEssential(false);
      setError('');
    }
  }, [isOpen, defaultType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please provide a category name.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const created = await addCategory({
        name: trimmed,
        type,
        icon,
        color,
        isEssential,
      });

      if (onCategoryCreated) {
        onCategoryCreated(created);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create category');
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
          <Tag className="w-5 h-5 text-brand-500" />
          <span>New Category</span>
        </div>
      }
      description="Create a custom category for classifying transactions and budgets"
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Type toggle */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-navy-900 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setType('expense');
              if (icon === '💼') setIcon('🛒');
            }}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              type === 'expense'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => {
              setType('income');
              if (icon === '🛒') setIcon('💼');
            }}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              type === 'income'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Income
          </button>
        </div>

        <Input
          label="Category Name"
          placeholder="e.g. Subscriptions, Pet Care, Freelancing"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        {/* Icon picker */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-ink/70">Icon / Emoji</label>
          <div className="flex items-center gap-1.5 flex-wrap p-2 bg-slate-50 dark:bg-navy-900/60 rounded-xl border border-line">
            {PRESET_ICONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setIcon(emoji)}
                className={`w-8 h-8 rounded-lg text-base grid place-items-center cursor-pointer transition-all ${
                  icon === emoji
                    ? 'bg-white dark:bg-navy-700 shadow-xs ring-2 ring-brand-500 scale-110'
                    : 'hover:bg-white/60 dark:hover:bg-navy-800'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Color picker */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-ink/70">Theme Color</label>
          <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-navy-900/60 rounded-xl border border-line">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`w-6 h-6 rounded-full cursor-pointer transition-all grid place-items-center ${
                  color === c ? 'ring-2 ring-offset-2 ring-brand-500 scale-110' : 'hover:scale-105'
                }`}
              >
                {color === c && <Check className="w-3.5 h-3.5 text-white" />}
              </button>
            ))}
          </div>
        </div>

        {type === 'expense' && (
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isEssential}
              onChange={(e) => setIsEssential(e.target.checked)}
              className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
            />
            <span>Essential Expense (Needed for survival / baseline life)</span>
          </label>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            <Plus className="w-4 h-4 mr-1" />
            <span>Create Category</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
