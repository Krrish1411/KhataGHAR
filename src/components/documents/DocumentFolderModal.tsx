import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { useVault } from '../../context/VaultContext';
import { FolderPlus } from 'lucide-react';

interface DocumentFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (folderId: string) => void;
}

const FOLDER_COLORS = [
  '#10b981', // Emerald
  '#059669', // Pine
  '#0ea5e9', // Sky
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#64748b', // Slate
];

export const DocumentFolderModal: React.FC<DocumentFolderModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const { addDocumentFolder } = useVault();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📁');
  const [color, setColor] = useState(FOLDER_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a folder name');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const created = await addDocumentFolder({
        name: name.trim(),
        icon,
        color,
      });
      if (onCreated) onCreated(created.id);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create document folder');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-ink">
          <FolderPlus className="w-5 h-5 text-pine-600" />
          <span>New Document Folder</span>
        </div>
      }
      description="Create a custom folder to categorize and organize receipts, deeds, or tax files"
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-bold text-ink">Folder Emoji / Icon</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              maxLength={4}
              className="w-14 text-center text-lg py-1.5 rounded-xl border border-line bg-card text-ink outline-none focus:border-pine-500"
            />
            <div className="flex flex-wrap gap-1">
              {['📁', '🧾', '📜', '📑', '🏦', '🛡️', '🩺', '🚗', '🏠'].map((emo) => (
                <button
                  key={emo}
                  type="button"
                  onClick={() => setIcon(emo)}
                  className={`w-7 h-7 rounded-lg text-sm grid place-items-center cursor-pointer transition-all ${
                    icon === emo
                      ? 'bg-pine-100 dark:bg-pine-900/60 border border-pine-500 scale-110'
                      : 'hover:bg-moss'
                  }`}
                >
                  {emo}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Input
          label="Folder Name"
          placeholder="e.g. Medical Bills, Tax 2026, House Deed"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-ink">Accent Color</label>
          <div className="flex items-center gap-2">
            {FOLDER_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                  color === c ? 'scale-125 ring-2 ring-offset-2 ring-pine-500' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl border border-line bg-card hover:bg-moss text-ink text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="px-4 py-1.5 rounded-xl bg-pine-700 hover:bg-pine-600 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
          >
            {isSubmitting ? 'Creating...' : 'Create Folder'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
