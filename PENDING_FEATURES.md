# KhataGHAR — Pending Features & Future Roadmap

This document outlines architectural designs and technical specifications for upcoming KhataGHAR features deferred for upcoming sprints.

---

## 1. Feature: Remembered Merchant Rules & Regex Auto-Mapping Engine

### 1.1 Objective
Empower users to define deterministic, high-priority rule sets and regex patterns that automatically classify incoming bank statement entries and SMS transactions into categories, tags, transaction types (Expense, Income, Transfer, Asset Investment, Loan EMI, or People Ledger), and destination accounts without recurring manual intervention.

### 1.2 Motivation
Currently, statement imports rely on fuzzy keyword heuristics (`guessCategory()`). While effective for standard Indian merchants (Swiggy, Zomato, Uber, DMart), individual users have recurring custom transactions:
- Custom salary descriptions: `SAL/CMS/00293849/ACME CORP` -> Type: **Income**, Category: **Salary**
- Home Loan auto-debits: `ACH D- HDFC000000123-HL-001928` -> Type: **Loan EMI**, Linked Liability: **HDFC Home Loan**
- Mutual fund mandate: `NACH/BSE/MUTUALFUND/99102` -> Type: **Asset Investment**, Linked Asset: **Parag Parikh Flexi Cap**
- Specific UPI peer transfers: `UPI-SWAPNIL SHARMA-PYTM0123` -> Type: **People Ledger (Lent)**, Contact: **Swapnil**

### 1.3 Technical Architecture

