# KhataGHAR — Pending Features & Future Roadmap

This document formalizes the architectural specifications, privacy invariants, and implementation roadmaps for high-impact pending features queued for future releases.

---

## Feature 1: Android Background SMS & Notification Auto-Reader

### Objective
Provide instant, 1-tap transaction logging when bank debit/credit SMS or UPI push notifications arrive, eliminating manual entry while preserving 100% offline, zero-telemetry privacy.

### Privacy Invariants
- **Zero Cloud Processing**: SMS and notification text must NEVER leave the user's physical device.
- **Local Heuristics & Regex**: Transaction parsing runs exclusively inside an offline Capacitor native plugin / Android service.
- **Explicit User Confirmation**: No transaction is silently committed to the ledger without user confirmation or an interactive OS prompt.

### Architecture & Components
1. **Android Native Service (`KhataGharNotificationListenerService.kt`)**:
   - Extends Android `NotificationListenerService` and `BroadcastReceiver` for `android.provider.Telephony.SMS_RECEIVED`.
   - Filters notifications from verified Indian financial apps (Google Pay, PhonePe, Paytm, CRED, BHIM) and bank SMS sender headers (e.g. `VK-HDFCBK`, `AD-ICICIB`, `AX-SBIINB`).
2. **Local Regex & NLP Extraction Engine**:
   - Extracts:
     - Amount: `(?i)(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{2})?)`
     - Debit / Credit Type: `(?i)(debited|spent|paid|withdrawn|credited|received)`
     - Account Last 4 Digits: `(?i)(?:a/c|acct|acc|card)\s*(?:no\.?)?\s*[*xX]*(\d{4})`
     - Merchant / Payee: `(?i)(?:at|to|info|vpa|transferred to)\s+([A-Za-z0-9@._\s]{2,25})`
     - Reference / UTR Number: `(?i)(?:upi\s*ref|rrn|ref\s*no\.?)\s*[:\s]*(\d{12})`
3. **Interactive Android OS Action Prompt**:
   - Posts a rich notification:
     > **₹450.00 debited at Swiggy** (HDFC A/c **4128)  
     > `[+ Add as Food Expense]` &nbsp;&nbsp; `[Select Category]` &nbsp;&nbsp; `[Dismiss]`
   - Tapping the action wakes a lightweight Capacitor background worker that decrypts the active vault using the cached in-memory session key (if biometric unlocked) and appends the transaction directly into the SQLite database.

---

## Feature 2: Zero-Knowledge Encrypted Cloud Sync

### Objective
Allow users to backup and synchronize their vaults across multiple personal devices (Android, Web, Desktop) via personal cloud storage (Google Drive, WebDAV, Nextcloud, or private S3/R2) without trusting third-party servers.

### Privacy Invariants
- **Client-Side Zero Knowledge**: Cloud storage providers see only opaque, AES-GCM-256 ciphertext blobs with random IVs and PBKDF2/Argon2 salts. The cloud host has zero access to vault names, account balances, or transaction notes.
- **Self-Hosted First**: Support open protocols (WebDAV, Nextcloud) alongside commercial providers (Google Drive AppData folder).

### Architecture & Components
1. **Storage Provider Adapters**:
   - `GoogleDriveSyncAdapter`: Utilizes Google Drive `drive.appdata` hidden sandbox folder (isolated from general Drive files).
   - `WebDavSyncAdapter`: Connects to user-specified WebDAV / Nextcloud endpoints with Basic or Bearer auth.
2. **Deterministic Versioning & Conflict Resolution**:
   - Each vault snapshot contains a monotonic `vaultEpoch` and vector clocks per encrypted record.
   - Merging algorithm:
     - For transactions/documents: Additive union by UUID (no transaction is ever deleted during concurrent merges).
     - For account balances: Baseline reconciliation recalculates from the full unified transaction graph.
3. **Delta Sync Protocol**:
   - Instead of re-uploading the entire vault on every change, updates are batched into encrypted chunk manifests:
     `{ chunkId, recordCount, ciphertextBlob, hash }`.

---

## Feature 4: Multi-Currency Live & Cached Exchange Rates

### Objective
Enable accurate unified net worth calculation across international accounts (USD, EUR, GBP, AED, SGD, CAD, JPY) with real-time and offline-cached foreign exchange rates.

### Privacy & Resilience
- **Offline-First Resilience**: If offline, KhataGHAR uses the last cached exchange rate matrix, falling back to bundled baseline rates.
- **Zero Tracking**: Rate fetching connects directly to public financial endpoints (e.g. European Central Bank open feed or Reserve Bank of India reference rates) with no user identifiers.

### Architecture & Components
1. **Exchange Rate Service (`src/services/fxRates.ts`)**:
   - Fetches reference rates once per 24 hours when network is available:
     `https://open.er-api.com/v6/latest/INR` or ECB FX XML feed.
   - Stores the rate matrix in local encrypted storage:
     `Map<CurrencyCode, number>` relative to base currency.
2. **Dynamic Net Worth Normalization**:
   - Adds a global currency selector in settings: `Primary Display Currency` (defaults to vault currency, e.g. INR).
   - Every asset, account, and liability calculates:
     $$\text{Normalized Value} = \text{Amount} \times \text{Rate}(\text{ItemCurrency} \rightarrow \text{DisplayCurrency})$$
   - Real-time indicator next to multi-currency items: *"≈ ₹82,450 (at 1 USD = ₹86.20 as of today)"*.
