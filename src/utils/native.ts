import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';

export const isNativeMobile = Capacitor.isNativePlatform();
export const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
export const isBrowser = !isNativeMobile && !isElectron;

/**
 * Tactile physical haptic feedback for Android and mobile browsers.
 */
export async function triggerHaptic(
  type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light'
): Promise<void> {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      const dur = type === 'light' ? 12 : type === 'medium' ? 25 : type === 'heavy' ? 45 : 35;
      navigator.vibrate(dur);
    }
  } catch {}
}

/**
 * Configure Android status bar styling and prevent webview from overlapping camera notches.
 */
export async function configureStatusBar(isDark: boolean, bgColor?: string): Promise<void> {
  if (!isNativeMobile) return;
  try {
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
    const bg = bgColor || (isDark ? '#101b2d' : '#ffffff');
    await StatusBar.setBackgroundColor({ color: bg });
  } catch (err) {
    console.warn('[Native] Status bar config error:', err);
  }
}

/**
 * Android Hardware Back Button listener.
 * Handler returns true if it handled the back press (e.g. closed a modal),
 * or false if default back behavior should occur.
 */
export function initHardwareBackButton(onBack: () => boolean): () => void {
  if (!isNativeMobile) return () => {};

  const handle = CapApp.addListener('backButton', () => {
    const handled = onBack();
    if (!handled) {
      CapApp.minimizeApp();
    }
  });

  return () => {
    handle.then((h) => h.remove()).catch(() => {});
  };
}
