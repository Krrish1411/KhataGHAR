import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Coffee, CheckCircle2, Wallet, X } from 'lucide-react';
import { useBodyScrollLock } from '../../utils/scrollLock';

interface SupportCoffeeModalProps {
  open: boolean;
  onClose: () => void;
  completedEntriesCount: number;
  totalAccountsCount: number;
  onSnoozeWeek: () => void;
  onPermanentOptOut: () => void;
  onBuyCoffee?: () => void;
}

export const SupportCoffeeModal: React.FC<SupportCoffeeModalProps> = ({
  open,
  onClose,
  completedEntriesCount,
  totalAccountsCount,
  onSnoozeWeek,
  onPermanentOptOut,
  onBuyCoffee,
}) => {
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const handleBuyCoffee = () => {
    if (onBuyCoffee) {
      onBuyCoffee();
    } else {
      window.open('https://buymeacoffee.com/Krrish1411', '_blank', 'noopener,noreferrer');
      onSnoozeWeek();
    }
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in duration-150 select-none bg-black/75 backdrop-blur-md"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-[480px] rounded-3xl border border-line bg-card flex flex-col overflow-hidden shadow-2xl transition-all my-auto"
      >
        {/* Ambient Top Glow */}
        <div
          className="pointer-events-none absolute -top-16 left-1/2 h-32 w-64 -translate-x-1/2 rounded-full blur-3xl opacity-30 bg-amber-500"
        />

        {/* Top Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4 shrink-0 bg-moss/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-sm shrink-0">
              <Coffee size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-display text-sm sm:text-[15px] font-extrabold tracking-tight truncate text-ink">
                  Milestone Reached!
                </h3>
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 shrink-0">
                  Supporter
                </span>
              </div>
              <p className="text-[11px] text-ink/50 truncate">
                Honoring your financial momentum & sovereign software
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-line p-1.5 text-ink/40 hover:text-ink hover:bg-card transition cursor-pointer shrink-0 ml-2"
            aria-label="Close supporter prompt"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex flex-col gap-4">
          {/* Milestone Stat Chips */}
          <div className="rounded-2xl border border-line bg-moss/50 p-3 flex items-center justify-around gap-2 text-center">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-[10.5px] font-bold text-ink/55">
                <CheckCircle2 size={12} className="text-emerald-500" /> Tracked
              </div>
              <div className="font-mono text-[16px] font-extrabold text-ink mt-0.5">
                {completedEntriesCount} Entries
              </div>
            </div>

            <div className="h-8 w-px bg-line" />

            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-[10.5px] font-bold text-ink/55">
                <Wallet size={12} className="text-pine-600 dark:text-pine-400" /> Portfolios
              </div>
              <div className="font-mono text-[16px] font-extrabold text-ink mt-0.5">
                {totalAccountsCount} Accounts
              </div>
            </div>
          </div>

          {/* Warm Message */}
          <div className="space-y-2 text-xs leading-relaxed text-ink/70">
            <p>
              You've built genuine financial discipline. <b className="text-ink">KhataGHAR</b> is 100% free, client-side encrypted, and local-first with zero tracking cookies, zero ads, and zero monthly subscriptions.
            </p>
            <p>
              If KhataGHAR brings honest clarity and peace of mind to your wealth journey, consider buying a coffee to support independent development and keep our zero-cloud P2P sync relays running.
            </p>
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={handleBuyCoffee}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-2xl py-3 px-4 font-bold text-black shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer border border-black/80"
            style={{
              background: '#FFDD00',
              color: '#000000',
              fontSize: '14px',
            }}
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 8h-1V6c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v10c0 2.2 1.8 4 4 4h10c2.2 0 4-1.8 4-4v-2h1c1.7 0 3-1.3 3-3s-1.3-3-3-3zm-3 8c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V6h14v10zm3-4h-1v-2h1c.6 0 1 .4 1 1s-.4 1-1 1z" fill="#000000"/>
              <path d="M6 9h2v4H6zm4 0h2v4h-2zm4 0h2v4h-2z" fill="#ffffff"/>
            </svg>
            <span className="font-bold">Buy Me a Coffee ($5)</span>
          </button>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-line px-5 py-3 text-xs shrink-0 bg-moss/40">
          <button
            type="button"
            onClick={onPermanentOptOut}
            className="text-[11px] font-semibold text-ink/40 hover:text-ink transition cursor-pointer"
            title="Permanently disable this prompt"
          >
            Don't show again
          </button>

          <button
            type="button"
            onClick={onSnoozeWeek}
            className="rounded-xl border border-line bg-card hover:bg-moss px-3.5 py-1.5 text-xs font-semibold text-ink transition cursor-pointer"
          >
            Not now (remind in a week)
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
