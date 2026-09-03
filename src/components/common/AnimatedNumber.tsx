import React, { useEffect, useState, useRef } from 'react';
import { formatCurrency, formatCompactCurrency, formatPercent } from '../../utils/formatters';
import type { CurrencyCode, NumberFormatType } from '../../types';

interface AnimatedNumberProps {
  value: number;
  currency?: CurrencyCode;
  numberFormat?: NumberFormatType;
  isPrivacyMode?: boolean;
  isCompact?: boolean;
  isPercent?: boolean;
  className?: string;
  durationMs?: number;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  currency = 'INR',
  numberFormat = 'indian',
  isPrivacyMode = false,
  isCompact = false,
  isPercent = false,
  className = '',
  durationMs = 600,
}) => {
  const [displayValue, setDisplayValue] = useState<number>(value);
  const prevValueRef = useRef<number>(value);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPrivacyMode) {
      setDisplayValue(value);
      return;
    }

    const startVal = prevValueRef.current;
    const endVal = value;
    const diff = endVal - startVal;

    if (Math.abs(diff) < 0.01) {
      setDisplayValue(endVal);
      prevValueRef.current = endVal;
      return;
    }

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      // Ease out cubic: 1 - (1 - x)^3
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startVal + diff * easeOut;

      setDisplayValue(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endVal);
        prevValueRef.current = endVal;
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value, durationMs, isPrivacyMode]);

  if (isPrivacyMode) {
    return <span className={`tabular-nums font-mono ${className}`}>••••••</span>;
  }

  let formatted = '';
  if (isPercent) {
    formatted = formatPercent(displayValue);
  } else if (isCompact) {
    formatted = formatCompactCurrency(displayValue, currency, numberFormat, false);
  } else {
    formatted = formatCurrency(displayValue, currency, numberFormat, false);
  }

  return (
    <span className={`tabular-nums font-mono transition-colors ${className}`}>
      {formatted}
    </span>
  );
};
