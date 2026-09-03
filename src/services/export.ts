// Export Service for CSV & PDF reports in Khata Ghar

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  Transaction,
  Account,
  Category,
  PeopleLedgerEntry,
  Asset,
  Liability,
  VaultMeta,
} from '../types';
import { formatRawNumber, CURRENCY_SYMBOLS } from '../utils/formatters';
import { formatReadableDate } from '../utils/dates';
import { downloadFile } from './backup';

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

// Generate and trigger download of CSV transactions
export function exportTransactionsToCSV(
  transactions: Transaction[],
  categories: Category[],
  accounts: Account[],
  vault: VaultMeta
) {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const accMap = new Map(accounts.map((a) => [a.id, a.name]));

  const headers = ['Date', 'Type', 'Amount', 'Currency', 'Account', 'Category', 'Note', 'Tags', 'Recurring'];
  const rows = transactions.map((t) => [
    t.date,
    t.type.toUpperCase(),
    t.amount.toFixed(2),
    t.currency || vault.currency,
    `"${(accMap.get(t.accountId) || 'Unknown').replace(/"/g, '""')}"`,
    `"${(t.categoryId ? catMap.get(t.categoryId) || 'Uncategorized' : 'Transfer').replace(/"/g, '""')}"`,
    `"${(t.note || '').replace(/"/g, '""')}"`,
    `"${(t.tags || []).join(';')}"`,
    t.isRecurring ? 'YES' : 'NO',
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const filename = `KhataGhar_${vault.name.replace(/\s+/g, '_')}_Transactions_${new Date().toISOString().split('T')[0]}.csv`;
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

// Generate PDF Financial Summary Report
export function exportFinancialReportPDF(data: ReportExportData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const { vault, periodLabel, transactions, categories, summary } = data;
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const currencySymbol = CURRENCY_SYMBOLS[vault.currency] || `${vault.currency} `;

  // Title Header
  doc.setFillColor(16, 27, 45); // Dark ink navy
  doc.rect(0, 0, 210, 36, 'F');

  doc.setTextColor(232, 163, 61); // Saffron accent
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('KHATA GHAR', 14, 18);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Financial Performance Report — ${vault.name}`, 14, 28);
  doc.text(`Period: ${periodLabel}`, 140, 28);

  // Executive Summary Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 42, 182, 28, 3, 3, 'FD');

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL INCOME', 20, 50);
  doc.text('TOTAL EXPENSES', 65, 50);
  doc.text('NET SAVINGS', 110, 50);
  doc.text('SAVINGS RATE', 155, 50);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // Green
  doc.text(`${currencySymbol}${formatRawNumber(summary.totalIncome, vault.numberFormat)}`, 20, 60);

  doc.setTextColor(239, 68, 68); // Red
  doc.text(`${currencySymbol}${formatRawNumber(summary.totalExpense, vault.numberFormat)}`, 65, 60);

  const netSavingsColor = summary.netSavings >= 0 ? [16, 185, 129] : [239, 68, 68];
  doc.setTextColor(netSavingsColor[0], netSavingsColor[1], netSavingsColor[2]);
  doc.text(`${currencySymbol}${formatRawNumber(summary.netSavings, vault.numberFormat)}`, 110, 60);

  doc.setTextColor(232, 163, 61); // Saffron
  doc.text(`${summary.savingsRate.toFixed(1)}%`, 155, 60);

  // Spend by Category Table
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 27, 45);
  doc.text('Top Spending Categories', 14, 80);

  const categorySpendMap = new Map<string, number>();
  transactions.forEach((t) => {
    if (t.type === 'expense' && t.categoryId) {
      const catName = catMap.get(t.categoryId) || 'Other';
      categorySpendMap.set(catName, (categorySpendMap.get(catName) || 0) + t.amount);
    }
  });

  const sortedCategories = Array.from(categorySpendMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const categoryTableData = sortedCategories.map(([cat, amount]) => [
    cat,
    `${currencySymbol}${formatRawNumber(amount, vault.numberFormat)}`,
    summary.totalExpense > 0 ? `${((amount / summary.totalExpense) * 100).toFixed(1)}%` : '0%',
  ]);

  autoTable(doc, {
    startY: 84,
    head: [['Category', 'Amount Spent', 'Share of Total']],
    body: categoryTableData.length > 0 ? categoryTableData : [['No expenses recorded', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [16, 27, 45], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 2.5 },
    margin: { left: 14, right: 14 },
  });

  // Recent Transactions Table
  const finalY = (doc as any).lastAutoTable?.finalY || 130;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 27, 45);
  doc.text('Key Transactions', 14, finalY + 12);

  const recentTxs = transactions.slice(0, 15).map((t) => [
    formatReadableDate(t.date),
    t.type.toUpperCase(),
    t.categoryId ? catMap.get(t.categoryId) || 'Uncategorized' : 'Transfer',
    (t.note || '-').substring(0, 30),
    `${t.type === 'expense' ? '-' : '+'}${currencySymbol}${formatRawNumber(t.amount, vault.numberFormat)}`,
  ]);

  autoTable(doc, {
    startY: finalY + 16,
    head: [['Date', 'Type', 'Category', 'Description', 'Amount']],
    body: recentTxs.length > 0 ? recentTxs : [['No transactions in period', '-', '-', '-', '-']],
    theme: 'striped',
    headStyles: { fillColor: [16, 27, 45], textColor: [255, 255, 255] },
    styles: { fontSize: 8.5, cellPadding: 2 },
    margin: { left: 14, right: 14 },
  });

  // Footer Note
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Khata Ghar — Private & Client-side encrypted. Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${pageCount}`,
      14,
      288
    );
  }

  doc.save(`KhataGhar_Report_${vault.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
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
  accounts: any[];
  assets: any[];
  liabilities: any[];
  plannedExpenses: any[];
  peopleLedger: any[];
  ratios?: Array<{ name: string; value: string; status: string; benchmark: string }>;
  options: ComprehensivePdfOptions;
}

// Generate Comprehensive Multi-Section Financial Dossier PDF
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
    ratios = [],
    options,
  } = data;

  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const accMap = new Map(accounts.map((a) => [a.id, a.name]));
  const currencySymbol = CURRENCY_SYMBOLS[vault.currency] || `${vault.currency} `;

  let currentY = 16;

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > 275) {
      doc.addPage();
      currentY = 20;
    }
  };

  // 1. Cover Header Banner
  doc.setFillColor(18, 133, 90); // Pine 700
  doc.rect(0, 0, 210, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('KHATA GHAR', 14, 18);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Comprehensive Financial Dossier — ${vault.name}`, 14, 28);
  doc.text(`Period: ${periodLabel}`, 135, 28);

  currentY = 44;

  // 2. Executive Summary & Net Worth
  if (options.includeSummary) {
    checkPageBreak(40);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, currentY, 182, 32, 3, 3, 'FD');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('TOTAL INCOME', 20, currentY + 9);
    doc.text('TOTAL EXPENSE', 62, currentY + 9);
    doc.text('NET SAVINGS', 104, currentY + 9);
    doc.text('SAVINGS RATE', 146, currentY + 9);

    doc.setFontSize(12);
    doc.setTextColor(18, 133, 90);
    doc.text(`${currencySymbol}${formatRawNumber(summary.totalIncome, vault.numberFormat)}`, 20, currentY + 20);

    doc.setTextColor(220, 38, 38);
    doc.text(`${currencySymbol}${formatRawNumber(summary.totalExpense, vault.numberFormat)}`, 62, currentY + 20);

    const netColor = summary.netSavings >= 0 ? [18, 133, 90] : [220, 38, 38];
    doc.setTextColor(netColor[0], netColor[1], netColor[2]);
    doc.text(`${currencySymbol}${formatRawNumber(summary.netSavings, vault.numberFormat)}`, 104, currentY + 20);

    doc.setTextColor(217, 119, 6);
    doc.text(`${summary.savingsRate.toFixed(1)}%`, 146, currentY + 20);

    currentY += 40;
  }

  // 3. Complete Balance Sheet
  if (options.includeBalanceSheet) {
    checkPageBreak(30);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(18, 133, 90);
    doc.text('Balance Sheet: Assets & Liabilities', 14, currentY);
    currentY += 5;

    const balanceSheetRows: any[][] = [];
    accounts.forEach((a) => {
      balanceSheetRows.push(['Liquid Account', a.name, a.type.toUpperCase(), `${currencySymbol}${formatRawNumber(a.balance, vault.numberFormat)}`]);
    });
    assets.forEach((ast) => {
      balanceSheetRows.push(['Physical Asset', ast.name, ast.type.replace('_', ' ').toUpperCase(), `${currencySymbol}${formatRawNumber(ast.currentValue, vault.numberFormat)}`]);
    });
    liabilities.forEach((l) => {
      balanceSheetRows.push(['Institutional Debt', l.name, `${l.interestRate || 0}% p.a.`, `-${currencySymbol}${formatRawNumber(l.outstandingBalance, vault.numberFormat)}`]);
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Classification', 'Entity / Asset', 'Type / Terms', 'Net Value']],
      body: balanceSheetRows.length > 0 ? balanceSheetRows : [['No assets or debt recorded', '-', '-', '-']],
      theme: 'grid',
      headStyles: { fillColor: [18, 133, 90], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8.5, cellPadding: 2.2 },
      margin: { left: 14, right: 14 },
    });
    currentY = (doc as any).lastAutoTable?.finalY + 12 || currentY + 30;
  }

  // 4. Category Spend Ranking
  if (options.includeCategories) {
    checkPageBreak(30);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(18, 133, 90);
    doc.text('Expense Categorical Distribution', 14, currentY);
    currentY += 5;

    const categorySpendMap = new Map<string, number>();
    transactions.forEach((t) => {
      if (t.type === 'expense' && t.categoryId) {
        const catName = catMap.get(t.categoryId) || 'Other';
        categorySpendMap.set(catName, (categorySpendMap.get(catName) || 0) + t.amount);
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
      head: [['Expense Category', 'Total Outflow', 'Share of Spend']],
      body: catRows.length > 0 ? catRows : [['No categorized expenses', '-', '-']],
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
      styles: { fontSize: 8.5, cellPadding: 2 },
      margin: { left: 14, right: 14 },
    });
    currentY = (doc as any).lastAutoTable?.finalY + 12 || currentY + 30;
  }

  // 5. 16-Ratio Diagnostic Scorecard
  if (options.includeRatios && ratios.length > 0) {
    checkPageBreak(30);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(18, 133, 90);
    doc.text('Financial Health Ratios & Diagnostic Matrix', 14, currentY);
    currentY += 5;

    const ratioRows = ratios.map((r) => [r.name, r.value, r.status, r.benchmark]);

    autoTable(doc, {
      startY: currentY,
      head: [['Financial Metric', 'Current Reading', 'Diagnostic Status', 'Target Benchmark']],
      body: ratioRows,
      theme: 'grid',
      headStyles: { fillColor: [18, 133, 90], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8.5, cellPadding: 2.2 },
      margin: { left: 14, right: 14 },
    });
    currentY = (doc as any).lastAutoTable?.finalY + 12 || currentY + 30;
  }

  // 6. Upcoming Bills & Scheduled Commitments
  if (options.includePlanned && plannedExpenses.length > 0) {
    checkPageBreak(30);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(18, 133, 90);
    doc.text('Upcoming Bills & Scheduled Commitments', 14, currentY);
    currentY += 5;

    const planRows = plannedExpenses.map((p) => [
      p.dueDate,
      p.title,
      catMap.get(p.categoryId || '') || 'General',
      `${currencySymbol}${formatRawNumber(p.amount, vault.numberFormat)}`,
      p.status.toUpperCase(),
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Due Date', 'Commitment Title', 'Category', 'Amount', 'Status']],
      body: planRows,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
      styles: { fontSize: 8.5, cellPadding: 2 },
      margin: { left: 14, right: 14 },
    });
    currentY = (doc as any).lastAutoTable?.finalY + 12 || currentY + 30;
  }

  // 7. Full Entries Ledger
  if (options.includeLedger && transactions.length > 0) {
    checkPageBreak(30);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(18, 133, 90);
    doc.text('Transactions Ledger', 14, currentY);
    currentY += 5;

    const txRows = transactions.slice(0, 60).map((t) => [
      formatReadableDate(t.date),
      t.type.toUpperCase(),
      t.categoryId ? catMap.get(t.categoryId) || 'Other' : 'Transfer',
      accMap.get(t.accountId) || 'Account',
      (t.note || '-').substring(0, 32),
      `${t.type === 'expense' ? '-' : '+'}${currencySymbol}${formatRawNumber(t.amount, vault.numberFormat)}`,
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Date', 'Type', 'Category', 'Account', 'Description', 'Amount']],
      body: txRows,
      theme: 'striped',
      headStyles: { fillColor: [18, 133, 90], textColor: [255, 255, 255] },
      styles: { fontSize: 8, cellPadding: 1.8 },
      margin: { left: 14, right: 14 },
    });
  }

  // Page Numbers & Confidentiality Footer
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Khata Ghar — Private & Client-Side Encrypted Dossier | Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${totalPages}`,
      14,
      288
    );
  }

  doc.save(`KhataGhar_Dossier_${vault.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}
