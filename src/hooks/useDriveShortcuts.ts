import { useEffect } from 'react';

export interface DriveShortcutsConfig {
  onSearchFocus?: () => void;
  onToggleViewMode?: () => void;
  onNewFolder?: () => void;
  onUpload?: () => void;
  onToggleInspector?: () => void;
  onToggleWidget?: () => void;
  onToggleTools?: () => void;
  onToggleStar?: () => void;
  onShowShortcuts?: () => void;
  onSelectNext?: () => void;
  onSelectPrev?: () => void;
  onSelectNextRow?: () => void;
  onSelectPrevRow?: () => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
  onOpenSelected?: () => void;
  onDeleteSelected?: () => void;
  onNavigateUp?: () => void;
  hasSelection?: boolean;
  isEnabled?: boolean;
}

export function useDriveShortcuts(config: DriveShortcutsConfig) {
  const {
    onSearchFocus,
    onToggleViewMode,
    onNewFolder,
    onUpload,
    onToggleInspector,
    onToggleWidget,
    onToggleTools,
    onToggleStar,
    onShowShortcuts,
    onSelectNext,
    onSelectPrev,
    onSelectNextRow,
    onSelectPrevRow,
    onSelectAll,
    onClearSelection,
    onOpenSelected,
    onDeleteSelected,
    onNavigateUp,
    hasSelection = false,
    isEnabled = true,
  } = config;

  useEffect(() => {
    if (!isEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const target = e.target as HTMLElement | null;

      const isInputFocused =
        (activeEl &&
          (activeEl.tagName === 'INPUT' ||
            activeEl.tagName === 'TEXTAREA' ||
            activeEl.isContentEditable ||
            activeEl.getAttribute('role') === 'textbox')) ||
        (target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable ||
            target.getAttribute('role') === 'textbox'));

      // If user is inside an input/textarea
      if (isInputFocused) {
        if (e.key === 'Escape') {
          e.preventDefault();
          if (activeEl && typeof activeEl.blur === 'function') {
            activeEl.blur();
          }
          onClearSelection?.();
        }
        return;
      }

      const isMetaOrCtrl = e.metaKey || e.ctrlKey;

      // ? or Shift + / -> Show Keyboard Shortcuts dialog
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        onShowShortcuts?.();
        return;
      }

      // / or Ctrl+F / Cmd+F -> Focus Search Bar
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

      // Escape -> Clear Selection / Close overlays
      if (e.key === 'Escape') {
        e.preventDefault();
        onClearSelection?.();
        return;
      }

      // V -> Toggle View Mode (Grid vs List)
      if (!isMetaOrCtrl && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        onToggleViewMode?.();
        return;
      }

      // I -> Toggle Details Inspector Drawer
      if (!isMetaOrCtrl && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        onToggleInspector?.();
        return;
      }

      // W -> Toggle Sovereign Status Widget
      if (!isMetaOrCtrl && (e.key === 'w' || e.key === 'W')) {
        e.preventDefault();
        onToggleWidget?.();
        return;
      }

      // T -> Toggle Drive Tools Modal (Scanner & Cleaner)
      if (!isMetaOrCtrl && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        onToggleTools?.();
        return;
      }

      // S -> Star / Unstar Selected Document
      if (!isMetaOrCtrl && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        onToggleStar?.();
        return;
      }

      // N or Ctrl+Shift+N -> New Folder
      if (
        (!isMetaOrCtrl && (e.key === 'n' || e.key === 'N')) ||
        (isMetaOrCtrl && e.shiftKey && (e.key === 'n' || e.key === 'N'))
      ) {
        e.preventDefault();
        onNewFolder?.();
        return;
      }

      // U or Ctrl+U -> Upload
      if (
        (!isMetaOrCtrl && (e.key === 'u' || e.key === 'U')) ||
        (isMetaOrCtrl && (e.key === 'u' || e.key === 'U'))
      ) {
        e.preventDefault();
        onUpload?.();
        return;
      }

      // Arrow navigation
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (onSelectNextRow) {
          onSelectNextRow();
        } else {
          onSelectNext?.();
        }
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (onSelectPrevRow) {
          onSelectPrevRow();
        } else {
          onSelectPrev?.();
        }
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        onSelectNext?.();
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onSelectPrev?.();
        return;
      }

      // Enter or Space -> Open / preview selected item
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onOpenSelected?.();
        return;
      }

      // Delete -> Delete Selected (or Cmd/Ctrl + Backspace)
      if (e.key === 'Delete' || (isMetaOrCtrl && e.key === 'Backspace')) {
        e.preventDefault();
        onDeleteSelected?.();
        return;
      }

      // Backspace -> Navigate back / up into parent directory or root
      if (e.key === 'Backspace') {
        e.preventDefault();
        onNavigateUp?.();
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
    onToggleWidget,
    onToggleTools,
    onToggleStar,
    onShowShortcuts,
    onSelectNext,
    onSelectPrev,
    onSelectNextRow,
    onSelectPrevRow,
    onSelectAll,
    onClearSelection,
    onOpenSelected,
    onDeleteSelected,
    onNavigateUp,
    hasSelection,
    isEnabled,
  ]);
}
