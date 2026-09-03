import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { PWAInstallModal } from '../common/PWAInstallModal';
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Users2,
  PieChart,
  Landmark,
  BarChart3,
  Activity,
  FileSpreadsheet,
  FolderLock,
  Home,
  Settings,
  ShieldCheck,
  Shield,
  IndianRupee,
  CalendarClock,
  Download,
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

// Nav grouped into logical sections — clear labels for 100% discoverability
const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/accounts', label: 'Accounts', icon: Wallet },
      { path: '/transactions', label: 'Entries', icon: ArrowLeftRight },
      { path: '/people', label: 'People Ledger', icon: Users2 },
    ],
  },
  {
    label: 'Finance',
    items: [
      { path: '/plans', label: 'Planned Bills', icon: CalendarClock },
      { path: '/budgets', label: 'Budgets & Goals', icon: PieChart },
      { path: '/assets', label: 'Assets & Debt', icon: Landmark },
      { path: '/reports', label: 'Reports', icon: BarChart3 },
      { path: '/health-score', label: 'Health Score', icon: Activity },
    ],
  },
  {
    label: 'Tools',
    items: [
      { path: '/import', label: 'Import Data', icon: FileSpreadsheet },
      { path: '/documents', label: 'Document Vault', icon: FolderLock },
      { path: '/family', label: 'Family Hub', icon: Home },
    ],
  },
  {
    label: 'System',
    items: [
      { path: '/settings', label: 'Settings', icon: Settings },
      { path: '/security-privacy', label: 'Security & Lock', icon: ShieldCheck },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onCloseMobile }) => {
  const [isInstallOpen, setIsInstallOpen] = useState(false);

  useEffect(() => {
    if (!isMobileOpen || !onCloseMobile) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, onCloseMobile]);

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed md:sticky top-0 left-0 z-40 h-screen w-64 flex flex-col',
          'bg-card',
          'border-r border-line',
          'transition-transform duration-200 ease-out md:translate-x-0',
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-4 h-[60px] border-b border-line flex-shrink-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-pine-700 text-white shadow-md shadow-pine-900/20 flex-shrink-0">
            <IndianRupee className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <span
              className="text-[14.5px] font-bold font-display text-ink tracking-tight block truncate"
              translate="no"
            >
              Khata Ghar
            </span>
            <span className="text-[11px] text-ink/50 block truncate font-medium">
              खाता घर · Enclave
            </span>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav
          className="flex-1 overflow-y-auto px-3 py-3.5 space-y-4 custom-scrollbar"
          aria-label="Main navigation"
        >
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="space-y-1">
              <div className="px-3 py-1 text-[11px] font-bold text-ink/45 uppercase tracking-wider select-none">
                {group.label}
              </div>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        onClick={onCloseMobile}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] transition-all duration-120 group',
                            isActive
                              ? 'bg-pine-50 dark:bg-pine-950/40 text-pine-700 dark:text-pine-300 shadow-xs border border-pine-200/60 dark:border-pine-800/40 font-bold'
                              : 'text-ink/75 font-medium hover:text-ink hover:bg-moss'
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Icon
                              className={cn(
                                'w-[18px] h-[18px] flex-shrink-0 transition-colors',
                                isActive
                                  ? 'text-pine-700 dark:text-pine-300'
                                  : 'text-ink/45 group-hover:text-ink/80'
                              )}
                              strokeWidth={isActive ? 2.3 : 1.9}
                              aria-hidden="true"
                            />
                            <span className="truncate">{item.label}</span>
                          </>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Install Standalone App CTA */}
        <div className="px-3 pb-2 flex-shrink-0">
          <button
            onClick={() => setIsInstallOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-pine-50 hover:bg-pine-100 dark:bg-pine-950/40 dark:hover:bg-pine-950/70 border border-pine-200/70 dark:border-pine-800/60 text-xs font-bold text-pine-700 dark:text-pine-300 transition-all cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-pine-600 shrink-0" />
            <span>Install Offline App</span>
          </button>
        </div>

        {/* Bottom Status Badge & Author Attribution */}
        <div className="p-3 border-t border-line flex-shrink-0 space-y-1.5">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-moss/80 border border-line text-xs text-ink/75">
            <Shield className="w-3.5 h-3.5 text-pine-600 flex-shrink-0" />
            <span className="truncate font-semibold text-[11.5px]">Zero-Knowledge Encrypted</span>
          </div>
          <div className="px-1 text-center">
            <span className="text-[11px] font-medium text-ink/40 tracking-tight block">
              Crafted by <span className="text-pine-600 dark:text-pine-400 font-bold">Krish Patel</span>
            </span>
          </div>
        </div>
      </aside>

      {/* PWA Install Modal */}
      {isInstallOpen && (
        <PWAInstallModal
          isOpen={isInstallOpen}
          onClose={() => setIsInstallOpen(false)}
        />
      )}
    </>
  );
};
