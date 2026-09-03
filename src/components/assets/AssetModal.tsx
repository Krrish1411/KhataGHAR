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
  const { addAsset, updateAsset, activeVault } = useVault();

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
        await addAsset({
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
