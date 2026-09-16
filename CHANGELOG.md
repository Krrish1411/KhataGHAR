# Changelog

All notable changes to the **KhataGHAR** Sovereign Wealth Operating System are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0-beta.2] - 2026-09-16

### 🎨 Brand Identity Overhaul & Multi-Platform Native Icons
- **Brand Emblem Integration**: Replaced monochrome Rupee icon with the official graphical brand identity badge featuring the midnight navy shield (`#1c263e`), golden house ("GHAR"), emerald financial growth chart ("Khata"), golden Indian Rupee coin (`₹`), and base star seal.
- **Windows Desktop**: Generated true multi-resolution `build/icon.ico` with 7 embedded mipmap layers (`256x256`, `128x128`, `64x64`, `48x48`, `32x32`, `24x24`, `16x16`) for crisp taskbar, Alt-Tab, and Explorer rendering.
- **macOS Desktop**: Generated binary `build/icon.icns` container with 10 standard Apple PNG chunks (`icp4` through `ic10`, 16px up to 1024px Retina).
- **Linux Desktop**: Generated discrete PNG icon suite in `build/icons/` (`16x16` to `512x512`) and `build/icon.png` (512x512) for AppImage, Debian `.deb`, and `tar.gz` packages.
- **Android Adaptive Icons**: Implemented full adaptive icon set across `mdpi` (108px), `hdpi` (162px), `xhdpi` (216px), `xxhdpi` (324px), and `xxxhdpi` (432px) centered within the 66dp safe zone over `#1c263e` background; generated legacy square and circular launcher icons; removed legacy plain rupee vector file.
- **Web & PWA**: Updated `public/favicon.svg` with embedded high-resolution SVG badge, generated `favicon-32x32.png`, `apple-touch-icon.png` (180x180), `pwa-192x192.png`, and `pwa-512x512.png`; aligned `theme-color` to `#1c263e`.

### ⚡ Global Dynamic P2P Sync Engine
- **Duplex Background Sync**: Connected full-duplex dynamic P2P synchronization directly into `VaultContext` with debounced auto-broadcasting on any local mutation.
- **Echo Loop Prevention**: Added `isApplyingRemoteSyncRef` protection to prevent incoming remote sync messages from triggering redundant echoes back to peer devices.
- **Master Device Reset**: Introduced `resetMasterStatus()` on new sessions and added a 1-click **Primary Master Selection** toggle ("Make This Device Master" / "Pull Master from Remote") to eliminate duplicate accounts and clutter on initial pairing.
- **PIN Stability**: Fixed PIN input flash during active WebRTC pairing negotiation.

### 🔔 Native Scheduled Reminders & Notifications
- **Android Local Notifications**: Integrated `@capacitor/local-notifications` with a high-importance `reminders` notification channel with sound, vibration, and light accents.
- **Configurable Reminder Timing**: Added customizable bill and goal reminder alerts scheduled at 9:00 AM (On Due Date, 1 Day Before, 2 Days Before, 3 Days Before, 7 Days Before).
- **Cross-Platform Fallback**: Integrated Electron OS notification bridge via IPC and HTML5 Web Notifications with permission negotiation.

### 🧮 Financial Calculators Suite & Amortization Engine
- **6 Institutional Calculators**: Added dedicated `/calculators` suite featuring SIP, Step-Up SIP, Lumpsum, SWP, FIRE Runway, and Loan Schedule.
- **0% Baseline Flexibility**: Sliders now start from **0%** return rate to allow zero-growth baseline testing.
- **Interactive Loan Amortization**: Added full month-by-month and year-by-year principal/interest payoff schedules with an interactive Prepayment savings simulator.

### ⚖️ Account Reconciliation Diff Modal & Guards
- **Discrepancy Inspector**: Built `ReconciliationDiffModal` showing a side-by-side comparison of Stored Balance vs Calculated Ledger Balance with live delta calculations.
- **Granular Adjustments**: Per-account checkboxes allowing users to select which accounts to reconcile without forcing global overwrites.
- **Demo Data Safety Guard**: Added confirmation modal dialog before loading demo data to prevent accidental vault overwrites.

### 📱 Lifelog Mobile Parity & UI Polish
- **Hardware Integration**: Added `@capacitor/status-bar` and `@capacitor/app` for native status bar styling, hardware back button routing, and tactile haptic feedback.
- **Safe Area Insets**: Handled notch and gesture bar insets via `env(safe-area-inset-top)` and `bottom` on header and bottom navigation bars.
- **AST Markdown Parser**: Ported zero-dependency AST parser for rich, safe rendering in Notes with Android preview overflow fixes (`break-words`, `overflow-x-hidden`) and note session auto-restore.
- **Responsive Typography**: Scaled Executive KPI cards (`text-lg sm:text-[24px] truncate`) and Dashboard Available-to-Spend hero display (`text-2xl sm:text-[38px] lg:text-[42px]`) with mobile line clamping.
- **Decimal Precision & Baseline**: Fixed `isTxAfterBaseline` to inclusive `>=` comparison, and formatted fractional amounts $< 1000$ to 2 decimal places (e.g. ₹0.10, ₹0.50).

---

## [1.0.0-beta.1] - 2026-09-16

### Initial Beta Release
- **Sovereign Vault**: Zero-cloud, 100% offline, AES-256-GCM client-side encrypted vault.
- **Desktop SQLite**: Embedded native SQLite via Node 22 `node:sqlite` (`DatabaseSync`) for Electron with WAL journal mode and atomic `VACUUM INTO` backups.
- **Multi-Platform CI**: Automated GitHub Actions matrix building Android APK, Windows Setup & Portable `.exe`, Linux AppImage/DEB/tar.gz, macOS DMG/ZIP, and Web static PWA.
- **In-App Auto-Updater**: SemVer 2.0.0 background update checker querying GitHub Releases and canonical `version.json`.
- **Obfuscation & Camouflage**: Production code protection with control flow flattening, string encryption, Duress PIN, and Decoy Vault.
- **Financial Architecture**: Net Worth tracking, Cashflow forecast, Burn Radar, CFA-grade Emergency Runway Survival Meter, Schedule AL compliance, and retina PDF exports.
