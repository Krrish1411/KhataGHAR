import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useVault } from '../../context/VaultContext';
import { formatCurrency } from '../../utils/formatters';
import { ContactModal } from './ContactModal';
import { Search, Plus, UserPlus, Check, ChevronDown, X } from 'lucide-react';

interface ContactSelectProps {
  value: string;
  onChange: (contactName: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  className?: string;
}

export const ContactSelect: React.FC<ContactSelectProps> = ({
  value,
  onChange,
  label,
  placeholder = 'Select or type contact name...',
  required = false,
  error,
  className = '',
}) => {
  const { peopleLedger, activeVault } = useVault();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const baseCurrency = activeVault?.currency || 'INR';
  const numberFormat = activeVault?.numberFormat || 'indian';

  // Aggregate unique contacts with initials and net balance from people ledger
  const contactList = useMemo(() => {
    const map = new Map<string, { name: string; initials: string; netBalance: number; phone?: string }>();

    peopleLedger.forEach((entry) => {
      const name = entry.contactName.trim();
      if (!name) return;
      const existing = map.get(name) || {
        name,
        initials: name
          .split(/\s+/)
          .filter(Boolean)
          .map((w) => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase() || 'P',
        netBalance: 0,
        phone: entry.contactPhone,
      };

      const settled = (entry.settlements || []).reduce((sum, s) => sum + s.amount, 0);
      const rem = Math.max(0, entry.amount - settled);
      if (entry.type === 'lent') existing.netBalance += rem;
      else if (entry.type === 'borrowed') existing.netBalance -= rem;
      else if (entry.type === 'holding') existing.netBalance -= rem;

      map.set(name, existing);
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [peopleLedger]);

  // Filter based on search query
  const filteredContacts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return contactList;
    return contactList.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))
    );
  }, [contactList, searchTerm]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedContact = useMemo(() => {
    return contactList.find((c) => c.name.toLowerCase() === value.trim().toLowerCase());
  }, [contactList, value]);

  const handleSelect = (name: string) => {
    onChange(name);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleAddNew = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onChange(trimmed);
    setSearchTerm('');
    setIsOpen(false);
  };

  const hasExactMatch = contactList.some(
    (c) => c.name.toLowerCase() === searchTerm.trim().toLowerCase()
  );

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-1">
          <span>{label}</span>
          <button
            type="button"
            onClick={() => setIsContactModalOpen(true)}
            className="text-pine-600 hover:text-pine-700 flex items-center gap-1 font-semibold cursor-pointer lowercase"
          >
            <UserPlus className="w-3 h-3" />
            <span>+ new contact</span>
          </button>
        </div>
      )}

      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full rounded-xl border bg-card px-3 py-2 text-xs font-semibold text-ink flex items-center justify-between gap-2 cursor-pointer transition-all shadow-xs ${
          error ? 'border-flare-500 ring-1 ring-flare-500/20' : 'border-line hover:border-pine-300'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {value ? (
            <>
              <div className="w-6 h-6 rounded-lg bg-pine-100 dark:bg-pine-950/80 border border-pine-300/40 text-pine-700 dark:text-pine-300 text-[10px] font-bold grid place-items-center shrink-0">
                {selectedContact?.initials || value.slice(0, 2).toUpperCase()}
              </div>
              <span className="truncate font-bold text-ink">{value}</span>
              {selectedContact && selectedContact.netBalance !== 0 && (
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                    selectedContact.netBalance > 0
                      ? 'bg-pine-50 text-pine-700 dark:bg-pine-950/60 dark:text-pine-300'
                      : 'bg-flare-50 text-flare-700 dark:bg-flare-950/60 dark:text-flare-300'
                  }`}
                >
                  {selectedContact.netBalance > 0 ? 'Gets' : 'Owes'} {formatCurrency(Math.abs(selectedContact.netBalance), baseCurrency, numberFormat)}
                </span>
              )}
            </>
          ) : (
            <span className="text-ink/40 font-normal">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 text-ink/40 shrink-0">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-1 hover:text-flare-600 rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 rounded-2xl border border-line bg-card shadow-xl p-2 space-y-2 animate-in fade-in duration-100">
          {/* Search box inside dropdown */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
            <input
              type="text"
              autoFocus
              placeholder="Search or type new name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (searchTerm.trim()) {
                    handleAddNew(searchTerm);
                  }
                }
              }}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-line bg-moss/40 text-xs font-semibold text-ink placeholder:text-ink/35 outline-none focus:border-pine-500"
            />
          </div>

          {/* Quick Create Button if typed name doesn't exactly exist */}
          {searchTerm.trim() && !hasExactMatch && (
            <button
              type="button"
              onClick={() => handleAddNew(searchTerm)}
              className="w-full p-2 rounded-xl bg-pine-50 dark:bg-pine-950/40 hover:bg-pine-100 border border-pine-200 dark:border-pine-800 text-pine-700 dark:text-pine-300 text-xs font-bold flex items-center justify-between cursor-pointer transition-all active:scale-95"
            >
              <span className="flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                <span>Add &quot;{searchTerm.trim()}&quot; as Contact</span>
              </span>
              <span className="text-[10px] text-pine-600/70 font-normal">Press Enter ↵</span>
            </button>
          )}

          {/* Contacts List */}
          <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1 pr-1">
            {filteredContacts.map((contact) => {
              const isSelected = value.toLowerCase() === contact.name.toLowerCase();
              return (
                <div
                  key={contact.name}
                  onClick={() => handleSelect(contact.name)}
                  className={`p-2 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'border-pine-500 bg-pine-50/50 dark:bg-pine-950/40 text-ink'
                      : 'border-transparent hover:bg-moss/70 text-ink/80 hover:text-ink'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-mari-100/70 dark:bg-mari-950/60 border border-mari-300/30 text-mari-700 dark:text-mari-300 text-xs font-bold grid place-items-center shrink-0">
                      {contact.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-ink truncate">{contact.name}</div>
                      {contact.phone && (
                        <div className="text-[10px] text-ink/40 font-mono">{contact.phone}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {contact.netBalance !== 0 ? (
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                          contact.netBalance > 0
                            ? 'bg-pine-50 dark:bg-pine-950/60 text-pine-700 dark:text-pine-300 border border-pine-200/50'
                            : 'bg-flare-50 dark:bg-flare-950/60 text-flare-700 dark:text-flare-300 border border-flare-200/50'
                        }`}
                      >
                        {contact.netBalance > 0 ? '+ ' : '- '}
                        {formatCurrency(Math.abs(contact.netBalance), baseCurrency, numberFormat)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-ink/35 font-semibold">Settled</span>
                    )}
                    {isSelected && <Check className="w-3.5 h-3.5 text-pine-600 shrink-0 ml-1" />}
                  </div>
                </div>
              );
            })}

            {filteredContacts.length === 0 && !searchTerm.trim() && (
              <div className="py-4 text-center text-xs text-ink/45">
                No contacts found. Type a name to add someone!
              </div>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-[11px] text-flare-600 mt-1">{error}</p>}

      {/* Nested Contact Modal */}
      {isContactModalOpen && (
        <ContactModal
          isOpen={isContactModalOpen}
          onClose={() => setIsContactModalOpen(false)}
          onSuccess={(newName) => {
            onChange(newName);
            setIsContactModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
