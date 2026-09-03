import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { createVault } from '../../services/storage';
import { generateDemoDataset } from '../../services/demoData';
import { encryptData, deriveKey } from '../../services/crypto';
import { db } from '../../db';
import { OnboardingModal } from '../security/OnboardingModal';
import { importVaultEncrypted } from '../../services/backup';
import type { EncryptedRecord } from '../../types';
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
  IndianRupee,
  ChevronRight,
  ShieldCheck,
  FileSpreadsheet,
  Users,
  PieChart,
  Wallet,
  Coins,
  Scale,
  Moon,
  Sun,
  KeyRound,
  Download,
  Upload,
  Layers,
  ArrowLeft,
} from 'lucide-react';

interface WelcomeLandingViewProps {
  onBackToLock?: () => void;
  canGoBackToLock?: boolean;
}

export const WelcomeLandingView: React.FC<WelcomeLandingViewProps> = ({
  onBackToLock,
  canGoBackToLock = false,
}) => {
  const { setSessionCredentials, refreshVaultList, allVaults } = useAuth();
  const { theme, setTheme } = useTheme();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [demoError, setDemoError] = useState('');

  // Restore Modal states
  const [backupFileText, setBackupFileText] = useState('');
  const [backupFileName, setBackupFileName] = useState('');
  const [backupSecret, setBackupSecret] = useState('');
  const [restoreError, setRestoreError] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

  // Close modals on Escape key
  React.useEffect(() => {
    if (!isRestoreOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsRestoreOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isRestoreOpen]);

  // 1-Click Instant Demo Exploration
  const handleExploreDemo = async () => {
    setIsLoadingDemo(true);
    setDemoError('');
    try {
      const demoPassword = 'DemoPassword123!@';

      // 0. Check if a demo vault already exists — do NOT create a 2nd demo vault!
      const existingDemo = allVaults.find((v) => v.isDemo || v.name.toLowerCase().includes('demo'));
      if (existingDemo) {
        const key = await deriveKey(demoPassword, existingDemo.salt);
        setSessionCredentials(existingDemo, key);
        localStorage.setItem('khataghar_welcome_seen', 'true');
        return;
      }

      const demoVaultName = 'Demo Enclave (Krish Patel)';

      // 1. Create demo vault
      const { vault, key } = await createVault({
        name: demoVaultName,
        password: demoPassword,
        currency: 'INR',
        numberFormat: 'indian',
        fyStartMonth: 4,
        isPrimary: allVaults.length === 0,
      });

      // Tag as ephemeral demo vault
      vault.isDemo = true;
      await db.vaults.put(vault);

      // 2. Generate comprehensive 4-month realistic Indian demo data
      const demo = generateDemoDataset(vault.id, 'INR');

      // 3. Encrypt and store all demo records
      const recordsToStore: EncryptedRecord[] = [];
      const encryptList = async (items: any[], type: EncryptedRecord['type']) => {
        for (const item of items) {
          const enc = await encryptData(item, key);
          recordsToStore.push({
            id: item.id,
            vaultId: vault.id,
            type,
            iv: enc.iv,
            ciphertext: enc.ciphertext,
            updatedAt: item.updatedAt || new Date().toISOString(),
          });
        }
      };

      await encryptList(demo.accounts, 'account');
      await encryptList(demo.transactions, 'transaction');
      await encryptList(demo.categories, 'category');
      await encryptList(demo.peopleLedger, 'people');
      await encryptList(demo.budgets, 'budget');
      await encryptList(demo.goals, 'goal');
      await encryptList(demo.assets, 'asset');
      await encryptList(demo.liabilities, 'liability');
      await encryptList(demo.plannedExpenses, 'plan');

      await db.records.bulkPut(recordsToStore);

      // 4. Unlock and activate session
      await refreshVaultList();
      setSessionCredentials(vault, key);
      localStorage.setItem('khataghar_welcome_seen', 'true');
    } catch (err: any) {
      setDemoError(err?.message || 'Failed to initialize demo data');
    } finally {
      setIsLoadingDemo(false);
    }
  };

  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backupFileText || !backupSecret) return;
    setIsRestoring(true);
    setRestoreError('');
    try {
      await importVaultEncrypted(backupFileText, backupSecret);
      await refreshVaultList();
      setIsRestoreOpen(false);
      if (onBackToLock) onBackToLock();
    } catch (err: any) {
      setRestoreError(err?.message || 'Restore failed. Check file and password.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div
      style={{ zoom: 1.25 }}
      className="min-h-screen bg-ground text-ink flex flex-col selection:bg-pine-500 selection:text-white transition-colors"
    >
      {/* Top Header / Nav */}
      <header className="sticky top-0 z-40 bg-card/85 backdrop-blur-md border-b border-line px-4 sm:px-8 py-3.5 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pine-700 text-white shadow-md shadow-pine-900/30">
              <IndianRupee className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-black text-[17px] tracking-tight text-ink">
                  KhataGHAR
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-pine-100 dark:bg-pine-950/60 text-pine-800 dark:text-pine-300 border border-pine-300/40">
                  Zero-Cloud · AES-256-GCM
                </span>
              </div>
              <p className="text-[11px] text-ink/50 -mt-0.5">Sovereign Wealth Operating System</p>
            </div>
          </div>

          {/* Quick Nav Links & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {canGoBackToLock && onBackToLock && (
              <button
                onClick={onBackToLock}
                className="px-3 py-1.5 rounded-xl border border-line bg-card hover:bg-moss text-xs font-semibold text-ink flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Vault Lock</span>
              </button>
            )}

            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl border border-line bg-card hover:bg-moss text-ink/70 transition-colors cursor-pointer"
              title="Toggle Theme"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-pine-600" />}
            </button>

            <button
              onClick={() => setIsRestoreOpen(true)}
              className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-line bg-card hover:bg-moss text-xs font-semibold text-ink transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-pine-600" />
              <span>Restore Backup</span>
            </button>

            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2 rounded-xl bg-pine-700 hover:bg-pine-600 text-white text-xs font-bold shadow-md shadow-pine-900/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Create Master Vault</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-10 sm:py-16 space-y-20 sm:space-y-24">
        {/* HERO SECTION */}
        <section className="text-center max-w-4xl mx-auto space-y-6 pt-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pine-50 dark:bg-pine-950/60 border border-pine-200/80 dark:border-pine-800/80 text-pine-800 dark:text-pine-300 text-xs font-bold tracking-wide shadow-xs">
            <ShieldCheck className="w-4 h-4 text-pine-600" />
            <span>100% Client-Side Encrypted · Zero Servers · Zero Cloud Leaks</span>
          </div>

          <h2 className="font-display font-black text-3xl sm:text-5xl lg:text-6xl text-ink tracking-tight leading-[1.15]">
            Your Money. Your Wealth.<br />
            <span className="bg-gradient-to-r from-pine-600 via-pine-500 to-pine-700 bg-clip-text text-transparent">
              Zero Cloud. Zero Spying.
            </span>
          </h2>

          <p className="text-base sm:text-lg text-ink/70 max-w-2xl mx-auto font-medium leading-relaxed">
            Tired of finance apps scraping your personal SMS and spamming you with loan calls?
            KhataGHAR is a private on-device financial vault for mutual fund SIPs, physical gold, real estate, debts, and cash flow—encrypted with military-grade <b>AES-256-GCM</b> right in your browser.
          </p>

          {demoError && (
            <div className="p-3 rounded-xl bg-flare-100/80 border border-flare-500/30 text-flare-600 text-xs font-semibold max-w-md mx-auto">
              {demoError}
            </div>
          )}

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-pine-700 hover:bg-pine-600 active:scale-95 text-white font-display font-bold text-sm shadow-lg shadow-pine-900/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <KeyRound className="w-4 h-4 stroke-[2.2]" />
              <span>Create Your Master Vault</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            <button
              onClick={handleExploreDemo}
              disabled={isLoadingDemo}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl border border-line bg-card hover:bg-pine-50 dark:hover:bg-pine-950/40 hover:border-pine-300 font-display font-bold text-sm text-pine-700 dark:text-pine-300 shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-pine-600" />
              <span>{isLoadingDemo ? 'Setting Up Realistic Demo…' : '🚀 Explore with 4-Month Demo Data'}</span>
            </button>

            <button
              onClick={() => setIsRestoreOpen(true)}
              className="w-full sm:w-auto px-5 py-3.5 rounded-2xl border border-line bg-card hover:bg-moss text-xs font-bold text-ink/75 flex items-center justify-center gap-2 transition-all cursor-pointer md:hidden"
            >
              <Upload className="w-4 h-4 text-pine-600" />
              <span>Restore .khataghar</span>
            </button>
          </div>

          <div className="pt-2 text-xs text-ink/45 font-medium flex items-center justify-center gap-4 flex-wrap">
            <span>✓ No Phone Number Required</span>
            <span>✓ No Email or Sign-up</span>
            <span>✓ 100% Offline Capable</span>
            <span>✓ Free & Open Source</span>
          </div>
        </section>

        {/* 3-STEP SIMPLE LANGUAGE GUIDE */}
        <section className="space-y-8">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-pine-700 dark:text-pine-400">
              Simple 3-Step Guide
            </span>
            <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-ink tracking-tight">
              How KhataGHAR Works in Plain English
            </h3>
            <p className="text-xs sm:text-sm text-ink/60">
              Zero complicated banking jargon. Here is how you take full sovereign control of your family wealth:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="p-6 rounded-3xl border border-line bg-card shadow-sm space-y-3.5 relative overflow-hidden">
              <div className="w-10 h-10 rounded-2xl bg-pine-50 dark:bg-pine-950/60 border border-pine-200 dark:border-pine-800 grid place-items-center text-pine-700 font-display font-black text-base">
                1
              </div>
              <h4 className="font-display font-bold text-base text-ink">
                Set Your Master Password
              </h4>
              <p className="text-xs text-ink/65 leading-relaxed">
                Choose a strong master key. Using <b>PBKDF2 (600,000 rounds)</b>, your browser generates an AES-256-GCM encryption key strictly in memory. We have zero servers—nobody except you can unlock your safe.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-3xl border border-line bg-card shadow-sm space-y-3.5 relative overflow-hidden">
              <div className="w-10 h-10 rounded-2xl bg-pine-50 dark:bg-pine-950/60 border border-pine-200 dark:border-pine-800 grid place-items-center text-pine-700 font-display font-black text-base">
                2
              </div>
              <h4 className="font-display font-bold text-base text-ink">
                Add Pre-Existing Wealth Cleanly
              </h4>
              <p className="text-xs text-ink/65 leading-relaxed">
                Already own an apartment, gold jewelry, or mutual funds from past years? Add them as <b>pre-existing holdings</b>—your true net worth increases immediately without corrupting your current bank balance.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-3xl border border-line bg-card shadow-sm space-y-3.5 relative overflow-hidden">
              <div className="w-10 h-10 rounded-2xl bg-pine-50 dark:bg-pine-950/60 border border-pine-200 dark:border-pine-800 grid place-items-center text-pine-700 font-display font-black text-base">
                3
              </div>
              <h4 className="font-display font-bold text-base text-ink">
                Track Spends, SIPs & Loans
              </h4>
              <p className="text-xs text-ink/65 leading-relaxed">
                Use Quick Add (hotkey <b>N</b>) to log daily UPI expenses or monthly SIPs. Investments transfer equity to your assets, and debt repayments reduce your loans—keeping your ledger 100% mathematically accurate.
              </p>
            </div>
          </div>
        </section>

        {/* COMPREHENSIVE APP FEATURES SHOWCASE */}
        <section className="space-y-8">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-pine-700 dark:text-pine-400">
              Institutional-Grade Features
            </span>
            <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-ink tracking-tight">
              Everything You Need to Master Your Financial Future
            </h3>
            <p className="text-xs sm:text-sm text-ink/60">
              Each feature is engineered to protect your privacy and provide genuine financial intelligence:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* Feature 1 */}
            <div className="p-5 rounded-2xl border border-line bg-card shadow-sm space-y-2.5 lift">
              <div className="w-9 h-9 rounded-xl bg-pine-50 dark:bg-pine-950/50 border border-pine-200/70 dark:border-pine-800/60 grid place-items-center text-pine-600">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h4 className="font-display font-bold text-sm text-ink">
                Smart SIP Lot Merging
              </h4>
              <p className="text-[12px] text-ink/65 leading-relaxed">
                <b>In Plain English:</b> Instead of 12 messy cards for your monthly ₹5,000 mutual fund SIP, KhataGHAR merges them into a single fund card, tracking units, average purchase price, and revaluing your portfolio whenever NAV updates.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-5 rounded-2xl border border-line bg-card shadow-sm space-y-2.5 lift">
              <div className="w-9 h-9 rounded-xl bg-mari-100 dark:bg-mari-950/50 border border-mari-400/40 grid place-items-center text-mari-600">
                <EyeOff className="w-4 h-4" />
              </div>
              <h4 className="font-display font-bold text-sm text-ink">
                Duress PIN & Decoy Vault
              </h4>
              <p className="text-[12px] text-ink/65 leading-relaxed">
                <b>In Plain English:</b> If someone forces you to unlock your phone, enter your secret <b>Decoy PIN</b>. The app opens a harmless screen showing small pocket cash (₹2,500) and grocery bills, completely hiding your real estate, gold, and stocks.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-5 rounded-2xl border border-line bg-card shadow-sm space-y-2.5 lift">
              <div className="w-9 h-9 rounded-xl bg-pine-50 dark:bg-pine-950/50 border border-pine-200/70 dark:border-pine-800/60 grid place-items-center text-pine-600">
                <PieChart className="w-4 h-4" />
              </div>
              <h4 className="font-display font-bold text-sm text-ink">
                8-Month Cashflow Burn Radar
              </h4>
              <p className="text-[12px] text-ink/65 leading-relaxed">
                <b>In Plain English:</b> Answers the most important family security question: <i>"If your income stopped today, how many months can your household survive on liquid cash before running out of money?"</i>
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-5 rounded-2xl border border-line bg-card shadow-sm space-y-2.5 lift">
              <div className="w-9 h-9 rounded-xl bg-pine-50 dark:bg-pine-950/50 border border-pine-200/70 dark:border-pine-800/60 grid place-items-center text-pine-600">
                <Scale className="w-4 h-4" />
              </div>
              <h4 className="font-display font-bold text-sm text-ink">
                Debt Freedom Accelerator
              </h4>
              <p className="text-[12px] text-ink/65 leading-relaxed">
                <b>In Plain English:</b> See exactly how much interest you save and how many years you shave off your home loan by paying an extra ₹2,000/month, and compares it against investing that money in an index fund.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-5 rounded-2xl border border-line bg-card shadow-sm space-y-2.5 lift">
              <div className="w-9 h-9 rounded-xl bg-pine-50 dark:bg-pine-950/50 border border-pine-200/70 dark:border-pine-800/60 grid place-items-center text-pine-600">
                <Coins className="w-4 h-4" />
              </div>
              <h4 className="font-display font-bold text-sm text-ink">
                True Double-Entry Ledger
              </h4>
              <p className="text-[12px] text-ink/65 leading-relaxed">
                <b>In Plain English:</b> Other apps treat buying ₹20,000 of gold or stocks as an 'expense' (falsely dropping your net worth). KhataGHAR treats it as an equity transfer—your net worth stays 100% mathematically true.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-5 rounded-2xl border border-line bg-card shadow-sm space-y-2.5 lift">
              <div className="w-9 h-9 rounded-xl bg-mari-100 dark:bg-mari-950/50 border border-mari-400/40 grid place-items-center text-mari-600">
                <Users className="w-4 h-4" />
              </div>
              <h4 className="font-display font-bold text-sm text-ink">
                Family Hub ('Not Your Money')
              </h4>
              <p className="text-[12px] text-ink/65 leading-relaxed">
                <b>In Plain English:</b> Keep track of money lent to friends, borrowed for emergencies, or held in trust for siblings and parents. Prevents you from accidentally spending money that belongs to someone else.
              </p>
            </div>

            {/* Feature 7 */}
            <div className="p-5 rounded-2xl border border-line bg-card shadow-sm space-y-2.5 lift">
              <div className="w-9 h-9 rounded-xl bg-pine-50 dark:bg-pine-950/50 border border-pine-200/70 dark:border-pine-800/60 grid place-items-center text-pine-600">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <h4 className="font-display font-bold text-sm text-ink">
                Indian Schedule-AL Ready
              </h4>
              <p className="text-[12px] text-ink/65 leading-relaxed">
                <b>In Plain English:</b> Pre-organizes your real estate properties, EPF/PPF, physical gold, and equity shares in the exact schedule format required for Indian Income Tax filings.
              </p>
            </div>

            {/* Feature 8 */}
            <div className="p-5 rounded-2xl border border-line bg-card shadow-sm space-y-2.5 lift">
              <div className="w-9 h-9 rounded-xl bg-pine-50 dark:bg-pine-950/50 border border-pine-200/70 dark:border-pine-800/60 grid place-items-center text-pine-600">
                <Lock className="w-4 h-4" />
              </div>
              <h4 className="font-display font-bold text-sm text-ink">
                AES-256 Offline Encryption
              </h4>
              <p className="text-[12px] text-ink/65 leading-relaxed">
                <b>In Plain English:</b> Export encrypted `.khataghar` backup files protected by a 12-word recovery seed. Zero corporate surveillance, zero third-party cookies, and 100% offline functionality.
              </p>
            </div>
          </div>
        </section>

        {/* COMPARISON TABLE: KHATAGHAR VS TRADITIONAL CLOUD APPS */}
        <section className="space-y-6">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-ink tracking-tight">
              Why Sovereign Finance Matters
            </h3>
            <p className="text-xs sm:text-sm text-ink/60">
              See the difference between venture-backed cloud trackers and KhataGHAR:
            </p>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-line bg-card shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-moss/80 border-b border-line text-ink font-bold">
                <tr>
                  <th className="p-4 sm:p-5">Security & Accounting Feature</th>
                  <th className="p-4 sm:p-5 text-pine-700 dark:text-pine-300">KhataGHAR (Sovereign)</th>
                  <th className="p-4 sm:p-5 text-ink/50">Commercial Cloud Apps (Cred, Walnut, Axio)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60 text-ink/75">
                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-ink">Where your data is stored</td>
                  <td className="p-4 sm:p-5 text-pine-700 dark:text-pine-300 font-bold">100% on your device (IndexedDB)</td>
                  <td className="p-4 sm:p-5 text-flare-600 font-medium">AWS/Google Cloud corporate servers</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-ink">Personal SMS Reading</td>
                  <td className="p-4 sm:p-5 text-pine-700 dark:text-pine-300 font-bold">Never (Zero permissions requested)</td>
                  <td className="p-4 sm:p-5 text-flare-600 font-medium">Scrapes entire inbox, OTPs, and sender history</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-ink">Loan Telemarketer Spam</td>
                  <td className="p-4 sm:p-5 text-pine-700 dark:text-pine-300 font-bold">Mathematically Impossible (Zero Servers)</td>
                  <td className="p-4 sm:p-5 text-flare-600 font-medium">Data monetized to sell personal loans & cards</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-ink">SIP & Investment Accounting</td>
                  <td className="p-4 sm:p-5 text-pine-700 dark:text-pine-300 font-bold">True double-entry asset tranches + NAV</td>
                  <td className="p-4 sm:p-5 text-ink/50 font-medium">Treated as lost expense or superficial estimate</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-ink">Physical Coercion Protection</td>
                  <td className="p-4 sm:p-5 text-pine-700 dark:text-pine-300 font-bold">Duress PIN with realistic Decoy Vault</td>
                  <td className="p-4 sm:p-5 text-ink/50 font-medium">None</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* BOTTOM CTA CALLOUT */}
        <section className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-pine-900 via-pine-800 to-pine-950 text-white text-center space-y-6 shadow-xl relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-3 relative z-10">
            <h3 className="font-display font-black text-2xl sm:text-4xl tracking-tight text-white">
              Ready to Reclaim Your Financial Sovereignty?
            </h3>
            <p className="text-sm text-pine-200/80 font-medium leading-relaxed">
              No account creation, no corporate tracking, no phone verification. Initialize your private enclave in 10 seconds.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 relative z-10 pt-2">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white hover:bg-pine-50 active:scale-95 text-pine-900 font-display font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <KeyRound className="w-4 h-4 stroke-[2.2]" />
              <span>Create Master Vault</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleExploreDemo}
              disabled={isLoadingDemo}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl border border-white/20 hover:bg-white/10 text-white font-display font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-pine-300" />
              <span>{isLoadingDemo ? 'Setting Up Demo…' : 'Explore with 4-Month Demo'}</span>
            </button>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-line bg-card/60 px-4 sm:px-8 py-8 text-center text-xs text-ink/50 space-y-2 transition-colors">
        <p className="font-semibold text-ink/75">
          KhataGHAR · The Sovereign Personal Wealth Operating System
        </p>
        <p>
          Architected & Crafted with pride by <span className="text-pine-600 dark:text-pine-400 font-bold">Krish Patel</span>.
          Open-Source, Client-Side Encrypted, Zero-Cloud.
        </p>
      </footer>

      {/* Onboarding / Vault Creation Modal */}
      {isCreateOpen && (
        <OnboardingModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          isInitialSetup={allVaults.length === 0}
        />
      )}

      {/* Restore Backup Modal */}
      {isRestoreOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm anim-fade"
          role="dialog"
          onClick={() => setIsRestoreOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl bg-card border border-line shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-ink flex items-center gap-2">
                <Upload className="w-4 h-4 text-pine-600" />
                <span>Restore .khataghar Backup</span>
              </h3>
              <button
                onClick={() => setIsRestoreOpen(false)}
                className="p-1 rounded-lg text-ink/40 hover:text-ink hover:bg-moss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {restoreError && (
              <div className="p-3 rounded-xl bg-flare-100/80 border border-flare-500/30 text-flare-600 text-xs font-semibold">
                {restoreError}
              </div>
            )}

            <form onSubmit={handleRestoreSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Select .khataghar or .json backup
                </label>
                <input
                  type="file"
                  accept=".khataghar,.json"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setBackupFileName(f.name);
                    const r = new FileReader();
                    r.onload = (evt) => setBackupFileText(evt.target?.result as string);
                    r.readAsText(f);
                  }}
                  className="block w-full text-xs text-ink/60 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-moss file:text-ink hover:file:bg-pine-50 cursor-pointer"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Backup Password or 12-Word Recovery Phrase
                </label>
                <input
                  type="password"
                  placeholder="Enter backup secret…"
                  value={backupSecret}
                  onChange={(e) => setBackupSecret(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-ground text-ink text-xs focus:ring-2 focus:ring-pine-500 outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsRestoreOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-ink/60 hover:text-ink hover:bg-moss cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRestoring}
                  className="px-4 py-2 rounded-xl bg-pine-700 hover:bg-pine-600 text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  {isRestoring ? 'Restoring…' : 'Decrypt & Restore Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
