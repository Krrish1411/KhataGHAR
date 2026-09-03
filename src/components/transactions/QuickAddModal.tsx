import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { useVault } from '../../context/VaultContext';
import { formatDateISO } from '../../utils/dates';
import type { TransactionType, RecurringFrequency } from '../../types';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Check,
  Repeat,
  Tag,
  TrendingUp,
  Landmark,
  Calendar,
  Wallet,
  Sparkles,
} from 'lucide-react';

export type TransactionEntryMode = 'expense' | 'income' | 'transfer' | 'invest' | 'debt_payment';

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
  const { activeVault, accounts, categories, assets, liabilities, addTransaction } = useVault();

  const [entryMode, setEntryMode] = useState<TransactionEntryMode>(initialType);
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [selectedLiabilityId, setSelectedLiabilityId] = useState('');
  const [units, setUnits] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [date, setDate] = useState(formatDateISO(new Date()));
  const [note, setNote] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<RecurringFrequency>('monthly');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setEntryMode(initialType);
    setAmount('');
    setDate(formatDateISO(new Date()));
    setNote('');
    setTagInput('');
    setIsRecurring(false);
    setError('');
    setUnits('');
    setUnitPrice('');

    if (accounts.length > 0) {
      setAccountId(accounts[0].id);
      if (accounts.length > 1) {
        setToAccountId(accounts[1].id);
      } else {
        setToAccountId('');
      }
    }
    if (assets.length > 0) {
      setSelectedAssetId(assets[0].id);
    }
    if (liabilities.length > 0) {
      setSelectedLiabilityId(liabilities[0].id);
    }
  }, [isOpen, initialType, accounts, assets, liabilities]);

  const cats = useMemo(() => {
    return categories.filter((c) => c.type === (entryMode === 'income' ? 'income' : 'expense') && !c.parentId);
  }, [categories, entryMode]);

  useEffect(() => {
    if ((entryMode === 'expense' || entryMode === 'income') && cats.length > 0) {
      if (!categoryId || !cats.some((c) => c.id === categoryId)) {
        setCategoryId(cats[0].id);
      }
    } else {
      setCategoryId('');
    }
  }, [cats, entryMode, categoryId]);

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

  const parsedNum = parseSmartAmount(amount);
  const parsedAmountFormatted =
    !isNaN(parsedNum) && parsedNum > 0
      ? parsedNum.toLocaleString('en-IN', { maximumFractionDigits: 2 })
      : null;

  const handleQuickAddAmount = (addVal: number) => {
    const current = parseSmartAmount(amount);
    const nextVal = isNaN(current) || current <= 0 ? addVal : current + addVal;
    setAmount(String(nextVal));
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

    if (entryMode === 'transfer' && (!toAccountId || toAccountId === accountId)) {
      setError('Please select a different destination account');
      return;
    }

    if (entryMode === 'invest' && !selectedAssetId) {
      setError('Please select an asset to invest into');
      return;
    }

    if (entryMode === 'debt_payment' && !selectedLiabilityId) {
      setError('Please select a loan/liability to pay down');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const parsedTags = tagInput
        .split(/[,#\s]+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const parsedUnits = units ? parseFloat(units) : undefined;
      const parsedUnitPrice = unitPrice ? parseFloat(unitPrice) : undefined;

      const txType: TransactionType =
        entryMode === 'income' ? 'income' : entryMode === 'transfer' ? 'transfer' : 'expense';

      await addTransaction({
        date,
        amount: numAmount,
        type: txType,
        currency: activeVault?.currency || 'INR',
        accountId,
        toAccountId: entryMode === 'transfer' ? toAccountId : undefined,
        categoryId: (entryMode === 'expense' || entryMode === 'income') ? (categoryId || undefined) : undefined,
        note:
          note.trim() ||
          (entryMode === 'invest'
            ? 'Asset Investment / SIP'
            : entryMode === 'debt_payment'
            ? 'Debt / Loan Payment'
            : undefined),
        tags: parsedTags.length > 0 ? parsedTags : undefined,
        isRecurring,
        recurringFrequency: isRecurring ? recurringFrequency : undefined,
        linkedAssetId: entryMode === 'invest' ? selectedAssetId : undefined,
        linkedLiabilityId: entryMode === 'debt_payment' ? selectedLiabilityId : undefined,
        subType:
          entryMode === 'invest'
            ? 'investment'
            : entryMode === 'debt_payment'
            ? 'debt_payment'
            : 'regular',
        ...(parsedUnits ? { units: parsedUnits } : {}),
        ...(parsedUnitPrice ? { unitPrice: parsedUnitPrice } : {}),
      } as any);

      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const curSymbol = activeVault?.currency === 'USD' ? '$' : activeVault?.currency === 'EUR' ? '€' : '₹';

  // Mode badge metadata
  const modeDetails = {
    expense: {
      title: 'Record Expense',
      desc: 'Track everyday outflows, bills, or family shopping',
      icon: <ArrowUpRight className="w-4 h-4 text-rose-500" />,
      activeTab: 'bg-rose-500 text-white shadow-sm shadow-rose-900/20',
      btnBg: 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/20',
      btnText: 'Add Expense',
    },
    income: {
      title: 'Record Income',
      desc: 'Record salary credits, dividends, freelance, or business revenue',
      icon: <ArrowDownLeft className="w-4 h-4 text-pine-600" />,
      activeTab: 'bg-pine-600 text-white shadow-sm shadow-pine-900/20',
      btnBg: 'bg-pine-700 hover:bg-pine-600 shadow-pine-900/25',
      btnText: 'Add Income',
    },
    transfer: {
      title: 'Transfer Money',
      desc: 'Move funds between your own bank, cash, and wallet accounts',
      icon: <ArrowLeftRight className="w-4 h-4 text-sky-600" />,
      activeTab: 'bg-sky-600 text-white shadow-sm shadow-sky-900/20',
      btnBg: 'bg-sky-600 hover:bg-sky-500 shadow-sky-900/20',
      btnText: 'Record Transfer',
    },
    invest: {
      title: 'Invest into Asset / SIP',
      desc: 'Debits bank and credits holding without fake expense loss',
      icon: <TrendingUp className="w-4 h-4 text-emerald-600" />,
      activeTab: 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/20',
      btnBg: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/25',
      btnText: 'Record Investment',
    },
    debt_payment: {
      title: 'Pay Down Loan / Debt',
      desc: 'Debits bank and reduces outstanding loan principal',
      icon: <Landmark className="w-4 h-4 text-amber-600" />,
      activeTab: 'bg-amber-600 text-white shadow-sm shadow-amber-900/20',
      btnBg: 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/20',
      btnText: 'Record Loan Payment',
    },
  }[entryMode];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="xl"
      title={
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-moss border border-line grid place-items-center">
            {modeDetails.icon}
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-ink leading-tight">
              {modeDetails.title}
            </h3>
            <p className="text-[11.5px] text-ink/50 font-normal mt-0.5">
              {modeDetails.desc}
            </p>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 no-scrollbar">
        {error && (
          <div className="p-3 rounded-xl bg-flare-100/70 dark:bg-flare-950/40 border border-flare-500/30 text-flare-700 dark:text-flare-300 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* 1. Mode Tabs */}
        <div className="grid grid-cols-5 gap-1 p-1 bg-moss rounded-2xl border border-line">
          {[
            { id: 'expense', label: 'Spend', icon: <ArrowUpRight className="w-3.5 h-3.5" /> },
            { id: 'income', label: 'Income', icon: <ArrowDownLeft className="w-3.5 h-3.5" /> },
            { id: 'transfer', label: 'Transfer', icon: <ArrowLeftRight className="w-3.5 h-3.5" /> },
            { id: 'invest', label: 'Invest', icon: <TrendingUp className="w-3.5 h-3.5" /> },
            { id: 'debt_payment', label: 'Debt', icon: <Landmark className="w-3.5 h-3.5" /> },
          ].map((tab) => {
            const isActive = entryMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setEntryMode(tab.id as TransactionEntryMode)}
                className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive ? modeDetails.activeTab : 'text-ink/60 hover:text-ink hover:bg-card/50'
                }`}
              >
                {tab.icon}
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* 2. Amount Input Hero Box */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-ink/50 font-bold uppercase tracking-wider">
            <span>Amount</span>
            <span className="text-[11px] font-medium text-pine-600 dark:text-pine-400 lowercase">
              smart format: e.g. 500, 10k, 2.5L
            </span>
          </div>

          <div className="relative flex items-center rounded-2xl border border-line bg-card focus-within:border-pine-500 focus-within:ring-2 focus-within:ring-pine-500/20 px-4 py-2.5 transition-all shadow-xs">
            <span className="text-2xl sm:text-3xl font-display font-extrabold text-ink/30 mr-2 select-none">
              {curSymbol}
            </span>
            <input
              type="text"
              autoFocus
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-transparent font-display font-extrabold text-2xl sm:text-3xl num text-ink placeholder:text-ink/20 outline-none"
              required
            />
            {parsedAmountFormatted && (
              <span className="ml-2 px-2.5 py-1 rounded-lg bg-pine-50 dark:bg-pine-950/60 text-pine-700 dark:text-pine-300 border border-pine-200/60 dark:border-pine-800/60 text-xs font-mono font-bold whitespace-nowrap shadow-xs">
                = {curSymbol}{parsedAmountFormatted}
              </span>
            )}
          </div>

          {/* Quick Increment Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {[
              { label: '+500', val: 500 },
              { label: '+1K', val: 1000 },
              { label: '+2K', val: 2000 },
              { label: '+5K', val: 5000 },
              { label: '+10K', val: 10000 },
            ].map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleQuickAddAmount(chip.val)}
                className="px-2.5 py-1 rounded-lg border border-line bg-moss hover:bg-card text-[11px] font-mono font-bold text-ink/75 hover:text-ink transition-all cursor-pointer active:scale-95"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Dynamic Section based on Entry Mode */}
        {entryMode === 'transfer' ? (
          /* Transfer Grid: From -> To */
          <div className="p-3.5 rounded-2xl bg-moss border border-line space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-1">
                  From Account
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs font-semibold text-ink outline-none focus:border-pine-500 cursor-pointer"
                  required
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.currency} {a.balance.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-1">
                  To Destination Account
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
                        {a.name} ({a.currency} {a.balance.toFixed(2)})
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>
        ) : entryMode === 'invest' ? (
          /* Invest Section: Asset / SIP Fund + Units + NAV */
          <div className="p-3.5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/50 space-y-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 mb-1">
                Target Asset / Mutual Fund / Gold
              </label>
              {assets.length === 0 ? (
                <p className="text-xs text-flare-600">
                  No assets registered yet. Please add an asset in the Assets tab first.
                </p>
              ) : (
                <select
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs font-semibold text-ink outline-none focus:border-emerald-500 cursor-pointer"
                  required
                >
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.type.replace('_', ' ')}) — Val: ₹{a.currentValue.toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10.5px] font-bold uppercase text-ink/50 mb-1">
                  Units / Shares (Optional)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 35.2"
                  value={units}
                  onChange={(e) => setUnits(e.target.value)}
                  className="w-full rounded-xl border border-line bg-card px-3 py-1.5 text-xs font-mono text-ink outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-bold uppercase text-ink/50 mb-1">
                  NAV / Unit Price (Optional)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 142.04"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="w-full rounded-xl border border-line bg-card px-3 py-1.5 text-xs font-mono text-ink outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        ) : entryMode === 'debt_payment' ? (
          /* Debt Payment Section: Loan Target */
          <div className="p-3.5 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/50 space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
              Target Loan to Pay Down
            </label>
            {liabilities.length === 0 ? (
              <p className="text-xs text-flare-600">
                No liabilities registered yet. Add a loan in the Liabilities tab first.
              </p>
            ) : (
              <select
                value={selectedLiabilityId}
                onChange={(e) => setSelectedLiabilityId(e.target.value)}
                className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs font-semibold text-ink outline-none focus:border-amber-500 cursor-pointer"
                required
              >
                {liabilities.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.lender}) — Outstanding: ₹{l.outstandingBalance.toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            )}
          </div>
        ) : (
          /* Category Selector for regular Expense / Income - naturally wrapping without vertical clipping */
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-1.5">
              Category
            </label>
            <div className="flex flex-wrap gap-2 py-1">
              {cats.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(categoryId === c.id ? '' : c.id)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                    categoryId === c.id
                      ? 'bg-pine-700 border-pine-700 text-white shadow-xs'
                      : 'bg-card border-line text-ink/70 hover:border-pine-300 hover:text-ink hover:bg-moss'
                  }`}
                >
                  {categoryId === c.id && <Check className="w-3 h-3" />}
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4. Account & Date Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-1 flex items-center gap-1">
              <Wallet className="w-3 h-3 text-pine-600" />
              <span>{entryMode === 'income' ? 'Deposited To' : 'Paid From Account'}</span>
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs font-semibold text-ink outline-none focus:border-pine-500 cursor-pointer"
              required
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency} {a.balance.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-pine-600" /> Date
              </span>
              <button
                type="button"
                onClick={() => setDate(formatDateISO(new Date()))}
                className="text-[10px] font-semibold text-pine-600 hover:underline cursor-pointer lowercase"
              >
                today
              </button>
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs font-mono font-semibold text-ink outline-none focus:border-pine-500 cursor-pointer"
              required
            />
          </div>
        </div>

        {/* 5. Note & Tags Row - Balanced on PC */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-1">
              Note (Optional)
            </label>
            <input
              type="text"
              placeholder={
                entryMode === 'invest'
                  ? 'e.g. Monthly SIP installment, Stock purchase…'
                  : entryMode === 'debt_payment'
                  ? 'e.g. Monthly Home Loan EMI, Principal prepayment…'
                  : entryMode === 'expense'
                  ? 'e.g. Swiggy dinner, Metro recharge, Groceries…'
                  : entryMode === 'income'
                  ? 'e.g. TCS Salary, Freelance project…'
                  : 'e.g. Wallet top-up via UPI…'
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-xl border border-line bg-card px-3.5 py-2 text-xs text-ink placeholder:text-ink/30 outline-none focus:border-pine-500 focus:ring-2 focus:ring-pine-500/20"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3 text-pine-600" />
              <span>Tags (optional)</span>
            </label>
            <input
              type="text"
              placeholder="#personal, #tax, #travel, #work…"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              className="w-full rounded-xl border border-line bg-card px-3.5 py-2 text-xs text-ink placeholder:text-ink/30 outline-none focus:border-pine-500 focus:ring-2 focus:ring-pine-500/20"
            />
          </div>
        </div>

        {/* 6. Recurring Options */}
        <div className="pt-2 border-t border-line">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-moss border border-line">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="rounded border-line text-pine-600 focus:ring-pine-500 cursor-pointer"
              />
              <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-pine-600" />
                <span>Recurring Entry (Auto SIP / EMI)</span>
              </span>
            </label>

            {isRecurring && (
              <select
                value={recurringFrequency}
                onChange={(e) => setRecurringFrequency(e.target.value as RecurringFrequency)}
                className="rounded-lg border border-line bg-card px-2 py-1 text-xs font-medium text-ink outline-none"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-line flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-line bg-card hover:bg-moss text-xs font-semibold text-ink transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !amount}
            className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer active:scale-95 ${modeDetails.btnBg}`}
          >
            <Check className="w-4 h-4" />
            <span>{isSubmitting ? 'Recording…' : modeDetails.btnText}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
