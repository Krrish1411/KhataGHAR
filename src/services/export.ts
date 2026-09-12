// Comprehensive Institutional Export Engine for Khata Ghar
// Provides Filter-Aware CSV, Multi-Sheet Native Excel (.xlsx), and Publication-Grade PDF Dossiers

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import type {
  Transaction,
  Account,
  Category,
  PeopleLedgerEntry,
  Asset,
  Liability,
  PlannedExpense,
  VaultMeta,
} from '../types';
import { formatRawNumber, CURRENCY_SYMBOLS } from '../utils/formatters';
import { formatReadableDate } from '../utils/dates';
import { downloadFile } from './backup';

export function getPdfCurrencySymbol(currency: string): string {
  if (currency === 'INR') return 'Rs. ';
  const sym = CURRENCY_SYMBOLS[currency] || `${currency} `;
  // Non-ASCII glyphs like ₹ are not supported in jsPDF standard fonts and turn into random digits
  if (/[^\x00-\x7F]/.test(sym)) {
    return `${currency} `;
  }
  return sym;
}

export interface ReportExportData {
  vault: VaultMeta;
  periodLabel: string;
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  peopleLedger: PeopleLedgerEntry[];
  assets: Asset[];
  liabilities: Liability[];
  summary: {
    totalIncome: number;
    totalExpense: number;
    netSavings: number;
    savingsRate: number;
    netWorth: number;
  };
}

export interface ComprehensivePdfOptions {
  includeSummary: boolean;
  includeBalanceSheet: boolean;
  includeCategories: boolean;
  includeRatios: boolean;
  includeLedger: boolean;
  includePlanned: boolean;
}

export interface ComprehensiveReportData extends ReportExportData {
  accounts: Account[];
  assets: Asset[];
  liabilities: Liability[];
  plannedExpenses?: PlannedExpense[];
  peopleLedger: PeopleLedgerEntry[];
  ratios?: Array<{ name: string; value: string; status: string; benchmark: string }>;
  options: ComprehensivePdfOptions;
}

