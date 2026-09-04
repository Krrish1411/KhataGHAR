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

export type StagedEntryType =
  | 'expense'
  | 'income'
  | 'transfer'
  | 'invest'
  | 'debt_payment'
  | 'lent'
  | 'lent_repaid'
  | 'borrowed'
  | 'borrowed_repaid'
  | 'holding'
  | 'holding_returned';

export interface StagedTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  type: StagedEntryType;
  rawFlow: 'inflow' | 'outflow'; // 'inflow' = credit/received into account, 'outflow' = debit/spent from account
  currency: CurrencyCode;
  categoryGuess?: string;
  categoryId?: string;
  toAccountId?: string;
  contactName?: string;
  linkedAssetId?: string;
  linkedLiabilityId?: string;
  referenceNumber?: string;
  isDuplicate?: boolean;
  selected: boolean;
}

// Parse date string into YYYY-MM-DD
export function normalizeDateString(rawDate: string): string {
  if (!rawDate) return new Date().toISOString().split('T')[0];

  const cleaned = rawDate.trim().replace(/['"]/g, '');

  // Try standard ISO (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const ddmmyyyy = cleaned.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, '0');
    const month = ddmmyyyy[2].padStart(2, '0');
    let year = ddmmyyyy[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }

  // DD-MMM-YYYY or DD-MMM-YY (e.g. 31-Aug-26, 15-Aug-2024 or 15 Aug 2024)
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

// Automatically detect the transaction table header row index (skipping account summary / metadata rows)
export function detectHeaderRowIndex(rows: string[][]): number {
  if (!rows || rows.length === 0) return 0;
  let bestRowIdx = 0;
  let maxScore = -1;

  const scanLimit = Math.min(rows.length, 45);

  for (let r = 0; r < scanLimit; r++) {
    const row = rows[r];
    if (!row || row.length < 2) continue;

    const rowText = row.map((cell) => (cell || '').toLowerCase().trim());
    let score = 0;

    // Check date keywords (very strong indicator of transaction header)
    if (rowText.some((c) => c.includes('date') || c.includes('txn dt') || c.includes('tran date') || c.includes('value dt') || c.includes('post dt'))) {
      score += 5;
    }

    // Check description / particulars keywords
    if (rowText.some((c) => c.includes('particular') || c.includes('narration') || c.includes('desc') || c.includes('remark') || c.includes('details') || c.includes('party'))) {
      score += 4;
    }

    // Check debit keywords
    if (rowText.some((c) => c.includes('debit') || c.includes('withdrawal') || c.includes('dr amt') || c.includes('dr.') || (c.includes('dr') && c.length <= 4))) {
      score += 4;
    }

    // Check credit keywords
    if (rowText.some((c) => c.includes('credit') || c.includes('deposit') || c.includes('cr amt') || c.includes('cr.') || (c.includes('cr') && c.length <= 4))) {
      score += 4;
    }

    // Check amount / balance keywords
    if (rowText.some((c) => c.includes('amount') || c.includes('txn amt'))) {
      score += 3;
    }
    if (rowText.some((c) => c.includes('balance') || c.includes('bal') || c.includes('closing bal') || c.includes('running bal'))) {
      score += 2;
    }
    if (rowText.some((c) => c.includes('chq') || c.includes('cheque') || c.includes('ref') || c.includes('utr') || c.includes('rrn'))) {
      score += 2;
    }

    // Negative penalty if line looks like customer address / metadata header
    if (rowText.some((c) => c.includes('customer name') || c.includes('address') || c.includes('ifsc') || c.includes('statement for the period') || c.includes('nomination'))) {
      score -= 8;
    }

    if (score > maxScore && score >= 6) {
      maxScore = score;
      bestRowIdx = r;
    }
  }

  return bestRowIdx;
}

// Guess column indexes from CSV headers
export function guessColumnMappings(headers: string[]): ColumnMapping {
  const lower = headers.map((h) => (h || '').toLowerCase().trim());

  let dateCol = lower.findIndex((h) => h.includes('date') || h.includes('txn dt') || h.includes('tran date') || h.includes('time') || h.includes('value dt'));
  let descCol = lower.findIndex((h) => h.includes('particular') || h.includes('narration') || h.includes('desc') || h.includes('remark') || h.includes('party') || h.includes('details'));
  let debitCol = lower.findIndex((h) => h.includes('debit') || h.includes('withdrawal') || h.includes('dr amt') || h.includes('dr.') || (h.includes('dr') && h.length <= 4));
  let creditCol = lower.findIndex((h) => h.includes('credit') || h.includes('deposit') || h.includes('cr amt') || h.includes('cr.') || (h.includes('cr') && h.length <= 4));
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

    // Filter out statement summary/footer rows (e.g. "Total", "Closing Balance", etc.)
    const firstCell = (row[0] || '').toLowerCase().trim();
    const secondCell = (row[1] || '').toLowerCase().trim();
    if (
      firstCell.includes('total') ||
      firstCell.includes('closing bal') ||
      firstCell.includes('end of statement') ||
      secondCell.includes('total') ||
      secondCell.includes('closing bal')
    ) {
      return;
    }

    const rawDate = row[mapping.dateCol] || '';
    const date = normalizeDateString(rawDate);
    const description = (row[mapping.descCol] || 'Transaction').trim();

    let amount = 0;
    let type: StagedEntryType = 'expense';
    let rawFlow: 'inflow' | 'outflow' = 'outflow';

    if (mapping.debitCol !== undefined && mapping.creditCol !== undefined) {
      const debitVal = parseCleanAmount(row[mapping.debitCol] || '');
      const creditVal = parseCleanAmount(row[mapping.creditCol] || '');

      if (debitVal > 0) {
        amount = debitVal;
        type = 'expense';
        rawFlow = 'outflow';
      } else if (creditVal > 0) {
        amount = creditVal;
        type = 'income';
        rawFlow = 'inflow';
      }
    } else if (mapping.amountCol !== undefined) {
      const rawAmt = row[mapping.amountCol] || '';
      amount = parseCleanAmount(rawAmt);
      const isDebit = rawAmt.includes('-') || (mapping.typeCol && (row[mapping.typeCol] || '').toLowerCase().includes('dr'));
      if (isDebit) {
        type = 'expense';
        rawFlow = 'outflow';
      } else {
        type = 'income';
        rawFlow = 'inflow';
      }
    }

    if (amount <= 0) return;

    // Check duplicate using date, amount, and text fingerprint
    const isDuplicate = existingTransactions.some((t) => {
      const sameDate = t.date === date;
      const sameAmount = Math.abs(t.amount - amount) < 0.01;
      if (!sameDate || !sameAmount) return false;

      const tNote = (t.note || '').toLowerCase();
      const descLower = description.toLowerCase();
      const textMatch =
        tNote.includes(descLower.substring(0, 10)) ||
        descLower.includes(tNote.substring(0, 10)) ||
        (t.referenceNumber && descLower.includes(t.referenceNumber.toLowerCase()));

      return textMatch;
    });

    staged.push({
      id: `staged_${Date.now()}_${idx}`,
      date,
      description,
      amount,
      type,
      rawFlow,
      currency,
      categoryGuess: mapping.categoryCol ? row[mapping.categoryCol] : undefined,
      isDuplicate,
      selected: !isDuplicate, // Uncheck duplicates by default
    });
  });

  return staged;
}

// Generate a deterministic transaction signature for duplicate detection
export function generateTxFingerprint(
  date: string,
  amount: number,
  type: string,
  description: string,
  accountId?: string
): string {
  const cleanDesc = description.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24);
  return `${date}_${amount.toFixed(2)}_${type}_${cleanDesc}_${accountId || ''}`;
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
  bankName?: string;
  confidence: 'high' | 'medium' | 'low';
}

