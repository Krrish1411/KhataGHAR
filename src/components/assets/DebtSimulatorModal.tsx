import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';

interface DebtSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  liabilities: Liability[];
  baseCurrency: string;
  numberFormat: NumberFormatType;
}

export const DebtSimulatorModal: React.FC<DebtSimulatorModalProps> = ({
  isOpen,
  onClose,
  liabilities,
  baseCurrency,
  numberFormat,
}) => {
  const [strategy, setStrategy] = useState<'avalanche' | 'snowball'>('avalanche');
  const [selectedLoanScope, setSelectedLoanScope] = useState<string>('all');
  const [customBal, setCustomBal] = useState<number>(1000000);
  const [customRate, setCustomRate] = useState<number>(9.0);
  const [customEmi, setCustomEmi] = useState<number>(12670);
  const [customTenure, setCustomTenure] = useState<number>(120);
  const [extraMonthly, setExtraMonthly] = useState<number>(5000);
  const [annualBonus, setAnnualBonus] = useState<number>(0);
  const [investmentCagr, setInvestmentCagr] = useState<number>(12); // 0-25% equity index CAGR
  const [inflationRate, setInflationRate] = useState<number>(6); // 0-15% India CPI

  // Fallback demo loans if user has 0 loans recorded
  const allAvailableDebts: Liability[] = useMemo(() => {
    if (liabilities.length > 0) return liabilities.filter((l) => l.outstandingBalance > 0);
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

  // Selected Scope Debts
  const activeDebts: Liability[] = useMemo(() => {
    if (selectedLoanScope === 'custom') {
      return [
        {
          id: 'custom-loan',
          vaultId: 'sim',
          name: 'Custom Loan Scenario',
          type: 'other',
          lender: 'Custom Simulator',
          principalAmount: customBal,
          outstandingBalance: customBal,
          interestRate: customRate,
          tenureRemainingMonths: customTenure,
          emiAmount: customEmi,
          currency: baseCurrency,
          updatedAt: new Date().toISOString(),
        },
      ];
    }
    if (selectedLoanScope !== 'all') {
      const found = allAvailableDebts.find((d) => d.id === selectedLoanScope);
      if (found) return [found];
    }
    return allAvailableDebts;
  }, [selectedLoanScope, allAvailableDebts, customBal, customRate, customTenure, customEmi, baseCurrency]);

  // Current Total Baseline
  const baselineStats = useMemo(() => {
    const totalBalance = activeDebts.reduce((s, d) => s + d.outstandingBalance, 0);
    const totalMonthlyEmi = activeDebts.reduce((s, d) => s + (d.emiAmount || 0), 0);
    const maxTenure = Math.max(...activeDebts.map((d) => d.tenureRemainingMonths || 12), 12);

    // Approximate baseline interest
    let baselineTotalInterest = 0;
    activeDebts.forEach((d) => {
      const r = (d.interestRate || 9) / 100 / 12;
      const n = d.tenureRemainingMonths || 12;
      const emi = d.emiAmount || (d.outstandingBalance * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      baselineTotalInterest += Math.max(0, emi * n - d.outstandingBalance);
    });

    return { totalBalance, totalMonthlyEmi, maxTenure, baselineTotalInterest };
  }, [activeDebts]);

  // Accelerated Simulation Engine
  const simulation = useMemo(() => {
    // Sort debts according to strategy
    const sorted = [...activeDebts].map((d) => ({
      ...d,
      bal: d.outstandingBalance,
      rate: (d.interestRate || 9) / 100 / 12,
      emi: d.emiAmount || 5000,
    }));

    if (strategy === 'avalanche') {
      sorted.sort((a, b) => (b.interestRate || 0) - (a.interestRate || 0)); // Highest rate first
    } else {
      sorted.sort((a, b) => a.bal - b.bal); // Lowest balance first
    }

    let month = 0;
    let acceleratedTotalInterest = 0;
    const maxSimMonths = 360;

    // Simulate month by month
    while (month < maxSimMonths && sorted.some((d) => d.bal > 1)) {
      month++;
      let extraCash = extraMonthly;
      if (annualBonus > 0 && month % 12 === 0) {
        extraCash += annualBonus;
      }

      for (const d of sorted) {
        if (d.bal <= 0) continue;
        const interest = d.bal * d.rate;
        acceleratedTotalInterest += interest;
        const principalFromEmi = Math.min(d.bal, Math.max(0, d.emi - interest));
        d.bal -= principalFromEmi;

        // Apply extra cash to target debt
        if (extraCash > 0 && d.bal > 0) {
          const prePay = Math.min(d.bal, extraCash);
          d.bal -= prePay;
          extraCash -= prePay;
        }
      }
    }

    const monthsSaved = Math.max(0, baselineStats.maxTenure - month);
    const interestSaved = Math.max(0, baselineStats.baselineTotalInterest - acceleratedTotalInterest);

    // Opportunity Cost calculation: If extraMonthly was invested in Equity SIP at investmentCagr
    const monthlyRate = investmentCagr / 100 / 12;
    let futureInvestmentWealth = 0;
    for (let m = 1; m <= month; m++) {
      futureInvestmentWealth = (futureInvestmentWealth + extraMonthly) * (1 + monthlyRate);
    }

    // Inflation Adjusted Real EMI burden (Year 1 vs Year 5 vs Year 10)
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
    };
  }, [activeDebts, baselineStats, strategy, extraMonthly, annualBonus, investmentCagr, inflationRate]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-pine-50 dark:bg-pine-950/40 text-pine-600 border border-pine-200/60 dark:border-pine-800/40">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold text-ink">
              Advanced Debt Payoff & Opportunity Simulator
            </span>
            <span className="block text-xs text-ink/50">
              Snowball vs. Avalanche optimization with equity opportunity cost & inflation analysis
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
                Debt Avalanche (Highest Interest First)
              </span>
              <Badge tone="pine">Max ₹ Savings</Badge>
            </div>
            <p className="text-[11.5px] text-ink/65 mt-1.5 leading-relaxed">
              Attacks high-interest loans (e.g. personal loans, credit cards) first. Mathematically guarantees the lowest possible total interest paid.
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
                <Snowflake className="w-4 h-4 text-skyx-600" />
                Debt Snowball (Lowest Balance First)
              </span>
              <Badge tone="sky">Psychological Wins</Badge>
            </div>
            <p className="text-[11.5px] text-ink/65 mt-1.5 leading-relaxed">
              Knocks out smallest balances first to reduce number of active loans quickly, building massive psychological momentum.
            </p>
          </button>
        </div>

        {/* Sliders & Pre-payment Parameters */}
        <div className="rounded-2xl border border-line bg-moss/50 p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-xs font-semibold text-ink mb-1">
                <span>Extra Monthly Pre-Payment</span>
                <span className="font-bold text-pine-700 dark:text-pine-400 num">
                  +{formatCurrency(extraMonthly, baseCurrency, numberFormat, false)}/mo
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={50000}
                step={1000}
                value={extraMonthly}
                onChange={(e) => setExtraMonthly(Number(e.target.value))}
                className="w-full accent-pine-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-ink/40 mt-0.5">
                <span>₹0</span>
                <span>₹25k</span>
                <span>₹50k/mo</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-ink mb-1">
                <span>Annual Bonus Lump Sum</span>
                <span className="font-bold text-mari-700 dark:text-mari-400 num">
                  +{formatCurrency(annualBonus, baseCurrency, numberFormat, false)}/yr
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={200000}
                step={10000}
                value={annualBonus}
                onChange={(e) => setAnnualBonus(Number(e.target.value))}
                className="w-full accent-mari-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-ink/40 mt-0.5">
                <span>₹0</span>
                <span>₹1 Lakh</span>
                <span>₹2 Lakh/yr</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-line/70">
            <div>
              <div className="flex justify-between text-xs font-semibold text-ink mb-1">
                <span>Equity Opportunity CAGR</span>
                <span className="font-bold text-ink num">{investmentCagr}% p.a.</span>
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
                <span className="font-bold text-ink num">{inflationRate}% p.a.</span>
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
              Debt-Free {Math.round(simulation.monthsSaved / 12 * 10) / 10} Years Sooner!
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-card border border-line">
              <span className="text-[10.5px] text-ink/50 uppercase font-bold block">New Payoff Time</span>
              <span className="font-display font-extrabold text-lg sm:text-xl text-ink num">
                {simulation.acceleratedMonths} mos
              </span>
              <span className="text-[11px] text-pine-600 block mt-0.5">
                −{simulation.monthsSaved} months saved
              </span>
            </div>

            <div className="p-3 rounded-xl bg-card border border-line">
              <span className="text-[10.5px] text-ink/50 uppercase font-bold block">Interest Saved</span>
              <span className="font-display font-extrabold text-lg sm:text-xl text-pine-700 dark:text-pine-400 num">
                {formatCompactCurrency(simulation.interestSaved, baseCurrency, numberFormat, false)}
              </span>
              <span className="text-[11px] text-ink/50 block mt-0.5">Direct cash saved</span>
            </div>

            <div className="p-3 rounded-xl bg-card border border-line">
              <span className="text-[10.5px] text-ink/50 uppercase font-bold block">Total Outflow</span>
              <span className="font-display font-extrabold text-lg sm:text-xl text-ink num">
                {formatCompactCurrency(baselineStats.totalBalance + simulation.acceleratedTotalInterest, baseCurrency, numberFormat, false)}
              </span>
              <span className="text-[11px] text-ink/50 block mt-0.5">Principal + Interest</span>
            </div>

            <div className="p-3 rounded-xl bg-card border border-line">
              <span className="text-[10.5px] text-ink/50 uppercase font-bold block">Debt Free Date</span>
              <span className="font-display font-extrabold text-base sm:text-lg text-ink num">
                {new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(
                  new Date(Date.now() + simulation.acceleratedMonths * 30 * 86400000)
                )}
              </span>
              <span className="text-[11px] text-pine-600 block mt-0.5">Target Horizon</span>
            </div>
          </div>
        </div>

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
                <span className="font-display font-extrabold text-lg text-pine-700 dark:text-pine-400 num">
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
                <span className="font-bold text-ink num">{formatCurrency(baselineStats.totalMonthlyEmi, baseCurrency, numberFormat, false)}</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-moss/50 border border-line">
                <span className="text-ink/70">Real Value in Year 5:</span>
                <span className="font-bold text-pine-600 num">
                  {formatCurrency(simulation.realBurden5Y, baseCurrency, numberFormat, false)}{' '}
                  <span className="text-[10px] text-ink/50">({Math.round((1 - simulation.realBurden5Y / baselineStats.totalMonthlyEmi) * 100)}% lighter)</span>
                </span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-moss/50 border border-line">
                <span className="text-ink/70">Real Value in Year 10:</span>
                <span className="font-bold text-pine-600 num">
                  {formatCurrency(simulation.realBurden10Y, baseCurrency, numberFormat, false)}{' '}
                  <span className="text-[10px] text-ink/50">({Math.round((1 - simulation.realBurden10Y / baselineStats.totalMonthlyEmi) * 100)}% lighter)</span>
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
