import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  label?: string;
  value: string;
  onChange: (e: any) => void;
  options: SelectOption[];
  error?: string;
  helperText?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  value,
  onChange,
  options,
  error,
  helperText,
  placeholder = 'Select…',
  disabled = false,
  className = '',
  id: customId,
}) => {
  const autoId = useId();
  const id = customId || autoId;
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = searchQuery.trim()
    ? options.filter((opt) => opt.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

  // Reset focus index when opening or filtering
  useEffect(() => {
    if (isOpen) {
      const idx = filteredOptions.findIndex((opt) => opt.value === value);
      setFocusedIndex(idx >= 0 ? idx : 0);
      if (options.length > 7 && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    } else {
      setSearchQuery('');
    }
  }, [isOpen, filteredOptions.length, value, options.length]);

  const handleSelect = (val: string) => {
    onChange({ target: { value: val } });
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  // Keyboard navigation per APG WAI-ARIA
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
        const opt = filteredOptions[focusedIndex];
        if (!opt.disabled) handleSelect(opt.value);
      }
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  return (
    <div
      className={cn('w-full space-y-1.5 relative select-none', className)}
      ref={containerRef}
      onKeyDown={handleKeyDown}
    >
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-200 tracking-tight"
        >
          {label}
        </label>
      )}

      {/* Accessible Popover Trigger */}
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={label ? `${id}-label ${id}` : id}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all text-left shadow-xs cursor-pointer',
          'bg-white dark:bg-navy-800 text-slate-900 dark:text-slate-100',
          'border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.14]',
          'focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-hidden',
          isOpen && 'ring-2 ring-amber-500/50 border-amber-500/70',
          disabled && 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-navy-900',
          error && 'border-rose-500 focus-visible:ring-rose-500/30'
        )}
      >
        <span className={cn('truncate', !selectedOption && 'text-slate-400 font-normal')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-slate-400 transition-transform duration-150 ml-2 flex-shrink-0',
            isOpen && 'transform rotate-180 text-amber-500'
          )}
        />
      </button>

      {/* Dropdown Menu Container */}
      {isOpen && (
        <div
          ref={listboxRef}
          role="listbox"
          tabIndex={-1}
          aria-activedescendant={focusedIndex >= 0 ? `${id}-opt-${focusedIndex}` : undefined}
          className="absolute z-50 mt-1 w-full bg-white dark:bg-navy-800 border border-slate-200 dark:border-white/[0.1] rounded-xl shadow-popover-light dark:shadow-popover-dark overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-64 flex flex-col"
        >
          {/* Search filter for long option sets */}
          {options.length > 7 && (
            <div className="p-2 border-b border-slate-100 dark:border-white/[0.06] flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search…"
                className="w-full bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden"
              />
            </div>
          )}

          {/* Options List */}
          <div className="p-1 overflow-y-auto custom-scrollbar flex-1 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="py-3 px-3 text-center text-xs text-slate-400">
                No matching options
              </div>
            ) : (
              filteredOptions.map((opt, index) => {
                const isSelected = opt.value === value;
                const isFocused = index === focusedIndex;

                return (
                  <button
                    id={`${id}-opt-${index}`}
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => !opt.disabled && handleSelect(opt.value)}
                    onMouseEnter={() => setFocusedIndex(index)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer',
                      isSelected
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold'
                        : isFocused
                        ? 'bg-slate-100 dark:bg-white/[0.06] text-slate-900 dark:text-white'
                        : 'text-slate-700 dark:text-slate-200',
                      opt.disabled && 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-amber-500 flex-shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && <p className="text-[11px] text-rose-500 font-medium">{error}</p>}
      {helperText && !error && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">{helperText}</p>
      )}
    </div>
  );
};
