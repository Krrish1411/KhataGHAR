import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { useVault } from '../../context/VaultContext';
import { formatFileSize } from '../../utils/formatters';
import type { DocumentRecord } from '../../types';
import { FolderLock, Upload, FileText, CheckCircle2 } from 'lucide-react';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultLinkedType?: DocumentRecord['linkedType'];
  defaultLinkedId?: string;
}

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  defaultLinkedType = 'none',
  defaultLinkedId,
}) => {
  const { addDocument, assets, liabilities, accounts } = useVault();

  const [name, setName] = useState('');
  const [linkedType, setLinkedType] = useState<DocumentRecord['linkedType']>(defaultLinkedType);
  const [linkedId, setLinkedId] = useState(defaultLinkedId || '');
  const [expiryDate, setExpiryDate] = useState('');
  const [fileDataUrl, setFileDataUrl] = useState('');
  const [fileType, setFileType] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`File size (${formatFileSize(file.size)}) exceeds maximum allowed size of 50MB`);
      return;
    }

    setError('');
    setFileName(file.name);
    setFileType(file.type || 'application/octet-stream');
    setFileSize(file.size);
    if (!name) {
      setName(file.name.replace(/\.[^/.]+$/, ''));
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      setFileDataUrl(evt.target?.result as string);
    };
    reader.readAsDataURL(file);
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
      await addDocument({
        name: name.trim(),
        fileType,
        fileSize,
        linkedType,
        linkedId: linkedType !== 'none' ? linkedId : undefined,
        expiryDate: expiryDate || undefined,
        dataUrl: fileDataUrl,
      });
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
        <div className="flex items-center gap-2">
          <FolderLock className="w-5 h-5 text-brand-500" />
          <span>Add Encrypted Document</span>
        </div>
      }
      description="Store policy PDFs, receipts, deeds, or warranties (encrypted locally up to 50MB per file)"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* File input area */}
        <div className="border-2 border-dashed border-slate-300 dark:border-navy-700 rounded-2xl p-5 text-center hover:border-brand-500 transition-colors bg-slate-50 dark:bg-navy-800/50">
          <input
            type="file"
            id="doc-file-input"
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt"
          />
          <label htmlFor="doc-file-input" className="cursor-pointer space-y-2 block">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-500/10 text-brand-500">
              <Upload className="w-6 h-6" />
            </div>
            <div className="text-xs text-slate-700 dark:text-slate-300">
              <span className="font-semibold text-brand-600 dark:text-brand-400">Click to upload</span> or drag and drop
            </div>
            <p className="text-[11px] text-slate-400">
              PDF, Images, Word documents up to 50MB
            </p>
          </label>

          {fileName && (
            <div className="mt-3 flex items-center justify-center gap-2 p-2 bg-white dark:bg-navy-750 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200">
              <FileText className="w-4 h-4 text-brand-400" />
              <span>{fileName}</span>
              <span className="text-slate-400">({formatFileSize(fileSize)})</span>
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

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Attach / Link To"
            value={linkedType}
            onChange={(e) => {
              const newType = e.target.value as DocumentRecord['linkedType'];
              setLinkedType(newType);
              setLinkedId('');
            }}
            options={[
              { value: 'none', label: 'Standalone Document' },
              { value: 'asset', label: 'Link to Asset' },
              { value: 'liability', label: 'Link to Liability / Loan' },
              { value: 'account', label: 'Link to Bank Account' },
            ]}
          />

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
              label="Select Liability"
              value={linkedId}
              onChange={(e) => setLinkedId(e.target.value)}
              options={[
                { value: '', label: 'Select Loan...' },
                ...liabilities.map((l) => ({ value: l.id, label: l.name })),
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

          {linkedType === 'none' && (
            <Input
              type="date"
              label="Expiry / Renewal Date (Optional)"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          )}
        </div>

        {linkedType !== 'none' && (
          <Input
            type="date"
            label="Expiry / Renewal Date (Optional)"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
          />
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isUploading} disabled={!fileDataUrl}>
            Encrypt & Save Document
          </Button>
        </div>
      </form>
    </Modal>
  );
};
