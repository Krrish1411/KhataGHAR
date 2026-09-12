import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useVault } from '../context/VaultContext';
import { usePrivacy } from '../context/PrivacyContext';
import { Modal } from '../components/common/Modal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { processAttachmentFile } from '../utils/compression';
import type { VaultNote, NoteFolder, NoteAttachment } from '../types';
import {
  Search,
  Folder,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  FileText,
  Plus,
  Lock,
  Pin,
  Maximize2,
  Minimize2,
  Trash2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Quote,
  List,
  ListOrdered,
  CheckSquare,
  Link as LinkIcon,
  Minus,
  Image as ImageIcon,
  Video,
  Mic,
  CheckCircle2,
  Sparkles,
  Download,
  X,
  ShieldCheck,
} from 'lucide-react';
import { IconRenderer } from '../components/common/IconRenderer';

const EMOJI_OPTIONS = ['📝', '💡', '📌', '📑', '📊', '💰', '🛡️', '⚡', '🎯', '🏦', '📜', '⚖️'];

export const NotesView: React.FC = () => {
  const { notes, folders, addNote, updateNote, deleteNote, addFolder, deleteFolder } = useVault();
  const { isPrivacyMode } = usePrivacy();

  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // Expanded folders in the tree
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set(['general', 'all']));

  // Editor states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [folderId, setFolderId] = useState('general');
  const [isPinned, setIsPinned] = useState(false);
  const [color, setColor] = useState('#64748b');
  const [icon, setIcon] = useState('📝');
  const [tags, setTags] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<NoteAttachment[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [compressionStatus, setCompressionStatus] = useState<string | null>(null);
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const [isSaved, setIsSaved] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Popovers & Modals
  const [isFolderMenuOpen, setIsFolderMenuOpen] = useState(false);
  const [isEmojiMenuOpen, setIsEmojiMenuOpen] = useState(false);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderIcon, setNewFolderIcon] = useState('📁');
  const [viewingAttachment, setViewingAttachment] = useState<NoteAttachment | null>(null);

  // In-App Confirmation Pop-ups (Desktop & Mobile safe, zero window.confirm)
  const [confirmDeleteNoteOpen, setConfirmDeleteNoteOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<NoteFolder | null>(null);
  const [attachmentToDelete, setAttachmentToDelete] = useState<NoteAttachment | null>(null);

  // Mobile navigation between list & editor
  const [mobileView, setMobileView] = useState<'list' | 'editor'>('list');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderMenuRef = useRef<HTMLDivElement>(null);
  const emojiMenuRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<any>(null);

  // Ref tracking currently loaded note ID to prevent auto-scroll & reset bugs
  const lastLoadedNoteIdRef = useRef<string | null>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (folderMenuRef.current && !folderMenuRef.current.contains(e.target as Node)) {
        setIsFolderMenuOpen(false);
      }
      if (emojiMenuRef.current && !emojiMenuRef.current.contains(e.target as Node)) {
        setIsEmojiMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allFolders = useMemo(() => folders, [folders]);

  // Active note instance
  const activeNote = useMemo(() => {
    return notes.find((n) => n.id === selectedNoteId) || null;
  }, [notes, selectedNoteId]);

  // Current folder object
  const currentFolder = useMemo(() => {
    return allFolders.find((f) => f.id === folderId) || allFolders[0] || { id: 'general', name: 'Personal Memos', icon: 'Sparkles' };
  }, [allFolders, folderId]);

  // Filter notes by search and selection
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = n.title.toLowerCase().includes(q);
        const matchesContent = n.content.toLowerCase().includes(q);
        const matchesTags = (n.tags || []).some((t) => t.toLowerCase().includes(q));
        return matchesTitle || matchesContent || matchesTags;
      }
      return true;
    }).sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [notes, searchQuery]);

  // Synchronize active note state into local editor ONLY when note ID changes
  // This completely eliminates the bug where typing or saving resets the textarea/scroll position!
  useEffect(() => {
    if (activeNote) {
      if (lastLoadedNoteIdRef.current !== activeNote.id) {
        lastLoadedNoteIdRef.current = activeNote.id;
        setTitle(activeNote.title || '');
        setContent(activeNote.content || '');
        setFolderId(activeNote.folderId || 'general');
        setIsPinned(activeNote.isPinned || false);
        setColor(activeNote.color || '#64748b');
        setIcon(activeNote.icon || '📝');
        setTags(activeNote.tags || []);
        setAttachments(activeNote.attachments || []);
        setCompressionStatus(null);
        setIsSaved(true);

        // Ensure folder of selected note is expanded in the tree
        if (activeNote.folderId) {
          setExpandedFolderIds((prev) => new Set([...prev, activeNote.folderId]));
        }
      }
    } else if (notes.length > 0 && !selectedNoteId) {
      setSelectedNoteId(notes[0].id);
    }
  }, [activeNote?.id, notes.length, selectedNoteId]);

  // Track editor states in ref to avoid stale closures in debounced auto-save
  const editorStateRef = useRef({
    title,
    content,
    folderId,
    isPinned,
    color,
    icon,
    tags,
    attachments,
  });

  useEffect(() => {
    editorStateRef.current = {
      title,
      content,
      folderId,
      isPinned,
      color,
      icon,
      tags,
      attachments,
    };
  }, [title, content, folderId, isPinned, color, icon, tags, attachments]);

  // Auto-resize textarea height dynamically so document canvas scrolls smoothly as one unit without nested scroll jumping
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.max(350, ta.scrollHeight)}px`;
  }, [content, mode]);

  // Debounced Auto-Save
  const triggerSave = (updates: Partial<VaultNote>) => {
    if (!activeNote) return;
    setIsSaved(false);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await updateNote({
          ...activeNote,
          ...editorStateRef.current,
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
      const targetFolderId = selectedFolderId === 'all' || selectedFolderId === 'pinned' ? 'general' : selectedFolderId;
      const newNote = await addNote({
        title: 'Untitled Note',
        content: '',
        folderId: targetFolderId,
        isPinned: false,
        tags: [],
        color: '#64748b',
        attachments: [],
      });
      lastLoadedNoteIdRef.current = newNote.id;
      setSelectedNoteId(newNote.id);
      setTitle(newNote.title);
      setContent('');
      setFolderId(targetFolderId);
      setIsPinned(false);
      setIcon('📝');
      setTags([]);
      setAttachments([]);
      setMobileView('editor');
      setIsSaved(true);

      // Expand the folder in tree
      setExpandedFolderIds((prev) => new Set([...prev, targetFolderId]));
    } catch (err) {
      console.error('Failed to create note:', err);
    }
  };

  const handleDeleteCurrentNote = () => {
    if (!activeNote) return;
    setConfirmDeleteNoteOpen(true);
  };

  const handleConfirmDeleteNote = async () => {
    if (!activeNote) return;
    const noteIdToDelete = activeNote.id;
    setConfirmDeleteNoteOpen(false);
    await deleteNote(noteIdToDelete);
    lastLoadedNoteIdRef.current = null;
    const remaining = notes.filter((n) => n.id !== noteIdToDelete);
    if (remaining.length > 0) {
      setSelectedNoteId(remaining[0].id);
    } else {
      setSelectedNoteId(null);
    }
    setMobileView('list');
  };

  const handleConfirmDeleteFolder = async () => {
    if (!folderToDelete) return;
    const fId = folderToDelete.id;
    setFolderToDelete(null);
    await deleteFolder(fId);
  };

  const handleConfirmRemoveAttachment = () => {
    if (!attachmentToDelete) return;
    const attId = attachmentToDelete.id;
    setAttachmentToDelete(null);
    const updated = attachments.filter((a) => a.id !== attId);
    setAttachments(updated);
    triggerSave({ attachments: updated });
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
      setExpandedFolderIds((prev) => new Set([...prev, created.id]));
      setNewFolderName('');
      setIsNewFolderOpen(false);
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  };

  const toggleFolderExpand = (fId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(fId)) {
        next.delete(fId);
      } else {
        next.add(fId);
      }
      return next;
    });
  };

  // Safe formatting insertion that preserves scroll & cursor position without jumping to top
  const applyFormatting = (type: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const val = textarea.value;
    const selected = val.substring(start, end);

    const before = val.substring(0, start);
    const after = val.substring(end);
    let replacement = '';
    let cursorOffset = 0;

    switch (type) {
      case 'h1':
        replacement = `# ${selected || 'Heading 1'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'h2':
        replacement = `## ${selected || 'Heading 2'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'bold':
        replacement = `**${selected || 'bold text'}**`;
        cursorOffset = selected ? replacement.length : 2;
        break;
      case 'italic':
        replacement = `*${selected || 'italic text'}*`;
        cursorOffset = selected ? replacement.length : 1;
        break;
      case 'underline':
        replacement = `<u>${selected || 'underlined text'}</u>`;
        cursorOffset = selected ? replacement.length : 3;
        break;
      case 'strike':
        replacement = `~~${selected || 'strikethrough'}~~`;
        cursorOffset = selected ? replacement.length : 2;
        break;
      case 'code':
        if (selected.includes('\n')) {
          replacement = `\`\`\`\n${selected || 'code block'}\n\`\`\`\n`;
        } else {
          replacement = `\`${selected || 'code'}\``;
        }
        cursorOffset = replacement.length;
        break;
      case 'quote':
        replacement = `> ${selected || 'Quote'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'bullet':
        replacement = `\n- ${selected || 'List item'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'numbered':
        replacement = `\n1. ${selected || 'List item'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'checklist':
        replacement = `\n- [ ] ${selected || 'Task item'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'link':
        replacement = `[${selected || 'Link title'}](https://example.com)`;
        cursorOffset = replacement.length;
        break;
      case 'hr':
        replacement = `\n\n---\n\n`;
        cursorOffset = replacement.length;
        break;
      default:
        break;
    }

    const updated = before + replacement + after;
    setContent(updated);
    triggerSave({ content: updated });

    // Restore focus and selection without scrolling parent/container to top
    setTimeout(() => {
      textarea.focus({ preventScroll: true });
      const newPos = start + cursorOffset;
      textarea.setSelectionRange(newPos, newPos);
    }, 10);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingFile(true);
    setCompressionStatus('Encrypting attachment…');

    try {
      const newAttachments: NoteAttachment[] = [...attachments];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const processed = await processAttachmentFile(file);
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
      triggerSave({ attachments: newAttachments });
      setCompressionStatus(null);
    } catch (err) {
      console.error(err);
      setCompressionStatus('Attachment failed.');
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (id: string) => {
    const next = attachments.filter((a) => a.id !== id);
    setAttachments(next);
    triggerSave({ attachments: next });
  };

  // Word & Read Time calculation
  const stats = useMemo(() => {
    const text = content.trim();
    if (!text) return { words: 0, readTime: 1 };
    const words = text.split(/\s+/).filter(Boolean).length;
    const readTime = Math.max(1, Math.ceil(words / 200));
    return { words, readTime };
  }, [content]);

  // Pill date formatting: "Sat 12 Sep at 15:21"
  const formattedDate = useMemo(() => {
    if (!activeNote?.updatedAt) return 'Just now';
    try {
      const d = new Date(activeNote.updatedAt);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const day = d.getDate();
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      const hours = d.getHours().toString().padStart(2, '0');
      const mins = d.getMinutes().toString().padStart(2, '0');
      return `${dayName} ${day} ${month} at ${hours}:${mins}`;
    } catch {
      return 'Recently';
    }
  }, [activeNote?.updatedAt]);

  // Compact sidebar date: "Sat 12 Sep"
  const formatCompactDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const day = d.getDate();
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      return `${dayName} ${day} ${month}`;
    } catch {
      return '';
    }
  };

  return (
    <div
      className={`flex gap-4.5 h-full w-full select-none overflow-hidden transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 p-4 bg-ground' : ''
      }`}
    >
      {/* ---------------------------------------------------- */}
      {/* LEFT PANEL: FOLDERS & NOTES TREE NAVIGATOR           */}
      {/* ---------------------------------------------------- */}
      <div
        className={`w-64 sm:w-72 shrink-0 bg-card rounded-2xl border border-line p-3 flex flex-col shadow-xs overflow-hidden h-full ${
          mobileView === 'editor' && !isFullscreen ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* Search Notes Bar */}
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-ink/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-moss/70 dark:bg-navy-900/70 rounded-xl border border-line text-xs font-medium text-ink placeholder:text-ink/40 outline-none focus:border-pine-600/60 transition-colors"
          />
        </div>

        {/* Header Label: FOLDERS & NOTES */}
        <div className="flex items-center justify-between px-1.5 pb-2 text-[10px] font-bold text-ink/45 uppercase tracking-wider">
          <span>Folders & Notes</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsNewFolderOpen(true)}
              className="p-1 rounded-md text-ink/40 hover:text-pine-600 hover:bg-moss transition-colors cursor-pointer"
              title="New Folder"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleCreateNewNote}
              className="text-xs font-bold text-pine-700 dark:text-pine-400 hover:text-pine-800 dark:hover:text-pine-300 hover:underline cursor-pointer ml-1"
            >
              + Note
            </button>
          </div>
        </div>

        {/* Tree List Container */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-0.5 custom-scrollbar">
          {/* Item 1: All Notes root */}
          <button
            onClick={() => setSelectedFolderId('all')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              selectedFolderId === 'all'
                ? 'bg-pine-50/90 dark:bg-pine-950/60 text-pine-900 dark:text-pine-200 font-bold border border-pine-200/80 dark:border-pine-800/60 shadow-2xs'
                : 'text-ink/75 hover:bg-moss hover:text-ink border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <span className="text-sm">📁</span>
              <span className="truncate">All notes</span>
            </div>
            <span className="text-[11px] font-mono text-ink/40 tabular-nums">
              {notes.length}
            </span>
          </button>

          {/* Folder Nodes */}
          {allFolders.map((f) => {
            const folderNotes = filteredNotes.filter((n) => n.folderId === f.id);
            const isSelected = selectedFolderId === f.id;
            const isExpanded = expandedFolderIds.has(f.id) || searchQuery.trim() !== '';

            return (
              <div key={f.id} className="space-y-0.5">
                {/* Folder Header Row */}
                <div
                  onClick={() => {
                    setSelectedFolderId(f.id);
                    toggleFolderExpand(f.id);
                  }}
                  className={`group flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    isSelected && selectedFolderId !== 'all'
                      ? 'bg-pine-50/90 dark:bg-pine-950/60 text-pine-900 dark:text-pine-200 font-bold border border-pine-200/80 dark:border-pine-800/60 shadow-2xs'
                      : 'text-ink/75 hover:bg-moss hover:text-ink border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <button
                      type="button"
                      onClick={(e) => toggleFolderExpand(f.id, e)}
                      className="p-0.5 rounded text-ink/40 hover:text-ink cursor-pointer"
                    >
                      <ChevronRight
                        className={`w-3.5 h-3.5 transition-transform duration-150 ${
                          isExpanded ? 'rotate-90 text-ink/70' : ''
                        }`}
                      />
                    </button>
                    <IconRenderer name={f.icon || 'Folder'} className="w-3.5 h-3.5 shrink-0 text-pine-600 dark:text-pine-400" />
                    <span className="truncate">{f.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-mono text-ink/40 tabular-nums">
                      {folderNotes.length}
                    </span>
                    {!f.isDefault && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFolderToDelete(f);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-ink/30 hover:text-flare-600 transition-opacity ml-0.5 cursor-pointer"
                        title="Delete folder"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub-Items: Notes nested under folder */}
                {isExpanded && folderNotes.length > 0 && (
                  <div className="pl-4 space-y-0.5 py-0.5">
                    {folderNotes.map((note) => {
                      const isNoteActive = note.id === selectedNoteId;

                      return (
                        <div
                          key={note.id}
                          onClick={() => {
                            setSelectedNoteId(note.id);
                            setMobileView('editor');
                          }}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                            isNoteActive
                              ? 'bg-pine-50/90 dark:bg-pine-950/70 border border-pine-200 dark:border-pine-800/80 text-pine-950 dark:text-pine-100 font-bold shadow-2xs'
                              : 'text-ink/70 hover:bg-moss hover:text-ink border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0 pr-1 truncate">
                            <FileText className="w-3.5 h-3.5 shrink-0 opacity-50" />
                            <span className="truncate">{note.title || 'Untitled Note'}</span>
                          </div>
                          <span className="text-[10px] font-mono text-ink/40 shrink-0 tabular-nums">
                            {formatCompactDate(note.updatedAt)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* If All Notes is selected and no notes found */}
          {filteredNotes.length === 0 && (
            <div className="p-4 text-center text-xs text-ink/40">
              No notes found
            </div>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* RIGHT PANEL: NOTE CANVAS & EDITOR (Exact Screenshot)  */}
      {/* ---------------------------------------------------- */}
      <div
        className={`flex-1 flex flex-col min-w-0 bg-card rounded-2xl border border-line shadow-xs relative overflow-hidden ${
          mobileView === 'list' && !isFullscreen ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* Top Bar Header */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-3 border-b border-line/70 shrink-0 bg-card/60 backdrop-blur-xs">
          {/* Left: Scope title + badge + Saved status */}
          <div className="flex items-center gap-2.5">
            {/* Mobile Back Button */}
            <button
              onClick={() => setMobileView('list')}
              className="lg:hidden p-1.5 rounded-lg border border-line text-ink hover:bg-moss mr-1"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-extrabold text-sm text-ink font-display">
              {selectedFolderId === 'all' ? 'All Notes' : currentFolder?.name || 'Notes'}
            </span>

            <span className="text-[11px] font-semibold text-ink/60 bg-moss/80 dark:bg-navy-900 px-2 py-0.5 rounded-full font-mono border border-line/50">
              {selectedFolderId === 'all' ? notes.length : notes.filter((n) => n.folderId === folderId).length} notes
            </span>

            <span className="flex items-center gap-1 text-[11px] font-mono text-ink/45 ml-1">
              <Lock className="w-3 h-3 text-pine-600 dark:text-pine-400" />
              <span>{isSaved ? 'Saved' : 'Saving…'}</span>
            </span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Segmented [Write | Preview] Pill */}
            <div className="flex items-center p-0.5 bg-moss/80 dark:bg-navy-900/80 rounded-lg border border-line/60">
              <button
                type="button"
                onClick={() => setMode('write')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  mode === 'write'
                    ? 'bg-pine-700 dark:bg-pine-600 text-white shadow-2xs'
                    : 'text-ink/60 hover:text-ink'
                }`}
              >
                Write
              </button>
              <button
                type="button"
                onClick={() => setMode('preview')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  mode === 'preview'
                    ? 'bg-pine-700 dark:bg-pine-600 text-white shadow-2xs'
                    : 'text-ink/60 hover:text-ink'
                }`}
              >
                Preview
              </button>
            </div>

            {/* Pin Action */}
            <button
              onClick={() => {
                const next = !isPinned;
                setIsPinned(next);
                triggerSave({ isPinned: next });
              }}
              className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
                isPinned
                  ? 'border-amber-400 bg-amber-50 text-amber-600 dark:bg-amber-950/60'
                  : 'border-line text-ink/40 hover:text-ink hover:bg-moss'
              }`}
              title={isPinned ? 'Unpin note' : 'Pin note to top'}
            >
              <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-amber-500' : ''}`} />
            </button>

            {/* Fullscreen Action */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg border border-line text-ink/40 hover:text-ink hover:bg-moss cursor-pointer transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Delete Note */}
            <button
              onClick={handleDeleteCurrentNote}
              className="p-1.5 rounded-lg border border-line text-ink/40 hover:text-flare-600 hover:bg-moss cursor-pointer transition-colors"
              title="Delete Note"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* + Note Button */}
            <button
              onClick={handleCreateNewNote}
              className="px-3.5 py-1.5 rounded-xl bg-pine-700 hover:bg-pine-800 dark:bg-pine-600 dark:hover:bg-pine-500 text-white text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Note</span>
            </button>
          </div>
        </div>

        {/* Scrollable Note Body Container */}
        {activeNote ? (
          <div className="flex-1 overflow-y-auto px-6 sm:px-10 py-6 space-y-4 flex flex-col custom-scrollbar">
            {/* Note Emoji Display */}
            <div className="relative" ref={emojiMenuRef}>
              <button
                type="button"
                onClick={() => setIsEmojiMenuOpen(!isEmojiMenuOpen)}
                className="text-3xl select-none hover:scale-110 transition-transform cursor-pointer inline-block"
                title="Change note icon"
              >
                {icon || '📝'}
              </button>

              {isEmojiMenuOpen && (
                <div className="absolute left-0 top-full mt-1.5 p-2 bg-card border border-line rounded-2xl shadow-card z-50 flex items-center gap-1.5 flex-wrap w-48">
                  {EMOJI_OPTIONS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => {
                        setIcon(em);
                        triggerSave({ icon: em });
                        setIsEmojiMenuOpen(false);
                      }}
                      className="w-8 h-8 rounded-lg hover:bg-moss grid place-items-center text-lg cursor-pointer"
                    >
                      {em}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Note Title Input */}
            <input
              type="text"
              placeholder="Note Title…"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                triggerSave({ title: e.target.value });
              }}
              className="w-full font-display font-black text-2xl sm:text-3xl text-ink bg-transparent border-0 outline-none focus:outline-none focus:ring-0 placeholder:text-ink/25 tracking-tight px-0 py-0.5"
            />

            {/* Metadata Pill Strip */}
            <div className="flex items-center gap-2 flex-wrap pt-0.5 pb-2">
              {/* Folder Selector Pill */}
              <div className="relative" ref={folderMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsFolderMenuOpen(!isFolderMenuOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-moss/80 dark:bg-navy-900/60 hover:bg-moss dark:hover:bg-navy-800 text-xs font-semibold text-ink cursor-pointer transition-colors border border-line/50"
                >
                  <IconRenderer name={currentFolder.icon || 'Folder'} className="w-3.5 h-3.5 text-pine-600 dark:text-pine-400 shrink-0" />
                  <span className="truncate">{currentFolder.name}</span>
                  <ChevronDown className="w-3 h-3 text-ink/40 shrink-0 ml-0.5" />
                </button>

                {isFolderMenuOpen && (
                  <div className="absolute left-0 top-full mt-1.5 w-56 rounded-2xl bg-card border border-line shadow-card py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1 text-[10px] font-bold text-ink/40 uppercase tracking-wider">
                      Assign Folder
                    </div>
                    <div className="max-h-56 overflow-y-auto py-0.5 space-y-0.5 custom-scrollbar">
                      {allFolders.map((f) => {
                        const isFSelected = f.id === folderId;
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
                              isFSelected
                                ? 'bg-pine-50 dark:bg-pine-950/60 text-pine-900 dark:text-pine-200 font-bold'
                                : 'text-ink/80 hover:bg-moss hover:text-ink'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <IconRenderer name={f.icon || 'Folder'} className="w-3.5 h-3.5 text-pine-600 dark:text-pine-400 shrink-0" />
                              <span className="truncate">{f.name}</span>
                            </div>
                            {isFSelected && (
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

              {/* Timestamp Pill */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-moss/80 dark:bg-navy-900/60 text-xs font-medium text-ink/65 border border-line/50">
                <span className="text-xs">📅</span>
                <span>{formattedDate}</span>
              </div>

              {/* Words & Reading Time Pill */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-moss/80 dark:bg-navy-900/60 text-xs font-medium text-ink/65 border border-line/50">
                <span className="text-xs">📖</span>
                <span>{stats.words} words • {stats.readTime}m read</span>
              </div>

              {/* Security Pill */}
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-pine-50/90 dark:bg-pine-950/60 text-pine-800 dark:text-pine-300 border border-pine-200/60 dark:border-pine-800/60 text-xs font-bold">
                <Lock className="w-3 h-3 text-pine-600 dark:text-pine-400" />
                <span>AES-256</span>
              </div>
            </div>

            {/* Document Canvas */}
            <div className="flex-1 min-h-[350px] flex flex-col">
              {mode === 'preview' ? (
                <div className="prose dark:prose-invert max-w-none text-sm text-ink leading-relaxed whitespace-pre-wrap font-sans p-1">
                  {content || <span className="italic text-ink/40">No content to preview</span>}
                </div>
              ) : (
                <textarea
                  ref={textareaRef}
                  placeholder="Start writing notes, checklist tasks, and financial details…"
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    triggerSave({ content: e.target.value });
                  }}
                  className="w-full bg-transparent border-0 outline-none focus:outline-none focus:ring-0 resize-none text-[13.5px] text-ink placeholder:text-ink/30 font-sans leading-relaxed px-0 py-1 overflow-hidden"
                />
              )}
            </div>

            {/* Attached media / documents section */}
            {attachments.length > 0 && (
              <div className="pt-3 border-t border-line space-y-2">
                <div className="text-xs font-bold text-ink/70">
                  Attachments ({attachments.length})
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="p-2 rounded-xl border border-line bg-moss/70 dark:bg-navy-900/60 flex items-center justify-between gap-1.5 text-xs group"
                    >
                      <div
                        onClick={() => att.type === 'image' && setViewingAttachment(att)}
                        className="flex items-center gap-1.5 min-w-0 flex-1 cursor-pointer"
                      >
                        {att.type === 'image' ? (
                          <img
                            src={att.dataUrl}
                            alt={att.name}
                            className="w-7 h-7 rounded-md object-cover border border-line shrink-0"
                          />
                        ) : (
                          <FileText className="w-5 h-5 text-ink/50 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-[11px] text-ink truncate">{att.name}</div>
                          <div className="text-[9.5px] text-ink/40 font-mono">
                            {(att.size / 1024).toFixed(0)} KB
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <a
                          href={att.dataUrl}
                          download={att.name}
                          className="p-1 rounded hover:bg-card text-ink/40 hover:text-ink cursor-pointer"
                          title="Download"
                        >
                          <Download className="w-3 h-3" />
                        </a>
                        <button
                          onClick={() => setAttachmentToDelete(att)}
                          className="p-1 rounded hover:bg-card text-ink/40 hover:text-flare-600 cursor-pointer"
                          title="Remove attachment"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="text-4xl select-none">📝</div>
            <div className="text-sm font-bold text-ink">No note selected</div>
            <p className="text-xs text-ink/50 max-w-xs">
              Select a note from the left navigator or create a new encrypted note to begin writing.
            </p>
            <Button onClick={handleCreateNewNote} variant="primary" size="sm">
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>Create Note</span>
            </Button>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* BOTTOM TOOLBAR / FORMATTING STRIP (Exact Screenshot) */}
        {/* ---------------------------------------------------- */}
        <div className="border-t border-line/70 px-4 py-2 bg-card/90 backdrop-blur-xs flex items-center justify-between gap-1 sm:gap-2 overflow-x-auto shrink-0 text-xs text-ink/75">
          {/* Text Styling & List Actions */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => applyFormatting('h1')}
              className="px-2 py-1 rounded-lg hover:bg-moss font-bold text-[11px] cursor-pointer"
              title="Heading 1"
            >
              H1
            </button>
            <button
              type="button"
              onClick={() => applyFormatting('h2')}
              className="px-2 py-1 rounded-lg hover:bg-moss font-bold text-[11px] cursor-pointer"
              title="Heading 2"
            >
              H2
            </button>

            <span className="w-px h-4 bg-line/80 mx-0.5" />

            <button
              type="button"
              onClick={() => applyFormatting('bold')}
              className="p-1.5 rounded-lg hover:bg-moss cursor-pointer font-bold"
              title="Bold (**text**)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormatting('italic')}
              className="p-1.5 rounded-lg hover:bg-moss cursor-pointer italic"
              title="Italic (*text*)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormatting('underline')}
              className="p-1.5 rounded-lg hover:bg-moss cursor-pointer underline"
              title="Underline (<u>text</u>)"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormatting('strike')}
              className="p-1.5 rounded-lg hover:bg-moss cursor-pointer line-through"
              title="Strikethrough (~~text~~)"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormatting('code')}
              className="p-1.5 rounded-lg hover:bg-moss cursor-pointer font-mono text-[11px]"
              title="Inline Code (`code`)"
            >
              <Code className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormatting('quote')}
              className="p-1.5 rounded-lg hover:bg-moss cursor-pointer"
              title="Blockquote (> quote)"
            >
              <Quote className="w-3.5 h-3.5" />
            </button>

            <span className="w-px h-4 bg-line/80 mx-0.5" />

            <button
              type="button"
              onClick={() => applyFormatting('bullet')}
              className="p-1.5 rounded-lg hover:bg-moss cursor-pointer"
              title="Bullet List (- item)"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormatting('numbered')}
              className="p-1.5 rounded-lg hover:bg-moss cursor-pointer"
              title="Numbered List (1. item)"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormatting('checklist')}
              className="p-1.5 rounded-lg hover:bg-moss cursor-pointer"
              title="Checklist Task (- [ ] item)"
            >
              <CheckSquare className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormatting('link')}
              className="p-1.5 rounded-lg hover:bg-moss cursor-pointer"
              title="Insert Link ([title](url))"
            >
              <LinkIcon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormatting('hr')}
              className="p-1.5 rounded-lg hover:bg-moss cursor-pointer"
              title="Horizontal Rule (---)"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Media Attachments & Record */}
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              accept="image/*,video/*,application/pdf,.doc,.docx,.txt"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 rounded-lg bg-moss/80 dark:bg-navy-900/60 hover:bg-moss dark:hover:bg-navy-800 text-ink text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors border border-line/40"
            >
              <ImageIcon className="w-3.5 h-3.5 text-pine-600 dark:text-pine-400" />
              <span>Photo</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 rounded-lg bg-moss/80 dark:bg-navy-900/60 hover:bg-moss dark:hover:bg-navy-800 text-ink text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors border border-line/40"
            >
              <Video className="w-3.5 h-3.5 text-pine-600 dark:text-pine-400" />
              <span>Video</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 rounded-lg bg-moss/80 dark:bg-navy-900/60 hover:bg-moss dark:hover:bg-navy-800 text-ink text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors border border-line/40"
            >
              <Mic className="w-3.5 h-3.5 text-rose-500" />
              <span>Record</span>
            </button>
          </div>

          {/* Far Right Status */}
          <div className="flex items-center gap-1 text-xs font-bold text-pine-700 dark:text-pine-400 shrink-0 ml-3">
            <Lock className="w-3.5 h-3.5" />
            <span>AES-256</span>
          </div>
        </div>
      </div>

      {/* Modal for Creating New Folder */}
      {isNewFolderOpen && (
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
              placeholder="e.g. Daily, Krish, Legal, Audit"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              required
              autoFocus
            />

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink/70">Folder Icon</label>
              <div className="flex items-center gap-1.5 flex-wrap p-2 bg-moss/70 dark:bg-navy-900/60 rounded-xl border border-line">
                {['📁', '💼', '🏡', '🛡️', '📊', '📜', '🏷️', '🔐', '🏦', '💎', '📅', '📝'].map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setNewFolderIcon(ic)}
                    className={`w-8 h-8 rounded-lg text-base grid place-items-center cursor-pointer transition-all ${
                      newFolderIcon === ic
                        ? 'bg-white dark:bg-navy-700 shadow-xs ring-2 ring-pine-500 scale-110'
                        : 'hover:bg-white/60'
                    }`}
                  >
                    {ic}
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
      )}

      {/* Modal for Previewing Image Attachment */}
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
            <div className="flex justify-between items-center text-xs">
              <span className="text-ink/60 font-mono">{(viewingAttachment.size / 1024).toFixed(0)} KB</span>
              <a
                href={viewingAttachment.dataUrl}
                download={viewingAttachment.name}
                className="px-3 py-1.5 rounded-xl bg-pine-600 text-white font-bold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </a>
            </div>
          </div>
        </Modal>
      )}

      {/* In-App Confirmation Modal: Delete Note */}
      <ConfirmModal
        isOpen={confirmDeleteNoteOpen}
        onClose={() => setConfirmDeleteNoteOpen(false)}
        onConfirm={handleConfirmDeleteNote}
        title="Delete Note"
        description="This encrypted note and all its attachments will be permanently deleted from your vault. This action cannot be undone."
        confirmText="Delete Permanently"
        variant="danger"
        itemPreview={
          activeNote ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-2xl select-none shrink-0">{activeNote.icon || '📝'}</span>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-xs text-ink truncate">
                  {activeNote.title || 'Untitled Note'}
                </div>
                <div className="text-[11px] text-ink/50 font-mono truncate">
                  {currentFolder.name} • {stats.words} words
                </div>
              </div>
            </div>
          ) : null
        }
      />

      {/* In-App Confirmation Modal: Delete Folder */}
      <ConfirmModal
        isOpen={Boolean(folderToDelete)}
        onClose={() => setFolderToDelete(null)}
        onConfirm={handleConfirmDeleteFolder}
        title="Delete Folder"
        description={`Notes inside "${folderToDelete?.name}" will not be deleted; they will be safely relocated to General.`}
        confirmText="Delete Folder"
        variant="warning"
        itemPreview={
          folderToDelete ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <IconRenderer name={folderToDelete.icon || 'Folder'} className="w-4 h-4 text-pine-600 dark:text-pine-400 shrink-0" />
                <span className="font-bold text-xs text-ink truncate">{folderToDelete.name}</span>
              </div>
              <span className="text-[11px] font-mono text-ink/50 tabular-nums shrink-0">
                {notes.filter((n) => n.folderId === folderToDelete.id).length} notes inside
              </span>
            </div>
          ) : null
        }
      />

      {/* In-App Confirmation Modal: Remove Attachment */}
      <ConfirmModal
        isOpen={Boolean(attachmentToDelete)}
        onClose={() => setAttachmentToDelete(null)}
        onConfirm={handleConfirmRemoveAttachment}
        title="Remove Attachment"
        description="Are you sure you want to remove this attached file from the note?"
        confirmText="Remove File"
        variant="danger"
        itemPreview={
          attachmentToDelete ? (
            <div className="flex items-center gap-2.5 min-w-0">
              {attachmentToDelete.type === 'image' ? (
                <img
                  src={attachmentToDelete.dataUrl}
                  alt={attachmentToDelete.name}
                  className="w-8 h-8 rounded-lg object-cover border border-line shrink-0"
                />
              ) : (
                <FileText className="w-5 h-5 text-ink/50 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-bold text-xs text-ink truncate">{attachmentToDelete.name}</div>
                <div className="text-[10px] text-ink/50 font-mono">
                  {(attachmentToDelete.size / 1024).toFixed(0)} KB
                </div>
              </div>
            </div>
          ) : null
        }
      />
    </div>
  );
};
