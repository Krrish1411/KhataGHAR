import React, { useState } from 'react';
import { useVault } from '../../context/VaultContext';
import { usePrivacy } from '../../context/PrivacyContext';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { AnimatedNumber } from '../common/AnimatedNumber';
import type { Asset, AssetTranche } from '../../types';
import {
  TrendingUp,
  TrendingDown,
  Layers,
  Calendar,
  Trash2,
  Plus,
  RefreshCw,
  Coins,
  ShieldCheck,
  Check,
  Wallet,
} from 'lucide-react';
import { formatPercent, formatCompactCurrency, formatCurrency } from '../../utils/formatters';

interface AssetDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset;
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({
  isOpen,
  onClose,
  asset,
}) => {
  const { assets, addAssetTranche, deleteAssetTranche, updateAssetUnitPrice, activeVault } = useVault();
  const { isPrivacyMode } = usePrivacy();

  // Always use the live asset from context to ensure instant dynamic updates on save/delete
  const liveAsset = assets.find((a) => a.id === asset.id) || asset;

  const [isAddingTranche, setIsAddingTranche] = useState(false);
  const [trancheDate, setTrancheDate] = useState(new Date().toISOString().split('T')[0]);
  const [trancheAmount, setTrancheAmount] = useState('');
  const [trancheUnits, setTrancheUnits] = useState('');
  const [trancheUnitPrice, setTrancheUnitPrice] = useState('');
  const [trancheNote, setTrancheNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick NAV update
  const [isEditingNav, setIsEditingNav] = useState(false);
  const [newNav, setNewNav] = useState(liveAsset.currentUnitPrice ? String(liveAsset.currentUnitPrice) : '');

  const baseCurrency = liveAsset.currency || activeVault?.currency || 'INR';
  const numberFormat = activeVault?.numberFormat || 'indian';

  // Derived calculations with strict mathematical accuracy
  const tranches: AssetTranche[] = liveAsset.tranches || [];
  const tranchesSum = tranches.reduce((sum, t) => sum + (t.amount || 0), 0);

  // Initial cost entered when creating the asset
  const initialCost = liveAsset.purchasePrice || 0;
  // If purchasePrice was tracked, it holds initial cost + tranches
  let totalInvested = initialCost > 0 ? initialCost : (tranchesSum > 0 ? tranchesSum : liveAsset.currentValue);
  if (initialCost > 0 && tranchesSum > 0 && initialCost < tranchesSum) {
    totalInvested = tranchesSum;
  }

  // Pre-existing initial holding before individual SIP lots were recorded
  const initialHoldingCost = Math.max(0, totalInvested - tranchesSum);

  const totalUnits = tranches.length > 0
    ? tranches.reduce((sum, t) => sum + (t.units || 0), 0) + (liveAsset.totalUnits && tranches.every(t => !t.units) ? liveAsset.totalUnits : 0)
    : (liveAsset.totalUnits || 0);

  const avgCostPerUnit = totalUnits > 0 ? totalInvested / totalUnits : undefined;
  const currentVal = liveAsset.currentValue;
  const overallGain = currentVal - totalInvested;
  const overallGainPct = totalInvested > 0 ? (overallGain / totalInvested) * 100 : 0;

  const handleAddTranche = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(trancheAmount);
    if (isNaN(amt) || amt <= 0) return;

    setIsSubmitting(true);
    try {
      const units = trancheUnits ? parseFloat(trancheUnits) : undefined;
      const unitPrice = trancheUnitPrice ? parseFloat(trancheUnitPrice) : undefined;

      await addAssetTranche(liveAsset.id, {
        date: trancheDate,
        amount: amt,
        units,
        unitPrice,
        note: trancheNote.trim() || undefined,
      });

      setTrancheAmount('');
      setTrancheUnits('');
      setTrancheUnitPrice('');
      setTrancheNote('');
      setIsAddingTranche(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateNav = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(newNav);
    if (isNaN(price) || price <= 0) return;

    await updateAssetUnitPrice(liveAsset.id, price);
    setIsEditingNav(false);
  };

  const handleDeleteTranche = async (trancheId: string, amt: number) => {
    if (window.confirm(`Delete this SIP installment of ${baseCurrency} ${amt}?`)) {
      await deleteAssetTranche(liveAsset.id, trancheId);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-pine-50 dark:bg-pine-950/60 border border-pine-200/60 dark:border-pine-800/60 grid place-items-center text-pine-600 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display font-bold text-base text-ink truncate">
                {liveAsset.name}
              </span>
              <Badge tone="pine" size="xs" className="capitalize shrink-0">
                {liveAsset.type.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-[11.5px] text-ink/50 font-normal truncate mt-0.5">
              Consolidated holding, unit economics & SIP lots
            </p>
          </div>
        </div>
      }
      maxWidth="3xl"
    >
      <div className="space-y-5">
        {/* Performance Header Banner — 4 Separate Responsive Cards with Zero Text Overlap */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Current Valuation Card */}
          <div className="p-4 rounded-2xl bg-moss border border-line shadow-xs min-w-0">
            <span className="text-[10.5px] text-ink/50 font-bold uppercase tracking-wider block truncate">
              Current Valuation
            </span>
            <div className="font-display font-extrabold text-lg sm:text-xl text-ink mt-1 truncate">
              <AnimatedNumber
                value={currentVal}
                currency={baseCurrency}
                numberFormat={numberFormat}
                isPrivacyMode={isPrivacyMode}
              />
            </div>
          </div>

          {/* Total Invested Card */}
          <div className="p-4 rounded-2xl bg-moss border border-line shadow-xs min-w-0">
            <span className="text-[10.5px] text-ink/50 font-bold uppercase tracking-wider block truncate">
              Total Invested
            </span>
            <div className="font-display font-extrabold text-lg sm:text-xl text-ink/80 mt-1 truncate">
              <AnimatedNumber
                value={totalInvested}
                currency={baseCurrency}
                numberFormat={numberFormat}
                isPrivacyMode={isPrivacyMode}
              />
            </div>
          </div>

          {/* Total Gain / Loss Card */}
          <div className="p-4 rounded-2xl bg-moss border border-line shadow-xs min-w-0">
            <span className="text-[10.5px] text-ink/50 font-bold uppercase tracking-wider block truncate">
              Total Gain / Loss
            </span>
            <div
              className={`font-display font-extrabold text-lg sm:text-xl mt-1 flex items-center gap-1 truncate ${
                overallGain >= 0 ? 'text-pine-600' : 'text-flare-600'
              }`}
            >
              {overallGain >= 0 ? (
                <TrendingUp className="w-4 h-4 shrink-0" />
              ) : (
                <TrendingDown className="w-4 h-4 shrink-0" />
              )}
              <span className="truncate">
                {overallGain >= 0 ? '+' : ''}{formatPercent(overallGainPct)}
              </span>
            </div>
            <div className="text-[11px] text-ink/45 font-mono mt-0.5 truncate">
              ({overallGain >= 0 ? '+' : ''}{formatCompactCurrency(overallGain, baseCurrency, numberFormat, isPrivacyMode)})
            </div>
          </div>

          {/* Lots & Holdings Card */}
          <div className="p-4 rounded-2xl bg-moss border border-line shadow-xs min-w-0">
            <span className="text-[10.5px] text-ink/50 font-bold uppercase tracking-wider block truncate">
              Lots & Holdings
            </span>
            <div className="font-display font-extrabold text-lg sm:text-xl text-ink mt-1 truncate">
              {tranches.length > 0
                ? `${tranches.length + (initialHoldingCost > 0 ? 1 : 0)} Lots`
                : '1 Initial Lot'}
            </div>
          </div>
        </div>

        {/* Units & NAV Ribbon (For Mutual Funds / Stocks / Gold) */}
        {(totalUnits > 0 || liveAsset.currentUnitPrice || isEditingNav) && (
          <div className="p-3.5 rounded-2xl border border-line bg-card flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
            <div className="flex items-center gap-4 flex-wrap">
              {totalUnits > 0 && (
                <div>
                  <span className="text-ink/45 block text-[10px] font-bold uppercase">Total Units</span>
                  <span className="font-mono font-bold text-ink">{totalUnits.toFixed(3)}</span>
                </div>
              )}
              {avgCostPerUnit && (
                <div>
                  <span className="text-ink/45 block text-[10px] font-bold uppercase">Avg Cost / NAV</span>
                  <span className="font-mono font-bold text-ink">₹{avgCostPerUnit.toFixed(2)}</span>
                </div>
              )}
              {liveAsset.currentUnitPrice && (
                <div>
                  <span className="text-ink/45 block text-[10px] font-bold uppercase">Latest Market NAV</span>
                  <span className="font-mono font-bold text-pine-600">₹{liveAsset.currentUnitPrice.toFixed(2)}</span>
                </div>
              )}
            </div>

            {isEditingNav ? (
              <form onSubmit={handleUpdateNav} className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="any"
                  placeholder="New NAV"
                  value={newNav}
                  onChange={(e) => setNewNav(e.target.value)}
                  className="w-24 px-2.5 py-1 text-xs border border-line rounded-xl bg-card text-ink focus:outline-none focus:border-pine-600"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-3 py-1 rounded-xl bg-pine-700 hover:bg-pine-600 text-white font-bold text-xs cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingNav(false)}
                  className="px-2.5 py-1 rounded-xl border border-line bg-card hover:bg-moss text-ink text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button
                onClick={() => {
                  setNewNav(liveAsset.currentUnitPrice ? String(liveAsset.currentUnitPrice) : '');
                  setIsEditingNav(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-moss hover:bg-pine-50 dark:hover:bg-pine-950/50 text-pine-700 dark:text-pine-300 border border-line font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-pine-600" />
                <span>Update NAV</span>
              </button>
            )}
          </div>
        )}

        {/* Tranche / SIP Lots Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-display font-bold text-sm text-ink flex items-center gap-2">
              <span>Periodic SIP Installments & Purchase Lots</span>
              <Badge tone="gray" size="sm">
                {tranches.length + (initialHoldingCost > 0 ? 1 : 0)}
              </Badge>
            </h4>

            {!isAddingTranche && (
              <button
                onClick={() => setIsAddingTranche(true)}
                className="px-3.5 py-1.5 rounded-xl bg-pine-700 hover:bg-pine-600 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Lot</span>
              </button>
            )}
          </div>

          {/* Add Tranche Form */}
          {isAddingTranche && (
            <form
              onSubmit={handleAddTranche}
              className="p-4 sm:p-5 rounded-2xl border border-pine-200 dark:border-pine-800 bg-pine-50/40 dark:bg-pine-950/20 space-y-3.5 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-pine-800 dark:text-pine-200 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-pine-600" />
                  <span>Record New SIP Installment or Purchase Tranche</span>
                </span>
                <span className="text-[11px] text-ink/45">
                  Updates total holding value & recalculates returns automatically
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={trancheDate}
                    onChange={(e) => setTrancheDate(e.target.value)}
                    className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs font-mono font-semibold text-ink outline-none focus:border-pine-500 cursor-pointer"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="5000"
                    value={trancheAmount}
                    onChange={(e) => setTrancheAmount(e.target.value)}
                    className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs font-mono font-bold text-ink outline-none focus:border-pine-500"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-1">
                    Units (Optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 35.2"
                    value={trancheUnits}
                    onChange={(e) => setTrancheUnits(e.target.value)}
                    className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs font-mono text-ink outline-none focus:border-pine-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-1">
                    NAV / Price (Optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 142.04"
                    value={trancheUnitPrice}
                    onChange={(e) => setTrancheUnitPrice(e.target.value)}
                    className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs font-mono text-ink outline-none focus:border-pine-500"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                <input
                  type="text"
                  placeholder="Note (e.g. Monthly SIP Nippon Small Cap, Bonus lot…)"
                  value={trancheNote}
                  onChange={(e) => setTrancheNote(e.target.value)}
                  className="w-full sm:flex-1 px-3.5 py-2 text-xs rounded-xl border border-line bg-card text-ink placeholder:text-ink/35 focus:outline-none focus:border-pine-600"
                />
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setIsAddingTranche(false)}
                    className="px-3.5 py-2 rounded-xl border border-line bg-card hover:bg-moss text-xs font-semibold text-ink cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !trancheAmount}
                    className="px-4 py-2 rounded-xl bg-pine-700 hover:bg-pine-600 active:scale-95 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-40 transition-all flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Saving…' : 'Save Lot'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Tranches Table / Holdings List */}
          <div className="rounded-2xl border border-line overflow-hidden shadow-xs bg-card">
            <div className="max-h-72 overflow-y-auto no-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-moss/90 border-b border-line text-[10.5px] font-bold text-ink/50 uppercase tracking-wider sticky top-0 backdrop-blur-xs">
                    <th className="py-2.5 px-3.5">Lot / Date</th>
                    <th className="py-2.5 px-3.5">Invested Amount</th>
                    <th className="py-2.5 px-3.5">Units & NAV</th>
                    <th className="py-2.5 px-3.5">Note</th>
                    <th className="py-2.5 px-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line font-medium text-ink">
                  {/* If there was an initial acquisition holding before subsequent SIP lots, display it prominently as Lot #1 */}
                  {initialHoldingCost > 0 && (
                    <tr className="hover:bg-moss/40 transition-colors bg-pine-50/20 dark:bg-pine-950/10">
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-1.5">
                          <Badge tone="pine" size="xs">
                            Lot #1
                          </Badge>
                          <span className="font-mono text-xs text-ink/70">
                            {liveAsset.purchaseDate || 'Initial'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3.5 font-mono font-bold text-ink">
                        {formatCurrency(initialHoldingCost, baseCurrency, numberFormat, isPrivacyMode)}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-xs text-ink/70">
                        {liveAsset.totalUnits && tranches.length === 0 ? (
                          <span>{liveAsset.totalUnits.toFixed(3)} units</span>
                        ) : (
                          <span className="text-ink/40">Initial Block</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-xs text-ink/65 italic">
                        Initial Portfolio Acquisition Holding
                      </td>
                      <td className="py-3 px-3.5 text-right text-[11px] text-ink/40">
                        Foundation Lot
                      </td>
                    </tr>
                  )}

                  {/* Individual SIP Lots / Purchase Tranches */}
                  {tranches.map((t, index) => {
                    const lotIndex = (initialHoldingCost > 0 ? 2 : 1) + index;
                    return (
                      <tr key={t.id} className="hover:bg-moss/50 transition-colors">
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-1.5">
                            <Badge tone="sky" size="xs">
                              Lot #{lotIndex}
                            </Badge>
                            <span className="font-mono text-xs text-ink/80">{t.date}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3.5 font-mono font-bold text-ink">
                          {formatCurrency(t.amount, baseCurrency, numberFormat, isPrivacyMode)}
                        </td>
                        <td className="py-3 px-3.5 font-mono text-xs">
                          {t.units ? (
                            <span>
                              <b>{t.units.toFixed(3)}</b> units
                              {t.unitPrice && <span className="text-ink/45"> @ ₹{t.unitPrice.toFixed(2)}</span>}
                            </span>
                          ) : (
                            <span className="text-ink/40">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-xs text-ink/70">
                          {t.note || <span className="text-ink/30 italic">SIP Installment</span>}
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          <button
                            onClick={() => handleDeleteTranche(t.id, t.amount)}
                            className="p-1.5 rounded-lg text-ink/40 hover:text-flare-600 hover:bg-flare-100/50 transition-colors cursor-pointer"
                            title="Delete this lot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Empty state only if zero initial cost and zero tranches */}
                  {initialHoldingCost <= 0 && tranches.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-ink/40">
                        <Coins className="w-8 h-8 mx-auto mb-2 text-ink/20" />
                        <p className="font-semibold text-xs text-ink/60">No purchase lots recorded yet</p>
                        <p className="text-[11px] text-ink/40 mt-0.5">
                          Click "Add Lot" above to record your first SIP installment or purchase tranche.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-line">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-line bg-card hover:bg-moss text-xs font-semibold text-ink transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
