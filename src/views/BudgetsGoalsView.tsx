import React, { useState, useMemo } from 'react';
import { useVault } from '../context/VaultContext';
import { usePrivacy } from '../context/PrivacyContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { AnimatedNumber } from '../components/common/AnimatedNumber';
import { BudgetModal } from '../components/budgets/BudgetModal';
import { GoalModal } from '../components/budgets/GoalModal';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { formatReadableDate, getDateRangePresets } from '../utils/dates';
import type { Budget, SavingsGoal, Category } from '../types';
import {
  PieChart,
  Target,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  AlertCircle,
  CalendarClock,
  ArrowRight,
} from 'lucide-react';

export const BudgetsGoalsView: React.FC = () => {
  const { budgets, goals, transactions, categories, activeVault, deleteBudget, deleteGoal } =
    useVault();
  const { isPrivacyMode } = usePrivacy();

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [budgetToEdit, setBudgetToEdit] = useState<Budget | undefined>(undefined);

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState<SavingsGoal | undefined>(undefined);

  const baseCurrency = activeVault?.currency || 'INR';
  const numberFormat = activeVault?.numberFormat || 'indian';

  const presets = useMemo(() => getDateRangePresets(activeVault?.fyStartMonth || 4), [activeVault]);
  const thisMonthRange = presets['this-month'];

  const categoryLookup = useMemo(() => new Map<string, Category>(categories.map((c) => [c.id, c])), [categories]);

  // Compute spend per budgeted category this month
  const budgetStats = useMemo(() => {
    return budgets.map((b) => {
      const cat = categoryLookup.get(b.categoryId);
      const spent = transactions
        .filter(
          (t) =>
            t.type === 'expense' &&
            t.categoryId === b.categoryId &&
            t.date >= thisMonthRange.start &&
            t.date <= thisMonthRange.end
        )
        .reduce((sum, t) => sum + t.amount, 0);

      const percent = b.amount > 0 ? (spent / b.amount) * 100 : 0;
      const remaining = b.amount - spent;
      const isOver = spent > b.amount;

      return {
        budget: b,
        category: cat,
        spent,
        percent,
        remaining,
        isOver,
      };
    });
  }, [budgets, transactions, categoryLookup, thisMonthRange]);

  const handleDeleteBudget = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this budget?')) {
      await deleteBudget(id);
    }
  };

  const handleDeleteGoal = async (id: string, name: string) => {
    if (window.confirm(`Delete savings goal "${name}"?`)) {
      await deleteGoal(id);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-1 sm:px-2 pb-14 anim-fade">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 grid place-items-center text-pine-600">
              <PieChart className="w-4 h-4" />
            </span>
            <h1 className="font-display font-extrabold text-[22px] sm:text-[24px] tracking-tight text-ink">
              Budgets & Savings Goals
            </h1>
          </div>
          <p className="text-xs text-ink/50 mt-1">
            Category spending envelopes and target pots with automatic milestone tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setBudgetToEdit(undefined);
              setIsBudgetModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl border border-line bg-card hover:bg-moss active:scale-[0.97] text-xs font-semibold text-ink flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-pine-600" />
            <span>New Budget</span>
          </button>

          <button
            onClick={() => {
              setGoalToEdit(undefined);
              setIsGoalModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-pine-700 hover:bg-pine-600 active:scale-[0.97] text-white text-xs font-bold shadow-sm shadow-pine-900/20 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Goal</span>
          </button>
        </div>
      </div>

      {/* Planned Expenses Banner Shortcut */}
      <div className="rounded-2xl border border-line bg-moss/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 lift">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-card border border-line grid place-items-center text-pine-600 shrink-0">
            <CalendarClock className="w-4 h-4" />
          </span>
          <div>
            <div className="font-display font-bold text-sm text-ink">
              Looking for upcoming bills, rent, or SIP mandates?
            </div>
            <div className="text-[11.5px] text-ink/50 mt-0.5">
              Track due dates and reserve upcoming obligations in the Planned Expenses section.
            </div>
          </div>
        </div>
        <button
          onClick={() => (window.location.hash = '#/plans')}
          className="px-3.5 py-1.5 rounded-xl bg-card border border-line hover:border-pine-300 text-xs font-semibold text-pine-700 flex items-center gap-1.5 cursor-pointer transition-all self-start sm:self-auto shrink-0"
        >
          <span>View Planned Bills</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* SECTION 1: Category Budgets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-display font-bold text-xs uppercase tracking-wider text-ink/75 flex items-center gap-2">
            <span>Monthly Category Budgets</span>
            <Badge tone="gray">{thisMonthRange.label}</Badge>
          </h2>
        </div>

        {budgetStats.length === 0 ? (
          <Card className="text-center py-10 text-xs space-y-3 lift">
            <div className="w-12 h-12 rounded-2xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 grid place-items-center mx-auto text-pine-600">
              <PieChart className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-ink">No category budgets configured</h3>
              <p className="text-xs text-ink/50 mt-1 max-w-sm mx-auto">
                Set monthly limits for Groceries, Dining, Shopping, or Travel to prevent overspending.
              </p>
            </div>
            <button
              onClick={() => {
                setBudgetToEdit(undefined);
                setIsBudgetModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-pine-700 text-white text-xs font-bold shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Budget</span>
            </button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {budgetStats.map((item) => {
              const isDanger = item.percent > 100;
              const isWarning = item.percent >= 80 && item.percent <= 100;

              return (
                <div
                  key={item.budget.id}
                  className={`rounded-2xl border bg-card p-4 sm:p-5 space-y-3.5 shadow-sm lift flex flex-col justify-between ${
                    isDanger ? 'border-flare-500/45 bg-flare-100/10' : 'border-line'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display font-bold text-sm text-ink">
                          {item.category?.name || 'Category'}
                        </h3>
                        <div className="flex items-center gap-2 text-[11px] text-ink/50 mt-0.5">
                          <span>Limit: {formatCurrency(item.budget.amount, baseCurrency, numberFormat, isPrivacyMode)}</span>
                          {item.budget.rollover && <span>• Rollover</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => {
                            setBudgetToEdit(item.budget);
                            setIsBudgetModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-ink/40 hover:text-ink transition-colors cursor-pointer"
                          title="Edit Budget"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteBudget(item.budget.id)}
                          className="p-1.5 rounded-lg text-ink/40 hover:text-flare-600 transition-colors cursor-pointer"
                          title="Delete Budget"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1.5 mt-3">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-ink/65 font-mono tabular-nums num">
                          Spent: {formatCurrency(item.spent, baseCurrency, numberFormat, isPrivacyMode)}
                        </span>
                        <span
                          className={`font-mono tabular-nums num font-bold ${
                            isDanger
                              ? 'text-flare-600'
                              : isWarning
                              ? 'text-mari-600'
                              : 'text-pine-700 dark:text-pine-400'
                          }`}
                        >
                          {formatPercent(item.percent)}
                        </span>
                      </div>

                      <div className="w-full bg-moss h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isDanger
                              ? 'bg-flare-500'
                              : isWarning
                              ? 'bg-mari-500'
                              : 'bg-pine-600'
                          }`}
                          style={{ width: `${Math.min(100, item.percent)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-line flex items-center justify-between text-xs">
                    <span className="text-ink/45 text-[11px] flex items-center gap-1 font-medium">
                      {isDanger && <AlertCircle className="w-3 h-3 text-flare-500 shrink-0" />}
                      {isDanger ? 'Over budget by' : 'Remaining allowance'}
                    </span>
                    <span
                      className={`font-bold tabular-nums font-mono num ${
                        isDanger ? 'text-flare-600' : 'text-ink'
                      }`}
                    >
                      <AnimatedNumber
                        value={Math.abs(item.remaining)}
                        currency={baseCurrency}
                        numberFormat={numberFormat}
                        isPrivacyMode={isPrivacyMode}
                      />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: Savings Goals */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-display font-bold text-xs uppercase tracking-wider text-ink/75">
            Savings Milestones & Goals
          </h2>
        </div>

        {goals.length === 0 ? (
          <Card className="text-center py-10 text-xs space-y-3 lift">
            <div className="w-12 h-12 rounded-2xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 grid place-items-center mx-auto text-pine-600">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-ink">No savings goals configured</h3>
              <p className="text-xs text-ink/50 mt-1 max-w-sm mx-auto">
                Set milestone goals like Emergency Fund, Vacation, Gold, or New Car.
              </p>
            </div>
            <button
              onClick={() => {
                setGoalToEdit(undefined);
                setIsGoalModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-pine-700 text-white text-xs font-bold shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Savings Goal</span>
            </button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {goals.map((goal: SavingsGoal) => {
              const pct = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
              const isCompleted = goal.currentAmount >= goal.targetAmount;

              return (
                <div
                  key={goal.id}
                  className="rounded-2xl border border-line bg-card p-4 sm:p-5 space-y-3.5 shadow-sm lift flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-display font-bold text-sm text-ink">
                            {goal.name}
                          </h3>
                          {isCompleted && (
                            <Badge tone="pine" size="xs">
                              Target Reached
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-ink/50 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>Target: {formatReadableDate(goal.targetDate)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => {
                            setGoalToEdit(goal);
                            setIsGoalModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-ink/40 hover:text-ink transition-colors cursor-pointer"
                          title="Edit Goal"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteGoal(goal.id, goal.name)}
                          className="p-1.5 rounded-lg text-ink/40 hover:text-flare-600 transition-colors cursor-pointer"
                          title="Delete Goal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Goal Progress Bar */}
                    <div className="space-y-1.5 mt-3">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-ink/65 font-mono tabular-nums num">
                          Saved: {formatCurrency(goal.currentAmount, goal.currency, numberFormat, isPrivacyMode)}
                        </span>
                        <span className="text-ink/45 font-mono tabular-nums num">
                          Target: {formatCurrency(goal.targetAmount, goal.currency, numberFormat, isPrivacyMode)}
                        </span>
                      </div>

                      <div className="w-full bg-moss h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isCompleted ? 'bg-pine-600' : 'bg-mari-500'
                          }`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>

                    {goal.notes && (
                      <p className="text-xs text-ink/50 italic bg-moss/70 p-2 rounded-xl mt-2.5">
                        "{goal.notes}"
                      </p>
                    )}
                  </div>

                  <div className="pt-2.5 border-t border-line flex items-center justify-between text-xs">
                    <span className="text-ink/45 text-[11px] font-medium">Funding Completion</span>
                    <span className="font-bold text-ink tabular-nums font-mono num">
                      {formatPercent(pct)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Budget Modal */}
      {isBudgetModalOpen && (
        <BudgetModal
          isOpen={isBudgetModalOpen}
          onClose={() => setIsBudgetModalOpen(false)}
          budgetToEdit={budgetToEdit}
        />
      )}

      {/* Goal Modal */}
      {isGoalModalOpen && (
        <GoalModal
          isOpen={isGoalModalOpen}
          onClose={() => setIsGoalModalOpen(false)}
          goalToEdit={goalToEdit}
        />
      )}
    </div>
  );
};
