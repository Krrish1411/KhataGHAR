import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { formatFileSize, formatCurrency, formatCompactCurrency } from '../../utils/formatters';
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
  MoreVertical,
  Download,
  Trash2,
  Eye,
  Info,
  Keyboard,
  ShieldCheck,
  Check,
  X,
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
  ExternalLink,
  Edit2,
  Database,
  Unlink,
  ArrowUpDown,
} from 'lucide-react';
import { InternxtFileIcon, extractExtension } from './InternxtFileIcon';
import { DriveDatabaseUsageMeter } from './DriveDatabaseUsageMeter';
import { useDriveShortcuts } from '../../hooks/useDriveShortcuts';
import { DriveShortcutsModal } from './DriveShortcutsModal';
import { DriveDesktopWidget } from './DriveDesktopWidget';
import { DriveToolsModal } from './DriveToolsModal';

// Helper to render beautiful native Drive folder icons with custom color or Internxt folder SVG
export const FolderIconBadge: React.FC<{
  folder: { icon?: string; color?: string; name: string };
  size?: 'sm' | 'md' | 'lg';
  isOpen?: boolean;
}> = ({ folder, size = 'md', isOpen = false }) => {
  const color = folder.color || '#10b981';
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
      <FolderComponent className={`${iconSizes[size]} fill-current/20`} />
    </div>
  );
};

interface GoogleDriveViewProps {
  documents: DocumentRecord[];
  folders: DocumentFolder[];
  activeFolderId: string;
  onSelectFolder: (folderId: string) => void;
  selectedEntityFilter: LinkedEntityType | 'all' | 'unlinked';
  onSelectEntityFilter: (entity: LinkedEntityType | 'all' | 'unlinked') => void;
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
  const {
    addDocument,
    updateDocument,
    loadDocumentDataUrl,
    transactions,
    accounts,
    assets,
    liabilities,
    peopleLedger,
    goals,
  } = useVault();

  const confirm = useConfirm();

  // Navigation section: 'files' | 'recent' | 'starred'
  const [navSection, setNavSection] = useState<'files' | 'recent' | 'starred'>('files');

  // Multi-selection state
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [lastSelectedDocId, setLastSelectedDocId] = useState<string | null>(null);

  // Inspector drawer toggle
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // Drag-and-drop upload state
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Move-to-folder dropdown state
  const [isMoveMenuOpen, setIsMoveMenuOpen] = useState(false);
  const moveMenuRef = useRef<HTMLDivElement>(null);

  // Custom sort menu dropdown state
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts dialog
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // Desktop Tray status widget
  const [isDesktopWidgetOpen, setIsDesktopWidgetOpen] = useState(false);

  // Drive Tools modal
  const [isToolsModalOpen, setIsToolsModalOpen] = useState(false);
  const [toolsModalInitialTab, setToolsModalInitialTab] = useState<'scanner' | 'cleaner' | 'storage'>('scanner');

