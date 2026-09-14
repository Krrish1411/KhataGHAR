# KhataGHAR Engineering Progress & Architectural Changelog

> **Audience**: Developers, System Architects & AI Coding Assistants  
> **Repository**: [KhataGHAR (PaisaBook Architecture)](https://github.com/Krrish1411/KhataGHAR)  
> **Last Updated**: September 2026  
> **Branch**: `main`  
> **Latest Commit**: `78a4af7`

---

## 1. Executive Summary

This document provides a comprehensive, chronological, and cumulative record of all architectural enhancements, UI/UX overhauls, financial logic fixes, multi-platform build pipelines, and database migrations implemented across KhataGHAR. It outlines precisely **what changed**, **which files were modified**, and **how the systems function** so any developer or AI assistant can immediately understand the complete state of the application and continue building without regressions or lost context.

KhataGHAR is an institutional-grade, zero-cloud, 100% offline and encrypted personal wealth platform designed for:
1. **Web / PWA**: Offline-first via service workers, IndexedDB (Dexie v4), and Web Crypto.
2. **Desktop (Windows, Linux, macOS)**: Native Electron 44 app powered by Node 22 native SQLite (`node:sqlite`), ASAR encryption, and anti-reverse-engineering protection.
3. **Android Mobile**: High-performance hybrid APK via Capacitor 8 with edge-to-edge design, hardware back button coordination, and touch gesture handling.
4. **Encrypted Device-to-Device Sync**: Zero-knowledge 6-digit numeric PIN sync hub with initial primary master selection, Server-Sent Events relay, and native OS notifications.

---

## 2. Cumulative File & Component Modification Map

| Area / Feature | Files Modified or Created | Key Changes |
| :--- | :--- | :--- |
| **In-App Confirmations** | `[NEW]` [`src/components/common/ConfirmModal.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/common/ConfirmModal.tsx) | Themed in-app modal card supporting `danger`, `warning`, `primary` variants and rich item previews. |
| **Dialog Architecture** | `[NEW]` [`src/context/DialogContext.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/context/DialogContext.tsx)<br>`[MOD]` [`src/App.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/App.tsx) | Global `DialogProvider` exposing `useConfirm()` and `useDialog()` hooks returning `Promise<boolean>` / `Promise<void>`. Replaced browser-native `window.confirm`. |
| **Notes Section Redesign** | `[MOD]` [`src/views/NotesView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/NotesView.tsx)<br>`[MOD]` [`src/components/layout/AppLayout.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/layout/AppLayout.tsx)<br>`[NEW]` [`src/utils/compression.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/utils/compression.ts) | 2-panel layout, tree navigator, system theme compliance, zero outer scrollbar, search icon alignment, auto-resize textarea with scroll preservation, dynamic attachment compression ($\le 500\text{ KB}$ uncompressed, $> 500\text{ KB}$ downscaled under $500\text{ KB}$). |
| **Dialog Upgrades Across Views** | `[MOD]` [`src/views/AccountsView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/AccountsView.tsx)<br>`[MOD]` [`src/views/BudgetsGoalsView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/BudgetsGoalsView.tsx)<br>`[MOD]` [`src/views/AssetsLiabilitiesView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/AssetsLiabilitiesView.tsx)<br>`[MOD]` [`src/views/DocumentsView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/DocumentsView.tsx)<br>`[MOD]` [`src/views/PlansView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/PlansView.tsx)<br>`[MOD]` [`src/views/PeopleLedgerView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/PeopleLedgerView.tsx)<br>`[MOD]` [`src/views/SettingsView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/SettingsView.tsx) | Converted all legacy `window.confirm` dialogs to institutional in-app confirmation cards using `useConfirm()`. |
| **Health Score Engine** | `[MOD]` [`src/services/ratios.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/services/ratios.ts)<br>`[MOD]` [`src/services/insights.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/services/insights.ts) | Fixed budget evaluation logic from summing lifetime 4-month expenses to scoping strictly to the current active calendar month. |
| **Button Consolidation** | `[MOD]` [`src/views/AccountsView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/AccountsView.tsx)<br>`[MOD]` [`src/views/DashboardView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/DashboardView.tsx)<br>`[MOD]` [`src/views/SettingsView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/SettingsView.tsx) | Removed scattered "Load Demo Accounts" and "Reconcile" buttons from Accounts and Dashboard; consolidated into a dedicated Ledger Maintenance hub in Settings. |
| **Login Screen Alignment** | `[MOD]` [`src/components/security/LockScreen.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/security/LockScreen.tsx) | True viewport vertical and horizontal centering; removed `zoom: 1.25` and `my-auto` that pushed the card off-center on standard laptops. |
| **Type Definitions** | `[MOD]` [`src/types/index.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/types/index.ts) | Extended `VaultNote` with optional `icon?: string` field for emoji/icon identifiers; added custodial asset tracking fields. |
| **Fixed Sidebar & Layout** | `[MOD]` [`src/components/layout/AppLayout.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/layout/AppLayout.tsx)<br>`[MOD]` [`src/components/layout/Sidebar.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/layout/Sidebar.tsx)<br>`[MOD]` [`src/components/layout/Header.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/layout/Header.tsx) | Fixed sidebar pinned at 100vh (`h-screen shrink-0 w-64`) with internal independent scrollbar (`overflow-y-auto custom-scrollbar`). Main screen viewport isolated in its own smooth scroll container (`h-screen overflow-y-auto custom-scrollbar`). Added P2P Sync triggers in Header and Sidebar. |
| **P2P Sync Engine & Wire** | `[NEW]` [`src/services/sync/syncTypes.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/services/sync/syncTypes.ts)<br>`[NEW]` [`src/services/sync/syncCrypto.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/services/sync/syncCrypto.ts)<br>`[NEW]` [`src/services/sync/syncEngine.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/services/sync/syncEngine.ts) | 6-digit PIN pairing engine using PBKDF2 (50k iterations) + AES-GCM-256 wire encryption. Real-time Server-Sent Events (SSE) relay over `ntfy.sh` (< 500ms discovery, zero open ports). Auto-reconnect and keepalive heartbeat. |
| **P2P Sync Dialog Modal** | `[NEW]` [`src/components/sync/P2PSyncModal.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/sync/P2PSyncModal.tsx)<br>`[MOD]` [`src/components/settings/P2PSyncCard.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/settings/P2PSyncCard.tsx) | Full dialog box featuring 6-digit PIN generator/entry, connection indicators, side-by-side device cards with live record counters, and 1-click **Primary Master Selection** ("Make This Device Master" / "Pull Master from Remote") to eliminate duplicate accounts and clutter on initial sync. |
| **Native Notifications** | `[NEW]` [`src/utils/nativeNotification.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/utils/nativeNotification.ts)<br>`[MOD]` [`electron/main.cjs`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/electron/main.cjs)<br>`[MOD]` [`electron/preload.cjs`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/electron/preload.cjs) | Universal native notification bridge supporting Electron OS notifications via IPC (`show-notification`) and mobile/PWA HTML5 Web Notifications with permission negotiation. |
| **Android APK CI Pipeline** | `[MOD]` [`.github/workflows/android-build.yml`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/.github/workflows/android-build.yml)<br>`[MOD]` [`android/gradle.properties`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/android/gradle.properties)<br>`[MOD]` [`android/app/build.gradle`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/android/app/build.gradle)<br>`[MOD]` [`android/capacitor-cordova-android-plugins/build.gradle`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/android/capacitor-cordova-android-plugins/build.gradle) | Fixed CI build: upgraded Java to 21 (`temurin: 21`) required by AGP 8.13 / Gradle 8.14, added `compileOptions` Java 21, automated SDK license hashes prior to sync, set explicit `compileSdkVersion=35` in `gradle.properties` (preventing unreleased SDK 36 fallback), and ensured `npm ci --include=dev` with guaranteed asset sync. |
| **Linux Packaging Pipeline** | `[MOD]` [`.github/workflows/desktop-build.yml`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/.github/workflows/desktop-build.yml)<br>`[MOD]` [`electron-builder.json`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/electron-builder.json)<br>`[MOD]` [`package.json`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/package.json) | Resolved `exit code 127: libcrypt.so.1 not found` on Ubuntu 24.04 by switching runner to `ubuntu-22.04` (Jammy LTS), installing `libarchive-tools`, and specifying Debian maintainer email metadata (`KhataGHAR <support@khataghar.org>`). Maximize AppImage GLIBC 2.35+ backward compatibility. |
| **Multi-Platform Icons** | `[NEW]` [`build/icon.ico`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/build/icon.ico)<br>`[NEW]` [`build/icon.icns`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/build/icon.icns)<br>`[NEW]` [`build/icon.png`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/build/icon.png)<br>`[NEW]` [`build/icons/*`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/build/icons/)<br>`[MOD]` [`android/app/src/main/res/mipmap-*/*`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/android/app/src/main/res/)<br>`[MOD]` [`android/app/src/main/res/values/ic_launcher_background.xml`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/android/app/src/main/res/values/ic_launcher_background.xml) | Multi-resolution Windows ICO (16–256px), Apple ICNS container with chunks `icp4` through `ic14`, discrete Linux PNGs (16x16 to 512x512), and Android launcher icons across mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi with brand background `#12855a`. Configured in `electron-builder.json` and `electron/main.cjs`. |
| **Native SQLite Engine** | `[NEW]` [`electron/db.cjs`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/electron/db.cjs)<br>`[NEW]` [`src/db/sqliteElectronAdapter.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/db/sqliteElectronAdapter.ts)<br>`[NEW]` [`src/db/index.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/db/index.ts)<br>`[NEW]` [`src/utils/deviceKey.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/utils/deviceKey.ts) | Embedded native SQLite via Node 22 `node:sqlite` (`DatabaseSync`) in Electron. WAL journal, normalized tables, B-Tree indexes, atomic `VACUUM INTO`, and hardware device-bound AES-256-GCM encryption at rest. |
| **Settings Restructuring** | `[MOD]` [`src/views/SettingsView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/SettingsView.tsx)<br>`[NEW]` [`src/components/settings/StorageDiagnosticsCard.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/settings/StorageDiagnosticsCard.tsx)<br>`[NEW]` [`src/components/settings/UniversalBackupCard.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/settings/UniversalBackupCard.tsx) | Restructured settings into 5 tabs: (1) General & Preferences, (2) Security & Camouflage, (3) Storage & SQLite, (4) Backups & Migration, (5) P2P Device Sync. |
| **Code Obfuscation** | `[MOD]` [`vite.config.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/vite.config.ts) | Integrated `javascript-obfuscator` in production build with control flow flattening, base64 string array encoding, string splitting, hexadecimal identifier scrambling, and console disabling. |
| **Custodial Accounting** | `[MOD]` [`src/utils/financials.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/utils/financials.ts)<br>`[MOD]` [`src/views/AssetsLiabilitiesView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/AssetsLiabilitiesView.tsx)<br>`[NEW]` [`src/components/accounts/RelocateHoldingModal.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/accounts/RelocateHoldingModal.tsx) | Fixed false negative cash balances when parking third-party custodial funds in assets. Segregated liquid reservations from asset holdings. Added True Personal Equity badges and 1-click Relocate Holding modal. |
| **Screen-Captured PDF** | `[MOD]` [`src/services/export.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/services/export.ts)<br>`[MOD]` [`src/components/reports/PdfExportModal.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/reports/PdfExportModal.tsx) | Look-alike 2x retina screen-capture PDF via `html2canvas` with multi-page A4 slicing. Fixed jsPDF Unicode encoding bug by replacing `₹` with `Rs. ` for vector exports. |
| **Emergency Survival Meter** | `[MOD]` [`src/views/ReportsView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/ReportsView.tsx) | CFA-grade liquidity runway survival meter with Fragile (< 3 mo), Adequate (3–6 mo), and Fortress ($\ge$ 6 mo) benchmark gauges and rupee surplus/shortfall calculation. |
| **Double Password Confirm** | `[MOD]` [`src/views/SettingsView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/SettingsView.tsx) | Double-entry confirmation for encrypted backups with show/hide eye toggles, real-time match indicator, and download block on mismatch. |
| **Dismissible Alerts** | `[MOD]` [`src/views/DashboardView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/DashboardView.tsx) | Dismissible dashboard alert insights with `localStorage` persistence. |
| **Nested Multi-Modals** | `[MOD]` [`src/components/transactions/QuickAddModal.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/transactions/QuickAddModal.tsx)<br>`[MOD]` [`src/components/people/PeopleEntryModal.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/people/PeopleEntryModal.tsx) | On-the-fly creation of Categories, Accounts, Contacts, Assets, and Liabilities with zero parent form data loss. Added "Directly Paid by Someone Else" and "Trip Splitter" modes. |

---

## 3. Deep Dive into Implemented Features

### 3.1 Notes View Overhaul (`src/views/NotesView.tsx` & `src/components/layout/AppLayout.tsx`)
1. **2-Panel Architecture**:
   - **Left Panel (Folders & Notes Tree Navigator)**:
     - Search input with dedicated `pl-9` clearance so text never overlaps or collides with the `Search` icon.
     - Root "All notes" node displaying lifetime note count.
     - Folder rows with expandable chevron toggles (`rotate-90`), folder name, item count, and in-app delete trigger.
     - Nested notes list under each folder showing title and compact relative date (`Sat 12 Sep`).
   - **Right Panel (Document Canvas & Editor)**:
     - Top bar with folder/scope title, total note count pill, live "Saved / Saving…" indicator, segmented `[Write | Preview]` control, Pin button, Fullscreen toggle, and "+ Note" primary action.
     - Note emoji button with interactive popover picker.
     - Borderless large title input.
     - Metadata pill strip: custom popover folder assigner, formatted timestamp (`Sat 12 Sep at 15:21`), live word & reading time counter, and encrypted `AES-256` badge.
     - Bottom formatting toolbar: Markdown heading pills (H1, H2), text styles (Bold, Italic, Underline, Strikethrough, Code), lists (Bullet, Numbered, Checklist), Link, HR, and file attachments (Photo, Video, Record).
2. **System Theme Colors**:
   - Replaced all hardcoded blue/sky tones (`blue-50`, `blue-600`, `border-blue-200`) with KhataGHAR theme tokens (`pine`, `moss`, `card`, `line`, `ink`), ensuring seamless styling in Pine, Ember, Obsidian Night, Ocean, and Dusk palettes.
3. **Single PC Page Viewport (Zero Outer Scroll)**:
   - In `AppLayout.tsx`, when `location.pathname === '/notes'`, the layout applies `h-screen overflow-hidden pb-0` with `zoom: 1`.
   - In `NotesView.tsx`, the root container is `h-full w-full overflow-hidden`.
   - The outer browser window has **zero scrollbars** on desktop; scrolling is isolated to internal panels via `custom-scrollbar`.
4. **Dynamic Auto-Resize & Jump-to-Top Scroll Fix**:
   - Note `<textarea>` uses dynamic height auto-resize (`ta.style.height = `${Math.max(350, ta.scrollHeight)}px``) with `overflow-hidden`.
   - The parent canvas is the single unified scroll container, eliminating dual/nested scrollbar fighting.
   - `lastLoadedNoteIdRef` and `editorStateRef` prevent debounced auto-save re-renders from jumping the cursor or resetting scroll to top.
   - All formatting actions use `{ preventScroll: true }` on focus restoration.
5. **Dynamic Attachment Compression (`src/utils/compression.ts`)**:
   - Files $\le 500\text{ KB}$ are kept uncompressed with confirmation message.
   - Files $> 500\text{ KB}$ are dynamically downscaled and compressed via canvas under $500\text{ KB}$ with transparent notification.

---

### 3.2 In-App Confirmation Cards & Dialog Architecture
To prepare KhataGHAR for future **Desktop (Electron/Tauri)** and **Android/iOS (Capacitor/Cordova)** distribution, all browser-native dialogs (`window.confirm`) were eliminated.

1. **`ConfirmModal.tsx`** ([`src/components/common/ConfirmModal.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/common/ConfirmModal.tsx)):
   - Reusable modal built on KhataGHAR's tactile design system (`rounded-2xl` on desktop, full-width `rounded-t-3xl` bottom-sheet dock on mobile).
   - Supports semantic variants:
     - `danger`: Crimson flare badge with `Trash2` and crimson confirm button.
     - `warning`: Amber marigold badge with `AlertTriangle` and amber confirm button.
     - `primary`: Pine emerald badge with `Info` and pine confirm button.
   - Accepts rich `itemPreview` JSX for visual verification before destruction.
2. **`DialogContext.tsx`** ([`src/context/DialogContext.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/context/DialogContext.tsx)):
   - Root provider wrapped in `App.tsx`.
   - Exposes `useConfirm()` returning `confirm(options): Promise<boolean>`.
   - Allows 1-line async confirmations across any component:
     ```tsx
     const confirm = useConfirm();
     const ok = await confirm({
       title: 'Delete Item',
       description: 'This action cannot be undone.',
       variant: 'danger',
     });
     if (ok) {
       // execute action
     }
     ```
3. **Application Across Views**:
   - **Notes View**: In-app cards with previews for Note Deletion, Folder Deletion, and Attachment Removal.
   - **Accounts View**: In-app card for Account Deletion.
   - **Budgets & Goals View**: In-app cards for Budget Deletion and Savings Goal Deletion.
   - **Assets & Liabilities View**: In-app cards for Asset Deletion and Liability Deletion.
   - **Documents View**: In-app card for Encrypted Document Deletion.
   - **Plans View**: In-app card for Planned Expense Deletion.
   - **People Ledger View**: In-app card for People Ledger Entry Deletion.
   - **Settings View**: In-app cards for Keyboard Shortcuts Reset, Category Deletion, Category Standard Reset, and Ledger Reconciliation.

---

### 3.3 Health Score & Budget Period Scoping Bug Fix
- **Problem**: When evaluating active budgets in `src/services/ratios.ts` and `src/services/insights.ts`, the budget evaluator summed all lifetime historical expenses across 4 months of transactions. This caused even modest spend to exceed monthly limits, falsely penalizing user health scores and generating false "2 budgets exceed" warnings.
- **Fix**:
  - Filtered transactions by the current active budget period (`txDate >= startOfMonth && txDate <= endOfMonth`).
  - Health scores now accurately reflect actual current-month spend against monthly budget targets.

---

### 3.4 Button Consolidation & Settings Hub
- Removed cluttered "Load Demo Accounts" and "Reconcile" buttons from `AccountsView.tsx` and `DashboardView.tsx`.
- Consolidated both tools into `SettingsView.tsx` under a unified **Ledger Maintenance & Demo Data** section:
  - **Load Realistic Indian Demo Data**: Injects 4 accounts, 4 months of categorized transactions, custodial funds, budgets, and savings goals.
  - **Reconcile Account Balances**: Live-recalculates account balances against double-entry transaction ledgers while preserving historical opening balances.

---

### 3.5 Lock Screen Centering & Zoom Fix
- Removed hardcoded `style={{ zoom: 1.25 }}` and `my-auto` from `src/components/security/LockScreen.tsx`.
- The login and vault unlock card is now centered vertically and horizontally on all viewports without scrolling or top clipping on laptop screens.

---

### 3.6 Fixed Sidebar & Independent Main Screen Scrolling
- **Problem**: Long tables and reports scrolled the entire document window, causing the sidebar to drift out of view and creating jittery viewport jumps.
- **Architectural Solution**:
  1. In [`Sidebar.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/layout/Sidebar.tsx), pinned the sidebar to full screen height:
     ```tsx
     <aside className="fixed md:sticky top-0 left-0 z-40 h-screen w-64 flex flex-col shrink-0 bg-card border-r border-line">
     ```
     The internal `<nav>` uses `flex-1 overflow-y-auto custom-scrollbar`. If navigation links exceed screen height, only the nav list scrolls, keeping the logo, offline app CTA, and footer badges anchored.
  2. In [`AppLayout.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/layout/AppLayout.tsx), configured the main viewport:
     ```tsx
     <div className="h-screen overflow-hidden flex bg-ground text-ink transition-colors">
       <Sidebar ... />
       <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto overflow-x-hidden custom-scrollbar">
         <Header ... />
         <main className="flex-1 w-full min-h-0 px-3 sm:px-6 lg:px-8 py-5">
           <Outlet />
         </main>
       </div>
     </div>
     ```
  3. **Result**: The main screen content scrolls smoothly and independently while the sidebar remains permanently fixed on the left.

---

### 3.7 P2P Device Sync Hub & Master Device Selection
Inspired by the reference architecture in `sync refrence/`:
- **Encrypted Zero-Knowledge Transport (`src/services/sync/`)**:
  - [`syncCrypto.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/services/sync/syncCrypto.ts): PBKDF2 (50,000 iterations) key derivation from the 6-digit numeric PIN, encrypting all packets via AES-GCM 256-bit with random 96-bit IVs and 128-bit salts.
  - [`syncEngine.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/services/sync/syncEngine.ts): Real-time Server-Sent Events (SSE) relay over `ntfy.sh` (`khataghar-sync-${pin}-...`), providing sub-500ms discovery across mobile cellular and local Wi-Fi with zero port forwarding.
- **Primary Master Device Selection (`P2PSyncModal.tsx`)**:
  - **The Problem Solved**: Automatic naive two-way merging during initial setup creates duplicate accounts and clutter.
  - **The Solution**: On first-time pairing, both devices present the **Master Device Selection Dialog**:
    - Compares live record counts side-by-side: Accounts, Transactions, Assets & Debt, Notes & Folders.
    - **"Make This Device Master (Push Clean Clone)"**: Clones this device's verified records to the connected peer and overwrites it, guaranteeing zero duplicated accounts.
    - **"Make Remote Device Master (Pull Master from Remote)"**: Receives and mirrors the clean master vault from the remote device.
    - Once established, persists `khataghar_sync_masterEstablished = true`. Subsequent syncs exchange updates normally both ways.
- **Universal Native Notifications**:
  - [`src/utils/nativeNotification.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/utils/nativeNotification.ts): Dispatches native desktop alerts in Electron via IPC (`show-notification`) and mobile/PWA web notifications on synchronization events and peer connections.
- **Access Points**: Added P2P Sync triggers in top [`Header.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/layout/Header.tsx), [`Sidebar.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/layout/Sidebar.tsx), and [`P2PSyncCard.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/settings/P2PSyncCard.tsx).

---

### 3.8 CI Build Pipeline Fixes & Multi-Platform Packaging

#### A. Android APK Build Pipeline (`.github/workflows/android-build.yml`)
1. **Java 21 Upgrade**: AGP (`8.13.0`) and Gradle (`8.14.3`) strictly require **Java 21**. Running on Java 17 caused Gradle to abort during initialization. Configured `actions/setup-java@v4` with `java-version: '21'` and `compileOptions` with `JavaVersion.VERSION_21` in `android/app/build.gradle`.
2. **SDK 35 Configuration**: Configured `compileSdkVersion=35`, `targetSdkVersion=35`, and `minSdkVersion=24` in `android/gradle.properties`, and updated the subproject fallback in `android/capacitor-cordova-android-plugins/build.gradle` to 35 (preventing Gradle from searching for unreleased SDK 36).
3. **License Pre-Acceptance**: Automated official SHA-256 license acceptance hashes *before* running Capacitor sync, preventing headless timeouts.
4. **Guaranteed Asset Sync**: Pre-copies `dist/*` into `android/app/src/main/assets/public/` and runs `npm ci --include=dev` so `@capacitor/cli` is never pruned.

#### B. Linux Desktop Packaging Pipeline (`.github/workflows/desktop-build.yml`)
1. **Runner Compatibility**: Modern Ubuntu 24.04 runners lack legacy `libcrypt.so.1` (used by electron-builder's internal Ruby `fpm` for `.deb` creation), leading to exit code 127. Switched the Linux matrix runner to `ubuntu-22.04` (Jammy LTS), providing native `libcrypt.so.1` and ensuring AppImages have broad backward glibc compatibility.
2. **Packaging Tools**: Added `sudo apt-get install -y libarchive-tools` to the Linux runner workflow.
3. **Debian Author Metadata**: Configured maintainer email in `package.json` and `electron-builder.json` (`KhataGHAR <support@khataghar.org>`).

---

### 3.9 Branded Multi-Platform Application Icons
Generated and configured high-resolution branded KhataGHAR icons across all operating systems:
- **Windows**: [`build/icon.ico`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/build/icon.ico) containing multi-resolution layers (16x16 up to 256x256).
- **macOS**: [`build/icon.icns`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/build/icon.icns) and 512x512 PNG for high-DPI Apple retina displays.
- **Linux**: [`build/icons/`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/build/icons/) folder containing discrete standard icon sizes (`16x16` through `512x512`) for freedesktop taskbar and application menus.
- **Android**: Replaced stock Capacitor robot icons across all screen densities (`mdpi`, `hdpi`, `xhdpi`, `xxhdpi`, `xxxhdpi`) for adaptive, square, and round icons with KhataGHAR’s brand background color (`#12855a`).
- **Electron Window**: Configured `icon: path.join(__dirname, '../build/icon.png')` in [`electron/main.cjs`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/electron/main.cjs).

---

### 3.10 Native SQLite Engine & Security Hardening
- **Desktop Electron SQLite (`electron/db.cjs`)**:
  - Embedded native SQLite via Node 22 `node:sqlite` (`DatabaseSync`).
  - Tuned with `PRAGMA journal_mode = WAL;`, `PRAGMA synchronous = NORMAL;`, B-Tree indexes, and atomic `VACUUM INTO`.
  - Sub-millisecond lookups exposed through IPC in `preload.cjs` and `sqliteElectronAdapter.ts`.
- **Web & Mobile WASM Router (`src/db/index.ts`)**:
  - Universal database router dynamically selecting native SQLite in Electron or WASM/Dexie in Web & Android.
- **Hardware Device-Bound Key (`src/utils/deviceKey.ts`)**:
  - Row-level AES-256-GCM encryption at rest bound to a local device key, guaranteeing copied files cannot be read without the device key.
- **JavaScript Obfuscation (`vite.config.ts`)**:
  - Integrated `javascript-obfuscator` in production build with control flow flattening, base64 string array encoding, string splitting, hexadecimal identifier scrambling, and console disabling.
- **Electron Security**:
  - Packaged via ASAR archive (`asar: true`). DevTools disabled in production, inspector hotkeys blocked (`F12`, `Ctrl+Shift+I`), and remote navigation blocked.

---

## 4. Verification & Build Integrity

- **TypeScript Compilation**: `npx tsc --noEmit` passed with **0 errors**.
- **Production Web Bundle**: `npm run build` compiled successfully in **31.82s**.
- **Capacitor Android Sync**: `npx cap sync android` completed in **0.063s** with **0 errors**.
- **Git Status**: Clean working tree on `origin/main` (`78a4af7`).

---

## 5. Guidelines for Future AI & Developer Extensions

When adding new features or modifying existing pages in KhataGHAR:
1. **Never Use Native Dialogs**: Do not call `window.confirm()` or `window.alert()`. Always use `const confirm = useConfirm()` from `../context/DialogContext` or instantiate `<Modal>` / `<ConfirmModal>`.
2. **Follow Theme Semantic Tokens**:
   - Use `bg-card` for surfaces, `bg-moss` for page backdrops and muted strips, `border-line` for borders, and `text-ink` for typography.
   - Use `pine-*` for positive/primary actions, `mari-*` for warnings/alerts, and `flare-*` for debts/danger.
3. **Desktop Viewport & Scrolling Integrity**:
   - The outer application wrapper is `h-screen overflow-hidden flex bg-ground text-ink`.
   - The desktop sidebar is `fixed md:sticky top-0 left-0 z-40 h-screen w-64 shrink-0 flex flex-col bg-card border-r border-line` with internal `<nav className="flex-1 overflow-y-auto custom-scrollbar">`.
   - The main content column is `flex-1 flex flex-col min-w-0 h-screen overflow-y-auto overflow-x-hidden custom-scrollbar`.
   - Never remove `shrink-0` from the sidebar or make the root container window scrollable.
4. **Textarea Handling**: Always ensure textareas inside scrollable containers use dynamic auto-height (`field-sizing: content` or `ta.scrollHeight`) with `overflow-hidden` to avoid competing nested scrollbars and scroll jumps.
5. **P2P Sync Modifications**:
   - Maintain PBKDF2 key derivation and AES-GCM-256 wire encryption in `syncCrypto.ts`.
   - Any new state fields added to `VaultData` must be mirrored in `syncTypes.ts` and `syncEngine.ts`.
6. **Android Build Maintenance**:
   - Keep `java-version: '21'` in `.github/workflows/android-build.yml`.
   - Ensure `compileSdkVersion=35` in `android/gradle.properties`.
   - Pre-accept Android SDK licenses before running Capacitor sync.
