import React, { useState, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { useVault } from '../../context/VaultContext';
import { usePrivacy } from '../../context/PrivacyContext';
import { PeopleEntryModal } from './PeopleEntryModal';
import { EditSettlementModal } from './EditSettlementModal';
import { SettleModal } from './SettleModal';
import { ContactModal } from './ContactModal';
import { formatCurrency } from '../../utils/formatters';
import { formatReadableDate } from '../../utils/dates';
import type { PeopleLedgerEntry, SettlementRecord, PeopleEntryType } from '../../types';
import {
  Users2,
  ArrowUpRight,
  ArrowDownLeft,
  HandCoins,
  Download,
  Edit2,
  Trash2,
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  Landmark,
  FileSpreadsheet,
} from 'lucide-react';

interface ContactDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactName: string;
}

interface TimelineItem {
  id: string;
  source: 'entry' | 'settlement';
  date: string;
  amount: number;
  typeLabel: string;
  flow: 'inflow' | 'outflow';
  parentType: PeopleEntryType;
  accountId?: string;
  notes?: string;
  status?: string;
  rawEntry: PeopleLedgerEntry;
  rawSettlement?: SettlementRecord;
}

export const ContactDetailModal: React.FC<ContactDetailModalProps> = ({
  isOpen,
  onClose,
  contactName,
}) => {
  const { peopleLedger, accounts, activeVault, deletePeopleEntry, deleteSettlement } = useVault();
  const { isPrivacyMode } = usePrivacy();

  const [entryToEdit, setEntryToEdit] = useState<PeopleLedgerEntry | undefined>(undefined);
  const [settlementToEdit, setSettlementToEdit] = useState<{
    entry: PeopleLedgerEntry;
    settlement: SettlementRecord;
  } | null>(null);
  const [entryToSettle, setEntryToSettle] = useState<PeopleLedgerEntry | null>(null);
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
  const [newEntryType, setNewEntryType] = useState<PeopleEntryType>('lent');
  const [isContactEditOpen, setIsContactEditOpen] = useState(false);
  const [currentContactName, setCurrentContactName] = useState(contactName);

  React.useEffect(() => {
    setCurrentContactName(contactName);
  }, [contactName]);

  const baseCurrency = activeVault?.currency || 'INR';
  const numberFormat = activeVault?.numberFormat || 'indian';
  const accountLookup = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  // Find all entries for this contact
  const contactEntries = useMemo(() => {
    const target = currentContactName.trim().toLowerCase();
    return peopleLedger.filter((e) => e.contactName.trim().toLowerCase() === target);
  }, [peopleLedger, currentContactName]);

  // Contact profile details
  const contactProfile = useMemo(() => {
    const firstWithPhone = contactEntries.find((e) => e.contactPhone);
    const firstWithNotes = contactEntries.find((e) => e.notes);
    return {
      name: currentContactName,
      phone: firstWithPhone?.contactPhone,
      notes: firstWithNotes?.notes,
    };
  }, [contactEntries, currentContactName]);

  // Financial summary
  const summary = useMemo(() => {
    let totalLent = 0;
    let totalBorrowed = 0;
    let totalHolding = 0;

    contactEntries.forEach((entry) => {
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
  }, [contactEntries]);

  // Timeline synthesis: all initial entries and their settlements sorted by date descending
  const timeline: TimelineItem[] = useMemo(() => {
    const items: TimelineItem[] = [];

    contactEntries.forEach((entry) => {
      // 1. Initial entry
      if (entry.amount > 0) {
        items.push({
          id: `entry_${entry.id}`,
          source: 'entry',
          date: entry.date,
          amount: entry.amount,
          typeLabel:
            entry.type === 'lent'
              ? 'Lent Out'
              : entry.type === 'borrowed'
              ? 'Borrowed In'
              : 'Custodial Deposit In',
          flow: entry.type === 'lent' ? 'outflow' : 'inflow',
          parentType: entry.type,
          accountId: entry.accountId,
          notes: entry.notes,
          status: entry.status,
          rawEntry: entry,
        });
      }

      // 2. Settlements
      entry.settlements.forEach((s) => {
        items.push({
          id: `settle_${s.id}`,
          source: 'settlement',
          date: s.date,
          amount: s.amount,
          typeLabel:
            entry.type === 'lent'
              ? 'Repayment Received'
              : entry.type === 'borrowed'
              ? 'Loan Repaid'
              : 'Holding Returned',
          flow: entry.type === 'lent' ? 'inflow' : 'outflow',
          parentType: entry.type,
          accountId: s.accountId,
          notes: s.note,
          rawEntry: entry,
          rawSettlement: s,
        });
      });
    });

    return items.sort((a, b) => b.date.localeCompare(a.date));
  }, [contactEntries]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Date', 'Type', 'Flow', 'Amount', 'Currency', 'Account', 'Notes', 'Status'];
    const rows = timeline.map((item) => {
      const acc = item.accountId ? accountLookup.get(item.accountId)?.name || 'Linked Account' : 'None';
      return [
        item.date,
        `"${item.typeLabel}"`,
        item.flow.toUpperCase(),
        item.amount.toFixed(2),
        baseCurrency,
        `"${acc}"`,
        `"${(item.notes || '').replace(/"/g, '""')}"`,
        item.status || '',
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${currentContactName.replace(/\s+/g, '_')}_ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pine-50 dark:bg-pine-950/40 text-pine-700 dark:text-pine-400 border border-pine-200/60 dark:border-pine-800/40 flex items-center justify-center font-bold text-sm shrink-0">
              {getInitials(currentContactName)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-base sm:text-lg text-ink">
                  {currentContactName}
                </span>
                <button
                  type="button"
                  onClick={() => setIsContactEditOpen(true)}
                  className="p-1 rounded-md text-ink/40 hover:text-ink hover:bg-moss transition-colors"
                  title="Edit contact info"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {contactProfile.phone && (
                <span className="text-xs text-ink/50 font-mono block">
                  {contactProfile.phone}
                </span>
              )}
            </div>
          </div>
        }
        description="Complete chronological transaction timeline, settlements, and ledger position"
        maxWidth="2xl"
      >
        <div className="space-y-5">
          {/* Quick Action Buttons */}
          <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-line">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => {
                  setNewEntryType('lent');
                  setIsNewEntryOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-pine-50 dark:bg-pine-950/40 text-pine-700 dark:text-pine-300 hover:bg-pine-100 dark:hover:bg-pine-900 text-xs font-bold border border-pine-200/60 dark:border-pine-800/40 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Lend Money</span>
              </button>

              <button
                onClick={() => {
                  setNewEntryType('borrowed');
                  setIsNewEntryOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-flare-50 dark:bg-flare-950/40 text-flare-700 dark:text-flare-300 hover:bg-flare-100 dark:hover:bg-flare-900 text-xs font-bold border border-flare-200/60 dark:border-flare-800/40 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Borrow Money</span>
              </button>

              <button
                onClick={() => {
                  setNewEntryType('holding');
                  setIsNewEntryOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900 text-xs font-bold border border-sky-200/60 dark:border-sky-800/40 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Holding Funds</span>
              </button>
            </div>

            {timeline.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 rounded-xl bg-card hover:bg-moss text-ink border border-line text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Download contact ledger as CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-pine-600" />
                <span>Export CSV</span>
              </button>
            )}
          </div>

          {/* Contact Notes if any */}
          {contactProfile.notes && (
            <div className="p-3 rounded-xl bg-moss/50 border border-line text-xs text-ink/70 italic">
              "{contactProfile.notes}"
            </div>
          )}

          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl border border-line bg-card">
              <span className="text-[10px] font-bold uppercase tracking-wider text-pine-700 dark:text-pine-400 block">
                You Lent
              </span>
              <div className="font-display font-extrabold text-base sm:text-lg text-pine-700 dark:text-pine-400 mt-0.5">
                <AnimatedNumber
                  value={summary.totalLent}
                  currency={baseCurrency}
                  numberFormat={numberFormat}
                  isPrivacyMode={isPrivacyMode}
                />
              </div>
            </div>

            <div className="p-3 rounded-xl border border-line bg-card">
              <span className="text-[10px] font-bold uppercase tracking-wider text-flare-600 block">
                You Borrowed
              </span>
              <div className="font-display font-extrabold text-base sm:text-lg text-flare-600 mt-0.5">
                <AnimatedNumber
                  value={summary.totalBorrowed}
                  currency={baseCurrency}
                  numberFormat={numberFormat}
                  isPrivacyMode={isPrivacyMode}
                />
              </div>
            </div>

            <div className="p-3 rounded-xl border border-line bg-card">
              <span className="text-[10px] font-bold uppercase tracking-wider text-mari-600 block">
                Holding
              </span>
              <div className="font-display font-extrabold text-base sm:text-lg text-ink mt-0.5">
                <AnimatedNumber
                  value={summary.totalHolding}
                  currency={baseCurrency}
                  numberFormat={numberFormat}
                  isPrivacyMode={isPrivacyMode}
                />
              </div>
            </div>

            <div className="p-3 rounded-xl border border-line bg-card">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink/60 block">
                Net Balance
              </span>
              <div
                className={`font-display font-extrabold text-base sm:text-lg mt-0.5 ${
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
            </div>
          </div>

          {/* Chronological Timeline */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-display font-bold text-xs uppercase tracking-wider text-ink/60">
                Timeline & History ({timeline.length} events)
              </h4>
            </div>

            {timeline.length === 0 ? (
              <div className="text-center py-8 text-xs text-ink/50 bg-moss/30 rounded-2xl border border-dashed border-line space-y-1">
                <Users2 className="w-8 h-8 mx-auto text-ink/30 mb-2" />
                <p className="font-bold text-ink/70">No financial transactions recorded yet</p>
                <p>Use the buttons above to log a loan or holding funds.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {timeline.map((item) => {
                  const isEntry = item.source === 'entry';
                  const account = item.accountId ? accountLookup.get(item.accountId) : undefined;
                  const totalSettled = isEntry
                    ? item.rawEntry.settlements.reduce((sum, s) => sum + s.amount, 0)
                    : 0;
                  const remainingDue = isEntry ? Math.max(0, item.rawEntry.amount - totalSettled) : 0;
                  const isClosed = isEntry && remainingDue <= 0;

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-line bg-card hover:bg-moss/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Flow Icon */}
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white ${
                            item.flow === 'inflow' ? 'bg-pine-600' : 'bg-flare-500'
                          }`}
                        >
                          {item.flow === 'inflow' ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-ink">{item.typeLabel}</span>
                            <Badge
                              tone={
                                item.parentType === 'lent'
                                  ? 'pine'
                                  : item.parentType === 'borrowed'
                                  ? 'flare'
                                  : 'sky'
                              }
                              size="xs"
                            >
                              {item.parentType.toUpperCase()}
                            </Badge>

                            {isEntry && (
                              <Badge tone={isClosed ? 'pine' : 'mari'} size="xs">
                                {isClosed ? 'Settled' : 'Active'}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-ink/50 mt-1 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatReadableDate(item.date)}
                            </span>

                            {account && (
                              <span className="flex items-center gap-1 text-ink/60">
                                <Landmark className="w-3 h-3" />
                                {account.name}
                              </span>
                            )}

                            {isEntry && item.rawEntry.dueDate && (
                              <span className="flex items-center gap-1 text-mari-600">
                                <Clock className="w-3 h-3" />
                                Due: {formatReadableDate(item.rawEntry.dueDate)}
                              </span>
                            )}
                          </div>

                          {item.notes && (
                            <p className="text-[11px] text-ink/60 italic mt-1 bg-moss/60 px-2 py-0.5 rounded-md">
                              "{item.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right Amount & Actions */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-line">
                        <div className="font-display font-extrabold text-sm sm:text-base num">
                          <span
                            className={
                              item.flow === 'inflow'
                                ? 'text-pine-700 dark:text-pine-400'
                                : 'text-flare-600'
                            }
                          >
                            {item.flow === 'inflow' ? '+' : '-'}
                            {formatCurrency(item.amount, baseCurrency, numberFormat, isPrivacyMode)}
                          </span>
                        </div>

                        {/* Inline Actions */}
                        <div className="flex items-center gap-1">
                          {isEntry ? (
                            <>
                              {!isClosed && (
                                <button
                                  type="button"
                                  onClick={() => setEntryToSettle(item.rawEntry)}
                                  className="px-2 py-0.5 rounded bg-moss hover:bg-pine-50 text-pine-700 text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Record Settlement"
                                >
                                  <CheckCircle2 className="w-3 h-3 text-pine-600" />
                                  <span>Settle</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setEntryToEdit(item.rawEntry)}
                                className="p-1 rounded text-ink/40 hover:text-ink transition-colors cursor-pointer"
                                title="Edit entry"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (window.confirm('Delete this ledger entry and associated records?')) {
                                    await deletePeopleEntry(item.rawEntry.id);
                                  }
                                }}
                                className="p-1 rounded text-ink/40 hover:text-flare-600 transition-colors cursor-pointer"
                                title="Delete entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  if (item.rawSettlement) {
                                    setSettlementToEdit({
                                      entry: item.rawEntry,
                                      settlement: item.rawSettlement,
                                    });
                                  }
                                }}
                                className="p-1 rounded text-ink/40 hover:text-ink transition-colors cursor-pointer"
                                title="Edit settlement"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (
                                    item.rawSettlement &&
                                    window.confirm('Delete this settlement and restore balance?')
                                  ) {
                                    await deleteSettlement(item.rawEntry.id, item.rawSettlement.id);
                                  }
                                }}
                                className="p-1 rounded text-ink/40 hover:text-flare-600 transition-colors cursor-pointer"
                                title="Delete settlement"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Sub-modals for inline actions */}
      {entryToEdit && (
        <PeopleEntryModal
          isOpen={Boolean(entryToEdit)}
          onClose={() => setEntryToEdit(undefined)}
          entryToEdit={entryToEdit}
        />
      )}

      {settlementToEdit && (
        <EditSettlementModal
          isOpen={Boolean(settlementToEdit)}
          onClose={() => setSettlementToEdit(null)}
          entry={settlementToEdit.entry}
          settlement={settlementToEdit.settlement}
        />
      )}

      {entryToSettle && (
        <SettleModal
          isOpen={Boolean(entryToSettle)}
          onClose={() => setEntryToSettle(null)}
          entry={entryToSettle}
        />
      )}

      {isNewEntryOpen && (
        <PeopleEntryModal
          isOpen={isNewEntryOpen}
          onClose={() => setIsNewEntryOpen(false)}
          initialType={newEntryType}
          initialContactName={currentContactName}
        />
      )}

      {isContactEditOpen && (
        <ContactModal
          isOpen={isContactEditOpen}
          onClose={() => setIsContactEditOpen(false)}
          contactToEdit={{
            name: contactProfile.name,
            phone: contactProfile.phone,
            notes: contactProfile.notes,
          }}
          onSuccess={(newName) => {
            setCurrentContactName(newName);
            setIsContactEditOpen(false);
          }}
        />
      )}
    </>
  );
};
