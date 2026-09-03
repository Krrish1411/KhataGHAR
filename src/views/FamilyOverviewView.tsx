import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import { usePrivacy } from '../context/PrivacyContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { AnimatedNumber } from '../components/common/AnimatedNumber';
import { OnboardingModal } from '../components/security/OnboardingModal';
import type { VaultMeta } from '../types';
import {
  Home,
  Users2,
  Lock,
  Plus,
  Shield,
  Sparkles,
  Layers,
  CheckCircle2,
} from 'lucide-react';

export const FamilyOverviewView: React.FC = () => {
  const { allVaults, activeVault } = useAuth();
  const { accounts, assets, liabilities, updateVaultSettings } = useVault();
  const { isPrivacyMode } = usePrivacy();

  const [isCreateVaultOpen, setIsCreateVaultOpen] = useState(false);

  const baseCurrency = activeVault?.currency || 'INR';
  const numberFormat = activeVault?.numberFormat || 'indian';

  // Calculate current active vault totals
  const activeLiquid = accounts.reduce((sum, a) => sum + a.balance, 0);
  const activeAssets = assets.reduce((sum, a) => sum + a.currentValue, 0);
  const activeLiabilities = liabilities.reduce((sum, l) => sum + l.outstandingBalance, 0);
  const activeNetWorth = activeLiquid + activeAssets - activeLiabilities;

  const handleToggleFamilyInclusion = async (val: boolean) => {
    await updateVaultSettings({ includeInFamilyOverview: val });
  };

  return (
    <div className="space-y-5 w-full max-w-[1600px] mx-auto px-1 sm:px-2 pb-14 anim-fade">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 grid place-items-center text-pine-600">
              <Home className="w-4 h-4" />
            </span>
            <h1 className="font-display font-extrabold text-[22px] sm:text-[24px] tracking-tight text-ink">
              Family Vaults & Multi-Enclave Hub
            </h1>
          </div>
          <p className="text-xs text-ink/50 mt-1">
            Maintain independent encrypted vaults for parents, spouse, or business with distinct master passwords
          </p>
        </div>

        <button
          onClick={() => setIsCreateVaultOpen(true)}
          className="px-4 py-2 rounded-xl bg-pine-700 hover:bg-pine-600 active:scale-[0.97] text-white text-xs font-bold shadow-sm shadow-pine-900/20 flex items-center gap-1.5 cursor-pointer transition-all self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Family Vault</span>
        </button>
      </div>

      {/* Architecture Info Banner */}
      <div className="rounded-2xl border border-line bg-moss/70 p-4 space-y-1 lift">
        <div className="flex items-center gap-2 text-xs font-bold text-ink">
          <Sparkles className="w-4 h-4 text-pine-600" />
          <span>Multi-Vault Architecture (Zero-Sync & 100% Cryptographic Segregation)</span>
        </div>
        <p className="text-[12px] text-ink/65 leading-relaxed">
          Each family member's vault (e.g. "Mom's Finances", "Pension Vault", "Business Petty Cash") has its own unique master password and AES-256-GCM encryption key. They remain isolated on your device and can be seamlessly switched via the top header.
        </p>
      </div>

      {/* Hero Snapshot Card */}
      <div className="rounded-2xl border border-line bg-card p-5 sm:p-6 space-y-4 shadow-sm lift">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink/45 block">
              Active Vault Net Worth ({activeVault?.name})
            </span>
            <div className="font-display font-extrabold text-3xl sm:text-4xl num text-ink mt-1 tracking-tight">
              <AnimatedNumber
                value={activeNetWorth}
                currency={baseCurrency}
                numberFormat={numberFormat}
                isPrivacyMode={isPrivacyMode}
              />
            </div>
          </div>
          <div>
            <Badge tone="pine" icon={<Layers className="w-3 h-3" />}>
              {allVaults.length} Vault(s) on this Device
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-line text-xs">
          <div className="p-3.5 rounded-xl bg-moss/70 border border-line">
            <span className="text-ink/45 text-[10px] font-bold uppercase tracking-wider block">
              Liquid Accounts
            </span>
            <span className="font-display font-extrabold text-lg num text-pine-700 dark:text-pine-400 block mt-0.5">
              <AnimatedNumber
                value={activeLiquid}
                currency={baseCurrency}
                numberFormat={numberFormat}
                isPrivacyMode={isPrivacyMode}
              />
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-moss/70 border border-line">
            <span className="text-ink/45 text-[10px] font-bold uppercase tracking-wider block">
              Real Estate & Assets
            </span>
            <span className="font-display font-extrabold text-lg num text-ink block mt-0.5">
              <AnimatedNumber
                value={activeAssets}
                currency={baseCurrency}
                numberFormat={numberFormat}
                isPrivacyMode={isPrivacyMode}
              />
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-moss/70 border border-line">
            <span className="text-ink/45 text-[10px] font-bold uppercase tracking-wider block">
              Debt & Loans
            </span>
            <span className="font-display font-extrabold text-lg num text-flare-600 block mt-0.5">
              <AnimatedNumber
                value={activeLiabilities}
                currency={baseCurrency}
                numberFormat={numberFormat}
                isPrivacyMode={isPrivacyMode}
              />
            </span>
          </div>
        </div>
      </div>

      {/* Vault List & Settings */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-display font-bold text-xs uppercase tracking-wider text-ink/75">
            Managed Vaults ({allVaults.length})
          </h3>
          <button
            onClick={() => setIsCreateVaultOpen(true)}
            className="text-[11.5px] font-semibold text-pine-700 hover:underline flex items-center gap-1 cursor-pointer"
          >
            + add another vault
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {allVaults.map((vault: VaultMeta) => {
            const isActive = activeVault?.id === vault.id;
            return (
              <div
                key={vault.id}
                className={`rounded-2xl border bg-card p-4 sm:p-5 space-y-3 shadow-sm lift flex flex-col justify-between ${
                  isActive ? 'border-pine-400/50 bg-pine-50/20 dark:bg-pine-950/20' : 'border-line'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-display font-bold text-sm text-ink">{vault.name}</h4>
                        {vault.isPrimary && <Badge tone="mari">Primary</Badge>}
                        {isActive && <Badge tone="pine">Active</Badge>}
                      </div>
                      <span className="text-[11px] text-ink/45 block mt-1">
                        Currency: {vault.currency} • Format: {vault.numberFormat}
                      </span>
                    </div>

                    <div className="w-8 h-8 rounded-xl bg-moss border border-line grid place-items-center text-ink/40 shrink-0">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-line flex items-center justify-between text-xs">
                  {isActive ? (
                    <label className="flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeVault?.includeInFamilyOverview ?? true}
                        onChange={(e) => handleToggleFamilyInclusion(e.target.checked)}
                        className="rounded border-line text-pine-600 focus:ring-pine-500 cursor-pointer"
                      />
                      <span>Include in Summary</span>
                    </label>
                  ) : (
                    <span className="text-ink/45 text-[11px] font-medium">
                      Switch in top header to unlock
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Onboarding / New Vault Modal */}
      {isCreateVaultOpen && (
        <OnboardingModal
          isOpen={isCreateVaultOpen}
          onClose={() => setIsCreateVaultOpen(false)}
          isInitialSetup={false}
        />
      )}
    </div>
  );
};
