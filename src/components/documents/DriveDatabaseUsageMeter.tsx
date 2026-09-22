import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../db';
import type { DatabaseStats } from '../../db/types';
import { useVault } from '../../context/VaultContext';
import { formatFileSize } from '../../utils/formatters';
import {
  Database,
  HardDrive,
  FileText,
  Receipt,
  FileSpreadsheet,
  StickyNote,
  Landmark,
  ShieldCheck,
  TrendingUp,
  Cpu,
  ChevronDown,
  ChevronUp,
  Wrench,
} from 'lucide-react';

interface DriveDatabaseUsageMeterProps {
  compact?: boolean;
  onOpenTools?: (tab?: 'scanner' | 'cleaner' | 'storage') => void;
  className?: string;
}

export const DriveDatabaseUsageMeter: React.FC<DriveDatabaseUsageMeterProps> = ({
  compact = false,
  onOpenTools,
  className = '',
}) => {
  const {
    documents,
    transactions,
    accounts,
    assets,
    liabilities,
    notes,
    budgets,
    goals,
    peopleLedger,
  } = useVault();

  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchStats = async () => {
      try {
        const s = await db.getStats();
        if (mounted) setDbStats(s);
      } catch (err) {
        console.warn('Could not read db stats:', err);
      }
    };
    fetchStats();
    return () => {
      mounted = false;
    };
  }, [documents.length, transactions.length, notes.length]);

  // Aggregate document attachments byte size
  const totalDocBytes = useMemo(() => {
    return documents.reduce((sum, d) => sum + (d.fileSize || 0), 0);
  }, [documents]);

  // Approximate sizes for text/financial ledger records
  const estimatedTxBytes = useMemo(() => transactions.length * 340, [transactions]);
  const estimatedAccountBytes = useMemo(() => accounts.length * 280, [accounts]);
  const estimatedAssetDebtBytes = useMemo(
    () => (assets.length + liabilities.length) * 320,
    [assets, liabilities]
  );
  const estimatedPeopleGoalBytes = useMemo(
    () => (peopleLedger.length + goals.length + budgets.length) * 240,
    [peopleLedger, goals, budgets]
  );
  const estimatedNotesBytes = useMemo(() => {
    return notes.reduce((sum, n) => {
      const contentLen = (n.content?.length || 0) * 2; // UTF-16
      const attachmentsLen = n.attachments?.reduce((aSum, a) => aSum + (a.dataUrl?.length || 0), 0) || 0;
      return sum + contentLen + attachmentsLen + 200;
    }, 0);
  }, [notes]);

  const estimatedLedgerTotalBytes =
    estimatedTxBytes +
    estimatedAccountBytes +
    estimatedAssetDebtBytes +
    estimatedPeopleGoalBytes;

  // Canonical total physical database footprint
  const totalDbBytes = useMemo(() => {
    if (dbStats?.fileSizeBytes && dbStats.fileSizeBytes > 0) {
      return dbStats.fileSizeBytes;
    }
    // Fallback computed
    return totalDocBytes + estimatedLedgerTotalBytes + estimatedNotesBytes + 65536; // + 64KB SQLite overhead
  }, [dbStats, totalDocBytes, estimatedLedgerTotalBytes, estimatedNotesBytes]);

  const totalAppRecords =
    documents.length +
    transactions.length +
    accounts.length +
    assets.length +
    liabilities.length +
    notes.length +
    peopleLedger.length +
    goals.length +
    budgets.length;

  // Percentage calculations for segmented bar
  const docPct = Math.min(100, Math.max(2, Math.round((totalDocBytes / (totalDbBytes || 1)) * 100)));
  const ledgerPct = Math.min(
    100 - docPct,
    Math.max(2, Math.round((estimatedLedgerTotalBytes / (totalDbBytes || 1)) * 100))
  );
  const notesPct = Math.min(
    100 - docPct - ledgerPct,
    Math.max(1, Math.round((estimatedNotesBytes / (totalDbBytes || 1)) * 100))
  );
  const systemPct = Math.max(1, 100 - docPct - ledgerPct - notesPct);

  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-surface-2/60 border border-line text-xs ${className}`}
        title={`Database Footprint: ${formatFileSize(totalDbBytes)} across ${totalAppRecords} total records`}
      >
        <Database className="w-3.5 h-3.5 text-pine-600 shrink-0" />
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 font-bold text-[11px] text-ink truncate">
            <span>{formatFileSize(totalDbBytes)} DB</span>
            <span className="text-ink/40 font-normal">({documents.length} files)</span>
          </div>
          {/* Mini segmented bar */}
          <div className="w-20 sm:w-24 h-1 rounded-full bg-surface overflow-hidden flex mt-0.5">
            <div style={{ width: `${docPct}%` }} className="bg-sky-500 h-full" />
            <div style={{ width: `${ledgerPct}%` }} className="bg-pine-500 h-full" />
            <div style={{ width: `${notesPct}%` }} className="bg-amber-500 h-full" />
            <div style={{ width: `${systemPct}%` }} className="bg-ink/20 h-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-line bg-surface p-3.5 sm:p-4 space-y-3 transition-all shadow-2xs ${className}`}
    >
      {/* Header with Title and Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-pine-500/10 grid place-items-center text-pine-600">
            <Database className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-ink flex items-center gap-1.5">
              <span>Encrypted SQLite Database</span>
              <span className="px-1.5 py-0.2 rounded bg-pine-50 dark:bg-pine-950/60 border border-pine-200 dark:border-pine-800 text-[9px] font-mono font-bold text-pine-700 dark:text-pine-300">
                {dbStats?.engine === 'sqlite-native' ? 'Node 22 SQLite' : 'IndexedDB'}
              </span>
            </h4>
            <p className="text-[10px] text-ink/50">
              {formatFileSize(totalDbBytes)} used on disk • {totalAppRecords} encrypted records
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 rounded-lg hover:bg-surface-2 text-ink/40 hover:text-ink transition-colors"
          title={isExpanded ? 'Collapse breakdown' : 'Expand full breakdown'}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Segmented Multi-Color Progress Bar */}
      <div className="space-y-1">
        <div className="h-2.5 w-full rounded-full bg-surface-2 overflow-hidden flex shadow-inner">
          <div
            style={{ width: `${docPct}%` }}
            className="bg-sky-500 h-full transition-all duration-500"
            title={`Document Files: ${formatFileSize(totalDocBytes)} (${docPct}%)`}
          />
          <div
            style={{ width: `${ledgerPct}%` }}
            className="bg-pine-500 h-full transition-all duration-500"
            title={`Financial Ledger: ${formatFileSize(estimatedLedgerTotalBytes)} (${ledgerPct}%)`}
          />
          <div
            style={{ width: `${notesPct}%` }}
            className="bg-amber-500 h-full transition-all duration-500"
            title={`Notes & Content: ${formatFileSize(estimatedNotesBytes)} (${notesPct}%)`}
          />
          <div
            style={{ width: `${systemPct}%` }}
            className="bg-indigo-400 dark:bg-indigo-600 h-full transition-all duration-500"
            title={`SQLite Indexes & WAL: ${systemPct}%`}
          />
        </div>

        {/* Legend strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-ink/60 font-medium pt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
            <span>Files ({formatFileSize(totalDocBytes)})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-pine-500 shrink-0" />
            <span>Ledger ({formatFileSize(estimatedLedgerTotalBytes)})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span>Notes ({formatFileSize(estimatedNotesBytes)})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
            <span>WAL Index</span>
          </div>
        </div>
      </div>

      {/* Expandable Detailed Table Breakdown */}
      {isExpanded && (
        <div className="pt-2 border-t border-line/60 space-y-2 anim-fade">
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {/* Documents */}
            <div className="p-2 rounded-xl bg-surface-2/50 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-sky-500" />
                <span className="font-semibold text-ink">Vault Documents</span>
              </div>
              <span className="font-mono text-ink/70">
                {documents.length} ({formatFileSize(totalDocBytes)})
              </span>
            </div>

            {/* Transactions */}
            <div className="p-2 rounded-xl bg-surface-2/50 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-pine-600" />
                <span className="font-semibold text-ink">Transactions</span>
              </div>
              <span className="font-mono text-ink/70">
                {transactions.length} ({formatFileSize(estimatedTxBytes)})
              </span>
            </div>

            {/* Accounts & Assets */}
            <div className="p-2 rounded-xl bg-surface-2/50 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-blue-500" />
                <span className="font-semibold text-ink">Accounts & Assets</span>
              </div>
              <span className="font-mono text-ink/70">
                {accounts.length + assets.length + liabilities.length}
              </span>
            </div>

            {/* Encrypted Notes */}
            <div className="p-2 rounded-xl bg-surface-2/50 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-semibold text-ink">Encrypted Notes</span>
              </div>
              <span className="font-mono text-ink/70">
                {notes.length} ({formatFileSize(estimatedNotesBytes)})
              </span>
            </div>
          </div>

          {onOpenTools && (
            <div className="pt-1 flex items-center justify-between">
              <span className="text-[10px] text-ink/40">
                Encrypted with device-bound AES-256-GCM
              </span>
              <button
                type="button"
                onClick={() => onOpenTools('cleaner')}
                className="text-[11px] font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <Wrench className="w-3 h-3" />
                <span>Optimize & Clean</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
