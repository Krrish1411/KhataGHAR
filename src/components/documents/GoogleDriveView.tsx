import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatFileSize, formatCurrency, formatCompactCurrency } from '../../utils/formatters';
import { formatReadableDate, formatReadableDateTime } from '../../utils/dates';
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
  Copy,
  Scissors,
  Clipboard,
  StickyNote,
  Target,
  PanelLeft,
} from 'lucide-react';
import { InternxtFileIcon, extractExtension } from './InternxtFileIcon';
import { DriveDatabaseUsageMeter } from './DriveDatabaseUsageMeter';
import { useDriveShortcuts } from '../../hooks/useDriveShortcuts';
import { DriveShortcutsModal } from './DriveShortcutsModal';
import { DriveDesktopWidget } from './DriveDesktopWidget';
import { DriveToolsModal } from './DriveToolsModal';
import { DocumentFolderModal } from './DocumentFolderModal';

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
    addDocumentFolder,
    transactions,
    accounts,
    assets,
    liabilities,
    peopleLedger,
    goals,
    notes,
  } = useVault();

  const confirm = useConfirm();
  const navigate = useNavigate();

  // Navigation section: 'files' | 'recent' | 'starred'
  const [navSection, setNavSection] = useState<'files' | 'recent' | 'starred'>('files');

  // Multi-selection state (Files & Folders)
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
  const [lastSelectedDocId, setLastSelectedDocId] = useState<string | null>(null);

  // Drag-and-drop file into folder drop-target indicator
  const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null>(null);

  // Mobile sidebar drawer state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Explorer Clipboard State (Copy, Cut, Paste for docs & folders)
  const [clipboard, setClipboard] = useState<{
    action: 'copy' | 'cut';
    docIds: string[];
    folderIds: string[];
  } | null>(null);

  // Rubber-band marquee drag selection state
  const canvasRef = useRef<HTMLDivElement>(null);
  const [marquee, setMarquee] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const [isMarqueeDragging, setIsMarqueeDragging] = useState(false);

  // Folder to Edit / Customize Modal State
  const [folderToEdit, setFolderToEdit] = useState<DocumentFolder | null>(null);

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
      result = result.filter((d) => {
        const hasLegacy = d.linkedType && d.linkedType !== 'none';
        const hasLinks = d.links && d.links.length > 0;
        return !hasLegacy && !hasLinks;
      });
    } else if (selectedEntityFilter !== 'all') {
      result = result.filter((d) => {
        if (d.linkedType === selectedEntityFilter) return true;
        return d.links?.some((l) => l.entityType === selectedEntityFilter) ?? false;
      });
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

  // Primary selected folder object for inspector panel
  const primarySelectedFolder = useMemo(() => {
    if (selectedFolderIds.size === 0) return null;
    const firstId = Array.from(selectedFolderIds)[0];
    return folders.find((f) => f.id === firstId) || null;
  }, [selectedFolderIds, folders]);

  const selectedFolderObj = primarySelectedFolder;
  const selectedFolderId = selectedFolderIds.size === 1 ? Array.from(selectedFolderIds)[0] : null;

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
    setSelectedFolderIds(new Set());
    setLastSelectedDocId(docId);
  };

  const handleSelectFolder = (folderId: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    if (event?.ctrlKey || event?.metaKey) {
      setSelectedFolderIds((prev) => {
        const next = new Set(prev);
        if (next.has(folderId)) {
          next.delete(folderId);
        } else {
          next.add(folderId);
        }
        return next;
      });
      return;
    }

    // Default single click selection
    setSelectedFolderIds(new Set([folderId]));
    setSelectedDocIds(new Set());
    setLastSelectedDocId(null);
  };

  const handleOpenFolder = (folderId: string) => {
    setNavSection('files');
    setSelectedFolderIds(new Set());
    setSelectedDocIds(new Set());
    setLastSelectedDocId(null);
    onSelectFolder(folderId);
  };

  const handleSelectAll = () => {
    const totalSelectableFolders = (activeFolderId === 'all' && searchQuery === '') ? displayedSubfolders.length : 0;
    const totalSelectableDocs = displayedDocs.length;
    const isAllDocsSelected = totalSelectableDocs > 0 && selectedDocIds.size === totalSelectableDocs;
    const isAllFoldersSelected = totalSelectableFolders > 0 && selectedFolderIds.size === totalSelectableFolders;

    if ((totalSelectableDocs === 0 || isAllDocsSelected) && (totalSelectableFolders === 0 || isAllFoldersSelected)) {
      // If everything is already selected, clear all
      setSelectedDocIds(new Set());
      setSelectedFolderIds(new Set());
      setLastSelectedDocId(null);
    } else {
      // Select ALL folders and ALL docs
      setSelectedDocIds(new Set(displayedDocs.map((d) => d.id)));
      if (activeFolderId === 'all' && searchQuery === '') {
        setSelectedFolderIds(new Set(displayedSubfolders.map((f) => f.id)));
      } else {
        setSelectedFolderIds(new Set());
      }
    }
  };

  const handleClearSelection = () => {
    setSelectedDocIds(new Set());
    setSelectedFolderIds(new Set());
    setLastSelectedDocId(null);
  };

  // Navigable items sequence for Arrow keys navigation
  const visibleNavItems = useMemo(() => {
    const foldersList = (displayedSubfolders.length > 0 && searchQuery === '') ? displayedSubfolders : [];
    return [
      ...foldersList.map((f) => ({ type: 'folder' as const, id: f.id })),
      ...displayedDocs.map((d) => ({ type: 'doc' as const, id: d.id })),
    ];
  }, [displayedSubfolders, searchQuery, displayedDocs]);

  const currentNavIndex = useMemo(() => {
    if (selectedFolderIds.size > 0) {
      const activeFId = Array.from(selectedFolderIds)[0];
      return visibleNavItems.findIndex((item) => item.type === 'folder' && item.id === activeFId);
    }
    if (selectedDocIds.size > 0) {
      const activeId = lastSelectedDocId || Array.from(selectedDocIds)[0];
      return visibleNavItems.findIndex((item) => item.type === 'doc' && item.id === activeId);
    }
    return -1;
  }, [selectedFolderIds, selectedDocIds, lastSelectedDocId, visibleNavItems]);

  const handleSelectIndex = (idx: number) => {
    if (idx < 0 || idx >= visibleNavItems.length) return;
    const target = visibleNavItems[idx];
    if (target.type === 'folder') {
      setSelectedFolderIds(new Set([target.id]));
      setSelectedDocIds(new Set());
      setLastSelectedDocId(null);
    } else {
      setSelectedFolderIds(new Set());
      setSelectedDocIds(new Set([target.id]));
      setLastSelectedDocId(target.id);
    }
  };

  const handleSelectNext = () => {
    if (visibleNavItems.length === 0) return;
    if (currentNavIndex === -1) {
      handleSelectIndex(0);
    } else if (currentNavIndex < visibleNavItems.length - 1) {
      handleSelectIndex(currentNavIndex + 1);
    }
  };

  const handleSelectPrev = () => {
    if (visibleNavItems.length === 0) return;
    if (currentNavIndex === -1) {
      handleSelectIndex(0);
    } else if (currentNavIndex > 0) {
      handleSelectIndex(currentNavIndex - 1);
    }
  };

  const handleSelectNextRow = () => {
    if (visibleNavItems.length === 0) return;
    if (viewMode === 'list') {
      handleSelectNext();
      return;
    }
    const step = 4;
    const nextIdx = Math.min(visibleNavItems.length - 1, (currentNavIndex === -1 ? 0 : currentNavIndex) + step);
    handleSelectIndex(nextIdx);
  };

  const handleSelectPrevRow = () => {
    if (visibleNavItems.length === 0) return;
    if (viewMode === 'list') {
      handleSelectPrev();
      return;
    }
    const step = 4;
    const prevIdx = Math.max(0, (currentNavIndex === -1 ? 0 : currentNavIndex) - step);
    handleSelectIndex(prevIdx);
  };

  const handleOpenSelected = () => {
    if (selectedFolderIds.size === 1) {
      const fId = Array.from(selectedFolderIds)[0];
      handleOpenFolder(fId);
      return;
    }
    if (selectedDocIds.size === 1) {
      const docId = Array.from(selectedDocIds)[0];
      onOpenDoc(docId);
      return;
    }
  };

  const handleNavigateUp = () => {
    if (activeFolderId !== 'all') {
      onSelectFolder('all');
      setSelectedFolderIds(new Set());
      setSelectedDocIds(new Set());
      setLastSelectedDocId(null);
    } else if (selectedFolderIds.size > 0 || selectedDocIds.size > 0) {
      handleClearSelection();
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // EXPLORER CLIPBOARD OPERATIONS (Copy, Cut, Paste for docs & folders)
  // ─────────────────────────────────────────────────────────────────
  const handleCopySelected = (specificDocIds?: string[], specificFolderIds?: string[]) => {
    const dIds = specificDocIds || Array.from(selectedDocIds);
    const fIds = specificFolderIds || Array.from(selectedFolderIds);
    if (dIds.length === 0 && fIds.length === 0) return;
    setClipboard({ action: 'copy', docIds: dIds, folderIds: fIds });
    setContextMenu(null);
  };

  const handleCutSelected = (specificDocIds?: string[], specificFolderIds?: string[]) => {
    const dIds = specificDocIds || Array.from(selectedDocIds);
    const fIds = specificFolderIds || Array.from(selectedFolderIds);
    if (dIds.length === 0 && fIds.length === 0) return;
    setClipboard({ action: 'cut', docIds: dIds, folderIds: fIds });
    setContextMenu(null);
  };

  const handlePaste = async (targetFolderId?: string) => {
    if (!clipboard || (clipboard.docIds.length === 0 && clipboard.folderIds.length === 0)) return;
    const destination = targetFolderId || (activeFolderId !== 'all' ? activeFolderId : 'unfiled');

    try {
      if (clipboard.action === 'cut') {
        for (const id of clipboard.docIds) {
          await updateDocument(id, { folderId: destination === 'unfiled' ? undefined : destination });
        }
        setClipboard(null);
      } else if (clipboard.action === 'copy') {
        // Clone files
        for (const id of clipboard.docIds) {
          const originalDoc = documents.find((d) => d.id === id);
          if (originalDoc) {
            const dataUrl = originalDoc.dataUrl || (await loadDocumentDataUrl(originalDoc.id));
            await addDocument(
              {
                name: `Copy of ${originalDoc.name}`,
                fileType: originalDoc.fileType,
                fileSize: originalDoc.fileSize,
                folderId: destination === 'unfiled' ? undefined : destination,
                thumbnailUrl: originalDoc.thumbnailUrl,
                notes: originalDoc.notes,
                linkedType: originalDoc.linkedType,
                linkedId: originalDoc.linkedId,
                links: originalDoc.links,
                expiryDate: originalDoc.expiryDate,
                isUncompressed: originalDoc.isUncompressed,
              },
              dataUrl,
              { isUncompressed: originalDoc.isUncompressed }
            );
          }
        }
        // Clone folders if any
        for (const fId of clipboard.folderIds) {
          const originalFolder = folders.find((f) => f.id === fId);
          if (originalFolder) {
            const created = await addDocumentFolder({
              name: `Copy of ${originalFolder.name}`,
              color: originalFolder.color,
              icon: originalFolder.icon,
            });
            // Also clone docs in this folder into the new folder
            const folderDocs = documents.filter((d) => d.folderId === fId);
            for (const doc of folderDocs) {
              const dataUrl = doc.dataUrl || (await loadDocumentDataUrl(doc.id));
              await addDocument(
                {
                  name: doc.name,
                  fileType: doc.fileType,
                  fileSize: doc.fileSize,
                  folderId: created.id,
                  thumbnailUrl: doc.thumbnailUrl,
                  notes: doc.notes,
                  linkedType: doc.linkedType,
                  linkedId: doc.linkedId,
                  links: doc.links,
                  expiryDate: doc.expiryDate,
                  isUncompressed: doc.isUncompressed,
                },
                dataUrl,
                { isUncompressed: doc.isUncompressed }
              );
            }
          }
        }
        setClipboard(null);
      }
    } catch (err) {
      console.error('Paste failed:', err);
    } finally {
      setContextMenu(null);
    }
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

  // Batch delete selected documents & folders
  const handleDeleteSelected = async () => {
    const docCount = selectedDocIds.size;
    const folderCount = selectedFolderIds.size;
    if (docCount === 0 && folderCount === 0) return;

    let title = '';
    let description = '';
    if (docCount > 0 && folderCount > 0) {
      title = `Delete ${docCount} File${docCount > 1 ? 's' : ''} and ${folderCount} Folder${folderCount > 1 ? 's' : ''}?`;
      description = `Permanently delete ${docCount} file${docCount > 1 ? 's' : ''} and ${folderCount} folder${folderCount > 1 ? 's' : ''}? File linkages will be removed.`;
    } else if (folderCount > 0) {
      title = `Delete ${folderCount} Folder${folderCount > 1 ? 's' : ''}?`;
      description = `Delete selected custom folder${folderCount > 1 ? 's' : ''}? Files inside will become unfiled.`;
    } else {
      title = `Delete ${docCount} Document${docCount > 1 ? 's' : ''}?`;
      description = `Permanently delete ${docCount} selected file${
        docCount > 1 ? 's' : ''
      } from encrypted storage? This will unlink them from any financial records.`;
    }

    const ok = await confirm({
      title,
      description,
      confirmText: `Delete Selected`,
      variant: 'danger',
    });

    if (ok) {
      for (const id of Array.from(selectedDocIds)) {
        const doc = documents.find((d) => d.id === id);
        if (doc) {
          await onDeleteDoc(doc);
        }
      }
      if (onDeleteFolder) {
        for (const fId of Array.from(selectedFolderIds)) {
          const f = folders.find((item) => item.id === fId);
          if (f && !f.isSystem) {
            await onDeleteFolder(fId);
          }
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

  // Drag-and-drop file into folder handlers
  const handleDocDragStart = (docId: string, e: React.DragEvent) => {
    const ids = selectedDocIds.has(docId) ? Array.from(selectedDocIds) : [docId];
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'doc', ids }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDropOnFolder = async (folderId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetFolderId(null);

    const raw = e.dataTransfer.getData('application/json');
    if (raw) {
      try {
        const data = JSON.parse(raw);
        if (data.type === 'doc' && Array.isArray(data.ids)) {
          for (const id of data.ids) {
            await updateDocument(id, { folderId });
          }
          setSelectedDocIds(new Set());
          return;
        }
      } catch {}
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (const file of Array.from(e.dataTransfer.files)) {
        try {
          const processed = await processFileForVault(file, false);
          await addDocument(
            {
              name: file.name,
              fileType: file.type || 'application/octet-stream',
              fileSize: processed.fileSize,
              thumbnailUrl: processed.thumbnailUrl,
              folderId,
              linkedType: 'none',
            },
            processed.dataUrl,
            { isUncompressed: processed.isUncompressed }
          );
        } catch (err) {
          console.error('Failed uploading file to folder:', err);
        }
      }
    }
  };

  // Canvas rubber-band marquee drag selection handlers
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-drive-item], button, input, textarea, a, select, [role="button"]')) {
      return;
    }
    if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
      handleClearSelection();
    }
    setMarquee({
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
    });
    setIsMarqueeDragging(false);
  };

  useEffect(() => {
    if (!marquee) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = Math.abs(e.clientX - marquee.startX);
      const dy = Math.abs(e.clientY - marquee.startY);
      if (!isMarqueeDragging && (dx > 3 || dy > 3)) {
        setIsMarqueeDragging(true);
      }

      setMarquee((prev) => (prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null));

      const box = {
        left: Math.min(marquee.startX, e.clientX),
        top: Math.min(marquee.startY, e.clientY),
        right: Math.max(marquee.startX, e.clientX),
        bottom: Math.max(marquee.startY, e.clientY),
      };

      const items = canvasRef.current?.querySelectorAll<HTMLElement>('[data-drive-item]');
      if (!items) return;

      const newSelectedDocs = new Set(e.ctrlKey || e.shiftKey ? selectedDocIds : []);
      const newSelectedFolders = new Set(e.ctrlKey || e.shiftKey ? selectedFolderIds : []);

      items.forEach((item) => {
        const rect = item.getBoundingClientRect();
        const intersects = !(
          rect.right < box.left ||
          rect.left > box.right ||
          rect.bottom < box.top ||
          rect.top > box.bottom
        );
        if (intersects) {
          const type = item.dataset.driveType;
          const id = item.dataset.driveId;
          if (id) {
            if (type === 'folder') {
              newSelectedFolders.add(id);
            } else if (type === 'doc') {
              newSelectedDocs.add(id);
            }
          }
        }
      });

      setSelectedDocIds(newSelectedDocs);
      setSelectedFolderIds(newSelectedFolders);
    };

    const handleMouseUp = () => {
      setMarquee(null);
      setIsMarqueeDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [marquee, isMarqueeDragging, selectedDocIds, selectedFolderIds]);

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
    onOpenSelected: handleOpenSelected,
    onNavigateUp: handleNavigateUp,
    onSelectNext: handleSelectNext,
    onSelectPrev: handleSelectPrev,
    onSelectNextRow: handleSelectNextRow,
    onSelectPrevRow: handleSelectPrevRow,
    onSelectAll: handleSelectAll,
    hasSelection: Boolean(selectedFolderIds.size > 0 || selectedDocIds.size > 0),
  });

  // Explorer keyboard listener for Copy, Cut, Paste, F2
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (selectedDocIds.size > 0 || selectedFolderIds.size > 0) {
          e.preventDefault();
          handleCopySelected();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
        if (selectedDocIds.size > 0 || selectedFolderIds.size > 0) {
          e.preventDefault();
          handleCutSelected();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (clipboard && (clipboard.docIds.length > 0 || clipboard.folderIds.length > 0)) {
          e.preventDefault();
          handlePaste();
        }
      } else if (e.key === 'F2') {
        if (selectedDocIds.size === 1 && primarySelectedDoc) {
          e.preventDefault();
          handleStartRename(primarySelectedDoc);
        } else if (selectedFolderIds.size === 1 && selectedFolderObj) {
          e.preventDefault();
          setFolderToEdit(selectedFolderObj);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDocIds, selectedFolderIds, clipboard, activeFolderId, primarySelectedDoc, selectedFolderObj, documents]);

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
      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 border-b border-line bg-surface shrink-0 min-w-0">
        {(selectedDocIds.size > 0 || selectedFolderIds.size > 0) ? (
          /* Contextual Action Bar when any folder(s) or file(s) are selected (Full Width) */
          <div className="flex items-center justify-between gap-2 w-full min-w-0 anim-fade">
            {/* Left: Clear button + Selection Count & Name */}
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink">
              <button
                type="button"
                onClick={handleClearSelection}
                className="p-1.5 rounded-xl hover:bg-surface-2 text-ink/60 hover:text-ink transition-colors cursor-pointer shrink-0 border border-line/60 shadow-2xs"
                title="Clear selection (Esc)"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              <span className="text-xs font-bold text-brand-700 dark:text-brand-300 truncate max-w-[110px] xs:max-w-[150px] sm:max-w-[260px] bg-brand-500/10 border border-brand-500/20 px-2.5 py-1 rounded-xl">
                {selectedFolderIds.size > 0 && selectedDocIds.size === 0
                  ? selectedFolderIds.size === 1 && selectedFolderObj
                    ? selectedFolderObj.name
                    : `${selectedFolderIds.size} folders`
                  : selectedDocIds.size > 0 && selectedFolderIds.size === 0
                  ? selectedDocIds.size === 1 && primarySelectedDoc
                    ? primarySelectedDoc.name
                    : `${selectedDocIds.size} files`
                  : `${selectedFolderIds.size} folders, ${selectedDocIds.size} files`}
              </span>
            </div>

            {/* Right: Scrollable actions strip - NEVER CLIPS OR OVERFLOWS */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 shrink-0 max-w-[calc(100%-140px)] sm:max-w-none">
              {/* If exactly 1 folder selected: Open & Customize */}
              {selectedFolderIds.size === 1 && selectedFolderId && (
                <>
                  <button
                    type="button"
                    onClick={() => handleOpenFolder(selectedFolderId)}
                    className="p-1.5 rounded-xl hover:bg-brand-500/20 text-brand-700 dark:text-brand-300 transition-colors cursor-pointer shrink-0"
                    title="Open Folder (Enter)"
                  >
                    <FolderOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setFolderToEdit(selectedFolderObj)}
                    className="p-1.5 rounded-xl hover:bg-brand-500/20 text-brand-700 dark:text-brand-300 transition-colors cursor-pointer shrink-0"
                    title="Customize Folder Icon & Color"
                  >
                    <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </>
              )}

              {/* If exactly 1 doc selected: Attach to financial record & rename */}
              {selectedDocIds.size === 1 && primarySelectedDoc && selectedFolderIds.size === 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => onOpenDoc(primarySelectedDoc.id)}
                    className="p-1.5 rounded-xl hover:bg-brand-500/20 text-brand-700 dark:text-brand-300 transition-colors cursor-pointer shrink-0"
                    title="Attach to Financial Record / View Details"
                  >
                    <Link2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartRename(primarySelectedDoc)}
                    className="p-1.5 rounded-xl hover:bg-brand-500/20 text-brand-700 dark:text-brand-300 transition-colors cursor-pointer shrink-0"
                    title="Rename file (F2 / R)"
                  >
                    <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </>
              )}

              {/* Download files if any docs selected */}
              {selectedDocIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleDownloadSelected}
                  className="p-1.5 rounded-xl hover:bg-brand-500/20 text-brand-700 dark:text-brand-300 transition-colors cursor-pointer shrink-0"
                  title="Download selected unencrypted to disk"
                >
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}

              {/* Star/Unstar if any docs selected */}
              {selectedDocIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    Array.from(selectedDocIds).forEach((id) => toggleStar(id));
                  }}
                  className="p-1.5 rounded-xl hover:bg-brand-500/20 text-brand-700 dark:text-brand-300 transition-colors cursor-pointer shrink-0"
                  title="Star / Unstar (S)"
                >
                  <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}

              {/* Move to folder dropdown if docs selected */}
              {selectedDocIds.size > 0 && (
                <div className="relative shrink-0" ref={moveMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsMoveMenuOpen((prev) => !prev)}
                    className="p-1.5 rounded-xl hover:bg-brand-500/20 text-brand-700 dark:text-brand-300 transition-colors cursor-pointer shrink-0"
                    title="Move to folder"
                  >
                    <Folder className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  {isMoveMenuOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-52 py-1.5 bg-card border border-line rounded-2xl shadow-2xl z-50 text-xs text-ink space-y-0.5 anim-scale">
                      <span className="px-3 py-1 text-[10px] font-bold text-ink/40 uppercase block">
                        Move to Folder:
                      </span>
                      <button
                        type="button"
                        onClick={() => handleMoveSelected('unfiled')}
                        className="w-full text-left px-3 py-1.5 hover:bg-surface-2 flex items-center gap-2 cursor-pointer"
                      >
                        <Folder className="w-3.5 h-3.5 text-ink/40" /> Unfiled
                      </button>
                      {folders.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => handleMoveSelected(f.id)}
                          className="w-full text-left px-3 py-1.5 hover:bg-surface-2 flex items-center gap-2 truncate cursor-pointer"
                        >
                          <FolderIconBadge folder={f} size="sm" />
                          <span className="truncate">{f.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Copy Selected */}
              <button
                type="button"
                onClick={() => handleCopySelected()}
                className="p-1.5 rounded-xl hover:bg-brand-500/20 text-brand-700 dark:text-brand-300 transition-colors cursor-pointer shrink-0"
                title="Copy selected (Ctrl+C)"
              >
                <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {/* Cut Selected */}
              <button
                type="button"
                onClick={() => handleCutSelected()}
                className="p-1.5 rounded-xl hover:bg-brand-500/20 text-brand-700 dark:text-brand-300 transition-colors cursor-pointer shrink-0"
                title="Cut / Move selected (Ctrl+X)"
              >
                <Scissors className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {/* Paste button if clipboard active */}
              {clipboard && (clipboard.docIds.length > 0 || clipboard.folderIds.length > 0) && (
                <button
                  type="button"
                  onClick={() => handlePaste(selectedFolderIds.size === 1 ? selectedFolderId! : undefined)}
                  className="px-2 py-1 rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition-colors shadow-2xs flex items-center gap-1 cursor-pointer shrink-0"
                  title={`Paste ${clipboard.docIds.length + clipboard.folderIds.length} items here (Ctrl+V)`}
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold">Paste</span>
                </button>
              )}

              {/* Delete Selected */}
              <button
                type="button"
                onClick={handleDeleteSelected}
                className="p-1.5 rounded-xl hover:bg-rose-500/20 text-rose-600 transition-colors cursor-pointer shrink-0"
                title="Delete selected (Delete / Backspace)"
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* STANDARD TOOLBAR WHEN NOTHING SELECTED */
          <div className="flex items-center justify-between gap-2 w-full min-w-0">
            {/* Left: Mobile Drawer Trigger + Breadcrumbs navigation */}
            <div className="flex items-center gap-1.5 text-xs font-semibold text-ink/60 overflow-hidden min-w-0">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="md:hidden p-1.5 rounded-xl border border-line bg-surface hover:bg-surface-2 text-ink/70 hover:text-ink shadow-2xs mr-0.5 cursor-pointer shrink-0"
                title="Open Folders and Financial Links"
              >
                <PanelLeft className="w-4 h-4 text-brand-600" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setNavSection('files');
                  onSelectFolder('all');
                  onSelectEntityFilter('all');
                }}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl transition-all shrink-0 ${
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
                  <span className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-surface-2 font-bold text-ink truncate flex items-center gap-2 border border-line/60 shadow-2xs min-w-0">
                    <FolderIconBadge folder={activeFolder} size="sm" isOpen={true} />
                    <span className="truncate">{activeFolder.name}</span>
                  </span>
                </>
              )}

              {navSection === 'recent' && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-ink/30 shrink-0" />
                  <span className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-surface-2 font-bold text-ink border border-line/60 shrink-0">
                    Recent
                  </span>
                </>
              )}

              {navSection === 'starred' && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-ink/30 shrink-0" />
                  <span className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-surface-2 font-bold text-ink border border-line/60 shrink-0">
                    Starred
                  </span>
                </>
              )}

              {selectedEntityFilter !== 'all' && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-ink/30 shrink-0" />
                  <span className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-brand-500/10 text-brand-600 font-bold capitalize border border-brand-500/20 shrink-0">
                    {selectedEntityFilter === 'unlinked' ? 'Unlinked Files' : `${selectedEntityFilter}s`}
                  </span>
                </>
              )}
            </div>

            {/* Center: Search pill with shortcut hint */}
            <div className="relative flex-1 max-w-md hidden sm:block mx-2">
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

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Explorer Clipboard Paste Button when items copied/cut */}
              {clipboard && (clipboard.docIds.length > 0 || clipboard.folderIds.length > 0) && (
                <div className="flex items-center gap-1 bg-brand-500/10 border border-brand-500/20 px-2.5 py-1 rounded-xl anim-fade">
                  <button
                    type="button"
                    onClick={() => handlePaste()}
                    className="flex items-center gap-1.5 text-xs font-bold text-brand-700 dark:text-brand-300 hover:text-brand-800 cursor-pointer"
                    title="Paste into current folder (Ctrl+V)"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    <span>Paste ({clipboard.docIds.length + clipboard.folderIds.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setClipboard(null)}
                    className="p-0.5 rounded text-brand-700/60 hover:text-brand-800 cursor-pointer"
                    title="Clear clipboard"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

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
                className="p-2 rounded-xl border border-line bg-surface hover:bg-surface-2 text-ink/70 hover:text-ink transition-all shadow-2xs cursor-pointer"
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
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200 dark:border-pine-800 text-pine-700 dark:text-pine-300 text-xs font-bold shadow-2xs hover:bg-pine-100 transition-colors cursor-pointer"
                title="Open Sovereign Vault Status Tray (W)"
              >
                <span className="w-2 h-2 rounded-full bg-pine-500 animate-pulse" />
                <span>Vault Tray</span>
              </button>

              {/* Inspector panel toggle */}
              <button
                type="button"
                onClick={() => setIsInspectorOpen((prev) => !prev)}
                className={`p-2 rounded-xl border transition-all shadow-2xs cursor-pointer ${
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
                className="p-2 rounded-xl border border-line bg-surface hover:bg-surface-2 text-ink/60 hover:text-ink transition-all shadow-2xs cursor-pointer"
                title="Keyboard shortcuts (?)"
              >
                <Keyboard className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. BODY: LEFT SIDEBAR + MAIN FILE CANVAS + RIGHT INSPECTOR
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ───────────────────────────────────────────────────────────
            LEFT SIDEBAR (Internxt Drive Nav & Financial Link Filters)
        ─────────────────────────────────────────────────────────── */}
        {/* Desktop Sidebar */}
        <div className="hidden md:flex w-60 xl:w-64 shrink-0 border-r border-line bg-surface flex-col justify-between overflow-y-auto custom-scrollbar p-3 space-y-4">
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
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
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
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
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
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
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
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
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
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
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
                  {documents.filter((d) => d.linkedType === 'transaction' || d.links?.some((l) => l.entityType === 'transaction')).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onSelectEntityFilter('asset')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
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
                  {documents.filter((d) => d.linkedType === 'asset' || d.links?.some((l) => l.entityType === 'asset')).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onSelectEntityFilter('liability')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
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
                  {documents.filter((d) => d.linkedType === 'liability' || d.links?.some((l) => l.entityType === 'liability')).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onSelectEntityFilter('account')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
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
                  {documents.filter((d) => d.linkedType === 'account' || d.links?.some((l) => l.entityType === 'account')).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onSelectEntityFilter('note')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                  selectedEntityFilter === 'note'
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold'
                    : 'text-ink/70 hover:bg-surface-2 hover:text-ink'
                }`}
              >
                <div className="flex items-center gap-2">
                  <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                  <span>Vault Notes</span>
                </div>
                <span className="text-[10px] font-mono text-ink/40">
                  {documents.filter((d) => d.linkedType === 'note' || d.links?.some((l) => l.entityType === 'note')).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onSelectEntityFilter('people')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                  selectedEntityFilter === 'people'
                    ? 'bg-purple-500/10 text-purple-700 dark:text-purple-400 font-bold'
                    : 'text-ink/70 hover:bg-surface-2 hover:text-ink'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-purple-500" />
                  <span>Khatabook</span>
                </div>
                <span className="text-[10px] font-mono text-ink/40">
                  {documents.filter((d) => d.linkedType === 'people' || d.links?.some((l) => l.entityType === 'people')).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onSelectEntityFilter('goal')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                  selectedEntityFilter === 'goal'
                    ? 'bg-teal-500/10 text-teal-700 dark:text-teal-400 font-bold'
                    : 'text-ink/70 hover:bg-surface-2 hover:text-ink'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-teal-500" />
                  <span>Savings Goals</span>
                </div>
                <span className="text-[10px] font-mono text-ink/40">
                  {documents.filter((d) => d.linkedType === 'goal' || d.links?.some((l) => l.entityType === 'goal')).length}
                </span>
              </button>

              {/* Unlinked / Orphaned Documents Filter */}
              <button
                type="button"
                onClick={() => onSelectEntityFilter('unlinked')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
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
                  {documents.filter((d) => (!d.linkedType || d.linkedType === 'none') && (!d.links || d.links.length === 0)).length}
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

        {/* Mobile Slide-Over Sidebar Drawer */}
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-in fade-in"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <div className="relative w-72 max-w-[85vw] bg-surface h-full z-10 flex flex-col justify-between overflow-y-auto custom-scrollbar p-4 space-y-4 shadow-2xl border-r border-line animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-line/60 shrink-0">
                <div className="flex items-center gap-2">
                  <FolderLock className="w-5 h-5 text-brand-600" />
                  <span className="font-bold text-sm text-ink">Vault Explorer</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-surface-2 text-ink/60 hover:text-ink cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
                {/* Primary navigation */}
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setNavSection('files');
                      onSelectFolder('all');
                      onSelectEntityFilter('all');
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
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
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
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
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
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

                {/* Financial Link Filters */}
                <div className="space-y-1 pt-2 border-t border-line/60">
                  <span className="px-3 py-1 text-[10px] font-bold text-ink/40 uppercase tracking-wider block">
                    Financial Links
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectEntityFilter('all');
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
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
                    onClick={() => {
                      onSelectEntityFilter('transaction');
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
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
                      {documents.filter((d) => d.linkedType === 'transaction' || d.links?.some((l) => l.entityType === 'transaction')).length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectEntityFilter('asset');
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
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
                      {documents.filter((d) => d.linkedType === 'asset' || d.links?.some((l) => l.entityType === 'asset')).length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectEntityFilter('liability');
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
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
                      {documents.filter((d) => d.linkedType === 'liability' || d.links?.some((l) => l.entityType === 'liability')).length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectEntityFilter('account');
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
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
                      {documents.filter((d) => d.linkedType === 'account' || d.links?.some((l) => l.entityType === 'account')).length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectEntityFilter('note');
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                      selectedEntityFilter === 'note'
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold'
                        : 'text-ink/70 hover:bg-surface-2 hover:text-ink'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                      <span>Vault Notes</span>
                    </div>
                    <span className="text-[10px] font-mono text-ink/40">
                      {documents.filter((d) => d.linkedType === 'note' || d.links?.some((l) => l.entityType === 'note')).length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectEntityFilter('people');
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                      selectedEntityFilter === 'people'
                        ? 'bg-purple-500/10 text-purple-700 dark:text-purple-400 font-bold'
                        : 'text-ink/70 hover:bg-surface-2 hover:text-ink'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-purple-500" />
                      <span>Khatabook</span>
                    </div>
                    <span className="text-[10px] font-mono text-ink/40">
                      {documents.filter((d) => d.linkedType === 'people' || d.links?.some((l) => l.entityType === 'people')).length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectEntityFilter('goal');
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                      selectedEntityFilter === 'goal'
                        ? 'bg-teal-500/10 text-teal-700 dark:text-teal-400 font-bold'
                        : 'text-ink/70 hover:bg-surface-2 hover:text-ink'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Target className="w-3.5 h-3.5 text-teal-500" />
                      <span>Savings Goals</span>
                    </div>
                    <span className="text-[10px] font-mono text-ink/40">
                      {documents.filter((d) => d.linkedType === 'goal' || d.links?.some((l) => l.entityType === 'goal')).length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectEntityFilter('unlinked');
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                      selectedEntityFilter === 'unlinked'
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold'
                        : 'text-ink/70 hover:bg-surface-2 hover:text-ink'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Unlink className="w-3.5 h-3.5 text-amber-500" />
                      <span>Unlinked Files</span>
                    </div>
                    <span className="text-[10px] font-mono text-ink/40">
                      {documents.filter((d) => (!d.linkedType || d.linkedType === 'none') && (!d.links || d.links.length === 0)).length}
                    </span>
                  </button>
                </div>
              </div>

              {/* Bottom Database Usage Meter & Quick Tools */}
              <div className="pt-2 border-t border-line/60 shrink-0">
                <DriveDatabaseUsageMeter
                  compact={false}
                  onOpenTools={(tab) => {
                    setToolsModalInitialTab(tab || 'cleaner');
                    setIsToolsModalOpen(true);
                    setIsMobileSidebarOpen(false);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────
            MAIN FILE CANVAS (1:1 Square Grid or High-Density List)
        ─────────────────────────────────────────────────────────── */}
        <div
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          className={`flex-1 flex flex-col min-w-0 bg-surface-2/20 overflow-y-auto custom-scrollbar p-4 relative ${
            clipboard && (clipboard.docIds.length > 0 || clipboard.folderIds.length > 0) ? 'pb-24' : ''
          }`}
          onContextMenu={(e) => {
            const target = e.target as HTMLElement;
            if (target === e.currentTarget || target.classList.contains('canvas-empty-area') || !target.closest('[data-drive-item]')) {
              e.preventDefault();
              setContextMenu({ x: e.clientX, y: e.clientY });
            }
          }}
        >
          {/* Mobile quick horizontal filter strip */}
          <div className="md:hidden flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-2 mb-3 shrink-0 text-xs">
            <button
              type="button"
              onClick={() => {
                setNavSection('files');
                onSelectFolder('all');
                onSelectEntityFilter('all');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap shrink-0 border transition-all cursor-pointer ${
                navSection === 'files' && activeFolderId === 'all' && selectedEntityFilter === 'all'
                  ? 'bg-brand-500 text-white border-brand-500 shadow-2xs'
                  : 'bg-surface border-line text-ink/70 hover:bg-surface-2'
              }`}
            >
              All ({documents.length})
            </button>
            <button
              type="button"
              onClick={() => onSelectEntityFilter('transaction')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap shrink-0 border transition-all cursor-pointer ${
                selectedEntityFilter === 'transaction'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-surface border-line text-emerald-700 dark:text-emerald-400 hover:bg-surface-2'
              }`}
            >
              Receipts
            </button>
            <button
              type="button"
              onClick={() => onSelectEntityFilter('asset')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap shrink-0 border transition-all cursor-pointer ${
                selectedEntityFilter === 'asset'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-surface border-line text-blue-700 dark:text-blue-400 hover:bg-surface-2'
              }`}
            >
              Deeds
            </button>
            <button
              type="button"
              onClick={() => onSelectEntityFilter('liability')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap shrink-0 border transition-all cursor-pointer ${
                selectedEntityFilter === 'liability'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                  : 'bg-surface border-line text-rose-700 dark:text-rose-400 hover:bg-surface-2'
              }`}
            >
              Loans
            </button>
            <button
              type="button"
              onClick={() => onSelectEntityFilter('account')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap shrink-0 border transition-all cursor-pointer ${
                selectedEntityFilter === 'account'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                  : 'bg-surface border-line text-indigo-700 dark:text-indigo-400 hover:bg-surface-2'
              }`}
            >
              Bank KYC
            </button>
            <button
              type="button"
              onClick={() => onSelectEntityFilter('unlinked')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap shrink-0 border transition-all cursor-pointer ${
                selectedEntityFilter === 'unlinked'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                  : 'bg-surface border-line text-amber-700 dark:text-amber-400 hover:bg-surface-2'
              }`}
            >
              Unlinked
            </button>
          </div>
          {/* Main Screen Folders Section (Only in Grid View, List View renders folders directly in table rows) */}
          {viewMode === 'grid' && (displayedSubfolders.length > 0 || activeFolderId === 'all') && searchQuery === '' && (
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

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {displayedSubfolders.map((folder) => {
                  const count = documents.filter((d) => d.folderId === folder.id).length;
                  const isSelected = selectedFolderIds.has(folder.id);
                  const isDropTarget = dropTargetFolderId === folder.id;
                  const isCut = clipboard?.action === 'cut' && clipboard.folderIds.includes(folder.id);
                  return (
                    <div
                      key={folder.id}
                      data-drive-item="true"
                      data-drive-type="folder"
                      data-drive-id={folder.id}
                      onClick={(e) => handleSelectFolder(folder.id, e)}
                      onDoubleClick={() => handleOpenFolder(folder.id)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDropTargetFolderId(folder.id);
                      }}
                      onDragLeave={(e) => {
                        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                        setDropTargetFolderId(null);
                      }}
                      onDrop={(e) => handleDropOnFolder(folder.id, e)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelectFolder(folder.id);
                        setContextMenu({ x: e.clientX, y: e.clientY, folder });
                      }}
                      className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between min-h-[68px] ${
                        isDropTarget
                          ? 'border-brand-500 bg-brand-500/20 ring-2 ring-brand-500 scale-[1.02] shadow-md'
                          : isSelected
                          ? 'border-brand-500 bg-brand-500/10 ring-2 ring-brand-500/40 shadow-xs'
                          : 'border-line bg-card hover:border-brand-500/50 hover:shadow-xs'
                      } ${isCut ? 'opacity-50 border-dashed border-brand-500/60' : ''}`}
                      title={`Double-click or press Enter to open: ${folder.name}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <FolderIconBadge folder={folder} size="md" />
                        <div className="min-w-0 flex-1">
                          <span
                            className="text-xs font-bold text-ink group-hover:text-brand-600 line-clamp-2 break-words leading-snug"
                            title={folder.name}
                          >
                            {folder.name}
                          </span>
                          <span className="text-[10px] font-mono text-ink/40 block mt-0.5">
                            {count} {count === 1 ? 'file' : 'files'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectFolder(folder.id, { ctrlKey: true } as any);
                          }}
                          className={`p-1 rounded-lg transition-all cursor-pointer ${
                            isSelected
                              ? 'opacity-100 text-brand-600'
                              : 'opacity-0 group-hover:opacity-100 text-ink/40 hover:text-ink'
                          }`}
                          title="Select folder (Ctrl+Click)"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-brand-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setContextMenu({ x: e.clientX, y: e.clientY, folder });
                          }}
                          className="p-1 rounded-lg text-ink/40 hover:text-ink hover:bg-surface-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity ml-1 shrink-0 cursor-pointer"
                          title="Folder options"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* + New Folder dashed card */}
                <button
                  type="button"
                  onClick={onNewFolderClick}
                  className="p-3.5 rounded-2xl border border-dashed border-line hover:border-brand-500/60 bg-card/50 hover:bg-brand-500/5 transition-all cursor-pointer flex items-center gap-3 text-ink/60 hover:text-brand-600 group text-left min-h-[68px]"
                  title="Create a new folder"
                >
                  <div className="w-10 h-10 rounded-xl bg-surface-2 group-hover:bg-brand-500/10 grid place-items-center text-ink/50 group-hover:text-brand-600 transition-colors shrink-0">
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
            {(displayedDocs.length > 0 || displayedSubfolders.length > 0) && (
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-ink/50 hover:text-brand-600 font-semibold flex items-center gap-1 cursor-pointer"
              >
                {selectedDocIds.size === displayedDocs.length &&
                (displayedSubfolders.length === 0 || selectedFolderIds.size === displayedSubfolders.length)
                  ? 'Deselect All'
                  : 'Select All (Ctrl+A)'}
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
                const isCut = clipboard?.action === 'cut' && clipboard.docIds.includes(doc.id);

                return (
                  <div
                    key={doc.id}
                    data-drive-item="true"
                    data-drive-type="doc"
                    data-drive-id={doc.id}
                    draggable={!renamingDocId}
                    onDragStart={(e) => handleDocDragStart(doc.id, e)}
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
                    } ${isCut ? 'opacity-50 border-dashed border-brand-500/60' : ''}`}
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
                        className={`p-1 rounded-lg bg-surface/90 backdrop-blur-xs shadow-2xs transition-all pointer-events-auto cursor-pointer ${
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
                          className={`p-1 rounded-lg bg-surface/90 backdrop-blur-xs transition-opacity cursor-pointer ${
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
                          className="w-6 h-6 rounded-full bg-surface shadow-md border border-line/60 flex items-center justify-center text-ink/70 hover:text-ink hover:bg-surface-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all hover:scale-105 active:scale-95 cursor-pointer"
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
                        <span title={doc.createdAt ? formatReadableDateTime(doc.createdAt) : ''}>
                          {formatReadableDate(doc.createdAt) || 'Recent'}
                        </span>
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
                        className="text-ink/40 hover:text-ink cursor-pointer"
                        title="Select All (Ctrl+A)"
                      >
                        {displayedDocs.length > 0 &&
                        selectedDocIds.size === displayedDocs.length &&
                        (displayedSubfolders.length === 0 || selectedFolderIds.size === displayedSubfolders.length) ? (
                          <CheckSquare className="w-3.5 h-3.5 text-brand-600" />
                        ) : (
                          <Square className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </th>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3 hidden sm:table-cell">Uploaded Date</th>
                    <th className="py-2.5 px-3 hidden md:table-cell">Size</th>
                    <th className="py-2.5 px-3 hidden lg:table-cell">Linked Financial Record</th>
                    <th className="py-2.5 pr-4 pl-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60 text-xs">
                  {/* Folders rendered as rows in List View for full, uncapped title display */}
                  {displayedSubfolders.length > 0 && searchQuery === '' && (
                    displayedSubfolders.map((folder) => {
                      const isSelected = selectedFolderIds.has(folder.id);
                      const isDropTarget = dropTargetFolderId === folder.id;
                      const count = documents.filter((d) => d.folderId === folder.id).length;
                      const isCut = clipboard?.action === 'cut' && clipboard.folderIds.includes(folder.id);
                      return (
                        <tr
                          key={`folder-${folder.id}`}
                          data-drive-item="true"
                          data-drive-type="folder"
                          data-drive-id={folder.id}
                          onClick={(e) => handleSelectFolder(folder.id, e)}
                          onDoubleClick={() => handleOpenFolder(folder.id)}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDropTargetFolderId(folder.id);
                          }}
                          onDragLeave={(e) => {
                            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                            setDropTargetFolderId(null);
                          }}
                          onDrop={(e) => handleDropOnFolder(folder.id, e)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            handleSelectFolder(folder.id);
                            setContextMenu({ x: e.clientX, y: e.clientY, folder });
                          }}
                          className={`group transition-colors cursor-pointer ${
                            isDropTarget
                              ? 'bg-brand-500/20 ring-1 ring-brand-500'
                              : isSelected
                              ? 'bg-brand-500/10'
                              : 'hover:bg-surface-2/60'
                          } ${isCut ? 'opacity-50' : ''}`}
                          title={`Double-click or press Enter to open: ${folder.name}`}
                        >
                          {/* Checkbox column */}
                          <td className="py-2.5 pl-4 pr-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleSelectFolder(folder.id, { ctrlKey: true } as any)}
                              className={`p-1 rounded cursor-pointer ${
                                isSelected ? 'text-brand-600' : 'text-ink/40 hover:text-ink'
                              }`}
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-brand-600" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>

                          {/* Folder Name Column */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <FolderIconBadge folder={folder} size="sm" />
                              <span className="font-semibold text-ink group-hover:text-brand-600 break-words line-clamp-1">
                                {folder.name}
                              </span>
                            </div>
                          </td>

                          {/* Modified Date */}
                          <td className="py-2.5 px-3 text-ink/50 text-[11px] font-mono hidden sm:table-cell whitespace-nowrap">
                            {folder.updatedAt ? formatReadableDate(folder.updatedAt) : 'Folder'}
                          </td>

                          {/* Size / File count */}
                          <td className="py-2.5 px-3 text-ink/50 text-[11px] font-mono hidden md:table-cell whitespace-nowrap">
                            {count} {count === 1 ? 'file' : 'files'}
                          </td>

                          {/* Type */}
                          <td className="py-2.5 px-3 hidden lg:table-cell">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface-2 text-ink/60 border border-line">
                              <Folder className="w-3 h-3 text-amber-500" />
                              <span>Folder</span>
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 pr-4 pl-2 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setContextMenu({ x: e.clientX, y: e.clientY, folder });
                              }}
                              className="p-1 rounded-lg text-ink/40 hover:text-ink hover:bg-surface-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer"
                              title="Folder options"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}

                  {displayedDocs.map((doc) => {
                    const isSelected = selectedDocIds.has(doc.id);
                    const isStarred = starredIds.has(doc.id);
                    const isRenaming = renamingDocId === doc.id;
                    const linkInfo = getLinkedEntityInfo(doc);
                    const isCut = clipboard?.action === 'cut' && clipboard.docIds.includes(doc.id);

                    return (
                      <tr
                        key={doc.id}
                        data-drive-item="true"
                        data-drive-type="doc"
                        data-drive-id={doc.id}
                        draggable={!renamingDocId}
                        onDragStart={(e) => handleDocDragStart(doc.id, e)}
                        onClick={(e) => handleSelectDoc(doc.id, e)}
                        onDoubleClick={() => onOpenDoc(doc.id)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          handleSelectDoc(doc.id);
                          setContextMenu({ x: e.clientX, y: e.clientY, doc });
                        }}
                        className={`group transition-colors cursor-pointer ${
                          isSelected ? 'bg-brand-500/10' : 'hover:bg-surface-2/60'
                        } ${isCut ? 'opacity-50' : ''}`}
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

                        {/* Uploaded Date */}
                        <td className="py-2.5 px-3 text-ink/50 text-[11px] font-mono hidden sm:table-cell whitespace-nowrap">
                          <span title={doc.createdAt ? formatReadableDateTime(doc.createdAt) : ''}>
                            {formatReadableDate(doc.createdAt) || 'Recent'}
                          </span>
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

          {/* Rubber-band Marquee Selection Box */}
          {marquee && isMarqueeDragging && (
            <div
              className="fixed pointer-events-none z-50 border-2 border-brand-500 bg-brand-500/15 rounded-xs"
              style={{
                left: Math.min(marquee.startX, marquee.currentX),
                top: Math.min(marquee.startY, marquee.currentY),
                width: Math.abs(marquee.currentX - marquee.startX),
                height: Math.abs(marquee.currentY - marquee.startY),
              }}
            />
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

                  <div className="p-2.5 rounded-xl bg-surface-2/40 border border-line/60 space-y-1.5">
                    <div>
                      <span className="text-[10px] font-bold text-ink/40 uppercase block">Uploaded Date & Time</span>
                      <p className="font-semibold text-ink text-xs font-mono mt-0.5">
                        {formatReadableDateTime(primarySelectedDoc.createdAt) || formatReadableDate(primarySelectedDoc.createdAt) || 'Recently uploaded'}
                      </p>
                    </div>

                    {primarySelectedDoc.updatedAt && primarySelectedDoc.updatedAt !== primarySelectedDoc.createdAt && (
                      <div className="pt-1.5 border-t border-line/40">
                        <span className="text-[10px] font-bold text-ink/40 uppercase block">Last Modified</span>
                        <p className="text-ink/70 text-[11px] font-mono mt-0.5">
                          {formatReadableDateTime(primarySelectedDoc.updatedAt)}
                        </p>
                      </div>
                    )}
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
                                onClick={() => {
                                  if (primarySelectedDoc.linkedType === 'transaction') navigate('/transactions');
                                  else if (primarySelectedDoc.linkedType === 'asset') navigate('/assets');
                                  else if (primarySelectedDoc.linkedType === 'liability') navigate('/liabilities');
                                  else if (primarySelectedDoc.linkedType === 'account') navigate('/accounts');
                                  else if (primarySelectedDoc.linkedType === 'people') navigate('/people');
                                  else if (primarySelectedDoc.linkedType === 'goal') navigate('/budgets');
                                  else onOpenDoc(primarySelectedDoc.id);
                                }}
                                className="font-bold underline hover:opacity-80 flex items-center gap-1 cursor-pointer"
                              >
                                <span>View Entry</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div className="p-2.5 rounded-xl bg-surface-2/40 border border-line text-ink/50 text-[11px] flex items-center justify-between">
                          <span>Not attached to any financial record</span>
                          <button
                            type="button"
                            onClick={() => onOpenDoc(primarySelectedDoc.id)}
                            className="px-2.5 py-1 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Attach</span>
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
                    className="w-full py-2 px-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> Open Full Viewer
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadDoc(primarySelectedDoc)}
                      className="py-2 px-3 rounded-xl border border-line bg-surface hover:bg-surface-2 text-ink text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteDoc(primarySelectedDoc)}
                      className="py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ) : selectedFolderObj ? (
              /* Folder Inspector */
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink/50">
                    Folder Inspector
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsInspectorOpen(false)}
                    className="p-1 rounded-lg hover:bg-surface-2 text-ink/40 hover:text-ink cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Big Folder Icon */}
                <div className="w-full aspect-video rounded-2xl bg-surface-2/40 border border-line overflow-hidden grid place-items-center relative shadow-2xs">
                  <FolderIconBadge folder={selectedFolderObj} size="lg" />
                </div>

                {/* Metadata */}
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-ink/40 uppercase">Folder Name</span>
                    <p className="font-bold text-ink break-words mt-0.5">
                      {selectedFolderObj.name}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-line/60">
                    <div>
                      <span className="text-[10px] font-bold text-ink/40 uppercase">Items</span>
                      <p className="font-mono font-bold text-ink mt-0.5">
                        {documents.filter((d) => d.folderId === selectedFolderObj.id).length} files
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-ink/40 uppercase">Total Size</span>
                      <p className="font-mono font-bold text-ink mt-0.5">
                        {formatFileSize(
                          documents
                            .filter((d) => d.folderId === selectedFolderObj.id)
                            .reduce((sum, d) => sum + (d.fileSize || 0), 0)
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="pt-1 border-t border-line/60">
                    <span className="text-[10px] font-bold text-ink/40 uppercase">Category</span>
                    <p className="text-ink/70 mt-0.5">
                      {selectedFolderObj.isSystem ? 'System Category Folder' : 'Custom Vault Folder'}
                    </p>
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={() => handleOpenFolder(selectedFolderObj.id)}
                    className="w-full py-2 px-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5" /> Open Folder
                  </button>

                  <button
                    type="button"
                    onClick={() => setFolderToEdit(selectedFolderObj)}
                    className="w-full py-2 px-3 rounded-xl border border-line bg-surface hover:bg-surface-2 text-ink text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-amber-500" /> Customize Color & Icon
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-xs text-ink/40 space-y-2">
                <Info className="w-6 h-6 mx-auto text-ink/30" />
                <p>Click on any file or folder to inspect its properties, encryption, and financial linkages</p>
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
            top: Math.max(12, Math.min(contextMenu.y, window.innerHeight - 340)),
            left: Math.max(12, Math.min(contextMenu.x, window.innerWidth - 240)),
          }}
          className="fixed z-50 w-56 py-1.5 bg-card border border-line rounded-2xl shadow-2xl text-xs text-ink space-y-0.5 anim-scale"
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
                className="w-full text-left px-3.5 py-2 hover:bg-surface-2 flex items-center justify-between font-semibold cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Eye className="w-3.5 h-3.5 text-brand-500" />
                  <span>Open Preview & Details</span>
                </div>
                <kbd className="text-[10px] text-ink/40">Enter</kbd>
              </button>

              <button
                type="button"
                onClick={() => {
                  onOpenDoc(contextMenu.doc!.id);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-surface-2 flex items-center gap-2.5 font-semibold cursor-pointer"
              >
                <Link2 className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                <span>Attach to Financial Entry...</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopySelected([contextMenu.doc!.id])}
                className="w-full text-left px-3.5 py-2 hover:bg-surface-2 flex items-center justify-between font-semibold cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Copy className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Copy</span>
                </div>
                <kbd className="text-[10px] text-ink/40">Ctrl+C</kbd>
              </button>

              <button
                type="button"
                onClick={() => handleCutSelected([contextMenu.doc!.id])}
                className="w-full text-left px-3.5 py-2 hover:bg-surface-2 flex items-center justify-between font-semibold cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Scissors className="w-3.5 h-3.5 text-blue-500" />
                  <span>Cut / Move</span>
                </div>
                <kbd className="text-[10px] text-ink/40">Ctrl+X</kbd>
              </button>

              <button
                type="button"
                onClick={() => handleStartRename(contextMenu.doc!)}
                className="w-full text-left px-3.5 py-2 hover:bg-surface-2 flex items-center justify-between font-semibold cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                  <span>Rename</span>
                </div>
                <kbd className="text-[10px] text-ink/40">F2</kbd>
              </button>

              <button
                type="button"
                onClick={() => {
                  toggleStar(contextMenu.doc!.id);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-surface-2 flex items-center justify-between font-semibold cursor-pointer"
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
                className="w-full text-left px-3.5 py-2 hover:bg-surface-2 flex items-center justify-between font-semibold cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Info className="w-3.5 h-3.5 text-indigo-500" />
                  <span>View Details</span>
                </div>
                <kbd className="text-[10px] text-ink/40">I</kbd>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleDownloadDoc(contextMenu.doc!);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-surface-2 flex items-center gap-2.5 font-semibold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-blue-500" />
                <span>Download Unencrypted</span>
              </button>

              <hr className="border-line my-1" />

              <button
                type="button"
                onClick={() => {
                  onDeleteDoc(contextMenu.doc!);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 flex items-center justify-between font-semibold cursor-pointer"
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
                  setNavSection('files');
                  onSelectFolder(contextMenu.folder!.id);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-surface-2 flex items-center gap-2.5 font-semibold cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                <span>Open Folder</span>
              </button>

              {clipboard && (clipboard.docIds.length > 0 || clipboard.folderIds.length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    handlePaste(contextMenu.folder!.id);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-surface-2 text-brand-600 flex items-center gap-2.5 font-bold cursor-pointer"
                >
                  <Clipboard className="w-3.5 h-3.5 text-brand-500" />
                  <span>Paste {clipboard.docIds.length + clipboard.folderIds.length} items here</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleCopySelected([], [contextMenu.folder!.id])}
                className="w-full text-left px-3.5 py-2 hover:bg-surface-2 flex items-center justify-between font-semibold cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Copy className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Copy Folder</span>
                </div>
                <kbd className="text-[10px] text-ink/40">Ctrl+C</kbd>
              </button>

              <button
                type="button"
                onClick={() => handleCutSelected([], [contextMenu.folder!.id])}
                className="w-full text-left px-3.5 py-2 hover:bg-surface-2 flex items-center justify-between font-semibold cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Scissors className="w-3.5 h-3.5 text-blue-500" />
                  <span>Cut Folder</span>
                </div>
                <kbd className="text-[10px] text-ink/40">Ctrl+X</kbd>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFolderToEdit(contextMenu.folder!);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-surface-2 flex items-center gap-2.5 font-semibold cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                <span>Rename & Customize Folder</span>
              </button>

              {onDeleteFolder && !contextMenu.folder!.isSystem && (
                <>
                  <hr className="border-line my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteFolder(contextMenu.folder!.id);
                      setContextMenu(null);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 flex items-center gap-2.5 font-semibold cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Folder</span>
                  </button>
                </>
              )}
            </>
          ) : (
            /* Background Canvas Right-Click */
            <>
              {clipboard && (clipboard.docIds.length > 0 || clipboard.folderIds.length > 0) && (
                <button
                  type="button"
                  onClick={() => handlePaste()}
                  className="w-full text-left px-3.5 py-2 hover:bg-surface-2 text-brand-600 flex items-center gap-2.5 font-bold cursor-pointer"
                >
                  <Clipboard className="w-3.5 h-3.5 text-brand-500" />
                  <span>Paste {clipboard.docIds.length + clipboard.folderIds.length} items here</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onNewFolderClick();
                  setContextMenu(null);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-surface-2 flex items-center gap-2.5 font-semibold cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5 text-amber-500" />
                <span>New Folder</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onUploadClick();
                  setContextMenu(null);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-surface-2 flex items-center gap-2.5 font-semibold cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-brand-500" />
                <span>Upload Document</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4.5 FLOATING EXPLORER CLIPBOARD BAR (Copy / Cut & Paste Bar)
      ───────────────────────────────────────────────────────────── */}
      {clipboard && (clipboard.docIds.length > 0 || clipboard.folderIds.length > 0) && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md anim-slide-up">
          <div className="bg-surface/95 dark:bg-card/95 backdrop-blur-md border border-brand-500/40 rounded-2xl p-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-3 shadow-2xl ring-1 ring-brand-500/20">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-brand-500/15 text-brand-600 dark:text-brand-400 grid place-items-center shrink-0">
                <Clipboard className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-ink truncate flex items-center gap-1.5">
                  <span>
                    {clipboard.action === 'cut' ? 'Ready to move' : 'Copied to clipboard'}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md bg-brand-500/10 text-brand-700 dark:text-brand-300 text-[10px] font-mono font-semibold">
                    {clipboard.docIds.length + clipboard.folderIds.length}{' '}
                    {clipboard.docIds.length + clipboard.folderIds.length === 1 ? 'item' : 'items'}
                  </span>
                </div>
                <div className="text-[10px] text-ink/50 truncate">
                  {selectedFolderIds.size === 1 && selectedFolderObj
                    ? `Ready to paste into "${selectedFolderObj.name}"`
                    : activeFolder
                    ? `Ready to paste into "${activeFolder.name}"`
                    : 'Ready to paste into Files root'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handlePaste(selectedFolderIds.size === 1 ? selectedFolderId! : undefined)}
                className="px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 active:scale-[0.98] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>
                  Paste {selectedFolderIds.size === 1 ? 'into folder' : 'here'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setClipboard(null)}
                className="p-1.5 rounded-xl hover:bg-surface-2 text-ink/40 hover:text-ink transition-colors cursor-pointer"
                title="Clear clipboard"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Customize Folder Modal */}
      {folderToEdit && (
        <DocumentFolderModal
          isOpen={Boolean(folderToEdit)}
          onClose={() => setFolderToEdit(null)}
          folderToEdit={folderToEdit}
        />
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
