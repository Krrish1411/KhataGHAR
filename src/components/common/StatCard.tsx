import React from 'react';
import { Card } from './Card';
import { Sparkline } from '../charts/Sparkline';
import { cn } from '../../utils/cn';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: React.ReactNode;
  subtext?: string;
  icon?: React.ReactNode;
  iconColor?: string;
  sparkline?: number[];
  trend?: {
    value: string;
    isPositive?: boolean;
    isNeutral?: boolean;
    label?: string;
  };
  /** 'sm' = compact KPI | 'md' = standard (default) | 'lg' = hero metric */
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon,
  iconColor,
  sparkline,
  trend,
  size = 'md',
  onClick,
  className,
}) => {
  return (
    <Card
      hover={Boolean(onClick)}
      onClick={onClick}
      className={cn(
        'relative overflow-hidden flex flex-col justify-between',
        size === 'sm' && 'p-3.5 sm:p-4 space-y-2.5',
        size === 'md' && 'p-4 sm:p-5 space-y-3',
        size === 'lg' && 'p-5 sm:p-6 space-y-4',
        className
      )}
    >
      {/* Top row: label + icon */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0 flex-1">
          <span
            className={cn(
              'block font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate',
              size === 'sm' && 'text-[10px]',
              size === 'md' && 'text-[11px]',
              size === 'lg' && 'text-xs',
            )}
          >
            {title}
          </span>
          <div
            className={cn(
              'font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums font-mono leading-none',
              size === 'sm' && 'text-xl',
              size === 'md' && 'text-2xl sm:text-[1.625rem]',
              size === 'lg' && 'text-3xl sm:text-4xl',
            )}
          >
            {value}
          </div>
        </div>

        {icon && (
          <div
            className={cn(
              'rounded-xl flex-shrink-0 flex items-center justify-center',
              size === 'sm' && 'p-1.5 bg-slate-100 dark:bg-white/[0.05] w-7 h-7',
              size === 'md' && 'p-2 bg-slate-100 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06] w-9 h-9',
              size === 'lg' && 'p-2.5 bg-slate-100 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06] w-10 h-10',
              iconColor,
            )}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Bottom row: sparkline + trend or subtext */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2 text-xs min-w-0">
          {trend && (
            <span
              className={cn(
                'inline-flex items-center gap-1 font-semibold px-1.5 py-0.5 rounded-md text-[11px] tabular-nums font-mono flex-shrink-0',
                trend.isNeutral
                  ? 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/[0.06]'
                  : trend.isPositive
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
              )}
            >
              {trend.isNeutral ? (
                <Minus className="w-2.5 h-2.5" />
              ) : trend.isPositive ? (
                <TrendingUp className="w-2.5 h-2.5" />
              ) : (
                <TrendingDown className="w-2.5 h-2.5" />
              )}
              <span>{trend.value}</span>
            </span>
          )}
          {trend?.label && (
            <span className="text-slate-500 dark:text-slate-400 text-[11px] truncate">{trend.label}</span>
          )}
          {subtext && !trend && (
            <span className="text-slate-500 dark:text-slate-400 text-[11px] truncate">{subtext}</span>
          )}
        </div>

        {/* Micro-sparkline if provided */}
        {sparkline && sparkline.length > 1 && (
          <div className="flex-shrink-0">
            <Sparkline
              data={sparkline}
              width={64}
              height={22}
              color={trend ? (trend.isPositive ? 'emerald' : 'rose') : 'amber'}
            />
          </div>
        )}
      </div>
    </Card>
  );
};
