import React, { useState, useMemo } from 'react';
import { formatFileSize } from '../../utils/formatters';
import { formatReadableDate } from '../../utils/dates';
import type { DocumentRecord, DocumentFolder, LinkedEntityType } from '../../types';
import {
  HardDrive,
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
  totalStorageBytes,
}) => {
  const [activeBottomSheetDoc, setActiveBottomSheetDoc] = useState<DocumentRecord | null>(null);
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);

  const folderLookup = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);

  const activeFolder = useMemo(() => {
    if (activeFolderId === 'all') return null;
    return folderLookup.get(activeFolderId) || null;
  }, [activeFolderId, folderLookup]);

  // Storage category sizes
  const storageCategories = useMemo(() => {
    let images = 0;
    let pdfs = 0;
    let others = 0;

    for (const d of documents) {
      const size = d.fileSize || 0;
      if (d.fileType.startsWith('image/')) images += size;
      else if (d.fileType.includes('pdf') || d.name.toLowerCase().endsWith('.pdf')) pdfs += size;
      else others += size;
    }

    return { images, pdfs, others };
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

  return (
    <div className="flex flex-col space-y-5 pb-24 select-none relative">
      {/* ─────────────────────────────────────────────────────────────
          1. ANDROID SEARCH PILL & VIEW CONTROLS
      ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40 pointer-events-none" />
          <input
            type="text"
            placeholder={activeFolder ? `Search in ${activeFolder.name}...` : 'Search files & documents...'}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-2/70 border border-line rounded-2xl text-xs text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
          />
        </div>

        <button
          type="button"
          onClick={onToggleViewMode}
          className="p-2.5 rounded-2xl border border-line bg-surface-2/70 text-ink/70 hover:text-ink transition-colors shrink-0 shadow-xs"
          title="Toggle Grid/List"
        >
          {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
        </button>

        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as any)}
          className="p-2.5 rounded-2xl border border-line bg-surface-2/70 text-xs text-ink/70 hover:text-ink cursor-pointer focus:outline-none shrink-0 shadow-xs"
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
              className="p-1.5 rounded-xl hover:bg-moss/70 text-ink/70 hover:text-ink transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
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
              3. INTERNAL VAULT STORAGE CARD (Google Files style)
          ───────────────────────────────────────────────────────────── */}
          <div className="p-4 rounded-3xl bg-gradient-to-br from-surface to-surface-2/90 border border-line shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200/60 dark:border-brand-800/60 grid place-items-center text-brand-600">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-ink flex items-center gap-1.5">
                    Internal Vault Storage
                    <ShieldCheck className="w-3.5 h-3.5 text-pine-500" />
                  </h3>
                  <span className="text-[11px] text-ink/50 font-mono">
                    {formatFileSize(totalStorageBytes)} of sovereign encrypted memory
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-surface rounded-full border border-line text-[10px] font-bold text-ink/70">
                {documents.length} Files
              </span>
            </div>

            {/* Segmented Multi-Color Storage Progress Bar */}
            <div className="w-full h-2 bg-line/80 rounded-full overflow-hidden flex">
              <div
                style={{
                  width: `${totalStorageBytes > 0 ? Math.max(5, (storageCategories.images / totalStorageBytes) * 100) : 0}%`,
                }}
                className="h-full bg-brand-500"
                title="Images"
              />
              <div
                style={{
                  width: `${totalStorageBytes > 0 ? Math.max(5, (storageCategories.pdfs / totalStorageBytes) * 100) : 0}%`,
                }}
                className="h-full bg-rose-500"
                title="PDF Documents"
              />
              <div
                style={{
                  width: `${totalStorageBytes > 0 ? Math.max(5, (storageCategories.others / totalStorageBytes) * 100) : 0}%`,
                }}
                className="h-full bg-amber-500"
                title="Other Attachments"
              />
            </div>

            {/* Category Size Legend */}
            <div className="flex items-center justify-between text-[10px] text-ink/60 pt-0.5">
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
                <span>Other ({formatFileSize(storageCategories.others)})</span>
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              4. CATEGORIES TILES ROW (Google Files style)
          ───────────────────────────────────────────────────────────── */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink/50 px-1">
              Categories
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => onSelectFileTypeFilter(fileTypeFilter === 'image' ? 'all' : 'image')}
                className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left shadow-xs ${
                  fileTypeFilter === 'image'
                    ? 'border-brand-500 bg-brand-50/40 dark:bg-brand-950/40 ring-1 ring-brand-500/30'
                    : 'border-line bg-surface hover:bg-moss/40'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-950/80 text-brand-600 grid place-items-center shrink-0">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-ink truncate">Images</span>
                  <span className="block text-[10px] text-ink/40 font-mono">
                    {documents.filter((d) => d.fileType.startsWith('image/')).length} items
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onSelectFileTypeFilter(fileTypeFilter === 'pdf' ? 'all' : 'pdf')}
                className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left shadow-xs ${
                  fileTypeFilter === 'pdf'
                    ? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/40 ring-1 ring-rose-500/30'
                    : 'border-line bg-surface hover:bg-moss/40'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 grid place-items-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-ink truncate">PDF Documents</span>
                  <span className="block text-[10px] text-ink/40 font-mono">
                    {documents.filter((d) => d.fileType.includes('pdf') || d.name.toLowerCase().endsWith('.pdf')).length} items
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onSelectEntityFilter(selectedEntityFilter === 'asset' ? 'all' : 'asset')}
                className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left shadow-xs ${
                  selectedEntityFilter === 'asset'
                    ? 'border-pine-500 bg-pine-50/40 dark:bg-pine-950/40 ring-1 ring-pine-500/30'
                    : 'border-line bg-surface hover:bg-moss/40'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-pine-100 dark:bg-pine-950/80 text-pine-600 grid place-items-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-ink truncate">Deeds & Deeds</span>
                  <span className="block text-[10px] text-ink/40 font-mono">
                    {documents.filter((d) => d.folderId === 'deeds' || d.linkedType === 'asset').length} items
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onSelectEntityFilter(selectedEntityFilter === 'transaction' ? 'all' : 'transaction')}
                className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left shadow-xs ${
                  selectedEntityFilter === 'transaction'
                    ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/40 ring-1 ring-amber-500/30'
                    : 'border-line bg-surface hover:bg-moss/40'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 grid place-items-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-ink truncate">Receipts & Bills</span>
                  <span className="block text-[10px] text-ink/40 font-mono">
                    {documents.filter((d) => d.folderId === 'receipts' || d.linkedType === 'transaction').length} items
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              5. COLLECTIONS & FOLDERS (Horizontal Cards Scroll)
          ───────────────────────────────────────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink/50">
                Collections & Folders ({folders.length})
              </h4>
              <button
                type="button"
                onClick={onNewFolderClick}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> New Folder
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {folders.map((f) => {
                const count = documents.filter((d) => (d.folderId || 'unfiled') === f.id).length;
                return (
                  <div
                    key={f.id}
                    onClick={() => onSelectFolder(f.id)}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-line bg-surface hover:bg-moss/60 cursor-pointer transition-all shadow-xs group"
                  >
                    <span className="text-2xl shrink-0">{f.icon || '📁'}</span>
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-ink truncate group-hover:text-brand-600 dark:group-hover:text-brand-400">
                        {f.name}
                      </span>
                      <span className="block text-[10px] text-ink/40 font-mono">
                        {count} {count === 1 ? 'file' : 'files'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              6. RECENT FILES (Horizontal Strip)
          ───────────────────────────────────────────────────────────── */}
          {recentDocs.length > 0 && !searchQuery && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink/50 px-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Recent Files
              </h4>
              <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 no-scrollbar">
                {recentDocs.map((doc) => {
                  const isImage = doc.fileType.startsWith('image/');
                  const isPdf = doc.fileType.includes('pdf') || doc.name.toLowerCase().endsWith('.pdf');

                  return (
                    <div
                      key={doc.id}
                      onClick={() => onOpenDoc(doc.id)}
                      className="w-36 shrink-0 rounded-2xl border border-line bg-surface overflow-hidden shadow-xs hover:border-brand-400 hover:shadow-sm cursor-pointer transition-all"
                    >
                      <div className="h-24 w-full bg-surface-2 flex items-center justify-center overflow-hidden relative">
                        {doc.thumbnailUrl ? (
                          <img src={doc.thumbnailUrl} alt={doc.name} className="w-full h-full object-cover" />
                        ) : isImage ? (
                          <ImageIcon className="w-8 h-8 text-brand-400" />
                        ) : isPdf ? (
                          <FileText className="w-8 h-8 text-rose-500" />
                        ) : (
                          <FileText className="w-8 h-8 text-ink/30" />
                        )}
                      </div>
                      <div className="p-2 space-y-0.5">
                        <span className="block text-[11px] font-bold text-ink truncate">{doc.name}</span>
                        <span className="block text-[9px] text-ink/40 font-mono">{formatFileSize(doc.fileSize)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          7. ALL FILES SECTION (Grid or Dense List)
      ───────────────────────────────────────────────────────────── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-ink/50">
            {activeFolder ? 'Folder Contents' : 'All Files'} ({filteredDocs.length})
          </h4>
        </div>

        {filteredDocs.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-line rounded-3xl text-xs text-ink/40 space-y-2">
            <p>No documents found in this view.</p>
            <button
              type="button"
              onClick={onUploadClick}
              className="px-4 py-2 bg-brand-500 text-white rounded-xl font-semibold shadow-xs"
            >
              Upload Attachment
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredDocs.map((doc) => {
              const isImage = doc.fileType.startsWith('image/');
              const isPdf = doc.fileType.includes('pdf') || doc.name.toLowerCase().endsWith('.pdf');

              return (
                <div
                  key={doc.id}
                  onClick={() => onOpenDoc(doc.id)}
                  className="rounded-2xl border border-line bg-surface overflow-hidden shadow-xs hover:border-brand-400 cursor-pointer transition-all group relative"
                >
                  <div className="h-28 w-full bg-surface-2 flex items-center justify-center overflow-hidden relative">
                    {doc.thumbnailUrl ? (
                      <img src={doc.thumbnailUrl} alt={doc.name} className="w-full h-full object-cover" />
                    ) : isImage ? (
                      <ImageIcon className="w-10 h-10 text-brand-400" />
                    ) : isPdf ? (
                      <FileText className="w-10 h-10 text-rose-500" />
                    ) : (
                      <FileText className="w-10 h-10 text-ink/30" />
                    )}

                    {/* 3-Dot Overflow Menu Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveBottomSheetDoc(doc);
                      }}
                      className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
                      title="Actions"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="p-2.5 space-y-1">
                    <span className="block text-xs font-bold text-ink truncate">{doc.name}</span>
                    <div className="flex items-center justify-between text-[10px] text-ink/40 font-mono">
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>{doc.createdAt.split('T')[0]}</span>
                    </div>

                    {doc.links && doc.links.length > 0 && (
                      <div className="pt-0.5 flex items-center gap-1 text-[10px] text-pine-600 dark:text-pine-400 truncate">
                        <Link2 className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{doc.links[0].entityName || doc.links[0].entityType}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="divide-y divide-line/60 rounded-2xl border border-line bg-surface overflow-hidden shadow-xs">
            {filteredDocs.map((doc) => {
              const isImage = doc.fileType.startsWith('image/');
              const isPdf = doc.fileType.includes('pdf') || doc.name.toLowerCase().endsWith('.pdf');

              return (
                <div
                  key={doc.id}
                  onClick={() => onOpenDoc(doc.id)}
                  className="flex items-center justify-between p-3 hover:bg-moss/40 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-surface-2 border border-line/60 overflow-hidden flex items-center justify-center shrink-0">
                      {doc.thumbnailUrl ? (
                        <img src={doc.thumbnailUrl} alt={doc.name} className="w-full h-full object-cover" />
                      ) : isImage ? (
                        <ImageIcon className="w-5 h-5 text-brand-500" />
                      ) : isPdf ? (
                        <FileText className="w-5 h-5 text-rose-500" />
                      ) : (
                        <FileText className="w-5 h-5 text-ink/30" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-ink truncate">{doc.name}</span>
                      <div className="flex items-center gap-2 text-[10px] text-ink/40 font-mono">
                        <span>{formatFileSize(doc.fileSize)}</span>
                        <span>•</span>
                        <span>{doc.createdAt.split('T')[0]}</span>
                        {doc.links && doc.links.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-pine-600 dark:text-pine-400 truncate">
                              {doc.links[0].entityName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveBottomSheetDoc(doc);
                    }}
                    className="p-2 text-ink/40 hover:text-ink rounded-xl"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          8. FLOATING ACTION BUTTON (Android Mobile FAB)
      ───────────────────────────────────────────────────────────── */}
      <div className="fixed bottom-20 right-6 z-30">
        <button
          type="button"
          onClick={() => setIsFabMenuOpen(!isFabMenuOpen)}
          className="w-14 h-14 rounded-full bg-brand-500 hover:bg-brand-600 text-white shadow-xl flex items-center justify-center transition-transform active:scale-95"
        >
          <Plus className={`w-6 h-6 transition-transform ${isFabMenuOpen ? 'rotate-45' : ''}`} />
        </button>

        {isFabMenuOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setIsFabMenuOpen(false)} />
            <div className="absolute bottom-16 right-0 z-30 flex flex-col items-end space-y-2 mb-1 select-none">
              <button
                type="button"
                onClick={() => {
                  setIsFabMenuOpen(false);
                  onNewFolderClick();
                }}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-surface text-ink text-xs font-bold shadow-lg border border-line"
              >
                <span>New Folder</span>
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 grid place-items-center">
                  <FolderPlus className="w-4 h-4" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsFabMenuOpen(false);
                  onUploadClick();
                }}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-surface text-ink text-xs font-bold shadow-lg border border-line"
              >
                <span>Upload Document</span>
                <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 grid place-items-center">
                  <Upload className="w-4 h-4" />
                </div>
              </button>
            </div>
          </>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          9. MOBILE ACTION BOTTOM SHEET (When 3-dots tapped)
      ───────────────────────────────────────────────────────────── */}
      {activeBottomSheetDoc && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-xs transition-opacity"
            onClick={() => setActiveBottomSheetDoc(null)}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-surface rounded-t-3xl border-t border-line shadow-2xl p-5 z-50 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Header with thumbnail & name */}
            <div className="flex items-center gap-3 pb-3 border-b border-line">
              <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-line overflow-hidden flex items-center justify-center shrink-0">
                {activeBottomSheetDoc.thumbnailUrl ? (
                  <img
                    src={activeBottomSheetDoc.thumbnailUrl}
                    alt={activeBottomSheetDoc.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FileText className="w-6 h-6 text-ink/40" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xs font-bold text-ink truncate">{activeBottomSheetDoc.name}</h3>
                <span className="text-[11px] text-ink/50 font-mono">
                  {formatFileSize(activeBottomSheetDoc.fileSize)} • {activeBottomSheetDoc.fileType}
                </span>
              </div>
            </div>

            {/* Action Items */}
            <div className="space-y-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  const doc = activeBottomSheetDoc;
                  setActiveBottomSheetDoc(null);
                  onOpenDoc(doc.id);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-moss/60 text-ink font-semibold"
              >
                <Eye className="w-5 h-5 text-brand-500" />
                <span>Open in Lightbox</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const doc = activeBottomSheetDoc;
                  setActiveBottomSheetDoc(null);
                  onDeleteDoc(doc);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 font-semibold"
              >
                <Trash2 className="w-5 h-5 text-rose-500" />
                <span>Delete Attachment</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
