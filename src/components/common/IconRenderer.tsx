import React from 'react';
import * as LucideIcons from 'lucide-react';
import { Tag } from 'lucide-react';

interface IconRendererProps {
  name?: string;
  className?: string;
  size?: number;
  fallback?: React.ReactNode;
}

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

  // Check if `name` is a valid Lucide component
  const IconComponent = (LucideIcons as any)[name];
  if (typeof IconComponent === 'function') {
    return <IconComponent className={className} size={size} />;
  }

  // Otherwise treat as emoji or unicode string
  return (
    <span
      className={`inline-flex items-center justify-center select-none leading-none ${className}`}
      style={{ fontSize: size ? `${size}px` : undefined }}
    >
      {name}
    </span>
  );
};

