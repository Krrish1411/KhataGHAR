import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { useVault } from '../../context/VaultContext';
import { formatDateISO } from '../../utils/dates';
import type { PeopleLedgerEntry, PeopleEntryType, CurrencyCode, Account, Asset } from '../../types';
import { Users2, ArrowUpRight, ArrowDownLeft, HandCoins, Landmark, Plus, ShieldCheck, Wallet, Briefcase } from 'lucide-react';
import { ContactSelect } from './ContactSelect';
import { AccountModal } from '../accounts/AccountModal';
import { AssetModal } from '../assets/AssetModal';

interface PeopleEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryToEdit?: PeopleLedgerEntry;
  initialType?: PeopleEntryType;
  initialContactName?: string;
}

export const PeopleEntryModal: React.FC<PeopleEntryModalProps> = ({
  isOpen,
  onClose,
  entryToEdit,
  initialType = 'lent',
  initialContactName = '',
}) => {
  const { addPeopleEntry, updatePeopleEntry, accounts, assets, activeVault } = useVault();

  const [type, setType] = useState<PeopleEntryType>(entryToEdit?.type || initialType);
  const [contactName, setContactName] = useState(entryToEdit?.contactName || initialContactName || '');
  const [contactPhone, setContactPhone] = useState(entryToEdit?.contactPhone || '');
  const [accountId, setAccountId] = useState(entryToEdit?.accountId || (accounts.length > 0 ? accounts[0].id : ''));
  const [heldInType, setHeldInType] = useState<'account' | 'asset' | 'unallocated'>(
    entryToEdit?.heldInType || (entryToEdit?.linkedAssetId ? 'asset' : 'account')
  );
  const [linkedAssetId, setLinkedAssetId] = useState(entryToEdit?.linkedAssetId || (assets.length > 0 ? assets[0].id : ''));
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);

  const [amount, setAmount] = useState(entryToEdit?.amount ? String(entryToEdit.amount) : '');
  const [currency, setCurrency] = useState<CurrencyCode>(entryToEdit?.currency || activeVault?.currency || 'INR');
  const [date, setDate] = useState(entryToEdit?.date || formatDateISO(new Date()));
  const [dueDate, setDueDate] = useState(entryToEdit?.dueDate || '');
  const [hasInterest, setHasInterest] = useState(entryToEdit?.hasInterest || false);
  const [interestRate, setInterestRate] = useState(entryToEdit?.interestRate ? String(entryToEdit.interestRate) : '');
  const [notes, setNotes] = useState(entryToEdit?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      if (entryToEdit) {
        setType(entryToEdit.type);
        setContactName(entryToEdit.contactName);
        setContactPhone(entryToEdit.contactPhone || '');
        setAccountId(entryToEdit.accountId || (accounts.length > 0 ? accounts[0].id : ''));
        setHeldInType(entryToEdit.heldInType || (entryToEdit.linkedAssetId ? 'asset' : 'account'));
        setLinkedAssetId(entryToEdit.linkedAssetId || (assets.length > 0 ? assets[0].id : ''));
        setAmount(String(entryToEdit.amount));
        setCurrency(entryToEdit.currency);
        setDate(entryToEdit.date);
        setDueDate(entryToEdit.dueDate || '');
        setHasInterest(entryToEdit.hasInterest || false);
        setInterestRate(entryToEdit.interestRate ? String(entryToEdit.interestRate) : '');
        setNotes(entryToEdit.notes || '');
      } else {
        setType(initialType);
        setContactName(initialContactName || '');
        setContactPhone('');
        setAccountId(accounts.length > 0 ? accounts[0].id : '');
        setHeldInType('account');
        setLinkedAssetId(assets.length > 0 ? assets[0].id : '');
        setAmount('');
        setCurrency(activeVault?.currency || 'INR');
        setDate(formatDateISO(new Date()));
        setDueDate('');
        setHasInterest(false);
        setInterestRate('');
        setNotes('');
      }
      setError('');
    }
  }, [isOpen, entryToEdit, initialType, initialContactName, accounts, assets, activeVault]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim()) {
      setError('Please provide a contact or person name');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please provide a valid positive amount');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const finalAccountId = type === 'holding'
        ? (heldInType === 'account' ? (accountId || undefined) : undefined)
        : (accountId || undefined);
      
      const finalHeldInType = type === 'holding' ? heldInType : undefined;
      const finalLinkedAssetId = type === 'holding' && heldInType === 'asset' ? (linkedAssetId || undefined) : undefined;

      if (entryToEdit) {
        await updatePeopleEntry({
          ...entryToEdit,
          contactName: contactName.trim(),
          contactPhone: contactPhone.trim() || undefined,
          accountId: finalAccountId,
          heldInType: finalHeldInType,
          linkedAssetId: finalLinkedAssetId,
          type,
          amount: numAmount,
          currency,
          date,
          dueDate: dueDate || undefined,
          hasInterest,
          interestRate: hasInterest && interestRate ? parseFloat(interestRate) : undefined,
          notes: notes.trim() || undefined,
        });
      } else {
        await addPeopleEntry({
          contactName: contactName.trim(),
          contactPhone: contactPhone.trim() || undefined,
          accountId: finalAccountId,
          heldInType: finalHeldInType,
          linkedAssetId: finalLinkedAssetId,
          type,
          amount: numAmount,
          currency,
          date,
          dueDate: dueDate || undefined,
          hasInterest,
          interestRate: hasInterest && interestRate ? parseFloat(interestRate) : undefined,
          notes: notes.trim() || undefined,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div className="flex items-center gap-2">
            <Users2 className="w-5 h-5 text-brand-500" />
            <span>{entryToEdit ? 'Edit Ledger Record' : 'Add People Ledger Entry'}</span>
          </div>
        }
        description="Record informal money lent to, borrowed from, or held for family, friends, or help"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs rounded-xl">
              {error}
            </div>
          )}

          {/* Type Selector Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-navy-900 rounded-xl">
            <button
              type="button"
              onClick={() => setType('lent')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-1 rounded-xl text-xs font-bold transition-all ${
                type === 'lent'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>I Lent Out</span>
            </button>

            <button
              type="button"
              onClick={() => setType('borrowed')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-1 rounded-xl text-xs font-bold transition-all ${
                type === 'borrowed'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>I Borrowed</span>
            </button>

            <button
              type="button"
              onClick={() => setType('holding')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-1 rounded-xl text-xs font-bold transition-all ${
                type === 'holding'
                  ? 'bg-sky-500 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <HandCoins className="w-3.5 h-3.5" />
              <span>Holding for Others</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ContactSelect
              label="Person / Contact Name"
              placeholder="e.g. Ramesh Uncle, Priya, Amit"
              value={contactName}
              onChange={setContactName}
              required
            />

            <Input
              label="Phone Number (Optional)"
              placeholder="e.g. 9876543210"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              step="any"
              label="Amount"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              tabularNums
              required
            />

            <Select
              label="Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              options={[
                { value: 'INR', label: 'INR (₹)' },
                { value: 'USD', label: 'USD ($)' },
                { value: 'EUR', label: 'EUR (€)' },
                { value: 'GBP', label: 'GBP (£)' },
                { value: 'AED', label: 'AED (د.إ)' },
              ]}
            />
          </div>

          {/* Custodial Holding Placement Location */}
          {type === 'holding' ? (
            <div className="p-3.5 bg-sky-50/60 dark:bg-sky-950/30 rounded-2xl border border-sky-200/80 dark:border-sky-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-sky-900 dark:text-sky-300">
                  <ShieldCheck className="w-4 h-4 text-sky-500" />
                  <span>Custodial Holding Location</span>
                </div>
                <span className="text-[10px] font-semibold text-sky-700/80 dark:text-sky-400 bg-sky-100 dark:bg-sky-900/50 px-2 py-0.5 rounded-md">
                  Safekeeping
                </span>
              </div>

              {/* Sub-tabs for heldInType */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-white/80 dark:bg-navy-900/80 rounded-xl border border-sky-200/50 dark:border-sky-800/50 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setHeldInType('account')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg transition-all cursor-pointer ${
                    heldInType === 'account'
                      ? 'bg-sky-500 text-white shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Bank / Cash</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHeldInType('asset')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg transition-all cursor-pointer ${
                    heldInType === 'asset'
                      ? 'bg-sky-500 text-white shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Asset / MF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHeldInType('unallocated')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg transition-all cursor-pointer ${
                    heldInType === 'unallocated'
                      ? 'bg-sky-500 text-white shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span>General / None</span>
                </button>
              </div>

              {heldInType === 'account' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <span>Account Holding Funds</span>
                    <button
                      type="button"
                      onClick={() => setIsAccountModalOpen(true)}
                      className="text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-semibold lowercase cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ new account</span>
                    </button>
                  </div>
                  <Select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    options={[
                      { value: '', label: 'Select account holding these funds...' },
                      ...accounts.map((a: Account) => ({
                        value: a.id,
                        label: `${a.name} (${a.currency} ${a.balance.toFixed(2)})`,
                      })),
                    ]}
                    helperText="Money stays in this account and will be marked as custodial holding on your account card."
                  />
                </div>
              )}

              {heldInType === 'asset' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <span>Asset Holding Funds</span>
                    <button
                      type="button"
                      onClick={() => setIsAssetModalOpen(true)}
                      className="text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-semibold lowercase cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ new asset</span>
                    </button>
                  </div>
                  <Select
                    value={linkedAssetId}
                    onChange={(e) => setLinkedAssetId(e.target.value)}
                    options={[
                      { value: '', label: 'Select asset holding these funds...' },
                      ...assets.map((a: Asset) => ({
                        value: a.id,
                        label: `${a.name} (${a.type.replace('_', ' ')}) — Val: ${a.currency} ${a.currentValue.toLocaleString()}`,
                      })),
                    ]}
                    helperText="Funds are parked in an asset. Your liquid spendable cash won't be reduced, and the asset card will display your true personal equity."
                  />
                </div>
              )}

              {heldInType === 'unallocated' && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  Recorded as a general custodial obligation. It is not tied to any single bank account or investment asset.
                </p>
              )}
            </div>
          ) : (
            /* Account Linked with lent/borrowed */
            accounts.length > 0 && (
              <div className="p-3.5 bg-slate-50 dark:bg-navy-800/80 rounded-2xl border border-slate-200/80 dark:border-navy-700/80 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <span>
                    {type === 'lent' ? 'Account Lent From' : 'Account Receiving Borrowed Funds'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAccountModalOpen(true)}
                    className="text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 font-semibold lowercase cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ new account</span>
                  </button>
                </div>
                <Select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  options={[
                    { value: '', label: 'None / General (Not tied to a specific account)' },
                    ...accounts.map((a: Account) => ({
                      value: a.id,
                      label: `${a.name} (${a.currency} ${a.balance.toFixed(2)})`,
                    })),
                  ]}
                  helperText="Enables accurate tracking of where funds originated or were received."
                />
              </div>
            )
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              label="Transaction Date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />

            <Input
              type="date"
              label="Expected Due Date (Optional)"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Optional Interest Terms */}
          <div className="p-3.5 bg-slate-50 dark:bg-navy-800/80 rounded-2xl border border-slate-200 dark:border-navy-700 space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={hasInterest}
                onChange={(e) => setHasInterest(e.target.checked)}
                className="rounded text-brand-500 focus:ring-brand-500 w-4 h-4"
              />
              <span>Apply Annual Interest Rate (%)</span>
            </label>

            {hasInterest && (
              <Input
                type="number"
                step="any"
                label="Annual Interest %"
                placeholder="e.g. 12"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                tabularNums
              />
            )}
          </div>

          <Input
            label="Purpose / Notes"
            placeholder="e.g. Holding family wedding funds, emergency advance"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {entryToEdit ? 'Update Entry' : 'Save Entry'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Nested Account Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onAccountCreated={(newAcc) => {
          setAccountId(newAcc.id);
          setIsAccountModalOpen(false);
        }}
      />

      {/* Nested Asset Modal */}
      <AssetModal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
        onAssetCreated={(newAst) => {
          setLinkedAssetId(newAst.id);
          setIsAssetModalOpen(false);
        }}
      />
    </>
  );
};
