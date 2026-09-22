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
  { hex: '#10b981', label: 'Emerald' },
  { hex: '#059669', label: 'Pine' },
  { hex: '#14b8a6', label: 'Teal' },
  { hex: '#06b6d4', label: 'Cyan' },
  { hex: '#0ea5e9', label: 'Sky' },
  { hex: '#3b82f6', label: 'Blue' },
  { hex: '#6366f1', label: 'Indigo' },
  { hex: '#8b5cf6', label: 'Violet' },
  { hex: '#a855f7', label: 'Purple' },
  { hex: '#ec4899', label: 'Pink' },
  { hex: '#f43f5e', label: 'Rose' },
  { hex: '#ef4444', label: 'Red' },
  { hex: '#f97316', label: 'Orange' },
  { hex: '#f59e0b', label: 'Amber' },
  { hex: '#84cc16', label: 'Lime' },
  { hex: '#64748b', label: 'Slate' },
];

const ICON_CATEGORIES = [
  {
    id: 'financial',
    label: 'Finance',
    icons: ['🏦', '💳', '🧾', '💰', '🪙', '📈', '📊', '⚖️', '💸'],
  },
  {
    id: 'property',
    label: 'Assets',
    icons: ['🏠', '🏢', '🚗', '🏍️', '💎', '🔑', '🚜', '📦', '🛥️'],
  },
  {
    id: 'legal',
    label: 'Legal & KYC',
    icons: ['📜', '📑', '🪪', '🛡️', '✍️', '🏛️', '📋', '🔒', '🏷️'],
  },
  {
    id: 'work',
    label: 'Tax & Work',
    icons: ['💼', '🗂️', '👔', '🧮', '📉', '🗃️', '📁', '📂', '✉️'],
  },
  {
    id: 'personal',
    label: 'Family & Life',
    icons: ['🩺', '💊', '🎓', '👨‍👩‍👦', '✈️', '🎁', '🏖️', '🐾', '🎨'],
  },
];

export const DocumentFolderModal: React.FC<DocumentFolderModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const { addDocumentFolder } = useVault();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📁');
  const [color, setColor] = useState(FOLDER_COLORS[0].hex);
  const [activeCategory, setActiveCategory] = useState('financial');
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

  const currentCategoryIcons =
    ICON_CATEGORIES.find((c) => c.id === activeCategory)?.icons || ICON_CATEGORIES[0].icons;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-ink">
          <FolderPlus className="w-5 h-5 text-brand-600" />
          <span>New Document Folder</span>
        </div>
      }
      description="Create a categorized vault folder with custom theme color and iconography"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Live Folder Preview */}
        <div className="p-3.5 rounded-2xl bg-surface-2 border border-line flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl grid place-items-center text-2xl shadow-xs transition-colors shrink-0"
              style={{ backgroundColor: `${color}20`, color: color }}
            >
              <span>{icon}</span>
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-ink block truncate max-w-[240px]">
                {name.trim() || 'Folder Name Preview'}
              </span>
              <span className="text-[10px] text-ink/40 font-mono">0 files • Sovereign Vault</span>
            </div>
          </div>
          <span className="text-[10px] font-bold text-ink/40 px-2 py-1 rounded-lg bg-surface border border-line shrink-0">
            Live Preview
          </span>
        </div>

        <Input
          label="Folder Name"
          placeholder="e.g. Reliance Receipts, Flat Deeds, Health Cards"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        {/* Accent Color Palette */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-ink">Accent Color</label>
            <span className="text-[11px] font-mono text-ink/40">
              {FOLDER_COLORS.find((c) => c.hex === color)?.label || color}
            </span>
          </div>
          <div className="grid grid-cols-8 gap-2 p-2 rounded-2xl bg-surface-2/50 border border-line/60">
            {FOLDER_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => setColor(c.hex)}
                className={`w-7 h-7 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                  color === c.hex
                    ? 'scale-115 ring-2 ring-offset-2 ring-brand-500 shadow-xs'
                    : 'hover:scale-105 opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.label}
              />
            ))}
          </div>
        </div>

        {/* Comprehensive Categorized Icon Pack */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-ink">Folder Icon</label>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-ink/40">Custom:</span>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                maxLength={4}
                className="w-10 text-center text-sm py-0.5 rounded-lg border border-line bg-card text-ink outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1">
            {ICON_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all shrink-0 cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-brand-500/10 text-brand-600 font-bold border border-brand-500/20 shadow-2xs'
                    : 'text-ink/60 hover:bg-surface-2 hover:text-ink'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Category Icon Grid */}
          <div className="grid grid-cols-9 gap-1.5 p-2 rounded-2xl bg-surface-2/50 border border-line/60">
            {currentCategoryIcons.map((emo) => (
              <button
                key={emo}
                type="button"
                onClick={() => setIcon(emo)}
                className={`w-8 h-8 rounded-xl text-base grid place-items-center cursor-pointer transition-all ${
                  icon === emo
                    ? 'bg-brand-500/20 border border-brand-500 scale-110 shadow-xs'
                    : 'hover:bg-surface text-ink/80'
                }`}
              >
                {emo}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl border border-line bg-card hover:bg-moss text-ink text-xs font-semibold cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-all shadow-xs active:scale-[0.98]"
          >
            {isSubmitting ? 'Creating...' : 'Create Folder'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
