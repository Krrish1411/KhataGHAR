// Client-side statement CSV/XLSX parser and Indian UPI SMS regex extractor for Khata Ghar

import type { Transaction, CurrencyCode } from '../types';

export interface ColumnMapping {
  dateCol: number;
  descCol: number;
  debitCol?: number;
  creditCol?: number;
  amountCol?: number;
  typeCol?: number;
  balanceCol?: number;
  categoryCol?: number;
}

export interface ParsedRawRow {
  rowIdx: number;
  raw: string[];
}

export interface StagedTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  type: 'expense' | 'income';
  currency: CurrencyCode;
  categoryGuess?: string;
  referenceNumber?: string;
  isDuplicate?: boolean;
  selected: boolean;
}

// Parse date string into YYYY-MM-DD
export function normalizeDateString(rawDate: string): string {
  if (!rawDate) return new Date().toISOString().split('T')[0];

  const cleaned = rawDate.trim().replace(/['"]/g, '');

  // Try standard ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = cleaned.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, '0');
    const month = ddmmyyyy[2].padStart(2, '0');
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }

  // DD-MMM-YYYY (e.g. 15-Aug-2024 or 15 Aug 2024)
  const monthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const ddmmmyyyy = cleaned.match(/^(\d{1,2})[\s\-/]([A-Za-z]{3,4})[\s\-/](\d{2,4})$/);
  if (ddmmmyyyy) {
    const day = ddmmmyyyy[1].padStart(2, '0');
    const monthKey = ddmmmyyyy[2].toLowerCase().substring(0, 3);
    const month = monthMap[monthKey] || '01';
    let year = ddmmmyyyy[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

// Parse CSV text into array of rows
export function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let currentToken = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentToken += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      row.push(currentToken.trim());
      currentToken = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(currentToken.trim());
      if (row.some((cell) => cell.length > 0)) {
        lines.push(row);
      }
      row = [];
      currentToken = '';
    } else {
      currentToken += char;
    }
  }

  if (currentToken.length > 0 || row.length > 0) {
    row.push(currentToken.trim());
    if (row.some((cell) => cell.length > 0)) {
      lines.push(row);
    }
  }

  return lines;
}

// Guess column indexes from CSV headers
export function guessColumnMappings(headers: string[]): ColumnMapping {
  const lower = headers.map((h) => h.toLowerCase());

  let dateCol = lower.findIndex((h) => h.includes('date') || h.includes('txn dt') || h.includes('time'));
  let descCol = lower.findIndex((h) => h.includes('desc') || h.includes('narration') || h.includes('particulars') || h.includes('remark') || h.includes('party'));
  let debitCol = lower.findIndex((h) => h.includes('debit') || h.includes('withdrawal') || h.includes('dr'));
  let creditCol = lower.findIndex((h) => h.includes('credit') || h.includes('deposit') || h.includes('cr'));
  let amountCol = lower.findIndex((h) => h.includes('amount') || h.includes('txn amt'));
  let balanceCol = lower.findIndex((h) => h.includes('balance') || h.includes('bal'));
  let categoryCol = lower.findIndex((h) => h.includes('category') || h.includes('type'));

  return {
    dateCol: dateCol >= 0 ? dateCol : 0,
    descCol: descCol >= 0 ? descCol : 1,
    debitCol: debitCol >= 0 ? debitCol : undefined,
    creditCol: creditCol >= 0 ? creditCol : undefined,
    amountCol: amountCol >= 0 ? amountCol : undefined,
    balanceCol: balanceCol >= 0 ? balanceCol : undefined,
    categoryCol: categoryCol >= 0 ? categoryCol : undefined,
  };
}

// Clean number string (remove currency symbols, commas, spaces)
export function parseCleanAmount(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.abs(num);
}

// Map parsed CSV rows to Staged Transactions and check duplicates
export function processStatementRows(
  rows: string[][],
  mapping: ColumnMapping,
  existingTransactions: Transaction[],
  currency: CurrencyCode = 'INR',
  headerOffset: number = 1
): StagedTransaction[] {
  const staged: StagedTransaction[] = [];
  const dataRows = rows.slice(headerOffset);

  dataRows.forEach((row, idx) => {
    if (!row || row.length <= 1) return;

    const rawDate = row[mapping.dateCol] || '';
    const date = normalizeDateString(rawDate);
    const description = (row[mapping.descCol] || 'Transaction').trim();

    let amount = 0;
    let type: 'expense' | 'income' = 'expense';

    if (mapping.debitCol !== undefined && mapping.creditCol !== undefined) {
      const debitVal = parseCleanAmount(row[mapping.debitCol] || '');
      const creditVal = parseCleanAmount(row[mapping.creditCol] || '');

      if (debitVal > 0) {
        amount = debitVal;
        type = 'expense';
      } else if (creditVal > 0) {
        amount = creditVal;
        type = 'income';
      }
    } else if (mapping.amountCol !== undefined) {
      const rawAmt = row[mapping.amountCol] || '';
      amount = parseCleanAmount(rawAmt);
      if (rawAmt.includes('-') || (mapping.typeCol && (row[mapping.typeCol] || '').toLowerCase().includes('dr'))) {
        type = 'expense';
      } else if (mapping.typeCol && (row[mapping.typeCol] || '').toLowerCase().includes('cr')) {
        type = 'income';
      }
    }

    if (amount <= 0) return;

    // Check duplicate
    const isDuplicate = existingTransactions.some((t) => {
      return t.date === date && Math.abs(t.amount - amount) < 0.01 &&
        (t.note?.toLowerCase().includes(description.toLowerCase().substring(0, 10)) ||
         description.toLowerCase().includes(t.note?.toLowerCase() || '---'));
    });

    staged.push({
      id: `staged_${Date.now()}_${idx}`,
      date,
      description,
      amount,
      type,
      currency,
      categoryGuess: mapping.categoryCol ? row[mapping.categoryCol] : undefined,
      isDuplicate,
      selected: !isDuplicate, // Uncheck duplicates by default
    });
  });

  return staged;
}

// Indian Bank / UPI SMS Regex Parser
export interface ParsedSMSResult {
  rawText: string;
  date: string;
  amount: number;
  type: 'expense' | 'income';
  merchant: string;
  refNumber?: string;
  accountEnding?: string;
  confidence: 'high' | 'medium' | 'low';
}

export function parseIndianUpiSMS(smsText: string): ParsedSMSResult[] {
  const results: ParsedSMSResult[] = [];
  const entries = smsText.split(/\n\s*\n|\n(?=[A-Z0-9]{2,}-|[A-Za-z0-9]+\s+debited|Rs\.|INR)/g);

  // Common Indian Bank SMS Regexes
  // Example 1: "Rs. 450.00 debited from A/c **1234 on 02-09-24 to Swiggy UPI:42456789. Bal Rs 12000"
  // Example 2: "Sent Rs.1,500.00 from Kotak Bank AC X1234 to Rahul Sharma on 02/09/24 Ref 4245678912"
  // Example 3: "A/C *5678 debited by Rs 250.00 on 02Sep24 transfer to Sharma Store Ref 424123"
  // Example 4: "INR 500.00 credited to a/c 1234 on 01-09-24 by UPI/PAYTM/REF"

  const debitPatterns = [
    /(?:debited\s*(?:by|with)?|sent|paid|spent|transferred)\s*(?:INR|Rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /(?:INR|Rs\.?|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:debited|spent|paid|transferred|withdrawn)/i,
    /(?:paid|transferred)\s*(?:INR|Rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*to\s*([^,.\n]+)/i,
  ];

  const creditPatterns = [
    /(?:credited\s*(?:by|with)?|received|deposited)\s*(?:INR|Rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /(?:INR|Rs\.?|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:credited|received|deposited)/i,
  ];

  entries.forEach((entry) => {
    const text = entry.trim();
    if (text.length < 10) return;

    let amount = 0;
    let type: 'expense' | 'income' = 'expense';
    let matched = false;

    // Check Debit
    for (const pat of debitPatterns) {
      const m = text.match(pat);
      if (m && m[1]) {
        amount = parseCleanAmount(m[1]);
        type = 'expense';
        matched = true;
        break;
      }
    }

    // Check Credit if not debit
    if (!matched) {
      for (const pat of creditPatterns) {
        const m = text.match(pat);
        if (m && m[1]) {
          amount = parseCleanAmount(m[1]);
          type = 'income';
          matched = true;
          break;
        }
      }
    }

    if (!matched || amount <= 0) return;

    // Extract Date
    const dateMatch = text.match(/\b(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}|\d{1,2}\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{2,4})\b/i);
    const date = dateMatch ? normalizeDateString(dateMatch[1]) : new Date().toISOString().split('T')[0];

    // Extract Merchant / Beneficiary
    let merchant = 'UPI Payment';
    const toMatch = text.match(/(?:to|at|info|vpa|paid to|transfer to)\s*([A-Za-z0-9\s._@\-]+?)(?=\s*(?:on|ref|upi|bal|avl|txn|\.|$))/i);
    if (toMatch && toMatch[1]) {
      merchant = toMatch[1].trim().replace(/^(the|a)\s+/i, '');
    } else if (type === 'income') {
      const fromMatch = text.match(/(?:from|by)\s*([A-Za-z0-9\s._@\-]+?)(?=\s*(?:on|ref|upi|bal|avl|txn|\.|$))/i);
      if (fromMatch && fromMatch[1]) {
        merchant = fromMatch[1].trim();
      } else {
        merchant = 'UPI Credit';
      }
    }

    // Extract Ref Number
    const refMatch = text.match(/(?:ref|upi ref|rrn|txn|ref no\.?|reference)\s*[:#]?\s*([A-Za-z0-9]+)/i);
    const refNumber = refMatch ? refMatch[1] : undefined;

    // Extract Account Ending
    const accMatch = text.match(/(?:a\/c|ac|account)\s*(?:no\.?)?\s*[*xX]*([0-9]{3,4})/i);
    const accountEnding = accMatch ? accMatch[1] : undefined;

    results.push({
      rawText: text,
      date,
      amount,
      type,
      merchant: merchant.substring(0, 40),
      refNumber,
      accountEnding,
      confidence: refNumber || accountEnding ? 'high' : 'medium',
    });
  });

  return results;
}
