import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Android APK & Desktop Stale Cache Trap Fix:
// If running inside Capacitor Android or Electron, wipe Service Worker and CacheStorage to prevent stale cached bundles.
// Only register SW for actual Web / PWA environments.
if (typeof window !== 'undefined') {
  const isNative = (window as any).Capacitor?.isNativePlatform?.() || navigator.userAgent.includes('wv');
  const isElectron = Boolean((window as any).electronAPI);

  if (isNative || isElectron) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) reg.unregister().catch(() => {});
      });
    }
    if ('caches' in window) {
      caches.keys().then((keys) => {
        for (const k of keys) caches.delete(k).catch(() => {});
      });
    }
  } else if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    registerSW({ immediate: true });
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
