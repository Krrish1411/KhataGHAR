import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  Check,
  ChevronDown,
  Landmark,
  TrendingUp,
  User,
  Plus,
  X,
} from 'lucide-react';
import type { Category, Account, Asset, Liability, NumberFormatType } from '../../types';
import type { StagedEntryType } from '../../services/parser';
import { formatCurrency } from '../../utils/formatters';
import { IconRenderer } from '../common/IconRenderer';
import { useVault } from '../../context/VaultContext';

interface SearchableTargetPickerProps {
  type: StagedEntryType;
  rawFlow: 'inflow' | 'outflow';
  value: string; // categoryId, toAccountId, linkedAssetId, linkedLiabilityId, or contactName
  onChange: (newValue: string) => void;
  categories: Category[];
  accounts: Account[];
  currentAccountId: string;
  assets: Asset[];
  liabilities: Liability[];
  existingContacts: string[];
  baseCurrency: string;
  numberFormat: NumberFormatType;
  isPrivacyMode?: boolean;
}

interface DisplayItem {
  id: string;
  label: string;
  subLabel?: string;
  icon?: React.ReactNode;
  color?: string;
  isCustom?: boolean;
}

export const isPeopleType = (t: StagedEntryType) =>
  ['lent', 'lent_repaid', 'borrowed', 'borrowed_repaid', 'holding', 'holding_returned'].includes(t);

