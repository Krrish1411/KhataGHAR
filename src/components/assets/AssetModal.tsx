import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { useVault } from '../../context/VaultContext';
import { formatDateISO } from '../../utils/dates';
import type { Asset, AssetType, CurrencyCode } from '../../types';
import { Landmark } from 'lucide-react';

interface AssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetToEdit?: Asset;
}

export const AssetModal: React.FC<AssetModalProps> = ({
  isOpen,
  onClose,
  assetToEdit,
}) => {
  const { addAsset, updateAsset, activeVault, accounts, addTransaction } = useVault();

  const [name, setName] = useState(assetToEdit?.name || '');
  const [type, setType] = useState<AssetType>(assetToEdit?.type || 'mutual_fund');
  const [currentValue, setCurrentValue] = useState(assetToEdit ? String(assetToEdit.currentValue) : '');
  const [currency, setCurrency] = useState<CurrencyCode>(assetToEdit?.currency || activeVault?.currency || 'INR');
  const [purchaseDate, setPurchaseDate] = useState(assetToEdit?.purchaseDate || formatDateISO(new Date()));
  const [purchasePrice, setPurchasePrice] = useState(assetToEdit?.purchasePrice ? String(assetToEdit.purchasePrice) : '');
  const [premiumDueDate, setPremiumDueDate] = useState(assetToEdit?.premiumDueDate || '');
  const [premiumAmount, setPremiumAmount] = useState(assetToEdit?.premiumAmount ? String(assetToEdit.premiumAmount) : '');
  const [maturityDate, setMaturityDate] = useState(assetToEdit?.maturityDate || '');
  const [notes, setNotes] = useState(assetToEdit?.notes || '');
  const [linkToBank, setLinkToBank] = useState(false);
  const [bankAccountId, setBankAccountId] = useState(accounts[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide an asset name');
      return;
    }

    const numVal = parseFloat(currentValue);
    if (isNaN(numVal) || numVal < 0) {
      setError('Please provide a valid current asset value');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (assetToEdit) {
        await updateAsset({
          ...assetToEdit,
          name: name.trim(),
          type,
          currentValue: numVal,
          currency,
          purchaseDate: purchaseDate || undefined,
          purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
          premiumDueDate: premiumDueDate || undefined,
          premiumAmount: premiumAmount ? parseFloat(premiumAmount) : undefined,
          maturityDate: maturityDate || undefined,
          notes: notes.trim() || undefined,
        });
      } else {
        const newAsset = await addAsset({
          name: name.trim(),
          type,
          currentValue: numVal,
          currency,
          purchaseDate: purchaseDate || undefined,
          purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
          premiumDueDate: premiumDueDate || undefined,
          premiumAmount: premiumAmount ? parseFloat(premiumAmount) : undefined,
          maturityDate: maturityDate || undefined,
          notes: notes.trim() || undefined,
        });

        if (linkToBank && bankAccountId) {
          const costToDeduct = purchasePrice ? parseFloat(purchasePrice) : numVal;
          if (costToDeduct > 0) {
            await addTransaction({
              date: purchaseDate || formatDateISO(new Date()),
              amount: costToDeduct,
              type: 'expense',
              currency,
              accountId: bankAccountId,
              note: `Initial purchase: ${name.trim()}`,
              linkedAssetId: newAsset.id,
              subType: 'investment',
            } as any);
          }
        }
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save asset');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Landmark className="w-5 h-5 text-brand-500" />
          <span>{assetToEdit ? 'Edit Asset' : 'Add Asset / Investment'}</span>
        </div>
      }
      description="Track properties, gold, mutual funds, EPF/PPF, insurance, and vehicle valuations"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        <Input
          label="Asset / Investment Name"
          placeholder="e.g. 2BHK Apartment Gurgaon, Sovereign Gold Bond, Parag Parikh Flexi Cap"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Asset Class"
            value={type}
            onChange={(e) => setType(e.target.value as AssetType)}
            options={[
              { value: 'property', label: 'Property / Real Estate' },
              { value: 'vehicle', label: 'Vehicle / Automobile' },
              { value: 'gold', label: 'Gold & Jewelry (Physical/SGB)' },
              { value: 'mutual_fund', label: 'Mutual Funds / SIP' },
              { value: 'stock', label: 'Stocks & Equities' },
              { value: 'fd_rd', label: 'Fixed / Recurring Deposit' },
              { value: 'epf_ppf_nps', label: 'EPF / PPF / NPS' },
              { value: 'insurance', label: 'Insurance Policy (ULIP/Endowment)' },
              { value: 'chit_fund', label: 'Chit Fund' },
              { value: 'other', label: 'Other Asset' },
            ]}
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

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            step="any"
            label="Current Market Value"
            placeholder="0.00"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            tabularNums
            required
          />

          <Input
            type="number"
            step="any"
            label="Purchase / Cost Price (Optional)"
            placeholder="0.00"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
            tabularNums
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="date"
            label="Purchase / Acquisition Date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
          />

          <Input
            type="date"
            label="Maturity Date (Optional)"
            value={maturityDate}
            onChange={(e) => setMaturityDate(e.target.value)}
          />
        </div>

        {/* Insurance-specific fields */}
        {type === 'insurance' && (
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700">
            <Input
              type="date"
              label="Next Premium Due Date"
              value={premiumDueDate}
              onChange={(e) => setPremiumDueDate(e.target.value)}
            />
            <Input
              type="number"
              step="any"
              label="Premium Amount (₹)"
              placeholder="0.00"
              value={premiumAmount}
              onChange={(e) => setPremiumAmount(e.target.value)}
              tabularNums
            />
          </div>
        )}

        <Input
          label="Notes / Folio / Details"
          placeholder="e.g. Folio 12345678, Plot 42, Reg ID"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {/* Bank Deduction Toggle for New Assets */}
        {!assetToEdit && (
          <div className="p-3.5 rounded-2xl border border-line bg-moss/60 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="block text-xs font-bold text-ink">
                  Bank Account Deduction
                </span>
                <span className="block text-[11px] text-ink/50 mt-0.5">
                  {linkToBank
                    ? 'Deducts purchase price from your bank account ledger'
                    : 'Pre-existing holding — does not affect bank balance (Recommended for old assets)'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setLinkToBank(!linkToBank)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  linkToBank ? 'bg-pine-600' : 'bg-ink/20'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    linkToBank ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {linkToBank && (
              <div className="pt-2 border-t border-line/60">
                <Select
                  label="Deduct Initial Cost from Account"
                  value={bankAccountId}
                  onChange={(e: any) => setBankAccountId(e.target.value)}
                  options={accounts.map((a) => ({
                    value: a.id,
                    label: `${a.name} (${a.currency} ${a.balance.toFixed(2)})`,
                  }))}
                  helperText="Creates a linked double-entry transaction from this account"
                />
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {assetToEdit ? 'Update Asset' : 'Save Asset'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
