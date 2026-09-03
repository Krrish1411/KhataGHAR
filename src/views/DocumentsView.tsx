import React, { useState, useMemo } from 'react';
import { useVault } from '../context/VaultContext';
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
} from 'lucide-react';

export const DocumentsView: React.FC = () => {
  const { documents, assets, liabilities, accounts, deleteDocument } = useVault();

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Total vault storage used
  const totalStorageBytes = useMemo(() => {
    return documents.reduce((sum, d) => sum + d.fileSize, 0);
  }, [documents]);

  const assetLookup = useMemo(() => new Map<string, Asset>(assets.map((a) => [a.id, a])), [assets]);
  const liabilityLookup = useMemo(() => new Map<string, Liability>(liabilities.map((l) => [l.id, l])), [liabilities]);
  const accountLookup = useMemo(() => new Map<string, Account>(accounts.map((a) => [a.id, a])), [accounts]);

  // Documents with upcoming expiry
  const expiringDocs = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return documents.filter((d) => d.expiryDate && d.expiryDate >= today);
  }, [documents]);

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Delete document "${name}"?`)) {
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
    <div className="space-y-6 max-w-7xl mx-auto px-1 sm:px-2 pb-16 anim-fade">
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
            Store policy PDFs, receipts, property deeds, and warranties (encrypted with AES-256-GCM locally)
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
            <span className="font-semibold">Local Storage Usage</span>
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

      {/* Upcoming Renewal / Expiry Strip */}
      {expiringDocs.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display font-bold text-xs uppercase tracking-wider text-ink/75 px-1 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-mari-600" />
            <span>Upcoming Expiry & Renewal Deadlines</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {expiringDocs.map((doc) => (
              <div key={doc.id} className="rounded-2xl border border-line bg-card p-4 space-y-2 shadow-sm lift">
                <div className="flex justify-between items-start">
                  <div className="min-w-0">
                    <h4 className="font-display font-bold text-xs text-ink truncate">
                      {doc.name}
                    </h4>
                    <span className="text-[11px] text-ink/45 block truncate">{getLinkedLabel(doc)}</span>
                  </div>
                  <Badge tone="mari" size="xs">
                    Expiring
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-mari-600 font-semibold pt-1">
                  <Calendar className="w-3 h-3" />
                  <span>Renewal Date: {formatReadableDate(doc.expiryDate!)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document Grid */}
      <div className="space-y-3">
        <h2 className="font-display font-bold text-xs uppercase tracking-wider text-ink/75 px-1">
          All Encrypted Records ({documents.length})
        </h2>

        {documents.length === 0 ? (
          <Card className="text-center py-12 text-xs space-y-3 lift">
            <div className="w-12 h-12 rounded-2xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 grid place-items-center mx-auto text-pine-600">
              <FolderLock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-ink">No documents stored yet</h3>
              <p className="text-xs text-ink/50 mt-1 max-w-sm mx-auto">
                Upload scans, PDFs, and warranty cards encrypted with your master key.
              </p>
            </div>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-pine-700 text-white text-xs font-bold shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload First File</span>
            </button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {documents.map((doc) => (
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
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="pt-2.5 border-t border-line flex items-center justify-between text-xs">
                  <span className="text-[11px] text-ink/50 truncate max-w-[150px]">
                    {getLinkedLabel(doc)}
                  </span>

                  <button
                    onClick={() => handleDownload(doc)}
                    className="px-2.5 py-1 rounded-lg bg-moss hover:bg-pine-50 text-pine-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
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
