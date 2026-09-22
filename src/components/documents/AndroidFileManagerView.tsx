import React, { useState, useMemo, useCallback } from 'react';
import { formatFileSize } from '../../utils/formatters';
import { formatReadableDate } from '../../utils/dates';
import { useVault } from '../../context/VaultContext';
import type { DocumentRecord, DocumentFolder, LinkedEntityType } from '../../types';
import {
  Folder,
  FolderPlus,
  Upload,
  Search,
  Grid,
  List,
  ChevronRight,
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  MoreVertical,
  Download,
  Trash2,
  Eye,
  ShieldCheck,
  Star,
  Link2,
  Plus,
  Clock,
  Sparkles,
  FileSpreadsheet,
  Archive,
  FileCode,
  X,
  ExternalLink,
} from 'lucide-react';

interface AndroidFileManagerViewProps {
  documents: DocumentRecord[];
  folders: DocumentFolder[];
  activeFolderId: string;
  onSelectFolder: (folderId: string) => void;
  selectedEntityFilter: LinkedEntityType | 'all';
  onSelectEntityFilter: (entity: LinkedEntityType | 'all') => void;
  fileTypeFilter: 'all' | 'image' | 'pdf' | 'other';
  onSelectFileTypeFilter: (type: 'all' | 'image' | 'pdf' | 'other') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortBy: 'newest' | 'oldest' | 'name' | 'size';
  onSortChange: (sort: 'newest' | 'oldest' | 'name' | 'size') => void;
  viewMode: 'grid' | 'list';
  onToggleViewMode: () => void;
  onOpenDoc: (docId: string) => void;
  onUploadClick: () => void;
  onNewFolderClick: () => void;
  onDeleteDoc: (doc: DocumentRecord) => void;
  onDeleteFolder?: (folderId: string) => void;
  totalStorageBytes: number;
}

