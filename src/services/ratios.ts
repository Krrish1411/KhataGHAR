import type {
  Account,
  Transaction,
  Category,
  PeopleLedgerEntry,
  Budget,
  Asset,
  Liability,
  FinancialRatios,
  HealthScoreBreakdown,
} from '../types';

export interface RatioCalculatorParams {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  peopleLedger: PeopleLedgerEntry[];
  budgets: Budget[];
  assets: Asset[];
  liabilities: Liability[];
  startDate?: string;
  endDate?: string;
}

export function computeFinancialRatios(params: RatioCalculatorParams): FinancialRatios {
  const { accounts, transactions, categories, peopleLedger, liabilities, assets, startDate, endDate } = params;

  // Filter transactions within selected period (if provided)
  const periodTxs = transactions.filter((tx) => {
    if (startDate && tx.date < startDate) return false;
    if (endDate && tx.date > endDate) return false;
    return true;
  });

  // Pure Operating Income vs Capital/Financing movements
  let operatingIncome = 0;
  let realizedCapitalGains = 0;
  let operatingExpense = 0;
  let essentialExpense = 0;
  let discretionaryExpense = 0;
  let recurringExpense = 0;
  let investedCapital = 0;
  let assetRedemptions = 0;

  const categoryMap = new Map<string, Category>(categories.map((c) => [c.id, c]));

  periodTxs.forEach((tx) => {
    const isAssetSale =
      tx.subType === 'asset_sale' ||
      (Boolean(tx.linkedAssetId) && tx.type === 'income') ||
      Boolean(tx.tags && tx.tags.includes('asset-sale'));

    const isInvestment =
      tx.subType === 'investment' ||
      (Boolean(tx.linkedAssetId) && tx.type === 'expense') ||
      Boolean(tx.tags && tx.tags.includes('investment'));

    const isLoanInflow =
      tx.subType === 'loan_received' ||
      (Boolean(tx.linkedLiabilityId) && tx.type === 'income') ||
      Boolean(tx.tags && tx.tags.includes('loan-disbursement'));

    const isDebtPaydown =
      tx.subType === 'debt_payment' ||
      (Boolean(tx.linkedLiabilityId) && tx.type === 'expense');

    if (tx.type === 'income') {
      if (isAssetSale) {
        assetRedemptions += tx.amount;
        if (tx.realizedGain !== undefined) {
          realizedCapitalGains += tx.realizedGain;
        }
      } else if (!isLoanInflow) {
        // Pure operational income (Salary, Business, Freelance, Dividends, etc.)
        operatingIncome += tx.amount;
      }
    } else if (tx.type === 'expense') {
      if (isInvestment) {
        investedCapital += tx.amount;
      } else if (!isDebtPaydown) {
        // Pure operational expense
        const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : undefined;
        const isCatInvestment = cat && (cat.name.toLowerCase().includes('invest') || cat.name.toLowerCase().includes('sip'));

        if (isCatInvestment) {
          investedCapital += tx.amount;
        } else {
          operatingExpense += tx.amount;
          if (tx.isRecurring) {
            recurringExpense += tx.amount;
          }

          if (cat) {
            if (cat.isEssential) {
              essentialExpense += tx.amount;
            } else {
              discretionaryExpense += tx.amount;
            }
          } else {
            discretionaryExpense += tx.amount;
          }
        }
      }
    }
  });

  // Total economic income = Pure Operating Income + Net Realized Capital Gains
  const totalEconomicIncome = Math.max(0, operatingIncome + realizedCapitalGains);
  const totalOperatingExpense = operatingExpense;

  // Savings rate based on pure operating performance
  const netOperatingSavings = totalEconomicIncome - totalOperatingExpense;
  const savingsRate = totalEconomicIncome > 0 ? (netOperatingSavings / totalEconomicIncome) * 100 : 0;
  const expenseToIncomeRatio = totalEconomicIncome > 0 ? totalOperatingExpense / totalEconomicIncome : totalOperatingExpense > 0 ? 1 : 0;

  // Liabilities & Debt Servicing
  const totalDebtValue = liabilities.reduce((sum, l) => sum + l.outstandingBalance, 0);
  const totalMonthlyEMI = liabilities.reduce((sum, l) => sum + (l.emiAmount || 0), 0);

  // When debt is 0, DTI is strictly 0 (Debt-Free)
  const debtToIncomeRatio = totalDebtValue === 0 || totalMonthlyEMI === 0
    ? 0
    : totalEconomicIncome > 0
    ? totalMonthlyEMI / totalEconomicIncome
    : 1;

  // Essential vs Discretionary spend ratio
  const essentialSpendRatio = totalOperatingExpense > 0 ? (essentialExpense / totalOperatingExpense) * 100 : 50;
  const discretionarySpendRatio = totalOperatingExpense > 0 ? (discretionaryExpense / totalOperatingExpense) * 100 : 50;

  // Days in period
  let daysInPeriod = 30;
  if (startDate && endDate) {
    const s = new Date(startDate + 'T00:00:00');
    const e = new Date(endDate + 'T00:00:00');
    daysInPeriod = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  }

  const averageDailySpend = totalOperatingExpense / daysInPeriod;
  const expenseTxs = periodTxs.filter((t) => t.type === 'expense');
  const averageTransactionSize = expenseTxs.length > 0 ? totalOperatingExpense / expenseTxs.length : 0;

  // Liquid assets (bank accounts + cash + liquid wallets)
  const liquidAccountsBalance = accounts
    .filter((a) => ['bank', 'cash', 'wallet', 'upi'].includes(a.type))
    .reduce((sum, a) => sum + a.balance, 0);

  // Net Burn Rate: Total monthly outlays minus monthly income
  const monthlyGrossBurn = (averageDailySpend * 30) + totalMonthlyEMI;
  const monthlyIncomeVelocity = (totalEconomicIncome / daysInPeriod) * 30;
  const netMonthlyBurn = Math.max(0, monthlyGrossBurn - monthlyIncomeVelocity);

  // Runway: If cashflow positive (income >= outflows), runway is infinite (flagged as 999)
  const runwayMonths = netMonthlyBurn === 0 ? 999 : (liquidAccountsBalance > 0 ? liquidAccountsBalance / netMonthlyBurn : 0);
  const emergencyFundCoverageMonths = monthlyGrossBurn > 0 ? liquidAccountsBalance / monthlyGrossBurn : 999;

  // Net Investment Rate = (Invested - Redemptions) / Income
  const netInvested = Math.max(0, investedCapital - assetRedemptions);
  const investmentRate = totalEconomicIncome > 0 ? (netInvested / totalEconomicIncome) * 100 : 0;

  // Short term liabilities (credit card balances + due EMIs next 3 months)
  const shortTermDebt = liabilities
    .filter((l) => l.type === 'credit_card')
    .reduce((sum, l) => sum + l.outstandingBalance, 0) + totalMonthlyEMI * 3;

  // Liquidity Ratio (-1 indicates Debt-Free / fully liquid)
  const liquidityRatio = shortTermDebt === 0 ? -1 : (liquidAccountsBalance > 0 ? liquidAccountsBalance / shortTermDebt : 0);

  // People Ledger Net Position = Lent - Borrowed
  let totalLent = 0;
  let totalBorrowed = 0;
  peopleLedger.forEach((entry) => {
    const settledAmount = (entry.settlements || []).reduce((s, r) => s + r.amount, 0);
    const outstanding = Math.max(0, entry.amount - settledAmount);
    if (entry.type === 'lent') totalLent += outstanding;
    else if (entry.type === 'borrowed') totalBorrowed += outstanding;
  });
  const peopleNetPosition = totalLent - totalBorrowed;

  // Recurring vs one-time expense ratio
  const recurringExpenseRatio = totalOperatingExpense > 0 ? (recurringExpense / totalOperatingExpense) * 100 : 0;

  // Asset-to-debt ratio (-1 indicates Debt-Free / Infinite coverage)
  const totalAssetsValue =
    assets.reduce((sum, a) => sum + a.currentValue, 0) + liquidAccountsBalance;
  const assetToDebtRatio = totalDebtValue === 0 ? -1 : (totalAssetsValue / totalDebtValue);

  return {
    savingsRate: Math.max(-100, Math.min(100, savingsRate)),
    expenseToIncomeRatio,
    debtToIncomeRatio,
    essentialSpendRatio,
    discretionarySpendRatio,
    averageDailySpend,
    averageTransactionSize,
    burnRateMonthly: monthlyGrossBurn,
    runwayMonths: Math.max(0, runwayMonths),
    emergencyFundCoverageMonths: Math.max(0, emergencyFundCoverageMonths),
    netWorthGrowthMoM: 0,
    netWorthGrowthYoY: 0,
    investmentRate,
    liquidityRatio,
    peopleNetPosition,
    recurringExpenseRatio,
    assetToDebtRatio,
  };
}

