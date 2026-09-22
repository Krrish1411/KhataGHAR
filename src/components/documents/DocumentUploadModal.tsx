import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { useVault } from '../../context/VaultContext';
import { formatFileSize } from '../../utils/formatters';
import { processFileForVault } from '../../utils/imageCompressor';
import type { LinkedEntityType } from '../../types';
import {
  FolderLock,
  Upload,
  FileText,
  CheckCircle2,
  Zap,
  ShieldCheck,
  Loader2,
  Folder,
} from 'lucide-react';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultLinkedType?: LinkedEntityType;
  defaultLinkedId?: string;
  defaultFolderId?: string;
}

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  defaultLinkedType = 'none',
  defaultLinkedId,
  defaultFolderId,
}) => {
  const {
    addDocument,
    assets,
    liabilities,
    accounts,
    goals,
    peopleLedger,
    transactions,
    documentFolders,
  } = useVault();

  const [name, setName] = useState('');
  const [folderId, setFolderId] = useState(defaultFolderId || 'unfiled');
  const [linkedType, setLinkedType] = useState<LinkedEntityType>(defaultLinkedType);
  const [linkedId, setLinkedId] = useState(defaultLinkedId || '');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [fileDataUrl, setFileDataUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string | undefined>();
  const [fileType, setFileType] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [fileName, setFileName] = useState('');
  const [isUncompressed, setIsUncompressed] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`File size (${formatFileSize(file.size)}) exceeds maximum allowed size of 50MB`);
      return;
    }

    setError('');
    setIsProcessingFile(true);

    try {
      setFileName(file.name);
      if (!name) {
        setName(file.name.replace(/\.[^/.]+$/, ''));
      }

      const processed = await processFileForVault(file, isUncompressed);
      setFileDataUrl(processed.dataUrl);
      setThumbnailUrl(processed.thumbnailUrl);
      setFileSize(processed.fileSize);
      setFileType(processed.fileType);
    } catch (err: any) {
      setError(err?.message || 'Failed to process file');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a document title');
      return;
    }
    if (!fileDataUrl) {
      setError('Please select a file to attach');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      await addDocument(
        {
          name: name.trim(),
          fileType,
          fileSize,
          folderId,
          thumbnailUrl,
          notes: notes.trim() || undefined,
          linkedType,
          linkedId: linkedType !== 'none' ? linkedId : undefined,
          expiryDate: expiryDate || undefined,
          isUncompressed,
        },
        fileDataUrl,
        { isUncompressed }
      );
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to encrypt and store document');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-ink">
          <FolderLock className="w-5 h-5 text-pine-600" />
          <span>Upload Encrypted Document</span>
        </div>
      }
      description="Store policy PDFs, receipts, deeds, or warranties (saved encrypted into SQLite vault)"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Compression Quality Mode Toggle */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-moss/70 border border-line text-xs">
          <span className="font-semibold text-ink/70">Storage Mode:</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsUncompressed(false)}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                !isUncompressed
                  ? 'bg-card text-pine-700 dark:text-pine-300 font-bold shadow-2xs'
                  : 'text-ink/60 hover:text-ink'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-pine-600" />
              <span>Smart Optimized</span>
            </button>
            <button
              type="button"
              onClick={() => setIsUncompressed(true)}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                isUncompressed
                  ? 'bg-card text-amber-700 dark:text-amber-400 font-bold shadow-2xs'
                  : 'text-ink/60 hover:text-ink'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>Original RAW</span>
            </button>
          </div>
        </div>

        {/* File input area */}
        <div className="border-2 border-dashed border-line rounded-2xl p-4 text-center hover:border-pine-400 transition-colors bg-moss/20">
          <input
            type="file"
            id="doc-file-input"
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt"
          />
          <label htmlFor="doc-file-input" className="cursor-pointer space-y-2 block">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-pine-100 dark:bg-pine-900/60 text-pine-600">
              <Upload className="w-5 h-5" />
            </div>
            <div className="text-xs text-ink">
              <span className="font-bold text-pine-600">Click to select</span> or drag and drop
            </div>
            <p className="text-[11px] text-ink/40">PDF, Images, Documents up to 50MB</p>
          </label>

          {isProcessingFile && (
            <div className="mt-2 flex items-center justify-center gap-2 text-xs text-pine-600 font-semibold">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Processing file & generating thumbnail...</span>
            </div>
          )}

          {fileName && !isProcessingFile && (
            <div className="mt-3 flex items-center justify-center gap-2 p-2 bg-card rounded-xl text-xs font-medium text-ink border border-line">
              <FileText className="w-4 h-4 text-pine-600" />
              <span className="truncate max-w-[200px]">{fileName}</span>
              <span className="text-ink/40">({formatFileSize(fileSize)})</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
          )}
        </div>

        <Input
          label="Document Name / Title"
          placeholder="e.g. Life Insurance Policy Bond 2026, Vehicle RC Card"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Target Folder */}
          <div>
            <label className="text-xs font-bold text-ink flex items-center gap-1 mb-1">
              <Folder className="w-3 h-3 text-pine-600" />
              <span>Destination Folder</span>
            </label>
            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs font-semibold text-ink outline-none focus:border-pine-500 cursor-pointer"
            >
              {documentFolders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Expiry / Renewal Date */}
          <Input
            type="date"
            label="Expiry / Renewal Date (Optional)"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
          />
        </div>

        {/* Link to Entity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Link to Entity (Optional)"
            value={linkedType}
            onChange={(e) => {
              const newType = e.target.value as LinkedEntityType;
              setLinkedType(newType);
              setLinkedId('');
            }}
            options={[
              { value: 'none', label: 'Standalone / Unlinked' },
              { value: 'transaction', label: 'Link to Transaction' },
              { value: 'asset', label: 'Link to Asset / Investment' },
              { value: 'liability', label: 'Link to Loan / Liability' },
              { value: 'goal', label: 'Link to Savings Goal' },
              { value: 'people', label: 'Link to Person / Khatabook' },
              { value: 'account', label: 'Link to Bank / Cash Account' },
            ]}
          />

          {linkedType === 'transaction' && (
            <Select
              label="Select Transaction"
              value={linkedId}
              onChange={(e) => setLinkedId(e.target.value)}
              options={[
                { value: '', label: 'Select Transaction...' },
                ...transactions.slice(0, 30).map((t) => ({
                  value: t.id,
                  label: `${t.date} — ${t.type.toUpperCase()}: ${t.currency} ${t.amount}`,
                })),
              ]}
            />
          )}

          {linkedType === 'asset' && (
            <Select
              label="Select Asset"
              value={linkedId}
              onChange={(e) => setLinkedId(e.target.value)}
              options={[
                { value: '', label: 'Select Asset...' },
                ...assets.map((a) => ({ value: a.id, label: a.name })),
              ]}
            />
          )}

          {linkedType === 'liability' && (
            <Select
              label="Select Loan / Liability"
              value={linkedId}
              onChange={(e) => setLinkedId(e.target.value)}
              options={[
                { value: '', label: 'Select Loan...' },
                ...liabilities.map((l) => ({ value: l.id, label: l.name })),
              ]}
            />
          )}

          {linkedType === 'goal' && (
            <Select
              label="Select Goal"
              value={linkedId}
              onChange={(e) => setLinkedId(e.target.value)}
              options={[
                { value: '', label: 'Select Goal...' },
                ...goals.map((g) => ({ value: g.id, label: g.name })),
              ]}
            />
          )}

          {linkedType === 'people' && (
            <Select
              label="Select Person"
              value={linkedId}
              onChange={(e) => setLinkedId(e.target.value)}
              options={[
                { value: '', label: 'Select Contact...' },
                ...peopleLedger.map((p) => ({
                  value: p.id,
                  label: `${p.contactName} (${p.type})`,
                })),
              ]}
            />
          )}

          {linkedType === 'account' && (
            <Select
              label="Select Account"
              value={linkedId}
              onChange={(e) => setLinkedId(e.target.value)}
              options={[
                { value: '', label: 'Select Account...' },
                ...accounts.map((a) => ({ value: a.id, label: a.name })),
              ]}
            />
          )}
        </div>

        <Input
          label="Notes / Description (Optional)"
          placeholder="e.g. Policy bond copy, original paper deed in safe locker"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isUploading}
            disabled={!fileDataUrl || isProcessingFile}
          >
            Encrypt & Save Document
          </Button>
        </div>
      </form>
    </Modal>
  );
};
