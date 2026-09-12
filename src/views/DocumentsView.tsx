import React, { useState, useMemo } from 'react';
import { useVault } from '../context/VaultContext';
import { useConfirm } from '../context/DialogContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { DocumentUploadModal } from '../components/documents/DocumentUploadModal';
import { formatFileSize } from '../utils/formatters';
import { formatReadableDate } from '../utils/dates';
import type { DocumentRecord, Asset, Liability, Account } from '../types';
import {
  FolderLock,
  Plus,
  FileText,
  Trash2,
  Download,
  Calendar,
  AlertTriangle,
  HardDrive,
  CalendarClock,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface DocumentLifecycle {
  status: 'expired' | 'renewal_window' | 'active' | 'permanent';
  diffDays: number | null;
  badgeTone: 'flare' | 'mari' | 'pine' | 'gray';
  badgeLabel: string;
}

export const DocumentsView: React.FC = () => {
  const { documents, assets, liabilities, accounts, deleteDocument, addPlannedExpense } = useVault();
  const confirm = useConfirm();

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'action_required' | 'active'>('all');
  const [schedulingId, setSchedulingId] = useState<string | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Total vault storage used
  const totalStorageBytes = useMemo(() => {
    return documents.reduce((sum, d) => sum + d.fileSize, 0);
  }, [documents]);

  const assetLookup = useMemo(() => new Map<string, Asset>(assets.map((a) => [a.id, a])), [assets]);
  const liabilityLookup = useMemo(() => new Map<string, Liability>(liabilities.map((l) => [l.id, l])), [liabilities]);
  const accountLookup = useMemo(() => new Map<string, Account>(accounts.map((a) => [a.id, a])), [accounts]);

  const getLifecycle = (doc: DocumentRecord): DocumentLifecycle => {
    if (!doc.expiryDate) {
      return {
        status: 'permanent',
        diffDays: null,
        badgeTone: 'gray',
        badgeLabel: 'Permanent',
      };
    }

    const today = new Date(todayStr);
    const exp = new Date(doc.expiryDate);
    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        status: 'expired',
        diffDays,
        badgeTone: 'flare', // Wine / rose tone (no bright neon red)
        badgeLabel: `Overdue (${Math.abs(diffDays)}d ago)`,
      };
    }

    if (diffDays <= 30) {
      return {
        status: 'renewal_window',
        diffDays,
        badgeTone: 'mari', // Warm antique amber / ochre (no electric yellow)
        badgeLabel: diffDays === 0 ? 'Expires Today' : `Expires in ${diffDays}d`,
      };
    }

    return {
      status: 'active',
      diffDays,
      badgeTone: 'pine',
      badgeLabel: `Active (${diffDays}d left)`,
    };
  };

  // Enriched document items
  const enrichedDocs = useMemo(() => {
    return documents.map((d) => ({
      doc: d,
      lifecycle: getLifecycle(d),
    }));
  }, [documents, todayStr]);

  // Documents requiring action (Overdue + Expiring within 30 days)
  const actionRequiredDocs = useMemo(() => {
    return enrichedDocs.filter(
      (item) => item.lifecycle.status === 'expired' || item.lifecycle.status === 'renewal_window'
    );
  }, [enrichedDocs]);

  // Filtered documents
  const filteredDocs = useMemo(() => {
    if (filterTab === 'action_required') {
      return enrichedDocs.filter(
        (item) => item.lifecycle.status === 'expired' || item.lifecycle.status === 'renewal_window'
      );
    }
    if (filterTab === 'active') {
      return enrichedDocs.filter(
        (item) => item.lifecycle.status === 'active' || item.lifecycle.status === 'permanent'
      );
    }
    return enrichedDocs;
  }, [enrichedDocs, filterTab]);

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title: 'Delete Document',
      description: `Delete encrypted document "${name}"? This file will be permanently removed.`,
      confirmText: 'Delete Document',
      variant: 'danger',
    });
    if (ok) {
      await deleteDocument(id);
    }
  };

  const handleDownload = (doc: DocumentRecord) => {
    const a = document.createElement('a');
    a.href = doc.dataUrl;
    a.download = doc.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleScheduleRenewal = async (doc: DocumentRecord) => {
    if (!doc.expiryDate) return;
    setSchedulingId(doc.id);
    try {
      await addPlannedExpense({
        name: `Renewal: ${doc.name}`,
        amount: 0,
        dueDate: doc.expiryDate,
        recurrence: 'yearly',
        status: 'pending',
        notes: `Document renewal scheduled for "${doc.name}"`,
      });
      alert(`Renewal commitment for "${doc.name}" added to Planned Expenses!`);
    } catch (err) {
      console.error(err);
      alert('Could not schedule renewal. Please try again.');
    } finally {
      setSchedulingId(null);
    }
  };

  const getLinkedLabel = (doc: DocumentRecord) => {
    if (doc.linkedType === 'asset' && doc.linkedId) {
      const a = assetLookup.get(doc.linkedId);
      return `Asset: ${a?.name || 'Linked Asset'}`;
    }
    if (doc.linkedType === 'liability' && doc.linkedId) {
      const l = liabilityLookup.get(doc.linkedId);
      return `Loan: ${l?.name || 'Linked Loan'}`;
    }
    if (doc.linkedType === 'account' && doc.linkedId) {
      const acc = accountLookup.get(doc.linkedId);
      return `Account: ${acc?.name || 'Linked Account'}`;
    }
    return 'Standalone Record';
  };

  return (
    <div className="space-y-6 w-full max-w-[1600px] mx-auto px-1 sm:px-2 pb-16 anim-fade">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 grid place-items-center text-pine-600">
              <FolderLock className="w-4 h-4" />
            </span>
            <h1 className="font-display font-extrabold text-[22px] sm:text-[24px] tracking-tight text-ink">
              Encrypted Document Vault
            </h1>
          </div>
          <p className="text-xs text-ink/50 mt-1">
            Store policy PDFs, deeds, warranty cards, and identity proofs with end-to-end client-side encryption
          </p>
        </div>

        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-pine-700 hover:bg-pine-600 active:scale-[0.97] text-white text-xs font-bold shadow-sm shadow-pine-900/20 flex items-center gap-1.5 cursor-pointer transition-all self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Document</span>
        </button>
      </div>

      {/* Storage Meter Card */}
      <div className="rounded-2xl border border-line bg-card p-4 sm:p-5 space-y-2.5 shadow-sm lift">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-2 text-ink">
            <HardDrive className="w-4 h-4 text-pine-600" />
            <span className="font-semibold">Local Encrypted Storage Usage</span>
          </div>
          <span className="font-mono text-ink/50 text-[11px] tabular-nums num">
            {formatFileSize(totalStorageBytes)} stored in IndexedDB (50MB cap per file)
          </span>
        </div>

        <div className="w-full bg-moss h-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-pine-600 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, (totalStorageBytes / (50 * 1024 * 1024)) * 100)}%` }}
          />
        </div>
      </div>

      {/* Action Required: Upcoming Renewal / Expiry Strip */}
      {actionRequiredDocs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-xs uppercase tracking-wider text-ink/75 px-1 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-mari-600" />
              <span>Expiry Lifecycle Alerts ({actionRequiredDocs.length})</span>
            </h2>
            <span className="text-[11px] text-ink/45">Action required for overdue policies & upcoming renewals</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {actionRequiredDocs.map(({ doc, lifecycle }) => (
              <div
                key={doc.id}
                className={`rounded-2xl border p-4 space-y-3 shadow-sm lift ${
                  lifecycle.status === 'expired'
                    ? 'border-flare-300/60 dark:border-flare-800/40 bg-flare-50/20 dark:bg-flare-950/20'
                    : 'border-mari-300/60 dark:border-mari-800/40 bg-mari-50/20 dark:bg-mari-950/20'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <h4 className="font-display font-bold text-sm text-ink truncate">
                      {doc.name}
                    </h4>
                    <span className="text-[11px] text-ink/45 block truncate mt-0.5">{getLinkedLabel(doc)}</span>
                  </div>
                  <Badge tone={lifecycle.badgeTone} size="xs">
                    {lifecycle.badgeLabel}
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-line/40 text-xs">
                  <div className="flex items-center gap-1 font-mono text-[11px] text-ink/65">
                    <Calendar className="w-3 h-3 text-ink/40" />
                    <span>Maturity: {formatReadableDate(doc.expiryDate!)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleScheduleRenewal(doc)}
                    disabled={schedulingId === doc.id}
                    className="px-2.5 py-1 rounded-lg bg-card border border-line hover:bg-moss text-pine-700 dark:text-pine-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                    title="Add renewal reminder to Planned Expenses"
                  >
                    <CalendarClock className="w-3 h-3 text-pine-600" />
                    <span>{schedulingId === doc.id ? 'Scheduling...' : 'Schedule Renewal'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs & Records List */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center p-1 bg-moss/80 rounded-xl border border-line w-fit">
            {[
              { id: 'all', label: `All (${documents.length})` },
              { id: 'action_required', label: `Action Required (${actionRequiredDocs.length})` },
              { id: 'active', label: `Active & Permanent (${enrichedDocs.filter((e) => e.lifecycle.status === 'active' || e.lifecycle.status === 'permanent').length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  filterTab === tab.id
                    ? 'bg-card text-ink font-bold shadow-xs border border-line'
                    : 'text-ink/60 hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredDocs.length === 0 ? (
          <Card className="text-center py-12 text-xs space-y-3 lift">
            <div className="w-12 h-12 rounded-2xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 grid place-items-center mx-auto text-pine-600">
              <FolderLock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-ink">No documents found</h3>
              <p className="text-xs text-ink/50 mt-1 max-w-sm mx-auto">
                {filterTab === 'action_required'
                  ? 'Great job! No policies or documents are currently expired or in need of renewal.'
                  : 'Upload policy scans, certificates, and warranties encrypted with your local key.'}
              </p>
            </div>
            {filterTab === 'all' && (
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-pine-700 text-white text-xs font-bold shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload First File</span>
              </button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredDocs.map(({ doc, lifecycle }) => (
              <div
                key={doc.id}
                className="rounded-2xl border border-line bg-card p-4 sm:p-5 space-y-3 shadow-sm lift flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-pine-50 dark:bg-pine-950/40 text-pine-600 border border-pine-200/60 dark:border-pine-800/40 grid place-items-center flex-shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-display font-bold text-sm text-ink truncate">
                        {doc.name}
                      </h4>
                      <span className="text-[11px] text-ink/45 block mt-0.5">
                        {formatFileSize(doc.fileSize)} • {doc.fileType.split('/')[1]?.toUpperCase() || 'FILE'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(doc.id, doc.name)}
                    className="p-1.5 text-ink/40 hover:text-flare-600 rounded-lg cursor-pointer transition-colors"
                    title="Delete document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] text-ink/50 truncate max-w-[170px]">
                      {getLinkedLabel(doc)}
                    </span>
                    <Badge tone={lifecycle.badgeTone} size="xs">
                      {lifecycle.badgeLabel}
                    </Badge>
                  </div>

                  {doc.expiryDate && (
                    <div className="flex items-center justify-between text-[11px] text-ink/45 font-mono pt-1 border-t border-line/40">
                      <span>Renewal: {formatReadableDate(doc.expiryDate)}</span>
                      {(lifecycle.status === 'expired' || lifecycle.status === 'renewal_window') && (
                        <button
                          type="button"
                          onClick={() => handleScheduleRenewal(doc)}
                          disabled={schedulingId === doc.id}
                          className="text-pine-700 dark:text-pine-300 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                        >
                          <CalendarClock className="w-3 h-3" />
                          <span>Schedule</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-2.5 border-t border-line flex items-center justify-end text-xs">
                  <button
                    onClick={() => handleDownload(doc)}
                    className="px-3 py-1.5 rounded-lg bg-moss hover:bg-pine-50 dark:hover:bg-pine-950/50 text-pine-700 dark:text-pine-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Download className="w-3 h-3 text-pine-600" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <DocumentUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
        />
      )}
    </div>
  );
};

