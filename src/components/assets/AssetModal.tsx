import React, { useState, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { useVault } from '../../context/VaultContext';
import { formatDateISO } from '../../utils/dates';
import type { Asset, AssetType, CurrencyCode } from '../../types';
import { Landmark, Coins, RefreshCw } from 'lucide-react';

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

  // Unit Economics & NAV
  const [totalUnits, setTotalUnits] = useState(assetToEdit?.totalUnits ? String(assetToEdit.totalUnits) : '');
  const [currentUnitPrice, setCurrentUnitPrice] = useState(
    assetToEdit?.currentUnitPrice ? String(assetToEdit.currentUnitPrice) : ''
  );
  const [purchaseUnitPrice, setPurchaseUnitPrice] = useState(() => {
    if (assetToEdit?.purchasePrice && assetToEdit?.totalUnits && assetToEdit.totalUnits > 0) {
      return (assetToEdit.purchasePrice / assetToEdit.totalUnits).toFixed(2);
    }
    return assetToEdit?.currentUnitPrice ? String(assetToEdit.currentUnitPrice) : '';
  });

  // SIP Mandate
  const [isSip, setIsSip] = useState(assetToEdit?.isSip || false);
  const [sipMonthlyAmount, setSipMonthlyAmount] = useState(
    assetToEdit?.sipMonthlyAmount ? String(assetToEdit.sipMonthlyAmount) : ''
  );
  const [sipDayOfMonth, setSipDayOfMonth] = useState(
    assetToEdit?.sipDayOfMonth ? String(assetToEdit.sipDayOfMonth) : '5'
  );

  // Insurance & policy fields
  const [premiumDueDate, setPremiumDueDate] = useState(assetToEdit?.premiumDueDate || '');
  const [premiumAmount, setPremiumAmount] = useState(assetToEdit?.premiumAmount ? String(assetToEdit.premiumAmount) : '');
  const [maturityDate, setMaturityDate] = useState(assetToEdit?.maturityDate || '');
  const [notes, setNotes] = useState(assetToEdit?.notes || '');
  const [linkToBank, setLinkToBank] = useState(false);
  const [bankAccountId, setBankAccountId] = useState(accounts[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isUnitBasedAsset = type === 'stock' || type === 'mutual_fund' || type === 'gold';
  const isSipAsset = type === 'mutual_fund' || type === 'stock';

  const unitLabel =
    type === 'stock'
      ? 'Number of Shares / Quantity'
      : type === 'mutual_fund'
      ? 'Allocated Units'
      : type === 'gold'
      ? 'Weight (Grams)'
      : 'Quantity / Units';

  const unitPlaceholder =
    type === 'stock'
      ? 'e.g. 100'
      : type === 'mutual_fund'
      ? 'e.g. 125.432'
      : type === 'gold'
      ? 'e.g. 10'
      : 'e.g. 100';

  const navLabel =
    type === 'stock'
      ? 'Buy Price per Share'
      : type === 'mutual_fund'
      ? 'Purchase NAV'
      : type === 'gold'
      ? 'Purchase Rate / Gram'
      : 'Cost per Unit';

  const currentNavLabel =
    type === 'stock'
      ? 'Current Share Price'
      : type === 'mutual_fund'
      ? 'Current NAV'
      : type === 'gold'
      ? 'Current Rate / Gram'
      : 'Current Price / Unit';

  // Real-time gain/loss preview
  const gainLossPreview = useMemo(() => {
    const cost = parseFloat(purchasePrice);
    const curr = parseFloat(currentValue);
    if (!isNaN(cost) && !isNaN(curr) && cost > 0) {
      const gain = curr - cost;
      const gainPct = (gain / cost) * 100;
      return { gain, gainPct };
    }
    return null;
  }, [purchasePrice, currentValue]);

  // Synchronize unit economics calculations
  const handleUnitsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTotalUnits(val);
    const u = parseFloat(val);
    const p = parseFloat(purchaseUnitPrice);
    const curP = parseFloat(currentUnitPrice);
    if (!isNaN(u) && u > 0) {
      if (!isNaN(p) && p > 0) {
        setPurchasePrice((u * p).toFixed(2));
      }
      if (!isNaN(curP) && curP > 0) {
        setCurrentValue((u * curP).toFixed(2));
      } else if (!isNaN(p) && p > 0 && (!currentValue || parseFloat(currentValue) === 0)) {
        setCurrentValue((u * p).toFixed(2));
      }
    }
  };

  const handleBuyPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPurchaseUnitPrice(val);
    const p = parseFloat(val);
    const u = parseFloat(totalUnits);
    if (!isNaN(p) && p > 0 && !isNaN(u) && u > 0) {
      setPurchasePrice((u * p).toFixed(2));
      if (!currentUnitPrice || parseFloat(currentUnitPrice) === 0) {
        setCurrentUnitPrice(val);
        setCurrentValue((u * p).toFixed(2));
      }
    }
  };

  const handleCurrentPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCurrentUnitPrice(val);
    const curP = parseFloat(val);
    const u = parseFloat(totalUnits);
    if (!isNaN(curP) && curP > 0 && !isNaN(u) && u > 0) {
      setCurrentValue((u * curP).toFixed(2));
    }
  };

  const handlePurchasePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPurchasePrice(val);
    const cost = parseFloat(val);
    const u = parseFloat(totalUnits);
    if (!isNaN(cost) && cost > 0 && !isNaN(u) && u > 0) {
      setPurchaseUnitPrice((cost / u).toFixed(2));
    }
  };

  const handleCurrentValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCurrentValue(val);
    const cur = parseFloat(val);
    const u = parseFloat(totalUnits);
    if (!isNaN(cur) && cur > 0 && !isNaN(u) && u > 0) {
      setCurrentUnitPrice((cur / u).toFixed(2));
    }
  };

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
      const numUnits = totalUnits ? parseFloat(totalUnits) : undefined;
      const numUnitPrice = currentUnitPrice
        ? parseFloat(currentUnitPrice)
        : purchaseUnitPrice
        ? parseFloat(purchaseUnitPrice)
        : undefined;

      if (assetToEdit) {
        await updateAsset({
          ...assetToEdit,
          name: name.trim(),
          type,
          currentValue: numVal,
          currency,
          purchaseDate: purchaseDate || undefined,
          purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
          totalUnits: numUnits,
          currentUnitPrice: numUnitPrice,
          isSip: isSip || undefined,
          sipMonthlyAmount: isSip && sipMonthlyAmount ? parseFloat(sipMonthlyAmount) : undefined,
          sipDayOfMonth: isSip && sipDayOfMonth ? parseInt(sipDayOfMonth) : undefined,
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
          totalUnits: numUnits,
          currentUnitPrice: numUnitPrice,
          isSip: isSip || undefined,
          sipMonthlyAmount: isSip && sipMonthlyAmount ? parseFloat(sipMonthlyAmount) : undefined,
          sipDayOfMonth: isSip && sipDayOfMonth ? parseInt(sipDayOfMonth) : undefined,
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
              isInitialPurchase: true, // Crucial flag preventing doubled lot and inflated valuation
              units: numUnits,
              unitPrice: purchaseUnitPrice ? parseFloat(purchaseUnitPrice) : numUnitPrice,
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
      description="Track stocks, mutual funds, gold, SIPs, properties, EPF/PPF, and insurance with unit economics"
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
          placeholder="e.g. Dhoot Trans Share Listed, Parag Parikh Flexi Cap, Sovereign Gold Bond"
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
              { value: 'stock', label: 'Stocks & Equities' },
              { value: 'mutual_fund', label: 'Mutual Funds / SIP' },
              { value: 'gold', label: 'Gold & Jewelry (Physical/SGB)' },
              { value: 'property', label: 'Property / Real Estate' },
              { value: 'vehicle', label: 'Vehicle / Automobile' },
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

        {/* Unit Economics & NAV Section (For Stocks, Mutual Funds, Gold) */}
        {isUnitBasedAsset && (
          <div className="p-3.5 rounded-2xl border border-pine-200 dark:border-pine-800/60 bg-pine-50/40 dark:bg-pine-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-pine-800 dark:text-pine-200 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-pine-600" />
                <span>Unit Economics & NAV</span>
              </span>
              {gainLossPreview && (
                <span
                  className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${
                    gainLossPreview.gain >= 0
                      ? 'text-pine-700 dark:text-pine-300 bg-pine-500/10 border border-pine-500/20'
                      : 'text-flare-600 dark:text-flare-400 bg-flare-500/10 border border-flare-500/20'
                  }`}
                >
                  {gainLossPreview.gain >= 0 ? '▲ +' : '▼ '}
                  {gainLossPreview.gain.toFixed(2)} ({gainLossPreview.gainPct >= 0 ? '+' : ''}
                  {gainLossPreview.gainPct.toFixed(1)}%)
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                type="number"
                step="any"
                label={unitLabel}
                placeholder={unitPlaceholder}
                value={totalUnits}
                onChange={handleUnitsChange}
                tabularNums
              />
              <Input
                type="number"
                step="any"
                label={navLabel}
                placeholder="0.00"
                value={purchaseUnitPrice}
                onChange={handleBuyPriceChange}
                tabularNums
              />
              <Input
                type="number"
                step="any"
                label={currentNavLabel}
                placeholder="0.00"
                value={currentUnitPrice}
                onChange={handleCurrentPriceChange}
                tabularNums
              />
            </div>
          </div>
        )}

        {/* Valuation & Cost Price */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            step="any"
            label="Current Market Value"
            placeholder="0.00"
            value={currentValue}
            onChange={handleCurrentValueChange}
            tabularNums
            required
            helperText={totalUnits && currentUnitPrice ? 'Auto-synced: Units × Current Price' : undefined}
          />

          <Input
            type="number"
            step="any"
            label="Purchase / Cost Price"
            placeholder="0.00"
            value={purchasePrice}
            onChange={handlePurchasePriceChange}
            tabularNums
            helperText={totalUnits && purchaseUnitPrice ? 'Auto-synced: Units × Buy Price' : undefined}
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

        {/* SIP & Recurring Mandate Section */}
        {isSipAsset && (
          <div className="p-3.5 rounded-2xl border border-line bg-card space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="block text-xs font-bold text-ink flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-pine-600" />
                  <span>Recurring SIP Mandate</span>
                </span>
                <span className="block text-[11px] text-ink/50 mt-0.5">
                  Track recurring monthly SIP deductions for mutual funds or stocks
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsSip(!isSip)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isSip ? 'bg-pine-600' : 'bg-ink/20'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isSip ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {isSip && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-line/60">
                <Input
                  type="number"
                  step="any"
                  label="Monthly SIP Amount (₹)"
                  placeholder="e.g. 5000"
                  value={sipMonthlyAmount}
                  onChange={(e) => setSipMonthlyAmount(e.target.value)}
                  tabularNums
                  required={isSip}
                />
                <Input
                  type="number"
                  min={1}
                  max={31}
                  label="SIP Execution Day (1 - 31)"
                  placeholder="e.g. 5"
                  value={sipDayOfMonth}
                  onChange={(e) => setSipDayOfMonth(e.target.value)}
                  tabularNums
                  required={isSip}
                />
              </div>
            )}
          </div>
        )}

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
          label="Notes / Folio / Demat / Details"
          placeholder="e.g. Folio 12345678, Zerodha Demat, Plot 42"
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
                    : 'Pre-existing holding — does not affect bank balance (Recommended for past assets)'}
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
                  helperText="Creates a linked double-entry investment transaction from this account"
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
            {assetToEdit ? 'Update Asset' : 'Save Asset / Investment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
