import React, { useState, useMemo, useEffect } from 'react';
import { useVault } from '../context/VaultContext';
import { usePrivacy } from '../context/PrivacyContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { AnimatedNumber } from '../components/common/AnimatedNumber';
import { PeopleEntryModal } from '../components/people/PeopleEntryModal';
import { SettleModal } from '../components/people/SettleModal';
import { ContactModal } from '../components/people/ContactModal';
import { ContactDetailModal } from '../components/people/ContactDetailModal';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { formatReadableDate } from '../utils/dates';
import type { PeopleLedgerEntry, PeopleEntryType } from '../types';
import {
  Users2,
  ArrowUpRight,
  ArrowDownLeft,
  HandCoins,
  Plus,
  Calendar,
  Clock,
  Percent,
  CheckCircle2,
  Trash2,
  Edit2,
  TrendingUp,
  UserPlus,
  AlertCircle,
  Search,
  History,
} from 'lucide-react';

export const PeopleLedgerView: React.FC = () => {
  const { peopleLedger, accounts, activeVault, deletePeopleEntry } = useVault();
  const { isPrivacyMode } = usePrivacy();

  const accountLookup = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const [activeTab, setActiveTab] = useState<'lent' | 'borrowed' | 'holding' | 'contacts'>('lent');
  const [statusFilter, setStatusFilter] = useState<'active' | 'settled'>('active');
  const [settledPage, setSettledPage] = useState(1);
  const SETTLED_PER_PAGE = 15;

  useEffect(() => {
    setSettledPage(1);
  }, [activeTab, statusFilter]);
  const [contactSearch, setContactSearch] = useState('');
  const [selectedContactForDetail, setSelectedContactForDetail] = useState<string | null>(null);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState<{
    name: string;
    phone?: string;
    notes?: string;
  } | null>(null);
  const [entryToEdit, setEntryToEdit] = useState<PeopleLedgerEntry | undefined>(undefined);
  const [initialContactName, setInitialContactName] = useState('');
  const [initialEntryType, setInitialEntryType] = useState<PeopleEntryType>('lent');
  const [selectedEntryForSettlement, setSelectedEntryForSettlement] = useState<PeopleLedgerEntry | null>(null);

  const baseCurrency = activeVault?.currency || 'INR';
  const numberFormat = activeVault?.numberFormat || 'indian';

  // Helper to determine if an entry is active (has remaining balance and not closed)
  const isEntryActive = (entry: PeopleLedgerEntry) => {
    const settled = (entry.settlements || []).reduce((sum, s) => sum + s.amount, 0);
    const remaining = Math.max(0, entry.amount - settled);
    return entry.status !== 'closed' && remaining > 0;
  };

  // Active counts for tab badges
  const activeLentCount = useMemo(() => peopleLedger.filter((e) => e.type === 'lent' && isEntryActive(e)).length, [peopleLedger]);
  const activeBorrowedCount = useMemo(() => peopleLedger.filter((e) => e.type === 'borrowed' && isEntryActive(e)).length, [peopleLedger]);
  const activeHoldingCount = useMemo(() => peopleLedger.filter((e) => e.type === 'holding' && isEntryActive(e)).length, [peopleLedger]);

  const totalLentCount = useMemo(() => peopleLedger.filter((e) => e.type === 'lent').length, [peopleLedger]);
  const totalBorrowedCount = useMemo(() => peopleLedger.filter((e) => e.type === 'borrowed').length, [peopleLedger]);
  const totalHoldingCount = useMemo(() => peopleLedger.filter((e) => e.type === 'holding').length, [peopleLedger]);

  const currentTabActiveCount = useMemo(() => {
    if (activeTab === 'lent') return activeLentCount;
    if (activeTab === 'borrowed') return activeBorrowedCount;
    if (activeTab === 'holding') return activeHoldingCount;
    return 0;
  }, [activeTab, activeLentCount, activeBorrowedCount, activeHoldingCount]);

  const currentTabTotalCount = useMemo(() => {
    if (activeTab === 'lent') return totalLentCount;
    if (activeTab === 'borrowed') return totalBorrowedCount;
    if (activeTab === 'holding') return totalHoldingCount;
    return 0;
  }, [activeTab, totalLentCount, totalBorrowedCount, totalHoldingCount]);

  const currentTabSettledCount = currentTabTotalCount - currentTabActiveCount;

  // Compute summary totals
  const summary = useMemo(() => {
    let totalLent = 0;
    let totalBorrowed = 0;
    let totalHolding = 0;

    peopleLedger.forEach((entry) => {
      const settled = entry.settlements.reduce((sum, s) => sum + s.amount, 0);
      const remaining = Math.max(0, entry.amount - settled);

      if (entry.type === 'lent') totalLent += remaining;
      else if (entry.type === 'borrowed') totalBorrowed += remaining;
      else if (entry.type === 'holding') totalHolding += remaining;
    });

    return {
      totalLent,
      totalBorrowed,
      totalHolding,
      netReceivable: totalLent - totalBorrowed,
    };
  }, [peopleLedger]);

  // Detect entries imported from statements for easy 1-click cleanup if previously undone
  const statementEntries = useMemo(() => {
    return peopleLedger.filter(
      (p) =>
        Boolean(p.importBatchId) ||
        Boolean(p.notes?.includes('Imported from statement:')) ||
        Boolean(p.notes?.includes('Settled on import:'))
    );
  }, [peopleLedger]);

  // Filter entries for active tab based on statusFilter (active by default)
  const filteredEntries = useMemo(() => {
    if (activeTab === 'contacts') return [];
    const entriesOfType = peopleLedger.filter((e) => e.type === activeTab);
    if (statusFilter === 'active') {
      return entriesOfType.filter(isEntryActive);
    }
    if (statusFilter === 'settled') {
      return entriesOfType.filter((e) => !isEntryActive(e));
    }
    return entriesOfType;
  }, [peopleLedger, activeTab, statusFilter]);

  const totalSettledPages = Math.max(1, Math.ceil(filteredEntries.length / SETTLED_PER_PAGE));
  const paginatedSettledEntries = useMemo(() => {
    if (statusFilter !== 'settled') return filteredEntries;
    const start = (settledPage - 1) * SETTLED_PER_PAGE;
    return filteredEntries.slice(start, start + SETTLED_PER_PAGE);
  }, [filteredEntries, statusFilter, settledPage]);

  // Aggregate by contact for the Contacts tab
  const contactAggregates = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        phone?: string;
        notes?: string;
        lent: number;
        borrowed: number;
        holding: number;
        entries: PeopleLedgerEntry[];
      }
    >();

    peopleLedger.forEach((entry) => {
      const settled = entry.settlements.reduce((sum, s) => sum + s.amount, 0);
      const remaining = Math.max(0, entry.amount - settled);
      const name = entry.contactName.trim();

      const existing = map.get(name) || {
        name,
        phone: entry.contactPhone,
        notes: entry.notes,
        lent: 0,
        borrowed: 0,
        holding: 0,
        entries: [],
      };
      if (entry.contactPhone && !existing.phone) existing.phone = entry.contactPhone;
      if (entry.notes && !existing.notes) existing.notes = entry.notes;

      if (entry.type === 'lent') existing.lent += remaining;
      if (entry.type === 'borrowed') existing.borrowed += remaining;
      if (entry.type === 'holding') existing.holding += remaining;
      existing.entries.push(entry);

      map.set(name, existing);
    });

    return Array.from(map.values()).sort((a, b) => {
      const aBal = a.lent + a.borrowed + a.holding;
      const bBal = b.lent + b.borrowed + b.holding;
      if (aBal > 0 && bBal === 0) return -1;
      if (bBal > 0 && aBal === 0) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [peopleLedger]);

  // Filter contacts by search query
  const filteredContacts = useMemo(() => {
    if (!contactSearch.trim()) return contactAggregates;
    const q = contactSearch.trim().toLowerCase();
    return contactAggregates.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q))
    );
  }, [contactAggregates, contactSearch]);

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Delete entry for "${name}"?`)) {
      await deletePeopleEntry(id);
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6 w-full max-w-[1600px] mx-auto px-1 sm:px-2 pb-16 anim-fade">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 grid place-items-center text-pine-600">
              <Users2 className="w-4 h-4" />
            </span>
            <h1 className="font-display font-extrabold text-[22px] sm:text-[24px] tracking-tight text-ink">
              People Ledger (Lent, Borrowed & Holding)
            </h1>
          </div>
          <p className="text-xs text-ink/50 mt-1">
            Track informal loans with friends, family, and custodial holding funds with zero bank sync
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              setContactToEdit(null);
              setIsContactModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-card hover:bg-moss text-ink border border-line text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <UserPlus className="w-3.5 h-3.5 text-pine-600" />
            <span>Add Contact</span>
          </button>

          <button
            onClick={() => {
              setEntryToEdit(undefined);
              setInitialContactName('');
              setInitialEntryType('lent');
              setIsEntryModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-pine-700 hover:bg-pine-600 active:scale-[0.97] text-white text-xs font-bold shadow-sm shadow-pine-900/20 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Entry</span>
          </button>
        </div>
      </div>

      {/* Statement Import Cleanup Banner */}
      {statementEntries.length > 0 && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-amber-800 dark:text-amber-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <span className="font-bold">Detected {statementEntries.length} statement-imported people record(s).</span>
              <span className="text-ink/60 block sm:inline sm:ml-1">
                If you recently undid an import, you can roll back and remove these leftover entries and restore linked account balances with 1 click.
              </span>
            </div>
          </div>
          <button
            onClick={async () => {
              if (
                window.confirm(
                  `Clean up all ${statementEntries.length} statement import record(s)? This will delete them and restore account balances.`
                )
              ) {
                for (const entry of statementEntries) {
                  await deletePeopleEntry(entry.id);
                }
              }
            }}
            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shrink-0 shadow-xs transition-colors cursor-pointer"
          >
            Clean Up Statement Entries
          </button>
        </div>
      )}

      {/* Hero Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-line bg-card p-4 sm:p-5 shadow-sm lift">
          <div className="flex justify-between items-center">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-pine-700 dark:text-pine-400">
              You Are Owed (Lent)
            </span>
            <ArrowUpRight className="w-4 h-4 text-pine-600" />
          </div>
          <div className="font-display font-extrabold text-xl sm:text-2xl num text-pine-700 dark:text-pine-400 mt-1">
            <AnimatedNumber
              value={summary.totalLent}
              currency={baseCurrency}
              numberFormat={numberFormat}
              isPrivacyMode={isPrivacyMode}
            />
          </div>
          <span className="text-[11px] text-ink/45 block mt-0.5">Receivable from peers</span>
        </div>

        <div className="rounded-2xl border border-line bg-card p-4 sm:p-5 shadow-sm lift">
          <div className="flex justify-between items-center">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-flare-600">
              You Owe (Borrowed)
            </span>
            <ArrowDownLeft className="w-4 h-4 text-flare-600" />
          </div>
          <div className="font-display font-extrabold text-xl sm:text-2xl num text-flare-600 mt-1">
            <AnimatedNumber
              value={summary.totalBorrowed}
              currency={baseCurrency}
              numberFormat={numberFormat}
              isPrivacyMode={isPrivacyMode}
            />
          </div>
          <span className="text-[11px] text-ink/45 block mt-0.5">Payable to friends & family</span>
        </div>

        <div className="rounded-2xl border border-line bg-card p-4 sm:p-5 shadow-sm lift">
          <div className="flex justify-between items-center">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-mari-600">
              Holding For Others
            </span>
            <HandCoins className="w-4 h-4 text-mari-600" />
          </div>
          <div className="font-display font-extrabold text-xl sm:text-2xl num text-ink mt-1">
            <AnimatedNumber
              value={summary.totalHolding}
              currency={baseCurrency}
              numberFormat={numberFormat}
              isPrivacyMode={isPrivacyMode}
            />
          </div>
          <span className="text-[11px] text-ink/45 block mt-0.5">Custodial deposits in accounts</span>
        </div>

        <div className="rounded-2xl border border-line bg-card p-4 sm:p-5 shadow-sm lift">
          <div className="flex justify-between items-center">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink">
              Net Position
            </span>
            <TrendingUp className="w-4 h-4 text-pine-600" />
          </div>
          <div
            className={`font-display font-extrabold text-xl sm:text-2xl num mt-1 ${
              summary.netReceivable >= 0
                ? 'text-pine-700 dark:text-pine-400'
                : 'text-flare-600'
            }`}
          >
            <AnimatedNumber
              value={summary.netReceivable}
              currency={baseCurrency}
              numberFormat={numberFormat}
              isPrivacyMode={isPrivacyMode}
            />
          </div>
          <span className="text-[11px] text-ink/45 block mt-0.5">Lent minus borrowed balance</span>
        </div>
      </div>

      {/* Segmented Tab Controls */}
      <div className="flex items-center gap-1 p-1 bg-moss/80 rounded-xl max-w-lg border border-line overflow-x-auto">
        {[
          { id: 'lent', label: `Money Lent (${activeLentCount})` },
          { id: 'borrowed', label: `Borrowed (${activeBorrowedCount})` },
          { id: 'holding', label: `Holding (${activeHoldingCount})` },
          { id: 'contacts', label: `Contacts (${contactAggregates.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-card text-ink font-bold shadow-xs border border-line'
                : 'text-ink/60 hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ENTRIES LIST VIEW */}
      {activeTab !== 'contacts' && (
        <div className="space-y-4">
          {/* Status Segmented Toggle: Active Only (default) | Settled | All */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/60 p-2 rounded-2xl border border-line">
            <div className="flex items-center gap-1 p-1 bg-moss/80 dark:bg-moss/30 rounded-xl border border-line text-xs font-semibold">
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'active'
                    ? 'bg-card text-ink font-bold shadow-2xs border border-line'
                    : 'text-ink/60 hover:text-ink'
                }`}
              >
                Active Only ({currentTabActiveCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('settled')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'settled'
                    ? 'bg-card text-ink font-bold shadow-2xs border border-line'
                    : 'text-ink/60 hover:text-ink'
                }`}
              >
                Settled ({currentTabSettledCount})
              </button>
            </div>

            {statusFilter === 'active' && currentTabSettledCount > 0 && (
              <span className="text-[11px] text-ink/50 px-2 hidden sm:inline">
                Hiding {currentTabSettledCount} settled ₹0 balance record(s) to reduce clutter.
              </span>
            )}
          </div>

          {filteredEntries.length === 0 ? (
            <Card className="text-center py-12 text-xs space-y-3 lift">
              <div className="w-12 h-12 rounded-2xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 grid place-items-center mx-auto text-pine-600">
                <Users2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm text-ink">
                  {statusFilter === 'active' && currentTabSettledCount > 0
                    ? `No active ${activeTab} entries`
                    : `No ${statusFilter} ${activeTab} entries recorded`}
                </h3>
                <p className="text-xs text-ink/50 mt-1 max-w-sm mx-auto">
                  {statusFilter === 'active' && currentTabSettledCount > 0
                    ? `All ${currentTabSettledCount} ${activeTab} entries are currently fully settled.`
                    : 'Keep informal lending, borrowing, and custodial money clear and auditable.'}
                </p>
              </div>
              {statusFilter === 'active' && currentTabSettledCount > 0 ? (
                <button
                  onClick={() => setStatusFilter('settled')}
                  className="px-4 py-2 rounded-xl bg-card hover:bg-moss border border-line text-ink text-xs font-bold shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>View {currentTabSettledCount} Settled Entries</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setEntryToEdit(undefined);
                    setIsEntryModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-pine-700 text-white text-xs font-bold shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Entry</span>
                </button>
              )}
            </Card>
          ) : statusFilter === 'settled' ? (
            <div className="rounded-2xl border border-line bg-card overflow-hidden shadow-sm lift">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-line bg-moss/50 text-[11px] font-bold text-ink/50 uppercase tracking-wider">
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Original Amount</th>
                      <th className="py-3 px-4">Settled Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Note / Reason</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-xs">
                    {paginatedSettledEntries.map((entry) => {
                      const totalSettled = entry.settlements.reduce((sum, s) => sum + s.amount, 0);
                      return (
                        <tr key={entry.id} className="hover:bg-moss/40 transition-colors">
                          <td className="py-3 px-4 font-semibold text-ink">
                            <button
                              type="button"
                              onClick={() => setSelectedContactForDetail(entry.contactName)}
                              className="hover:text-pine-600 hover:underline flex items-center gap-2 cursor-pointer text-left"
                            >
                              <span className="w-6 h-6 rounded-lg bg-pine-50 dark:bg-pine-950/40 text-pine-600 border border-pine-200/60 dark:border-pine-800/40 flex items-center justify-center font-bold text-[10px] shrink-0">
                                {getInitials(entry.contactName)}
                              </span>
                              <span className="truncate">{entry.contactName}</span>
                            </button>
                          </td>
                          <td className="py-3 px-4 text-ink/60 num font-mono text-[11.5px]">
                            {formatReadableDate(entry.date)}
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-ink/70 num">
                            {formatCurrency(entry.amount, entry.currency, numberFormat, isPrivacyMode)}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-pine-700 dark:text-pine-400 num">
                            {formatCurrency(totalSettled, entry.currency, numberFormat, isPrivacyMode)}
                          </td>
                          <td className="py-3 px-4">
                            <Badge tone="pine" size="xs">Settled (₹0)</Badge>
                          </td>
                          <td className="py-3 px-4 text-ink/60 max-w-[200px] truncate text-[11.5px]">
                            {entry.notes || '—'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setSelectedContactForDetail(entry.contactName)}
                                className="p-1 rounded-lg text-ink/50 hover:text-ink hover:bg-moss cursor-pointer"
                                title="View Contact History"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEntryToEdit(entry);
                                  setIsEntryModalOpen(true);
                                }}
                                className="p-1 rounded-lg text-ink/50 hover:text-ink hover:bg-moss cursor-pointer"
                                title="Edit Entry"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(entry.id, entry.contactName)}
                                className="p-1 rounded-lg text-ink/40 hover:text-flare-600 hover:bg-flare-50 dark:hover:bg-flare-900/20 cursor-pointer"
                                title="Delete Entry"
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

              {/* Pagination controls */}
              {totalSettledPages > 1 && (
                <div className="p-3 border-t border-line flex items-center justify-between text-xs bg-moss/30">
                  <span className="text-ink/60">
                    Showing {(settledPage - 1) * SETTLED_PER_PAGE + 1} to{' '}
                    {Math.min(settledPage * SETTLED_PER_PAGE, filteredEntries.length)} of {filteredEntries.length} settled records
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={settledPage <= 1}
                      onClick={() => setSettledPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 rounded-lg border border-line bg-card hover:bg-moss disabled:opacity-40 disabled:pointer-events-none font-semibold text-ink cursor-pointer"
                    >
                      Previous
                    </button>
                    <span className="font-mono font-bold text-ink px-2">
                      {settledPage} / {totalSettledPages}
                    </span>
                    <button
                      type="button"
                      disabled={settledPage >= totalSettledPages}
                      onClick={() => setSettledPage((p) => Math.min(totalSettledPages, p + 1))}
                      className="px-2.5 py-1 rounded-lg border border-line bg-card hover:bg-moss disabled:opacity-40 disabled:pointer-events-none font-semibold text-ink cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredEntries.map((entry) => {
                const totalSettled = entry.settlements.reduce((sum, s) => sum + s.amount, 0);
                const remainingDue = Math.max(0, entry.amount - totalSettled);
                const progressPct = entry.amount > 0 ? (totalSettled / entry.amount) * 100 : 0;
                const isClosed = remainingDue <= 0;

                return (
                  <div
                    key={entry.id}
                    className="rounded-2xl border border-line bg-card p-4 sm:p-5 space-y-3.5 shadow-sm lift flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Avatar Initials Circle */}
                          <button
                            type="button"
                            onClick={() => setSelectedContactForDetail(entry.contactName)}
                            className="w-9 h-9 rounded-xl bg-pine-50 dark:bg-pine-950/40 text-pine-600 border border-pine-200/60 dark:border-pine-800/40 flex items-center justify-center font-bold text-xs flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
                            title="View contact detail & full history"
                          >
                            {getInitials(entry.contactName)}
                          </button>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedContactForDetail(entry.contactName)}
                                className="font-display font-bold text-sm text-ink hover:text-pine-600 dark:hover:text-pine-400 truncate text-left cursor-pointer transition-colors"
                                title="View contact detail & full history"
                              >
                                {entry.contactName}
                              </button>
                              {isClosed ? (
                                <Badge tone="pine" size="xs">
                                  Settled
                                </Badge>
                              ) : (
                                <Badge
                                  tone={
                                    entry.type === 'lent'
                                      ? 'pine'
                                      : entry.type === 'borrowed'
                                      ? 'flare'
                                      : 'sky'
                                  }
                                  size="xs"
                                >
                                  Active
                                </Badge>
                              )}
                            </div>
                            {entry.contactPhone && (
                              <span className="text-[11px] text-ink/45 block mt-0.5">
                                {entry.contactPhone}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button
                            onClick={() => {
                              setEntryToEdit(entry);
                              setIsEntryModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-ink/40 hover:text-ink transition-colors cursor-pointer"
                            title="Edit entry"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id, entry.contactName)}
                            className="p-1.5 rounded-lg text-ink/40 hover:text-flare-600 transition-colors cursor-pointer"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Balances */}
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div>
                          <span className="text-[10px] text-ink/45 font-bold uppercase tracking-wider block">
                            Remaining Due
                          </span>
                          <div
                            className={`font-display font-extrabold text-xl num mt-0.5 ${
                              isClosed
                                ? 'text-ink/40 line-through'
                                : entry.type === 'lent'
                                ? 'text-pine-700 dark:text-pine-400'
                                : entry.type === 'borrowed'
                                ? 'text-flare-600'
                                : 'text-ink'
                            }`}
                          >
                            <AnimatedNumber
                              value={remainingDue}
                              currency={entry.currency}
                              numberFormat={numberFormat}
                              isPrivacyMode={isPrivacyMode}
                            />
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-ink/45 font-bold uppercase tracking-wider block">
                            Original Amount
                          </span>
                          <div className="font-display font-extrabold text-xl num text-ink/70 mt-0.5">
                            <AnimatedNumber
                              value={entry.amount}
                              currency={entry.currency}
                              numberFormat={numberFormat}
                              isPrivacyMode={isPrivacyMode}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Repayment Progress Bar */}
                      {entry.amount > 0 && !isClosed && totalSettled > 0 && (
                        <div className="space-y-1 mt-3">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-ink/45">Repaid {formatPercent(progressPct)}</span>
                            <span className="text-ink/65 font-mono tabular-nums num">
                              {formatCurrency(totalSettled, entry.currency, numberFormat, isPrivacyMode)} settled
                            </span>
                          </div>
                          <div className="w-full bg-moss h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-pine-600 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, progressPct)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Metadata row */}
                      <div className="flex flex-wrap items-center gap-3 pt-2.5 mt-2 text-xs text-ink/50 border-t border-line">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-ink/40" />
                          <span>Logged: {formatReadableDate(entry.date)}</span>
                        </div>

                        {entry.dueDate && (
                          <div className="flex items-center gap-1 text-mari-600 font-semibold">
                            <Clock className="w-3 h-3" />
                            <span>Due: {formatReadableDate(entry.dueDate)}</span>
                          </div>
                        )}

                        {entry.interestRate ? (
                          <div className="flex items-center gap-1">
                            <Percent className="w-3 h-3 text-ink/40" />
                            <span>{entry.interestRate}% p.a.</span>
                          </div>
                        ) : null}
                      </div>

                      {entry.notes && (
                        <p className="text-xs text-ink/55 italic bg-moss/60 p-2 rounded-xl mt-2">
                          "{entry.notes}"
                        </p>
                      )}
                    </div>

                    {/* Settle Action Bar */}
                    <div className="pt-2.5 border-t border-line flex items-center justify-between">
                      {entry.settlements.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setSelectedContactForDetail(entry.contactName)}
                          className="text-[11px] text-pine-700 dark:text-pine-400 hover:underline font-semibold cursor-pointer"
                          title="View settlements & contact history"
                        >
                          {entry.settlements.length} settlement(s) logged →
                        </button>
                      ) : (
                        <span className="text-[11px] text-ink/45 font-medium">
                          0 settlements logged
                        </span>
                      )}

                      {!isClosed && (
                        <button
                          onClick={() => setSelectedEntryForSettlement(entry)}
                          className="px-2.5 py-1 rounded-lg bg-moss hover:bg-pine-50 text-pine-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-pine-600" />
                          <span>Record Settlement</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CONTACTS AGGREGATE VIEW */}
      {activeTab === 'contacts' && (
        <div className="space-y-4">
          {/* Contact Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/60 p-2.5 rounded-2xl border border-line">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
              <input
                type="text"
                placeholder="Search contacts by name, phone, notes..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-line bg-card text-xs text-ink placeholder:text-ink/40 focus:outline-none focus:ring-1 focus:ring-pine-500"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-ink/50 font-medium">
              <span>
                Showing {filteredContacts.length} of {contactAggregates.length} contact(s)
              </span>
              {contactSearch && (
                <button
                  type="button"
                  onClick={() => setContactSearch('')}
                  className="text-pine-700 dark:text-pine-400 hover:underline font-bold cursor-pointer"
                >
                  Clear search
                </button>
              )}
            </div>
          </div>

          {filteredContacts.length === 0 ? (
            <Card className="text-center py-12 text-xs space-y-3 lift">
              <Users2 className="w-10 h-10 mx-auto text-pine-600" />
              <p className="font-display font-bold text-sm text-ink">
                {contactSearch ? `No contacts matching "${contactSearch}"` : 'No contacts recorded yet'}
              </p>
              {contactSearch && (
                <button
                  onClick={() => setContactSearch('')}
                  className="px-3 py-1.5 rounded-xl bg-card border border-line text-xs font-semibold cursor-pointer"
                >
                  Reset search filter
                </button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.name}
                  className="rounded-2xl border border-line bg-card p-4 sm:p-5 space-y-3 shadow-sm lift flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => setSelectedContactForDetail(contact.name)}
                          className="w-10 h-10 rounded-xl bg-pine-50 dark:bg-pine-950/40 text-pine-600 border border-pine-200/60 dark:border-pine-800/40 flex items-center justify-center font-bold text-sm shrink-0 cursor-pointer hover:scale-105 transition-transform"
                          title="View full history & ledger"
                        >
                          {getInitials(contact.name)}
                        </button>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setSelectedContactForDetail(contact.name)}
                            className="font-display font-bold text-sm text-ink hover:text-pine-600 dark:hover:text-pine-400 text-left truncate block cursor-pointer transition-colors"
                            title="View full history & ledger"
                          >
                            {contact.name}
                          </button>
                          <div className="flex items-center gap-2 mt-0.5">
                            {contact.phone && (
                              <span className="text-[11px] text-ink/50 font-mono">
                                {contact.phone}
                              </span>
                            )}
                            <span className="text-[10.5px] text-ink/40">
                              {contact.entries.length === 1 && contact.entries[0].amount === 0
                                ? 'Directory Profile'
                                : `${contact.entries.length} records`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setContactToEdit({
                              name: contact.name,
                              phone: contact.phone,
                              notes: contact.notes,
                            });
                            setIsContactModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-ink/40 hover:text-ink hover:bg-moss transition-colors cursor-pointer"
                          title="Edit contact profile (name, phone, notes)"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {contact.entries.length > 0 && (
                          <button
                            onClick={async () => {
                              const hasActiveBal = contact.lent > 0 || contact.borrowed > 0 || contact.holding > 0;
                              const confirmMsg = hasActiveBal
                                ? `Delete contact "${contact.name}" and all ${contact.entries.length} associated record(s)? Linked account balances will be restored.`
                                : `Delete contact profile "${contact.name}"?`;
                              if (window.confirm(confirmMsg)) {
                                for (const entry of contact.entries) {
                                  await deletePeopleEntry(entry.id);
                                }
                              }
                            }}
                            className="p-1.5 rounded-lg text-ink/30 hover:text-flare-600 hover:bg-flare-50 dark:hover:bg-flare-950/40 transition-colors cursor-pointer"
                            title="Delete contact and records"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {contact.notes && (
                      <p className="text-[11px] text-ink/55 italic bg-moss/50 px-2.5 py-1.5 rounded-xl">
                        {contact.notes}
                      </p>
                    )}

                    <div className="space-y-1.5 pt-2 border-t border-line text-xs">
                      {contact.lent > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-ink/60">Owed to you:</span>
                          <span className="font-display font-extrabold text-pine-700 dark:text-pine-400 num">
                            {formatCurrency(contact.lent, baseCurrency, numberFormat, isPrivacyMode)}
                          </span>
                        </div>
                      )}
                      {contact.borrowed > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-ink/60">You owe:</span>
                          <span className="font-display font-extrabold text-flare-600 num">
                            {formatCurrency(contact.borrowed, baseCurrency, numberFormat, isPrivacyMode)}
                          </span>
                        </div>
                      )}
                      {contact.holding > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-ink/60">Holding:</span>
                          <span className="font-display font-extrabold text-ink num">
                            {formatCurrency(contact.holding, baseCurrency, numberFormat, isPrivacyMode)}
                          </span>
                        </div>
                      )}
                      {contact.lent === 0 && contact.borrowed === 0 && contact.holding === 0 && (
                        <div className="flex items-center justify-between py-1">
                          <span className="text-[11px] text-ink/50">Ledger status</span>
                          <Badge tone="pine" size="xs">
                            ✨ All Clear / ₹0 Balance
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* View History & Full Ledger Button */}
                    <button
                      type="button"
                      onClick={() => setSelectedContactForDetail(contact.name)}
                      className="w-full py-1.5 px-3 rounded-xl bg-moss/70 hover:bg-card text-ink border border-line text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs hover:shadow-xs mt-1"
                    >
                      <Clock className="w-3.5 h-3.5 text-pine-600" />
                      <span>View History & Full Ledger</span>
                    </button>
                  </div>

                  {/* Quick Actions Bar */}
                  <div className="pt-2.5 border-t border-line flex items-center justify-between gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink/40">
                      Quick Log:
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEntryToEdit(undefined);
                          setInitialContactName(contact.name);
                          setInitialEntryType('lent');
                          setIsEntryModalOpen(true);
                        }}
                        className="px-2 py-1 rounded-lg bg-pine-50 dark:bg-pine-950/40 text-pine-700 dark:text-pine-300 hover:bg-pine-100 dark:hover:bg-pine-900 text-[11px] font-bold border border-pine-200/60 dark:border-pine-800/40 cursor-pointer transition-colors"
                      >
                        + Lent
                      </button>
                      <button
                        onClick={() => {
                          setEntryToEdit(undefined);
                          setInitialContactName(contact.name);
                          setInitialEntryType('borrowed');
                          setIsEntryModalOpen(true);
                        }}
                        className="px-2 py-1 rounded-lg bg-flare-50 dark:bg-flare-950/40 text-flare-700 dark:text-flare-300 hover:bg-flare-100 dark:hover:bg-flare-900 text-[11px] font-bold border border-flare-200/60 dark:border-flare-800/40 cursor-pointer transition-colors"
                      >
                        + Borrowed
                      </button>
                      <button
                        onClick={() => {
                          setEntryToEdit(undefined);
                          setInitialContactName(contact.name);
                          setInitialEntryType('holding');
                          setIsEntryModalOpen(true);
                        }}
                        className="px-2 py-1 rounded-lg bg-moss hover:bg-card text-ink/75 hover:text-ink text-[11px] font-bold border border-line cursor-pointer transition-colors"
                      >
                        + Holding
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Entry Modal */}
      {isEntryModalOpen && (
        <PeopleEntryModal
          isOpen={isEntryModalOpen}
          onClose={() => setIsEntryModalOpen(false)}
          entryToEdit={entryToEdit}
          initialType={initialEntryType}
          initialContactName={initialContactName}
        />
      )}

      {/* Contact Profile Modal (0 Balance or Edit) */}
      {isContactModalOpen && (
        <ContactModal
          isOpen={isContactModalOpen}
          onClose={() => {
            setIsContactModalOpen(false);
            setContactToEdit(null);
          }}
          contactToEdit={contactToEdit}
          onSuccess={(newName) => {
            setActiveTab('contacts');
            setContactToEdit(null);
          }}
        />
      )}

      {/* Settle Modal */}
      {selectedEntryForSettlement && (
        <SettleModal
          isOpen={Boolean(selectedEntryForSettlement)}
          onClose={() => setSelectedEntryForSettlement(null)}
          entry={selectedEntryForSettlement}
        />
      )}

      {/* Contact Detail & History Modal */}
      {selectedContactForDetail && (
        <ContactDetailModal
          isOpen={Boolean(selectedContactForDetail)}
          onClose={() => setSelectedContactForDetail(null)}
          contactName={selectedContactForDetail}
        />
      )}
    </div>
  );
};
