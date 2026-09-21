import React from 'react';
import {
  Utensils,
  ShoppingCart,
  Home,
  Zap,
  Car,
  Activity,
  ShieldCheck,
  GraduationCap,
  Tv,
  ShoppingBag,
  Sparkles,
  Plane,
  Gift,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Receipt,
  UserCheck,
  HelpCircle,
  Briefcase,
  Building,
  Laptop,
  KeyRound,
  Coins,
  PlusCircle,
  Coffee,
  Fuel,
  Pill,
  HeartPulse,
  BookOpen,
  Film,
  Shirt,
  Scissors,
  Sun,
  Banknote,
  PieChart,
  LineChart,
  FileText,
  Building2,
  Scale,
  Users,
  Tag,
  Wrench,
  Hammer,
  Lightbulb,
  Droplets,
  Flame,
  Wifi,
  Smartphone,
  Train,
  Stethoscope,
  ClipboardCheck,
  Shield,
  Award,
  Book,
  PlaySquare,
  Gamepad2,
  Armchair,
  Dumbbell,
  Ticket,
  Bed,
  Camera,
  Heart,
  Lock,
  Vault,
  Clock,
  Percent,
  DollarSign,
  Apple,
  Milk,
  Package,
  Landmark,
  Folder,
  FolderPlus,
  Pin,
  StickyNote,
} from 'lucide-react';

interface IconRendererProps {
  name?: string;
  className?: string;
  size?: number;
  fallback?: React.ReactNode;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  Utensils,
  ShoppingCart,
  Home,
  Zap,
  Car,
  Activity,
  ShieldCheck,
  GraduationCap,
  Tv,
  ShoppingBag,
  Sparkles,
  Sparkle: Sparkles,
  Plane,
  Gift,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Receipt,
  UserCheck,
  HelpCircle,
  Briefcase,
  Building,
  Laptop,
  KeyRound,
  Coins,
  PlusCircle,
  Coffee,
  Fuel,
  Pill,
  HeartPulse,
  BookOpen,
  Film,
  Shirt,
  Scissors,
  Sun,
  Banknote,
  PieChart,
  LineChart,
  FileText,
  Building2,
  Scale,
  Users,
  Tag,
  Wrench,
  Hammer,
  Lightbulb,
  Droplets,
  Flame,
  Wifi,
  Smartphone,
  Train,
  Stethoscope,
  ClipboardCheck,
  Shield,
  Award,
  Book,
  PlaySquare,
  Gamepad2,
  Armchair,
  Dumbbell,
  Ticket,
  Bed,
  Camera,
  Heart,
  Lock,
  Vault,
  Clock,
  Percent,
  DollarSign,
  Apple,
  Milk,
  Package,
  Landmark,
  Folder,
  FolderPlus,
  Pin,
  StickyNote,
};

export const LUCIDE_TO_EMOJI: Record<string, string> = {
  Utensils: '🍽️',
  ShoppingCart: '🛒',
  Home: '🏠',
  Zap: '⚡',
  Car: '🚗',
  Activity: '🏥',
  ShieldCheck: '🛡️',
  GraduationCap: '🎓',
  Tv: '📺',
  ShoppingBag: '🛍️',
  Sparkles: '✨',
  Sparkle: '✨',
  Plane: '✈️',
  Gift: '🎁',
  CreditCard: '💳',
  TrendingUp: '📈',
  TrendingDown: '📉',
  Receipt: '🧾',
  UserCheck: '👤',
  HelpCircle: '❓',
  Briefcase: '💼',
  Building: '🏢',
  Laptop: '💻',
  KeyRound: '🔑',
  Coins: '🪙',
  PlusCircle: '➕',
  Tag: '🏷️',
  Coffee: '☕',
  Fuel: '⛽',
  Pill: '💊',
  HeartPulse: '❤️‍🩹',
  BookOpen: '📖',
  Film: '🎬',
  Shirt: '👕',
  Scissors: '✂️',
  Sun: '☀️',
  Banknote: '💵',
  PieChart: '📊',
  LineChart: '📈',
  FileText: '📄',
  Building2: '🏛️',
  Scale: '⚖️',
  Users: '👥',
  Landmark: '🏛️',
  Folder: '📁',
  FolderPlus: '📁',
  Pin: '📌',
  Wrench: '🔧',
  Hammer: '🔨',
  Lightbulb: '💡',
  Droplets: '💧',
  Flame: '🔥',
  Wifi: '📶',
  Smartphone: '📱',
  Train: '🚆',
  Stethoscope: '🩺',
  ClipboardCheck: '📋',
  Shield: '🛡️',
  Award: '🏆',
  Book: '📚',
  PlaySquare: '▶️',
  Gamepad2: '🎮',
  Armchair: '🛋️',
  Dumbbell: '🏋️',
  Ticket: '🎟️',
  Bed: '🛏️',
  Camera: '📷',
  Heart: '❤️',
  Lock: '🔒',
  Vault: '🏦',
  Clock: '⏰',
  Percent: '％',
  DollarSign: '💲',
  Apple: '🍎',
  Milk: '🥛',
  Package: '📦',
};

