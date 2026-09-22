import React from 'react';
import { Modal } from '../common/Modal';
import {
  Keyboard,
  Search,
  FolderPlus,
  Upload,
  Eye,
  Trash2,
  SlidersHorizontal,
  Star,
  CornerDownLeft,
  ArrowUpDown,
  CheckSquare,
} from 'lucide-react';

interface DriveShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DriveShortcutsModal: React.FC<DriveShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const shortcutGroups = [
    {
      category: 'Navigation & Focus',
      shortcuts: [
        { key: '/', desc: 'Instant search files & folders', icon: <Search className="w-3.5 h-3.5 text-brand-500" /> },
        { key: '↑ / ↓ / ← / →', desc: 'Navigate between files and folders', icon: <ArrowUpDown className="w-3.5 h-3.5 text-brand-500" /> },
        { key: 'Enter / Space', desc: 'Open file preview or navigate into folder', icon: <CornerDownLeft className="w-3.5 h-3.5 text-brand-500" /> },
        { key: 'Backspace', desc: 'Go to parent folder (or delete when selected)', icon: <CornerDownLeft className="w-3.5 h-3.5 text-brand-500" /> },
        { key: 'Esc', desc: 'Clear selection / Close menus and panels', icon: <SlidersHorizontal className="w-3.5 h-3.5 text-brand-500" /> },
      ],
    },
    {
      category: 'Selection & Actions',
      shortcuts: [
        { key: 'Ctrl + A / ⌘ + A', desc: 'Select all visible files in current view', icon: <CheckSquare className="w-3.5 h-3.5 text-brand-500" /> },
        { key: 'S', desc: 'Star / favorite selected document', icon: <Star className="w-3.5 h-3.5 text-amber-500" /> },
        { key: 'Delete', desc: 'Delete selected documents', icon: <Trash2 className="w-3.5 h-3.5 text-rose-500" /> },
        { key: 'N / ⇧ + N', desc: 'Create a new folder', icon: <FolderPlus className="w-3.5 h-3.5 text-amber-500" /> },
        { key: 'U / Ctrl + U', desc: 'Upload file to current folder', icon: <Upload className="w-3.5 h-3.5 text-brand-500" /> },
      ],
    },
    {
      category: 'View & Panels',
      shortcuts: [
        { key: 'V', desc: 'Toggle Grid / List view mode', icon: <SlidersHorizontal className="w-3.5 h-3.5 text-brand-500" /> },
        { key: 'I', desc: 'Toggle details inspector drawer', icon: <Eye className="w-3.5 h-3.5 text-brand-500" /> },
        { key: '?', desc: 'Show this keyboard shortcuts cheat sheet', icon: <Keyboard className="w-3.5 h-3.5 text-brand-500" /> },
      ],
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-500/10 border border-brand-500/20 grid place-items-center text-brand-600 dark:text-brand-400">
            <Keyboard className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-ink leading-tight">Keyboard Shortcuts</h3>
            <p className="text-[11px] text-ink/50 font-normal">Supercharge your document vault navigation</p>
          </div>
        </div>
      }
      maxWidth="md"
    >
      <div className="space-y-4 py-1">
        {shortcutGroups.map((group) => (
          <div key={group.category} className="space-y-1.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-ink/40 px-1">
              {group.category}
            </h4>
            <div className="divide-y divide-line/60 rounded-2xl border border-line bg-surface/40 overflow-hidden shadow-xs">
              {group.shortcuts.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between px-3.5 py-2.5 text-xs hover:bg-moss/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5 text-ink">
                    <span className="shrink-0">{item.icon}</span>
                    <span className="font-medium">{item.desc}</span>
                  </div>
                  <kbd className="px-2.5 py-1 bg-surface-2 border border-line rounded-lg font-mono text-[11px] font-semibold text-ink shadow-2xs whitespace-nowrap">
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="p-3 bg-brand-50/70 dark:bg-brand-950/40 border border-brand-200/80 dark:border-brand-800/60 rounded-2xl text-[11px] text-brand-800 dark:text-brand-300 flex items-center gap-2">
          <span>⚡</span>
          <span>
            <strong>Smart Context:</strong> Shortcuts are automatically paused whenever you are typing in search or input fields.
          </span>
        </div>
      </div>
    </Modal>
  );
};
