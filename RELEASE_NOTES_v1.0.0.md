# 🏛️ KhataGHAR v1.0.0 — Official General Availability Release

**KhataGHAR (खाताघर)** is a sovereign, zero-cloud, institutional-grade personal wealth operating system. It provides an uncompromised alternative to corporate finance apps: **100% offline, zero tracking, zero telemetry, and end-to-end client-side AES-256-GCM encryption at rest.**

---

## 🌟 Sovereign Manifesto: Why KhataGHAR Exists

Modern fintech platforms have fundamentally broken the covenant between software and user. What should be sovereign, private personal bookkeeping has been distorted into corporate surveillance machinery designed to scrape SMS records, monetize transaction histories, harvest family net worth data, and cross-sell high-interest consumer debt.

KhataGHAR was engineered from first principles under a single uncompromising philosophy:

> **Your money, your debts, your gold, and your family's financial dignity belong to you alone.**

- **Zero Cloud Databases:** No remote servers store your records. Data resides exclusively in local hardware enclave storage.
- **Zero Telemetry & Third-Party SDKs:** No analytics scripts, no advertising trackers, and no tracking pixels.
- **Client-Side Cryptography:** All entries are encrypted with AES-256-GCM derived via PBKDF2 (600,000 iterations of SHA-256) using your master secret.
- **Decade-Long Durability:** Built on open standards (IndexedDB, Native SQLite, JSON, Web Cryptography API) guaranteed to run for decades without depending on external infrastructure.
- **100% Free & Open Source:** Licensed permissively under the **MIT License** for universal auditability and sovereign ownership.

---

## 🚀 Key Feature Pillars in v1.0.0

### 1. 🗂️ Native Google Drive & OS Explorer Workspace
- **Rubber-band Marquee Selection:** Click and drag anywhere across the canvas to draw a selection rectangle—all items inside are instantly selected.
- **Keyboard Navigation Parity:** `↑ ↓ ← →` cursor movement, `Enter` to preview or open, and `Backspace` to navigate up one folder level.
- **Multi-Item Clipboard Engine:** Select any mixture of documents and folders, then use standard OS shortcuts (`Ctrl+X`, `Ctrl+C`, `Ctrl+V`) to move or duplicate files.
- **Cut Visual Indicator:** Cut items render with `opacity-50` and a dashed brand-colored border to clearly indicate pending move operations.
- **Drag-and-Drop Folder Filing:** Drag single or multi-item selections and drop them onto folder cards to organize immediately.
- **Floating Google Drive Action Pill:** Contextual floating action bar showing current clipboard state, item count, and a one-click "Paste here" trigger.
- **Full-Width Contextual Toolbar:** Top toolbar transforms into an action strip on selection that scrolls smoothly and never clips on mobile displays.

### 2. 📁 Universal Multi-Attachment Hub & Split-Payload Architecture
- **Attach Everything Everywhere:** Attach multiple invoices, deeds, agreements, promissory notes, receipts, and passbook scans to any Transaction, Asset, Liability, Goal, or Ledger Entry.
- **Sub-50ms Vault Unlock:** Two-tier split-payload architecture isolates lightweight searchable metadata from heavy binary payloads (`payload_<docId>`), maintaining sub-30MB RAM usage even across thousands of files.
- **Interactive Lightbox Viewer:** Integrated zoom, pan, 90-degree rotation, and direct export for PDF dossiers and high-resolution images.
- **Dual-Directional Entity Linking:** Attach files inside transaction modals, or link existing files directly from the Document Hub inspector.

### 3. 📈 Double-Entry Sovereign Financial Ledger
- **Single-Paisa Real-Time Reactivity:** Reactive balance calculations accurate to the single paisa without application UI freezes.
- **Smart SIP Tranche Consolidation:** Automatically merges recurring mutual fund debits into clean, consolidated holding cards with weighted average purchase costs and live NAV tracking.
- **Segregated Third-Party Custodial Holdings:** Distinguishes sovereign assets from assets managed by custodians or employers (EPF, PPF, corporate gratuity).
- **Automated Ledger Reconciliation:** One-click automated discrepancy detection comparing current account ledger records against recorded closing balances.

