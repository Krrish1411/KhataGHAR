import type { Category } from '../types';

export interface StarterCategoryDef {
  name: string;
  type: 'income' | 'expense';
  icon: string;
  isEssential: boolean;
  color: string;
  subcategories?: { name: string; icon: string; isEssential: boolean }[];
}

export const STARTER_CATEGORY_DEFINITIONS: StarterCategoryDef[] = [
  // Expense Categories
  {
    name: 'Food & Dining',
    type: 'expense',
    icon: 'Utensils',
    isEssential: false,
    color: '#F59E0B',
    subcategories: [
      { name: 'Restaurants & Cafes', icon: 'Coffee', isEssential: false },
      { name: 'Food Delivery & Takeout', icon: 'Bike', isEssential: false },
      { name: 'Snacks & Beverages', icon: 'Cookie', isEssential: false },
    ],
  },
  {
    name: 'Groceries',
    type: 'expense',
    icon: 'ShoppingCart',
    isEssential: true,
    color: '#10B981',
    subcategories: [
      { name: 'Vegetables & Fruits', icon: 'Apple', isEssential: true },
      { name: 'Dairy & Staples', icon: 'Milk', isEssential: true },
      { name: 'Household Supplies', icon: 'Package', isEssential: true },
    ],
  },
  {
    name: 'Rent & Housing',
    type: 'expense',
    icon: 'Home',
    isEssential: true,
    color: '#6366F1',
    subcategories: [
      { name: 'House Rent', icon: 'Building', isEssential: true },
      { name: 'Maintenance & Society Charges', icon: 'Wrench', isEssential: true },
      { name: 'Home Repairs', icon: 'Hammer', isEssential: true },
    ],
  },
  {
    name: 'Utilities',
    type: 'expense',
    icon: 'Zap',
    isEssential: true,
    color: '#3B82F6',
    subcategories: [
      { name: 'Electricity Bill', icon: 'Lightbulb', isEssential: true },
      { name: 'Water Bill', icon: 'Droplets', isEssential: true },
      { name: 'Piped Gas & Cylinders', icon: 'Flame', isEssential: true },
      { name: 'Broadband & WiFi', icon: 'Wifi', isEssential: true },
      { name: 'Mobile Recharge', icon: 'Smartphone', isEssential: true },
    ],
  },
  {
    name: 'Transport',
    type: 'expense',
    icon: 'Car',
    isEssential: true,
    color: '#EC4899',
    subcategories: [
      { name: 'Fuel (Petrol/Diesel/CNG)', icon: 'Fuel', isEssential: true },
      { name: 'Cab & Auto (Uber/Ola/Auto)', icon: 'Car', isEssential: false },
      { name: 'Public Transport & Metro', icon: 'Train', isEssential: true },
      { name: 'Vehicle Service & Fastag', icon: 'Tool', isEssential: true },
    ],
  },
  {
    name: 'Health & Medical',
    type: 'expense',
    icon: 'Activity',
    isEssential: true,
    color: '#EF4444',
    subcategories: [
      { name: 'Medicines & Pharmacy', icon: 'Pill', isEssential: true },
      { name: 'Doctor Consultation', icon: 'Stethoscope', isEssential: true },
      { name: 'Lab Tests & Diagnostics', icon: 'ClipboardCheck', isEssential: true },
    ],
  },
  {
    name: 'Insurance Premiums',
    type: 'expense',
    icon: 'ShieldCheck',
    isEssential: true,
    color: '#14B8A6',
    subcategories: [
      { name: 'Health Insurance', icon: 'HeartPulse', isEssential: true },
      { name: 'Life & Term Insurance', icon: 'UserCheck', isEssential: true },
      { name: 'Vehicle Insurance', icon: 'Shield', isEssential: true },
    ],
  },
  {
    name: 'Education',
    type: 'expense',
    icon: 'GraduationCap',
    isEssential: true,
    color: '#8B5CF6',
    subcategories: [
      { name: 'School / College Fees', icon: 'BookOpen', isEssential: true },
      { name: 'Courses & Certifications', icon: 'Award', isEssential: false },
      { name: 'Books & Stationery', icon: 'Book', isEssential: true },
    ],
  },
  {
    name: 'Entertainment & Subscriptions',
    type: 'expense',
    icon: 'Tv',
    isEssential: false,
    color: '#A855F7',
    subcategories: [
      { name: 'Streaming (OTT/Music)', icon: 'PlaySquare', isEssential: false },
      { name: 'Movies & Outings', icon: 'Film', isEssential: false },
      { name: 'Gaming & Apps', icon: 'Gamepad2', isEssential: false },
    ],
  },
  {
    name: 'Shopping',
    type: 'expense',
    icon: 'ShoppingBag',
    isEssential: false,
    color: '#F43F5E',
    subcategories: [
      { name: 'Clothing & Footwear', icon: 'Shirt', isEssential: false },
      { name: 'Electronics & Gadgets', icon: 'Laptop', isEssential: false },
      { name: 'Home Decor & Furniture', icon: 'Armchair', isEssential: false },
    ],
  },
  {
    name: 'Personal Care',
    type: 'expense',
    icon: 'Sparkles',
    isEssential: false,
    color: '#06B6D4',
    subcategories: [
      { name: 'Salon & Grooming', icon: 'Scissors', isEssential: false },
      { name: 'Cosmetics & Skincare', icon: 'Sparkles', isEssential: false },
      { name: 'Fitness & Gym', icon: 'Dumbbell', isEssential: false },
    ],
  },
  {
    name: 'Travel & Vacations',
    type: 'expense',
    icon: 'Plane',
    isEssential: false,
    color: '#0EA5E9',
    subcategories: [
      { name: 'Flights & Trains', icon: 'Ticket', isEssential: false },
      { name: 'Hotels & Stays', icon: 'Bed', isEssential: false },
      { name: 'Sightseeing & Activities', icon: 'Camera', isEssential: false },
    ],
  },
  {
    name: 'Gifts & Donations',
    type: 'expense',
    icon: 'Gift',
    isEssential: false,
    color: '#D946EF',
    subcategories: [
      { name: 'Charity & Donations', icon: 'Heart', isEssential: false },
      { name: 'Family & Friends Gifts', icon: 'Gift', isEssential: false },
    ],
  },
  {
    name: 'Festivals & Celebrations',
    type: 'expense',
    icon: 'Sparkle',
    isEssential: false,
    color: '#F97316',
    subcategories: [
      { name: 'Diwali / Eid / Puja / Xmas', icon: 'Sun', isEssential: false },
      { name: 'Weddings & Family Events', icon: 'Users', isEssential: false },
    ],
  },
  {
    name: 'EMI & Loan Payments',
    type: 'expense',
    icon: 'CreditCard',
    isEssential: true,
    color: '#E11D48',
    subcategories: [
      { name: 'Home Loan EMI', icon: 'Home', isEssential: true },
      { name: 'Car / Auto Loan EMI', icon: 'Car', isEssential: true },
      { name: 'Personal Loan EMI', icon: 'Banknote', isEssential: true },
      { name: 'Credit Card Bill Repayment', icon: 'CreditCard', isEssential: true },
    ],
  },
  {
    name: 'Investments & Savings',
    type: 'expense',
    icon: 'TrendingUp',
    isEssential: true,
    color: '#059669',
    subcategories: [
      { name: 'Mutual Funds / SIP', icon: 'PieChart', isEssential: true },
      { name: 'Stocks & Equity', icon: 'LineChart', isEssential: true },
      { name: 'PPF / EPF / NPS', icon: 'Lock', isEssential: true },
      { name: 'Fixed / Recurring Deposits', icon: 'Vault', isEssential: true },
      { name: 'Gold / Digital Gold', icon: 'Coins', isEssential: true },
      { name: 'Chit Funds', icon: 'Layers', isEssential: true },
    ],
  },
  {
    name: 'Taxes',
    type: 'expense',
    icon: 'Receipt',
    isEssential: true,
    color: '#475569',
    subcategories: [
      { name: 'Income Tax Advance/Self', icon: 'FileText', isEssential: true },
      { name: 'Property Tax', icon: 'Building2', isEssential: true },
      { name: 'GST / Professional Tax', icon: 'Scale', isEssential: true },
    ],
  },
  {
    name: 'Household Help',
    type: 'expense',
    icon: 'UserCheck',
    isEssential: true,
    color: '#7C3AED',
    subcategories: [
      { name: 'Maid / Housekeeper Salary', icon: 'Users', isEssential: true },
      { name: 'Cook / Chef', icon: 'UtensilsCrossed', isEssential: true },
      { name: 'Driver / Security', icon: 'Key', isEssential: true },
    ],
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
    subcategories: [
      { name: 'Monthly Base Salary', icon: 'Banknote', isEssential: true },
      { name: 'Bonus & Incentives', icon: 'Sparkles', isEssential: true },
      { name: 'Reimbursements', icon: 'Receipt', isEssential: true },
    ],
  },
  {
    name: 'Business Income',
    type: 'income',
    icon: 'Building',
    isEssential: true,
    color: '#059669',
    subcategories: [
      { name: 'Sales Revenue', icon: 'ShoppingBag', isEssential: true },
      { name: 'Client Payments', icon: 'CreditCard', isEssential: true },
    ],
  },
  {
    name: 'Freelance & Consulting',
    type: 'income',
    icon: 'Laptop',
    isEssential: true,
    color: '#0D9488',
    subcategories: [
      { name: 'Project Fees', icon: 'FileCheck', isEssential: true },
      { name: 'Retainers', icon: 'Clock', isEssential: true },
    ],
  },
  {
    name: 'Rental Income',
    type: 'income',
    icon: 'KeyRound',
    isEssential: true,
    color: '#0284C7',
    subcategories: [
      { name: 'Residential Property Rent', icon: 'Home', isEssential: true },
      { name: 'Commercial Property Rent', icon: 'Building2', isEssential: true },
    ],
  },
  {
    name: 'Interest & Dividends',
    type: 'income',
    icon: 'Coins',
    isEssential: true,
    color: '#84CC16',
    subcategories: [
      { name: 'Stock Dividends', icon: 'TrendingUp', isEssential: true },
      { name: 'Bank & FD Interest', icon: 'Percent', isEssential: true },
    ],
  },
  {
    name: 'Other Income',
    type: 'income',
    icon: 'PlusCircle',
    isEssential: true,
    color: '#6366F1',
    subcategories: [
      { name: 'Gifts Received', icon: 'Gift', isEssential: false },
      { name: 'Cashback & Rewards', icon: 'Award', isEssential: false },
      { name: 'Asset Sale Profit', icon: 'DollarSign', isEssential: true },
    ],
  },
];

// Generate initial category list for a new vault
export function generateStarterCategories(vaultId: string): Category[] {
  const categories: Category[] = [];
  const now = new Date().toISOString();

  STARTER_CATEGORY_DEFINITIONS.forEach((def, index) => {
    const parentId = `cat_starter_${vaultId}_${index}`;
    categories.push({
      id: parentId,
      vaultId,
      name: def.name,
      type: def.type,
      icon: def.icon,
      color: def.color,
      isEssential: def.isEssential,
      isStarter: true,
      updatedAt: now,
    });

    if (def.subcategories && def.subcategories.length > 0) {
      def.subcategories.forEach((sub, subIdx) => {
        categories.push({
          id: `${parentId}_sub_${subIdx}`,
          vaultId,
          name: sub.name,
          type: def.type,
          parentId: parentId,
          icon: sub.icon,
          color: def.color,
          isEssential: sub.isEssential,
          isStarter: true,
          updatedAt: now,
        });
      });
    }
  });

  return categories;
}
