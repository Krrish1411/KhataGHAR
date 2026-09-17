import React, { useState, useEffect } from 'react';
import { Bell, Volume2, CheckCircle2, AlertCircle, Play, Shield } from 'lucide-react';
import { Button } from '../common/Button';
import { requestNotificationPermission, sendNativeNotification } from '../../utils/nativeNotification';

export type NotificationTone = 'chime' | 'bell' | 'ping' | 'silent';

export const playSynthesizedTone = (tone: NotificationTone) => {
  if (tone === 'silent' || typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (tone === 'chime') {
      // Pleasant dual-note chime (F5 -> A5)
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(698.46, now); // F5
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.0, now + 0.12); // A5

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.15);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.45);
    } else if (tone === 'bell') {
      // Soft ambient bell
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.8);
    } else if (tone === 'ping') {
      // Crisp modern ping
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(987.77, now); // B5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch (e) {
    console.warn('[NotificationSound] Failed to play tone:', e);
  }
};

export const NotificationSettingsCard: React.FC = () => {
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'default'>('default');
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    return typeof localStorage !== 'undefined'
      ? localStorage.getItem('khataghar_notifications_enabled') !== 'false'
      : true;
  });

  const [selectedTone, setSelectedTone] = useState<NotificationTone>(() => {
    return (typeof localStorage !== 'undefined'
      ? (localStorage.getItem('khataghar_notification_tone') as NotificationTone)
      : null) || 'chime';
  });

  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission as any);
    }
  }, []);

  const handleToggleEnable = async () => {
    const next = !isEnabled;
    setIsEnabled(next);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('khataghar_notifications_enabled', String(next));
    }

    if (next && permissionStatus !== 'granted') {
      const granted = await requestNotificationPermission();
      setPermissionStatus(granted ? 'granted' : 'denied');
    }
  };

  const handleToneChange = (tone: NotificationTone) => {
    setSelectedTone(tone);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('khataghar_notification_tone', tone);
    }
    playSynthesizedTone(tone);
  };

  const handleSendTest = async () => {
    if (permissionStatus !== 'granted') {
      const granted = await requestNotificationPermission();
      setPermissionStatus(granted ? 'granted' : 'denied');
      if (!granted) return;
    }

    playSynthesizedTone(selectedTone);
    await sendNativeNotification({
      title: 'KhataGHAR · Alert Verification',
      body: 'Your notifications and sound tones are working seamlessly on this device!',
    });

    setTestSent(true);
    setTimeout(() => setTestSent(false), 2500);
  };

  return (
    <div className="rounded-2xl border border-line bg-card p-4 sm:p-5 space-y-4 shadow-sm lift">
      {/* Header with Enable Switch */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-pine-50 dark:bg-pine-950/50 text-pine-600 border border-pine-200/60 dark:border-pine-800/40 shadow-2xs shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-ink">Notifications &amp; Alerts</h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  permissionStatus === 'granted'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : permissionStatus === 'denied'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                }`}
              >
                {permissionStatus === 'granted' ? 'Allowed' : permissionStatus === 'denied' ? 'Blocked' : 'Prompt Required'}
              </span>
            </div>
            <p className="text-xs text-ink/60 mt-0.5">
              Receive timely native reminders for upcoming bills, commitments, and sync status
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={handleToggleEnable}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-moss peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-line after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pine-600 border border-line"></div>
        </label>
      </div>

      {/* Tone Selector & Sound Preview */}
      {isEnabled && (
        <div className="space-y-3 pt-2 border-t border-line/60">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-pine-600" />
              <span>In-App Notification Tone</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'chime', label: 'Default Chime' },
                { id: 'bell', label: 'Soft Bell' },
                { id: 'ping', label: 'Ascending Ping' },
                { id: 'silent', label: 'Silent / Mute' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleToneChange(t.id as NotificationTone)}
                  className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                    selectedTone === t.id
                      ? 'border-pine-500 bg-pine-50/80 dark:bg-pine-950/60 text-pine-700 dark:text-pine-300 font-bold ring-2 ring-pine-500 ring-offset-1 ring-offset-card shadow-xs'
                      : 'border-line bg-moss/40 hover:bg-moss text-ink/70 hover:text-ink'
                  }`}
                >
                  <span>{t.label}</span>
                  {t.id !== 'silent' && (
                    <Play className="w-3 h-3 opacity-60 hover:opacity-100 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Test Notification Action */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <span className="text-xs text-ink/60 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-pine-600" />
              <span>Zero external trackers or analytics</span>
            </span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSendTest}
              className="cursor-pointer"
            >
              {testSent ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
                  <span>Notification Sent!</span>
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5 mr-1.5 text-pine-600" />
                  <span>Send Test Notification</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
