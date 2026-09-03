import React, { useState, useMemo } from 'react';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import type { Category, CurrencyCode, NumberFormatType } from '../../types';
import { PieChart, Sparkles, Shield, AlertCircle } from 'lucide-react';

export interface ExpenseCategoryItem {
  id: string;
  name: string;
  amount: number;
  color: string;
  isEssential?: boolean;
}

export interface ExpenseRadialMeterProps {
  categories: ExpenseCategoryItem[];
  totalExpense: number;
  baseCurrency: CurrencyCode;
  numberFormat: NumberFormatType;
  isPrivacyMode?: boolean;
  periodLabel?: string;
  className?: string;
}

export const ExpenseRadialMeter: React.FC<ExpenseRadialMeterProps> = ({
  categories,
  totalExpense,
  baseCurrency,
  numberFormat,
  isPrivacyMode = false,
  periodLabel = 'This Month',
  className = '',
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'essential' | 'discretionary'>('all');

  // Filter categories if essential/discretionary selected
  const filteredCategories = useMemo(() => {
    if (filterMode === 'essential') return categories.filter((c) => c.isEssential);
    if (filterMode === 'discretionary') return categories.filter((c) => !c.isEssential);
    return categories;
  }, [categories, filterMode]);

  const filteredTotal = useMemo(() => {
    return filteredCategories.reduce((sum, c) => sum + c.amount, 0);
  }, [filteredCategories]);

  // SVG parameters
  const size = 260;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Compute arc segments
  let currentAngle = -90; // Start at top
  const segments = useMemo(() => {
    const total = filteredTotal > 0 ? filteredTotal : 1;
    let accumulated = 0;

    return filteredCategories.map((cat) => {
      const pct = cat.amount / total;
      const strokeDasharray = `${(pct * circumference).toFixed(2)} ${circumference.toFixed(2)}`;
      const strokeDashoffset = (-accumulated * circumference).toFixed(2);
      accumulated += pct;

      return {
        ...cat,
        pct: pct * 100,
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, [filteredCategories, filteredTotal, circumference]);

  const activeCategory = useMemo(() => {
    if (!activeId) return null;
    return categories.find((c) => c.id === activeId) || null;
  }, [activeId, categories]);

  return (
    <div
      className={`rounded-2xl bg-card border border-line p-5 sm:p-6 shadow-sm lift select-none ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-line">
        <div>
          <h3 className="font-display font-bold text-xs uppercase tracking-wider text-ink">
            Expense Allocation Matrix
          </h3>
          <span className="text-[11px] text-ink/50">{periodLabel}</span>
        </div>

        {/* Essential vs Discretionary Pills */}
        <div className="flex items-center gap-1 p-0.5 bg-moss/80 rounded-lg border border-line">
          {[
            { id: 'all', label: 'All' },
            { id: 'essential', label: 'Needs' },
            { id: 'discretionary', label: 'Wants' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterMode(tab.id as any)}
              className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                filterMode === tab.id
                  ? 'bg-card text-ink font-bold shadow-xs border border-line'
                  : 'text-ink/60 hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="py-14 text-center text-xs text-ink/40 space-y-2">
          <PieChart className="w-8 h-8 mx-auto text-ink/30" />
          <p>No expenses recorded in this period</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center pt-3">
          {/* Radial Ring Graphic */}
          <div className="relative flex items-center justify-center">
            <svg width={size} height={size} className="transform -rotate-90">
              {/* Background Track */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-moss"
              />

              {/* Segmented Arcs */}
              {segments.map((seg) => {
                const isHovered = activeId === seg.id;
                const isDimmed = activeId !== null && !isHovered;

                return (
                  <circle
                    key={seg.id}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-200 cursor-pointer"
                    style={{
                      opacity: isDimmed ? 0.25 : 1,
                      filter: isHovered ? 'drop-shadow(0 0 6px currentColor)' : 'none',
                    }}
                    onPointerEnter={() => setActiveId(seg.id)}
                    onPointerLeave={() => setActiveId(null)}
                  />
                );
              })}
            </svg>

            {/* Dynamic Center Readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-6">
              {activeCategory ? (
                <>
                  <span
                    className="text-xs font-bold truncate max-w-[140px]"
                    style={{ color: activeCategory.color }}
                  >
                    {activeCategory.name}
                  </span>
                  <span className="text-2xl sm:text-3xl font-display font-extrabold text-ink tabular-nums font-mono num mt-0.5">
                    {isPrivacyMode
                      ? '••••••'
                      : formatCurrency(activeCategory.amount, baseCurrency, numberFormat, false)}
                  </span>
                  <span className="text-xs font-semibold text-ink/75 mt-0.5">
                    {formatPercent(filteredTotal > 0 ? (activeCategory.amount / filteredTotal) * 100 : 0)} of total spend
                  </span>
                </>
              ) : (
                <>
                  <span className="text-xs font-bold text-ink/75 uppercase tracking-wider">
                    Total Spend
                  </span>
                  <span className="text-2xl sm:text-3xl font-display font-extrabold text-ink tabular-nums font-mono num mt-0.5">
                    {isPrivacyMode
                      ? '••••••'
                      : formatCurrency(filteredTotal, baseCurrency, numberFormat, false)}
                  </span>
                  <span className="text-xs font-semibold text-ink/70 mt-0.5">
                    {filteredCategories.length} Categories
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Interactive Category List */}
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
            {segments.map((cat) => {
              const isHovered = activeId === cat.id;

              return (
                <div
                  key={cat.id}
                  onPointerEnter={() => setActiveId(cat.id)}
                  onPointerLeave={() => setActiveId(null)}
                  className={`flex items-center justify-between p-2.5 rounded-xl text-[13px] transition-all cursor-pointer ${
                    isHovered
                      ? 'bg-moss/90 shadow-sm border border-pine-300 dark:border-pine-800'
                      : 'hover:bg-moss/40 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-bold text-ink truncate max-w-[140px]">
                      {cat.name}
                    </span>
                    {cat.isEssential && (
                      <span className="text-[10.5px] font-semibold bg-pine-50 dark:bg-pine-950/60 text-pine-700 dark:text-pine-300 border border-pine-200/70 px-1.5 py-0.5 rounded-md">
                        Essential
                      </span>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="font-extrabold text-ink tabular-nums num block text-[13.5px]">
                      {isPrivacyMode
                        ? '••••'
                        : formatCurrency(cat.amount, baseCurrency, numberFormat, false)}
                    </span>
                    <span className="text-xs font-semibold text-ink/65 block num">
                      {formatPercent(cat.pct)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
