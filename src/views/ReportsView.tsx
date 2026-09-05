import React, { useState, useMemo } from 'react';
import { useVault } from '../context/VaultContext';
import { usePrivacy } from '../context/PrivacyContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { AnimatedNumber } from '../components/common/AnimatedNumber';
import { formatCurrency, formatCompactCurrency, formatPercent } from '../utils/formatters';
import { formatReadableDate, getDateRangePresets, getPreviousPeriodRange } from '../utils/dates';
import { computeFinancialRatios } from '../services/ratios';
import { exportFinancialReportPDF, exportTransactionsToCSV } from '../services/export';
import { PdfExportModal } from '../components/reports/PdfExportModal';
import type { Category, Transaction } from '../types';
import {
  BarChart3,
  Download,
  Calendar,
  Activity,
  FileText,
  PieChart as PieIcon,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Scale,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  Zap,
  Compass,
  CheckCircle,
  XCircle,
  ArrowRight,
  Shield,
  ShieldAlert,
  Sparkles,
  Clock,
  AlertCircle,
  Receipt,
} from 'lucide-react';
import { PnLStatementSection } from '../components/reports/PnLStatementSection';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { computeFinancialInsights, type FinancialInsight } from '../services/insights';

export const ReportsView: React.FC = () => {
  const { activeVault, transactions, accounts, categories, peopleLedger, budgets, assets, liabilities, plannedExpenses } =
    useVault();
  const { isPrivacyMode } = usePrivacy();

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
      plannedExpenses: plannedExpenses || [],
      baseCurrency: activeVault?.currency || 'INR',
      numberFormat: activeVault?.numberFormat || 'indian',
      isPrivacyMode,
    });
  }, [accounts, transactions, budgets, categories, peopleLedger, assets, liabilities, plannedExpenses, activeVault, isPrivacyMode]);

  const [reportViewMode, setReportViewMode] = useState<'pnl' | 'dossier'>('pnl');
  const [timelinePreset, setTimelinePreset] = useState<string>('this-month');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<{ name: string; amount: number; pct: number } | null>(null);
  const [retroPeriod, setRetroPeriod] = useState<'prev-month' | 'prev-quarter' | 'prev-year'>('prev-month');

  const baseCurrency = activeVault?.currency || 'INR';
  const numberFormat = activeVault?.numberFormat || 'indian';

  const presets = useMemo(() => getDateRangePresets(activeVault?.fyStartMonth || 4), [activeVault]);

  // Selected Primary Range
  const selectedRange = useMemo(() => {
    if (timelinePreset === 'custom' && customStart && customEnd) {
      return {
        start: customStart,
        end: customEnd,
        label: `${formatReadableDate(customStart)} – ${formatReadableDate(customEnd)}`,
      };
    }
    return presets[timelinePreset] || presets['this-month'];
  }, [timelinePreset, customStart, customEnd, presets]);

  // Previous equivalent range for comparison
  const priorRange = useMemo(() => {
    return getPreviousPeriodRange(selectedRange.start, selectedRange.end);
  }, [selectedRange]);

  // Filter Transactions in Current & Prior Periods
  const currentPeriodTxs = useMemo(() => {
    return transactions.filter((t: Transaction) => t.date >= selectedRange.start && t.date <= selectedRange.end);
  }, [transactions, selectedRange]);

  const priorPeriodTxs = useMemo(() => {
    return transactions.filter((t: Transaction) => t.date >= priorRange.start && t.date <= priorRange.end);
  }, [transactions, priorRange]);

  // Current Summary Metrics (Pure P&L vs Capital Movements)
  const currentSummary = useMemo(() => {
    let operatingIncome = 0;
    let grossInflow = 0;
    let operatingExpense = 0;
    let grossOutflow = 0;
    let realizedCapitalGains = 0;
    let investedCapital = 0;
    let assetRedemptions = 0;

    const catMap = new Map<string, Category>(categories.map((c) => [c.id, c]));

    currentPeriodTxs.forEach((t: Transaction) => {
      const isAssetSale =
        t.subType === 'asset_sale' ||
        (Boolean(t.linkedAssetId) && t.type === 'income') ||
        Boolean(t.tags && t.tags.includes('asset-sale'));

      const isInvestment =
        t.subType === 'investment' ||
        (Boolean(t.linkedAssetId) && t.type === 'expense') ||
        Boolean(t.tags && t.tags.includes('investment'));

      const isLoanInflow =
        t.subType === 'loan_received' ||
        (Boolean(t.linkedLiabilityId) && t.type === 'income') ||
        Boolean(t.tags && t.tags.includes('loan-disbursement'));

      const isDebtPaydown =
        t.subType === 'debt_payment' ||
        (Boolean(t.linkedLiabilityId) && t.type === 'expense');

      if (t.type === 'income') {
        grossInflow += t.amount;
        if (isAssetSale) {
          assetRedemptions += t.amount;
          if (t.realizedGain !== undefined) {
            realizedCapitalGains += t.realizedGain;
          }
        } else if (!isLoanInflow) {
          // Pure operational income (Salary, Business, Freelance, Dividends, etc.)
          operatingIncome += t.amount;
        }
      } else if (t.type === 'expense') {
        grossOutflow += t.amount;
        if (isInvestment) {
          investedCapital += t.amount;
        } else if (!isDebtPaydown) {
          const cat = t.categoryId ? catMap.get(t.categoryId) : undefined;
          const isCatInvest = cat && (cat.name.toLowerCase().includes('invest') || cat.name.toLowerCase().includes('sip'));
          if (isCatInvest) {
            investedCapital += t.amount;
          } else {
            operatingExpense += t.amount;
          }
        }
      }
    });

    const totalEconomicIncome = operatingIncome + Math.max(0, realizedCapitalGains);
    const netSavings = totalEconomicIncome - operatingExpense;
    const savingsRate = totalEconomicIncome > 0 ? (netSavings / totalEconomicIncome) * 100 : 0;

    const totalAssets =
      assets.reduce((sum, a) => sum + a.currentValue, 0) +
      accounts.filter((a) => a.isVisibleOnDashboard !== false).reduce((sum, a) => sum + a.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, l) => sum + l.outstandingBalance, 0);

    return {
      totalIncome: totalEconomicIncome,
      pureOperatingIncome: operatingIncome,
      realizedCapitalGains,
      grossInflow,
      totalExpense: operatingExpense,
      grossOutflow,
      investedCapital,
      assetRedemptions,
      netSavings,
      savingsRate,
      netWorth: totalAssets - totalLiabilities,
    };
  }, [currentPeriodTxs, assets, accounts, liabilities, categories]);

  // Prior Summary Metrics
  const priorSummary = useMemo(() => {
    let operatingIncome = 0;
    let operatingExpense = 0;
    let realizedCapitalGains = 0;

    const catMap = new Map<string, Category>(categories.map((c) => [c.id, c]));

    priorPeriodTxs.forEach((t: Transaction) => {
      const isAssetSale =
        t.subType === 'asset_sale' ||
        (Boolean(t.linkedAssetId) && t.type === 'income') ||
        Boolean(t.tags && t.tags.includes('asset-sale'));

      const isInvestment =
        t.subType === 'investment' ||
        (Boolean(t.linkedAssetId) && t.type === 'expense') ||
        Boolean(t.tags && t.tags.includes('investment'));

      const isLoanInflow =
        t.subType === 'loan_received' ||
        (Boolean(t.linkedLiabilityId) && t.type === 'income') ||
        Boolean(t.tags && t.tags.includes('loan-disbursement'));

      const isDebtPaydown =
        t.subType === 'debt_payment' ||
        (Boolean(t.linkedLiabilityId) && t.type === 'expense');

      if (t.type === 'income') {
        if (isAssetSale) {
          if (t.realizedGain !== undefined) realizedCapitalGains += t.realizedGain;
        } else if (!isLoanInflow) {
          operatingIncome += t.amount;
        }
      } else if (t.type === 'expense') {
        if (!isInvestment && !isDebtPaydown) {
          const cat = t.categoryId ? catMap.get(t.categoryId) : undefined;
          const isCatInvest = cat && (cat.name.toLowerCase().includes('invest') || cat.name.toLowerCase().includes('sip'));
          if (!isCatInvest) {
            operatingExpense += t.amount;
          }
        }
      }
    });

    const totalEconomicIncome = operatingIncome + Math.max(0, realizedCapitalGains);
    const netSavings = totalEconomicIncome - operatingExpense;
    const savingsRate = totalEconomicIncome > 0 ? (netSavings / totalEconomicIncome) * 100 : 0;

    return {
      totalIncome: totalEconomicIncome,
      totalExpense: operatingExpense,
      netSavings,
      savingsRate,
    };
  }, [priorPeriodTxs, categories]);

  // Full 16-Ratio Engine for selected period
  const ratios = useMemo(
    () =>
      computeFinancialRatios({
        accounts,
        transactions,
        categories,
        peopleLedger,
        budgets,
        assets,
        liabilities,
        startDate: selectedRange.start,
        endDate: selectedRange.end,
      }),
    [accounts, transactions, categories, peopleLedger, budgets, assets, liabilities, selectedRange]
  );

  // Category Breakdown Data
  const categoryBreakdown = useMemo(() => {
    const catMap = new Map<string, Category>(categories.map((c) => [c.id, c]));
    const spendMap = new Map<string, { id: string; name: string; amount: number; color: string; isEssential: boolean }>();

    currentPeriodTxs
      .filter((t: Transaction) => t.type === 'expense')
      .forEach((t: Transaction) => {
        const cat = t.categoryId ? catMap.get(t.categoryId) : undefined;
        const name = cat?.name || 'Uncategorized';
        const color = cat?.color || '#12855a';
        const isEssential = cat?.isEssential ?? false;
        const id = cat?.id || 'uncat';

        const existing = spendMap.get(name) || { id, name, amount: 0, color, isEssential };
        spendMap.set(name, { ...existing, amount: existing.amount + t.amount });
      });

    return Array.from(spendMap.values()).sort((a, b) => b.amount - a.amount);
  }, [currentPeriodTxs, categories]);

  // PDF Export
  const handleExportPDF = () => {
    if (!activeVault) return;
    exportFinancialReportPDF({
      vault: activeVault,
      periodLabel: selectedRange.label,
      transactions: currentPeriodTxs,
      accounts,
      categories,
      peopleLedger,
      assets,
      liabilities,
      summary: currentSummary,
    });
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!activeVault) return;
    exportTransactionsToCSV(currentPeriodTxs, categories, accounts, activeVault);
  };

  // Delta Calculator Helper
  const calcDelta = (current: number, prior: number) => {
    const diff = current - prior;
    const pct = prior !== 0 ? (diff / Math.abs(prior)) * 100 : 0;
    return { diff, pct };
  };

  // 6-Month Historical Horizon Data
  const multiMonthData = useMemo(() => {
    const months: Array<{ month: string; Income: number; Expense: number; Savings: number; rate: number }> = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const monthLabel = d.toLocaleDateString(undefined, { month: 'short' });

      const start = new Date(year, month, 1).toISOString().split('T')[0];
      const end = new Date(year, month + 1, 0).toISOString().split('T')[0];

      let inc = 0;
      let exp = 0;
      transactions.forEach((t) => {
        if (t.date >= start && t.date <= end) {
          if (t.type === 'income') inc += t.amount;
          if (t.type === 'expense') exp += t.amount;
        }
      });

      const sav = inc - exp;
      const rate = inc > 0 ? Math.round((sav / inc) * 100) : 0;

      months.push({
        month: monthLabel,
        Income: inc,
        Expense: exp,
        Savings: sav,
        rate,
      });
    }

    return months;
  }, [transactions]);

  // Health indicator helper for ratio cards
  const getRatioMeta = (key: string) => {
    switch (key) {
      case 'savingsRate':
        if (ratios.savingsRate >= 30) return { tone: 'pine' as const, label: 'Optimal' };
        if (ratios.savingsRate >= 15) return { tone: 'mari' as const, label: 'Acceptable' };
        return { tone: 'flare' as const, label: 'Needs Boost' };
      case 'expenseToIncome':
        if (ratios.expenseToIncomeRatio <= 0.7) return { tone: 'pine' as const, label: 'Controlled' };
        if (ratios.expenseToIncomeRatio <= 0.85) return { tone: 'mari' as const, label: 'Elevated' };
        return { tone: 'flare' as const, label: 'Deficit Risk' };
      case 'debtToIncome':
        if (ratios.debtToIncomeRatio === 0) return { tone: 'pine' as const, label: 'Debt-Free ✨' };
        if (ratios.debtToIncomeRatio <= 0.3) return { tone: 'pine' as const, label: 'Safe Zone' };
        if (ratios.debtToIncomeRatio <= 0.45) return { tone: 'mari' as const, label: 'Moderate' };
        return { tone: 'flare' as const, label: 'High Debt' };
      case 'essentialSpend':
        if (ratios.essentialSpendRatio <= 50) return { tone: 'pine' as const, label: 'Balanced' };
        if (ratios.essentialSpendRatio <= 70) return { tone: 'mari' as const, label: 'Standard' };
        return { tone: 'flare' as const, label: 'High Fixed' };
      case 'liquidRunway':
        if (ratios.runwayMonths >= 999) return { tone: 'pine' as const, label: 'Self-Sustaining' };
        if (ratios.runwayMonths >= 6) return { tone: 'pine' as const, label: 'Resilient' };
        if (ratios.runwayMonths >= 3) return { tone: 'mari' as const, label: 'Moderate' };
        return { tone: 'flare' as const, label: 'Low Buffer' };
      case 'emergencyBuffer':
        if (ratios.emergencyFundCoverageMonths >= 999) return { tone: 'pine' as const, label: 'Fully Funded ✨' };
        if (ratios.emergencyFundCoverageMonths >= 6) return { tone: 'pine' as const, label: 'Resilient' };
        if (ratios.emergencyFundCoverageMonths >= 3) return { tone: 'mari' as const, label: 'Moderate' };
        return { tone: 'flare' as const, label: 'Low Buffer' };
      case 'investmentRate':
        if (ratios.investmentRate >= 20) return { tone: 'pine' as const, label: 'Aggressive' };
        if (ratios.investmentRate >= 10) return { tone: 'mari' as const, label: 'Active' };
        return { tone: 'flare' as const, label: 'Dormant' };
      case 'liquidityRatio':
        if (ratios.liquidityRatio === -1) return { tone: 'pine' as const, label: 'Debt-Free' };
        if (ratios.liquidityRatio >= 2) return { tone: 'pine' as const, label: 'Solvent' };
        if (ratios.liquidityRatio >= 1) return { tone: 'mari' as const, label: 'Tight' };
        return { tone: 'flare' as const, label: 'Illiquid' };
      case 'peopleNet':
        return ratios.peopleNetPosition >= 0
          ? { tone: 'pine' as const, label: 'Receivable' }
          : { tone: 'flare' as const, label: 'Net Payable' };
      case 'recurringSpend':
        if (ratios.recurringExpenseRatio <= 30) return { tone: 'pine' as const, label: 'Flexible' };
        if (ratios.recurringExpenseRatio <= 45) return { tone: 'mari' as const, label: 'Moderate' };
        return { tone: 'flare' as const, label: 'Sticky Costs' };
      case 'assetCoverage':
        if (ratios.assetToDebtRatio === -1) return { tone: 'pine' as const, label: 'Debt-Free (∞)' };
        if (ratios.assetToDebtRatio >= 3) return { tone: 'pine' as const, label: 'Super-Solvent' };
        if (ratios.assetToDebtRatio >= 1.5) return { tone: 'mari' as const, label: 'Covered' };
        return { tone: 'flare' as const, label: 'Leveraged' };
      case 'discretionary':
        if (ratios.discretionarySpendRatio <= 30) return { tone: 'pine' as const, label: 'Disciplined' };
        if (ratios.discretionarySpendRatio <= 45) return { tone: 'mari' as const, label: 'Lifestyle' };
        return { tone: 'flare' as const, label: 'Heavy Wants' };
      case 'netWorth':
        return currentSummary.netWorth >= 0
          ? { tone: 'pine' as const, label: 'Positive' }
          : { tone: 'flare' as const, label: 'Negative' };
      default:
        return { tone: 'gray' as const, label: 'Velocity' };
    }
  };

  // Cashflow Forecast & Net Burn Radar Calculations
  const cashflowStats = useMemo(() => {
    const liquidCash = accounts
      .filter((a) => a.isVisibleOnDashboard !== false && (a.type === 'bank' || a.type === 'wallet' || a.type === 'cash' || a.type === 'upi'))
      .reduce((s, a) => s + a.balance, 0);

    const monthlyEMIs = liabilities.reduce((s, l) => s + (l.emiAmount || 0), 0);
    const daysInPeriod = Math.max(
      1,
      Math.round((new Date(selectedRange.end).getTime() - new Date(selectedRange.start).getTime()) / 86400000)
    );
    const dailyOutflow = currentSummary.totalExpense / daysInPeriod;
    const monthlyGrossOutlay = dailyOutflow * 30 + monthlyEMIs;
    const monthlyIncome = (currentSummary.totalIncome / daysInPeriod) * 30;
    const isCashflowPositive = monthlyIncome >= monthlyGrossOutlay;
    const netSurplusMonthly = monthlyIncome - monthlyGrossOutlay;
    const monthlyNetBurn = Math.max(0, monthlyGrossOutlay - monthlyIncome);

    const runwayMonths = isCashflowPositive
      ? 999
      : monthlyNetBurn > 0
      ? liquidCash / monthlyNetBurn
      : 999;

    const proj30 = liquidCash + (isCashflowPositive ? netSurplusMonthly : -monthlyNetBurn);
    const proj60 = liquidCash + (isCashflowPositive ? netSurplusMonthly * 2 : -monthlyNetBurn * 2);
    const proj90 = liquidCash + (isCashflowPositive ? netSurplusMonthly * 3 : -monthlyNetBurn * 3);

    let radarTone: 'pine' | 'mari' | 'flare' = 'pine';
    let radarStatus = isCashflowPositive
      ? 'Cashflow Positive ✨ (Self-Sustaining)'
      : 'Resilient Buffer';

    if (!isCashflowPositive) {
      if (runwayMonths < 3) {
        radarTone = 'flare';
        radarStatus = 'Critical Runway Alert';
      } else if (runwayMonths < 6) {
        radarTone = 'mari';
        radarStatus = 'Moderate Runway';
      }
    }

    return {
      liquidCash,
      monthlyEMIs,
      dailyBurn: dailyOutflow,
      monthlyBurn: monthlyGrossOutlay,
      netBurn: monthlyNetBurn,
      isCashflowPositive,
      netSurplusMonthly,
      runwayMonths,
      proj30,
      proj60,
      proj90,
      radarTone,
      radarStatus,
    };
  }, [accounts, liabilities, selectedRange, currentSummary]);

  // Section 8: Deep Retrospective Diagnostics & Audit Calculations
  const retroData = useMemo(() => {
    const now = new Date();
    let rStart = '';
    let rEnd = '';
    let label = '';

    if (retroPeriod === 'prev-month') {
      const prevM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      rStart = prevM.toISOString().split('T')[0];
      rEnd = prevMEnd.toISOString().split('T')[0];
      label = prevM.toLocaleString('default', { month: 'long', year: 'numeric' });
    } else if (retroPeriod === 'prev-quarter') {
      const qEndMonth = Math.floor(now.getMonth() / 3) * 3;
      const qStartMonth = Math.max(0, qEndMonth - 3);
      const qStart = new Date(now.getFullYear(), qStartMonth, 1);
      const qEnd = new Date(now.getFullYear(), qEndMonth, 0);
      rStart = qStart.toISOString().split('T')[0];
      rEnd = qEnd.toISOString().split('T')[0];
      label = `Q${Math.floor(qStartMonth / 3) + 1} ${qStart.getFullYear()}`;
    } else {
      const lastYr = now.getFullYear() - 1;
      rStart = `${lastYr}-01-01`;
      rEnd = `${lastYr}-12-31`;
      label = `Full Year ${lastYr}`;
    }

    const txs = transactions.filter((t) => t.date >= rStart && t.date <= rEnd);
    let inc = 0;
    let exp = 0;
    const catMap = new Map<string, number>();

    txs.forEach((t) => {
      if (t.type === 'income') inc += t.amount;
      if (t.type === 'expense') {
        exp += t.amount;
        if (t.categoryId) {
          catMap.set(t.categoryId, (catMap.get(t.categoryId) || 0) + t.amount);
        }
      }
    });

    const netSav = inc - exp;
    const savRate = inc > 0 ? (netSav / inc) * 100 : 0;

    // Filter out Investments & SIP from expense leakages!
    const sortedCats = Array.from(catMap.entries())
      .filter(([cid]) => {
        const c = categories.find((cat) => cat.id === cid);
        if (c && (c.name.toLowerCase().includes('invest') || c.name.toLowerCase().includes('sip'))) return false;
        return true;
      })
      .sort((a, b) => b[1] - a[1])
      .map(([cid, amt]) => ({
        name: categories.find((c) => c.id === cid)?.name || 'Category',
        amount: amt,
        share: exp > 0 ? (amt / exp) * 100 : 0,
      }));

    const rights: string[] = [];
    if (savRate >= 20) {
      rights.push(`Robust savings rate of ${savRate.toFixed(1)}% achieved (comfortably above the 20% benchmark).`);
    } else if (netSav > 0) {
      rights.push(`Maintained net surplus of ${formatCompactCurrency(netSav, baseCurrency, numberFormat, isPrivacyMode)}.`);
    } else {
      rights.push('Income maintained steady cash generation across accounts.');
    }

    const totalAssetsVal = assets.reduce((s, a) => s + a.currentValue, 0);
    if (totalAssetsVal > 0) {
      rights.push(`Solid physical asset base of ${formatCompactCurrency(totalAssetsVal, baseCurrency, numberFormat, isPrivacyMode)} anchoring net worth.`);
    }

    const totalLiabs = liabilities.reduce((s, l) => s + l.outstandingBalance, 0);
    if (totalLiabs === 0) {
      rights.push('100% Debt-free financial architecture with zero loan servicing drag.');
    } else {
      rights.push('Active debt servicing maintained without reported defaults or missed EMIs.');
    }

    const wrongs: string[] = [];
    if (sortedCats.length > 0 && sortedCats[0].share > 30) {
      wrongs.push(`Heavy budget concentration: "${sortedCats[0].name}" consumed ${sortedCats[0].share.toFixed(1)}% (${formatCompactCurrency(sortedCats[0].amount, baseCurrency, numberFormat, isPrivacyMode)}) of total outlays.`);
    }
    if (savRate < 10 && inc > 0) {
      wrongs.push(`Sub-optimal savings rate of ${savRate.toFixed(1)}% (fell below safety threshold of 15%).`);
    }
    if (cashflowStats.runwayMonths < 4 && !cashflowStats.isCashflowPositive) {
      wrongs.push(`Compressed liquid runway of only ${cashflowStats.runwayMonths.toFixed(1)} months leaves vulnerability to cashflow shocks.`);
    }
    if (wrongs.length === 0) {
      wrongs.push('Occasional discretionary spikes on dining and weekend non-essentials.');
    }

    const prescriptions: string[] = [
      `Enforce a hard ceiling on "${sortedCats[0]?.name || 'Discretionary'}" spending to recapture ${formatCompactCurrency((sortedCats[0]?.amount || 5000) * 0.15, baseCurrency, numberFormat, false)} per month.`,
      cashflowStats.runwayMonths < 6 && !cashflowStats.isCashflowPositive
        ? 'Route next surplus income into liquid bank funds to attain the 6-month buffer threshold.'
        : 'Deploy surplus liquidity beyond 6-month runway into long-term diversified equity index SIPs.',
      totalLiabs > 0
        ? 'Utilize the Debt Payoff Simulator to allocate an extra 10% prepayment towards the highest-rate liability.'
        : 'Rebalance portfolio across sovereign gold bonds and liquid emergency reserves.',
    ];

    return {
      label,
      inc,
      exp,
      netSav,
      savRate,
      rights,
      wrongs,
      prescriptions,
      topLeak: sortedCats[0],
    };
  }, [retroPeriod, transactions, categories, assets, liabilities, currentSummary, baseCurrency, numberFormat, isPrivacyMode, cashflowStats]);

  // Ratios formatted for PDF export
  const computedRatiosArray = useMemo(() => {
    return [
      { name: '1. Savings Rate', value: `${ratios.savingsRate.toFixed(1)}%`, status: getRatioMeta('savingsRate').label, benchmark: '≥ 30%' },
      { name: '2. Expense-to-Income', value: `${(ratios.expenseToIncomeRatio * 100).toFixed(0)}%`, status: getRatioMeta('expenseToIncome').label, benchmark: '≤ 70%' },
      { name: '3. Debt-to-Income (DTI)', value: ratios.debtToIncomeRatio === 0 ? '0% (Debt-Free)' : `${(ratios.debtToIncomeRatio * 100).toFixed(0)}%`, status: getRatioMeta('debtToIncome').label, benchmark: '≤ 30%' },
      { name: '4. Essential Outflow %', value: `${ratios.essentialSpendRatio.toFixed(0)}%`, status: getRatioMeta('essentialSpend').label, benchmark: '≤ 50%' },
      { name: '5. Liquid Runway', value: ratios.runwayMonths >= 999 ? 'Self-Sustaining' : `${ratios.runwayMonths.toFixed(1)} mos`, status: getRatioMeta('liquidRunway').label, benchmark: '≥ 6 mos' },
      { name: '6. Investment Rate', value: `${ratios.investmentRate.toFixed(1)}%`, status: getRatioMeta('investmentRate').label, benchmark: '≥ 20%' },
      { name: '7. Liquidity Ratio', value: ratios.liquidityRatio === -1 ? 'Debt-Free' : `${ratios.liquidityRatio.toFixed(1)}x`, status: getRatioMeta('liquidityRatio').label, benchmark: '≥ 2.0x' },
      { name: '8. Asset Coverage', value: ratios.assetToDebtRatio === -1 ? 'Debt-Free (∞)' : `${ratios.assetToDebtRatio.toFixed(1)}x`, status: getRatioMeta('assetCoverage').label, benchmark: '≥ 3.0x' },
    ];
  }, [ratios]);

  return (
    <div className="space-y-7 w-full max-w-[1600px] mx-auto px-1 sm:px-2 pb-16 anim-fade">
      {/* Top Header & Export Action Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 grid place-items-center text-pine-600">
              <BarChart3 className="w-4 h-4" />
            </span>
            <h1 className="font-display font-extrabold text-[22px] sm:text-[24px] tracking-tight text-ink">
              Executive Financial Dossier
            </h1>
          </div>
          <p className="text-xs text-ink/50 mt-1">
            Panoramic review — cashflows, category intelligence, variance matrix & 16-ratio diagnostics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl border border-line bg-card hover:bg-moss active:scale-[0.97] text-xs font-semibold text-ink flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Download className="w-3.5 h-3.5 text-pine-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsPdfModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-pine-700 hover:bg-pine-600 active:scale-[0.97] text-white text-xs font-bold shadow-sm shadow-pine-900/20 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Top Report View Mode Switcher: P&L Statement vs Executive KPI Dossier */}
      <div className="flex items-center gap-2 p-1.5 bg-moss/80 dark:bg-moss/40 rounded-2xl border border-line w-fit">
        <button
          type="button"
          onClick={() => setReportViewMode('pnl')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            reportViewMode === 'pnl'
              ? 'bg-card text-ink shadow-xs border border-line text-pine-700 dark:text-pine-300'
              : 'text-ink/60 hover:text-ink'
          }`}
        >
          <Receipt className="w-4 h-4 text-pine-600" />
          <span>Profit & Loss (P&L) Statement</span>
          <Badge tone="pine" size="xs">ITR & Tax</Badge>
        </button>

        <button
          type="button"
          onClick={() => setReportViewMode('dossier')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            reportViewMode === 'dossier'
              ? 'bg-card text-ink shadow-xs border border-line text-pine-700 dark:text-pine-300'
              : 'text-ink/60 hover:text-ink'
          }`}
        >
          <Activity className="w-4 h-4 text-mari-600" />
          <span>Executive KPI Dossier & Health</span>
          <Badge tone="gray" size="xs">16 Ratios</Badge>
        </button>
      </div>

      {/* Timeline Selector Bar */}
      <div className="rounded-2xl border border-line bg-card p-3 sm:p-4 space-y-3 shadow-sm lift">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-moss/80 rounded-xl border border-line">
            {[
              { id: 'this-month', label: 'This Month' },
              { id: 'last-month', label: 'Last Month' },
              { id: 'this-quarter', label: 'This Quarter' },
              { id: 'this-fy', label: 'FY (Apr–Mar)' },
              { id: 'this-cy', label: 'Calendar Year' },
              { id: 'last-12-months', label: 'Last 12M' },
              { id: 'custom', label: 'Custom' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setTimelinePreset(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  timelinePreset === p.id
                    ? 'bg-card text-ink font-bold shadow-xs border border-line'
                    : 'text-ink/60 hover:text-ink'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-ink/60 font-medium px-2.5 py-1.5 rounded-xl bg-moss border border-line">
            <Calendar className="w-3.5 h-3.5 text-pine-600" />
            <span>Active: {selectedRange.label}</span>
          </div>
        </div>

        {/* Custom Range Inputs */}
        {timelinePreset === 'custom' && (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-line">
            <Input
              type="date"
              label="Start Date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
            />
            <Input
              type="date"
              label="End Date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* REPORT CONTENT: P&L Statement vs Executive KPI Dossier */}
      {reportViewMode === 'pnl' ? (
        <PnLStatementSection
          currentPeriodTxs={currentPeriodTxs}
          categories={categories}
          assets={assets}
          liabilities={liabilities}
          accounts={accounts}
          selectedRange={selectedRange}
          baseCurrency={baseCurrency}
          numberFormat={numberFormat}
          isPrivacyMode={isPrivacyMode}
          vaultName={activeVault?.name || 'KhataGHAR Vault'}
        />
      ) : (
        <>
          {/* FINANCIAL INTELLIGENCE & ACTIONABLE INSIGHTS HUB */}
          <section id="insights-hub" className="rounded-2xl border border-line bg-card p-4 sm:p-5 space-y-4 shadow-sm lift">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-mari-100 dark:bg-mari-950/60 border border-mari-400/40 grid place-items-center text-mari-700 dark:text-mari-300 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-extrabold text-base text-ink">
                  Financial Intelligence & Actionable Insights Hub
                </h2>
                <Badge tone={insights.some((i) => i.severity === 'critical') ? 'flare' : 'pine'} size="xs">
                  {insights.length} Insights Active
                </Badge>
              </div>
              <p className="text-xs text-ink/50 mt-0.5">
                Automated continuous audit across budgets, overdrafts, custodial claims, upcoming bills & debts
              </p>
            </div>
          </div>
        </div>

        {insights.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-line rounded-xl bg-moss/30">
            <CheckCircle className="w-8 h-8 text-pine-600 mx-auto mb-1.5" />
            <p className="text-xs font-bold text-ink">Zero Financial Red Flags</p>
            <p className="text-[11px] text-ink/50 mt-0.5">
              All accounts, budgets, and custodial settlements are operating in perfect health.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 shadow-xs hover:shadow-md ${
                  insight.severity === 'critical'
                    ? 'border-flare-500/40 bg-flare-50/40 dark:bg-flare-950/25'
                    : insight.severity === 'warning'
                    ? 'border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/25'
                    : insight.severity === 'positive'
                    ? 'border-pine-500/40 bg-pine-50/40 dark:bg-pine-950/25'
                    : 'border-line bg-moss/40'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {insight.severity === 'critical' && <AlertTriangle className="w-4 h-4 text-flare-600 shrink-0" />}
                      {insight.severity === 'warning' && <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />}
                      {insight.severity === 'positive' && <CheckCircle className="w-4 h-4 text-pine-600 shrink-0" />}
                      {insight.severity === 'info' && <Info className="w-4 h-4 text-sky-600 shrink-0" />}
                      <span className="font-display font-bold text-xs text-ink truncate">
                        {insight.title}
                      </span>
                    </div>
                    {insight.metric && (
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg bg-card border border-line text-ink shrink-0 shadow-2xs">
                        {insight.metric}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink/75 leading-relaxed">
                    {insight.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-line/60">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-ink/40">
                    Target: {insight.category}
                  </span>
                  <button
                    onClick={() => (window.location.hash = insight.targetRoute)}
                    className="px-3.5 py-1.5 rounded-xl bg-card hover:bg-moss border border-line text-xs font-bold text-pine-700 dark:text-pine-300 flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
                  >
                    <span>{insight.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-pine-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 1: Executive KPI Summary */}
      <div className="space-y-3">
        <h2 className="font-display font-bold text-xs uppercase tracking-wider text-ink/75 px-1">
          1. Executive KPI Summary
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="rounded-2xl border border-line bg-card p-4 sm:p-5 shadow-sm lift">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-pine-700 dark:text-pine-400">
                Total Inflow
              </span>
              <ArrowDownLeft className="w-4 h-4 text-pine-600" />
            </div>
            <div className="font-display font-extrabold text-[24px] num text-pine-700 dark:text-pine-400 mt-1">
              <AnimatedNumber
                value={currentSummary.totalIncome}
                currency={baseCurrency}
                numberFormat={numberFormat}
                isPrivacyMode={isPrivacyMode}
              />
            </div>
            <span className="text-[11px] text-ink/45 block mt-0.5">Deposits & Earnings</span>
          </div>

          <div className="rounded-2xl border border-line bg-card p-4 sm:p-5 shadow-sm lift">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-flare-600">
                Total Outflow
              </span>
              <ArrowUpRight className="w-4 h-4 text-flare-600" />
            </div>
            <div className="font-display font-extrabold text-[24px] num text-flare-600 mt-1">
              <AnimatedNumber
                value={currentSummary.totalExpense}
                currency={baseCurrency}
                numberFormat={numberFormat}
                isPrivacyMode={isPrivacyMode}
              />
            </div>
            <span className="text-[11px] text-ink/45 block mt-0.5">Bills, Needs & Discretionary</span>
          </div>

          <div className="rounded-2xl border border-line bg-card p-4 sm:p-5 shadow-sm lift">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink">
                Net Surplus
              </span>
              <TrendingUp className="w-4 h-4 text-pine-600" />
            </div>
            <div className="font-display font-extrabold text-[24px] num text-ink mt-1">
              <AnimatedNumber
                value={currentSummary.netSavings}
                currency={baseCurrency}
                numberFormat={numberFormat}
                isPrivacyMode={isPrivacyMode}
              />
            </div>
            <span className="text-[11px] text-ink/45 block mt-0.5">Retained Cashflow</span>
          </div>

          <div className="rounded-2xl border border-line bg-card p-4 sm:p-5 shadow-sm lift">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-mari-600">
                Savings Rate
              </span>
              <Activity className="w-4 h-4 text-mari-600" />
            </div>
            <div className="font-display font-extrabold text-[24px] num text-pine-700 dark:text-pine-400 mt-1">
              <AnimatedNumber
                value={currentSummary.savingsRate}
                isPercent
                isPrivacyMode={isPrivacyMode}
              />
            </div>
            <span className="text-[11px] text-ink/45 block mt-0.5">Benchmark Target: 30%+</span>
          </div>
        </div>
      </div>

      {/* SECTION 2: Multi-Month Cashflow Horizon & Trajectory */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-1">
          <h2 className="font-display font-bold text-xs uppercase tracking-wider text-ink/75">
            2. Multi-Month Cashflow Horizon & Savings Trajectory
          </h2>
          <span className="text-[11.5px] text-ink/50">
            6-Month Historical Flow (Income vs Outflow vs Net Margin Line)
          </span>
        </div>

        <div className="rounded-2xl border border-line bg-card p-5 sm:p-6 space-y-4 shadow-sm lift">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-line">
            <div>
              <h3 className="font-display font-bold text-sm text-ink">
                Gross Inflow vs Outflow Velocity
              </h3>
              <p className="text-xs text-ink/50 mt-0.5">
                Bars represent monthly gross cash movements; the gold spline depicts your net cash trajectory
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-pine-700 dark:text-pine-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-pine-600" />
                Gross Cash Inflow
              </span>
              <span className="flex items-center gap-1.5 text-flare-600">
                <span className="w-2.5 h-2.5 rounded-sm bg-flare-500" />
                Gross Cash Outflow
              </span>
              <span className="flex items-center gap-1.5 text-mari-600">
                <span className="w-3 h-0.5 bg-mari-500 rounded-full" />
                Net Cash Margin
              </span>
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={multiMonthData}
                margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
              >
                <XAxis
                  dataKey="month"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(150, 150, 150, 0.2)' }}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatCompactCurrency(v, baseCurrency, numberFormat, isPrivacyMode)}
                />
                <Tooltip
                  formatter={(val: any, name: any) => [
                    formatCurrency(Number(val), baseCurrency, numberFormat, isPrivacyMode),
                    name,
                  ]}
                  contentStyle={{
                    backgroundColor: '#161c18',
                    borderRadius: '14px',
                    border: '1px solid rgba(255,255,255,0.09)',
                    boxShadow: '0 12px 32px -4px rgba(0,0,0,0.6)',
                    fontSize: '12px',
                    color: '#F8FAFC',
                  }}
                />
                <Bar
                  dataKey="Income"
                  name="Gross Cash Inflow"
                  fill="#12855a"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
                <Bar
                  dataKey="Expense"
                  name="Gross Cash Outflow"
                  fill="#e05252"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
                <Line
                  type="monotone"
                  dataKey="Savings"
                  name="Net Cash Margin"
                  stroke="#d97706"
                  strokeWidth={2.5}
                  dot={{ fill: '#d97706', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SECTION 3: Cashflow Variance Matrix */}
      <div className="space-y-3">
        <h2 className="font-display font-bold text-xs uppercase tracking-wider text-ink/75 px-1">
          3. Cashflow Variance Matrix ({selectedRange.label} vs Prior Equivalent Period)
        </h2>

        <div className="rounded-2xl border border-line bg-card overflow-hidden shadow-sm lift">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-moss/70 border-b border-line text-ink/50 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Financial Dimension</th>
                  <th className="py-3 px-4 text-right">Current Period</th>
                  <th className="py-3 px-4 text-right">Prior Period</th>
                  <th className="py-3 px-4 text-right">Absolute Delta</th>
                  <th className="py-3 px-4 text-right">% Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {/* Total Income */}
                {(() => {
                  const delta = calcDelta(currentSummary.totalIncome, priorSummary.totalIncome);
                  return (
                    <tr className="hover:bg-moss/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-ink">
                        Total Income Inflow
                      </td>
                      <td className="py-3 px-4 text-right text-pine-700 dark:text-pine-400 font-bold tabular-nums num">
                        <AnimatedNumber
                          value={currentSummary.totalIncome}
                          currency={baseCurrency}
                          numberFormat={numberFormat}
                          isPrivacyMode={isPrivacyMode}
                        />
                      </td>
                      <td className="py-3 px-4 text-right text-ink/50 tabular-nums num">
                        <AnimatedNumber
                          value={priorSummary.totalIncome}
                          currency={baseCurrency}
                          numberFormat={numberFormat}
                          isPrivacyMode={isPrivacyMode}
                        />
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-ink tabular-nums num">
                        {delta.diff >= 0 ? '+' : ''}
                        {formatCurrency(delta.diff, baseCurrency, numberFormat, isPrivacyMode)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md text-[11px] ${delta.pct >= 0 ? 'bg-pine-50 dark:bg-pine-950/40 text-pine-700 dark:text-pine-400 border border-pine-200/60' : 'bg-flare-100/60 text-flare-600 border border-flare-500/20'}`}>
                          {delta.pct >= 0 ? '▲' : '▼'} {formatPercent(Math.abs(delta.pct))}
                        </span>
                      </td>
                    </tr>
                  );
                })()}

                {/* Total Expense */}
                {(() => {
                  const delta = calcDelta(currentSummary.totalExpense, priorSummary.totalExpense);
                  return (
                    <tr className="hover:bg-moss/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-ink">
                        Total Expense Outflow
                      </td>
                      <td className="py-3 px-4 text-right text-flare-600 font-bold tabular-nums num">
                        <AnimatedNumber
                          value={currentSummary.totalExpense}
                          currency={baseCurrency}
                          numberFormat={numberFormat}
                          isPrivacyMode={isPrivacyMode}
                        />
                      </td>
                      <td className="py-3 px-4 text-right text-ink/50 tabular-nums num">
                        <AnimatedNumber
                          value={priorSummary.totalExpense}
                          currency={baseCurrency}
                          numberFormat={numberFormat}
                          isPrivacyMode={isPrivacyMode}
                        />
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-ink tabular-nums num">
                        {delta.diff >= 0 ? '+' : ''}
                        {formatCurrency(delta.diff, baseCurrency, numberFormat, isPrivacyMode)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md text-[11px] ${delta.pct <= 0 ? 'bg-pine-50 dark:bg-pine-950/40 text-pine-700 dark:text-pine-400 border border-pine-200/60' : 'bg-flare-100/60 text-flare-600 border border-flare-500/20'}`}>
                          {delta.pct >= 0 ? '▲' : '▼'} {formatPercent(Math.abs(delta.pct))}
                        </span>
                      </td>
                    </tr>
                  );
                })()}

                {/* Net Savings */}
                {(() => {
                  const delta = calcDelta(currentSummary.netSavings, priorSummary.netSavings);
                  return (
                    <tr className="hover:bg-moss/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-ink">
                        Net Period Savings
                      </td>
                      <td className="py-3 px-4 text-right text-ink font-bold tabular-nums num">
                        <AnimatedNumber
                          value={currentSummary.netSavings}
                          currency={baseCurrency}
                          numberFormat={numberFormat}
                          isPrivacyMode={isPrivacyMode}
                        />
                      </td>
                      <td className="py-3 px-4 text-right text-ink/50 tabular-nums num">
                        <AnimatedNumber
                          value={priorSummary.netSavings}
                          currency={baseCurrency}
                          numberFormat={numberFormat}
                          isPrivacyMode={isPrivacyMode}
                        />
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-ink tabular-nums num">
                        {delta.diff >= 0 ? '+' : ''}
                        {formatCurrency(delta.diff, baseCurrency, numberFormat, isPrivacyMode)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md text-[11px] ${delta.pct >= 0 ? 'bg-pine-50 dark:bg-pine-950/40 text-pine-700 dark:text-pine-400 border border-pine-200/60' : 'bg-flare-100/60 text-flare-600 border border-flare-500/20'}`}>
                          {delta.pct >= 0 ? '▲' : '▼'} {formatPercent(Math.abs(delta.pct))}
                        </span>
                      </td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 4: Category Spend Ranking */}
      <div className="space-y-3">
        <h2 className="font-display font-bold text-xs uppercase tracking-wider text-ink/75 px-1">
          4. Category Spend Intelligence
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Donut Chart */}
          <div className="rounded-2xl border border-line bg-card p-5 space-y-2 shadow-sm lift">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-ink">
                Spend Share (%)
              </h3>
              <span className="text-[11px] text-ink/50 font-semibold">
                Hover slice to inspect
              </span>
            </div>

            <div className="h-64 relative flex items-center justify-center">
              {/* Dynamic Center Readout */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                {hoveredCategory ? (
                  <>
                    <span className="text-xs font-bold text-ink/65 max-w-[150px] truncate">
                      {hoveredCategory.name}
                    </span>
                    <span className="font-display font-extrabold text-2xl text-ink num tracking-tight mt-0.5">
                      {formatCurrency(hoveredCategory.amount, baseCurrency, numberFormat, isPrivacyMode)}
                    </span>
                    <span className="text-xs font-extrabold text-pine-700 dark:text-pine-400 num">
                      {hoveredCategory.pct.toFixed(1)}% of spend
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-ink/45">
                      Total Outflow
                    </span>
                    <span className="font-display font-extrabold text-2xl text-ink num tracking-tight mt-0.5">
                      {formatCurrency(currentSummary.totalExpense, baseCurrency, numberFormat, isPrivacyMode)}
                    </span>
                    <span className="text-[11px] text-ink/50 font-semibold">
                      {categoryBreakdown.length} Categories
                    </span>
                  </>
                )}
              </div>

              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={68}
                    outerRadius={95}
                    paddingAngle={3}
                    onMouseEnter={(data) => {
                      const share = currentSummary.totalExpense > 0 ? (data.amount / currentSummary.totalExpense) * 100 : 0;
                      setHoveredCategory({ name: data.name, amount: data.amount, pct: share });
                    }}
                    onMouseLeave={() => setHoveredCategory(null)}
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ranked List */}
          <div className="rounded-2xl border border-line bg-card overflow-hidden shadow-sm lift flex flex-col justify-between">
            <div className="p-3.5 px-4 border-b border-line flex items-center justify-between">
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-ink">
                Ranked Expense Categories
              </h3>
              <span className="text-[11px] text-ink/50 font-semibold">
                Share of Total Outflow
              </span>
            </div>

            <div className="divide-y divide-line/60 max-h-64 overflow-y-auto custom-scrollbar">
              {categoryBreakdown.map((item) => {
                const share =
                  currentSummary.totalExpense > 0
                    ? (item.amount / currentSummary.totalExpense) * 100
                    : 0;

                return (
                  <div key={item.id} className="p-3 px-4 flex items-center justify-between text-xs hover:bg-moss/40 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <div className="truncate">
                        <span className="font-bold text-[13px] text-ink block truncate">
                          {item.name}
                        </span>
                        <span className="text-[11px] text-ink/50">
                          {item.isEssential ? 'Essential' : 'Discretionary'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="font-display font-extrabold text-[13.5px] text-ink num">
                        <AnimatedNumber
                          value={item.amount}
                          currency={baseCurrency}
                          numberFormat={numberFormat}
                          isPrivacyMode={isPrivacyMode}
                        />
                      </div>
                      <div className="text-[11px] font-bold text-pine-600 num">{share.toFixed(1)}% share</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 5: The Full 16-Ratio Diagnostic Grid (COMPLETELY OVERHAULED) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-display font-bold text-xs uppercase tracking-wider text-ink/75">
            5. 16-Ratio Financial Health Matrix
          </h2>
          <span className="text-[11px] text-ink/45">
            Real-time multi-dimensional solvency & discipline diagnostic
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Savings Rate */}
          {(() => {
            const meta = getRatioMeta('savingsRate');
            return (
              <div className="rounded-2xl border border-line bg-card p-4 shadow-sm lift hover:border-pine-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink/45 block truncate">
                      1. Savings Rate
                    </span>
                    <Badge tone={meta.tone} size="xs">{meta.label}</Badge>
                  </div>
                  <div className="font-display font-extrabold text-[24px] num text-pine-700 dark:text-pine-400 mt-1.5">
                    <AnimatedNumber value={ratios.savingsRate} isPercent isPrivacyMode={isPrivacyMode} />
                  </div>
                </div>
                <p className="text-[11px] text-ink/45 mt-2 pt-2 border-t border-line/60">
                  (Income − Outflow) ÷ Income
                </p>
              </div>
            );
          })()}

          {/* 2. Expense-to-Income */}
          {(() => {
            const meta = getRatioMeta('expenseToIncome');
            return (
              <div className="rounded-2xl border border-line bg-card p-4 shadow-sm lift hover:border-pine-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink/45 block truncate">
                      2. Expense-to-Income
                    </span>
                    <Badge tone={meta.tone} size="xs">{meta.label}</Badge>
                  </div>
                  <div className="font-display font-extrabold text-[24px] num text-flare-600 mt-1.5">
                    <AnimatedNumber value={ratios.expenseToIncomeRatio * 100} isPercent isPrivacyMode={isPrivacyMode} />
                  </div>
                </div>
                <p className="text-[11px] text-ink/45 mt-2 pt-2 border-t border-line/60">
                  Total Spend ÷ Total Inflow
                </p>
              </div>
            );
          })()}

          {/* 3. Debt-to-Income */}
          {(() => {
            const meta = getRatioMeta('debtToIncome');
            return (
              <div className="rounded-2xl border border-line bg-card p-4 shadow-sm lift hover:border-pine-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink/45 block truncate">
                      3. Debt-to-Income (DTI)
                    </span>
                    <Badge tone={meta.tone} size="xs">{meta.label}</Badge>
                  </div>
                  <div className="font-display font-extrabold text-[24px] num text-mari-600 mt-1.5">
                    {ratios.debtToIncomeRatio === 0 ? (
                      <span className="text-[20px] text-pine-700 dark:text-pine-400 font-bold">0% (Debt-Free ✨)</span>
                    ) : (
                      <AnimatedNumber value={ratios.debtToIncomeRatio * 100} isPercent isPrivacyMode={isPrivacyMode} />
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-ink/45 mt-2 pt-2 border-t border-line/60">
                  Target: Under 30% of income
                </p>
              </div>
            );
          })()}

          {/* 4. Essential Spend Share */}
          {(() => {
            const meta = getRatioMeta('essentialSpend');
            return (
              <div className="rounded-2xl border border-line bg-card p-4 shadow-sm lift hover:border-pine-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink/45 block truncate">
                      4. Essential Spend
                    </span>
                    <Badge tone={meta.tone} size="xs">{meta.label}</Badge>
                  </div>
                  <div className="font-display font-extrabold text-[24px] num text-ink mt-1.5">
                    <AnimatedNumber value={ratios.essentialSpendRatio} isPercent isPrivacyMode={isPrivacyMode} />
                  </div>
                </div>
                <p className="text-[11px] text-ink/45 mt-2 pt-2 border-t border-line/60">
                  Needs vs Discretionary
                </p>
              </div>
            );
          })()}

          {/* 5. Monthly Burn Rate */}
          <div className="rounded-2xl border border-line bg-card p-4 shadow-sm lift hover:border-pine-300 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink/45 block truncate">
                  5. Monthly Burn Rate
                </span>
                <Badge tone="gray" size="xs">Velocity</Badge>
              </div>
              <div className="font-display font-extrabold text-[24px] num text-ink mt-1.5">
                <AnimatedNumber
                  value={ratios.burnRateMonthly}
                  currency={baseCurrency}
                  numberFormat={numberFormat}
                  isPrivacyMode={isPrivacyMode}
                />
              </div>
            </div>
            <p className="text-[11px] text-ink/45 mt-2 pt-2 border-t border-line/60">
              Average monthly living outflow
            </p>
          </div>

          {/* 6. Liquid Runway */}
          {(() => {
            const meta = getRatioMeta('liquidRunway');
            return (
              <div className="rounded-2xl border border-line bg-card p-4 shadow-sm lift hover:border-pine-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink/45 block truncate">
                      6. Liquid Runway
                    </span>
                    <Badge tone={meta.tone} size="xs">{meta.label}</Badge>
                  </div>
                  <div className="font-display font-extrabold text-[24px] num text-pine-700 dark:text-pine-400 mt-1.5">
                    {ratios.runwayMonths >= 999 ? (
                      <span className="text-[19px] font-bold">Self-Sustaining ✨</span>
                    ) : (
                      `${ratios.runwayMonths.toFixed(1)} mo`
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-ink/45 mt-2 pt-2 border-t border-line/60">
                  Liquid Cash ÷ Monthly Burn
                </p>
              </div>
            );
          })()}

          {/* 7. Emergency Buffer */}
          {(() => {
            const meta = getRatioMeta('emergencyBuffer');
            return (
              <div className="rounded-2xl border border-line bg-card p-4 shadow-sm lift hover:border-pine-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink/45 block truncate">
                      7. Emergency Buffer
                    </span>
                    <Badge tone={meta.tone} size="xs">{meta.label}</Badge>
                  </div>
                  <div className="font-display font-extrabold text-[24px] num text-pine-700 dark:text-pine-400 mt-1.5">
                    {ratios.emergencyFundCoverageMonths >= 999 ? (
                      <span className="text-[19px] font-bold">Fully Funded ✨</span>
                    ) : (
                      `${ratios.emergencyFundCoverageMonths.toFixed(1)} mo`
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-ink/45 mt-2 pt-2 border-t border-line/60">
                  Target: 6+ months safety net
                </p>
              </div>
            );
          })()}

          {/* 8. Average Daily Spend */}
          <div className="rounded-2xl border border-line bg-card p-4 shadow-sm lift hover:border-pine-300 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink/45 block truncate">
                  8. Average Daily Spend
                </span>
                <Badge tone="gray" size="xs">Pace</Badge>
              </div>
              <div className="font-display font-extrabold text-[24px] num text-ink mt-1.5">
                <AnimatedNumber
                  value={ratios.averageDailySpend}
                  currency={baseCurrency}
                  numberFormat={numberFormat}
                  isPrivacyMode={isPrivacyMode}
                />
              </div>
            </div>
            <p className="text-[11px] text-ink/45 mt-2 pt-2 border-t border-line/60">
              Total Spend ÷ Days in period
            </p>
          </div>

          {/* 9. Average Ticket Size */}
          <div className="rounded-2xl border border-line bg-card p-4 shadow-sm lift hover:border-pine-300 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink/45 block truncate">
                  9. Avg Ticket Size
                </span>
                <Badge tone="gray" size="xs">Per Swipes</Badge>
              </div>
              <div className="font-display font-extrabold text-[24px] num text-ink mt-1.5">
                <AnimatedNumber
                  value={ratios.averageTransactionSize}
                  currency={baseCurrency}
                  numberFormat={numberFormat}
                  isPrivacyMode={isPrivacyMode}
                />
              </div>
            </div>
            <p className="text-[11px] text-ink/45 mt-2 pt-2 border-t border-line/60">
              Mean value per single swipe/UPI
            </p>
          </div>

          {/* 10. Investment Rate */}
          {(() => {
            const meta = getRatioMeta('investmentRate');
            return (
              <div className="rounded-2xl border border-line bg-card p-4 shadow-sm lift hover:border-pine-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink/45 block truncate">
                      10. Investment Rate
                    </span>
                    <Badge tone={meta.tone} size="xs">{meta.label}</Badge>
                  </div>
                  <div className="font-display font-extrabold text-[24px] num text-pine-700 dark:text-pine-400 mt-1.5">
                    <AnimatedNumber value={ratios.investmentRate} isPercent isPrivacyMode={isPrivacyMode} />
                  </div>
                </div>
                <p className="text-[11px] text-ink/45 mt-2 pt-2 border-t border-line/60">
                  SIP & Capital Allocation %
                </p>
              </div>
            );
          })()}

          {/* 11. Liquidity Ratio */}
          {(() => {
            const meta = getRatioMeta('liquidityRatio');
            return (
              <div className="rounded-2xl border border-line bg-card p-4 shadow-sm lift hover:border-pine-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink/45 block truncate">
                      11. Liquidity Ratio
                    </span>
                    <Badge tone={meta.tone} size="xs">{meta.label}</Badge>
                  </div>
                  <div className="font-display font-extrabold text-[24px] num text-ink mt-1.5">
                    {ratios.liquidityRatio === -1 ? (
                      <span className="text-[20px] text-pine-700 dark:text-pine-400 font-bold">Debt-Free ✨</span>
                    ) : (
                      `${ratios.liquidityRatio.toFixed(2)}x`
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-ink/45 mt-2 pt-2 border-t border-line/60">
                  Liquid Funds ÷ Immediate Liabilities
                </p>
              </div>
            );
          })()}

          {/* 12. People Ledger Net */}
          {(() => {
            const meta = getRatioMeta('peopleNet');
            return (
              <div className="rounded-2xl border border-line bg-card p-4 shadow-sm lift hover:border-pine-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink/45 block truncate">
                      12. People Ledger Net
                    </span>
                    <Badge tone={meta.tone} size="xs">{meta.label}</Badge>
                  </div>
                  <div className={`font-display font-extrabold text-[24px] num mt-1.5 ${
                    ratios.peopleNetPosition >= 0 ? 'text-pine-700 dark:text-pine-400' : 'text-flare-600'
                  }`}>
                    <AnimatedNumber
                      value={ratios.peopleNetPosition}
                      currency={baseCurrency}
                      numberFormat={numberFormat}
                      isPrivacyMode={isPrivacyMode}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-ink/45 mt-2 pt-2 border-t border-line/60">
                  Lent Receivables − Borrowed Owed
                </p>
              </div>
            );
          })()}

          {/* 13. Recurring Spend % */}
          {(() => {
            const meta = getRatioMeta('recurringSpend');
            return (
              <div className="rounded-2xl border border-line bg-card p-4 shadow-sm lift hover:border-pine-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink/45 block truncate">
                      13. Recurring Spend %
                    </span>
                    <Badge tone={meta.tone} size="xs">{meta.label}</Badge>
                  </div>
                  <div className="font-display font-extrabold text-[24px] num text-ink mt-1.5">
                    <AnimatedNumber
                      value={ratios.recurringExpenseRatio}
                      isPercent
                      isPrivacyMode={isPrivacyMode}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-ink/45 mt-2 pt-2 border-t border-line/60">
                  Fixed EMIs & Subscriptions share
                </p>
              </div>
            );
          })()}

          {/* 14. Asset Coverage */}
          {(() => {
            const meta = getRatioMeta('assetCoverage');
            return (
              <div className="rounded-2xl border border-line bg-card p-4 shadow-sm lift hover:border-pine-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink/45 block truncate">
                      14. Asset Coverage
                    </span>
                    <Badge tone={meta.tone} size="xs">{meta.label}</Badge>
                  </div>
                  <div className="font-display font-extrabold text-[24px] num text-ink mt-1.5">
                    {ratios.assetToDebtRatio === -1 ? (
                      <span className="text-[20px] text-pine-700 dark:text-pine-400 font-bold">Debt-Free (∞) ✨</span>
                    ) : (
                      `${ratios.assetToDebtRatio.toFixed(1)}x`
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-ink/45 mt-2 pt-2 border-t border-line/60">
                  Total Asset Holdings ÷ Total Debt
                </p>
              </div>
            );
          })()}

          {/* 15. Discretionary % */}
          {(() => {
            const meta = getRatioMeta('discretionary');
            return (
              <div className="rounded-2xl border border-line bg-card p-4 shadow-sm lift hover:border-pine-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink/45 block truncate">
                      15. Discretionary %
                    </span>
                    <Badge tone={meta.tone} size="xs">{meta.label}</Badge>
                  </div>
                  <div className="font-display font-extrabold text-[24px] num text-mari-600 mt-1.5">
                    <AnimatedNumber
                      value={ratios.discretionarySpendRatio}
                      isPercent
                      isPrivacyMode={isPrivacyMode}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-ink/45 mt-2 pt-2 border-t border-line/60">
                  Lifestyle & leisure spend share
                </p>
              </div>
            );
          })()}

          {/* 16. Net Worth Position */}
          {(() => {
            const meta = getRatioMeta('netWorth');
            return (
              <div className="rounded-2xl border border-line bg-card p-4 shadow-sm lift hover:border-pine-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink/45 block truncate">
                      16. Net Worth Position
                    </span>
                    <Badge tone={meta.tone} size="xs">{meta.label}</Badge>
                  </div>
                  <div className="font-display font-extrabold text-[24px] num text-pine-700 dark:text-pine-400 mt-1.5">
                    <AnimatedNumber
                      value={currentSummary.netWorth}
                      currency={baseCurrency}
                      numberFormat={numberFormat}
                      isPrivacyMode={isPrivacyMode}
                      isCompact
                    />
                  </div>
                </div>
                <p className="text-[11px] text-ink/45 mt-2 pt-2 border-t border-line/60">
                  Total Assets minus Liabilities
                </p>
              </div>
            );
          })()}
        </div>
      </div>

      {/* SECTION 6: Cashflow Velocity & Burn Radar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-display font-bold text-xs uppercase tracking-wider text-ink/75 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-pine-600" />
            <span>6. Cashflow Velocity & Burn Radar</span>
          </h2>
          <Badge tone={cashflowStats.radarTone}>{cashflowStats.radarStatus}</Badge>
        </div>

        <div className="rounded-2xl border border-line bg-card p-5 space-y-5 shadow-sm lift">
          {/* Top Velocity Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-moss/50 border border-line">
              <span className="text-[10.5px] text-ink/50 uppercase font-bold block">Daily Burn Rate</span>
              <span className="font-display font-extrabold text-lg sm:text-xl text-ink num mt-0.5 block">
                {formatCurrency(cashflowStats.dailyBurn, baseCurrency, numberFormat, isPrivacyMode)}
                <span className="text-xs font-normal text-ink/40"> /day</span>
              </span>
              <span className="text-[11px] text-ink/50 block mt-1">Normalized daily outflow</span>
            </div>

            <div className="p-3.5 rounded-xl bg-moss/50 border border-line">
              <span className="text-[10.5px] text-ink/50 uppercase font-bold block">Monthly Cash Burden</span>
              <span className="font-display font-extrabold text-lg sm:text-xl text-ink num mt-0.5 block">
                {formatCompactCurrency(cashflowStats.monthlyBurn, baseCurrency, numberFormat, isPrivacyMode)}
                <span className="text-xs font-normal text-ink/40"> /mo</span>
              </span>
              <span className="text-[11px] text-ink/50 block mt-1">Expenses + Loan EMIs</span>
            </div>

            <div className="p-3.5 rounded-xl bg-moss/50 border border-line">
              <span className="text-[10.5px] text-ink/50 uppercase font-bold block">Liquid Cash Cushion</span>
              <span className="font-display font-extrabold text-lg sm:text-xl text-pine-700 dark:text-pine-400 num mt-0.5 block">
                {formatCompactCurrency(cashflowStats.liquidCash, baseCurrency, numberFormat, isPrivacyMode)}
              </span>
              <span className="text-[11px] text-ink/50 block mt-1">Accounts & wallets</span>
            </div>

            <div className="p-3.5 rounded-xl bg-moss/50 border border-line">
              <span className="text-[10.5px] text-ink/50 uppercase font-bold block">Cash Runway</span>
              <span className={`font-display font-extrabold text-lg sm:text-xl num mt-0.5 block ${
                cashflowStats.radarTone === 'pine' ? 'text-pine-700 dark:text-pine-400' : cashflowStats.radarTone === 'mari' ? 'text-mari-600' : 'text-flare-600'
              }`}>
                {cashflowStats.runwayMonths >= 99 ? '∞ (Self-Sustaining)' : `${cashflowStats.runwayMonths.toFixed(1)} mos`}
              </span>
              <span className="text-[11px] text-ink/50 block mt-1">
                {cashflowStats.isCashflowPositive ? 'Surplus generating' : 'Zero-income endurance'}
              </span>
            </div>
          </div>

          {/* 30/60/90 Day Balance Projections */}
          <div className="pt-2 border-t border-line">
            <span className="text-xs font-bold text-ink uppercase tracking-wider block mb-2.5">
              Projected Liquid Balances (Assuming Steady Burn & Loan Servicing)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl border border-line bg-card">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink/70">In 30 Days</span>
                  <span className="text-[11px] text-ink/45 num">Day +30</span>
                </div>
                <div className="font-display font-extrabold text-base sm:text-lg text-ink num mt-1">
                  {formatCurrency(cashflowStats.proj30, baseCurrency, numberFormat, isPrivacyMode)}
                </div>
                <span className="text-[10.5px] text-ink/50 block mt-0.5">Factor in planned rent & EMIs</span>
              </div>

              <div className="p-3 rounded-xl border border-line bg-card">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink/70">In 60 Days</span>
                  <span className="text-[11px] text-ink/45 num">Day +60</span>
                </div>
                <div className="font-display font-extrabold text-base sm:text-lg text-ink num mt-1">
                  {formatCurrency(cashflowStats.proj60, baseCurrency, numberFormat, isPrivacyMode)}
                </div>
                <span className="text-[10.5px] text-ink/50 block mt-0.5">Projected buffer reserve</span>
              </div>

              <div className="p-3 rounded-xl border border-line bg-card">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink/70">In 90 Days</span>
                  <span className="text-[11px] text-ink/45 num">Day +90</span>
                </div>
                <div className="font-display font-extrabold text-base sm:text-lg text-ink num mt-1">
                  {formatCurrency(cashflowStats.proj90, baseCurrency, numberFormat, isPrivacyMode)}
                </div>
                <span className="text-[10.5px] text-ink/50 block mt-0.5">Quarterly forward horizon</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 7: Deep Retrospective Diagnostics & Audit */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div>
            <h2 className="font-display font-bold text-xs uppercase tracking-wider text-ink/75 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-pine-600" />
              <span>7. Deep Retrospective Diagnostics & Audit</span>
            </h2>
            <p className="text-[11.5px] text-ink/50 mt-0.5">
              Comprehensive post-mortem analysis: what went right, leakages, and tactical prescriptions
            </p>
          </div>

          {/* Period Selector Tabs */}
          <div className="flex items-center gap-1 p-1 bg-moss/80 rounded-xl border border-line text-xs font-semibold self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setRetroPeriod('prev-month')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                retroPeriod === 'prev-month'
                  ? 'bg-card text-ink font-bold shadow-xs border border-line'
                  : 'text-ink/60 hover:text-ink'
              }`}
            >
              Previous Month
            </button>
            <button
              type="button"
              onClick={() => setRetroPeriod('prev-quarter')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                retroPeriod === 'prev-quarter'
                  ? 'bg-card text-ink font-bold shadow-xs border border-line'
                  : 'text-ink/60 hover:text-ink'
              }`}
            >
              Previous Quarter
            </button>
            <button
              type="button"
              onClick={() => setRetroPeriod('prev-year')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                retroPeriod === 'prev-year'
                  ? 'bg-card text-ink font-bold shadow-xs border border-line'
                  : 'text-ink/60 hover:text-ink'
              }`}
            >
              Previous Year
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-card p-5 space-y-5 shadow-sm lift">
          {/* Period Summary Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-moss/60 border border-line">
            <div>
              <span className="text-[10.5px] font-bold text-ink/50 uppercase block">Audited Window</span>
              <span className="font-bold text-sm text-ink">{retroData.label}</span>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div>
                <span className="text-ink/45 block text-[10.5px]">Inflows:</span>
                <span className="font-bold text-pine-600 num">+{formatCompactCurrency(retroData.inc, baseCurrency, numberFormat, isPrivacyMode)}</span>
              </div>
              <div>
                <span className="text-ink/45 block text-[10.5px]">Outflows:</span>
                <span className="font-bold text-flare-600 num">−{formatCompactCurrency(retroData.exp, baseCurrency, numberFormat, isPrivacyMode)}</span>
              </div>
              <div>
                <span className="text-ink/45 block text-[10.5px]">Net Savings:</span>
                <span className={`font-bold num ${retroData.netSav >= 0 ? 'text-pine-600' : 'text-flare-600'}`}>
                  {formatCompactCurrency(retroData.netSav, baseCurrency, numberFormat, isPrivacyMode)} ({retroData.savRate.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>

          {/* 2-Column: What Went Right vs What Went Wrong */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* What Went Right */}
            <div className="rounded-xl border border-pine-200/60 dark:border-pine-800/40 bg-pine-50/40 dark:bg-pine-950/20 p-4 space-y-3">
              <div className="flex items-center gap-2 text-pine-800 dark:text-pine-300 font-bold text-xs uppercase tracking-wider">
                <CheckCircle className="w-4 h-4 text-pine-600" />
                <span>What Went Right</span>
              </div>
              <ul className="space-y-2 text-xs">
                {retroData.rights.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-ink/80 leading-relaxed">
                    <span className="text-pine-600 font-bold mt-0.5">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* What Went Wrong / Leakages */}
            <div className="rounded-xl border border-flare-500/25 bg-flare-50/40 dark:bg-flare-950/20 p-4 space-y-3">
              <div className="flex items-center gap-2 text-flare-700 dark:text-flare-400 font-bold text-xs uppercase tracking-wider">
                <AlertCircle className="w-4 h-4 text-flare-600" />
                <span>What Went Wrong / Leakages</span>
              </div>
              <ul className="space-y-2 text-xs">
                {retroData.wrongs.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-ink/80 leading-relaxed">
                    <span className="text-flare-600 font-bold mt-0.5">•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Strategic Prescriptions */}
          <div className="p-4 rounded-xl border border-mari-400/40 bg-mari-50/40 dark:bg-mari-950/20 space-y-2.5">
            <span className="text-xs font-bold text-mari-800 dark:text-mari-300 uppercase tracking-wider block">
              Strategic Prescriptions for Next Period
            </span>
            <div className="space-y-2 text-xs">
              {retroData.prescriptions.map((p, i) => (
                <div key={i} className="flex items-start gap-2 text-ink/80">
                  <ArrowRight className="w-3.5 h-3.5 text-mari-600 shrink-0 mt-0.5" />
                  <span>{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
        </>
      )}

      {/* Comprehensive PDF Export Modal */}
      {isPdfModalOpen && activeVault && (
        <PdfExportModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          vault={activeVault}
          periodLabel={selectedRange.label}
          transactions={currentPeriodTxs}
          categories={categories}
          accounts={accounts}
          assets={assets}
          liabilities={liabilities}
          plannedExpenses={plannedExpenses || []}
          peopleLedger={peopleLedger}
          summary={currentSummary}
          ratios={computedRatiosArray}
        />
      )}
    </div>
  );
};
