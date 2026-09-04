---
name: institutional-fintech-design
description: Master frontend design system & UI architecture for institutional-grade, modern fintech and high-craft web applications. Provides complete aesthetic tokens, Tailwind configuration, responsive desktop modal scaling, smart amount parsers, KPI cards, and UX patterns.
---

# 🏛️ Institutional Craft & Modern Fintech Frontend Design System

This skill guide provides the complete design language, typography scale, color token architecture, component blueprints, and micro-interactions used in **KhataGHAR**. Use this blueprint in any web application to achieve a tactile, institutional, high-trust visual aesthetic that feels like a blend of **Linear, Stripe Climate, Apple Finance, and an executive wealth terminal**.

---

## 🎨 1. Aesthetic Identity & Color Token Architecture

### 1.1 The Dual-Theme Canvas Principle
Never use sterile, harsh pure `#ffffff` or `#000000`. Use organic, material-inspired surfaces:
* **Light Mode (Warm Botanical Paper)**: Warm ivory paper base (`#faf8f5`), rich moss secondary surfaces (`#f2efe9`), deep pine green brand accents (`#12855a`), and rich editorial ink typography (`#19231f`).
* **Dark Mode (Deep Midnight Obsidian)**: Deep obsidian navy canvas (`#0b1219`), glass-tinted elevated cards (`#111c26`), subtle glowing pine accents (`#10b981`), and crisp off-white typography (`#f3f6f4`).

### 1.2 Tailwind Configuration (`tailwind.config.js`)
Copy this token configuration directly into your project's `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Base Canvas & Surface Tokens
        ground: 'var(--color-ground)',     // Page canvas background
        card: 'var(--color-card)',         // Elevated card / modal surface
        line: 'var(--color-line)',         // 1px tactile borders
        ink: 'var(--color-ink)',           // Primary editorial typography
        moss: 'var(--color-moss)',         // Subtle container & chip tint

        // Primary Brand Accent (Botanical Pine)
        pine: {
          50: '#edf7f2',
          100: '#d7efe3',
          200: '#b2dfcb',
          300: '#81c7ad',
          400: '#4da88b',
          500: '#2c8d70',
          600: '#1e735a',
          700: '#185c49',
          800: '#154a3c',
          900: '#123e33',
          950: '#08231d',
        },

        // Warning / Gold (Warm Marigold / Amber)
        mari: {
          50: '#fef9ee',
          100: '#fdf0d5',
          200: '#fbdead',
          300: '#f7c37a',
          400: '#f3a246',
          500: '#ee8321',
          600: '#df6817',
          700: '#b94e15',
          800: '#933e18',
          900: '#773417',
          950: '#401809',
        },

        // Alert / Spending / Negative (Coral Rose)
        flare: {
          50: '#fff1f1',
          100: '#ffe1e1',
          200: '#ffc7c7',
          300: '#ffa0a0',
          400: '#ff6969',
          500: '#f83b3b',
          600: '#e51d1d',
          700: '#c11414',
          800: '#9f1414',
          900: '#831717',
          950: '#480707',
        },
      },
      fontFamily: {
        display: ['Newsreader', 'Fraunces', 'Georgia', 'serif'], // Editorial balances & headings
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'], // High-readability body
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'], // Numeral data tables
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        xs: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        hero: '0 12px 32px -4px rgba(18, 62, 51, 0.18)',
      },
    },
  },
  plugins: [],
};
```

### 1.3 CSS Design System Variables (`src/index.css`)
Inject these custom CSS rules and utility tokens:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-ground: #faf8f5;
  --color-card: #ffffff;
  --color-line: rgba(25, 35, 31, 0.08);
  --color-ink: #19231f;
  --color-moss: #f2efe9;
}

.dark {
  --color-ground: #0b1219;
  --color-card: #111c26;
  --color-line: rgba(255, 255, 255, 0.08);
  --color-ink: #f3f6f4;
  --color-moss: #172430;
}

/* Tabular Numerals Guarantee (Zero character width jitter) */
.num {
  font-variant-numeric: tabular-nums lining-nums;
  letter-spacing: -0.02em;
}

/* Tactile Hover Lift */
.lift {
  transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}
.lift:hover {
  transform: translateY(-1.5px);
}

/* Custom Scrollbar Suppression for Clean Pill Lists */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* Subtle Hero Watermark Motif */
.rupee-watermark {
  position: absolute;
  right: -10px;
  bottom: -35px;
  font-family: var(--font-display);
  font-size: 190px;
  font-weight: 900;
  opacity: 0.04;
  pointer-events: none;
  user-select: none;
}
```