export interface IconPackCategory {
  id: string;
  label: string;
  icons: string[];
}

export const CATEGORIZED_ICON_PACK: IconPackCategory[] = [
  {
    id: 'finance',
    label: 'Money & Wealth',
    icons: ['Banknote', 'Coins', 'TrendingUp', 'Briefcase', 'CreditCard', 'Building2', 'Receipt', 'Percent', 'Award', 'Landmark', 'Vault'],
  },
  {
    id: 'food',
    label: 'Food & Dining',
    icons: ['Utensils', 'ShoppingCart', 'Coffee', 'Apple', 'Milk', 'Package'],
  },
  {
    id: 'home',
    label: 'Home & Utilities',
    icons: ['Home', 'Building', 'Zap', 'Droplets', 'Flame', 'Wifi', 'Smartphone', 'Wrench', 'Hammer', 'Armchair', 'Bed', 'Lightbulb'],
  },
  {
    id: 'transit',
    label: 'Transit & Travel',
    icons: ['Car', 'Fuel', 'Train', 'Plane', 'Ticket'],
  },
  {
    id: 'shopping',
    label: 'Shopping & Style',
    icons: ['ShoppingBag', 'Shirt', 'Scissors', 'Tag', 'Gift', 'Sparkles'],
  },
  {
    id: 'health',
    label: 'Health & Fitness',
    icons: ['HeartPulse', 'Stethoscope', 'Pill', 'Activity', 'ShieldCheck', 'Dumbbell', 'Heart'],
  },
  {
    id: 'tech',
    label: 'Work & Tech',
    icons: ['Laptop', 'BookOpen', 'Book', 'GraduationCap', 'FileText', 'Scale', 'KeyRound', 'Lock'],
  },
  {
    id: 'leisure',
    label: 'Leisure & Media',
    icons: ['Film', 'Tv', 'Gamepad2', 'PlaySquare', 'Camera', 'Sun', 'Clock'],
  },
];

/**
 * Intelligent keyword-to-icon heuristic engine.
 * Never returns primitive red/green dots; maps common financial terms to authentic Lucide icons.
 */
