import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { PrivacyAuthModal } from '../security/PrivacyAuthModal';
import { QuickAddModal } from '../transactions/QuickAddModal';
import { WelcomeModal } from '../common/WelcomeModal';
import { OnboardingModal } from '../security/OnboardingModal';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { P2PSyncModal } from '../sync/P2PSyncModal';
import { SupportCoffeeModal } from '../common/SupportCoffeeModal';
import { UpdateModal } from '../common/UpdateModal';
import { checkDailyUpdate } from '../../services/updater';
import { APP_VERSION, AppVersionInfo } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useVault } from '../../context/VaultContext';
import { usePrivacy } from '../../context/PrivacyContext';
import { Sparkles, ArrowRight, LogOut, Keyboard, Heart, X as CloseIcon } from 'lucide-react';
import { getEffectiveShortcuts, APP_SHORTCUTS, formatKeyDisplay } from '../../services/shortcuts';
import type { TransactionEntryMode } from '../transactions/QuickAddModal';
import { initHardwareBackButton, configureStatusBar } from '../../utils/native';

export const AppLayout: React.FC = () => {
  const { activeVault, exitDemoVault } = useAuth();
  const { transactions, accounts } = useVault();
  const { togglePrivacy } = usePrivacy();
  const navigate = useNavigate();
  const location = useLocation();
  const isNotesView = location.pathname === '/notes';
  const isDemoMode = Boolean(activeVault?.isDemo || activeVault?.name.toLowerCase().includes('demo'));

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<TransactionEntryMode>('expense');
  const [isNewVaultOpen, setIsNewVaultOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(() => !localStorage.getItem('khataghar_welcome_seen'));
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [autoUpdateData, setAutoUpdateData] = useState<AppVersionInfo | null>(null);
  const [isAutoUpdateOpen, setIsAutoUpdateOpen] = useState(false);

  // Daily Background Update Check (silently runs once every 24h on startup)
  useEffect(() => {
    checkDailyUpdate(APP_VERSION)
      .then((info) => {
        if (info) {
          setAutoUpdateData(info);
          setIsAutoUpdateOpen(true);
        }
      })
      .catch(() => {});
  }, []);

  const effectiveShortcuts = useMemo(
    () => getEffectiveShortcuts(activeVault?.customShortcuts),
    [activeVault?.customShortcuts]
  );

  // Global Keyboard Shortcuts (active across whole app)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isEditable =
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        activeTag === 'select' ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      if (isEditable) return;

      const key = e.key.toLowerCase();

      if (key === effectiveShortcuts.new_expense) {
        e.preventDefault();
        setQuickAddType('expense');
        setIsQuickAddOpen(true);
      } else if (key === effectiveShortcuts.new_income) {
        e.preventDefault();
        setQuickAddType('income');
        setIsQuickAddOpen(true);
      } else if (key === effectiveShortcuts.new_transfer) {
        e.preventDefault();
        setQuickAddType('transfer');
        setIsQuickAddOpen(true);
      } else if (key === effectiveShortcuts.new_invest) {
        e.preventDefault();
        setQuickAddType('invest');
        setIsQuickAddOpen(true);
      } else if (key === effectiveShortcuts.new_debt) {
        e.preventDefault();
        setQuickAddType('debt_payment');
        setIsQuickAddOpen(true);
      } else if (key === effectiveShortcuts.new_people) {
        e.preventDefault();
        setQuickAddType('people');
        setIsQuickAddOpen(true);
      } else if (key === effectiveShortcuts.toggle_privacy) {
        e.preventDefault();
        togglePrivacy();
      } else if (key === effectiveShortcuts.help) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      } else if (key === effectiveShortcuts.nav_dashboard) {
        e.preventDefault();
        navigate('/');
      } else if (key === effectiveShortcuts.nav_transactions) {
        e.preventDefault();
        navigate('/transactions');
      } else if (key === effectiveShortcuts.nav_accounts) {
        e.preventDefault();
        navigate('/accounts');
      } else if (key === effectiveShortcuts.nav_assets) {
        e.preventDefault();
        navigate('/assets');
      } else if (key === effectiveShortcuts.nav_people) {
        e.preventDefault();
        navigate('/people');
      } else if (key === effectiveShortcuts.nav_budgets) {
        e.preventDefault();
        navigate('/budgets');
      } else if (key === effectiveShortcuts.nav_reports) {
        e.preventDefault();
        navigate('/reports');
      } else if (key === effectiveShortcuts.nav_import) {
        e.preventDefault();
        navigate('/import');
      } else if (key === effectiveShortcuts.nav_settings) {
        e.preventDefault();
        navigate('/settings');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [effectiveShortcuts, togglePrivacy, navigate]);

  // Auto-dismiss toast message after 5.5s
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 5500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Sync Android Status Bar with theme
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    configureStatusBar(isDark);
  }, [location.pathname]);

  // Android Hardware Back Button listener
  useEffect(() => {
    const unsub = initHardwareBackButton(() => {
      if (isQuickAddOpen) {
        setIsQuickAddOpen(false);
        return true;
      }
      if (isShortcutsOpen) {
        setIsShortcutsOpen(false);
        return true;
      }
      if (isSyncModalOpen) {
        setIsSyncModalOpen(false);
        return true;
      }
      if (isSupportModalOpen) {
        setIsSupportModalOpen(false);
        return true;
      }
      if (isNewVaultOpen) {
        setIsNewVaultOpen(false);
        return true;
      }
      if (isWelcomeOpen) {
        setIsWelcomeOpen(false);
        return true;
      }
      if (isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
        return true;
      }
      return false;
    });

    return () => unsub();
  }, [
    isQuickAddOpen,
    isShortcutsOpen,
    isSyncModalOpen,
    isSupportModalOpen,
    isNewVaultOpen,
    isWelcomeOpen,
    isMobileMenuOpen,
  ]);

  // Milestone & Appreciation Support Modal Trigger
  // Triggers once user reaches 10+ entries, then every 7 days (1 week)
  useEffect(() => {
    if (!activeVault || isDemoMode) return;

    try {
      // If user permanently opted out in Settings or Modal, do nothing
      const isOptedOut = localStorage.getItem('khata_coffee_opt_out') === 'true';
      if (isOptedOut) return;

      // Must have recorded at least 10 entries
      const totalEntries = transactions.length;
      if (totalEntries < 10) return;

      // Don't interrupt onboarding / initial tour
      const welcomeSeen = localStorage.getItem('khataghar_welcome_seen') === 'true';
      if (!welcomeSeen || isWelcomeOpen) return;

      const lastPromptTsStr = localStorage.getItem('khata_coffee_last_prompt_ts');
      const now = Date.now();
      const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

      if (!lastPromptTsStr) {
        // Milestone reached: First prompt after 10+ entries!
        const timer = setTimeout(() => {
          setIsSupportModalOpen(true);
        }, 2500);
        return () => clearTimeout(timer);
      } else {
        const lastPromptTs = Number(lastPromptTsStr);
        if (now - lastPromptTs >= ONE_WEEK_MS) {
          const timer = setTimeout(() => {
            setIsSupportModalOpen(true);
          }, 2500);
          return () => clearTimeout(timer);
        }
      }
    } catch {
      // ignore localStorage errors
    }
  }, [transactions.length, activeVault, isDemoMode, isWelcomeOpen]);

  const handleSnoozeSupport = () => {
    try {
      localStorage.setItem('khata_coffee_last_prompt_ts', String(Date.now()));
    } catch {}
    setIsSupportModalOpen(false);
    setToastMessage(
      'No worries! KhataGHAR is and will always remain 100% free, private, and offline forever.'
    );
  };

  const handleOptOutSupport = () => {
    try {
      localStorage.setItem('khata_coffee_opt_out', 'true');
      localStorage.setItem('khata_coffee_last_prompt_ts', String(Date.now()));
    } catch {}
    setIsSupportModalOpen(false);
    setToastMessage(
      'Support reminders disabled. KhataGHAR stays 100% free, private, and offline forever.'
    );
  };

  const handleBuyCoffeeSupport = () => {
    try {
      localStorage.setItem('khata_coffee_last_prompt_ts', String(Date.now()));
    } catch {}
    setIsSupportModalOpen(false);
    window.open('https://buymeacoffee.com/Krrish1411', '_blank', 'noopener,noreferrer');
    setToastMessage(
      'Thank you deeply for supporting sovereign, independent software! ❤️'
    );
  };

  return (
    <div className="h-screen h-[100dvh] overflow-hidden flex bg-ground text-ink transition-colors">
      {/* Desktop Fixed Sidebar + Mobile Drawer */}
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onOpenSync={() => setIsSyncModalOpen(true)}
      />

      {/* Main Content Column (Scrolls independently while Sidebar remains permanently fixed) */}
      <div className={`flex-1 flex flex-col min-w-0 h-screen h-[100dvh] overflow-y-auto overflow-x-hidden custom-scrollbar ${isNotesView ? 'overflow-hidden pb-0' : 'pb-24 md:pb-8'}`}>
        {/* Demo Mode Top Banner */}
        {isDemoMode && (
          <div className="shrink-0 bg-gradient-to-r from-pine-900 via-pine-800 to-pine-950 text-white px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 border-b border-pine-700/60 shadow-xs">
            <div className="flex items-center gap-2 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                <b>Demo Mode:</b> You can view all accounts, assets & charts. You can <b>edit any existing transaction</b> to test live recalculations!
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsNewVaultOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-[11px] shadow-xs cursor-pointer flex items-center gap-1 transition-all"
              >
                <span>Create Master Vault</span>
                <ArrowRight className="w-3 h-3" />
              </button>
              <button
                onClick={exitDemoVault}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 font-semibold text-[11px] cursor-pointer flex items-center gap-1 transition-all"
                title="Exit Demo and delete temporary demo data"
              >
                <LogOut className="w-3 h-3" />
                <span>Exit Demo</span>
              </button>
            </div>
          </div>
        )}

        <Header
          onOpenQuickAdd={() => setIsQuickAddOpen(true)}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onOpenWelcome={() => setIsWelcomeOpen(true)}
          onOpenSync={() => setIsSyncModalOpen(true)}
        />

        <main className={`flex-1 w-full min-h-0 ${isNotesView ? 'px-3 sm:px-6 lg:px-8 py-3.5 flex flex-col overflow-hidden' : 'px-3 sm:px-6 lg:px-8 py-5'}`}>
          <Outlet />
        </main>
      </div>

      {/* P2P Device Sync Modal */}
      {isSyncModalOpen && (
        <P2PSyncModal
          isOpen={isSyncModalOpen}
          onClose={() => setIsSyncModalOpen(false)}
        />
      )}

      {/* Mobile Bottom Navigation */}
      <BottomNav
        onOpenMore={() => setIsMobileMenuOpen(true)}
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
      />

      {/* Global Privacy Re-Auth Modal */}
      <PrivacyAuthModal />

      {/* Quick Add Modal */}
      {isQuickAddOpen && (
        <QuickAddModal
          isOpen={isQuickAddOpen}
          onClose={() => setIsQuickAddOpen(false)}
          initialType={quickAddType}
        />
      )}

      {/* Global Keyboard Shortcuts Cheat Sheet Modal */}
      {isShortcutsOpen && (
        <Modal
          isOpen={isShortcutsOpen}
          onClose={() => setIsShortcutsOpen(false)}
          title={
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-pine-50 dark:bg-pine-950/40 text-pine-600 border border-pine-200/60 dark:border-pine-800/40">
                <Keyboard className="w-5 h-5" />
              </div>
              <div>
                <span className="text-base sm:text-lg font-bold text-ink">
                  Smart Keyboard Navigation
                </span>
                <span className="block text-xs text-ink/50">
                  Speed shortcuts for rapid entry & navigation across the entire app
                </span>
              </div>
            </div>
          }
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="divide-y divide-line text-xs max-h-96 overflow-y-auto custom-scrollbar pr-1">
              {APP_SHORTCUTS.map((s) => (
                <div key={s.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-semibold text-ink block truncate">{s.name}</span>
                    <span className="text-[11px] text-ink/50 block truncate">{s.description}</span>
                  </div>
                  <kbd className="px-2.5 py-1 rounded-lg bg-moss border border-line font-mono font-bold text-xs text-ink shrink-0 shadow-2xs">
                    {formatKeyDisplay(effectiveShortcuts[s.id] || s.defaultKey)}
                  </kbd>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-line">
              <span className="text-[11px] text-ink/50">
                Tip: You can customize all keys in <b>Settings &gt; Keyboard Shortcuts</b>
              </span>
              <Button variant="primary" size="sm" onClick={() => setIsShortcutsOpen(false)}>
                Got it
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Welcome Screen & Onboarding Tour */}
      <WelcomeModal
        isOpen={isWelcomeOpen}
        onClose={() => setIsWelcomeOpen(false)}
      />

      {/* Master Vault Creation Modal from Demo Bar */}
      {isNewVaultOpen && (
        <OnboardingModal
          isOpen={isNewVaultOpen}
          onClose={() => setIsNewVaultOpen(false)}
          isInitialSetup={false}
        />
      )}

      {/* Reassurance Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[150] max-w-md w-[92%] sm:w-auto px-4 py-3 rounded-2xl bg-card border border-pine-500/40 text-ink shadow-2xl backdrop-blur-md flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Heart className="w-4 h-4 fill-amber-500 text-amber-500" />
          </div>
          <p className="text-xs font-semibold text-ink leading-snug flex-1">
            {toastMessage}
          </p>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 rounded-lg text-ink/40 hover:text-ink hover:bg-moss shrink-0 transition cursor-pointer"
            aria-label="Dismiss notification"
          >
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Milestone & Supporter Coffee Modal */}
      {isSupportModalOpen && (
        <SupportCoffeeModal
          open={isSupportModalOpen}
          onClose={handleSnoozeSupport}
          completedEntriesCount={transactions.length}
          totalAccountsCount={accounts.length}
          onSnoozeWeek={handleSnoozeSupport}
          onPermanentOptOut={handleOptOutSupport}
          onBuyCoffee={handleBuyCoffeeSupport}
        />
      )}

      {/* In-App Update Modal */}
      {isAutoUpdateOpen && (
        <UpdateModal
          open={isAutoUpdateOpen}
          onClose={() => setIsAutoUpdateOpen(false)}
          data={autoUpdateData}
        />
      )}
    </div>
  );
};
