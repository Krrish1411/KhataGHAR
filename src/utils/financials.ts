import type { Account, Transaction, PeopleLedgerEntry, Budget, Liability, Asset } from '../types';

export interface DerivedFinancials {
  liquidBalance: number;
  creditOutstanding: number;
  totalAssets: number;
  totalLiabilities: number;
  reservedHolding: number;
  reservedBorrowed: number;
  givenOutTotal: number;
  reservedTotal: number;
  committedTotal: number;
  availableToSpend: number;
  netWorth: number;
  thisMonthIncome: number;
  thisMonthExpense: number;
  lastMonthIncome: number;
  lastMonthExpense: number;
  savingsRate: number;
  expenseRatio: number;
  avgMonthlyExpense: number;
  liquidityRatio: number;
  debtToIncome: number;
  series: Array<{ key: string; label: string; income: number; expense: number; netWorth: number }>;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const r2 = (v: number) => Math.round(v * 100) / 100;

export function computeDerivedFinancials(
  accounts: Account[],
  transactions: Transaction[],
  peopleLedger: PeopleLedgerEntry[],
  budgets: Budget[],
  assets: Asset[] = [],
  liabilities: Liability[] = []
): DerivedFinancials {
  const now = new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const monthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const thisMonthKey = monthKey(now);
  const lastMonthKey = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  // 1. Account Balances
  // Non-credit balances count towards liquid money
  const liquidBalance = accounts
    .filter((a) => a.type !== 'credit_card')
    .reduce((sum, a) => sum + Math.max(0, a.balance), 0);

  // Credit card debt is negative balance on credit accounts
  const creditOutstanding = Math.max(
    0,
    -accounts.filter((a) => a.type === 'credit_card').reduce((sum, a) => sum + Math.min(0, a.balance), 0)
  );

  const extraAssetsVal = assets.reduce((sum, a) => sum + (a.currentValue || 0), 0);
  const extraLiabVal = liabilities.reduce((sum, l) => sum + (l.outstandingBalance || 0), 0);
  const monthlyEMIs = liabilities.reduce((sum, l) => sum + (l.emiAmount || 0), 0);

  const totalAssets = accounts.reduce((sum, a) => sum + Math.max(0, a.balance), 0) + extraAssetsVal;
  const totalLiabilities = creditOutstanding + extraLiabVal;

  // 2. People Ledger ("Not Your Money")
  const activeEntries = peopleLedger.filter((p) => p.status !== 'closed');
  let reservedHolding = 0;
  let reservedBorrowed = 0;
  let givenOutTotal = 0;

  activeEntries.forEach((p) => {
    const settled = (p.settlements || []).reduce((s, st) => s + st.amount, 0);
    const rem = Math.max(0, p.amount - settled);
    if (p.type === 'holding') reservedHolding += rem;
    else if (p.type === 'borrowed') reservedBorrowed += rem;
    else if (p.type === 'lent') givenOutTotal += rem;
  });

  const reservedTotal = reservedHolding + reservedBorrowed;

  // 3. Committed Upcoming Bills (Active budgets or EMIs)
  const totalBudgeted = budgets.reduce((sum, b) => sum + b.amount, 0);
  const committedTotal = totalBudgeted + monthlyEMIs;

  // 4. Available to Spend: True liquid liquidity minus non-owned money & half of committed budget
  const availableToSpend = r2(Math.max(0, liquidBalance - reservedTotal - Math.min(liquidBalance * 0.3, committedTotal)));

  // 5. Net Worth Formula: Assets − Liabilities − Money held for others + Money given out
  const netWorth = r2(totalAssets - totalLiabilities - reservedHolding - reservedBorrowed + givenOutTotal);

  // 6. Monthly Cash Flows
  const sumMonth = (key: string) => {
    let income = 0;
    let expense = 0;
    for (const t of transactions) {
      if (!t.date.startsWith(key)) continue;
      if (t.type === 'income') income += t.amount;
      else if (t.type === 'expense') expense += t.amount;
    }
    return { income, expense };
  };

  const thisM = sumMonth(thisMonthKey);
  const lastM = sumMonth(lastMonthKey);

  // Average over past 3 months for vitals
  const expPast: number[] = [];
  const incPast: number[] = [];
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const s = sumMonth(monthKey(d));
    expPast.push(s.expense);
    incPast.push(s.income);
  }
  const avgMonthlyExpense = (expPast.reduce((s, v) => s + v, 0) || thisM.expense) / 3;
  const avgMonthlyIncome = (incPast.reduce((s, v) => s + v, 0) || thisM.income) / 3;

  // 7. Money Vitals / Ratios
  const savingsRate = thisM.income > 0 ? (thisM.income - thisM.expense) / thisM.income : 0;
  const expenseRatio = thisM.income > 0 ? thisM.expense / thisM.income : 0;
  const liquidityRatio = avgMonthlyExpense > 0 ? liquidBalance / avgMonthlyExpense : 0;
  const debtToIncome = avgMonthlyIncome > 0 ? (creditOutstanding + reservedBorrowed + monthlyEMIs) / avgMonthlyIncome : 0;

  // 8. 8-Month Historical Trajectory
  const series: Array<{ key: string; label: string; income: number; expense: number; netWorth: number }> = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    const { income, expense } = sumMonth(key);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const endISO = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;

    // Net worth at this point in time
    let historicalLiquid = 0;
    for (const a of accounts) {
      let accBal = a.balance;
      for (const t of transactions) {
        if (t.date > endISO) {
          if (t.accountId === a.id) {
            if (t.type === 'income') accBal -= t.amount;
            else if (t.type === 'expense') accBal += t.amount;
            else if (t.type === 'transfer') accBal += t.amount;
          }
          if (t.toAccountId === a.id && t.type === 'transfer') {
            accBal -= t.amount;
          }
        }
      }
      if (a.type !== 'credit_card') historicalLiquid += Math.max(0, accBal);
    }

    const nw = historicalLiquid - creditOutstanding + extraAssetsVal - extraLiabVal - reservedTotal + givenOutTotal;
    series.push({
      key,
      label: `${MONTH_NAMES[d.getMonth()]} ${`${d.getFullYear()}`.slice(2)}`,
      income,
      expense,
      netWorth: Math.round(nw),
    });
  }

  return {
    liquidBalance: r2(liquidBalance),
    creditOutstanding: r2(creditOutstanding),
    totalAssets: r2(totalAssets),
    totalLiabilities: r2(totalLiabilities),
    reservedHolding: r2(reservedHolding),
    reservedBorrowed: r2(reservedBorrowed),
    givenOutTotal: r2(givenOutTotal),
    reservedTotal: r2(reservedTotal),
    committedTotal: r2(committedTotal),
    availableToSpend: r2(availableToSpend),
    netWorth: r2(netWorth),
    thisMonthIncome: r2(thisM.income),
    thisMonthExpense: r2(thisM.expense),
    lastMonthIncome: r2(lastM.income),
    lastMonthExpense: r2(lastM.expense),
    savingsRate: r2(savingsRate),
    expenseRatio: r2(expenseRatio),
    avgMonthlyExpense: r2(avgMonthlyExpense),
    liquidityRatio: r2(liquidityRatio),
    debtToIncome: r2(debtToIncome),
    series,
  };
}
