import { useEffect } from 'react';

let activeLockCount = 0;

/**
 * Production-grade reference-counted body scroll lock.
 * Prevents mobile touchscreens from freezing when nested modals/drawers open and close.
 */
export function lockBodyScroll(): void {
  activeLockCount++;
  if (activeLockCount === 1) {
    document.body.style.overflow = 'hidden';
  }
}

export function unlockBodyScroll(): void {
  activeLockCount = Math.max(0, activeLockCount - 1);
  if (activeLockCount === 0) {
    document.body.style.overflow = '';
  }
}

export function useBodyScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [locked]);
}

/**
 * Universal scroll to top on navigation.
 */
export function scrollToPageTop(behavior: ScrollBehavior = 'auto'): void {
  if (typeof window === 'undefined') return;
  try {
    window.scrollTo({ top: 0, left: 0, behavior });
  } catch {
    window.scrollTo(0, 0);
  }
  if (document.documentElement) document.documentElement.scrollTop = 0;
  if (document.body) document.body.scrollTop = 0;
  if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
  const root = document.getElementById('root');
  if (root) root.scrollTop = 0;
  const main = document.querySelector('main');
  if (main) main.scrollTop = 0;
}

// Disable browser auto history scroll restoration
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  try {
    window.history.scrollRestoration = 'manual';
  } catch {}
}
