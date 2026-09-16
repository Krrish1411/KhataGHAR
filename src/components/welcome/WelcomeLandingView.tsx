import React, { useState, useEffect, useRef } from 'react';
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
  EyeOff,
  Zap,
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
  ArrowLeft,
  ArrowLeftRight,
  ExternalLink,
  Smartphone,
  Monitor,
  Cpu,
  Apple,
  Globe,
  Fingerprint,
  Copy,
  Check,
  Radio,
  Sliders,
  Crown,
  Mail,
  RotateCcw,
  Play,
  Pause,
} from 'lucide-react';
import { WelcomeP2PSyncModal } from '../sync/WelcomeP2PSyncModal';

const APP_VERSION = '1.0.0';

interface WelcomeLandingViewProps {
  onBackToLock?: () => void;
  canGoBackToLock?: boolean;
}

export const WelcomeLandingView: React.FC<WelcomeLandingViewProps> = ({
  onBackToLock,
  canGoBackToLock = false,
}) => {
  const { setSessionCredentials, refreshVaultList, allVaults } = useAuth();
  const { effectiveTheme, setTheme } = useTheme();

  const isDark = effectiveTheme === 'dark';

  const handleToggleTheme = () => {
    setTheme(isDark ? 'pine' : 'night');
  };

  const containerRef = useRef<HTMLDivElement>(null);

  // Smooth scroll helper that accounts for sticky header offset
  const scrollToSection = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el && containerRef.current) {
      const headerHeight = 72;
      const elRect = el.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      const targetScrollTop =
        containerRef.current.scrollTop + (elRect.top - containerRect.top) - headerHeight;
      containerRef.current.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth',
      });
    } else if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [demoError, setDemoError] = useState('');

  // Restore Modal state
  const [backupFileText, setBackupFileText] = useState('');
  const [backupFileName, setBackupFileName] = useState('');
  const [backupSecret, setBackupSecret] = useState('');
  const [restoreError, setRestoreError] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

  // Close modals on Escape key
  useEffect(() => {
    if (!isRestoreOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsRestoreOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isRestoreOpen]);

  // Interactive Simulator State (Financial Dopamine & Engagement)
  const [simTab, setSimTab] = useState<'sip' | 'burn' | 'decoy'>('sip');

  // SIP Simulator State
  const [sipMonthly, setSipMonthly] = useState<number>(10000);
  const [sipRate, setSipRate] = useState<number>(13); // 13% CAGR (Nifty 50 average)
  const [sipYears, setSipYears] = useState<number>(10);

  // Burn Radar Simulator State
  const [monthlyBurn, setMonthlyBurn] = useState<number>(45000);
  const [liquidReserves, setLiquidReserves] = useState<number>(360000);

  // Decoy Vault Simulator State
  const [isDecoyActive, setIsDecoyActive] = useState<boolean>(false);

  // Calculate SIP Future Value
  const monthlyRate = sipRate / 12 / 100;
  const totalMonths = sipYears * 12;
  const totalInvested = sipMonthly * totalMonths;
  const futureValue =
    monthlyRate > 0
      ? sipMonthly * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate) * (1 + monthlyRate)
      : totalInvested;
  const wealthGain = Math.max(0, futureValue - totalInvested);

  const formatRupee = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Math.round(amt));
  };

  // Calculate Burn Runway
  const runwayMonths = monthlyBurn > 0 ? (liquidReserves / monthlyBurn).toFixed(1) : '∞';

  // Platform Downloads State & PWA prompt
  const [activeDownloadDetail, setActiveDownloadDetail] = useState<'ios' | 'android' | null>(null);
  const [copiedSha, setCopiedSha] = useState(false);
  const [pwaPrompt, setPwaPrompt] = useState<any>(() =>
    typeof window !== 'undefined' ? (window as any).__pwaInstallPrompt || null : null
  );

  const handleToggleDetail = (tab: 'ios' | 'android') => {
    setActiveDownloadDetail((prev) => {
      const next = prev === tab ? null : tab;
      if (next) {
        setTimeout(() => {
          const id = next === 'ios' ? 'ios-guide' : 'apk-security';
          const el = document.getElementById(id);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 60);
      }
      return next;
    });
  };

  useEffect(() => {
    const handlePwaPrompt = () => {
      setPwaPrompt((window as any).__pwaInstallPrompt || null);
    };
    window.addEventListener('pwa-prompt-available', handlePwaPrompt);
    return () => window.removeEventListener('pwa-prompt-available', handlePwaPrompt);
  }, []);

  const handleInstallPwa = () => {
    if (pwaPrompt) {
      pwaPrompt.prompt();
      pwaPrompt.userChoice.then(() => {
        (window as any).__pwaInstallPrompt = null;
        setPwaPrompt(null);
      });
    } else {
      setIsCreateOpen(true);
    }
  };

  const handleCopySha = () => {
    const cmd = 'sha256sum KhataGHAR-1.0.0.apk';
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(cmd)
        .then(() => {
          setCopiedSha(true);
          setTimeout(() => setCopiedSha(false), 2500);
        })
        .catch(() => {});
    }
  };

  // 1-Click Instant Demo Exploration
  const handleExploreDemo = async () => {
    setIsLoadingDemo(true);
    setDemoError('');
    try {
      const demoPassword = 'DemoPassword123!@';

      const existingDemo = allVaults.find((v) => v.isDemo || v.name.toLowerCase().includes('demo'));
      if (existingDemo) {
        const key = await deriveKey(demoPassword, existingDemo.salt);
        setSessionCredentials(existingDemo, key);
        localStorage.setItem('khataghar_welcome_seen', 'true');
        return;
      }

      const demoVaultName = 'Demo Enclave (Krish Patel)';

      const { vault, key } = await createVault({
        name: demoVaultName,
        password: demoPassword,
        currency: 'INR',
        numberFormat: 'indian',
        fyStartMonth: 4,
        isPrimary: allVaults.length === 0,
      });

      vault.isDemo = true;
      await db.vaults.put(vault);

      const demo = generateDemoDataset(vault.id, 'INR');

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

  // 8 Core Pillars
  const pillars = [
    {
      icon: TrendingUp,
      title: 'Smart SIP Lot Merging',
      tag: 'Portfolio',
      color: '#12855a',
      desc: 'Instead of messy separate lines for every ₹5,000 monthly SIP debit, KhataGHAR merges them into clean, consolidated mutual fund holding cards.',
      bullets: [
        'Automatic tranche unit aggregation',
        'Weighted average purchase cost tracking',
        'Real-time portfolio revaluation on NAV updates',
        'Instant equity vs debt asset class allocation',
      ],
    },
    {
      icon: EyeOff,
      title: 'Duress PIN & Decoy Vault',
      tag: 'Anti-Extortion',
      color: '#c47a05',
      desc: 'If physically coerced to unlock your device, enter your secret Decoy PIN. The app opens a plausible dummy vault showing small pocket cash and daily tea spends.',
      bullets: [
        'Independent PBKDF2 salt and decoy key derivation',
        'Completely hides real estate, gold, and stock holdings',
        'Zero cryptographic forensic trace of the master safe',
        'Works offline in high-stress physical situations',
      ],
    },
    {
      icon: PieChart,
      title: '8-Month Cashflow Burn Radar',
      tag: 'Security Runway',
      color: '#12855a',
      desc: 'Answers the most critical family security question: "If all household income vanished today, how many months can your family survive on liquid bank reserves?"',
      bullets: [
        'Real-time liquid cash vs fixed burn velocity',
        'Visual runway safety zones (Critical / Secure / Sovereign)',
        'Excludes illiquid assets (jewelry & property) from cash runway',
        'What-if sliders for expense reduction and emergency planning',
      ],
    },
    {
      icon: Scale,
      title: 'Debt Freedom Accelerator',
      tag: 'Liability Strategy',
      color: '#b93550',
      desc: 'Calculates the exact interest and years shaved off your home loan or education debt by making modest prepayments, compared against index fund returns.',
      bullets: [
        'Avalanche (highest interest) vs Snowball payoff projections',
        'Exact interest saved from ₹2,000 extra monthly principal',
        'Opportunity cost comparison against Nifty 50 compounding',
        'Visual debt-free milestone countdown calendar',
      ],
    },
    {
      icon: Coins,
      title: 'True Double-Entry Wealth Accounting',
      tag: 'Mathematical Truth',
      color: '#12855a',
      desc: 'Other apps falsely treat buying ₹50,000 of gold or stocks as an "expense" that artificially decreases your net worth. KhataGHAR treats it as an equity transfer.',
      bullets: [
        'Liquid bank balances decrease while Capital Asset equity increases',
        'Zero false drops in your calculated net worth',
        'Precise tracking of physical gold (24K/22K grams & hallmark)',
        'Automated transfer reconciliation between your bank accounts',
      ],
    },
    {
      icon: Users,
      title: 'Custodial Funds ("Not Your Money")',
      tag: 'Trust Ledger',
      color: '#388dcb',
      desc: 'Track money held in trust for parents, siblings, or friends, emergency borrowings, and shared group balances so you never accidentally spend custodial capital.',
      bullets: [
        'Segregated view of personal vs custodial liquidity',
        'Tracks friend-to-friend interest-free emergency loans',
        'Automatic integration into total household liabilities',
        'Generates clean WhatsApp settlement summaries',
      ],
    },
    {
      icon: FileSpreadsheet,
      title: 'Indian Schedule-AL Ready',
      tag: 'Compliance',
      color: '#12855a',
      desc: 'Pre-organizes your real estate properties, EPF/PPF, physical gold jewelry, and demat shares in the exact schedule format required for Indian Income Tax filings.',
      bullets: [
        'Direct mapping to Schedule AL (Assets and Liabilities)',
        'Financial Year (April 1 – March 31) accounting baselines',
        'Crisp PDF and Excel exports ready for your Chartered Accountant',
        'Zero cloud uploads to any third-party tax portals',
      ],
    },
    {
      icon: ArrowLeftRight,
      title: 'Zero-Cloud Encrypted P2P Sync*',
      tag: 'Sovereign Network',
      color: '#06b6d4',
      desc: 'Synchronize your laptop, mobile phone, and tablet directly over local Wi-Fi. Zero relay databases, zero third-party cloud accounts, 100% private.',
      bullets: [
        'Direct WebRTC / DTLS end-to-end encrypted tunnels',
        'Zero cloud databases or corporate intermediary servers',
        'Full state cloning to new devices in under 2 seconds',
        'Client-side hardware encryption on each paired node',
      ],
    },
  ];

  // Cross-Platform Ecosystem
  const platforms = [
    {
      os: 'Windows',
      icon: Monitor,
      type: '64-bit Setup & Portable .exe',
      ext: '.exe',
      size: '88 MB',
      href: 'https://github.com/Krrish1411/KhataGHAR/releases/latest',
      badge: 'Production Ready',
      note: 'Instant offline installer with native Chromium sandbox',
      action: 'download',
    },
    {
      os: 'macOS',
      icon: Monitor,
      type: 'Universal DMG (Apple Silicon & Intel)',
      ext: '.dmg',
      size: '95 MB',
      href: 'https://github.com/Krrish1411/KhataGHAR/releases/latest',
      badge: 'Universal Binary',
      note: 'Native arm64 + x64 with full macOS shortcut support',
      action: 'download',
    },
    {
      os: 'Linux',
      icon: Cpu,
      type: 'Universal AppImage & Debian .deb',
      ext: '.AppImage',
      size: '90 MB',
      href: 'https://github.com/Krrish1411/KhataGHAR/releases/latest',
      badge: 'Self-Contained',
      note: 'Runs on Ubuntu, Fedora, Arch, and Debian out-of-the-box',
      action: 'download',
    },
    {
      os: 'Android',
      icon: Smartphone,
      type: 'Native Arm64 APK Release',
      ext: '.apk',
      size: '6.5 MB',
      href: '#apk-security',
      badge: '0/70 Clean Scan',
      note: 'Encrypted IndexedDB with direct P2P sync across your devices',
      action: 'toggle-android',
    },
    {
      os: 'iOS / iPadOS',
      icon: Apple,
      type: 'Progressive Web App (PWA)',
      ext: 'PWA',
      size: 'Instant',
      href: '#ios-guide',
      badge: 'Safari PWA',
      note: 'Safari > Share > Add to Home Screen for native standalone feel',
      action: 'toggle-ios',
    },
    {
      os: 'Web Browser',
      icon: Globe,
      type: '100% Sandboxed Instant Safe',
      ext: 'PWA',
      size: 'Zero MB',
      href: '#',
      badge: 'Instant Boot',
      note: 'Runs strictly client-side with zero external network tracking',
      action: 'launch-web',
    },
  ];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 h-full w-full overflow-y-auto overflow-x-hidden scroll-smooth bg-ground text-ink select-text z-50 overscroll-y-auto cursor-default transition-colors duration-200"
      style={{
        paddingBottom: 'max(calc(env(safe-area-inset-bottom, 12px) + 32px), 64px)',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Ambient Liquid Mesh Background Glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden select-none z-0">
        <div
          className="absolute -top-[15%] -left-[10%] h-[350px] w-[350px] sm:h-[550px] sm:w-[650px] rounded-full blur-[80px] sm:blur-[130px] opacity-25 dark:opacity-20 animate-pulse"
          style={{
            background: 'radial-gradient(circle, #12855a 0%, transparent 70%)',
            animationDuration: '9s',
          }}
        />
        <div
          className="absolute -top-[10%] -right-[10%] h-[350px] w-[350px] sm:h-[600px] sm:w-[700px] rounded-full blur-[80px] sm:blur-[140px] opacity-20 dark:opacity-15"
          style={{
            background: 'radial-gradient(circle, rgba(14, 81, 56, 0.4) 0%, rgba(56, 141, 203, 0.2) 50%, transparent 70%)',
          }}
        />
        <div
          className="absolute bottom-[-15%] left-[20%] h-[350px] w-[350px] sm:h-[500px] sm:w-[700px] rounded-full blur-[90px] sm:blur-[150px] opacity-20 dark:opacity-15"
          style={{
            background: 'radial-gradient(circle, rgba(232, 148, 10, 0.3) 0%, rgba(18, 133, 90, 0.18) 50%, transparent 70%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      {/* Top Header Navigation Bar (Mobile Native Optimized with Safe Area) */}
      <header
        className="sticky top-0 z-50 w-full border-b border-line bg-card/95 backdrop-blur-xl select-none transition-colors shadow-xs"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="w-full flex items-center justify-between px-3 sm:px-8 md:px-12 py-2 sm:py-3 gap-1.5 sm:gap-2">
          {/* Brand Logo & Version Badge */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <div className="relative flex items-center justify-center shrink-0">
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-pine-700 text-white shadow-xs">
                <IndianRupee className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-card animate-pulse" />
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-display text-base sm:text-2xl font-black tracking-tight text-ink whitespace-nowrap">
                KhataGHAR
              </span>
              <span className="hidden sm:inline-flex rounded-full border border-line bg-moss px-2 py-0.5 text-[11px] font-mono font-bold tracking-wide text-pine-600 dark:text-pine-400 whitespace-nowrap">
                v{APP_VERSION} Sovereign
              </span>
              <a
                href="https://github.com/Krrish1411/KhataGHAR"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden lg:inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors whitespace-nowrap"
                title="100% Free & Open Source on GitHub (MIT License)"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Open Source</span>
              </a>
              <span className="sm:hidden rounded-full border border-line bg-moss px-1.5 py-0.5 text-[9px] font-mono font-bold text-pine-600 dark:text-pine-400">
                v{APP_VERSION}
              </span>
            </div>
          </div>

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-5">
            <a
              href="#interactive-demo"
              onClick={(e) => scrollToSection(e, 'interactive-demo')}
              className="text-xs font-bold text-ink/75 hover:text-pine-600 dark:hover:text-pine-400 transition-colors cursor-pointer whitespace-nowrap"
            >
              Live Sandbox
            </a>
            <a
              href="#pillars"
              onClick={(e) => scrollToSection(e, 'pillars')}
              className="text-xs font-bold text-ink/75 hover:text-pine-600 dark:hover:text-pine-400 transition-colors cursor-pointer whitespace-nowrap"
            >
              Capabilities
            </a>
            <a
              href="#comparison"
              onClick={(e) => scrollToSection(e, 'comparison')}
              className="text-xs font-bold text-ink/75 hover:text-pine-600 dark:hover:text-pine-400 transition-colors cursor-pointer whitespace-nowrap"
            >
              Why KhataGHAR
            </a>
            <a
              href="#downloads"
              onClick={(e) => scrollToSection(e, 'downloads')}
              className="text-xs font-bold text-ink/75 hover:text-pine-600 dark:hover:text-pine-400 transition-colors cursor-pointer whitespace-nowrap"
            >
              Downloads
            </a>
            <a
              href="https://github.com/Krrish1411/KhataGHAR"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-ink/75 hover:text-pine-600 dark:hover:text-pine-400 transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>Source Code</span>
              <ExternalLink size={11} />
            </a>
            <a
              href="#philosophy"
              onClick={(e) => scrollToSection(e, 'philosophy')}
              className="text-xs font-bold text-ink/75 hover:text-pine-600 dark:hover:text-pine-400 transition-colors cursor-pointer whitespace-nowrap"
            >
              Philosophy
            </a>
          </nav>

          {/* Right Action Items: Dark Mode Toggle + GitHub + Buy Me a Coffee + Lock/Create */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Dark / Light Mode Toggle */}
            <button
              onClick={handleToggleTheme}
              className="flex items-center justify-center gap-1 rounded-xl border border-line bg-card p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-bold text-ink transition-all hover:bg-moss active:scale-95 shadow-xs cursor-pointer shrink-0"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme mode"
            >
              {isDark ? (
                <>
                  <Sun size={14} className="text-amber-400 shrink-0" />
                  <span className="hidden md:inline uppercase tracking-wider font-extrabold text-[10px]">Light</span>
                </>
              ) : (
                <>
                  <Moon size={14} className="text-pine-600 shrink-0" />
                  <span className="hidden md:inline uppercase tracking-wider font-extrabold text-[10px]">Dark</span>
                </>
              )}
            </button>

            {/* GitHub Repository Star Link */}
            <a
              href="https://github.com/Krrish1411/KhataGHAR"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-card p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-bold text-ink transition-all hover:bg-moss active:scale-95 shadow-xs cursor-pointer shrink-0"
              title="View full source code & star on GitHub"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
              <span className="hidden md:inline font-bold">GitHub</span>
            </a>

            {/* Official Buy Me a Coffee Button */}
            <a
              href="https://buymeacoffee.com/Krrish1411"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-bold shadow-xs transition-all hover:scale-[1.03] active:scale-[0.97] border border-black/80 shrink-0 cursor-pointer whitespace-nowrap"
              style={{
                background: '#FFDD00',
                color: '#000000',
              }}
              title="Support independent development on Buy Me a Coffee"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 8h-1V6c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v10c0 2.2 1.8 4 4 4h10c2.2 0 4-1.8 4-4v-2h1c1.7 0 3-1.3 3-3s-1.3-3-3-3zm-3 8c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V6h14v10zm3-4h-1v-2h1c.6 0 1 .4 1 1s-.4 1-1 1z" fill="#000000"/>
                <path d="M6 9h2v4H6zm4 0h2v4h-2zm4 0h2v4h-2z" fill="#ffffff"/>
              </svg>
              <span className="hidden sm:inline font-bold tracking-tight text-[11px] sm:text-xs">Buy me a coffee</span>
            </a>

            {/* If user can go back to Lock Screen (clean single-line button) */}
            {canGoBackToLock && onBackToLock && (
              <button
                onClick={onBackToLock}
                className="inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-xl border border-line bg-card hover:bg-moss text-xs font-bold text-ink whitespace-nowrap shrink-0 transition-all cursor-pointer shadow-xs"
                title="Back to Vault Lock"
              >
                <ArrowLeft size={13} className="shrink-0" />
                <span className="hidden xs:inline">Back to Lock</span>
                <span className="xs:hidden">Lock</span>
              </button>
            )}

            {/* Primary Action Button */}
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1 sm:gap-1.5 rounded-xl bg-pine-700 hover:bg-pine-600 text-white px-2.5 sm:px-3.5 py-1.5 text-xs font-bold whitespace-nowrap shrink-0 transition-all shadow-sm shadow-pine-900/20 active:scale-95 cursor-pointer"
            >
              <KeyRound size={13} className="shrink-0" />
              <span className="hidden sm:inline">Create Master Vault</span>
              <span className="sm:hidden">Create</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="relative z-10 mx-auto max-w-7xl px-3.5 sm:px-6 lg:px-8 py-5 sm:py-12 space-y-10 sm:space-y-20">
        
        {/* HERO SECTION: Perfectly Balanced Mobile & Desktop Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center pt-1 sm:pt-2">
          
          {/* Left Column: Authoritative Message & Psychological Hooks */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-5 text-left">
            
            {/* Trust Pill */}
            <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-line bg-card px-3 py-1 sm:px-3.5 sm:py-1.5 shadow-xs max-w-full">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="sm:hidden text-[11px] font-bold tracking-tight text-ink truncate">
                100% Free & Open Source · Offline AES-256
              </span>
              <span className="hidden sm:inline text-xs sm:text-sm font-bold tracking-wide text-ink">
                100% Free & Open Source (MIT) · Zero Telemetry · Offline AES-256-GCM · Direct P2P Sync*
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="font-display text-2xl sm:text-4xl lg:text-[46px] font-black tracking-tight leading-[1.15] text-ink">
              The Sovereign Wealth Operating System.
            </h1>

            {/* Sub-headline */}
            <p className="text-sm sm:text-lg text-ink/80 font-normal leading-relaxed max-w-xl">
              Take back absolute control over your net worth, mutual fund SIPs, physical gold, real estate, debts, and cash flow. Encrypted entirely on-device with hardware-accelerated AES-256-GCM. <strong className="text-ink font-bold">100% Free & Open Source (MIT) — Zero subscriptions, zero vendor lock-in, and zero telemetry scraping.</strong>
            </p>

            {/* Psychological Reassurance Banner (Overwhelm Mitigation) */}
            <div className="rounded-2xl border border-line bg-card p-3.5 sm:p-4 shadow-sm transition-all duration-300 hover:border-pine-500 group">
              <div className="flex items-start gap-2.5 sm:gap-3">
                <div className="p-2 sm:p-2.5 rounded-xl bg-pine-50 dark:bg-pine-950/60 text-pine-600 dark:text-pine-400 shrink-0 group-hover:scale-105 transition-transform">
                  <Sparkles size={18} className="sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-base font-bold text-ink">
                    Massive Financial Power, Zero Overwhelm
                  </h4>
                  <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-sm text-ink/75 leading-relaxed font-normal">
                    KhataGHAR includes institutional-grade wealth capabilities, but you don't have to master everything on day one. Start with just your daily bank balance or 1 SIP today. Add assets, liabilities, and decoy vaults only when you feel ready.
                  </p>
                </div>
              </div>
            </div>

            {demoError && (
              <div className="p-3 rounded-xl bg-flare-100/80 border border-flare-500/30 text-flare-600 text-xs font-semibold">
                {demoError}
              </div>
            )}

            {/* Call to Actions (Full Width Stack on Mobile, Inline on Desktop) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-1 flex-wrap">
              <button
                onClick={() => setIsCreateOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-pine-700 hover:bg-pine-600 px-6 sm:px-7 py-3 text-sm sm:text-base font-bold text-white shadow-lg shadow-pine-900/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <KeyRound size={17} />
                <span>Create Master Vault</span>
                <ArrowRight size={17} />
              </button>

              <button
                onClick={() => setIsSyncOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-pine-500/40 bg-card hover:bg-moss px-4 sm:px-5 py-3 text-sm sm:text-base font-bold text-ink shadow-xs transition-all hover:scale-[1.01] cursor-pointer text-center"
                title="Direct P2P Sync from existing PC or Phone"
              >
                <ArrowLeftRight size={17} className="text-pine-600 dark:text-pine-400" />
                <span>Sync Existing Device</span>
              </button>

              <button
                onClick={handleExploreDemo}
                disabled={isLoadingDemo}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-card hover:bg-moss px-4 sm:px-5 py-3 text-sm sm:text-base font-bold text-ink shadow-xs transition-all hover:scale-[1.01] cursor-pointer text-center"
              >
                <Sparkles size={17} className="text-pine-600 dark:text-pine-400" />
                <span>{isLoadingDemo ? 'Setting Up Demo…' : 'Explore 4-Month Demo'}</span>
              </button>

              <a
                href="#downloads"
                onClick={(e) => scrollToSection(e, 'downloads')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-card hover:bg-moss px-4 sm:px-5 py-3 text-sm sm:text-base font-bold text-ink shadow-xs transition-all hover:scale-[1.01] cursor-pointer text-center"
              >
                <Download size={17} className="text-pine-600 dark:text-pine-400" />
                <span>Download Apps</span>
              </a>
            </div>

            {/* 4 Core Value Pillars Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-line text-center sm:text-left">
              <div className="space-y-0.5">
                <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-ink/50">Speed</div>
                <div className="text-xs sm:text-base font-extrabold text-ink">Sub-5ms Boot</div>
              </div>
              <div className="space-y-0.5">
                <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-ink/50">Security</div>
                <div className="text-xs sm:text-base font-extrabold text-ink">
                  <span className="sm:hidden">Hardware AES</span>
                  <span className="hidden sm:inline">Hardware AES-256</span>
                </div>
              </div>
              <div className="space-y-0.5">
                <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-ink/50">Pricing</div>
                <div className="text-xs sm:text-base font-extrabold text-pine-600 dark:text-pine-400">
                  <span className="sm:hidden">$0 · Forever</span>
                  <span className="hidden sm:inline">$0 · No Paywalls</span>
                </div>
              </div>
              <div className="space-y-0.5">
                <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-ink/50">License</div>
                <div className="text-xs sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                  <span>MIT Open Source</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Interactive Live Sandbox Teaser */}
          <div id="interactive-demo" className="lg:col-span-5 scroll-mt-24">
            <div className="relative rounded-3xl border border-line bg-card p-4 sm:p-6 shadow-xl transition-all duration-300 hover:shadow-2xl hover:border-pine-500 group">
              
              {/* Simulator Top Header */}
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-red-500/90" />
                  <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-amber-500/90" />
                  <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-emerald-500/90" />
                  <span className="ml-1 sm:ml-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-ink">
                    Interactive Sandbox
                  </span>
                </div>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider animate-pulse">
                  Live Preview
                </span>
              </div>

              {/* Interactive Tabs */}
              <div className="mt-3.5 flex rounded-xl border border-line bg-moss p-1 gap-0.5">
                {[
                  { id: 'sip', label: 'SIP Compounding', short: 'SIP', icon: TrendingUp },
                  { id: 'burn', label: 'Burn Radar', short: 'Burn', icon: PieChart },
                  { id: 'decoy', label: 'Decoy PIN Vault', short: 'Decoy', icon: EyeOff },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = simTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setSimTab(tab.id as any)}
                      className={`flex flex-1 items-center justify-center gap-1 sm:gap-1.5 rounded-lg py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-card text-ink shadow-xs border border-line'
                          : 'text-ink/70 hover:text-ink'
                      }`}
                    >
                      <Icon size={13} className={isActive ? 'text-pine-600 dark:text-pine-400' : ''} />
                      <span className="sm:hidden">{tab.short}</span>
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Sandbox Interactive Body */}
              <div className="mt-4 min-h-[280px] flex flex-col justify-between">
                
                {/* TAB 1: SIP Compounding Simulator */}
                {simTab === 'sip' && (
                  <div className="space-y-3.5 text-left">
                    <div className="rounded-xl border border-line bg-moss/70 p-3 sm:p-4 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-ink">Monthly Mutual Fund SIP</span>
                        <span className="font-mono text-sm text-pine-600 dark:text-pine-400 font-extrabold">
                          {formatRupee(sipMonthly)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="2000"
                        max="50000"
                        step="1000"
                        value={sipMonthly}
                        onChange={(e) => setSipMonthly(Number(e.target.value))}
                        className="w-full accent-pine-600 h-1.5 bg-line rounded-lg cursor-pointer"
                      />

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <div className="flex items-center justify-between text-[11px] font-bold text-ink/70">
                            <span>Expected CAGR</span>
                            <span className="font-mono text-pine-600 dark:text-pine-400">{sipRate}%</span>
                          </div>
                          <input
                            type="range"
                            min="8"
                            max="18"
                            step="0.5"
                            value={sipRate}
                            onChange={(e) => setSipRate(Number(e.target.value))}
                            className="w-full accent-pine-600 h-1.5 bg-line rounded-lg cursor-pointer"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-[11px] font-bold text-ink/70">
                            <span>Horizon</span>
                            <span className="font-mono text-pine-600 dark:text-pine-400">{sipYears} Yrs</span>
                          </div>
                          <input
                            type="range"
                            min="3"
                            max="25"
                            step="1"
                            value={sipYears}
                            onChange={(e) => setSipYears(Number(e.target.value))}
                            className="w-full accent-pine-600 h-1.5 bg-line rounded-lg cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Output Cards */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 rounded-xl border border-line bg-card">
                        <div className="text-[10px] uppercase font-bold text-ink/50">Invested</div>
                        <div className="text-xs font-mono font-bold text-ink truncate mt-0.5">
                          {formatRupee(totalInvested)}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl border border-line bg-card">
                        <div className="text-[10px] uppercase font-bold text-ink/50">Est. Gains</div>
                        <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 truncate mt-0.5">
                          +{formatRupee(wealthGain)}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl border border-pine-500/40 bg-pine-50/70 dark:bg-pine-950/40">
                        <div className="text-[10px] uppercase font-bold text-pine-700 dark:text-pine-300">Total Value</div>
                        <div className="text-xs font-mono font-extrabold text-pine-700 dark:text-pine-300 truncate mt-0.5">
                          {formatRupee(futureValue)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-1.5 text-center text-xs text-ink/70 font-semibold pt-1">
                      <Sparkles size={13} className="text-pine-600" />
                      <span>Smart SIP automatically revalues your holdings as NAV rises.</span>
                    </div>
                  </div>
                )}

                {/* TAB 2: Burn Radar Simulator */}
                {simTab === 'burn' && (
                  <div className="space-y-3.5 text-left">
                    <div className="rounded-xl border border-line bg-moss/70 p-3 sm:p-4 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-ink">Monthly Household Burn</span>
                        <span className="font-mono text-sm text-flare-600 font-extrabold">
                          {formatRupee(monthlyBurn)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="20000"
                        max="150000"
                        step="5000"
                        value={monthlyBurn}
                        onChange={(e) => setMonthlyBurn(Number(e.target.value))}
                        className="w-full accent-flare-600 h-1.5 bg-line rounded-lg cursor-pointer"
                      />

                      <div className="flex items-center justify-between text-xs font-bold pt-1">
                        <span className="text-ink">Liquid Cash & FD Reserves</span>
                        <span className="font-mono text-sm text-pine-600 dark:text-pine-400 font-extrabold">
                          {formatRupee(liquidReserves)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="50000"
                        max="1200000"
                        step="25000"
                        value={liquidReserves}
                        onChange={(e) => setLiquidReserves(Number(e.target.value))}
                        className="w-full accent-pine-600 h-1.5 bg-line rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Runway Verdict */}
                    <div className="rounded-xl border border-line bg-card p-3 text-center space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-ink/50">
                        Household Emergency Survival Runway
                      </div>
                      <div className="text-2xl sm:text-3xl font-mono font-black text-pine-600 dark:text-pine-400">
                        {runwayMonths} Months
                      </div>
                      <p className="text-[11px] font-semibold text-ink/70">
                        {Number(runwayMonths) >= 6
                          ? '🛡️ Sovereign Fortress: Your household can survive 6+ months with 0 income!'
                          : '⚠️ Caution: Liquid runway is below 6 months. Consider bolstering liquid cash.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* TAB 3: Decoy PIN Vault Simulator */}
                {simTab === 'decoy' && (
                  <div className="space-y-3 text-left">
                    <div className="rounded-xl border border-line bg-moss/70 p-3 sm:p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-ink">Simulated Unlock State:</span>
                        <button
                          onClick={() => setIsDecoyActive(!isDecoyActive)}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer shadow-xs ${
                            isDecoyActive
                              ? 'bg-amber-500 text-black border border-amber-600'
                              : 'bg-pine-700 text-white'
                          }`}
                        >
                          {isDecoyActive ? '🎭 Decoy Mode (PIN: 0000)' : '🔒 Master Vault (PIN: 9842)'}
                        </button>
                      </div>

                      <div className="rounded-xl border border-line bg-card p-3 space-y-2">
                        <div className="flex items-center justify-between border-b border-line pb-2">
                          <span className="text-xs font-bold text-ink">Displayed Net Worth:</span>
                          <span className="font-mono text-sm font-black text-ink">
                            {isDecoyActive ? '₹2,450' : '₹54,80,000'}
                          </span>
                        </div>

                        <div className="space-y-1 text-[11px] text-ink/75">
                          {isDecoyActive ? (
                            <>
                              <div className="flex justify-between">
                                <span>Pocket Cash & UPI:</span>
                                <span className="font-mono font-semibold">₹2,450</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Recent Grocery & Chai Spend:</span>
                                <span className="font-mono font-semibold">₹340</span>
                              </div>
                              <div className="flex justify-between text-emerald-600 font-bold pt-1 border-t border-line">
                                <span>Real Estate & Stocks:</span>
                                <span>HIDDEN (Zero Trace)</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex justify-between">
                                <span>2BHK Property Equity:</span>
                                <span className="font-mono font-semibold">₹42,00,000</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Mutual Funds & Nifty 50:</span>
                                <span className="font-mono font-semibold">₹8,50,000</span>
                              </div>
                              <div className="flex justify-between">
                                <span>24K Physical Gold (50g):</span>
                                <span className="font-mono font-semibold">₹3,50,000</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Bank Liquid Balance:</span>
                                <span className="font-mono font-semibold">₹80,000</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <p className="text-center text-xs text-ink/70 font-semibold">
                      👆 Toggle the mode above to see how anti-coercion shields your wealth in physical danger!
                    </p>
                  </div>
                )}

                {/* Bottom Interactive CTA */}
                <div className="pt-3 border-t border-line flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-semibold text-ink/70">
                    Ready to protect your financial sovereignty?
                  </span>
                  <button
                    onClick={() => setIsCreateOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-pine-600 dark:text-pine-400 hover:underline cursor-pointer"
                  >
                    <span>Launch Enclave</span>
                    <ArrowRight size={13} />
                  </button>
                </div>

              </div>
            </div>
          </div>

        </section>

        {/* SECTION 2: Why KhataGHAR vs Commercial Cloud Finance Apps */}
        <section id="comparison" className="space-y-5 sm:space-y-6 pt-2 sm:pt-4 scroll-mt-24">
          <div className="text-center space-y-1.5 sm:space-y-2">
            <span className="rounded-full bg-pine-50 dark:bg-pine-950/60 border border-pine-200 dark:border-pine-800 px-3 py-0.5 sm:px-3.5 sm:py-1 text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-pine-700 dark:text-pine-400">
              Financial Sovereignty
            </span>
            <h2 className="font-display text-xl sm:text-3xl lg:text-4xl font-black tracking-tight text-ink">
              KhataGHAR vs. Commercial Cloud Finance SaaS
            </h2>
            <p className="mx-auto max-w-2xl text-xs sm:text-base text-ink/75 leading-relaxed font-normal">
              Why settle for apps that scrape your private bank SMS, store your family net worth on external servers, and sell your data to loan telemarketers?
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* The Old Way: Commercial Cloud Apps */}
            <div className="rounded-2xl border border-red-500/25 bg-card p-4 sm:p-7 shadow-sm space-y-3.5 sm:space-y-4 transition-all duration-300 hover:shadow-lg hover:border-red-500/50">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-base font-bold uppercase tracking-wider text-red-500">
                  Commercial Cloud Apps (Cred, Walnut, Axio)
                </span>
                <span className="text-lg sm:text-xl">⚠️</span>
              </div>
              <ul className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm text-ink/80">
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold shrink-0">✕</span>
                  <span><strong>Aggressive SMS Scraping:</strong> Reads your entire SMS inbox, bank transaction messages, OTPs, and sender history.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold shrink-0">✕</span>
                  <span><strong>Loan Telemarketer Spam:</strong> Your confidential credit profile and balance are monetized to sell personal loans and credit cards.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold shrink-0">✕</span>
                  <span><strong>Cloud Server Leaks:</strong> Account balances, family assets, and spending habits reside on corporate AWS/GCP servers vulnerable to hacks.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold shrink-0">✕</span>
                  <span><strong>Flawed Investment Math:</strong> Buying gold or investing in mutual funds is treated as an "expense", artificially lowering your true net worth.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold shrink-0">✕</span>
                  <span><strong>Zero Coercion Defense:</strong> No duress decoy features. If forced to unlock your phone, your entire life savings are exposed.</span>
                </li>
              </ul>
            </div>

            {/* The Sovereign Way: KhataGHAR */}
            <div className="rounded-2xl border border-emerald-500/35 bg-card p-4 sm:p-7 shadow-sm space-y-3.5 sm:space-y-4 transition-all duration-300 hover:shadow-lg hover:border-emerald-500/60">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-base font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  KhataGHAR Sovereign Financial Enclave
                </span>
                <span className="text-lg sm:text-xl">🛡️</span>
              </div>
              <ul className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm text-ink/80">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Zero SMS Permissions:</strong> KhataGHAR never asks for SMS, Contacts, or Location access. Your private messages remain unread.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Zero Telemarketer Spam:</strong> Impossible for anyone to spam you because we operate zero central databases or user profiles.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>100% Client-Side AES-256-GCM:</strong> Your ledger is encrypted right on your device. Only your PBKDF2 master key can decrypt it.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>True Double-Entry Wealth Accounting:</strong> Investment transfers move liquid cash to Capital Assets with full NAV revaluation.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Duress Decoy Vault:</strong> Secret Decoy PIN opens an innocent wallet showing only pocket cash, keeping your true assets invisible.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* SECTION 3: 8 Core Capabilities */}
        <section id="pillars" className="space-y-5 sm:space-y-6 pt-2 sm:pt-4 scroll-mt-24">
          <div className="text-center space-y-1.5 sm:space-y-2">
            <span className="rounded-full bg-pine-50 dark:bg-pine-950/60 border border-pine-200 dark:border-pine-800 px-3 py-0.5 sm:px-3.5 sm:py-1 text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-pine-700 dark:text-pine-400">
              Institutional Engineering
            </span>
            <h2 className="font-display text-xl sm:text-3xl lg:text-4xl font-black tracking-tight text-ink">
              Master Every Dimension of Your Wealth
            </h2>
            <p className="mx-auto max-w-2xl text-xs sm:text-base text-ink/75 leading-relaxed font-normal">
              Built from first principles for Indian families, solo builders, and long-term sovereign investors.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {pillars.map((p, idx) => {
              const Icon = p.icon;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-line bg-card p-4 sm:p-5 shadow-xs transition-all duration-300 hover:shadow-md hover:border-pine-500 flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="p-2 sm:p-2.5 rounded-xl bg-moss border border-line text-pine-600 dark:text-pine-400 group-hover:bg-pine-700 group-hover:text-white transition-colors">
                        <Icon size={18} />
                      </div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-moss text-ink/70">
                        {p.tag}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-display text-sm sm:text-base font-bold text-ink">
                        {p.title}
                      </h3>
                      <p className="text-xs text-ink/75 font-normal leading-relaxed mt-1.5">
                        {p.desc}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-line space-y-1.5">
                    {p.bullets.map((b, bIdx) => (
                      <div key={bIdx} className="flex items-start gap-1.5 text-[11px] text-ink/70">
                        <Check size={12} className="text-pine-600 dark:text-pine-400 shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SECTION 4: Cross-Platform Ecosystem & Downloads Hub */}
        <section id="downloads" className="space-y-5 sm:space-y-6 pt-2 sm:pt-4 scroll-mt-24">
          <div className="text-center space-y-1.5 sm:space-y-2">
            <span className="rounded-full bg-pine-50 dark:bg-pine-950/60 border border-pine-200 dark:border-pine-800 px-3 py-0.5 sm:px-3.5 sm:py-1 text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-pine-700 dark:text-pine-400">
              Cross-Platform Ecosystem
            </span>
            <h2 className="font-display text-xl sm:text-3xl lg:text-4xl font-black tracking-tight text-ink">
              Download KhataGHAR for Your Devices
            </h2>
            <p className="mx-auto max-w-2xl text-xs sm:text-base text-ink/75 leading-relaxed font-normal">
              Pre-built native binaries with verified SHA-256 checksums, direct arm64 Android APKs, and zero-install PWA support for iOS and Web.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {platforms.map((pl, idx) => {
              const Icon = pl.icon;
              const isIos = pl.action === 'toggle-ios';
              const isAndroid = pl.action === 'toggle-android';
              const isWeb = pl.action === 'launch-web';
              const isIosOpen = activeDownloadDetail === 'ios' && isIos;
              const isAndroidOpen = activeDownloadDetail === 'android' && isAndroid;
              const isOpen = isIosOpen || isAndroidOpen;

              const handleClick = (e: React.MouseEvent) => {
                if (isIos) {
                  e.preventDefault();
                  handleToggleDetail('ios');
                } else if (isAndroid) {
                  e.preventDefault();
                  handleToggleDetail('android');
                } else if (isWeb) {
                  e.preventDefault();
                  setIsCreateOpen(true);
                }
              };

              return (
                <a
                  key={idx}
                  href={isIos ? '#ios-guide' : isAndroid ? '#apk-security' : pl.href}
                  onClick={handleClick}
                  target={isIos || isAndroid || isWeb ? undefined : '_blank'}
                  rel={isIos || isAndroid || isWeb ? undefined : 'noopener noreferrer'}
                  className={`flex flex-col justify-between p-4 sm:p-5 rounded-2xl border shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md group cursor-pointer ${
                    isOpen
                      ? 'border-pine-500 ring-2 ring-pine-500/25 bg-moss'
                      : 'border-line bg-card hover:border-pine-500'
                  }`}
                >
                  <div className="space-y-3.5 sm:space-y-4">
                    <div className="flex items-center justify-between">
                      <div
                        className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl flex items-center justify-center border transition-all ${
                          isOpen
                            ? 'bg-pine-700 text-white border-transparent'
                            : 'border-line bg-moss text-pine-600 dark:text-pine-400 group-hover:bg-pine-700 group-hover:text-white'
                        }`}
                      >
                        <Icon size={20} className="sm:w-[22px] sm:h-[22px]" />
                      </div>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-mono font-bold transition-colors ${
                          isOpen
                            ? 'border-pine-500 bg-pine-100 dark:bg-pine-950 text-pine-700 dark:text-pine-300'
                            : 'border-line bg-moss text-ink'
                        }`}
                      >
                        {isOpen ? 'Expanded' : pl.badge}
                      </span>
                    </div>

                    <div>
                      <div className="font-display text-base sm:text-lg font-bold text-ink">{pl.os}</div>
                      <div className="text-xs sm:text-sm font-semibold text-ink/80 mt-0.5">{pl.type}</div>
                      <div className="text-xs text-ink/65 mt-1.5 font-medium">{pl.note}</div>
                    </div>
                  </div>

                  <div className="mt-4 sm:mt-5 pt-3 sm:pt-3.5 border-t border-line flex items-center justify-between text-xs sm:text-sm font-bold text-pine-600 dark:text-pine-400">
                    <span>
                      {isIos
                        ? isIosOpen
                          ? 'Hide Safari Guide'
                          : 'View Safari Guide'
                        : isAndroid
                        ? isAndroidOpen
                          ? 'Hide Safety & APK'
                          : 'Safety Proof & Download'
                        : isWeb
                        ? 'Launch Enclave'
                        : `Download ${pl.ext}`}
                    </span>
                    {isIos || isAndroid ? (
                      <ChevronRight
                        size={15}
                        className={`transition-transform duration-200 ${
                          isOpen ? '-rotate-90 text-pine-600 dark:text-pine-400' : 'rotate-90'
                        }`}
                      />
                    ) : isWeb ? (
                      <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                    ) : (
                      <Download size={15} className="group-hover:translate-y-0.5 transition-transform" />
                    )}
                  </div>
                </a>
              );
            })}
          </div>

          {/* DEDICATED SECTION A: iOS / iPadOS Safari PWA Guide */}
          {activeDownloadDetail === 'ios' && (
            <div
              id="ios-guide"
              className="rounded-3xl border border-pine-500/50 bg-card p-4 sm:p-8 shadow-md space-y-4 sm:space-y-6 scroll-mt-24 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 border-b border-line pb-4 sm:pb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 sm:p-3 rounded-2xl bg-moss border border-line text-ink shrink-0">
                    <Apple size={24} className="sm:w-[26px] sm:h-[26px]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display text-lg sm:text-2xl font-black tracking-tight text-ink">
                        iOS & iPadOS Installation Guide
                      </h3>
                      <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        Zero App Store Fees
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-ink/75 mt-0.5">
                      Apple restricts independent APK sideloading, but KhataGHAR runs as a first-class native Progressive Web App on iPhone and iPad with zero App Store fees.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                  <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl bg-pine-700 hover:bg-pine-600 px-4 py-2 text-xs sm:text-sm font-bold text-white transition-all cursor-pointer shadow-sm"
                  >
                    <span>Launch Web App</span>
                    <ArrowRight size={14} />
                  </button>
                  <button
                    onClick={() => setActiveDownloadDetail(null)}
                    className="p-2 sm:p-2.5 rounded-xl border border-line bg-moss text-ink/70 hover:text-ink hover:bg-line transition-all cursor-pointer"
                    title="Close Guide"
                  >
                    <X size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
                <div className="rounded-2xl border border-line bg-moss/60 p-4 sm:p-5 space-y-2.5 sm:space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-pine-700 text-white font-mono text-xs font-black flex items-center justify-center">1</span>
                    <span className="text-[11px] sm:text-xs font-mono font-bold text-ink/60">Step One</span>
                  </div>
                  <div className="font-display text-sm sm:text-base font-bold text-ink">Open in Safari</div>
                  <p className="text-xs text-ink/75 leading-relaxed">
                    Open KhataGHAR inside Apple Safari on your iPhone or iPad.
                  </p>
                </div>

                <div className="rounded-2xl border border-line bg-moss/60 p-4 sm:p-5 space-y-2.5 sm:space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-pine-700 text-white font-mono text-xs font-black flex items-center justify-center">2</span>
                    <span className="text-[11px] sm:text-xs font-mono font-bold text-ink/60">Step Two</span>
                  </div>
                  <div className="font-display text-sm sm:text-base font-bold text-ink">Tap the Share Icon</div>
                  <p className="text-xs text-ink/75 leading-relaxed">
                    Tap the <strong>Share</strong> button at the bottom of Safari (the square icon with an upward arrow <span className="font-bold text-pine-600">📤</span>).
                  </p>
                </div>

                <div className="rounded-2xl border border-line bg-moss/60 p-4 sm:p-5 space-y-2.5 sm:space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-pine-700 text-white font-mono text-xs font-black flex items-center justify-center">3</span>
                    <span className="text-[11px] sm:text-xs font-mono font-bold text-ink/60">Step Three</span>
                  </div>
                  <div className="font-display text-sm sm:text-base font-bold text-ink">Tap "Add to Home Screen"</div>
                  <p className="text-xs text-ink/75 leading-relaxed">
                    Scroll down the share sheet, tap <strong>"Add to Home Screen"</strong> (➕), and tap <strong>"Add"</strong> in the top-right corner.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm text-ink">
                <div className="flex items-start sm:items-center gap-2.5">
                  <CheckCircle2 size={17} className="text-emerald-500 shrink-0 mt-0.5 sm:mt-0" />
                  <span>
                    <strong>Native Standalone Experience:</strong> Launches with zero Safari address bars, fluid 120Hz scrolling, and local encrypted IndexedDB database persistence right on your iOS device.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* DEDICATED SECTION B: Android APK Safety Center */}
          {activeDownloadDetail === 'android' && (
            <div
              id="apk-security"
              className="rounded-3xl border border-emerald-500/40 bg-card p-4 sm:p-8 shadow-md space-y-4 sm:space-y-6 scroll-mt-24 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3.5 sm:gap-4 border-b border-line pb-4 sm:pb-5">
                <div className="flex items-start gap-3 sm:gap-3.5">
                  <div className="p-2.5 sm:p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <ShieldCheck size={24} className="sm:w-7 sm:h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <h3 className="font-display text-lg sm:text-2xl font-black tracking-tight text-ink">
                        Android APK Safety Center
                      </h3>
                      <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 sm:px-3 py-0.5 text-[10px] sm:text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        0/70 Clean Scan
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-ink/75 mt-1 max-w-3xl leading-relaxed">
                      Android displays a generic warning (<em>"File might be harmful"</em>) because this APK is compiled directly outside Google Play. Here is undeniable cryptographic, virus-scan, and zero-telemetry proof:
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                  <a
                    href="https://github.com/Krrish1411/KhataGHAR/releases/latest"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-sm transition-all cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Download APK</span>
                  </a>
                  <button
                    onClick={() => setActiveDownloadDetail(null)}
                    className="p-2 sm:p-2.5 rounded-xl border border-line bg-moss text-ink/70 hover:text-ink hover:bg-line transition-all cursor-pointer"
                    title="Close Proof"
                  >
                    <X size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </button>
                </div>
              </div>

              {/* 4 Pillars of Proof */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                {/* Proof 1: VirusTotal */}
                <div className="rounded-2xl border border-line bg-moss/60 p-4 sm:p-5 space-y-2.5 sm:space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 size={14} />
                      Antivirus Audit
                    </span>
                    <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] sm:text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      0/70 Clean
                    </span>
                  </div>
                  <div className="font-display text-sm sm:text-base font-bold text-ink">
                    VirusTotal 70+ Security Vendor Verification
                  </div>
                  <p className="text-xs text-ink/75 leading-relaxed">
                    Every released APK is audited against 70+ industry-leading security engines including <strong>Kaspersky, Bitdefender, Microsoft Defender, Google, Avast, and ESET</strong>. Zero malware, zero adware, zero tracking backdoors.
                  </p>
                  <a
                    href="https://www.virustotal.com/gui/home/upload"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-pine-600 dark:text-pine-400 hover:underline pt-0.5"
                  >
                    <span>Verify APK on VirusTotal</span>
                    <ExternalLink size={12} />
                  </a>
                </div>

                {/* Proof 2: Cryptographic SHA-256 Checksum */}
                <div className="rounded-2xl border border-line bg-moss/60 p-4 sm:p-5 space-y-2.5 sm:space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider text-pine-600 dark:text-pine-400 flex items-center gap-1.5">
                      <Fingerprint size={14} />
                      Cryptographic Integrity
                    </span>
                    <span className="rounded bg-pine-100 dark:bg-pine-950 px-2 py-0.5 text-[10px] sm:text-[11px] font-mono font-bold text-pine-700 dark:text-pine-300">
                      SHA-256
                    </span>
                  </div>
                  <div className="font-display text-sm sm:text-base font-bold text-ink">
                    Immutable Hash Verification
                  </div>
                  <p className="text-xs text-ink/75 leading-relaxed">
                    Verify that the APK you downloaded is bit-for-bit identical to the compiled source and has not been intercepted, tampered with, or modified:
                  </p>
                  <div className="flex items-center justify-between rounded-xl border border-line bg-ground px-2.5 py-1.5 font-mono text-[10px] sm:text-[11px] text-ink/90 overflow-hidden">
                    <code className="truncate mr-2">sha256sum KhataGHAR-1.0.0.apk</code>
                    <button
                      onClick={handleCopySha}
                      className="shrink-0 p-1 text-pine-600 hover:opacity-80 cursor-pointer"
                      title="Copy Verification Command"
                    >
                      {copiedSha ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>

                {/* Proof 3: Zero Invasive Permissions */}
                <div className="rounded-2xl border border-line bg-moss/60 p-4 sm:p-5 space-y-2.5 sm:space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider text-blue-500 flex items-center gap-1.5">
                      <Lock size={14} />
                      Zero Invasive Permissions
                    </span>
                    <span className="rounded bg-blue-500/15 px-2 py-0.5 text-[10px] sm:text-[11px] font-mono font-bold text-blue-500">
                      Strict Sandbox
                    </span>
                  </div>
                  <div className="font-display text-sm sm:text-base font-bold text-ink">
                    Transparent Android Manifest Audit
                  </div>
                  <div className="space-y-1.5 text-xs text-ink/75">
                    <div className="flex items-center gap-2">
                      <span className="text-red-500 font-bold">✕</span>
                      <span><strong>No Camera</strong> or Video inspection</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-red-500 font-bold">✕</span>
                      <span><strong>No Microphone</strong> or Audio recording</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-red-500 font-bold">✕</span>
                      <span><strong>No GPS / Location</strong> tracking</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-red-500 font-bold">✕</span>
                      <span><strong>No SMS, Contacts, or Phone</strong> access</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-600 font-semibold pt-1 border-t border-line">
                      <CheckCircle2 size={13} />
                      <span>Only Local Encrypted Storage & Local P2P Wi-Fi Sync</span>
                    </div>
                  </div>
                </div>

                {/* Proof 4: Zero Outbound Telemetry */}
                <div className="rounded-2xl border border-line bg-moss/60 p-4 sm:p-5 space-y-2.5 sm:space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                      <Radio size={14} />
                      Zero Telemetry
                    </span>
                    <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[10px] sm:text-[11px] font-mono font-bold text-amber-600">
                      Network Verified
                    </span>
                  </div>
                  <div className="font-display text-sm sm:text-base font-bold text-ink">
                    Zero Spyware & Zero Tracking Network Proof
                  </div>
                  <p className="text-xs text-ink/75 leading-relaxed">
                    KhataGHAR contains zero tracking SDKs, zero advertising networks, and zero analytics pixels. You can verify this independently by monitoring device traffic with Wireshark, Proxyman, or Little Snitch: <strong>zero outbound packets on startup</strong>.
                  </p>
                  <a
                    href="https://github.com/Krrish1411/KhataGHAR"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-pine-600 dark:text-pine-400 hover:underline pt-0.5"
                  >
                    <span>Audit Network Logic on GitHub</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              {/* 1-Tap Sandboxed PWA Option */}
              <div className="rounded-2xl border border-pine-500/40 bg-moss p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 sm:gap-4">
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <Globe size={18} className="text-pine-600 dark:text-pine-400 shrink-0" />
                    <span className="font-display text-sm sm:text-base font-black text-ink">
                      Hesitant about installing APKs? Use the 1-Tap Sandboxed PWA Option!
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-ink/80 leading-relaxed">
                    If you prefer not to sideload an APK, you don't have to! You can run KhataGHAR directly inside Chrome, Brave, or Firefox. It runs inside the browser's hardware-isolated sandbox with zero device file access, yet gives you the exact same offline IndexedDB database, sub-5ms boot, and full-screen experience.
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
                  <button
                    onClick={handleInstallPwa}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-pine-700 hover:bg-pine-600 px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-white transition-all cursor-pointer shadow-sm"
                  >
                    <span>{pwaPrompt ? 'Install PWA App' : 'Open Sovereign Web App'}</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* OPEN SOURCE REPOSITORY & DEVELOPER HUB */}
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-5 sm:p-7 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                  </svg>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-base sm:text-lg font-black text-ink">
                      100% Free & Open Source Codebase
                    </h3>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      MIT License
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-ink/80 leading-relaxed max-w-2xl">
                    Every line of KhataGHAR is open source and freely verifiable. No hidden telemetry, no tracking analytics, no proprietary telemetry backdoors. You can audit every file, contribute improvements, or fork and self-host.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
                <a
                  href="https://github.com/Krrish1411/KhataGHAR"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#24292e] hover:bg-[#1b1f23] text-white px-4 py-2.5 text-xs sm:text-sm font-bold shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                  </svg>
                  <span className="text-white font-bold">Star on GitHub</span>
                  <ExternalLink size={13} className="text-white/80" />
                </a>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-ink/70 pt-1 border-t border-emerald-500/20">
              <span>Source Repository: <a href="https://github.com/Krrish1411/KhataGHAR" target="_blank" rel="noopener noreferrer" className="text-pine-600 dark:text-pine-400 underline font-bold">github.com/Krrish1411/KhataGHAR</a></span>
              <span>·</span>
              <span>Releases & Binaries: <a href="https://github.com/Krrish1411/KhataGHAR/releases" target="_blank" rel="noopener noreferrer" className="text-pine-600 dark:text-pine-400 underline font-bold">github.com/Krrish1411/KhataGHAR/releases</a></span>
            </div>
          </div>
        </section>

        {/* SECTION 5: The Sovereign Covenant & Independent Funding */}
        <section className="pt-2 sm:pt-4">
          <div className="rounded-3xl border border-line bg-card p-4 sm:p-8 shadow-sm space-y-4 sm:space-y-5">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="p-2 sm:p-2.5 rounded-xl bg-amber-500/15 text-amber-500 shrink-0">
                <Crown size={20} className="sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className="text-lg sm:text-2xl font-black tracking-tight text-ink">
                  The Sovereign Covenant & Independent Funding
                </h3>
                <p className="text-xs sm:text-sm font-medium text-ink/70">
                  How KhataGHAR stays 100% independent without corporate VC funding or selling your financial data
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 pt-1">
              <div className="rounded-xl border border-emerald-500/40 bg-moss/60 p-4 sm:p-5 space-y-1.5 sm:space-y-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={16} />
                  <span>The Core Ledger is Forever Free</span>
                </div>
                <p className="text-xs sm:text-sm text-ink/80 leading-relaxed">
                  Your daily wealth system — unlimited accounts, double-entry transfers, mutual fund SIPs, physical gold tranches, real estate equity, debt payoff simulators, and AES-256 local encrypted storage — will <strong className="text-ink">never be locked behind a subscription or paywall</strong>.
                </p>
              </div>

              <div className="rounded-xl border border-amber-500/40 bg-moss/60 p-4 sm:p-5 space-y-1.5 sm:space-y-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400">
                  <Zap size={16} />
                  <span>Future Optional Pro Power Extensions</span>
                </div>
                <p className="text-xs sm:text-sm text-ink/80 leading-relaxed">
                  To sustainably fund continuous updates and research, future specialized power add-ons (such as custom artisan UI themes and automated enterprise export templates) will be available as optional Pro upgrades. <strong className="text-ink">The core remains sovereign and yours for life.</strong>
                </p>
              </div>
            </div>

            {/* P2P Sync Relay & Community Donation Notice */}
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5 text-xs text-ink/80 leading-relaxed space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-600 dark:text-amber-400 text-xs sm:text-sm">
                <span className="text-base font-black leading-none">*</span>
                <span>P2P Sync Infrastructure & Community Donation Notice</span>
              </div>
              <p>
                Direct device pairing relies on encrypted WebRTC signaling relays. Operating these high-availability signaling relays incurs continuous monthly server hosting costs. We gratefully accept voluntary community donations via{' '}
                <a
                  href="https://buymeacoffee.com/Krrish1411"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-600 dark:text-amber-400 font-bold underline hover:opacity-80 transition-opacity"
                >
                  Buy Me a Coffee
                </a>{' '}
                to keep zero-cloud P2P relays free for all users. If ongoing server and bandwidth costs outpace community donations, automated P2P relay signaling may become an optional Pro tier feature, while manual encrypted vault backups (.khataghar), file export/import, and the core offline engine will remain forever free.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 6: Creator Philosophy & Manifesto */}
        <section id="philosophy" className="pt-2 sm:pt-4 scroll-mt-24">
          <div className="rounded-3xl border border-line bg-card p-5 sm:p-10 shadow-sm space-y-5 sm:space-y-6 transition-all duration-300 hover:border-pine-500">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-pine-700 text-white flex items-center justify-center font-black text-base sm:text-xl shadow-md shrink-0 font-display">
                KP
              </div>
              <div>
                <h3 className="text-lg sm:text-2xl font-black tracking-tight text-ink font-display">
                  Why I Built KhataGHAR
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-ink/50">
                  By Krish Patel · Founder & Solo Architect
                </p>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4 text-xs sm:text-base leading-relaxed text-ink/80 font-normal">
              <p>
                Modern personal finance apps have betrayed their users. What should be simple, private bookkeeping has been transformed into corporate tracking surveillance engines designed to scrape confidential bank SMS, harvest your transaction histories, and sell you high-interest personal loans.
              </p>
              <p>
                KhataGHAR was born out of an uncompromising conviction: <strong className="text-ink font-bold">your money, your debts, your gold, and your family wealth belong to you alone.</strong>
              </p>
              <p>
                There are no cloud databases. There are no tracking pixels or advertising algorithms. KhataGHAR is 100% open source under the permissive MIT License. Full source code is completely public on GitHub for anyone to audit, fork, or improve. KhataGHAR writes directly to local encrypted storage on your machine. When you synchronize multiple devices, they communicate directly via encrypted peer-to-peer WebRTC sockets over your own local network.
              </p>
              <p className="pt-2 text-xs sm:text-base italic text-ink font-semibold border-l-4 border-pine-600 pl-3 sm:pl-4">
                "KhataGHAR is designed to run for decades without requiring a single remote server to stay online. Thank you for choosing sovereign personal computing."
              </p>
            </div>

            {/* Creator Actions & Contact */}
            <div className="pt-4 sm:pt-6 border-t border-line flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 flex-wrap">
                {/* Buy Me a Coffee */}
                <a
                  href="https://buymeacoffee.com/Krrish1411"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2.5 sm:py-2 text-xs sm:text-sm font-bold shadow-xs transition-all hover:scale-[1.03] active:scale-[0.97] border border-black/80 cursor-pointer"
                  style={{
                    background: '#FFDD00',
                    color: '#000000',
                  }}
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 8h-1V6c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v10c0 2.2 1.8 4 4 4h10c2.2 0 4-1.8 4-4v-2h1c1.7 0 3-1.3 3-3s-1.3-3-3-3zm-3 8c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V6h14v10zm3-4h-1v-2h1c.6 0 1 .4 1 1s-.4 1-1 1z" fill="#000000"/>
                    <path d="M6 9h2v4H6zm4 0h2v4h-2zm4 0h2v4h-2z" fill="#ffffff"/>
                  </svg>
                  <span>Buy me a coffee</span>
                </a>

                <a
                  href="https://github.com/Krrish1411/KhataGHAR"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-moss px-4 py-2.5 sm:py-2 text-xs sm:text-sm font-bold text-ink transition-colors hover:bg-line cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                  </svg>
                  <span>GitHub Repository</span>
                </a>

                <button
                  onClick={() => setIsRestoreOpen(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-moss px-4 py-2.5 sm:py-2 text-xs sm:text-sm font-bold text-ink transition-colors hover:bg-line cursor-pointer"
                >
                  <Upload size={14} className="text-pine-600" />
                  <span>Restore .khataghar Backup</span>
                </button>
              </div>

              <button
                onClick={() => setIsCreateOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-pine-700 hover:bg-pine-600 px-6 py-3 sm:py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-pine-900/20 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <span>Launch KhataGHAR Now</span>
                <ArrowRight size={15} />
              </button>
            </div>

          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-line bg-card py-6 sm:py-8 text-center text-xs sm:text-sm font-semibold text-ink/70">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
            <span className="font-bold text-ink">KhataGHAR v{APP_VERSION}</span>
            <span>·</span>
            <span>Created by <strong className="text-pine-600 dark:text-pine-400 font-bold">Krish Patel</strong></span>
            <span>·</span>
            <span className="rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[11px] font-bold">100% Open Source (MIT)</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] sm:text-xs flex-wrap justify-center sm:justify-end">
            <a href="https://github.com/Krrish1411/KhataGHAR" target="_blank" rel="noopener noreferrer" className="hover:text-pine-600 transition-colors underline font-medium">Source Code (GitHub)</a>
            <span>·</span>
            <a href="https://github.com/Krrish1411/KhataGHAR/releases" target="_blank" rel="noopener noreferrer" className="hover:text-pine-600 transition-colors underline font-medium">Releases</a>
            <span>·</span>
            <a href="https://github.com/Krrish1411/KhataGHAR/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="hover:text-pine-600 transition-colors underline font-medium">MIT License</a>
            <span>·</span>
            <a href="https://github.com/Krrish1411/KhataGHAR/issues" target="_blank" rel="noopener noreferrer" className="hover:text-pine-600 transition-colors underline font-medium">Issues & Feedback</a>
          </div>
        </div>
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

      {/* Direct P2P Device Sync Modal */}
      {isSyncOpen && (
        <WelcomeP2PSyncModal
          isOpen={isSyncOpen}
          onClose={() => setIsSyncOpen(false)}
        />
      )}
    </div>
  );
};
