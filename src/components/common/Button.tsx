import React from 'react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'accent' | 'dark';
  size?: 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold rounded-xl transition-all select-none cursor-pointer ' +
      'focus-visible:outline-none disabled:opacity-45 disabled:pointer-events-none ' +
      'active:scale-[0.97]';

    const variants = {
      primary:
        'bg-pine-700 hover:bg-pine-600 active:bg-pine-800 text-white font-semibold ' +
        'shadow-sm shadow-pine-900/25 border border-pine-800/30',
      accent:
        'bg-mari-500 hover:bg-mari-400 active:bg-mari-600 text-white font-semibold ' +
        'shadow-sm border border-mari-600/30',
      secondary:
        'border border-line bg-card text-ink hover:border-pine-300 hover:bg-pine-50/50 dark:hover:bg-white/[0.04]',
      outline:
        'border border-line bg-card text-pine-700 dark:text-pine-400 hover:border-pine-300 hover:bg-pine-50 dark:hover:bg-pine-950/40',
      danger:
        'border border-flare-300/40 bg-flare-100/70 dark:bg-flare-950/40 text-flare-600 hover:bg-flare-100',
      ghost:
        'text-ink/70 hover:text-ink hover:bg-moss',
      dark:
        'bg-pine-900 hover:bg-pine-800 text-pine-50 shadow-sm',
    };

    const sizes = {
      sm: 'text-xs px-3.5 py-1.5 gap-1.5 min-h-[32px]',
      md: 'text-xs sm:text-[13px] px-4 py-2 gap-2 min-h-[38px]',
      lg: 'text-sm px-5 py-2.5 gap-2.5 min-h-[44px]',
      icon: 'p-2.5 min-w-[38px] min-h-[38px]',
      'icon-sm': 'p-1.5 min-w-[30px] min-h-[30px]',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
