import React, { useState, useMemo, useEffect } from 'react';
import { useVault } from '../context/VaultContext';
import { usePrivacy } from '../context/PrivacyContext';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { AnimatedNumber } from '../components/common/AnimatedNumber';
import { QuickAddModal } from '../components/transactions/QuickAddModal';
import { EditTransactionModal } from '../components/transactions/EditTransactionModal';
import { PeopleEntryModal } from '../components/people/PeopleEntryModal';
import { EditSettlementModal } from '../components/people/EditSettlementModal';
import { IconRenderer } from '../components/common/IconRenderer';
import { formatCurrency } from '../utils/formatters';
import { formatReadableDate, getDateRangePresets } from '../utils/dates';
import { exportTransactionsToCSV } from '../services/export';
import type { Transaction, Category, Account, Asset, Liability, PeopleLedgerEntry, SettlementRecord } from '../types';
import {
  ArrowLeftRight,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Download,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  TrendingUp,
  Landmark,
  User,
  Wallet,
  X,
  Layers,
} from 'lucide-react';

export type UnifiedEntryFlow = 'inflow' | 'outflow' | 'transfer';

export type UnifiedEntryType =
  | 'expense'
  | 'income'
  | 'transfer'
  | 'invest'
  | 'asset_sale'
  | 'debt_payment'
  | 'loan_received'
  | 'lent'
  | 'lent_repaid'
  | 'borrowed'
  | 'borrowed_repaid'
  | 'holding'
  | 'holding_returned';

export interface UnifiedLedgerEntry {
  id: string;
  source: 'transaction' | 'people' | 'settlement';
  originalId: string;
  parentId?: string;
  date: string;
  amount: number;
  flow: UnifiedEntryFlow;
  type: UnifiedEntryType;
  title: string;
  subtitle?: string;
  accountId?: string;
  toAccountId?: string;
  categoryId?: string;
  contactName?: string;
  linkedAssetId?: string;
  linkedLiabilityId?: string;
  realizedGain?: number;
  note?: string;
  rawTransaction?: Transaction;
  rawPeopleEntry?: PeopleLedgerEntry;
  rawSettlement?: SettlementRecord;
}

