export interface ShortcutAction {
  id: string;
  name: string;
  description: string;
  defaultKey: string;
  category: 'Actions' | 'Navigation' | 'General';
}

export const APP_SHORTCUTS: ShortcutAction[] = [
  // Quick Financial Actions
  {
    id: 'new_expense',
    name: 'Record Expense',
    description: 'Open Add Entry modal directly in Spend/Expense mode',
    defaultKey: 'e',
    category: 'Actions',
  },
  {
    id: 'new_income',
    name: 'Record Income',
    description: 'Open Add Entry modal directly in Income mode',
    defaultKey: 'i',
    category: 'Actions',
  },
  {
    id: 'new_transfer',
    name: 'Account Transfer',
    description: 'Open Add Entry modal directly in Transfer mode',
    defaultKey: 't',
    category: 'Actions',
  },
  {
    id: 'new_invest',
    name: 'Invest / Asset',
    description: 'Open Add Entry modal in Investment & Asset purchase mode',
    defaultKey: 'v',
    category: 'Actions',
  },
  {
    id: 'new_debt',
    name: 'Debt / Loan',
    description: 'Open Add Entry modal in Loan EMI / Debt received mode',
    defaultKey: 'l',
    category: 'Actions',
  },
  {
    id: 'new_people',
    name: 'People Ledger (Udhar)',
    description: 'Open Add Entry modal in Lent, Borrowed or Holding mode',
    defaultKey: 'u',
    category: 'Actions',
  },
  {
    id: 'toggle_privacy',
    name: 'Toggle Privacy Mask',
    description: 'Mask or unmask account balances and transaction amounts',
    defaultKey: 'p',
    category: 'Actions',
  },

  // Navigation
  {
    id: 'nav_dashboard',
    name: 'Go to Dashboard',
    description: 'Jump to the main Dashboard & Net Worth view',
    defaultKey: '1',
    category: 'Navigation',
  },
  {
    id: 'nav_transactions',
    name: 'Go to Transactions',
    description: 'Jump to the Transaction Ledger view',
    defaultKey: '2',
    category: 'Navigation',
  },
  {
    id: 'nav_accounts',
    name: 'Go to Accounts',
    description: 'Jump to Bank Accounts & Wallets view',
    defaultKey: '3',
    category: 'Navigation',
  },
  {
    id: 'nav_assets',
    name: 'Go to Assets & Debt',
    description: 'Jump to Investments, Assets & Liabilities view',
    defaultKey: '4',
    category: 'Navigation',
  },
  {
    id: 'nav_people',
    name: 'Go to People Ledger',
    description: 'Jump to Lent, Borrowed & Custodial Holdings',
    defaultKey: '5',
    category: 'Navigation',
  },
  {
    id: 'nav_budgets',
    name: 'Go to Budgets & Goals',
    description: 'Jump to Category Budgets & Savings Goals',
    defaultKey: '6',
    category: 'Navigation',
  },
  {
    id: 'nav_reports',
    name: 'Go to Reports',
    description: 'Jump to Financial Reports & PDF Export',
    defaultKey: '7',
    category: 'Navigation',
  },
  {
    id: 'nav_import',
    name: 'Go to Bank Import',
    description: 'Jump to Bank Statement CSV Parser',
    defaultKey: '8',
    category: 'Navigation',
  },
  {
    id: 'nav_settings',
    name: 'Go to Settings',
    description: 'Jump to Vault Preferences & Security',
    defaultKey: '9',
    category: 'Navigation',
  },

  // General
  {
    id: 'help',
    name: 'Keyboard Shortcuts Cheat Sheet',
    description: 'Open keyboard shortcuts reference guide',
    defaultKey: '?',
    category: 'General',
  },
];

export function getEffectiveShortcuts(custom?: Record<string, string>): Record<string, string> {
  const map: Record<string, string> = {};
  for (const s of APP_SHORTCUTS) {
    map[s.id] = (custom && custom[s.id] ? custom[s.id] : s.defaultKey).toLowerCase();
  }
  return map;
}

export function formatKeyDisplay(key: string): string {
  if (!key) return '—';
  if (key === ' ') return 'Space';
  if (key.toLowerCase() === 'escape') return 'Esc';
  if (key.toLowerCase() === 'arrowup') return '↑';
  if (key.toLowerCase() === 'arrowdown') return '↓';
  if (key.toLowerCase() === 'arrowleft') return '←';
  if (key.toLowerCase() === 'arrowright') return '→';
  return key.toUpperCase();
}
