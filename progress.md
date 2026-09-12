# KhataGHAR Engineering Progress & Architectural Changelog

> **Audience**: Future Developers & AI Coding Assistants  
> **Repository**: [KhataGHAR (PaisaBook Architecture)](https://github.com/Krrish1411/KhataGHAR)  
> **Last Updated**: September 2026  
> **Branch**: `main`  
> **Latest Commit**: `4c26271`

---

## 1. Executive Summary

This document provides a concise, comprehensive overview of the recent architectural enhancements, UI/UX overhauls, financial logic fixes, and platform-readiness upgrades implemented in KhataGHAR. It outlines precisely **what changed**, **which files were modified**, and **how the systems function** so any developer or AI can immediately understand the current state of the application and continue building without regressions.

---

## 2. File & Component Modification Map

| Area / Feature | Files Modified or Created | Key Changes |
| :--- | :--- | :--- |
| **In-App Confirmations** | `[NEW]` [`src/components/common/ConfirmModal.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/common/ConfirmModal.tsx) | Themed in-app modal card supporting `danger`, `warning`, `primary` variants and rich item previews. |
| **Dialog Architecture** | `[NEW]` [`src/context/DialogContext.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/context/DialogContext.tsx)<br>`[MOD]` [`src/App.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/App.tsx) | Global `DialogProvider` exposing `useConfirm()` and `useDialog()` hooks returning `Promise<boolean>` / `Promise<void>`. Replaced browser-native `window.confirm`. |
| **Notes Section Redesign** | `[MOD]` [`src/views/NotesView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/NotesView.tsx)<br>`[MOD]` [`src/components/layout/AppLayout.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/layout/AppLayout.tsx) | 2-panel layout, tree navigator, system theme compliance, zero outer scrollbar, search icon alignment, auto-resize textarea with scroll preservation. |
| **Dialog Upgrades Across Views** | `[MOD]` [`src/views/AccountsView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/AccountsView.tsx)<br>`[MOD]` [`src/views/BudgetsGoalsView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/BudgetsGoalsView.tsx)<br>`[MOD]` [`src/views/AssetsLiabilitiesView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/AssetsLiabilitiesView.tsx)<br>`[MOD]` [`src/views/DocumentsView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/DocumentsView.tsx)<br>`[MOD]` [`src/views/PlansView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/PlansView.tsx)<br>`[MOD]` [`src/views/PeopleLedgerView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/PeopleLedgerView.tsx)<br>`[MOD]` [`src/views/SettingsView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/SettingsView.tsx) | Converted all legacy `window.confirm` dialogs to institutional in-app confirmation cards using `useConfirm()`. |
| **Health Score Engine** | `[MOD]` [`src/services/ratios.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/services/ratios.ts)<br>`[MOD]` [`src/services/insights.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/services/insights.ts) | Fixed budget evaluation logic from summing lifetime 4-month expenses to scoping strictly to the current active calendar month. |
| **Button Consolidation** | `[MOD]` [`src/views/AccountsView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/AccountsView.tsx)<br>`[MOD]` [`src/views/DashboardView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/DashboardView.tsx)<br>`[MOD]` [`src/views/SettingsView.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/views/SettingsView.tsx) | Removed scattered "Load Demo Accounts" and "Reconcile" buttons from Accounts and Dashboard; consolidated into a dedicated Ledger Maintenance hub in Settings. |
| **Login Screen Alignment** | `[MOD]` [`src/components/security/LockScreen.tsx`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/components/security/LockScreen.tsx) | True viewport vertical and horizontal centering; removed `zoom: 1.25` and `my-auto` that pushed the card off-center on standard laptops. |
| **Type Definitions** | `[MOD]` [`src/types/index.ts`](file:///home/krish/Downloads/Coding/gemini/Coding/KhataGHAR/src/types/index.ts) | Extended `VaultNote` with optional `icon?: string` field for emoji/icon identifiers. |

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

## 4. Verification & Build Integrity

- **TypeScript Compilation**: `tsc -b` completed with **0 errors**.
- **Vite Production Build**: `vite build` completed with **0 errors**.
- **PWA Service Worker**: Precached 23 bundle entries via `workbox`.
- **Git Status**: Clean working tree on `origin/main` (commits `56c5def`, `d5b7437`, `4076d3d`, `4c26271`).

---

## 5. Guidelines for Future AI & Developer Extensions

When adding new features or modifying existing pages in KhataGHAR:
1. **Never Use Native Dialogs**: Do not call `window.confirm()` or `window.alert()`. Always use `const confirm = useConfirm()` from `../context/DialogContext` or instantiate `<Modal>` / `<ConfirmModal>`.
2. **Follow Theme Semantic Tokens**:
   - Use `bg-card` for surfaces, `bg-moss` for page backdrops and muted strips, `border-line` for borders, and `text-ink` for typography.
   - Use `pine-*` for positive/primary actions, `mari-*` for warnings/alerts, and `flare-*` for debts/danger.
3. **Desktop Viewport Integrity**: If creating full-height productivity tools (like notes, kanbans, or terminal drawers), configure `h-screen overflow-hidden` in layout and `h-full overflow-hidden` internally to avoid outer window scrollbars.
4. **Textarea Handling**: Always ensure textareas inside scrollable containers use dynamic auto-height (`field-sizing: content` or `ta.scrollHeight`) with `overflow-hidden` to avoid competing nested scrollbars and scroll jumps.
