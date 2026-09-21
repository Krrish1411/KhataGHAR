import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useVault } from '../../context/VaultContext';
import type { Category } from '../../types';
import {
  Tag,
  Plus,
  Check,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  IconRenderer,
  CATEGORIZED_ICON_PACK,
  suggestCategoryIcon,
} from '../common/IconRenderer';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'expense' | 'income';
  categoryToEdit?: Category | null;
  onCategoryCreated?: (newCategory: Category) => void;
  onCategoryUpdated?: (updatedCategory: Category) => void;
}

const PRESET_COLORS = [
  '#10b981', // Emerald
  '#0d9488', // Teal
  '#0284c7', // Sky
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#ef4444', // Red
  '#f59e0b', // Amber
  '#eab308', // Yellow
  '#64748b', // Slate
  '#1c263e', // Midnight Navy
];

const CURATED_EMOJIS = [
  '🛒', '🍔', '⚡', '🏥', '✈️', '🎓', '🎬', '👗',
  '💼', '📈', '🎁', '🚗', '🏠', '📱', '🏋️', '☕',
  '🍕', '🍺', '👶', '🐾', '📚', '💻', '🎮', '🏖️'
];

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  defaultType = 'expense',
  categoryToEdit,
  onCategoryCreated,
  onCategoryUpdated,
}) => {
  const { addCategory, updateCategory } = useVault();

  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>(defaultType);
  const [icon, setIcon] = useState('ShoppingCart');
  const [color, setColor] = useState('#10b981');
  const [isEssential, setIsEssential] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Icon Picker State
  const [iconSearch, setIconSearch] = useState('');
  const [activeIconTab, setActiveIconTab] = useState('all');
  const [hasUserChosenIcon, setHasUserChosenIcon] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (categoryToEdit) {
        setName(categoryToEdit.name);
        setType(categoryToEdit.type);
        setIcon(categoryToEdit.icon || (categoryToEdit.type === 'income' ? 'TrendingUp' : 'ShoppingCart'));
        setColor(categoryToEdit.color || (categoryToEdit.type === 'income' ? '#10b981' : '#f43f5e'));
        setIsEssential(Boolean(categoryToEdit.isEssential));
        setHasUserChosenIcon(true);
      } else {
        setName('');
        setType(defaultType);
        setIcon(defaultType === 'income' ? 'TrendingUp' : 'ShoppingCart');
        setColor(defaultType === 'income' ? '#10b981' : '#f43f5e');
        setIsEssential(false);
        setHasUserChosenIcon(false);
      }
      setIconSearch('');
      setActiveIconTab('all');
      setError('');
    }
  }, [isOpen, defaultType, categoryToEdit]);

  // When user types name and hasn't manually picked an icon, auto-suggest the best icon
  const handleNameChange = (val: string) => {
    setName(val);
    if (!hasUserChosenIcon && !categoryToEdit && val.trim().length > 2) {
      const suggested = suggestCategoryIcon(val, type);
      if (suggested && suggested !== 'Tag') {
        setIcon(suggested);
      }
    }
  };

  // Filtered Icons
  const filteredIcons = useMemo(() => {
    const q = iconSearch.trim().toLowerCase();
    let pool: string[] = [];

    if (activeIconTab === 'all') {
      const allUnique = new Set<string>();
      CATEGORIZED_ICON_PACK.forEach((pack) => pack.icons.forEach((ic) => allUnique.add(ic)));
      pool = Array.from(allUnique);
    } else if (activeIconTab === 'emojis') {
      pool = CURATED_EMOJIS;
    } else {
      const pack = CATEGORIZED_ICON_PACK.find((p) => p.id === activeIconTab);
      pool = pack ? pack.icons : [];
    }

    if (!q) return pool;
    return pool.filter((ic) => ic.toLowerCase().includes(q));
  }, [iconSearch, activeIconTab]);

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
      if (categoryToEdit) {
        const updated: Category = {
          ...categoryToEdit,
          name: trimmed,
          type,
          icon,
          color,
          isEssential: type === 'expense' ? isEssential : false,
          updatedAt: new Date().toISOString(),
        };
        await updateCategory(updated);
        if (onCategoryUpdated) onCategoryUpdated(updated);
      } else {
        const created = await addCategory({
          name: trimmed,
          type,
          icon,
          color,
          isEssential: type === 'expense' ? isEssential : false,
        });
        if (onCategoryCreated) onCategoryCreated(created);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save category');
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
          <Tag className="w-5 h-5 text-pine-600" />
          <span>{categoryToEdit ? 'Edit Category' : 'New Category'}</span>
        </div>
      }
      description={
        categoryToEdit
          ? 'Customize category icon, theme color, and classification'
          : 'Create a custom category with personalized icon and color tokens'
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        {/* Type toggle */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-moss rounded-2xl border border-line text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setType('expense');
              if (!hasUserChosenIcon) setIcon('ShoppingCart');
              if (!categoryToEdit) setColor('#f43f5e');
            }}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              type === 'expense'
                ? 'bg-rose-600 text-white shadow-xs font-extrabold'
                : 'text-ink/60 hover:text-ink'
            }`}
          >
            Expense Category
          </button>
          <button
            type="button"
            onClick={() => {
              setType('income');
              if (!hasUserChosenIcon) setIcon('TrendingUp');
              if (!categoryToEdit) setColor('#10b981');
            }}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              type === 'income'
                ? 'bg-pine-600 text-white shadow-xs font-extrabold'
                : 'text-ink/60 hover:text-ink'
            }`}
          >
            Income Category
          </button>
        </div>

        {/* Name Input & Live Preview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div className="sm:col-span-2">
            <Input
              label="Category Name"
              placeholder="e.g. Subscriptions, Fuel, Freelance, Groceries"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-bold text-ink/70 block mb-1">Live Badge Preview</label>
            <div
              className="px-3 py-2 rounded-xl border border-line flex items-center gap-2 text-xs font-bold shadow-xs truncate"
              style={{
                backgroundColor: `${color}15`,
                borderColor: `${color}40`,
                color: color,
              }}
            >
              <IconRenderer name={icon} className="w-4 h-4 shrink-0" />
              <span className="truncate">{name.trim() || 'Preview'}</span>
            </div>
          </div>
        </div>

        {/* Color Palette Picker */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-ink/70">Badge Theme Color</label>
            <span className="font-mono text-[10px] text-ink/40">{color}</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-card rounded-xl border border-line flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`w-6 h-6 rounded-full cursor-pointer transition-all grid place-items-center ${
                  color === c ? 'ring-2 ring-offset-2 ring-pine-500 scale-110 shadow-sm' : 'hover:scale-105 opacity-80 hover:opacity-100'
                }`}
              >
                {color === c && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
              </button>
            ))}
          </div>
        </div>

        {/* Rich Categorized Icon Picker */}
        <div className="space-y-2 p-3 rounded-2xl bg-moss/60 border border-line">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-xs font-bold text-ink flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Choose Category Icon</span>
            </label>

            {/* Icon Search */}
            <div className="relative w-full sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-ink/40" />
              <input
                type="text"
                value={iconSearch}
                onChange={(e) => setIconSearch(e.target.value)}
                placeholder="Search icons…"
                className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-line bg-card text-ink outline-none focus:border-pine-500"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setActiveIconTab('all')}
              className={`px-2.5 py-1 rounded-lg shrink-0 transition-all cursor-pointer ${
                activeIconTab === 'all'
                  ? 'bg-pine-700 text-white font-bold'
                  : 'bg-card text-ink/60 hover:text-ink border border-line'
              }`}
            >
              All Icons
            </button>
            {CATEGORIZED_ICON_PACK.map((pack) => (
              <button
                key={pack.id}
                type="button"
                onClick={() => setActiveIconTab(pack.id)}
                className={`px-2.5 py-1 rounded-lg shrink-0 transition-all cursor-pointer ${
                  activeIconTab === pack.id
                    ? 'bg-pine-700 text-white font-bold'
                    : 'bg-card text-ink/60 hover:text-ink border border-line'
                }`}
              >
                {pack.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setActiveIconTab('emojis')}
              className={`px-2.5 py-1 rounded-lg shrink-0 transition-all cursor-pointer ${
                activeIconTab === 'emojis'
                  ? 'bg-pine-700 text-white font-bold'
                  : 'bg-card text-ink/60 hover:text-ink border border-line'
              }`}
            >
              Emojis
            </button>
          </div>

          {/* Icon Grid */}
          <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5 p-2 bg-card rounded-xl border border-line max-h-40 overflow-y-auto custom-scrollbar">
            {filteredIcons.map((ic) => {
              const isSelected = icon === ic;
              return (
                <button
                  key={ic}
                  type="button"
                  onClick={() => {
                    setIcon(ic);
                    setHasUserChosenIcon(true);
                  }}
                  title={ic}
                  className={`h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-pine-600 text-white font-bold ring-2 ring-pine-500 scale-105 shadow-xs'
                      : 'text-ink/70 hover:bg-moss hover:text-ink'
                  }`}
                >
                  <IconRenderer name={ic} className="w-4 h-4" />
                </button>
              );
            })}
            {filteredIcons.length === 0 && (
              <div className="col-span-full py-4 text-center text-xs text-ink/40">
                No icons found for &quot;{iconSearch}&quot;
              </div>
            )}
          </div>
        </div>

        {/* 50/30/20 Classification */}
        {type === 'expense' && (
          <label className="flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer pt-1 select-none">
            <input
              type="checkbox"
              checked={isEssential}
              onChange={(e) => setIsEssential(e.target.checked)}
              className="rounded text-pine-600 focus:ring-pine-500 w-4 h-4 cursor-pointer"
            />
            <span>Essential Need (50% Survival/Core living cost vs. Discretionary want)</span>
          </label>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {categoryToEdit ? <Check className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
            <span>{categoryToEdit ? 'Save Changes' : 'Create Category'}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
