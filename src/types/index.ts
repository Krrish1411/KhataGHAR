// TypeScript Data Model Interfaces for Khata Ghar

export type NumberFormatType = 'indian' | 'international';
export type CurrencyCode = string; // 'INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'CAD', etc.

export interface DecoyVaultConfig {
  enabled: boolean;
  pinHash: string; // SHA-256 hex of decoy pin
  mode: 'full_dummy' | 'mirror_scaled';
  scaleFactor?: number; // e.g. 25x or 50x
  encryptedSnapshot?: {
    iv: string;
    ciphertext: string;
  };
}

export interface VaultMeta {
  id: string; // UUID plaintext
  name: string;
  salt: string; // Hex or base64 encoded salt for PBKDF2
  verifier: string; // Encrypted known string to verify password
  createdAt: string; // ISO string
  currency: CurrencyCode; // Base currency, e.g. 'INR'
  numberFormat: NumberFormatType;
  fyStartMonth: number; // 4 for April (Indian FY), 1 for January (CY)
  isPrimary: boolean;
  includeInFamilyOverview: boolean;
  autoLockMinutes: number; // e.g. 5
  exchangeRates: Record<CurrencyCode, number>; // e.g. { USD: 86.5, EUR: 92.0, GBP: 110.0 }
  decoyConfig?: DecoyVaultConfig;
  isDemo?: boolean;
  showPersonalBorrowingsInLiabilities?: boolean; // Default: true — show People-Ledger borrowed entries in Liabilities tab
}

export type AccountType = 'bank' | 'cash' | 'credit_card' | 'wallet' | 'upi' | 'investment' | 'other';
export type AccountTag = 'personal' | 'household';

export interface Account {
  id: string;
  vaultId: string;
  name: string;
  type: AccountType;
  currency: CurrencyCode;
  balance: number;
  initialBalance?: number;
  balanceAsOfDate?: string; // YYYY-MM-DD baseline date
  isVisibleOnDashboard: boolean;
  tag: AccountTag;
  institutionName?: string;
  accountNumberLast4?: string;
  color?: string;
  notes?: string;
  updatedAt: string;
}

export type TransactionType = 'expense' | 'income' | 'transfer';
export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface TransactionSplit {
  id: string;
  amount: number;
  categoryId?: string;
  linkedAssetId?: string;
  linkedLiabilityId?: string;
  note?: string;
}

export interface Transaction {
  id: string;
  vaultId: string;
  date: string; // YYYY-MM-DD
  amount: number;
  type: TransactionType;
  currency: CurrencyCode;
  accountId: string;
  toAccountId?: string; // For transfers
  categoryId?: string;
  subcategoryId?: string;
  note?: string;
  tags?: string[];
  isRecurring?: boolean;
  recurringFrequency?: RecurringFrequency;
  documentIds?: string[];
  rawSource?: string; // For imported transactions
  referenceNumber?: string;
  // Linked Asset or Liability for investments and loan paydowns
  linkedAssetId?: string;
  linkedLiabilityId?: string;
  trancheId?: string;
  subType?: 'investment' | 'debt_payment' | 'regular';
  // Split Transaction Support
  splits?: TransactionSplit[];
  // Import Batch Rollback Tag
  importBatchId?: string;
  // Asset Realized Capital Gain/Loss
  realizedGain?: number;
  updatedAt: string;
}

export interface Category {
  id: string;
  vaultId: string;
  name: string;
  type: 'income' | 'expense';
  parentId?: string; // For subcategories
  icon: string; // Lucide icon name
  color?: string;
  isEssential: boolean; // Essential vs Discretionary
  isStarter?: boolean;
  hidden?: boolean; // If true, category won't show in dropdowns
  updatedAt: string;
}

export type PeopleEntryType = 'lent' | 'borrowed' | 'holding';
export type PeopleEntryStatus = 'open' | 'partially_settled' | 'closed';

export interface SettlementRecord {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  note?: string;
  accountId?: string; // Connected account for auto transaction logging
  importBatchId?: string; // Import batch tracking for clean rollback
}

export interface PeopleLedgerEntry {
  id: string;
  vaultId: string;
  contactName: string;
  contactPhone?: string;
  accountId?: string; // Account where the held/lent/borrowed money is stored or transacted
  type: PeopleEntryType;
  amount: number;
  currency: CurrencyCode;
  date: string; // YYYY-MM-DD
  dueDate?: string;
  hasInterest?: boolean;
  interestRate?: number; // Annual %
  status: PeopleEntryStatus;
  notes?: string;
  settlements: SettlementRecord[];
  importBatchId?: string; // Import batch tracking for clean rollback
  updatedAt: string;
}

export type BudgetPeriod = 'monthly' | 'quarterly' | 'yearly' | 'custom';

export interface Budget {
  id: string;
  vaultId: string;
  categoryId: string;
  period: BudgetPeriod;
  amount: number;
  rollover: boolean;
  startDate?: string;
  endDate?: string;
  updatedAt: string;
}

export interface SavingsGoal {
  id: string;
  vaultId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // YYYY-MM-DD
  currency: CurrencyCode;
  category?: string;
  notes?: string;
  icon?: string;
  isCompleted?: boolean;
  updatedAt: string;
}

