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
};

/**
 * Returns a clean emoji for native <select><option> elements
 * where SVG icons cannot be rendered.
 */
export function getCategoryEmoji(icon?: string, type?: 'expense' | 'income'): string {
  if (!icon) return type === 'income' ? '🟢' : '🔴';
  if (LUCIDE_TO_EMOJI[icon]) return LUCIDE_TO_EMOJI[icon];
  // If it's already an emoji or short symbol, return it directly
  if (icon.length <= 4 || /[\u{1F300}-\u{1FAFF}]/u.test(icon)) return icon;
  return type === 'income' ? '🟢' : '🔴';
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


