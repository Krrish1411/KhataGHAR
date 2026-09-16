import React, { useState, useEffect } from 'react';
import { RefreshCw, Download, ExternalLink, CheckCircle2, AlertCircle, Sparkles, ShieldCheck } from 'lucide-react';
import { Button } from '../common/Button';
import { APP_VERSION, APP_CHANNEL, AppDistribution, AppVersionInfo } from '../../types';
import { detectDistribution, fetchRemoteVersionInfo, isNewerVersion } from '../../services/updater';
import { UpdateModal } from '../common/UpdateModal';

export const UpdateSettingsCard: React.FC = () => {
  const [dist, setDist] = useState<AppDistribution>('web');
  const [isChecking, setIsChecking] = useState(false);
  const [checkStatus, setCheckStatus] = useState<'idle' | 'latest' | 'available' | 'offline'>('idle');
  const [latestData, setLatestData] = useState<AppVersionInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    detectDistribution().then(setDist);
  }, []);

  const handleCheckUpdates = async () => {
    setIsChecking(true);
    setCheckStatus('idle');

    try {
      const data = await fetchRemoteVersionInfo();
      setLatestData(data);

      if (data?.version && isNewerVersion(data.version, APP_VERSION)) {
        setCheckStatus('available');
        setIsModalOpen(true);
      } else {
        setCheckStatus('latest');
      }
    } catch {
      setCheckStatus('offline');
    } finally {
      setIsChecking(false);
    }
  };

  const getPlatformName = (d: AppDistribution): string => {
    switch (d) {
      case 'android':
        return 'Android Native (APK)';
      case 'windows-setup':
        return 'Windows 64-bit (Installer)';
      case 'windows-portable':
        return 'Windows Portable (Standalone)';
      case 'linux-appimage':
        return 'Linux Universal (.AppImage)';
      case 'linux-deb':
        return 'Linux Debian/Ubuntu (.deb)';
      case 'linux-tar':
        return 'Linux Portable (.tar.gz)';
      case 'mac':
        return 'macOS (Apple Silicon & Intel)';
      case 'web':
      default:
        return 'Web PWA Client';
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-line bg-card p-5 sm:p-6 space-y-4 shadow-sm lift">
        <div className="flex items-center justify-between pb-3 border-b border-line gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-pine-600" />
            <h3 className="font-display font-bold text-sm text-ink">Updates & Distribution</h3>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-pine-500/10 text-pine-600 border border-pine-500/20">
              {APP_CHANNEL}
            </span>
          </div>

          <a
            href="https://github.com/Krrish1411/KhataGHAR/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink/60 hover:text-pine-600 transition"
          >
            <span>Release History</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-moss/50 border border-line space-y-1">
            <span className="text-[11px] font-medium text-ink/50 block">Installed Version</span>
            <span className="font-mono font-bold text-sm text-ink block">v{APP_VERSION}</span>
            <span className="text-[10px] text-ink/60 block">Institutional Sovereign Build</span>
          </div>

          <div className="p-3.5 rounded-xl bg-moss/50 border border-line space-y-1">
            <span className="text-[11px] font-medium text-ink/50 block">Active Distribution</span>
            <span className="font-medium text-xs text-ink block truncate">{getPlatformName(dist)}</span>
            <span className="text-[10px] text-pine-600 block">Auto-Platform Matching</span>
          </div>

          <div className="p-3.5 rounded-xl bg-moss/50 border border-line space-y-1">
            <span className="text-[11px] font-medium text-ink/50 block">Update Channel</span>
            <span className="font-bold text-xs text-amber-500 block">Beta & Pre-Release</span>
            <span className="text-[10px] text-ink/60 block">Daily 24h Background Check</span>
          </div>
        </div>

        {/* Action & Status Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="text-xs">
            {checkStatus === 'latest' && (
              <div className="flex items-center gap-1.5 text-pine-600 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>KhataGHAR is fully up to date (v{APP_VERSION})</span>
              </div>
            )}
            {checkStatus === 'available' && latestData && (
              <div className="flex items-center gap-1.5 text-amber-500 font-bold">
                <Sparkles className="w-4 h-4" />
                <span>Update {latestData.tagName} is ready to install!</span>
              </div>
            )}
            {checkStatus === 'offline' && (
              <div className="flex items-center gap-1.5 text-ink/60">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Could not reach release server. You can download directly from GitHub.</span>
              </div>
            )}
            {checkStatus === 'idle' && (
              <div className="flex items-center gap-1 text-ink/50 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-pine-600" />
                <span>Safe update check: zero personal financial data ever leaves your device.</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {checkStatus === 'available' && latestData ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="gap-1.5 font-bold shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install {latestData.tagName}</span>
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCheckUpdates}
                disabled={isChecking}
                className="gap-1.5 font-semibold text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                <span>{isChecking ? 'Checking...' : 'Check for Updates'}</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <UpdateModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          data={latestData}
        />
      )}
    </>
  );
};
