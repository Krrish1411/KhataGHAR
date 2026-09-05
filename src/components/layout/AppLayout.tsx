import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { PrivacyAuthModal } from '../security/PrivacyAuthModal';
import { QuickAddModal } from '../transactions/QuickAddModal';
import { WelcomeModal } from '../common/WelcomeModal';
import { OnboardingModal } from '../security/OnboardingModal';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { usePrivacy } from '../../context/PrivacyContext';
import { Sparkles, ArrowRight, LogOut, Keyboard } from 'lucide-react';
import { getEffectiveShortcuts, APP_SHORTCUTS, formatKeyDisplay } from '../../services/shortcuts';
import type { TransactionEntryMode } from '../transactions/QuickAddModal';

export const AppLayout: React.FC = () => {
  const { activeVault, exitDemoVault } = useAuth();
  const { togglePrivacy } = usePrivacy();
  const navigate = useNavigate();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<TransactionEntryMode>('expense');
  const [isNewVaultOpen, setIsNewVaultOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(() => !localStorage.getItem('khataghar_welcome_seen'));

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

  const isDemoMode = Boolean(activeVault?.isDemo || activeVault?.name.toLowerCase().includes('demo'));

  return (
    <div
      style={{ zoom: 1.05 }}
      className="min-h-screen flex bg-ground text-ink transition-colors"
    >
      {/* Desktop Sidebar + Mobile Drawer */}
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        {/* Demo Mode Top Banner */}
        {isDemoMode && (
          <div className="bg-gradient-to-r from-pine-900 via-pine-800 to-pine-950 text-white px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 border-b border-pine-700/60 shadow-xs">
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
        />

        <main className="flex-1 px-3 sm:px-6 lg:px-8 py-5 w-full">
          <Outlet />
        </main>
      </div>

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
    </div>
  );
};
