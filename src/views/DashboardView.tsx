import React, { useState, useMemo, useEffect } from 'react';
import { useVault } from '../context/VaultContext';
import { usePrivacy } from '../context/PrivacyContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { AnimatedNumber } from '../components/common/AnimatedNumber';
import { QuickAddModal } from '../components/transactions/QuickAddModal';
import { Modal } from '../components/common/Modal';
import { formatCurrency, formatCompactCurrency } from '../utils/formatters';
import { computeDerivedFinancials } from '../utils/financials';
import type { Category } from '../types';
import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Plus,
  TrendingUp,
  TrendingDown,
  Landmark,
  Coins,
  CreditCard,
  Smartphone,
  BarChart3,
  Calendar,
  CalendarClock,
  Lock,
  Send,
  Users,
  Bell,
  SlidersHorizontal,
  Sparkles,
  PieChart,
  Command,
  Keyboard,
  ArrowRight,
} from 'lucide-react';
import { computeFinancialInsights, type FinancialInsight } from '../services/insights';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export const DashboardView: React.FC = () => {
  const { activeVault, accounts, transactions, categories, peopleLedger, budgets, assets, liabilities, plannedExpenses, loadDemoData } =
    useVault();
  const { isPrivacyMode, togglePrivacy } = usePrivacy();

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [netWorthMode, setNetWorthMode] = useState<'total' | 'liquid'>('total');

  const baseCurrency = activeVault?.currency || 'INR';
  const numberFormat = activeVault?.numberFormat || 'indian';

  // Visible accounts on dashboard (excludes accounts where isVisibleOnDashboard === false)
  const visibleAccounts = useMemo(() => accounts.filter((a) => a.isVisibleOnDashboard !== false), [accounts]);

  // Compute all derived financials & 8-month series via unified PaisaBook engine
  const d = useMemo(
    () => computeDerivedFinancials(accounts, transactions, peopleLedger, budgets, assets, liabilities),
    [accounts, transactions, peopleLedger, budgets, assets, liabilities]
  );

  // Liquid Net Worth calculation (pure liquid cash/bank minus short term credit, excluding illiquid property/gold)
  const liquidNetWorth = useMemo(() => {
    return d.liquidBalance - d.creditOutstanding - d.reservedTotal + d.givenOutTotal;
  }, [d]);


  // Delta net worth vs previous month
  const deltaNW = useMemo(() => {
    const s = d.series;
    return s.length > 1 ? s[s.length - 1].netWorth - s[s.length - 2].netWorth : 0;
  }, [d.series]);

  // Comprehensive Automated Financial Insights
  const insights = useMemo(() => {
    return computeFinancialInsights({
      accounts,
      transactions,
      budgets,
      categories,
      peopleLedger,
      assets,
      liabilities,
      plannedExpenses,
      baseCurrency,
      numberFormat,
      isPrivacyMode,
    });
  }, [accounts, transactions, budgets, categories, peopleLedger, assets, liabilities, plannedExpenses, baseCurrency, numberFormat, isPrivacyMode]);

  // Only actionable items (critical & warning) show on the top notification banner
  const actionableInsights = useMemo(() => {
    return insights.filter((i) => i.severity === 'critical' || i.severity === 'warning');
  }, [insights]);

  // Account helper mapping
  const accountHeldMap = useMemo(() => {
    const map = new Map<string, number>();
    peopleLedger
      .filter((p) => p.status !== 'closed' && (p.type === 'holding' || p.type === 'borrowed') && p.accountId)
      .forEach((p) => {
        const settled = (p.settlements || []).reduce((s, st) => s + st.amount, 0);
        const rem = Math.max(0, p.amount - settled);
        map.set(p.accountId!, (map.get(p.accountId!) || 0) + rem);
      });
    return map;
  }, [peopleLedger]);

  const catMap = useMemo(() => new Map<string, Category>(categories.map((c) => [c.id, c])), [categories]);
  const accMap = useMemo(() => new Map<string, any>(accounts.map((a) => [a.id, a])), [accounts]);

  const activePeopleEntries = useMemo(() => {
    return peopleLedger.filter((p) => p.status !== 'closed').slice(0, 5);
  }, [peopleLedger]);

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
      .slice(0, 6);
  }, [transactions]);

  // Categorized breakdown for modal
  const categoryBreakdown = useMemo(() => {
    const spendMap = new Map<string, { id: string; name: string; amount: number; color: string }>();
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const cat = t.categoryId ? catMap.get(t.categoryId) : undefined;
        const name = cat?.name || 'Uncategorized';
        const color = cat?.color || '#12855a';
        const id = cat?.id || name;
        const existing = spendMap.get(id) || { id, name, amount: 0, color };
        spendMap.set(id, { ...existing, amount: existing.amount + t.amount });
      });
    return Array.from(spendMap.values()).sort((a, b) => b.amount - a.amount);
  }, [transactions, catMap]);

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'bank':
        return <Landmark className="w-4 h-4" />;
      case 'cash':
        return <Coins className="w-4 h-4" />;
      case 'credit_card':
        return <CreditCard className="w-4 h-4" />;
      case 'wallet':
        return <Smartphone className="w-4 h-4" />;
      default:
        return <Landmark className="w-4 h-4" />;
    }
  };

  const currentMonthLabel = useMemo(() => {
    return new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(new Date());
  }, []);

  return (
    <div className="space-y-4 w-full max-w-[1600px] mx-auto px-1 sm:px-2 pb-12 anim-fade">
      {/* 0. FINANCIAL INTELLIGENCE LIVING ALERT BANNER */}
      {actionableInsights.length > 0 && (
        <div className="w-full rounded-2xl border border-mari-400/50 bg-mari-100/75 dark:bg-mari-950/40 p-4 shadow-xs anim-fade-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={`w-8 h-8 rounded-xl grid place-items-center shrink-0 mt-0.5 ${
                  actionableInsights.some((a) => a.severity === 'critical')
                    ? 'bg-flare-100 text-flare-600 dark:bg-flare-950 dark:text-flare-400 border border-flare-500/30'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-500/30'
                }`}
              >
                <Bell className="w-4 h-4" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-ink">
                    {actionableInsights.length} item{actionableInsights.length > 1 ? 's' : ''} require attention
                  </span>
                  <span className="text-[11px] font-semibold text-ink/50">
                    · Financial Insight
                  </span>
                </div>
                <p className="text-xs font-bold text-ink truncate">
                  {actionableInsights[0].title}
                </p>
                <p className="text-xs text-ink/75 leading-relaxed line-clamp-2 sm:line-clamp-none">
                  {actionableInsights[0].description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                onClick={() => (window.location.hash = actionableInsights[0].targetRoute)}
                className="px-3.5 py-2 rounded-xl bg-card border border-line text-xs font-bold text-ink hover:bg-moss active:scale-95 transition-all shadow-xs cursor-pointer"
              >
                {actionableInsights[0].actionLabel}
              </button>
              <button
                onClick={() => (window.location.hash = '#/reports')}
                className="px-3.5 py-2 rounded-xl bg-pine-700 hover:bg-pine-600 text-white text-xs font-bold active:scale-95 transition-all shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <span>View in Reports Hub</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* If multiple actionable insights, list each one clearly without '+1 more' hiding */}
          {actionableInsights.length > 1 && (
            <div className="mt-3 pt-3 border-t border-mari-400/30 flex flex-wrap gap-2 items-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink/50">
                Also flagged:
              </span>
              {actionableInsights.slice(1).map((item) => (
                <button
                  key={item.id}
                  onClick={() => (window.location.hash = item.targetRoute)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card/80 border border-line text-xs font-medium text-ink hover:border-pine-400 hover:text-pine-700 transition-colors cursor-pointer"
                  title={item.description}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span className="font-semibold">{item.title}</span>
                  <ArrowRight className="w-3 h-3 text-ink/40" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 1. HERO WEAVE CARD (PaisaBook Exact Signature) */}
      <section className="hero-weave hero-sheen relative overflow-hidden rounded-2xl text-pine-50 px-5 py-5 anim-fade-up shadow-lg shadow-pine-900/25">
        <div className="rupee-watermark">₹</div>
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] font-semibold text-pine-200">
              <CalendarClock className="w-3.5 h-3.5" />
              <span>{currentMonthLabel} · Available to spend</span>
            </div>
          </div>

          <div className="font-display font-extrabold text-[38px] sm:text-[42px] num tracking-tight leading-tight mt-1 text-white">
            <AnimatedNumber
              value={d.availableToSpend}
              currency={baseCurrency}
              numberFormat={numberFormat}
              isPrivacyMode={isPrivacyMode}
            />
          </div>

          <div className="flex gap-5 mt-2 text-[12.5px]">
            <span className="flex items-center gap-1.5 text-pine-200">
              <ArrowDownLeft className="w-3.5 h-3.5 text-pine-300" />
              <span>In</span>
              <b className="num text-pine-50">
                {formatCompactCurrency(d.thisMonthIncome, baseCurrency, numberFormat, isPrivacyMode)}
              </b>
            </span>
            <span className="flex items-center gap-1.5 text-pine-200">
              <ArrowUpRight className="w-3.5 h-3.5 text-mari-300" />
              <span>Out</span>
              <b className="num text-pine-50">
                {formatCompactCurrency(d.thisMonthExpense, baseCurrency, numberFormat, isPrivacyMode)}
              </b>
            </span>
          </div>

          {/* PaisaBook Pill Badges */}
          <div className="flex flex-wrap gap-1.5 mt-3.5">
            <Badge tone="mari" icon={<Lock className="w-3 h-3" />}>
              {formatCompactCurrency(d.reservedTotal, baseCurrency, numberFormat, isPrivacyMode)} not yours
            </Badge>
            <Badge tone="sky" icon={<Send className="w-3 h-3" />}>
              {formatCompactCurrency(d.givenOutTotal, baseCurrency, numberFormat, isPrivacyMode)} given out
            </Badge>
            <Badge
              tone="gray"
              className="!bg-white/10 !text-pine-100 !border-white/20"
              icon={<CalendarClock className="w-3 h-3" />}
            >
              {formatCompactCurrency(d.committedTotal, baseCurrency, numberFormat, isPrivacyMode)} committed
            </Badge>
          </div>

          {/* Action Trigger Bar */}
          <div className="pt-3.5 mt-3.5 flex flex-wrap items-center gap-2 border-t border-white/10">
            <button
              onClick={() => {
                setQuickAddType('expense');
                setIsQuickAddOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-white text-pine-900 hover:bg-pine-50 active:scale-[0.97] transition-all text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Record Entry</span>
            </button>

            <button
              onClick={() => {
                setQuickAddType('transfer');
                setIsQuickAddOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/20 active:scale-[0.97] text-white border border-white/20 transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Quick Transfer</span>
            </button>

            <button
              onClick={() => setIsBreakdownOpen(true)}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 active:scale-[0.97] text-pine-100 border border-white/15 transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer sm:ml-auto"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Monthly Breakdown</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. NET WORTH CARD & 8-MONTH TRAJECTORY */}
      <Card className="p-4 sm:p-5 overflow-hidden relative lift">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-[10.5px] uppercase tracking-[0.14em] font-bold text-ink/45 flex items-center gap-1.5">
                {deltaNW >= 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 text-pine-600" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-flare-600" />
                )}
                <span>Net worth · 8 months</span>
              </div>

              {/* Mode Switcher Pill */}
              <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-moss border border-line text-[10.5px]">
                <button
                  type="button"
                  onClick={() => setNetWorthMode('total')}
                  className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                    netWorthMode === 'total'
                      ? 'bg-card text-pine-700 dark:text-pine-300 shadow-xs border border-line'
                      : 'text-ink/55 hover:text-ink'
                  }`}
                >
                  Total
                </button>
                <button
                  type="button"
                  onClick={() => setNetWorthMode('liquid')}
                  className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                    netWorthMode === 'liquid'
                      ? 'bg-card text-pine-700 dark:text-pine-300 shadow-xs border border-line'
                      : 'text-ink/55 hover:text-ink'
                  }`}
                >
                  Liquid Only
                </button>
              </div>
            </div>

            <div className="font-display font-extrabold text-[28px] sm:text-[32px] num text-ink tracking-tight leading-tight mt-1">
              <AnimatedNumber
                value={netWorthMode === 'total' ? d.netWorth : liquidNetWorth}
                currency={baseCurrency}
                numberFormat={numberFormat}
                isPrivacyMode={isPrivacyMode}
              />
            </div>

            {netWorthMode === 'total' ? (
              <>
                <div className={`text-[11.5px] font-bold num mt-0.5 ${deltaNW >= 0 ? 'text-pine-600' : 'text-flare-600'}`}>
                  {deltaNW >= 0 ? '▲' : '▼'}{' '}
                  {formatCompactCurrency(Math.abs(deltaNW), baseCurrency, numberFormat, isPrivacyMode)} vs last month
                </div>

                {/* The exact PaisaBook formula breakdown */}
                <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] num">
                  <span className="font-bold text-pine-700 dark:text-pine-400">
                    +{formatCompactCurrency(d.totalAssets, baseCurrency, numberFormat, isPrivacyMode)} assets
                  </span>
                  <span className="text-ink/40">−</span>
                  <span className="font-semibold text-flare-600">
                    {formatCompactCurrency(d.totalLiabilities, baseCurrency, numberFormat, isPrivacyMode)} owed
                  </span>
                  {d.reservedTotal > 0 && (
                    <>
                      <span className="text-ink/40">−</span>
                      <span className="font-semibold text-mari-600">
                        {formatCompactCurrency(d.reservedTotal, baseCurrency, numberFormat, isPrivacyMode)} others' money
                      </span>
                    </>
                  )}
                  {d.givenOutTotal > 0 && (
                    <>
                      <span className="text-ink/40">+</span>
                      <span className="font-semibold text-skyx-600 dark:text-skyx-400">
                        {formatCompactCurrency(d.givenOutTotal, baseCurrency, numberFormat, isPrivacyMode)} given out
                      </span>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="mt-1 text-[11.5px] text-ink/65 leading-snug">
                Pure liquid cash in bank accounts & cash (excludes real estate, gold, and long-term loans).
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))}
              className="px-2.5 py-1 rounded-xl border border-line bg-moss/60 hover:bg-moss text-ink/70 hover:text-ink text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
              title="View Keyboard Shortcuts (?)"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Keys</span>
              <kbd className="px-1 py-0.2 rounded bg-card border border-line text-[9.5px] font-mono text-ink/50">?</kbd>
            </button>
            <Badge tone="pine" icon={<TrendingUp className="w-3 h-3" />}>
              {formatCompactCurrency(d.liquidBalance, baseCurrency, numberFormat, isPrivacyMode)} liquid
            </Badge>
          </div>
        </div>

        {/* Responsive Area Chart with pine sheen */}
        <div className="h-[175px] -mx-2 mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={d.series} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="nwHomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-pine-500, #228a61)" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="var(--color-pine-500, #228a61)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--color-line)" strokeDasharray="3 4" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10.5, fill: 'var(--color-ink)', fillOpacity: 0.55 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--color-ink)', fillOpacity: 0.45 }}
                axisLine={false}
                tickLine={false}
                width={48}
                domain={['auto', 'auto']}
                tickFormatter={(v) => formatCompactCurrency(v, baseCurrency, numberFormat, isPrivacyMode)}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-card, #ffffff)',
                  border: '1px solid var(--color-line)',
                  borderRadius: 12,
                  fontSize: 12,
                  color: 'var(--color-ink)',
                  boxShadow: '0 8px 24px -8px rgba(0,0,0,0.2)',
                }}
                formatter={(v: any) => [
                  formatCurrency(Number(v), baseCurrency, numberFormat, isPrivacyMode),
                  'Net worth',
                ]}
              />
              <Area
                type="monotone"
                dataKey="netWorth"
                stroke="var(--color-pine-600, #12855a)"
                strokeWidth={2.4}
                fill="url(#nwHomeGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 3. ACCOUNTS STRIP (Widget 1) */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-display font-bold text-[15px] tracking-tight text-ink flex items-center gap-2">
            <Landmark className="w-4 h-4 text-pine-600" />
            <span>Accounts & Enclaves</span>
          </h2>
          <button
            onClick={() => (window.location.hash = '#/accounts')}
            className="text-[11.5px] font-semibold text-pine-700 dark:text-pine-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            all accounts →
          </button>
        </div>

        {visibleAccounts.length === 0 ? (
          <Card className="p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 grid place-items-center mx-auto text-pine-600">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-ink">Set up your first account</h3>
              <p className="text-xs text-ink/50 mt-1 max-w-md mx-auto">
                Add your bank, cash, or wallet — or load the realistic 4-month Indian demo dataset to explore the dashboard immediately.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                onClick={async () => {
                  setIsLoadingDemo(true);
                  try {
                    await loadDemoData();
                  } finally {
                    setIsLoadingDemo(false);
                  }
                }}
                disabled={isLoadingDemo}
                className="px-3.5 py-2 rounded-xl border border-line bg-card hover:border-pine-300 hover:bg-pine-50 text-xs font-semibold text-pine-700 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-pine-600" />
                <span>Load Demo Accounts & Ledger</span>
              </button>
              <button
                onClick={() => {
                  window.location.hash = '#/accounts';
                }}
                className="px-3.5 py-2 rounded-xl bg-pine-700 hover:bg-pine-600 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Account</span>
              </button>
            </div>
          </Card>
        ) : (
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
            {visibleAccounts.map((acc) => {
              const held = accountHeldMap.get(acc.id) || 0;
              const isCredit = acc.type === 'credit_card';

              return (
                <div
                  key={acc.id}
                  className="min-w-[185px] flex-1 rounded-2xl border border-line bg-card p-3.5 shadow-sm lift"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 grid place-items-center text-pine-600 shrink-0">
                      {getAccountTypeIcon(acc.type)}
                    </span>
                    <span className="text-[12px] font-semibold text-ink/75 truncate">{acc.name}</span>
                    {acc.currency !== baseCurrency && <Badge tone="sky">{acc.currency}</Badge>}
                  </div>

                  <div
                    className={`font-display font-extrabold text-[19px] num mt-2 ${
                      isCredit && acc.balance < 0 ? 'text-flare-600' : 'text-ink'
                    }`}
                  >
                    <AnimatedNumber
                      value={acc.balance}
                      currency={acc.currency}
                      numberFormat={numberFormat}
                      isPrivacyMode={isPrivacyMode}
                    />
                  </div>

                  <div className="text-[10.5px] text-ink/45 mt-0.5">
                    {isCredit ? (
                      'outstanding debt'
                    ) : held > 0 ? (
                      <span className="text-mari-600 font-semibold">
                        {formatCompactCurrency(held, acc.currency, numberFormat, isPrivacyMode)} reserved inside
                      </span>
                    ) : (
                      'unencumbered'
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. NOT YOUR MONEY (Custodial Funds) (Widget 2) */}
      {activePeopleEntries.length > 0 && (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-display font-bold text-[15px] tracking-tight text-ink flex items-center gap-2">
              <Lock className="w-4 h-4 text-mari-600" />
              <span>Not your money</span>
            </h2>
            <Badge tone="mari" icon={<Lock className="w-3 h-3" />}>
              kept honest
            </Badge>
          </div>

          <div className="space-y-2">
            {activePeopleEntries.map((f) => {
              const cfg =
                f.type === 'holding'
                  ? {
                      icon: Lock,
                      label: 'holding for them',
                      cls: 'bg-mari-100 dark:bg-mari-950/50 text-mari-600 border-mari-400/40',
                      badge: 'mari' as const,
                    }
                  : f.type === 'borrowed'
                  ? {
                      icon: Users,
                      label: 'borrowed from them',
                      cls: 'bg-skyx-100 dark:bg-skyx-950/50 text-skyx-600 border-skyx-600/20',
                      badge: 'sky' as const,
                    }
                  : {
                      icon: Send,
                      label: 'yours, with them',
                      cls: 'bg-pine-50 dark:bg-pine-950/50 text-pine-600 border-pine-200/70',
                      badge: 'pine' as const,
                    };
              const Icon = cfg.icon;

              return (
                <button
                  key={f.id}
                  onClick={() => (window.location.hash = '#/people')}
                  className="w-full text-left rounded-2xl border border-line bg-card p-3.5 flex items-center gap-3 lift cursor-pointer"
                >
                  <span className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 border ${cfg.cls}`}>
                    <Icon className="w-4 h-4" />
                  </span>

                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-bold text-[14.5px] text-ink">{f.contactName}</span>
                      <Badge tone={cfg.badge}>{cfg.label}</Badge>
                    </span>
                    <span className="block text-[11.5px] text-ink/50 mt-0.5 truncate">
                      {f.notes || `Recorded on ${f.date}`}
                      {f.dueDate && <span className="font-semibold text-mari-600"> · Due {f.dueDate}</span>}
                    </span>
                  </span>

                  <span className="font-display font-extrabold text-[16px] num text-ink shrink-0">
                    <AnimatedNumber
                      value={f.amount}
                      currency={f.currency || baseCurrency}
                      numberFormat={numberFormat}
                      isPrivacyMode={isPrivacyMode}
                    />
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. MONEY VITALS / RATIOS (Widget 3) */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-display font-bold text-[15px] tracking-tight text-ink flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-pine-600" />
            <span>Money vitals</span>
          </h2>
          <button
            onClick={() => (window.location.hash = '#/reports')}
            className="text-[11.5px] font-semibold text-pine-700 dark:text-pine-400 hover:underline cursor-pointer"
          >
            full reports →
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {[
            {
              label: 'Savings rate',
              val: `${Math.round(d.savingsRate * 100)}%`,
              ok: d.savingsRate >= 0.2,
              hint: "of this month's income",
            },
            {
              label: 'Spend ÷ income',
              val: `${Math.round(d.expenseRatio * 100)}%`,
              ok: d.expenseRatio <= 0.7,
              hint: 'under 70% is healthy',
            },
            {
              label: 'Liquidity',
              val: d.liquidityRatio > 0 ? `${d.liquidityRatio.toFixed(1)}×` : '∞',
              ok: d.liquidityRatio >= 3,
              hint: 'months of expenses covered',
            },
            {
              label: 'Debt ÷ income',
              val: `${Math.round(d.debtToIncome * 100)}%`,
              ok: d.debtToIncome <= 0.35,
              hint: 'credit + borrowed funds',
            },
          ].map((r, i) => (
            <div
              key={r.label}
              className="rounded-2xl border border-line bg-card p-3.5 hover:border-pine-300 transition-colors anim-tick lift"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="text-[10.5px] uppercase tracking-wider font-semibold text-ink/45">{r.label}</div>
              <div
                className={`font-display font-extrabold text-[22px] num mt-0.5 ${
                  r.ok ? 'text-pine-700 dark:text-pine-400' : 'text-mari-600'
                }`}
              >
                {r.val}
              </div>
              <div className="text-[10.5px] text-ink/40 mt-0.5">{r.hint}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. RECENT ENTRIES (Widget 4) */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-display font-bold text-[15px] tracking-tight text-ink flex items-center gap-2">
            <Calendar className="w-4 h-4 text-pine-600" />
            <span>Recent Entries</span>
          </h2>
          <button
            onClick={() => (window.location.hash = '#/transactions')}
            className="text-[11.5px] font-semibold text-pine-700 dark:text-pine-400 hover:underline cursor-pointer"
          >
            all entries →
          </button>
        </div>

        <Card className="px-4 py-0.5">
          {recentTransactions.length === 0 ? (
            <div className="py-8 text-center text-xs text-ink/50 space-y-2">
              <p>No transactions recorded yet.</p>
              <button
                onClick={() => {
                  setQuickAddType('expense');
                  setIsQuickAddOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-pine-700 text-white text-xs font-semibold cursor-pointer"
              >
                Add first entry
              </button>
            </div>
          ) : (
            recentTransactions.map((tx) => {
              const cat = tx.categoryId ? catMap.get(tx.categoryId) : undefined;
              const acc = accMap.get(tx.accountId);
              const toAcc = tx.toAccountId ? accMap.get(tx.toAccountId) : undefined;
              const isIncome = tx.type === 'income';

              return (
                <div key={tx.id} className="ledger-row flex items-center gap-3 py-2.5">
                  <span
                    className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 border ${
                      isIncome
                        ? 'bg-pine-50 dark:bg-pine-950/40 text-pine-600 border-pine-200/60 dark:border-pine-800/40'
                        : tx.type === 'transfer'
                        ? 'bg-moss text-ink/50 border-line'
                        : 'bg-moss text-pine-700 dark:text-pine-400 border-line'
                    }`}
                  >
                    {tx.type === 'transfer' ? (
                      <ArrowLeftRight className="w-4 h-4" />
                    ) : isIncome ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-semibold text-ink/90 truncate">
                      {tx.note || cat?.name || 'Transaction'}
                    </span>
                    <span className="block text-[11px] text-ink/45 truncate">
                      {acc?.name || 'Account'}
                      {tx.type === 'transfer' ? ` → ${toAcc?.name || 'Account'}` : ''} · {tx.date}
                    </span>
                  </span>

                  <span
                    className={`num font-bold text-[14px] ${
                      isIncome ? 'text-pine-600' : tx.type === 'transfer' ? 'text-ink/55' : 'text-ink'
                    }`}
                  >
                    {isIncome ? '+' : tx.type === 'transfer' ? '' : '−'}
                    {formatCurrency(tx.amount, tx.currency || baseCurrency, numberFormat, isPrivacyMode)}
                  </span>
                </div>
              );
            })
          )}
        </Card>
      </section>

      {/* MONTHLY BREAKDOWN MODAL */}
      <Modal
        isOpen={isBreakdownOpen}
        onClose={() => setIsBreakdownOpen(false)}
        title="Monthly Outflow Breakdown"
        description={`Analysis of expenses for ${currentMonthLabel}`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-moss/70 border border-line">
            <span className="text-xs font-bold text-ink/65 uppercase tracking-wide">Total Outflow</span>
            <span className="font-display font-extrabold text-xl num text-ink">
              {formatCurrency(d.thisMonthExpense, baseCurrency, numberFormat, isPrivacyMode)}
            </span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto custom-scrollbar pr-1">
            {categoryBreakdown.length === 0 ? (
              <p className="text-center py-6 text-xs text-ink/45">No expenses recorded for this month yet.</p>
            ) : (
              categoryBreakdown.map((item) => {
                const percentage = d.thisMonthExpense > 0 ? (item.amount / d.thisMonthExpense) * 100 : 0;
                return (
                  <div key={item.id} className="p-3 rounded-xl border border-line bg-card space-y-1.5 lift">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="font-bold text-ink">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-ink">
                          {formatCurrency(item.amount, baseCurrency, numberFormat, isPrivacyMode)}
                        </span>
                        <span className="text-[11px] text-ink/45 w-10 text-right">
                          {percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-moss rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>

      {/* QUICK ADD ENTRY SHEET */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        initialType={quickAddType}
      />
    </div>
  );
};
