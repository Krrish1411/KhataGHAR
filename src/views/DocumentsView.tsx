import React, { useState, useMemo } from 'react';
import { useVault } from '../context/VaultContext';
import { useConfirm } from '../context/DialogContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { DocumentUploadModal } from '../components/documents/DocumentUploadModal';
import { DocumentDetailModal } from '../components/documents/DocumentDetailModal';
import { DocumentFolderModal } from '../components/documents/DocumentFolderModal';
import { formatFileSize } from '../utils/formatters';
import { formatReadableDate } from '../utils/dates';
import type { DocumentRecord, LinkedEntityType } from '../types';
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
  Search,
  Grid,
  List,
  FolderPlus,
  Link2,
  Image as ImageIcon,
  Folder,
  SlidersHorizontal,
} from 'lucide-react';

interface DocumentLifecycle {
  status: 'expired' | 'renewal_window' | 'active' | 'permanent';
  diffDays: number | null;
  badgeTone: 'flare' | 'mari' | 'pine' | 'gray';
  badgeLabel: string;
}

export const DocumentsView: React.FC = () => {
  const {
    documents,
    documentFolders,
    assets,
    liabilities,
    accounts,
    deleteDocument,
    addPlannedExpense,
    loadDocumentDataUrl,
  } = useVault();

  const confirm = useConfirm();

  const [activeFolderId, setActiveFolderId] = useState<string>('all');
  const [selectedEntityFilter, setSelectedEntityFilter] = useState<LinkedEntityType | 'all'>('all');
  const [fileTypeFilter, setFileTypeFilter] = useState<'all' | 'image' | 'pdf' | 'other'>('all');
  const [lifecycleFilter, setLifecycleFilter] = useState<'all' | 'action_required' | 'active'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'size'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [schedulingId, setSchedulingId] = useState<string | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Total vault storage used
  const totalStorageBytes = useMemo(() => {
    return documents.reduce((sum, d) => sum + (d.fileSize || 0), 0);
  }, [documents]);

  const folderLookup = useMemo(() => {
    return new Map(documentFolders.map((f) => [f.id, f]));
  }, [documentFolders]);

  const assetLookup = useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets]);
  const liabilityLookup = useMemo(() => new Map(liabilities.map((l) => [l.id, l])), [liabilities]);
  const accountLookup = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

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
        badgeTone: 'flare',
        badgeLabel: `Overdue (${Math.abs(diffDays)}d ago)`,
      };
    }

    if (diffDays <= 30) {
      return {
        status: 'renewal_window',
        diffDays,
        badgeTone: 'mari',
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

  // Enriched documents with lifecycle
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

  // Counts per folder
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = { all: documents.length };
    for (const d of documents) {
      const fId = d.folderId || 'unfiled';
      counts[fId] = (counts[fId] || 0) + 1;
    }
    return counts;
  }, [documents]);

  // Fast Instant Filter across all 1000+ attachments
  const filteredDocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return enrichedDocs
      .filter(({ doc, lifecycle }) => {
        // Folder filter
        if (activeFolderId !== 'all') {
          const docF = doc.folderId || 'unfiled';
          if (docF !== activeFolderId) return false;
        }

        // Entity filter
        if (selectedEntityFilter !== 'all') {
          const hasLink =
            doc.linkedType === selectedEntityFilter ||
            doc.links?.some((l) => l.entityType === selectedEntityFilter);
          if (!hasLink) return false;
        }

        // File type filter
        if (fileTypeFilter === 'image' && !doc.fileType.startsWith('image/')) return false;
        if (fileTypeFilter === 'pdf' && !doc.fileType.includes('pdf') && !doc.name.toLowerCase().endsWith('.pdf')) return false;
        if (fileTypeFilter === 'other' && (doc.fileType.startsWith('image/') || doc.fileType.includes('pdf'))) return false;

        // Lifecycle filter
        if (lifecycleFilter === 'action_required') {
          if (lifecycle.status !== 'expired' && lifecycle.status !== 'renewal_window') return false;
        } else if (lifecycleFilter === 'active') {
          if (lifecycle.status !== 'active' && lifecycle.status !== 'permanent') return false;
        }

        // Search text match (< 5ms)
        if (q) {
          const nameMatch = doc.name.toLowerCase().includes(q);
          const tagMatch = doc.tags?.some((t) => t.toLowerCase().includes(q));
          const noteMatch = doc.notes?.toLowerCase().includes(q);
          const linkMatch = doc.links?.some((l) => l.entityName?.toLowerCase().includes(q));
          if (!nameMatch && !tagMatch && !noteMatch && !linkMatch) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return b.doc.createdAt.localeCompare(a.doc.createdAt);
        if (sortBy === 'oldest') return a.doc.createdAt.localeCompare(b.doc.createdAt);
        if (sortBy === 'name') return a.doc.name.localeCompare(b.doc.name);
        if (sortBy === 'size') return (b.doc.fileSize || 0) - (a.doc.fileSize || 0);
        return 0;
      });
  }, [
    enrichedDocs,
    activeFolderId,
    selectedEntityFilter,
    fileTypeFilter,
    lifecycleFilter,
    searchQuery,
    sortBy,
  ]);

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

  const handleDownload = async (doc: DocumentRecord) => {
    let url = doc.dataUrl;
    if (!url) {
      url = await loadDocumentDataUrl(doc.id);
    }
    if (!url) return;

    const a = document.createElement('a');
    a.href = url;
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
    } catch {
      alert('Could not schedule renewal. Please try again.');
    } finally {
      setSchedulingId(null);
    }
  };

  const getLinkedLabel = (doc: DocumentRecord) => {
    if (doc.links && doc.links.length > 0) {
      const primary = doc.links[0];
      const extra = doc.links.length > 1 ? ` (+${doc.links.length - 1})` : '';
      return `${primary.entityType.toUpperCase()}: ${primary.entityName || primary.entityId}${extra}`;
    }
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
    <div className="space-y-5 w-full max-w-[1600px] mx-auto px-1 sm:px-2 pb-16 anim-fade">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 grid place-items-center text-pine-600">
              <FolderLock className="w-4 h-4" />
            </span>
            <h1 className="font-display font-extrabold text-[22px] sm:text-[24px] tracking-tight text-ink">
              Document & Attachment Hub
            </h1>
          </div>
          <p className="text-xs text-ink/50 mt-1">
            Universal encrypted repository for receipts, deeds, loan agreements, passbooks, and policies
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsFolderModalOpen(true)}
            className="px-3 py-2 rounded-xl border border-line bg-card hover:bg-moss text-ink text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
            title="Create a custom folder"
          >
            <FolderPlus className="w-3.5 h-3.5 text-pine-600" />
            <span>+ Folder</span>
          </button>

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-pine-700 hover:bg-pine-600 active:scale-[0.97] text-white text-xs font-bold shadow-sm shadow-pine-900/20 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Storage Meter Card */}
      <div className="rounded-2xl border border-line bg-card p-4 space-y-2 shadow-2xs">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-2 text-ink">
            <HardDrive className="w-4 h-4 text-pine-600" />
            <span className="font-semibold">Local SQLite & IndexedDB Storage</span>
          </div>
          <span className="font-mono text-ink/50 text-[11px] tabular-nums">
            {formatFileSize(totalStorageBytes)} in {documents.length} files (Sub-second unlock)
          </span>
        </div>

        <div className="w-full bg-moss h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-pine-600 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, (totalStorageBytes / (100 * 1024 * 1024)) * 100)}%` }}
          />
        </div>
      </div>

      {/* Action Required: Expiry Lifecycle Strip */}
      {actionRequiredDocs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-xs uppercase tracking-wider text-ink/75 px-1 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-mari-600" />
              <span>Expiry & Renewal Alerts ({actionRequiredDocs.length})</span>
            </h2>
            <span className="text-[11px] text-ink/45">Overdue policies & upcoming renewals</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {actionRequiredDocs.map(({ doc, lifecycle }) => (
              <div
                key={doc.id}
                onClick={() => setSelectedDocId(doc.id)}
                className={`rounded-2xl border p-3.5 space-y-2.5 shadow-2xs cursor-pointer hover:scale-[1.01] transition-transform ${
                  lifecycle.status === 'expired'
                    ? 'border-flare-300/60 dark:border-flare-800/40 bg-flare-50/20 dark:bg-flare-950/20'
                    : 'border-mari-300/60 dark:border-mari-800/40 bg-mari-50/20 dark:bg-mari-950/20'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <h4 className="font-display font-bold text-xs text-ink truncate">{doc.name}</h4>
                    <span className="text-[11px] text-ink/45 block truncate mt-0.5">
                      {getLinkedLabel(doc)}
                    </span>
                  </div>
                  <Badge tone={lifecycle.badgeTone} size="xs">
                    {lifecycle.badgeLabel}
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-line/40 text-xs">
                  <span className="font-mono text-[11px] text-ink/65">
                    Maturity: {formatReadableDate(doc.expiryDate!)}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleScheduleRenewal(doc);
                    }}
                    disabled={schedulingId === doc.id}
                    className="px-2 py-0.5 rounded-lg bg-card border border-line hover:bg-moss text-pine-700 dark:text-pine-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <CalendarClock className="w-3 h-3 text-pine-600" />
                    <span>{schedulingId === doc.id ? 'Scheduling...' : 'Schedule'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Folder Rail (Horizontal Scrollable Chips) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        <button
          type="button"
          onClick={() => setActiveFolderId('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeFolderId === 'all'
              ? 'bg-pine-700 text-white shadow-xs'
              : 'bg-card border border-line text-ink/70 hover:bg-moss'
          }`}
        >
          <span>📁 All Files</span>
          <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-mono">
            {folderCounts.all || 0}
          </span>
        </button>

        {documentFolders.map((f) => {
          const count = folderCounts[f.id] || 0;
          const isActive = activeFolderId === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFolderId(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? 'bg-pine-700 text-white shadow-xs font-bold'
                  : 'bg-card border border-line text-ink/70 hover:bg-moss'
              }`}
            >
              <span>{f.icon || '📁'}</span>
              <span>{f.name}</span>
              {count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-white/20 text-white' : 'bg-moss text-ink/60'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-3 rounded-2xl bg-card border border-line space-y-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Fast Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-ink/40" />
            <input
              type="text"
              placeholder="Search by filename, notes, tags, or linked entity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-line bg-card text-xs text-ink placeholder:text-ink/35 outline-none focus:border-pine-500"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-moss p-0.5 rounded-xl border border-line self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                viewMode === 'grid' ? 'bg-card text-pine-600 shadow-2xs' : 'text-ink/40 hover:text-ink'
              }`}
              title="Visual Gallery Grid"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                viewMode === 'list' ? 'bg-card text-pine-600 shadow-2xs' : 'text-ink/40 hover:text-ink'
              }`}
              title="Dense Table List"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-line/60 text-xs">
          {/* Entity Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-ink/45 uppercase">Entity:</span>
            <select
              value={selectedEntityFilter}
              onChange={(e) => setSelectedEntityFilter(e.target.value as any)}
              className="rounded-lg border border-line bg-card px-2 py-1 text-xs font-semibold text-ink outline-none focus:border-pine-500 cursor-pointer"
            >
              <option value="all">All Entities</option>
              <option value="transaction">Transactions (Receipts)</option>
              <option value="asset">Assets / Investments</option>
              <option value="liability">Loans / Liabilities</option>
              <option value="goal">Savings Goals</option>
              <option value="people">People / Contacts</option>
              <option value="account">Bank / Cash Accounts</option>
              <option value="none">Standalone (Unlinked)</option>
            </select>
          </div>

          {/* File Type Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-ink/45 uppercase">Type:</span>
            <select
              value={fileTypeFilter}
              onChange={(e) => setFileTypeFilter(e.target.value as any)}
              className="rounded-lg border border-line bg-card px-2 py-1 text-xs font-semibold text-ink outline-none focus:border-pine-500 cursor-pointer"
            >
              <option value="all">All Formats</option>
              <option value="image">Images (JPG/PNG/WebP)</option>
              <option value="pdf">PDF Documents</option>
              <option value="other">Other Files</option>
            </select>
          </div>

          {/* Sort Filter */}
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-[11px] font-bold text-ink/45 uppercase">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-lg border border-line bg-card px-2 py-1 text-xs font-semibold text-ink outline-none focus:border-pine-500 cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name (A-Z)</option>
              <option value="size">File Size</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Documents Presentation */}
      {filteredDocs.length === 0 ? (
        <Card className="text-center py-12 text-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 grid place-items-center mx-auto text-pine-600">
            <FolderLock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm text-ink">No documents match your filter</h3>
            <p className="text-xs text-ink/50 mt-1 max-w-sm mx-auto">
              Upload bills, deeds, and certificates or clear search filters to view your files.
            </p>
          </div>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-pine-700 text-white text-xs font-bold shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload Document</span>
          </button>
        </Card>
      ) : viewMode === 'grid' ? (
        /* Visual Gallery Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredDocs.map(({ doc, lifecycle }) => {
            const isImage = doc.fileType.startsWith('image/');
            const previewUrl = doc.thumbnailUrl || (isImage ? doc.dataUrl : undefined);
            const folder = doc.folderId ? folderLookup.get(doc.folderId) : undefined;

            return (
              <div
                key={doc.id}
                onClick={() => setSelectedDocId(doc.id)}
                className="rounded-2xl border border-line bg-card p-3.5 space-y-3 shadow-2xs hover:border-pine-400/70 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
              >
                {/* Visual Thumbnail or Icon */}
                <div className="w-full h-36 rounded-xl overflow-hidden bg-moss/60 border border-line flex items-center justify-center relative">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt={doc.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : isImage ? (
                    <ImageIcon className="w-8 h-8 text-pine-600 opacity-60" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-ink/50">
                      <FileText className="w-8 h-8 text-pine-600 opacity-70" />
                      <span className="font-mono text-[10px] uppercase font-bold">
                        {doc.fileType.split('/')[1] || 'PDF'}
                      </span>
                    </div>
                  )}

                  {doc.isUncompressed && (
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-xs text-amber-300 font-mono text-[9px] uppercase font-bold">
                      RAW
                    </span>
                  )}
                </div>

                {/* File Details */}
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-1.5">
                    <h4 className="font-display font-bold text-xs text-ink truncate flex-1" title={doc.name}>
                      {doc.name}
                    </h4>
                    <Badge tone={lifecycle.badgeTone} size="xs">
                      {lifecycle.badgeLabel}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-ink/45 font-mono">
                    <span>{formatFileSize(doc.fileSize)}</span>
                    <span>{formatReadableDate(doc.createdAt.split('T')[0])}</span>
                  </div>

                  {/* Folder & Entity Tags */}
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    {folder && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-moss text-[10px] font-semibold text-pine-700 dark:text-pine-300 border border-line">
                        <span>{folder.icon || '📁'}</span>
                        <span className="truncate max-w-[100px]">{folder.name}</span>
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-card text-[10px] font-medium text-ink/55 border border-line truncate max-w-[140px]">
                      <Link2 className="w-2.5 h-2.5 text-pine-600 shrink-0" />
                      <span className="truncate">{getLinkedLabel(doc)}</span>
                    </span>
                  </div>
                </div>

                {/* Card Bottom Actions */}
                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-line/50">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(doc);
                    }}
                    className="p-1.5 text-ink/50 hover:text-pine-600 rounded-lg hover:bg-moss cursor-pointer transition-colors"
                    title="Download file"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(doc.id, doc.name);
                    }}
                    className="p-1.5 text-ink/40 hover:text-flare-600 rounded-lg hover:bg-flare-50 dark:hover:bg-flare-950/40 cursor-pointer transition-colors"
                    title="Delete document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Dense List View */
        <div className="rounded-2xl border border-line bg-card overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-moss/70 border-b border-line text-[11px] font-bold text-ink/60 uppercase tracking-wider">
                <th className="py-2.5 px-3">Document Name</th>
                <th className="py-2.5 px-3 hidden sm:table-cell">Folder</th>
                <th className="py-2.5 px-3 hidden md:table-cell">Linked To</th>
                <th className="py-2.5 px-3 text-right">Size</th>
                <th className="py-2.5 px-3 hidden lg:table-cell">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {filteredDocs.map(({ doc, lifecycle }) => {
                const folder = doc.folderId ? folderLookup.get(doc.folderId) : undefined;
                return (
                  <tr
                    key={doc.id}
                    onClick={() => setSelectedDocId(doc.id)}
                    className="hover:bg-moss/40 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-3 font-semibold text-ink">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-pine-600 shrink-0" />
                        <span className="truncate max-w-[240px]">{doc.name}</span>
                        {doc.isUncompressed && (
                          <span className="px-1 rounded bg-amber-500/10 text-amber-600 text-[9px] font-mono uppercase font-bold">
                            RAW
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 hidden sm:table-cell text-ink/60">
                      {folder ? `${folder.icon || '📁'} ${folder.name}` : 'Unfiled'}
                    </td>

                    <td className="py-2.5 px-3 hidden md:table-cell text-ink/50 text-[11px] truncate max-w-[180px]">
                      {getLinkedLabel(doc)}
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono text-ink/60">
                      {formatFileSize(doc.fileSize)}
                    </td>

                    <td className="py-2.5 px-3 hidden lg:table-cell">
                      <Badge tone={lifecycle.badgeTone} size="xs">
                        {lifecycle.badgeLabel}
                      </Badge>
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(doc);
                          }}
                          className="p-1 text-ink/50 hover:text-pine-600 rounded-md cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(doc.id, doc.name);
                          }}
                          className="p-1 text-ink/40 hover:text-flare-600 rounded-md cursor-pointer"
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
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <DocumentUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          defaultFolderId={activeFolderId !== 'all' ? activeFolderId : undefined}
        />
      )}

      {/* New Folder Modal */}
      {isFolderModalOpen && (
        <DocumentFolderModal
          isOpen={isFolderModalOpen}
          onClose={() => setIsFolderModalOpen(false)}
        />
      )}

      {/* Document Detail & Link Manager Lightbox */}
      {selectedDocId && (
        <DocumentDetailModal
          documentId={selectedDocId}
          isOpen={Boolean(selectedDocId)}
          onClose={() => setSelectedDocId(null)}
        />
      )}
    </div>
  );
};