export interface PlannedExpense {
  id: string;
  vaultId: string;
  name: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  recurrence: 'once' | 'monthly' | 'yearly';
  categoryId?: string | null;
  accountId?: string | null;
  status: 'pending' | 'paid' | 'cancelled';
  paidDate?: string;
  notes?: string;
  updatedAt: string;
}

export type AssetType =
  | 'property'
  | 'vehicle'
  | 'gold'
  | 'fd_rd'
  | 'mutual_fund'
  | 'stock'
  | 'epf_ppf_nps'
  | 'insurance'
  | 'chit_fund'
  | 'other';

export interface ValuationLog {
  id: string;
  date: string; // YYYY-MM-DD
  value: number;
  note?: string;
}

export interface AssetTranche {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number; // Purchase price / invested capital
  units?: number; // Shares, mutual fund units, gold grams
  unitPrice?: number; // NAV or price per unit at purchase
  transactionId?: string; // Linked bank ledger transaction ID
  note?: string;
  type?: 'buy' | 'sell';
  realizedGain?: number;
}

export interface Asset {
  id: string;
  vaultId: string;
  name: string;
  type: AssetType;
  currentValue: number;
  currency: CurrencyCode;
  purchaseDate?: string;
  purchasePrice?: number;
  valuationHistory: ValuationLog[];
  notes?: string;
  documentIds?: string[];
  premiumDueDate?: string; // For insurance / recurring policies
  premiumAmount?: number;
  maturityDate?: string;
  // Multi-lot / SIP capabilities
  tranches?: AssetTranche[];
  totalUnits?: number;
  currentUnitPrice?: number; // Current NAV / market price per unit
  isSip?: boolean;
  sipMonthlyAmount?: number;
  sipDayOfMonth?: number;
  totalDividends?: number;
  importBatchId?: string; // Import batch tracking for clean rollback
  updatedAt: string;
}

export type LiabilityType =
  | 'home_loan'
  | 'car_loan'
  | 'personal_loan'
  | 'education_loan'
  | 'credit_card'
  | 'gold_loan'
  | 'other';

export interface Liability {
  id: string;
  vaultId: string;
  name: string;
  type: LiabilityType;
  lender: string;
  principalAmount: number;
  outstandingBalance: number;
  interestRate: number; // Annual % (Effective APR)
  emiAmount: number;
  nextDueDate?: string; // YYYY-MM-DD
  tenureRemainingMonths?: number;
  currency: CurrencyCode;
  notes?: string;
  documentIds?: string[];
  // Floating Rate Support
  interestType?: 'fixed' | 'floating';
  benchmarkName?: string; // e.g. 'RBI Repo Rate'
  benchmarkRate?: number; // e.g. 6.50
  spread?: number; // e.g. 2.05
  updatedAt: string;
}

export interface DocumentRecord {
  id: string;
  vaultId: string;
  name: string;
  fileType: string;
  fileSize: number; // in bytes, max 50MB
  linkedType: 'asset' | 'liability' | 'account' | 'transaction' | 'none';
  linkedId?: string;
  expiryDate?: string;
  dataUrl: string; // Base64 data url, stored inside encrypted blob
  createdAt: string;
  updatedAt: string;
}

// Encrypted Row in Dexie IndexedDB
export interface EncryptedRecord {
  id: string; // Plaintext UUID
  vaultId: string; // Plaintext UUID
  type: 'account' | 'transaction' | 'category' | 'people' | 'budget' | 'goal' | 'asset' | 'liability' | 'document' | 'plan';
  iv: string; // Hex / Base64 IV
  ciphertext: string; // Base64 encrypted JSON
  updatedAt: string;
}

// Decrypted In-Memory Store for active vault
export interface VaultData {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  peopleLedger: PeopleLedgerEntry[];
  budgets: Budget[];
  goals: SavingsGoal[];
  assets: Asset[];
  liabilities: Liability[];
  documents: DocumentRecord[];
  plannedExpenses?: PlannedExpense[];
}

export interface FinancialRatios {
  savingsRate: number; // %
  expenseToIncomeRatio: number;
  debtToIncomeRatio: number; // EMI / Income
  essentialSpendRatio: number; // Essential / Total Spend
  discretionarySpendRatio: number;
  averageDailySpend: number;
  averageTransactionSize: number;
  burnRateMonthly: number;
  runwayMonths: number;
  emergencyFundCoverageMonths: number;
  netWorthGrowthMoM: number;
  netWorthGrowthYoY: number;
  investmentRate: number; // Total Invested / Total Income
  liquidityRatio: number; // Liquid Assets / Short-term liabilities
  peopleNetPosition: number; // Lent - Borrowed
  recurringExpenseRatio: number;
  assetToDebtRatio: number; // Total Assets / Total Debt
}

export interface HealthScoreBreakdown {
  score: number; // 0 - 100
  rating: 'Critical' | 'Fair' | 'Good' | 'Strong' | 'Excellent';
  savingsRateScore: { value: number; score: number; weight: number; status: string; advice: string };
  debtToIncomeScore: { value: number; score: number; weight: number; status: string; advice: string };
  emergencyFundScore: { value: number; score: number; weight: number; status: string; advice: string };
  budgetAdherenceScore: { value: number; score: number; weight: number; status: string; advice: string };
  netWorthTrendScore: { value: number; score: number; weight: number; status: string; advice: string };
  keyStrengths: string[];
  keyImprovements: string[];
}
