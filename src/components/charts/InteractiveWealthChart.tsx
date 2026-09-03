import React, { useState, useMemo, useRef, useCallback } from 'react';
import { formatCurrency, formatCompactCurrency, formatPercent } from '../../utils/formatters';
import { formatReadableDate } from '../../utils/dates';
import type { CurrencyCode, NumberFormatType, Transaction } from '../../types';
import { TrendingUp, TrendingDown, Calendar, Layers, Activity } from 'lucide-react';

export type TimeframeOption = '1W' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'ALL';

export interface InteractiveWealthChartProps {
  currentNetWorth: number;
  transactions: Transaction[];
  baseCurrency: CurrencyCode;
  numberFormat: NumberFormatType;
  isPrivacyMode?: boolean;
  className?: string;
}

interface DataPoint {
  date: string;
  label: string;
  netWorth: number;
  inflow: number;
  outflow: number;
}

export const InteractiveWealthChart: React.FC<InteractiveWealthChartProps> = ({
  currentNetWorth,
  transactions,
  baseCurrency,
  numberFormat,
  isPrivacyMode = false,
  className = '',
}) => {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('1M');
  const [viewMode, setViewMode] = useState<'trajectory' | 'cashflow'>('trajectory');
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Compute timeline data points based on timeframe
  const data = useMemo(() => {
    const now = new Date();
    let startDate = new Date();

    switch (timeframe) {
      case '1W':
        startDate.setDate(now.getDate() - 7);
        break;
      case '1M':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3M':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6M':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case 'YTD':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case '1Y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'ALL':
        if (transactions.length > 0) {
          const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
          startDate = new Date(sorted[0].date);
        } else {
          startDate.setMonth(now.getMonth() - 1);
        }
        break;
    }

    const startISO = startDate.toISOString().split('T')[0];
    const nowISO = now.toISOString().split('T')[0];

    // Filter relevant transactions
    const relevantTxs = transactions
      .filter((t) => t.date >= startISO && t.date <= nowISO)
      .sort((a, b) => a.date.localeCompare(b.date));

    // Aggregate daily net cashflows
    const dayMap = new Map<string, { inflow: number; outflow: number }>();
    relevantTxs.forEach((tx) => {
      const existing = dayMap.get(tx.date) || { inflow: 0, outflow: 0 };
      if (tx.type === 'income') existing.inflow += tx.amount;
      if (tx.type === 'expense') existing.outflow += tx.amount;
      dayMap.set(tx.date, existing);
    });

    // Generate timeline buckets (at least 7 intervals up to 30)
    const points: DataPoint[] = [];
    const totalDays = Math.max(1, Math.round((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const step = Math.max(1, Math.floor(totalDays / 24));

    // Work backwards from currentNetWorth to calculate historical trajectory
    // Total net change in range:
    let runningNetChange = 0;
    relevantTxs.forEach((tx) => {
      if (tx.type === 'income') runningNetChange += tx.amount;
      if (tx.type === 'expense') runningNetChange -= tx.amount;
    });

    const baselineWorth = currentNetWorth - runningNetChange;
    let cumChange = 0;

    const cur = new Date(startDate);
    while (cur <= now) {
      const dateStr = cur.toISOString().split('T')[0];
      const dayData = dayMap.get(dateStr) || { inflow: 0, outflow: 0 };
      cumChange += dayData.inflow - dayData.outflow;

      const dateLabel = cur.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });

      points.push({
        date: dateStr,
        label: dateLabel,
        netWorth: baselineWorth + cumChange,
        inflow: dayData.inflow,
        outflow: dayData.outflow,
      });

      cur.setDate(cur.getDate() + step);
    }

    // Ensure the final point is today
    if (points.length === 0 || points[points.length - 1].date !== nowISO) {
      points.push({
        date: nowISO,
        label: now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        netWorth: currentNetWorth,
        inflow: dayMap.get(nowISO)?.inflow || 0,
        outflow: dayMap.get(nowISO)?.outflow || 0,
      });
    }

    return points;
  }, [timeframe, transactions, currentNetWorth]);

  // Calculations for displayed value
  const activePoint = hoveredPoint || (data.length > 0 ? data[data.length - 1] : null);
  const startPoint = data.length > 0 ? data[0] : null;

  const displayedValue = activePoint ? activePoint.netWorth : currentNetWorth;
  const initialValue = startPoint ? startPoint.netWorth : currentNetWorth;
  const deltaValue = displayedValue - initialValue;
  const deltaPercent = initialValue !== 0 ? (deltaValue / Math.abs(initialValue)) * 100 : 0;
  const isGain = deltaValue >= 0;

  // Chart coordinate normalization
  const width = 800;
  const height = 240;
  const padTop = 20;
  const padBottom = 30;
  const padLeft = 10;
  const padRight = 10;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  const minVal = useMemo(() => {
    if (data.length === 0) return 0;
    const vals = data.map((d) => (viewMode === 'trajectory' ? d.netWorth : Math.max(d.inflow, d.outflow)));
    return Math.min(...vals);
  }, [data, viewMode]);

  const maxVal = useMemo(() => {
    if (data.length === 0) return 1000;
    const vals = data.map((d) => (viewMode === 'trajectory' ? d.netWorth : Math.max(d.inflow, d.outflow)));
    return Math.max(...vals);
  }, [data, viewMode]);

  const range = maxVal - minVal === 0 ? 1 : maxVal - minVal;

  const coords = useMemo(() => {
    return data.map((d, i) => {
      const x = padLeft + (i / Math.max(1, data.length - 1)) * plotWidth;
      const yVal = viewMode === 'trajectory' ? d.netWorth : d.inflow;
      const y = padTop + plotHeight - ((yVal - minVal) / range) * plotHeight;
      return { x, y, data: d };
    });
  }, [data, minVal, range, plotWidth, plotHeight, viewMode]);

  // Generate SVG path
  const pathD = useMemo(() => {
    if (coords.length < 2) return '';
    let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i === 0 ? i : i - 1];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = coords[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  }, [coords]);

  const areaD = useMemo(() => {
    if (!pathD || coords.length === 0) return '';
    const lastX = coords[coords.length - 1].x.toFixed(1);
    const firstX = coords[0].x.toFixed(1);
    const bottomY = (height - padBottom).toFixed(1);
    return `${pathD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [pathD, coords, height, padBottom]);

  // Hover tracker calculation
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!containerRef.current || coords.length === 0) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const normalizedX = (clientX / rect.width) * width;

      // Find closest point
      let closest = coords[0];
      let minDist = Math.abs(coords[0].x - normalizedX);

      for (let i = 1; i < coords.length; i++) {
        const dist = Math.abs(coords[i].x - normalizedX);
        if (dist < minDist) {
          minDist = dist;
          closest = coords[i];
        }
      }

      setHoveredPoint(closest.data);
    },
    [coords, width]
  );

  const handlePointerLeave = useCallback(() => {
    setHoveredPoint(null);
  }, []);

  const activeCoord = useMemo(() => {
    if (!activePoint) return null;
    return coords.find((c) => c.data.date === activePoint.date) || coords[coords.length - 1];
  }, [activePoint, coords]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-2xl bg-card border border-line p-5 sm:p-6 shadow-sm lift select-none ${className}`}
    >
      {/* Top Header Readout & Timeframe Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink/45">
              {hoveredPoint ? formatReadableDate(hoveredPoint.date) : `${timeframe} Position Trajectory`}
            </span>
            {hoveredPoint && (
              <span className="text-[10px] bg-pine-50 dark:bg-pine-950/40 text-pine-700 dark:text-pine-300 border border-pine-200/60 px-1.5 py-0.5 rounded-md font-semibold">
                Scrubbing
              </span>
            )}
          </div>

          {/* Live Scrubbing Number */}
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight text-ink tabular-nums num">
              {isPrivacyMode ? (
                '••••••'
              ) : (
                formatCurrency(displayedValue, baseCurrency, numberFormat, false)
              )}
            </span>

            <span
              className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md tabular-nums font-mono num ${
                isGain
                  ? 'bg-pine-50 dark:bg-pine-950/40 text-pine-700 dark:text-pine-400 border border-pine-200/60'
                  : 'bg-flare-100/70 text-flare-600 border border-flare-500/20'
              }`}
            >
              {isGain ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>
                {isGain ? '+' : ''}
                {isPrivacyMode
                  ? '••••'
                  : formatCompactCurrency(deltaValue, baseCurrency, numberFormat, false)}
                {' ('}
                {formatPercent(Math.abs(deltaPercent))}
                {')'}
              </span>
            </span>
          </div>
        </div>

        {/* Timeframe Controls */}
        <div className="flex items-center gap-1 p-1 bg-moss/80 rounded-xl border border-line overflow-x-auto self-start sm:self-center">
          {(['1W', '1M', '3M', '6M', 'YTD', '1Y', 'ALL'] as TimeframeOption[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                timeframe === tf
                  ? 'bg-card text-ink font-bold shadow-xs border border-line'
                  : 'text-ink/60 hover:text-ink'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Interactive Canvas */}
      <div className="relative w-full h-56 sm:h-64 mt-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full cursor-crosshair overflow-visible"
          preserveAspectRatio="none"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          <defs>
            {/* Ambient Area Gradient */}
            <linearGradient id="wealthAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.28} />
              <stop offset="40%" stopColor="#F59E0B" stopOpacity={0.08} />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.0} />
            </linearGradient>

            {/* Glowing Stroke Filter */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Grid Lines */}
          {[0.25, 0.5, 0.75].map((pct, idx) => {
            const y = padTop + plotHeight * pct;
            return (
              <line
                key={idx}
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="currentColor"
                className="text-slate-100 dark:text-white/[0.04]"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            );
          })}

          {/* Area Fill */}
          {areaD && <path d={areaD} fill="url(#wealthAreaGradient)" />}

          {/* Smooth Trajectory Curve */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#F59E0B"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Active Vertical Crosshair Hairline */}
          {activeCoord && (
            <g>
              <line
                x1={activeCoord.x}
                y1={padTop}
                x2={activeCoord.x}
                y2={height - padBottom}
                stroke="#F59E0B"
                strokeWidth="1.2"
                strokeDasharray="3 3"
                className="opacity-70"
              />
              <circle
                cx={activeCoord.x}
                cy={activeCoord.y}
                r="6"
                fill="#F59E0B"
                className="animate-pulse"
              />
              <circle
                cx={activeCoord.x}
                cy={activeCoord.y}
                r="3"
                fill="#FFFFFF"
              />
            </g>
          )}

          {/* X-Axis Tick Labels */}
          {coords.length > 0 &&
            [0, Math.floor(coords.length / 2), coords.length - 1].map((idx) => {
              const pt = coords[idx];
              if (!pt) return null;
              return (
                <text
                  key={idx}
                  x={pt.x}
                  y={height - 8}
                  textAnchor={idx === 0 ? 'start' : idx === coords.length - 1 ? 'end' : 'middle'}
                  className="fill-slate-400 dark:fill-slate-500 text-[11px] font-mono select-none"
                >
                  {pt.data.label}
                </text>
              );
            })}
        </svg>
      </div>
    </div>
  );
};
