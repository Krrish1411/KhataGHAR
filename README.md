# 🏛️ KhataGHAR / ArthaVault (अर्थVault)
### *The Sovereign, Zero-Cloud Personal Wealth & Financial Operating System*

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)]()
[![Security: AES-256-GCM](https://img.shields.io/badge/Security-AES--256--GCM-blue.svg)]()
[![Offline First: Dexie & IndexedDB](https://img.shields.io/badge/Storage-100%25%20Local%20IndexedDB-orange.svg)]()
[![PWA Ready](https://img.shields.io/badge/PWA-Installable%20Offline-purple.svg)]()

---

## 🌟 What is KhataGHAR?

**KhataGHAR** is a private, zero-cloud financial operating system engineered for individuals, households, and family offices who demand **100% privacy, mathematical ledger precision, and institutional-grade wealth tracking**.

Unlike traditional finance apps that store your financial history on corporate cloud servers, scrape your SMS messages, and spam you with credit card calls, **KhataGHAR never connects to an external database**. Every rupee, bank balance, property deed, and SIP transaction is encrypted client-side in your browser using **AES-256-GCM** derived from **PBKDF2-SHA256 (600,000 iterations)**.

---

## ⚡ Key Capabilities at a Glance

### 1. 📈 SIP & Multi-Lot Investment Merging
* **Single-Holding Consolidation**: Monthly SIP installments in Nippon Small Cap, UTI Nifty 50, or Sovereign Gold Bonds merge into a single master holding.
* **Granular Tranche Tracking**: Tracks purchase dates, invested capital, unit quantity, NAV, and individual lot returns.
* **Instant Market Revaluation**: Updating the current NAV instantly revalues all accumulated units across all historical lots.

### 2. 🔄 Two-Way Double-Entry Transaction Linking
* **Asset Investments (`Invest`)**: Debits your bank account and credits your asset holdings—**your net worth remains completely intact** without fake expense losses.
* **Debt Paydowns (`Pay Debt`)**: Debits cash and reduces your loan balance directly.
* **Ledger Rollback**: Deleting or modifying a transaction automatically reverses the corresponding account balance, asset tranche, or loan balance.
* **1-Click Balance Reconciliation**: Instantly synchronizes account balances against your verified transaction ledger.

### 3. 🛡️ Duress PIN & Decoy Vault Camouflage
* **Coercion Resistance**: Configure a secondary **Duress PIN**. If forced to unlock your vault, entering the Duress PIN decrypts a realistic decoy ledger with mundane pocket balances (₹2,500 cash, grocery & chai expenses), completely hiding your high-value real estate, gold, stocks, and confidential documents.

### 4. 📊 8-Month Retrospective Cashflow & Burn Radar
* **Runway Analysis**: Computes real-world household runway (e.g. *18.4 months*) by unwinding historical credit card debt and bank flows backwards month-by-month.
* **Savings Rate Intelligence**: Measures your true savings rate and discretionary burn ratio.

### 5. 🧮 Debt Payoff & Opportunity Cost Compounder
* **Prepayment Simulator**: Shows exactly how much interest you save and how many years you shave off your home loan or car loan by paying an extra ₹2,000 or ₹5,000/month.
* **Opportunity Cost Comparison**: Compares the savings of debt prepayment against compounding that same money in an equity index SIP.

### 6. 🏠 Family Hub & Custodial Ledger
* **Khata & Udhar Tracking**: Track money lent, borrowed, or held in custody for friends, family, and domestic staff with full settlement histories.
* **Multi-Member Accounting**: Separate individual personal spending from joint household pools.

### 7. 📑 Encrypted Document Enclave
* Store encrypted scans of property deeds, PAN cards, insurance policies, and wills locally inside your browser storage.

---

## 🔒 Security Architecture & Cryptographic Guarantees

| Security Layer | Implementation | Benefit |
| :--- | :--- | :--- |
| **Encryption Algorithm** | AES-256-GCM (Authenticated) | Tamper-proof, cryptographically unreadable without your master key |
| **Key Derivation** | PBKDF2 (SHA-256, 600,000 iterations) | Exceeds OWASP 2024 security standards against GPU brute-force |
| **Password Policy** | High-Entropy Enforcement | Rejects weak and moderate passwords; ensures brute-force immunity |
| **Network Footprint** | **Zero HTTP Network Requests** | No telemetry, no analytics tracking, no external server calls |
| **Storage Engine** | Encrypted IndexedDB via Dexie.js | Fast, offline-first storage capable of holding 100,000+ records |
| **Duress Mode** | Dual-Key Decoy Camouflage | Zero visual hint that a duress mode was triggered |

---

## 🛠️ Quick Start & Local Development

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation
```bash
# 1. Clone the repository
git clone https://github.com/your-username/khata-ghar.git
cd khata-ghar

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev

# 4. Build production bundle
npm run build
```

---

## 🧪 Interactive UI Prototype (Overwhelm Reducer)

To preview the **Essentials Mode vs Pro Vault Mode** interface without altering your database:
1. Navigate to the project root.
2. Double-click [`test_ui.html`](test_ui.html) to open it in any web browser.
3. Test toggling between the clean beginner layout and institutional master modules.

---

## 📜 License
KhataGHAR is licensed under the **MIT License**. Free and open-source for personal and community financial sovereignty.
