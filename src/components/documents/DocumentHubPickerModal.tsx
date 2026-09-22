import React, { useState, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { useVault } from '../../context/VaultContext';
import { formatFileSize } from '../../utils/formatters';
import type { DocumentRecord } from '../../types';
import { Search, FileText, Check, FolderLock, Image as ImageIcon } from 'lucide-react';

interface DocumentHubPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selectedDocs: DocumentRecord[]) => void;
  alreadySelectedIds?: string[];
}

export const DocumentHubPickerModal: React.FC<DocumentHubPickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  alreadySelectedIds = [],
}) => {
  const { documents, documentFolders } = useVault();
  const [search, setSearch] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>({});

  const folderLookup = useMemo(() => {
    return new Map(documentFolders.map((f) => [f.id, f.name]));
  }, [documentFolders]);

  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents.filter((doc) => {
      if (selectedFolder !== 'all' && doc.folderId !== selectedFolder) {
        return false;
      }
      if (!q) return true;
      const nameMatch = doc.name.toLowerCase().includes(q);
      const tagMatch = doc.tags?.some((t) => t.toLowerCase().includes(q));
      const noteMatch = doc.notes?.toLowerCase().includes(q);
      const folderMatch = doc.folderId && folderLookup.get(doc.folderId)?.toLowerCase().includes(q);
      return nameMatch || tagMatch || noteMatch || folderMatch;
    });
  }, [documents, search, selectedFolder, folderLookup]);

  const toggleSelect = (id: string) => {
    setSelectedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleConfirm = () => {
    const chosen = documents.filter((d) => selectedMap[d.id]);
    onSelect(chosen);
    onClose();
  };

  const selectedCount = Object.values(selectedMap).filter(Boolean).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-ink">
          <FolderLock className="w-5 h-5 text-pine-600" />
          <span>Attach from Document Hub</span>
        </div>
      }
      description="Pick existing receipts, deeds, contracts, or bills from your encrypted vault"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Search & Folder Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-ink/40" />
            <input
              type="text"
              placeholder="Search documents by title, tag, or note..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-line bg-card text-xs text-ink placeholder:text-ink/35 outline-none focus:border-pine-500"
            />
          </div>

          <select
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
            className="rounded-xl border border-line bg-card px-3 py-2 text-xs font-semibold text-ink outline-none focus:border-pine-500 cursor-pointer"
          >
            <option value="all">All Folders</option>
            {documentFolders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        {/* Documents Grid */}
        <div className="max-h-[380px] overflow-y-auto custom-scrollbar border border-line/60 rounded-2xl p-2 bg-moss/30 space-y-1.5">
          {filteredDocs.length === 0 ? (
            <div className="text-center py-10 text-xs text-ink/40">
              No documents found matching your filter.
            </div>
          ) : (
            filteredDocs.map((doc) => {
              const isChecked = Boolean(selectedMap[doc.id]);
              const isAlreadyAttached = alreadySelectedIds.includes(doc.id);
              const isImage = doc.fileType.startsWith('image/');

              return (
                <div
                  key={doc.id}
                  onClick={() => !isAlreadyAttached && toggleSelect(doc.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isAlreadyAttached
                      ? 'opacity-50 cursor-not-allowed bg-card border-line'
                      : isChecked
                      ? 'bg-pine-50 dark:bg-pine-950/40 border-pine-500 ring-1 ring-pine-500'
                      : 'bg-card border-line hover:border-pine-300 hover:bg-moss/80'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-moss border border-line shrink-0 grid place-items-center">
                      {doc.thumbnailUrl ? (
                        <img
                          src={doc.thumbnailUrl}
                          alt={doc.name}
                          className="w-full h-full object-cover"
                        />
                      ) : isImage ? (
                        <ImageIcon className="w-4 h-4 text-pine-600" />
                      ) : (
                        <FileText className="w-4 h-4 text-ink/50" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-ink truncate">{doc.name}</p>
                      <div className="flex items-center gap-2 text-[11px] text-ink/45 mt-0.5">
                        <span>{formatFileSize(doc.fileSize)}</span>
                        {doc.folderId && folderLookup.has(doc.folderId) && (
                          <>
                            <span>•</span>
                            <span className="font-semibold text-pine-600 dark:text-pine-400">
                              {folderLookup.get(doc.folderId)}
                            </span>
                          </>
                        )}
                        {doc.isUncompressed && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[9px] uppercase font-bold">
                            RAW
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 ml-2">
                    {isAlreadyAttached ? (
                      <span className="text-[10px] font-bold text-ink/40 uppercase">Attached</span>
                    ) : (
                      <div
                        className={`w-5 h-5 rounded-lg border grid place-items-center transition-all ${
                          isChecked
                            ? 'bg-pine-600 border-pine-600 text-white'
                            : 'border-line bg-card'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs font-medium text-ink/50">
            {selectedCount > 0 ? `${selectedCount} document(s) selected` : 'Select items to link'}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-line bg-card hover:bg-moss text-ink text-xs font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedCount === 0}
              className="px-4 py-1.5 rounded-xl bg-pine-700 hover:bg-pine-600 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-all shadow-sm shadow-pine-900/20 active:scale-95"
            >
              Attach Selected ({selectedCount})
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
