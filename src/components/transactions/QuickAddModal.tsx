import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useVault } from '../../context/VaultContext';
import { formatDateISO } from '../../utils/dates';
import type { TransactionType, RecurringFrequency } from '../../types';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Check,
  X,
  Repeat,
  Tag,
} from 'lucide-react';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: TransactionType;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  initialType = 'expense',
}) => {
  const { activeVault, accounts, categories, addTransaction } = useVault();

  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [date, setDate] = useState(formatDateISO(new Date()));
  const [note, setNote] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<RecurringFrequency>('monthly');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setType(initialType);
    setAmount('');
    setDate(formatDateISO(new Date()));
    setNote('');
    setTagInput('');
    setIsRecurring(false);
    setError('');

    if (accounts.length > 0) {
      setAccountId(accounts[0].id);
      if (accounts.length > 1) {
        setToAccountId(accounts[1].id);
      }
    }
  }, [isOpen, initialType, accounts]);

  const cats = useMemo(() => {
    return categories.filter((c) => c.type === (type === 'income' ? 'income' : 'expense') && !c.parentId);
  }, [categories, type]);

  useEffect(() => {
    if (type !== 'transfer' && cats.length > 0) {
      if (!categoryId || !cats.some((c) => c.id === categoryId)) {
        setCategoryId(cats[0].id);
      }
    }
  }, [cats, type, categoryId]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const parseSmartAmount = (val: string): number => {
    const clean = val.trim().toLowerCase().replace(/,/g, '');
    if (!clean) return NaN;
    if (clean.endsWith('cr')) {
      const num = parseFloat(clean.replace('cr', '').trim());
      return isNaN(num) ? NaN : num * 10000000;
    }
    if (clean.endsWith('l') || clean.endsWith('lac') || clean.endsWith('lakh')) {
      const num = parseFloat(clean.replace(/l(ac|akh)?/, '').trim());
      return isNaN(num) ? NaN : num * 100000;
    }
    if (clean.endsWith('k')) {
      const num = parseFloat(clean.replace('k', '').trim());
      return isNaN(num) ? NaN : num * 1000;
    }
    return parseFloat(clean);
  };

  const handleAmountBlur = () => {
    const parsed = parseSmartAmount(amount);
    if (!isNaN(parsed) && parsed > 0) {
      setAmount(String(parsed));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseSmartAmount(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount (e.g. 500, 10k, 2.5L)');
      return;
    }

    if (!accountId) {
      setError('Please select an account');
      return;
    }

    if (type === 'transfer' && (!toAccountId || toAccountId === accountId)) {
      setError('Pick a different destination account');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const parsedTags = tagInput
        .split(/[,#\s]+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      await addTransaction({
        date,
        amount: numAmount,
        type,
        currency: activeVault?.currency || 'INR',
        accountId,
        toAccountId: type === 'transfer' ? toAccountId : undefined,
        categoryId: type !== 'transfer' ? (categoryId || undefined) : undefined,
        note: note.trim() || undefined,
        tags: parsedTags.length > 0 ? parsedTags : undefined,
        isRecurring,
        recurringFrequency: isRecurring ? 'monthly' : undefined,
      });

      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const curSymbol = activeVault?.currency === 'USD' ? '$' : activeVault?.currency === 'EUR' ? '€' : '₹';
  const icon =
    type === 'transfer' ? (
      <ArrowLeftRight className="w-4 h-4 text-pine-600" />
    ) : type === 'income' ? (
      <ArrowDownLeft className="w-4 h-4 text-pine-600" />
    ) : (
      <ArrowUpRight className="w-4 h-4 text-pine-600" />
    );

  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-end" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer (PaisaBook EntrySheet style) */}
      <div className="relative w-full max-w-lg bg-card border-l border-line shadow-2xl z-50 flex flex-col h-full overflow-hidden anim-sheet">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-pine-50 dark:bg-pine-950/50 border border-pine-200/60 dark:border-pine-800/50 grid place-items-center">
              {icon}
            </span>
            <div>
              <h2 className="font-display font-bold text-base text-ink">New Entry</h2>
              <p className="text-[11px] text-ink/50">Record expense, income, or account transfer</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 grid place-items-center rounded-xl bg-moss hover:bg-pine-50 text-ink/60 hover:text-ink transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-flare-100/70 border border-flare-500/30 text-flare-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* 1. Segmented Control */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-moss/80 rounded-xl border border-line">
            {[
              { id: 'expense', label: 'Expense', icon: <ArrowUpRight className="w-3.5 h-3.5" /> },
              { id: 'income', label: 'Income', icon: <ArrowDownLeft className="w-3.5 h-3.5" /> },
              { id: 'transfer', label: 'Transfer', icon: <ArrowLeftRight className="w-3.5 h-3.5" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setType(tab.id as TransactionType)}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  type === tab.id
                    ? 'bg-card text-ink shadow-xs border border-line'
                    : 'text-ink/60 hover:text-ink'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* 2. Amount Field */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-1">
              <span>Amount ({curSymbol})</span>
              <span className="text-pine-600 font-medium normal-case">e.g. 10k, 2.5L, 1cr</span>
            </div>
            <div className="relative">
              <input
                type="text"
                autoFocus
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onBlur={handleAmountBlur}
                className="w-full rounded-xl border border-line bg-card px-4 py-3 font-display font-extrabold text-[28px] num text-ink placeholder:text-ink/25 outline-none transition-colors focus:border-pine-500 focus:ring-2 focus:ring-pine-500/20"
                required
              />
            </div>
          </div>

          {/* 3. Category Chips */}
          {type !== 'transfer' && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-1.5">
                Category
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto no-scrollbar py-0.5">
                {cats.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryId(categoryId === c.id ? '' : c.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-all active:scale-95 cursor-pointer ${
                      categoryId === c.id
                        ? 'bg-pine-700 border-pine-700 text-white shadow-sm'
                        : 'bg-card border-line text-ink/65 hover:border-pine-300 hover:text-ink'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4. Accounts & Date Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-1">
                {type === 'transfer' ? 'From Account' : 'Account'}
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs font-semibold text-ink outline-none focus:border-pine-500 cursor-pointer"
                required
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {type === 'transfer' ? (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-1">
                  To Destination
                </label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs font-semibold text-ink outline-none focus:border-pine-500 cursor-pointer"
                  required
                >
                  <option value="">Select destination…</option>
                  {accounts
                    .filter((a) => a.id !== accountId)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs font-mono font-semibold text-ink outline-none focus:border-pine-500 cursor-pointer"
                  required
                />
              </div>
            )}
          </div>

          {type === 'transfer' && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-1">
                Transfer Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs font-mono font-semibold text-ink outline-none focus:border-pine-500 cursor-pointer"
                required
              />
            </div>
          )}

          {/* 5. Note Field */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-1">
              Note
            </label>
            <input
              type="text"
              placeholder={
                type === 'expense'
                  ? 'e.g. Swiggy dinner, Metro recharge, Groceries…'
                  : type === 'income'
                  ? 'e.g. TCS Salary, Freelance project…'
                  : 'e.g. Wallet top-up via UPI…'
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-xs text-ink placeholder:text-ink/30 outline-none focus:border-pine-500 focus:ring-2 focus:ring-pine-500/20"
            />
          </div>

          {/* 6. Tags & Recurring Options */}
          <div className="pt-2 border-t border-line space-y-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-1 flex items-center gap-1.5">
                <Tag className="w-3 h-3 text-pine-600" />
                <span>Tags (optional)</span>
              </label>
              <input
                type="text"
                placeholder="#food, #personal, #trip…"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs text-ink placeholder:text-ink/30 outline-none focus:border-pine-500"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-moss/60 border border-line">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded border-line text-pine-600 focus:ring-pine-500 cursor-pointer"
                />
                <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5 text-pine-600" />
                  <span>Recurring Entry</span>
                </span>
              </label>

              {isRecurring && (
                <select
                  value={recurringFrequency}
                  onChange={(e) => setRecurringFrequency(e.target.value as RecurringFrequency)}
                  className="rounded-lg border border-line bg-card px-2.5 py-1 text-xs font-medium text-ink outline-none"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              )}
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-4 border-t border-line bg-card flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-line bg-card hover:bg-moss text-xs font-semibold text-ink transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !amount}
            className="flex-1 py-2.5 px-4 rounded-xl bg-pine-700 hover:bg-pine-600 active:scale-[0.97] text-white text-xs font-bold shadow-sm shadow-pine-900/25 flex items-center justify-center gap-1.5 disabled:opacity-45 disabled:pointer-events-none transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>
              {isSubmitting
                ? 'Recording…'
                : type === 'transfer'
                ? 'Record Transfer'
                : type === 'income'
                ? 'Add Income'
                : 'Add Expense'}
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
