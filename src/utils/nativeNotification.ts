/**
 * Universal Native Notification Service for KhataGHAR
 * Supports:
 * - Desktop Electron native OS notifications via IPC
 * - Mobile/Web Notification API (PWA / Browser)
 * - Permission requests and graceful in-app fallback
 */

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // Electron always has permission
  if ((window as any).electronAPI?.notification) {
    return true;
  }

  if (!('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch {
      return false;
    }
  }

  return false;
}

export async function sendNativeNotification(options: NotificationOptions): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const { title, body, icon = '/favicon.svg', tag } = options;

  // 1. Electron Native OS Notification
  const electronAPI = (window as any).electronAPI;
  if (electronAPI?.notification?.show) {
    try {
      await electronAPI.notification.show({ title, body });
      return true;
    } catch (e) {
      console.warn('[Notification] Electron notification failed:', e);
    }
  }

  // 2. Web / PWA / Android WebView Notification API
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon,
          tag,
          badge: icon,
        });
        return true;
      } catch (e) {
        console.warn('[Notification] Web notification failed:', e);
      }
    } else if (Notification.permission !== 'denied') {
      try {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          new Notification(title, { body, icon, tag });
          return true;
        }
      } catch {}
    }
  }

  return false;
}