export const TransactionsView: React.FC = () => {
  const {
    transactions,
    accounts,
    categories,
    assets,
    liabilities,
    peopleLedger,
    deleteTransaction,
    deletePeopleEntry,
    deleteSettlement,
    reconcileAccounts,
    activeVault,
  } = useVault();
  const { isPrivacyMode } = usePrivacy();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateRangePreset, setDateRangePreset] = useState<string>('all-time');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [txToEdit, setTxToEdit] = useState<Transaction | null>(null);
  const [peopleEntryToEdit, setPeopleEntryToEdit] = useState<PeopleLedgerEntry | null>(null);
  const [settlementToEdit, setSettlementToEdit] = useState<{
    entry: PeopleLedgerEntry;
    settlement: SettlementRecord;
  } | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);

  const baseCurrency = activeVault?.currency || 'INR';
  const numberFormat = activeVault?.numberFormat || 'indian';

  const presets = useMemo(() => getDateRangePresets(activeVault?.fyStartMonth || 4), [activeVault]);
  const activeRange = presets[dateRangePreset] || presets['all-time'];

  const categoryLookup = useMemo(() => new Map<string, Category>(categories.map((c) => [c.id, c])), [categories]);
  const accountLookup = useMemo(() => new Map<string, Account>(accounts.map((a) => [a.id, a])), [accounts]);
  const assetLookup = useMemo(() => new Map<string, Asset>(assets.map((a) => [a.id, a])), [assets]);
  const liabilityLookup = useMemo(() => new Map<string, Liability>(liabilities.map((l) => [l.id, l])), [liabilities]);

  // 1. Synthesize all financial records (transactions + people records + settlements) into a unified list
  const unifiedEntries: UnifiedLedgerEntry[] = useMemo(() => {
    const list: UnifiedLedgerEntry[] = [];

    // Map regular transactions
    for (const tx of transactions) {
      let flow: UnifiedEntryFlow = tx.type === 'income' ? 'inflow' : tx.type === 'expense' ? 'outflow' : 'transfer';
      let entryType: UnifiedEntryType = tx.type;

      if (tx.linkedAssetId) {
        const isSale =
          tx.type === 'income' ||
          tx.subType === 'asset_sale' ||
          Boolean(tx.tags && tx.tags.includes('asset-sale'));
        if (isSale) {
          entryType = 'asset_sale';
          flow = 'inflow';
        } else {
          entryType = 'invest';
          flow = 'outflow';
        }
      } else if (tx.linkedLiabilityId) {
        const isDisb =
          tx.type === 'income' ||
          tx.subType === 'loan_received' ||
          Boolean(tx.tags && tx.tags.includes('loan-disbursement'));
        if (isDisb) {
          entryType = 'loan_received';
          flow = 'inflow';
        } else {
          entryType = 'debt_payment';
          flow = 'outflow';
        }
      }

      const cat = tx.categoryId ? categoryLookup.get(tx.categoryId) : undefined;
      const asset = tx.linkedAssetId ? assetLookup.get(tx.linkedAssetId) : undefined;
      const liab = tx.linkedLiabilityId ? liabilityLookup.get(tx.linkedLiabilityId) : undefined;

      let title = tx.note;
      let subtitle = cat?.name;

      if (!title) {
        if (asset) title = `${entryType === 'asset_sale' ? 'Sale / Redemption' : 'Investment Buy'}: ${asset.name}`;
        else if (liab) title = `${entryType === 'loan_received' ? 'Loan Disbursed' : 'Loan Payment'}: ${liab.name}`;
        else if (tx.type === 'transfer') title = 'Account Transfer';
        else if (cat) title = cat.name;
        else title = 'Transaction';
      }

      if (asset && subtitle !== asset.name) {
        subtitle = `Asset: ${asset.name}`;
      } else if (liab && subtitle !== liab.name) {
        subtitle = `Liability: ${liab.name}`;
      }

      list.push({
        id: `tx_${tx.id}`,
        source: 'transaction',
        originalId: tx.id,
        date: tx.date,
        amount: tx.amount,
        flow,
        type: entryType,
        title,
        subtitle,
        accountId: tx.accountId,
        toAccountId: tx.toAccountId,
        categoryId: tx.categoryId,
        linkedAssetId: tx.linkedAssetId,
        linkedLiabilityId: tx.linkedLiabilityId,
        realizedGain: tx.realizedGain,
        note: tx.note,
        rawTransaction: tx,
      });
    }

    // Map people ledger entries (initial principal)
    for (const p of peopleLedger) {
      const isLent = p.type === 'lent';
      const isBorrowed = p.type === 'borrowed';

      const flow: UnifiedEntryFlow = isLent ? 'outflow' : 'inflow';
      const entryType: UnifiedEntryType = p.type;

      const title =
        p.notes ||
        (isLent
          ? `Lent to ${p.contactName}`
          : isBorrowed
          ? `Borrowed from ${p.contactName}`
          : `Custodial Deposit from ${p.contactName}`);
      const subtitle = `${isLent ? '🤝 Lent to' : isBorrowed ? '📥 Borrowed from' : '🛡️ Holding for'} ${p.contactName}`;

      list.push({
        id: `pe_${p.id}`,
        source: 'people',
        originalId: p.id,
        date: p.date,
        amount: p.amount,
        flow,
        type: entryType,
        title,
        subtitle,
        accountId: p.accountId,
        contactName: p.contactName,
        note: p.notes,
        rawPeopleEntry: p,
      });

      // Map settlements on this entry
      for (const s of p.settlements || []) {
        let sFlow: UnifiedEntryFlow = 'inflow';
        let sType: UnifiedEntryType = 'lent_repaid';

        if (isLent) {
          sFlow = 'inflow';
          sType = 'lent_repaid';
        } else if (isBorrowed) {
          sFlow = 'outflow';
          sType = 'borrowed_repaid';
        } else {
          sFlow = 'outflow';
          sType = 'holding_returned';
        }

        const sTitle =
          s.note ||
          (isLent
            ? `Repayment received from ${p.contactName}`
            : isBorrowed
            ? `Repaid loan to ${p.contactName}`
            : `Holding returned to ${p.contactName}`);
        const sSubtitle = `${isLent ? '📥 Repayment by' : isBorrowed ? '📤 Repaid to' : '📤 Returned to'} ${p.contactName}`;

        list.push({
          id: `ps_${s.id}`,
          source: 'settlement',
          originalId: s.id,
          parentId: p.id,
          date: s.date,
          amount: s.amount,
          flow: sFlow,
          type: sType,
          title: sTitle,
          subtitle: sSubtitle,
          accountId: s.accountId,
          contactName: p.contactName,
          note: s.note,
          rawSettlement: s,
          rawPeopleEntry: p,
        });
      }
    }

    // Sort descending by date (most recent first)
    return list.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }, [transactions, peopleLedger, categoryLookup, assetLookup, liabilityLookup]);

  // 2. Filtered ledger entries
  const filteredEntries = useMemo(() => {
    return unifiedEntries.filter((item) => {
      // Type filter
      if (typeFilter === 'inflow') {
        if (item.flow !== 'inflow') return false;
      } else if (typeFilter === 'outflow') {
        if (item.flow !== 'outflow') return false;
      } else if (typeFilter === 'transfer') {
        if (item.type !== 'transfer') return false;
      } else if (typeFilter === 'people') {
        if (!['lent', 'lent_repaid', 'borrowed', 'borrowed_repaid', 'holding', 'holding_returned'].includes(item.type))
          return false;
      } else if (typeFilter === 'assets_loans') {
        if (!['invest', 'asset_sale', 'debt_payment', 'loan_received'].includes(item.type)) return false;
      }

      // Account filter
      if (accountFilter !== 'all') {
        if (item.accountId !== accountFilter && item.toAccountId !== accountFilter) return false;
      }

      // Category filter
      if (categoryFilter !== 'all') {
        if (item.categoryId !== categoryFilter) return false;
      }

      // Date range filter
      if (dateRangePreset !== 'all-time') {
        if (item.date < activeRange.start || item.date > activeRange.end) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = item.title.toLowerCase().includes(q);
        const subtitleMatch = item.subtitle ? item.subtitle.toLowerCase().includes(q) : false;
        const noteMatch = item.note ? item.note.toLowerCase().includes(q) : false;
        const contactMatch = item.contactName ? item.contactName.toLowerCase().includes(q) : false;
        const catName = item.categoryId ? categoryLookup.get(item.categoryId)?.name.toLowerCase() : '';
        const accName = item.accountId ? accountLookup.get(item.accountId)?.name.toLowerCase() : '';
        const toAccName = item.toAccountId ? accountLookup.get(item.toAccountId)?.name.toLowerCase() : '';
        const assetName = item.linkedAssetId ? assetLookup.get(item.linkedAssetId)?.name.toLowerCase() : '';
        const liabName = item.linkedLiabilityId ? liabilityLookup.get(item.linkedLiabilityId)?.name.toLowerCase() : '';
        const amountMatch = item.amount.toString().includes(q);

        return (
          titleMatch ||
          subtitleMatch ||
          noteMatch ||
          contactMatch ||
          (catName && catName.includes(q)) ||
          (accName && accName.includes(q)) ||
          (toAccName && toAccName.includes(q)) ||
          (assetName && assetName.includes(q)) ||
          (liabName && liabName.includes(q)) ||
          amountMatch
        );
      }

      return true;
    });
  }, [
    unifiedEntries,
    typeFilter,
    accountFilter,
    categoryFilter,
    dateRangePreset,
    activeRange,
    searchQuery,
    categoryLookup,
    accountLookup,
    assetLookup,
    liabilityLookup,
  ]);

  // 3. Summary of filtered items
  const filteredSummary = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredEntries.forEach((e) => {
      if (e.flow === 'inflow') income += e.amount;
      else if (e.flow === 'outflow') expense += e.amount;
    });
    return { income, expense, net: income - expense, count: filteredEntries.length };
  }, [filteredEntries]);

  // 4. Delete & Edit Handlers
  const handleDeleteEntry = async (entry: UnifiedLedgerEntry) => {
    if (entry.source === 'transaction') {
      if (
        window.confirm(
          `Delete transaction "${entry.title}" of ${formatCurrency(entry.amount, baseCurrency, numberFormat, isPrivacyMode)}? The corresponding account balance will be reversed.`
        )
      ) {
        await deleteTransaction(entry.originalId);
        if (selectedEntryId === entry.id) setSelectedEntryId(null);
      }
    } else if (entry.source === 'people') {
      if (
        window.confirm(
          `Delete ${entry.type} entry for "${entry.contactName}" of ${formatCurrency(entry.amount, baseCurrency, numberFormat, isPrivacyMode)}? Account balance and all its settlements will be reversed.`
        )
      ) {
        await deletePeopleEntry(entry.originalId);
        if (selectedEntryId === entry.id) setSelectedEntryId(null);
      }
    } else if (entry.source === 'settlement' && entry.parentId) {
      if (
        window.confirm(
          `Delete settlement / return of ${formatCurrency(entry.amount, baseCurrency, numberFormat, isPrivacyMode)} for "${entry.contactName}"? The linked account balance will be reversed.`
        )
      ) {
        await deleteSettlement(entry.parentId, entry.originalId);
        if (selectedEntryId === entry.id) setSelectedEntryId(null);
      }
    }
  };

  const handleEditEntry = (entry: UnifiedLedgerEntry) => {
    if (entry.source === 'transaction' && entry.rawTransaction) {
      setTxToEdit(entry.rawTransaction);
    } else if (entry.source === 'people' && entry.rawPeopleEntry) {
      setPeopleEntryToEdit(entry.rawPeopleEntry);
    } else if (entry.source === 'settlement' && entry.rawPeopleEntry && entry.rawSettlement) {
      setSettlementToEdit({
        entry: entry.rawPeopleEntry,
        settlement: entry.rawSettlement,
      });
    }
  };

  // Keyboard navigation & quick actions for selected row
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        activeTag === 'select' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (!selectedEntryId) return;

      const currentIndex = filteredEntries.findIndex((t) => t.id === selectedEntryId);
      if (currentIndex === -1) return;

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        const nextIndex = Math.min(filteredEntries.length - 1, currentIndex + 1);
        setSelectedEntryId(filteredEntries[nextIndex].id);
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        const prevIndex = Math.max(0, currentIndex - 1);
        setSelectedEntryId(filteredEntries[prevIndex].id);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = filteredEntries[currentIndex];
        handleEditEntry(item);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const item = filteredEntries[currentIndex];
        handleDeleteEntry(item);
      } else if (e.key === 'Escape') {
        setSelectedEntryId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEntryId, filteredEntries]);

  const handleReconcile = async () => {
    if (window.confirm('Recalculate and reconcile all account balances based on your complete ledger?')) {
      setIsReconciling(true);
      try {
        await reconcileAccounts();
      } finally {
        setIsReconciling(false);
      }
    }
  };

  const handleExportCSV = () => {
    if (!activeVault) return;
    exportTransactionsToCSV(transactions, categories, accounts, activeVault);
  };

  // Badge render helper
  const renderTypeBadge = (type: UnifiedEntryType) => {
    switch (type) {
      case 'expense':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-flare-50 dark:bg-flare-950/40 text-flare-600 border border-flare-200/60 dark:border-flare-800/40 shrink-0">
            <ArrowUpRight className="w-3 h-3" />
            <span>Expense</span>
          </span>
        );
      case 'income':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-pine-50 dark:bg-pine-950/40 text-pine-600 border border-pine-200/60 dark:border-pine-800/40 shrink-0">
            <ArrowDownLeft className="w-3 h-3" />
            <span>Income</span>
          </span>
        );
      case 'transfer':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-600 border border-sky-200/60 dark:border-sky-800/40 shrink-0">
            <ArrowLeftRight className="w-3 h-3" />
            <span>Transfer</span>
          </span>
        );
      case 'invest':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200/60 dark:border-emerald-800/40 shrink-0">
            <TrendingUp className="w-3 h-3" />
            <span>Asset Buy</span>
          </span>
        );
      case 'asset_sale':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-teal-50 dark:bg-teal-950/40 text-teal-600 border border-teal-200/60 dark:border-teal-800/40 shrink-0">
            <TrendingUp className="w-3 h-3" />
            <span>Asset Sale</span>
          </span>
        );
      case 'debt_payment':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200/60 dark:border-amber-800/40 shrink-0">
            <Landmark className="w-3 h-3" />
            <span>Loan EMI</span>
          </span>
        );
      case 'loan_received':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 border border-indigo-200/60 dark:border-indigo-800/40 shrink-0">
            <Landmark className="w-3 h-3" />
            <span>Loan Received</span>
          </span>
        );
      case 'lent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-200/60 dark:border-rose-800/40 shrink-0">
            <span>🤝</span>
            <span>Lent</span>
          </span>
        );
      case 'lent_repaid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200/60 dark:border-emerald-800/40 shrink-0">
            <span>📥</span>
            <span>Lent Repaid</span>
          </span>
        );
      case 'borrowed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-600 border border-purple-200/60 dark:border-purple-800/40 shrink-0">
            <span>📥</span>
            <span>Borrowed</span>
          </span>
        );
      case 'borrowed_repaid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-orange-50 dark:bg-orange-950/40 text-orange-600 border border-orange-200/60 dark:border-orange-800/40 shrink-0">
            <span>📤</span>
            <span>Repaid Loan</span>
          </span>
        );
      case 'holding':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-violet-50 dark:bg-violet-950/40 text-violet-600 border border-violet-200/60 dark:border-violet-800/40 shrink-0">
            <span>🛡️</span>
            <span>Holding In</span>
          </span>
        );
      case 'holding_returned':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 border border-cyan-200/60 dark:border-cyan-800/40 shrink-0">
            <span>📤</span>
            <span>Holding Out</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-moss text-ink/70 border border-line shrink-0">
            {type}
          </span>
        );
    }
  };

  // Entity render helper
  const renderEntityBadge = (entry: UnifiedLedgerEntry) => {
    if (entry.categoryId) {
      const cat = categoryLookup.get(entry.categoryId);
      return (
        <div className="flex items-center gap-1.5 min-w-0 max-w-full">
          <div
            className="w-5 h-5 rounded-md grid place-items-center shrink-0"
            style={{ backgroundColor: `${cat?.color || '#12855a'}20`, color: cat?.color || '#12855a' }}
          >
            <IconRenderer name={cat?.icon || 'tag'} className="w-3 h-3" />
          </div>
          <span className="text-xs font-semibold text-ink truncate">{cat?.name || 'Category'}</span>
        </div>
      );
    }

    if (entry.linkedAssetId) {
      const asset = assetLookup.get(entry.linkedAssetId);
      return (
        <div className="flex items-center gap-1.5 min-w-0 max-w-full">
          <div className="w-5 h-5 rounded-md grid place-items-center shrink-0 bg-mari-50 dark:bg-mari-950/40 text-mari-600">
            <TrendingUp className="w-3 h-3" />
          </div>
          <span className="text-xs font-semibold text-ink truncate">{asset?.name || 'Asset'}</span>
        </div>
      );
    }

    if (entry.linkedLiabilityId) {
      const liab = liabilityLookup.get(entry.linkedLiabilityId);
      return (
        <div className="flex items-center gap-1.5 min-w-0 max-w-full">
          <div className="w-5 h-5 rounded-md grid place-items-center shrink-0 bg-flare-50 dark:bg-flare-950/40 text-flare-600">
            <Landmark className="w-3 h-3" />
          </div>
          <span className="text-xs font-semibold text-ink truncate">{liab?.name || 'Loan / Debt'}</span>
        </div>
      );
    }

    if (entry.contactName) {
      return (
        <div className="flex items-center gap-1.5 min-w-0 max-w-full">
          <div className="w-5 h-5 rounded-md grid place-items-center shrink-0 bg-violet-50 dark:bg-violet-950/40 text-violet-600">
            <User className="w-3 h-3" />
          </div>
          <span className="text-xs font-semibold text-ink truncate">{entry.contactName}</span>
        </div>
      );
    }

    if (entry.type === 'transfer') {
      return (
        <div className="flex items-center gap-1.5 min-w-0 max-w-full">
          <div className="w-5 h-5 rounded-md grid place-items-center shrink-0 bg-sky-50 dark:bg-sky-950/40 text-sky-600">
            <ArrowLeftRight className="w-3 h-3" />
          </div>
          <span className="text-xs font-semibold text-ink truncate">Transfer</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1 text-ink/40 text-xs">
        <Layers className="w-3 h-3" />
        <span>General</span>
      </div>
    );
  };

  const selectedEntry = selectedEntryId ? filteredEntries.find((e) => e.id === selectedEntryId) : null;

  return (
    <div className="space-y-5 w-full max-w-[1600px] mx-auto px-1 sm:px-2 pb-16 anim-fade">
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
            Complete financial journal — {unifiedEntries.length} verified records across accounts, loans & holdings
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

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-line bg-card p-3 sm:p-4 space-y-3 shadow-sm lift">
        {/* Segmented Type Filter + Live Search */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Segmented Type Filter */}
          <div className="flex items-center p-1 bg-moss/80 rounded-xl border border-line overflow-x-auto">
            {[
              { id: 'all', label: 'All' },
              { id: 'inflow', label: 'Inflows (+)' },
              { id: 'outflow', label: 'Outflows (-)' },
              { id: 'transfer', label: 'Transfers' },
              { id: 'people', label: 'People & Holdings' },
              { id: 'assets_loans', label: 'Assets & Loans' },
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
              placeholder="Search notes, contacts, accounts, categories…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
        </div>

        {/* Account + Category + Date Range Row */}
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
            Filtered Inflows
          </span>
          <div className="font-display font-extrabold text-[24px] num text-pine-700 dark:text-pine-400 mt-1">
            +
            <AnimatedNumber
              value={filteredSummary.income}
              currency={baseCurrency}
              numberFormat={numberFormat}
              isPrivacyMode={isPrivacyMode}
            />
          </div>
          <span className="text-[11px] text-ink/45 block mt-0.5">Credits, repayments & holdings in</span>
        </div>

        <div className="rounded-2xl border border-line bg-card p-4 sm:p-5 shadow-sm lift">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-flare-600 block">
            Filtered Outflows
          </span>
          <div className="font-display font-extrabold text-[24px] num text-flare-600 mt-1">
            -
            <AnimatedNumber
              value={filteredSummary.expense}
              currency={baseCurrency}
              numberFormat={numberFormat}
              isPrivacyMode={isPrivacyMode}
            />
          </div>
          <span className="text-[11px] text-ink/45 block mt-0.5">Debits, investments & holdings out</span>
        </div>

        <div className="rounded-2xl border border-line bg-card p-4 sm:p-5 shadow-sm lift">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink block">
            Net Differential ({filteredSummary.count} entries)
          </span>
          <div
            className={`font-display font-extrabold text-[24px] num mt-1 ${
              filteredSummary.net >= 0 ? 'text-pine-700 dark:text-pine-400' : 'text-flare-600'
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

      {/* Entries List Container */}
      <div className="rounded-2xl border border-line bg-card overflow-hidden shadow-sm lift">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-14 text-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 grid place-items-center mx-auto text-pine-600">
              <ArrowLeftRight className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-ink">No entries match your filters</h3>
              <p className="text-xs text-ink/50 mt-1 max-w-sm mx-auto">
                Try loosening your search term, changing the date range, or record a new entry.
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
          <>
            {/* Keyboard / Click Selection Banner */}
            {selectedEntry && (
              <div className="px-4 py-2.5 bg-pine-50 dark:bg-pine-950/70 border-b border-pine-200 dark:border-pine-800 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-pine-900 dark:text-pine-200 font-semibold min-w-0">
                  <span className="w-2 h-2 rounded-full bg-pine-600 animate-pulse shrink-0" />
                  <span className="truncate">
                    Selected: {selectedEntry.title} (
                    {formatCurrency(selectedEntry.amount, baseCurrency, numberFormat, isPrivacyMode)})
                  </span>
                  <span className="hidden md:inline text-[11px] text-ink/50 font-normal shrink-0">
                    • <kbd className="px-1 py-0.5 rounded bg-card border border-line font-mono font-bold text-ink">Del</kbd> to delete, <kbd className="px-1 py-0.5 rounded bg-card border border-line font-mono font-bold text-ink">↑</kbd>/<kbd className="px-1 py-0.5 rounded bg-card border border-line font-mono font-bold text-ink">↓</kbd> to navigate
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleEditEntry(selectedEntry)}
                    className="px-2.5 py-1 rounded-lg bg-pine-700 hover:bg-pine-600 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteEntry(selectedEntry)}
                    className="px-2.5 py-1 rounded-lg bg-flare-100 dark:bg-flare-900/40 hover:bg-flare-200 text-flare-700 dark:text-flare-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedEntryId(null)}
                    className="px-1.5 py-1 rounded-lg text-ink/40 hover:text-ink hover:bg-moss cursor-pointer text-xs"
                    title="Deselect (Esc)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Desktop Table View (Clean fixed widths, right-aligned actions, no horizontal scroll) */}
            <div className="hidden md:block w-full">
              <table className="w-full text-left text-xs border-collapse table-fixed">
                <thead>
                  <tr className="bg-moss/70 border-b border-line text-ink/50 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3.5 w-[105px]">Date</th>
                    <th className="py-3 px-3 w-[125px]">Flow / Type</th>
                    <th className="py-3 px-3 w-[185px]">Category / Entity</th>
                    <th className="py-3 px-3">Description / Note</th>
                    <th className="py-3 px-3 w-[170px]">Account</th>
                    <th className="py-3 px-3 w-[130px] text-right">Amount</th>
                    <th className="py-3 px-3.5 w-[85px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {filteredEntries.map((entry) => {
                    const acc = entry.accountId ? accountLookup.get(entry.accountId) : undefined;
                    const toAcc = entry.toAccountId ? accountLookup.get(entry.toAccountId) : undefined;
                    const isOutflow = entry.flow === 'outflow';
                    const isInflow = entry.flow === 'inflow';
                    const isSelected = selectedEntryId === entry.id || txToEdit?.id === entry.originalId;

                    return (
                      <tr
                        key={entry.id}
                        onClick={() => setSelectedEntryId(selectedEntryId === entry.id ? null : entry.id)}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-pine-50/90 dark:bg-pine-950/70 ring-1 ring-inset ring-pine-500 font-medium'
                            : 'hover:bg-moss/40'
                        }`}
                      >
                        {/* Date */}
                        <td className="py-2.5 px-3.5 text-ink/60 font-mono text-xs whitespace-nowrap">
                          {formatReadableDate(entry.date)}
                        </td>

                        {/* Flow / Type */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {renderTypeBadge(entry.type)}
                        </td>

                        {/* Category / Entity / Person */}
                        <td className="py-2.5 px-3">
                          {renderEntityBadge(entry)}
                        </td>

                        {/* Description / Note */}
                        <td className="py-2.5 px-3 min-w-0">
                          <div className="truncate">
                            <span className="font-semibold text-ink">{entry.title}</span>
                            {entry.subtitle && (
                              <span className="text-[11px] text-ink/45 block truncate font-normal">
                                {entry.subtitle}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Account */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {entry.type === 'transfer' && toAcc ? (
                            <div className="flex items-center gap-1 text-[11px] font-medium">
                              <span className="text-ink/75 truncate max-w-[70px]">{acc?.name || 'Account'}</span>
                              <span className="text-ink/40 shrink-0">→</span>
                              <span className="font-bold text-mari-600 truncate max-w-[70px]">{toAcc.name}</span>
                            </div>
                          ) : acc ? (
                            <div className="flex items-center gap-1.5 text-xs text-ink/80 truncate">
                              <Wallet className="w-3 h-3 text-ink/40 shrink-0" />
                              <span className="truncate">{acc.name}</span>
                            </div>
                          ) : (
                            <span className="text-ink/30 italic text-[11px]">Unlinked</span>
                          )}
                        </td>

                        {/* Amount */}
                        <td
                          className={`py-2.5 px-3 text-right font-display font-extrabold text-sm num tabular-nums whitespace-nowrap ${
                            isOutflow
                              ? 'text-flare-600'
                              : isInflow
                              ? 'text-pine-700 dark:text-pine-400'
                              : 'text-ink'
                          }`}
                        >
                          <div>
                            {isOutflow ? '-' : isInflow ? '+' : ''}
                            <AnimatedNumber
                              value={entry.amount}
                              currency={baseCurrency}
                              numberFormat={numberFormat}
                              isPrivacyMode={isPrivacyMode}
                            />
                          </div>
                          {entry.type === 'asset_sale' && entry.realizedGain !== undefined && (
                            <div
                              className={`text-[10px] font-semibold mt-0.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md ${
                                entry.realizedGain >= 0
                                  ? 'text-pine-700 dark:text-pine-300 bg-pine-500/10 border border-pine-500/20'
                                  : 'text-flare-600 dark:text-flare-400 bg-flare-500/10 border border-flare-500/20'
                              }`}
                            >
                              {entry.realizedGain >= 0 ? '📈 Gain: +' : '📉 Loss: -'}
                              {formatCurrency(Math.abs(entry.realizedGain), baseCurrency, numberFormat, isPrivacyMode)}
                            </div>
                          )}
                        </td>

                        {/* Actions (Always right-aligned, fixed width, never moves left) */}
                        <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                          <div
                            className="flex items-center justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleEditEntry(entry)}
                              className="p-1.5 text-ink/40 hover:text-pine-600 hover:bg-pine-50 dark:hover:bg-pine-950/40 rounded-lg cursor-pointer transition-colors"
                              title="Edit entry"
                              aria-label="Edit entry"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEntry(entry)}
                              className="p-1.5 text-ink/40 hover:text-flare-600 hover:bg-flare-50 dark:hover:bg-flare-950/40 rounded-lg cursor-pointer transition-colors"
                              title="Delete entry"
                              aria-label="Delete entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (Zero horizontal scroll, compact and touch-friendly) */}
            <div className="md:hidden divide-y divide-line/60">
              {filteredEntries.map((entry) => {
                const acc = entry.accountId ? accountLookup.get(entry.accountId) : undefined;
                const toAcc = entry.toAccountId ? accountLookup.get(entry.toAccountId) : undefined;
                const isOutflow = entry.flow === 'outflow';
                const isInflow = entry.flow === 'inflow';
                const isSelected = selectedEntryId === entry.id;

                return (
                  <div
                    key={entry.id}
                    onClick={() => setSelectedEntryId(selectedEntryId === entry.id ? null : entry.id)}
                    className={`p-3.5 transition-colors cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-pine-50/90 dark:bg-pine-950/70 ring-1 ring-inset ring-pine-500'
                        : 'hover:bg-moss/40'
                    }`}
                  >
                    {/* Top row: Flow/Type badge + Entity on left, Amount on right */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {renderTypeBadge(entry.type)}
                        <div className="truncate">{renderEntityBadge(entry)}</div>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span
                          className={`font-display font-extrabold text-sm num tabular-nums whitespace-nowrap ${
                            isOutflow
                              ? 'text-flare-600'
                              : isInflow
                              ? 'text-pine-700 dark:text-pine-400'
                              : 'text-ink'
                          }`}
                        >
                          {isOutflow ? '-' : isInflow ? '+' : ''}
                          <AnimatedNumber
                            value={entry.amount}
                            currency={baseCurrency}
                            numberFormat={numberFormat}
                            isPrivacyMode={isPrivacyMode}
                          />
                        </span>
                        {entry.type === 'asset_sale' && entry.realizedGain !== undefined && (
                          <span
                            className={`text-[10px] font-semibold mt-0.5 px-1.5 py-0.5 rounded-md ${
                              entry.realizedGain >= 0
                                ? 'text-pine-700 dark:text-pine-300 bg-pine-500/10 border border-pine-500/20'
                                : 'text-flare-600 dark:text-flare-400 bg-flare-500/10 border border-flare-500/20'
                            }`}
                          >
                            {entry.realizedGain >= 0 ? '📈 +' : '📉 -'}
                            {formatCurrency(Math.abs(entry.realizedGain), baseCurrency, numberFormat, isPrivacyMode)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle row: Title & Subtitle */}
                    <div>
                      <div className="font-semibold text-ink text-xs line-clamp-1">{entry.title}</div>
                      {entry.subtitle && (
                        <div className="text-[11px] text-ink/50 line-clamp-1">{entry.subtitle}</div>
                      )}
                    </div>

                    {/* Bottom row: Date & Account on left, Action buttons on right */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-line/40 text-xs">
                      <div className="flex items-center gap-2 text-ink/60 font-mono text-[11px] min-w-0 truncate">
                        <span>{formatReadableDate(entry.date)}</span>
                        <span>•</span>
                        {entry.type === 'transfer' && toAcc ? (
                          <span className="truncate">
                            {acc?.name} → {toAcc.name}
                          </span>
                        ) : acc ? (
                          <span className="truncate">{acc.name}</span>
                        ) : (
                          <span className="text-ink/30 italic">Unlinked</span>
                        )}
                      </div>

                      <div
                        className="flex items-center gap-1 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => handleEditEntry(entry)}
                          className="p-1.5 text-ink/50 hover:text-pine-600 rounded-lg cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(entry)}
                          className="p-1.5 text-ink/50 hover:text-flare-600 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Quick Add Modal */}
      {isQuickAddOpen && (
        <QuickAddModal isOpen={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} />
      )}

      {/* Edit Transaction Modal */}
      {txToEdit && (
        <EditTransactionModal
          isOpen={Boolean(txToEdit)}
          transaction={txToEdit}
          onClose={() => setTxToEdit(null)}
        />
      )}

      {/* Edit People Entry Modal */}
      {peopleEntryToEdit && (
        <PeopleEntryModal
          isOpen={Boolean(peopleEntryToEdit)}
          onClose={() => setPeopleEntryToEdit(null)}
          entryToEdit={peopleEntryToEdit}
        />
      )}

      {/* Edit Settlement Modal */}
      {settlementToEdit && (
        <EditSettlementModal
          isOpen={Boolean(settlementToEdit)}
          onClose={() => setSettlementToEdit(null)}
          entry={settlementToEdit.entry}
          settlement={settlementToEdit.settlement}
        />
      )}
    </div>
  );
};