export const AndroidFileManagerView: React.FC<AndroidFileManagerViewProps> = ({
  documents,
  folders,
  activeFolderId,
  onSelectFolder,
  selectedEntityFilter,
  onSelectEntityFilter,
  fileTypeFilter,
  onSelectFileTypeFilter,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  viewMode,
  onToggleViewMode,
  onOpenDoc,
  onUploadClick,
  onNewFolderClick,
  onDeleteDoc,
  onDeleteFolder,
  totalStorageBytes,
}) => {
  const { loadDocumentDataUrl, updateDocument } = useVault();

  // Bottom sheets
  const [activeBottomSheetDoc, setActiveBottomSheetDoc] = useState<DocumentRecord | null>(null);
  const [activeFolderMenu, setActiveFolderMenu] = useState<DocumentFolder | null>(null);
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const [isMoveFolderModalOpen, setIsMoveFolderModalOpen] = useState(false);

  // Starred IDs
  const [starredIds, setStarredIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('khata_starred_docs');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggleStar = useCallback((docId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      try {
        localStorage.setItem('khata_starred_docs', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  }, []);

  const folderLookup = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);

  const activeFolder = useMemo(() => {
    if (activeFolderId === 'all') return null;
    return folderLookup.get(activeFolderId) || null;
  }, [activeFolderId, folderLookup]);

  // Storage category sizes
  const storageCategories = useMemo(() => {
    let images = 0;
    let pdfs = 0;
    let receipts = 0;
    let others = 0;

    for (const d of documents) {
      const size = d.fileSize || 0;
      if (d.fileType.startsWith('image/')) images += size;
      else if (d.fileType.includes('pdf') || d.name.toLowerCase().endsWith('.pdf')) pdfs += size;
      else if (d.linkedType === 'transaction') receipts += size;
      else others += size;
    }

    return { images, pdfs, receipts, others };
  }, [documents]);

  // Recent files (last 10 added)
  const recentDocs = useMemo(() => {
    return [...documents]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 10);
  }, [documents]);

  // Filtered documents
  const filteredDocs = useMemo(() => {
    let list = [...documents];

    if (activeFolderId !== 'all') {
      list = list.filter((d) => (d.folderId || 'unfiled') === activeFolderId);
    }

    if (selectedEntityFilter !== 'all') {
      list = list.filter(
        (d) =>
          d.linkedType === selectedEntityFilter ||
          d.links?.some((l) => l.entityType === selectedEntityFilter)
      );
    }

    if (fileTypeFilter === 'image') {
      list = list.filter((d) => d.fileType.startsWith('image/'));
    } else if (fileTypeFilter === 'pdf') {
      list = list.filter((d) => d.fileType.includes('pdf') || d.name.toLowerCase().endsWith('.pdf'));
    } else if (fileTypeFilter === 'other') {
      list = list.filter((d) => !d.fileType.startsWith('image/') && !d.fileType.includes('pdf'));
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((d) => {
        const nameMatch = d.name.toLowerCase().includes(q);
        const tagMatch = d.tags?.some((t) => t.toLowerCase().includes(q));
        const noteMatch = d.notes?.toLowerCase().includes(q);
        const linkMatch = d.links?.some((l) => l.entityName?.toLowerCase().includes(q));
        return nameMatch || tagMatch || noteMatch || linkMatch;
      });
    }

    list.sort((a, b) => {
      if (sortBy === 'newest') return b.createdAt.localeCompare(a.createdAt);
      if (sortBy === 'oldest') return a.createdAt.localeCompare(b.createdAt);
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'size') return (b.fileSize || 0) - (a.fileSize || 0);
      return 0;
    });

    return list;
  }, [documents, activeFolderId, selectedEntityFilter, fileTypeFilter, searchQuery, sortBy]);

  // Download document
  const handleDownload = async (doc: DocumentRecord) => {
    try {
      let url = doc.dataUrl;
      if (!url) {
        url = await loadDocumentDataUrl(doc.id);
      }
      if (url) {
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  // Move document to folder
  const handleMoveDoc = async (docId: string, folderId: string) => {
    await updateDocument(docId, { folderId });
    setIsMoveFolderModalOpen(false);
    setActiveBottomSheetDoc(null);
  };

  // Render file icon
  const renderFileIcon = (fileType: string, name: string, className = 'w-5 h-5') => {
    const lowerName = name.toLowerCase();
    if (fileType.startsWith('image/')) {
      return <ImageIcon className={`${className} text-brand-500`} />;
    }
    if (fileType.includes('pdf') || lowerName.endsWith('.pdf')) {
      return <FileText className={`${className} text-rose-500`} />;
    }
    if (
      fileType.includes('sheet') ||
      fileType.includes('excel') ||
      lowerName.endsWith('.csv') ||
      lowerName.endsWith('.xlsx')
    ) {
      return <FileSpreadsheet className={`${className} text-emerald-500`} />;
    }
    if (lowerName.endsWith('.zip') || lowerName.endsWith('.tar') || lowerName.endsWith('.gz')) {
      return <Archive className={`${className} text-amber-500`} />;
    }
    if (lowerName.endsWith('.json') || lowerName.endsWith('.js') || lowerName.endsWith('.ts')) {
      return <FileCode className={`${className} text-indigo-500`} />;
    }
    return <FileText className={`${className} text-slate-400 dark:text-slate-500`} />;
  };

  return (
    <div className="flex flex-col space-y-4 pb-24 select-none relative">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP MOBILE SEARCH BAR & CONTROLS (Internxt Mobile Style)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40 pointer-events-none" />
          <input
            type="text"
            placeholder={activeFolder ? `Search in ${activeFolder.name}...` : 'Search files, receipts, deeds...'}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 bg-surface-2/70 border border-line rounded-2xl text-xs text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink/40 hover:text-ink"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleViewMode}
          className="p-2.5 rounded-2xl border border-line bg-surface hover:bg-moss text-ink/70 hover:text-ink transition-colors shrink-0 shadow-xs"
          title={`Switch to ${viewMode === 'grid' ? 'List' : 'Grid'}`}
        >
          {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
        </button>

        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as any)}
          className="p-2.5 rounded-2xl border border-line bg-surface text-xs text-ink/70 hover:text-ink cursor-pointer focus:outline-none shrink-0 shadow-xs"
        >
          <option value="newest">Recent</option>
          <option value="name">Name</option>
          <option value="size">Size</option>
        </select>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. FOLDER DRILL-DOWN HEADER (If inside a folder)
      ───────────────────────────────────────────────────────────── */}
      {activeFolder ? (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface border border-line shadow-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onSelectFolder('all')}
              className="p-2 rounded-xl hover:bg-moss text-ink/70 hover:text-ink transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{activeFolder.icon || '📁'}</span>
              <div>
                <h2 className="text-sm font-bold text-ink leading-tight">{activeFolder.name}</h2>
                <span className="text-[11px] text-ink/50">
                  {filteredDocs.length} {filteredDocs.length === 1 ? 'file' : 'files'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onUploadClick}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add File
          </button>
        </div>
      ) : (
        <>
          {/* ─────────────────────────────────────────────────────────────
              3. INTERNAL VAULT STORAGE CARD (Internxt Mobile Style)
          ───────────────────────────────────────────────────────────── */}
          <div className="p-4 rounded-3xl bg-surface border border-line shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-brand-500/10 border border-brand-500/20 grid place-items-center text-brand-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-ink flex items-center gap-1.5">
                    Sovereign Vault Storage
                  </h3>
                  <span className="text-[11px] text-ink/50 font-mono">
                    {formatFileSize(totalStorageBytes)} encrypted locally
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-surface-2 rounded-full border border-line text-[10px] font-bold text-ink/70">
                {documents.length} Files
              </span>
            </div>

            {/* Segmented Multi-Color Progress Bar */}
            <div className="w-full h-2 bg-line rounded-full overflow-hidden flex">
              <div
                style={{
                  width: `${totalStorageBytes > 0 ? Math.max(4, (storageCategories.images / totalStorageBytes) * 100) : 0}%`,
                }}
                className="h-full bg-brand-500"
                title="Images"
              />
              <div
                style={{
                  width: `${totalStorageBytes > 0 ? Math.max(4, (storageCategories.pdfs / totalStorageBytes) * 100) : 0}%`,
                }}
                className="h-full bg-rose-500"
                title="PDFs"
              />
              <div
                style={{
                  width: `${totalStorageBytes > 0 ? Math.max(4, (storageCategories.receipts / totalStorageBytes) * 100) : 0}%`,
                }}
                className="h-full bg-amber-500"
                title="Receipts"
              />
              <div
                style={{
                  width: `${totalStorageBytes > 0 ? Math.max(4, (storageCategories.others / totalStorageBytes) * 100) : 0}%`,
                }}
                className="h-full bg-indigo-500"
                title="Other"
              />
            </div>

            {/* Storage breakdown legend */}
            <div className="flex items-center justify-between text-[10px] text-ink/60 pt-0.5 flex-wrap gap-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-500" />
                <span>Images ({formatFileSize(storageCategories.images)})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>PDFs ({formatFileSize(storageCategories.pdfs)})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Receipts ({formatFileSize(storageCategories.receipts)})</span>
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              4. CATEGORY FILTER PILLS (Horizontal Scroll)
          ───────────────────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              type="button"
              onClick={() => {
                onSelectFileTypeFilter('all');
                onSelectEntityFilter('all');
              }}
              className={`px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap font-semibold ${
                fileTypeFilter === 'all' && selectedEntityFilter === 'all'
                  ? 'border-brand-500 bg-brand-500/10 text-brand-600 font-bold'
                  : 'border-line bg-surface text-ink/70 hover:text-ink'
              }`}
            >
              All Files
            </button>

            <button
              type="button"
              onClick={() => onSelectFileTypeFilter(fileTypeFilter === 'image' ? 'all' : 'image')}
              className={`px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap font-semibold flex items-center gap-1.5 ${
                fileTypeFilter === 'image'
                  ? 'border-brand-500 bg-brand-500/10 text-brand-600 font-bold'
                  : 'border-line bg-surface text-ink/70 hover:text-ink'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 text-brand-500" />
              <span>Images</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectFileTypeFilter(fileTypeFilter === 'pdf' ? 'all' : 'pdf')}
              className={`px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap font-semibold flex items-center gap-1.5 ${
                fileTypeFilter === 'pdf'
                  ? 'border-rose-500 bg-rose-500/10 text-rose-600 font-bold'
                  : 'border-line bg-surface text-ink/70 hover:text-ink'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-rose-500" />
              <span>PDF Documents</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectEntityFilter(selectedEntityFilter === 'transaction' ? 'all' : 'transaction')}
              className={`px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap font-semibold flex items-center gap-1.5 ${
                selectedEntityFilter === 'transaction'
                  ? 'border-amber-500 bg-amber-500/10 text-amber-600 font-bold'
                  : 'border-line bg-surface text-ink/70 hover:text-ink'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Receipts & Bills</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectEntityFilter(selectedEntityFilter === 'asset' ? 'all' : 'asset')}
              className={`px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap font-semibold flex items-center gap-1.5 ${
                selectedEntityFilter === 'asset'
                  ? 'border-pine-500 bg-pine-500/10 text-pine-600 font-bold'
                  : 'border-line bg-surface text-ink/70 hover:text-ink'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-pine-500" />
              <span>Deeds & Assets</span>
            </button>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              5. RECENT ATTACHMENTS (Horizontal Carousel)
          ───────────────────────────────────────────────────────────── */}
          {recentDocs.length > 0 && searchQuery === '' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink/40">
                  Recent Files
                </h4>
              </div>

              <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
                {recentDocs.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => onOpenDoc(doc.id)}
                    className="w-36 shrink-0 p-2.5 bg-surface border border-line hover:border-brand-500/40 rounded-2xl cursor-pointer shadow-2xs space-y-2 transition-all active:scale-[0.98]"
                  >
                    <div className="w-full aspect-video rounded-xl bg-surface-2/60 border border-line/40 overflow-hidden grid place-items-center">
                      {doc.fileType.startsWith('image/') && doc.thumbnailUrl ? (
                        <img src={doc.thumbnailUrl} alt={doc.name} className="w-full h-full object-cover" />
                      ) : (
                        renderFileIcon(doc.fileType, doc.name, 'w-6 h-6')
                      )}
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-ink truncate leading-tight">
                        {doc.name}
                      </span>
                      <span className="block text-[10px] text-ink/40 font-mono mt-0.5">
                        {formatFileSize(doc.fileSize || 0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              6. FOLDERS GRID (Internxt Mobile Style)
          ───────────────────────────────────────────────────────────── */}
          {folders.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink/40">
                  Folders ({folders.length})
                </h4>
                <button
                  type="button"
                  onClick={onNewFolderClick}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> New
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {folders.map((f) => {
                  const count = documents.filter((d) => (d.folderId || 'unfiled') === f.id).length;
                  return (
                    <div
                      key={f.id}
                      onClick={() => onSelectFolder(f.id)}
                      className="flex items-center justify-between p-3 bg-surface hover:bg-surface-2 border border-line rounded-2xl cursor-pointer shadow-2xs transition-all active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl shrink-0">{f.icon || '📁'}</span>
                        <div className="min-w-0">
                          <span className="block text-xs font-bold text-ink truncate">{f.name}</span>
                          <span className="block text-[10px] text-ink/40 font-mono">
                            {count} {count === 1 ? 'file' : 'files'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveFolderMenu(f);
                        }}
                        className="p-1 rounded-lg text-ink/40 hover:text-ink"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          7. ALL FILES SECTION (List vs Grid)
      ───────────────────────────────────────────────────────────── */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-ink/40">
            Files ({filteredDocs.length})
          </h4>
        </div>

        {filteredDocs.length === 0 ? (
          <div className="py-12 text-center bg-surface border border-dashed border-line rounded-3xl p-6 space-y-2">
            <FileText className="w-8 h-8 text-ink/30 mx-auto" />
            <h4 className="text-xs font-bold text-ink">No files in this view</h4>
            <p className="text-[11px] text-ink/50">Tap the + button to upload documents</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => onOpenDoc(doc.id)}
                className="p-3 bg-surface border border-line hover:border-brand-500/40 rounded-2xl cursor-pointer shadow-2xs space-y-2.5 transition-all active:scale-[0.98]"
              >
                <div className="w-full aspect-[4/3] rounded-xl bg-surface-2/60 border border-line/40 overflow-hidden grid place-items-center relative">
                  {doc.fileType.startsWith('image/') && doc.thumbnailUrl ? (
                    <img src={doc.thumbnailUrl} alt={doc.name} className="w-full h-full object-cover" />
                  ) : (
                    renderFileIcon(doc.fileType, doc.name, 'w-8 h-8')
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveBottomSheetDoc(doc);
                    }}
                    className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-surface/80 backdrop-blur-xs text-ink/60 hover:text-ink"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <span className="block text-xs font-bold text-ink truncate leading-tight">
                    {doc.name}
                  </span>
                  <div className="flex items-center justify-between text-[10px] text-ink/40 font-mono mt-1">
                    <span>{formatFileSize(doc.fileSize || 0)}</span>
                    <span>{formatReadableDate(doc.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="divide-y divide-line/60 rounded-2xl border border-line bg-surface overflow-hidden shadow-2xs">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => onOpenDoc(doc.id)}
                className="flex items-center justify-between p-3.5 hover:bg-moss/40 cursor-pointer transition-colors active:bg-surface-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-surface-2 grid place-items-center shrink-0">
                    {renderFileIcon(doc.fileType, doc.name, 'w-5 h-5')}
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-ink truncate">{doc.name}</span>
                    <div className="flex items-center gap-2 text-[10px] text-ink/40 font-mono mt-0.5">
                      <span>{formatFileSize(doc.fileSize || 0)}</span>
                      <span>•</span>
                      <span>{formatReadableDate(doc.createdAt)}</span>
                      {doc.linkedType && (
                        <>
                          <span>•</span>
                          <span className="text-brand-600 font-semibold uppercase">{doc.linkedType}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveBottomSheetDoc(doc);
                    }}
                    className="p-2 rounded-xl hover:bg-moss text-ink/40 hover:text-ink"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          8. FLOATING ACTION BUTTON (FAB) (Internxt Style)
      ───────────────────────────────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setIsFabMenuOpen((prev) => !prev)}
          className="w-14 h-14 rounded-full bg-brand-500 hover:bg-brand-600 active:scale-95 text-white shadow-xl grid place-items-center transition-all"
        >
          <Plus className={`w-6 h-6 transition-transform duration-200 ${isFabMenuOpen ? 'rotate-45' : ''}`} />
        </button>

        {isFabMenuOpen && (
          <div className="absolute bottom-16 right-0 w-48 py-2 bg-surface border border-line rounded-2xl shadow-2xl space-y-1 z-50 text-xs font-semibold anim-scale">
            <button
              type="button"
              onClick={() => {
                setIsFabMenuOpen(false);
                onUploadClick();
              }}
              className="w-full px-4 py-2.5 hover:bg-moss flex items-center gap-3 text-ink transition-colors"
            >
              <Upload className="w-4 h-4 text-brand-500" /> Upload File
            </button>
            <button
              type="button"
              onClick={() => {
                setIsFabMenuOpen(false);
                onNewFolderClick();
              }}
              className="w-full px-4 py-2.5 hover:bg-moss flex items-center gap-3 text-ink transition-colors"
            >
              <FolderPlus className="w-4 h-4 text-amber-500" /> New Folder
            </button>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          9. MOBILE BOTTOM SHEET (File Actions)
      ───────────────────────────────────────────────────────────── */}
      {activeBottomSheetDoc && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end anim-fade"
          onClick={() => setActiveBottomSheetDoc(null)}
        >
          <div
            className="w-full max-w-lg mx-auto bg-surface border-t border-line rounded-t-3xl p-5 space-y-4 anim-slide-up shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle */}
            <div className="w-12 h-1.5 bg-line rounded-full mx-auto -mt-1" />

            {/* File info header */}
            <div className="flex items-center gap-3 pt-1">
              <div className="w-12 h-12 rounded-2xl bg-surface-2 grid place-items-center shrink-0">
                {renderFileIcon(activeBottomSheetDoc.fileType, activeBottomSheetDoc.name, 'w-6 h-6')}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-ink truncate leading-tight">
                  {activeBottomSheetDoc.name}
                </h3>
                <p className="text-[11px] text-ink/50 font-mono mt-0.5">
                  {formatFileSize(activeBottomSheetDoc.fileSize || 0)} • {formatReadableDate(activeBottomSheetDoc.createdAt)}
                </p>
              </div>
            </div>

            {/* Actions list */}
            <div className="divide-y divide-line/60 rounded-2xl border border-line overflow-hidden bg-surface-2/30 text-xs">
              <button
                type="button"
                onClick={() => {
                  onOpenDoc(activeBottomSheetDoc.id);
                  setActiveBottomSheetDoc(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-moss text-ink font-semibold"
              >
                <Eye className="w-4 h-4 text-brand-500" /> Open Full Details & Links
              </button>

              <button
                type="button"
                onClick={() => {
                  handleDownload(activeBottomSheetDoc);
                  setActiveBottomSheetDoc(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-moss text-ink font-semibold"
              >
                <Download className="w-4 h-4 text-blue-500" /> Download File
              </button>

              <button
                type="button"
                onClick={() => {
                  toggleStar(activeBottomSheetDoc.id);
                  setActiveBottomSheetDoc(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-moss text-ink font-semibold"
              >
                <Star className="w-4 h-4 text-amber-500" />
                {starredIds.has(activeBottomSheetDoc.id) ? 'Unstar' : 'Add to Favorites'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMoveFolderModalOpen(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-moss text-ink font-semibold"
              >
                <Folder className="w-4 h-4 text-indigo-500" /> Move to Folder
              </button>

              <button
                type="button"
                onClick={() => {
                  onDeleteDoc(activeBottomSheetDoc);
                  setActiveBottomSheetDoc(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 font-semibold"
              >
                <Trash2 className="w-4 h-4" /> Delete Document
              </button>
            </div>

            <button
              type="button"
              onClick={() => setActiveBottomSheetDoc(null)}
              className="w-full py-3 rounded-2xl bg-surface-2 border border-line text-xs font-bold text-ink hover:bg-moss transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          10. MOVE TO FOLDER MODAL
      ───────────────────────────────────────────────────────────── */}
      {isMoveFolderModalOpen && activeBottomSheetDoc && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 anim-fade"
          onClick={() => setIsMoveFolderModalOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-surface border border-line rounded-3xl p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink">Move to Folder</h3>
              <button
                type="button"
                onClick={() => setIsMoveFolderModalOpen(false)}
                className="p-1 rounded-lg hover:bg-moss text-ink/40 hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1 max-h-60 overflow-y-auto">
              <button
                type="button"
                onClick={() => handleMoveDoc(activeBottomSheetDoc.id, 'unfiled')}
                className="w-full p-2.5 rounded-xl hover:bg-moss text-left text-xs font-semibold text-ink flex items-center gap-2"
              >
                <Folder className="w-4 h-4 text-ink/40" /> Unfiled
              </button>
              {folders.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleMoveDoc(activeBottomSheetDoc.id, f.id)}
                  className="w-full p-2.5 rounded-xl hover:bg-moss text-left text-xs font-semibold text-ink flex items-center gap-2"
                >
                  <span>{f.icon || '📁'}</span>
                  <span className="truncate">{f.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          11. FOLDER ACTIONS MODAL
      ───────────────────────────────────────────────────────────── */}
      {activeFolderMenu && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end anim-fade"
          onClick={() => setActiveFolderMenu(null)}
        >
          <div
            className="w-full max-w-lg mx-auto bg-surface border-t border-line rounded-t-3xl p-5 space-y-4 anim-slide-up shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-line rounded-full mx-auto -mt-1" />

            <div className="flex items-center gap-3 pt-1">
              <span className="text-3xl">{activeFolderMenu.icon || '📁'}</span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-ink truncate">{activeFolderMenu.name}</h3>
                <p className="text-[11px] text-ink/50">Folder</p>
              </div>
            </div>

            <div className="divide-y divide-line/60 rounded-2xl border border-line overflow-hidden bg-surface-2/30 text-xs">
              <button
                type="button"
                onClick={() => {
                  onSelectFolder(activeFolderMenu.id);
                  setActiveFolderMenu(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-moss text-ink font-semibold"
              >
                <Folder className="w-4 h-4 text-brand-500" /> Open Folder
              </button>

              {onDeleteFolder && (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteFolder(activeFolderMenu.id);
                    setActiveFolderMenu(null);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 font-semibold"
                >
                  <Trash2 className="w-4 h-4" /> Delete Folder
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setActiveFolderMenu(null)}
              className="w-full py-3 rounded-2xl bg-surface-2 border border-line text-xs font-bold text-ink hover:bg-moss transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
