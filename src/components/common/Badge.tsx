import React from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'info' | 'purple' | 'outline' | 'amber';
  tone?: 'gray' | 'pine' | 'mari' | 'sky' | 'ink' | 'flare' | 'danger' | 'success' | 'warning';
  size?: 'xs' | 'sm' | 'md';
  dot?: boolean;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  tone,
  size = 'sm',
  dot,
  icon,
  children,
  ...props
}) => {
  const base =
    'inline-flex items-center gap-1 font-bold rounded-full select-none tracking-wide uppercase whitespace-nowrap border';

  // If tone is provided, prefer PaisaBook organic tone scales
  const toneClasses = {
    gray: 'bg-moss text-ink/65 border-line',
    pine: 'bg-pine-50 dark:bg-pine-950/50 text-pine-700 dark:text-pine-300 border-pine-200/70 dark:border-pine-800/50',
    mari: 'bg-mari-100 dark:bg-mari-950/50 text-mari-700 dark:text-mari-300 border-mari-400/40 dark:border-mari-700/50',
    sky: 'bg-skyx-100 dark:bg-skyx-950/50 text-skyx-700 dark:text-skyx-300 border-skyx-600/25 dark:border-skyx-700/40',
    ink: 'bg-ink text-moss border-ink',
    flare: 'bg-flare-100 dark:bg-flare-950/50 text-flare-700 dark:text-flare-300 border-flare-500/30',
    danger: 'bg-flare-100 dark:bg-flare-950/50 text-flare-700 dark:text-flare-300 border-flare-500/30',
    success: 'bg-pine-50 dark:bg-pine-950/50 text-pine-700 dark:text-pine-300 border-pine-200/70',
    warning: 'bg-mari-100 dark:bg-mari-950/50 text-mari-700 dark:text-mari-300 border-mari-400/40',
  };

  const variantClasses = {
    default: 'bg-moss text-ink/70 border-line',
    amber: 'bg-mari-100 text-mari-700 border-mari-400/30',
    success: 'bg-pine-50 text-pine-700 border-pine-200/70',
    danger: 'bg-flare-100 text-flare-700 border-flare-500/30',
    warning: 'bg-mari-100 text-mari-700 border-mari-400/30',
    info: 'bg-skyx-100 text-skyx-700 border-skyx-600/30',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    outline: 'border-line text-ink/70',
  };

  const sizes = {
    xs: 'text-[9.5px] px-1.5 py-0.5',
    sm: 'text-[10.5px] px-2 py-0.5',
    md: 'text-[11.5px] px-2.5 py-1',
  };

  const chosenStyle = tone ? toneClasses[tone] : variantClasses[variant];

  return (
    <span className={cn(base, chosenStyle, sizes[size], className)} {...props}>
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full flex-shrink-0',
            (tone === 'pine' || variant === 'success') && 'bg-pine-600',
            (tone === 'flare' || tone === 'danger' || variant === 'danger') && 'bg-flare-500',
            (tone === 'mari' || variant === 'warning' || variant === 'amber') && 'bg-mari-500',
            (tone === 'sky' || variant === 'info') && 'bg-skyx-600',
            (tone === 'gray' || variant === 'default') && 'bg-ink/40'
          )}
        />
      )}
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      {children}
    </span>
  );
};
