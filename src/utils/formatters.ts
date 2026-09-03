import type { CurrencyCode, NumberFormatType } from '../types';

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'AED ',
  SGD: 'S$',
  CAD: 'CA$',
  AUD: 'A$',
  JPY: '¥',
  CHF: 'CHF ',
  CNY: '¥',
};

// Format a number according to Indian or International numbering system
export function formatRawNumber(
  amount: number,
  format: NumberFormatType = 'indian',
  decimals: number = 2
): string {
  if (isNaN(amount)) return '0.00';

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const fixedStr = absAmount.toFixed(decimals);
  const [integerPart, decimalPart] = fixedStr.split('.');

  let formattedInteger = '';

  if (format === 'indian') {
    // Indian numbering: last 3 digits, then groups of 2 digits (e.g. 12,34,567)
    if (integerPart.length <= 3) {
      formattedInteger = integerPart;
    } else {
      const last3 = integerPart.substring(integerPart.length - 3);
      const remaining = integerPart.substring(0, integerPart.length - 3);
      const groups = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
      formattedInteger = `${groups},${last3}`;
    }
  } else {
    // International numbering: groups of 3 digits (e.g. 1,234,567)
    formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  const result = decimals > 0 ? `${formattedInteger}.${decimalPart}` : formattedInteger;
  return isNegative ? `-${result}` : result;
}

// Format full currency string e.g. "₹ 1,25,000.00" or "$ 125,000.00"
export function formatCurrency(
  amount: number,
  currency: CurrencyCode = 'INR',
  format: NumberFormatType = 'indian',
  isPrivacyMode: boolean = false,
  decimals: number = 2
): string {
  if (isPrivacyMode) {
    return '••••••';
  }

  const symbol = CURRENCY_SYMBOLS[currency] || `${currency} `;
  const formattedNum = formatRawNumber(amount, format, decimals);
  return `${symbol}${formattedNum}`;
}

// Format compact currency (e.g. "₹ 1.25 L", "₹ 2.50 Cr", "$ 1.2M")
export function formatCompactCurrency(
  amount: number,
  currency: CurrencyCode = 'INR',
  format: NumberFormatType = 'indian',
  isPrivacyMode: boolean = false
): string {
  if (isPrivacyMode) {
    return '••••••';
  }

  const symbol = CURRENCY_SYMBOLS[currency] || `${currency} `;
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (format === 'indian') {
    if (abs >= 10000000) {
      // Crores
      return `${sign}${symbol}${(abs / 10000000).toFixed(2)} Cr`;
    }
    if (abs >= 100000) {
      // Lakhs
      return `${sign}${symbol}${(abs / 100000).toFixed(2)} L`;
    }
    if (abs >= 1000) {
      // Thousands
      return `${sign}${symbol}${(abs / 1000).toFixed(1)} k`;
    }
  } else {
    if (abs >= 1000000000) {
      return `${sign}${symbol}${(abs / 1000000000).toFixed(2)}B`;
    }
    if (abs >= 1000000) {
      return `${sign}${symbol}${(abs / 1000000).toFixed(2)}M`;
    }
    if (abs >= 1000) {
      return `${sign}${symbol}${(abs / 1000).toFixed(1)}K`;
    }
  }

  return `${sign}${symbol}${abs.toFixed(0)}`;
}

// Format percentage (e.g. "24.5%")
export function formatPercent(value: number, decimals: number = 1): string {
  if (isNaN(value) || !isFinite(value)) return '0.0%';
  return `${value.toFixed(decimals)}%`;
}

// Format file size in KB / MB
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
