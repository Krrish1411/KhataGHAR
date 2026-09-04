---
name: institutional-fintech-design
description: Master frontend design system & UI architecture for institutional-grade, tactile web applications (Linear + Stripe Climate + Apple Finance aesthetic). Provides complete aesthetic tokens, Tailwind configuration, CSS variables, viewport scaling, responsive desktop modal scaling, smart amount parsers, KPI cards, and UX patterns.
---

# 🏛️ Institutional Craft & High-Aesthetic Frontend Design System

> **Design Vision**: Blend the tactile material warmth of **Stripe Climate & Linear** with the typographic editorial elegance of **Apple Finance** and the informational density of an **executive terminal**. 
> 
> Eliminate sterile generic SaaS templates, harsh `#000000` / `#ffffff` contrasts, cramped mobile modals on desktop, and vibrating numbers.

---

## 🎨 1. Aesthetic Identity & Color Token Architecture

### 1.1 The Dual-Theme Canvas Principle
Never use sterile, harsh pure `#ffffff` or `#000000`. Use organic, material-inspired surfaces:

* **Light Mode (Warm Botanical Ivory / Moss Paper)**:
  * Page Background: Warm mossy ivory (`#edf4ee` or `#faf8f5`)
  * Card Surface: Pure elevated white (`#ffffff`) with subtle organic shadow
  * Hairline Borders: Soft pine-tinted line (`#c9dccf` or `rgba(25, 35, 31, 0.08)`)
  * Primary Typography: Deep editorial forest ink (`#10201a` or `#19231f`)
* **Dark Mode (Deep Obsidian Midnight)**:
  * Page Background: Deep obsidian midnight (`#0a0f0c` or `#0b1219`)
  * Card Surface: Elevated obsidian card (`#16201a` or `#111c26`)
  * Hairline Borders: Subtle frosted line (`#26382e` or `rgba(255, 255, 255, 0.08)`)
  * Primary Typography: Crisp mint-tinted white (`#eaf3ed` or `#f3f6f4`)

### 1.2 Multi-Theme CSS Variables (`src/index.css`)
Inject these custom properties into your global CSS. This provides 8 dynamic theme palettes (Pine, Ember, Night, Ocean, Dusk, Sand, Berry, Graphite):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root, [data-theme="pine"] {
    --color-ink: #10201a;
    --color-moss: #edf4ee;
    --color-card: #ffffff;
    --color-line: #c9dccf;
    --hero-a: #0e5138;
    --hero-b: #0b3d2e;
    --hero-c: #07271e;
    color-scheme: light;
  }

  [data-theme="night"], .dark {
    --color-ink: #eaf3ed;
    --color-moss: #0a0f0c;
    --color-card: #16201a;
    --color-line: #26382e;
    --hero-a: #123528;
    --hero-b: #0d271e;
    --hero-c: #081b14;
    color-scheme: dark;
  }

  [data-theme="ember"] {
    --color-ink: #211910;
    --color-moss: #f2ecdc;
    --color-card: #fffdf6;
    --color-line: #d5c6a4;
    --hero-a: #6b4a20;
    --hero-b: #4a3315;
    --hero-c: #2e1f0c;
    color-scheme: light;
  }

  [data-theme="ocean"] {
    --color-ink: #0d1f2e;
    --color-moss: #e7f0f6;
    --color-card: #ffffff;
    --color-line: #bfd4e2;
    --hero-a: #175573;
    --hero-b: #113d54;
    --hero-c: #0a2838;
    color-scheme: light;
  }

  [data-theme="dusk"] {
    --color-ink: #e9edf6;
    --color-moss: #10131c;
    --color-card: #181d2a;
    --color-line: #2e374f;
    --hero-a: #22335c;
    --hero-b: #182547;
    --hero-c: #0e1730;
    color-scheme: dark;
  }

  [data-theme="sand"] {
    --color-ink: #2a2117;
    --color-moss: #f3edde;
    --color-card: #fffdf6;
    --color-line: #d6c9a8;
    --hero-a: #55702a;
    --hero-b: #425a21;
    --hero-c: #2c3d15;
    color-scheme: light;
  }

  body {
    background-color: var(--color-moss);
    color: var(--color-ink);
    font-family: 'IBM Plex Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  *:focus-visible {
    outline: 2px solid #12855a;
    outline-offset: 2px;
    border-radius: 8px;
  }
}

