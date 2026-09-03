import type { Account, Transaction, Budget, Category, PeopleLedgerEntry, Asset, Liability, PlannedExpense } from '../types';
import { formatCompactCurrency, formatCurrency, formatPercent } from '../utils/formatters';
import { formatReadableDate } from '../utils/dates';

export interface FinancialInsight {
  id: string;
  title: string;
  description: string;
  category: 'budget' | 'debt' | 'bill' | 'overdraft' | 'savings' | 'asset' | 'people';
  severity: 'critical' | 'warning' | 'info' | 'positive';
  actionLabel: string;
  targetRoute: string; // Hash route like '#/budgets', '#/people', etc.
  metric?: string;
  date?: string;
}

export function computeFinancialInsights(params: {
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  categories: Category[];
  peopleLedger: PeopleLedgerEntry[];
  assets: Asset[];
  liabilities: Liability[];
  plannedExpenses?: PlannedExpense[];
  baseCurrency?: string;
  numberFormat?: 'indian' | 'international';
  isPrivacyMode?: boolean;
}): FinancialInsight[] {
  const {
    accounts,
    transactions,
    budgets,
    categories,
    peopleLedger,
    assets,
    liabilities,
    plannedExpenses = [],
    baseCurrency = 'INR',
    numberFormat = 'indian',
    isPrivacyMode = false,
  } = params;

  const insights: FinancialInsight[] = [];
  const todayISO = new Date().toISOString().split('T')[0];
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  // 1. Check Bank/Wallet Overdrafts (Critical)
  accounts
    .filter((a) => a.type !== 'credit_card' && a.balance < 0)
    .forEach((a) => {
      insights.push({
        id: `overdraft-${a.id}`,
        title: `Overdraft: ${a.name} is Negative`,
        description: `Current balance is ${formatCurrency(a.balance, a.currency || baseCurrency, numberFormat, isPrivacyMode)}. Deposit or transfer funds to prevent overdraft bank fees.`,
        category: 'overdraft',
        severity: 'critical',
        actionLabel: 'Transfer / Rebalance',
        targetRoute: '#/accounts',
        metric: formatCurrency(a.balance, a.currency || baseCurrency, numberFormat, isPrivacyMode),
      });
    });

  // 2. Check Budget Overruns & 85% Warning Thresholds (Critical / Warning)
  const currentMonthExpenses = transactions.filter(
    (t) => t.type === 'expense' && t.date >= startOfMonth
  );

  budgets.forEach((b) => {
    const cat = categories.find((c) => c.id === b.categoryId);
    const catName = cat?.name || 'Category';
    const spent = currentMonthExpenses
      .filter((t) => t.categoryId === b.categoryId)
      .reduce((sum, t) => sum + t.amount, 0);

    if (b.amount > 0 && spent > b.amount) {
      const overAmount = spent - b.amount;
      const pct = Math.round((spent / b.amount) * 100);
      insights.push({
        id: `budget-over-${b.id}`,
        title: `${catName} Budget Exceeded (${pct}%)`,
        description: `Spent ${formatCurrency(spent, baseCurrency, numberFormat, isPrivacyMode)} against ${formatCurrency(b.amount, baseCurrency, numberFormat, isPrivacyMode)} monthly limit (${formatCurrency(overAmount, baseCurrency, numberFormat, isPrivacyMode)} over budget).`,
        category: 'budget',
        severity: 'critical',
        actionLabel: 'Review Budget',
        targetRoute: '#/budgets',
        metric: `+${formatCompactCurrency(overAmount, baseCurrency, numberFormat, isPrivacyMode)} over`,
      });
    } else if (b.amount > 0 && spent / b.amount >= 0.85) {
      const rem = b.amount - spent;
      const pct = Math.round((spent / b.amount) * 100);
      insights.push({
        id: `budget-near-${b.id}`,
        title: `${catName} Approaching Limit (${pct}%)`,
        description: `${pct}% of monthly budget spent. Only ${formatCurrency(rem, baseCurrency, numberFormat, isPrivacyMode)} remaining for the rest of this month.`,
        category: 'budget',
        severity: 'warning',
        actionLabel: 'Check Spending',
        targetRoute: '#/budgets',
        metric: `${pct}% utilized`,
      });
    }
  });

  // 3. Custodial Overdue People Ledger Settlements (Critical / Warning)
  peopleLedger
    .filter((p) => p.status !== 'closed' && p.dueDate && p.dueDate < todayISO)
    .forEach((p) => {
      const settled = (p.settlements || []).reduce((s: number, st: { amount: number }) => s + st.amount, 0);
      const rem = Math.max(0, p.amount - settled);
      if (rem > 0) {
        const isReceivable = p.type === 'lent';
        insights.push({
          id: `people-overdue-${p.id}`,
          title: `Overdue: ${p.contactName} (${isReceivable ? 'Receivable' : 'Payable'})`,
          description: `${formatCurrency(rem, baseCurrency, numberFormat, isPrivacyMode)} ${isReceivable ? 'owed to you' : 'held by you'} was due on ${formatReadableDate(p.dueDate!)}. Follow up or record settlement.`,
          category: 'people',
          severity: 'warning',
          actionLabel: 'Open People Ledger',
          targetRoute: '#/people',
          metric: formatCurrency(rem, baseCurrency, numberFormat, isPrivacyMode),
          date: p.dueDate,
        });
      }
    });

  // 4. Planned Bills Due in Next 7 Days (Info)
  const next7DaysISO = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  plannedExpenses
    .filter((pe) => pe.dueDate && pe.dueDate >= todayISO && pe.dueDate <= next7DaysISO)
    .forEach((pe) => {
      insights.push({
        id: `bill-due-${pe.id}`,
        title: `Bill Due Soon: ${pe.name}`,
        description: `${formatCurrency(pe.amount, baseCurrency, numberFormat, isPrivacyMode)} due on ${formatReadableDate(pe.dueDate)}. Ensure sufficient bank balance.`,
        category: 'bill',
        severity: 'info',
        actionLabel: 'View Planned Bills',
        targetRoute: '#/plans',
        metric: formatCurrency(pe.amount, baseCurrency, numberFormat, isPrivacyMode),
        date: pe.dueDate,
      });
    });

  // 5. Credit Card Outstanding Revolving Balance (Warning)
  const totalCreditDebt = accounts
    .filter((a) => a.type === 'credit_card' && a.balance < 0)
    .reduce((sum, a) => sum + Math.abs(a.balance), 0);

  if (totalCreditDebt > 30000) {
    insights.push({
      id: 'credit-debt-high',
      title: 'High Credit Card Balance',
      description: `Total revolving credit card outstanding is ${formatCurrency(totalCreditDebt, baseCurrency, numberFormat, isPrivacyMode)}. Pay the total amount due before the cycle date to avoid high interest charges.`,
      category: 'debt',
      severity: 'warning',
      actionLabel: 'Manage Cards',
      targetRoute: '#/accounts',
      metric: formatCurrency(totalCreditDebt, baseCurrency, numberFormat, isPrivacyMode),
    });
  }

  // 6. Outstanding Loans & Liabilities (Info)
  const totalLoanPrincipal = liabilities.reduce((sum, l) => sum + l.outstandingBalance, 0);
  if (liabilities.length > 0 && totalLoanPrincipal > 0) {
    const highestInterestLoan = [...liabilities].sort((a, b) => b.interestRate - a.interestRate)[0];
    if (highestInterestLoan && highestInterestLoan.interestRate >= 10) {
      insights.push({
        id: `loan-interest-${highestInterestLoan.id}`,
        title: `High Interest Debt: ${highestInterestLoan.name} (${highestInterestLoan.interestRate}%)`,
        description: `Carrying ${formatCurrency(highestInterestLoan.outstandingBalance, baseCurrency, numberFormat, isPrivacyMode)} at ${highestInterestLoan.interestRate}% interest. Consider prepayment to reduce interest outlay.`,
        category: 'debt',
        severity: 'info',
        actionLabel: 'View Debt Schedule',
        targetRoute: '#/assets',
        metric: `${highestInterestLoan.interestRate}% APR`,
      });
    }
  }

  // 7. Positive Health Status (if no critical or warning items)
  const hasCriticalOrWarning = insights.some(
    (i) => i.severity === 'critical' || i.severity === 'warning'
  );

  if (!hasCriticalOrWarning && budgets.length > 0) {
    insights.push({
      id: 'positive-budget-health',
      title: 'All Budgets On Track',
      description: 'Your expenses across all categories are operating comfortably within allocated limits this month.',
      category: 'savings',
      severity: 'positive',
      actionLabel: 'View Reports',
      targetRoute: '#/reports',
    });
  }

  // Sort critical first, then warning, then info, then positive
  const severityRank = { critical: 0, warning: 1, info: 2, positive: 3 };
  return insights.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
}