  // Search input ref for keyboard shortcut focus
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Inline rename state
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    doc?: DocumentRecord;
    folder?: DocumentFolder;
  } | null>(null);

  // Starred IDs persisted in localStorage
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
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      try {
        localStorage.setItem('khata_starred_docs', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  }, []);

  // Map of linked entities for fast O(1) lookup
  const txMap = useMemo(() => new Map(transactions.map((t) => [t.id, t])), [transactions]);
  const assetMap = useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets]);
  const liabilityMap = useMemo(() => new Map(liabilities.map((l) => [l.id, l])), [liabilities]);
  const accountMap = useMemo(() => new Map(accounts.map((acc) => [acc.id, acc])), [accounts]);
  const peopleMap = useMemo(() => new Map(peopleLedger.map((p) => [p.id, p])), [peopleLedger]);
  const goalMap = useMemo(() => new Map(goals.map((g) => [g.id, g])), [goals]);

  // Helper to format linked entity title & badge
  const getLinkedEntityInfo = useCallback(
    (doc: DocumentRecord) => {
      if (!doc.linkedType || doc.linkedType === 'none' || !doc.linkedId) {
        return null;
      }
      switch (doc.linkedType) {
        case 'transaction': {
          const t = txMap.get(doc.linkedId);
          if (t) {
            return {
              type: 'transaction' as const,
              label: 'Receipt',
              icon: Receipt,
              name: t.note || 'Transaction',
              subtext: `₹${formatCurrency(t.amount)} • ${formatReadableDate(t.date)}`,
              color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
            };
          }
          return {
            type: 'transaction' as const,
            label: 'Receipt',
            icon: Receipt,
            name: 'Linked Transaction',
            subtext: '',
            color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
          };
        }
        case 'asset': {
          const a = assetMap.get(doc.linkedId);
          return {
            type: 'asset' as const,
            label: 'Deed / Title',
            icon: Landmark,
            name: a?.name || 'Asset Holding',
            subtext: a?.currentValue ? `₹${formatCompactCurrency(a.currentValue)}` : '',
            color: 'text-blue-700 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
          };
        }
        case 'liability': {
          const l = liabilityMap.get(doc.linkedId);
          return {
            type: 'liability' as const,
            label: 'Loan Contract',
            icon: TrendingUp,
            name: l?.name || 'Loan Liability',
            subtext: l?.outstandingBalance ? `₹${formatCompactCurrency(l.outstandingBalance)}` : '',
            color: 'text-rose-700 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
          };
        }
        case 'account': {
          const acc = accountMap.get(doc.linkedId);
          return {
            type: 'account' as const,
            label: 'Bank KYC',
            icon: Landmark,
            name: acc?.name || 'Bank Account',
            subtext: acc?.type ? acc.type.toUpperCase() : '',
            color: 'text-indigo-700 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
          };
        }
        case 'people': {
          const p = peopleMap.get(doc.linkedId);
          return {
            type: 'people' as const,
            label: 'IOU / Contact',
            icon: Users,
            name: p?.contactName || 'Contact',
            subtext: '',
            color: 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
          };
        }
        case 'goal': {
          const g = goalMap.get(doc.linkedId);
          return {
            type: 'goal' as const,
            label: 'Goal',
            icon: Sparkles,
            name: g?.name || 'Savings Goal',
            subtext: g?.targetAmount ? `₹${formatCompactCurrency(g.targetAmount)}` : '',
            color: 'text-purple-700 dark:text-purple-400 bg-purple-500/10 border-purple-500/20',
          };
        }
        default:
          return null;
      }
    },
    [txMap, assetMap, liabilityMap, accountMap, peopleMap, goalMap]
  );

  // Active folder object
  const activeFolder = useMemo(() => {
    if (activeFolderId === 'all') return null;
    return folders.find((f) => f.id === activeFolderId) || null;
  }, [folders, activeFolderId]);

  // Subfolders under current folder (or all folders at root)
  const displayedSubfolders = useMemo(() => {
    if (activeFolderId === 'all') {
      return folders;
    }
    return [];
  }, [folders, activeFolderId]);

  // Filtered documents list
  const displayedDocs = useMemo(() => {
    let result = [...documents];

    // 1. Navigation section
    if (navSection === 'recent') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      result = result.filter((d) => new Date(d.createdAt) >= sevenDaysAgo);
    } else if (navSection === 'starred') {
      result = result.filter((d) => starredIds.has(d.id));
    } else if (activeFolderId !== 'all') {
      result = result.filter((d) => d.folderId === activeFolderId);
    }

    // 2. Financial Entity Filter
    if (selectedEntityFilter === 'unlinked') {
      result = result.filter((d) => !d.linkedType || d.linkedType === 'none');
    } else if (selectedEntityFilter !== 'all') {
      result = result.filter((d) => d.linkedType === selectedEntityFilter);
    }

    // 3. File type filter
    if (fileTypeFilter === 'image') {
      result = result.filter((d) => d.fileType.startsWith('image/'));
    } else if (fileTypeFilter === 'pdf') {
      result = result.filter(
        (d) => d.fileType.includes('pdf') || d.name.toLowerCase().endsWith('.pdf')
      );
    } else if (fileTypeFilter === 'other') {
      result = result.filter(
        (d) =>
          !d.fileType.startsWith('image/') &&
          !d.fileType.includes('pdf') &&
          !d.name.toLowerCase().endsWith('.pdf')
      );
    }

    // 4. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.tags?.some((t) => t.toLowerCase().includes(q)) ||
          d.notes?.toLowerCase().includes(q) ||
          d.fileType.toLowerCase().includes(q)
      );
    }

    // 5. Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'size':
          return (b.fileSize || 0) - (a.fileSize || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [
    documents,
    navSection,
    activeFolderId,
    starredIds,
    selectedEntityFilter,
    fileTypeFilter,
    searchQuery,
    sortBy,
  ]);

  // Primary selected document for inspector panel
  const primarySelectedDoc = useMemo(() => {
    if (selectedDocIds.size === 0) return null;
    const firstId = Array.from(selectedDocIds)[0];
    return documents.find((d) => d.id === firstId) || null;
  }, [selectedDocIds, documents]);

  // Auto-focus rename input when entering rename mode
  useEffect(() => {
    if (renamingDocId && renameInputRef.current) {
      renameInputRef.current.focus();
      // Select base name without extension
      const name = renameValue;
      const dotIndex = name.lastIndexOf('.');
      if (dotIndex > 0) {
        renameInputRef.current.setSelectionRange(0, dotIndex);
      } else {
        renameInputRef.current.select();
      }
    }
  }, [renamingDocId]);

  // Commit inline rename
  const handleCommitRename = async () => {
    if (!renamingDocId) return;
    const trimmed = renameValue.trim();
    if (trimmed && trimmed.length > 0) {
      await updateDocument(renamingDocId, { name: trimmed });
    }
    setRenamingDocId(null);
  };

  // Cancel inline rename
  const handleCancelRename = () => {
    setRenamingDocId(null);
  };

  // Start inline rename for a doc
  const handleStartRename = (doc: DocumentRecord, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRenamingDocId(doc.id);
    setRenameValue(doc.name);
    setContextMenu(null);
  };

  // Selection handlers
  const handleSelectDoc = (docId: string, event?: React.MouseEvent) => {
    if (event?.shiftKey && lastSelectedDocId) {
      const lastIndex = displayedDocs.findIndex((d) => d.id === lastSelectedDocId);
      const currentIndex = displayedDocs.findIndex((d) => d.id === docId);
      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const rangeIds = displayedDocs.slice(start, end + 1).map((d) => d.id);
        setSelectedDocIds((prev) => new Set([...Array.from(prev), ...rangeIds]));
        return;
      }
    }

    if (event?.ctrlKey || event?.metaKey) {
      setSelectedDocIds((prev) => {
        const next = new Set(prev);
        if (next.has(docId)) {
          next.delete(docId);
        } else {
          next.add(docId);
        }
        return next;
      });
      setLastSelectedDocId(docId);
      return;
    }

    // Default single click selection
    setSelectedDocIds(new Set([docId]));
    setLastSelectedDocId(docId);
  };

  const handleSelectAll = () => {
    if (selectedDocIds.size === displayedDocs.length) {
      setSelectedDocIds(new Set());
    } else {
      setSelectedDocIds(new Set(displayedDocs.map((d) => d.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedDocIds(new Set());
    setLastSelectedDocId(null);
  };

  // Download a single document to local disk
  const handleDownloadDoc = async (doc: DocumentRecord, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const dataUrl = await loadDocumentDataUrl(doc.id);
      if (!dataUrl) {
        alert('File data could not be decrypted.');
        return;
      }
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  // Batch download selected documents
  const handleDownloadSelected = async () => {
    const ids = Array.from(selectedDocIds);
    for (const id of ids) {
      const doc = documents.find((d) => d.id === id);
      if (doc) {
        await handleDownloadDoc(doc);
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  };

  // Batch delete selected documents
  const handleDeleteSelected = async () => {
    const count = selectedDocIds.size;
    if (count === 0) return;

    const ok = await confirm({
      title: `Delete ${count} Document${count > 1 ? 's' : ''}?`,
      description: `Permanently delete ${count} selected file${
        count > 1 ? 's' : ''
      } from encrypted storage? This will unlink them from any financial records.`,
      confirmText: `Delete ${count} File${count > 1 ? 's' : ''}`,
      variant: 'danger',
    });

    if (ok) {
      const ids = Array.from(selectedDocIds);
      for (const id of ids) {
        const doc = documents.find((d) => d.id === id);
        if (doc) {
          await onDeleteDoc(doc);
        }
      }
      handleClearSelection();
    }
  };

  // Move selected documents to a folder
  const handleMoveSelected = async (targetFolderId: string) => {
    const ids = Array.from(selectedDocIds);
    for (const id of ids) {
      await updateDocument(id, { folderId: targetFolderId === 'unfiled' ? undefined : targetFolderId });
    }
    setIsMoveMenuOpen(false);
  };

  // Drag and drop upload handlers
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

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      for (const file of files) {
        try {
          const processed = await processFileForVault(file, false);
          await addDocument(
            {
              name: file.name,
              fileType: file.type || 'application/octet-stream',
              fileSize: processed.fileSize,
              thumbnailUrl: processed.thumbnailUrl,
              folderId: activeFolderId !== 'all' ? activeFolderId : undefined,
              linkedType: 'none',
            },
            processed.dataUrl,
            { isUncompressed: processed.isUncompressed }
          );
        } catch (err) {
          console.error('Drag-and-drop upload failed for', file.name, err);
        }
      }
    }
  };

  // Global keyboard shortcuts
  useDriveShortcuts({
    onSearchFocus: () => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    },
    onToggleViewMode,
    onToggleInspector: () => setIsInspectorOpen((prev) => !prev),
    onToggleWidget: () => setIsDesktopWidgetOpen((prev) => !prev),
    onToggleTools: () => {
      setToolsModalInitialTab('scanner');
      setIsToolsModalOpen(true);
    },
    onNewFolder: onNewFolderClick,
    onUpload: onUploadClick,
    onDeleteSelected: handleDeleteSelected,
    onClearSelection: handleClearSelection,
  });

  // Close context menu & popovers on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setIsSortMenuOpen(false);
      }
      setContextMenu(null);
      setIsMoveMenuOpen(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex-1 min-h-0 flex flex-col bg-surface rounded-3xl border border-line/80 shadow-xs overflow-hidden relative select-none"
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
          1. TOP TOOLBAR & DYNAMIC BULK ACTIONS (Internxt TopBar)
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
              navSection === 'files' && activeFolderId === 'all' && selectedEntityFilter === 'all'
                ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold shadow-2xs'
                : 'hover:bg-surface-2 text-ink/70 hover:text-ink'
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
                {selectedEntityFilter === 'unlinked' ? 'Unlinked Files' : `${selectedEntityFilter}s`}
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
            placeholder="Search Vault files, receipts, notes... (Press /)"
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
                title="Download selected unencrypted to disk"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              {selectedDocIds.size === 1 && primarySelectedDoc && (
                <button
                  type="button"
                  onClick={() => handleStartRename(primarySelectedDoc)}
                  className="p-1.5 rounded-xl hover:bg-brand-500/20 text-brand-700 dark:text-brand-300 transition-colors"
                  title="Rename file (R)"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  Array.from(selectedDocIds).forEach((id) => toggleStar(id));
                }}
                className="p-1.5 rounded-xl hover:bg-brand-500/20 text-brand-700 dark:text-brand-300 transition-colors"
                title="Star / Unstar (S)"
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
                      className="w-full text-left px-3 py-1.5 hover:bg-surface-2 flex items-center gap-2"
                    >
                      <Folder className="w-3.5 h-3.5 text-ink/40" /> Unfiled
                    </button>
                    {folders.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => handleMoveSelected(f.id)}
                        className="w-full text-left px-3 py-1.5 hover:bg-surface-2 flex items-center gap-2 truncate"
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
                title="Delete selected (Backspace)"
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
              {/* Database usage mini indicator */}
              <DriveDatabaseUsageMeter
                compact={true}
                onOpenTools={(tab) => {
                  setToolsModalInitialTab(tab || 'scanner');
                  setIsToolsModalOpen(true);
                }}
                className="hidden xl:flex"
              />

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
                className="p-2 rounded-xl border border-line bg-surface hover:bg-surface-2 text-ink/70 hover:text-ink transition-all shadow-2xs"
                title={`Switch to ${viewMode === 'grid' ? 'List' : 'Grid'} view (V)`}
              >
                {viewMode === 'grid' ? <List className="w-3.5 h-3.5" /> : <Grid className="w-3.5 h-3.5" />}
              </button>

              {/* Custom Sort selector */}
              <div className="relative" ref={sortMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsSortMenuOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-line bg-surface hover:bg-surface-2 text-xs font-semibold text-ink/80 hover:text-ink transition-all shadow-2xs cursor-pointer"
                  title="Change sort order"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-brand-600" />
                  <span className="hidden sm:inline">
                    {sortBy === 'newest'
                      ? 'Recent'
                      : sortBy === 'oldest'
                      ? 'Oldest'
                      : sortBy === 'name'
                      ? 'Name (A-Z)'
                      : 'Size (Largest)'}
                  </span>
                  <ChevronDown className={`w-3 h-3 text-ink/40 transition-transform ${isSortMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isSortMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-40 bg-surface border border-line rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95">
                    {[
                      { id: 'newest', label: 'Recent' },
                      { id: 'oldest', label: 'Oldest' },
                      { id: 'name', label: 'Name (A-Z)' },
                      { id: 'size', label: 'Size (Largest)' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          onSortChange(opt.id as any);
                          setIsSortMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-surface-2 cursor-pointer transition-colors ${
                          sortBy === opt.id ? 'font-bold text-brand-600 bg-brand-500/5' : 'text-ink/80'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {sortBy === opt.id && <Check className="w-3.5 h-3.5 text-brand-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Sovereign Local Vault Status Pill */}
              <button
                type="button"
                onClick={() => setIsDesktopWidgetOpen((prev) => !prev)}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200 dark:border-pine-800 text-pine-700 dark:text-pine-300 text-xs font-bold shadow-2xs hover:bg-pine-100 transition-colors"
                title="Open Sovereign Vault Status Tray (W)"
              >
                <span className="w-2 h-2 rounded-full bg-pine-500 animate-pulse" />
                <span>Vault Tray</span>
              </button>

              {/* Inspector panel toggle */}
              <button
                type="button"
                onClick={() => setIsInspectorOpen((prev) => !prev)}
                className={`p-2 rounded-xl border transition-all shadow-2xs ${
                  isInspectorOpen
                    ? 'border-brand-500 bg-brand-500/10 text-brand-600'
                    : 'border-line bg-surface hover:bg-surface-2 text-ink/60 hover:text-ink'
                }`}
                title="Toggle Details Inspector (I)"
              >
                <Info className="w-3.5 h-3.5" />
              </button>

              {/* Keyboard shortcuts trigger */}
              <button
                type="button"
                onClick={() => setIsShortcutsModalOpen(true)}
                className="p-2 rounded-xl border border-line bg-surface hover:bg-surface-2 text-ink/60 hover:text-ink transition-all shadow-2xs"
                title="Keyboard shortcuts (?)"
              >
                <Keyboard className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. BODY: LEFT SIDEBAR + MAIN FILE CANVAS + RIGHT INSPECTOR
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ───────────────────────────────────────────────────────────
            LEFT SIDEBAR (Internxt Drive Nav & Financial Link Filters)
        ─────────────────────────────────────────────────────────── */}
        <div className="w-60 xl:w-64 shrink-0 border-r border-line bg-surface flex flex-col justify-between overflow-y-auto custom-scrollbar p-3 space-y-4">
          <div className="space-y-4">
            {/* Primary navigation */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setNavSection('files');
                  onSelectFolder('all');
                  onSelectEntityFilter('all');
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  navSection === 'files' && activeFolderId === 'all' && selectedEntityFilter === 'all'
                    ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold'
                    : 'text-ink/70 hover:bg-surface-2 hover:text-ink'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FolderLock className="w-4 h-4 text-brand-500" />
                  <span>My Files</span>
                </div>
                <span className="text-[11px] font-mono text-ink/40">{documents.length}</span>
              </button>

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
                    : 'text-ink/70 hover:bg-surface-2 hover:text-ink'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-sky-500" />
                  <span>Recent</span>
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
                    : 'text-ink/70 hover:bg-surface-2 hover:text-ink'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span>Starred</span>
                </div>
                <span className="text-[11px] font-mono text-ink/40">{starredIds.size}</span>
              </button>
            </div>

            {/* Financial Link Filters (Where & What Is Linked) */}
            <div className="space-y-1 pt-2 border-t border-line/60">
              <span className="px-3 py-1 text-[10px] font-bold text-ink/40 uppercase tracking-wider block">
                Financial Links
              </span>

              <button
                type="button"
                onClick={() => onSelectEntityFilter('all')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all ${
                  selectedEntityFilter === 'all'
                    ? 'bg-brand-500/10 text-brand-600 font-bold'
                    : 'text-ink/70 hover:bg-surface-2 hover:text-ink'
                }`}
              >
                <span>All Documents</span>
                <span className="text-[10px] font-mono text-ink/40">{documents.length}</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectEntityFilter('transaction')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all ${
                  selectedEntityFilter === 'transaction'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold'
                    : 'text-ink/70 hover:bg-surface-2 hover:text-ink'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Receipt className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Receipts (Txs)</span>
                </div>
                <span className="text-[10px] font-mono text-ink/40">
                  {documents.filter((d) => d.linkedType === 'transaction').length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onSelectEntityFilter('asset')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all ${
                  selectedEntityFilter === 'asset'
                    ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 font-bold'
                    : 'text-ink/70 hover:bg-surface-2 hover:text-ink'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Landmark className="w-3.5 h-3.5 text-blue-500" />
                  <span>Deeds (Assets)</span>
                </div>
                <span className="text-[10px] font-mono text-ink/40">
                  {documents.filter((d) => d.linkedType === 'asset').length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onSelectEntityFilter('liability')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all ${
                  selectedEntityFilter === 'liability'
                    ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 font-bold'
                    : 'text-ink/70 hover:bg-surface-2 hover:text-ink'
                }`}
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
                  <span>Loans (Debts)</span>
                </div>
                <span className="text-[10px] font-mono text-ink/40">
                  {documents.filter((d) => d.linkedType === 'liability').length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onSelectEntityFilter('account')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all ${
                  selectedEntityFilter === 'account'
                    ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-bold'
                    : 'text-ink/70 hover:bg-surface-2 hover:text-ink'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Landmark className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Bank KYC</span>
                </div>
                <span className="text-[10px] font-mono text-ink/40">
                  {documents.filter((d) => d.linkedType === 'account').length}
                </span>
              </button>

              {/* Unlinked / Orphaned Documents Filter */}
              <button
                type="button"
                onClick={() => onSelectEntityFilter('unlinked')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all ${
                  selectedEntityFilter === 'unlinked'
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold'
                    : 'text-ink/70 hover:bg-surface-2 hover:text-ink'
                }`}
                title="Documents not linked to any financial transaction or asset"
              >
                <div className="flex items-center gap-2">
                  <Unlink className="w-3.5 h-3.5 text-amber-500" />
                  <span>Unlinked Files</span>
                </div>
                <span className="text-[10px] font-mono text-ink/40">
                  {documents.filter((d) => !d.linkedType || d.linkedType === 'none').length}
                </span>
              </button>
            </div>
          </div>

          {/* Bottom Database Usage Meter & Quick Tools */}
          <div className="pt-2 border-t border-line/60">
            <DriveDatabaseUsageMeter
              compact={false}
              onOpenTools={(tab) => {
                setToolsModalInitialTab(tab || 'cleaner');
                setIsToolsModalOpen(true);
              }}
            />
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────
            MAIN FILE CANVAS (1:1 Square Grid or High-Density List)
        ─────────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 bg-surface-2/20 overflow-y-auto custom-scrollbar p-4">
          {/* Main Screen Folders Section */}
          {(displayedSubfolders.length > 0 || activeFolderId === 'all') && searchQuery === '' && (
            <div className="mb-6 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink/50">
                    Folders
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-surface-2 text-[10px] font-mono font-bold text-ink/60">
                    {displayedSubfolders.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onNewFolderClick}
                  className="text-xs text-brand-600 hover:text-brand-700 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Folder</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {displayedSubfolders.map((folder) => {
                  const count = documents.filter((d) => d.folderId === folder.id).length;
                  return (
                    <div
                      key={folder.id}
                      onClick={() => onSelectFolder(folder.id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({ x: e.clientX, y: e.clientY, folder });
                      }}
                      className="group p-3 rounded-2xl border border-line bg-surface hover:border-brand-500/50 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between min-h-[56px]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <FolderIconBadge folder={folder} size="sm" />
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold text-ink truncate block group-hover:text-brand-600">
                            {folder.name}
                          </span>
                          <span className="text-[10px] font-mono text-ink/40">{count} {count === 1 ? 'file' : 'files'}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setContextMenu({ x: e.clientX, y: e.clientY, folder });
                        }}
                        className="p-1 rounded-lg text-ink/40 hover:text-ink hover:bg-surface-2 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0"
                        title="Folder options"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}

                {/* + New Folder dashed card */}
                <button
                  type="button"
                  onClick={onNewFolderClick}
                  className="p-3 rounded-2xl border border-dashed border-line hover:border-brand-500/60 bg-surface/40 hover:bg-brand-500/5 transition-all cursor-pointer flex items-center gap-2.5 text-ink/60 hover:text-brand-600 group text-left min-h-[56px]"
                  title="Create a new folder"
                >
                  <div className="w-8 h-8 rounded-xl bg-surface-2 group-hover:bg-brand-500/10 grid place-items-center text-ink/50 group-hover:text-brand-600 transition-colors shrink-0">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold block truncate">New Folder</span>
                    <span className="text-[10px] text-ink/40">Create category</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Document Section Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink/50">
              {activeFolder ? activeFolder.name : 'All Vault Files'} ({displayedDocs.length})
            </h3>
            {displayedDocs.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-ink/50 hover:text-brand-600 font-semibold flex items-center gap-1"
              >
                {selectedDocIds.size === displayedDocs.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>

          {/* Main Document Explorer Canvas */}
          {displayedDocs.length === 0 ? (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-surface border border-line grid place-items-center shadow-xs">
                <InternxtFileIcon size="lg" />
              </div>
              <div>
                <h4 className="font-display font-bold text-sm text-ink">No documents found</h4>
                <p className="text-xs text-ink/50 max-w-sm mt-0.5">
                  {searchQuery
                    ? 'No documents match your search query.'
                    : selectedEntityFilter !== 'all'
                    ? 'No documents match the selected financial link filter.'
                    : 'Upload receipts, loan agreements, property deeds, or KYC cards to secure them.'}
                </p>
              </div>
              <button
                type="button"
                onClick={onUploadClick}
                className="px-4 py-2 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-[0.98]"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Document</span>
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* ─────────────────────────────────────────────────────────
                1:1 SQUARE GRID VIEW (DriveExplorerGridItem Spec)
            ───────────────────────────────────────────────────────── */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {displayedDocs.map((doc) => {
                const isSelected = selectedDocIds.has(doc.id);
                const isStarred = starredIds.has(doc.id);
                const isRenaming = renamingDocId === doc.id;
                const linkInfo = getLinkedEntityInfo(doc);

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
                    className={`group relative flex flex-col aspect-square rounded-2xl border transition-all cursor-pointer shadow-2xs overflow-hidden select-none ${
                      isSelected
                        ? 'border-brand-500 bg-brand-500/5 ring-2 ring-brand-500/40 shadow-xs'
                        : 'border-line bg-surface hover:border-brand-500/40 hover:shadow-xs'
                    }`}
                  >
                    {/* Top Overlay Actions: Checkbox + Star + 3-Dot Floating Trigger */}
                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10 pointer-events-none">
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectDoc(doc.id, { ctrlKey: true } as any);
                        }}
                        className={`p-1 rounded-lg bg-surface/90 backdrop-blur-xs shadow-2xs transition-all pointer-events-auto ${
                          isSelected
                            ? 'opacity-100 text-brand-600 bg-brand-500/10'
                            : 'opacity-0 group-hover:opacity-100 text-ink/40 hover:text-ink'
                        }`}
                        title="Select (Ctrl+Click)"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-brand-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>

                      {/* Right actions: Star + 3-Dot Trigger */}
                      <div className="flex items-center gap-1 pointer-events-auto">
                        <button
                          type="button"
                          onClick={(e) => toggleStar(doc.id, e)}
                          className={`p-1 rounded-lg bg-surface/90 backdrop-blur-xs transition-opacity ${
                            isStarred
                              ? 'opacity-100 text-amber-500'
                              : 'opacity-0 group-hover:opacity-100 text-ink/30 hover:text-amber-500'
                          }`}
                          title="Star document (S)"
                        >
                          <Star className="w-3.5 h-3.5 fill-current" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectDoc(doc.id);
                            setContextMenu({ x: e.clientX, y: e.clientY, doc });
                          }}
                          className="w-6 h-6 rounded-full bg-surface shadow-md border border-line/60 flex items-center justify-center text-ink/70 hover:text-ink hover:bg-surface-2 opacity-0 group-hover:opacity-100 transition-all hover:scale-105 active:scale-95"
                          title="File options"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* ─────────────────────────────────────────────────
                        Upper 66% Preview Canvas: Decrypted Thumbnail or Vector SVG
                    ───────────────────────────────────────────────── */}
                    <div className="h-2/3 w-full bg-surface-2/30 flex items-center justify-center p-3 relative overflow-hidden">
                      {doc.fileType.startsWith('image/') && doc.thumbnailUrl ? (
                        <img
                          src={doc.thumbnailUrl}
                          alt={doc.name}
                          className="max-h-full max-w-full object-contain rounded-lg drop-shadow-xs group-hover:scale-105 transition-transform duration-200"
                          loading="lazy"
                        />
                      ) : (
                        <div className="group-hover:scale-105 transition-transform duration-200">
                          <InternxtFileIcon
                            name={doc.name}
                            mimeType={doc.fileType}
                            size="xl"
                          />
                        </div>
                      )}
                    </div>

                    {/* ─────────────────────────────────────────────────
                        Bottom 34% Info Area: Title, Size, Linked Badge
                    ───────────────────────────────────────────────── */}
                    <div className="h-1/3 w-full px-3 py-2 flex flex-col justify-center border-t border-line/40 bg-surface min-w-0">
                      {/* Name / Inline Rename Input */}
                      {isRenaming ? (
                        <input
                          ref={renameInputRef}
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={handleCommitRename}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCommitRename();
                            if (e.key === 'Escape') handleCancelRename();
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full text-xs font-bold text-ink bg-surface border border-brand-500 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      ) : (
                        <span
                          className="block text-xs font-semibold text-ink truncate leading-tight group-hover:text-brand-600 group-hover:underline transition-colors"
                          title={doc.name}
                        >
                          {doc.name}
                        </span>
                      )}

                      {/* Subtitle: Size & Date */}
                      <div className="flex items-center justify-between text-[10px] text-ink/40 font-mono mt-0.5">
                        <span>{formatFileSize(doc.fileSize || 0)}</span>
                        <span>{formatReadableDate(doc.createdAt)}</span>
                      </div>

                      {/* Financial Link Badge */}
                      {linkInfo ? (
                        <div className="mt-1">
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold truncate max-w-full border ${linkInfo.color}`}
                            title={`${linkInfo.label}: ${linkInfo.name} ${linkInfo.subtext}`}
                          >
                            <linkInfo.icon className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{linkInfo.name}</span>
                          </span>
                        </div>
                      ) : (
                        <div className="mt-1">
                          <span className="inline-block text-[9px] text-ink/30 font-medium">
                            Unlinked
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ─────────────────────────────────────────────────────────
                HIGH-DENSITY LIST VIEW (DriveExplorerList Spec)
            ───────────────────────────────────────────────────────── */
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
                        {selectedDocIds.size === displayedDocs.length && displayedDocs.length > 0 ? (
                          <CheckSquare className="w-3.5 h-3.5 text-brand-600" />
                        ) : (
                          <Square className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </th>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3 hidden sm:table-cell">Modified</th>
                    <th className="py-2.5 px-3 hidden md:table-cell">Size</th>
                    <th className="py-2.5 px-3 hidden lg:table-cell">Linked Financial Record</th>
                    <th className="py-2.5 pr-4 pl-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60 text-xs">
                  {displayedDocs.map((doc) => {
                    const isSelected = selectedDocIds.has(doc.id);
                    const isStarred = starredIds.has(doc.id);
                    const isRenaming = renamingDocId === doc.id;
                    const linkInfo = getLinkedEntityInfo(doc);

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
                          isSelected ? 'bg-brand-500/10' : 'hover:bg-surface-2/60'
                        }`}
                      >
                        {/* Checkbox column */}
                        <td className="py-2.5 pl-4 pr-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleSelectDoc(doc.id, { ctrlKey: true } as any)}
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

                        {/* Name Column: Vector SVG + Filename */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <InternxtFileIcon
                              name={doc.name}
                              mimeType={doc.fileType}
                              size="sm"
                              className="shrink-0"
                            />
                            {isRenaming ? (
                              <input
                                ref={renameInputRef}
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onBlur={handleCommitRename}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleCommitRename();
                                  if (e.key === 'Escape') handleCancelRename();
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs font-bold text-ink bg-surface border border-brand-500 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-brand-500"
                              />
                            ) : (
                              <span className="font-semibold text-ink truncate group-hover:text-brand-600">
                                {doc.name}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Modified Date */}
                        <td className="py-2.5 px-3 text-ink/50 text-[11px] font-mono hidden sm:table-cell whitespace-nowrap">
                          {formatReadableDate(doc.createdAt)}
                        </td>

                        {/* Size */}
                        <td className="py-2.5 px-3 text-ink/50 text-[11px] font-mono hidden md:table-cell whitespace-nowrap">
                          {formatFileSize(doc.fileSize || 0)}
                        </td>

                        {/* Linked Financial Record Column */}
                        <td className="py-2.5 px-3 hidden lg:table-cell">
                          {linkInfo ? (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${linkInfo.color}`}
                              title={`${linkInfo.label}: ${linkInfo.name} ${linkInfo.subtext}`}
                            >
                              <linkInfo.icon className="w-3 h-3 shrink-0" />
                              <span className="truncate max-w-[180px]">{linkInfo.name}</span>
                              {linkInfo.subtext && (
                                <span className="opacity-70 font-mono text-[9px]">
                                  {linkInfo.subtext}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-ink/30 text-[11px]">— Unlinked</span>
                          )}
                        </td>

                        {/* Actions */}
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
                              title="Star file (S)"
                            >
                              <Star className="w-3.5 h-3.5 fill-current" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleDownloadDoc(doc, e)}
                              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-surface-2 text-ink/50 hover:text-ink transition-opacity"
                              title="Download unencrypted"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectDoc(doc.id);
                                setContextMenu({ x: e.clientX, y: e.clientY, doc });
                              }}
                              className="p-1.5 rounded-lg hover:bg-surface-2 text-ink/40 hover:text-ink"
                              title="More actions"
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

        {/* ───────────────────────────────────────────────────────────
            3. RIGHT DETAILS INSPECTOR DRAWER (Internxt Side Drawer)
        ─────────────────────────────────────────────────────────── */}
        {isInspectorOpen && (
          <div className="w-72 sm:w-80 shrink-0 border-l border-line bg-surface flex flex-col justify-between overflow-y-auto custom-scrollbar p-4 anim-slide-left">
            {primarySelectedDoc ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink/50">
                    File Inspector
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsInspectorOpen(false)}
                    className="p-1 rounded-lg hover:bg-surface-2 text-ink/40 hover:text-ink"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Big Preview Banner */}
                <div className="w-full aspect-video rounded-2xl bg-surface-2/40 border border-line overflow-hidden grid place-items-center relative shadow-2xs">
                  {primarySelectedDoc.fileType.startsWith('image/') && primarySelectedDoc.thumbnailUrl ? (
                    <img
                      src={primarySelectedDoc.thumbnailUrl}
                      alt={primarySelectedDoc.name}
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-3 text-center">
                      <InternxtFileIcon
                        name={primarySelectedDoc.name}
                        mimeType={primarySelectedDoc.fileType}
                        size="2xl"
                      />
                      <span className="text-xs font-mono font-bold text-ink/50 mt-2">
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
                      <p className="font-mono text-ink mt-0.5 truncate uppercase">
                        {extractExtension(primarySelectedDoc.name) ||
                          primarySelectedDoc.fileType.split('/')[1] ||
                          'FILE'}
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
                    <span className="text-[10px] font-bold text-ink/40 uppercase">Uploaded</span>
                    <p className="text-ink/70 font-mono mt-0.5">
                      {formatReadableDate(primarySelectedDoc.createdAt)}
                    </p>
                  </div>

                  {/* Deep Financial Link Card */}
                  <div className="pt-2 border-t border-line/60">
                    <span className="text-[10px] font-bold text-ink/40 uppercase block mb-1">
                      Linked Financial Record
                    </span>
                    {(() => {
                      const link = getLinkedEntityInfo(primarySelectedDoc);
                      if (link) {
                        return (
                          <div className={`p-2.5 rounded-xl border space-y-1 ${link.color}`}>
                            <div className="flex items-center gap-1.5 font-bold text-xs">
                              <link.icon className="w-3.5 h-3.5 shrink-0" />
                              <span>{link.name}</span>
                            </div>
                            {link.subtext && (
                              <p className="text-[10px] opacity-80 font-mono">{link.subtext}</p>
                            )}
                            <div className="pt-1 flex items-center justify-between text-[10px]">
                              <span className="font-semibold uppercase">{link.label}</span>
                              <button
                                type="button"
                                onClick={() => onOpenDoc(primarySelectedDoc.id)}
                                className="font-bold underline hover:opacity-80"
                              >
                                View Entry Details
                              </button>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div className="p-2.5 rounded-xl bg-surface-2/40 border border-line text-ink/50 text-[11px] flex items-center justify-between">
                          <span>Not linked to any transaction or asset</span>
                          <button
                            type="button"
                            onClick={() => onOpenDoc(primarySelectedDoc.id)}
                            className="text-brand-600 font-bold hover:underline"
                          >
                            Link
                          </button>
                        </div>
                      );
                    })()}
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
                      className="py-2 px-3 rounded-xl border border-line bg-surface hover:bg-surface-2 text-ink text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
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
                <p>Click on any document to inspect its properties, encryption, and financial linkages</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. RIGHT-CLICK CONTEXT MENU (Bounded to Screen Coordinates)
      ───────────────────────────────────────────────────────────── */}
      {contextMenu && (
        <div
          style={{
            top: Math.min(contextMenu.y, window.innerHeight - 260),
            left: Math.min(contextMenu.x, window.innerWidth - 220),
          }}
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
                className="w-full text-left px-3.5 py-2 hover:bg-surface-2 flex items-center justify-between font-semibold"
              >
                <div className="flex items-center gap-2.5">
                  <Eye className="w-3.5 h-3.5 text-brand-500" />
                  <span>Open Viewer</span>
                </div>
                <kbd className="text-[10px] text-ink/40">Enter</kbd>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleDownloadDoc(contextMenu.doc!);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-surface-2 flex items-center gap-2.5 font-semibold"
              >
                <Download className="w-3.5 h-3.5 text-blue-500" />
                <span>Download Unencrypted</span>
              </button>

              <button
                type="button"
                onClick={() => handleStartRename(contextMenu.doc!)}
                className="w-full text-left px-3.5 py-2 hover:bg-surface-2 flex items-center justify-between font-semibold"
              >
                <div className="flex items-center gap-2.5">
                  <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                  <span>Rename</span>
                </div>
                <kbd className="text-[10px] text-ink/40">R</kbd>
              </button>

              <button
                type="button"
                onClick={() => {
                  toggleStar(contextMenu.doc!.id);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-surface-2 flex items-center justify-between font-semibold"
              >
                <div className="flex items-center gap-2.5">
                  <Star className="w-3.5 h-3.5 text-amber-500" />
                  <span>{starredIds.has(contextMenu.doc!.id) ? 'Unstar' : 'Star'}</span>
                </div>
                <kbd className="text-[10px] text-ink/40">S</kbd>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedDocIds(new Set([contextMenu.doc!.id]));
                  setIsInspectorOpen(true);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-surface-2 flex items-center justify-between font-semibold"
              >
                <div className="flex items-center gap-2.5">
                  <Info className="w-3.5 h-3.5 text-indigo-500" />
                  <span>View Details</span>
                </div>
                <kbd className="text-[10px] text-ink/40">I</kbd>
              </button>

              <hr className="border-line my-1" />

              <button
                type="button"
                onClick={() => {
                  onDeleteDoc(contextMenu.doc!);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 flex items-center justify-between font-semibold"
              >
                <div className="flex items-center gap-2.5">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete File</span>
                </div>
                <kbd className="text-[10px] text-rose-400">Del</kbd>
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
                className="w-full text-left px-3.5 py-2 hover:bg-surface-2 flex items-center gap-2.5 font-semibold"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                <span>Open Folder</span>
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
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Folder</span>
                </button>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. MODALS: SHORTCUTS, TRAY WIDGET & TOOLS
      ───────────────────────────────────────────────────────────── */}
      {isShortcutsModalOpen && (
        <DriveShortcutsModal
          isOpen={isShortcutsModalOpen}
          onClose={() => setIsShortcutsModalOpen(false)}
        />
      )}

      {isDesktopWidgetOpen && (
        <DriveDesktopWidget
          isOpen={isDesktopWidgetOpen}
          onClose={() => setIsDesktopWidgetOpen(false)}
          documents={documents}
          totalStorageBytes={totalStorageBytes}
          onOpenTools={(tab) => {
            if (tab === 'storage' || tab === 'scanner' || tab === 'cleaner') {
              setToolsModalInitialTab(tab);
            } else {
              setToolsModalInitialTab('scanner');
            }
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
