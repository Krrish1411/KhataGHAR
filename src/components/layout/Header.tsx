import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePrivacy } from '../../context/PrivacyContext';
import { useTheme, type ThemePalette } from '../../context/ThemeContext';
import { Button } from '../common/Button';
import { OnboardingModal } from '../security/OnboardingModal';
import {
  Eye,
  EyeOff,
  Lock,
  Palette,
  Shield,
  ChevronDown,
  Plus,
  Menu,
  Check,
  IndianRupee,
} from 'lucide-react';

interface HeaderProps {
  onOpenQuickAdd: () => void;
  onToggleMobileMenu: () => void;
}

const THEME_PRESETS: Array<{ id: ThemePalette; name: string; isDark: boolean; color: string }> = [
  { id: 'pine', name: 'Pine Forest', isDark: false, color: '#12855a' },
  { id: 'ember', name: 'Warm Ember', isDark: false, color: '#d97706' },
  { id: 'night', name: 'Obsidian Night', isDark: true, color: '#0a0f0c' },
  { id: 'ocean', name: 'Arctic Ocean', isDark: false, color: '#2563eb' },
  { id: 'dusk', name: 'Indigo Dusk', isDark: true, color: '#1e293b' },
  { id: 'sand', name: 'Olive Sand', isDark: false, color: '#65a30d' },
  { id: 'berry', name: 'Violet Berry', isDark: true, color: '#701a75' },
  { id: 'graphite', name: 'Monochrome', isDark: true, color: '#18181b' },
];

export const Header: React.FC<HeaderProps> = ({ onOpenQuickAdd, onToggleMobileMenu }) => {
  const { activeVault, allVaults, lockVault, setActiveVaultMeta } = useAuth();
  const { isPrivacyMode, togglePrivacy } = usePrivacy();
  const { currentPalette, setTheme } = useTheme();

  const [vaultDropdownOpen, setVaultDropdownOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [isNewVaultModalOpen, setIsNewVaultModalOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-moss/80 backdrop-blur-md border-b border-line px-4 sm:px-6 h-[60px] flex items-center transition-colors">
      <div className="flex items-center justify-between gap-3 max-w-8xl mx-auto w-full">
        {/* Left: Mobile Menu Trigger + Vault Selector */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-1.5 rounded-xl text-ink/70 hover:bg-moss transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Brand Icon */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-pine-700 text-white shadow-md shadow-pine-900/20">
              <IndianRupee className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="hidden sm:block leading-tight">
              <h1 className="text-xs font-bold font-display tracking-tight text-ink">Khata Ghar</h1>
              <p className="text-[10px] text-ink/50 -mt-0.5">Encrypted wealth ledger</p>
            </div>
          </div>

          {/* Vault Selector Dropdown */}
          <div className="relative ml-1 sm:ml-2">
            <button
              onClick={() => setVaultDropdownOpen(!vaultDropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-card hover:border-pine-300 border border-line text-xs font-semibold text-ink transition-all cursor-pointer shadow-xs"
              aria-haspopup="true"
              aria-expanded={vaultDropdownOpen}
              aria-label="Select active vault enclave"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-pine-500 flex-shrink-0" />
              <Shield className="w-3.5 h-3.5 text-pine-600 flex-shrink-0" />
              <span className="truncate max-w-[110px] sm:max-w-[180px]">
                {activeVault?.name || 'My Vault'}
              </span>
              <ChevronDown className="w-3 h-3 text-ink/40 flex-shrink-0" />
            </button>

            {vaultDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setVaultDropdownOpen(false)}
                  aria-hidden="true"
                />
                <div className="absolute left-0 mt-1.5 w-64 rounded-2xl bg-card border border-line shadow-card py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1 text-[10px] font-bold text-ink/40 uppercase tracking-wider">
                    Enclaves & Vaults
                  </div>
                  <div className="max-h-52 overflow-y-auto custom-scrollbar px-1 space-y-0.5">
                    {allVaults.map((vault) => {
                      const isActive = activeVault?.id === vault.id;
                      return (
                        <button
                          key={vault.id}
                          onClick={() => {
                            setActiveVaultMeta(vault);
                            setVaultDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs text-left transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-pine-50 dark:bg-pine-950/40 text-pine-700 dark:text-pine-300 font-bold border border-pine-200/60 dark:border-pine-800/40'
                              : 'text-ink/80 hover:bg-moss'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Shield className="w-3.5 h-3.5 text-ink/40 flex-shrink-0" />
                            <span className="truncate">{vault.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {vault.isPrimary && (
                              <span className="text-[10px] bg-moss text-ink/60 px-1.5 py-0.5 rounded font-medium border border-line">
                                Main
                              </span>
                            )}
                            {isActive && <Check className="w-3.5 h-3.5 text-pine-600" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-1 mt-1 border-t border-line">
                    <button
                      onClick={() => {
                        setVaultDropdownOpen(false);
                        setIsNewVaultModalOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-moss hover:bg-pine-50 dark:hover:bg-pine-950/40 text-ink text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create New Enclave Vault</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quick Add Button */}
          <Button
            onClick={onOpenQuickAdd}
            variant="primary"
            size="sm"
            className="hidden sm:inline-flex"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>Record Entry</span>
          </Button>

          {/* Instant 0ms Privacy Mode Toggle */}
          <button
            onClick={togglePrivacy}
            title={isPrivacyMode ? 'Unlock numbers (Enter Password)' : 'Hide numbers (Instant Privacy)'}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isPrivacyMode
                ? 'bg-mari-100/80 border-mari-400 text-mari-700'
                : 'bg-card border-line text-ink/70 hover:border-pine-300'
            }`}
            aria-label="Toggle Privacy Mask"
          >
            {isPrivacyMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>

          {/* PaisaBook 8-Theme Palette Selector */}
          <div className="relative">
            <button
              onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
              title="Select theme palette"
              className="p-2 rounded-xl bg-card border border-line text-ink/70 hover:border-pine-300 transition-colors cursor-pointer"
              aria-label="Select Theme Palette"
            >
              <Palette className="w-3.5 h-3.5" />
            </button>

            {themeDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setThemeDropdownOpen(false)}
                  aria-hidden="true"
                />
                <div className="absolute right-0 mt-1.5 w-48 rounded-2xl bg-card border border-line shadow-card py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1 text-[10px] font-bold text-ink/40 uppercase tracking-wider">
                    Palette Theme (8)
                  </div>
                  <div className="p-1 space-y-0.5">
                    {THEME_PRESETS.map((p) => {
                      const isSelected = currentPalette === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            setTheme(p.id);
                            setThemeDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-pine-50 dark:bg-pine-950/50 font-bold text-pine-700 dark:text-pine-300'
                              : 'text-ink/80 hover:bg-moss'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full border border-black/10 shrink-0"
                              style={{ backgroundColor: p.color }}
                            />
                            <span>{p.name}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-pine-600" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Lock Session Button */}
          <button
            onClick={lockVault}
            title="Lock Vault immediately"
            className="p-2 rounded-xl bg-card border border-line text-ink/70 hover:text-flare-600 hover:border-flare-300 transition-colors cursor-pointer"
            aria-label="Lock Vault"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* New Vault Modal */}
      {isNewVaultModalOpen && (
        <OnboardingModal
          isOpen={isNewVaultModalOpen}
          onClose={() => setIsNewVaultModalOpen(false)}
          isInitialSetup={false}
        />
      )}
    </header>
  );
};
