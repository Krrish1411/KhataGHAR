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
  CheckCircle2,
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
  const { assets, accounts, addAssetTranche, deleteAssetTranche, updateAssetUnitPrice, sellAsset, recordDividend, activeVault } = useVault();
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

  // Selling / Redemption State
  const [isSelling, setIsSelling] = useState(false);
  const [sellUnits, setSellUnits] = useState('');
  const [sellUnitPrice, setSellUnitPrice] = useState(liveAsset.currentUnitPrice ? String(liveAsset.currentUnitPrice) : '');
  const [sellTotalProceeds, setSellTotalProceeds] = useState('');
  const [sellAccountId, setSellAccountId] = useState(accounts[0]?.id || '');
  const [sellDate, setSellDate] = useState(new Date().toISOString().split('T')[0]);
  const [sellNote, setSellNote] = useState('');

  // Dividend Inflow State
  const [isDividending, setIsDividending] = useState(false);
  const [divAmount, setDivAmount] = useState('');
  const [divAccountId, setDivAccountId] = useState(accounts[0]?.id || '');
  const [divDate, setDivDate] = useState(new Date().toISOString().split('T')[0]);
  const [divNote, setDivNote] = useState('');

  // Quick NAV update
  const [isEditingNav, setIsEditingNav] = useState(false);
  const [newNav, setNewNav] = useState(liveAsset.currentUnitPrice ? String(liveAsset.currentUnitPrice) : '');

  const baseCurrency = liveAsset.currency || activeVault?.currency || 'INR';
  const numberFormat = activeVault?.numberFormat || 'indian';

  // Derived calculations with strict mathematical accuracy (Separating Buy Lots vs Sell Redemptions)
  const tranches: AssetTranche[] = liveAsset.tranches || [];
  const buyTranches = tranches.filter((t) => t.type !== 'sell');
  const sellTranches = tranches.filter((t) => t.type === 'sell');

  const buyTranchesSum = buyTranches.reduce((sum, t) => sum + (t.amount || 0), 0);
  const buyTranchesUnits = buyTranches.reduce((sum, t) => sum + (t.units || 0), 0);
  const soldUnitsSum = sellTranches.reduce((sum, t) => sum + (t.units || 0), 0);
  const soldProceedsSum = sellTranches.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalRealizedGains = sellTranches.reduce((sum, t) => sum + (t.realizedGain || 0), 0);

  // Remaining active units
  const totalUnits = liveAsset.totalUnits !== undefined
    ? liveAsset.totalUnits
    : (buyTranchesUnits > 0 ? Math.max(0, buyTranchesUnits - soldUnitsSum) : 0);

  // Position is fully liquidated if current value is 0 or units is 0, AND at least one sell occurred
  const isFullyLiquidated =
    (liveAsset.currentValue <= 0 || (totalUnits === 0 && (buyTranches.length > 0 || liveAsset.purchasePrice === 0))) &&
    sellTranches.length > 0;

  // Active invested capital (cost basis of current active holding)
  let totalInvested = 0;
  if (!isFullyLiquidated) {
    if (liveAsset.purchasePrice !== undefined && liveAsset.purchasePrice > 0) {
      totalInvested = liveAsset.purchasePrice;
    } else if (buyTranchesSum > 0) {
      const costBasisOfSells = Math.max(0, soldProceedsSum - totalRealizedGains);
      totalInvested = Math.max(0, buyTranchesSum - costBasisOfSells);
    } else {
      totalInvested = liveAsset.currentValue;
    }
  }

  // Pre-existing initial holding before individual SIP lots were recorded
  const initialHoldingCost = Math.max(0, totalInvested - buyTranchesSum);

  const avgCostPerUnit = totalUnits > 0 && totalInvested > 0 ? totalInvested / totalUnits : undefined;
  const currentVal = isFullyLiquidated ? 0 : liveAsset.currentValue;
  const overallGain = isFullyLiquidated ? totalRealizedGains : (currentVal - totalInvested);
  const historicalCostBasisSold = Math.max(0, soldProceedsSum - totalRealizedGains);
  const overallGainPct = isFullyLiquidated
    ? (historicalCostBasisSold > 0 ? (totalRealizedGains / historicalCostBasisSold) * 100 : 0)
    : (totalInvested > 0 ? (overallGain / totalInvested) * 100 : 0);

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

  const handleSellUnits = async (e: React.FormEvent) => {
    e.preventDefault();
    const proceeds = parseFloat(sellTotalProceeds);
    if (isNaN(proceeds) || proceeds <= 0) {
      alert('Please enter a valid sale proceeds amount');
      return;
    }
    const unitsSold = parseFloat(sellUnits) || 0;
    const unitPrice = parseFloat(sellUnitPrice) || undefined;
    const destAccId = sellAccountId || (accounts.length > 0 ? accounts[0].id : '');
    if (!destAccId) {
      alert('Please select a bank account to receive proceeds');
      return;
    }

    setIsSubmitting(true);
    try {
      await sellAsset(liveAsset.id, {
        unitsSold,
        salePricePerUnit: unitPrice,
        totalProceeds: proceeds,
        accountId: destAccId,
        date: sellDate,
        note: sellNote.trim() || undefined,
      });

      setIsSelling(false);
      setSellUnits('');
      setSellTotalProceeds('');
      setSellNote('');
    } catch (err: any) {
      alert(err?.message || 'Failed to process sale');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordDividend = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(divAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid dividend amount');
      return;
    }
    const destAccId = divAccountId || (accounts.length > 0 ? accounts[0].id : '');
    if (!destAccId) {
      alert('Please select an account to receive dividend income');
      return;
    }

    setIsSubmitting(true);
    try {
      await recordDividend(liveAsset.id, {
        amount: amt,
        accountId: destAccId,
        date: divDate,
        note: divNote.trim() || undefined,
      });

      setIsDividending(false);
      setDivAmount('');
      setDivNote('');
    } catch (err: any) {
      alert(err?.message || 'Failed to record dividend');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTranche = async (trancheId: string, amt: number, isSell?: boolean) => {
    const confirmMsg = isSell
      ? `Undo this sale / redemption of ${baseCurrency} ${amt}? This will restore the sold units and cost basis back into your active portfolio.`
      : `Delete this SIP installment of ${baseCurrency} ${amt}?`;
    if (window.confirm(confirmMsg)) {
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
        {/* Liquidated Position Banner */}
        {isFullyLiquidated && (
          <div className="p-4 rounded-2xl border border-pine-400/40 bg-pine-50/80 dark:bg-pine-950/40 flex items-start gap-3 shadow-xs">
            <div className="w-8 h-8 rounded-xl bg-pine-600 text-white grid place-items-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display font-bold text-sm text-pine-900 dark:text-pine-200">
                  Position Fully Liquidated (100% Redeemed)
                </span>
                <Badge tone="pine" size="xs">
                  {overallGain >= 0 ? '+' : ''}{formatCurrency(overallGain, baseCurrency, numberFormat, isPrivacyMode)} Realized Gain
                </Badge>
              </div>
              <p className="text-xs text-pine-800/70 dark:text-pine-300/70 mt-0.5">
                All units of this asset have been redeemed and credited into your bank accounts. Historical purchase lots and realized divestment records are preserved below.
              </p>
            </div>
          </div>
        )}

        {/* Performance Header Banner — 4 Separate Responsive Cards with Zero Text Overlap */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
            {isFullyLiquidated && (
              <span className="text-[10.5px] text-ink/40 font-semibold block mt-0.5">Closed Position</span>
            )}
          </div>

          {/* Total Invested Card */}
          <div className="p-4 rounded-2xl bg-moss border border-line shadow-xs min-w-0">
            <span className="text-[10.5px] text-ink/50 font-bold uppercase tracking-wider block truncate">
              Active Capital Invested
            </span>
            <div className="font-display font-extrabold text-lg sm:text-xl text-ink/80 mt-1 truncate">
              <AnimatedNumber
                value={totalInvested}
                currency={baseCurrency}
                numberFormat={numberFormat}
                isPrivacyMode={isPrivacyMode}
              />
            </div>
            {isFullyLiquidated && (
              <span className="text-[10.5px] text-ink/40 font-mono block mt-0.5">
                ({formatCompactCurrency(buyTranchesSum, baseCurrency, numberFormat, isPrivacyMode)} historical)
              </span>
            )}
          </div>

          {/* Total Gain / Loss Card */}
          <div className="p-4 rounded-2xl bg-moss border border-line shadow-xs min-w-0">
            <span className="text-[10.5px] text-ink/50 font-bold uppercase tracking-wider block truncate">
              {isFullyLiquidated ? 'Total Realized Profit' : 'Total Gain / Loss'}
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
              {isFullyLiquidated
                ? 'Fully Liquidated'
                : buyTranches.length > 0
                ? `${buyTranches.length + (initialHoldingCost > 0 ? 1 : 0)} Lots`
                : '1 Initial Lot'}
            </div>
            {isFullyLiquidated ? (
              <span className="text-[10.5px] text-ink/45 block mt-0.5">
                {buyTranches.length} bought • {sellTranches.length} sold
              </span>
            ) : null}
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
                {buyTranches.length + (initialHoldingCost > 0 ? 1 : 0)}
              </Badge>
            </h4>

            <div className="flex items-center gap-2 flex-wrap">
              {!isAddingTranche && !isSelling && !isDividending && (
                <>
                  <button
                    onClick={() => {
                      setIsDividending(true);
                      setIsAddingTranche(false);
                      setIsSelling(false);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-line bg-card hover:bg-moss text-xs font-semibold text-ink flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Coins className="w-3.5 h-3.5 text-pine-600" />
                    <span>Record Dividend</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsSelling(true);
                      setIsAddingTranche(false);
                      setIsDividending(false);
                      if (liveAsset.currentUnitPrice) {
                        setSellUnitPrice(String(liveAsset.currentUnitPrice));
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl border border-line bg-card hover:bg-moss text-xs font-semibold text-ink flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <TrendingDown className="w-3.5 h-3.5 text-flare-600" />
                    <span>Sell / Redeem</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsAddingTranche(true);
                      setIsSelling(false);
                      setIsDividending(false);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-pine-700 hover:bg-pine-600 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Lot</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Record Dividend Form */}
          {isDividending && (
            <form
              onSubmit={handleRecordDividend}
              className="p-4 sm:p-5 rounded-2xl border border-pine-200 dark:border-pine-800 bg-pine-50/40 dark:bg-pine-950/20 space-y-3.5 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-pine-800 dark:text-pine-200 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-pine-600" />
                  <span>Record Dividend / Payout Inflow (Income Only)</span>
                </span>
                <span className="text-[11px] text-ink/45">
                  Credits your chosen bank account without changing asset units
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-1">
                    Dividend Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 1250"
                    value={divAmount}
                    onChange={(e) => setDivAmount(e.target.value)}
                    className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs font-mono font-bold text-ink outline-none focus:border-pine-500"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-1">
                    Destination Bank / Account
                  </label>
                  <select
                    value={divAccountId}
                    onChange={(e) => setDivAccountId(e.target.value)}
                    className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs font-semibold text-ink outline-none focus:border-pine-500 cursor-pointer"
                    required
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.currency} {acc.balance.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-1">
                    Date Received
                  </label>
                  <input
                    type="date"
                    value={divDate}
                    onChange={(e) => setDivDate(e.target.value)}
                    className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs font-mono text-ink outline-none focus:border-pine-500 cursor-pointer"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                <input
                  type="text"
                  placeholder="Note (e.g. Q3 Interim Dividend, Annual Cash Yield...)"
                  value={divNote}
                  onChange={(e) => setDivNote(e.target.value)}
                  className="w-full sm:flex-1 px-3.5 py-2 text-xs rounded-xl border border-line bg-card text-ink placeholder:text-ink/35 focus:outline-none focus:border-pine-600"
                />
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setIsDividending(false)}
                    className="px-3.5 py-2 rounded-xl border border-line bg-card hover:bg-moss text-xs font-semibold text-ink cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !divAmount}
                    className="px-4 py-2 rounded-xl bg-pine-700 hover:bg-pine-600 active:scale-95 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-40 transition-all flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Recording…' : 'Save Dividend Inflow'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Sell / Redeem Units Form */}
          {isSelling && (
            <form
              onSubmit={handleSellUnits}
              className="p-4 sm:p-5 rounded-2xl border border-flare-200 dark:border-flare-800 bg-flare-50/40 dark:bg-flare-950/20 space-y-3.5 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-flare-800 dark:text-flare-200 flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5 text-flare-600" />
                  <span>Sell Asset / Redeem Holdings</span>
                </span>
                <span className="text-[11px] text-ink/45">
                  Reduces units & cost basis, credits bank account, and books realized capital gain
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-1">
                    Units to Sell
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder={`Max: ${totalUnits > 0 ? totalUnits.toFixed(3) : 'Any'}`}
                    value={sellUnits}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSellUnits(val);
                      const u = parseFloat(val);
                      const p = parseFloat(sellUnitPrice);
                      if (!isNaN(u) && !isNaN(p) && u > 0 && p > 0) {
                        setSellTotalProceeds((u * p).toFixed(2));
                      }
                    }}
                    className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs font-mono font-bold text-ink outline-none focus:border-flare-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-1">
                    Sale Price / NAV (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 155.20"
                    value={sellUnitPrice}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSellUnitPrice(val);
                      const p = parseFloat(val);
                      const u = parseFloat(sellUnits);
                      if (!isNaN(u) && !isNaN(p) && u > 0 && p > 0) {
                        setSellTotalProceeds((u * p).toFixed(2));
                      }
                    }}
                    className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs font-mono text-ink outline-none focus:border-flare-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-1">
                    Total Proceeds (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 25000"
                    value={sellTotalProceeds}
                    onChange={(e) => setSellTotalProceeds(e.target.value)}
                    className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs font-mono font-bold text-ink outline-none focus:border-flare-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-1">
                    Credit to Account
                  </label>
                  <select
                    value={sellAccountId}
                    onChange={(e) => setSellAccountId(e.target.value)}
                    className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs font-semibold text-ink outline-none focus:border-flare-500 cursor-pointer"
                    required
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.currency} {acc.balance.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Real-time Profit / Loss calculation banner */}
              {(() => {
                const proceeds = parseFloat(sellTotalProceeds) || 0;
                const soldU = parseFloat(sellUnits) || 0;
                if (proceeds > 0) {
                  const costBasis = totalUnits > 0 ? (soldU / totalUnits) * totalInvested : proceeds;
                  const gain = proceeds - costBasis;
                  return (
                    <div className="p-2.5 rounded-xl bg-card border border-line flex items-center justify-between text-xs">
                      <span className="text-ink/60">Estimated Cost Basis: <b>₹{costBasis.toFixed(2)}</b></span>
                      <span className={`font-mono font-bold ${gain >= 0 ? 'text-pine-600' : 'text-flare-600'}`}>
                        {gain >= 0 ? 'Realized Profit: +' : 'Realized Loss: '}₹{Math.abs(gain).toFixed(2)}
                      </span>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                <input
                  type="text"
                  placeholder="Note (e.g. Booking profits, emergency redemption...)"
                  value={sellNote}
                  onChange={(e) => setSellNote(e.target.value)}
                  className="w-full sm:flex-1 px-3.5 py-2 text-xs rounded-xl border border-line bg-card text-ink placeholder:text-ink/35 focus:outline-none focus:border-flare-600"
                />
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setIsSelling(false)}
                    className="px-3.5 py-2 rounded-xl border border-line bg-card hover:bg-moss text-xs font-semibold text-ink cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !sellTotalProceeds}
                    className="px-4 py-2 rounded-xl bg-flare-700 hover:bg-flare-600 active:scale-95 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-40 transition-all flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Processing…' : 'Confirm Sale'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

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
                  {buyTranches.map((t, index) => {
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
                            onClick={() => handleDeleteTranche(t.id, t.amount, false)}
                            className="p-1.5 rounded-lg text-ink/40 hover:text-flare-600 hover:bg-flare-100/50 transition-colors cursor-pointer"
                            title="Delete this lot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Empty state only if zero initial cost and zero buy tranches */}
                  {initialHoldingCost <= 0 && buyTranches.length === 0 && (
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

        {/* Realized Divestments & Redemptions Section (Schedule CG) */}
        {sellTranches.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="font-display font-bold text-sm text-ink flex items-center gap-2">
                <span>Realized Divestments & Liquidations (Schedule CG)</span>
                <Badge tone="flare" size="sm">
                  {sellTranches.length} {sellTranches.length === 1 ? 'Redemption' : 'Redemptions'}
                </Badge>
              </h4>
              <span className="text-xs font-bold text-pine-600 font-mono">
                Total Realized Gain: {totalRealizedGains >= 0 ? '+' : ''}
                {formatCurrency(totalRealizedGains, baseCurrency, numberFormat, isPrivacyMode)}
              </span>
            </div>

            <div className="rounded-2xl border border-line overflow-hidden bg-card shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-moss/80 border-b border-line text-ink/50 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3.5">Redemption Date</th>
                      <th className="py-2.5 px-3.5">Sale Proceeds</th>
                      <th className="py-2.5 px-3.5">Units Redeemed</th>
                      <th className="py-2.5 px-3.5">Acquisition Cost Basis</th>
                      <th className="py-2.5 px-3.5">Realized Capital Gain / Loss</th>
                      <th className="py-2.5 px-3.5">Note</th>
                      <th className="py-2.5 px-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {sellTranches.map((t, index) => {
                      const costBasis = Math.max(0, (t.amount || 0) - (t.realizedGain || 0));
                      const gain = t.realizedGain !== undefined ? t.realizedGain : (t.amount - costBasis);
                      return (
                        <tr key={t.id} className="hover:bg-moss/50 transition-colors">
                          <td className="py-3 px-3.5">
                            <div className="flex items-center gap-1.5">
                              <Badge tone="flare" size="xs">
                                Sale #{index + 1}
                              </Badge>
                              <span className="font-mono text-xs text-ink/80">{t.date}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3.5 font-mono font-bold text-pine-700 dark:text-pine-400">
                            +{formatCurrency(t.amount, baseCurrency, numberFormat, isPrivacyMode)}
                          </td>
                          <td className="py-3 px-3.5 font-mono text-xs text-ink/80">
                            {t.units ? (
                              <span>
                                <b>{t.units.toFixed(3)}</b> units
                                {t.unitPrice && <span className="text-ink/45"> @ ₹{t.unitPrice.toFixed(2)}</span>}
                              </span>
                            ) : (
                              <span className="text-ink/40">Full / Lump-sum</span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 font-mono text-xs text-ink/70">
                            {formatCurrency(costBasis, baseCurrency, numberFormat, isPrivacyMode)}
                          </td>
                          <td className="py-3 px-3.5 font-mono text-xs">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                gain >= 0
                                  ? 'bg-pine-100 text-pine-700 dark:bg-pine-900/40 dark:text-pine-300'
                                  : 'bg-flare-100 text-flare-700 dark:bg-flare-900/40 dark:text-flare-300'
                              }`}
                            >
                              {gain >= 0 ? '+' : ''}
                              {formatCurrency(gain, baseCurrency, numberFormat, isPrivacyMode)}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-xs text-ink/70">
                            {t.note || <span className="text-ink/30 italic">Redemption</span>}
                          </td>
                          <td className="py-3 px-3.5 text-right">
                            <button
                              onClick={() => handleDeleteTranche(t.id, t.amount, true)}
                              className="p-1.5 rounded-lg text-ink/40 hover:text-flare-600 hover:bg-flare-100/50 transition-colors cursor-pointer"
                              title="Undo this sale lot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

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
