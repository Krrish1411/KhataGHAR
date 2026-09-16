import React, { useState, useMemo } from 'react';
import { useVault } from '../context/VaultContext';
import { usePrivacy } from '../context/PrivacyContext';
import { formatCurrency, formatCompactCurrency } from '../utils/formatters';
import {
  Calculator,
  TrendingUp,
  CreditCard,
  Layers,
  ArrowDownRight,
  Flame,
  PieChart,
  Calendar,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

type CalcType = 'sip' | 'loan' | 'lumpsum' | 'stepup' | 'swp' | 'fire';

export const CalculatorsView: React.FC = () => {
  const { activeVault } = useVault();
  const { isPrivacyMode } = usePrivacy();

  const baseCurrency = activeVault?.currency || 'INR';
  const numberFormat = activeVault?.numberFormat || 'indian';

  const [activeTab, setActiveTab] = useState<CalcType>('sip');

  // 1. SIP State (Return rate starts from 0%)
  const [sipMonthly, setSipMonthly] = useState<number>(10000);
  const [sipRate, setSipRate] = useState<number>(12); // Rate of return starts from 0%
  const [sipYears, setSipYears] = useState<number>(15);

  // 2. Loan / Repayment Schedule State (Interest rate starts from 0%)
  const [loanAmount, setLoanAmount] = useState<number>(3000000);
  const [loanRate, setLoanRate] = useState<number>(8.5);
  const [loanTenureYears, setLoanTenureYears] = useState<number>(20);
  const [loanPrepaymentMonthly, setLoanPrepaymentMonthly] = useState<number>(0);
  const [loanScheduleView, setLoanScheduleView] = useState<'yearly' | 'monthly'>('yearly');

  // 3. Lumpsum State
  const [lumpAmount, setLumpAmount] = useState<number>(500000);
  const [lumpRate, setLumpRate] = useState<number>(12);
  const [lumpYears, setLumpYears] = useState<number>(10);

  // 4. Step-Up SIP State
  const [stepUpInitial, setStepUpInitial] = useState<number>(10000);
  const [stepUpAnnualPct, setStepUpAnnualPct] = useState<number>(10);
  const [stepUpRate, setStepUpRate] = useState<number>(12);
  const [stepUpYears, setStepUpYears] = useState<number>(15);

  // 5. SWP State
  const [swpCorpus, setSwpCorpus] = useState<number>(5000000);
  const [swpMonthly, setSwpMonthly] = useState<number>(35000);
  const [swpRate, setSwpRate] = useState<number>(7.5);
  const [swpYears, setSwpYears] = useState<number>(20);

  // 6. FIRE State
  const [fireMonthlyExpense, setFireMonthlyExpense] = useState<number>(60000);
  const [fireCurrentSavings, setFireCurrentSavings] = useState<number>(2500000);
  const [fireMonthlySavings, setFireMonthlySavings] = useState<number>(40000);
  const [fireExpectedReturn, setFireExpectedReturn] = useState<number>(10);
  const [fireSwr, setFireSwr] = useState<number>(4.0); // 4% Rule

  // ------------------------------------------------------------------
  // COMPUTATIONS
  // ------------------------------------------------------------------

  // 1. SIP Calculations
  const sipResults = useMemo(() => {
    const P = Math.max(0, sipMonthly);
    const n = Math.max(1, sipYears * 12);
    const r = Math.max(0, sipRate);
    const totalInvested = P * n;

    let maturity = 0;
    if (r === 0) {
      maturity = totalInvested;
    } else {
      const i = r / 12 / 100;
      maturity = P * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
    }
    const wealthGain = Math.max(0, maturity - totalInvested);

    return { totalInvested, wealthGain, maturity };
  }, [sipMonthly, sipRate, sipYears]);

  // 2. Loan & Repayment Schedule Calculations
  const loanResults = useMemo(() => {
    const P = Math.max(0, loanAmount);
    const R = Math.max(0, loanRate);
    const n = Math.max(1, loanTenureYears * 12);
    const extraPerMonth = Math.max(0, loanPrepaymentMonthly);

    let baseEmi = 0;
    if (R === 0) {
      baseEmi = P / n;
    } else {
      const r = R / 12 / 100;
      baseEmi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    }

    // Generate month-by-month amortization schedule (with prepayment)
    const monthlySchedule: Array<{
      month: number;
      year: number;
      openingBalance: number;
      emi: number;
      interest: number;
      principal: number;
      prepayment: number;
      closingBalance: number;
    }> = [];

    const r = R / 12 / 100;
    let balance = P;
    let totalInterestPaid = 0;
    let actualMonthsTaken = 0;

    for (let m = 1; m <= n && balance > 0.01; m++) {
      const opening = balance;
      const interest = R === 0 ? 0 : opening * r;
      let principalPaid = baseEmi - interest;
      let prepay = extraPerMonth;

      if (principalPaid + prepay > opening) {
        prepay = Math.max(0, opening - principalPaid);
        if (principalPaid > opening) {
          principalPaid = opening;
          prepay = 0;
        }
      }

      balance = Math.max(0, opening - principalPaid - prepay);
      totalInterestPaid += interest;
      actualMonthsTaken = m;

      monthlySchedule.push({
        month: m,
        year: Math.ceil(m / 12),
        openingBalance: opening,
        emi: principalPaid + interest,
        interest,
        principal: principalPaid,
        prepayment: prepay,
        closingBalance: balance,
      });
    }

    // Standard schedule without prepayment (for comparison)
    const standardTotalInterest = R === 0 ? 0 : baseEmi * n - P;
    const interestSaved = Math.max(0, standardTotalInterest - totalInterestPaid);
    const monthsSaved = Math.max(0, n - actualMonthsTaken);

    // Group into yearly schedule
    const yearlyMap = new Map<number, {
      year: number;
      openingBalance: number;
      emiPaid: number;
      interestPaid: number;
      principalPaid: number;
      prepaymentPaid: number;
      closingBalance: number;
    }>();

    monthlySchedule.forEach((m) => {
      const existing = yearlyMap.get(m.year);
      if (!existing) {
        yearlyMap.set(m.year, {
          year: m.year,
          openingBalance: m.openingBalance,
          emiPaid: m.emi,
          interestPaid: m.interest,
          principalPaid: m.principal,
          prepaymentPaid: m.prepayment,
          closingBalance: m.closingBalance,
        });
      } else {
        existing.emiPaid += m.emi;
        existing.interestPaid += m.interest;
        existing.principalPaid += m.principal;
        existing.prepaymentPaid += m.prepayment;
        existing.closingBalance = m.closingBalance;
      }
    });

    const yearlySchedule = Array.from(yearlyMap.values());

    return {
      baseEmi,
      totalInterestPaid,
      totalPayment: P + totalInterestPaid,
      standardTotalInterest,
      interestSaved,
      monthsSaved,
      actualYearsTaken: (actualMonthsTaken / 12).toFixed(1),
      monthlySchedule,
      yearlySchedule,
    };
  }, [loanAmount, loanRate, loanTenureYears, loanPrepaymentMonthly]);

  // 3. Lumpsum Calculations
  const lumpResults = useMemo(() => {
    const P = Math.max(0, lumpAmount);
    const r = Math.max(0, lumpRate) / 100;
    const t = Math.max(1, lumpYears);
    const maturity = r === 0 ? P : P * Math.pow(1 + r, t);
    const wealthGain = Math.max(0, maturity - P);
    return { totalInvested: P, wealthGain, maturity };
  }, [lumpAmount, lumpRate, lumpYears]);

  // 4. Step-Up SIP Calculations
  const stepUpResults = useMemo(() => {
    let currentP = Math.max(0, stepUpInitial);
    const stepPct = Math.max(0, stepUpAnnualPct) / 100;
    const r = Math.max(0, stepUpRate);
    const monthlyRate = r / 12 / 100;

    let totalInvested = 0;
    let maturity = 0;

    for (let yr = 1; yr <= stepUpYears; yr++) {
      for (let m = 1; m <= 12; m++) {
        totalInvested += currentP;
        if (r === 0) {
          maturity += currentP;
        } else {
          maturity = (maturity + currentP) * (1 + monthlyRate);
        }
      }
      currentP = currentP * (1 + stepPct);
    }

    const wealthGain = Math.max(0, maturity - totalInvested);

    // Regular SIP comparison with same initial
    const regN = stepUpYears * 12;
    const regInvested = stepUpInitial * regN;
    let regMaturity = regInvested;
    if (r > 0) {
      regMaturity = stepUpInitial * ((Math.pow(1 + monthlyRate, regN) - 1) / monthlyRate) * (1 + monthlyRate);
    }

    return {
      totalInvested,
      wealthGain,
      maturity,
      regularInvested: regInvested,
      regularMaturity: regMaturity,
      extraGainFromStepUp: Math.max(0, maturity - regMaturity),
    };
  }, [stepUpInitial, stepUpAnnualPct, stepUpRate, stepUpYears]);

  // 5. SWP Calculations
  const swpResults = useMemo(() => {
    let balance = Math.max(0, swpCorpus);
    const W = Math.max(0, swpMonthly);
    const r = Math.max(0, swpRate) / 12 / 100;
    const totalMonths = Math.max(1, swpYears * 12);

    let totalWithdrawn = 0;
    let depletedMonth: number | null = null;

    for (let m = 1; m <= totalMonths; m++) {
      const growth = balance * r;
      balance += growth;
      const withdraw = Math.min(balance, W);
      balance -= withdraw;
      totalWithdrawn += withdraw;

      if (balance <= 0.01 && depletedMonth === null) {
        depletedMonth = m;
        break;
      }
    }

    return {
      totalWithdrawn,
      finalBalance: Math.max(0, balance),
      isSustainable: depletedMonth === null,
      depletedYears: depletedMonth ? (depletedMonth / 12).toFixed(1) : null,
    };
  }, [swpCorpus, swpMonthly, swpRate, swpYears]);

  // 6. FIRE Calculations
  const fireResults = useMemo(() => {
    const annualExpense = Math.max(0, fireMonthlyExpense) * 12;
    const swrFraction = Math.max(0.01, fireSwr) / 100;
    const fireTarget = annualExpense / swrFraction;

    const currentSavings = Math.max(0, fireCurrentSavings);
    const monthlyAddition = Math.max(0, fireMonthlySavings);
    const r = Math.max(0, fireExpectedReturn) / 12 / 100;

    let balance = currentSavings;
    let monthsToFire = 0;
    const maxSimMonths = 600; // 50 years max

    while (balance < fireTarget && monthsToFire < maxSimMonths) {
      monthsToFire++;
      balance = (balance + monthlyAddition) * (1 + r);
    }

    const currentRunwayMonths = annualExpense > 0 ? (currentSavings / (annualExpense / 12)).toFixed(1) : '∞';

    return {
      annualExpense,
      fireTarget,
      yearsToFire: monthsToFire >= maxSimMonths ? '> 50' : (monthsToFire / 12).toFixed(1),
      currentRunwayMonths,
      progressPct: Math.min(100, (currentSavings / fireTarget) * 100).toFixed(1),
    };
  }, [fireMonthlyExpense, fireCurrentSavings, fireMonthlySavings, fireExpectedReturn, fireSwr]);

  // Tab definitions
  const tabs = [
    { id: 'sip', label: 'SIP', icon: TrendingUp },
    { id: 'loan', label: 'Loan Schedule', icon: CreditCard },
    { id: 'stepup', label: 'Step-Up SIP', icon: Layers },
    { id: 'lumpsum', label: 'Lumpsum', icon: PieChart },
    { id: 'swp', label: 'SWP Cashflow', icon: ArrowDownRight },
    { id: 'fire', label: 'FIRE Runway', icon: Flame },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="font-display font-black text-xl sm:text-2xl text-ink flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-pine-700 text-white shadow-xs">
              <Calculator className="w-5 h-5" />
            </div>
            <span>Financial Calculators &amp; Amortization</span>
          </h1>
          <p className="text-xs sm:text-sm text-ink/60 mt-1">
            Simulate investment compounding from 0% return, loan EMI repayment schedules, step-up contributions, and retirement cashflow.
          </p>
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="flex p-1 rounded-2xl bg-card border border-line overflow-x-auto custom-scrollbar gap-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as CalcType)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-pine-700 text-white shadow-sm'
                  : 'text-ink/70 hover:text-ink hover:bg-moss'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. SIP CALCULATOR (Starts from 0% Return)                     */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'sip' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-5 p-5 rounded-2xl bg-card border border-line shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink/60 border-b border-line pb-2 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-pine-600" />
              <span>SIP Parameters</span>
            </h3>

            {/* Monthly Investment */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-ink/70">Monthly Investment</span>
                <span className="font-mono text-ink font-bold">
                  {formatCurrency(sipMonthly, baseCurrency, numberFormat, isPrivacyMode)}
                </span>
              </div>
              <input
                type="range"
                min="500"
                max="200000"
                step="500"
                value={sipMonthly}
                onChange={(e) => setSipMonthly(Number(e.target.value))}
                className="w-full accent-pine-600 cursor-pointer"
              />
              <input
                type="number"
                value={sipMonthly}
                onChange={(e) => setSipMonthly(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-1.5 rounded-xl border border-line bg-moss/40 text-xs font-mono font-bold text-ink"
              />
            </div>

            {/* Expected Return Rate (Starts from 0%) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-ink/70">Expected Rate of Return (p.a.)</span>
                <span className="font-mono text-pine-700 dark:text-pine-400 font-bold">{sipRate}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="0.1"
                value={sipRate}
                onChange={(e) => setSipRate(Number(e.target.value))}
                className="w-full accent-pine-600 cursor-pointer"
              />
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={sipRate}
                onChange={(e) => setSipRate(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-1.5 rounded-xl border border-line bg-moss/40 text-xs font-mono font-bold text-ink"
              />
            </div>

            {/* Time Period */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-ink/70">Time Horizon (Years)</span>
                <span className="font-mono text-ink font-bold">{sipYears} Years</span>
              </div>
              <input
                type="range"
                min="1"
                max="40"
                step="1"
                value={sipYears}
                onChange={(e) => setSipYears(Number(e.target.value))}
                className="w-full accent-pine-600 cursor-pointer"
              />
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4 p-6 rounded-2xl bg-pine-50/60 dark:bg-pine-950/20 border border-pine-200 dark:border-pine-800/60 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-pine-800 dark:text-pine-300 block">
                Projected Maturity Wealth
              </span>
              <div className="font-display font-black text-3xl sm:text-4xl text-pine-900 dark:text-pine-100 num mt-1">
                {formatCurrency(sipResults.maturity, baseCurrency, numberFormat, isPrivacyMode)}
              </div>
            </div>

            {/* Wealth Breakdown Cards */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-4 rounded-xl bg-card border border-line">
                <span className="text-xs text-ink/60 font-medium block">Total Invested</span>
                <div className="font-display font-extrabold text-lg text-ink mt-0.5">
                  {formatCurrency(sipResults.totalInvested, baseCurrency, numberFormat, isPrivacyMode)}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-card border border-line">
                <span className="text-xs text-pine-700 dark:text-pine-400 font-medium block">Estimated Returns</span>
                <div className="font-display font-extrabold text-lg text-pine-700 dark:text-pine-400 mt-0.5">
                  +{formatCurrency(sipResults.wealthGain, baseCurrency, numberFormat, isPrivacyMode)}
                </div>
              </div>
            </div>

            {/* Visual Ratio Bar */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-[11px] text-ink/60 font-semibold">
                <span>Principal: {sipResults.maturity > 0 ? ((sipResults.totalInvested / sipResults.maturity) * 100).toFixed(0) : 0}%</span>
                <span>Returns: {sipResults.maturity > 0 ? ((sipResults.wealthGain / sipResults.maturity) * 100).toFixed(0) : 0}%</span>
              </div>
              <div className="h-3.5 w-full rounded-full bg-moss border border-line overflow-hidden flex">
                <div
                  className="h-full bg-slate-400 dark:bg-slate-600 transition-all duration-300"
                  style={{ width: `${sipResults.maturity > 0 ? (sipResults.totalInvested / sipResults.maturity) * 100 : 100}%` }}
                />
                <div
                  className="h-full bg-pine-600 transition-all duration-300"
                  style={{ width: `${sipResults.maturity > 0 ? (sipResults.wealthGain / sipResults.maturity) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. LOAN REPAYMENT SCHEDULE & PREPAYMENT CALCULATOR           */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'loan' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Input Parameters */}
            <div className="lg:col-span-5 space-y-4 p-5 rounded-2xl bg-card border border-line shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink/60 border-b border-line pb-2 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-pine-600" />
                <span>Loan &amp; Prepayment Setup</span>
              </h3>

              {/* Loan Amount */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-ink/70">Loan Principal</span>
                  <span className="font-mono text-ink font-bold">
                    {formatCurrency(loanAmount, baseCurrency, numberFormat, isPrivacyMode)}
                  </span>
                </div>
                <input
                  type="range"
                  min="100000"
                  max="20000000"
                  step="50000"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  className="w-full accent-pine-600 cursor-pointer"
                />
              </div>

              {/* Interest Rate (Starts from 0%) */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-ink/70">Interest Rate (p.a.)</span>
                  <span className="font-mono text-flare-600 font-bold">{loanRate}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  step="0.1"
                  value={loanRate}
                  onChange={(e) => setLoanRate(Number(e.target.value))}
                  className="w-full accent-pine-600 cursor-pointer"
                />
              </div>

              {/* Tenure (Years) */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-ink/70">Loan Tenure</span>
                  <span className="font-mono text-ink font-bold">{loanTenureYears} Years</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="35"
                  step="1"
                  value={loanTenureYears}
                  onChange={(e) => setLoanTenureYears(Number(e.target.value))}
                  className="w-full accent-pine-600 cursor-pointer"
                />
              </div>

              {/* Extra Monthly Prepayment */}
              <div className="space-y-1 pt-2 border-t border-line/60">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-ink/70 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Extra Monthly Prepayment</span>
                  </span>
                  <span className="font-mono text-pine-700 dark:text-pine-400 font-bold">
                    {formatCurrency(loanPrepaymentMonthly, baseCurrency, numberFormat, isPrivacyMode)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50000"
                  step="500"
                  value={loanPrepaymentMonthly}
                  onChange={(e) => setLoanPrepaymentMonthly(Number(e.target.value))}
                  className="w-full accent-pine-600 cursor-pointer"
                />
                <span className="text-[10px] text-ink/50 block">
                  Simulate paying extra towards principal every month to crush interest early.
                </span>
              </div>
            </div>

            {/* Results & Prepayment Impact */}
            <div className="lg:col-span-7 space-y-4 p-6 rounded-2xl bg-card border border-line shadow-xs flex flex-col justify-between">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-moss border border-line">
                  <span className="text-[11px] text-ink/60 font-semibold block">Monthly EMI</span>
                  <div className="font-display font-extrabold text-lg text-ink mt-0.5">
                    {formatCurrency(loanResults.baseEmi, baseCurrency, numberFormat, isPrivacyMode)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-moss border border-line">
                  <span className="text-[11px] text-ink/60 font-semibold block">Total Interest</span>
                  <div className="font-display font-extrabold text-lg text-flare-600 mt-0.5">
                    {formatCurrency(loanResults.totalInterestPaid, baseCurrency, numberFormat, isPrivacyMode)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-moss border border-line">
                  <span className="text-[11px] text-ink/60 font-semibold block">Total Repayment</span>
                  <div className="font-display font-extrabold text-lg text-ink mt-0.5">
                    {formatCurrency(loanResults.totalPayment, baseCurrency, numberFormat, isPrivacyMode)}
                  </div>
                </div>
              </div>

              {/* Prepayment Impact Banner */}
              {loanPrepaymentMonthly > 0 && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-sm text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Prepayment Advantage Detected</span>
                  </div>
                  <p>
                    By paying an extra <b>{formatCurrency(loanPrepaymentMonthly, baseCurrency, numberFormat, isPrivacyMode)}/mo</b>, you will save{' '}
                    <b>{formatCurrency(loanResults.interestSaved, baseCurrency, numberFormat, isPrivacyMode)}</b> in interest and finish your loan{' '}
                    <b>{loanResults.monthsSaved} months ({loanResults.actualYearsTaken} yrs total)</b> earlier!
                  </p>
                </div>
              )}

              {/* Progress Visualizer */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-ink/60 font-semibold">
                  <span>Principal: {formatCurrency(loanAmount, baseCurrency, numberFormat, isPrivacyMode)}</span>
                  <span>Interest: {formatCurrency(loanResults.totalInterestPaid, baseCurrency, numberFormat, isPrivacyMode)}</span>
                </div>
                <div className="h-3.5 w-full rounded-full bg-moss border border-line overflow-hidden flex">
                  <div
                    className="h-full bg-pine-600"
                    style={{ width: `${(loanAmount / (loanAmount + loanResults.totalInterestPaid)) * 100}%` }}
                  />
                  <div
                    className="h-full bg-flare-500"
                    style={{ width: `${(loanResults.totalInterestPaid / (loanAmount + loanResults.totalInterestPaid)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Amortization Repayment Schedule Table */}
          <div className="p-5 rounded-2xl bg-card border border-line space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
              <div>
                <h3 className="font-display font-extrabold text-sm text-ink flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-pine-600" />
                  <span>Amortization Repayment Schedule</span>
                </h3>
                <span className="text-[11px] text-ink/50">
                  Principal paydown and interest reduction progression over time.
                </span>
              </div>

              {/* View Switcher: Yearly vs Monthly */}
              <div className="flex p-0.5 rounded-lg bg-moss border border-line self-start sm:self-auto">
                <button
                  onClick={() => setLoanScheduleView('yearly')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    loanScheduleView === 'yearly'
                      ? 'bg-card text-ink shadow-2xs'
                      : 'text-ink/60 hover:text-ink'
                  }`}
                >
                  Yearly
                </button>
                <button
                  onClick={() => setLoanScheduleView('monthly')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    loanScheduleView === 'monthly'
                      ? 'bg-card text-ink shadow-2xs'
                      : 'text-ink/60 hover:text-ink'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-96 custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-moss text-ink/60 uppercase tracking-wider text-[10px] font-bold border-b border-line z-10">
                  <tr>
                    <th className="py-2.5 px-3">{loanScheduleView === 'yearly' ? 'Year' : 'Month'}</th>
                    <th className="py-2.5 px-3 text-right">Opening Balance</th>
                    <th className="py-2.5 px-3 text-right">EMI Paid</th>
                    <th className="py-2.5 px-3 text-right">Principal Paid</th>
                    <th className="py-2.5 px-3 text-right">Interest Paid</th>
                    {loanPrepaymentMonthly > 0 && <th className="py-2.5 px-3 text-right">Prepayment</th>}
                    <th className="py-2.5 px-3 text-right">Closing Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/40 font-mono text-[11.5px]">
                  {loanScheduleView === 'yearly'
                    ? loanResults.yearlySchedule.map((row) => (
                        <tr key={row.year} className="hover:bg-moss/40 transition-colors">
                          <td className="py-2 px-3 font-bold text-ink">Year {row.year}</td>
                          <td className="py-2 px-3 text-right text-ink/70">
                            {formatCurrency(row.openingBalance, baseCurrency, numberFormat, isPrivacyMode)}
                          </td>
                          <td className="py-2 px-3 text-right text-ink">
                            {formatCurrency(row.emiPaid, baseCurrency, numberFormat, isPrivacyMode)}
                          </td>
                          <td className="py-2 px-3 text-right text-pine-700 dark:text-pine-400 font-semibold">
                            {formatCurrency(row.principalPaid, baseCurrency, numberFormat, isPrivacyMode)}
                          </td>
                          <td className="py-2 px-3 text-right text-flare-600">
                            {formatCurrency(row.interestPaid, baseCurrency, numberFormat, isPrivacyMode)}
                          </td>
                          {loanPrepaymentMonthly > 0 && (
                            <td className="py-2 px-3 text-right text-emerald-600 font-bold">
                              {formatCurrency(row.prepaymentPaid, baseCurrency, numberFormat, isPrivacyMode)}
                            </td>
                          )}
                          <td className="py-2 px-3 text-right font-bold text-ink">
                            {formatCurrency(row.closingBalance, baseCurrency, numberFormat, isPrivacyMode)}
                          </td>
                        </tr>
                      ))
                    : loanResults.monthlySchedule.map((row) => (
                        <tr key={row.month} className="hover:bg-moss/40 transition-colors">
                          <td className="py-2 px-3 font-bold text-ink">Month {row.month}</td>
                          <td className="py-2 px-3 text-right text-ink/70">
                            {formatCurrency(row.openingBalance, baseCurrency, numberFormat, isPrivacyMode)}
                          </td>
                          <td className="py-2 px-3 text-right text-ink">
                            {formatCurrency(row.emi, baseCurrency, numberFormat, isPrivacyMode)}
                          </td>
                          <td className="py-2 px-3 text-right text-pine-700 dark:text-pine-400 font-semibold">
                            {formatCurrency(row.principal, baseCurrency, numberFormat, isPrivacyMode)}
                          </td>
                          <td className="py-2 px-3 text-right text-flare-600">
                            {formatCurrency(row.interest, baseCurrency, numberFormat, isPrivacyMode)}
                          </td>
                          {loanPrepaymentMonthly > 0 && (
                            <td className="py-2 px-3 text-right text-emerald-600 font-bold">
                              {formatCurrency(row.prepayment, baseCurrency, numberFormat, isPrivacyMode)}
                            </td>
                          )}
                          <td className="py-2 px-3 text-right font-bold text-ink">
                            {formatCurrency(row.closingBalance, baseCurrency, numberFormat, isPrivacyMode)}
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. STEP-UP SIP CALCULATOR                                     */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'stepup' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4 p-5 rounded-2xl bg-card border border-line shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink/60 border-b border-line pb-2 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-pine-600" />
              <span>Step-Up SIP Parameters</span>
            </h3>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-ink/70">Initial Monthly Investment</span>
                <span className="font-mono text-ink font-bold">
                  {formatCurrency(stepUpInitial, baseCurrency, numberFormat, isPrivacyMode)}
                </span>
              </div>
              <input
                type="range"
                min="1000"
                max="200000"
                step="1000"
                value={stepUpInitial}
                onChange={(e) => setStepUpInitial(Number(e.target.value))}
                className="w-full accent-pine-600 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-ink/70">Annual Step-Up Increment (%)</span>
                <span className="font-mono text-amber-600 font-bold">+{stepUpAnnualPct}% / year</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="1"
                value={stepUpAnnualPct}
                onChange={(e) => setStepUpAnnualPct(Number(e.target.value))}
                className="w-full accent-pine-600 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-ink/70">Expected Rate of Return (Starts 0%)</span>
                <span className="font-mono text-pine-700 dark:text-pine-400 font-bold">{stepUpRate}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="0.1"
                value={stepUpRate}
                onChange={(e) => setStepUpRate(Number(e.target.value))}
                className="w-full accent-pine-600 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-ink/70">Duration (Years)</span>
                <span className="font-mono text-ink font-bold">{stepUpYears} Years</span>
              </div>
              <input
                type="range"
                min="1"
                max="35"
                step="1"
                value={stepUpYears}
                onChange={(e) => setStepUpYears(Number(e.target.value))}
                className="w-full accent-pine-600 cursor-pointer"
              />
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4 p-6 rounded-2xl bg-card border border-line shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-pine-800 dark:text-pine-300 block">
                Step-Up SIP Maturity Wealth
              </span>
              <div className="font-display font-black text-3xl sm:text-4xl text-pine-700 dark:text-pine-300 num mt-1">
                {formatCurrency(stepUpResults.maturity, baseCurrency, numberFormat, isPrivacyMode)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-xs space-y-1.5">
              <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Power of Incremental Escalation</span>
              </div>
              <p className="text-amber-800/80 dark:text-amber-300/80">
                A regular flat SIP creates <b>{formatCurrency(stepUpResults.regularMaturity, baseCurrency, numberFormat, isPrivacyMode)}</b>.
                By stepping up by {stepUpAnnualPct}% every year, you gain an extra{' '}
                <b>+{formatCurrency(stepUpResults.extraGainFromStepUp, baseCurrency, numberFormat, isPrivacyMode)}</b>!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-moss border border-line">
                <span className="text-xs text-ink/60 font-semibold block">Total Invested</span>
                <span className="font-display font-bold text-base text-ink block mt-0.5">
                  {formatCurrency(stepUpResults.totalInvested, baseCurrency, numberFormat, isPrivacyMode)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-moss border border-line">
                <span className="text-xs text-pine-700 dark:text-pine-400 font-semibold block">Compound Gain</span>
                <span className="font-display font-bold text-base text-pine-700 dark:text-pine-400 block mt-0.5">
                  +{formatCurrency(stepUpResults.wealthGain, baseCurrency, numberFormat, isPrivacyMode)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. LUMPSUM CALCULATOR                                         */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'lumpsum' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4 p-5 rounded-2xl bg-card border border-line shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink/60 border-b border-line pb-2 flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-pine-600" />
              <span>Lumpsum Investment</span>
            </h3>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-ink/70">One-Time Deposit</span>
                <span className="font-mono text-ink font-bold">
                  {formatCurrency(lumpAmount, baseCurrency, numberFormat, isPrivacyMode)}
                </span>
              </div>
              <input
                type="range"
                min="10000"
                max="5000000"
                step="10000"
                value={lumpAmount}
                onChange={(e) => setLumpAmount(Number(e.target.value))}
                className="w-full accent-pine-600 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-ink/70">Expected Return Rate (0% to 30%)</span>
                <span className="font-mono text-pine-700 dark:text-pine-400 font-bold">{lumpRate}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="0.1"
                value={lumpRate}
                onChange={(e) => setLumpRate(Number(e.target.value))}
                className="w-full accent-pine-600 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-ink/70">Tenure (Years)</span>
                <span className="font-mono text-ink font-bold">{lumpYears} Years</span>
              </div>
              <input
                type="range"
                min="1"
                max="40"
                step="1"
                value={lumpYears}
                onChange={(e) => setLumpYears(Number(e.target.value))}
                className="w-full accent-pine-600 cursor-pointer"
              />
            </div>
          </div>

          <div className="lg:col-span-7 p-6 rounded-2xl bg-card border border-line shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink/50 block">Maturity Value</span>
              <div className="font-display font-black text-3xl sm:text-4xl text-ink num mt-1">
                {formatCurrency(lumpResults.maturity, baseCurrency, numberFormat, isPrivacyMode)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-moss border border-line">
                <span className="text-xs text-ink/60 font-semibold block">Principal Invested</span>
                <span className="font-display font-bold text-base text-ink block mt-0.5">
                  {formatCurrency(lumpResults.totalInvested, baseCurrency, numberFormat, isPrivacyMode)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-moss border border-line">
                <span className="text-xs text-pine-700 dark:text-pine-400 font-semibold block">Total Growth</span>
                <span className="font-display font-bold text-base text-pine-700 dark:text-pine-400 block mt-0.5">
                  +{formatCurrency(lumpResults.wealthGain, baseCurrency, numberFormat, isPrivacyMode)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. SWP (SYSTEMATIC WITHDRAWAL PLAN)                          */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'swp' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4 p-5 rounded-2xl bg-card border border-line shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink/60 border-b border-line pb-2 flex items-center gap-1.5">
              <ArrowDownRight className="w-4 h-4 text-pine-600" />
              <span>SWP Parameters</span>
            </h3>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-ink/70">Starting Corpus</span>
                <span className="font-mono text-ink font-bold">
                  {formatCurrency(swpCorpus, baseCurrency, numberFormat, isPrivacyMode)}
                </span>
              </div>
              <input
                type="range"
                min="500000"
                max="20000000"
                step="100000"
                value={swpCorpus}
                onChange={(e) => setSwpCorpus(Number(e.target.value))}
                className="w-full accent-pine-600 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-ink/70">Monthly Withdrawal</span>
                <span className="font-mono text-ink font-bold">
                  {formatCurrency(swpMonthly, baseCurrency, numberFormat, isPrivacyMode)}
                </span>
              </div>
              <input
                type="range"
                min="5000"
                max="200000"
                step="1000"
                value={swpMonthly}
                onChange={(e) => setSwpMonthly(Number(e.target.value))}
                className="w-full accent-pine-600 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-ink/70">Portfolio Return Rate (0% to 25%)</span>
                <span className="font-mono text-pine-700 dark:text-pine-400 font-bold">{swpRate}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="0.1"
                value={swpRate}
                onChange={(e) => setSwpRate(Number(e.target.value))}
                className="w-full accent-pine-600 cursor-pointer"
              />
            </div>
          </div>

          <div className="lg:col-span-7 p-6 rounded-2xl bg-card border border-line shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink/50 block">Total Withdrawn Cashflow</span>
              <div className="font-display font-black text-3xl sm:text-4xl text-ink num mt-1">
                {formatCurrency(swpResults.totalWithdrawn, baseCurrency, numberFormat, isPrivacyMode)}
              </div>
            </div>

            <div className={`p-4 rounded-xl border text-xs space-y-1 ${
              swpResults.isSustainable
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
            }`}>
              <span className="font-bold block text-sm">
                {swpResults.isSustainable ? '✓ Sustainable Cashflow' : '⚠️ Depletion Warning'}
              </span>
              <p>
                {swpResults.isSustainable
                  ? `Your portfolio survives the full ${swpYears} years with ${formatCurrency(swpResults.finalBalance, baseCurrency, numberFormat, isPrivacyMode)} ending capital.`
                  : `At this withdrawal rate and return, your capital will deplete in approx ${swpResults.depletedYears} years.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. FIRE & RUNWAY CALCULATOR                                   */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'fire' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4 p-5 rounded-2xl bg-card border border-line shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink/60 border-b border-line pb-2 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-mari-600" />
              <span>FIRE Inputs</span>
            </h3>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-ink/70">Monthly Living Expenses</span>
                <span className="font-mono text-ink font-bold">
                  {formatCurrency(fireMonthlyExpense, baseCurrency, numberFormat, isPrivacyMode)}
                </span>
              </div>
              <input
                type="range"
                min="10000"
                max="500000"
                step="2500"
                value={fireMonthlyExpense}
                onChange={(e) => setFireMonthlyExpense(Number(e.target.value))}
                className="w-full accent-pine-600 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-ink/70">Current Liquid Wealth</span>
                <span className="font-mono text-ink font-bold">
                  {formatCurrency(fireCurrentSavings, baseCurrency, numberFormat, isPrivacyMode)}
                </span>
              </div>
              <input
                type="range"
                min="100000"
                max="30000000"
                step="100000"
                value={fireCurrentSavings}
                onChange={(e) => setFireCurrentSavings(Number(e.target.value))}
                className="w-full accent-pine-600 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-ink/70">Monthly Savings Contribution</span>
                <span className="font-mono text-ink font-bold">
                  {formatCurrency(fireMonthlySavings, baseCurrency, numberFormat, isPrivacyMode)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="300000"
                step="2500"
                value={fireMonthlySavings}
                onChange={(e) => setFireMonthlySavings(Number(e.target.value))}
                className="w-full accent-pine-600 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-ink/70">Safe Withdrawal Rate (SWR)</span>
                <span className="font-mono text-mari-600 font-bold">{fireSwr}%</span>
              </div>
              <input
                type="range"
                min="2.5"
                max="5.0"
                step="0.1"
                value={fireSwr}
                onChange={(e) => setFireSwr(Number(e.target.value))}
                className="w-full accent-pine-600 cursor-pointer"
              />
            </div>
          </div>

          <div className="lg:col-span-7 p-6 rounded-2xl bg-card border border-line shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink/50 block">FIRE Target Number</span>
              <div className="font-display font-black text-3xl sm:text-4xl text-mari-600 num mt-1">
                {formatCurrency(fireResults.fireTarget, baseCurrency, numberFormat, isPrivacyMode)}
              </div>
              <span className="text-xs text-ink/60 mt-0.5 block">
                Required capital to cover {formatCurrency(fireResults.annualExpense, baseCurrency, numberFormat, isPrivacyMode)}/yr at {fireSwr}% SWR forever.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-moss border border-line">
                <span className="text-xs text-ink/60 font-semibold block">Years to FIRE</span>
                <span className="font-display font-extrabold text-xl text-ink block mt-0.5">
                  {fireResults.yearsToFire} Years
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-moss border border-line">
                <span className="text-xs text-ink/60 font-semibold block">Survival Runway Today</span>
                <span className="font-display font-extrabold text-xl text-pine-700 dark:text-pine-400 block mt-0.5">
                  {fireResults.currentRunwayMonths} Mos
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-ink/70">FIRE Freedom Progress</span>
                <span className="font-mono text-ink font-bold">{fireResults.progressPct}%</span>
              </div>
              <div className="h-3.5 w-full rounded-full bg-moss border border-line overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-pine-600 to-emerald-500"
                  style={{ width: `${fireResults.progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