// Compute composite Financial Health Score (0 - 100)
export function computeHealthScore(params: RatioCalculatorParams): HealthScoreBreakdown {
  const ratios = computeFinancialRatios(params);
  const { budgets, transactions } = params;

  const strengths: string[] = [];
  const improvements: string[] = [];

  // 1. Savings Rate Score (Weight: 30%)
  // Target: 30%+ for full score, 20% is decent, <0% is poor
  let srScore = 0;
  let srStatus = '';
  let srAdvice = '';
  if (ratios.savingsRate >= 35) {
    srScore = 30;
    srStatus = 'Excellent';
    srAdvice = 'Superb savings discipline. Keep compounding your surplus.';
    strengths.push(`High savings rate of ${ratios.savingsRate.toFixed(1)}%`);
  } else if (ratios.savingsRate >= 20) {
    srScore = 24;
    srStatus = 'Good';
    srAdvice = 'Healthy savings rate. Aim to increase to 30%+ over time.';
    strengths.push(`Healthy savings rate of ${ratios.savingsRate.toFixed(1)}%`);
  } else if (ratios.savingsRate >= 10) {
    srScore = 16;
    srStatus = 'Fair';
    srAdvice = 'Try curbing discretionary expenses to save more.';
    improvements.push('Savings rate is below 20% target');
  } else if (ratios.savingsRate > 0) {
    srScore = 8;
    srStatus = 'Low';
    srAdvice = 'Expenses are consuming almost all income.';
    improvements.push('Savings rate is critically low (<10%)');
  } else {
    srScore = 0;
    srStatus = 'Deficit';
    srAdvice = 'You are spending more than you earn this period.';
    improvements.push('Operating at an expense deficit');
  }

  // 2. Debt-to-Income Score (Weight: 25%)
  // Target: <= 20% full score, 20-35% good, 35-50% cautionary, >50% high risk
  let dtiScore = 0;
  let dtiStatus = '';
  let dtiAdvice = '';
  const dtiPercent = ratios.debtToIncomeRatio * 100;
  if (dtiPercent === 0) {
    dtiScore = 25;
    dtiStatus = 'Debt-Free ✨';
    dtiAdvice = 'Zero debt obligations maximize your cashflow flexibility.';
    strengths.push('100% Debt-Free financial structure');
  } else if (dtiPercent <= 15) {
    dtiScore = 25;
    dtiStatus = 'Very Low Debt';
    dtiAdvice = 'Minimal debt burden provides strong financial flexibility.';
    strengths.push('Low debt-to-income ratio (<15%)');
  } else if (dtiPercent <= 30) {
    dtiScore = 20;
    dtiStatus = 'Manageable';
    dtiAdvice = 'Debt EMIs are well within safe thresholds.';
    strengths.push('Manageable debt obligations');
  } else if (dtiPercent <= 45) {
    dtiScore = 12;
    dtiStatus = 'Elevated';
    dtiAdvice = 'Debt payments take a significant share of income. Avoid new loans.';
    improvements.push(`Elevated debt servicing (${dtiPercent.toFixed(0)}% of income)`);
  } else {
    dtiScore = 4;
    dtiStatus = 'High Risk';
    dtiAdvice = 'High debt burden. Focus aggressively on debt paydown.';
    improvements.push('High debt-to-income ratio (>45%)');
  }

  // 3. Emergency Fund Coverage Score (Weight: 20%)
  // Target: >= 6 months expenses covered in liquid accounts
  let efScore = 0;
  let efStatus = '';
  let efAdvice = '';
  if (ratios.emergencyFundCoverageMonths >= 6) {
    efScore = 20;
    efStatus = 'Fully Secured';
    efAdvice = ratios.emergencyFundCoverageMonths >= 999
      ? 'Outstanding liquid cushion covering all planned expenses.'
      : `You have ${ratios.emergencyFundCoverageMonths.toFixed(1)} months of expenses saved in liquid funds.`;
    strengths.push(ratios.emergencyFundCoverageMonths >= 999 ? 'Fully funded liquid buffer' : `${ratios.emergencyFundCoverageMonths.toFixed(1)} months emergency buffer`);
  } else if (ratios.emergencyFundCoverageMonths >= 3) {
    efScore = 14;
    efStatus = 'Adequate';
    efAdvice = 'You have 3-6 months buffer. Aim to build up to 6 months.';
    strengths.push('Adequate 3+ months emergency cushion');
  } else if (ratios.emergencyFundCoverageMonths >= 1) {
    efScore = 8;
    efStatus = 'Thin';
    efAdvice = 'Less than 3 months buffer. Prioritize emergency savings.';
    improvements.push('Emergency fund is below recommended 3-6 months buffer');
  } else {
    efScore = 2;
    efStatus = 'Critical';
    efAdvice = 'Less than 1 month runway in liquid accounts. Vulnerable to shocks.';
    improvements.push('Critical: Liquid runway is less than 1 month');
  }

  // 4. Budget Adherence Score (Weight: 15%)
  // Compare category spends against active budgets
  let budgetScore = 15;
  let budgetStatus = 'No Overspends';
  let budgetAdvice = 'Spending is within budgeted caps.';
  if (budgets.length > 0) {
    let overBudgetCount = 0;
    budgets.forEach((b) => {
      const spent = transactions
        .filter((t) => t.type === 'expense' && t.categoryId === b.categoryId)
        .reduce((sum, t) => sum + t.amount, 0);
      if (spent > b.amount) {
        overBudgetCount++;
      }
    });

    if (overBudgetCount === 0) {
      budgetScore = 15;
      budgetStatus = '100% Adherence';
      budgetAdvice = 'All active budgets are on-track.';
      strengths.push('Consistent budget discipline');
    } else if (overBudgetCount <= 2) {
      budgetScore = 10;
      budgetStatus = 'Minor Overspend';
      budgetAdvice = `${overBudgetCount} budget categories have exceeded their limit.`;
      improvements.push(`${overBudgetCount} budget categories exceeded`);
    } else {
      budgetScore = 4;
      budgetStatus = 'Frequent Overspending';
      budgetAdvice = 'Multiple categories have breached budgets.';
      improvements.push('Multiple budget categories breached');
    }
  } else {
    budgetScore = 10; // Neutral if no budgets set
    budgetStatus = 'Unbudgeted';
    budgetAdvice = 'Set category budgets to track adherence.';
  }

  // 5. Net Worth & Balance Position Score (Weight: 10%)
  const totalAssets = params.assets.reduce((sum, a) => sum + a.currentValue, 0) +
    params.accounts.reduce((sum, a) => sum + a.balance, 0);
  const totalLiabilities = params.liabilities.reduce((sum, l) => sum + l.outstandingBalance, 0);
  const netWorth = totalAssets - totalLiabilities + ratios.peopleNetPosition;

  let nwScore = 0;
  let nwStatus = '';
  let nwAdvice = '';
  if (totalLiabilities === 0 && totalAssets > 0) {
    nwScore = 10;
    nwStatus = 'Debt-Free & Solvent';
    nwAdvice = 'Clean balance sheet with zero debt liabilities.';
    strengths.push('100% Debt-free positive net worth');
  } else if (netWorth > totalLiabilities * 2 && netWorth > 0) {
    nwScore = 10;
    nwStatus = 'Strong Positive';
    nwAdvice = 'Assets comfortably exceed all obligations.';
    strengths.push('Solid positive net worth');
  } else if (netWorth > 0) {
    nwScore = 7;
    nwStatus = 'Positive';
    nwAdvice = 'Net worth is positive. Continue growing asset base.';
  } else {
    nwScore = 2;
    nwStatus = 'Negative Net Worth';
    nwAdvice = 'Liabilities exceed assets. Focus on debt consolidation.';
    improvements.push('Negative net worth position');
  }

  const totalScore = Math.round(srScore + dtiScore + efScore + budgetScore + nwScore);

  let rating: HealthScoreBreakdown['rating'] = 'Fair';
  if (totalScore >= 85) rating = 'Excellent';
  else if (totalScore >= 70) rating = 'Strong';
  else if (totalScore >= 50) rating = 'Good';
  else if (totalScore >= 35) rating = 'Fair';
  else rating = 'Critical';

  return {
    score: Math.min(100, Math.max(0, totalScore)),
    rating,
    savingsRateScore: { value: ratios.savingsRate, score: srScore, weight: 30, status: srStatus, advice: srAdvice },
    debtToIncomeScore: { value: dtiPercent, score: dtiScore, weight: 25, status: dtiStatus, advice: dtiAdvice },
    emergencyFundScore: {
      value: ratios.emergencyFundCoverageMonths,
      score: efScore,
      weight: 20,
      status: efStatus,
      advice: efAdvice,
    },
    budgetAdherenceScore: { value: 0, score: budgetScore, weight: 15, status: budgetStatus, advice: budgetAdvice },
    netWorthTrendScore: { value: netWorth, score: nwScore, weight: 10, status: nwStatus, advice: nwAdvice },
    keyStrengths: strengths.length > 0 ? strengths : ['Stable financial tracking'],
    keyImprovements: improvements.length > 0 ? improvements : ['Maintain current savings cadence'],
  };
}
