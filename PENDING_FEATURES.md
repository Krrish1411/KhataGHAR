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

*KhataGHAR Architecture Roadmap — Private, Local-First, Zero-Cloud Financial Engineering.*
