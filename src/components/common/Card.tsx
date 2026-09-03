import React from 'react';
import { cn } from '../../utils/cn';

// ----- Card -----
// PaisaBook-style organic elevated surface
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  /** 'default' = standard organic card | 'flat' = hairline border | 'ghost' = transparent */
  variant?: 'default' | 'flat' | 'ghost';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover = false, variant = 'default', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'transition-all duration-150',
          variant === 'default' && [
            'bg-card',
            'border border-line',
            'rounded-2xl shadow-card',
            hover && 'hover:-translate-y-0.5 hover:border-pine-300 hover:shadow-md cursor-pointer',
          ],
          variant === 'flat' && [
            'bg-card',
            'border border-line',
            'rounded-xl',
            hover && 'hover:border-pine-300 cursor-pointer',
          ],
          variant === 'ghost' && [
            'rounded-2xl',
            hover && 'hover:bg-moss cursor-pointer',
          ],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// ----- Surface -----
// Inset surface for metric groupings
export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-moss/70 border border-line rounded-xl',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Surface.displayName = 'Surface';
