import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Wallet, ArrowLeftRight, Menu, Plus } from 'lucide-react';
import { cn } from '../../utils/cn';

interface BottomNavProps {
  onOpenMore: () => void;
  onOpenQuickAdd?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenMore, onOpenQuickAdd }) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-md border-t border-line px-2 py-1 flex items-center justify-around shadow-lg select-none">
      {/* 1. Dashboard */}
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          cn(
            'flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 px-2 rounded-xl text-[10.5px] font-medium transition-colors relative',
            isActive
              ? 'text-pine-700 dark:text-pine-400 font-bold'
              : 'text-ink/50 hover:text-ink'
          )
        }
      >
        {({ isActive }) => (
          <>
            <LayoutDashboard className="w-5 h-5 mb-0.5" strokeWidth={isActive ? 2.3 : 1.8} />
            <span>Overview</span>
            {isActive && (
              <span className="w-1 h-1 rounded-full bg-pine-600 absolute bottom-0.5" />
            )}
          </>
        )}
      </NavLink>

      {/* 2. Accounts */}
      <NavLink
        to="/accounts"
        className={({ isActive }) =>
          cn(
            'flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 px-2 rounded-xl text-[10.5px] font-medium transition-colors relative',
            isActive
              ? 'text-pine-700 dark:text-pine-400 font-bold'
              : 'text-ink/50 hover:text-ink'
          )
        }
      >
        {({ isActive }) => (
          <>
            <Wallet className="w-5 h-5 mb-0.5" strokeWidth={isActive ? 2.3 : 1.8} />
            <span>Accounts</span>
            {isActive && (
              <span className="w-1 h-1 rounded-full bg-pine-600 absolute bottom-0.5" />
            )}
          </>
        )}
      </NavLink>

      {/* 3. Center Quick Add Button */}
      {onOpenQuickAdd && (
        <button
          onClick={onOpenQuickAdd}
          className="flex items-center justify-center w-11 h-11 -mt-3.5 rounded-full bg-pine-700 hover:bg-pine-600 text-white font-bold shadow-md shadow-pine-900/30 border-2 border-card active:scale-95 transition-transform cursor-pointer"
          aria-label="Quick Add Entry"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>
      )}

      {/* 4. Transactions / Activity */}
      <NavLink
        to="/transactions"
        className={({ isActive }) =>
          cn(
            'flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 px-2 rounded-xl text-[10.5px] font-medium transition-colors relative',
            isActive
              ? 'text-pine-700 dark:text-pine-400 font-bold'
              : 'text-ink/50 hover:text-ink'
          )
        }
      >
        {({ isActive }) => (
          <>
            <ArrowLeftRight className="w-5 h-5 mb-0.5" strokeWidth={isActive ? 2.3 : 1.8} />
            <span>Entries</span>
            {isActive && (
              <span className="w-1 h-1 rounded-full bg-pine-600 absolute bottom-0.5" />
            )}
          </>
        )}
      </NavLink>

      {/* 5. Menu Drawer Trigger */}
      <button
        onClick={onOpenMore}
        className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 px-2 rounded-xl text-[10.5px] font-medium text-ink/50 hover:text-ink transition-colors cursor-pointer"
        aria-label="Open Navigation Menu"
      >
        <Menu className="w-5 h-5 mb-0.5" strokeWidth={1.8} />
        <span>More</span>
      </button>
    </nav>
  );
};