#### Data Model (`RuleDefinition`)
```ts
export type RuleMatchType = 'contains' | 'starts_with' | 'ends_with' | 'regex' | 'exact';
export type RuleTargetField = 'description' | 'referenceNumber' | 'rawSource';

export interface MerchantRule {
  id: string;
  vaultId: string;
  name: string; // e.g. "Swiggy Delivery & Instamart"
  priority: number; // 1 (highest) to 100
  isActive: boolean;
  
  // Matching criteria
  matchField: RuleTargetField;
  matchType: RuleMatchType;
  pattern: string; // e.g. "(swiggy|bundl tech)" or "ACH D- HDFC.*HL"
  caseSensitive?: boolean;
  minAmount?: number;
  maxAmount?: number;
  
  // Actions to apply upon match
  action: {
    type?: 'expense' | 'income' | 'transfer' | 'invest' | 'debt_payment' | 'lent' | 'borrowed';
    categoryId?: string;
    toAccountId?: string; // For transfers
    linkedAssetId?: string; // For investments
    linkedLiabilityId?: string; // For loan EMIs
    contactName?: string; // For people ledger
    tagsToAdd?: string[];
    overrideNote?: string;
  };

  matchCount: number; // Execution analytics
  lastMatchedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

#### Storage & Encryption
- Merchant rules are encrypted client-side using PBKDF2/AES-GCM (same as categories, accounts, and transactions).
- Stored in Dexie IndexedDB table `rules`.

#### Execution Pipeline
1. When parsing statement rows in `processStatementRows()` or parsing UPI SMS in `parseIndianUpiSMS()`, fetch active rules sorted by `priority ASC`.
2. For each transaction candidate, evaluate rules sequentially.
3. The first matching rule applies its action:
   - Sets entry `type`
   - Assigns `categoryId`, `linkedAssetId`, `linkedLiabilityId`, or `toAccountId`
   - Appends configured `tagsToAdd`
4. If no rule matches, fallback to default keyword heuristics.

#### Learning Heuristic ("Remember This Choice")
In the Import Review table, when a user manually modifies a row's category or type, display an optional toggle:
- `[x] Remember this rule for future imports: "Any description matching 'AMZN Mktp' -> Shopping"`
- On import commit, automatically generates and stores a new `MerchantRule`.

---

## 2. Feature: Advanced Multi-Currency Automatic FX Sync

### 2.1 Objective
Provide automated or manual multi-currency exchange rate polling (e.g. USD, EUR, GBP, AED, SGD to INR) with offline fallback and historical rate pinning for overseas transactions and foreign assets (RSUs, ESPP, US Stocks).

### 2.2 Specifications
- Fetch rates from free, privacy-preserving endpoints (e.g. European Central Bank open feed or RBI daily reference rate).
- Cache rates locally in the encrypted vault.
- Retain transaction-date historical conversion rate on foreign transactions.

---

## 3. Feature: Encrypted PDF Bill Parser with Direct Attachment

### 3.1 Objective
Direct ingestion of password-protected credit card statements and utility bills (e.g. HDFC Credit Card PDF, electricity bills) inside the browser via WebAssembly-based PDF parser (`pdf.js` with client-side decryption using user's password/PAN), extracting itemized transaction rows and automatically attaching the encrypted PDF receipt to the transaction record.

---

## 4. Feature: Voice / Quick Natural Language Entry

### 4.1 Objective
Web Speech API or lightweight local offline whisper model to enable fast hands-free voice logging:
- *"Chai and snacks 40 rupees cash"* -> Expense: ₹40, Category: Dining Out, Account: Cash.
- *"Salary credited 1.2 lakhs to HDFC"* -> Income: ₹1,20,000, Category: Salary, Account: HDFC Bank.

---

## 5. Feature: Indian Income Tax Regime Estimator (Old vs New FY 2025–26)

### 5.1 Objective
Provide an instant, local-first income tax liability comparison engine evaluating the Old Tax Regime vs the New Concessional Tax Regime (Section 115BAC) for salaried and freelance professionals based on the user's recorded income and deductible expenses.

### 5.2 Technical Specifications
- **Data Ingestion**: Pull salary, freelance/business income, interest, and dividend transactions recorded in the active financial year (`FY Start: April 1`).
- **Deductions Scanner**:
  - **Section 80C**: Life insurance premiums, EPF/PPF transfers, ELSS investments, children's school tuition fees (capped at ₹1,50,000).
  - **Section 80D**: Health insurance premiums for self, family, and senior citizen parents (up to ₹25,000 / ₹50,000).
  - **Section 24(b)**: Home loan interest component from linked liabilities (up to ₹2,00,000 for self-occupied property).
  - **Section 80CCD(1B)**: Additional NPS contributions (up to ₹50,000).
  - **Standard Deduction**: ₹50,000 (Old Regime) vs ₹75,000 (New Regime as per Union Budget amendments).
- **Output Matrix**:
  - Side-by-side tax liability calculation including 4% Health & Education Cess.
  - Clear financial recommendation on which regime saves more money and the exact breakeven deduction threshold.

---

## 6. Feature: Debt Snowball vs Avalanche Payoff Optimizer

### 6.1 Objective
Empower users with multiple liabilities (credit cards, personal loans, home loans, vehicle financing) to simulate and execute mathematically optimized accelerated payoff strategies.

### 6.2 Technical Specifications
- **Methodology Modes**:
  - **Debt Avalanche (Mathematical Optimum)**: Directs extra monthly surplus towards the liability with the highest Annual Percentage Rate (APR), minimizing total interest paid.
  - **Debt Snowball (Behavioral Momentum)**: Directs surplus towards the liability with the smallest outstanding balance, delivering quick psychological wins.
- **Interactive Simulator**:
  - Slider for "Extra Monthly Prepayment Allocation" (e.g., ₹5,000/mo or ₹20,000/mo).
  - Comparative metrics: Total interest saved in INR, months eliminated from repayment horizon, and forecasted Debt-Free Date.
  - Step-by-step payoff priority timeline with projected month-by-month balance trajectory.

---

## 7. Feature: Capital Gains Tax & Schedule CG Engine (STCG / LTCG)

### 7.1 Objective
Automate tracking of asset holding periods and compute precise Short-Term Capital Gains (STCG) and Long-Term Capital Gains (LTCG) for listed Indian equities, mutual funds, sovereign gold bonds, and real estate, aligned with the latest Finance Act 2024 tax schedules.

### 7.2 Technical Specifications
- **Holding Period Classifier**:
  - Equity & Equity-Oriented Mutual Funds: > 12 months = LTCG, <= 12 months = STCG.
  - Debt Mutual Funds & Fixed Income: Taxed at marginal income slab rate.
  - Real Estate: > 24 months = LTCG (12.5% without indexation).
- **Tax Computations**:
  - Listed Equity LTCG: 12.5% on aggregate net gains exceeding ₹1.25 Lakh exemption limit per financial year.
  - Listed Equity STCG: Flat 20%.
- **Tax-Loss Harvesting Assistant**:
  - Highlights unrealized losses that can be strategically booked before March 31 to offset taxable realized capital gains.

---

## 8. Feature: Group Expense Pooling & Graph Settlement Engine (Local Splitwise Alternative)

### 8.1 Objective
Allow roommates, families, and travel groups to log shared group expenses, track unequal splits, and compute the mathematical minimum number of cross-member settlement transfers.

### 8.2 Technical Specifications
- **Split Modalities**: Equal, exact rupee amounts, percentages, or share ratios.
- **Debt Simplification Algorithm**: Greedy minimum cash flow settlement graph (collapsing circular debts like A -> B -> C -> A into single net settlements).
- **KhataGHAR Integration**: Directly settle balances via KhataGHAR People Ledger or record settlement as an Account Transfer.

---

## 9. Feature: Balance Drift & Reconciliation Assistant

### 9.1 Objective
Provide users with an interactive, periodic reconciliation workflow that compares physical bank passbook / statement closing balances against KhataGHAR's ledger balance, diagnosticating unreconciled variance (drift), finding missing transactions, and generating clean 1-click audited adjustment entries.

### 9.2 Technical Specifications
- **Reconciliation Checkpoint**: User inputs "Statement Balance as of [Date]".
- **Drift Calculation**: $\text{Drift} = \text{Statement Balance} - \text{KhataGHAR Calculated Balance}$.
- **Diagnostic Assistant**:
  - Inspects uncleared cheques, pending planned bills, and recent import batches.
  - Scans for transposition errors (e.g., ₹5,400 recorded as ₹4,500) and sign inversion bugs.
  - Offers 1-click "Create Audited Reconcile Adjustment" entry tagged with `#reconciliation` to restore exact parity.
