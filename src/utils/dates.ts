// Date and Financial Year calculation utilities

export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
  label: string;
}

// Convert Date object to YYYY-MM-DD
export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Format readable date e.g. "02 Sep 2026"
export function formatReadableDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// Format short date e.g. "02 Sep"
export function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
}

// Format month name e.g. "September 2026"
export function formatMonthYear(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  });
}

// Get Indian or custom Financial Year range
export function getFinancialYearRange(refDate: Date = new Date(), startMonth: number = 4): DateRange {
  const currentMonth = refDate.getMonth() + 1; // 1-12
  const currentYear = refDate.getFullYear();

  let fyStartYear = currentYear;
  if (currentMonth < startMonth) {
    fyStartYear = currentYear - 1;
  }
  const fyEndYear = fyStartYear + 1;

  const start = new Date(fyStartYear, startMonth - 1, 1);
  const end = new Date(fyEndYear, startMonth - 1, 0); // Last day of previous month in next year

  const label = startMonth === 4
    ? `FY ${fyStartYear}-${String(fyEndYear).substring(2)}`
    : `FY ${fyStartYear}`;

  return {
    start: formatDateISO(start),
    end: formatDateISO(end),
    label,
  };
}

// Get standard date range presets
export function getDateRangePresets(fyStartMonth: number = 4): Record<string, DateRange> {
  const now = new Date();
  const today = formatDateISO(now);

  // This Week (Monday to Sunday)
  const dayOfWeek = now.getDay();
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  // This Month
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Last Month
  const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  // This Quarter
  const currentQuarter = Math.floor(now.getMonth() / 3);
  const firstDayOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
  const lastDayOfQuarter = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);

  // This Calendar Year
  const firstDayOfCY = new Date(now.getFullYear(), 0, 1);
  const lastDayOfCY = new Date(now.getFullYear(), 11, 31);

  // Last 12 Months
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  // Financial Year
  const fy = getFinancialYearRange(now, fyStartMonth);

  return {
    'this-week': {
      start: formatDateISO(monday),
      end: formatDateISO(sunday),
      label: 'This Week',
    },
    'this-month': {
      start: formatDateISO(firstDayOfMonth),
      end: formatDateISO(lastDayOfMonth),
      label: 'This Month',
    },
    'last-month': {
      start: formatDateISO(firstDayOfLastMonth),
      end: formatDateISO(lastDayOfLastMonth),
      label: 'Last Month',
    },
    'this-quarter': {
      start: formatDateISO(firstDayOfQuarter),
      end: formatDateISO(lastDayOfQuarter),
      label: 'This Quarter',
    },
    'this-fy': fy,
    'this-cy': {
      start: formatDateISO(firstDayOfCY),
      end: formatDateISO(lastDayOfCY),
      label: `CY ${now.getFullYear()}`,
    },
    'last-12-months': {
      start: formatDateISO(twelveMonthsAgo),
      end: today,
      label: 'Last 12 Months',
    },
    'all-time': {
      start: '1970-01-01',
      end: today,
      label: 'All Time',
    },
  };
}

// Compute equivalent previous period for comparison (e.g. Month-over-Month, Period-over-Period)
export function getPreviousPeriodRange(start: string, end: string): DateRange {
  const startDate = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');
  const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const prevEndDate = new Date(startDate);
  prevEndDate.setDate(startDate.getDate() - 1);

  const prevStartDate = new Date(prevEndDate);
  prevStartDate.setDate(prevEndDate.getDate() - diffDays + 1);

  return {
    start: formatDateISO(prevStartDate),
    end: formatDateISO(prevEndDate),
    label: 'Prior Period',
  };
}

/**
 * Checks whether a transaction date is strictly after an account's baseline date.
 * Strips any ISO timestamps/timezones and performs clean YYYY-MM-DD string comparison.
 * If baselineDate is not set, returns true (all transactions count).
 */
export function isTxAfterBaseline(txDate?: string, baselineDate?: string): boolean {
  if (!baselineDate) return true;
  if (!txDate) return false;
  const dTx = txDate.split('T')[0].trim();
  const dBase = baselineDate.split('T')[0].trim();
  return dTx > dBase;
}