---

## 📐 2. Canvas Sizing & Viewport Scaling Hierarchy

One of the most critical design secrets discovered in production: **Different screens require deliberate viewport zoom factors**.

1. **Gateway Screens (Welcome Landing & Lock Screen)**:
   * Use `style={{ zoom: 1.25 }}`.
   * Gives a grand, cinematic, Apple-like introduction with generous text, prominent buttons, and zero squinting.
2. **Core Operational Canvas (Main App Layout)**:
   * Use `style={{ zoom: 1.05 }}` on `<main>`.
   * Standard 100% zoom often feels slightly too small on 14" to 27" monitors. 105% provides a comfortable luxury density.
   * Container width: `w-full max-w-[1600px] mx-auto px-2 sm:px-4`.

---

## 🪟 3. Modal Architecture (The Desktop Widening Rule)

### 3.1 The Flaw to Avoid
Most boilerplate libraries restrict modals to `max-w-md` (448px) or `max-w-lg` (512px). On desktop, this causes:
* Multi-column stats (Value, Cost, Gain, Lots) to cram into 90px cells, overflowing and overlapping text on top of each other.
* Forms with categories to hide behind tiny, claustrophobic inner scrollbars (`max-h-32`) that cut chips in half vertically.
* Unused, dead blank space on wide desktop monitors.

### 3.2 Responsive Modal Sizing Matrix (`Modal.tsx`)
Always define desktop-responsive max widths:

```typescript
const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md sm:max-w-lg',
  lg: 'max-w-lg sm:max-w-xl lg:max-w-2xl',
  xl: 'max-w-xl sm:max-w-2xl lg:max-w-3xl',     // Standard forms (Record Entry)
  '2xl': 'max-w-2xl sm:max-w-3xl lg:max-w-4xl', // Analytical popups
  '3xl': 'max-w-3xl sm:max-w-4xl lg:max-w-5xl', // Data tables & SIP lots (960px-1100px)
  '4xl': 'max-w-4xl sm:max-w-5xl lg:max-w-6xl',
};
```

### 3.3 Modal Invariants
1. **Unconditional Dismissal**: The `Escape` key, the top `X` button, the footer `Cancel` button, and the backdrop click **must always work unconditionally**. Never wrap close handlers in setup conditional checks.
2. **Unified Single-Scroll Container**: Never place nested vertical scrollbars inside a form (`max-h-32` on chips). Instead, allow the category chips to wrap naturally, and make the **entire form container** scroll smoothly:
   ```tsx
   <form className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 no-scrollbar">
   ```

---

## 📊 4. KPI Stat Cards & Overlap Prevention Architecture

### 4.1 The 4-Card Responsive Grid Pattern
When rendering financial or quantitative metrics, never squish them into a single monolithic box. Use **4 independent responsive cards**:

```tsx
<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
  {/* Card 1: Primary Valuation */}
  <div className="p-4 rounded-2xl bg-moss border border-line shadow-xs min-w-0">
    <span className="text-[10.5px] text-ink/50 font-bold uppercase tracking-wider block truncate">
      Current Valuation
    </span>
    <div className="font-display font-extrabold text-lg sm:text-xl text-ink mt-1 truncate">
      <AnimatedNumber value={currentValue} currency="INR" />
    </div>
  </div>

  {/* Card 2: Cost Basis */}
  <div className="p-4 rounded-2xl bg-moss border border-line shadow-xs min-w-0">
    <span className="text-[10.5px] text-ink/50 font-bold uppercase tracking-wider block truncate">
      Total Invested
    </span>
    <div className="font-display font-extrabold text-lg sm:text-xl text-ink/80 mt-1 truncate">
      <AnimatedNumber value={totalInvested} currency="INR" />
    </div>
  </div>

  {/* Card 3: Return & Gain/Loss */}
  <div className="p-4 rounded-2xl bg-moss border border-line shadow-xs min-w-0">
    <span className="text-[10.5px] text-ink/50 font-bold uppercase tracking-wider block truncate">
      Total Gain / Loss
    </span>
    <div className={`font-display font-extrabold text-lg sm:text-xl mt-1 flex items-center gap-1 truncate ${
      gain >= 0 ? 'text-pine-600' : 'text-flare-600'
    }`}>
      {gain >= 0 ? <TrendingUp className="w-4 h-4 shrink-0" /> : <TrendingDown className="w-4 h-4 shrink-0" />}
      <span className="truncate">{gain >= 0 ? '+' : ''}{formatPercent(gainPct)}</span>
    </div>
    <div className="text-[11px] text-ink/45 font-mono mt-0.5 truncate">
      ({gain >= 0 ? '+' : ''}{formatCompactCurrency(gain)})
    </div>
  </div>

  {/* Card 4: Volume / Count */}
  <div className="p-4 rounded-2xl bg-moss border border-line shadow-xs min-w-0">
    <span className="text-[10.5px] text-ink/50 font-bold uppercase tracking-wider block truncate">
      Lots & Holdings
    </span>
    <div className="font-display font-extrabold text-lg sm:text-xl text-ink mt-1 truncate">
      {lotsCount} Lots
    </div>
  </div>
</div>
```

* **Crucial Rule**: Every cell must contain `min-w-0` on the parent and `truncate` on the typography child. This prevents numbers from ever bleeding into adjacent columns.

---

## ⚡ 5. Interactive Form & Input Patterns

### 5.1 The Hero Amount Input with Live Smart Suffix Parsing
Users should be able to type shorthand figures (`15k`, `2.5L`, `1.2cr`, `5000`) and receive **instant visual confirmation**:

```tsx
// 1. Suffix Parser Engine
const parseSmartAmount = (val: string): number => {
  const clean = val.trim().toLowerCase().replace(/,/g, '');
  if (!clean) return NaN;
  if (clean.endsWith('cr')) return parseFloat(clean.replace('cr', '')) * 10000000;
  if (clean.endsWith('l') || clean.endsWith('lac') || clean.endsWith('lakh'))
    return parseFloat(clean.replace(/l(ac|akh)?/, '')) * 100000;
  if (clean.endsWith('k')) return parseFloat(clean.replace('k', '')) * 1000;
  return parseFloat(clean);
};

// 2. JSX Hero Box with Quick Increment Chips
<div className="space-y-2">
  <div className="flex items-center justify-between text-xs text-ink/50 font-bold uppercase tracking-wider">
    <span>Amount</span>
    <span className="text-[11px] font-medium text-pine-600 dark:text-pine-400 lowercase">
      smart format: e.g. 500, 10k, 2.5L
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
      required
    />
    {parsedAmountFormatted && (
      <span className="ml-2 px-2.5 py-1 rounded-lg bg-pine-50 dark:bg-pine-950/60 text-pine-700 dark:text-pine-300 border border-pine-200/60 dark:border-pine-800/60 text-xs font-mono font-bold whitespace-nowrap shadow-xs">
        = ₹{parsedAmountFormatted}
      </span>
    )}
  </div>

  {/* 1-Tap Quick Increment Chips */}
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
        className="px-2.5 py-1 rounded-lg border border-line bg-moss hover:bg-card text-[11px] font-mono font-bold text-ink/75 hover:text-ink transition-all cursor-pointer active:scale-95"
      >
        {chip.label}
      </button>
    ))}
  </div>
</div>
```

### 5.2 Segmented Mode Selector Pills
5-mode colored segmented controls with clear semantic identity:
* **Spend**: Rose theme (`bg-rose-500 text-white`).
* **Income**: Emerald/Pine theme (`bg-pine-600 text-white`).
* **Transfer**: Sky Blue theme (`bg-sky-600 text-white`).
* **Invest / SIP**: Emerald/Indigo theme (`bg-emerald-600 text-white`).
* **Debt / EMI**: Amber theme (`bg-amber-600 text-white`).

