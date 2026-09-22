import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { useVault } from '../../context/VaultContext';
import { useConfirm } from '../../context/DialogContext';
import { formatFileSize } from '../../utils/formatters';
import { formatReadableDate } from '../../utils/dates';
import type { LinkedEntityType, DocumentRecord } from '../../types';
import {
  FileText,
  Download,
  Share2,
  Trash2,
  Calendar,
  FolderLock,
  Link2,
  Plus,
  X,
  ExternalLink,
  CalendarClock,
  Loader2,
  Folder,
} from 'lucide-react';

interface DocumentDetailModalProps {
  documentId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  documentId,
  isOpen,
  onClose,
}) => {
  const {
    documents,
    documentFolders,
    accounts,
    transactions,
    assets,
    liabilities,
    goals,
    peopleLedger,
    loadDocumentDataUrl,
    updateDocument,
    deleteDocument,
    linkDocumentToEntity,
    unlinkDocumentFromEntity,
    addPlannedExpense,
  } = useVault();

  const confirm = useConfirm();

  const [dataUrl, setDataUrl] = useState<string>('');
  const [isLoadingPayload, setIsLoadingPayload] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [targetType, setTargetType] = useState<LinkedEntityType>('transaction');
  const [targetId, setTargetId] = useState('');
  const [schedulingRenewal, setSchedulingRenewal] = useState(false);

  const doc = useMemo(() => {
    return documents.find((d) => d.id === documentId) || null;
  }, [documents, documentId]);

  useEffect(() => {
    if (!doc) {
      setDataUrl('');
      return;
    }

    if (doc.dataUrl) {
      setDataUrl(doc.dataUrl);
    } else {
      setIsLoadingPayload(true);
      loadDocumentDataUrl(doc.id)
        .then((loadedUrl) => {
          setDataUrl(loadedUrl);
        })
        .finally(() => {
          setIsLoadingPayload(false);
        });
    }
  }, [doc, loadDocumentDataUrl]);

  if (!doc) return null;

  const isImage = doc.fileType.startsWith('image/');
  const isPdf = doc.fileType.includes('pdf') || doc.name.toLowerCase().endsWith('.pdf');

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = doc.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShare = async () => {
    if (!dataUrl) return;
    if (navigator.share) {
      try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], doc.name, { type: doc.fileType });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: doc.name,
          });
          return;
        }
      } catch {
        // Fall back to sharing URL or download
      }
    }
    handleDownload();
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete Document',
      description: `Permanently delete "${doc.name}"? This file will be wiped from your encrypted vault.`,
      confirmText: 'Delete Permanently',
      variant: 'danger',
    });
    if (ok) {
      await deleteDocument(doc.id);
      onClose();
    }
  };

  const handleFolderChange = async (folderId: string) => {
    await updateDocument(doc.id, { folderId });
  };

  const handleScheduleRenewal = async () => {
    if (!doc.expiryDate) return;
    setSchedulingRenewal(true);
    try {
      await addPlannedExpense({
        name: `Renewal: ${doc.name}`,
        amount: 0,
        dueDate: doc.expiryDate,
        recurrence: 'yearly',
        status: 'pending',
        notes: `Document renewal scheduled for "${doc.name}"`,
      });
      alert(`Renewal reminder added to Planned Expenses for ${formatReadableDate(doc.expiryDate)}!`);
    } catch {
      alert('Could not schedule renewal. Please try again.');
    } finally {
      setSchedulingRenewal(false);
    }
  };

  const handleAddLink = async () => {
    if (!targetId) return;

    let targetName = '';
    if (targetType === 'transaction') {
      const tx = transactions.find((t) => t.id === targetId);
      targetName = tx ? `${tx.currency} ${tx.amount} (${tx.date})` : 'Transaction';
    } else if (targetType === 'asset') {
      targetName = assets.find((a) => a.id === targetId)?.name || 'Asset';
    } else if (targetType === 'liability') {
      targetName = liabilities.find((l) => l.id === targetId)?.name || 'Loan';
    } else if (targetType === 'goal') {
      targetName = goals.find((g) => g.id === targetId)?.name || 'Goal';
    } else if (targetType === 'people') {
      targetName = peopleLedger.find((p) => p.id === targetId)?.contactName || 'Person';
    } else if (targetType === 'account') {
      targetName = accounts.find((acc) => acc.id === targetId)?.name || 'Account';
    }

    await linkDocumentToEntity(doc.id, targetType, targetId, targetName);
    setTargetId('');
    setIsLinking(false);
  };

  const handleUnlink = async (linkType: LinkedEntityType, linkId: string) => {
    await unlinkDocumentFromEntity(doc.id, linkType, linkId);
  };

  // Compile active links
  const activeLinks = doc.links && doc.links.length > 0
    ? doc.links
    : doc.linkedType && doc.linkedType !== 'none' && doc.linkedId
    ? [{ entityType: doc.linkedType, entityId: doc.linkedId, linkedAt: doc.createdAt }]
    : [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-ink min-w-0">
          <FolderLock className="w-5 h-5 text-pine-600 shrink-0" />
          <span className="truncate">{doc.name}</span>
        </div>
      }
      description={`${formatFileSize(doc.fileSize)} • ${doc.fileType.split('/')[1]?.toUpperCase() || 'FILE'} • Stored encrypted`}
      maxWidth="xl"
    >
      <div className="space-y-4">
        {/* Preview Area */}
        <div className="rounded-2xl border border-line bg-moss/30 overflow-hidden min-h-[220px] max-h-[460px] flex items-center justify-center relative">
          {isLoadingPayload ? (
            <div className="flex flex-col items-center gap-2 py-12 text-xs text-ink/50">
              <Loader2 className="w-6 h-6 text-pine-600 animate-spin" />
              <span>Decrypting document payload from SQLite vault...</span>
            </div>
          ) : isImage && dataUrl ? (
            <img
              src={dataUrl}
              alt={doc.name}
              className="max-h-[440px] w-auto max-w-full object-contain mx-auto rounded-xl"
            />
          ) : isPdf && dataUrl ? (
            <div className="w-full h-[400px] p-2">
              <iframe
                src={dataUrl}
                title={doc.name}
                className="w-full h-full rounded-xl border border-line bg-card"
              />
            </div>
          ) : (
            <div className="text-center py-12 space-y-2">
              <FileText className="w-12 h-12 text-pine-600 mx-auto opacity-75" />
              <p className="text-xs font-semibold text-ink">{doc.name}</p>
              <p className="text-[11px] text-ink/40">Preview not supported directly in-browser.</p>
              {dataUrl && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-3 py-1.5 rounded-xl bg-card border border-line hover:bg-moss text-xs font-bold text-pine-700 dark:text-pine-300 inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download to View</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Metadata Controls & Folder Mover */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-card border border-line">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-ink/50 flex items-center gap-1 mb-1">
              <Folder className="w-3 h-3 text-pine-600" />
              <span>Assigned Folder</span>
            </label>
            <select
              value={doc.folderId || 'unfiled'}
              onChange={(e) => handleFolderChange(e.target.value)}
              className="w-full rounded-xl border border-line bg-card px-3 py-1.5 text-xs font-semibold text-ink outline-none focus:border-pine-500 cursor-pointer"
            >
              {documentFolders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-ink/50 flex items-center gap-1 mb-1">
              <Calendar className="w-3 h-3 text-pine-600" />
              <span>Expiry / Renewal Date</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink font-semibold">
                {doc.expiryDate ? formatReadableDate(doc.expiryDate) : 'Permanent Document'}
              </span>
              {doc.expiryDate && (
                <button
                  type="button"
                  onClick={handleScheduleRenewal}
                  disabled={schedulingRenewal}
                  className="text-[11px] font-bold text-pine-600 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <CalendarClock className="w-3 h-3" />
                  <span>Schedule</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Multi-Entity Links Manager */}
        <div className="space-y-2 p-3 rounded-2xl bg-card border border-line">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-pine-600" />
              <span>Linked App Entities ({activeLinks.length})</span>
            </span>

            <button
              type="button"
              onClick={() => setIsLinking(!isLinking)}
              className="px-2.5 py-1 rounded-lg bg-moss hover:bg-pine-50 dark:hover:bg-pine-950/50 text-pine-700 dark:text-pine-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            >
              <Plus className="w-3 h-3 text-pine-600" />
              <span>{isLinking ? 'Close' : '+ Link to Entry'}</span>
            </button>
          </div>

          {/* Add Link Section */}
          {isLinking && (
            <div className="p-3 rounded-xl bg-moss/60 border border-line space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase text-ink/50 block mb-1">
                    Entity Type
                  </label>
                  <select
                    value={targetType}
                    onChange={(e) => {
                      setTargetType(e.target.value as LinkedEntityType);
                      setTargetId('');
                    }}
                    className="w-full rounded-xl border border-line bg-card px-2.5 py-1.5 text-xs text-ink outline-none focus:border-pine-500 cursor-pointer"
                  >
                    <option value="transaction">Transaction (Receipt/Expense)</option>
                    <option value="asset">Asset / Investment (Deed/Gold/MF)</option>
                    <option value="liability">Liability / Loan (Agreement/NOC)</option>
                    <option value="goal">Savings Goal</option>
                    <option value="people">Person / Khatabook</option>
                    <option value="account">Bank / Cash Account</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-ink/50 block mb-1">
                    Select Target
                  </label>
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full rounded-xl border border-line bg-card px-2.5 py-1.5 text-xs text-ink outline-none focus:border-pine-500 cursor-pointer"
                  >
                    <option value="">Choose item...</option>
                    {targetType === 'transaction' &&
                      transactions.slice(0, 30).map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.date} — {t.type.toUpperCase()}: {t.currency} {t.amount}{' '}
                          {t.note ? `(${t.note})` : ''}
                        </option>
                      ))}
                    {targetType === 'asset' &&
                      assets.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.currency} {a.currentValue.toLocaleString()})
                        </option>
                      ))}
                    {targetType === 'liability' &&
                      liabilities.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} (Bal: {l.currency} {l.outstandingBalance.toLocaleString()})
                        </option>
                      ))}
                    {targetType === 'goal' &&
                      goals.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    {targetType === 'people' &&
                      peopleLedger.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.contactName} ({p.type} {p.currency} {p.amount})
                        </option>
                      ))}
                    {targetType === 'account' &&
                      accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.currency} {acc.balance.toLocaleString()})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!targetId}
                  onClick={handleAddLink}
                  className="px-3 py-1.5 rounded-xl bg-pine-700 hover:bg-pine-600 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-all shadow-2xs"
                >
                  Confirm Link
                </button>
              </div>
            </div>
          )}

          {/* Active Links Badges */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {activeLinks.length === 0 ? (
              <span className="text-xs text-ink/40">Not linked to any entry yet.</span>
            ) : (
              activeLinks.map((link) => (
                <div
                  key={`${link.entityType}-${link.entityId}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-moss border border-line text-xs font-semibold text-ink"
                >
                  <span className="font-bold capitalize text-pine-700 dark:text-pine-300">
                    {link.entityType}:
                  </span>
                  <span className="truncate max-w-[200px]">{link.entityName || link.entityId}</span>
                  <button
                    type="button"
                    onClick={() => handleUnlink(link.entityType, link.entityId)}
                    className="p-0.5 hover:text-flare-600 rounded-md cursor-pointer transition-colors"
                    title="Remove link"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-line">
          <button
            type="button"
            onClick={handleDelete}
            className="px-3 py-1.5 rounded-xl text-flare-600 hover:bg-flare-50 dark:hover:bg-flare-950/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              disabled={!dataUrl}
              className="px-3.5 py-1.5 rounded-xl border border-line bg-card hover:bg-moss text-ink text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
            >
              <Share2 className="w-3.5 h-3.5 text-pine-600" />
              <span>Share</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={!dataUrl}
              className="px-4 py-1.5 rounded-xl bg-pine-700 hover:bg-pine-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm shadow-pine-900/20 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
