/**
 * Mobile Native Bridge for Capacitor & Android
 * Handles hardware back button navigation stack, safe areas, and status bar.
 */

type NavigationCloser = () => boolean;
const backButtonHandlers: NavigationCloser[] = [];

/**
 * Register a closer handler (e.g. closing an open modal, drawer, or lightbox).
 * Returns an unregister cleanup function.
 */
export function registerBackButtonHandler(handler: NavigationCloser): () => void {
  backButtonHandlers.push(handler);
  return () => {
    const idx = backButtonHandlers.indexOf(handler);
    if (idx !== -1) backButtonHandlers.splice(idx, 1);
  };
}

/**
 * Initialize hardware back button listener for Android Capacitor / Web.
 */
export function initHardwareBackButton(): void {
  if (typeof window === 'undefined') return;

  // Listen for Capacitor native App back button if available
  const anyWindow = window as any;
  if (anyWindow.Capacitor?.Plugins?.App) {
    try {
      anyWindow.Capacitor.Plugins.App.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
        // Run from highest priority (most recently registered) closer to root
        for (let i = backButtonHandlers.length - 1; i >= 0; i--) {
          const handled = backButtonHandlers[i]();
          if (handled) return;
        }

        if (canGoBack && window.history.length > 1) {
          window.history.back();
        } else {
          anyWindow.Capacitor.Plugins.App.minimizeApp?.();
        }
      });
    } catch (e) {
      console.warn('Capacitor backButton init warning:', e);
    }
  }

  // Keyboard Escape listener on Desktop
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      for (let i = backButtonHandlers.length - 1; i >= 0; i--) {
        const handled = backButtonHandlers[i]();
        if (handled) break;
      }
    }
  });
}
