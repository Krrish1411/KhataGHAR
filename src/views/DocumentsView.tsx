import React, { useState, useMemo } from 'react';
import { useVault } from '../context/VaultContext';
import { useConfirm } from '../context/DialogContext';
import { DocumentUploadModal } from '../components/documents/DocumentUploadModal';
import { DocumentDetailModal } from '../components/documents/DocumentDetailModal';
import { DocumentFolderModal } from '../components/documents/DocumentFolderModal';
import { GoogleDriveView } from '../components/documents/GoogleDriveView';
import { AndroidFileManagerView } from '../components/documents/AndroidFileManagerView';
import { isNativeMobile } from '../utils/native';
import type { DocumentRecord, LinkedEntityType } from '../types';
import {
  FolderLock,
  FolderPlus,
  Upload,
  HardDrive,
  Smartphone,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { DriveToolsModal } from '../components/documents/DriveToolsModal';

export const DocumentsView: React.FC = () => {
  const {
    documents,
    documentFolders,
    deleteDocument,
    deleteDocumentFolder,
  } = useVault();

  const confirm = useConfirm();

  // Layout switcher state: 'drive' (Web Drive) | 'files' (Mobile Files)
  const [uiLayout, setUiLayout] = useState<'drive' | 'files'>(() => {
    try {
      const saved = localStorage.getItem('khata_document_ui_layout');
      if (saved === 'drive' || saved === 'files') return saved;
      if (isNativeMobile || (typeof window !== 'undefined' && window.innerWidth < 768)) {
        return 'files';
      }
      return 'drive';
    } catch {
      return isNativeMobile ? 'files' : 'drive';
    }
  });

  const handleSetUiLayout = (layout: 'drive' | 'files') => {
    setUiLayout(layout);
    try {
      localStorage.setItem('khata_document_ui_layout', layout);
    } catch {}
  };

  const [activeFolderId, setActiveFolderId] = useState<string>('all');
  const [selectedEntityFilter, setSelectedEntityFilter] = useState<LinkedEntityType | 'all'>('all');
  const [fileTypeFilter, setFileTypeFilter] = useState<'all' | 'image' | 'pdf' | 'other'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'size'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isToolsModalOpen, setIsToolsModalOpen] = useState(false);
  const [toolsModalInitialTab, setToolsModalInitialTab] = useState<'scanner' | 'cleaner' | 'storage' | 'preferences'>('scanner');

  const handleBatchDeleteDocuments = async (docIds: string[]) => {
    for (const id of docIds) {
      await deleteDocument(id);
    }
  };

  // Total vault storage used
  const totalStorageBytes = useMemo(() => {
    return documents.reduce((sum, d) => sum + (d.fileSize || 0), 0);
  }, [documents]);

  const handleDeleteDoc = async (doc: DocumentRecord) => {
    const ok = await confirm({
      title: 'Delete Document',
      description: `Permanently remove "${doc.name}" from encrypted storage? This will unlink it from any transactions, loans, or assets.`,
      confirmText: 'Delete File',
      variant: 'danger',
    });
    if (ok) {
      await deleteDocument(doc.id);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    const folder = documentFolders.find((f) => f.id === folderId);
    const ok = await confirm({
      title: 'Delete Folder',
      description: `Delete folder "${folder?.name || 'Folder'}"? Any files inside will become unfiled, but not deleted.`,
      confirmText: 'Delete Folder',
      variant: 'danger',
    });
    if (ok) {
      await deleteDocumentFolder(folderId);
      if (activeFolderId === folderId) {
        setActiveFolderId('all');
      }
    }
  };

  return (
    <div className="space-y-4 w-full max-w-[1750px] mx-auto px-1 sm:px-3 pb-16 anim-fade select-none">
      {/* ─────────────────────────────────────────────────────────────
          TOP APP BAR (Title + Layout Mode Switcher + Action Buttons)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950/50 border border-brand-200/60 dark:border-brand-800/60 grid place-items-center text-brand-600">
              <FolderLock className="w-4 h-4" />
            </span>
            <h1 className="font-display font-extrabold text-[20px] sm:text-[24px] tracking-tight text-ink">
              Document & Attachment Hub
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-pine-50 dark:bg-pine-950/60 border border-pine-200 dark:border-pine-800 text-[10px] font-bold text-pine-700 dark:text-pine-300">
              <ShieldCheck className="w-3 h-3" /> AES-256
            </span>
          </div>
          <p className="text-xs text-ink/50 mt-0.5">
            Sovereign file manager for receipts, property deeds, loan agreements, bank KYC, and policies
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* UI Layout Switcher (Google Drive vs Android Files) */}
          <div className="flex items-center p-1 bg-surface-2 border border-line rounded-2xl shadow-xs">
            <button
              type="button"
              onClick={() => handleSetUiLayout('drive')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                uiLayout === 'drive'
                  ? 'bg-surface text-brand-600 shadow-xs font-bold'
                  : 'text-ink/60 hover:text-ink'
              }`}
              title="Switch to Google Drive workspace view (Web / Desktop)"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Drive View</span>
            </button>

            <button
              type="button"
              onClick={() => handleSetUiLayout('files')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                uiLayout === 'files'
                  ? 'bg-surface text-brand-600 shadow-xs font-bold'
                  : 'text-ink/60 hover:text-ink'
              }`}
              title="Switch to Android File Manager view (Mobile / Touch)"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Files View</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setToolsModalInitialTab('scanner');
              setIsToolsModalOpen(true);
            }}
            className="px-3 py-2 rounded-2xl border border-line bg-surface hover:bg-moss text-ink text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
            title="Drive Tools: Integrity Scanner & Storage Cleaner"
          >
            <Wrench className="w-3.5 h-3.5 text-brand-600" />
            <span className="hidden sm:inline">Vault Tools</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFolderModalOpen(true)}
            className="px-3 py-2 rounded-2xl border border-line bg-surface hover:bg-moss text-ink text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
            title="Create a new folder"
          >
            <FolderPlus className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">New Folder</span>
          </button>

          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="px-3.5 py-2 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-[0.98]"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MAIN VIEW: GOOGLE DRIVE vs ANDROID FILE MANAGER
      ───────────────────────────────────────────────────────────── */}
      {uiLayout === 'drive' ? (
        <GoogleDriveView
          documents={documents}
          folders={documentFolders}
          activeFolderId={activeFolderId}
          onSelectFolder={setActiveFolderId}
          selectedEntityFilter={selectedEntityFilter}
          onSelectEntityFilter={setSelectedEntityFilter}
          fileTypeFilter={fileTypeFilter}
          onSelectFileTypeFilter={setFileTypeFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
          viewMode={viewMode}
          onToggleViewMode={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          onOpenDoc={(id) => setSelectedDocId(id)}
          onUploadClick={() => setIsUploadModalOpen(true)}
          onNewFolderClick={() => setIsFolderModalOpen(true)}
          onDeleteDoc={handleDeleteDoc}
          onDeleteFolder={handleDeleteFolder}
          totalStorageBytes={totalStorageBytes}
        />
      ) : (
        <AndroidFileManagerView
          documents={documents}
          folders={documentFolders}
          activeFolderId={activeFolderId}
          onSelectFolder={setActiveFolderId}
          selectedEntityFilter={selectedEntityFilter}
          onSelectEntityFilter={setSelectedEntityFilter}
          fileTypeFilter={fileTypeFilter}
          onSelectFileTypeFilter={setFileTypeFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
          viewMode={viewMode}
          onToggleViewMode={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          onOpenDoc={(id) => setSelectedDocId(id)}
          onUploadClick={() => setIsUploadModalOpen(true)}
          onNewFolderClick={() => setIsFolderModalOpen(true)}
          onDeleteDoc={handleDeleteDoc}
          onDeleteFolder={handleDeleteFolder}
          totalStorageBytes={totalStorageBytes}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODALS & DIALOGS
      ───────────────────────────────────────────────────────────── */}
      {/* Upload Document Modal */}
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

      {/* Sovereign Drive Tools Modal (Integrity Scanner, Cleaner, Storage Analytics) */}
      {isToolsModalOpen && (
        <DriveToolsModal
          isOpen={isToolsModalOpen}
          onClose={() => setIsToolsModalOpen(false)}
          initialTab={toolsModalInitialTab}
          documents={documents}
          onDeleteDocuments={handleBatchDeleteDocuments}
          totalStorageBytes={totalStorageBytes}
        />
      )}
    </div>
  );
};
