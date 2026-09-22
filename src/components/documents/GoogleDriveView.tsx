import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { formatFileSize } from '../../utils/formatters';
import { formatReadableDate } from '../../utils/dates';
import { useVault } from '../../context/VaultContext';
import { useConfirm } from '../../context/DialogContext';
import { processFileForVault } from '../../utils/imageCompressor';
import type { DocumentRecord, DocumentFolder, LinkedEntityType } from '../../types';
import {
  Folder,
  FolderOpen,
  FolderPlus,
  Upload,
  Search,
  Grid,
  List,
  ChevronRight,
  ChevronDown,
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
  FileSpreadsheet,
  FileCode,
  Archive,
  Plus,
  CheckSquare,
  Square,
  Sparkles,
  Layers,
  ArrowLeft,
  Receipt,
  ShieldAlert,
  Users,
  Landmark,
  FolderLock,
  TrendingUp,
  HardDrive,
  Wrench,
} from 'lucide-react';
import { useDriveShortcuts } from '../../hooks/useDriveShortcuts';
import { DriveShortcutsModal } from './DriveShortcutsModal';
import { DriveDesktopWidget } from './DriveDesktopWidget';
import { DriveToolsModal } from './DriveToolsModal';

// Helper to render beautiful native Drive folder icons with custom color
export const FolderIconBadge: React.FC<{
  folder: { icon?: string; color?: string; name: string };
  size?: 'sm' | 'md' | 'lg';
  isOpen?: boolean;
}> = ({ folder, size = 'md', isOpen = false }) => {
  const color = folder.color || '#3b82f6';
  const sizeClasses = {
    sm: 'w-7 h-7 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-14 h-14 rounded-2xl',
  };
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  };

  const isEmoji =
    folder.icon &&
    /\p{Extended_Pictographic}/u.test(folder.icon) &&
    folder.icon.length <= 4;

  if (isEmoji) {
    return (
      <div
        className={`${sizeClasses[size]} grid place-items-center shrink-0 shadow-2xs`}
        style={{ backgroundColor: `${color}18` }}
      >
        <span className={size === 'sm' ? 'text-sm' : size === 'md' ? 'text-lg' : 'text-2xl'}>
          {folder.icon}
        </span>
      </div>
    );
  }

  const FolderComponent = isOpen ? FolderOpen : Folder;

  return (
    <div
      className={`${sizeClasses[size]} grid place-items-center shrink-0 shadow-2xs transition-transform group-hover:scale-105`}
      style={{
        backgroundColor: `${color}18`,
        color: color,
      }}
    >
      <FolderComponent className={`${iconSizes[size]} fill-current/25`} />
    </div>
  );
};

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
  onDeleteFolder,
  totalStorageBytes,
}) => {
  const { loadDocumentDataUrl, updateDocument, addDocument } = useVault();
  const confirm = useConfirm();

  // Navigation section: 'files' | 'recent' | 'starred' | 'entities'
  const [navSection, setNavSection] = useState<'files' | 'recent' | 'starred' | 'entities'>('files');

  // Multi-selection state
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  // Inspector panel: DEFAULT CLOSED so it doesn't squish the UI
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isDesktopWidgetOpen, setIsDesktopWidgetOpen] = useState(false);
  const [isToolsModalOpen, setIsToolsModalOpen] = useState(false);
  const [toolsModalInitialTab, setToolsModalInitialTab] = useState<'scanner' | 'cleaner' | 'storage' | 'preferences'>('scanner');
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isMoveMenuOpen, setIsMoveMenuOpen] = useState(false);
  const [isFoldersExpanded, setIsFoldersExpanded] = useState(true);

  // Right-click context menu
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    doc?: DocumentRecord;
    folder?: DocumentFolder;
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

  const searchInputRef = useRef<HTMLInputElement>(null);
  const newMenuRef = useRef<HTMLDivElement>(null);
  const moveMenuRef = useRef<HTMLDivElement>(null);

  const folderLookup = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);

  // Active folder
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
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      list = list.filter((d) => new Date(d.createdAt) >= thirtyDaysAgo);
    } else if (navSection === 'files' && activeFolderId !== 'all') {
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

  // Primary selected document (for details inspector)
  const primarySelectedDoc = useMemo(() => {
    if (selectedDocIds.size > 0) {
      const firstId = Array.from(selectedDocIds)[0];
      return documents.find((d) => d.id === firstId) || null;
    }
    if (focusedIndex >= 0 && displayedDocs[focusedIndex]) {
      return displayedDocs[focusedIndex];
    }
    return null;
  }, [selectedDocIds, focusedIndex, documents, displayedDocs]);

  // Handle single item selection
  const handleSelectDoc = (docId: string, e?: React.MouseEvent) => {
    if (e?.shiftKey || e?.ctrlKey || e?.metaKey) {
      setSelectedDocIds((prev) => {
        const next = new Set(prev);
        if (next.has(docId)) next.delete(docId);
        else next.add(docId);
        return next;
      });
    } else {
      setSelectedDocIds(new Set([docId]));
    }
    const idx = displayedDocs.findIndex((d) => d.id === docId);
    if (idx !== -1) setFocusedIndex(idx);
  };

  // Select all visible
  const handleSelectAll = useCallback(() => {
    setSelectedDocIds(new Set(displayedDocs.map((d) => d.id)));
  }, [displayedDocs]);

  // Clear selection
  const handleClearSelection = useCallback(() => {
    setSelectedDocIds(new Set());
    setContextMenu(null);
    setIsNewMenuOpen(false);
    setIsMoveMenuOpen(false);
  }, []);

  // Download a single document
  const handleDownloadDoc = useCallback(async (doc: DocumentRecord, e?: React.MouseEvent) => {
    e?.stopPropagation();
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
      console.error('Failed to download document:', err);
    }
  }, [loadDocumentDataUrl]);

  // Download all selected
  const handleDownloadSelected = useCallback(async () => {
    const toDownload = documents.filter((d) => selectedDocIds.has(d.id));
    for (const doc of toDownload) {
      await handleDownloadDoc(doc);
    }
  }, [documents, selectedDocIds, handleDownloadDoc]);

  // Delete all selected
  const handleDeleteSelected = useCallback(async () => {
    const toDelete = documents.filter((d) => selectedDocIds.has(d.id));
    if (toDelete.length === 0) return;

    const ok = await confirm({
      title: `Delete ${toDelete.length} Document${toDelete.length > 1 ? 's' : ''}`,
      description: `Permanently delete ${toDelete.length} selected document(s) from encrypted storage?`,
      confirmText: 'Delete Files',
      variant: 'danger',
    });

    if (ok) {
      for (const doc of toDelete) {
        await onDeleteDoc(doc);
      }
      setSelectedDocIds(new Set());
    }
  }, [documents, selectedDocIds, confirm, onDeleteDoc]);

  // Move selected to folder
  const handleMoveSelected = useCallback(async (targetFolderId: string) => {
    const ids = Array.from(selectedDocIds);
    for (const id of ids) {
      await updateDocument(id, { folderId: targetFolderId });
    }
    setIsMoveMenuOpen(false);
  }, [selectedDocIds, updateDocument]);

  // File drag & drop over vault canvas
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    for (const file of files) {
      try {
        const processed = await processFileForVault(file, false);
        await addDocument(
          {
            name: file.name,
            folderId: activeFolderId !== 'all' ? activeFolderId : 'unfiled',
            fileType: processed.fileType,
            fileSize: processed.fileSize,
            thumbnailUrl: processed.thumbnailUrl,
            linkedType: 'none',
          },
          processed.dataUrl
        );
      } catch (err) {
        console.error('Drag-and-drop file upload failed:', err);
      }
    }
  };

  // Keyboard navigation helpers
  const handleSelectNext = useCallback(() => {
    if (displayedDocs.length === 0) return;
    setFocusedIndex((prev) => {
      const next = prev < displayedDocs.length - 1 ? prev + 1 : 0;
      setSelectedDocIds(new Set([displayedDocs[next].id]));
      return next;
    });
  }, [displayedDocs]);

  const handleSelectPrev = useCallback(() => {
    if (displayedDocs.length === 0) return;
    setFocusedIndex((prev) => {
      const next = prev > 0 ? prev - 1 : displayedDocs.length - 1;
      setSelectedDocIds(new Set([displayedDocs[next].id]));
      return next;
    });
  }, [displayedDocs]);

  const handleOpenSelected = useCallback(() => {
    if (primarySelectedDoc) {
      onOpenDoc(primarySelectedDoc.id);
    }
  }, [primarySelectedDoc, onOpenDoc]);

  // Register keyboard shortcuts
  useDriveShortcuts({
    onSearchFocus: () => searchInputRef.current?.focus(),
    onToggleViewMode: () => onToggleViewMode(),
    onNewFolder: () => onNewFolderClick(),
    onUpload: () => onUploadClick(),
    onToggleInspector: () => setIsInspectorOpen((prev) => !prev),
    onToggleWidget: () => setIsDesktopWidgetOpen((prev) => !prev),
    onToggleTools: () => {
      setToolsModalInitialTab('scanner');
      setIsToolsModalOpen((prev) => !prev);
    },
    onToggleStar: () => {
      if (primarySelectedDoc) toggleStar(primarySelectedDoc.id);
    },
    onShowShortcuts: () => setIsShortcutsModalOpen(true),
    onSelectNext: handleSelectNext,
    onSelectPrev: handleSelectPrev,
    onSelectAll: handleSelectAll,
    onClearSelection: handleClearSelection,
    onOpenSelected: handleOpenSelected,
    onDeleteSelected: handleDeleteSelected,
    onNavigateUp: () => {
      if (activeFolderId !== 'all') onSelectFolder('all');
    },
    hasSelection: selectedDocIds.size > 0,
    isEnabled: true,
  });

  // Global click handler to close dropdowns and context menu
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) {
        setIsNewMenuOpen(false);
      }
      if (moveMenuRef.current && !moveMenuRef.current.contains(e.target as Node)) {
        setIsMoveMenuOpen(false);
      }
      setContextMenu(null);
    };

    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Format Storage breakdown string
  const storageFormatted = useMemo(() => formatFileSize(totalStorageBytes), [totalStorageBytes]);

  // File type icon resolver for table & chips
  const renderFileIcon = (fileType: string, name: string, className = 'w-5 h-5') => {
    const lowerName = name.toLowerCase();
    if (fileType.startsWith('image/')) {
      return <ImageIcon className={`${className} text-sky-500`} />;
    }
    if (fileType.includes('pdf') || lowerName.endsWith('.pdf')) {
      return <FileText className={`${className} text-rose-500`} />;
    }
    if (
      fileType.includes('sheet') ||
      fileType.includes('excel') ||
      lowerName.endsWith('.csv') ||
      lowerName.endsWith('.xlsx') ||
      lowerName.endsWith('.xls')
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

  // Native drive file preview box for Grid view cards
  const renderFilePreviewBox = (doc: DocumentRecord) => {
    const isImage = doc.fileType.startsWith('image/');
    const lowerName = doc.name.toLowerCase();
    const isPdf = doc.fileType.includes('pdf') || lowerName.endsWith('.pdf');
    const isSheet =
      doc.fileType.includes('sheet') ||
      doc.fileType.includes('excel') ||
      lowerName.endsWith('.csv') ||
      lowerName.endsWith('.xlsx') ||
      lowerName.endsWith('.xls');
    const isArchive =
      lowerName.endsWith('.zip') || lowerName.endsWith('.tar') || lowerName.endsWith('.gz');

    if (isImage && doc.thumbnailUrl) {
      return (
        <div className="w-full h-full bg-surface-2/60 overflow-hidden grid place-items-center relative">
          <img
            src={doc.thumbnailUrl}
            alt={doc.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      );
    }

    if (isPdf) {
      return (
        <div className="w-full h-full bg-rose-50/40 dark:bg-rose-950/20 p-3 flex flex-col justify-between relative overflow-hidden border-b border-rose-100 dark:border-rose-900/40">
          <div className="flex items-center justify-between">
            <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white font-mono text-[9px] font-extrabold tracking-wider">
              PDF
            </span>
            <FileText className="w-5 h-5 text-rose-500/70" />
          </div>
          <div className="space-y-1.5 opacity-40">
            <div className="h-1.5 bg-rose-400 rounded-full w-4/5" />
            <div className="h-1.5 bg-rose-300 rounded-full w-full" />
            <div className="h-1.5 bg-rose-300 rounded-full w-2/3" />
          </div>
          <div className="text-[10px] font-mono text-rose-600/70 font-semibold truncate">
            Encrypted Document
          </div>
        </div>
      );
    }

    if (isSheet) {
      return (
        <div className="w-full h-full bg-emerald-50/40 dark:bg-emerald-950/20 p-3 flex flex-col justify-between relative overflow-hidden border-b border-emerald-100 dark:border-emerald-900/40">
          <div className="flex items-center justify-between">
            <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white font-mono text-[9px] font-extrabold tracking-wider">
              XLS
            </span>
            <FileSpreadsheet className="w-5 h-5 text-emerald-500/70" />
          </div>
          <div className="grid grid-cols-3 gap-1 opacity-40">
            <div className="h-2 bg-emerald-300 rounded-xs" />
            <div className="h-2 bg-emerald-300 rounded-xs" />
            <div className="h-2 bg-emerald-300 rounded-xs" />
            <div className="h-2 bg-emerald-200 rounded-xs" />
            <div className="h-2 bg-emerald-200 rounded-xs" />
            <div className="h-2 bg-emerald-200 rounded-xs" />
          </div>
          <div className="text-[10px] font-mono text-emerald-600/70 font-semibold truncate">
            Spreadsheet Data
          </div>
        </div>
      );
    }

    if (isArchive) {
      return (
        <div className="w-full h-full bg-amber-50/40 dark:bg-amber-950/20 p-3 flex flex-col justify-between relative overflow-hidden border-b border-amber-100 dark:border-amber-900/40">
          <div className="flex items-center justify-between">
            <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white font-mono text-[9px] font-extrabold tracking-wider">
              ZIP
            </span>
            <Archive className="w-5 h-5 text-amber-500/70" />
          </div>
          <div className="space-y-1.5 opacity-40">
            <div className="h-1.5 bg-amber-400 rounded-full w-2/3" />
            <div className="h-1.5 bg-amber-300 rounded-full w-4/5" />
          </div>
          <div className="text-[10px] font-mono text-amber-600/70 font-semibold truncate">
            Compressed Archive
          </div>
        </div>
      );
    }

    return (
      <div className="w-full h-full bg-surface-2/60 p-3 flex flex-col justify-between relative overflow-hidden border-b border-line/40">
        <div className="flex items-center justify-between">
          <span className="px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-600 font-mono text-[9px] font-extrabold tracking-wider uppercase">
            {doc.fileType.split('/')[1] || 'DOC'}
          </span>
          <FileText className="w-5 h-5 text-ink/30" />
        </div>
        <div className="space-y-1.5 opacity-30">
          <div className="h-1.5 bg-ink/40 rounded-full w-3/4" />
          <div className="h-1.5 bg-ink/30 rounded-full w-full" />
          <div className="h-1.5 bg-ink/30 rounded-full w-1/2" />
        </div>
        <div className="text-[10px] font-mono text-ink/40 font-semibold truncate">
          Vault File
        </div>
      </div>
    );
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex flex-col h-[calc(100vh-6.5rem)] min-h-[640px] bg-surface rounded-3xl border border-line/80 shadow-xs overflow-hidden relative select-none"
    >
      {/* ─────────────────────────────────────────────────────────────
          DRAG AND DROP OVERLAY (Internxt style)
      ───────────────────────────────────────────────────────────── */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-brand-500/10 backdrop-blur-xs border-2 border-dashed border-brand-500 rounded-3xl flex flex-col items-center justify-center gap-3 anim-fade pointer-events-none">
          <div className="w-16 h-16 rounded-3xl bg-brand-500 text-white grid place-items-center shadow-lg animate-bounce">
            <Upload className="w-8 h-8" />
          </div>
          <div className="text-center">
            <h3 className="font-display font-bold text-lg text-ink">Drop files here to upload</h3>
            <p className="text-xs text-ink/60">
              Files will be AES-256 encrypted and stored locally in your sovereign vault
            </p>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          1. TOP TOOLBAR & SEARCH PILL (Internxt TopBar)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-line bg-surface shrink-0">
        {/* Left: Breadcrumbs navigation */}
        <div className="flex items-center gap-1.5 text-xs font-semibold text-ink/60 overflow-hidden">
          <button
            type="button"
            onClick={() => {
              setNavSection('files');
              onSelectFolder('all');
              onSelectEntityFilter('all');
            }}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              navSection === 'files' && activeFolderId === 'all'
                ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold shadow-2xs'
                : 'hover:bg-moss text-ink/70 hover:text-ink'
            }`}
          >
            Files
          </button>

          {activeFolder && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-ink/30 shrink-0" />
              <span className="px-3 py-1.5 rounded-xl bg-surface-2 font-bold text-ink truncate flex items-center gap-2 border border-line/60 shadow-2xs">
                <FolderIconBadge folder={activeFolder} size="sm" isOpen={true} />
                <span className="truncate">{activeFolder.name}</span>
              </span>
            </>
          )}

          {navSection === 'recent' && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-ink/30 shrink-0" />
              <span className="px-3 py-1.5 rounded-xl bg-surface-2 font-bold text-ink border border-line/60">
                Recent
              </span>
            </>
          )}

          {navSection === 'starred' && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-ink/30 shrink-0" />
              <span className="px-3 py-1.5 rounded-xl bg-surface-2 font-bold text-ink border border-line/60">
                Starred
              </span>
            </>
          )}

          {selectedEntityFilter !== 'all' && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-ink/30 shrink-0" />
              <span className="px-3 py-1.5 rounded-xl bg-brand-500/10 text-brand-600 font-bold capitalize border border-brand-500/20">
                {selectedEntityFilter}s
              </span>
            </>
          )}
        </div>

        {/* Center: Search pill with shortcut hint */}
        <div className="relative flex-1 max-w-md hidden sm:block">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search in Vault... (Press / to focus)"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-14 py-2 bg-surface-2/60 border border-line rounded-2xl text-xs text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all shadow-2xs"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-surface border border-line font-mono text-[10px] text-ink/40">
              /
            </kbd>
          )}
        </div>

        {/* Right: Actions / Selection Bar */}
        <div className="flex items-center gap-1.5 shrink-0">
          {selectedDocIds.size > 0 ? (
            /* Contextual Action Bar when items selected */
            <div className="flex items-center gap-1.5 bg-brand-500/10 border border-brand-500/20 px-2.5 py-1 rounded-2xl anim-fade">
              <span className="text-xs font-bold text-brand-700 dark:text-brand-300 pr-1">
                {selectedDocIds.size} selected
              </span>

              <button
                type="button"
                onClick={handleDownloadSelected}
                className="p-1.5 rounded-xl hover:bg-brand-500/20 text-brand-700 dark:text-brand-300 transition-colors"
                title="Download selected"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  Array.from(selectedDocIds).forEach((id) => toggleStar(id));
                }}
                className="p-1.5 rounded-xl hover:bg-brand-500/20 text-brand-700 dark:text-brand-300 transition-colors"
                title="Star / Unstar"
              >
                <Star className="w-3.5 h-3.5" />
              </button>

              {/* Move to folder dropdown */}
              <div className="relative" ref={moveMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsMoveMenuOpen((prev) => !prev)}
                  className="p-1.5 rounded-xl hover:bg-brand-500/20 text-brand-700 dark:text-brand-300 transition-colors"
                  title="Move to folder"
                >
                  <Folder className="w-3.5 h-3.5" />
                </button>

                {isMoveMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-52 py-1.5 bg-surface border border-line rounded-2xl shadow-xl z-50 text-xs text-ink space-y-0.5 anim-scale">
                    <span className="px-3 py-1 text-[10px] font-bold text-ink/40 uppercase block">
                      Move to Folder:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleMoveSelected('unfiled')}
                      className="w-full text-left px-3 py-1.5 hover:bg-moss flex items-center gap-2"
                    >
                      <Folder className="w-3.5 h-3.5 text-ink/40" /> Unfiled
                    </button>
                    {folders.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => handleMoveSelected(f.id)}
                        className="w-full text-left px-3 py-1.5 hover:bg-moss flex items-center gap-2 truncate"
                      >
                        <FolderIconBadge folder={f} size="sm" />
                        <span className="truncate">{f.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleDeleteSelected}
                className="p-1.5 rounded-xl hover:bg-rose-500/20 text-rose-600 transition-colors"
                title="Delete selected"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleClearSelection}
                className="p-1.5 rounded-xl hover:bg-brand-500/20 text-ink/50 hover:text-ink transition-colors ml-1"
                title="Clear selection (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            /* Standard Action Bar when nothing selected */
            <>
              {/* Type Filter Pills */}
              <div className="hidden lg:flex items-center gap-1 bg-surface-2 p-0.5 rounded-xl border border-line text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => onSelectFileTypeFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    fileTypeFilter === 'all'
                      ? 'bg-surface text-brand-600 font-bold shadow-2xs'
                      : 'text-ink/60 hover:text-ink'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => onSelectFileTypeFilter('image')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    fileTypeFilter === 'image'
                      ? 'bg-surface text-brand-600 font-bold shadow-2xs'
                      : 'text-ink/60 hover:text-ink'
                  }`}
                >
                  Images
                </button>
                <button
                  type="button"
                  onClick={() => onSelectFileTypeFilter('pdf')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    fileTypeFilter === 'pdf'
                      ? 'bg-surface text-brand-600 font-bold shadow-2xs'
                      : 'text-ink/60 hover:text-ink'
                  }`}
                >
                  PDFs
                </button>
                <button
                  type="button"
                  onClick={() => onSelectFileTypeFilter('other')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    fileTypeFilter === 'other'
                      ? 'bg-surface text-brand-600 font-bold shadow-2xs'
                      : 'text-ink/60 hover:text-ink'
                  }`}
                >
                  Other
                </button>
              </div>

              {/* View Mode Toggle */}
              <button
                type="button"
                onClick={onToggleViewMode}
                className="p-2 rounded-xl border border-line bg-surface hover:bg-moss text-ink/70 hover:text-ink transition-all shadow-2xs"
                title={`Switch to ${viewMode === 'grid' ? 'List' : 'Grid'} view (V)`}
              >
                {viewMode === 'grid' ? <List className="w-3.5 h-3.5" /> : <Grid className="w-3.5 h-3.5" />}
              </button>

              {/* Sort selector */}
              <select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-xl border border-line bg-surface text-xs text-ink/70 hover:text-ink focus:outline-none cursor-pointer shadow-2xs"
              >
                <option value="newest">Recent</option>
                <option value="oldest">Oldest</option>
                <option value="name">Name (A-Z)</option>
                <option value="size">Size (Largest)</option>
              </select>

              {/* Sovereign Local Vault Status Pill (Inspired by Internxt Desktop Tray) */}
              <button
                type="button"
                onClick={() => setIsDesktopWidgetOpen((prev) => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-pine-50 dark:bg-pine-950/50 border border-pine-200/80 dark:border-pine-800/80 text-pine-700 dark:text-pine-300 text-xs font-bold shadow-2xs hover:bg-pine-100 dark:hover:bg-pine-900/50 transition-all"
                title="Open Sovereign Desktop Status Widget"
              >
                <span className="w-2 h-2 rounded-full bg-pine-500 animate-pulse" />
                <span className="hidden sm:inline">Local Vault</span>
                <span className="text-[10px] opacity-75 font-mono hidden md:inline">AES-256</span>
              </button>

              {/* Drive Tools (Integrity Scanner & Storage Cleaner) */}
              <button
                type="button"
                onClick={() => {
                  setToolsModalInitialTab('scanner');
                  setIsToolsModalOpen(true);
                }}
                className="p-2 rounded-xl border border-line bg-surface hover:bg-moss text-ink/70 hover:text-ink transition-all shadow-2xs flex items-center gap-1.5 text-xs font-bold"
                title="Drive Tools: Integrity Scanner & Storage Cleaner"
              >
                <Wrench className="w-3.5 h-3.5 text-brand-600" />
                <span className="hidden xl:inline">Tools</span>
              </button>

              {/* Inspector panel toggle */}
              <button
                type="button"
                onClick={() => setIsInspectorOpen((prev) => !prev)}
                className={`p-2 rounded-xl border transition-all shadow-2xs ${
                  isInspectorOpen
                    ? 'border-brand-500/40 bg-brand-500/10 text-brand-600'
                    : 'border-line bg-surface hover:bg-moss text-ink/70 hover:text-ink'
                }`}
                title="Toggle Details Inspector (I)"
              >
                <Info className="w-3.5 h-3.5" />
              </button>

              {/* Keyboard shortcuts */}
              <button
                type="button"
                onClick={() => setIsShortcutsModalOpen(true)}
                className="p-2 rounded-xl border border-line bg-surface hover:bg-moss text-ink/70 hover:text-ink transition-all shadow-2xs"
                title="Keyboard shortcuts cheat sheet (?)"
              >
                <Keyboard className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. TWO-PANE BODY (Left Internxt Sidebar + Main Content)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ───────────────────────────────────────────────────────────
            LEFT SIDEBAR (Internxt Drive Style)
        ─────────────────────────────────────────────────────────── */}
        <div className="w-64 shrink-0 border-r border-line bg-surface-2/30 flex flex-col justify-between p-3 hidden md:flex overflow-y-auto">
          <div className="space-y-3">
            {/* Prominent Internxt "+ New" Button */}
            <div className="relative" ref={newMenuRef}>
              <button
                type="button"
                onClick={() => setIsNewMenuOpen((prev) => !prev)}
                className="w-full py-2.5 px-4 rounded-2xl bg-brand-500 hover:bg-brand-600 active:scale-[0.98] text-white text-xs font-bold flex items-center justify-between shadow-sm transition-all"
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span>New</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </button>

              {/* Dropdown Menu */}
              {isNewMenuOpen && (
                <div className="absolute left-0 top-full mt-2 w-full py-2 bg-surface border border-line rounded-2xl shadow-xl z-50 text-xs text-ink space-y-1 anim-scale">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewMenuOpen(false);
                      onNewFolderClick();
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-moss flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2.5 font-semibold">
                      <FolderPlus className="w-4 h-4 text-amber-500" />
                      <span>New Folder</span>
                    </div>
                    <kbd className="px-1.5 py-0.5 rounded bg-surface-2 border border-line font-mono text-[10px] text-ink/40">
                      N
                    </kbd>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsNewMenuOpen(false);
                      onUploadClick();
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-moss flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2.5 font-semibold">
                      <Upload className="w-4 h-4 text-brand-500" />
                      <span>File Upload</span>
                    </div>
                    <kbd className="px-1.5 py-0.5 rounded bg-surface-2 border border-line font-mono text-[10px] text-ink/40">
                      U
                    </kbd>
                  </button>
                </div>
              )}
            </div>

            {/* Primary Navigation Links with Expandable Folder Tree */}
            <div className="space-y-0.5">
              <div className="flex items-center justify-between group">
                <button
                  type="button"
                  onClick={() => {
                    setNavSection('files');
                    onSelectFolder('all');
                    onSelectEntityFilter('all');
                  }}
                  className={`flex-1 flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    navSection === 'files' && activeFolderId === 'all' && selectedEntityFilter === 'all'
                      ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold'
                      : 'text-ink/70 hover:text-ink hover:bg-moss/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Folder className="w-4 h-4" />
                    <span>My Files</span>
                  </div>
                  <span className="text-[10px] font-mono text-ink/40">{documents.length}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsFoldersExpanded((prev) => !prev)}
                  className="p-1.5 rounded-lg text-ink/40 hover:text-ink hover:bg-moss"
                  title="Toggle Folders"
                >
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${isFoldersExpanded ? 'rotate-0' : '-rotate-90'}`}
                  />
                </button>
              </div>

              {/* Expandable folder tree */}
              {isFoldersExpanded && (
                <div className="pl-3.5 pr-1 space-y-0.5 border-l border-line/60 ml-3 mt-1">
                  {folders.map((f) => {
                    const count = documents.filter((d) => (d.folderId || 'unfiled') === f.id).length;
                    const isFolderActive = navSection === 'files' && activeFolderId === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          setNavSection('files');
                          onSelectFolder(f.id);
                          onSelectEntityFilter('all');
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-all ${
                          isFolderActive
                            ? 'bg-brand-500/15 text-brand-600 dark:text-brand-400 font-bold'
                            : 'text-ink/65 hover:text-ink hover:bg-moss/40'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Folder
                            className="w-3.5 h-3.5 shrink-0 fill-current/25"
                            style={{ color: f.color || '#3b82f6' }}
                          />
                          <span className="truncate">{f.name}</span>
                        </div>
                        <span className="text-[10px] font-mono text-ink/40 shrink-0 ml-1">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setNavSection('recent');
                  onSelectFolder('all');
                  onSelectEntityFilter('all');
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  navSection === 'recent'
                    ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold'
                    : 'text-ink/70 hover:text-ink hover:bg-moss/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4" />
                  <span>Recents</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setNavSection('starred');
                  onSelectFolder('all');
                  onSelectEntityFilter('all');
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  navSection === 'starred'
                    ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold'
                    : 'text-ink/70 hover:text-ink hover:bg-moss/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span>Favorites</span>
                </div>
                <span className="text-[10px] font-mono text-ink/40">{starredIds.size}</span>
              </button>
            </div>

            {/* Entity Hub Navigation Links */}
            <div className="pt-2">
              <span className="px-3 text-[10px] font-bold text-ink/40 uppercase tracking-wider block mb-1">
                Linked Entities
              </span>

              <div className="space-y-0.5">
                {(
                  [
                    { id: 'transaction', label: 'Transactions', icon: <Sparkles className="w-3.5 h-3.5 text-amber-500" /> },
                    { id: 'asset', label: 'Assets & Deeds', icon: <ShieldCheck className="w-3.5 h-3.5 text-pine-500" /> },
                    { id: 'liability', label: 'Loans & Liabilities', icon: <Layers className="w-3.5 h-3.5 text-rose-500" /> },
                    { id: 'goal', label: 'Goals', icon: <Clock className="w-3.5 h-3.5 text-blue-500" /> },
                    { id: 'people', label: 'People & KYC', icon: <Link2 className="w-3.5 h-3.5 text-violet-500" /> },
                    { id: 'account', label: 'Bank Accounts', icon: <FileText className="w-3.5 h-3.5 text-indigo-500" /> },
                  ] as const
                ).map((ent) => {
                  const count = documents.filter(
                    (d) =>
                      d.linkedType === ent.id || d.links?.some((l) => l.entityType === ent.id)
                  ).length;
                  return (
                    <button
                      key={ent.id}
                      type="button"
                      onClick={() => {
                        setNavSection('entities');
                        onSelectFolder('all');
                        onSelectEntityFilter(selectedEntityFilter === ent.id ? 'all' : ent.id);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        selectedEntityFilter === ent.id
                          ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold'
                          : 'text-ink/65 hover:text-ink hover:bg-moss/40'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {ent.icon}
                        <span>{ent.label}</span>
                      </div>
                      <span className="text-[10px] font-mono text-ink/40">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Storage Meter Widget (Internxt Desktop Style) */}
          <div className="p-3 bg-surface rounded-2xl border border-line shadow-2xs space-y-2 mt-4">
            <div className="flex items-center justify-between text-[11px] font-bold text-ink">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-pine-500" /> Local Vault
              </span>
              <span className="font-mono text-[10px] text-ink/50">{storageFormatted}</span>
            </div>

            <div className="w-full h-1.5 bg-line rounded-full overflow-hidden">
              <div
                style={{
                  width: `${Math.min(100, Math.max(8, (totalStorageBytes / (100 * 1024 * 1024)) * 100))}%`,
                }}
                className="h-full bg-brand-500 rounded-full transition-all"
              />
            </div>

            <div className="flex items-center justify-between pt-0.5 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => {
                  setToolsModalInitialTab('cleaner');
                  setIsToolsModalOpen(true);
                }}
                className="text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" /> Clean Up
              </button>

              <button
                type="button"
                onClick={() => setIsDesktopWidgetOpen(true)}
                className="text-ink/50 hover:text-ink flex items-center gap-1"
              >
                <HardDrive className="w-3 h-3" /> Widget
              </button>
            </div>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────
            MAIN EXPLORER AREA (Folders & Files Grid / List)
        ─────────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 bg-surface overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
            {/* ───────────────────────────────────────────────────────
                A. FOLDERS SECTION
            ─────────────────────────────────────────────────────── */}
            {navSection === 'files' && activeFolderId === 'all' && folders.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink/40">
                    Folders ({folders.length})
                  </h4>
                  <button
                    type="button"
                    onClick={onNewFolderClick}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> New
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {folders.map((f) => {
                    const count = documents.filter((d) => (d.folderId || 'unfiled') === f.id).length;
                    return (
                      <div
                        key={f.id}
                        onClick={() => onSelectFolder(f.id)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({ x: e.clientX, y: e.clientY, folder: f });
                        }}
                        className="group flex items-center justify-between p-3 bg-surface hover:bg-surface-2 border border-line hover:border-brand-500/40 rounded-2xl cursor-pointer transition-all shadow-2xs hover:shadow-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <FolderIconBadge folder={f} size="md" />
                          <div className="min-w-0 flex-1">
                            <span className="block text-xs font-bold text-ink truncate group-hover:text-brand-600">
                              {f.name}
                            </span>
                            <span className="block text-[10px] text-ink/40 font-mono">
                              {count} {count === 1 ? 'file' : 'files'}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setContextMenu({ x: e.clientX, y: e.clientY, folder: f });
                          }}
                          className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-moss text-ink/40 hover:text-ink transition-opacity ml-1"
                          title="Folder options"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ───────────────────────────────────────────────────────
                B. FILES SECTION (Grid vs List)
            ─────────────────────────────────────────────────────── */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink/40">
                  {activeFolder ? `${activeFolder.name} Files` : 'Files'} ({displayedDocs.length})
                </h4>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-[11px] font-semibold text-ink/50 hover:text-brand-600 flex items-center gap-1"
                  >
                    <CheckSquare className="w-3 h-3" /> Select All
                  </button>
                </div>
              </div>

              {/* Empty state */}
              {displayedDocs.length === 0 ? (
                <div className="py-14 text-center space-y-3 bg-surface-2/20 border border-dashed border-line rounded-3xl p-6">
                  <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-600 grid place-items-center mx-auto">
                    {activeFolder ? (
                      <Folder className="w-6 h-6 fill-brand-500/20" />
                    ) : (
                      <FileText className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink">
                      {activeFolder ? `"${activeFolder.name}" is empty` : 'No documents found'}
                    </h3>
                    <p className="text-xs text-ink/50 mt-1 max-w-sm mx-auto">
                      {activeFolder
                        ? 'Upload or drag files here to securely encrypt and store them in this folder'
                        : searchQuery
                          ? `No files matching "${searchQuery}"`
                          : 'Upload agreements, deeds, invoices, receipts, and policies'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onUploadClick}
                    className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload File
                  </button>
                </div>
              ) : viewMode === 'grid' ? (
                /* ─────────────────────────────────────────────────────
                    GRID VIEW (Internxt Card Grid)
                ───────────────────────────────────────────────────── */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
                  {displayedDocs.map((doc, idx) => {
                    const isSelected = selectedDocIds.has(doc.id);
                    const isStarred = starredIds.has(doc.id);

                    return (
                      <div
                        key={doc.id}
                        onClick={(e) => handleSelectDoc(doc.id, e)}
                        onDoubleClick={() => onOpenDoc(doc.id)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          handleSelectDoc(doc.id);
                          setContextMenu({ x: e.clientX, y: e.clientY, doc });
                        }}
                        className={`group relative flex flex-col rounded-2xl border transition-all cursor-pointer shadow-2xs overflow-hidden ${
                          isSelected
                            ? 'border-brand-500 bg-brand-500/10 ring-2 ring-brand-500/30 shadow-xs'
                            : 'border-line bg-surface hover:border-brand-500/40 hover:bg-surface-2/60'
                        }`}
                      >
                        {/* Top Overlay Actions: Checkbox + Star + More */}
                        <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10 pointer-events-none">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectDoc(doc.id, { shiftKey: true } as any);
                            }}
                            className={`p-1 rounded-lg bg-surface/80 backdrop-blur-xs transition-opacity pointer-events-auto ${
                              isSelected
                                ? 'opacity-100 text-brand-600'
                                : 'opacity-0 group-hover:opacity-100 text-ink/50 hover:text-ink'
                            }`}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-3.5 h-3.5" />
                            ) : (
                              <Square className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <div className="flex items-center gap-1 pointer-events-auto">
                            <button
                              type="button"
                              onClick={(e) => toggleStar(doc.id, e)}
                              className={`p-1 rounded-lg bg-surface/80 backdrop-blur-xs transition-opacity ${
                                isStarred
                                  ? 'opacity-100 text-amber-500'
                                  : 'opacity-0 group-hover:opacity-100 text-ink/40 hover:text-amber-500'
                              }`}
                            >
                              <Star className="w-3.5 h-3.5 fill-current" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setContextMenu({ x: e.clientX, y: e.clientY, doc });
                              }}
                              className="p-1 rounded-lg bg-surface/80 backdrop-blur-xs opacity-0 group-hover:opacity-100 hover:bg-moss text-ink/50 hover:text-ink transition-opacity"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Central Native Drive Preview Box */}
                        <div className="w-full aspect-[4/3] relative">
                          {renderFilePreviewBox(doc)}
                        </div>

                        {/* Card Info Footer */}
                        <div className="p-3 space-y-1 bg-surface">
                          <div className="flex items-center gap-2 min-w-0">
                            {renderFileIcon(doc.fileType, doc.name, 'w-3.5 h-3.5 shrink-0')}
                            <span
                              className="block text-xs font-bold text-ink truncate leading-tight group-hover:text-brand-600"
                              title={doc.name}
                            >
                              {doc.name}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-ink/50 font-mono">
                            <span>{formatFileSize(doc.fileSize || 0)}</span>
                            <span>{formatReadableDate(doc.createdAt)}</span>
                          </div>

                          {/* Linked Entity Pill */}
                          {doc.linkedType && doc.linkedType !== 'none' && (
                            <span className="inline-block px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-600 text-[9px] font-semibold uppercase tracking-wider truncate max-w-full mt-0.5">
                              {doc.linkedType}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* ─────────────────────────────────────────────────────
                    LIST VIEW (Internxt Table)
                ───────────────────────────────────────────────────── */
                <div className="rounded-2xl border border-line bg-surface overflow-hidden shadow-2xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-line bg-surface-2/50 text-[11px] font-bold text-ink/50 uppercase tracking-wider">
                        <th className="py-2.5 pl-4 pr-2 w-10">
                          <button
                            type="button"
                            onClick={handleSelectAll}
                            className="text-ink/40 hover:text-ink"
                          >
                            <Square className="w-3.5 h-3.5" />
                          </button>
                        </th>
                        <th className="py-2.5 px-3">Name</th>
                        <th className="py-2.5 px-3 hidden sm:table-cell">Modified</th>
                        <th className="py-2.5 px-3 hidden md:table-cell">Size</th>
                        <th className="py-2.5 px-3 hidden lg:table-cell">Linked To</th>
                        <th className="py-2.5 pr-4 pl-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/60 text-xs">
                      {displayedDocs.map((doc) => {
                        const isSelected = selectedDocIds.has(doc.id);
                        const isStarred = starredIds.has(doc.id);

                        return (
                          <tr
                            key={doc.id}
                            onClick={(e) => handleSelectDoc(doc.id, e)}
                            onDoubleClick={() => onOpenDoc(doc.id)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              handleSelectDoc(doc.id);
                              setContextMenu({ x: e.clientX, y: e.clientY, doc });
                            }}
                            className={`group transition-colors cursor-pointer ${
                              isSelected ? 'bg-brand-500/10' : 'hover:bg-moss/40'
                            }`}
                          >
                            <td className="py-2.5 pl-4 pr-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleSelectDoc(doc.id, { shiftKey: true } as any)}
                                className={`p-1 rounded text-ink/40 hover:text-ink ${
                                  isSelected ? 'text-brand-600' : ''
                                }`}
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-brand-600" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>
                            </td>

                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                {renderFileIcon(doc.fileType, doc.name, 'w-4 h-4 shrink-0')}
                                <span className="font-semibold text-ink truncate group-hover:text-brand-600">
                                  {doc.name}
                                </span>
                              </div>
                            </td>

                            <td className="py-2.5 px-3 text-ink/50 text-[11px] font-mono hidden sm:table-cell whitespace-nowrap">
                              {formatReadableDate(doc.createdAt)}
                            </td>

                            <td className="py-2.5 px-3 text-ink/50 text-[11px] font-mono hidden md:table-cell whitespace-nowrap">
                              {formatFileSize(doc.fileSize || 0)}
                            </td>

                            <td className="py-2.5 px-3 hidden lg:table-cell">
                              {doc.linkedType && doc.linkedType !== 'none' ? (
                                <span className="px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-600 text-[10px] font-semibold uppercase">
                                  {doc.linkedType}
                                </span>
                              ) : (
                                <span className="text-ink/30 text-[11px]">—</span>
                              )}
                            </td>

                            <td className="py-2.5 pr-4 pl-2 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => toggleStar(doc.id, e)}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    isStarred
                                      ? 'text-amber-500'
                                      : 'opacity-0 group-hover:opacity-100 text-ink/30 hover:text-amber-500'
                                  }`}
                                >
                                  <Star className="w-3.5 h-3.5 fill-current" />
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => handleDownloadDoc(doc, e)}
                                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-moss text-ink/50 hover:text-ink transition-opacity"
                                  title="Download file"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setContextMenu({ x: e.clientX, y: e.clientY, doc });
                                  }}
                                  className="p-1.5 rounded-lg hover:bg-moss text-ink/40 hover:text-ink"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
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
        </div>

        {/* ───────────────────────────────────────────────────────────
            RIGHT DETAILS INSPECTOR DRAWER (Internxt Side Drawer)
        ─────────────────────────────────────────────────────────── */}
        {isInspectorOpen && (
          <div className="w-72 sm:w-80 shrink-0 border-l border-line bg-surface-2/20 flex flex-col justify-between overflow-y-auto p-4 anim-slide-left">
            {primarySelectedDoc ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink/50">
                    File Details
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsInspectorOpen(false)}
                    className="p-1 rounded-lg hover:bg-moss text-ink/40 hover:text-ink"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Big Preview Banner */}
                <div className="w-full aspect-video rounded-2xl bg-surface border border-line overflow-hidden grid place-items-center relative shadow-2xs">
                  {primarySelectedDoc.fileType.startsWith('image/') && primarySelectedDoc.thumbnailUrl ? (
                    <img
                      src={primarySelectedDoc.thumbnailUrl}
                      alt={primarySelectedDoc.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-3 text-center">
                      {renderFileIcon(primarySelectedDoc.fileType, primarySelectedDoc.name, 'w-10 h-10')}
                      <span className="text-xs font-mono font-bold text-ink/50 mt-1">
                        {primarySelectedDoc.fileType}
                      </span>
                    </div>
                  )}
                </div>

                {/* File Metadata List */}
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-ink/40 uppercase">Name</span>
                    <p className="font-bold text-ink break-words mt-0.5">
                      {primarySelectedDoc.name}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-ink/40 uppercase">Size</span>
                      <p className="font-mono text-ink mt-0.5">
                        {formatFileSize(primarySelectedDoc.fileSize || 0)}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-ink/40 uppercase">Format</span>
                      <p className="font-mono text-ink mt-0.5 truncate">
                        {primarySelectedDoc.fileType.split('/')[1]?.toUpperCase() || 'FILE'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-ink/40 uppercase">Security</span>
                    <div className="flex items-center gap-1.5 text-pine-600 dark:text-pine-400 font-semibold mt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>AES-256 Encrypted Sovereign SQLite</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-ink/40 uppercase">Created Date</span>
                    <p className="text-ink/70 font-mono mt-0.5">
                      {formatReadableDate(primarySelectedDoc.createdAt)}
                    </p>
                  </div>

                  {/* Linked KhataGHAR entities */}
                  <div>
                    <span className="text-[10px] font-bold text-ink/40 uppercase">
                      Linked KhataGHAR Records
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {primarySelectedDoc.linkedType && primarySelectedDoc.linkedType !== 'none' ? (
                        <span className="px-2.5 py-1 rounded-xl bg-brand-500/10 text-brand-600 text-[11px] font-semibold uppercase">
                          {primarySelectedDoc.linkedType}
                        </span>
                      ) : (
                        <span className="text-ink/40 text-[11px]">No direct entity link</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Direct action buttons */}
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={() => onOpenDoc(primarySelectedDoc.id)}
                    className="w-full py-2 px-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> Open Full Viewer
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadDoc(primarySelectedDoc)}
                      className="py-2 px-3 rounded-xl border border-line bg-surface hover:bg-moss text-ink text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteDoc(primarySelectedDoc)}
                      className="py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-xs text-ink/40 space-y-2">
                <Info className="w-6 h-6 mx-auto text-ink/30" />
                <p>Click on any document to inspect its properties and encryption status</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. RIGHT-CLICK CONTEXT MENU
      ───────────────────────────────────────────────────────────── */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: Math.min(contextMenu.x, window.innerWidth - 220) }}
          className="fixed z-50 w-52 py-1.5 bg-surface border border-line rounded-2xl shadow-xl text-xs text-ink space-y-0.5 anim-scale"
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.doc ? (
            <>
              <button
                type="button"
                onClick={() => {
                  onOpenDoc(contextMenu.doc!.id);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-moss flex items-center gap-2.5 font-semibold"
              >
                <Eye className="w-3.5 h-3.5 text-brand-500" /> Open Viewer
              </button>

              <button
                type="button"
                onClick={() => {
                  handleDownloadDoc(contextMenu.doc!);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-moss flex items-center gap-2.5 font-semibold"
              >
                <Download className="w-3.5 h-3.5 text-blue-500" /> Download
              </button>

              <button
                type="button"
                onClick={() => {
                  toggleStar(contextMenu.doc!.id);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-moss flex items-center gap-2.5 font-semibold"
              >
                <Star className="w-3.5 h-3.5 text-amber-500" />
                {starredIds.has(contextMenu.doc!.id) ? 'Unstar' : 'Star Document'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedDocIds(new Set([contextMenu.doc!.id]));
                  setIsInspectorOpen(true);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-moss flex items-center gap-2.5 font-semibold"
              >
                <Info className="w-3.5 h-3.5 text-indigo-500" /> View Details
              </button>

              <hr className="border-line my-1" />

              <button
                type="button"
                onClick={() => {
                  onDeleteDoc(contextMenu.doc!);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 flex items-center gap-2.5 font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete File
              </button>
            </>
          ) : contextMenu.folder ? (
            <>
              <button
                type="button"
                onClick={() => {
                  onSelectFolder(contextMenu.folder!.id);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-moss flex items-center gap-2.5 font-semibold"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-500" /> Open Folder
              </button>

              {onDeleteFolder && (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteFolder(contextMenu.folder!.id);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 flex items-center gap-2.5 font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Folder
                </button>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. KEYBOARD SHORTCUTS CHEAT SHEET MODAL
      ───────────────────────────────────────────────────────────── */}
      {isShortcutsModalOpen && (
        <DriveShortcutsModal
          isOpen={isShortcutsModalOpen}
          onClose={() => setIsShortcutsModalOpen(false)}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. DESKTOP TRAY WIDGET & TOOLS MODALS
      ───────────────────────────────────────────────────────────── */}
      {isDesktopWidgetOpen && (
        <DriveDesktopWidget
          isOpen={isDesktopWidgetOpen}
          onClose={() => setIsDesktopWidgetOpen(false)}
          documents={documents}
          totalStorageBytes={totalStorageBytes}
          onOpenTools={(tab) => {
            setToolsModalInitialTab(tab || 'scanner');
            setIsToolsModalOpen(true);
          }}
          onUploadClick={onUploadClick}
        />
      )}

      {isToolsModalOpen && (
        <DriveToolsModal
          isOpen={isToolsModalOpen}
          onClose={() => setIsToolsModalOpen(false)}
          initialTab={toolsModalInitialTab}
          documents={documents}
          onDeleteDocuments={async (docIds) => {
            for (const id of docIds) {
              const doc = documents.find((d) => d.id === id);
              if (doc) {
                await onDeleteDoc(doc);
              }
            }
          }}
          totalStorageBytes={totalStorageBytes}
        />
      )}
    </div>
  );
};
