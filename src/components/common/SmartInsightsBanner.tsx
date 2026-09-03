import React, { useMemo, useState } from 'react';
import { Sparkles, AlertTriangle, TrendingUp, Calendar, Wallet, ChevronRight, X, ShieldAlert } from 'lucide-react';
import { formatCurrency, formatCompactCurrency } from '../../utils/formatters';
import type { Account, CurrencyCode, NumberFormatType, PeopleLedgerEntry, Transaction, Liability } from '../../types';

export interface SmartInsight {
  id: string;
  type: 'pace' | 'bill' | 'cash' | 'custodial' | 'budget';
  title: string;
  message: string;
  tone: 'positive' | 'attention' | 'danger' | 'info';
  actionLabel?: string;
  onAction?: () => void;
}

interface SmartInsightsBannerProps {
  accounts: Account[];
  transactions: Transaction[];
  peopleLedger: PeopleLedgerEntry[];
  liabilities: Liability[];
  baseCurrency: CurrencyCode;
  numberFormat: NumberFormatType;
  isPrivacyMode?: boolean;
  className?: string;
}

export const SmartInsightsBanner: React.FC<SmartInsightsBannerProps> = ({
  accounts,
  transactions,
  peopleLedger,
  liabilities,
  baseCurrency,
  numberFormat,
  isPrivacyMode = false,
  className = '',
}) => {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const insights: SmartInsight[] = useMemo(() => {
    const list: SmartInsight[] = [];
    const now = new Date();
    const currentDay = now.getDate();
    const thisMonthPrefix = now.toISOString().slice(0, 7);

    // Prior month prefix
    const priorDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const priorMonthPrefix = priorDate.toISOString().slice(0, 7);

    // 1. Pace vs Last Month
    let thisMonthExpense = 0;
    let thisMonthIncome = 0;
    let lastMonthExpenseToDate = 0;

    transactions.forEach((tx) => {
      const txDay = parseInt(tx.date.slice(8, 10), 10);
      if (tx.date.startsWith(thisMonthPrefix)) {
        if (tx.type === 'expense') thisMonthExpense += tx.amount;
        if (tx.type === 'income') thisMonthIncome += tx.amount;
      } else if (tx.date.startsWith(priorMonthPrefix) && txDay <= currentDay) {
        if (tx.type === 'expense') lastMonthExpenseToDate += tx.amount;
      }
    });

    const diff = lastMonthExpenseToDate - thisMonthExpense;
    if (lastMonthExpenseToDate > 0) {
      if (diff > 0) {
        list.push({
          id: 'pace-ahead',
          type: 'pace',
          title: 'Ahead of Last Month',
          message: `You've spent ${isPrivacyMode ? '••••' : formatCompactCurrency(diff, baseCurrency, numberFormat, false)} less than this time last month.`,
          tone: 'positive',
        });
      } else if (diff < -2000) {
        list.push({
          id: 'pace-behind',
          type: 'pace',
          title: 'Higher Spend Velocity',
          message: `Outflows are running ${isPrivacyMode ? '••••' : formatCompactCurrency(Math.abs(diff), baseCurrency, numberFormat, false)} higher than this date last month.`,
          tone: 'attention',
        });
      }
    }

    // 2. Upcoming EMIs / Bills
    liabilities.forEach((l) => {
      if (l.emiAmount && l.nextDueDate) {
        const dueDate = new Date(l.nextDueDate);
        const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          list.push({
            id: `bill-overdue-${l.id}`,
            type: 'bill',
            title: 'Payment Overdue',
            message: `${l.name} (${isPrivacyMode ? '••••' : formatCurrency(l.emiAmount, baseCurrency, numberFormat, false)}) was due ${Math.abs(diffDays)} days ago.`,
            tone: 'danger',
          });
        } else if (diffDays <= 7) {
          list.push({
            id: `bill-due-${l.id}`,
            type: 'bill',
            title: 'Payment Due Soon',
            message: `${l.name} EMI due in ${diffDays} day${diffDays === 1 ? '' : 's'} (${isPrivacyMode ? '••••' : formatCurrency(l.emiAmount, baseCurrency, numberFormat, false)}).`,
            tone: 'attention',
          });
        }
      }
    });

    // 3. Cash in Hand Running Low Check
    const cashAcc = accounts.find((a) => a.type === 'cash');
    if (cashAcc && cashAcc.balance < 2500 && cashAcc.balance >= 0) {
      list.push({
        id: 'cash-low',
        type: 'cash',
        title: 'Low Cash In Hand',
        message: `Your cash in hand is ${isPrivacyMode ? '••••' : formatCurrency(cashAcc.balance, baseCurrency, numberFormat, false)}. Consider a small bank withdrawal.`,
        tone: 'attention',
      });
    }

    // 4. Custodial Funds Approaching Return
    peopleLedger.forEach((p) => {
      if (p.dueDate) {
        const dDate = new Date(p.dueDate);
        const diffDays = Math.ceil((dDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const remaining = p.amount - p.settlements.reduce((s, x) => s + x.amount, 0);

        if (remaining > 0 && diffDays <= 7) {
          if (p.type === 'holding') {
            list.push({
              id: `custodial-${p.id}`,
              type: 'custodial',
              title: 'Custodial Return Approaching',
              message: `${p.contactName}'s holding of ${isPrivacyMode ? '••••' : formatCurrency(remaining, baseCurrency, numberFormat, false)} is expected in ${diffDays} days.`,
              tone: 'info',
            });
          } else if (p.type === 'borrowed') {
            list.push({
              id: `borrowed-${p.id}`,
              type: 'custodial',
              title: 'Loan Repayment Due',
              message: `Repayment to ${p.contactName} (${isPrivacyMode ? '••••' : formatCurrency(remaining, baseCurrency, numberFormat, false)}) is due in ${diffDays} days.`,
              tone: 'attention',
            });
          }
        }
      }
    });

    return list;
  }, [accounts, transactions, peopleLedger, liabilities, baseCurrency, numberFormat, isPrivacyMode]);

  const activeInsights = insights.filter((i) => !dismissedIds.has(i.id));

  if (activeInsights.length === 0) return null;

  return (
    <div className={`space-y-2.5 ${className}`}>
      {activeInsights.slice(0, 2).map((item) => {
        const toneStyles = {
          positive: 'bg-pine-50/80 dark:bg-pine-950/40 border-pine-200 dark:border-pine-800/40 text-pine-800 dark:text-pine-200',
          attention: 'bg-mari-50/80 dark:bg-mari-950/40 border-mari-200 dark:border-mari-800/40 text-mari-900 dark:text-mari-200',
          danger: 'bg-flare-100/70 dark:bg-flare-950/40 border-flare-300 dark:border-flare-800/40 text-flare-800 dark:text-flare-200',
          info: 'bg-skyx-100/70 dark:bg-skyx-950/40 border-skyx-200 dark:border-skyx-800/40 text-skyx-800 dark:text-skyx-200',
        }[item.tone];

        const iconNode = {
          positive: <TrendingUp className="w-4 h-4 text-pine-600 dark:text-pine-400 shrink-0" />,
          attention: <AlertTriangle className="w-4 h-4 text-mari-600 dark:text-mari-400 shrink-0" />,
          danger: <AlertTriangle className="w-4 h-4 text-flare-600 dark:text-flare-400 shrink-0" />,
          info: <ShieldAlert className="w-4 h-4 text-skyx-600 dark:text-skyx-400 shrink-0" />,
        }[item.tone];

        return (
          <div
            key={item.id}
            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border shadow-xs transition-all ${toneStyles}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {iconNode}
              <div className="text-xs min-w-0">
                <span className="font-bold mr-1.5 font-display tracking-wide">{item.title}:</span>
                <span className="opacity-90">{item.message}</span>
              </div>
            </div>

            <button
              onClick={() => setDismissedIds((prev) => new Set([...prev, item.id]))}
              className="p-1 rounded-lg opacity-40 hover:opacity-100 transition-opacity cursor-pointer shrink-0"
              aria-label="Dismiss insight"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
