import React from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Smartphone, Monitor, Share, PlusSquare, CheckCircle2, X } from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, installApp } = usePWAInstall();

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    const success = await installApp();
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md anim-fade" role="dialog">
      <div className="relative w-full max-w-lg rounded-3xl bg-card border border-line shadow-2xl overflow-hidden flex flex-col">
        {/* Top Accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-pine-600 via-pine-500 to-pine-700" />

        <div className="p-6 sm:p-7 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-pine-50 dark:bg-pine-950/60 border border-pine-200/80 dark:border-pine-800/60 grid place-items-center text-pine-600 shrink-0">
                <Download className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="font-display font-black text-xl text-ink tracking-tight">
                  Install KhataGHAR App
                </h3>
                <p className="text-xs text-ink/55 font-medium mt-0.5">
                  Standalone Offline App for Android, iOS, Mac & Windows
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-ink/40 hover:text-ink hover:bg-moss transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-moss/70 border border-line space-y-1">
              <span className="font-bold text-pine-700 dark:text-pine-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> 100% Offline
              </span>
              <p className="text-[11px] text-ink/60">
                Works anywhere without Wi-Fi or cellular data.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-moss/70 border border-line space-y-1">
              <span className="font-bold text-pine-700 dark:text-pine-300 flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5" /> Standalone Window
              </span>
              <p className="text-[11px] text-ink/60">
                Runs without browser URL bars or tabs.
              </p>
            </div>
          </div>

          {/* Installation Instructions / Trigger */}
          {isInstalled ? (
            <div className="p-4 rounded-2xl bg-pine-50 dark:bg-pine-950/50 border border-pine-200 dark:border-pine-800 text-center space-y-1">
              <span className="font-bold text-pine-800 dark:text-pine-200 text-xs flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-pine-600" /> App Already Installed
              </span>
              <p className="text-[11px] text-ink/60">
                KhataGHAR is already installed and running as a standalone app on your device!
              </p>
            </div>
          ) : isIOS ? (
            /* iOS Specific Instructions */
            <div className="p-4 rounded-2xl bg-moss border border-line space-y-3">
              <span className="font-bold text-ink text-xs block">
                How to install on iPhone & iPad (Safari):
              </span>
              <ol className="space-y-2 text-xs text-ink/75">
                <li className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-pine-600 text-white font-bold text-[11px] grid place-items-center shrink-0">
                    1
                  </span>
                  <span>Tap the <b>Share</b> button <Share className="w-3.5 h-3.5 inline mx-0.5 text-pine-600" /> at the bottom of Safari</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-pine-600 text-white font-bold text-[11px] grid place-items-center shrink-0">
                    2
                  </span>
                  <span>Scroll down and select <b>"Add to Home Screen"</b> <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-pine-600" /></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-pine-600 text-white font-bold text-[11px] grid place-items-center shrink-0">
                    3
                  </span>
                  <span>Tap <b>Add</b> in top right — KhataGHAR will appear on your home screen!</span>
                </li>
              </ol>
            </div>
          ) : (
            /* Desktop / Android 1-Click Install */
            <div className="space-y-3">
              {isInstallable ? (
                <button
                  onClick={handleInstallClick}
                  className="w-full py-3.5 px-6 rounded-2xl bg-pine-700 hover:bg-pine-600 active:scale-95 text-white font-display font-bold text-sm shadow-lg shadow-pine-900/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Install Standalone App Now</span>
                </button>
              ) : (
                <div className="p-4 rounded-2xl bg-moss border border-line space-y-2 text-xs text-ink/70">
                  <span className="font-bold text-ink block">
                    Install via your browser:
                  </span>
                  <p className="leading-relaxed">
                    Look for the <b>Install App</b> icon (🖥️ or ⬇️) in your browser address bar (Chrome, Edge, or Brave), or tap your browser menu <b>(⋮)</b> and choose <b>"Install KhataGHAR"</b>.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl border border-line bg-card hover:bg-moss text-xs font-semibold text-ink transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
