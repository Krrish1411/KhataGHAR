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
| **Multi-Platform Icons** | `[NEW]` [`build/icon.ico`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/build/icon.ico)<br>`[NEW]` [`build/icon.icns`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/build/icon.icns)<br>`[NEW]` [`build/icon.png`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/build/icon.png)<br>`[NEW]` [`build/icons/*`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/build/icons/)<br>`[MOD]` [`android/app/src/main/res/mipmap-*/*`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/android/app/src/main/res/)<br>`[MOD]` [`android/app/src/main/res/values/ic_launcher_background.xml`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/android/app/src/main/res/values/ic_launcher_background.xml) | Multi-resolution Windows ICO (16–256px), Apple ICNS container with chunks `icp4` through `ic10` (16–1024px), discrete Linux PNGs (16x16 to 512x512), and Android launcher icons across mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi with brand graphical asset (navy `#1c263e` badge with golden house, rupee coin, and upward growth chart). Configured in `electron-builder.json`, `electron/main.cjs`, `index.html`, and `vite.config.ts`. |
| **Native SQLite Engine** | `[NEW]` [`electron/db.cjs`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/electron/db.cjs)<br>`[NEW]` [`src/db/sqliteElectronAdapter.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/db/sqliteElectronAdapter.ts)<br>`[NEW]` [`src/db/index.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/db/index.ts)<br>`[NEW]` [`src/utils/deviceKey.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/utils/deviceKey.ts) | Embedded native SQLite via Node 22 `node:sqlite` (`DatabaseSync`) in Electron. WAL journal, normalized tables, B-Tree indexes, atomic `VACUUM INTO`, and hardware device-bound AES-256-GCM encryption at rest. |
| **Settings Restructuring** | `[MOD]` [`src/views/SettingsView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/SettingsView.tsx)<br>`[NEW]` [`src/components/settings/StorageDiagnosticsCard.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/settings/StorageDiagnosticsCard.tsx)<br>`[NEW]` [`src/components/settings/UniversalBackupCard.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/settings/UniversalBackupCard.tsx) | Restructured settings into 5 tabs: (1) General & Preferences, (2) Security & Camouflage, (3) Storage & SQLite, (4) Backups & Migration, (5) P2P Device Sync. |
| **Code Obfuscation** | `[MOD]` [`vite.config.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/vite.config.ts) | Integrated `javascript-obfuscator` in production build with control flow flattening, base64 string array encoding, string splitting, hexadecimal identifier scrambling, and console disabling. |
| **Custodial Accounting** | `[MOD]` [`src/utils/financials.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/utils/financials.ts)<br>`[MOD]` [`src/views/AssetsLiabilitiesView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/AssetsLiabilitiesView.tsx)<br>`[NEW]` [`src/components/accounts/RelocateHoldingModal.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/accounts/RelocateHoldingModal.tsx) | Fixed false negative cash balances when parking third-party custodial funds in assets. Segregated liquid reservations from asset holdings. Added True Personal Equity badges and 1-click Relocate Holding modal. |
| **Screen-Captured PDF** | `[MOD]` [`src/services/export.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/services/export.ts)<br>`[MOD]` [`src/components/reports/PdfExportModal.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/reports/PdfExportModal.tsx) | Look-alike 2x retina screen-capture PDF via `html2canvas` with multi-page A4 slicing. Fixed jsPDF Unicode encoding bug by replacing `₹` with `Rs. ` for vector exports. |
| **Emergency Survival Meter** | `[MOD]` [`src/views/ReportsView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/ReportsView.tsx) | CFA-grade liquidity runway survival meter with Fragile (< 3 mo), Adequate (3–6 mo), and Fortress ($\ge$ 6 mo) benchmark gauges and rupee surplus/shortfall calculation. |
| **Double Password Confirm** | `[MOD]` [`src/views/SettingsView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/SettingsView.tsx) | Double-entry confirmation for encrypted backups with show/hide eye toggles, real-time match indicator, and download block on mismatch. |
| **Dismissible Alerts** | `[MOD]` [`src/views/DashboardView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/DashboardView.tsx) | Dismissible dashboard alert insights with `localStorage` persistence. |
| **Nested Multi-Modals** | `[MOD]` [`src/components/transactions/QuickAddModal.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/transactions/QuickAddModal.tsx)<br>`[MOD]` [`src/components/people/PeopleEntryModal.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/people/PeopleEntryModal.tsx) | On-the-fly creation of Categories, Accounts, Contacts, Assets, and Liabilities with zero parent form data loss. Added "Directly Paid by Someone Else" and "Trip Splitter" modes. |
| **Unified GitHub Release Assets** | `[MOD]` [`.github/workflows/android-build.yml`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/.github/workflows/android-build.yml)<br>`[MOD]` [`.github/workflows/desktop-build.yml`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/.github/workflows/desktop-build.yml)<br>`[MOD]` [`.github/workflows/release.yml`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/.github/workflows/release.yml) | Integrated `softprops/action-gh-release@v2` across all workflows to directly attach release binaries to GitHub Releases on tag `v*` (Android APK, Linux AppImage/deb/tar.gz, Windows Setup/Portable .exe, macOS DMG/zip, Web zip) with strict `retention-days: 1`. |
| **Android CI Gradle Fix & Signing** | `[MOD]` [`android/variables.gradle`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/android/variables.gradle)<br>`[MOD]` [`android/app/build.gradle`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/android/app/build.gradle)<br>`[MOD]` [`.github/workflows/android-build.yml`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/.github/workflows/android-build.yml) | Resolved CI Gradle failure (`BUILD FAILED in 47s`) by upgrading `compileSdkVersion=36` and `targetSdkVersion=36` to match AndroidX Core 1.17.0. Added automated release keystore generation and signing configuration for `assembleRelease`. |
| **Electron Packaging & Platform Names** | `[MOD]` [`electron-builder.json`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/electron-builder.json)<br>`[MOD]` [`package.json`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/package.json) | Added `tar.gz` to Linux targets. Enforced explicit platform names in binary artifacts (`KhataGHAR-Linux-...`, `KhataGHAR-Windows-Setup-...`, `KhataGHAR-Windows-Portable-...`, `KhataGHAR-macOS-...`). Set version to `1.0.0-beta.1`. |
| **In-App Update Engine** | `[NEW]` [`src/services/updater.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/services/updater.ts)<br>`[NEW]` [`src/types/updater.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/types/updater.ts)<br>`[NEW]` [`public/version.json`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/public/version.json)<br>`[NEW]` [`src/components/common/UpdateModal.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/common/UpdateModal.tsx)<br>`[NEW]` [`src/components/settings/UpdateSettingsCard.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/settings/UpdateSettingsCard.tsx)<br>`[MOD]` [`src/views/SettingsView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/SettingsView.tsx)<br>`[MOD]` [`src/components/layout/AppLayout.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/layout/AppLayout.tsx) | Built sovereign in-app update checker. Checks GitHub releases API (with beta pre-release channel support) and canonical `version.json`. SemVer 2.0.0 comparator, 24h background check with silent failure, zero-preflight fetch, `CapacitorHttp` mobile bypass, and dedicated Settings card. |
| **Android WebView Cache Trap Guard** | `[MOD]` [`src/main.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/main.tsx) | Prevented Android WebView permanently caching stale bundles on in-place APK upgrades by unregistering service workers and clearing `CacheStorage` on native mobile, registering SW only for Web PWA. |
| **Baseline Date & Decimal Precision** | `[MOD]` [`src/utils/dates.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/utils/dates.ts)<br>`[MOD]` [`src/utils/formatters.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/utils/formatters.ts) | Fixed `isTxAfterBaseline` from strict `>` to inclusive `>=` so transactions on baseline date affect account balance. Fixed `formatCompactCurrency` to show 2 decimal places for fractional values $< 1000$ (e.g. ₹0.10, ₹0.50). |
| **Global Dynamic P2P Sync Engine** | `[MOD]` [`src/services/sync/syncEngine.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/services/sync/syncEngine.ts)<br>`[MOD]` [`src/components/sync/P2PSyncModal.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/sync/P2PSyncModal.tsx)<br>`[MOD]` [`src/context/VaultContext.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/context/VaultContext.tsx) | Wired full-duplex global dynamic sync directly into `VaultContext`. Implemented `isApplyingRemoteSyncRef` echo loop prevention, debounced auto-broadcasting on any local mutation, `resetMasterStatus()` on new sessions, and fixed PIN re-display during active sync. |
| **Notes Markdown AST & State Restore** | `[NEW]` [`src/utils/markdown.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/utils/markdown.tsx)<br>`[MOD]` [`src/views/NotesView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/NotesView.tsx) | Built AST-based markdown renderer (ported from Lifelog, zero `dangerouslySetInnerHTML`) with checklists, headings, code, and text formatting. Fixed Android preview horizontal overflow (`break-words`, `overflow-x-hidden`). Restores last active note via `khataghar_last_note_id` or top note by `updatedAt`. |
| **Lifelog Mobile Parity (Insets & Back Button)** | `[NEW]` [`src/utils/native.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/utils/native.ts)<br>`[MOD]` [`src/components/layout/Header.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/layout/Header.tsx)<br>`[MOD]` [`src/components/layout/BottomNav.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/layout/BottomNav.tsx)<br>`[MOD]` [`src/components/layout/AppLayout.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/layout/AppLayout.tsx) | Edge-to-edge safe area insets (`env(safe-area-inset-top)` & `bottom`) avoiding camera notch collision. Dynamic Android status bar theme synchronization (`@capacitor/status-bar`). Hardware back button navigation closing modals/drawers (`@capacitor/app`). Tactile haptic feedback. |
| **Financial Calculators Suite & Amortization** | `[NEW]` [`src/views/CalculatorsView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/CalculatorsView.tsx)<br>`[MOD]` [`src/App.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/App.tsx)<br>`[MOD]` [`src/components/layout/Sidebar.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/layout/Sidebar.tsx) | Complete institutional financial suite (SIP, Step-Up SIP, Lumpsum, SWP, FIRE Runway, Loan Schedule). Return rates start from 0% (min 0 to 30). Loan calculator includes month-by-month and year-by-year Amortization Tables with prepayment tenure and interest savings simulation. |
| **Scheduled Native Notifications** | `[MOD]` [`src/utils/nativeNotification.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/utils/nativeNotification.ts)<br>`[MOD]` [`src/types/index.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/types/index.ts)<br>`[MOD]` [`src/views/PlansView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/PlansView.tsx)<br>`[MOD]` [`src/context/VaultContext.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/context/VaultContext.tsx) | Created Android notification channel `reminders` with high importance, vibration & sound. Integrated `@capacitor/local-notifications` to schedule alarms at 9:00 AM on due date or 1/2/3/7 days before. Automatic launch scan alerting user of upcoming bills & approaching savings goals. |
| **Reconciliation Diff Modal & Demo Guard** | `[NEW]` [`src/components/accounts/ReconciliationDiffModal.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/accounts/ReconciliationDiffModal.tsx)<br>`[MOD]` [`src/context/VaultContext.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/context/VaultContext.tsx)<br>`[MOD]` [`src/views/SettingsView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/SettingsView.tsx) | Interactive reconciliation discrepancy table comparing Stored Balance vs Calculated Double-Entry Ledger Balance with green/crimson delta badges and per-account selection checkboxes. Added safety confirmation guard to "Load Institutional Demo Data". |
| **Mobile Typography Polish & Branded Icons** | `[MOD]` [`src/views/ReportsView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/ReportsView.tsx)<br>`[MOD]` [`src/views/DashboardView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/DashboardView.tsx)<br>`[MOD]` [`src/views/TransactionsView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/TransactionsView.tsx)<br>`[MOD]` [`public/favicon.svg`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/public/favicon.svg)<br>`[MOD]` [`android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml) | Executive KPI responsive typography (`text-lg sm:text-[24px] truncate`), responsive Hero Available to Spend (`text-2xl sm:text-[38px] lg:text-[42px]`), hidden desktop shortcut hints on mobile (`hidden md:inline-flex`), and branded pine green rounded badge with white Indian Rupee `₹` vector emblem for PWA favicon and Android launcher. |

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

### 3.8 Unified Cross-Platform Release Engineering, Android Gradle CI Fix, and In-App Update Engine

1. **Direct GitHub Release Binary Attachment**:
   - Integrated `softprops/action-gh-release@v2` across all workflows (`android-build.yml`, `desktop-build.yml`, `release.yml`) so all compilation jobs attach their built binaries directly to the GitHub release tag:
     - **Android**: `release-apk/KhataGHAR-Android-${TAG}.apk` and `KhataGHAR-Android.apk`
     - **Linux**: `release/*Linux*.AppImage`, `release/*Linux*.deb`, `release/*Linux*.tar.gz`
     - **Windows**: `release/*Windows-Setup*.exe`, `release/*Windows-Portable*.exe`
     - **macOS**: `release/*macOS*.dmg`, `release/*macOS*.zip`
     - **Web**: `khata-ghar-${TAG}.zip`
   - Added `prerelease: true` to support beta releases (`v1.0.0-beta.1`).
   - Retained strict `retention-days: 1` across all internal CI artifacts to minimize GitHub storage and runner usage.

2. **Android CI Gradle Compilation & Keystore Signing Fix**:
   - **Root Cause of `BUILD FAILED in 47s`**: AndroidX Core `1.17.0` requires `compileSdkVersion 36`. When KhataGHAR compiled with SDK 35, Gradle dependency resolution worker threads failed.
   - **Solution**: Upgraded `compileSdkVersion = 36` and `targetSdkVersion = 36` in `android/variables.gradle`.
   - **Signing Pipeline**: Configured `signingConfigs.release` in `android/app/build.gradle` and automated keystore generation (`khataghar-release.keystore` with `keytool`) inside `android-build.yml` prior to `./gradlew assembleRelease --stacktrace`, guaranteeing signed, installable APK production.

3. **Electron Packaging & Explicit Platform Naming**:
   - Added `"tar.gz"` target to `electron-builder.json` under Linux.
   - Standardized artifact naming to guarantee platform clarity:
     - Linux: `KhataGHAR-Linux-${version}-${arch}.${ext}`
     - Windows: `KhataGHAR-Windows-Setup-${version}.${ext}` and `KhataGHAR-Windows-Portable-${version}.exe`
     - macOS: `KhataGHAR-macOS-${version}-${arch}.${ext}`
   - Synced `package.json` version to `1.0.0-beta.1`.

4. **In-App Update Engine (`src/services/updater.ts`)**:
   - **Multi-Source Remote Fetch**: Queries the GitHub Releases API (`https://api.github.com/repos/Krrish1411/KhataGHAR/releases`) which includes pre-releases/betas, extracting release assets into download URLs. Falls back to canonical `public/version.json` and raw GitHub content.
   - **SemVer 2.0.0 Pre-Release Parsing**: `parseSemVer()` and `isNewerVersion()` accurately handle pre-release identifiers (`1.0.0-beta.2` > `1.0.0-beta.1`, `1.0.0` > `1.0.0-beta.1`).
   - **CORS Bypass & Crash-Proof Design**: Uses native `CapacitorHttp` on Android to bypass Chromium WebView CORS entirely; uses simple `fetch` with timestamp cache-busting (`?_t=...`) and no custom headers on Web/Electron to eliminate HTTP 403 CORS preflight errors on GitHub.
   - **Daily Background Check**: `checkDailyUpdate(APP_VERSION)` executes once every 24 hours on application launch (`localStorage.getItem('khataghar_last_update_check')`), failing completely silently if offline.
   - **Settings Integration**: `UpdateSettingsCard.tsx` added to Settings General tab displaying installed version (`v1.0.0-beta.1`), channel (`Beta Preview`), detected runtime platform, and manual "Check for Updates" trigger with clear loading and error feedback.
   - **Update Modal**: `UpdateModal.tsx` provides changelog highlights, single targeted platform download button, and a link to the complete GitHub releases hub.

5. **Android WebView Stale Cache Trap Fix (`src/main.tsx`)**:
   - Following `skills/webapp-to-electron/SKILL.md`, service worker registration is bypassed on native Capacitor Android and Electron. Active service workers are unregistered and `CacheStorage` is wiped on boot to ensure in-place APK updates load fresh JavaScript immediately.

---

### 3.16 Baseline Date Comparison & Decimal Precision Fix (`0.1` Rs Hero Card Fix)
- **The Problem**:
  1. Entering a small transaction like `0.1` Rs or `0.5` Rs did not reflect in the green Available to Spend hero card or account balance if the transaction date was the same as the account creation / baseline date.
  2. In `formatCompactCurrency`, amounts under 1,000 were passed through `abs.toFixed(0)`. Fractional amounts like `0.1` Rs were rounded down to `0` and displayed as `₹0`, making users believe the entry was ignored.
- **Root Cause & Architectural Solution**:
  1. In [`src/utils/dates.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/utils/dates.ts), `isTxAfterBaseline(txDate, baselineDate)` previously performed a strict greater-than comparison (`dTx > dBase`). When an account was created on `2026-09-16` and a transaction was entered on `2026-09-16`, the comparison evaluated to `false`, silently excluding the transaction from balance recalculation. Changed to inclusive comparison `dTx >= dBase`.
  2. In [`src/utils/formatters.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/utils/formatters.ts), `formatCompactCurrency` was upgraded:
     ```typescript
     if (abs < 1000) {
       const formatted = abs % 1 === 0 ? abs.toLocaleString('en-IN') : abs.toFixed(2);
       return `${sign}${symbol}${formatted}`;
     }
     ```
     Amounts like `0.1` now render cleanly as `₹0.10`, `0.5` as `₹0.50`, and `12.75` as `₹12.75`.

---

### 3.17 Global Dynamic P2P Sync Engine & Echo Loop Prevention
- **The Problem**:
  1. P2P sync only applied incoming state updates when the user had the `P2PSyncModal` open. As soon as the modal was closed, the listener was torn down and incoming updates were dropped.
  2. When pairing two devices, entering the PIN caused the UI to freeze or briefly flash the PIN creation card again because `status === 'syncing'` did not match the strict `status === 'connected'` check.
  3. Master device selection dialog was suppressed on subsequent pairings because `khataghar_sync_masterEstablished` remained `true` in `localStorage` forever.
  4. Adding an entry on Device A did not automatically stream to Device B in real time without manual syncing.
- **Architectural Solution**:
  1. **Global Sync Listener in `VaultContext.tsx`**:
     - Bound `syncEngine.onStateApply` inside `VaultContext` lifecycle. Whenever a peer broadcasts an encrypted state update, `VaultContext` decrypts and persists it into Dexie IndexedDB and updates React state.
     - Registered `syncEngine.registerLocalStateGetter(() => vaultData)` so the engine can package and transmit complete vaults on demand.
  2. **Echo Loop Guard (`isApplyingRemoteSyncRef`)**:
     - Auto-broadcasting local changes to peers can trigger an infinite echo loop if Device B re-broadcasts the state it just received from Device A.
     - Introduced an `isApplyingRemoteSyncRef` latch that flags when state is mutating due to an incoming remote packet. Auto-broadcasting is suppressed during remote application.
  3. **Debounced Auto-Broadcasting**:
     - Added `debouncedBroadcastRef` (350ms window) in `VaultContext`. Any local mutation (creating an entry, adding an account, editing a note, updating a plan) automatically broadcasts delta payloads over encrypted SSE channels to all connected peers.
  4. **Master Status Reset & Status Normalization**:
     - In [`src/services/sync/syncEngine.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/services/sync/syncEngine.ts), added `resetMasterStatus()` which clears `khataghar_sync_masterEstablished` whenever `hostSession()` or `joinWithPin()` is called, ensuring the Master/Replica prompt cleanly triggers on every new pairing session.
     - In [`src/components/sync/P2PSyncModal.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/sync/P2PSyncModal.tsx), normalized `isPaired = ['connected', 'syncing', 'synced'].includes(status)`. The user remains in the connected hub with live animated sync spinners instead of being dumped back into PIN generation.

---

### 3.18 Notes Markdown AST Parser Engine, Android Preview Fit & Note Selection Persistence
- **The Problem**:
  1. Notes preview on Android clipped text, lacked proper styling, and broke layout on long words or code blocks.
  2. Navigating to the Notes view always opened a fixed arbitrary note instead of the last active note or the most recently edited note.
  3. Markdown rendering relied on simplistic replacements without AST nesting or interactive checklist capabilities.
- **Architectural Solution**:
  1. **Zero-Dependency AST Markdown Parser (`src/utils/markdown.tsx`)**:
     - Ported from Lifelog's architecture without external dependencies or `dangerouslySetInnerHTML`.
     - Supports headers (`#` to `####`), blockquotes, horizontal dividers, unordered lists, ordered lists, task checklists (`- [ ]`, `- [x]`), inline code, code blocks, bold, italic, underline, strikethrough, and highlight tokens (`==highlight==`).
  2. **Android Preview Layout Hardening (`src/views/NotesView.tsx`)**:
     - Applied `break-words`, `overflow-x-hidden`, and responsive container padding (`p-4 sm:p-8`).
     - Standardized mobile top bar with truncated titles and compact icons to eliminate viewport horizontal overflow.
  3. **Session Note Selection Persistence**:
     - On note selection or creation, persisted `khataghar_last_note_id` to `localStorage`.
     - On mount, restored `khataghar_last_note_id`. If absent, sorted all notes by `updatedAt` descending and selected the newest note (`sorted[0]`), eliminating the stale fixed-note behavior.

---

### 3.19 Lifelog Mobile Parity (Safe Area Insets, Android Status Bar, Hardware Back Button & Haptics)
- **Parity with Lifelog Architecture**:
  1. **Edge-to-Edge Safe Area Insets**:
     - Added `pt-[env(safe-area-inset-top,0px)]` and dynamic header height `h-[calc(60px+env(safe-area-inset-top,0px))]` in [`Header.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/layout/Header.tsx) to prevent headers colliding with Android camera notches and punch-holes.
     - Added `pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]` in [`BottomNav.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/layout/BottomNav.tsx) to clear home indicator bars.
  2. **Native Status Bar Theme Synchronization (`src/utils/native.ts`)**:
     - Integrated `@capacitor/status-bar`. In [`AppLayout.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/layout/AppLayout.tsx), dynamically calls `configureStatusBar(theme)` to synchronize Android status bar text style (`Style.Dark` vs `Style.Light`) and background with the active KhataGHAR theme.
  3. **Android Hardware Back Button Handler**:
     - Integrated `@capacitor/app`. In [`AppLayout.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/layout/AppLayout.tsx), registered `initHardwareBackButton()` which intercepts physical and gesture back button presses:
       - If a modal or sheet is open, it closes the topmost modal.
       - If the mobile navigation drawer is open, it dismisses the drawer.
       - If on a nested subpage, it navigates backward before exiting the app.
  4. **Tactile Haptic Feedback**:
     - Integrated `triggerHaptic()` in [`BottomNav.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/layout/BottomNav.tsx) and primary action triggers, providing responsive haptic taps on Android.

---

### 3.20 Sovereign Financial Calculators Suite (`src/views/CalculatorsView.tsx`)
- **Institutional Financial Calculators**:
  - Implemented 6 institutional-grade wealth planning calculators:
    1. **SIP Calculator**: Monthly investment compounding with invested amount, estimated returns, and total future wealth.
    2. **Loan Repayment & Amortization Schedule**: Calculates exact monthly EMI, total interest, and total payable. Features:
       - **0% Baseline Rate**: Minimum interest rate starts from **0%** (supports interest-free loans and zero-cost financing).
       - **Interactive Amortization Schedule**: Dynamic month-by-month and year-by-year tabular breakdown showing Beginning Balance, Principal Paid, Interest Paid, and Ending Balance.
       - **Prepayment Savings Simulator**: Interactive slider for extra monthly prepayment calculating exact interest rupees saved and tenure reduction in months.
    3. **Step-Up SIP Calculator**: Compounding with annual step-up percentage (e.g. 10% annual salary hike).
    4. **Lumpsum Calculator**: One-time capital growth over 1–40 years.
    5. **SWP (Systematic Withdrawal Plan)**: Post-retirement monthly cash generation and capital longevity.
    6. **FIRE Freedom Runway**: Financial Independence Retire Early milestone target and years-to-freedom calculator.
- **Navigation & Routing**:
  - Registered route `/calculators` in [`src/App.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/App.tsx).
  - Added "Financial Tools" link with `Calculator` icon under Finance in [`src/components/layout/Sidebar.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/layout/Sidebar.tsx).

---

### 3.21 Native Scheduled Notifications for Bills, Reminders & Goals (`src/utils/nativeNotification.ts` & `src/views/PlansView.tsx`)
- **Android Notification Channel (`reminders`)**:
  - Configured high-importance Android channel with sound, vibration, and pine green `#12855a` accent lights via `@capacitor/local-notifications`.
- **Scheduled Alarms at 9:00 AM (`schedulePlanNotification`)**:
  - Computes exact target trigger date at 9:00 AM on the due date or 1, 2, 3, or 7 days prior according to user preference.
  - Deterministically hashes plan IDs to positive 32-bit integers (`hashStringToInt`) ensuring reliable cancellation (`cancelPlanNotification`) upon bill settlement or deletion.
- **Background Reminders Scanner on Boot (`checkAndNotifyUpcomingReminders`)**:
  - Runs once per calendar date on vault unlock. Scans active pending plans due today, tomorrow, or in 2 days, and goals within 7 days of their milestone date, triggering native OS desktop alerts and web notifications.
- **In-App Plan Modal Controls**:
  - Added OS Notification Reminder switch and "Remind me" selector (`On due date`, `1 day before`, `2 days before`, `3 days before`, `1 week before`) in `PlanModal`.

---

### 3.22 Account Reconciliation Discrepancy Diff Modal & Demo Guard (`src/components/accounts/ReconciliationDiffModal.tsx`)
- **Interactive Discrepancy Diff Preview**:
  - Implemented `ReconciliationDiffModal.tsx` comparing Stored Account Balances against true double-entry ledger calculations in real-time without mutating the database.
  - Displays per-account opening baseline balances, dates, live ledger totals, and colored discrepancy badges (green `+` for surplus, crimson `-` for shortfall, gray `Matched`).
  - Selective reconciliation: user can check/uncheck specific accounts or 1-click select all to commit corrections.
  - Exposes `getReconciliationPreview()` and selective `reconcileAccounts(accountIds)` in `VaultContext`.
- **Demo Data Confirmation Guard**:
  - Wrapped "Load Realistic Indian Demo Data" in `SettingsView.tsx` with an in-app confirmation modal (`useConfirm`) preventing accidental overwriting or injection of test data into active user vaults.

---

### 3.23 Mobile Typography Polish & Branded Pine Green Rupee Icons
- **Responsive Typography Across Small Displays**:
  - In `ReportsView.tsx`, made Executive KPI hero numbers responsive (`text-lg sm:text-[24px] truncate`) with `line-clamp-1` on subtitle descriptions, preventing clipping on narrow 360px Android devices.
  - In `DashboardView.tsx`, converted Available to Spend hero number to `text-2xl sm:text-[38px] lg:text-[42px] truncate`.
  - Hid desktop keyboard shortcut hints on mobile viewports (`hidden md:inline-flex` in `TransactionsView.tsx` and `hidden sm:flex` for Dashboard keys button).
- **Institutional Brand Emblems**:
  - Updated `public/favicon.svg` to the pine green (`#12855a`) rounded badge with an authentic white Indian Rupee `₹` vector emblem.
  - Updated Android adaptive launcher icon `android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml` to center the white Rupee symbol cleanly within the 108dp safe viewport over `#12855a` background.

---

## 4. Verification & Build Integrity

- **TypeScript Compilation**: `npx tsc -b` passed with **0 errors**.
- **Production Web Bundle**: `npm run build` compiled successfully in **32.27s** (dist generated with 25 precached PWA entries).
- **Capacitor Android Sync**: `npx cap sync android` completed in **0.103s** with **0 errors** (all 3 plugins synced: `@capacitor/app`, `@capacitor/local-notifications`, `@capacitor/status-bar`).
- **Cross-Platform Compatibility**: Tested and verified on Linux desktop, Electron packaging targets, and Android Capacitor WebView.

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

---

## 6. Current Implementation State: Completed vs. Pending Roadmap

| Phase | Module / Feature | Status | Key Deliverables & Files |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Baseline Date & Decimal Precision** | `COMPLETED` | `src/utils/dates.ts`: `isTxAfterBaseline` updated to inclusive `>=`.<br>`src/utils/formatters.ts`: `formatCompactCurrency` displays 2 decimal places for fractional amounts $< 1000$ (e.g. ₹0.10, ₹0.50). |
| **Phase 2** | **Global Dynamic P2P Sync Engine** | `COMPLETED` | `src/services/sync/syncEngine.ts`: `resetMasterStatus()` on new sessions.<br>`src/components/sync/P2PSyncModal.tsx`: Fixed PIN input flash during sync.<br>`src/context/VaultContext.tsx`: Full-duplex dynamic background sync listener, debounced auto-broadcasting, and `isApplyingRemoteSyncRef` echo loop prevention. |
| **Phase 3** | **Notes Markdown AST & State Restore** | `COMPLETED` | `src/utils/markdown.tsx`: Zero-dependency AST markdown parser ported from Lifelog.<br>`src/views/NotesView.tsx`: Android preview overflow fix (`break-words`, `overflow-x-hidden`), session restoration via `khataghar_last_note_id` or top note by `updatedAt` desc. |
| **Phase 4** | **Lifelog Mobile Parity (Insets & Back Button)** | `COMPLETED` | Installed `@capacitor/status-bar` and `@capacitor/app`.<br>`src/utils/native.ts`: Native status bar theme sync, hardware back button handler, tactile haptics.<br>`src/components/layout/Header.tsx` & `BottomNav.tsx`: Safe area insets `env(safe-area-inset-top)` and `bottom`. |
| **Phase 5** | **Financial Calculators Suite & Amortization** | `COMPLETED` | `src/views/CalculatorsView.tsx`: 6 calculators (SIP, Step-Up SIP, Lumpsum, SWP, FIRE Runway, Loan Schedule). Sliders start from **0%** return rate. Full interactive month-by-month and year-by-year Amortization Schedules with Prepayment savings simulator.<br>`src/App.tsx` & `Sidebar.tsx`: Route `/calculators` and navigation link. |
| **Phase 6** | **Native Scheduled Notifications** | `COMPLETED` | `src/utils/nativeNotification.ts`: Channel creation (`reminders`) & local notification scheduling via `@capacitor/local-notifications`.<br>`src/views/PlansView.tsx`: Reminder timing picker (on due date, 1, 2, 3, 7 days before) on bills & goals. |
| **Phase 7** | **Reconciliation Diff Modal & Demo Confirm** | `COMPLETED` | `src/components/accounts/ReconciliationDiffModal.tsx`: Interactive discrepancy table (Current Stored vs Calculated Ledger Balance, Delta, checkbox per account to apply adjustments).<br>`src/views/SettingsView.tsx`: Wire "Reconcile Accounts" to diff modal, add confirmation popup to "Load Demo Data". |
| **Phase 8** | **Mobile Typography Polish** | `COMPLETED` | `src/views/ReportsView.tsx`: Made Executive KPI cards responsive (`text-lg sm:text-[24px] truncate`, description line clamping).<br>`src/views/DashboardView.tsx`: Made Hero Available-to-Spend responsive (`text-2xl sm:text-[38px] lg:text-[42px] truncate`).<br>`src/views/TransactionsView.tsx`: Hid desktop keyboard shortcut hints on mobile (`hidden md:inline-flex`). |
| **Phase 9** | **Brand Identity Overhaul (Multi-Platform Native Icons)** | `COMPLETED` | Replaced simple monochrome Rupee icon with the user-provided rich brand emblem (dark navy `#1c263e` badge with golden house "GHAR", upward green financial growth chart "Khata", golden Rupee coin `₹`, and gold shield with star).<br>• **Desktop**: Multi-layer Windows ICO (256, 128, 64, 48, 32, 24, 16px), Apple ICNS container with 10 PNG chunks (16–1024px), Linux discrete PNG suite (`16x16` to `512x512`), `build/icon.png` (512x512).<br>• **Web & PWA**: `public/favicon-32x32.png`, `apple-touch-icon.png` (180x180), `pwa-192x192.png`, `pwa-512x512.png`, SVG embedded favicon `favicon.svg`, theme-color updated to `#1c263e`.<br>• **Android Launcher**: Adaptive icons across mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi (`ic_launcher_foreground.png` centered in safe zone, legacy `ic_launcher.png` and `ic_launcher_round.png`, `ic_launcher_background.xml` set to `#1c263e`, removed obsolete vector foreground). Verified via `npm run build`, `cap sync android`, and `electron-builder --dir --linux --win`. |

---

## 7. Phase 9: Brand Identity Overhaul & Multi-Platform Native Icons

### Overview & Motivations
The legacy application icon utilized a plain white Rupee symbol on a monochrome green tile (`#12855a`). The user provided an official graphical brand badge featuring:
1. **Midnight Navy Shield Backdrop** (`#1c263e`): Dark rounded aesthetic complementing institutional dark mode.
2. **Golden House ("GHAR")**: Signifying wealth security and sanctuary.
3. **Ascending Financial Bar & Line Chart ("Khata")**: Multi-colored financial tracking with an emerald growth vector.
4. **Golden Indian Rupee Coin (`₹`)**: Embossed central monetary token.
5. **Golden Star & Shield Inset**: Base foundation seal.

### Deliverables & Multi-Platform Artifact Suite

#### 1. Desktop Operating Systems (`build/`)
- **Windows Multi-Resolution ICO (`build/icon.ico`)**:
  - Embedded layers: 256x256, 128x128, 64x64, 48x48, 32x32, 24x24, and 16x16.
  - Ensures sharp rendering on high-DPI Windows desktop taskbars, Explorer tiles, Alt-Tab overlays, and window headers.
- **macOS Apple Icon Image (`build/icon.icns`)**:
  - Binary ICNS container packed with 10 distinct standard PNG chunks: `icp4` (16x16), `ic11` (32x32), `icp5` (32x32 @2x), `ic12` (64x64), `ic07` (128x128), `ic08` (256x256), `ic13` (256x256 @2x), `ic09` (512x512), `ic14` (512x512 @2x), and `ic10` (1024x1024 Retina).
  - Compliant with macOS Dock, Launchpad, and Finder specifications.
- **Linux Distribution Icons (`build/icons/` & `build/icon.png`)**:
  - Discrete PNG files generated at `16x16`, `24x24`, `32x32`, `48x48`, `64x64`, `128x128`, `256x256`, and `512x512`.
  - AppImage, Debian `.deb`, and `tar.gz` desktop launcher integrations verified via Electron Builder.

#### 2. Web & Progressive Web App (`public/`)
- `public/favicon-32x32.png`: 32x32 standard browser tab icon.
- `public/apple-touch-icon.png`: 180x180 iOS Safari home screen bookmark icon.
- `public/pwa-192x192.png` & `public/pwa-512x512.png`: PWA manifest install prompts and splash icon.
- `public/favicon.svg`: Self-contained SVG with embedded base64 brand emblem.
- `index.html` & `vite.config.ts`: Updated `theme-color` and `msapplication-TileColor` to `#1c263e`.

#### 3. Android Native Launcher (`android/app/src/main/res/`)
- **Adaptive Launcher Background (`values/ic_launcher_background.xml` & `drawable/ic_launcher_background.xml`)**:
  - Color updated from legacy `#12855a` / `#26A69A` to `#1c263e` (midnight navy).
- **Adaptive Launcher Foreground (`mipmap-*/ic_launcher_foreground.png`)**:
  - Sized at ~68% of the 108dp canvas and centered on transparent alpha, ensuring the entire badge, house, rupee, and growth chart remain unclipped within the 66dp circular/squircle mask across `mdpi` (108x108), `hdpi` (162x162), `xhdpi` (216x216), `xxhdpi` (324x324), and `xxxhdpi` (432x432).
- **Legacy Launcher Icons (`ic_launcher.png` & `ic_launcher_round.png`)**:
  - `ic_launcher.png`: Scaled to 94% transparent badge for rectangular launchers.
  - `ic_launcher_round.png`: Masked circular badge with `#1c263e` backing for round launcher devices.
  - Removed obsolete plain rupee vector file `drawable-v24/ic_launcher_foreground.xml`.

### Verification & Validation Matrix
1. **TypeScript & Vite Production Build**: `npm run build` completed with code 0 (2817 modules transformed, PWA service worker generated with 25 precache entries).
2. **Capacitor Mobile Sync**: `npx cap sync android` completed in 0.086s, copying web assets and updating all 3 plugins.
3. **Electron Desktop Multi-Platform Package Validation**: `npx electron-builder --dir --linux --win` built both Linux and Windows unpacked targets without error, successfully embedding the new ICO and PNG resources.

