# KhataGHAR Engineering Progress & Architectural Changelog

> **Audience**: Developers, System Architects & AI Coding Assistants  
> **Repository**: [KhataGHAR (PaisaBook Architecture)](https://github.com/Krrish1411/KhataGHAR)  
> **Last Updated**: September 2026  
> **Branch**: `main`  
> **Latest Commit**: `78a4af7`

---

## 1. Executive Summary

This document serves as the complete, exhaustive engineering changelog and architectural handoff guide for **KhataGHAR** (Sovereign Wealth Operating System). It details every single feature, structural refactor, bug fix, security enhancement, multi-platform packaging pipeline, and database migration implemented across the codebase.

KhataGHAR is an institutional-grade, zero-cloud, 100% offline and encrypted personal wealth platform designed for:
1. **Web / PWA**: Offline-first via service workers, IndexedDB (Dexie v4), and Web Crypto.
2. **Desktop (Windows, Linux, macOS)**: Native Electron 44 app powered by Node 22 native SQLite (`node:sqlite`), ASAR encryption, and anti-reverse-engineering protection.
3. **Android Mobile**: High-performance hybrid APK via Capacitor 8 with edge-to-edge design, hardware back button coordination, and touch gesture handling.
4. **Encrypted Device-to-Device Sync**: Zero-knowledge 6-digit numeric PIN sync hub with initial primary master selection, Server-Sent Events relay, and native OS notifications.

---

## 2. File & Component Modification Map

| Component / System | Files Modified or Created | Key Technical Changes |
| :--- | :--- | :--- |
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
| **In-App Confirmations** | `[NEW]` [`src/components/common/ConfirmModal.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/common/ConfirmModal.tsx)<br>`[NEW]` [`src/context/DialogContext.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/context/DialogContext.tsx)<br>`[MOD]` All Views | Themed in-app modal cards (`danger`, `warning`, `primary`) replacing browser `window.confirm` across all 8 major views. |
| **Notes Section Overhaul** | `[MOD]` [`src/views/NotesView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/NotesView.tsx)<br>`[NEW]` [`src/utils/compression.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/utils/compression.ts) | 2-panel layout, tree navigator, dynamic attachment compression ($\le 500\text{ KB}$ uncompressed, $> 500\text{ KB}$ downscaled under $500\text{ KB}$), zero outer scrollbar, auto-resizing canvas. |
| **Custodial Accounting** | `[MOD]` [`src/utils/financials.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/utils/financials.ts)<br>`[MOD]` [`src/views/AssetsLiabilitiesView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/AssetsLiabilitiesView.tsx)<br>`[NEW]` [`src/components/accounts/RelocateHoldingModal.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/accounts/RelocateHoldingModal.tsx) | Fixed false negative cash balances when parking third-party custodial funds in assets. Segregated liquid reservations from asset holdings. Added True Personal Equity badges and 1-click Relocate Holding modal. |
| **Screen-Captured PDF** | `[MOD]` [`src/services/export.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/services/export.ts)<br>`[MOD]` [`src/components/reports/PdfExportModal.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/reports/PdfExportModal.tsx) | Look-alike 2x retina screen-capture PDF via `html2canvas` with multi-page A4 slicing. Fixed jsPDF Unicode encoding bug by replacing `₹` with `Rs. ` for vector exports. |
| **Emergency Survival Meter** | `[MOD]` [`src/views/ReportsView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/ReportsView.tsx) | CFA-grade liquidity runway survival meter with Fragile (< 3 mo), Adequate (3–6 mo), and Fortress ($\ge$ 6 mo) benchmark gauges and rupee surplus/shortfall calculation. |
| **Double Password Confirm** | `[MOD]` [`src/views/SettingsView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/SettingsView.tsx) | Double-entry confirmation for encrypted backups with show/hide eye toggles, real-time match indicator, and download block on mismatch. |
| **Dismissible Alerts** | `[MOD]` [`src/views/DashboardView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/DashboardView.tsx) | Dismissible dashboard alert insights with `localStorage` persistence. |
| **Health Score Period Fix** | `[MOD]` [`src/services/ratios.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/services/ratios.ts)<br>`[MOD]` [`src/services/insights.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/services/insights.ts) | Filtered budget evaluation strictly to active calendar month, eliminating false "2 budgets exceed" alerts. |
| **Nested Multi-Modals** | `[MOD]` [`src/components/transactions/QuickAddModal.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/transactions/QuickAddModal.tsx)<br>`[MOD]` [`src/components/people/PeopleEntryModal.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/people/PeopleEntryModal.tsx) | On-the-fly creation of Categories, Accounts, Contacts, Assets, and Liabilities with zero parent form data loss. Added "Directly Paid by Someone Else" and "Trip Splitter" modes. |

---

## 3. Detailed Architectural Breakdown

### 3.1 Fixed Sidebar & Isolated Viewport Scrolling
- **Problem**: When pages had large lists (such as Transactions, People Ledger, or Reports), the entire outer page window scrolled. On desktop, this caused the sidebar to jump or displace, and if the sidebar expanded, users experienced nested scrollbar fighting.
- **Architectural Solution**:
  1. In [`Sidebar.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/layout/Sidebar.tsx), pinned the sidebar container to 100vh:
     ```tsx
     <aside className="fixed md:sticky top-0 left-0 z-40 h-screen w-64 flex flex-col shrink-0 bg-card border-r border-line">
     ```
     The internal `<nav>` is isolated with `flex-1 overflow-y-auto custom-scrollbar`. If navigation items exceed the vertical height, only the menu items scroll, while the brand header, offline app CTA, and footer badges remain permanently fixed.
  2. In [`AppLayout.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/layout/AppLayout.tsx), configured the root wrapper and main column:
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
  3. **Result**: The main screen content scrolls smoothly and independently without shifting the sidebar.

---

### 3.2 P2P Encrypted Device Sync Hub & Master Device Selection
Inspired by the reference implementation in `sync refrence/`:
- **Encrypted Zero-Knowledge Transport (`src/services/sync/`)**:
  - [`syncCrypto.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/services/sync/syncCrypto.ts): Derives 256-bit AES-GCM session keys via PBKDF2 (50,000 iterations) from the 6-digit numeric PIN. All packets contain random 96-bit IVs and 128-bit salts.
  - [`syncEngine.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/services/sync/syncEngine.ts): Real-time Server-Sent Events (SSE) relay over `ntfy.sh` (`khataghar-sync-${pin}-...`), providing sub-500ms discovery across mobile cellular and local Wi-Fi with zero port forwarding.
- **Primary Master Device Selection (`P2PSyncModal.tsx`)**:
  - **Initial Sync Problem**: Naive automatic two-way merging during initial setup created duplicate accounts ("Cash" and "Cash", "HDFC" and "HDFC") and clutter.
  - **Resolution**: On initial pairing (`!isMasterEstablished`), both devices display the **Master Device Selection Dialog**:
    - Compares live record counts side-by-side: Accounts, Transactions, Assets & Debt, Notes & Folders.
    - **"Make This Device Master (Push Clean Clone)"**: Clones this device's verified records to the connected peer and overwrites it, guaranteeing zero duplicated accounts.
    - **"Make Remote Device Master (Pull Master from Remote)"**: Receives and mirrors the clean master vault from the remote device.
    - Once established, persists `khataghar_sync_masterEstablished = true`. Subsequent syncs exchange updates normally both ways.
- **Quick Access**: Accessible via the top header sync button, the sidebar action, or Settings > P2P Device Sync.

---

### 3.3 Universal Native Notifications
- [`src/utils/nativeNotification.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/utils/nativeNotification.ts) provides a universal notification bridge:
  - **Desktop Electron**: Dispatches native OS notifications via IPC handler `show-notification` registered in [`electron/main.cjs`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/electron/main.cjs) and exposed via [`electron/preload.cjs`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/electron/preload.cjs).
  - **Mobile / Web / PWA**: HTML5 Web Notification API with automatic permission prompt.
- Triggers notifications when devices pair or when a vault synchronization finishes.

---

### 3.4 CI Build Pipeline Fixes & Multi-Platform Packaging

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

### 3.5 Branded Multi-Platform Application Icons
Generated and configured high-resolution branded KhataGHAR icons across all operating systems:
- **Windows**: [`build/icon.ico`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/build/icon.ico) containing multi-resolution layers (16x16 up to 256x256).
- **macOS**: [`build/icon.icns`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/build/icon.icns) and 512x512 PNG for high-DPI Apple retina displays.
- **Linux**: [`build/icons/`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/build/icons/) folder containing discrete standard icon sizes (`16x16` through `512x512`) for freedesktop taskbar and application menus.
- **Android**: Replaced stock Capacitor robot icons across all screen densities (`mdpi`, `hdpi`, `xhdpi`, `xxhdpi`, `xxxhdpi`) for adaptive, square, and round icons with KhataGHAR’s brand background color (`#12855a`).
- **Electron Window**: Configured `icon: path.join(__dirname, '../build/icon.png')` in [`electron/main.cjs`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/electron/main.cjs).

---

### 3.6 Native SQLite Engine & Security Hardening
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
- **Git Status**: All commits pushed to `origin/main` (`78a4af7`).

---

## 5. Architectural Guidelines for Future Work

1. **Dialog Usage**: Never use `window.confirm()` or `window.alert()`. Always use `const confirm = useConfirm()` from `../context/DialogContext` or instantiate `<Modal>` / `<ConfirmModal>`.
2. **Layout & Scrolling**:
   - The outer application wrapper is `h-screen overflow-hidden flex`.
   - The desktop sidebar is `fixed md:sticky top-0 h-screen shrink-0 w-64` with internal `<nav className="flex-1 overflow-y-auto custom-scrollbar">`.
   - The main content column is `flex-1 h-screen overflow-y-auto overflow-x-hidden custom-scrollbar`.
   - Never remove `shrink-0` from the sidebar or make the root container scrollable.
3. **P2P Sync Modifications**:
   - Maintain PBKDF2 key derivation and AES-GCM-256 wire encryption in `syncCrypto.ts`.
   - Any new state fields added to `VaultData` must be mirrored in `syncTypes.ts` and `syncEngine.ts`.
4. **Android Build Maintenance**:
   - Keep `java-version: '21'` in `.github/workflows/android-build.yml`.
   - Ensure `compileSdkVersion=35` in `android/gradle.properties`.
   - Pre-accept Android SDK licenses before running Capacitor sync.
