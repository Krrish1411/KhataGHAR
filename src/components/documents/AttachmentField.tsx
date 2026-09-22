import React, { useState, useRef } from 'react';
import { formatFileSize } from '../../utils/formatters';
import { processFileForVault } from '../../utils/imageCompressor';
import { DocumentHubPickerModal } from './DocumentHubPickerModal';
import type { LinkedEntityType, DocumentRecord } from '../../types';
import {
  Paperclip,
  Upload,
  FolderLock,
  X,
  FileText,
  Image as ImageIcon,
  Zap,
  ShieldCheck,
  Loader2,
} from 'lucide-react';

export interface AttachmentItem {
  id?: string; // Document ID if saved in Document Hub
  name: string;
  dataUrl: string;
  thumbnailUrl?: string;
  fileSize: number;
  fileType: string;
  isUncompressed?: boolean;
  isExistingHubDoc?: boolean;
}

interface AttachmentFieldProps {
  label?: string;
  description?: string;
  attachments: AttachmentItem[];
  onChange: (items: AttachmentItem[]) => void;
  entityType?: LinkedEntityType;
  defaultFolderId?: string;
}

export const AttachmentField: React.FC<AttachmentFieldProps> = ({
  label = 'Receipts & Document Attachments',
  description = 'Attach bills, invoices, sanction letters, or deeds (saved encrypted into Document Hub)',
  attachments,
  onChange,
  defaultFolderId,
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUncompressed, setIsUncompressed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const newItems: AttachmentItem[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const processed = await processFileForVault(file, isUncompressed);
        newItems.push({
          name: file.name,
          dataUrl: processed.dataUrl,
          thumbnailUrl: processed.thumbnailUrl,
          fileSize: processed.fileSize,
          fileType: processed.fileType,
          isUncompressed: processed.isUncompressed,
          isExistingHubDoc: false,
        });
      }
      onChange([...attachments, ...newItems]);
    } catch (err) {
      console.error('Failed to process attachments:', err);
      alert('Could not process selected files. Please try again.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = (index: number) => {
    const updated = attachments.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleHubSelect = (selectedDocs: DocumentRecord[]) => {
    const existingIds = new Set(attachments.map((a) => a.id).filter(Boolean));
    const itemsToAdd: AttachmentItem[] = selectedDocs
      .filter((d) => !existingIds.has(d.id))
      .map((d) => ({
        id: d.id,
        name: d.name,
        dataUrl: d.dataUrl || '',
        thumbnailUrl: d.thumbnailUrl,
        fileSize: d.fileSize,
        fileType: d.fileType,
        isUncompressed: d.isUncompressed,
        isExistingHubDoc: true,
      }));

    onChange([...attachments, ...itemsToAdd]);
  };

  return (
    <div className="space-y-2.5 pt-1">
      {/* Section Header with Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
        <div>
          <label className="text-xs font-bold text-ink flex items-center gap-1.5">
            <Paperclip className="w-3.5 h-3.5 text-pine-600" />
            <span>{label}</span>
            {attachments.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-pine-100 dark:bg-pine-900/60 text-pine-700 dark:text-pine-300 font-mono text-[10px] font-bold">
                {attachments.length}
              </span>
            )}
          </label>
          {description && <p className="text-[11px] text-ink/45 mt-0.5">{description}</p>}
        </div>

        {/* Compression Quality Selector Pill */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-moss p-0.5 rounded-xl border border-line text-[11px]">
          <button
            type="button"
            onClick={() => setIsUncompressed(false)}
            className={`px-2 py-1 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-all ${
              !isUncompressed
                ? 'bg-card text-pine-700 dark:text-pine-300 shadow-2xs font-bold'
                : 'text-ink/60 hover:text-ink'
            }`}
            title="Auto-optimizes images to sharp 1080p WebP for fast vault loading"
          >
            <Zap className="w-3 h-3 text-pine-600" />
            <span>Smart Compressed</span>
          </button>
          <button
            type="button"
            onClick={() => setIsUncompressed(true)}
            className={`px-2 py-1 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-all ${
              isUncompressed
                ? 'bg-card text-amber-700 dark:text-amber-400 shadow-2xs font-bold'
                : 'text-ink/60 hover:text-ink'
            }`}
            title="Preserves 100% untouched original raw bytes with zero compression"
          >
            <ShieldCheck className="w-3 h-3 text-amber-600" />
            <span>Original RAW</span>
          </button>
        </div>
      </div>

      {/* Upload Dropzone & Hub Picker Bar */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`border border-dashed rounded-2xl p-3 sm:p-4 text-center transition-all ${
          isDragging
            ? 'border-pine-500 bg-pine-50/50 dark:bg-pine-950/30'
            : 'border-line hover:border-pine-400/80 bg-moss/20'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          id="multi-attach-input"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />

        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-1.5 rounded-xl bg-card border border-line hover:bg-moss text-ink text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs active:scale-95"
          >
            {isProcessing ? (
              <Loader2 className="w-3.5 h-3.5 text-pine-600 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5 text-pine-600" />
            )}
            <span>Upload New Files</span>
          </button>

          <span className="text-xs text-ink/30 font-semibold">or</span>

          <button
            type="button"
            onClick={() => setIsPickerOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-card border border-line hover:bg-moss text-pine-700 dark:text-pine-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs active:scale-95"
          >
            <FolderLock className="w-3.5 h-3.5 text-pine-600" />
            <span>Browse Document Hub</span>
          </button>
        </div>

        <p className="text-[11px] text-ink/40 mt-1.5">
          Attach multiple bills, photos, or PDFs • Encrypted at rest in local SQLite / IndexedDB
        </p>
      </div>

      {/* Attached Items Strip */}
      {attachments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {attachments.map((item, idx) => {
            const isImage = item.fileType.startsWith('image/');
            const previewUrl = item.thumbnailUrl || (isImage ? item.dataUrl : undefined);

            return (
              <div
                key={`${item.id || item.name}-${idx}`}
                className="flex items-center justify-between p-2 rounded-xl border border-line bg-card shadow-2xs group hover:border-pine-300 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg overflow-hidden bg-moss border border-line shrink-0 grid place-items-center">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : isImage ? (
                      <ImageIcon className="w-4 h-4 text-pine-600" />
                    ) : (
                      <FileText className="w-4 h-4 text-ink/50" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-ink truncate">{item.name}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-ink/45 mt-0.5">
                      <span>{formatFileSize(item.fileSize)}</span>
                      {item.isExistingHubDoc && (
                        <span className="px-1 rounded bg-pine-100 dark:bg-pine-900/60 text-pine-700 dark:text-pine-300 font-semibold text-[9px]">
                          From Hub
                        </span>
                      )}
                      {item.isUncompressed && (
                        <span className="px-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[9px] uppercase font-bold">
                          RAW
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="p-1 text-ink/40 hover:text-flare-600 rounded-lg cursor-pointer transition-colors shrink-0 ml-1"
                  title="Remove attachment"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Hub Picker Modal */}
      {isPickerOpen && (
        <DocumentHubPickerModal
          isOpen={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          onSelect={handleHubSelect}
          alreadySelectedIds={attachments.map((a) => a.id).filter(Boolean) as string[]}
        />
      )}
    </div>
  );
};