### 5.3 Desktop Form Balance Rule
Never place small single inputs (like Note, Tags, or Date) on lonely full-width lines that create vast empty gaps on PC screens. Always pair related fields side-by-side:
* **Row 1**: Account Selector (Left) + Date Picker with "Today" shortcut (Right).
* **Row 2**: Note Input (Left) + Tags Input (Right).

---

## 🧠 6. Financial Intelligence & Living Alert Hub Patterns

### 6.1 The Anti-Truncation Rule
Never render a cryptic notification like:
> `⚠️ 2 items need attention: Transport & Fuel is over by ₹1.6k • +1 more`

This hides critical context. Instead, use a **two-tier actionable banner**:
1. **Primary Headline**: Full statement of the top issue with direct fix action (`Review Budget ➔`).
2. **"Also Flagged" Strip**: Every other issue is rendered as an individual interactive chip with its own title and direct navigation.
3. **Dedicated Reports Link**: One button taking users to the full **Intelligence & Action Hub**.
4. **Zero State Invariant**: When all accounts and budgets are healthy, **render nothing**. Never show empty warning banners.

```tsx
{actionableInsights.length > 0 && (
  <div className="w-full rounded-2xl border border-mari-400/50 bg-mari-100/75 dark:bg-mari-950/40 p-4 shadow-xs anim-fade-up">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-500/30 grid place-items-center shrink-0 mt-0.5">
          <Bell className="w-4 h-4" />
        </div>
        <div className="space-y-1 min-w-0">
          <span className="text-xs font-extrabold uppercase tracking-wider text-ink">
            {actionableInsights.length} items require attention
          </span>
          <p className="text-xs font-bold text-ink truncate">{actionableInsights[0].title}</p>
          <p className="text-xs text-ink/75 leading-relaxed">{actionableInsights[0].description}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        <button
          onClick={() => (window.location.hash = actionableInsights[0].targetRoute)}
          className="px-3.5 py-2 rounded-xl bg-card border border-line text-xs font-bold text-ink hover:bg-moss active:scale-95 transition-all shadow-xs cursor-pointer"
        >
          {actionableInsights[0].actionLabel}
        </button>
        <button
          onClick={() => (window.location.hash = '#/reports')}
          className="px-3.5 py-2 rounded-xl bg-pine-700 hover:bg-pine-600 text-white text-xs font-bold active:scale-95 transition-all shadow-xs flex items-center gap-1 cursor-pointer"
        >
          <span>View in Reports Hub</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    {actionableInsights.length > 1 && (
      <div className="mt-3 pt-3 border-t border-mari-400/30 flex flex-wrap gap-2 items-center">
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink/50">Also flagged:</span>
        {actionableInsights.slice(1).map((item) => (
          <button
            key={item.id}
            onClick={() => (window.location.hash = item.targetRoute)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card/80 border border-line text-xs font-medium text-ink hover:border-pine-400 hover:text-pine-700 transition-colors cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span className="font-semibold">{item.title}</span>
            <ArrowRight className="w-3 h-3 text-ink/40" />
          </button>
        ))}
      </div>
    )}
  </div>
)}
```

---

## 💎 7. Micro-Interactions & Tactile Delight Checklist

When implementing this theme on any page:
* [ ] **Active Scale**: Add `active:scale-95` on all primary buttons and chips.
* [ ] **Lift on Hover**: Add `.lift` (`hover:-translate-y-0.5 hover:shadow-md`) to dashboard cards.
* [ ] **Number Privacy**: Bind sensitive figures to an animated privacy provider that replaces numbers with `••••••` when toggled.
* [ ] **Zero Jitter**: Always apply `.num` (`font-variant-numeric: tabular-nums`) on balances so live changes animate smoothly without vibrating.
* [ ] **PWA Offline Indicator**: Provide clear offline install guides with native iOS Safari instructions.
