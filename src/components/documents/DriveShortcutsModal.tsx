import React from 'react';
import { Modal } from '../common/Modal';
import { Keyboard, Search, FolderPlus, Upload, Eye, Trash2, SlidersHorizontal, Star, CornerDownLeft, ArrowUpDown } from 'lucide-react';

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
        { key: '/', desc: 'Focus instant search bar', icon: <Search className="w-3.5 h-3.5" /> },
        { key: '↑ / ↓ / ← / →', desc: 'Navigate files & folders', icon: <ArrowUpDown className="w-3.5 h-3.5" /> },
        { key: 'Enter / Space', desc: 'Open & preview selected file (or enter folder)', icon: <CornerDownLeft className="w-3.5 h-3.5" /> },
        { key: 'Backspace', desc: 'Go back to parent folder', icon: <CornerDownLeft className="w-3.5 h-3.5" /> },
        { key: 'Esc', desc: 'Clear selection / close details panel', icon: <SlidersHorizontal className="w-3.5 h-3.5" /> },
      ],
    },
    {
      category: 'Actions & Management',
      shortcuts: [
        { key: 'N', desc: 'Create new folder', icon: <FolderPlus className="w-3.5 h-3.5" /> },
        { key: 'U', desc: 'Upload document / attachment', icon: <Upload className="w-3.5 h-3.5" /> },
        { key: 'Delete', desc: 'Delete selected document', icon: <Trash2 className="w-3.5 h-3.5" /> },
        { key: 'S', desc: 'Star / unstar document', icon: <Star className="w-3.5 h-3.5" /> },
        { key: 'Ctrl + A', desc: 'Select all visible files', icon: <Eye className="w-3.5 h-3.5" /> },
      ],
    },
    {
      category: 'View & Display',
      shortcuts: [
        { key: 'V', desc: 'Toggle Grid / List view', icon: <SlidersHorizontal className="w-3.5 h-3.5" /> },
        { key: 'I', desc: 'Toggle right details inspector panel', icon: <Eye className="w-3.5 h-3.5" /> },
        { key: '?', desc: 'Open this keyboard shortcuts dialog', icon: <Keyboard className="w-3.5 h-3.5" /> },
      ],
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200/60 dark:border-brand-800/40 grid place-items-center text-brand-600">
            <Keyboard className="w-4 h-4" />
          </div>
          <span>Storage & Drive Keyboard Shortcuts</span>
        </div>
      }
      description="Quickly navigate, preview, and organize your encrypted documents like a power user"
      maxWidth="md"
    >
      <div className="space-y-5 py-1">
        {shortcutGroups.map((group) => (
          <div key={group.category} className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink/50 px-1">
              {group.category}
            </h4>
            <div className="divide-y divide-line/60 rounded-2xl border border-line bg-surface/50 overflow-hidden">
              {group.shortcuts.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-3 text-xs hover:bg-moss/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5 text-ink">
                    <span className="text-ink/40">{item.icon}</span>
                    <span>{item.desc}</span>
                  </div>
                  <kbd className="px-2.5 py-1 bg-surface-2 border border-line rounded-lg font-mono text-[11px] font-semibold text-ink shadow-xs">
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="p-3 bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800/60 rounded-xl text-[11px] text-brand-700 dark:text-brand-300">
          💡 <strong>Pro-Tip:</strong> Shortcuts are automatically paused when your cursor is inside any text input or search bar so you can type freely.
        </div>
      </div>
    </Modal>
  );
};