@layer components {
  /* Tabular Numerals: Zero character width jitter on numbers */
  .tabular-nums, .num {
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum";
    letter-spacing: -0.01em;
  }

  /* Ambient Texture Background */
  .page-bg {
    background:
      radial-gradient(1100px 480px at 85% -8%, rgba(18, 133, 90, 0.08), transparent 62%),
      radial-gradient(900px 420px at -12% 18%, rgba(232, 148, 10, 0.06), transparent 58%),
      radial-gradient(rgba(11, 61, 46, 0.04) 1px, transparent 1.4px),
      var(--color-moss);
    background-size: auto, auto, 22px 22px, auto;
    background-attachment: fixed;
  }

  /* Hero Weave Card with Traveling Light Sheen */
  .hero-weave {
    background:
      radial-gradient(rgba(255, 255, 255, 0.055) 1px, transparent 1.5px),
      linear-gradient(160deg, var(--hero-a, #0e5138) 0%, var(--hero-b, #0b3d2e) 46%, var(--hero-c, #07271e) 100%);
    background-size: 18px 18px, auto;
  }

  .hero-sheen {
    position: relative;
    overflow: hidden;
  }
  .hero-sheen::after {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    width: 34%;
    background: linear-gradient(105deg, transparent, rgba(255, 255, 255, 0.07) 45%, rgba(255, 255, 255, 0.13) 50%, rgba(255, 255, 255, 0.07) 55%, transparent);
    animation: sheen 5.5s ease-in-out infinite;
    pointer-events: none;
  }

  @keyframes sheen {
    0% { transform: translateX(-120%) skewX(-18deg); }
    100% { transform: translateX(240%) skewX(-18deg); }
  }

  /* Faint Watermark Emblem */
  .currency-watermark {
    position: absolute;
    right: -14px;
    bottom: -46px;
    font-size: 200px;
    line-height: 1;
    font-family: 'Bricolage Grotesque', sans-serif;
    font-weight: 800;
    color: rgba(255, 255, 255, 0.05);
    pointer-events: none;
    user-select: none;
  }

  /* Tactile Lift on Hover */
  .lift {
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  }
  .lift:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px -16px rgba(8, 45, 34, 0.25);
    border-color: rgba(18, 133, 90, 0.35);
  }

  /* Subtle Dashed Separator for Ledger Rows */
  .ledger-row + .ledger-row {
    border-top: 1px dashed var(--color-line);
  }
}

/* Tactile Animations */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: none; }
}
@keyframes popIn {
  from { opacity: 0; transform: scale(0.95) translateY(8px); }
  to { opacity: 1; transform: none; }
}
.anim-fade-up { animation: fadeUp 0.4s cubic-bezier(0.22, 0.9, 0.3, 1) both; }
.anim-pop { animation: popIn 0.25s cubic-bezier(0.22, 0.9, 0.3, 1) both; }

