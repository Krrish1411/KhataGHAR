import React, { useState } from 'react';
import { Coffee, CheckCircle2, ShieldCheck, Sparkles, ExternalLink } from 'lucide-react';

interface SupportSettingsCardProps {
  onOpenPreview?: () => void;
}

export const SupportSettingsCard: React.FC<SupportSettingsCardProps> = ({ onOpenPreview }) => {
  const [isOptedOut, setIsOptedOut] = useState<boolean>(() => {
    try {
      return localStorage.getItem('khata_coffee_opt_out') === 'true';
    } catch {
      return false;
    }
  });

  const [feedbackMsg, setFeedbackMsg] = useState<string>('');

  const handleToggleOptOut = (e: React.ChangeEvent<HTMLInputElement>) => {
    const disableReminders = !e.target.checked;
    setIsOptedOut(disableReminders);
    try {
      if (disableReminders) {
        localStorage.setItem('khata_coffee_opt_out', 'true');
        setFeedbackMsg('Support reminders disabled. KhataGHAR stays 100% free forever.');
      } else {
        localStorage.removeItem('khata_coffee_opt_out');
        setFeedbackMsg('Support reminders enabled (gentle 7-day interval).');
      }
      setTimeout(() => setFeedbackMsg(''), 4000);
    } catch {
      // localStorage error fallback
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-card p-5 sm:p-6 space-y-4 shadow-sm lift">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 grid place-items-center text-amber-600 dark:text-amber-400 shadow-sm shrink-0">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-sm sm:text-base text-ink">
                Support Independent Development
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/40 text-[10px] font-bold">
                100% Free Forever
              </span>
            </div>
            <p className="text-[11.5px] text-ink/55 mt-0.5">
              Built with care by <b className="text-ink/80">Krish Patel</b> · No corporate investors, no ads, no trackers
            </p>
          </div>
        </div>

        {/* Official Buy Me a Coffee Action */}
        <a
          href="https://buymeacoffee.com/Krrish1411"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold text-black shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] border border-black/80 shrink-0 cursor-pointer self-start sm:self-auto"
          style={{
            background: '#FFDD00',
            color: '#000000',
          }}
          title="Support independent development on Buy Me a Coffee"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 8h-1V6c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v10c0 2.2 1.8 4 4 4h10c2.2 0 4-1.8 4-4v-2h1c1.7 0 3-1.3 3-3s-1.3-3-3-3zm-3 8c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V6h14v10zm3-4h-1v-2h1c.6 0 1 .4 1 1s-.4 1-1 1z" fill="#000000"/>
            <path d="M6 9h2v4H6zm4 0h2v4h-2zm4 0h2v4h-2z" fill="#ffffff"/>
          </svg>
          <span>Buy me a coffee ($5)</span>
          <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
        </a>
      </div>

      {/* Rationale & P2P Relay Callout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        <div className="p-3.5 rounded-xl bg-moss/50 border border-line space-y-1.5 text-xs text-ink/70 leading-relaxed">
          <div className="flex items-center gap-1.5 font-bold text-ink text-[11.5px]">
            <ShieldCheck className="w-3.5 h-3.5 text-pine-600 dark:text-pine-400" />
            <span>Sovereign Wealth Engineering</span>
          </div>
          <p className="text-[11px] text-ink/60">
            KhataGHAR will never gate features behind monthly subscriptions or sell your financial history. It is engineered to run locally and privately on your device forever.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 space-y-1.5 text-xs text-ink/70 leading-relaxed">
          <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300 text-[11.5px]">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Zero-Cloud P2P Sync Relays</span>
          </div>
          <p className="text-[11px] text-ink/60">
            Your patronage directly funds public WebRTC STUN/TURN signaling relays, allowing seamless encrypted sync between your PC and phone without a central database.
          </p>
        </div>
      </div>

      {/* Reminder Popup Opt-out Toggle */}
      <div className="pt-2 border-t border-line">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-card border border-line">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-ink">
                Milestone & Appreciation Reminders
              </span>
              <span className={`px-2 py-0.2 rounded-md text-[10px] font-bold ${
                !isOptedOut
                  ? 'bg-pine-100 dark:bg-pine-950/60 text-pine-700 dark:text-pine-300 border border-pine-300/40'
                  : 'bg-moss text-ink/50 border border-line'
              }`}>
                {!isOptedOut ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <p className="text-[11.5px] text-ink/55">
              Show a gentle appreciation prompt once every 7 days (after logging 10+ entries). Turn off if you prefer zero in-app prompts.
            </p>
            {feedbackMsg && (
              <p className="text-[11px] text-pine-600 dark:text-pine-400 font-semibold pt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>{feedbackMsg}</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
            {onOpenPreview && (
              <button
                type="button"
                onClick={onOpenPreview}
                className="px-2.5 py-1.5 rounded-lg border border-line bg-moss hover:bg-card text-ink/70 text-[11px] font-semibold transition cursor-pointer"
              >
                Preview Prompt
              </button>
            )}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={!isOptedOut}
                onChange={handleToggleOptOut}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-moss peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pine-600 border border-line" />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