### 4. 🛡️ Enclave Security & Anti-Extortion Defenses
- **Plausible Deniability Decoy Vault (Duress PIN):** If physically coerced to unlock your device, enter an alternate Decoy PIN. The enclave opens a believable dummy vault showing trivial daily expenses and pocket cash.
- **Camouflage Calculator Mode:** Disguises KhataGHAR as a fully functional standard arithmetic calculator until your secret PIN sequence is evaluated.
- **RAM Zeroization on Lock:** Cryptographic session keys are cleared from active browser memory upon vault lock.
- **Configurable Inactivity Lockouts:** Automatically locks after user-defined inactivity timeouts or immediate background tab switching.

### 5. 🔄 Direct Peer-to-Peer Local Device Sync
- **Local Network Pairing:** Pair desktop workstations, mobile phones, and tablets over your local Wi-Fi network using a temporary 6-digit cryptographic pairing code.
- **Zero Open Router Ports:** Peer-to-peer communication using end-to-end encrypted WebSockets and Server-Sent Events with zero permanent cloud storage.
- **Primary / Secondary Device Roles:** Designated primary master device propagates authoritative state to satellite mobile readers.

### 6. 📦 Universal Backup & Restore Engine
- **Universal `.khataghar` Backups:** Export password-protected encrypted snapshots with AES-256 for safe cloud archival.
- **Unencrypted Portable Snapshots:** Export plain JSON snapshots for easy machine parsing or self-hosted offline archives.
- **One-Click Welcome Screen Restore:** Direct restoration from the initial setup screen on fresh devices with automatic master password setup and instant vault unlock.

---

## 🛠️ v1.0.0 Production Polish & Critical Fixes

- **Restore Vault Password Workflow Fix:** Added full password creation and confirmation UI for unencrypted portable snapshots, resolving the *"Please enter a password to protect this vault"* error.
- **Welcome Screen Restore Hub:** Added "Restore Old Vault" buttons directly to the Welcome Landing Header, Hero Section, and Bottom CTA, allowing fresh installs to restore backups immediately without creating dummy vaults.
- **Linux AppImage & Desktop External Links Fix:** Integrated Electron `shell.openExternal` to ensure download buttons, GitHub links, and external documentation open seamlessly in the system default browser.
- **Reliable In-App Vault Deletion Modal:** Replaced unsupported Chromium `window.prompt()` with a native in-app danger modal requiring typed confirmation, ensuring smooth vault deletion on Linux AppImage, Electron, Android, and web.
- **Version Comparator Synchronization:** Aligned `APP_VERSION` across codebase and release definitions, permanently eliminating false "Update Available" popups.

---

## 💻 Download & Distribution Packages

| Platform | Format | Description |
|---|---|---|
| **Android** | `.apk` | Native Android APK with continuous release signatures (ARM64 & x86_64) |
| **Linux (Universal)** | `.AppImage` | Standalone executable for Ubuntu, Debian, Fedora, Arch, and derivatives |
| **Linux (Debian/Ubuntu)** | `.deb` | Native package with desktop shortcut and system integration |
| **Linux (Portable)** | `.tar.gz` | Portable compressed binary tarball |
| **Windows (Installer)** | `.exe` | 64-bit setup installer with Start Menu and desktop shortcuts |
| **Windows (Portable)** | `.exe` | Zero-install standalone executable for USB drives or isolated folders |
| **macOS (DMG)** | `.dmg` | Universal disk image for Apple Silicon (M1/M2/M3/M4) and Intel Macs |
| **macOS (Portable)** | `.zip` | Portable application archive for macOS |
| **Web PWA** | `.zip` | Offline-first Progressive Web App bundle with pre-cached service workers |

---

## 🔒 Cryptographic Specification

- **Symmetric Encryption:** AES-GCM-256 (authenticated encryption with 128-bit authentication tag)
- **Key Derivation:** PBKDF2 with HMAC-SHA256, 600,000 iterations, unique 128-bit cryptographically secure salt per vault
- **Initialization Vectors:** Unique 96-bit random IV per record generated via `crypto.getRandomValues`
- **Database Engine:** IndexedDB via Dexie v4 (Web/Android) / Native SQLite via `node:sqlite` in WAL mode (Desktop Electron)
