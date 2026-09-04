import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { formatCurrency, formatCompactCurrency, formatPercent } from '../../utils/formatters';
import type { Liability, NumberFormatType, CurrencyCode } from '../../types';
import {
  Calendar,
  Clock,
  TrendingDown,
  Sparkles,
  Zap,
  Download,
  Percent,
  Landmark,
  Layers,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';

interface AmortizationScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  liability: Liability;
  baseCurrency: CurrencyCode;
  numberFormat: NumberFormatType;
}

export interface AmortizationMonth {
  monthIndex: number;
  dateStr: string;
  openingBalance: number;
  emiPaid: number;
  principalPaid: number;
  interestPaid: number;
  extraPrepayment: number;
  closingBalance: number;
}

export const AmortizationScheduleModal: React.FC<AmortizationScheduleModalProps> = ({
  isOpen,
  onClose,
  liability,
  baseCurrency,
  numberFormat,
}) => {
  const [extraMonthly, setExtraMonthly] = useState<number>(0);
  const [lumpSumPrepayment, setLumpSumPrepayment] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');
  const [simRate, setSimRate] = useState<number>(liability.interestRate || 8.5);

  useEffect(() => {
    setSimRate(liability.interestRate || 8.5);
    setExtraMonthly(0);
    setLumpSumPrepayment(0);
  }, [liability.id, liability.interestRate]);

  const principal = liability.outstandingBalance > 0 ? liability.outstandingBalance : liability.principalAmount;
  const apr = simRate;
  const monthlyRate = apr / 100 / 12;

  // Compute baseline tenure in months
  const baselineMonths = useMemo(() => {
    if (liability.tenureRemainingMonths && liability.tenureRemainingMonths > 0) {
      return liability.tenureRemainingMonths;
    }
    const minInterestEmi = principal * monthlyRate;
    if (liability.emiAmount && liability.emiAmount > minInterestEmi + 10) {
      // n = -log(1 - (P * r / EMI)) / log(1 + r)
      const n = -Math.log(1 - (principal * monthlyRate) / liability.emiAmount) / Math.log(1 + monthlyRate);
      if (isFinite(n) && !isNaN(n) && n > 0) {
        return Math.min(360, Math.max(1, Math.round(n)));
      }
    }
    return 180; // 15 years default
  }, [liability.tenureRemainingMonths, liability.emiAmount, principal, monthlyRate]);

  // Standard Reducing Balance EMI
  const standardEmi = useMemo(() => {
    const minInterestEmi = principal * monthlyRate;
    if (liability.emiAmount && liability.emiAmount > minInterestEmi) {
      return liability.emiAmount;
    }
    if (monthlyRate === 0) return principal / baselineMonths;
    return (principal * monthlyRate * Math.pow(1 + monthlyRate, baselineMonths)) / (Math.pow(1 + monthlyRate, baselineMonths) - 1);
  }, [liability.emiAmount, principal, monthlyRate, baselineMonths]);

  // Generate Month-by-Month Amortization Schedule
  const { schedule, totalInterestPaid, totalPrincipalPaid, acceleratedMonths, interestSaved } = useMemo(() => {
    const rows: AmortizationMonth[] = [];
    let currentBalance = principal;
    let monthCount = 0;
    let baselineTotalInterest = 0;

    // Baseline calculation without prepayments
    let tempBal = principal;
    for (let m = 0; m < baselineMonths && tempBal > 0.01; m++) {
      const int = tempBal * monthlyRate;
      baselineTotalInterest += int;
      const prin = Math.min(tempBal, Math.max(0, standardEmi - int));
      tempBal -= prin;
    }

    // Accelerated schedule with extra monthly and lump-sum
    const startDate = liability.nextDueDate ? new Date(liability.nextDueDate) : new Date();

    while (currentBalance > 0.5 && monthCount < 360) {
      monthCount++;
      const opening = currentBalance;
      const interest = currentBalance * monthlyRate;

      // Base EMI payment
      let prinFromEmi = Math.min(currentBalance, Math.max(0, standardEmi - interest));
      let extra = extraMonthly;
      if (monthCount === 1 && lumpSumPrepayment > 0) {
        extra += lumpSumPrepayment;
      }

      // Cap extra to remaining balance
      extra = Math.min(Math.max(0, currentBalance - prinFromEmi), extra);
      const totalPrincipalThisMonth = prinFromEmi + extra;
      currentBalance = Math.max(0, currentBalance - totalPrincipalThisMonth);

      const d = new Date(startDate);
      d.setMonth(d.getMonth() + (monthCount - 1));
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      rows.push({
        monthIndex: monthCount,
        dateStr,
        openingBalance: opening,
        emiPaid: prinFromEmi + interest,
        principalPaid: totalPrincipalThisMonth,
        interestPaid: interest,
        extraPrepayment: extra,
        closingBalance: currentBalance,
      });
    }

    const totalInt = rows.reduce((s, r) => s + r.interestPaid, 0);
    const totalPrin = rows.reduce((s, r) => s + r.principalPaid, 0);
    const savedMonths = Math.max(0, baselineMonths - monthCount);
    const savedInt = Math.max(0, baselineTotalInterest - totalInt);

    return {
      schedule: rows,
      totalInterestPaid: totalInt,
      totalPrincipalPaid: totalPrin,
      acceleratedMonths: savedMonths,
      interestSaved: savedInt,
    };
  }, [principal, monthlyRate, standardEmi, extraMonthly, lumpSumPrepayment, baselineMonths, liability.nextDueDate]);

  // Group by Calendar Year for Yearly Breakdown
  const yearlySummary = useMemo(() => {
    const map = new Map<string, { year: string; principal: number; interest: number; endingBal: number }>();
    schedule.forEach((m) => {
      const year = m.dateStr.split(' ')[1] || 'Unknown';
      const existing = map.get(year) || { year, principal: 0, interest: 0, endingBal: m.closingBalance };
      existing.principal += m.principalPaid;
      existing.interest += m.interestPaid;
      existing.endingBal = m.closingBalance;
      map.set(year, existing);
    });
    return Array.from(map.values());
  }, [schedule]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Month #', 'Date', 'Opening Balance', 'EMI Paid', 'Principal Paid', 'Interest Paid', 'Extra Prepayment', 'Closing Balance'];
    const csvLines = [headers.join(',')];
    schedule.forEach((r) => {
      csvLines.push(
        [
          r.monthIndex,
          `"${r.dateStr}"`,
          r.openingBalance.toFixed(2),
          r.emiPaid.toFixed(2),
          r.principalPaid.toFixed(2),
          r.interestPaid.toFixed(2),
          r.extraPrepayment.toFixed(2),
          r.closingBalance.toFixed(2),
        ].join(',')
      );
    });
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${liability.name.replace(/[^a-z0-9]/gi, '_')}_Amortization_Schedule.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isFloating = liability.interestType === 'floating';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/60 grid place-items-center text-amber-600 shrink-0">
            <Landmark className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display font-bold text-base text-ink truncate">
                {liability.name}
              </span>
              {isFloating ? (
                <Badge tone="sky" size="xs">
                  Floating: {liability.benchmarkName || 'Repo Rate'} ({liability.benchmarkRate || 6.5}%) + {liability.spread || 2.05}%
                </Badge>
              ) : (
                <Badge tone="pine" size="xs">
                  Fixed {apr}% p.a.
                </Badge>
              )}
            </div>
            <p className="text-[11.5px] text-ink/50 mt-0.5">
              Reducing balance amortization schedule, tenure curves & prepayment accelerator
            </p>
          </div>
        </div>
      }
      maxWidth="3xl"
    >
      <div className="space-y-5">
        {/* KPI Metrics Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-card border border-line shadow-xs">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink/50 block truncate">
              Outstanding Debt
            </span>
            <span className="font-display font-extrabold text-base sm:text-lg text-ink font-mono mt-1 block">
              {formatCurrency(principal, baseCurrency, numberFormat)}
            </span>
            <span className="text-[10px] text-ink/40 block mt-0.5">Principal to clear</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-card border border-line shadow-xs">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink/50 block truncate">
              Monthly EMI
            </span>
            <span className="font-display font-extrabold text-base sm:text-lg text-ink font-mono mt-1 block">
              {formatCurrency(standardEmi, baseCurrency, numberFormat)}
            </span>
            <span className="text-[10px] text-ink/40 block mt-0.5">
              At {apr.toFixed(2)}% annual APR
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-card border border-line shadow-xs">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink/50 block truncate">
              Total Interest
            </span>
            <span className="font-display font-extrabold text-base sm:text-lg text-flare-600 font-mono mt-1 block">
              {formatCurrency(totalInterestPaid, baseCurrency, numberFormat)}
            </span>
            <span className="text-[10px] text-ink/40 block mt-0.5">
              Cost of borrowing
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-card border border-line shadow-xs">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink/50 block truncate">
              Total Payoff Cost
            </span>
            <span className="font-display font-extrabold text-base sm:text-lg text-ink font-mono mt-1 block">
              {formatCurrency(totalPrincipalPaid + totalInterestPaid, baseCurrency, numberFormat)}
            </span>
            <span className="text-[10px] text-ink/40 block mt-0.5">
              Principal + Interest
            </span>
          </div>
        </div>

        {/* Rate Adjustment / Sensitivity Testing */}
        <div className="p-3 rounded-xl bg-card border border-line flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-pine-600 shrink-0" />
            <span className="font-semibold text-ink">
              Simulated APR: <span className="font-mono font-bold text-pine-600">{simRate.toFixed(2)}% p.a.</span>
            </span>
            {simRate !== (liability.interestRate || 8.5) && (
              <button
                type="button"
                onClick={() => setSimRate(liability.interestRate || 8.5)}
                className="text-[10.5px] text-ink/50 hover:text-ink flex items-center gap-1 cursor-pointer underline ml-1"
                title="Reset to actual loan interest rate"
              >
                <RotateCcw className="w-3 h-3" />
                Reset ({liability.interestRate || 8.5}%)
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <span className="text-[10px] text-ink/40">4%</span>
            <input
              type="range"
              min={4}
              max={24}
              step={0.1}
              value={simRate}
              onChange={(e) => setSimRate(Number(e.target.value))}
              className="w-full accent-pine-600 cursor-pointer"
            />
            <span className="text-[10px] text-ink/40">24%</span>
          </div>
        </div>

        {/* Prepayment Acceleration Simulator Card */}
        <div className="p-4 rounded-2xl bg-pine-50/70 dark:bg-pine-950/30 border border-pine-200/70 dark:border-pine-800/60 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs uppercase font-bold tracking-wider text-pine-900 dark:text-pine-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-pine-600" />
              Prepayment & Early Payoff Accelerator
            </span>
            {acceleratedMonths > 0 && (
              <Badge tone="pine">
                Debt-Free {(acceleratedMonths / 12).toFixed(1)} Years Sooner!
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <div className="flex justify-between text-xs font-semibold text-ink mb-1">
                <span>Extra Monthly Prepayment</span>
                <span className="font-mono font-bold text-pine-700 dark:text-pine-400">
                  +{formatCurrency(extraMonthly, baseCurrency, numberFormat)}/mo
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(50000, Math.round(standardEmi * 1.5))}
                step={500}
                value={extraMonthly}
                onChange={(e) => setExtraMonthly(Number(e.target.value))}
                className="w-full accent-pine-600 cursor-pointer"
              />
              <span className="text-[10.5px] text-ink/50 block mt-0.5">
                Goes directly towards reducing loan principal
              </span>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-ink mb-1">
                <span>One-Time Lump-Sum Prepayment</span>
                <span className="font-mono font-bold text-pine-700 dark:text-pine-400">
                  {formatCurrency(lumpSumPrepayment, baseCurrency, numberFormat)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={Math.min(principal, 500000)}
                step={5000}
                value={lumpSumPrepayment}
                onChange={(e) => setLumpSumPrepayment(Number(e.target.value))}
                className="w-full accent-pine-600 cursor-pointer"
              />
              <span className="text-[10.5px] text-ink/50 block mt-0.5">
                Immediate principal reduction in Month 1
              </span>
            </div>
          </div>

          {(extraMonthly > 0 || lumpSumPrepayment > 0) && (
            <div className="p-3 rounded-xl bg-card border border-pine-300 dark:border-pine-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="font-semibold text-ink">
                  Total Interest Saved: <b className="text-pine-600">{formatCurrency(interestSaved, baseCurrency, numberFormat)}</b>
                </span>
              </div>
              <span className="text-[11px] text-ink/60 font-medium">
                New Tenure: <b className="text-ink">{schedule.length} months</b> (was {baselineMonths} months)
              </span>
            </div>
          )}
        </div>

        {/* View Mode & Export Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1 p-1 bg-moss/80 rounded-xl border border-line text-xs">
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                viewMode === 'monthly'
                  ? 'bg-card text-ink font-bold shadow-xs border border-line'
                  : 'text-ink/60 hover:text-ink'
              }`}
            >
              Month-by-Month Schedule
            </button>
            <button
              onClick={() => setViewMode('yearly')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                viewMode === 'yearly'
                  ? 'bg-card text-ink font-bold shadow-xs border border-line'
                  : 'text-ink/60 hover:text-ink'
              }`}
            >
              Yearly Summary
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={handleExportCSV} className="text-xs">
            <Download className="w-3.5 h-3.5 mr-1" />
            <span>Export CSV</span>
          </Button>
        </div>

        {/* Schedule Table */}
        <div className="rounded-2xl border border-line overflow-hidden shadow-xs bg-card">
          <div className="max-h-72 overflow-y-auto custom-scrollbar">
            {viewMode === 'monthly' ? (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-moss/90 border-b border-line text-[10px] font-bold text-ink/50 uppercase tracking-wider sticky top-0 backdrop-blur-xs">
                    <th className="py-2.5 px-3">Month</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Beginning Bal</th>
                    <th className="py-2.5 px-3 text-right">EMI Paid</th>
                    <th className="py-2.5 px-3 text-right">Principal</th>
                    <th className="py-2.5 px-3 text-right">Interest</th>
                    <th className="py-2.5 px-3 text-right">Ending Bal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60 font-mono text-[11px] text-ink">
                  {schedule.map((r) => (
                    <tr key={r.monthIndex} className="hover:bg-moss/40 transition-colors">
                      <td className="py-2 px-3 text-ink/50 font-sans">#{r.monthIndex}</td>
                      <td className="py-2 px-3 text-ink/70 font-sans whitespace-nowrap">{r.dateStr}</td>
                      <td className="py-2 px-3 text-right text-ink/80">
                        {formatCurrency(r.openingBalance, baseCurrency, numberFormat)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-ink">
                        {formatCurrency(r.emiPaid, baseCurrency, numberFormat)}
                      </td>
                      <td className="py-2 px-3 text-right text-pine-600 font-bold">
                        {formatCurrency(r.principalPaid, baseCurrency, numberFormat)}
                      </td>
                      <td className="py-2 px-3 text-right text-flare-600">
                        {formatCurrency(r.interestPaid, baseCurrency, numberFormat)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-ink">
                        {formatCurrency(r.closingBalance, baseCurrency, numberFormat)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-moss/90 border-b border-line text-[10px] font-bold text-ink/50 uppercase tracking-wider sticky top-0 backdrop-blur-xs">
                    <th className="py-2.5 px-3">Year</th>
                    <th className="py-2.5 px-3 text-right">Principal Cleared</th>
                    <th className="py-2.5 px-3 text-right">Interest Paid</th>
                    <th className="py-2.5 px-3 text-right">Year-End Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60 font-mono text-xs text-ink">
                  {yearlySummary.map((y) => (
                    <tr key={y.year} className="hover:bg-moss/40 transition-colors">
                      <td className="py-2.5 px-3 font-sans font-bold text-ink">{y.year}</td>
                      <td className="py-2.5 px-3 text-right text-pine-600 font-bold">
                        {formatCurrency(y.principal, baseCurrency, numberFormat)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-flare-600 font-bold">
                        {formatCurrency(y.interest, baseCurrency, numberFormat)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-ink">
                        {formatCurrency(y.endingBal, baseCurrency, numberFormat)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
