import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useVault } from '../context/VaultContext';
import { usePrivacy } from '../context/PrivacyContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { processAttachmentFile } from '../utils/compression';
import { formatReadableDate } from '../utils/dates';
import type { VaultNote, NoteFolder, NoteAttachment } from '../types';
import {
  StickyNote,
  Folder,
  FolderPlus,
  Search,
  Pin,
  PinOff,
  Trash2,
  Plus,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  Download,
  Eye,
  Edit3,
  Lock,
  CheckCircle2,
  Tag,
  ChevronLeft,
  ChevronDown,
  Paperclip,
  Info,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  X,
} from 'lucide-react';
import { IconRenderer } from '../components/common/IconRenderer';

const NOTE_COLORS = [
  { name: 'Default', value: '#64748b' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Sky', value: '#0284c7' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Rose', value: '#ef4444' },
];

export const NotesView: React.FC = () => {
  const { notes, folders, addNote, updateNote, deleteNote, addFolder, deleteFolder } = useVault();
  const { isPrivacyMode } = usePrivacy();

  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // Editor states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [folderId, setFolderId] = useState('general');
  const [isPinned, setIsPinned] = useState(false);
  const [color, setColor] = useState('#64748b');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [attachments, setAttachments] = useState<NoteAttachment[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [compressionStatus, setCompressionStatus] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSaved, setIsSaved] = useState(true);

  // Modal for new folder
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderIcon, setNewFolderIcon] = useState('📁');

  // Mobile navigation between list and editor
  const [mobileView, setMobileView] = useState<'list' | 'editor'>('list');

  // Preview attachment modal
  const [viewingAttachment, setViewingAttachment] = useState<NoteAttachment | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isFolderMenuOpen, setIsFolderMenuOpen] = useState(false);
  const folderMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (folderMenuRef.current && !folderMenuRef.current.contains(e.target as Node)) {
        setIsFolderMenuOpen(false);
      }
    };
    if (isFolderMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFolderMenuOpen]);

  // Combined system & custom folders
  const allFolders = useMemo(() => {
    return folders;
  }, [folders]);

  const currentFolder = useMemo(() => {
    return allFolders.find((f) => f.id === folderId) || allFolders[0] || { id: 'general', name: 'Personal Memos', icon: 'Sparkles' };
  }, [allFolders, folderId]);

  // Filter notes based on folder & search
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      if (selectedFolderId === 'pinned' && !n.isPinned) return false;
      if (selectedFolderId !== 'all' && selectedFolderId !== 'pinned' && n.folderId !== selectedFolderId) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = n.title.toLowerCase().includes(q);
        const matchesContent = n.content.toLowerCase().includes(q);
        const matchesTags = (n.tags || []).some((t) => t.toLowerCase().includes(q));
        return matchesTitle || matchesContent || matchesTags;
      }
      return true;
    }).sort((a, b) => {
      // Pinned notes first, then latest updated
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [notes, selectedFolderId, searchQuery]);

  // Load selected note into editor
  const activeNote = useMemo(() => {
    return notes.find((n) => n.id === selectedNoteId) || null;
  }, [notes, selectedNoteId]);

  useEffect(() => {
    if (activeNote) {
      setTitle(activeNote.title);
      setContent(activeNote.content);
      setFolderId(activeNote.folderId || 'general');
      setIsPinned(activeNote.isPinned || false);
      setColor(activeNote.color || '#64748b');
      setTags(activeNote.tags || []);
      setAttachments(activeNote.attachments || []);
      setCompressionStatus(null);
      setIsSaved(true);
    } else if (notes.length > 0 && !selectedNoteId) {
      // Auto-select first note on desktop
      setSelectedNoteId(notes[0].id);
    }
  }, [activeNote]);

  // Auto-save debounced handler
  const saveTimeoutRef = useRef<any>(null);

  const triggerSave = (updates: Partial<VaultNote>) => {
    if (!activeNote) return;
    setIsSaved(false);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await updateNote({
          ...activeNote,
          title,
          content,
          folderId,
          isPinned,
          color,
          tags,
          attachments,
          ...updates,
        });
        setIsSaved(true);
      } catch (err) {
        console.error('Failed to auto-save note:', err);
      }
    }, 600);
  };

  const handleCreateNewNote = async () => {
    try {
      const newNote = await addNote({
        title: 'Untitled Financial Note',
        content: '',
        folderId: selectedFolderId === 'all' || selectedFolderId === 'pinned' ? 'general' : selectedFolderId,
        isPinned: false,
        tags: [],
        color: '#64748b',
        attachments: [],
      });
      setSelectedNoteId(newNote.id);
      setTitle(newNote.title);
      setContent('');
      setTags([]);
      setAttachments([]);
      setMobileView('editor');
      setIsSaved(true);
    } catch (err) {
      console.error('Failed to create note:', err);
    }
  };

  const handleDeleteCurrentNote = async () => {
    if (!activeNote) return;
    if (window.confirm(`Delete "${activeNote.title || 'Untitled Note'}" permanently?`)) {
      await deleteNote(activeNote.id);
      const remaining = notes.filter((n) => n.id !== activeNote.id);
      if (remaining.length > 0) {
        setSelectedNoteId(remaining[0].id);
      } else {
        setSelectedNoteId(null);
      }
      setMobileView('list');
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      const created = await addFolder({
        name: newFolderName.trim(),
        icon: newFolderIcon,
      });
      setSelectedFolderId(created.id);
      setNewFolderName('');
      setIsNewFolderOpen(false);
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = tagInput.trim().replace(/^#/, '');
      if (trimmed && !tags.includes(trimmed)) {
        const nextTags = [...tags, trimmed];
        setTags(nextTags);
        setTagInput('');
        triggerSave({ tags: nextTags });
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const nextTags = tags.filter((t) => t !== tagToRemove);
    setTags(nextTags);
    triggerSave({ tags: nextTags });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingFile(true);
    setCompressionStatus('Analyzing and encrypting attachment…');

    try {
      const newAttachments: NoteAttachment[] = [...attachments];
      let lastMessage = '';

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const processed = await processAttachmentFile(file);
        lastMessage = processed.message;

        newAttachments.push({
          id: 'att-' + Math.random().toString(36).substring(2, 9),
          name: processed.fileName,
          type: processed.type,
          dataUrl: processed.dataUrl,
          size: processed.finalSize,
          mimeType: processed.mimeType,
          wasCompressed: processed.wasCompressed,
          createdAt: new Date().toISOString(),
        });
      }

      setAttachments(newAttachments);
      setCompressionStatus(lastMessage);
      triggerSave({ attachments: newAttachments });
    } catch (err: any) {
      setCompressionStatus('Error processing attachment: ' + (err?.message || 'Unknown'));
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (id: string) => {
    const nextAtt = attachments.filter((a) => a.id !== id);
    setAttachments(nextAtt);
    triggerSave({ attachments: nextAtt });
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-black text-2xl sm:text-3xl text-ink tracking-tight">
              Encrypted Financial Notes
            </h1>
            <span className="p-1 px-2.5 rounded-full bg-pine-50 dark:bg-pine-950/60 border border-pine-200 dark:border-pine-800 text-pine-700 dark:text-pine-300 text-xs font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Zero Knowledge Vault</span>
            </span>
          </div>
          <p className="text-xs text-ink/60 mt-0.5">
            Store property deed notes, tax memos, audit reminders, and strategy papers encrypted using your active vault session
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsNewFolderOpen(true)}
            variant="outline"
            size="sm"
          >
            <FolderPlus className="w-3.5 h-3.5 mr-1" />
            <span>New Folder</span>
          </Button>
          <Button
            onClick={handleCreateNewNote}
            variant="primary"
            size="sm"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>New Note</span>
          </Button>
        </div>
      </div>

      {/* 4 Top KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-card border border-line shadow-xs space-y-1 lift">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink/50">Total Notes</span>
            <div className="w-7 h-7 rounded-xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 grid place-items-center text-pine-600">
              <StickyNote className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black font-display text-ink tracking-tight">
            {notes.length}
          </div>
          <p className="text-[10.5px] text-ink/40 truncate">
            {notes.reduce((acc, n) => acc + (n.attachments?.length || 0), 0)} attachments secured
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-line shadow-xs space-y-1 lift">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink/50">Folders</span>
            <div className="w-7 h-7 rounded-xl bg-skyx-50 dark:bg-skyx-950/40 border border-skyx-200/60 dark:border-skyx-800/40 grid place-items-center text-skyx-600">
              <Folder className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black font-display text-ink tracking-tight">
            {allFolders.length}
          </div>
          <p className="text-[10.5px] text-ink/40 truncate">
            Organized categories
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-line shadow-xs space-y-1 lift">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink/50">Pinned Memos</span>
            <div className="w-7 h-7 rounded-xl bg-mari-50 dark:bg-mari-950/40 border border-mari-200/60 dark:border-mari-800/40 grid place-items-center text-mari-600">
              <Pin className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black font-display text-ink tracking-tight">
            {notes.filter((n) => n.isPinned).length}
          </div>
          <p className="text-[10.5px] text-ink/40 truncate">
            Priority quick-access memos
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-line shadow-xs space-y-1 lift">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink/50">Security</span>
            <div className="w-7 h-7 rounded-xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 grid place-items-center text-pine-600">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black font-display text-ink tracking-tight">
            AES-GCM
          </div>
          <p className="text-[10.5px] text-ink/40 truncate">
            Zero-Knowledge encrypted
          </p>
        </div>
      </div>

      {/* 3-Pane Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-275px)] min-h-[540px]">
        {/* Pane 1: Folders Sidebar (2.5 Cols) */}
        <div className="hidden lg:flex lg:col-span-3 flex-col bg-card rounded-2xl border border-line p-3 space-y-3 shadow-xs">
          <div className="flex items-center justify-between px-2 pt-1 text-xs font-bold text-ink/50 uppercase tracking-wider">
            <span>Folders</span>
            <button
              onClick={() => setIsNewFolderOpen(true)}
              className="hover:text-pine-600 transition-colors cursor-pointer"
              title="Add Custom Folder"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {/* All Notes item */}
            <button
              onClick={() => setSelectedFolderId('all')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedFolderId === 'all'
                  ? 'bg-pine-50 dark:bg-pine-950/60 text-pine-700 dark:text-pine-300 font-bold shadow-2xs'
                  : 'text-ink/70 hover:bg-moss hover:text-ink'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <StickyNote className="w-4 h-4 text-pine-600 shrink-0" />
                <span className="truncate">All Notes</span>
              </div>
              <span className="text-[11px] font-mono text-ink/40 tabular-nums">
                {notes.length}
              </span>
            </button>

            {/* Pinned item */}
            <button
              onClick={() => setSelectedFolderId('pinned')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedFolderId === 'pinned'
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold shadow-2xs'
                  : 'text-ink/70 hover:bg-moss hover:text-ink'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Pin className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="truncate">Pinned Notes</span>
              </div>
              <span className="text-[11px] font-mono text-ink/40 tabular-nums">
                {notes.filter((n) => n.isPinned).length}
              </span>
            </button>

            <div className="pt-2 pb-1 px-2 border-t border-line/60 text-[10.5px] font-bold text-ink/40 uppercase tracking-wider">
              Categories
            </div>

            {/* Folder list */}
            {allFolders.map((f) => {
              const count = notes.filter((n) => n.folderId === f.id).length;
              const isSelected = selectedFolderId === f.id;

              return (
                <div key={f.id} className="group relative flex items-center">
                  <button
                    onClick={() => setSelectedFolderId(f.id)}
                    className={`flex-1 flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-pine-50 dark:bg-pine-950/60 text-pine-700 dark:text-pine-300 font-bold shadow-2xs'
                        : 'text-ink/70 hover:bg-moss hover:text-ink'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="shrink-0 text-pine-600 dark:text-pine-400">
                        <IconRenderer name={f.icon || 'Folder'} className="w-3.5 h-3.5" />
                      </span>
                      <span className="truncate">{f.name}</span>
                    </div>
                    <span className="text-[11px] font-mono text-ink/40 tabular-nums">
                      {count}
                    </span>
                  </button>

                  {!f.isDefault && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete folder "${f.name}"? Notes inside will move to General.`)) {
                          deleteFolder(f.id);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-ink/40 hover:text-flare-600 transition-opacity ml-1"
                      title="Delete folder"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-line text-[11px] text-ink/45 flex items-center gap-1.5 px-1">
            <Lock className="w-3.5 h-3.5 text-pine-600 shrink-0" />
            <span>AES-256-GCM encrypted notes</span>
          </div>
        </div>

        {/* Pane 2: Notes List (3.5 Cols on desktop, full on mobile list) */}
        <div
          className={`lg:col-span-3 flex flex-col bg-card rounded-2xl border border-line p-3 space-y-3 shadow-xs ${
            mobileView === 'editor' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-ink/40 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search notes, tags, content…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-navy-900 rounded-xl border border-line text-xs font-semibold text-ink placeholder:text-ink/35 outline-none focus:border-pine-500"
            />
          </div>

          {/* Folder tabs for mobile */}
          <div className="flex lg:hidden overflow-x-auto gap-1.5 pb-1">
            <button
              onClick={() => setSelectedFolderId('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ${
                selectedFolderId === 'all'
                  ? 'bg-pine-600 text-white'
                  : 'bg-slate-100 dark:bg-navy-900 text-ink/60'
              }`}
            >
              All Notes ({notes.length})
            </button>
            <button
              onClick={() => setSelectedFolderId('pinned')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ${
                selectedFolderId === 'pinned'
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-100 dark:bg-navy-900 text-ink/60'
              }`}
            >
              📌 Pinned
            </button>
            {allFolders.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFolderId(f.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                  selectedFolderId === f.id
                    ? 'bg-pine-600 text-white'
                    : 'bg-slate-100 dark:bg-navy-900 text-ink/60'
                }`}
              >
                <IconRenderer name={f.icon || 'Folder'} className="w-3.5 h-3.5" />
                <span>{f.name}</span>
              </button>
            ))}
          </div>

          {/* Notes Cards List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredNotes.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <StickyNote className="w-8 h-8 text-ink/30 mx-auto" />
                <div className="text-xs font-bold text-ink">No notes found</div>
                <p className="text-[11px] text-ink/50">
                  {searchQuery ? 'Try changing your search query' : 'Create your first encrypted financial note'}
                </p>
                <Button
                  onClick={handleCreateNewNote}
                  variant="primary"
                  size="sm"
                  className="mt-2"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Create Note</span>
                </Button>
              </div>
            ) : (
              filteredNotes.map((note) => {
                const isSelected = note.id === selectedNoteId;
                const snippet = note.content
                  ? note.content.replace(/#+\s/g, '').slice(0, 70)
                  : 'No content yet…';

                return (
                  <div
                    key={note.id}
                    onClick={() => {
                      setSelectedNoteId(note.id);
                      setMobileView('editor');
                    }}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all relative space-y-1.5 ${
                      isSelected
                        ? 'border-pine-500 bg-pine-50/40 dark:bg-pine-950/40 shadow-xs ring-1 ring-pine-500'
                        : 'border-line bg-card hover:border-pine-300'
                    }`}
                  >
                    {/* Color bar indicator */}
                    {note.color && note.color !== '#64748b' && (
                      <div
                        className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full"
                        style={{ backgroundColor: note.color }}
                      />
                    )}

                    <div className="flex items-start justify-between gap-1.5">
                      <h4 className="font-bold text-xs text-ink truncate flex-1">
                        {note.title || 'Untitled Note'}
                      </h4>
                      {note.isPinned && (
                        <Pin className="w-3 h-3 text-amber-500 shrink-0 fill-amber-500" />
                      )}
                    </div>

                    <p className="text-[11px] text-ink/60 line-clamp-2 leading-relaxed">
                      {snippet}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-ink/40 pt-1">
                      <span>{formatReadableDate(note.updatedAt)}</span>
                      {note.attachments && note.attachments.length > 0 && (
                        <span className="flex items-center gap-1 font-semibold text-pine-700 dark:text-pine-400">
                          <Paperclip className="w-3 h-3" />
                          <span>{note.attachments.length}</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Pane 3: Note Editor / Reader (6 Cols on desktop, full on mobile editor) */}
        <div
          className={`lg:col-span-6 flex flex-col bg-card rounded-2xl border border-line p-4 space-y-4 shadow-xs ${
            mobileView === 'list' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {activeNote ? (
            <>
              {/* Editor Header Bar */}
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-line flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMobileView('list')}
                    className="lg:hidden p-1.5 rounded-lg border border-line text-ink hover:bg-moss"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Custom Folder Switcher Popover */}
                  <div className="relative" ref={folderMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsFolderMenuOpen(!isFolderMenuOpen)}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-line bg-card hover:bg-moss text-xs font-semibold text-ink cursor-pointer transition-colors"
                    >
                      <IconRenderer name={currentFolder.icon || 'Folder'} className="w-3.5 h-3.5 text-pine-600 dark:text-pine-400 shrink-0" />
                      <span className="max-w-[120px] sm:max-w-[150px] truncate">{currentFolder.name}</span>
                      <ChevronDown className="w-3 h-3 text-ink/40 shrink-0" />
                    </button>

                    {isFolderMenuOpen && (
                      <div className="absolute left-0 top-full mt-1.5 w-56 rounded-2xl bg-card border border-line shadow-card py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                        <div className="px-3 py-1 text-[10px] font-bold text-ink/40 uppercase tracking-wider">
                          Assign Folder
                        </div>
                        <div className="max-h-56 overflow-y-auto py-0.5 space-y-0.5">
                          {allFolders.map((f) => {
                            const isSelected = f.id === folderId;
                            return (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => {
                                  setFolderId(f.id);
                                  triggerSave({ folderId: f.id });
                                  setIsFolderMenuOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-left transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-pine-50 dark:bg-pine-950/60 text-pine-700 dark:text-pine-300 font-bold'
                                    : 'text-ink/80 hover:bg-moss hover:text-ink'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <IconRenderer name={f.icon || 'Folder'} className="w-3.5 h-3.5 text-pine-600 dark:text-pine-400 shrink-0" />
                                  <span className="truncate">{f.name}</span>
                                </div>
                                {isSelected && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-pine-600 dark:text-pine-400 shrink-0 ml-2" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                        <div className="border-t border-line mt-1 pt-1 px-1">
                          <button
                            type="button"
                            onClick={() => {
                              setIsFolderMenuOpen(false);
                              setIsNewFolderOpen(true);
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-pine-700 dark:text-pine-400 hover:bg-moss transition-colors cursor-pointer"
                          >
                            <FolderPlus className="w-3.5 h-3.5" />
                            <span>New Folder…</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Color tags */}
                  <div className="hidden sm:flex items-center gap-1">
                    {NOTE_COLORS.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => {
                          setColor(c.value);
                          triggerSave({ color: c.value });
                        }}
                        style={{ backgroundColor: c.value }}
                        className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                          color === c.value ? 'scale-125 ring-2 ring-offset-1 ring-brand-500' : 'opacity-70 hover:opacity-100'
                        }`}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Save indicator */}
                  <span className="text-[11px] font-mono text-ink/40 mr-1">
                    {isSaved ? 'Saved (Encrypted)' : 'Saving…'}
                  </span>

                  {/* Pin toggle */}
                  <button
                    onClick={() => {
                      const next = !isPinned;
                      setIsPinned(next);
                      triggerSave({ isPinned: next });
                    }}
                    className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
                      isPinned
                        ? 'border-amber-400 bg-amber-50 text-amber-600 dark:bg-amber-950/60'
                        : 'border-line text-ink/40 hover:text-ink'
                    }`}
                    title={isPinned ? 'Unpin note' : 'Pin note to top'}
                  >
                    <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-amber-500' : ''}`} />
                  </button>

                  {/* Markdown preview toggle */}
                  <button
                    onClick={() => setIsPreviewMode(!isPreviewMode)}
                    className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
                      isPreviewMode
                        ? 'border-pine-500 bg-pine-50 text-pine-700 dark:bg-pine-950/60'
                        : 'border-line text-ink/40 hover:text-ink'
                    }`}
                    title={isPreviewMode ? 'Switch to Edit mode' : 'Preview Markdown'}
                  >
                    {isPreviewMode ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>

                  {/* Delete note */}
                  <button
                    onClick={handleDeleteCurrentNote}
                    className="p-1.5 rounded-lg border border-line text-ink/40 hover:text-flare-600 hover:bg-moss cursor-pointer transition-colors"
                    title="Delete Note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Title input */}
              <input
                type="text"
                placeholder="Note Title…"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  triggerSave({ title: e.target.value });
                }}
                className="w-full font-display font-extrabold text-2xl sm:text-3xl text-ink bg-transparent border-0 outline-none focus:outline-none focus:ring-0 placeholder:text-ink/25 tracking-tight px-0 py-1"
              />

              {/* Tags Section */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Tag className="w-3.5 h-3.5 text-ink/40 shrink-0 mr-0.5" />
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-[11px] font-mono font-bold bg-pine-50 dark:bg-pine-950/40 text-pine-800 dark:text-pine-300 border border-pine-200/60 dark:border-pine-800/40 px-2.5 py-0.5 rounded-lg shadow-2xs"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-flare-600 cursor-pointer ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder="+ add tag"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  className="text-[11px] font-mono bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-ink placeholder:text-ink/30 w-24 px-1"
                />
              </div>

              {/* Main Text Content Area or Preview */}
              <div className="flex-1 overflow-y-auto">
                {isPreviewMode ? (
                  <div className="prose dark:prose-invert max-w-none text-xs text-ink/90 whitespace-pre-wrap font-sans leading-relaxed p-1">
                    {content || <span className="italic text-ink/40">No content to preview</span>}
                  </div>
                ) : (
                  <textarea
                    placeholder="Write your encrypted notes here… Supports Markdown formatting, checklist tasks, and financial details."
                    value={content}
                    onChange={(e) => {
                      setContent(e.target.value);
                      triggerSave({ content: e.target.value });
                    }}
                    className="w-full h-full min-h-[220px] bg-transparent border-0 outline-none focus:outline-none focus:ring-0 resize-none text-[13px] text-ink placeholder:text-ink/30 font-mono leading-relaxed px-0 py-1"
                  />
                )}
              </div>

              {/* Attachments Tray */}
              <div className="pt-3 border-t border-line space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
                    <Paperclip className="w-3.5 h-3.5 text-pine-600" />
                    <span>Attachments ({attachments.length})</span>
                  </div>

                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      multiple
                      accept="image/*,application/pdf,.doc,.docx,.txt"
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={isProcessingFile}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-lg bg-moss hover:bg-pine-50 dark:hover:bg-pine-950 text-pine-700 dark:text-pine-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isProcessingFile ? 'Processing…' : 'Attach File'}</span>
                    </button>
                  </div>
                </div>

                {/* Status Message from dynamic compressor */}
                {compressionStatus && (
                  <div className="p-2 rounded-xl bg-pine-50/80 dark:bg-pine-950/60 border border-pine-200/60 text-pine-700 dark:text-pine-300 text-[11px] font-medium flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 shrink-0 text-pine-600" />
                    <span>{compressionStatus}</span>
                  </div>
                )}

                {/* Attachments List */}
                {attachments.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-1">
                    {attachments.map((att) => {
                      const isImage = att.type === 'image';
                      const sizeKb = (att.size / 1024).toFixed(0);

                      return (
                        <div
                          key={att.id}
                          className="p-2 rounded-xl border border-line bg-slate-50 dark:bg-navy-900/60 flex items-center justify-between gap-1.5 text-xs group"
                        >
                          <div
                            onClick={() => isImage && setViewingAttachment(att)}
                            className={`flex items-center gap-1.5 min-w-0 flex-1 ${
                              isImage ? 'cursor-pointer hover:text-pine-600' : ''
                            }`}
                          >
                            {isImage ? (
                              <img
                                src={att.dataUrl}
                                alt={att.name}
                                className="w-7 h-7 rounded-md object-cover border border-line shrink-0"
                              />
                            ) : (
                              <FileIcon className="w-5 h-5 text-ink/50 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <div className="font-bold text-[11px] text-ink truncate">{att.name}</div>
                              <div className="text-[9.5px] text-ink/40 font-mono">
                                {sizeKb} KB {att.wasCompressed ? '• Optimized' : ''}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <a
                              href={att.dataUrl}
                              download={att.name}
                              className="p-1 rounded hover:bg-card text-ink/40 hover:text-ink cursor-pointer"
                              title="Download Attachment"
                            >
                              <Download className="w-3 h-3" />
                            </a>
                            <button
                              onClick={() => handleRemoveAttachment(att.id)}
                              className="p-1 rounded hover:bg-card text-ink/40 hover:text-flare-600 cursor-pointer"
                              title="Delete Attachment"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-pine-50 dark:bg-pine-950/60 border border-pine-200/60 grid place-items-center text-pine-600">
                <StickyNote className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-base text-ink">
                Encrypted Financial Workspace
              </h3>
              <p className="text-xs text-ink/50 max-w-sm">
                Select a note from the list or create a new one to document tax strategies, property paper tracking, and investment thesis.
              </p>
              <Button onClick={handleCreateNewNote} variant="primary" size="sm">
                <Plus className="w-3.5 h-3.5 mr-1" />
                <span>Create First Note</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* New Folder Modal */}
      <Modal
        isOpen={isNewFolderOpen}
        onClose={() => setIsNewFolderOpen(false)}
        title="Create Notes Folder"
        description="Organize your financial documentation and memos into custom vaults"
        maxWidth="sm"
      >
        <form onSubmit={handleCreateFolder} className="space-y-4">
          <Input
            label="Folder Name"
            placeholder="e.g. FY 2026-27 Audit, Real Estate Deeds"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            required
            autoFocus
          />

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-ink/70">Folder Icon</label>
            <div className="flex items-center gap-1.5 flex-wrap p-2 bg-slate-50 dark:bg-navy-900 rounded-xl border border-line">
              {['📁', '💼', '🏡', '🛡️', '📊', '📜', '🏷️', '🔐', '🏦', '💎'].map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setNewFolderIcon(icon)}
                  className={`w-8 h-8 rounded-lg text-base grid place-items-center cursor-pointer transition-all ${
                    newFolderIcon === icon
                      ? 'bg-white dark:bg-navy-700 shadow-xs ring-2 ring-brand-500 scale-110'
                      : 'hover:bg-white/60'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
            <Button type="button" variant="ghost" onClick={() => setIsNewFolderOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Folder
            </Button>
          </div>
        </form>
      </Modal>

      {/* Preview Attachment Modal */}
      {viewingAttachment && (
        <Modal
          isOpen={true}
          onClose={() => setViewingAttachment(null)}
          title={viewingAttachment.name}
          description="Decrypted attachment viewer"
          maxWidth="lg"
        >
          <div className="space-y-3">
            <div className="max-h-[70vh] overflow-auto rounded-xl border border-line flex items-center justify-center bg-black/5 dark:bg-black/30 p-2">
              <img
                src={viewingAttachment.dataUrl}
                alt={viewingAttachment.name}
                className="max-h-[65vh] object-contain rounded-lg"
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-ink/50">
                {(viewingAttachment.size / 1024).toFixed(0)} KB • Encrypted Base64
              </span>
              <a
                href={viewingAttachment.dataUrl}
                download={viewingAttachment.name}
                className="px-3 py-1.5 rounded-xl bg-pine-700 text-white font-bold flex items-center gap-1 hover:bg-pine-600"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Original</span>
              </a>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
