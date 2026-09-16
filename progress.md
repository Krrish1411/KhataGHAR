# KhataGHAR Engineering Progress & Architectural Changelog

> **Audience**: Developers, System Architects & AI Coding Assistants  
> **Repository**: [KhataGHAR (PaisaBook Architecture)](https://github.com/Krrish1411/KhataGHAR)  
> **Last Updated**: September 2026  
> **Branch**: `main`  

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
| **Login Screen Alignment & Zoom** | `[MOD]` [`src/components/security/LockScreen.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/security/LockScreen.tsx) | True viewport vertical and horizontal centering; upgraded card sizing (`max-w-lg`), refined typography, and enlarged scale (`zoom: 1.15`) for prominent visibility. |
| **Type Definitions** | `[MOD]` [`src/types/index.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/types/index.ts) | Extended `VaultNote` with optional `icon?: string` field for emoji/icon identifiers; added custodial asset tracking fields. |
| **Fixed Sidebar & Layout Pinning** | `[MOD]` [`src/components/layout/AppLayout.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/layout/AppLayout.tsx)<br>`[MOD]` [`src/components/layout/Sidebar.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/layout/Sidebar.tsx)<br>`[MOD]` [`src/components/layout/Header.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/layout/Header.tsx) | Fixed desktop sidebar pinned permanently at 100vh (`h-screen h-[100dvh] flex flex-col shrink-0`) with internal independent nav scrolling (`min-h-0 overflow-y-auto`). Main screen viewport isolated in its own smooth scroll container. Footer brand/security badges permanently anchored. Removed jarring zoom shift on Notes navigation. |
| **1-Second Auto-Lock Fix** | `[MOD]` [`src/context/AuthContext.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/context/AuthContext.tsx) | Fixed vault auto-locking ~1s after entering master password by introducing `lastUnlockTimeRef` with a 10s grace period ignoring keyboard dismiss / blur events and enforcing `timeoutMs >= 60000`. |
| **Mobile & PWA Polish** | `[MOD]` [`src/components/layout/Header.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/layout/Header.tsx)<br>`[MOD]` [`src/components/layout/BottomNav.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/layout/BottomNav.tsx)<br>`[MOD]` [`src/components/common/Modal.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/common/Modal.tsx)<br>`[MOD]` [`src/components/common/PWAInstallModal.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/common/PWAInstallModal.tsx) | Prevented mobile header overflow (hidden non-critical action icons on `<sm`, vault name truncation), added safe area insets in bottom nav, upgraded to reference-counted `useBodyScrollLock`, and polished PWA installation modal for Android & iOS. |
| **Buy Me a Coffee Integration** | `[NEW]` [`src/components/common/SupportCoffeeModal.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/common/SupportCoffeeModal.tsx)<br>`[NEW]` [`src/components/settings/SupportSettingsCard.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/settings/SupportSettingsCard.tsx)<br>`[MOD]` [`src/views/SettingsView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/SettingsView.tsx)<br>`[MOD]` [`src/components/layout/AppLayout.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/layout/AppLayout.tsx)<br>`[MOD]` [`src/components/welcome/WelcomeLandingView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/welcome/WelcomeLandingView.tsx) | Official Buy Me a Coffee integration (`slug: Krrish1411`, `#FFDD00`). Featured in Welcome header, P2P sync donation notice, creator manifesto ("Why I Built KhataGHAR"), and Settings preferences ("support not on face"). Milestone popup triggers after 10+ entries on a 7-day interval with friendly reassurance toast on snooze (*"No worries! KhataGHAR stays 100% free forever"*). |
| **Direct P2P Sync on Welcome Screen** | `[NEW]` [`src/components/sync/WelcomeP2PSyncModal.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/sync/WelcomeP2PSyncModal.tsx)<br>`[MOD]` [`src/components/welcome/WelcomeLandingView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/welcome/WelcomeLandingView.tsx)<br>`[MOD]` [`src/components/security/LockScreen.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/security/LockScreen.tsx)<br>`[MOD]` [`src/services/sync/syncEngine.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/services/sync/syncEngine.ts)<br>`[MOD]` [`src/services/sync/syncTypes.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/services/sync/syncTypes.ts) | Added "Sync from Existing Device" option to Welcome screen (Header, Hero buttons, and Bottom CTA) and Lock Screen. Users on new phones or second laptops sync directly via 6-digit PIN with zero friction, eliminating the need to create a dummy vault first. Added `REQUEST_FULL_STATE` protocol with auto-response via `forceCloneToPeer`. |
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
   - **Left Panel (Folders & Notes Tree Navigator)**: Search input with dedicated `pl-9` clearance so text never overlaps or collides with the `Search` icon. Root "All notes" node displaying lifetime note count. Folder rows with expandable chevron toggles (`rotate-90`), folder name, item count, and in-app delete trigger. Nested notes list under each folder showing title and compact relative date.
   - **Right Panel (Document Canvas & Editor)**: Top bar with folder/scope title, total note count pill, live "Saved / Saving…" indicator, segmented `[Write | Preview]` control, Pin button, Fullscreen toggle, and "+ Note" primary action. Note emoji button with interactive popover picker. Borderless large title input. Metadata pill strip: custom popover folder assigner, formatted timestamp, live word & reading time counter, and encrypted `AES-256` badge. Bottom formatting toolbar: Markdown heading pills (H1, H2), text styles, lists, Link, HR, and file attachments.
2. **System Theme Colors**: Replaced all hardcoded blue/sky tones (`blue-50`, `blue-600`, `border-blue-200`) with KhataGHAR theme tokens (`pine`, `moss`, `card`, `line`, `ink`), ensuring seamless styling in Pine, Ember, Obsidian Night, Ocean, and Dusk palettes.
3. **Single PC Page Viewport (Zero Outer Scroll)**: `AppLayout.tsx` applies `h-screen overflow-hidden pb-0` when on `/notes`. `NotesView.tsx` root container is `h-full w-full overflow-hidden`. The outer browser window has zero scrollbars on desktop; scrolling is isolated to internal panels via `custom-scrollbar`.
4. **Dynamic Auto-Resize & Jump-to-Top Scroll Fix**: Note `<textarea>` uses dynamic height auto-resize with `overflow-hidden`. The parent canvas is the single unified scroll container, eliminating dual/nested scrollbar fighting. `lastLoadedNoteIdRef` and `editorStateRef` prevent debounced auto-save re-renders from jumping the cursor or resetting scroll to top. All formatting actions use `{ preventScroll: true }` on focus restoration.
5. **Dynamic Attachment Compression (`src/utils/compression.ts`)**: Files $\le 500\text{ KB}$ are kept uncompressed. Files $> 500\text{ KB}$ are dynamically downscaled and compressed via canvas under $500\text{ KB}$ with transparent notification.

---

### 3.2 In-App Confirmation Cards & Dialog Architecture
To prepare KhataGHAR for future **Desktop (Electron/Tauri)** and **Android/iOS (Capacitor/Cordova)** distribution, all browser-native dialogs (`window.confirm`) were eliminated.
1. **`ConfirmModal.tsx`**: Reusable modal built on KhataGHAR's tactile design system (`rounded-2xl` on desktop, full-width `rounded-t-3xl` bottom-sheet dock on mobile). Supports semantic variants (`danger`, `warning`, `primary`) and rich `itemPreview` JSX.
2. **`DialogContext.tsx`**: Root provider exposed via `useConfirm()` and `useDialog()` hooks returning promises.
3. **Application Across Views**: Used across Notes, Accounts, Budgets & Goals, Assets & Liabilities, Documents, Plans, People Ledger, and Settings.

---

### 3.3 Health Score & Budget Period Scoping Bug Fix
- **Problem**: When evaluating active budgets in `src/services/ratios.ts` and `src/services/insights.ts`, the budget evaluator summed all lifetime historical expenses across 4 months of transactions. This caused even modest spend to exceed monthly limits, falsely penalizing user health scores.
- **Fix**: Filtered transactions by the current active budget period (`txDate >= startOfMonth && txDate <= endOfMonth`), restoring accurate health score calculations.

---

### 3.4 Button Consolidation & Settings Hub
- Removed cluttered "Load Demo Accounts" and "Reconcile" buttons from `AccountsView.tsx` and `DashboardView.tsx`.
- Consolidated both tools into `SettingsView.tsx` under a unified **Ledger Maintenance & Demo Data** section.

---

### 3.5 Lock Screen Centering & Zoom Fix
- Removed hardcoded `style={{ zoom: 1.25 }}` and `my-auto` from `src/components/security/LockScreen.tsx`.
- The login and vault unlock card is now centered vertically and horizontally on all viewports without scrolling or top clipping on laptop screens.

---

### 3.6 Fixed Sidebar & Independent Main Screen Scrolling
- **Problem**: Long tables and reports scrolled the entire document window, causing the sidebar to drift out of view.
- **Architectural Solution**: Pinned sidebar to 100vh (`h-screen shrink-0 w-64`) with internal independent nav scrolling (`min-h-0 overflow-y-auto custom-scrollbar`). Main screen viewport is isolated in its own smooth scroll container (`h-screen overflow-y-auto custom-scrollbar`).

---

### 3.7 P2P Device Sync Hub & Master Device Selection
- **Encrypted Zero-Knowledge Transport (`src/services/sync/`)**: PBKDF2 (50,000 iterations) key derivation from the 6-digit numeric PIN, encrypting all packets via AES-GCM 256-bit with random 96-bit IVs and 128-bit salts. Real-time Server-Sent Events (SSE) relay over `ntfy.sh`.
- **Primary Master Device Selection (`P2PSyncModal.tsx`)**: Compares live record counts side-by-side: Accounts, Transactions, Assets & Debt, Notes & Folders. Allows 1-click clean cloning ("Make This Device Master" / "Pull Master from Remote") to eliminate duplicate accounts and clutter on initial sync.

---

### 3.8 CI Build Pipeline Fixes & Multi-Platform Packaging
- **Android APK CI Pipeline (`.github/workflows/android-build.yml`)**: Upgraded to Java 21, configured `compileSdkVersion=35` in `android/gradle.properties`, automated SDK license acceptance hashes prior to sync, and ensured `npm ci --include=dev`.
- **Linux Desktop Packaging Pipeline (`.github/workflows/desktop-build.yml`)**: Switched runner to `ubuntu-22.04` (Jammy LTS) to resolve `libcrypt.so.1` missing error on Ubuntu 24.04.

---

### 3.9 Branded Multi-Platform Application Icons
Generated and configured high-resolution branded KhataGHAR icons across Windows (`.ico`), macOS (`.icns`), Linux (`icons/*`), and Android (`mipmap-*` densities).

---

### 3.10 Native SQLite Engine & Security Hardening
- **Desktop Electron SQLite (`electron/db.cjs`)**: Embedded native SQLite via Node 22 `node:sqlite` (`DatabaseSync`) with WAL journal and hardware device-bound AES-256-GCM encryption at rest.
- **JavaScript Obfuscation (`vite.config.ts`)**: Integrated `javascript-obfuscator` in production build.

---

### 3.11 First-Login Auto-Lock Bug Fix (`src/context/AuthContext.tsx`)
- **Problem**: Upon unlocking a vault for the first time, the application would abruptly re-lock after ~1 second. This was caused by two intertwined issues:
  1. The browser's software keyboard dismissal or password autofill popover triggered a `window.blur` / `visibilitychange` event immediately after entering the password, which fired `lockVault()`.
  2. The auto-lock timeout duration in `resetInactivityTimer` was susceptible to race conditions and could be initialized with an invalid or near-zero value.
- **Architectural Solution**:
  1. Added `lastUnlockTimeRef` tracking the exact millisecond when the vault was unlocked. During the first **10 seconds** following unlock, any visibility or blur events are safely ignored, allowing mobile keyboards and autofill prompts to dismiss without triggering a lock.
  2. Enforced strict validation on inactivity timeout: `const validMinutes = Math.max(1, activeVault.autoLockMinutes || 15)` and `const timeoutMs = Math.max(60000, validMinutes * 60 * 1000)`. Sub-minute timeouts can never occur.

---

### 3.12 Fixed Desktop Sidebar & Zoom Harmonization (`AppLayout.tsx`, `Sidebar.tsx`, `LockScreen.tsx`)
- **Problem**:
  1. Navigating to the Notes view previously applied `style={{ zoom: isNotesView ? 1 : 1.05 }}` in `AppLayout.tsx`, causing a jarring zoom and layout shift across the entire application interface.
  2. On shorter screens or when expanding many navigation links, the sidebar footer ("Zero-Knowledge Encrypted", "Crafted by Krish Patel") was pushed off the bottom of the screen.
- **Architectural Solution**:
  1. Completely removed the conditional zoom from `AppLayout.tsx`, standardizing on uniform 1:1 scaling across all views.
  2. Restructured [`Sidebar.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/layout/Sidebar.tsx) layout:
     ```tsx
     <aside className="fixed md:sticky top-0 left-0 z-40 h-screen h-[100dvh] w-64 flex flex-col shrink-0 bg-card border-r border-line">
       {/* Brand Header: permanently pinned */}
       <div className="shrink-0 ...">...</div>
       {/* Nav Menu: strictly scrollable with min-h-0 */}
       <nav className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-3 py-2 space-y-1">
         {NAV_ITEMS.map(...)}
       </nav>
       {/* Footer: permanently pinned */}
       <div className="shrink-0 p-3 border-t border-line">...</div>
     </aside>
     ```
  3. Upgraded [`LockScreen.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/security/LockScreen.tsx) with `max-w-lg` container, `zoom: 1.15`, and larger touch targets.

---

### 3.13 Mobile Viewport & PWA Installation Polish
- **Header Overflow Elimination (`src/components/layout/Header.tsx`)**: Secondary icons (Shortcuts cheat sheet, Documentation tour) are hidden on `<sm` viewports (`hidden sm:flex`), and the active vault badge is dynamically truncated, eliminating horizontal scrollbar leaks on small mobile phones.
- **Reference-Counted Scroll Locking (`src/components/common/Modal.tsx`)**: Replaced raw `document.body.style.overflow = 'hidden'` with reference-counted `useBodyScrollLock` from `src/utils/scrollLock.ts`, preventing screen freezes when opening or closing nested modals.
- **Safe Area Bottom Insets (`src/components/layout/BottomNav.tsx`)**: Added `pb-[calc(0.25rem+env(safe-area-inset-bottom,0px))]` to ensure the navigation bar clears gesture pill bars on iOS Safari and modern Android devices.
- **PWA Installation Modal Polish (`src/components/common/PWAInstallModal.tsx`)**: Removed duplicate return statements, added mobile scroll wrappers (`max-h-[85vh] overflow-y-auto`), top-aligned step badges, and provided dedicated Android Chrome and iOS Safari home-screen instructions.

---

### 3.14 Buy Me a Coffee Patronage System & Milestone Reminders
Implemented a full, sovereign-friendly patronage architecture honoring Krish Patel’s open-source manifesto:
1. **Official Buy Me a Coffee Integration**:
   - Styled to official BMC specifications: `#FFDD00` gold background, `#000000` typography, Lato font, and official white coffee cup icon linking to `https://buymeacoffee.com/Krrish1411`.
   - Built natively in React/Tailwind with SVG assets so it works 100% offline without external tracking scripts.
2. **Welcome Screen Integration (`src/components/welcome/WelcomeLandingView.tsx`)**:
   - Prominently featured in the top header nav bar.
   - P2P sync community donation callout under the feature comparison table, explaining how community support maintains free WebRTC signaling relays.
   - Krish Patel's Creator Manifesto at the bottom of the page: *"Why I Built KhataGHAR"*, sharing the story of sovereign, local-first computing with a direct patronage button.
3. **Settings Card ("Support Not on Face") (`src/components/settings/SupportSettingsCard.tsx`)**:
   - Added a dedicated patronage card in `SettingsView.tsx` under General preferences.
   - Provides full transparency on zero-cloud architecture and community relays.
   - Includes a toggle for **"Milestone & Support Reminders"** controlling `localStorage ('khata_coffee_opt_out')`.
4. **Gentle Milestone Modal (`src/components/common/SupportCoffeeModal.tsx` & `AppLayout.tsx`)**:
   - Automatically triggers only after the user has demonstrated active discipline by recording **10 or more entries** (`transactions.length >= 10`).
   - Repeats at most once every **7 days** (`khata_coffee_last_prompt_ts`).
   - Displays live user milestone stats (e.g. *14 Entries Tracked*, *3 Portfolios*).
   - **"Not now (remind in a week)"**: Snoozes for 7 days and triggers a friendly reassurance toast:  
     *“No worries! KhataGHAR is and will always remain 100% free, private, and offline forever.”*
   - **"Don't show again"**: Permanently opts out (`khata_coffee_opt_out = 'true'`).

---

### 3.15 Direct P2P Device Sync from Welcome Screen (`src/components/sync/WelcomeP2PSyncModal.tsx`)
- **The Problem Solved**:
  - Previously, a user opening KhataGHAR on a second device (like an Android phone or secondary laptop) was forced to either:
    1. Create a dummy vault (fill out master password, confirm password, enter app) before accessing P2P Sync.
    2. Or export a backup file and manually transfer it.
- **The Architectural Solution**:
  - Created [`WelcomeP2PSyncModal.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/sync/WelcomeP2PSyncModal.tsx), offering direct, zero-friction pairing directly from the **Welcome Screen** and **Lock Screen**.
  - **Direct Access Points**:
    1. Welcome Screen Top Header: **"Sync Device"** button.
    2. Welcome Screen Hero Section: **"Sync from Existing Device"** primary action button.
    3. Welcome Screen Bottom CTA: **"Sync from Existing Device"** button.
    4. Lock Screen: **"P2P Sync"** secondary link.
  - **Protocol Enhancement (`syncTypes.ts` & `syncEngine.ts`)**:
    - Added `{ type: 'REQUEST_FULL_STATE'; timestamp: number }` to `SyncMessage`.
    - When the joiner device connects via PIN, it calls `syncEngine.requestFullSync()`. The host device automatically invokes `forceCloneToPeer` with its active vault data and metadata.
  - **Zero-Knowledge Key Derivation on New Device**:
    - The new device prompts for the user's Master Vault Password.
    - Upon receiving the encrypted wire payload, it generates a fresh cryptographic salt (`generateSalt()`), derives a local AES-256 key (`deriveKey()`), generates the cryptographic verifier (`generateVerifier()`), encrypts all records, and saves them to IndexedDB/SQLite.
    - Persists master pairing metadata (`khataghar_sync_masterEstablished = true`, `masterRole = 'secondary'`).
    - Activates the session immediately with `refreshVaultList()` and `setSessionCredentials(vault, key)`.
  - **Result**: A user opens KhataGHAR on their phone, clicks "Sync from Existing Device", types the 6-digit PIN and password, and is instantly on their dashboard with their complete financial vault.

### 3.10 Welcome Screen Redraft, Mobile Top Bar Optimization & CI Workflow Hardening (`src/components/welcome/WelcomeLandingView.tsx` & `.github/workflows/*`)
- **Mobile Top Bar & Layout Bug Fix**:
  - **Root Cause Identified**: The welcome screen had `style={{ zoom: 1.25 }}` at root, shrinking effective viewport width on mobile and causing the "Back to Vault Lock" button to line-break into a 4-line vertical box ("Back \n to \n Vault \n Lock") and squish header buttons against the screen edge.
  - **Resolution**:
    - Removed root zoom and applied standard viewport-relative scaling.
    - Added safe-area padding (`style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}`) to header for notched Android and iOS displays.
    - Header actions upgraded with `whitespace-nowrap`, `shrink-0`, and responsive text/icon labels (e.g. `<span className="hidden sm:inline">Back to Lock</span><span className="sm:hidden">Lock</span>`).
    - Buy Me a Coffee button displays as a compact gold icon button on mobile screens and expands to include text on `sm` screens.
- **Complete Redraft Matching Lifelog Architecture & Depth**:
  - Rebuilt [`WelcomeLandingView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/welcome/WelcomeLandingView.tsx) adopting the structure, typography, and visual hierarchy of Lifelog (`Lifelog-main/src/views/Welcome.tsx`), styled to KhataGHAR's sovereign emerald/pine wealth theme.
  - **Sticky Header**: Brand logo, version badge (`v1.0.0 Sovereign`), open-source status, anchor links (Live Sandbox, Capabilities, Why KhataGHAR, Downloads, Source Code, Philosophy), theme toggle, GitHub button, Buy Me a Coffee button, and Launch/Create action.
  - **Hero Section**:
    - Trust pill (*100% Free & Open Source (MIT) · Zero Telemetry · Offline AES-256-GCM · Direct P2P Sync**).
    - Display headline: *"The Sovereign Wealth Operating System."*
    - Psychological reassurance banner: *"Massive Financial Power, Zero Overwhelm"*.
    - Value pillars strip: Speed (*Sub-5ms Boot*), Security (*Hardware AES-256*), Pricing (*$0 · No Paywalls*), License (*MIT Open Source*).
  - **Interactive 3-Tab Financial Sandbox**:
    1. *SIP Compounding*: Live sliders for monthly SIP (₹2,000–₹50,000), expected CAGR (8%–18%), and horizon (3–25 years) with real-time future value and wealth gain calculations.
    2. *Cashflow Burn Radar*: Sliders for monthly burn and liquid reserves calculating exact emergency survival months with color-coded safety badges.
    3. *Duress PIN Decoy Simulator*: Live interactive toggle demonstrating how entering decoy PIN `0000` flips the display from ₹54.8L net worth to ₹2,450 pocket cash while keeping true assets completely invisible.
  - **Loss Aversion Comparison**: Detailed 2-column comparison against commercial cloud finance SaaS (SMS scraping, loan telemarketing, server leaks vs. client-side AES-256-GCM and zero permissions).
  - **8 Institutional Capabilities Grid**: Deep dives into Smart SIP lot merging, Duress decoy PIN, Burn radar, Debt accelerator, Double-entry accounting, Custodial funds, Schedule-AL compliance, and P2P sync.
  - **Cross-Platform Downloads Hub**:
    - Cards for Windows (.exe), macOS (.dmg), Linux (.AppImage/.deb), Android (.apk), iOS (PWA), and Web App.
    - Expandable iOS Safari step-by-step guide (Share > Add to Home Screen).
    - Expandable Android APK Safety Center featuring VirusTotal 0/70 clean scan audit, cryptographic SHA-256 checksum copy command, zero-permissions manifest audit, and 1-tap sandboxed PWA option.
  - **The Sovereign Covenant & Independent Funding**: Forever-free core ledger guarantee, optional future Pro add-ons roadmap, and P2P sync relay donation notice.
  - **Creator Philosophy & Manifesto**: *"Why I Built KhataGHAR"* by Krish Patel with Buy Me a Coffee patronage button and GitHub link.
- **GitHub Actions CI/CD Pipeline Hardening**:
  - **No Automated Release Builds on Main**: Removed `branches: [main]` trigger from `android-build.yml` and `desktop-build.yml`. Release builds only run via `workflow_dispatch` (manual) or release tags (`v*.*.*`).
  - **Artifact Retention Limits**: Set `retention-days: 1` across `android-build.yml`, `desktop-build.yml`, and `ci.yml` to conserve GitHub storage and minute quotas.
  - **Capacitor CLI Node.js 22 Upgrade**: Upgraded Node.js setup from `20` to `22` across all workflow files, resolving the Capacitor 8 build failure (`The Capacitor CLI requires NodeJS >=22.0.0`).
  - **Release Configuration**: Configured `release.yml` with Node 22 and `prerelease: true` for alpha/beta releases.

---

## 4. Verification & Build Integrity

- **TypeScript Compilation**: `npx tsc -b` passed with **0 errors**.
- **Production Web Bundle**: `npm run build` compiled successfully in **31.63s** (dist generated with 23 precached PWA entries).
- **Capacitor Android Sync**: `npx cap sync android` completed in **0.113s** with **0 errors**.
- **Cross-Platform Compatibility**: Tested and verified on Linux desktop and Android Capacitor WebView.

---

## 5. Guidelines for Future AI & Developer Extensions

When adding new features or modifying existing pages in KhataGHAR:
1. **Never Use Native Dialogs**: Do not call `window.confirm()` or `window.alert()`. Always use `const confirm = useConfirm()` from `../context/DialogContext` or instantiate `<Modal>` / `<ConfirmModal>`.
2. **Follow Theme Semantic Tokens**:
   - Use `bg-card` for surfaces, `bg-moss` for page backdrops and muted strips, `border-line` for borders, and `text-ink` for typography.
   - Use `pine-*` for positive/primary actions, `mari-*` for warnings/alerts, and `flare-*` for debts/danger.
3. **Desktop Viewport & Scrolling Integrity**:
   - The outer application wrapper is `h-screen h-[100dvh] overflow-hidden flex bg-ground text-ink`.
   - The desktop sidebar is `fixed md:sticky top-0 left-0 z-40 h-screen h-[100dvh] w-64 shrink-0 flex flex-col bg-card border-r border-line` with internal `<nav className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">`.
   - The main content column is `flex-1 flex flex-col min-w-0 h-screen h-[100dvh] overflow-y-auto overflow-x-hidden custom-scrollbar`.
   - Never remove `shrink-0` from the sidebar or make the root container window scrollable.
4. **Input Safety & Spacebar Handling**:
   - Never call `.trim()` inside live input `onChange` handlers (it destroys the spacebar). Only trim upon form submission or blur.
5. **Multi-Device Sync Invariants**:
   - Maintain PBKDF2 key derivation and AES-GCM-256 wire encryption in `syncCrypto.ts`.
   - Any new state fields added to `VaultData` must be mirrored in `syncTypes.ts` and `syncEngine.ts`.
6. **Support & Patronage Guidelines**:
   - Patronage prompts must remain respectful ("support not on face").
   - Users must always have a 1-click option to snooze or permanently disable in-app prompts.
   - Reassure users upon dismissal that KhataGHAR is 100% free, private, and offline forever.
7. **Release Invariants**:
   - Do NOT create git release tags or trigger CI release builds without the user's explicit consent.
   - All workflow artifacts must adhere to `retention-days: 1`.
