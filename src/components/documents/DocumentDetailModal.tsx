import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../common/Modal';
import { useVault } from '../../context/VaultContext';
import { useConfirm } from '../../context/DialogContext';
import { formatFileSize, formatCurrency } from '../../utils/formatters';
import { formatReadableDate, formatReadableDateTime } from '../../utils/dates';
import { processFileForVault } from '../../utils/imageCompressor';
import type { LinkedEntityType, DocumentRecord, DocumentLink } from '../../types';
import { InternxtFileIcon } from './InternxtFileIcon';
import { FolderIconBadge } from './GoogleDriveView';
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
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Search,
  Receipt,
  Landmark,
  TrendingUp,
  Users,
  Target,
  Edit2,
  Check,
  ArrowUpRight,
  Upload,
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
    notes,
    loadDocumentDataUrl,
    updateDocument,
    deleteDocument,
    linkDocumentToEntity,
    unlinkDocumentFromEntity,
    addPlannedExpense,
  } = useVault();

  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState<'preview' | 'details' | 'links'>('preview');
  const [dataUrl, setDataUrl] = useState<string>('');
  const [isLoadingPayload, setIsLoadingPayload] = useState(false);

  // Preview canvas tools
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  const navigate = useNavigate();

  // Renaming doc
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  // Renewal scheduling
  const [schedulingRenewal, setSchedulingRenewal] = useState(false);

  // Entity linker state
  const [linkerCategory, setLinkerCategory] = useState<LinkedEntityType>('transaction');
  const [linkerSearch, setLinkerSearch] = useState('');
  const [isPickingNewLink, setIsPickingNewLink] = useState(false);

  // PDF Blob URL for native Brave / Chrome viewing without CSP data URI block
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  const doc = useMemo(() => {
    return documents.find((d) => d.id === documentId) || null;
  }, [documents, documentId]);

  useEffect(() => {
    if (!doc) {
      setDataUrl('');
      return;
    }
    setRenameValue(doc.name);
    setZoomLevel(1);
    setRotation(0);
    setIsPickingNewLink(false);

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

  const isImage = doc?.fileType.startsWith('image/');
  const isPdf = doc ? doc.fileType.includes('pdf') || doc.name.toLowerCase().endsWith('.pdf') : false;
  const isAudio = doc?.fileType.startsWith('audio/');
  const isVideo = doc?.fileType.startsWith('video/');

  // Convert PDF base64 to Blob URL for native browser rendering
  useEffect(() => {
    if (!dataUrl || !isPdf) {
      setPdfBlobUrl(null);
      return;
    }
    try {
      if (dataUrl.startsWith('blob:')) {
        setPdfBlobUrl(dataUrl);
        return;
      }
      const parts = dataUrl.split(',');
      const byteString = atob(parts[1] || parts[0]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } catch (err) {
      console.error('Error creating PDF blob URL:', err);
      setPdfBlobUrl(dataUrl);
    }
  }, [dataUrl, isPdf]);

  if (!doc) return null;

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = doc.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenInNewTab = () => {
    if (pdfBlobUrl && isPdf) {
      window.open(pdfBlobUrl, '_blank');
      return;
    }
    if (!dataUrl) return;
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(
        `<html><head><title>${doc.name}</title></head><body style="margin:0;display:grid;place-items:center;background:#111;">` +
          (isImage
            ? `<img src="${dataUrl}" style="max-width:100%;max-height:100vh;object-contain:fit;" />`
            : `<iframe src="${dataUrl}" style="width:100vw;height:100vh;border:none;"></iframe>`) +
          `</body></html>`
      );
    }
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

  const handleSaveRename = async () => {
    if (!renameValue.trim() || renameValue.trim() === doc.name) {
      setIsRenaming(false);
      return;
    }
    await updateDocument(doc.id, { name: renameValue.trim() });
    setIsRenaming(false);
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

  const handleAddLink = async (type: LinkedEntityType, id: string, name: string) => {
    await linkDocumentToEntity(doc.id, type, id, name);
  };

  const handleUnlink = async (linkType: LinkedEntityType, linkId: string) => {
    await unlinkDocumentFromEntity(doc.id, linkType, linkId);
  };

  // Compile active links
  const activeLinks =
    doc.links && doc.links.length > 0
      ? doc.links
      : doc.linkedType && doc.linkedType !== 'none' && doc.linkedId
      ? [{ entityType: doc.linkedType, entityId: doc.linkedId, linkedAt: doc.createdAt }]
      : [];

  const isEntityLinked = (type: LinkedEntityType, id: string) => {
    return activeLinks.some((l) => l.entityType === type && l.entityId === id);
  };

  const getEnrichedLinkInfo = (link: DocumentLink) => {
    switch (link.entityType) {
      case 'transaction': {
        const tx = transactions.find((t) => t.id === link.entityId);
        return {
          title: tx ? `${tx.note || 'Expense / Income'} • ${formatCurrency(tx.amount)}` : link.entityName || 'Transaction',
          subtitle: tx ? `${tx.date} • ${tx.type.toUpperCase()}` : 'Financial Transaction',
          typeLabel: 'Receipt / Expense',
          icon: Receipt,
          color: 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
          route: '/transactions',
        };
      }
      case 'asset': {
        const ast = assets.find((a) => a.id === link.entityId);
        return {
          title: ast ? `${ast.name} • ${formatCurrency(ast.currentValue)}` : link.entityName || 'Asset',
          subtitle: ast ? `${ast.type.toUpperCase()} • Purchased ${ast.purchaseDate}` : 'Physical/Financial Asset',
          typeLabel: 'Asset Deed / Valuation',
          icon: Landmark,
          color: 'text-blue-700 dark:text-blue-300 bg-blue-500/10 border-blue-500/30',
          route: '/assets',
        };
      }
      case 'liability': {
        const liab = liabilities.find((l) => l.id === link.entityId);
        return {
          title: liab ? `${liab.name} • ₹${formatCurrency(liab.outstandingBalance)}` : link.entityName || 'Loan',
          subtitle: liab ? `Principal: ₹${formatCurrency(liab.principalAmount)}` : 'Debt / Liability',
          typeLabel: 'Loan Agreement / NOC',
          icon: TrendingUp,
          color: 'text-rose-700 dark:text-rose-300 bg-rose-500/10 border-rose-500/30',
          route: '/assets',
        };
      }
      case 'account': {
        const acc = accounts.find((a) => a.id === link.entityId);
        return {
          title: acc ? `${acc.name} (${acc.accountNumberLast4 ? '••' + acc.accountNumberLast4 : acc.type})` : link.entityName || 'Account',
          subtitle: acc ? `Balance: ₹${formatCurrency(acc.balance)}` : 'Bank / Wallet Account',
          typeLabel: 'Bank KYC / Passbook',
          icon: Landmark,
          color: 'text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 border-indigo-500/30',
          route: '/accounts',
        };
      }
      case 'note': {
        const n = notes.find((nt) => nt.id === link.entityId);
        return {
          title: n ? n.title : link.entityName || 'Vault Note',
          subtitle: n ? `Modified: ${formatReadableDate(n.updatedAt)}` : 'Encrypted Financial Note',
          typeLabel: 'Vault Note',
          icon: FileText,
          color: 'text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/30',
          route: '/notes',
        };
      }
      case 'people': {
        const p = peopleLedger.find((pl) => pl.id === link.entityId);
        return {
          title: p ? `${p.contactName} • ₹${formatCurrency(p.amount)}` : link.entityName || 'Person',
          subtitle: p ? (p.type === 'lent' ? 'You gave (You will get)' : 'You took (You owe)') : 'Khatabook Ledger',
          typeLabel: 'Khatabook IOU',
          icon: Users,
          color: 'text-purple-700 dark:text-purple-300 bg-purple-500/10 border-purple-500/30',
          route: '/people',
        };
      }
      case 'goal': {
        const g = goals.find((gl) => gl.id === link.entityId);
        return {
          title: g ? `${g.name} • Target ${formatCurrency(g.targetAmount)}` : link.entityName || 'Goal',
          subtitle: g ? `Saved: ${formatCurrency(g.currentAmount)}` : 'Savings Goal',
          typeLabel: 'Savings Goal',
          icon: Target,
          color: 'text-teal-700 dark:text-teal-300 bg-teal-500/10 border-teal-500/30',
          route: '/budgets',
        };
      }
      default: {
        return {
          title: link.entityName || link.entityId,
          subtitle: 'Linked Financial Record',
          typeLabel: 'Financial Link',
          icon: Link2,
          color: 'text-brand-700 dark:text-brand-300 bg-brand-500/10 border-brand-500/30',
          route: '/transactions',
        };
      }
    }
  };

  const handleNavigateToEntity = (type: LinkedEntityType, id: string) => {
    onClose();
    switch (type) {
      case 'transaction':
        navigate('/transactions', { state: { highlightId: id } });
        break;
      case 'asset':
      case 'liability':
        navigate('/assets', { state: { highlightId: id } });
        break;
      case 'account':
        navigate('/accounts', { state: { highlightId: id } });
        break;
      case 'note':
        navigate('/notes', { state: { highlightId: id } });
        break;
      case 'people':
        navigate('/people', { state: { highlightId: id } });
        break;
      case 'goal':
        navigate('/budgets', { state: { highlightId: id } });
        break;
      default:
        navigate('/transactions');
        break;
    }
  };

  // Safe display for Upload Date
  const safeUploadDate = useMemo(() => {
    return formatReadableDateTime(doc.createdAt) || formatReadableDate(doc.createdAt) || 'Recently uploaded';
  }, [doc.createdAt]);

  // Safe display for Last Modified
  const safeModifiedDate = useMemo(() => {
    const d = doc.updatedAt || doc.createdAt;
    return formatReadableDateTime(d) || formatReadableDate(d) || 'Recently';
  }, [doc.updatedAt, doc.createdAt]);

  // Available linkable items filtered by search
  const linkableItems = useMemo(() => {
    const q = linkerSearch.toLowerCase().trim();
    if (linkerCategory === 'transaction') {
      return transactions
        .filter(
          (t) =>
            !q ||
            t.type.toLowerCase().includes(q) ||
            t.amount.toString().includes(q) ||
            (t.note && t.note.toLowerCase().includes(q)) ||
            (t.date && t.date.includes(q))
        )
        .slice(0, 40)
        .map((t) => ({
          id: t.id,
          title: `${t.type.toUpperCase()}: ${t.currency} ${t.amount}`,
          subtitle: `${t.date}${t.note ? ` • ${t.note}` : ''}`,
          isLinked: isEntityLinked('transaction', t.id),
        }));
    }
    if (linkerCategory === 'asset') {
      return assets
        .filter(
          (a) =>
            !q ||
            a.name.toLowerCase().includes(q) ||
            (a.type && a.type.toLowerCase().includes(q))
        )
        .map((a) => ({
          id: a.id,
          title: a.name,
          subtitle: `${formatCurrency(a.currentValue, a.currency)} • ${a.type.toUpperCase()}`,
          isLinked: isEntityLinked('asset', a.id),
        }));
    }
    if (linkerCategory === 'liability') {
      return liabilities
        .filter(
          (l) =>
            !q ||
            l.name.toLowerCase().includes(q) ||
            (l.lender && l.lender.toLowerCase().includes(q))
        )
        .map((l) => ({
          id: l.id,
          title: l.name,
          subtitle: `Balance: ${formatCurrency(l.outstandingBalance, l.currency)}${l.lender ? ` • ${l.lender}` : ''}`,
          isLinked: isEntityLinked('liability', l.id),
        }));
    }
    if (linkerCategory === 'account') {
      return accounts
        .filter(
          (acc) =>
            !q ||
            acc.name.toLowerCase().includes(q) ||
            (acc.accountNumberLast4 && acc.accountNumberLast4.includes(q))
        )
        .map((acc) => ({
          id: acc.id,
          title: acc.name,
          subtitle: `${formatCurrency(acc.balance, acc.currency)} • ${acc.type.toUpperCase()}`,
          isLinked: isEntityLinked('account', acc.id),
        }));
    }
    if (linkerCategory === 'note') {
      return notes
        .filter(
          (n) =>
            !q ||
            n.title.toLowerCase().includes(q) ||
            (n.content && n.content.toLowerCase().includes(q))
        )
        .map((n) => ({
          id: n.id,
          title: n.title,
          subtitle: `Vault Note • ${formatReadableDate(n.updatedAt || n.createdAt)}`,
          isLinked: isEntityLinked('note', n.id),
        }));
    }
    if (linkerCategory === 'people') {
      return peopleLedger
        .filter(
          (p) =>
            !q ||
            p.contactName.toLowerCase().includes(q) ||
            (p.contactPhone && p.contactPhone.includes(q))
        )
        .map((p) => ({
          id: p.id,
          title: p.contactName,
          subtitle: `${p.type.toUpperCase()}: ${p.currency} ${p.amount}`,
          isLinked: isEntityLinked('people', p.id),
        }));
    }
    if (linkerCategory === 'goal') {
      return goals
        .filter((g) => !q || g.name.toLowerCase().includes(q))
        .map((g) => ({
          id: g.id,
          title: g.name,
          subtitle: `Target: ${formatCurrency(g.targetAmount, g.currency)}`,
          isLinked: isEntityLinked('goal', g.id),
        }));
    }
    return [];
  }, [
    linkerCategory,
    linkerSearch,
    transactions,
    assets,
    liabilities,
    accounts,
    notes,
    peopleLedger,
    goals,
    activeLinks,
  ]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-ink min-w-0">
          <FolderLock className="w-5 h-5 text-pine-600 shrink-0" />
          {isRenaming ? (
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename();
                  if (e.key === 'Escape') setIsRenaming(false);
                }}
                autoFocus
                className="px-2 py-0.5 rounded-lg border border-brand-500 bg-surface text-ink text-sm font-bold outline-none flex-1 min-w-0"
              />
              <button
                type="button"
                onClick={handleSaveRename}
                className="p-1 rounded-md bg-brand-500 text-white hover:bg-brand-600"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="truncate font-bold text-sm sm:text-base">{doc.name}</span>
              <button
                type="button"
                onClick={() => setIsRenaming(true)}
                className="p-1 rounded-md text-ink/40 hover:text-ink hover:bg-surface-2 transition-colors shrink-0"
                title="Rename file"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      }
      description={`${formatFileSize(doc.fileSize)} • ${doc.fileType.split('/')[1]?.toUpperCase() || 'FILE'} • Uploaded: ${safeUploadDate} • AES-256 Encrypted Sovereign Storage`}
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-surface-2/80 border border-line">
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'preview'
                ? 'bg-card text-pine-700 dark:text-pine-300 shadow-xs border border-line/60'
                : 'text-ink/60 hover:text-ink hover:bg-card/50'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Document Preview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'details'
                ? 'bg-card text-pine-700 dark:text-pine-300 shadow-xs border border-line/60'
                : 'text-ink/60 hover:text-ink hover:bg-card/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Details & Expiry</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('links')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'links'
                ? 'bg-card text-pine-700 dark:text-pine-300 shadow-xs border border-line/60'
                : 'text-ink/60 hover:text-ink hover:bg-card/50'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Linked App Entries</span>
            <span className="px-1.5 py-0.5 rounded-full bg-brand-500/10 text-brand-600 text-[10px] font-mono">
              {activeLinks.length}
            </span>
          </button>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            TAB 1: EXPANSIVE DOCUMENT PREVIEW CANVAS
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'preview' && (
          <div className="space-y-2">
            {/* Toolbar for Canvas */}
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-card border border-line text-xs text-ink/70">
              <div className="flex items-center gap-1.5">
                {isImage && (
                  <>
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 3))}
                      className="p-1 rounded-lg hover:bg-surface-2 text-ink/70 hover:text-ink cursor-pointer"
                      title="Zoom in"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <span className="text-[11px] font-mono font-bold w-12 text-center text-ink">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.5))}
                      className="p-1 rounded-lg hover:bg-surface-2 text-ink/70 hover:text-ink cursor-pointer"
                      title="Zoom out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setZoomLevel(1);
                        setRotation(0);
                      }}
                      className="px-2 py-0.5 rounded-lg hover:bg-surface-2 text-[11px] font-semibold text-ink/60 cursor-pointer ml-1"
                    >
                      Reset
                    </button>
                    <div className="h-4 w-px bg-line mx-1" />
                    <button
                      type="button"
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="p-1 rounded-lg hover:bg-surface-2 text-ink/70 hover:text-ink cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                      title="Rotate clockwise"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>{rotation}°</span>
                    </button>
                  </>
                )}
                {isPdf && (
                  <span className="text-[11px] font-semibold text-ink/50">
                    Encrypted PDF Document Viewer
                  </span>
                )}
                <div className="flex items-center gap-1.5 text-[11px] text-ink/60 font-mono px-1">
                  <Calendar className="w-3.5 h-3.5 text-pine-600 shrink-0" />
                  <span>Uploaded: {safeUploadDate}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {dataUrl && (
                  <button
                    type="button"
                    onClick={handleOpenInNewTab}
                    className="p-1 rounded-lg hover:bg-surface-2 text-ink/70 hover:text-ink cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                    title="Open document in browser tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">New Tab</span>
                  </button>
                )}
                {dataUrl && (
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="p-1 rounded-lg hover:bg-surface-2 text-ink/70 hover:text-ink cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                    title="Download document"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Download</span>
                  </button>
                )}
              </div>
            </div>

            {/* Expansive Canvas */}
            <div className="rounded-2xl border border-line bg-surface-2/40 overflow-hidden h-[500px] sm:h-[540px] flex items-center justify-center relative">
              {isLoadingPayload ? (
                <div className="flex flex-col items-center gap-2 py-12 text-xs text-ink/50">
                  <Loader2 className="w-8 h-8 text-pine-600 animate-spin" />
                  <span className="font-semibold">Decrypting document payload from SQLite vault...</span>
                </div>
              ) : isImage && dataUrl ? (
                <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
                  <img
                    src={dataUrl}
                    alt={doc.name}
                    style={{
                      transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                      transition: 'transform 0.2s ease-out',
                    }}
                    className="max-h-[480px] w-auto max-w-full object-contain rounded-xl shadow-md select-none"
                  />
                </div>
              ) : isPdf && (pdfBlobUrl || dataUrl) ? (
                <div className="w-full h-full p-1 flex flex-col">
                  <object
                    data={`${pdfBlobUrl || dataUrl}#toolbar=1&navpanes=0`}
                    type="application/pdf"
                    className="w-full flex-1 rounded-xl border border-line bg-card shadow-inner min-h-[480px]"
                  >
                    <div className="p-8 text-center space-y-3 flex flex-col items-center justify-center h-full">
                      <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-600 grid place-items-center mx-auto">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-ink">{doc.name}</p>
                        <p className="text-xs text-ink/50 mt-0.5">
                          PDF viewer ready. Click below to view with full controls in a browser tab.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenInNewTab}
                        className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Open PDF in New Window</span>
                      </button>
                    </div>
                  </object>
                </div>
              ) : isVideo && dataUrl ? (
                <div className="w-full h-full p-4 flex items-center justify-center">
                  <video
                    src={dataUrl}
                    controls
                    className="max-h-[460px] max-w-full rounded-xl border border-line bg-black"
                  />
                </div>
              ) : isAudio && dataUrl ? (
                <div className="p-8 text-center space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-brand-500/10 text-brand-600 grid place-items-center mx-auto shadow-xs">
                    <InternxtFileIcon name={doc.name} mimeType={doc.fileType} size="xl" />
                  </div>
                  <audio src={dataUrl} controls className="w-full max-w-md mx-auto" />
                </div>
              ) : !dataUrl && !isLoadingPayload ? (
                <div className="text-center py-10 space-y-4 p-6 max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-3xl bg-brand-500/10 text-brand-600 grid place-items-center mx-auto shadow-xs">
                    <InternxtFileIcon name={doc.name} mimeType={doc.fileType} size="xl" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-ink">{doc.name}</h4>
                    <p className="text-xs text-ink/60 max-w-sm mx-auto">
                      File data payload is not currently cached in local vault storage. Attach or replace the file below to enable full encrypted preview and downloads.
                    </p>
                  </div>
                  <label className="px-4 py-2.5 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold inline-flex items-center gap-2 shadow-sm cursor-pointer transition-all active:scale-[0.98]">
                    <Upload className="w-4 h-4" />
                    <span>Attach / Replace File Content</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const processed = await processFileForVault(file, false);
                            await updateDocument(doc.id, {
                              dataUrl: processed.dataUrl,
                              fileSize: processed.fileSize,
                              thumbnailUrl: processed.thumbnailUrl,
                              fileType: file.type || doc.fileType,
                            });
                            setDataUrl(processed.dataUrl);
                          } catch (err) {
                            console.error('Re-upload failed:', err);
                          }
                        }
                      }}
                    />
                  </label>
                </div>
              ) : (
                <div className="text-center py-12 space-y-3 p-6">
                  <div className="flex justify-center">
                    <InternxtFileIcon name={doc.name} mimeType={doc.fileType} size="xl" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-ink">{doc.name}</p>
                    <p className="text-xs text-ink/50 max-w-xs mx-auto">
                      Direct in-browser preview is not available for this format ({doc.fileType || 'Unknown'}).
                    </p>
                  </div>
                  {dataUrl && (
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="px-4 py-2 rounded-xl bg-card border border-line hover:bg-moss text-xs font-bold text-pine-700 dark:text-pine-300 inline-flex items-center gap-2 shadow-xs cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download File to View</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Attached Record & Quick Action Pill in Preview Tab */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-card border border-line text-xs shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <Link2 className="w-4 h-4 text-ink/40 shrink-0" />
                {activeLinks.length > 0 ? (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-ink/60">Attached to:</span>
                    {(() => {
                      const firstLink = activeLinks[0];
                      const info = getEnrichedLinkInfo(firstLink);
                      return (
                        <span className="font-bold text-ink truncate max-w-[200px] sm:max-w-xs">
                          {info.title}
                        </span>
                      );
                    })()}
                    {activeLinks.length > 1 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-2 text-ink/60 font-mono">
                        +{activeLinks.length - 1} more
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-ink/50">Not attached to any financial record</span>
                )}
              </div>

              {activeLinks.length > 0 ? (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleNavigateToEntity(activeLinks[0].entityType, activeLinks[0].entityId)}
                    className="px-2.5 py-1 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>View Entry</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('links')}
                    className="text-ink/50 hover:text-ink font-semibold text-[11px] underline cursor-pointer"
                  >
                    Manage
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('links');
                    setIsPickingNewLink(true);
                  }}
                  className="px-3 py-1 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Attach to Record</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 2: DETAILS, METADATA & EXPIRY RENEWAL
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'details' && (
          <div className="space-y-4 max-h-[540px] overflow-y-auto custom-scrollbar pr-1">
            {/* Metadata Card */}
            <div className="p-4 rounded-2xl bg-card border border-line space-y-3 shadow-2xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink/50 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-pine-600" />
                <span>File Metadata & Storage Information</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-surface-2/50 border border-line/60">
                  <span className="text-[10px] font-bold text-ink/40 uppercase block mb-0.5">
                    File Name
                  </span>
                  <span className="font-semibold text-ink break-all">{doc.name}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-surface-2/50 border border-line/60">
                  <span className="text-[10px] font-bold text-ink/40 uppercase block mb-0.5">
                    File Size & MIME
                  </span>
                  <span className="font-semibold text-ink">
                    {formatFileSize(doc.fileSize)} ({doc.fileSize.toLocaleString()} bytes) • {doc.fileType}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-surface-2/50 border border-line/60">
                  <span className="text-[10px] font-bold text-ink/40 uppercase block mb-0.5">
                    Uploaded On (Created At)
                  </span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {safeUploadDate}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-surface-2/50 border border-line/60">
                  <span className="text-[10px] font-bold text-ink/40 uppercase block mb-0.5">
                    Last Modified
                  </span>
                  <span className="font-semibold text-ink">{safeModifiedDate}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-surface-2/50 border border-line/60 sm:col-span-2">
                  <span className="text-[10px] font-bold text-ink/40 uppercase block mb-0.5">
                    Storage & Security
                  </span>
                  <span className="font-mono text-[11px] text-ink/70">
                    Encrypted SQLite Document Payload • AES-256-GCM Sovereign Vault Key ID: {doc.id}
                  </span>
                </div>
              </div>
            </div>

            {/* Folder Assignment Selector */}
            <div className="p-4 rounded-2xl bg-card border border-line space-y-3 shadow-2xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink/50 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-amber-500" />
                <span>Assigned Vault Folder</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleFolderChange('unfiled')}
                  className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                    !doc.folderId || doc.folderId === 'unfiled'
                      ? 'border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300 font-bold shadow-2xs'
                      : 'border-line bg-surface-2/50 hover:bg-surface-2 text-ink/70'
                  }`}
                >
                  <Folder className="w-4 h-4 text-ink/40 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs block truncate">Unfiled (Root)</span>
                    <span className="text-[10px] text-ink/40">General storage</span>
                  </div>
                </button>

                {documentFolders.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleFolderChange(f.id)}
                    className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                      doc.folderId === f.id
                        ? 'border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300 font-bold shadow-2xs'
                        : 'border-line bg-surface-2/50 hover:bg-surface-2 text-ink/70'
                    }`}
                  >
                    <FolderIconBadge folder={f} size="sm" />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs block truncate">{f.name}</span>
                      <span className="text-[10px] text-ink/40">Custom folder</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Expiry & 1-Click Renewal Scheduler */}
            <div className="p-4 rounded-2xl bg-card border border-line space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink/50 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-pine-600" />
                  <span>Document Expiry & Renewal Reminder</span>
                </h4>

                {doc.expiryDate && (
                  <button
                    type="button"
                    onClick={handleScheduleRenewal}
                    disabled={schedulingRenewal}
                    className="px-3 py-1 rounded-xl bg-pine-700 hover:bg-pine-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95"
                  >
                    <CalendarClock className="w-3.5 h-3.5" />
                    <span>{schedulingRenewal ? 'Scheduling...' : '1-Click Renewal Reminder'}</span>
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <input
                  type="date"
                  value={doc.expiryDate || ''}
                  onChange={(e) => updateDocument(doc.id, { expiryDate: e.target.value || undefined })}
                  className="px-3 py-2 rounded-xl border border-line bg-surface-2 text-xs font-semibold text-ink outline-none focus:border-pine-500 cursor-pointer"
                />

                <div className="text-xs text-ink/60">
                  {doc.expiryDate ? (
                    <span>
                      Expires on <strong className="text-ink">{formatReadableDate(doc.expiryDate)}</strong>.
                      Click &quot;1-Click Renewal Reminder&quot; to push this due date directly to your Planned Expenses scheduler.
                    </span>
                  ) : (
                    <span>No expiration date set. Set a date for passport, insurance, PUC, or domain renewals.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 3: COMPREHENSIVE LINKED FINANCIAL ENTRIES MANAGER
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'links' && (
          <div className="space-y-4 max-h-[540px] overflow-y-auto custom-scrollbar pr-1">
            {/* If NOT in picking mode, show ONLY attached records, or clean empty state */}
            {!isPickingNewLink ? (
              <div className="space-y-4">
                {activeLinks.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-ink/60 flex items-center gap-1.5">
                        <Link2 className="w-3.5 h-3.5 text-pine-600" />
                        <span>Attached Financial Records ({activeLinks.length})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsPickingNewLink(true)}
                        className="px-3 py-1 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Attach Another Record</span>
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {activeLinks.map((link) => {
                        const info = getEnrichedLinkInfo(link);
                        const IconComponent = info.icon;
                        return (
                          <div
                            key={`${link.entityType}-${link.entityId}`}
                            className="p-4 rounded-2xl bg-card border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-line/80 transition-all"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <div className={`p-2.5 rounded-xl border shrink-0 ${info.color}`}>
                                <IconComponent className="w-5 h-5" />
                              </div>
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-surface-2 text-ink/60">
                                    {info.typeLabel}
                                  </span>
                                </div>
                                <h4 className="font-bold text-ink text-sm truncate">{info.title}</h4>
                                <p className="text-xs text-ink/50 font-mono">{info.subtitle}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              <button
                                type="button"
                                onClick={() => handleNavigateToEntity(link.entityType, link.entityId)}
                                className="px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95"
                              >
                                <span>View Entry</span>
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUnlink(link.entityType, link.entityId)}
                                className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-600 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Unlink</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center space-y-3 rounded-2xl bg-surface-2/30 border border-line">
                    <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-line grid place-items-center mx-auto text-ink/40">
                      <Link2 className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-ink">Not Attached to Any Financial Record</h4>
                      <p className="text-xs text-ink/50 max-w-sm mx-auto">
                        This file is currently unattached. You can attach it to an expense receipt, property deed, loan document, bank KYC, or note.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPickingNewLink(true)}
                      className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold inline-flex items-center gap-2 shadow-xs cursor-pointer transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Attach to Financial Record</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* PICKER MODE: Category tabs + live search + linkable items */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink/60">
                    Select Record to Attach:
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPickingNewLink(false)}
                    className="text-xs font-bold text-ink/50 hover:text-ink cursor-pointer px-2 py-1 rounded-lg hover:bg-surface-2"
                  >
                    Done / Close
                  </button>
                </div>

                {/* Category Selector for Linking */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setLinkerCategory('transaction')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      linkerCategory === 'transaction'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold shadow-2xs'
                        : 'border-line bg-card hover:bg-surface-2 text-ink/70'
                    }`}
                  >
                    <Receipt className="w-4 h-4 text-emerald-500" />
                    <span className="text-[11px] truncate">Receipts</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLinkerCategory('asset')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      linkerCategory === 'asset'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-400 font-bold shadow-2xs'
                        : 'border-line bg-card hover:bg-surface-2 text-ink/70'
                    }`}
                  >
                    <Landmark className="w-4 h-4 text-blue-500" />
                    <span className="text-[11px] truncate">Assets</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLinkerCategory('liability')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      linkerCategory === 'liability'
                        ? 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-400 font-bold shadow-2xs'
                        : 'border-line bg-card hover:bg-surface-2 text-ink/70'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4 text-rose-500" />
                    <span className="text-[11px] truncate">Loans</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLinkerCategory('account')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      linkerCategory === 'account'
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-bold shadow-2xs'
                        : 'border-line bg-card hover:bg-surface-2 text-ink/70'
                    }`}
                  >
                    <Landmark className="w-4 h-4 text-indigo-500" />
                    <span className="text-[11px] truncate">Bank KYC</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLinkerCategory('note')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      linkerCategory === 'note'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold shadow-2xs'
                        : 'border-line bg-card hover:bg-surface-2 text-ink/70'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-amber-500" />
                    <span className="text-[11px] truncate">Notes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLinkerCategory('people')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      linkerCategory === 'people'
                        ? 'border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-400 font-bold shadow-2xs'
                        : 'border-line bg-card hover:bg-surface-2 text-ink/70'
                    }`}
                  >
                    <Users className="w-4 h-4 text-purple-500" />
                    <span className="text-[11px] truncate">Khatabook</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLinkerCategory('goal')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      linkerCategory === 'goal'
                        ? 'border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-400 font-bold shadow-2xs'
                        : 'border-line bg-card hover:bg-surface-2 text-ink/70'
                    }`}
                  >
                    <Target className="w-4 h-4 text-teal-500" />
                    <span className="text-[11px] truncate">Goals</span>
                  </button>
                </div>

                {/* Search items inside category */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink/40 pointer-events-none" />
                  <input
                    type="text"
                    placeholder={`Search ${
                      linkerCategory === 'transaction'
                        ? 'transactions'
                        : linkerCategory === 'asset'
                        ? 'assets'
                        : linkerCategory === 'liability'
                        ? 'liabilities'
                        : linkerCategory === 'account'
                        ? 'accounts'
                        : linkerCategory === 'note'
                        ? 'notes'
                        : linkerCategory === 'people'
                        ? 'people/contacts'
                        : linkerCategory === 'goal'
                        ? 'goals'
                        : 'items'
                    } by title, note, or amount...`}
                    value={linkerSearch}
                    onChange={(e) => setLinkerSearch(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 bg-surface-2/60 border border-line rounded-xl text-xs text-ink placeholder:text-ink/40 focus:outline-none focus:border-brand-500"
                  />
                </div>

                {/* List of items */}
                <div className="border border-line rounded-2xl bg-card overflow-hidden divide-y divide-line/60 max-h-[260px] overflow-y-auto custom-scrollbar">
                  {linkableItems.length === 0 ? (
                    <div className="p-8 text-center text-xs text-ink/40">
                      {linkerSearch.trim()
                        ? `No matching ${
                            linkerCategory === 'transaction'
                              ? 'transactions'
                              : linkerCategory === 'asset'
                              ? 'assets'
                              : linkerCategory === 'liability'
                              ? 'liabilities'
                              : linkerCategory === 'account'
                              ? 'accounts'
                              : linkerCategory === 'note'
                              ? 'notes'
                              : linkerCategory === 'people'
                              ? 'people/contacts'
                              : linkerCategory === 'goal'
                              ? 'goals'
                              : 'items'
                          } found for "${linkerSearch}".`
                        : `No ${
                            linkerCategory === 'transaction'
                              ? 'transactions'
                              : linkerCategory === 'asset'
                              ? 'assets'
                              : linkerCategory === 'liability'
                              ? 'liabilities'
                              : linkerCategory === 'account'
                              ? 'accounts'
                              : linkerCategory === 'note'
                              ? 'notes'
                              : linkerCategory === 'people'
                              ? 'people/contacts'
                              : linkerCategory === 'goal'
                              ? 'goals'
                              : 'items'
                          } recorded yet in your vault.`}
                    </div>
                  ) : (
                    linkableItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 flex items-center justify-between gap-3 hover:bg-surface-2/50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold text-ink block truncate">{item.title}</span>
                          <span className="text-[10px] text-ink/50 block truncate">{item.subtitle}</span>
                        </div>

                        {item.isLinked ? (
                          <button
                            type="button"
                            onClick={() => handleUnlink(linkerCategory, item.id)}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                          >
                            <X className="w-3 h-3" />
                            <span>Unlink</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddLink(linkerCategory, item.id, item.title)}
                            className="px-2.5 py-1 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Link</span>
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            MODAL FOOTER: DELETE, SHARE, DOWNLOAD
        ───────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-3 border-t border-line">
          <button
            type="button"
            onClick={handleDelete}
            className="px-3.5 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Permanently</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              disabled={!dataUrl}
              className="px-3.5 py-1.5 rounded-xl border border-line bg-card hover:bg-surface-2 text-ink text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
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

