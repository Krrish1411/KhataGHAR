import React from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  tabularNums?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, label, error, helperText, leftIcon, rightIcon, tabularNums = false, id, ...props },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={cn(
              // Base
              'block w-full rounded-xl text-sm font-medium',
              // Colors
              'bg-white dark:bg-navy-800',
              'text-slate-900 dark:text-slate-100',
              'placeholder-slate-400 dark:placeholder-slate-500',
              // Border
              'border border-slate-200 dark:border-white/[0.08]',
              // Focus
              'focus:border-amber-500/70 focus:ring-2 focus:ring-amber-500/25',
              // Shadow
              'shadow-xs',
              // Padding
              'py-2.5',
              leftIcon ? 'pl-10' : 'pl-3.5',
              rightIcon ? 'pr-10' : 'pr-3.5',
              // Transitions
              'transition-[border-color,box-shadow] duration-120',
              // Error state
              error && 'border-rose-400 dark:border-rose-500/70 focus:border-rose-500 focus:ring-rose-500/25',
              // Tabular
              tabularNums && 'font-mono tracking-tight',
              className
            )}
            {...props}
          />

          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p className="text-[11px] text-rose-500 dark:text-rose-400 font-medium" role="alert" aria-live="polite">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