// Helper to trigger binary file downloads (e.g. for Excel)
export function downloadBinary(buffer: ArrayBuffer | Uint8Array, filename: string, mimeType: string) {
  const blob = new Blob([buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// 1. FILTER-AWARE CSV EXPORT
// ---------------------------------------------------------------------------

export interface GenericExportItem {
  date: string;
  type: string;
  amount: number;
  currency?: string;
  accountId?: string;
  toAccountId?: string;
  categoryId?: string;
  contactName?: string;
  note?: string;
  tags?: string[];
  isRecurring?: boolean;
  flow?: 'inflow' | 'outflow' | 'transfer';
  rawTransaction?: Transaction;
}

export function exportUnifiedTransactionsToCSV(
  entries: GenericExportItem[] | Transaction[],
  categories: Category[],
  accounts: Account[],
  vault: VaultMeta,
  filenameSuffix: string = 'Filtered'
) {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const accMap = new Map(accounts.map((a) => [a.id, a.name]));

  const headers = [
    'Date',
    'Flow',
    'Type',
    'Category',
    'Account',
    'Amount',
    'Currency',
    'Description / Note',
    'Party / Contact',
    'Tags',
    'Split Breakdown',
  ];

  const escapeCSV = (val: string | number | undefined | null) => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = entries.map((item) => {
    const rawTx: Transaction | undefined = (item as any).rawTransaction || ((item as any).splits ? (item as Transaction) : undefined);
    const date = item.date;
    const type = (item.type || 'entry').toUpperCase();
    const flow = (item as any).flow
      ? String((item as any).flow).toUpperCase()
      : item.type === 'income'
      ? 'INFLOW'
      : item.type === 'expense'
      ? 'OUTFLOW'
      : 'TRANSFER';

    const catName = item.categoryId ? catMap.get(item.categoryId) || 'Uncategorized' : '-';
    const accName = item.accountId ? accMap.get(item.accountId) || 'Account' : '-';
    const amount = Number(item.amount || 0).toFixed(2);
    const currency = item.currency || vault.currency;
    const note = item.note || (item as any).title || '';
    const contact = (item as any).contactName || '';
    const tags = Array.isArray(item.tags) ? item.tags.join(';') : '';

    let splitBreakdown = '';
    if (rawTx?.splits && rawTx.splits.length > 0) {
      splitBreakdown = rawTx.splits
        .map((s) => `${catMap.get(s.categoryId || '') || 'Uncategorized'}: ${s.amount} (${s.note || 'No note'})`)
        .join(' | ');
    }

    return [
      escapeCSV(date),
      escapeCSV(flow),
      escapeCSV(type),
      escapeCSV(catName),
      escapeCSV(accName),
      amount,
      escapeCSV(currency),
      escapeCSV(note),
      escapeCSV(contact),
      escapeCSV(tags),
      escapeCSV(splitBreakdown),
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `KhataGhar_${vault.name.replace(/\s+/g, '_')}_${filenameSuffix}_${dateStr}.csv`;
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

// Backward-compatible alias
export function exportTransactionsToCSV(
  transactions: Transaction[],
  categories: Category[],
  accounts: Account[],
  vault: VaultMeta
) {
  exportUnifiedTransactionsToCSV(transactions, categories, accounts, vault, 'Transactions');
}

// ---------------------------------------------------------------------------
// 2. FILTER-AWARE NATIVE EXCEL (.XLSX) EXPORT (SheetJS)
// ---------------------------------------------------------------------------

export function exportTransactionsToExcel(
  entries: GenericExportItem[] | Transaction[],
  categories: Category[],
  accounts: Account[],
  vault: VaultMeta,
  filenameSuffix: string = 'Filtered'
) {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const accMap = new Map(accounts.map((a) => [a.id, a.name]));

  // Sheet 1: Main Ledger Table
  const ledgerRows = entries.map((item) => {
    const rawTx: Transaction | undefined = (item as any).rawTransaction || ((item as any).splits ? (item as Transaction) : undefined);
    const flow = (item as any).flow
      ? String((item as any).flow).toUpperCase()
      : item.type === 'income'
      ? 'INFLOW'
      : item.type === 'expense'
      ? 'OUTFLOW'
      : 'TRANSFER';

    let splitsSummary = '';
    if (rawTx?.splits && rawTx.splits.length > 0) {
      splitsSummary = rawTx.splits
        .map((s) => `${catMap.get(s.categoryId || '') || 'Other'}: ${s.amount}`)
        .join('; ');
    }

    return {
      Date: item.date,
      Flow: flow,
      Type: (item.type || '').toUpperCase(),
      Category: item.categoryId ? catMap.get(item.categoryId) || 'Uncategorized' : 'Transfer/General',
      Account: item.accountId ? accMap.get(item.accountId) || 'General' : '-',
      Amount: Number(item.amount || 0),
      Currency: item.currency || vault.currency,
      'Description / Note': item.note || (item as any).title || '',
      'Entity / Contact': (item as any).contactName || '',
      Tags: Array.isArray(item.tags) ? item.tags.join(', ') : '',
      'Split Details': splitsSummary,
    };
  });

  const wb = XLSX.utils.book_new();

  const wsLedger = XLSX.utils.json_to_sheet(ledgerRows);
  // Column Widths
  wsLedger['!cols'] = [
    { wch: 12 }, // Date
    { wch: 10 }, // Flow
    { wch: 14 }, // Type
    { wch: 22 }, // Category
    { wch: 22 }, // Account
    { wch: 14 }, // Amount
    { wch: 8 },  // Currency
    { wch: 34 }, // Note
    { wch: 20 }, // Contact
    { wch: 16 }, // Tags
    { wch: 30 }, // Splits
  ];
  XLSX.utils.book_append_sheet(wb, wsLedger, 'Ledger Transactions');

  // Sheet 2: Itemized Splits (if any split transactions present)
  const splitRows: Array<{
    'Parent Date': string;
    'Parent Description': string;
    'Parent Account': string;
    'Split Category': string;
    'Split Note': string;
    'Split Amount': number;
    '% of Parent': string;
  }> = [];

  entries.forEach((item) => {
    const rawTx: Transaction | undefined = (item as any).rawTransaction || ((item as any).splits ? (item as Transaction) : undefined);
    if (rawTx?.splits && rawTx.splits.length > 0) {
      const parentAmt = rawTx.amount || 1;
      rawTx.splits.forEach((s) => {
        splitRows.push({
          'Parent Date': rawTx.date,
          'Parent Description': rawTx.note || 'Split Transaction',
          'Parent Account': accMap.get(rawTx.accountId) || 'Account',
          'Split Category': catMap.get(s.categoryId || '') || 'Uncategorized',
          'Split Note': s.note || '',
          'Split Amount': s.amount,
          '% of Parent': `${((s.amount / parentAmt) * 100).toFixed(1)}%`,
        });
      });
    }
  });

  if (splitRows.length > 0) {
    const wsSplits = XLSX.utils.json_to_sheet(splitRows);
    wsSplits['!cols'] = [
      { wch: 12 },
      { wch: 26 },
      { wch: 20 },
      { wch: 22 },
      { wch: 26 },
      { wch: 14 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, wsSplits, 'Itemized Splits');
  }

  // Sheet 3: Dossier Metadata & Financial Summary
  let totalInflows = 0;
  let totalOutflows = 0;
  entries.forEach((e) => {
    const flow = (e as any).flow || (e.type === 'income' ? 'inflow' : e.type === 'expense' ? 'outflow' : 'transfer');
    if (flow === 'inflow') totalInflows += e.amount || 0;
    if (flow === 'outflow') totalOutflows += e.amount || 0;
  });

  const summarySheetData = [
    { Metric: 'Vault Entity', Value: vault.name },
    { Metric: 'Primary Currency', Value: vault.currency },
    { Metric: 'Number Format', Value: vault.numberFormat },
    { Metric: 'Export Timestamp', Value: new Date().toISOString() },
    { Metric: 'Filtered Entries Count', Value: entries.length },
    { Metric: 'Total Filtered Inflows', Value: totalInflows },
    { Metric: 'Total Filtered Outflows', Value: totalOutflows },
    { Metric: 'Net Difference (Cash Flow)', Value: totalInflows - totalOutflows },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summarySheetData);
  wsSummary['!cols'] = [{ wch: 28 }, { wch: 32 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Audit Summary');

  // Generate buffer and trigger download
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `KhataGhar_${vault.name.replace(/\s+/g, '_')}_${filenameSuffix}_${dateStr}.xlsx`;
  downloadBinary(
    wbout,
    filename,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
}

// ---------------------------------------------------------------------------
// 3. INSTITUTIONAL CFA / CA-GRADE FINANCIAL DOSSIER & BALANCE SHEET ENGINE (PDF)
// ---------------------------------------------------------------------------

// Institutional Color Palette:
// Pine Ink (Primary Header): [16, 32, 24]
// Pine Green (Surplus, Assets, Positive): [18, 133, 90]
// Wine / Rose (Deficits, Liabilities, Outflows): [159, 18, 57] (Muted, NO neon red)
// Antique Bronze / Ochre (Caution, Warnings): [146, 64, 14] (Warm, NO electric yellow)
// Slate / Ink (Text Primary): [15, 23, 42]
// Muted Slate (Text Secondary): [71, 85, 105]
// Card Background: [248, 250, 252]
// Line / Border: [226, 232, 240]

function drawInstitutionalHeader(
  doc: jsPDF,
  vault: VaultMeta,
  periodLabel: string,
  docTitle: string = 'FINANCIAL POSITION & PERFORMANCE REPORT'
) {
  // Top Banner
  doc.setFillColor(16, 32, 24);
  doc.rect(0, 0, 210, 36, 'F');

  // Gold / Bronze Hairline Rule
  doc.setFillColor(180, 120, 30);
  doc.rect(0, 36, 210, 1.2, 'F');

  // Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(19);
  doc.setFont('helvetica', 'bold');
  doc.text('KHATA GHAR', 14, 16);

  // Subtitle
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(190, 210, 200);
  doc.text('INSTITUTIONAL CLIENT-SIDE AUDITED WEALTH DOSSIER', 14, 23);

  // Title Box
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(docTitle, 14, 31);

  // Right Metadata
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(220, 230, 225);
  doc.text(`Entity: ${vault.name}`, 140, 15);
  doc.text(`Period: ${periodLabel}`, 140, 21);
  doc.text(`Base Currency: ${vault.currency}`, 140, 27);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 140, 33);
}

function drawRunningFooter(doc: jsPDF, vault: VaultMeta) {
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Running Header on pages > 1
    if (i > 1) {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text(`KhataGHAR Institutional Financial Statement — ${vault.name}`, 14, 10);
      doc.setFont('helvetica', 'normal');
      doc.text(`CONFIDENTIAL & CLIENT-SIDE ENCRYPTED`, 142, 10);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(14, 12, 196, 12);
    }

    // Running Bottom Footer
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(14, 283, 196, 283);

    doc.text(
      `KhataGHAR Financial Statement • Offline-First Cryptographic Ledger • Strictly Private & Confidential`,
      14,
      288
    );
    doc.text(`Page ${i} of ${pageCount}`, 178, 288);
  }
}

// Export 1: Standard Financial Report PDF (P&L, Top Categories, Key Transactions)
export function exportFinancialReportPDF(data: ReportExportData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const { vault, periodLabel, transactions, categories, summary, accounts, liabilities } = data;
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const currencySymbol = getPdfCurrencySymbol(vault.currency);

  drawInstitutionalHeader(doc, vault, periodLabel, 'STATEMENT OF FINANCIAL PERFORMANCE & CASH FLOW');

  // Executive Summary Cards
  const startY = 44;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, startY, 182, 28, 2.5, 2.5, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('TOTAL GROSS INFLOWS', 20, startY + 8);
  doc.text('TOTAL OPERATING OUTFLOWS', 65, startY + 8);
  doc.text('NET SAVINGS SURPLUS', 115, startY + 8);
  doc.text('NET SAVINGS RATE', 160, startY + 8);

  // Inflows
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(18, 133, 90);
  doc.text(`${currencySymbol}${formatRawNumber(summary.totalIncome, vault.numberFormat)}`, 20, startY + 19);

  // Outflows
  doc.setTextColor(159, 18, 57);
  doc.text(`${currencySymbol}${formatRawNumber(summary.totalExpense, vault.numberFormat)}`, 65, startY + 19);

  // Net Savings
  const netColor = summary.netSavings >= 0 ? [18, 133, 90] : [159, 18, 57];
  doc.setTextColor(netColor[0], netColor[1], netColor[2]);
  doc.text(`${currencySymbol}${formatRawNumber(summary.netSavings, vault.numberFormat)}`, 115, startY + 19);

  // Rate
  doc.setTextColor(15, 23, 42);
  doc.text(`${summary.savingsRate.toFixed(1)}%`, 160, startY + 19);

  // Category Outflows Table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 32, 24);
  doc.text('Schedule 1: Categorical Expenditure Distribution', 14, startY + 37);

  const categorySpendMap = new Map<string, number>();
  transactions.forEach((t) => {
    if (t.type === 'expense') {
      if (t.splits && t.splits.length > 0) {
        t.splits.forEach((s) => {
          const catName = catMap.get(s.categoryId || '') || 'Other';
          categorySpendMap.set(catName, (categorySpendMap.get(catName) || 0) + s.amount);
        });
      } else if (t.categoryId) {
        const catName = catMap.get(t.categoryId) || 'Other';
        categorySpendMap.set(catName, (categorySpendMap.get(catName) || 0) + t.amount);
      }
    }
  });

  const sortedCategories = Array.from(categorySpendMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const catTableRows = sortedCategories.map(([cat, amt]) => [
    cat,
    `${currencySymbol}${formatRawNumber(amt, vault.numberFormat)}`,
    summary.totalExpense > 0 ? `${((amt / summary.totalExpense) * 100).toFixed(1)}%` : '0%',
  ]);

  autoTable(doc, {
    startY: startY + 41,
    head: [['Expenditure Category', 'Total Incurred', 'Share of Total Spend']],
    body: catTableRows.length > 0 ? catTableRows : [['No expenses recorded for this reporting period', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [16, 32, 24], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5, textColor: [15, 23, 42] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { cellPadding: 2.2 },
    margin: { left: 14, right: 14 },
  });

  const finalY1 = (doc as any).lastAutoTable?.finalY || 130;

  // Key Transactions Table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 32, 24);
  doc.text('Schedule 2: Primary Transaction Audit Ledger', 14, finalY1 + 10);

  const txRows = transactions.slice(0, 16).map((t) => {
    let catText = t.categoryId ? catMap.get(t.categoryId) || 'Uncategorized' : 'Transfer';
    if (t.splits && t.splits.length > 0) catText += ` (Split ${t.splits.length})`;
    return [
      formatReadableDate(t.date),
      t.type.toUpperCase(),
      catText,
      (t.note || '-').substring(0, 32),
      `${t.type === 'expense' ? '-' : '+'}${currencySymbol}${formatRawNumber(t.amount, vault.numberFormat)}`,
    ];
  });

  autoTable(doc, {
    startY: finalY1 + 14,
    head: [['Date', 'Type', 'Category / Classification', 'Description / Reference', 'Amount']],
    body: txRows.length > 0 ? txRows : [['No transactions in period', '-', '-', '-', '-']],
    theme: 'striped',
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8, textColor: [15, 23, 42] },
    styles: { cellPadding: 2 },
    margin: { left: 14, right: 14 },
  });

  drawRunningFooter(doc, vault);
  doc.save(`KhataGhar_Statement_${vault.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}

// Export 2: Look-Alike Institutional Dossier & Balance Sheet PDF
export function exportComprehensiveDossierPDF(data: ComprehensiveReportData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const {
    vault,
    periodLabel,
    transactions,
    categories,
    summary,
    accounts = [],
    assets = [],
    liabilities = [],
    plannedExpenses = [],
    peopleLedger = [],
    ratios = [],
    options,
  } = data;

  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const accMap = new Map(accounts.map((a) => [a.id, a.name]));
  const currencySymbol = getPdfCurrencySymbol(vault.currency);

  let currentY = 16;

  const ensureSpace = (neededHeight: number) => {
    if (currentY + neededHeight > 270) {
      doc.addPage();
      currentY = 22;
    }
  };

  // 1. Cover Masthead Banner
  drawInstitutionalHeader(doc, vault, periodLabel, 'AUDITED FINANCIAL STATEMENT & BALANCE SHEET');
  currentY = 44;

  // 2. Executive Performance Summary
  if (options.includeSummary) {
    ensureSpace(38);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, currentY, 182, 30, 2.5, 2.5, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('TOTAL REVENUE / INFLOW', 20, currentY + 8);
    doc.text('OPERATING EXPENDITURE', 62, currentY + 8);
    doc.text('NET OPERATING SURPLUS', 110, currentY + 8);
    doc.text('NET SAVINGS RATE', 158, currentY + 8);

    doc.setFontSize(11.5);
    doc.setFont('helvetica', 'bold');

    doc.setTextColor(18, 133, 90);
    doc.text(`${currencySymbol}${formatRawNumber(summary.totalIncome, vault.numberFormat)}`, 20, currentY + 19);

    doc.setTextColor(159, 18, 57);
    doc.text(`${currencySymbol}${formatRawNumber(summary.totalExpense, vault.numberFormat)}`, 62, currentY + 19);

    const netColor = summary.netSavings >= 0 ? [18, 133, 90] : [159, 18, 57];
    doc.setTextColor(netColor[0], netColor[1], netColor[2]);
    doc.text(`${currencySymbol}${formatRawNumber(summary.netSavings, vault.numberFormat)}`, 110, currentY + 19);

    doc.setTextColor(15, 23, 42);
    doc.text(`${summary.savingsRate.toFixed(1)}%`, 158, currentY + 19);

    currentY += 38;
  }

  // 3. Complete Institutional Balance Sheet (Statement of Financial Position)
  if (options.includeBalanceSheet) {
    ensureSpace(40);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 32, 24);
    doc.text('Statement of Financial Position (Balance Sheet)', 14, currentY);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('As of current reporting period • Double-entry reconciled assets, debts & net worth', 14, currentY + 4.5);
    currentY += 8;

    // Build Structured Balance Sheet Schedules
    // Assets: Liquid Accounts + Physical Assets + Receivables (People Lent)
    let totalLiquidAssets = 0;
    const assetRows: any[][] = [];

    accounts.forEach((a) => {
      totalLiquidAssets += a.balance;
      assetRows.push([
        'Liquid Asset',
        a.name,
        `Account: ${a.type.toUpperCase()}`,
        `${currencySymbol}${formatRawNumber(a.balance, vault.numberFormat)}`,
      ]);
    });

    let totalPhysicalAssets = 0;
    assets.forEach((ast) => {
      totalPhysicalAssets += ast.currentValue;
      assetRows.push([
        'Capital Asset',
        ast.name,
        ast.type.replace('_', ' ').toUpperCase(),
        `${currencySymbol}${formatRawNumber(ast.currentValue, vault.numberFormat)}`,
      ]);
    });

    // Custodial Receivables (Lent to People)
    let totalReceivables = 0;
    peopleLedger
      .filter((p) => p.type === 'lent')
      .forEach((p) => {
        const settled = (p.settlements || []).reduce((sum, s) => sum + s.amount, 0);
        const rem = Math.max(0, p.amount - settled);
        if (rem > 0) {
          totalReceivables += rem;
          assetRows.push([
            'Receivable',
            `Lent to ${p.contactName}`,
            'Short-Term Receivable',
            `${currencySymbol}${formatRawNumber(rem, vault.numberFormat)}`,
          ]);
        }
      });

    const calculatedTotalAssets = totalLiquidAssets + totalPhysicalAssets + totalReceivables;

    // Liabilities: Loans + Debts + Payables (People Borrowed / Custodial Escrow)
    let totalDebtLiabilities = 0;
    const liabilityRows: any[][] = [];

    liabilities.forEach((l) => {
      totalDebtLiabilities += l.outstandingBalance;
      liabilityRows.push([
        'Institutional Debt',
        l.name,
        l.interestRate ? `${l.interestRate}% p.a.` : 'Fixed Debt',
        `${currencySymbol}${formatRawNumber(l.outstandingBalance, vault.numberFormat)}`,
      ]);
    });

    let totalPayables = 0;
    peopleLedger
      .filter((p) => p.type === 'borrowed' || p.type === 'holding')
      .forEach((p) => {
        const settled = (p.settlements || []).reduce((sum, s) => sum + s.amount, 0);
        const rem = Math.max(0, p.amount - settled);
        if (rem > 0) {
          totalPayables += rem;
          liabilityRows.push([
            p.type === 'holding' ? 'Escrow / Trust' : 'Payable',
            `${p.type === 'holding' ? 'Holding for' : 'Borrowed from'} ${p.contactName}`,
            'Short-Term Commitment',
            `${currencySymbol}${formatRawNumber(rem, vault.numberFormat)}`,
          ]);
        }
      });

    const calculatedTotalLiabilities = totalDebtLiabilities + totalPayables;
    const calculatedNetWorth = calculatedTotalAssets - calculatedTotalLiabilities;

    // Merged Balance Sheet Table
    const balanceSheetBody: any[][] = [
      ...assetRows,
      [
        { content: 'TOTAL ASSETS', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [240, 247, 243] } },
        {
          content: `${currencySymbol}${formatRawNumber(calculatedTotalAssets, vault.numberFormat)}`,
          styles: { fontStyle: 'bold', textColor: [18, 133, 90], fillColor: [240, 247, 243] },
        },
      ],
      ...liabilityRows,
      [
        { content: 'TOTAL LIABILITIES', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [251, 243, 245] } },
        {
          content: `${currencySymbol}${formatRawNumber(calculatedTotalLiabilities, vault.numberFormat)}`,
          styles: { fontStyle: 'bold', textColor: [159, 18, 57], fillColor: [251, 243, 245] },
        },
      ],
      [
        {
          content: 'NET EQUITY / NET WORTH (Assets − Liabilities)',
          colSpan: 3,
          styles: { fontStyle: 'bold', fillColor: [240, 244, 248] },
        },
        {
          content: `${currencySymbol}${formatRawNumber(calculatedNetWorth, vault.numberFormat)}`,
          styles: { fontStyle: 'bold', textColor: [16, 32, 24], fillColor: [240, 244, 248] },
        },
      ],
    ];

    autoTable(doc, {
      startY: currentY,
      head: [['Classification', 'Entity / Commitment / Asset', 'Class / Terms', 'Carrying Value']],
      body: balanceSheetBody,
      theme: 'grid',
      headStyles: { fillColor: [16, 32, 24], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      bodyStyles: { fontSize: 8, textColor: [15, 23, 42] },
      styles: { cellPadding: 2 },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable?.finalY + 12 || currentY + 30;
  }

  // 4. Categorical Spending & Budget Breakdown
  if (options.includeCategories) {
    ensureSpace(35);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 32, 24);
    doc.text('Expense Categorical Distribution', 14, currentY);
    currentY += 5;

    const categorySpendMap = new Map<string, number>();
    transactions.forEach((t) => {
      if (t.type === 'expense') {
        if (t.splits && t.splits.length > 0) {
          t.splits.forEach((s) => {
            const catName = catMap.get(s.categoryId || '') || 'Other';
            categorySpendMap.set(catName, (categorySpendMap.get(catName) || 0) + s.amount);
          });
        } else if (t.categoryId) {
          const catName = catMap.get(t.categoryId) || 'Other';
          categorySpendMap.set(catName, (categorySpendMap.get(catName) || 0) + t.amount);
        }
      }
    });

    const sortedCats = Array.from(categorySpendMap.entries()).sort((a, b) => b[1] - a[1]);
    const catRows = sortedCats.map(([cat, amt]) => [
      cat,
      `${currencySymbol}${formatRawNumber(amt, vault.numberFormat)}`,
      summary.totalExpense > 0 ? `${((amt / summary.totalExpense) * 100).toFixed(1)}%` : '0%',
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Expense Classification', 'Total Outflow Incurred', 'Share of Total Expenditure']],
      body: catRows.length > 0 ? catRows : [['No expense entries found in current period', '-', '-']],
      theme: 'striped',
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      bodyStyles: { fontSize: 8, textColor: [15, 23, 42] },
      styles: { cellPadding: 2 },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable?.finalY + 12 || currentY + 30;
  }

  // 5. 16-Ratio Institutional Financial Health Scorecard
  if (options.includeRatios && ratios.length > 0) {
    ensureSpace(35);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 32, 24);
    doc.text('Institutional Financial Health Diagnostics (CFA Framework)', 14, currentY);
    currentY += 5;

    const ratioRows = ratios.map((r) => [r.name, r.value, r.status, r.benchmark]);

    autoTable(doc, {
      startY: currentY,
      head: [['Financial Diagnostic Metric', 'Observed Reading', 'Audit Status', 'Target Benchmark']],
      body: ratioRows,
      theme: 'grid',
      headStyles: { fillColor: [16, 32, 24], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      bodyStyles: { fontSize: 8, textColor: [15, 23, 42] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { cellPadding: 2 },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable?.finalY + 12 || currentY + 30;
  }

  // 6. Upcoming Obligations & Planned Commitments
  if (options.includePlanned && plannedExpenses.length > 0) {
    ensureSpace(35);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 32, 24);
    doc.text('Upcoming Bills, Mandates & Scheduled Commitments', 14, currentY);
    currentY += 5;

    const planRows = plannedExpenses.map((p) => [
      formatReadableDate(p.dueDate),
      p.name,
      catMap.get(p.categoryId || '') || 'General',
      `${currencySymbol}${formatRawNumber(p.amount, vault.numberFormat)}`,
      p.status.toUpperCase(),
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Maturity Date', 'Commitment Description', 'Category', 'Obligation Amount', 'Status']],
      body: planRows,
      theme: 'striped',
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      bodyStyles: { fontSize: 8, textColor: [15, 23, 42] },
      styles: { cellPadding: 2 },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable?.finalY + 12 || currentY + 30;
  }

  // 7. Full Entries Ledger Audit Trail
  if (options.includeLedger && transactions.length > 0) {
    ensureSpace(35);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 32, 24);
    doc.text('Primary Ledger Entries & Audit Trail', 14, currentY);
    currentY += 5;

    const txRows = transactions.slice(0, 60).map((t) => {
      let desc = t.note || '-';
      if (t.splits && t.splits.length > 0) {
        desc += ` [Split: ${t.splits.map((s) => `${catMap.get(s.categoryId || '') || 'Other'} (${s.amount})`).join(', ')}]`;
      }
      return [
        formatReadableDate(t.date),
        t.type.toUpperCase(),
        t.categoryId ? catMap.get(t.categoryId) || 'General' : 'Transfer',
        accMap.get(t.accountId) || 'Account',
        desc.substring(0, 36),
        `${t.type === 'expense' ? '-' : '+'}${currencySymbol}${formatRawNumber(t.amount, vault.numberFormat)}`,
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Date', 'Type', 'Category', 'Account', 'Description / Note', 'Amount']],
      body: txRows,
      theme: 'striped',
      headStyles: { fillColor: [16, 32, 24], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 7.5, textColor: [15, 23, 42] },
      styles: { cellPadding: 1.8 },
      margin: { left: 14, right: 14 },
    });
  }

  drawRunningFooter(doc, vault);
  doc.save(`KhataGhar_Dossier_${vault.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ---------------------------------------------------------------------------
// 4. LOOK-ALIKE SCREEN-CAPTURED PDF EXPORT ENGINE (html2canvas + jsPDF)
// ---------------------------------------------------------------------------

export interface ScreenCapturePdfOptions {
  elementId: string;
  filename?: string;
  theme?: 'white-paper' | 'screen';
}

export async function exportDOMToPDF(options: ScreenCapturePdfOptions): Promise<void> {
  const { elementId, filename = 'KhataGHAR_Visual_Report.pdf', theme = 'white-paper' } = options;
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found for visual report capture.`);
  }

  // Generate high-resolution canvas at 2x retina scale preserving exact CSS layouts and charts
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: theme === 'white-paper' ? '#ffffff' : '#0e1615',
    onclone: (clonedDoc) => {
      if (theme === 'white-paper') {
        const target = clonedDoc.getElementById(elementId);
        if (target) {
          clonedDoc.documentElement.classList.remove('dark');
          target.classList.remove('dark');
          target.style.backgroundColor = '#ffffff';
          target.style.color = '#0f172a';
          const allEls = target.querySelectorAll('*');
          allEls.forEach((el) => {
            const htmlEl = el as HTMLElement;
            const computed = getComputedStyle(htmlEl);
            if (
              computed.backgroundColor.includes('rgb(14, 22, 21)') ||
              computed.backgroundColor.includes('rgb(15, 23, 42)') ||
              computed.backgroundColor.includes('rgb(2, 6, 23)') ||
              computed.backgroundColor.includes('rgb(24, 34, 30)')
            ) {
              htmlEl.style.backgroundColor = '#f8fafc';
            }
          });
        }
      }
    },
  });

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2; // 190mm
  const contentHeight = pageHeight - margin * 2; // 277mm

  const totalPdfHeight = (canvas.height * contentWidth) / canvas.width;

  if (totalPdfHeight <= contentHeight) {
    const imgData = canvas.toDataURL('image/jpeg', 0.96);
    pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, totalPdfHeight);
  } else {
    // Multi-page slicing at exact A4 canvas height increments
    const pageCanvasHeight = Math.floor((canvas.width * contentHeight) / contentWidth);
    let renderedHeight = 0;
    let pageNum = 0;

    while (renderedHeight < canvas.height) {
      const sliceHeight = Math.min(pageCanvasHeight, canvas.height - renderedHeight);

      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceHeight;
      const ctx = sliceCanvas.getContext('2d');

      if (ctx) {
        ctx.fillStyle = theme === 'white-paper' ? '#ffffff' : '#0e1615';
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        ctx.drawImage(
          canvas,
          0,
          renderedHeight,
          canvas.width,
          sliceHeight,
          0,
          0,
          canvas.width,
          sliceHeight
        );
      }

      const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.95);
      const slicePdfHeight = (sliceHeight * contentWidth) / canvas.width;

      if (pageNum > 0) {
        pdf.addPage();
      }

      pdf.addImage(sliceData, 'JPEG', margin, margin, contentWidth, slicePdfHeight);

      pdf.setFontSize(8);
      pdf.setTextColor(140, 140, 140);
      pdf.text(
        `KhataGHAR Snapshot • Page ${pageNum + 1}`,
        pageWidth / 2,
        pageHeight - 4,
        { align: 'center' }
      );

      renderedHeight += sliceHeight;
      pageNum++;
    }
  }

  pdf.save(filename);
}


