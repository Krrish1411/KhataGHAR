import React from 'react';
import { Badge } from '../common/Badge';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { formatCurrency, formatCompactCurrency, formatPercent } from '../../utils/formatters';
import { IconRenderer } from '../common/IconRenderer';
import type { Category, Transaction, Asset, Liability, Account, NumberFormatType } from '../../types';
import {
  TrendingUp,
  TrendingDown,
  Download,
  FileSpreadsheet,
  Layers,
  Landmark,
  ShieldCheck,
  Coins,
  Receipt,
  Scale,
  Sparkles,
  PieChart,
} from 'lucide-react';

interface PnLStatementSectionProps {
  currentPeriodTxs: Transaction[];
  categories: Category[];
  assets: Asset[];
  liabilities: Liability[];
  accounts: Account[];
  selectedRange: { start: string; end: string; label: string };
  baseCurrency: string;
  numberFormat: NumberFormatType;
  isPrivacyMode: boolean;
  vaultName: string;
}

export const PnLStatementSection: React.FC<PnLStatementSectionProps> = ({
  currentPeriodTxs,
  categories,
  assets,
  liabilities,
  accounts,
  selectedRange,
  baseCurrency,
  numberFormat,
  isPrivacyMode,
  vaultName,
}) => {
  const catMap = React.useMemo(() => new Map<string, Category>(categories.map((c) => [c.id, c])), [categories]);
  const assetMap = React.useMemo(() => new Map<string, Asset>(assets.map((a) => [a.id, a])), [assets]);

  // Derived P&L Schedules
  const pnl = React.useMemo(() => {
    const operatingIncomeMap = new Map<string, { id: string; name: string; icon?: string; color?: string; amount: number }>();
    const capitalGainsList: Array<{
      id: string;
      date: string;
      assetName: string;
      assetType?: string;
      unitsSold?: number;
      saleProceeds: number;
      costBasis: number;
      realizedGain: number;
      note?: string;
    }> = [];

    const essentialExpenseMap = new Map<string, { id: string; name: string; icon?: string; color?: string; amount: number }>();
    const discretionaryExpenseMap = new Map<string, { id: string; name: string; icon?: string; color?: string; amount: number }>();
    const financeChargesList: Array<{ id: string; date: string; title: string; amount: number }> = [];

    let totalInvestmentsPurchased = 0;
    let totalDebtPrincipalRepaid = 0;

    currentPeriodTxs.forEach((t) => {
      const isAssetSale =
        t.subType === 'asset_sale' ||
        (Boolean(t.linkedAssetId) && t.type === 'income') ||
        Boolean(t.tags && t.tags.includes('asset-sale'));

      const isInvestment =
        t.subType === 'investment' ||
        (Boolean(t.linkedAssetId) && t.type === 'expense') ||
        Boolean(t.tags && t.tags.includes('investment'));

      const isLoanDisbursed =
        t.subType === 'loan_received' ||
        (Boolean(t.linkedLiabilityId) && t.type === 'income') ||
        Boolean(t.tags && t.tags.includes('loan-disbursement'));

      const isDebtPayment =
        t.subType === 'debt_payment' ||
        (Boolean(t.linkedLiabilityId) && t.type === 'expense');

      const cat = t.categoryId ? catMap.get(t.categoryId) : undefined;
      const catName = cat?.name || 'Uncategorized';
      const isCatInvestment =
        cat && (cat.name.toLowerCase().includes('invest') || cat.name.toLowerCase().includes('sip'));

      if (t.type === 'income') {
        if (isAssetSale) {
          const linkedAsset = t.linkedAssetId ? assetMap.get(t.linkedAssetId) : undefined;
          const gain = t.realizedGain !== undefined ? t.realizedGain : 0;
          const cost = Math.max(0, t.amount - gain);
          capitalGainsList.push({
            id: t.id,
            date: t.date,
            assetName: linkedAsset?.name || t.note || 'Asset Sale',
            assetType: linkedAsset?.type,
            unitsSold: t.units,
            saleProceeds: t.amount,
            costBasis: cost,
            realizedGain: gain,
            note: t.note,
          });
        } else if (!isLoanDisbursed) {
          // Operating Revenue (Salary, Business, Rental, Dividends, Interest, etc.)
          const entry = operatingIncomeMap.get(catName) || {
            id: cat?.id || 'uncat',
            name: catName,
            icon: cat?.icon,
            color: cat?.color,
            amount: 0,
          };
          entry.amount += t.amount;
          operatingIncomeMap.set(catName, entry);
        }
      } else if (t.type === 'expense') {
        if (isInvestment || isCatInvestment) {
          // Capital asset purchases go to Balance Sheet (Memorandum)
          totalInvestmentsPurchased += t.amount;
        } else if (isDebtPayment) {
          // Debt repayments go to Balance Sheet (Memorandum)
          totalDebtPrincipalRepaid += t.amount;
        } else {
          // Check if finance charge / interest
          const isFinanceCharge =
            catName.toLowerCase().includes('interest') ||
            catName.toLowerCase().includes('finance charge') ||
            catName.toLowerCase().includes('bank fee') ||
            Boolean(t.tags && t.tags.includes('interest'));

          if (isFinanceCharge) {
            financeChargesList.push({
              id: t.id,
              date: t.date,
              title: t.note || catName,
              amount: t.amount,
            });
          } else if (cat?.isEssential) {
            const entry = essentialExpenseMap.get(catName) || {
              id: cat?.id || 'uncat',
              name: catName,
              icon: cat?.icon,
              color: cat?.color,
              amount: 0,
            };
            entry.amount += t.amount;
            essentialExpenseMap.set(catName, entry);
          } else {
            const entry = discretionaryExpenseMap.get(catName) || {
              id: cat?.id || 'uncat',
              name: catName,
              icon: cat?.icon,
              color: cat?.color,
              amount: 0,
            };
            entry.amount += t.amount;
            discretionaryExpenseMap.set(catName, entry);
          }
        }
      }
    });

    const operatingRevenueItems = Array.from(operatingIncomeMap.values()).sort((a, b) => b.amount - a.amount);
    const totalOperatingRevenue = operatingRevenueItems.reduce((sum, item) => sum + item.amount, 0);

    const totalGrossProceeds = capitalGainsList.reduce((sum, s) => sum + s.saleProceeds, 0);
    const totalCostBasis = capitalGainsList.reduce((sum, s) => sum + s.costBasis, 0);
    const totalRealizedGain = capitalGainsList.reduce((sum, s) => sum + s.realizedGain, 0);

    const grossEconomicRevenue = totalOperatingRevenue + Math.max(0, totalRealizedGain);

    const essentialItems = Array.from(essentialExpenseMap.values()).sort((a, b) => b.amount - a.amount);
    const totalEssentialExpenses = essentialItems.reduce((sum, item) => sum + item.amount, 0);

    const discretionaryItems = Array.from(discretionaryExpenseMap.values()).sort((a, b) => b.amount - a.amount);
    const totalDiscretionaryExpenses = discretionaryItems.reduce((sum, item) => sum + item.amount, 0);

    const totalOperatingExpenses = totalEssentialExpenses + totalDiscretionaryExpenses;
    const operatingProfitEBITDA = totalOperatingRevenue - totalOperatingExpenses;

    const totalFinanceCharges = financeChargesList.reduce((sum, f) => sum + f.amount, 0);
    const netProfit = grossEconomicRevenue - totalOperatingExpenses - totalFinanceCharges;
    const netProfitMargin = grossEconomicRevenue > 0 ? (netProfit / grossEconomicRevenue) * 100 : 0;

    return {
      operatingRevenueItems,
      totalOperatingRevenue,
      capitalGainsList,
      totalGrossProceeds,
      totalCostBasis,
      totalRealizedGain,
      grossEconomicRevenue,
      essentialItems,
      totalEssentialExpenses,
      discretionaryItems,
      totalDiscretionaryExpenses,
      totalOperatingExpenses,
      operatingProfitEBITDA,
      financeChargesList,
      totalFinanceCharges,
      netProfit,
      netProfitMargin,
      totalInvestmentsPurchased,
      totalDebtPrincipalRepaid,
    };
  }, [currentPeriodTxs, catMap, assetMap]);

  // Export P&L to CSV
  const handleExportPnLCSV = () => {
    const lines: string[] = [];
    lines.push(`STATEMENT OF PROFIT AND LOSS & COMPREHENSIVE INCOME`);
    lines.push(`Reporting Entity,${vaultName}`);
    lines.push(`Period,${selectedRange.label} (${selectedRange.start} to ${selectedRange.end})`);
    lines.push(`Base Currency,${baseCurrency}`);
    lines.push(``);

    lines.push(`SCHEDULE I: OPERATING REVENUES`);
    lines.push(`Category,Amount (${baseCurrency}),Share of Revenue (%)`);
    pnl.operatingRevenueItems.forEach((item) => {
      const share = pnl.totalOperatingRevenue > 0 ? (item.amount / pnl.totalOperatingRevenue) * 100 : 0;
      lines.push(`"${item.name}",${item.amount.toFixed(2)},${share.toFixed(1)}%`);
    });
    lines.push(`TOTAL OPERATING REVENUE (A),${pnl.totalOperatingRevenue.toFixed(2)},100.0%`);
    lines.push(``);

    lines.push(`SCHEDULE II: REALIZED CAPITAL GAINS (ITR SCHEDULE CG)`);
    lines.push(`Date,Asset,Units Sold,Gross Considerations,Acquisition Cost Basis,Realized Gain/Loss,Note`);
    pnl.capitalGainsList.forEach((s) => {
      lines.push(
        `"${s.date}","${s.assetName}",${s.unitsSold || '—'},${s.saleProceeds.toFixed(2)},${s.costBasis.toFixed(2)},${s.realizedGain.toFixed(2)},"${s.note || ''}"`
      );
    });
    lines.push(
      `TOTAL REALIZED CAPITAL GAINS (B),,,${pnl.totalGrossProceeds.toFixed(2)},${pnl.totalCostBasis.toFixed(2)},${pnl.totalRealizedGain.toFixed(2)},`
    );
    lines.push(``);

    lines.push(`GROSS TOTAL ECONOMIC REVENUE (A + B),${pnl.grossEconomicRevenue.toFixed(2)}`);
    lines.push(``);

    lines.push(`SCHEDULE III: OPERATING EXPENSES`);
    lines.push(`Tier 1: Essential Needs (50/30/20)`);
    lines.push(`Category,Amount (${baseCurrency}),Share of Expenses (%)`);
    pnl.essentialItems.forEach((item) => {
      const share = pnl.totalOperatingExpenses > 0 ? (item.amount / pnl.totalOperatingExpenses) * 100 : 0;
      lines.push(`"${item.name}",${item.amount.toFixed(2)},${share.toFixed(1)}%`);
    });
    lines.push(`Sub-total Essential Needs,${pnl.totalEssentialExpenses.toFixed(2)}`);
    lines.push(``);

    lines.push(`Tier 2: Discretionary Wants`);
    lines.push(`Category,Amount (${baseCurrency}),Share of Expenses (%)`);
    pnl.discretionaryItems.forEach((item) => {
      const share = pnl.totalOperatingExpenses > 0 ? (item.amount / pnl.totalOperatingExpenses) * 100 : 0;
      lines.push(`"${item.name}",${item.amount.toFixed(2)},${share.toFixed(1)}%`);
    });
    lines.push(`Sub-total Discretionary Wants,${pnl.totalDiscretionaryExpenses.toFixed(2)}`);
    lines.push(`TOTAL OPERATING EXPENSES (C),${pnl.totalOperatingExpenses.toFixed(2)}`);
    lines.push(``);

    lines.push(`OPERATING PROFIT (EBITDA: Revenue - Operating Expenses),${pnl.operatingProfitEBITDA.toFixed(2)}`);
    lines.push(``);

    lines.push(`SCHEDULE IV: FINANCING CHARGES & INTEREST DRAG`);
    lines.push(`Title,Amount (${baseCurrency})`);
    pnl.financeChargesList.forEach((f) => {
      lines.push(`"${f.title}",${f.amount.toFixed(2)}`);
    });
    lines.push(`TOTAL FINANCE CHARGES (D),${pnl.totalFinanceCharges.toFixed(2)}`);
    lines.push(``);

    lines.push(`NET PROFIT / ECONOMIC SURPLUS (A + B - C - D),${pnl.netProfit.toFixed(2)}`);
    lines.push(`NET PROFIT MARGIN,${pnl.netProfitMargin.toFixed(1)}%`);
    lines.push(``);

    lines.push(`SCHEDULE V (MEMORANDUM): BALANCE SHEET MOVEMENTS`);
    lines.push(`Investments & Capital Assets Acquired,${pnl.totalInvestmentsPurchased.toFixed(2)}`);
    lines.push(`Debt Principal Repaid,${pnl.totalDebtPrincipalRepaid.toFixed(2)}`);

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `KhataGHAR_PnL_Statement_${selectedRange.start}_${selectedRange.end}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* P&L Header Action Banner */}
      <div className="rounded-2xl border border-line bg-card p-4 sm:p-5 shadow-sm lift flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-pine-100 dark:bg-pine-950/60 border border-pine-300 dark:border-pine-800 grid place-items-center text-pine-600 shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display font-extrabold text-base text-ink">
                Statement of Profit & Loss and Comprehensive Income
              </h2>
              <Badge tone="pine" size="xs">
                CA / CFA Standard
              </Badge>
              <Badge tone="sky" size="xs">
                ITR Schedules S, CG & OS
              </Badge>
            </div>
            <p className="text-xs text-ink/50 mt-0.5">
              Audited economic performance for <b>{vaultName}</b> • Period: <b>{selectedRange.label}</b>
            </p>
          </div>
        </div>

        <button
          onClick={handleExportPnLCSV}
          className="px-3.5 py-2 rounded-xl bg-pine-700 hover:bg-pine-600 active:scale-[0.97] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all shrink-0 self-start md:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export P&L (CSV)</span>
        </button>
      </div>

      {/* 5-Metric Executive P&L Scorecard */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Gross Operating Revenue */}
        <div className="p-4 rounded-2xl bg-card border border-line shadow-xs min-w-0">
          <span className="text-[10.5px] text-ink/50 font-bold uppercase tracking-wider block truncate">
            Operating Revenue (A)
          </span>
          <div className="font-display font-extrabold text-lg sm:text-xl text-pine-600 mt-1 truncate">
            <AnimatedNumber
              value={pnl.totalOperatingRevenue}
              currency={baseCurrency}
              numberFormat={numberFormat}
              isPrivacyMode={isPrivacyMode}
            />
          </div>
          <span className="text-[11px] text-ink/45 block mt-0.5 truncate">Salary, Business, Rental</span>
        </div>

        {/* Realized Capital Gains */}
        <div className="p-4 rounded-2xl bg-card border border-line shadow-xs min-w-0">
          <span className="text-[10.5px] text-ink/50 font-bold uppercase tracking-wider block truncate">
            Capital Gains (B)
          </span>
          <div
            className={`font-display font-extrabold text-lg sm:text-xl mt-1 truncate ${
              pnl.totalRealizedGain >= 0 ? 'text-pine-600' : 'text-flare-600'
            }`}
          >
            {pnl.totalRealizedGain >= 0 ? '+' : ''}
            <AnimatedNumber
              value={pnl.totalRealizedGain}
              currency={baseCurrency}
              numberFormat={numberFormat}
              isPrivacyMode={isPrivacyMode}
            />
          </div>
          <span className="text-[11px] text-ink/45 block mt-0.5 truncate">
            {pnl.capitalGainsList.length} asset sale(s)
          </span>
        </div>

        {/* Operating Expenses */}
        <div className="p-4 rounded-2xl bg-card border border-line shadow-xs min-w-0">
          <span className="text-[10.5px] text-ink/50 font-bold uppercase tracking-wider block truncate">
            Operating Outlays (C)
          </span>
          <div className="font-display font-extrabold text-lg sm:text-xl text-flare-600 mt-1 truncate">
            <AnimatedNumber
              value={pnl.totalOperatingExpenses}
              currency={baseCurrency}
              numberFormat={numberFormat}
              isPrivacyMode={isPrivacyMode}
            />
          </div>
          <span className="text-[11px] text-ink/45 block mt-0.5 truncate">
            Needs: {formatCompactCurrency(pnl.totalEssentialExpenses, baseCurrency, numberFormat, isPrivacyMode)}
          </span>
        </div>

        {/* Operating Profit (EBITDA) */}
        <div className="p-4 rounded-2xl bg-card border border-line shadow-xs min-w-0">
          <span className="text-[10.5px] text-ink/50 font-bold uppercase tracking-wider block truncate">
            Operating EBITDA
          </span>
          <div
            className={`font-display font-extrabold text-lg sm:text-xl mt-1 truncate ${
              pnl.operatingProfitEBITDA >= 0 ? 'text-pine-600' : 'text-flare-600'
            }`}
          >
            <AnimatedNumber
              value={pnl.operatingProfitEBITDA}
              currency={baseCurrency}
              numberFormat={numberFormat}
              isPrivacyMode={isPrivacyMode}
            />
          </div>
          <span className="text-[11px] text-ink/45 block mt-0.5 truncate">Operating Surplus</span>
        </div>

        {/* Net Profit / Economic Surplus */}
        <div className="p-4 rounded-2xl bg-moss/70 border border-pine-300/60 dark:border-pine-800/60 shadow-xs min-w-0">
          <span className="text-[10.5px] text-ink/50 font-bold uppercase tracking-wider block truncate">
            Net Economic Profit
          </span>
          <div
            className={`font-display font-extrabold text-lg sm:text-xl mt-1 truncate ${
              pnl.netProfit >= 0 ? 'text-pine-600' : 'text-flare-600'
            }`}
          >
            <AnimatedNumber
              value={pnl.netProfit}
              currency={baseCurrency}
              numberFormat={numberFormat}
              isPrivacyMode={isPrivacyMode}
            />
          </div>
          <span className="text-[11px] text-ink/50 font-bold block mt-0.5 truncate">
            Margin: {pnl.netProfitMargin.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* SCHEDULE I: OPERATING REVENUES */}
      <div className="rounded-2xl border border-line bg-card p-4 sm:p-5 space-y-3 shadow-sm lift">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-sm text-ink flex items-center gap-2">
            <span>Schedule I: Pure Operating Revenues</span>
            <Badge tone="pine" size="xs">
              {pnl.operatingRevenueItems.length} Categories
            </Badge>
          </h3>
          <span className="font-mono font-bold text-xs text-pine-600">
            Total (A): {formatCurrency(pnl.totalOperatingRevenue, baseCurrency, numberFormat, isPrivacyMode)}
          </span>
        </div>

        {pnl.operatingRevenueItems.length === 0 ? (
          <p className="text-xs text-ink/40 py-4 text-center italic">
            No operating revenue recorded in this period.
          </p>
        ) : (
          <div className="rounded-xl border border-line overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-moss/80 border-b border-line text-ink/50 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3.5">Category</th>
                  <th className="py-2.5 px-3.5 text-right">Amount</th>
                  <th className="py-2.5 px-3.5 text-right w-28">Share of Inflows</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {pnl.operatingRevenueItems.map((item) => {
                  const pct = pnl.totalOperatingRevenue > 0 ? (item.amount / pnl.totalOperatingRevenue) * 100 : 0;
                  return (
                    <tr key={item.id} className="hover:bg-moss/40 transition-colors">
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-lg grid place-items-center shrink-0"
                            style={{ backgroundColor: `${item.color || '#12855a'}20`, color: item.color || '#12855a' }}
                          >
                            <IconRenderer name={item.icon || 'trending-up'} className="w-3 h-3" />
                          </div>
                          <span className="font-semibold text-ink">{item.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-ink">
                        {formatCurrency(item.amount, baseCurrency, numberFormat, isPrivacyMode)}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-ink/60">
                        {pct.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SCHEDULE II: REALIZED CAPITAL GAINS (ITR SCHEDULE CG) */}
      <div className="rounded-2xl border border-line bg-card p-4 sm:p-5 space-y-3 shadow-sm lift">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-display font-bold text-sm text-ink flex items-center gap-2">
              <span>Schedule II: Realized Capital Gains & Divestments</span>
              <Badge tone="sky" size="xs">
                ITR Schedule CG
              </Badge>
            </h3>
            <p className="text-[11px] text-ink/50 mt-0.5">
              Only net profit from asset sales affects taxable capital income; principal returns to liquidity.
            </p>
          </div>
          <span className="font-mono font-bold text-xs text-pine-600">
            Net Capital Gain (B): {pnl.totalRealizedGain >= 0 ? '+' : ''}
            {formatCurrency(pnl.totalRealizedGain, baseCurrency, numberFormat, isPrivacyMode)}
          </span>
        </div>

        {pnl.capitalGainsList.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-line rounded-xl bg-moss/20">
            <Coins className="w-6 h-6 text-ink/25 mx-auto mb-1" />
            <p className="text-xs text-ink/50 font-medium">No asset redemptions or liquidations during this period.</p>
            <p className="text-[11px] text-ink/40 mt-0.5">
              Capital gain schedules are generated automatically whenever assets are sold or redeemed.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-line overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-moss/80 border-b border-line text-ink/50 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3.5">Date</th>
                  <th className="py-2.5 px-3.5">Asset</th>
                  <th className="py-2.5 px-3.5 text-right">Units Sold</th>
                  <th className="py-2.5 px-3.5 text-right">Gross Proceeds</th>
                  <th className="py-2.5 px-3.5 text-right">Acquisition Cost Basis</th>
                  <th className="py-2.5 px-3.5 text-right">Net Capital Gain</th>
                  <th className="py-2.5 px-3.5">ITR Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {pnl.capitalGainsList.map((sale) => (
                  <tr key={sale.id} className="hover:bg-moss/40 transition-colors">
                    <td className="py-2.5 px-3.5 font-mono text-ink/75">{sale.date}</td>
                    <td className="py-2.5 px-3.5 font-semibold text-ink">{sale.assetName}</td>
                    <td className="py-2.5 px-3.5 text-right font-mono text-ink/65">
                      {sale.unitsSold ? sale.unitsSold.toFixed(3) : 'Lump-sum'}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono font-bold text-pine-600">
                      +{formatCurrency(sale.saleProceeds, baseCurrency, numberFormat, isPrivacyMode)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono text-ink/70">
                      {formatCurrency(sale.costBasis, baseCurrency, numberFormat, isPrivacyMode)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full font-bold text-[11px] ${
                          sale.realizedGain >= 0
                            ? 'bg-pine-100 text-pine-700 dark:bg-pine-900/40 dark:text-pine-300'
                            : 'bg-flare-100 text-flare-700 dark:bg-flare-900/40 dark:text-flare-300'
                        }`}
                      >
                        {sale.realizedGain >= 0 ? '+' : ''}
                        {formatCurrency(sale.realizedGain, baseCurrency, numberFormat, isPrivacyMode)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5">
                      <Badge tone="gray" size="xs">
                        Schedule CG
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-moss/90 font-bold border-t border-line text-ink">
                  <td colSpan={3} className="py-2.5 px-3.5">
                    Total Schedule CG Net Realized Capital Gains
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono text-pine-600">
                    +{formatCurrency(pnl.totalGrossProceeds, baseCurrency, numberFormat, isPrivacyMode)}
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono text-ink/70">
                    {formatCurrency(pnl.totalCostBasis, baseCurrency, numberFormat, isPrivacyMode)}
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono text-pine-600">
                    +{formatCurrency(pnl.totalRealizedGain, baseCurrency, numberFormat, isPrivacyMode)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* SCHEDULE III: OPERATING EXPENSES (NEEDS VS WANTS) */}
      <div className="rounded-2xl border border-line bg-card p-4 sm:p-5 space-y-4 shadow-sm lift">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-sm text-ink flex items-center gap-2">
              <span>Schedule III: Operating & Living Expenses</span>
              <Badge tone="flare" size="xs">
                {pnl.totalOperatingExpenses > 0 ? `${formatCurrency(pnl.totalOperatingExpenses, baseCurrency, numberFormat, isPrivacyMode)} Total` : '0'}
              </Badge>
            </h3>
            <p className="text-[11px] text-ink/50 mt-0.5">
              50/30/20 standard separation: Essential living needs vs discretionary lifestyle choices
            </p>
          </div>
          <span className="font-mono font-bold text-xs text-flare-600">
            Total (C): {formatCurrency(pnl.totalOperatingExpenses, baseCurrency, numberFormat, isPrivacyMode)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tier 1: Essential Needs */}
          <div className="p-4 rounded-xl border border-line bg-moss/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-ink flex items-center gap-1.5">
                <span>⭐ Tier 1: Essential Needs (50% Guideline)</span>
              </span>
              <span className="font-mono font-bold text-xs text-ink">
                {formatCurrency(pnl.totalEssentialExpenses, baseCurrency, numberFormat, isPrivacyMode)}
              </span>
            </div>

            {pnl.essentialItems.length === 0 ? (
              <p className="text-xs text-ink/40 py-2 italic">No essential expenses recorded.</p>
            ) : (
              <div className="space-y-1.5 divide-y divide-line/40">
                {pnl.essentialItems.map((item) => (
                  <div key={item.id} className="pt-1.5 flex items-center justify-between text-xs">
                    <span className="text-ink/80 truncate">{item.name}</span>
                    <span className="font-mono font-bold text-ink">
                      {formatCurrency(item.amount, baseCurrency, numberFormat, isPrivacyMode)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tier 2: Discretionary Wants */}
          <div className="p-4 rounded-xl border border-line bg-moss/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-ink flex items-center gap-1.5">
                <span>🎯 Tier 2: Discretionary Wants (30% Guideline)</span>
              </span>
              <span className="font-mono font-bold text-xs text-ink">
                {formatCurrency(pnl.totalDiscretionaryExpenses, baseCurrency, numberFormat, isPrivacyMode)}
              </span>
            </div>

            {pnl.discretionaryItems.length === 0 ? (
              <p className="text-xs text-ink/40 py-2 italic">No discretionary expenses recorded.</p>
            ) : (
              <div className="space-y-1.5 divide-y divide-line/40">
                {pnl.discretionaryItems.map((item) => (
                  <div key={item.id} className="pt-1.5 flex items-center justify-between text-xs">
                    <span className="text-ink/80 truncate">{item.name}</span>
                    <span className="font-mono font-bold text-ink">
                      {formatCurrency(item.amount, baseCurrency, numberFormat, isPrivacyMode)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SCHEDULE IV & NET SURPLUS BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Schedule IV: Financing & Borrowing Costs */}
        <div className="rounded-2xl border border-line bg-card p-4 sm:p-5 space-y-3 shadow-sm lift">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-sm text-ink flex items-center gap-2">
              <span>Schedule IV: Financing & Interest Costs</span>
            </h3>
            <span className="font-mono font-bold text-xs text-flare-600">
              Total (D): {formatCurrency(pnl.totalFinanceCharges, baseCurrency, numberFormat, isPrivacyMode)}
            </span>
          </div>

          {pnl.financeChargesList.length === 0 ? (
            <p className="text-xs text-ink/50 py-4 text-center italic">
              Zero financing or interest charges incurred in this period.
            </p>
          ) : (
            <div className="space-y-2">
              {pnl.financeChargesList.map((f) => (
                <div key={f.id} className="flex items-center justify-between text-xs py-1 border-b border-line/40">
                  <span className="text-ink/75">{f.title}</span>
                  <span className="font-mono font-bold text-flare-600">
                    {formatCurrency(f.amount, baseCurrency, numberFormat, isPrivacyMode)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Schedule V (Memorandum): Balance Sheet Capital Transfers */}
        <div className="rounded-2xl border border-line bg-card p-4 sm:p-5 space-y-3 shadow-sm lift">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-sm text-ink flex items-center gap-2">
              <span>Schedule V: Capital Asset Additions (Memorandum)</span>
            </h3>
            <Badge tone="gray" size="xs">
              Balance Sheet
            </Badge>
          </div>
          <p className="text-[11px] text-ink/50">
            These represent capital transfers into assets or liability paydowns, not economic expenses.
          </p>

          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs py-1.5 border-b border-line/40">
              <span className="text-ink/80">New Investments & SIPs Acquired</span>
              <span className="font-mono font-bold text-pine-600">
                +{formatCurrency(pnl.totalInvestmentsPurchased, baseCurrency, numberFormat, isPrivacyMode)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs py-1.5 border-b border-line/40">
              <span className="text-ink/80">Debt & Loan Principal Paydowns</span>
              <span className="font-mono font-bold text-mari-600">
                +{formatCurrency(pnl.totalDebtPrincipalRepaid, baseCurrency, numberFormat, isPrivacyMode)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ITR Tax Estimator Helper Box */}
      <div className="rounded-2xl border border-pine-200 dark:border-pine-800/80 bg-pine-50/40 dark:bg-pine-950/20 p-4 sm:p-5 space-y-3 shadow-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-pine-600 shrink-0" />
          <h4 className="font-display font-bold text-sm text-ink">
            Direct Reference for Income Tax Return (ITR) Filing
          </h4>
        </div>
        <p className="text-xs text-ink/60">
          Use the figures below when filling out your tax computation schedules:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-card border border-line">
            <span className="text-[10px] text-ink/50 font-bold uppercase block">Schedule S & BP</span>
            <span className="text-xs font-semibold text-ink block mt-0.5">Salary & Business Inflow</span>
            <span className="font-mono font-bold text-sm text-pine-600 mt-1 block">
              {formatCurrency(pnl.totalOperatingRevenue, baseCurrency, numberFormat, isPrivacyMode)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-card border border-line">
            <span className="text-[10px] text-ink/50 font-bold uppercase block">Schedule CG</span>
            <span className="text-xs font-semibold text-ink block mt-0.5">Net Realized Capital Gains</span>
            <span className="font-mono font-bold text-sm text-pine-600 mt-1 block">
              {pnl.totalRealizedGain >= 0 ? '+' : ''}
              {formatCurrency(pnl.totalRealizedGain, baseCurrency, numberFormat, isPrivacyMode)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-card border border-line">
            <span className="text-[10px] text-ink/50 font-bold uppercase block">Gross Total Income (GTI)</span>
            <span className="text-xs font-semibold text-ink block mt-0.5">Total Taxable Economic Inflow</span>
            <span className="font-mono font-bold text-sm text-pine-600 mt-1 block">
              {formatCurrency(pnl.grossEconomicRevenue, baseCurrency, numberFormat, isPrivacyMode)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