export const SearchableTargetPicker: React.FC<SearchableTargetPickerProps> = ({
  type,
  rawFlow,
  value,
  onChange,
  categories,
  accounts,
  currentAccountId,
  assets,
  liabilities,
  existingContacts,
  baseCurrency,
  numberFormat,
  isPrivacyMode = false,
}) => {
  const { addCategory } = useVault();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [openUpwards, setOpenUpwards] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Determine flip direction (up vs down) on open
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpwards(spaceBelow < 250);
      setSearchQuery('');
      setHighlightedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Build list of items based on staged entry type
  const items: DisplayItem[] = useMemo(() => {
    if (type === 'transfer') {
      const otherAccs = accounts.filter((a) => a.id !== currentAccountId);
      return otherAccs.map((acc) => ({
        id: acc.id,
        label: `${rawFlow === 'inflow' ? 'From: ' : 'To: '}${acc.name}`,
        subLabel: `${acc.currency} • ${formatCurrency(acc.balance, acc.currency, numberFormat, isPrivacyMode)}`,
        icon: <Landmark className="w-3.5 h-3.5 text-pine-600 shrink-0" />,
      }));
    }

    if (type === 'invest' || type === 'asset_sale') {
      const label = type === 'asset_sale' ? 'Sell from: ' : '';
      const list: DisplayItem[] = assets.map((a) => ({
        id: a.id,
        label: `${label}${a.name}`,
        subLabel: `${a.type.replace('_', ' ')} • ${formatCurrency(a.currentValue, a.currency, numberFormat, isPrivacyMode)}`,
        icon: <TrendingUp className={`w-3.5 h-3.5 shrink-0 ${type === 'asset_sale' ? 'text-flare-600' : 'text-pine-600'}`} />,
      }));

      // Allow creating a new asset on the fly (only for invest, not asset_sale)
      if (type === 'invest') {
        const q = searchQuery.trim();
        if (q && !assets.some((a) => a.name.toLowerCase() === q.toLowerCase())) {
          list.unshift({
            id: `new-asset:${q}`,
            label: `+ Create Asset: "${q}"`,
            subLabel: 'New Investment Asset (Click to create)',
            icon: <Plus className="w-3.5 h-3.5 text-pine-600 shrink-0" />,
            isCustom: true,
          });
        }
      }

      return list;
    }

    if (type === 'debt_payment' || type === 'loan_received') {
      return liabilities.map((l) => ({
        id: l.id,
        label: l.name,
        subLabel: `${type === 'loan_received' ? 'Principal: ' : 'Bal: '}${formatCurrency(l.outstandingBalance, l.currency, numberFormat, isPrivacyMode)}`,
        icon: <Landmark className={`w-3.5 h-3.5 shrink-0 ${type === 'loan_received' ? 'text-pine-600' : 'text-flare-600'}`} />,
      }));
    }

    if (isPeopleType(type)) {
      const list: DisplayItem[] = existingContacts.map((c) => ({
        id: c,
        label: c,
        subLabel: 'Existing Contact',
        icon: <User className="w-3.5 h-3.5 text-mari-600 shrink-0" />,
      }));

      // Allow creating on the fly if user typed a name
      const q = searchQuery.trim();
      if (q && !existingContacts.some((c) => c.toLowerCase() === q.toLowerCase())) {
        list.unshift({
          id: q,
          label: `Use "${q}"`,
          subLabel: 'New Contact',
          icon: <Plus className="w-3.5 h-3.5 text-pine-600 shrink-0" />,
          isCustom: true,
        });
      }
      return list;
    }

    // Default: Categories (for expense or income) — filter by flow, exclude hidden and subcategories
    const targetType: 'expense' | 'income' = rawFlow === 'inflow' ? 'income' : 'expense';
    const catList: DisplayItem[] = categories
      .filter((c) => !c.hidden && !c.parentId && c.type === targetType)
      .map((c) => ({
        id: c.id,
        label: c.name,
        subLabel: c.type,
        color: c.color,
        icon: (
          <span className="w-4 h-4 flex items-center justify-center text-xs shrink-0">
            <IconRenderer name={c.icon} className="w-3.5 h-3.5" />
          </span>
        ),
      }));

    const q = searchQuery.trim();
    if (q && !catList.some((c) => c.label.toLowerCase() === q.toLowerCase())) {
      catList.unshift({
        id: `new-category:${targetType}:${q}`,
        label: `+ Create category "${q}"`,
        subLabel: `New ${targetType} category`,
        icon: <Plus className="w-3.5 h-3.5 text-pine-600 shrink-0" />,
        isCustom: true,
      });
    }

    return catList;
  }, [
    type,
    rawFlow,
    accounts,
    currentAccountId,
    assets,
    liabilities,
    existingContacts,
    categories,
    searchQuery,
    numberFormat,
    isPrivacyMode,
  ]);

  // Filter items by search query
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.subLabel && item.subLabel.toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  // Selected item display info
  const selectedItem = useMemo<DisplayItem | null>(() => {
    if (!value) return null;
    const found = items.find((i) => i.id === value);
    if (found) return found;
    if (value.startsWith('new-asset:')) {
      const name = value.replace('new-asset:', '');
      return {
        id: value,
        label: `+ Create "${name}"`,
        subLabel: 'New Portfolio Asset',
        icon: <Plus className="w-3.5 h-3.5 text-pine-600 shrink-0" />,
      };
    }
    if (value.startsWith('new-category:')) {
      const [, catType, name] = value.split(':');
      return {
        id: value,
        label: `+ Create "${name}"`,
        subLabel: `New ${catType} Category`,
        icon: <Plus className="w-3.5 h-3.5 text-pine-600 shrink-0" />,
      };
    }
    const cat = categories.find((c) => c.id === value);
    if (cat) {
      return {
        id: cat.id,
        label: cat.name,
        subLabel: cat.type,
        color: cat.color,
        icon: (
          <span className="w-4 h-4 flex items-center justify-center text-xs shrink-0">
            <IconRenderer name={cat.icon} className="w-3.5 h-3.5" />
          </span>
        ),
      };
    }
    if (isPeopleType(type)) return { id: value, label: value };
    return null;
  }, [items, value, type, categories]);

  // Placeholders based on type
  const searchPlaceholder = useMemo(() => {
    if (type === 'transfer') return 'Search bank or wallet…';
    if (type === 'invest') return 'Search mutual fund, stock…';
    if (type === 'asset_sale') return 'Search asset to sell/redeem…';
    if (type === 'debt_payment') return 'Search loan, credit card…';
    if (type === 'loan_received') return 'Search loan that was disbursed…';
    if (isPeopleType(type)) return 'Search or type person name…';
    return 'Search or type category name…';
  }, [type]);

  const handleSelect = async (itemId: string) => {
    if (itemId.startsWith('new-category:')) {
      const [, catType, catName] = itemId.split(':');
      try {
        const created = await addCategory({
          name: catName,
          type: catType as 'expense' | 'income',
          icon: catType === 'expense' ? '🔴' : '🟢',
          color: catType === 'income' ? '#10b981' : '#f43f5e',
          isEssential: false,
        });
        onChange(created.id);
      } catch (err) {
        console.error('Failed to create category:', err);
      }
      setIsOpen(false);
      return;
    }
    onChange(itemId);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[highlightedIndex]) {
        handleSelect(filteredItems[highlightedIndex].id);
      } else if (isPeopleType(type) && searchQuery.trim()) {
        handleSelect(searchQuery.trim());
      } else if (searchQuery.trim() && (type === 'expense' || type === 'income')) {
        const targetType = rawFlow === 'inflow' ? 'income' : 'expense';
        handleSelect(`new-category:${targetType}:${searchQuery.trim()}`);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full" ref={containerRef} onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-1.5 px-2.5 py-1 rounded-lg bg-card border border-line hover:border-pine-400 dark:hover:border-pine-600 text-xs font-medium text-ink transition-all shadow-2xs group text-left cursor-pointer"
      >
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          {selectedItem?.color ? (
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: selectedItem.color }}
            />
          ) : selectedItem?.icon ? (
            selectedItem.icon
          ) : isPeopleType(type) ? (
            <User className="w-3.5 h-3.5 text-mari-600 shrink-0" />
          ) : (
            <span className="text-ink/40 text-[11px]">•</span>
          )}

          <span className="truncate font-medium text-ink text-[11.5px]">
            {selectedItem ? selectedItem.label : (
              <span className="text-ink/40 italic">
                {type === 'transfer'
                  ? 'Select Account…'
                  : type === 'invest'
                  ? 'Select Asset…'
                  : type === 'debt_payment'
                  ? 'Select Loan…'
                  : isPeopleType(type)
                  ? 'Enter Person Name…'
                  : 'Select Category…'}
              </span>
            )}
          </span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-ink/40 group-hover:text-ink shrink-0 ml-1 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Searchable Dropdown Popover */}
      {isOpen && (
        <div
          className={`absolute z-50 min-w-[240px] max-w-[320px] w-full bg-card border border-line rounded-xl shadow-xl shadow-black/15 dark:shadow-black/50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col ${
            openUpwards ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}
        >
          {/* Header Search Bar */}
          <div className="p-2 border-b border-line bg-moss/60 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-ink/45 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightedIndex(0);
              }}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-xs text-ink placeholder:text-ink/40 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-0.5 rounded text-ink/40 hover:text-ink cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Type Helper Badge */}
          <div className="px-2.5 py-1 bg-card/60 border-b border-line/60 flex items-center justify-between text-[10px] text-ink/50 font-semibold uppercase tracking-wider">
            <span>
              {type === 'transfer'
                ? rawFlow === 'inflow'
                  ? 'Transfer Source (Money From)'
                  : 'Transfer Destination (Money To)'
                : type === 'invest'
                ? 'Investment Asset'
                : type === 'debt_payment'
                ? 'Liability / Loan'
                : ['lent', 'borrowed', 'holding'].includes(type)
                ? 'Party / Contact'
                : 'Expense / Income Category'}
            </span>
            <span>{filteredItems.length} options</span>
          </div>

          {/* Options List */}
          <div ref={listRef} className="max-h-52 overflow-y-auto custom-scrollbar p-1 space-y-0.5">
            {filteredItems.length === 0 ? (
              <div className="p-3 text-center text-xs text-ink/50">
                {['lent', 'borrowed', 'holding'].includes(type) && searchQuery.trim() ? (
                  <button
                    type="button"
                    onClick={() => handleSelect(searchQuery.trim())}
                    className="w-full py-1.5 px-2 rounded-lg bg-pine-50 dark:bg-pine-950/40 text-pine-700 dark:text-pine-300 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Use "{searchQuery.trim()}" as Contact
                  </button>
                ) : (
                  <span>No matching items found</span>
                )}
              </div>
            ) : (
              filteredItems.map((item, index) => {
                const isSelected = item.id === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left cursor-pointer ${
                      isSelected
                        ? 'bg-pine-50 dark:bg-pine-950/60 text-pine-700 dark:text-pine-300 font-bold'
                        : isHighlighted
                        ? 'bg-moss text-ink'
                        : 'text-ink/85 hover:bg-moss/70'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 truncate">
                      {item.color ? (
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                      ) : item.icon ? (
                        item.icon
                      ) : null}
                      <div className="min-w-0 truncate">
                        <span className="truncate block font-medium">{item.label}</span>
                        {item.subLabel && (
                          <span className="text-[10px] text-ink/45 block truncate">
                            {item.subLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-pine-600 shrink-0 ml-1.5" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
