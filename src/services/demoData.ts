// Realistic Indian Demo Data Seeder for Khata Ghar
import type {
  Account,
  Transaction,
  Category,
  PeopleLedgerEntry,
  Budget,
  SavingsGoal,
  Liability,
  Asset,
  PlannedExpense,
  CurrencyCode,
} from '../types';
import { generateUUID } from './storage';

export interface DemoDataset {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  peopleLedger: PeopleLedgerEntry[];
  budgets: Budget[];
  goals: SavingsGoal[];
  assets: Asset[];
  liabilities: Liability[];
  plannedExpenses: PlannedExpense[];
}

export function generateDemoDataset(vaultId: string, baseCurrency: CurrencyCode = 'INR'): DemoDataset {
  const now = new Date();
  const nowISO = now.toISOString();

  const addDays = (days: number): string => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const toISO = (d: Date): string => d.toISOString().split('T')[0];

  // 1. Categories
  const mkCat = (name: string, type: 'income' | 'expense', icon: string, color: string, isEssential: boolean): Category => ({
    id: generateUUID(),
    vaultId,
    name,
    type,
    icon,
    color,
    isEssential,
    updatedAt: nowISO,
  });

  const catSalary = mkCat('Salary', 'income', 'Briefcase', '#12855a', true);
  const catFreelance = mkCat('Freelance', 'income', 'Laptop', '#22c55e', false);
  const catRent = mkCat('Rent', 'expense', 'Home', '#e11d48', true);
  const catGroceries = mkCat('Groceries', 'expense', 'ShoppingCart', '#0ea5e9', true);
  const catDining = mkCat('Dining Out', 'expense', 'Utensils', '#f59e0b', false);
  const catUtilities = mkCat('Utilities', 'expense', 'Zap', '#8b5cf6', true);
  const catTransport = mkCat('Transport & Fuel', 'expense', 'Car', '#6366f1', true);
  const catInvestments = mkCat('SIP & Investments', 'expense', 'TrendingUp', '#10b981', true);
  const catSubscriptions = mkCat('Subscriptions', 'expense', 'Film', '#ec4899', false);

  const categories: Category[] = [
    catSalary,
    catFreelance,
    catRent,
    catGroceries,
    catDining,
    catUtilities,
    catTransport,
    catInvestments,
    catSubscriptions,
  ];

  // 2. Accounts
  const mkAcc = (name: string, type: Account['type'], balance: number): Account => ({
    id: generateUUID(),
    vaultId,
    name,
    type,
    balance,
    initialBalance: balance,
    currency: baseCurrency,
    tag: 'personal',
    isVisibleOnDashboard: true,
    updatedAt: nowISO,
  });

  const accHdfc = mkAcc('HDFC Bank ••4821', 'bank', 54200);
  const accCash = mkAcc('Cash in Hand', 'cash', 2350);
  const accPaytm = mkAcc('Paytm UPI Wallet', 'wallet', 1180);
  const accSbiCard = mkAcc('SBI Prime Credit Card', 'credit_card', -8420);

  const accounts: Account[] = [accHdfc, accCash, accPaytm, accSbiCard];

  // Helper for Transaction creation
  const mkTx = (tx: Omit<Transaction, 'id' | 'vaultId' | 'currency' | 'updatedAt'>): Transaction => ({
    id: generateUUID(),
    vaultId,
    currency: baseCurrency,
    updatedAt: nowISO,
    ...tx,
  });

  // 3. Transactions (Past 4 months of realistic history)
  const transactions: Transaction[] = [];

  for (let back = 3; back >= 0; back--) {
    const base = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const isCur = back === 0;
    const maxDay = isCur ? Math.max(2, now.getDate()) : 28;
    const d = (day: number) => toISO(new Date(base.getFullYear(), base.getMonth(), Math.min(day, maxDay)));

    // Income
    transactions.push(
      mkTx({
        accountId: accHdfc.id,
        amount: 52000,
        type: 'income',
        categoryId: catSalary.id,
        date: d(1),
        note: 'Salary — TCS Ltd',
        isRecurring: true,
      })
    );

    if (back % 2 === 1) {
      transactions.push(
        mkTx({
          accountId: accHdfc.id,
          amount: 8500 + back * 1200,
          type: 'income',
          categoryId: catFreelance.id,
          date: d(17),
          note: 'Freelance — UX Design Consultation',
        })
      );
    }

    // Fixed Outflows
    transactions.push(
      mkTx({
        accountId: accHdfc.id,
        amount: 14000,
        type: 'expense',
        categoryId: catRent.id,
        date: d(4),
        note: 'House Rent — Mrs. Sharma',
        isRecurring: true,
      })
    );

    transactions.push(
      mkTx({
        accountId: accHdfc.id,
        amount: 5000,
        type: 'expense',
        categoryId: catInvestments.id,
        date: d(6),
        note: 'SIP — Nifty 50 Index Fund',
        isRecurring: true,
      })
    );

    transactions.push(
      mkTx({
        accountId: accHdfc.id,
        amount: 1180,
        type: 'expense',
        categoryId: catUtilities.id,
        date: d(11),
        note: 'MSEB Electricity Bill',
      })
    );

    transactions.push(
      mkTx({
        accountId: accPaytm.id,
        amount: 299,
        type: 'expense',
        categoryId: catUtilities.id,
        date: d(3),
        note: 'Jio 5G Unlimited Recharge',
      })
    );

    transactions.push(
      mkTx({
        accountId: accSbiCard.id,
        amount: 199,
        type: 'expense',
        categoryId: catSubscriptions.id,
        date: d(15),
        note: 'Netflix Premium',
        isRecurring: true,
      })
    );

    // Groceries
    if (!isCur || maxDay >= 5) {
      transactions.push(
        mkTx({
          accountId: accHdfc.id,
          amount: 2650,
          type: 'expense',
          categoryId: catGroceries.id,
          date: d(5),
          note: 'DMart — Monthly Household Supplies',
        })
      );
    }
    if (!isCur || maxDay >= 12) {
      transactions.push(
        mkTx({
          accountId: accHdfc.id,
          amount: 1840,
          type: 'expense',
          categoryId: catGroceries.id,
          date: d(12),
          note: 'BigBasket Fresh Vegetables',
        })
      );
    }

    // Dining
    if (!isCur || maxDay >= 8) {
      transactions.push(
        mkTx({
          accountId: accPaytm.id,
          amount: 420,
          type: 'expense',
          categoryId: catDining.id,
          date: d(8),
          note: 'Swiggy — Biryani Dinner',
        })
      );
    }
    if (!isCur || maxDay >= 16) {
      transactions.push(
        mkTx({
          accountId: accCash.id,
          amount: 280,
          type: 'expense',
          categoryId: catDining.id,
          date: d(16),
          note: 'Local Cafe & Chai',
        })
      );
    }

    // Transport
    if (!isCur || maxDay >= 7) {
      transactions.push(
        mkTx({
          accountId: accSbiCard.id,
          amount: 1300,
          type: 'expense',
          categoryId: catTransport.id,
          date: d(7),
          note: 'Indian Oil — Petrol Fill-up',
        })
      );
    }
    if (!isCur || maxDay >= 14) {
      transactions.push(
        mkTx({
          accountId: accPaytm.id,
          amount: 240,
          type: 'expense',
          categoryId: catTransport.id,
          date: d(14),
          note: 'Uber Auto Commute',
        })
      );
    }

    // Transfer
    if (!isCur) {
      transactions.push(
        mkTx({
          accountId: accHdfc.id,
          toAccountId: accPaytm.id,
          amount: 2000,
          type: 'transfer',
          date: d(10),
          note: 'Wallet Top-up via UPI',
        })
      );
    }
  }

  // 4. People Ledger ("Not Your Money" / Custodial)
  const peopleLedger: PeopleLedgerEntry[] = [
    {
      id: generateUUID(),
      vaultId,
      contactName: 'Priya (sister)',
      contactPhone: '+91 98200 12345',
      accountId: accHdfc.id,
      type: 'holding',
      amount: 8000,
      currency: baseCurrency,
      date: addDays(-12),
      dueDate: addDays(6),
      status: 'open',
      notes: 'Wedding gift pool — return before engagement',
      settlements: [],
      updatedAt: nowISO,
    },
    {
      id: generateUUID(),
      vaultId,
      contactName: 'Amit (friend)',
      contactPhone: '+91 98450 67890',
      accountId: accCash.id,
      type: 'borrowed',
      amount: 5000,
      currency: baseCurrency,
      date: addDays(-40),
      dueDate: addDays(20),
      status: 'open',
      notes: 'Emergency medical top-up, repay after salary',
      settlements: [],
      updatedAt: nowISO,
    },
    {
      id: generateUUID(),
      vaultId,
      contactName: 'Rohit (cousin)',
      contactPhone: '+91 97110 54321',
      accountId: accHdfc.id,
      type: 'lent',
      amount: 3000,
      currency: baseCurrency,
      date: addDays(-9),
      dueDate: addDays(12),
      status: 'open',
      notes: 'Goa trip hotel advance bookings',
      settlements: [],
      updatedAt: nowISO,
    },
  ];

  // 5. Budgets
  const budgets: Budget[] = [
    {
      id: generateUUID(),
      vaultId,
      categoryId: catGroceries.id,
      period: 'monthly',
      amount: 8000,
      rollover: true,
      updatedAt: nowISO,
    },
    {
      id: generateUUID(),
      vaultId,
      categoryId: catDining.id,
      period: 'monthly',
      amount: 3500,
      rollover: false,
      updatedAt: nowISO,
    },
    {
      id: generateUUID(),
      vaultId,
      categoryId: catTransport.id,
      period: 'monthly',
      amount: 3000,
      rollover: false,
      updatedAt: nowISO,
    },
  ];

  // 6. Savings Goals
  const goals: SavingsGoal[] = [
    {
      id: generateUUID(),
      vaultId,
      name: 'Emergency Buffer (6 Mo)',
      targetAmount: 150000,
      currentAmount: 65000,
      targetDate: addDays(180),
      currency: baseCurrency,
      category: 'Safety',
      updatedAt: nowISO,
    },
    {
      id: generateUUID(),
      vaultId,
      name: 'Japan Autumn Trip',
      targetAmount: 200000,
      currentAmount: 45000,
      targetDate: addDays(240),
      currency: baseCurrency,
      category: 'Travel',
      updatedAt: nowISO,
    },
  ];

  // 7. Assets (All 10 Asset Types as per Indian Income Tax Wealth Disclosure / Balance Sheet)
  const assets: Asset[] = [
    {
      id: generateUUID(),
      vaultId,
      name: '2BHK High-Rise Apartment (Whitefield, Bengaluru)',
      type: 'property',
      currentValue: 8250000,
      currency: baseCurrency,
      purchaseDate: '2022-03-15',
      purchasePrice: 6500000,
      valuationHistory: [
        { id: generateUUID(), date: '2022-03-15', value: 6500000, note: 'Registry & Stamp Duty Purchase' },
        { id: generateUUID(), date: '2025-01-10', value: 8250000, note: 'Bank Refinance Valuation' },
      ],
      notes: 'Under HDFC Home Loan. Self-occupied primary residence.',
      updatedAt: nowISO,
    },
    {
      id: generateUUID(),
      vaultId,
      name: 'Ancestral Agricultural Land (1.2 Acres, Pune)',
      type: 'property',
      currentValue: 2800000,
      currency: baseCurrency,
      purchaseDate: '2017-08-20',
      purchasePrice: 1500000,
      valuationHistory: [
        { id: generateUUID(), date: '2017-08-20', value: 1500000, note: 'Inheritance Circle Rate' },
        { id: generateUUID(), date: '2024-11-05', value: 2800000, note: 'Local Circle Rate Revaluation' },
      ],
      notes: 'Clear 7/12 land extract. Agricultural revenue land.',
      updatedAt: nowISO,
    },
    {
      id: generateUUID(),
      vaultId,
      name: 'Hyundai Creta SX(O) Turbo DCT',
      type: 'vehicle',
      currentValue: 1280000,
      currency: baseCurrency,
      purchaseDate: '2023-05-10',
      purchasePrice: 1750000,
      valuationHistory: [
        { id: generateUUID(), date: '2023-05-10', value: 1750000, note: 'On-Road Invoice' },
        { id: generateUUID(), date: '2025-05-10', value: 1280000, note: 'IDV Insurance Declared Value' },
      ],
      notes: 'Comprehensive zero-dep insurance active.',
      updatedAt: nowISO,
    },
    {
      id: generateUUID(),
      vaultId,
      name: '24K Sovereign Gold Bonds (SGB 2020-Series VI)',
      type: 'gold',
      currentValue: 740000,
      currency: baseCurrency,
      purchaseDate: '2020-09-08',
      purchasePrice: 480000,
      maturityDate: '2028-09-08',
      valuationHistory: [
        { id: generateUUID(), date: '2020-09-08', value: 480000, note: 'RBI Issue Price ₹5,000/g' },
        { id: generateUUID(), date: '2025-08-01', value: 740000, note: 'Current Gold Rate ₹7,700/g' },
      ],
      notes: '2.5% semi-annual interest credited to HDFC. Tax exempt on maturity.',
      updatedAt: nowISO,
    },
    {
      id: generateUUID(),
      vaultId,
      name: 'Hallmarked 22K Physical Gold Jewelry & Coins',
      type: 'gold',
      currentValue: 980000,
      currency: baseCurrency,
      purchaseDate: '2019-10-25',
      purchasePrice: 650000,
      valuationHistory: [
        { id: generateUUID(), date: '2019-10-25', value: 650000, note: 'Tanishq Invoice' },
        { id: generateUUID(), date: '2025-07-15', value: 980000, note: 'Bank Locker Audit Valuation' },
      ],
      notes: 'Bank safety deposit locker in SBI.',
      updatedAt: nowISO,
    },
    {
      id: generateUUID(),
      vaultId,
      name: 'UTI Nifty 50 Index Fund Direct-Growth',
      type: 'mutual_fund',
      currentValue: 615000,
      currency: baseCurrency,
      purchaseDate: '2021-01-15',
      purchasePrice: 420000,
      valuationHistory: [
        { id: generateUUID(), date: '2021-01-15', value: 420000, note: 'Cumulative SIP Basis' },
        { id: generateUUID(), date: '2025-08-15', value: 615000, note: 'CAMS Portfolio Statement' },
      ],
      notes: '₹15,000/month recurring SIP mandate active.',
      updatedAt: nowISO,
    },
    {
      id: generateUUID(),
      vaultId,
      name: 'Parag Parikh Flexi Cap Fund Direct-Growth',
      type: 'mutual_fund',
      currentValue: 590000,
      currency: baseCurrency,
      purchaseDate: '2021-06-10',
      purchasePrice: 380000,
      valuationHistory: [
        { id: generateUUID(), date: '2021-06-10', value: 380000, note: 'Cost Basis' },
        { id: generateUUID(), date: '2025-08-15', value: 590000, note: 'CAMS Current NAV Valuation' },
      ],
      notes: 'Diversified equity exposure with international tech holding.',
      updatedAt: nowISO,
    },
    {
      id: generateUUID(),
      vaultId,
      name: 'Direct Equity Demat Portfolio (Zerodha Kite)',
      type: 'stock',
      currentValue: 785000,
      currency: baseCurrency,
      purchaseDate: '2020-04-10',
      purchasePrice: 550000,
      valuationHistory: [
        { id: generateUUID(), date: '2020-04-10', value: 550000, note: 'Acquisition Basis' },
        { id: generateUUID(), date: '2025-08-20', value: 785000, note: 'Live CDSL holding valuation' },
      ],
      notes: 'Blue-chip holdings: TCS (40 shares), Infosys (75 shares), Reliance (50 shares), HDFC Bank (80 shares).',
      updatedAt: nowISO,
    },
    {
      id: generateUUID(),
      vaultId,
      name: 'SBI 3-Year Cumulative Fixed Deposit (7.1% p.a.)',
      type: 'fd_rd',
      currentValue: 575000,
      currency: baseCurrency,
      purchaseDate: '2023-11-01',
      purchasePrice: 500000,
      maturityDate: '2026-11-01',
      valuationHistory: [
        { id: generateUUID(), date: '2023-11-01', value: 500000, note: 'Deposit certificate principal' },
        { id: generateUUID(), date: '2025-05-01', value: 575000, note: 'Principal + accrued interest' },
      ],
      notes: 'TDS deducted at source. Form 15G submitted.',
      updatedAt: nowISO,
    },
    {
      id: generateUUID(),
      vaultId,
      name: 'Public Provident Fund (PPF - 15 Year 80C Enclave)',
      type: 'epf_ppf_nps',
      currentValue: 840000,
      currency: baseCurrency,
      purchaseDate: '2016-04-05',
      purchasePrice: 600000,
      maturityDate: '2031-04-05',
      valuationHistory: [
        { id: generateUUID(), date: '2016-04-05', value: 600000, note: 'Cumulative deposits' },
        { id: generateUUID(), date: '2025-03-31', value: 840000, note: 'Annual interest capitalization' },
      ],
      notes: 'EEE sovereign tax-free status under Section 80C. 7.1% interest rate.',
      updatedAt: nowISO,
    },
    {
      id: generateUUID(),
      vaultId,
      name: 'Employee Provident Fund (EPF Passbook UAN)',
      type: 'epf_ppf_nps',
      currentValue: 1020000,
      currency: baseCurrency,
      purchaseDate: '2018-07-01',
      purchasePrice: 750000,
      valuationHistory: [
        { id: generateUUID(), date: '2018-07-01', value: 750000, note: 'Historical employee+employer contributions' },
        { id: generateUUID(), date: '2025-04-01', value: 1020000, note: 'EPFO audited passbook credit' },
      ],
      notes: 'Linked to Aadhaar verified UAN.',
      updatedAt: nowISO,
    },
    {
      id: generateUUID(),
      vaultId,
      name: 'Tier-1 National Pension System (NPS - 80CCD)',
      type: 'epf_ppf_nps',
      currentValue: 465000,
      currency: baseCurrency,
      purchaseDate: '2019-10-10',
      purchasePrice: 300000,
      maturityDate: '2050-06-30',
      valuationHistory: [
        { id: generateUUID(), date: '2019-10-10', value: 300000, note: 'Cumulative contributions' },
        { id: generateUUID(), date: '2025-08-01', value: 465000, note: 'PRAN holding statement' },
      ],
      notes: 'Active Choice (75% Equity Class E, 25% Corporate Debt Class C). Additional ₹50,000 80CCD(1B) benefit.',
      updatedAt: nowISO,
    },
    {
      id: generateUUID(),
      vaultId,
      name: 'HDFC Life Click 2 Protect Pure Term Plan (₹1.5 Cr Cover)',
      type: 'insurance',
      currentValue: 120000,
      currency: baseCurrency,
      purchaseDate: '2021-08-10',
      purchasePrice: 120000,
      premiumDueDate: addDays(45),
      premiumAmount: 18500,
      maturityDate: '2060-08-10',
      valuationHistory: [
        { id: generateUUID(), date: '2021-08-10', value: 120000, note: 'Cumulative annual term premiums' },
      ],
      notes: '₹1.5 Crore death benefit cover till age 65. Nominee: Spouse.',
      updatedAt: nowISO,
    },
    {
      id: generateUUID(),
      vaultId,
      name: 'KSFE Government Registered Chit Fund (40 Months)',
      type: 'chit_fund',
      currentValue: 235000,
      currency: baseCurrency,
      purchaseDate: '2023-09-10',
      purchasePrice: 200000,
      maturityDate: '2027-01-10',
      valuationHistory: [
        { id: generateUUID(), date: '2023-09-10', value: 200000, note: 'Paid installments' },
        { id: generateUUID(), date: '2025-08-10', value: 235000, note: 'Accumulated dividend share + principal' },
      ],
      notes: 'State government backed chit fund. ₹10,000/month installment.',
      updatedAt: nowISO,
    },
    {
      id: generateUUID(),
      vaultId,
      name: 'Early Stage Angel Investment / Startup Convertible Note',
      type: 'other',
      currentValue: 350000,
      currency: baseCurrency,
      purchaseDate: '2023-12-01',
      purchasePrice: 250000,
      valuationHistory: [
        { id: generateUUID(), date: '2023-12-01', value: 250000, note: 'Seed round SAFE note' },
        { id: generateUUID(), date: '2025-06-15', value: 350000, note: 'Series A marked-up valuation' },
      ],
      notes: 'Fintech SaaS platform angel round with 20% discount cap.',
      updatedAt: nowISO,
    },
  ];

  // 8. Liabilities (All 7 Liability Types)
  const liabilities: Liability[] = [
    {
      id: generateUUID(),
      vaultId,
      name: 'HDFC Bank Home Loan (Apartment Bengaluru)',
      lender: 'HDFC Bank',
      type: 'home_loan',
      principalAmount: 4500000,
      outstandingBalance: 3450000,
      interestRate: 8.55,
      emiAmount: 39150,
      nextDueDate: addDays(5),
      tenureRemainingMonths: 156,
      currency: baseCurrency,
      notes: 'Linked to Repo Benchmark. Floating rate. Part-prepayment allowed with 0 penalty.',
      updatedAt: nowISO,
    },
    {
      id: generateUUID(),
      vaultId,
      name: 'ICICI Bank Auto Loan (Creta)',
      lender: 'ICICI Bank',
      type: 'car_loan',
      principalAmount: 1000000,
      outstandingBalance: 420000,
      interestRate: 9.15,
      emiAmount: 16250,
      nextDueDate: addDays(10),
      tenureRemainingMonths: 28,
      currency: baseCurrency,
      notes: 'Auto-debit mandate on HDFC Salary account.',
      updatedAt: nowISO,
    },
    {
      id: generateUUID(),
      vaultId,
      name: 'Bajaj Finserv Flexi Personal Loan',
      lender: 'Bajaj Finance',
      type: 'personal_loan',
      principalAmount: 250000,
      outstandingBalance: 85000,
      interestRate: 13.5,
      emiAmount: 9400,
      nextDueDate: addDays(15),
      tenureRemainingMonths: 10,
      currency: baseCurrency,
      notes: 'Flexi drop-line facility for home renovation.',
      updatedAt: nowISO,
    },
    {
      id: generateUUID(),
      vaultId,
      name: 'SBI Global Ed-Vantage Student Loan',
      lender: 'State Bank of India',
      type: 'education_loan',
      principalAmount: 1800000,
      outstandingBalance: 890000,
      interestRate: 9.85,
      emiAmount: 22400,
      nextDueDate: addDays(18),
      tenureRemainingMonths: 48,
      currency: baseCurrency,
      notes: 'Eligible for Section 80E full interest tax deduction (no upper limit).',
      updatedAt: nowISO,
    },
    {
      id: generateUUID(),
      vaultId,
      name: 'HDFC Regalia Gold Statement Outstanding',
      lender: 'HDFC Bank Cards',
      type: 'credit_card',
      principalAmount: 48000,
      outstandingBalance: 48000,
      interestRate: 42.0,
      emiAmount: 48000,
      nextDueDate: addDays(12),
      tenureRemainingMonths: 1,
      currency: baseCurrency,
      notes: 'Full statement balance due. Auto-debit active.',
      updatedAt: nowISO,
    },
    {
      id: generateUUID(),
      vaultId,
      name: 'Muthoot Finance Agri-Gold Loan',
      lender: 'Muthoot Finance',
      type: 'gold_loan',
      principalAmount: 300000,
      outstandingBalance: 150000,
      interestRate: 10.2,
      emiAmount: 7800,
      nextDueDate: addDays(22),
      tenureRemainingMonths: 14,
      currency: baseCurrency,
      notes: 'Backed by 22K gold ornament pledge in branch vault.',
      updatedAt: nowISO,
    },
    {
      id: generateUUID(),
      vaultId,
      name: 'Hand Loan from Maternal Uncle (Soft Loan)',
      lender: 'Family (Uncle Rajesh)',
      type: 'other',
      principalAmount: 100000,
      outstandingBalance: 40000,
      interestRate: 0.0,
      emiAmount: 5000,
      nextDueDate: addDays(25),
      tenureRemainingMonths: 8,
      currency: baseCurrency,
      notes: 'Informal friendly family loan for emergency hospital deposit. Repaying ₹5,000 monthly.',
      updatedAt: nowISO,
    },
  ];

  // 9. Planned Expenses
  const plannedExpenses: PlannedExpense[] = [
    {
      id: generateUUID(),
      vaultId,
      name: 'House Rent (Indiranagar 2BHK)',
      amount: 28000,
      dueDate: addDays(4),
      recurrence: 'monthly',
      categoryId: catRent.id,
      accountId: accHdfc.id,
      status: 'pending',
      notes: 'Due to landlord Mr. Raman via NEFT',
      updatedAt: nowISO,
    },
    {
      id: generateUUID(),
      vaultId,
      name: 'Zerodha Nifty 50 Index SIP',
      amount: 10000,
      dueDate: addDays(8),
      recurrence: 'monthly',
      categoryId: catInvestments.id,
      accountId: accHdfc.id,
      status: 'pending',
      notes: 'Auto-debit mandate',
      updatedAt: nowISO,
    },
    {
      id: generateUUID(),
      vaultId,
      name: 'HDFC Car Loan EMI',
      amount: 8420,
      dueDate: addDays(5),
      recurrence: 'monthly',
      accountId: accHdfc.id,
      status: 'pending',
      updatedAt: nowISO,
    },
    {
      id: generateUUID(),
      vaultId,
      name: 'Jio 5G Fiber Broadband',
      amount: 1180,
      dueDate: addDays(12),
      recurrence: 'monthly',
      categoryId: catUtilities.id,
      accountId: accPaytm.id,
      status: 'pending',
      notes: '300 Mbps unlimited plan',
      updatedAt: nowISO,
    },
    {
      id: generateUUID(),
      vaultId,
      name: 'Netflix 4K Premium',
      amount: 649,
      dueDate: addDays(18),
      recurrence: 'monthly',
      categoryId: catDining.id,
      accountId: accSbiCard.id,
      status: 'pending',
      updatedAt: nowISO,
    },
  ];

  return {
    accounts,
    transactions,
    categories,
    peopleLedger,
    budgets,
    goals,
    assets,
    liabilities,
    plannedExpenses,
  };
}
