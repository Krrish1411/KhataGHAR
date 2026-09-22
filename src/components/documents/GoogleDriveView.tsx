import React, { useState, useRef, useMemo, useEffect } from 'react';
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
  SlidersHorizontal,
  ChevronRight,
  Star,
  Clock,
  Link2,
  FileText,
  Image as ImageIcon,
  MoreVertical,
  Download,
  Trash2,
  Eye,
  Info,
  Keyboard,
  ShieldCheck,
  Check,
  X,
  CornerDownLeft,
  ArrowUpDown,
  MoveRight,
} from 'lucide-react';
import { useDriveShortcuts } from '../../hooks/useDriveShortcuts';
import { DriveShortcutsModal } from './DriveShortcutsModal';

interface GoogleDriveViewProps {
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

export const GoogleDriveView: React.FC<GoogleDriveViewProps> = ({
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
  // Navigation section: 'my-drive' | 'recent' | 'starred' | 'entities'
  const [navSection, setNavSection] = useState<'my-drive' | 'recent' | 'starred' | 'entities'>('my-drive');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    doc: DocumentRecord;
  } | null>(null);

  // Starred IDs set (stored in localStorage)
  const [starredIds, setStarredIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('khata_starred_docs');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggleStar = (docId: string, e?: React.MouseEvent) => {
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
  };

  const searchInputRef = useRef<HTMLInputElement>(null);

  const folderLookup = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);

  // Active folder details
  const activeFolder = useMemo(() => {
    if (activeFolderId === 'all') return null;
    return folderLookup.get(activeFolderId) || null;
  }, [activeFolderId, folderLookup]);

  // Filter documents based on drive navigation section and filters
  const displayedDocs = useMemo(() => {
    let list = [...documents];

    // Navigation Section filter
    if (navSection === 'starred') {
      list = list.filter((d) => starredIds.has(d.id));
    } else if (navSection === 'recent') {
      // Last 30 days or top 20 recent
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      list = list.filter((d) => new Date(d.createdAt) >= thirtyDaysAgo);
    } else if (navSection === 'my-drive' && activeFolderId !== 'all') {
      list = list.filter((d) => (d.folderId || 'unfiled') === activeFolderId);
    }

    // Entity filter
    if (selectedEntityFilter !== 'all') {
      list = list.filter(
        (d) =>
          d.linkedType === selectedEntityFilter ||
          d.links?.some((l) => l.entityType === selectedEntityFilter)
      );
    }

    // File type filter
    if (fileTypeFilter === 'image') {
      list = list.filter((d) => d.fileType.startsWith('image/'));
    } else if (fileTypeFilter === 'pdf') {
      list = list.filter((d) => d.fileType.includes('pdf') || d.name.toLowerCase().endsWith('.pdf'));
    } else if (fileTypeFilter === 'other') {
      list = list.filter((d) => !d.fileType.startsWith('image/') && !d.fileType.includes('pdf'));
    }

    // Search query filter
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

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'newest') return b.createdAt.localeCompare(a.createdAt);
      if (sortBy === 'oldest') return a.createdAt.localeCompare(b.createdAt);
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'size') return (b.fileSize || 0) - (a.fileSize || 0);
      return 0;
    });

    return list;
  }, [
    documents,
    navSection,
    activeFolderId,
    selectedEntityFilter,
    fileTypeFilter,
    searchQuery,
    sortBy,
    starredIds,
  ]);

  // Selected doc details
  const selectedDoc = useMemo(() => {
    if (!selectedDocId) return displayedDocs[0] || null;
    return documents.find((d) => d.id === selectedDocId) || null;
  }, [selectedDocId, documents, displayedDocs]);

  // Keyboard Shortcuts Hook
  useDriveShortcuts({
    onSearchFocus: () => searchInputRef.current?.focus(),
    onToggleViewMode: () => onToggleViewMode(),
    onNewFolder: () => onNewFolderClick(),
    onUpload: () => onUploadClick(),
    onToggleInspector: () => setIsInspectorOpen((prev) => !prev),
    onToggleStar: () => {
      if (selectedDoc) toggleStar(selectedDoc.id);
    },
    onShowShortcuts: () => setIsShortcutsModalOpen(true),
    onSelectNext: () => {
      if (displayedDocs.length === 0) return;
      const idx = displayedDocs.findIndex((d) => d.id === selectedDocId);
      const nextIdx = idx < displayedDocs.length - 1 ? idx + 1 : 0;
      setSelectedDocId(displayedDocs[nextIdx].id);
    },
    onSelectPrev: () => {
      if (displayedDocs.length === 0) return;
      const idx = displayedDocs.findIndex((d) => d.id === selectedDocId);
      const prevIdx = idx > 0 ? idx - 1 : displayedDocs.length - 1;
      setSelectedDocId(displayedDocs[prevIdx].id);
    },
    onClearSelection: () => {
      setSelectedDocId(null);
      setContextMenu(null);
    },
    onOpenSelected: () => {
      if (selectedDoc) onOpenDoc(selectedDoc.id);
    },
    onDeleteSelected: () => {
      if (selectedDoc) onDeleteDoc(selectedDoc);
    },
    onNavigateUp: () => {
      if (activeFolderId !== 'all') onSelectFolder('all');
    },
    isEnabled: true,
  });

  // Close context menu on global click
  useEffect(() => {
    const handleOutside = () => setContextMenu(null);
    window.addEventListener('click', handleOutside);
    return () => window.removeEventListener('click', handleOutside);
  }, []);

  // Format Storage breakdown string
  const storageFormatted = useMemo(() => formatFileSize(totalStorageBytes), [totalStorageBytes]);

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] min-h-[580px] bg-surface rounded-3xl border border-line/80 shadow-xs overflow-hidden">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP DRIVE TOOLBAR & BREADCRUMBS
      ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 px-6 py-3 border-b border-line bg-surface-2/40 select-none">
        {/* Left: Breadcrumbs navigation */}
        <div className="flex items-center gap-1.5 text-xs text-ink/70">
          <button
            type="button"
            onClick={() => {
              setNavSection('my-drive');
              onSelectFolder('all');
            }}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-moss/70 font-semibold text-ink transition-colors"
          >
            <HardDrive className="w-4 h-4 text-brand-500" />
            <span>My Vault Storage</span>
          </button>

          {activeFolder && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-ink/30" />
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-moss/80 font-bold text-ink">
                <span>{activeFolder.icon || '📁'}</span>
                <span>{activeFolder.name}</span>
              </div>
            </>
          )}

          {navSection === 'starred' && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-ink/30" />
              <span className="flex items-center gap-1 px-2 py-1 font-bold text-amber-500">
                <Star className="w-3.5 h-3.5 fill-amber-400" /> Starred
              </span>
            </>
          )}

          {navSection === 'recent' && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-ink/30" />
              <span className="flex items-center gap-1 px-2 py-1 font-bold text-blue-500">
                <Clock className="w-3.5 h-3.5" /> Recent
              </span>
            </>
          )}
        </div>

        {/* Center: Google Drive Search Bar */}
        <div className="flex-1 max-w-xl relative">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 text-ink/40 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search in Vault... (Press '/' to focus)"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-20 py-2 text-xs bg-surface border border-line rounded-full shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-ink placeholder:text-ink/40 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-8 p-1 text-ink/40 hover:text-ink transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <kbd className="absolute right-3 px-1.5 py-0.5 text-[10px] font-mono text-ink/40 bg-surface-2 border border-line rounded">
              /
            </kbd>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Grid / List Toggle */}
          <button
            type="button"
            onClick={onToggleViewMode}
            className="p-2 rounded-xl text-ink/60 hover:text-ink hover:bg-moss/70 transition-colors border border-transparent hover:border-line"
            title={`Toggle View Mode (V) — Current: ${viewMode}`}
          >
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          </button>

          {/* Sort Dropdown */}
          <div className="relative group">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as any)}
              className="text-xs bg-transparent border border-line rounded-xl px-2.5 py-1.5 text-ink/70 hover:text-ink cursor-pointer focus:outline-none"
            >
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="name">Sort: Name (A-Z)</option>
              <option value="size">Sort: File Size</option>
            </select>
          </div>

          {/* Toggle Inspector Pane */}
          <button
            type="button"
            onClick={() => setIsInspectorOpen(!isInspectorOpen)}
            className={`p-2 rounded-xl border transition-colors ${
              isInspectorOpen
                ? 'bg-brand-50 dark:bg-brand-950/50 text-brand-600 border-brand-200 dark:border-brand-800'
                : 'text-ink/60 hover:text-ink hover:bg-moss/70 border-transparent hover:border-line'
            }`}
            title="Details Inspector (I)"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Keyboard Shortcuts Help Button */}
          <button
            type="button"
            onClick={() => setIsShortcutsModalOpen(true)}
            className="p-2 rounded-xl text-ink/60 hover:text-ink hover:bg-moss/70 transition-colors border border-transparent hover:border-line"
            title="Keyboard Shortcuts (?)"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN SPLIT BODY (Sidebar + Files Workspace + Inspector)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Drive Navigation Rail */}
        <div className="w-64 shrink-0 border-r border-line bg-surface/60 flex flex-col justify-between p-3 select-none overflow-y-auto">
          <div className="space-y-4">
            {/* Google Drive '+ New' Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
              >
                <div className="w-4 h-4 rounded-full bg-white/20 grid place-items-center">
                  <span className="text-sm leading-none font-bold">+</span>
                </div>
                <span>New</span>
              </button>

              {/* '+ New' Dropdown Menu */}
              {isNewMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setIsNewMenuOpen(false)}
                  />
                  <div className="absolute top-12 left-0 w-52 bg-surface rounded-2xl border border-line shadow-xl p-1.5 z-30 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsNewMenuOpen(false);
                        onUploadClick();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-ink hover:bg-moss/70 rounded-xl transition-colors text-left"
                    >
                      <Upload className="w-4 h-4 text-brand-500" />
                      <span>Upload Document (U)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsNewMenuOpen(false);
                        onNewFolderClick();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-ink hover:bg-moss/70 rounded-xl transition-colors text-left"
                    >
                      <FolderPlus className="w-4 h-4 text-amber-500" />
                      <span>New Folder (N)</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Main Drive Tree */}
            <div className="space-y-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setNavSection('my-drive');
                  onSelectFolder('all');
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                  navSection === 'my-drive' && activeFolderId === 'all'
                    ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-bold'
                    : 'text-ink/70 hover:text-ink hover:bg-moss/50 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <HardDrive className="w-4 h-4 text-brand-500" />
                  <span>My Vault Storage</span>
                </div>
                <span className="text-[11px] font-mono text-ink/40">{documents.length}</span>
              </button>

              <button
                type="button"
                onClick={() => setNavSection('recent')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                  navSection === 'recent'
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold'
                    : 'text-ink/70 hover:text-ink hover:bg-moss/50 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span>Recent</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setNavSection('starred')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                  navSection === 'starred'
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold'
                    : 'text-ink/70 hover:text-ink hover:bg-moss/50 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span>Starred</span>
                </div>
                <span className="text-[11px] font-mono text-ink/40">{starredIds.size}</span>
              </button>
            </div>

            {/* Folders List */}
            <div className="space-y-1.5 pt-2 border-t border-line/60">
              <div className="flex items-center justify-between px-2 text-[11px] font-bold text-ink/40 uppercase tracking-wider">
                <span>Folders</span>
                <button
                  type="button"
                  onClick={onNewFolderClick}
                  className="p-0.5 hover:text-brand-500 transition-colors"
                  title="Create folder"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-0.5">
                {folders.map((f) => {
                  const isSelected = navSection === 'my-drive' && activeFolderId === f.id;
                  const count = documents.filter((d) => (d.folderId || 'unfiled') === f.id).length;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setNavSection('my-drive');
                        onSelectFolder(f.id);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors group ${
                        isSelected
                          ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-bold'
                          : 'text-ink/70 hover:text-ink hover:bg-moss/50 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-sm">{f.icon || '📁'}</span>
                        <span className="truncate">{f.name}</span>
                      </div>
                      <span className="text-[11px] font-mono text-ink/40 group-hover:text-ink/70">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Linked Entity Filter Section */}
            <div className="space-y-1.5 pt-2 border-t border-line/60">
              <span className="block px-2 text-[11px] font-bold text-ink/40 uppercase tracking-wider">
                Linked By Entity
              </span>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                {(
                  [
                    { id: 'all', label: 'All Entities' },
                    { id: 'transaction', label: 'Tx Entries' },
                    { id: 'asset', label: 'Assets' },
                    { id: 'liability', label: 'Loans' },
                    { id: 'people', label: 'People' },
                    { id: 'account', label: 'Accounts' },
                  ] as const
                ).map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => onSelectEntityFilter(e.id)}
                    className={`px-2 py-1 rounded-lg text-left truncate transition-colors ${
                      selectedEntityFilter === e.id
                        ? 'bg-pine-50 dark:bg-pine-950/60 text-pine-700 dark:text-pine-300 font-bold border border-pine-200 dark:border-pine-800'
                        : 'text-ink/60 hover:text-ink hover:bg-moss/40'
                    }`}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Storage Quota Footer Card */}
          <div className="pt-3 border-t border-line/60">
            <div className="p-3 bg-surface-2/60 rounded-2xl border border-line/60 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-ink flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-pine-500" />
                  Encrypted Storage
                </span>
                <span className="font-mono text-ink/60">{storageFormatted}</span>
              </div>
              <div className="w-full h-1.5 bg-line rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-500 to-pine-500 rounded-full"
                  style={{
                    width: `${Math.min(100, Math.max(5, (totalStorageBytes / (100 * 1024 * 1024)) * 100))}%`,
                  }}
                />
              </div>
              <span className="block text-[10px] text-ink/40 leading-tight">
                {documents.length} sovereign files in AES-256 vault
              </span>
            </div>
          </div>
        </div>

        {/* Center: File Browser Workspace */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0 bg-surface overflow-y-auto p-6 space-y-6">
          {/* Quick Category / Format Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none">
            {(
              [
                { id: 'all', label: 'All Formats' },
                { id: 'image', label: '🖼️ Images' },
                { id: 'pdf', label: '📄 PDFs' },
                { id: 'other', label: '📦 Other' },
              ] as const
            ).map((fmt) => (
              <button
                key={fmt.id}
                type="button"
                onClick={() => onSelectFileTypeFilter(fmt.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 ${
                  fileTypeFilter === fmt.id
                    ? 'bg-brand-500 text-white shadow-xs'
                    : 'bg-surface-2 text-ink/70 hover:text-ink hover:bg-moss/70 border border-line'
                }`}
              >
                {fmt.label}
              </button>
            ))}
          </div>

          {/* Folders Section (Only in Root or All view) */}
          {activeFolderId === 'all' && navSection === 'my-drive' && folders.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-ink/50 uppercase tracking-wider">Folders</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {folders.map((f) => {
                  const count = documents.filter((d) => (d.folderId || 'unfiled') === f.id).length;
                  return (
                    <div
                      key={f.id}
                      onClick={() => onSelectFolder(f.id)}
                      onDoubleClick={() => onSelectFolder(f.id)}
                      className="flex items-center gap-3 p-3 rounded-2xl border border-line bg-surface-2/40 hover:bg-moss/60 hover:border-brand-300 dark:hover:border-brand-700 cursor-pointer transition-all shadow-xs group"
                    >
                      <span className="text-xl shrink-0">{f.icon || '📁'}</span>
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
          )}

          {/* Files Section Header */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-ink/50 uppercase tracking-wider">
                Files ({displayedDocs.length})
              </h3>
              <span className="text-[11px] text-ink/40 font-mono">
                Click to inspect • Double-click to preview • '?' for shortcuts
              </span>
            </div>

            {/* Empty State */}
            {displayedDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-line rounded-3xl space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/50 grid place-items-center text-brand-500">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-ink">No Documents Found</h4>
                  <p className="text-xs text-ink/50 max-w-sm">
                    {searchQuery
                      ? `No files matched "${searchQuery}". Try adjusting your search query or filters.`
                      : 'No attachments in this view. Click Upload Document or press U to add one.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onUploadClick}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                >
                  Upload Document
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              /* ── Grid View ── */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
                {displayedDocs.map((doc) => {
                  const isSelected = selectedDocId === doc.id;
                  const isStarred = starredIds.has(doc.id);
                  const isImage = doc.fileType.startsWith('image/');
                  const isPdf = doc.fileType.includes('pdf') || doc.name.toLowerCase().endsWith('.pdf');

                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDocId(doc.id)}
                      onDoubleClick={() => onOpenDoc(doc.id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setSelectedDocId(doc.id);
                        setContextMenu({ x: e.clientX, y: e.clientY, doc });
                      }}
                      className={`group relative flex flex-col rounded-2xl border transition-all cursor-pointer overflow-hidden bg-surface shadow-xs ${
                        isSelected
                          ? 'border-brand-500 ring-2 ring-brand-500/20 shadow-md bg-brand-50/10'
                          : 'border-line hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-sm'
                      }`}
                    >
                      {/* Thumbnail / Preview Canvas */}
                      <div className="h-28 w-full bg-surface-2/70 flex items-center justify-center overflow-hidden relative border-b border-line/40">
                        {doc.thumbnailUrl ? (
                          <img
                            src={doc.thumbnailUrl}
                            alt={doc.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : isImage ? (
                          <ImageIcon className="w-10 h-10 text-brand-400/80" />
                        ) : isPdf ? (
                          <FileText className="w-10 h-10 text-rose-500/80" />
                        ) : (
                          <FileText className="w-10 h-10 text-ink/30" />
                        )}

                        {/* Top badges: Star + Format */}
                        <button
                          type="button"
                          onClick={(e) => toggleStar(doc.id, e)}
                          className={`absolute top-2 right-2 p-1.5 rounded-full transition-all ${
                            isStarred
                              ? 'bg-white text-amber-500 shadow-sm'
                              : 'bg-black/20 text-white/70 opacity-0 group-hover:opacity-100 hover:text-white'
                          }`}
                          title={isStarred ? 'Unstar' : 'Star (S)'}
                        >
                          <Star className={`w-3 h-3 ${isStarred ? 'fill-amber-400' : ''}`} />
                        </button>
                      </div>

                      {/* File Card Meta */}
                      <div className="p-3 space-y-1">
                        <div className="flex items-center gap-1.5">
                          {isImage ? (
                            <ImageIcon className="w-3.5 h-3.5 shrink-0 text-brand-500" />
                          ) : isPdf ? (
                            <FileText className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 shrink-0 text-ink/40" />
                          )}
                          <span className="text-xs font-semibold text-ink truncate flex-1">
                            {doc.name}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-ink/40 font-mono">
                          <span>{formatFileSize(doc.fileSize)}</span>
                          <span>{doc.createdAt.split('T')[0]}</span>
                        </div>

                        {/* Linked Entities Pill */}
                        {doc.links && doc.links.length > 0 && (
                          <div className="pt-1 flex items-center gap-1 text-[10px] text-pine-600 dark:text-pine-400 truncate">
                            <Link2 className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{doc.links[0].entityName || doc.links[0].entityType}</span>
                            {doc.links.length > 1 && (
                              <span className="text-[9px] font-bold">+{doc.links.length - 1}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ── List View (Dense Table) ── */
              <div className="rounded-2xl border border-line bg-surface overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-line bg-surface-2/60 text-[11px] font-bold text-ink/50 uppercase tracking-wider">
                      <th className="py-2.5 px-4">Name</th>
                      <th className="py-2.5 px-3">Linked Entities</th>
                      <th className="py-2.5 px-3">Folder</th>
                      <th className="py-2.5 px-3">Modified</th>
                      <th className="py-2.5 px-3">Size</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {displayedDocs.map((doc) => {
                      const isSelected = selectedDocId === doc.id;
                      const isStarred = starredIds.has(doc.id);
                      const folder = folderLookup.get(doc.folderId || 'unfiled');

                      return (
                        <tr
                          key={doc.id}
                          onClick={() => setSelectedDocId(doc.id)}
                          onDoubleClick={() => onOpenDoc(doc.id)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setSelectedDocId(doc.id);
                            setContextMenu({ x: e.clientX, y: e.clientY, doc });
                          }}
                          className={`group cursor-pointer transition-colors ${
                            isSelected ? 'bg-brand-50/40 dark:bg-brand-950/40' : 'hover:bg-moss/40'
                          }`}
                        >
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-2.5 truncate max-w-xs sm:max-w-sm">
                              <button
                                type="button"
                                onClick={(e) => toggleStar(doc.id, e)}
                                className={`p-1 rounded-md transition-colors ${
                                  isStarred ? 'text-amber-500' : 'text-ink/20 hover:text-ink/50'
                                }`}
                              >
                                <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-amber-400' : ''}`} />
                              </button>
                              <span className="font-semibold text-ink truncate">{doc.name}</span>
                            </div>
                          </td>

                          <td className="py-2.5 px-3">
                            {doc.links && doc.links.length > 0 ? (
                              <div className="flex items-center gap-1 text-[11px] text-pine-600 dark:text-pine-400 truncate max-w-xs">
                                <Link2 className="w-3 h-3 shrink-0" />
                                <span className="truncate">{doc.links[0].entityName || doc.links[0].entityType}</span>
                                {doc.links.length > 1 && (
                                  <span className="px-1 py-0.2 bg-pine-100 dark:bg-pine-900/60 rounded text-[9px] font-bold">
                                    +{doc.links.length - 1}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-ink/30 italic">Unlinked</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center gap-1 text-[11px] text-ink/60">
                              <span>{folder?.icon || '📁'}</span>
                              <span className="truncate max-w-[100px]">{folder?.name || 'Unfiled'}</span>
                            </span>
                          </td>

                          <td className="py-2.5 px-3 font-mono text-[11px] text-ink/50">
                            {doc.createdAt.split('T')[0]}
                          </td>

                          <td className="py-2.5 px-3 font-mono text-[11px] text-ink/50">
                            {formatFileSize(doc.fileSize)}
                          </td>

                          <td className="py-2.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenDoc(doc.id);
                                }}
                                className="p-1.5 text-ink/50 hover:text-brand-600 rounded-lg hover:bg-moss/70 transition-colors"
                                title="Preview (Enter)"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteDoc(doc);
                                }}
                                className="p-1.5 text-ink/50 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                                title="Delete (Del)"
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
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            3. RIGHT DETAILS INSPECTOR PANEL (Google Drive Details Pane)
        ───────────────────────────────────────────────────────────── */}
        {isInspectorOpen && (
          <div className="w-72 shrink-0 border-l border-line bg-surface/90 flex flex-col min-h-0 overflow-y-auto select-none p-4 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <span className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-brand-500" />
                Details & Activity
              </span>
              <button
                type="button"
                onClick={() => setIsInspectorOpen(false)}
                className="p-1 text-ink/40 hover:text-ink rounded-lg transition-colors"
                title="Close Inspector (I)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {selectedDoc ? (
              <div className="space-y-4 text-xs">
                {/* Large Preview Card */}
                <div className="h-36 w-full rounded-2xl border border-line bg-surface-2 overflow-hidden flex items-center justify-center relative">
                  {selectedDoc.thumbnailUrl ? (
                    <img
                      src={selectedDoc.thumbnailUrl}
                      alt={selectedDoc.name}
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <FileText className="w-12 h-12 text-ink/20" />
                  )}
                  <button
                    type="button"
                    onClick={() => onOpenDoc(selectedDoc.id)}
                    className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 flex items-center justify-center gap-1.5 text-white font-semibold text-xs transition-opacity backdrop-blur-xs"
                  >
                    <Eye className="w-4 h-4" /> Open Preview
                  </button>
                </div>

                {/* File Title */}
                <div>
                  <h4 className="font-bold text-ink break-words">{selectedDoc.name}</h4>
                  <span className="text-[11px] text-ink/50">
                    {selectedDoc.isUncompressed ? 'Bit-exact RAW original' : 'Smart Optimized 1080p'}
                  </span>
                </div>

                {/* Quick Info Grid */}
                <div className="p-3 bg-surface-2/60 rounded-2xl border border-line/60 space-y-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-ink/50">Type</span>
                    <span className="font-semibold text-ink truncate max-w-[120px]">{selectedDoc.fileType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink/50">Size</span>
                    <span className="font-mono font-semibold text-ink">{formatFileSize(selectedDoc.fileSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink/50">Uploaded</span>
                    <span className="font-mono text-ink">{formatReadableDate(selectedDoc.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink/50">Folder</span>
                    <span className="font-semibold text-ink">
                      {folderLookup.get(selectedDoc.folderId || 'unfiled')?.name || 'Unfiled'}
                    </span>
                  </div>
                </div>

                {/* Linked Entities */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-ink/50 uppercase tracking-wider block">
                    Linked Entities ({selectedDoc.links?.length || 0})
                  </span>
                  {selectedDoc.links && selectedDoc.links.length > 0 ? (
                    <div className="space-y-1">
                      {selectedDoc.links.map((link, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-2 rounded-xl bg-moss/50 border border-line text-[11px]"
                        >
                          <Link2 className="w-3.5 h-3.5 text-pine-600 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span className="block font-semibold text-ink truncate">{link.entityName}</span>
                            <span className="block text-[10px] text-ink/50 capitalize">{link.entityType}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-ink/40 italic">Not linked to any transaction or asset yet.</p>
                  )}
                </div>

                {/* Primary Action Buttons */}
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={() => onOpenDoc(selectedDoc.id)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-semibold text-xs transition-colors shadow-xs"
                  >
                    <Eye className="w-3.5 h-3.5" /> Fullscreen Lightbox
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteDoc(selectedDoc)}
                    className="w-full flex items-center justify-center gap-2 py-1.5 px-3 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl font-semibold text-xs transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete File
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-ink/40 text-xs">
                Select a file to inspect its metadata and links.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. RIGHT-CLICK CONTEXT MENU
      ───────────────────────────────────────────────────────────── */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 w-48 bg-surface rounded-2xl border border-line shadow-2xl p-1.5 space-y-0.5 select-none"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              onOpenDoc(contextMenu.doc.id);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ink hover:bg-moss/70 rounded-xl transition-colors text-left font-medium"
          >
            <Eye className="w-3.5 h-3.5 text-brand-500" />
            <span>Preview (Enter)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              toggleStar(contextMenu.doc.id);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ink hover:bg-moss/70 rounded-xl transition-colors text-left"
          >
            <Star className="w-3.5 h-3.5 text-amber-500" />
            <span>{starredIds.has(contextMenu.doc.id) ? 'Remove Star' : 'Add Star (S)'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenDoc(contextMenu.doc.id); // Lightbox has the folder mover
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ink hover:bg-moss/70 rounded-xl transition-colors text-left"
          >
            <Folder className="w-3.5 h-3.5 text-amber-500" />
            <span>Move to Folder</span>
          </button>

          <div className="my-1 border-t border-line/60" />

          <button
            type="button"
            onClick={() => {
              onDeleteDoc(contextMenu.doc);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors text-left font-medium"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete (Del)</span>
          </button>
        </div>
      )}

      {/* Shortcuts Reference Dialog */}
      <DriveShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
};