/* Minimal Scrollbars */
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(18, 133, 90, 0.2); border-radius: 9999px; }
::-webkit-scrollbar-thumb:hover { background: rgba(18, 133, 90, 0.4); }
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { scrollbar-width: none; }
```

### 1.3 Tailwind Configuration (`tailwind.config.js`)
Copy this token configuration into `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Base Dynamic Tokens
        ink: 'var(--color-ink)',
        moss: 'var(--color-moss)',
        card: 'var(--color-card)',
        line: 'var(--color-line)',

        // Primary Accent: Botanical Pine (Inflows, Growth, Positive)
        pine: {
          50: '#eef7f1',
          100: '#d9eee2',
          200: '#b3dcc6',
          300: '#86c5a5',
          400: '#4fa881',
          500: '#228a61',
          600: '#12855a',
          700: '#0e5138',
          800: '#0b3d2e',
          900: '#082d22',
          950: '#052018',
        },

        // Attention Accent: Warm Marigold / Amber (Warnings, Commitments, Dues)
        mari: {
          50: '#fef8ec',
          100: '#fcefd3',
          200: '#f9dea6',
          300: '#f3c76f',
          400: '#eda82c',
          500: '#e8940a',
          600: '#c47a05',
          700: '#97600a',
          800: '#6f4708',
        },

        // Alert Accent: Flare Rose / Crimson (Debts, Outflows, Danger)
        flare: {
          100: '#fbe3e7',
          200: '#f7c2cb',
          300: '#f097a8',
          400: '#e56782',
          500: '#d6455d',
          600: '#b93550',
          700: '#962a3d',
        },

        // Counterparty Accent: Sky Blue (Transfers, Custodial, People)
        skyx: {
          100: '#e2f0f9',
          200: '#bedef2',
          300: '#91c7e9',
          400: '#5da9dd',
          500: '#388dcb',
          600: '#2273a8',
          700: '#1b5c86',
        },
      },
      fontFamily: {
        display: ['Bricolage Grotesque', 'Newsreader', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        body: ['IBM Plex Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'JetBrains Mono', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(8, 45, 34, 0.05), 0 10px 30px -18px rgba(8, 45, 34, 0.25)',
        hero: '0 10px 30px -5px rgba(14, 81, 56, 0.35)',
        xs: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
      maxWidth: {
        '8xl': '1600px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};
```

---

## 📐 2. Canvas Sizing & Viewport Scaling Hierarchy

### The Dual-Density Rule
Standard 100% browser rendering often feels slightly too small on 14" to 27" monitors or too crammed during authentication. Apply intentional zoom scaling:

1. **Gateway Canvas (Lock Screen, Onboarding, Welcome Landing)**:
   ```tsx
   <div className="min-h-screen w-full flex items-center justify-center p-4" style={{ zoom: 1.25 }}>
     {/* Big, cinematic, Apple-like landing presentation */}
   </div>
   ```
2. **Main Application Canvas**:
   ```tsx
   <main className="flex-1 w-full max-w-[1600px] mx-auto px-3 sm:px-6 py-6" style={{ zoom: 1.05 }}>
     {/* High-density, comfortable executive layout */}
   </main>
   ```

---

## 🪟 3. Modal Architecture: The Desktop Widening Rule

### 3.1 The Flaw to Avoid
Never restrict modals to `max-w-md` (448px). On desktop screens, this causes:
* Multi-column stats (Valuation, Cost, Gain, Lots) to cram into 90px cells and overlap text.
* Category chips to hide behind inner scrollbars.
* Vast empty spaces on wide screens.

### 3.2 Responsive Modal Matrix (`src/components/common/Modal.tsx`)
Always define desktop-scaled widths:
```typescript
const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md sm:max-w-lg',
  lg: 'max-w-lg sm:max-w-xl lg:max-w-2xl',
  xl: 'max-w-xl sm:max-w-2xl lg:max-w-3xl',     // Standard input forms
  '2xl': 'max-w-2xl sm:max-w-3xl lg:max-w-4xl', // Analytical popups / Asset details
  '3xl': 'max-w-3xl sm:max-w-4xl lg:max-w-5xl', // Data tables & SIP schedules (960px-1100px)
  '4xl': 'max-w-4xl sm:max-w-5xl lg:max-w-6xl',
};
```

### 3.3 Modal Invariants
1. **Unconditional Dismissal**: `Escape` key, top `X` button, backdrop click, and bottom `Cancel` button must **always work unconditionally**.
2. **Single-Scroll Container**: Never nest vertical scrollbars inside a form (`max-h-32` on chips). Instead, let category chips wrap naturally and make the **form body scroll smoothly**:
   ```tsx
   <form className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 custom-scrollbar">
   ```
3. **Mobile Bottom Sheet**:
   On mobile screens (`<640px`), modals should automatically dock to the bottom with `rounded-t-3xl sm:rounded-2xl` and slide up with touch comfort.

---

## 📊 4. KPI Stat Cards & Overlap Prevention

### 4.1 The 4-Card Responsive Grid Pattern
Never squish financial metrics into a single monolithic box. Use **4 independent responsive cards**:

```tsx
<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
  {/* Card 1: Primary Value */}
  <div className="p-4 rounded-2xl bg-card border border-line shadow-xs min-w-0">
    <span className="text-[10.5px] text-ink/50 font-bold uppercase tracking-wider block truncate">
      Current Valuation
    </span>
    <div className="font-display font-extrabold text-xl sm:text-2xl text-ink mt-1 truncate num">
      ₹14,50,200
    </div>
  </div>

  {/* Card 2: Cost Basis */}
  <div className="p-4 rounded-2xl bg-card border border-line shadow-xs min-w-0">
    <span className="text-[10.5px] text-ink/50 font-bold uppercase tracking-wider block truncate">
      Total Invested
    </span>
    <div className="font-display font-extrabold text-xl sm:text-2xl text-ink/80 mt-1 truncate num">
      ₹11,00,000
    </div>
  </div>

  {/* Card 3: Return & Gain/Loss */}
  <div className="p-4 rounded-2xl bg-card border border-line shadow-xs min-w-0">
    <span className="text-[10.5px] text-ink/50 font-bold uppercase tracking-wider block truncate">
      Total Returns
    </span>
    <div className="font-display font-extrabold text-xl sm:text-2xl mt-1 flex items-center gap-1.5 text-pine-600 truncate num">
      <TrendingUp className="w-5 h-5 shrink-0" />
      <span className="truncate">+31.8%</span>
    </div>
    <div className="text-[11px] text-ink/45 font-mono mt-0.5 truncate num">
      (+₹3,50,200)
    </div>
  </div>

  {/* Card 4: Count / Volume */}
  <div className="p-4 rounded-2xl bg-card border border-line shadow-xs min-w-0">
    <span className="text-[10.5px] text-ink/50 font-bold uppercase tracking-wider block truncate">
      Active Lots
    </span>
    <div className="font-display font-extrabold text-xl sm:text-2xl text-ink mt-1 truncate">
      14 Holdings
    </div>
  </div>
</div>
```

* **CRITICAL RULE**: Every card MUST have `min-w-0` on the container and `truncate` on the number element. This eliminates cross-column bleed when numbers become very large.

---

## ⚡ 5. Interactive Input Patterns

### 5.1 The Hero Amount Input with Live Suffix Parsing
Users should be able to type shorthand figures (`15k`, `2.5L`, `1.2cr`, `5000`) and receive **instant visual confirmation**:

```tsx
// 1. Shorthand Parsing Utility
export const parseSmartAmount = (val: string): number => {
  const clean = val.trim().toLowerCase().replace(/,/g, '');
  if (!clean) return NaN;
  if (clean.endsWith('cr')) return parseFloat(clean.replace('cr', '')) * 10000000;
  if (clean.endsWith('l') || clean.endsWith('lac') || clean.endsWith('lakh'))
    return parseFloat(clean.replace(/l(ac|akh)?/, '')) * 100000;
  if (clean.endsWith('k')) return parseFloat(clean.replace('k', '')) * 1000;
  return parseFloat(clean);
};

// 2. Hero Input JSX
<div className="space-y-2">
  <div className="flex items-center justify-between text-xs text-ink/50 font-bold uppercase tracking-wider">
    <span>Amount</span>
    <span className="text-[11px] font-medium text-pine-600 lowercase">
      supports: 500, 10k, 2.5L, 1cr
    </span>
  </div>

  <div className="relative flex items-center rounded-2xl border border-line bg-card focus-within:border-pine-500 focus-within:ring-2 focus-within:ring-pine-500/20 px-4 py-2.5 transition-all shadow-xs">
    <span className="text-2xl sm:text-3xl font-display font-extrabold text-ink/30 mr-2 select-none">
      ₹
    </span>
    <input
      type="text"
      autoFocus
      placeholder="0.00"
      value={amount}
      onChange={(e) => setAmount(e.target.value)}
      className="w-full bg-transparent font-display font-extrabold text-2xl sm:text-3xl num text-ink placeholder:text-ink/20 outline-none"
    />
    {parsedAmountFormatted && (
      <span className="ml-2 px-2.5 py-1 rounded-lg bg-pine-50 dark:bg-pine-950/60 text-pine-700 dark:text-pine-300 border border-pine-200/60 dark:border-pine-800/60 text-xs font-mono font-bold whitespace-nowrap shadow-xs">
        = ₹{parsedAmountFormatted}
      </span>
    )}
  </div>

  {/* Quick Increment Chips */}
  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
    {[
      { label: '+500', val: 500 },
      { label: '+1K', val: 1000 },
      { label: '+2K', val: 2000 },
      { label: '+5K', val: 5000 },
      { label: '+10K', val: 10000 },
    ].map((chip) => (
      <button
        key={chip.label}
        type="button"
        onClick={() => setAmount(String((parseSmartAmount(amount) || 0) + chip.val))}
        className="px-2.5 py-1 rounded-lg border border-line bg-moss hover:bg-card text-[11px] font-mono font-bold text-ink/75 hover:text-ink transition-all active:scale-95 cursor-pointer"
      >
        {chip.label}
      </button>
    ))}
  </div>
</div>
```

### 5.2 Semantic Mode Selector Pills
Use colored segmented controls with clear semantic identity:
* **Expense / Spend**: Rose theme (`bg-rose-500 text-white`).
* **Income**: Botanical Pine theme (`bg-pine-600 text-white`).
* **Transfer**: Sky Blue theme (`bg-sky-600 text-white`).
* **Invest / SIP**: Indigo theme (`bg-indigo-600 text-white`).
* **Debt / EMI**: Amber theme (`bg-amber-600 text-white`).
* **People / Custody**: Teal theme (`bg-teal-600 text-white`).

### 5.3 Desktop Form Balance Rule
Never place small single inputs (like Note, Tags, or Date) on lonely full-width lines that create vast empty gaps on PC screens. Always pair related fields side-by-side:
* **Row 1**: Account Selector (Left) + Date Picker with "Today" shortcut (Right).
* **Row 2**: Note Input (Left) + Tags Input (Right).

---

## 🔍 6. Searchable Combobox & Smart Target Picker

Replace static native `<select>` dropdowns with a **responsive searchable combobox**:
1. **Autofocus Search Input**: Allows typing immediately upon opening.
2. **Dynamic Creation on the Fly**: If the user types a contact, category, or tag that doesn't exist, provide a 1-click `+ Use "{query}" as new...` item at the top.
3. **Smart Viewport Positioning**: Automatically flips upward (`bottom-full mb-1.5`) when opened near the bottom edge of the screen.
4. **Full Keyboard Navigation**: `ArrowDown`, `ArrowUp`, `Enter`, `Escape`.

---

## 🧠 7. Living Alert Hub: The Anti-Truncation Rule

Never render a cryptic notification like:
> `⚠️ 2 items need attention: Transport is over by ₹1.6k • +1 more`

Instead, use a **two-tier actionable banner**:
1. **Primary Headline**: Full statement of the top issue with a direct resolution button (`Review Budget ➔`).
2. **"Also Flagged" Strip**: Every other issue is rendered as an individual interactive chip with its own title and direct navigation.
3. **Dedicated Action Hub**: One button taking users to the full reports and intelligence dashboard.
4. **Zero-State Invariant**: When all accounts, budgets, and debts are healthy, **render nothing**. Never show empty warning cards.

---

## 💎 8. Micro-Interactions & Tactile Delight Checklist

When implementing this theme on any view or component:
- [ ] **Active Scale**: Add `active:scale-[0.97]` on all buttons and chips for tactile feedback.
- [ ] **Tactile Lift**: Add `.lift` (`hover:-translate-y-0.5 hover:shadow-md`) to dashboard cards.
- [ ] **Privacy Mask**: Bind sensitive balances to a global privacy toggle that flips values to `••••••`.
- [ ] **Tabular Numbers**: Apply `.num` (`tabular-nums`) to every financial figure so live re-renders never vibrate character widths.
- [ ] **Zero-Data State**: Provide clean, encouraging empty states with an illustration icon, description, and primary action button (`+ Add Account`, `+ New Entry`).

---

## 🤖 Instructions for AI Prompts

To instruct any AI model to generate UI adhering to this design system, prefix your prompt with:

> *"Build this web application using the **Institutional Fintech & Tactile Editorial Design System** (KhataGHAR architecture). Use warm botanical paper surfaces in light mode (`bg-moss` `#edf4ee`, `bg-card` `#ffffff`, `text-ink` `#10201a`, `border-line` `#c9dccf`) and deep obsidian midnight in dark mode (`bg-moss` `#0a0f0c`, `bg-card` `#16201a`, `border-line` `#26382e`). Use botanical pine (`pine-600` `#12855a`) for primary accents, marigold amber for warnings, and flare crimson for outflows. Apply `style={{ zoom: 1.05 }}` on `<main>` with max-w-[1600px]. Modals must follow the Desktop Widening Rule (`max-w-2xl` to `max-w-5xl`) with full-width mobile bottom-sheet dock, and numbers must always use tabular-nums with `truncate` and `min-w-0` on containers to prevent overlap."*
