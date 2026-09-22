import { useEffect } from 'react';

export interface DriveShortcutsConfig {
  onSearchFocus?: () => void;
  onToggleViewMode?: () => void;
  onNewFolder?: () => void;
  onUpload?: () => void;
  onToggleInspector?: () => void;
  onToggleStar?: () => void;
  onShowShortcuts?: () => void;
  onSelectNext?: () => void;
  onSelectPrev?: () => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
  onOpenSelected?: () => void;
  onDeleteSelected?: () => void;
  onNavigateUp?: () => void;
  isEnabled?: boolean;
}

export function useDriveShortcuts(config: DriveShortcutsConfig) {
  const {
    onSearchFocus,
    onToggleViewMode,
    onNewFolder,
    onUpload,
    onToggleInspector,
    onToggleStar,
    onShowShortcuts,
    onSelectNext,
    onSelectPrev,
    onSelectAll,
    onClearSelection,
    onOpenSelected,
    onDeleteSelected,
    onNavigateUp,
    isEnabled = true,
  } = config;

  useEffect(() => {
    if (!isEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInputFocused =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.closest('input') ||
          target.closest('textarea'));

      // If user is typing in a form or input, only allow Escape or Enter (if not multiline)
      if (isInputFocused) {
        if (e.key === 'Escape') {
          (target as HTMLElement).blur();
          onClearSelection?.();
        }
        return;
      }

      const isMetaOrCtrl = e.metaKey || e.ctrlKey;

      // ? -> Show Keyboard Shortcuts
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        onShowShortcuts?.();
        return;
      }

      // / or Ctrl+F -> Focus Search
      if (e.key === '/' || (isMetaOrCtrl && (e.key === 'f' || e.key === 'F'))) {
        e.preventDefault();
        onSearchFocus?.();
        return;
      }

      // Ctrl+A / Cmd+A -> Select All
      if (isMetaOrCtrl && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        onSelectAll?.();
        return;
      }

      // V -> Toggle View Mode (Grid vs List)
      if (!isMetaOrCtrl && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        onToggleViewMode?.();
        return;
      }

      // I -> Toggle Details Inspector
      if (!isMetaOrCtrl && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        onToggleInspector?.();
        return;
      }

      // S -> Star / Unstar
      if (!isMetaOrCtrl && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        onToggleStar?.();
        return;
      }

      // N or Ctrl+Shift+N -> New Folder
      if ((!isMetaOrCtrl && (e.key === 'n' || e.key === 'N')) || (isMetaOrCtrl && e.shiftKey && (e.key === 'n' || e.key === 'N'))) {
        e.preventDefault();
        onNewFolder?.();
        return;
      }

      // U or Ctrl+U -> Upload
      if ((!isMetaOrCtrl && (e.key === 'u' || e.key === 'U')) || (isMetaOrCtrl && (e.key === 'u' || e.key === 'U'))) {
        e.preventDefault();
        onUpload?.();
        return;
      }

      // Arrow Down / Arrow Right -> Next item
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        onSelectNext?.();
        return;
      }

      // Arrow Up / Arrow Left -> Previous item
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        onSelectPrev?.();
        return;
      }

      // Enter or Space -> Open selected
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onOpenSelected?.();
        return;
      }

      // Backspace -> Navigate Up
      if (e.key === 'Backspace') {
        e.preventDefault();
        onNavigateUp?.();
        return;
      }

      // Delete -> Delete Selected
      if (e.key === 'Delete') {
        e.preventDefault();
        onDeleteSelected?.();
        return;
      }

      // Escape -> Clear Selection
      if (e.key === 'Escape') {
        e.preventDefault();
        onClearSelection?.();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onSearchFocus,
    onToggleViewMode,
    onNewFolder,
    onUpload,
    onToggleInspector,
    onToggleStar,
    onShowShortcuts,
    onSelectNext,
    onSelectPrev,
    onSelectAll,
    onClearSelection,
    onOpenSelected,
    onDeleteSelected,
    onNavigateUp,
    isEnabled,
  ]);
}
