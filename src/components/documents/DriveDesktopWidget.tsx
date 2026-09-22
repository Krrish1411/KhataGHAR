import React from 'react';
import type { DocumentRecord } from '../../types';
import { formatFileSize } from '../../utils/formatters';
import { formatReadableDate } from '../../utils/dates';
import { InternxtFileIcon } from './InternxtFileIcon';
import {
  ShieldCheck,
  HardDrive,
  Sparkles,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Archive,
  FileCode,
  CheckCircle2,
  X,
  Wrench,
  FolderOpen,
} from 'lucide-react';

interface DriveDesktopWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentRecord[];
  totalStorageBytes: number;
  onOpenTools: (tab?: 'scanner' | 'cleaner' | 'storage' | 'preferences') => void;
  onUploadClick: () => void;
}

export const DriveDesktopWidget: React.FC<DriveDesktopWidgetProps> = ({
  isOpen,
  onClose,
  documents,
  totalStorageBytes,
  onOpenTools,
}) => {
  if (!isOpen) return null;

  // Calculate storage categories
  const storageBreakdown = React.useMemo(() => {
    let images = 0;
    let pdfs = 0;
    let sheets = 0;
    let other = 0;

    documents.forEach((d) => {
      const size = d.fileSize || 0;
      const mime = (d.fileType || '').toLowerCase();
      const name = (d.name || '').toLowerCase();

      if (mime.startsWith('image/') || /\.(png|jpe?g|webp|svg|gif)$/i.test(name)) {
        images += size;
      } else if (mime === 'application/pdf' || name.endsWith('.pdf')) {
        pdfs += size;
      } else if (
        mime.includes('sheet') ||
        mime.includes('csv') ||
        /\.(xlsx?|csv)$/i.test(name)
      ) {
        sheets += size;
      } else {
        other += size;
      }
    });

    const total = totalStorageBytes || 1;
    return {
      images: { bytes: images, pct: (images / total) * 100 },
      pdfs: { bytes: pdfs, pct: (pdfs / total) * 100 },
      sheets: { bytes: sheets, pct: (sheets / total) * 100 },
      other: { bytes: other, pct: (other / total) * 100 },
    };
  }, [documents, totalStorageBytes]);

  // Recent 6 activities sorted by createdAt descending
  const recentActivities = React.useMemo(() => {
    return [...documents]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
  }, [documents]);

  const getFileIcon = (doc: DocumentRecord) => {
    return <InternxtFileIcon name={doc.name} mimeType={doc.fileType} size="sm" />;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* Floating Desktop Widget Card */}
      <div
        className="fixed top-20 right-4 sm:right-8 z-50 w-[360px] max-w-[calc(100vw-2rem)] bg-surface border border-line rounded-3xl shadow-2xl overflow-hidden flex flex-col anim-slide-down"
        style={{ maxHeight: 'calc(100vh - 120px)' }}
      >
        {/* Header - User / Local Vault identity */}
        <div className="flex items-center justify-between p-4 border-b border-line bg-surface-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-600 grid place-items-center shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-display font-bold text-sm text-ink">KhataGHAR Vault</h3>
                <span className="w-2 h-2 rounded-full bg-pine-500 animate-pulse" />
              </div>
              <p className="text-[11px] text-ink/50 flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3 h-3 text-pine-600" /> 100% Local • AES-256 GCM
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-moss text-ink/40 hover:text-ink grid place-items-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Local Storage Indicator (Inspired by Internxt UsageIndicator) */}
        <div className="p-4 border-b border-line/60 bg-surface">
          <div className="flex items-center justify-between text-xs mb-2">
            <div>
              <span className="font-bold text-ink text-sm">
                {formatFileSize(totalStorageBytes)}
              </span>
              <span className="text-ink/50 text-[11px] ml-1.5 font-medium">
                ({documents.length} encrypted {documents.length === 1 ? 'file' : 'files'})
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenTools('cleaner');
              }}
              className="text-[11px] font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 hover:underline"
            >
              <Sparkles className="w-3 h-3" /> Clean Vault
            </button>
          </div>

          {/* Segmented Category Progress Bar */}
          <div className="w-full h-2 rounded-full bg-surface-3 overflow-hidden flex shadow-inner">
            <div
              className="bg-sky-500 h-full transition-all duration-300"
              style={{ width: `${storageBreakdown.images.pct}%` }}
              title={`Images: ${formatFileSize(storageBreakdown.images.bytes)}`}
            />
            <div
              className="bg-rose-500 h-full transition-all duration-300"
              style={{ width: `${storageBreakdown.pdfs.pct}%` }}
              title={`PDFs: ${formatFileSize(storageBreakdown.pdfs.bytes)}`}
            />
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${storageBreakdown.sheets.pct}%` }}
              title={`Spreadsheets: ${formatFileSize(storageBreakdown.sheets.bytes)}`}
            />
            <div
              className="bg-violet-500 h-full transition-all duration-300"
              style={{ width: `${storageBreakdown.other.pct}%` }}
              title={`Other: ${formatFileSize(storageBreakdown.other.bytes)}`}
            />
          </div>

          {/* Category Legend */}
          <div className="grid grid-cols-4 gap-1 mt-2.5 text-[10px] text-ink/60 text-center font-medium">
            <div className="flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              <span>Images</span>
            </div>
            <div className="flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>PDFs</span>
            </div>
            <div className="flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Sheets</span>
            </div>
            <div className="flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
              <span>Other</span>
            </div>
          </div>
        </div>

        {/* Recent Local Activity Stream (Inspired by Internxt Widget SyncInfo) */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="px-2 py-1 text-[11px] font-bold tracking-wider text-ink/40 uppercase">
            Recent Vault Activity
          </div>

          {recentActivities.length === 0 ? (
            <div className="py-8 text-center text-xs text-ink/40">
              <FolderOpen className="w-8 h-8 mx-auto text-ink/20 mb-2" />
              No documents stored yet
            </div>
          ) : (
            recentActivities.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-2 rounded-2xl hover:bg-surface-2 transition-colors group"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                  <div className="w-8 h-8 rounded-xl bg-surface-2 border border-line grid place-items-center shrink-0">
                    {getFileIcon(doc)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-ink truncate" title={doc.name}>
                      {doc.name}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-ink/45">
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>•</span>
                      <span>{formatReadableDate(doc.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-pine-50 dark:bg-pine-950/60 text-pine-700 dark:text-pine-300 border border-pine-200/60 dark:border-pine-800/60 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-pine-600" /> Secured
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Action Footer (Inspired by Internxt SyncAction) */}
        <div className="p-3 border-t border-line bg-surface-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenTools('scanner');
            }}
            className="flex-1 py-2 px-3 rounded-xl bg-surface hover:bg-moss border border-line text-xs font-bold text-ink flex items-center justify-center gap-1.5 transition-all shadow-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-pine-600" />
            <span>Integrity Scan</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenTools('storage');
            }}
            className="py-2 px-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all shadow-xs"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Drive Tools</span>
          </button>
        </div>
      </div>
    </>
  );
};
