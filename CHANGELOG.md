# Changelog

All notable changes to the **KhataGHAR** Sovereign Wealth Operating System are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0-beta.7] - 2026-09-22

### 🗂️ Drive UX Overhaul — Google Drive / Native Explorer Parity

#### Multi-Select & Keyboard Navigation
- **Rubber-band Marquee Selection**: Click-drag anywhere on the canvas to draw a selection rectangle — all items inside are instantly selected, exactly like Google Drive Desktop or Windows Explorer.
- **Ctrl+A — Select All**: Selects every visible file and folder in the current directory simultaneously.
- **Keyboard Arrow Navigation**: `↑ ↓ ← →` move the keyboard focus cursor through items; `Enter` opens/previews; `Backspace` navigates up one folder level — matching native OS file manager behavior.
- **Single-click Highlight, Double-click Open**: Items highlight (select) on first click; folders open only on double-click or `Enter` — no accidental navigation.

#### Clipboard Engine & Copy / Paste
- **Multi-item Cut / Copy / Paste**: Select any mix of files and folders, then `Ctrl+C` (copy), `Ctrl+X` (cut), or `Ctrl+V` (paste) — same as any native file manager.
- **Cut Visual Indicator**: Cut items render with `opacity-50` and a dashed brand-colored border so users always know what is staged for move.
- **Drag-and-drop Move to Folder**: Drag selected items and drop them onto a target folder card to move them instantly.

#### Persistent Clipboard / Action Bar
- **Fixed Full-Width Selection Bar**: When items are selected the entire top toolbar becomes the contextual action bar — `[✕ clear] [N items selected] [action buttons scrollable strip]` — never clips or overflows on any screen size.
- **Floating Clipboard Paste Bar**: When items are Cut or Copied a floating pill appears centered at the bottom of the canvas (Google Drive style) showing the clipboard action, item count, target folder hint, and a "Paste here" button. Stays visible until clipboard is cleared or pasted.
- **Canvas Bottom Padding**: Canvas automatically adds `pb-24` when the floating bar is active to prevent content being hidden behind it.

