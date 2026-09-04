import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Badge } from '../common/Badge';
import { formatCurrency, formatCompactCurrency, formatPercent } from '../../utils/formatters';
import type { Liability, NumberFormatType, CurrencyCode } from '../../types';
import {
  TrendingDown,
  TrendingUp,
  Percent,
  Calendar,
  Sparkles,
  Zap,
  Clock,
  ShieldCheck,
  Award,
  ArrowRight,
  Flame,
  Snowflake,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  RotateCcw,
  Sliders,
  Layers,
  CheckCircle2,
  ChevronRight,
  Info,
} from 'lucide-react';

interface DebtSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  liabilities: Liability[];
  baseCurrency: string;
  numberFormat: NumberFormatType;
}

interface PayoffMilestone {
  debtId: string;
  name: string;
  month: number;
  freedEmi: number;
}

export const DebtSimulatorModal: React.FC<DebtSimulatorModalProps> = ({
  isOpen,
  onClose,
  liabilities,
  baseCurrency,
  numberFormat,
}) => {
  const [strategy, setStrategy] = useState<'avalanche' | 'snowball'>('avalanche');
  const [extraMonthly, setExtraMonthly] = useState<number>(5000);
  const [annualBonus, setAnnualBonus] = useState<number>(0);
  const [investmentCagr, setInvestmentCagr] = useState<number>(12); // 0-25% equity index CAGR
  const [inflationRate, setInflationRate] = useState<number>(6); // 0-15% India CPI

  // Available real or demo debts
  const allAvailableDebts: Liability[] = useMemo(() => {
    const realLoans = liabilities.filter((l) => l.outstandingBalance > 0);
    if (realLoans.length > 0) return realLoans;
    return [
      {
        id: 'demo-loan-1',
        vaultId: 'demo',
        name: 'HDFC Home Loan',
        type: 'home_loan',
        lender: 'HDFC Bank',
        principalAmount: 4500000,
        outstandingBalance: 3850000,
        interestRate: 8.75,
        tenureRemainingMonths: 180,
        emiAmount: 41200,
        currency: 'INR',
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'demo-loan-2',
        vaultId: 'demo',
        name: 'ICICI Car Loan',
        type: 'car_loan',
        lender: 'ICICI Bank',
        principalAmount: 850000,
        outstandingBalance: 520000,
        interestRate: 9.5,
        tenureRemainingMonths: 42,
        emiAmount: 16100,
        currency: 'INR',
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'demo-loan-3',
        vaultId: 'demo',
        name: 'Personal / Gadget Loan',
        type: 'personal_loan',
        lender: 'Bajaj Finance',
        principalAmount: 150000,
        outstandingBalance: 95000,
        interestRate: 14.0,
        tenureRemainingMonths: 18,
        emiAmount: 6200,
        currency: 'INR',
        updatedAt: new Date().toISOString(),
      },
    ];
  }, [liabilities]);

  // Selected Loan IDs state (defaults to all available loans)
  const [selectedDebtIds, setSelectedDebtIds] = useState<string[]>(() =>
    allAvailableDebts.map((d) => d.id)
  );

  // Per-loan adjusted interest rates
  const [customRates, setCustomRates] = useState<Record<string, number>>({});

  // Custom Loan Scenario toggle & fields
  const [includeCustomLoan, setIncludeCustomLoan] = useState<boolean>(false);
  const [customName, setCustomName] = useState<string>('Custom Loan Scenario');
  const [customBal, setCustomBal] = useState<number>(500000);
  const [customRate, setCustomRate] = useState<number>(10.5);
  const [customTenure, setCustomTenure] = useState<number>(60);

  // Sync selected debt IDs when debts change
  useEffect(() => {
    setSelectedDebtIds(allAvailableDebts.map((d) => d.id));
  }, [allAvailableDebts]);

  // Calculate standard EMI for custom loan
  const calculatedCustomEmi = useMemo(() => {
    const r = customRate / 100 / 12;
    const n = Math.max(1, customTenure || 60);
    if (r === 0) return Math.round(customBal / n);
    return Math.round((customBal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
  }, [customBal, customRate, customTenure]);

  // Active debts participating in the simulation
  const activeDebts: (Liability & { effectiveRate: number })[] = useMemo(() => {
    const list: (Liability & { effectiveRate: number })[] = allAvailableDebts
      .filter((d) => selectedDebtIds.includes(d.id))
      .map((d) => ({
        ...d,
        effectiveRate: customRates[d.id] ?? d.interestRate ?? 8.5,
      }));

    if (includeCustomLoan && customBal > 0) {
      list.push({
        id: 'custom-loan-user',
        vaultId: 'sim',
        name: customName || 'Custom Loan',
        type: 'other',
        lender: 'Custom Simulator',
        principalAmount: customBal,
        outstandingBalance: customBal,
        interestRate: customRate,
        effectiveRate: customRate,
        tenureRemainingMonths: customTenure,
        emiAmount: calculatedCustomEmi,
        currency: baseCurrency,
        updatedAt: new Date().toISOString(),
      });
    }

    return list;
  }, [
    allAvailableDebts,
    selectedDebtIds,
    customRates,
    includeCustomLoan,
    customName,
    customBal,
    customRate,
    customTenure,
    calculatedCustomEmi,
    baseCurrency,
  ]);

  // Selection toggles
  const handleToggleDebt = (id: string) => {
    setSelectedDebtIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedDebtIds(allAvailableDebts.map((d) => d.id));
  };

  const handleDeselectAll = () => {
    setSelectedDebtIds([]);
  };

  const handleRateChange = (id: string, newRate: number) => {
    setCustomRates((prev) => ({
      ...prev,
      [id]: Math.max(0.1, Math.min(36, Math.round(newRate * 100) / 100)),
    }));
  };

  const handleResetRate = (id: string) => {
    setCustomRates((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // Baseline stats across selected loans
  const baselineStats = useMemo(() => {
    const totalBalance = activeDebts.reduce((s, d) => s + d.outstandingBalance, 0);
    const totalMonthlyEmi = activeDebts.reduce((s, d) => s + (d.emiAmount || 0), 0);
    const maxTenure = Math.max(...activeDebts.map((d) => d.tenureRemainingMonths || 12), 12);

    const weightedApr =
      totalBalance > 0
        ? activeDebts.reduce((s, d) => s + d.outstandingBalance * d.effectiveRate, 0) / totalBalance
        : 0;

    let baselineTotalInterest = 0;
    activeDebts.forEach((d) => {
      const r = d.effectiveRate / 100 / 12;
      const n = d.tenureRemainingMonths && d.tenureRemainingMonths > 0 ? d.tenureRemainingMonths : 60;
      const minEmi = (d.outstandingBalance * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      const emi = d.emiAmount && d.emiAmount > d.outstandingBalance * r ? d.emiAmount : minEmi;
      baselineTotalInterest += Math.max(0, emi * n - d.outstandingBalance);
    });

    return { totalBalance, totalMonthlyEmi, maxTenure, weightedApr, baselineTotalInterest };
  }, [activeDebts]);

  // Accelerated simulation with true rollover (Avalanche vs Snowball)
  const simulation = useMemo(() => {
    if (activeDebts.length === 0) {
      return {
        acceleratedMonths: 0,
        monthsSaved: 0,
        acceleratedTotalInterest: 0,
        interestSaved: 0,
        futureInvestmentWealth: 0,
        realBurden5Y: 0,
        realBurden10Y: 0,
        payoffMilestones: [] as PayoffMilestone[],
      };
    }

    // Clone debts for month-by-month simulation
    const debts = activeDebts.map((d) => ({
      id: d.id,
      name: d.name,
      bal: d.outstandingBalance,
      rate: d.effectiveRate / 100 / 12,
      effectiveApr: d.effectiveRate,
      emi: d.emiAmount || Math.max(1000, d.outstandingBalance * 0.02),
    }));

    // Prioritize debts
    if (strategy === 'avalanche') {
      debts.sort((a, b) => b.effectiveApr - a.effectiveApr); // Highest APR first
    } else {
      debts.sort((a, b) => a.bal - b.bal); // Lowest balance first
    }

    let month = 0;
    let acceleratedTotalInterest = 0;
    const maxSimMonths = 360;
    const milestones: PayoffMilestone[] = [];

    while (month < maxSimMonths && debts.some((d) => d.bal > 0.5)) {
      month++;
      let extraPool = extraMonthly;
      if (annualBonus > 0 && month % 12 === 0) {
        extraPool += annualBonus;
      }

      // 1. Pay regular EMI on all active debts and collect freed-up EMI from paid debts
      for (const d of debts) {
        if (d.bal <= 0.5) {
          extraPool += d.emi; // Snowball roll-forward!
          continue;
        }

        const interest = d.bal * d.rate;
        acceleratedTotalInterest += interest;
        const prinFromEmi = Math.min(d.bal, Math.max(1, d.emi - interest));
        d.bal -= prinFromEmi;

        if (d.bal <= 0.5) {
          d.bal = 0;
          if (!milestones.some((m) => m.debtId === d.id)) {
            milestones.push({ debtId: d.id, name: d.name, month, freedEmi: d.emi });
          }
        }
      }

      // 2. Direct extra cash towards top priority active debt
      for (const d of debts) {
        if (d.bal <= 0.5) continue;
        if (extraPool > 0) {
          const prePay = Math.min(d.bal, extraPool);
          d.bal -= prePay;
          extraPool -= prePay;

          if (d.bal <= 0.5) {
            d.bal = 0;
            if (!milestones.some((m) => m.debtId === d.id)) {
              milestones.push({ debtId: d.id, name: d.name, month, freedEmi: d.emi });
            }
          }
        }
      }
    }

    const monthsSaved = Math.max(0, baselineStats.maxTenure - month);
    const interestSaved = Math.max(0, baselineStats.baselineTotalInterest - acceleratedTotalInterest);

    // Opportunity cost calculation: SIP compounding at investmentCagr
    const sipMonthlyRate = investmentCagr / 100 / 12;
    let futureInvestmentWealth = 0;
    for (let m = 1; m <= month; m++) {
      futureInvestmentWealth = (futureInvestmentWealth + extraMonthly) * (1 + sipMonthlyRate);
    }

    // Inflation erosion
    const annualInflation = inflationRate / 100;
    const realBurden5Y = baselineStats.totalMonthlyEmi / Math.pow(1 + annualInflation, 5);
    const realBurden10Y = baselineStats.totalMonthlyEmi / Math.pow(1 + annualInflation, 10);

    return {
      acceleratedMonths: month,
      monthsSaved,
      acceleratedTotalInterest,
      interestSaved,
      futureInvestmentWealth,
      realBurden5Y,
      realBurden10Y,
      payoffMilestones: milestones,
    };
  }, [activeDebts, baselineStats, strategy, extraMonthly, annualBonus, investmentCagr, inflationRate]);

  if (!isOpen) return null;

  const totalSelectedCount = selectedDebtIds.length + (includeCustomLoan ? 1 : 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-pine-50 dark:bg-pine-950/40 text-pine-600 border border-pine-200/60 dark:border-pine-800/40 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold text-ink">
              Advanced Multi-Loan Debt Payoff Simulator
            </span>
            <span className="block text-xs text-ink/50">
              Multi-loan selection, custom APR tuning, snowball rollover & opportunity cost intelligence
            </span>
          </div>
        </div>
      }
      maxWidth="3xl"
    >
      <div className="space-y-5">
        {/* Strategy Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setStrategy('avalanche')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              strategy === 'avalanche'
                ? 'border-pine-400 bg-pine-50/70 dark:bg-pine-950/50 shadow-sm'
                : 'border-line bg-moss/40 hover:bg-moss/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-ink flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-flare-600" />
                Debt Avalanche (Highest APR First)
              </span>
              <Badge tone="pine">Max ₹ Savings</Badge>
            </div>
            <p className="text-[11.5px] text-ink/65 mt-1.5 leading-relaxed">
              Attacks high-interest loans first. Mathematically guarantees the lowest possible total interest paid across all loans.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setStrategy('snowball')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              strategy === 'snowball'
                ? 'border-pine-400 bg-pine-50/70 dark:bg-pine-950/50 shadow-sm'
                : 'border-line bg-moss/40 hover:bg-moss/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-ink flex items-center gap-1.5">
                <Snowflake className="w-4 h-4 text-sky-600" />
                Debt Snowball (Lowest Balance First)
              </span>
              <Badge tone="sky">Psychological Wins</Badge>
            </div>
            <p className="text-[11.5px] text-ink/65 mt-1.5 leading-relaxed">
              Knocks out smallest balances first to eliminate loan accounts rapidly, building massive momentum and freeing up cash flow.
            </p>
          </button>
        </div>

        {/* Multi-Loan Selection & Per-Loan APR Tuning */}
        <div className="rounded-2xl border border-line bg-card p-4 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-pine-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-ink">
                Select Loans to Accelerate ({totalSelectedCount} of {allAvailableDebts.length + (includeCustomLoan ? 1 : 0)} Included)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[11px] font-semibold text-pine-600 hover:text-pine-700 cursor-pointer underline"
              >
                Select All
              </button>
              <span className="text-ink/30">•</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-[11px] font-semibold text-ink/60 hover:text-ink cursor-pointer underline"
              >
                Clear All
              </button>
              <span className="text-ink/30">•</span>
              <button
                type="button"
                onClick={() => setIncludeCustomLoan(!includeCustomLoan)}
                className={`text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                  includeCustomLoan ? 'text-amber-600 font-bold' : 'text-ink/70 hover:text-ink'
                }`}
              >
                <Plus className="w-3 h-3" />
                {includeCustomLoan ? 'Hide Custom Loan' : '+ Custom Loan'}
              </button>
            </div>
          </div>

          {/* Loan List */}
          <div className="space-y-2.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
            {allAvailableDebts.map((loan) => {
              const isSelected = selectedDebtIds.includes(loan.id);
              const effectiveRate = customRates[loan.id] ?? loan.interestRate ?? 8.5;
              const isModified = customRates[loan.id] !== undefined;

              return (
                <div
                  key={loan.id}
                  className={`p-3 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-moss/40 border-pine-300 dark:border-pine-800/80 shadow-2xs'
                      : 'bg-card border-line/60 opacity-65 hover:opacity-100'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    {/* Checkbox and Loan Info */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleDebt(loan.id)}
                        className="text-pine-600 cursor-pointer shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-pine-600" />
                        ) : (
                          <Square className="w-4 h-4 text-ink/40" />
                        )}
                      </button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-bold text-xs text-ink truncate">{loan.name}</span>
                          {loan.lender && (
                            <span className="text-[10px] text-ink/45 truncate">({loan.lender})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-ink/60 mt-0.5">
                          <span>
                            Bal: <b className="text-ink font-mono">{formatCurrency(loan.outstandingBalance, baseCurrency, numberFormat)}</b>
                          </span>
                          <span>•</span>
                          <span>
                            EMI: <b className="text-ink font-mono">{formatCurrency(loan.emiAmount, baseCurrency, numberFormat)}/mo</b>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Interest Rate Tuning */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1.5 bg-card px-2.5 py-1 rounded-lg border border-line">
                        <span className="text-[10.5px] text-ink/50 uppercase font-bold">APR:</span>
                        <input
                          type="number"
                          step={0.1}
                          min={0.1}
                          max={36}
                          value={effectiveRate}
                          onChange={(e) => handleRateChange(loan.id, parseFloat(e.target.value) || 0.1)}
                          className="w-14 text-right text-xs font-bold font-mono text-ink bg-transparent focus:outline-none"
                        />
                        <span className="text-xs font-semibold text-ink/60">%</span>
                      </div>

                      {isModified && (
                        <button
                          type="button"
                          onClick={() => handleResetRate(loan.id)}
                          className="p-1 rounded-md text-ink/45 hover:text-ink hover:bg-moss/80 transition-colors cursor-pointer"
                          title={`Reset to original ${loan.interestRate}%`}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Custom Loan Scenario */}
            {includeCustomLoan && (
              <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-300">
                      Custom Loan Simulator
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIncludeCustomLoan(false)}
                    className="text-xs text-ink/50 hover:text-flare-600 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div>
                    <label className="text-[10px] text-ink/60 block font-semibold mb-0.5">Loan Label</label>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full px-2 py-1 rounded-lg bg-card border border-line text-xs text-ink"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-ink/60 block font-semibold mb-0.5">Principal (₹)</label>
                    <input
                      type="number"
                      step={50000}
                      value={customBal}
                      onChange={(e) => setCustomBal(Number(e.target.value))}
                      className="w-full px-2 py-1 rounded-lg bg-card border border-line text-xs font-mono text-ink"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-ink/60 block font-semibold mb-0.5">APR Rate (%)</label>
                    <input
                      type="number"
                      step={0.25}
                      value={customRate}
                      onChange={(e) => setCustomRate(Number(e.target.value))}
                      className="w-full px-2 py-1 rounded-lg bg-card border border-line text-xs font-mono text-ink"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-ink/60 block font-semibold mb-0.5">Tenure (Mos)</label>
                    <input
                      type="number"
                      step={12}
                      value={customTenure}
                      onChange={(e) => setCustomTenure(Number(e.target.value))}
                      className="w-full px-2 py-1 rounded-lg bg-card border border-line text-xs font-mono text-ink"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px] text-amber-800 dark:text-amber-300/90 pt-1">
                  <span>Calculated Monthly EMI: <b>{formatCurrency(calculatedCustomEmi, baseCurrency, numberFormat)}</b></span>
                  <span>Total Loan: <b>{formatCurrency(customBal, baseCurrency, numberFormat)}</b></span>
                </div>
              </div>
            )}
          </div>

          {/* Consolidated Selected Roster Overview */}
          <div className="p-3 rounded-xl bg-moss/70 border border-line flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[10.5px] text-ink/50 block font-bold uppercase">Consolidated Debt</span>
              <span className="font-display font-extrabold text-sm text-ink font-mono">
                {formatCurrency(baselineStats.totalBalance, baseCurrency, numberFormat)}
              </span>
            </div>
            <div>
              <span className="text-[10.5px] text-ink/50 block font-bold uppercase">Total Monthly EMI</span>
              <span className="font-display font-extrabold text-sm text-ink font-mono">
                {formatCurrency(baselineStats.totalMonthlyEmi, baseCurrency, numberFormat)}/mo
              </span>
            </div>
            <div>
              <span className="text-[10.5px] text-ink/50 block font-bold uppercase">Blended Weighted APR</span>
              <span className="font-display font-extrabold text-sm text-pine-600 font-mono">
                {baselineStats.weightedApr.toFixed(2)}% p.a.
              </span>
            </div>
          </div>
        </div>

        {/* Sliders & Pre-payment Parameters */}
        <div className="rounded-2xl border border-line bg-moss/50 p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-xs font-semibold text-ink mb-1">
                <span>Extra Monthly Pre-Payment</span>
                <span className="font-bold text-pine-700 dark:text-pine-400 font-mono">
                  +{formatCurrency(extraMonthly, baseCurrency, numberFormat, false)}/mo
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100000}
                step={1000}
                value={extraMonthly}
                onChange={(e) => setExtraMonthly(Number(e.target.value))}
                className="w-full accent-pine-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-ink/40 mt-0.5">
                <span>₹0</span>
                <span>₹50,000</span>
                <span>₹1 Lakh/mo</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-ink mb-1">
                <span>Annual Bonus Lump Sum</span>
                <span className="font-bold text-mari-700 dark:text-mari-400 font-mono">
                  +{formatCurrency(annualBonus, baseCurrency, numberFormat, false)}/yr
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={500000}
                step={10000}
                value={annualBonus}
                onChange={(e) => setAnnualBonus(Number(e.target.value))}
                className="w-full accent-mari-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-ink/40 mt-0.5">
                <span>₹0</span>
                <span>₹2.5 Lakh</span>
                <span>₹5 Lakh/yr</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-line/70">
            <div>
              <div className="flex justify-between text-xs font-semibold text-ink mb-1">
                <span>Equity Opportunity CAGR</span>
                <span className="font-bold text-ink font-mono">{investmentCagr}% p.a.</span>
              </div>
              <input
                type="range"
                min={0}
                max={25}
                step={0.5}
                value={investmentCagr}
                onChange={(e) => setInvestmentCagr(Number(e.target.value))}
                className="w-full accent-pine-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10.5px] text-ink/50 mt-0.5">
                <span>0% (Zero Opportunity Cost)</span>
                <span>{investmentCagr === 0 ? '✓ Pure Debt Mode' : 'Assumed equity index CAGR'}</span>
                <span>25%</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-ink mb-1">
                <span>Expected Inflation Rate</span>
                <span className="font-bold text-ink font-mono">{inflationRate}% p.a.</span>
              </div>
              <input
                type="range"
                min={0}
                max={15}
                step={0.5}
                value={inflationRate}
                onChange={(e) => setInflationRate(Number(e.target.value))}
                className="w-full accent-flare-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10.5px] text-ink/50 mt-0.5">
                <span>0% (Zero Inflation)</span>
                <span>{inflationRate === 0 ? '✓ Absolute nominal' : 'Erodes purchasing power'}</span>
                <span>15%</span>
              </div>
            </div>
          </div>

          {(investmentCagr === 0 || inflationRate === 0) && (
            <div className="p-2.5 rounded-xl bg-pine-100/60 dark:bg-pine-950/40 border border-pine-200 dark:border-pine-800 text-xs text-pine-900 dark:text-pine-200 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-pine-600 shrink-0" />
              <span>
                {investmentCagr === 0 && inflationRate === 0
                  ? 'Pure Debt Paydown Mode: 100% focused on guaranteed interest savings and accelerated freedom with zero equity risk or inflation erosion.'
                  : investmentCagr === 0
                  ? 'Zero Opportunity Cost Mode: Eliminates equity market comparison to evaluate pure loan interest savings.'
                  : 'Zero Inflation Mode: Evaluates fixed EMI payments in constant nominal currency.'}
              </span>
            </div>
          )}
        </div>

        {/* Payoff Acceleration Summary Card */}
        <div className="rounded-2xl border border-pine-300 dark:border-pine-800 bg-pine-50/70 dark:bg-pine-950/40 p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs uppercase tracking-wider font-bold text-pine-800 dark:text-pine-300 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-pine-600" />
              Simulated Payoff Acceleration
            </span>
            <Badge tone="pine">
              Debt-Free {Math.round((simulation.monthsSaved / 12) * 10) / 10} Years Sooner!
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-card border border-line">
              <span className="text-[10.5px] text-ink/50 uppercase font-bold block">New Payoff Time</span>
              <span className="font-display font-extrabold text-lg sm:text-xl text-ink font-mono">
                {simulation.acceleratedMonths} mos
              </span>
              <span className="text-[11px] text-pine-600 block mt-0.5">
                −{simulation.monthsSaved} months saved
              </span>
            </div>

            <div className="p-3 rounded-xl bg-card border border-line">
              <span className="text-[10.5px] text-ink/50 uppercase font-bold block">Interest Saved</span>
              <span className="font-display font-extrabold text-lg sm:text-xl text-pine-700 dark:text-pine-400 font-mono">
                {formatCompactCurrency(simulation.interestSaved, baseCurrency, numberFormat, false)}
              </span>
              <span className="text-[11px] text-ink/50 block mt-0.5">Direct cash saved</span>
            </div>

            <div className="p-3 rounded-xl bg-card border border-line">
              <span className="text-[10.5px] text-ink/50 uppercase font-bold block">Total Outflow</span>
              <span className="font-display font-extrabold text-lg sm:text-xl text-ink font-mono">
                {formatCompactCurrency(
                  baselineStats.totalBalance + simulation.acceleratedTotalInterest,
                  baseCurrency,
                  numberFormat,
                  false
                )}
              </span>
              <span className="text-[11px] text-ink/50 block mt-0.5">Principal + Interest</span>
            </div>

            <div className="p-3 rounded-xl bg-card border border-line">
              <span className="text-[10.5px] text-ink/50 uppercase font-bold block">Debt Free Date</span>
              <span className="font-display font-extrabold text-base sm:text-lg text-ink font-mono">
                {new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(
                  new Date(Date.now() + simulation.acceleratedMonths * 30 * 86400000)
                )}
              </span>
              <span className="text-[11px] text-pine-600 block mt-0.5">Target Horizon</span>
            </div>
          </div>
        </div>

        {/* Sequential Payoff Timeline / Rollover Sequence */}
        {simulation.payoffMilestones.length > 0 && (
          <div className="rounded-2xl border border-line bg-card p-4 space-y-3">
            <span className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-pine-600" />
              Payoff Elimination Sequence ({strategy === 'avalanche' ? 'Avalanche Order' : 'Snowball Order'})
            </span>
            <div className="space-y-2">
              {simulation.payoffMilestones.map((m, idx) => {
                const isLast = idx === simulation.payoffMilestones.length - 1;
                return (
                  <div
                    key={m.debtId}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-moss/40 border border-line text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-pine-100 dark:bg-pine-950 text-pine-700 dark:text-pine-300 font-bold text-[10px] grid place-items-center">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-bold text-ink">{m.name}</span>
                        <span className="text-[11px] text-ink/50 block">
                          Freed up EMI: +{formatCurrency(m.freedEmi, baseCurrency, numberFormat)}/mo redirected
                        </span>
                      </div>
                    </div>
                    <Badge tone={isLast ? 'pine' : 'sky'} size="sm">
                      {isLast ? `Fully Debt-Free in Month ${m.month}` : `Paid off in Month ${m.month}`}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Opportunity Cost & Inflation Intelligence */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Opportunity Cost vs SIP */}
          <div className="rounded-2xl border border-line bg-card p-4 space-y-2.5">
            <span className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-pine-600" />
              Opportunity Cost vs. Equity SIP
            </span>
            <p className="text-[11.5px] text-ink/65 leading-relaxed">
              If you instead invested that extra <b>{formatCurrency(extraMonthly, baseCurrency, numberFormat, false)}/mo</b> into an Equity Index SIP compounding at <b>{investmentCagr}%</b>:
            </p>
            <div className="p-3 rounded-xl bg-moss/70 border border-line flex items-center justify-between">
              <div>
                <span className="text-[10.5px] text-ink/50 block uppercase font-bold">Projected Investment Corpus</span>
                <span className="font-display font-extrabold text-lg text-pine-700 dark:text-pine-400 font-mono">
                  {formatCompactCurrency(simulation.futureInvestmentWealth, baseCurrency, numberFormat, false)}
                </span>
              </div>
              <Badge tone={simulation.futureInvestmentWealth > simulation.interestSaved ? 'pine' : 'gray'}>
                {simulation.futureInvestmentWealth > simulation.interestSaved ? 'SIP Yields More' : 'Payoff Yields More'}
              </Badge>
            </div>
            <span className="text-[10.5px] text-ink/50 block">
              Rule of thumb: Pre-paying loans with interest &gt;10% is guaranteed wealth; for cheap home loans &lt;8.5%, investing often yields higher net worth.
            </span>
          </div>

          {/* Inflation Erosion Effect */}
          <div className="rounded-2xl border border-line bg-card p-4 space-y-2.5">
            <span className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-mari-600" />
              Inflation Erosion of Fixed Debt
            </span>
            <p className="text-[11.5px] text-ink/65 leading-relaxed">
              At <b>{inflationRate}% annual inflation</b>, the real purchasing power burden of your fixed EMI shrinks significantly over time:
            </p>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between p-2 rounded-lg bg-moss/50 border border-line">
                <span className="text-ink/70">Current Monthly EMI:</span>
                <span className="font-bold text-ink font-mono">{formatCurrency(baselineStats.totalMonthlyEmi, baseCurrency, numberFormat, false)}</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-moss/50 border border-line">
                <span className="text-ink/70">Real Value in Year 5:</span>
                <span className="font-bold text-pine-600 font-mono">
                  {formatCurrency(simulation.realBurden5Y, baseCurrency, numberFormat, false)}{' '}
                  <span className="text-[10px] text-ink/50">({Math.round((1 - simulation.realBurden5Y / (baselineStats.totalMonthlyEmi || 1)) * 100)}% lighter)</span>
                </span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-moss/50 border border-line">
                <span className="text-ink/70">Real Value in Year 10:</span>
                <span className="font-bold text-pine-600 font-mono">
                  {formatCurrency(simulation.realBurden10Y, baseCurrency, numberFormat, false)}{' '}
                  <span className="text-[10px] text-ink/50">({Math.round((1 - simulation.realBurden10Y / (baselineStats.totalMonthlyEmi || 1)) * 100)}% lighter)</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="flex justify-end pt-2">
          <Button variant="primary" size="md" onClick={onClose}>
            <span>Done</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