- **Audit Trail**: Keeps timestamped logs of verified closing balances per account.

---

## 10. Feature: Upcoming Cashflow Calendar & Liquidity Dip Warning

### 10.1 Objective
A forward-looking cashflow forecasting calendar that projects liquid balances over 30, 60, and 90 days by combining current bank balances with scheduled recurring income (salary, dividends), planned expenses, and loan EMI auto-debits, proactively warning of liquidity shortfalls before payment bounces occur.

### 10.2 Technical Specifications
- **Forward Trajectory Model**:
  $$B(t) = B(t-1) + \sum \text{Scheduled Inflows}_t - \sum \text{Planned Outflows}_t - \sum \text{Loan EMIs}_t$$
- **Liquidity Dip Alert**:
  - Highlights days where projected bank balance drops below the account's minimum average balance (MAB) or goes negative.
  - Proactive notification: *"Potential ₹12,000 shortfall on 5th Oct before HDFC Home Loan EMI. Transfer funds from Liquid MF or Savings to avoid bounce fees."*
- **Interactive Calendar View**:
  - Full-screen monthly grid with daily cash inflow/outflow chips, color-coded liquidity health, and drag-and-drop payment date rescheduling.

---

*KhataGHAR Architecture Roadmap — Private, Local-First, Zero-Cloud Financial Engineering.*