export function parseIndianUpiSMS(smsText: string): ParsedSMSResult[] {
  const results: ParsedSMSResult[] = [];
  const entries = smsText.split(/\n\s*\n|\n(?=[A-Z0-9]{2,}-|[A-Za-z0-9]+\s+debited|Rs\.|INR|Dear Customer|Dear SBI|Sent Rs)/g);

  // Robust Indian Bank SMS Regexes
  const debitPatterns = [
    // Matches "acct XXX606 has been debited for Rs.1500.00" or "debited for Rs 1500"
    /(?:has been\s+)?debited\s*(?:by|with|for)?\s*(?:INR|Rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    // Matches "Rs. 450.00 debited" or "INR 500 debited"
    /(?:INR|Rs\.?|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:has been\s*)?(?:debited|spent|paid|transferred|withdrawn)/i,
    // Matches "Sent Rs. 1500" or "Paid Rs 500" or "Transferred Rs 1000"
    /(?:paid|transferred|sent|spent)\s*(?:INR|Rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
  ];

  const creditPatterns = [
    // Matches "credited by Rs 2500" or "credited for Rs 2500" or "credited with Rs 2500"
    /(?:has been\s+)?credited\s*(?:by|with|for)?\s*(?:INR|Rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    // Matches "Rs. 5000 credited" or "INR 5000 credited"
    /(?:INR|Rs\.?|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:has been\s*)?(?:credited|received|deposited)/i,
    // Matches "Received Rs. 1000" or "Deposited Rs 5000"
    /(?:received|deposited)\s*(?:INR|Rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
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

    // Extract Date: e.g. 31-Aug-26, 31/08/2026, 02-09-24, 02Sep24
    const dateMatch = text.match(
      /\b(\d{1,2}[\s\-/](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\-/]\d{2,4}|\d{1,2}[\s\-/]\d{1,2}[\s\-/]\d{2,4})\b/i
    );
    const date = dateMatch ? normalizeDateString(dateMatch[1]) : new Date().toISOString().split('T')[0];

    // Extract Merchant / Beneficiary
    let merchant = 'UPI Payment';
    const toMatch = text.match(
      /(?:towards(?:\s*linked)?|paid to|transfer to|to|at|vpa|info|beneficiary|in favour of|favour of)\s+([A-Za-z0-9\s._@\-]+?)(?=\s*(?:\.|\b(?:on|ref|upi|bal|avl|txn|available|balance|the\s+[A-Za-z]+(?:\s+co-op)?\s+bank)|$))/i
    );
    if (toMatch && toMatch[1]) {
      merchant = toMatch[1].trim().replace(/^(the|a|linked)\s+/i, '');
    } else if (type === 'income') {
      const fromMatch = text.match(
        /(?:by\s+a\/c\s+linked\s+to\s+(?:vpa\s+)?|from\s+|by\s+)([A-Za-z0-9._@\-]+?)(?=\s*(?:\.|\b(?:on|ref|upi|bal|avl|txn)|$))/i
      );
      if (fromMatch && fromMatch[1]) {
        merchant = fromMatch[1].trim();
      } else {
        merchant = 'UPI Credit Inflow';
      }
    }

    // Extract Ref / UTR / RRN Number
    const refMatch = text.match(/(?:upi\s*ref(?:\s*no\.?)?|ref(?:\s*no\.?)?|rrn|txn(?:\s*id)?|reference)\s*[:#]?\s*([0-9A-Za-z]+)/i);
    const refNumber = refMatch ? refMatch[1] : undefined;

    // Extract Account Ending (e.g. acct XXX606, a/c 1234, ac **5678)
    const accMatch = text.match(/(?:a\/c|ac|acct|account)\s*(?:no\.?)?\s*[*xX]*([0-9]{3,4})/i);
    const accountEnding = accMatch ? accMatch[1] : undefined;

    // Extract Bank Name (e.g. THE NAVNIRMAN CO-OP BANK, SBI, HDFC, KOTAK, etc.)
    const bankMatch = text.match(/(?:the\s+)?([A-Za-z]+(?:\s+co-op)?\s+bank|sbi|hdfc|icici|axis|kotak|pnb|bob|canara|union|idfc|yes bank)/i);
    const bankName = bankMatch ? bankMatch[0].trim() : undefined;

    results.push({
      rawText: text,
      date,
      amount,
      type,
      merchant: merchant.substring(0, 40),
      refNumber,
      accountEnding,
      bankName,
      confidence: refNumber || accountEnding ? 'high' : 'medium',
    });
  });

  return results;
}
