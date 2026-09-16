import React, { useEffect, useState } from 'react';
import { Sparkles, Download, RefreshCw, ExternalLink, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AppVersionInfo, AppDistribution, APP_VERSION } from '../../types';
import { detectDistribution } from '../../services/updater';

interface UpdateModalProps {
  open: boolean;
  onClose: () => void;
  data: AppVersionInfo | null;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ open, onClose, data }) => {
  const [dist, setDist] = useState<AppDistribution>('web');

  useEffect(() => {
    if (open) {
      detectDistribution().then(setDist);
    }
  }, [open]);

  if (!data) return null;

  let platformLabel = 'Your Platform';
  let targetDownloadUrl: string | undefined = undefined;
  let targetFilename = 'KhataGHAR Update Package';
  let helperNote = 'Download the latest verified release package.';

  switch (dist) {
    case 'windows-portable':
      platformLabel = 'Windows (Portable)';
      targetDownloadUrl = data.downloads.windowsPortable || data.downloads.windows;
      targetFilename = 'KhataGHAR-Windows-Portable.exe';
      helperNote = 'Zero installation needed. Simply download and replace your existing executable.';
      break;
    case 'windows-setup':
      platformLabel = 'Windows (Setup Installer)';
      targetDownloadUrl = data.downloads.windows;
      targetFilename = 'KhataGHAR-Windows-Setup.exe';
      helperNote = 'Standard 64-bit installer with automatic desktop shortcut and start menu integration.';
      break;
    case 'linux-appimage':
      platformLabel = 'Linux (.AppImage)';
      targetDownloadUrl = data.downloads.linux;
      targetFilename = 'KhataGHAR-Linux-x86_64.AppImage';
      helperNote = 'Universal Linux binary. Run chmod +x and launch on Ubuntu, Debian, Fedora, or Arch.';
      break;
    case 'linux-deb':
      platformLabel = 'Linux (Debian / Ubuntu .deb)';
      targetDownloadUrl = data.downloads.linuxDeb || data.downloads.linux;
      targetFilename = 'KhataGHAR-Linux-amd64.deb';
      helperNote = 'Native package for Debian, Ubuntu, Linux Mint, and derivatives.';
      break;
    case 'linux-tar':
      platformLabel = 'Linux (Tarball Archive)';
      targetDownloadUrl = data.downloads.linuxTar || data.downloads.linux;
      targetFilename = 'KhataGHAR-Linux-x64.tar.gz';
      helperNote = 'Portable compressed tarball. Extract anywhere and execute binary directly.';
      break;
    case 'mac':
      platformLabel = 'macOS (Apple Silicon & Intel)';
      targetDownloadUrl = data.downloads.mac;
      targetFilename = 'KhataGHAR-macOS.dmg';
      helperNote = 'Open the DMG image and drag KhataGHAR to your Applications folder.';
      break;
    case 'android':
      platformLabel = 'Android (Direct APK)';
      targetDownloadUrl = data.downloads.android;
      targetFilename = 'KhataGHAR-Android.apk';
      helperNote = 'Direct APK installation. Your offline encrypted database and settings are 100% preserved.';
      break;
    case 'web':
    default:
      platformLabel = 'Web PWA';
      targetDownloadUrl = undefined;
      targetFilename = 'Instant Service Worker Sync';
      helperNote = 'Web client updates seamlessly in the background via Service Worker cache.';
      break;
  }

  const githubReleaseUrl = data.htmlUrl || `https://github.com/Krrish1411/KhataGHAR/releases/tag/${data.tagName}`;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="KhataGHAR Update Available"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Header Ribbon */}
        <div className="p-4 rounded-2xl bg-pine-500/10 border border-pine-500/25 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-pine-500/20 text-pine-400 shrink-0">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display font-bold text-sm text-ink">
                KhataGHAR {data.tagName}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {data.isPrerelease ? 'Beta Preview' : 'Official Release'}
              </span>
            </div>
            <p className="text-xs text-ink/60 mt-0.5">
              Released {data.releaseDate} • Currently running <span className="font-mono text-ink font-semibold">v{APP_VERSION}</span>
            </p>
          </div>
        </div>

        {/* Changelog Card */}
        <div className="p-4 rounded-2xl bg-card border border-line space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-pine-600">
            <CheckCircle2 className="w-4 h-4 text-pine-600" />
            <span>What's New in {data.tagName}:</span>
          </div>
          <ul className="space-y-1.5 text-xs text-ink/80 pl-1">
            {data.changelog.map((bullet, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-pine-500 mt-1 shrink-0">•</span>
                <span className="leading-relaxed">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Targeted Platform Action Card */}
        <div className="p-4 rounded-2xl bg-card border border-line space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink/50">
              Targeted Binary For
            </span>
            <span className="text-xs font-bold text-ink px-2.5 py-0.5 rounded-full bg-moss border border-line">
              {platformLabel}
            </span>
          </div>

          {dist === 'web' ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-moss/60 border border-line">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-ink">{targetFilename}</div>
                <div className="text-[11px] text-ink/60">{helperNote}</div>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => window.location.reload()}
                className="gap-1.5 font-bold shrink-0 self-start sm:self-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload App</span>
              </Button>
            </div>
          ) : targetDownloadUrl ? (
            <div className="space-y-2.5">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-ink">{targetFilename}</div>
                <div className="text-[11px] text-ink/60">{helperNote}</div>
              </div>
              <a
                href={targetDownloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-pine-600 hover:bg-pine-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.99]"
              >
                <Download className="w-4 h-4" />
                <span>Download Update ({platformLabel})</span>
              </a>
            </div>
          ) : (
            <div className="text-xs text-ink/60">
              Download package directly from GitHub Releases below.
            </div>
          )}
        </div>

        {/* Security / Privacy Seal */}
        <div className="flex items-center gap-2 text-[11px] text-ink/50 px-1">
          <ShieldCheck className="w-3.5 h-3.5 text-pine-600 shrink-0" />
          <span>Zero telemetry, zero remote tracking. Binaries are signed and compiled via open CI.</span>
        </div>

        {/* Footer actions */}
        <div className="pt-3 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <a
            href={githubReleaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-pine-600 hover:underline"
          >
            <span>Browse All Platforms & Checksums on GitHub</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <Button variant="ghost" size="sm" onClick={onClose} className="font-semibold text-xs self-end sm:self-auto">
            Dismiss
          </Button>
        </div>
      </div>
    </Modal>
  );
};
