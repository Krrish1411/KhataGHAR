import React, { useState, useMemo } from 'react';
import { useVault } from '../context/VaultContext';
import { usePrivacy } from '../context/PrivacyContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { AnimatedNumber } from '../components/common/AnimatedNumber';
import { Modal } from '../components/common/Modal';
import { formatCurrency, formatCompactCurrency } from '../utils/formatters';
import type { PlannedExpense } from '../types';
import {
  CalendarClock,
  Plus,
  Check,
  AlertCircle,
  Clock,
  Repeat,
  Trash2,
  Edit2,
  CreditCard,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

export const PlansView: React.FC = () => {
  const {
    plannedExpenses,
    accounts,
    categories,
    activeVault,
    addPlannedExpense,
    updatePlannedExpense,
    deletePlannedExpense,
    markPlanPaid,
  } = useVault();
  const { isPrivacyMode } = usePrivacy();

  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planToEdit, setPlanToEdit] = useState<PlannedExpense | null>(null);

  const [payingPlan, setPayingPlan] = useState<PlannedExpense | null>(null);
  const [payAccountId, setPayAccountId] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [isPaying, setIsPaying] = useState(false);

  const baseCurrency = activeVault?.currency || 'INR';
  const numberFormat = activeVault?.numberFormat || 'indian';

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Compute days difference
  const getDaysDiff = (targetDate: string) => {
    const t = new Date(targetDate + 'T00:00:00').getTime();
    const now = new Date(todayStr + 'T00:00:00').getTime();
    return Math.round((t - now) / (1000 * 60 * 60 * 24));
  };

  const activePlans = useMemo(() => {
    return plannedExpenses
      .filter((p) => p.status !== 'cancelled')
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [plannedExpenses]);

  // Next 30 days & overdue stats
  const next30DaysPlans = useMemo(() => {
    return activePlans.filter((p) => {
      const diff = getDaysDiff(p.dueDate);
      return diff >= 0 && diff <= 30;
    });
  }, [activePlans]);

  const overduePlans = useMemo(() => {
    return activePlans.filter((p) => getDaysDiff(p.dueDate) < 0 && p.status === 'pending');
  }, [activePlans]);

  const totalNext30Days = useMemo(() => {
    return next30DaysPlans.reduce((sum, p) => sum + p.amount, 0);
  }, [next30DaysPlans]);

  const currentMonthPrefix = todayStr.slice(0, 7);
  const thisMonthTotal = useMemo(() => {
    return activePlans
      .filter((p) => p.dueDate.startsWith(currentMonthPrefix))
      .reduce((sum, p) => sum + p.amount, 0);
  }, [activePlans, currentMonthPrefix]);

  // Group by month
  const monthlyGroups = useMemo(() => {
    const map = new Map<string, PlannedExpense[]>();
    activePlans.forEach((p) => {
      const monthKey = p.dueDate.slice(0, 7);
      const list = map.get(monthKey) || [];
      list.push(p);
      map.set(monthKey, list);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [activePlans]);

  const formatMonthTitle = (yyyyMm: string) => {
    const [year, month] = yyyyMm.split('-');
    const d = new Date(Number(year), Number(month) - 1, 1);
    return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(d);
  };

  const getWeekday = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
  };

  const getRelativeDueLabel = (days: number) => {
    if (days < 0) return `Overdue by ${Math.abs(days)} day${Math.abs(days) > 1 ? 's' : ''}`;
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `Due in ${days} days`;
  };

  const handleStartPay = (plan: PlannedExpense) => {
    setPayingPlan(plan);
    setPayAccountId(plan.accountId || (accounts[0] ? accounts[0].id : ''));
    setPayDate(todayStr);
  };

  const handleConfirmPay = async () => {
    if (!payingPlan || !payAccountId) return;
    setIsPaying(true);
    try {
      await markPlanPaid(payingPlan.id, payAccountId, payDate);
      setPayingPlan(null);
    } finally {
      setIsPaying(false);
    }
  };

  const handleDeletePlan = async (id: string, name: string) => {
    if (window.confirm(`Delete planned expense "${name}"?`)) {
      await deletePlannedExpense(id);
    }
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto px-1 sm:px-2 pb-14 anim-fade">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 grid place-items-center text-pine-600">
              <CalendarClock className="w-4 h-4" />
            </span>
            <h1 className="font-display font-extrabold text-[22px] sm:text-[24px] tracking-tight text-ink">
              Planned Expenses
            </h1>
          </div>
          <p className="text-xs text-ink/50 mt-1">
            Rent, SIPs, EMIs & subscriptions kept on calendar and reserved from Available to Spend
          </p>
        </div>

        <button
          onClick={() => {
            setPlanToEdit(null);
            setIsPlanModalOpen(true);
          }}
          className="px-4 py-2 rounded-xl bg-pine-700 hover:bg-pine-600 active:scale-[0.97] text-white text-xs font-bold shadow-sm shadow-pine-900/20 flex items-center gap-1.5 cursor-pointer transition-all self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Plan a Bill</span>
        </button>
      </div>

      {/* Hero Weave Summary Banner (PaisaBook Signature) */}
      <section className="hero-weave rounded-2xl px-5 py-4 text-pine-50 flex flex-wrap items-center justify-between gap-4 relative overflow-hidden shadow-lg shadow-pine-900/20 anim-fade-up">
        <div className="relative">
          <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-pine-200">
            Due in next 30 days
          </div>
          <div className="font-display font-extrabold text-[28px] sm:text-[32px] num tracking-tight leading-tight mt-0.5 text-white">
            <AnimatedNumber
              value={totalNext30Days}
              currency={baseCurrency}
              numberFormat={numberFormat}
              isPrivacyMode={isPrivacyMode}
            />
          </div>
        </div>

        <div className="text-right text-[12px] text-pine-200 space-y-0.5">
          <div>
            This Month:{' '}
            <b className="num text-pine-50 font-bold">
              {formatCompactCurrency(thisMonthTotal, baseCurrency, numberFormat, isPrivacyMode)}
            </b>
          </div>
          {overduePlans.length > 0 && (
            <div className="text-mari-300 font-bold flex items-center gap-1 justify-end">
              <AlertCircle className="w-3.5 h-3.5 text-mari-300" />
              <span>{overduePlans.length} bill(s) overdue</span>
            </div>
          )}
        </div>
      </section>

      {/* Main Timeline List */}
      {activePlans.length === 0 ? (
        <Card className="p-8 text-center space-y-3 lift">
          <div className="w-12 h-12 rounded-2xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 grid place-items-center mx-auto text-pine-600">
            <CalendarClock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm text-ink">Nothing planned yet</h3>
            <p className="text-xs text-ink/50 mt-1 max-w-md mx-auto">
              Plan your house rent, SIP investments, broadband bills, and subscriptions once. Khata Ghar will keep them on the calendar and out of your available spend.
            </p>
          </div>
          <button
            onClick={() => {
              setPlanToEdit(null);
              setIsPlanModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-pine-700 text-white text-xs font-bold shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Plan your first expense</span>
          </button>
        </Card>
      ) : (
        <div className="space-y-6 pt-1">
          {monthlyGroups.map(([monthKey, items]) => {
            const groupTotal = items.reduce((sum, i) => sum + i.amount, 0);

            return (
              <div key={monthKey} className="space-y-2.5">
                {/* Month Group Header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-pine-600" />
                    <h2 className="font-display font-bold text-[14px] uppercase tracking-wider text-ink/75">
                      {formatMonthTitle(monthKey)}
                    </h2>
                  </div>
                  <span className="text-[12px] num font-semibold text-ink/50">
                    Total: {formatCurrency(groupTotal, baseCurrency, numberFormat, isPrivacyMode)}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-2">
                  {items.map((plan) => {
                    const days = getDaysDiff(plan.dueDate);
                    const isOverdue = days < 0 && plan.status === 'pending';
                    const isDueSoon = days >= 0 && days <= 7 && plan.status === 'pending';
                    const cat = plan.categoryId ? catMap.get(plan.categoryId) : undefined;
                    const dayNum = plan.dueDate.slice(8, 10);
                    const weekday = getWeekday(plan.dueDate);

                    return (
                      <div
                        key={plan.id}
                        className={`rounded-2xl border bg-card p-3.5 flex items-center gap-3.5 lift transition-all ${
                          isOverdue
                            ? 'border-flare-500/40 bg-flare-100/10'
                            : isDueSoon
                            ? 'border-mari-400/40'
                            : 'border-line'
                        }`}
                      >
                        {/* Date Block */}
                        <div
                          className={`w-12 py-1.5 text-center rounded-xl border shrink-0 ${
                            isOverdue
                              ? 'bg-flare-100 dark:bg-flare-950/50 border-flare-500/30 text-flare-700 dark:text-flare-400'
                              : isDueSoon
                              ? 'bg-mari-100 dark:bg-mari-950/50 border-mari-400/40 text-mari-700 dark:text-mari-300'
                              : 'bg-moss border-line text-ink/70'
                          }`}
                        >
                          <div className="font-display font-extrabold text-[17px] num leading-none">
                            {dayNum}
                          </div>
                          <div className="text-[9px] uppercase font-bold tracking-wider mt-0.5">
                            {weekday}
                          </div>
                        </div>

                        {/* Title & Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-display font-bold text-[14.5px] text-ink truncate">
                              {plan.name}
                            </span>
                            {plan.recurrence !== 'once' && (
                              <Badge tone="gray">{plan.recurrence}</Badge>
                            )}
                            {cat && <Badge tone="pine">{cat.name}</Badge>}
                            {plan.status === 'paid' && (
                              <Badge tone="pine" icon={<Check className="w-3 h-3" />}>
                                Paid
                              </Badge>
                            )}
                          </div>

                          <div
                            className={`text-[11.5px] font-semibold mt-0.5 ${
                              isOverdue
                                ? 'text-flare-600'
                                : isDueSoon
                                ? 'text-mari-600'
                                : 'text-ink/45'
                            }`}
                          >
                            <span>{getRelativeDueLabel(days)}</span>
                            <span className="text-ink/35"> · </span>
                            <span className="font-mono text-ink/70">{plan.dueDate}</span>
                            {plan.notes && (
                              <span className="text-ink/45 italic truncate block sm:inline sm:ml-2">
                                “{plan.notes}”
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Amount & Actions */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="font-display font-extrabold text-[16px] num text-ink text-right">
                            <AnimatedNumber
                              value={plan.amount}
                              currency={baseCurrency}
                              numberFormat={numberFormat}
                              isPrivacyMode={isPrivacyMode}
                            />
                          </div>

                          <div className="flex flex-col gap-1 items-end">
                            {plan.status !== 'paid' && (
                              <button
                                onClick={() => handleStartPay(plan)}
                                className="px-3 py-1 rounded-xl bg-pine-700 hover:bg-pine-600 active:scale-[0.97] text-white text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer transition-all"
                              >
                                <Check className="w-3 h-3" />
                                <span>Pay</span>
                              </button>
                            )}
                            <div className="flex items-center gap-2 text-[10.5px]">
                              <button
                                onClick={() => {
                                  setPlanToEdit(plan);
                                  setIsPlanModalOpen(true);
                                }}
                                className="font-semibold text-ink/40 hover:text-ink transition-colors cursor-pointer"
                              >
                                edit
                              </button>
                              <button
                                onClick={() => handleDeletePlan(plan.id, plan.name)}
                                className="font-semibold text-ink/30 hover:text-flare-600 transition-colors cursor-pointer"
                              >
                                delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PLAN MODAL (Add / Edit) */}
      <PlanModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        plan={planToEdit}
      />

      {/* PAY PLAN MODAL */}
      {payingPlan && (
        <Modal
          isOpen={true}
          onClose={() => setPayingPlan(null)}
          title={`Pay "${payingPlan.name}"`}
          description="Record this bill in your transaction ledger"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-moss/70 border border-line flex items-center justify-between">
              <span className="text-xs font-bold text-ink/65 uppercase tracking-wide">Amount Due</span>
              <span className="font-display font-extrabold text-xl num text-ink">
                {formatCurrency(payingPlan.amount, baseCurrency, numberFormat, isPrivacyMode)}
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-1">
                From Account
              </label>
              <select
                value={payAccountId}
                onChange={(e) => setPayAccountId(e.target.value)}
                className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs font-semibold text-ink outline-none focus:border-pine-500 cursor-pointer"
                required
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatCurrency(a.balance, a.currency, numberFormat, isPrivacyMode)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-1">
                Payment Date
              </label>
              <input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs font-mono font-semibold text-ink outline-none focus:border-pine-500 cursor-pointer"
                required
              />
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPayingPlan(null)}
                className="flex-1 py-2.5 rounded-xl border border-line hover:bg-moss text-xs font-semibold text-ink transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPaying || !payAccountId}
                onClick={handleConfirmPay}
                className="flex-1 py-2.5 rounded-xl bg-pine-700 hover:bg-pine-600 active:scale-[0.97] text-white text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-45"
              >
                <Check className="w-4 h-4" />
                <span>{isPaying ? 'Recording…' : 'Confirm Payment'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// Plan Create / Edit Modal
interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: PlannedExpense | null;
}

const PlanModal: React.FC<PlanModalProps> = ({ isOpen, onClose, plan }) => {
  const { categories, addPlannedExpense, updatePlannedExpense } = useVault();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [recurrence, setRecurrence] = useState<'once' | 'monthly' | 'yearly'>('monthly');
  const [categoryId, setCategoryId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (!isOpen) return;
    if (plan) {
      setName(plan.name);
      setAmount(plan.amount.toString());
      setDueDate(plan.dueDate);
      setRecurrence(plan.recurrence);
      setCategoryId(plan.categoryId || '');
      setNotes(plan.notes || '');
    } else {
      setName('');
      setAmount('');
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7);
      setDueDate(defaultDate.toISOString().split('T')[0]);
      setRecurrence('monthly');
      setCategoryId('');
      setNotes('');
    }
    setError('');
  }, [isOpen, plan]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!name.trim()) {
      setError('Please provide a name');
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!dueDate) {
      setError('Please choose a due date');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (plan) {
        await updatePlannedExpense(plan.id, {
          name: name.trim(),
          amount: numAmount,
          dueDate,
          recurrence,
          categoryId: categoryId || null,
          notes: notes.trim() || undefined,
        });
      } else {
        await addPlannedExpense({
          name: name.trim(),
          amount: numAmount,
          dueDate,
          recurrence,
          categoryId: categoryId || null,
          notes: notes.trim() || undefined,
          status: 'pending',
        });
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const expenseCategories = categories.filter((c) => c.type === 'expense');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={plan ? 'Edit Planned Expense' : 'Plan an Expense'}
      description="Keep upcoming obligations tracked and on your calendar"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-flare-100/70 border border-flare-500/30 text-flare-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-1">
            What is it?
          </label>
          <input
            type="text"
            placeholder="e.g. House Rent, Zerodha SIP, Jio Fiber, Netflix…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-xs text-ink placeholder:text-ink/30 outline-none focus:border-pine-500 focus:ring-2 focus:ring-pine-500/20"
            required
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-1">
              Amount (₹)
            </label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
              className="w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-xs font-display font-extrabold text-[18px] num text-ink placeholder:text-ink/30 outline-none focus:border-pine-500"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-xl border border-line bg-card px-3 py-2.5 text-xs font-mono font-semibold text-ink outline-none focus:border-pine-500 cursor-pointer"
              required
            />
          </div>
        </div>

        {/* Repeats Segmented Control */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-1">
            Repeats
          </label>
          <div className="grid grid-cols-3 gap-1 p-1 bg-moss/80 rounded-xl border border-line">
            {[
              { id: 'monthly', label: 'Monthly' },
              { id: 'yearly', label: 'Yearly' },
              { id: 'once', label: 'Once' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRecurrence(tab.id as any)}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  recurrence === tab.id
                    ? 'bg-card text-ink shadow-xs border border-line'
                    : 'text-ink/60 hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-1">
            Category
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs font-semibold text-ink outline-none focus:border-pine-500 cursor-pointer"
          >
            <option value="">Select category (optional)…</option>
            {expenseCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-1">
            Note / Description
          </label>
          <input
            type="text"
            placeholder="e.g. Due to landlord via NEFT, auto-debit on 5th…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-line bg-card px-3.5 py-2 text-xs text-ink placeholder:text-ink/30 outline-none focus:border-pine-500"
          />
        </div>

        <div className="pt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-line hover:bg-moss text-xs font-semibold text-ink transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-xl bg-pine-700 hover:bg-pine-600 active:scale-[0.97] text-white text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-45"
          >
            <Check className="w-4 h-4" />
            <span>{isSubmitting ? 'Saving…' : plan ? 'Save Changes' : 'Add to Calendar'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
