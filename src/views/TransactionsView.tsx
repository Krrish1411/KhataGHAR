import React, { useState, useMemo } from 'react';
import { useVault } from '../context/VaultContext';
import { usePrivacy } from '../context/PrivacyContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { AnimatedNumber } from '../components/common/AnimatedNumber';
import { QuickAddModal } from '../components/transactions/QuickAddModal';
import { formatCurrency } from '../utils/formatters';
import { formatReadableDate, getDateRangePresets } from '../utils/dates';
import { exportTransactionsToCSV } from '../services/export';
import type { Transaction, Category, Account } from '../types';
import {
  ArrowLeftRight,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Download,
  Plus,
  Trash2,
  Repeat,
  Calendar,
} from 'lucide-react';

export const TransactionsView: React.FC = () => {
  const { transactions, accounts, categories, deleteTransaction, activeVault } = useVault();
  const { isPrivacyMode } = usePrivacy();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateRangePreset, setDateRangePreset] = useState<string>('all-time');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  const baseCurrency = activeVault?.currency || 'INR';
  const numberFormat = activeVault?.numberFormat || 'indian';

  const presets = useMemo(() => getDateRangePresets(activeVault?.fyStartMonth || 4), [activeVault]);
  const activeRange = presets[dateRangePreset] || presets['all-time'];

  const categoryLookup = useMemo(() => new Map<string, Category>(categories.map((c) => [c.id, c])), [categories]);
  const accountLookup = useMemo(() => new Map<string, Account>(accounts.map((a) => [a.id, a])), [accounts]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t: Transaction) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (accountFilter !== 'all' && t.accountId !== accountFilter && t.toAccountId !== accountFilter)
        return false;
      if (categoryFilter !== 'all' && t.categoryId !== categoryFilter) return false;

      if (dateRangePreset !== 'all-time') {
        if (t.date < activeRange.start || t.date > activeRange.end) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const cat = t.categoryId ? categoryLookup.get(t.categoryId)?.name.toLowerCase() : '';
        const acc = accountLookup.get(t.accountId)?.name.toLowerCase() || '';
        const note = (t.note || '').toLowerCase();
        const tags = (t.tags || []).join(' ').toLowerCase();

        return (cat && cat.includes(q)) || acc.includes(q) || note.includes(q) || tags.includes(q);
      }

      return true;
    });
  }, [
    transactions,
    typeFilter,
    accountFilter,
    categoryFilter,
    dateRangePreset,
    activeRange,
    searchQuery,
    categoryLookup,
    accountLookup,
  ]);

  // Summary of filtered items
  const filteredSummary = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach((t) => {
      if (t.type === 'income') income += t.amount;
      else if (t.type === 'expense') expense += t.amount;
    });
    return { income, expense, net: income - expense };
  }, [filteredTransactions]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this transaction? The corresponding account balance will be reversed.')) {
      await deleteTransaction(id);
    }
  };

  const handleExportCSV = () => {
    if (!activeVault) return;
    exportTransactionsToCSV(filteredTransactions, categories, accounts, activeVault);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto px-1 sm:px-2 pb-16 anim-fade">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 grid place-items-center text-pine-600">
              <ArrowLeftRight className="w-4 h-4" />
            </span>
            <h1 className="font-display font-extrabold text-[22px] sm:text-[24px] tracking-tight text-ink">
              Transactions & Ledger Entries
            </h1>
          </div>
          <p className="text-xs text-ink/50 mt-1">
            Complete cryptographic double-entry journal — {transactions.length} verified records
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl border border-line bg-card hover:bg-moss active:scale-[0.97] text-xs font-semibold text-ink flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Download className="w-3.5 h-3.5 text-pine-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsQuickAddOpen(true)}
            className="px-4 py-2 rounded-xl bg-pine-700 hover:bg-pine-600 active:scale-[0.97] text-white text-xs font-bold shadow-sm shadow-pine-900/20 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Entry</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar with Segmented Control */}
      <div className="rounded-2xl border border-line bg-card p-3 sm:p-4 space-y-3 shadow-sm lift">
        {/* Top filter row: Segmented control for Type + Search */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Segmented Type Filter */}
          <div className="flex items-center p-1 bg-moss/80 rounded-xl border border-line overflow-x-auto">
            {[
              { id: 'all', label: 'All' },
              { id: 'expense', label: 'Expenses' },
              { id: 'income', label: 'Income' },
              { id: 'transfer', label: 'Transfers' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTypeFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  typeFilter === tab.id
                    ? 'bg-card text-ink font-bold shadow-xs border border-line'
                    : 'text-ink/60 hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Search notes, merchants, #tags…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
        </div>

        {/* Bottom filter row: Account + Category + Date range */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-line">
          <Select
            label="Account"
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Accounts' },
              ...accounts.map((a: Account) => ({ value: a.id, label: a.name })),
            ]}
          />

          <Select
            label="Category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Categories' },
              ...categories.map((c: Category) => ({ value: c.id, label: c.name })),
            ]}
          />

          <Select
            label="Date Range"
            value={dateRangePreset}
            onChange={(e) => setDateRangePreset(e.target.value)}
            options={[
              { value: 'all-time', label: 'All Time' },
              { value: 'this-month', label: 'This Month' },
              { value: 'last-month', label: 'Last Month' },
              { value: 'this-quarter', label: 'This Quarter' },
              { value: 'this-fy', label: 'This Financial Year' },
              { value: 'last-12-months', label: 'Last 12 Months' },
            ]}
          />
        </div>
      </div>

      {/* Filtered Totals Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-line bg-card p-4 sm:p-5 shadow-sm lift">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-pine-700 dark:text-pine-400 block">
            Filtered Inflow
          </span>
          <div className="font-display font-extrabold text-[24px] num text-pine-700 dark:text-pine-400 mt-1">
            +<AnimatedNumber
              value={filteredSummary.income}
              currency={baseCurrency}
              numberFormat={numberFormat}
              isPrivacyMode={isPrivacyMode}
            />
          </div>
          <span className="text-[11px] text-ink/45 block mt-0.5">Matching criteria credits</span>
        </div>

        <div className="rounded-2xl border border-line bg-card p-4 sm:p-5 shadow-sm lift">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-flare-600 block">
            Filtered Outflow
          </span>
          <div className="font-display font-extrabold text-[24px] num text-flare-600 mt-1">
            -<AnimatedNumber
              value={filteredSummary.expense}
              currency={baseCurrency}
              numberFormat={numberFormat}
              isPrivacyMode={isPrivacyMode}
            />
          </div>
          <span className="text-[11px] text-ink/45 block mt-0.5">Matching criteria debits</span>
        </div>

        <div className="rounded-2xl border border-line bg-card p-4 sm:p-5 shadow-sm lift">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink block">
            Net Differential
          </span>
          <div
            className={`font-display font-extrabold text-[24px] num mt-1 ${
              filteredSummary.net >= 0
                ? 'text-pine-700 dark:text-pine-400'
                : 'text-flare-600'
            }`}
          >
            {filteredSummary.net >= 0 ? '+' : ''}
            <AnimatedNumber
              value={filteredSummary.net}
              currency={baseCurrency}
              numberFormat={numberFormat}
              isPrivacyMode={isPrivacyMode}
            />
          </div>
          <span className="text-[11px] text-ink/45 block mt-0.5">Inflow minus outflow balance</span>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-2xl border border-line bg-card overflow-hidden shadow-sm lift">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-14 text-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 grid place-items-center mx-auto text-pine-600">
              <ArrowLeftRight className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-ink">No transactions match filters</h3>
              <p className="text-xs text-ink/50 mt-1 max-w-sm mx-auto">
                Try loosening your search term, changing the date range, or log a new transaction.
              </p>
            </div>
            <button
              onClick={() => setIsQuickAddOpen(true)}
              className="px-4 py-2 rounded-xl bg-pine-700 text-white text-xs font-bold shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Entry</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-moss/70 border-b border-line text-ink/50 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Description / Note</th>
                  <th className="py-3 px-4">Account Linked</th>
                  <th className="py-3 px-4">Tags</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {filteredTransactions.map((tx: Transaction) => {
                  const cat = tx.categoryId ? categoryLookup.get(tx.categoryId) : undefined;
                  const acc = accountLookup.get(tx.accountId);
                  const toAcc = tx.toAccountId ? accountLookup.get(tx.toAccountId) : undefined;
                  const isExpense = tx.type === 'expense';
                  const isIncome = tx.type === 'income';

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-moss/40 transition-colors"
                    >
                      {/* Date */}
                      <td className="py-3 px-4 text-ink/60 font-mono text-xs whitespace-nowrap">
                        {formatReadableDate(tx.date)}
                      </td>

                      {/* Description & Category */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg grid place-items-center flex-shrink-0 ${
                              isExpense
                                ? 'bg-flare-100/70 text-flare-600'
                                : isIncome
                                ? 'bg-pine-50 dark:bg-pine-950/40 text-pine-600'
                                : 'bg-sky-50 dark:bg-sky-950/40 text-sky-600'
                            }`}
                          >
                            {isExpense ? (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            ) : isIncome ? (
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowLeftRight className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-ink block truncate">
                              {tx.note || cat?.name || (tx.type === 'transfer' ? 'Account Transfer' : 'Transaction')}
                            </span>
                            {cat?.name && tx.note && (
                              <span className="text-[11px] text-ink/45 block font-normal truncate">
                                {cat.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Account */}
                      <td className="py-3 px-4 text-ink/75 whitespace-nowrap">
                        {tx.type === 'transfer' && toAcc ? (
                          <span className="flex items-center gap-1.5 text-xs">
                            <span>{acc?.name || 'Account'}</span>
                            <span className="text-ink/40">→</span>
                            <span className="font-semibold text-mari-600">{toAcc.name}</span>
                          </span>
                        ) : (
                          <span>{acc?.name || 'Unknown Account'}</span>
                        )}
                      </td>

                      {/* Tags */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-1">
                          {tx.tags && tx.tags.length > 0 ? (
                            tx.tags.map((tag, idx) => (
                              <Badge key={idx} tone="gray" size="xs">
                                #{tag}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-ink/30">—</span>
                          )}
                        </div>
                      </td>

                      {/* Amount */}
                      <td
                        className={`py-3 px-4 text-right font-display font-extrabold text-sm num whitespace-nowrap ${
                          isExpense
                            ? 'text-flare-600'
                            : isIncome
                            ? 'text-pine-700 dark:text-pine-400'
                            : 'text-ink'
                        }`}
                      >
                        {isExpense ? '-' : isIncome ? '+' : ''}
                        <AnimatedNumber
                          value={tx.amount}
                          currency={baseCurrency}
                          numberFormat={numberFormat}
                          isPrivacyMode={isPrivacyMode}
                        />
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="p-1.5 text-ink/40 hover:text-flare-600 rounded-lg cursor-pointer transition-colors"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Add Modal */}
      {isQuickAddOpen && (
        <QuickAddModal
          isOpen={isQuickAddOpen}
          onClose={() => setIsQuickAddOpen(false)}
        />
      )}
    </div>
  );
};