export function suggestCategoryIcon(name: string, type: 'income' | 'expense' = 'expense'): string {
  const lower = (name || '').trim().toLowerCase();

  if (type === 'income') {
    if (/salary|wage|paycheck|stipend|payroll/i.test(lower)) return 'Briefcase';
    if (/freelance|consult|client|gig|contract/i.test(lower)) return 'Laptop';
    if (/dividend|interest|stock|equity|return|yield/i.test(lower)) return 'TrendingUp';
    if (/bonus|award|grant/i.test(lower)) return 'Award';
    if (/business|shop|store|revenue|sales/i.test(lower)) return 'Building2';
    if (/rental|tenant/i.test(lower)) return 'Home';
    return 'Banknote';
  }

  // Expenses:
  if (/grocer|supermarket|vegetable|fruit|milk|ration/i.test(lower)) return 'ShoppingCart';
  if (/food|dine|dining|restaurant|swiggy|zomato|cafe|coffee|snack|lunch|dinner/i.test(lower)) return 'Utensils';
  if (/rent|mortgage|lease|maintenance|housing|property/i.test(lower)) return 'Home';
  if (/electric|power|bescom|tneb|mseb/i.test(lower)) return 'Zap';
  if (/water|plumb/i.test(lower)) return 'Droplets';
  if (/gas|cylinder|lpg/i.test(lower)) return 'Flame';
  if (/internet|wifi|broadband|fiber/i.test(lower)) return 'Wifi';
  if (/mobile|recharge|phone|airtel|jio/i.test(lower)) return 'Smartphone';
  if (/fuel|petrol|diesel|cng/i.test(lower)) return 'Fuel';
  if (/car|vehicle|parking|toll|fastag|service|mechanic/i.test(lower)) return 'Car';
  if (/cab|uber|ola|auto|rickshaw|taxi/i.test(lower)) return 'Car';
  if (/train|metro|bus|rail|irctc/i.test(lower)) return 'Train';
  if (/flight|air|travel|trip|vacation|hotel/i.test(lower)) return 'Plane';
  if (/medic|doctor|hospital|pharma|pill|health|clinic|test|lab/i.test(lower)) return 'HeartPulse';
  if (/shop|mall|amazon|flipkart|cloth|fashion|dress|shoe/i.test(lower)) return 'ShoppingBag';
  if (/entertain|movie|cinema|netflix|ott|prime|hotstar/i.test(lower)) return 'Film';
  if (/game|gaming|steam|playstation/i.test(lower)) return 'Gamepad2';
  if (/gym|fitness|sport|workout|yoga|trainer/i.test(lower)) return 'Dumbbell';
  if (/educat|school|college|tuition|course|book|exam/i.test(lower)) return 'GraduationCap';
  if (/invest|sip|mutual|mf|gold|crypto|share/i.test(lower)) return 'TrendingUp';
  if (/emi|loan|debt|credit card|card payment/i.test(lower)) return 'CreditCard';
  if (/gift|donate|charity|donation|temple|puja/i.test(lower)) return 'Gift';
  if (/pet|vet|dog|cat/i.test(lower)) return 'Heart';

  return 'Tag';
}

/**
 * Returns a clean emoji for native <select><option> elements
 * where SVG icons cannot be rendered. Never outputs red or green dots.
 */
export function getCategoryEmoji(icon?: string, type?: 'expense' | 'income'): string {
  if (!icon || icon === '🟢' || icon === '🔴') {
    return type === 'income' ? '💵' : '🏷️';
  }
  if (LUCIDE_TO_EMOJI[icon]) return LUCIDE_TO_EMOJI[icon];
  // If it's already an emoji or short symbol, return it directly
  if (icon.length <= 4 || /[\u{1F300}-\u{1FAFF}]/u.test(icon)) return icon;
  return type === 'income' ? '💵' : '🏷️';
}

export const IconRenderer: React.FC<IconRendererProps> = ({
  name = 'Tag',
  className = 'w-4 h-4',
  size = 16,
  fallback,
}) => {
  if (!name || name === 'Tag') {
    return fallback ? <>{fallback}</> : <Tag className={className} size={size} />;
  }

  // Intercept legacy red/green dot characters so they NEVER display in the UI!
  if (name === '🟢' || name === '🔴') {
    return name === '🟢' ? (
      <TrendingUp className={className} size={size} />
    ) : (
      <Receipt className={className} size={size} />
    );
  }

  // 1. Direct match in ICON_MAP (renders real SVG component)
  const IconComponent = ICON_MAP[name];
  if (IconComponent) {
    return <IconComponent className={className} size={size} />;
  }

  // 2. Check if name is an emoji or unicode character
  const isEmoji = name.length <= 4 || /[\u{1F300}-\u{1FAFF}]/u.test(name);
  if (isEmoji) {
    return (
      <span
        className={`inline-flex items-center justify-center select-none leading-none ${className}`}
        style={{ fontSize: size ? `${size}px` : undefined }}
      >
        {name}
      </span>
    );
  }

  // 3. Unrecognized text string: NEVER print the raw word, fall back to Tag SVG icon!
  return fallback ? <>{fallback}</> : <Tag className={className} size={size} />;
};


