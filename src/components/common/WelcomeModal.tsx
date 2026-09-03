import React, { useState } from 'react';
import { useVault } from '../../context/VaultContext';
import {
  Shield,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lock,
  TrendingUp,
  Landmark,
  EyeOff,
  Zap,
  HelpCircle,
  X,
} from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  const { loadDemoData } = useVault();
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [activeTab, setActiveTab] = useState<'features' | 'quickstart'>('features');

  if (!isOpen) return null;

  const handleDismiss = () => {
    localStorage.setItem('khataghar_welcome_seen', 'true');
    onClose();
  };

  const handleLoadDemo = async () => {
    setIsLoadingDemo(true);
    try {
      await loadDemoData();
      localStorage.setItem('khataghar_welcome_seen', 'true');
      onClose();
    } finally {
      setIsLoadingDemo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md anim-fade" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-2xl rounded-3xl bg-card border border-line shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Decorative Top Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-pine-500 via-pine-400 to-pine-600" />

        {/* Modal Header */}
        <div className="p-6 sm:p-7 pb-4 border-b border-line flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-pine-50 dark:bg-pine-950/60 border border-pine-200/80 dark:border-pine-800/60 grid place-items-center text-pine-600 shrink-0 shadow-inner">
              <Shield className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="font-display font-black text-xl sm:text-2xl text-ink tracking-tight">
                Welcome to KhataGHAR
              </h2>
              <p className="text-xs sm:text-sm text-ink/55 font-medium mt-0.5">
                The Sovereign, Zero-Cloud Personal Financial Operating System
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="p-2 rounded-xl text-ink/40 hover:text-ink hover:bg-moss transition-colors cursor-pointer"
            aria-label="Close welcome screen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-line px-6 bg-moss/40">
          <button
            onClick={() => setActiveTab('features')}
            className={`py-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'features'
                ? 'border-pine-600 text-pine-700 dark:text-pine-300'
                : 'border-transparent text-ink/50 hover:text-ink'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Core Pillars & Security</span>
          </button>
          <button
            onClick={() => setActiveTab('quickstart')}
            className={`py-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'quickstart'
                ? 'border-pine-600 text-pine-700 dark:text-pine-300'
                : 'border-transparent text-ink/50 hover:text-ink'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>3-Step Quick Start</span>
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-5 custom-scrollbar">
          {activeTab === 'features' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Pillar 1 */}
                <div className="p-4 rounded-2xl bg-moss/70 border border-line space-y-1.5">
                  <div className="flex items-center gap-2 text-pine-600 dark:text-pine-400 font-bold text-xs">
                    <Lock className="w-4 h-4" />
                    <span>Zero-Cloud Security</span>
                  </div>
                  <p className="text-[12px] text-ink/70 leading-relaxed">
                    Zero servers, zero analytics, and zero cloud leaks. Everything is encrypted strictly in your device memory with AES-256-GCM.
                  </p>
                </div>

                {/* Pillar 2 */}
                <div className="p-4 rounded-2xl bg-moss/70 border border-line space-y-1.5">
                  <div className="flex items-center gap-2 text-pine-600 dark:text-pine-400 font-bold text-xs">
                    <TrendingUp className="w-4 h-4" />
                    <span>Smart SIP & Asset Merging</span>
                  </div>
                  <p className="text-[12px] text-ink/70 leading-relaxed">
                    Investments transfer equity without burning net worth. Monthly SIPs automatically stack into single holdings with unit NAV tracking.
                  </p>
                </div>

                {/* Pillar 3 */}
                <div className="p-4 rounded-2xl bg-moss/70 border border-line space-y-1.5">
                  <div className="flex items-center gap-2 text-mari-600 dark:text-mari-400 font-bold text-xs">
                    <EyeOff className="w-4 h-4" />
                    <span>Duress Decoy Camouflage</span>
                  </div>
                  <p className="text-[12px] text-ink/70 leading-relaxed">
                    If forced to unlock, enter your Decoy PIN. Opens a believable pocket ledger, hiding high-value real estate, gold, and documents.
                  </p>
                </div>

                {/* Pillar 4 */}
                <div className="p-4 rounded-2xl bg-moss/70 border border-line space-y-1.5">
                  <div className="flex items-center gap-2 text-pine-600 dark:text-pine-400 font-bold text-xs">
                    <Landmark className="w-4 h-4" />
                    <span>Runway & Burn Radar</span>
                  </div>
                  <p className="text-[12px] text-ink/70 leading-relaxed">
                    Unwinds 8-month historical cash flows, calculates household runway, and optimizes debt payoff with opportunity cost modeling.
                  </p>
                </div>
              </div>

              {/* Attribution */}
              <div className="p-3 rounded-xl bg-pine-50/60 dark:bg-pine-950/30 border border-pine-200/50 dark:border-pine-800/40 text-center text-xs text-ink/70">
                Crafted with precision by <span className="font-bold text-pine-700 dark:text-pine-300">Krish Patel</span> for sovereign wealth independence.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                {/* Step 1 */}
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-moss/60 border border-line">
                  <span className="w-6 h-6 rounded-full bg-pine-600 text-white font-bold text-xs grid place-items-center shrink-0">
                    1
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-ink">Add Accounts or Load Demo Data</h4>
                    <p className="text-[11.5px] text-ink/60 mt-0.5">
                      Register your daily bank account, credit card, or cash wallet. Or load our 4-month Indian demo dataset to test all charts right away.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-moss/60 border border-line">
                  <span className="w-6 h-6 rounded-full bg-pine-600 text-white font-bold text-xs grid place-items-center shrink-0">
                    2
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-ink">Register Your Existing Assets & Debts</h4>
                    <p className="text-[11.5px] text-ink/60 mt-0.5">
                      Add your mutual funds, gold, or home loans. By default, historical holdings do not disturb your current bank balances.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-moss/60 border border-line">
                  <span className="w-6 h-6 rounded-full bg-pine-600 text-white font-bold text-xs grid place-items-center shrink-0">
                    3
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-ink">Use Quick Add (Hotkey "N")</h4>
                    <p className="text-[11.5px] text-ink/60 mt-0.5">
                      Record everyday spends, monthly SIPs, or loan EMIs with instant double-entry synchronization and 1-click balance reconciliation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 sm:p-6 border-t border-line bg-card flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={handleLoadDemo}
            disabled={isLoadingDemo}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-line bg-moss hover:bg-pine-50 dark:hover:bg-pine-950/50 text-xs font-bold text-pine-700 dark:text-pine-300 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Sparkles className="w-4 h-4 text-pine-600" />
            <span>{isLoadingDemo ? 'Loading Demo…' : 'Load Demo Data & Tour'}</span>
          </button>

          <button
            onClick={handleDismiss}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-pine-700 hover:bg-pine-600 active:scale-95 text-white text-xs font-bold shadow-md shadow-pine-900/20 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          >
            <span>Proceed to My Vault</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
