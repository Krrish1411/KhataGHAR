import type { Category } from '../types';

export interface StarterCategoryDef {
  name: string;
  type: 'income' | 'expense';
  icon: string;
  isEssential: boolean;
  color: string;
}

export const STARTER_CATEGORY_DEFINITIONS: StarterCategoryDef[] = [
  // Expense Categories (Clean Top-Level Only)
  {
    name: 'Food & Dining',
    type: 'expense',
    icon: 'Utensils',
    isEssential: false,
    color: '#F59E0B',
  },
  {
    name: 'Groceries',
    type: 'expense',
    icon: 'ShoppingCart',
    isEssential: true,
    color: '#10B981',
  },
  {
    name: 'Rent & Housing',
    type: 'expense',
    icon: 'Home',
    isEssential: true,
    color: '#6366F1',
  },
  {
    name: 'Utilities & Bills',
    type: 'expense',
    icon: 'Zap',
    isEssential: true,
    color: '#3B82F6',
  },
  {
    name: 'Transport & Fuel',
    type: 'expense',
    icon: 'Car',
    isEssential: true,
    color: '#EC4899',
  },
  {
    name: 'Health & Medical',
    type: 'expense',
    icon: 'Activity',
    isEssential: true,
    color: '#EF4444',
  },
  {
    name: 'Insurance',
    type: 'expense',
    icon: 'ShieldCheck',
    isEssential: true,
    color: '#14B8A6',
  },
  {
    name: 'Education',
    type: 'expense',
    icon: 'GraduationCap',
    isEssential: true,
    color: '#8B5CF6',
  },
  {
    name: 'Entertainment & Subscriptions',
    type: 'expense',
    icon: 'Tv',
    isEssential: false,
    color: '#A855F7',
  },
  {
    name: 'Shopping',
    type: 'expense',
    icon: 'ShoppingBag',
    isEssential: false,
    color: '#F43F5E',
  },
  {
    name: 'Personal Care',
    type: 'expense',
    icon: 'Sparkles',
    isEssential: false,
    color: '#06B6D4',
  },
  {
    name: 'Travel & Vacations',
    type: 'expense',
    icon: 'Plane',
    isEssential: false,
    color: '#0EA5E9',
  },
  {
    name: 'Gifts & Donations',
    type: 'expense',
    icon: 'Gift',
    isEssential: false,
    color: '#D946EF',
  },
  {
    name: 'Festivals & Events',
    type: 'expense',
    icon: 'Sparkle',
    isEssential: false,
    color: '#F97316',
  },
  {
    name: 'EMI & Loan Payments',
    type: 'expense',
    icon: 'CreditCard',
    isEssential: true,
    color: '#E11D48',
  },
  {
    name: 'Investments & SIP',
    type: 'expense',
    icon: 'TrendingUp',
    isEssential: false,
    color: '#059669',
  },
  {
    name: 'Taxes',
    type: 'expense',
    icon: 'Receipt',
    isEssential: true,
    color: '#475569',
  },
  {
    name: 'Household Help',
    type: 'expense',
    icon: 'UserCheck',
    isEssential: true,
    color: '#7C3AED',
  },
  {
    name: 'Miscellaneous',
    type: 'expense',
    icon: 'HelpCircle',
    isEssential: false,
    color: '#64748B',
  },

  // Income Categories
  {
    name: 'Salary',
    type: 'income',
    icon: 'Briefcase',
    isEssential: true,
    color: '#10B981',
  },
  {
    name: 'Business Income',
    type: 'income',
    icon: 'Building',
    isEssential: true,
    color: '#059669',
  },
  {
    name: 'Freelance & Consulting',
    type: 'income',
    icon: 'Laptop',
    isEssential: true,
    color: '#0D9488',
  },
  {
    name: 'Rental Income',
    type: 'income',
    icon: 'KeyRound',
    isEssential: true,
    color: '#0284C7',
  },
  {
    name: 'Interest & Dividends',
    type: 'income',
    icon: 'Coins',
    isEssential: true,
    color: '#84CC16',
  },
  {
    name: 'Other Income',
    type: 'income',
    icon: 'PlusCircle',
    isEssential: true,
    color: '#6366F1',
  },
];

// Generate initial category list for a new vault (or reset)
export function generateStarterCategories(vaultId: string): Category[] {
  const categories: Category[] = [];
  const now = new Date().toISOString();

  STARTER_CATEGORY_DEFINITIONS.forEach((def, index) => {
    const id = `cat_${vaultId}_${index}`;
    categories.push({
      id,
      vaultId,
      name: def.name,
      type: def.type,
      icon: def.icon,
      color: def.color,
      isEssential: def.isEssential,
      isStarter: true,
      updatedAt: now,
    });
  });

  return categories;
}
