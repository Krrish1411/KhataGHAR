import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { PrivacyAuthModal } from '../security/PrivacyAuthModal';
import { QuickAddModal } from '../transactions/QuickAddModal';
import { WelcomeModal } from '../common/WelcomeModal';
import { OnboardingModal } from '../security/OnboardingModal';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, ArrowRight, LogOut } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { activeVault, exitDemoVault } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isNewVaultOpen, setIsNewVaultOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(() => !localStorage.getItem('khataghar_welcome_seen'));

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
        />
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