#### Mobile & Touch Fixes
- **Mobile Sidebar Slide-over Drawer**: Full-screen overlay drawer on mobile with smooth slide-in/out — no more sidebar-only view blocking the content.
- **Touch-accessible ⋮ Menus**: Options (`⋮`) buttons on folder and file cards are always visible on mobile (where hover doesn't exist) and hidden-until-hover on desktop.
- **Mobile Selection Bar**: Selection action strip uses `overflow-x-auto` + `no-scrollbar` — action buttons scroll horizontally without clipping on any phone screen.

#### Context Menu & UX Polish
- **Context Menu Edge Clamping**: Right-click context menu is now bounded with `Math.max(12, ...)` on all four edges — never appears off-screen or clipped on mobile.
- **List View — Full Folder Name Display**: Folder names in List View are no longer truncated — long names wrap properly in a flex column layout.
- **File Preview Restoration**: PDF and image previews now load via isolated Blob URLs — "File data payload is not available" error eliminated.

### 🔗 Attachment & Linking Engine
- **Attach from Drive to Entries**: Any file inside the Drive can be linked to any Transaction, Asset, Liability, Savings Goal, or People entry directly from the Document Hub — no need to re-upload.
- **Unlink Button in Inspector**: Right-side detail inspector panel shows all linked entries with an `Unlink` button and entry navigation arrow for each linked entity.
- **Conditional Linked Entries Section**: The "Linked Entries" section in the inspector only renders when at least one entry is actually linked — no phantom empty sections.

### 📊 Storage Meter Fix
- **Accurate Storage Calculation**: `DriveDatabaseUsageMeter` now correctly aggregates all payload blob sizes — previously under-reported due to missed payload key enumeration.

### 🐛 Bug Fixes
- **`liabilitys` → `liabilities` typo fixed** in `DocumentDetailModal`.
- **VaultContext Payload Isolation**: File binary data is now stored under `payload_<docId>` key, preventing payload cross-contamination between documents.

---

## [1.0.0-beta.6] - 2026-09-22

### 📁 Universal Multi-Attachment Engine Everywhere
- **Multi-Attachment Support**: Attach multiple receipts, deeds, agreements, IOUs, bank passbooks, and goal brochures directly to any **Transaction**, **Asset**, **Liability / Loan**, **Savings Goal**, **People Ledger Entry**, or **Account**.
- **Bi-Directional Entity Linking**: Files attached inside any modal automatically index into the central Document Hub; conversely, any file in the Document Hub can be dynamically linked to or unlinked from multiple entities at any time.
- **Smart Optimized vs. Original RAW Toggle**: Complete sovereign control for users to store bit-for-bit uncompressed original files or apply smart client-side 1080p canvas WebP/JPEG compression for massive disk savings.

### 🗄️ Central Document & Attachment Hub
- **Dual Platform Personality**:
  - **Android File Manager View**: Mobile-first file manager interface (inspired by Google Files / Samsung My Files) featuring segmented internal vault storage cards, category touch tiles (Images, PDFs, Deeds, Receipts), collections carousel, folder drill-down, and mobile FAB with action bottom sheets.
  - **Google Drive Web & Desktop Workspace**: Cloud storage workspace layout featuring a left navigation tree (`+ New`, My Drive, Recent, Starred, Linked Entities), clickable breadcrumbs, centered search bar, right details inspector panel (`I`), right-click context menu, and an interactive keyboard shortcuts engine.
  - **Working Keyboard Shortcuts Suite**: Instant navigation via keyboard (`/` focus search, `↑↓←→` navigate items, `Enter` preview, `Del` delete, `V` toggle view, `I` inspector, `N` new folder, `U` upload, `S` star, `Ctrl+A` select all, `?` shortcuts cheat sheet).
- **Anti-Clutter Folder Organization**: Pre-built system folders (`Receipts`, `Deeds`, `Loans`, `People`, `Bank`, `Tax`, `Unfiled`) plus user-created custom folders with customizable colors and emoji icons.
- **Sub-5ms Ultra-Fast Search**: High-speed full-text search across document names, notes, tags, and linked entity names with instant client-side filtering.
- **Dual Visual Modes**: Seamless toggle between a Visual Media Gallery Grid and a Dense Structured Table.
- **Interactive Lightbox Viewer**: High-fidelity in-app viewer for images and PDFs with smooth pan/zoom, 90-degree rotation, folder transfer, and sovereign file download.
- **Storage Consumption Meter**: Real-time breakdown of total storage utilized by attachments in the encrypted vault.

### ⚡ Two-Tier Split-Payload Storage Architecture
- **Sub-Second Vault Unlock (< 50ms)**: Separates lightweight searchable metadata (`DocumentRecord`) from heavy binary payloads (`doc_payload`).
- **Low RAM Overhead (< 30MB)**: Prevents browser webview memory exhaustion and UI freezes when managing 1,000+ attachments by lazy-loading file blobs on demand only when opened.

### 🎯 Hero Card 1-Paisa Reactivity & Core Fixes
- **Exact Paisa Reactivity**: Resolved cash balance freeze; all fractional amounts down to 1 paisa (₹0.01) immediately update the Hero card cash balance in real time.
- **Asset Redemption**: Dedicated 'Redeem' tab in the Add Entry modal with proceeds account routing and NAV valuation calculations.
- **Debt & Loan Full Payoff**: Dedicated 'Loan / Debt Repaid' mode with one-click full payoff and automatic status settlement.
- **Android In-Place Update Fix**: Android package installer compatibility with explicit v1/v2/v3 signatures, permanent release keystore, and disabled testOnly flag (`versionCode 6`).

---

## [1.0.0-beta.5] - 2026-09-22

### 🐛 Bug Fixes & Architectural Improvements
- **Hero Card Real-Time Reactivity**: Instant live updates down to the single paisa for every transaction without freeze or stale caching.
- **First-Class Asset Redemption**: Direct dedicated 'Redeem' tab in Add Entry modal with proceeds account routing and NAV valuation calculations.
- **Debt & Loan Full Repayment**: Dedicated 'Loan / Debt Repaid' mode with one-click full payoff and automatic status settlement.
- **Android In-Place Update Fix**: Android package installer compatibility with explicit v1/v2/v3 signatures, permanent release keystore, and disabled testOnly flag.

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
