import React, { useState, useMemo } from 'react';
import { useVault } from '../context/VaultContext';
import { usePrivacy } from '../context/PrivacyContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { AnimatedNumber } from '../components/common/AnimatedNumber';
import { AssetModal } from '../components/assets/AssetModal';
import { ValuationModal } from '../components/assets/ValuationModal';
import { AssetDetailModal } from '../components/assets/AssetDetailModal';
import { LiabilityModal } from '../components/liabilities/LiabilityModal';
import { DebtSimulatorModal } from '../components/assets/DebtSimulatorModal';
import { AmortizationScheduleModal } from '../components/liabilities/AmortizationScheduleModal';
import { formatCurrency, formatCompactCurrency, formatPercent } from '../utils/formatters';
import { formatReadableDate } from '../utils/dates';
import type { Asset, Liability, AssetType } from '../types';
import {
  Landmark,
  CreditCard,
  Plus,
  TrendingUp,
  TrendingDown,
  Edit2,
  Trash2,
  History,
  Calendar,
  Layers,
  Zap,
} from 'lucide-react';

const ASSET_CLASS_COLORS: Record<AssetType, string> = {
  property: '#12855a',
  vehicle: '#0284c7',
  gold: '#d97706',
  mutual_fund: '#059669',
  stock: '#16a34a',
  fd_rd: '#4f46e5',
  epf_ppf_nps: '#7c3aed',
  insurance: '#0d9488',
  chit_fund: '#ea580c',
  other: '#64748b',
};

export const AssetsLiabilitiesView: React.FC = () => {
  const { assets, liabilities, activeVault, deleteAsset, deleteLiability } = useVault();
  const { isPrivacyMode } = usePrivacy();

  const [activeTab, setActiveTab] = useState<'assets' | 'liabilities'>('assets');
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState<Asset | undefined>(undefined);
  const [valuationAsset, setValuationAsset] = useState<Asset | null>(null);
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);

  const [isLiabilityModalOpen, setIsLiabilityModalOpen] = useState(false);
  const [liabilityToEdit, setLiabilityToEdit] = useState<Liability | undefined>(undefined);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [selectedLoanForSchedule, setSelectedLoanForSchedule] = useState<Liability | null>(null);

  const baseCurrency = activeVault?.currency || 'INR';
  const numberFormat = activeVault?.numberFormat || 'indian';

  // Total sums
  const totalAssetsValue = useMemo(() => {
    return assets.reduce((sum, a) => sum + a.currentValue, 0);
  }, [assets]);

  const totalLiabilitiesBalance = useMemo(() => {
    return liabilities.reduce((sum, l) => sum + l.outstandingBalance, 0);
  }, [liabilities]);

  const totalMonthlyEMIs = useMemo(() => {
    return liabilities.reduce((sum, l) => sum + (l.emiAmount || 0), 0);
  }, [liabilities]);

  // Asset breakdown for distribution bar
  const assetChartData = useMemo(() => {
    const map = new Map<string, number>();
    assets.forEach((a) => {
      const typeLabel = a.type.replace('_', ' ').toUpperCase();
      map.set(typeLabel, (map.get(typeLabel) || 0) + a.currentValue);
    });

    return Array.from(map.entries()).map(([name, value]) => ({
      name,
      value,
      color: ASSET_CLASS_COLORS[name.toLowerCase().replace(' ', '_') as AssetType] || '#12855a',
    }));
  }, [assets]);

  const handleDeleteAsset = async (id: string, name: string) => {
    if (window.confirm(`Delete asset "${name}" and its valuation history?`)) {
      await deleteAsset(id);
    }
  };

  const handleDeleteLiability = async (id: string, name: string) => {
    if (window.confirm(`Delete liability "${name}"?`)) {
      await deleteLiability(id);
    }
  };

  return (
    <div className="space-y-5 w-full max-w-[1600px] mx-auto px-1 sm:px-2 pb-14 anim-fade">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 grid place-items-center text-pine-600">
              <Landmark className="w-4 h-4" />
            </span>
            <h1 className="font-display font-extrabold text-[22px] sm:text-[24px] tracking-tight text-ink">
              Asset Portfolio & Debt
            </h1>
          </div>
          <p className="text-xs text-ink/50 mt-1">
            Track physical assets, equity holdings, EPF/PPF, and institutional loans with live amortization
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsSimulatorOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-mari-400/50 bg-mari-100/70 dark:bg-mari-950/40 hover:bg-mari-100 text-mari-800 dark:text-mari-200 active:scale-[0.97] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Zap className="w-3.5 h-3.5 text-mari-600" />
            <span>Payoff Simulator</span>
          </button>

          <button
            onClick={() => {
              setAssetToEdit(undefined);
              setIsAssetModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl border border-line bg-card hover:bg-moss active:scale-[0.97] text-xs font-semibold text-ink flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-pine-600" />
            <span>Add Asset</span>
          </button>

          <button
            onClick={() => {
              setLiabilityToEdit(undefined);
              setIsLiabilityModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-pine-700 hover:bg-pine-600 active:scale-[0.97] text-white text-xs font-bold shadow-sm shadow-pine-900/20 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Loan / Debt</span>
          </button>
        </div>
      </div>

      {/* Summary Cards (PaisaBook Styled) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-line bg-card p-4 sm:p-5 shadow-sm lift">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-pine-700 dark:text-pine-400">
            Total Asset Portfolio
          </div>
          <div className="font-display font-extrabold text-[26px] num text-pine-700 dark:text-pine-400 mt-1">
            <AnimatedNumber
              value={totalAssetsValue}
              currency={baseCurrency}
              numberFormat={numberFormat}
              isPrivacyMode={isPrivacyMode}
            />
          </div>
          <div className="text-[11px] text-ink/45 mt-0.5">{assets.length} Assets Registered</div>
        </div>

        <div className="rounded-2xl border border-line bg-card p-4 sm:p-5 shadow-sm lift">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-flare-600">
            Outstanding Debt
          </div>
          <div className="font-display font-extrabold text-[26px] num text-flare-600 mt-1">
            <AnimatedNumber
              value={totalLiabilitiesBalance}
              currency={baseCurrency}
              numberFormat={numberFormat}
              isPrivacyMode={isPrivacyMode}
            />
          </div>
          <div className="text-[11px] text-ink/45 mt-0.5">{liabilities.length} Active Loans / Debts</div>
        </div>

        <div className="rounded-2xl border border-line bg-card p-4 sm:p-5 shadow-sm lift">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-mari-600">
            Monthly EMI Burden
          </div>
          <div className="font-display font-extrabold text-[26px] num text-ink mt-1">
            <AnimatedNumber
              value={totalMonthlyEMIs}
              currency={baseCurrency}
              numberFormat={numberFormat}
              isPrivacyMode={isPrivacyMode}
            />
          </div>
          <div className="text-[11px] text-ink/45 mt-0.5">Fixed Outflow Every Month</div>
        </div>
      </div>

      {/* Navigation Segmented Tabs */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-moss/80 rounded-xl border border-line max-w-xs">
        <button
          onClick={() => setActiveTab('assets')}
          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'assets'
              ? 'bg-card text-ink shadow-xs border border-line'
              : 'text-ink/60 hover:text-ink'
          }`}
        >
          Assets ({assets.length})
        </button>

        <button
          onClick={() => setActiveTab('liabilities')}
          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'liabilities'
              ? 'bg-card text-ink shadow-xs border border-line'
              : 'text-ink/60 hover:text-ink'
          }`}
        >
          Liabilities ({liabilities.length})
        </button>
      </div>

      {/* TAB 1: Assets View */}
      {activeTab === 'assets' && (
        <div className="space-y-4">
          {assets.length === 0 ? (
            <Card className="text-center py-12 text-xs space-y-3 lift">
              <div className="w-12 h-12 rounded-2xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 grid place-items-center mx-auto text-pine-600">
                <Landmark className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm text-ink">No assets logged yet</h3>
                <p className="text-xs text-ink/50 mt-1 max-w-sm mx-auto">
                  Add your home, vehicles, gold, mutual funds, PF, or stocks to see your true net worth.
                </p>
              </div>
              <button
                onClick={() => {
                  setAssetToEdit(undefined);
                  setIsAssetModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-pine-700 text-white text-xs font-bold shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add your first asset</span>
              </button>
            </Card>
          ) : (
            <>
              {/* Asset Allocation Bar */}
              {assetChartData.length > 0 && (
                <div className="rounded-2xl border border-line bg-card p-4 sm:p-5 space-y-3.5 shadow-sm lift">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="font-display font-bold text-xs uppercase tracking-wider text-ink">
                        Asset Class Portfolio Distribution
                      </h3>
                      <p className="text-[11.5px] text-ink/50 mt-0.5">
                        Breakdown across physical real estate, equity, fixed deposits, and retirement vehicles
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-ink tabular-nums">
                      {assets.length} Holdings Registered
                    </span>
                  </div>

                  {/* Multi-segment bar */}
                  <div className="w-full h-3 rounded-full overflow-hidden flex bg-moss p-0.5 gap-0.5">
                    {assetChartData.map((seg, idx) => {
                      const pct = totalAssetsValue > 0 ? (seg.value / totalAssetsValue) * 100 : 0;
                      if (pct <= 0) return null;
                      return (
                        <div
                          key={idx}
                          title={`${seg.name}: ${formatPercent(pct)}`}
                          style={{
                            width: `${pct}%`,
                            backgroundColor: seg.color,
                          }}
                          className="h-full rounded-full transition-all duration-300 first:rounded-l-full last:rounded-r-full"
                        />
                      );
                    })}
                  </div>

                  {/* Legend Chips */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {assetChartData.map((seg, idx) => {
                      const pct = totalAssetsValue > 0 ? (seg.value / totalAssetsValue) * 100 : 0;
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-moss border border-line text-xs"
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: seg.color }}
                          />
                          <span className="font-semibold text-ink">{seg.name}</span>
                          <span className="font-mono text-ink/50 text-[11px] tabular-nums">
                            {formatPercent(pct)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Asset Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {assets.map((asset) => {
                  const gain = asset.purchasePrice ? asset.currentValue - asset.purchasePrice : 0;
                  const gainPct =
                    asset.purchasePrice && asset.purchasePrice > 0
                      ? (gain / asset.purchasePrice) * 100
                      : 0;

                  return (
                    <div
                      key={asset.id}
                      className="rounded-2xl border border-line bg-card p-4 sm:p-5 space-y-3 shadow-sm lift flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3
                              onClick={() => setDetailAsset(asset)}
                              className="font-display font-bold text-sm text-ink truncate cursor-pointer hover:text-pine-600 transition-colors"
                              title="Click to view SIP installments and unit details"
                            >
                              {asset.name}
                            </h3>
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              <Badge tone="pine" size="xs" className="capitalize">
                                {asset.type.replace('_', ' ')}
                              </Badge>
                              {asset.tranches && asset.tranches.length > 0 && (
                                <Badge tone="sky" size="xs">
                                  SIP • {asset.tranches.length} lots
                                </Badge>
                              )}
                              {asset.totalUnits && asset.totalUnits > 0 && (
                                <span className="text-[11px] font-mono text-ink/50">
                                  {asset.totalUnits.toFixed(2)} units
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => {
                                setAssetToEdit(asset);
                                setIsAssetModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-ink/40 hover:text-ink transition-colors cursor-pointer"
                              title="Edit Asset"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteAsset(asset.id, asset.name)}
                              className="p-1.5 rounded-lg text-ink/40 hover:text-flare-600 transition-colors cursor-pointer"
                              title="Delete Asset"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Valuation */}
                        <div className="pt-2">
                          <span className="text-[10px] text-ink/45 font-bold uppercase tracking-wider block">
                            Current Valuation
                          </span>
                          <div className="font-display font-extrabold text-2xl num text-ink mt-0.5">
                            <AnimatedNumber
                              value={asset.currentValue}
                              currency={asset.currency}
                              numberFormat={numberFormat}
                              isPrivacyMode={isPrivacyMode}
                            />
                          </div>

                          {asset.purchasePrice && (
                            <div className="flex items-center gap-1.5 text-xs mt-1 font-semibold">
                              <span
                                className={`flex items-center ${
                                  gain >= 0 ? 'text-pine-600' : 'text-flare-600'
                                }`}
                              >
                                {gain >= 0 ? (
                                  <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                                ) : (
                                  <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                                )}
                                {formatPercent(gainPct)}
                              </span>
                              <span className="text-ink/45 font-normal">
                                (Cost:{' '}
                                {formatCompactCurrency(
                                  asset.purchasePrice,
                                  asset.currency,
                                  numberFormat,
                                  isPrivacyMode
                                )}
                                )
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="pt-2.5 border-t border-line flex items-center justify-between">
                        <button
                          onClick={() => setDetailAsset(asset)}
                          className="text-[11.5px] text-pine-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Layers className="w-3 h-3" />
                          <span>{asset.tranches && asset.tranches.length > 0 ? `${asset.tranches.length} SIP Lots` : 'Lots & Details'}</span>
                        </button>

                        <button
                          onClick={() => setValuationAsset(asset)}
                          className="px-2.5 py-1 rounded-lg bg-moss hover:bg-pine-50 text-pine-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <History className="w-3 h-3 text-pine-600" />
                          <span>Update Value</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: Liabilities View */}
      {activeTab === 'liabilities' && (
        <div className="space-y-4">
          {liabilities.length === 0 ? (
            <Card className="text-center py-12 text-xs space-y-3 lift">
              <div className="w-12 h-12 rounded-2xl bg-flare-100/70 border border-flare-500/30 grid place-items-center mx-auto text-flare-600">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm text-ink">No formal loans recorded</h3>
                <p className="text-xs text-ink/50 mt-1 max-w-sm mx-auto">
                  Track home loans, car loans, education loans, and EMI schedules with interest calculators.
                </p>
              </div>
              <button
                onClick={() => {
                  setLiabilityToEdit(undefined);
                  setIsLiabilityModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-pine-700 text-white text-xs font-bold shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Loan / Mortgage</span>
              </button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {liabilities.map((loan) => (
                <div
                  key={loan.id}
                  className="rounded-2xl border border-line bg-card p-4 sm:p-5 space-y-3.5 shadow-sm lift"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display font-bold text-sm text-ink">{loan.name}</h3>
                      <div className="flex items-center gap-2 text-[11px] text-ink/50 mt-0.5">
                        <span>{loan.lender}</span>
                        <span>•</span>
                        <span className="capitalize">{loan.type.replace('_', ' ')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => {
                          setLiabilityToEdit(loan);
                          setIsLiabilityModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-ink/40 hover:text-ink transition-colors cursor-pointer"
                        title="Edit Liability"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteLiability(loan.id, loan.name)}
                        className="p-1.5 rounded-lg text-ink/40 hover:text-flare-600 transition-colors cursor-pointer"
                        title="Delete Liability"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Balances */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-[10px] text-ink/45 font-bold uppercase tracking-wider block">
                        Outstanding Balance
                      </span>
                      <div className="font-display font-extrabold text-xl num text-flare-600 mt-0.5">
                        <AnimatedNumber
                          value={loan.outstandingBalance}
                          currency={loan.currency}
                          numberFormat={numberFormat}
                          isPrivacyMode={isPrivacyMode}
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-ink/45 font-bold uppercase tracking-wider block">
                        Monthly EMI
                      </span>
                      <div className="font-display font-extrabold text-xl num text-ink mt-0.5">
                        <AnimatedNumber
                          value={loan.emiAmount}
                          currency={loan.currency}
                          numberFormat={numberFormat}
                          isPrivacyMode={isPrivacyMode}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Loan Details */}
                  <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-line text-xs">
                    <div>
                      <span className="text-ink/45 block text-[10px] uppercase font-bold">Rate</span>
                      <span className="font-semibold text-ink">{loan.interestRate}% p.a.</span>
                    </div>

                    <div>
                      <span className="text-ink/45 block text-[10px] uppercase font-bold">Tenure</span>
                      <span className="font-semibold text-ink">
                        {loan.tenureRemainingMonths ? `${loan.tenureRemainingMonths} mo` : '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-ink/45 block text-[10px] uppercase font-bold">Next Due</span>
                      <span className="font-semibold text-mari-600">
                        {loan.nextDueDate ? formatReadableDate(loan.nextDueDate) : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Amortization Schedule & Benchmark CTA */}
                  <div className="pt-2 border-t border-line/60 flex items-center justify-between gap-2">
                    {loan.interestType === 'floating' ? (
                      <span className="text-[10px] text-pine-600 font-semibold flex items-center gap-1 truncate">
                        <Zap className="w-3 h-3 shrink-0" />
                        <span>Repo {loan.benchmarkRate || 6.5}% + {loan.spread || 2.05}%</span>
                      </span>
                    ) : (
                      <span className="text-[10.5px] text-ink/40 font-medium">Fixed Rate</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedLoanForSchedule(loan)}
                      className="px-2.5 py-1 rounded-xl bg-card border border-line hover:border-pine-300 hover:bg-moss text-xs font-semibold text-ink flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    >
                      <Calendar className="w-3 h-3 text-pine-600" />
                      <span>Repayment Schedule</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Asset Modal */}
      {isAssetModalOpen && (
        <AssetModal
          isOpen={isAssetModalOpen}
          onClose={() => setIsAssetModalOpen(false)}
          assetToEdit={assetToEdit}
        />
      )}

      {/* Valuation Modal */}
      {valuationAsset && (
        <ValuationModal
          isOpen={Boolean(valuationAsset)}
          onClose={() => setValuationAsset(null)}
          asset={valuationAsset}
        />
      )}

      {/* Liability Modal */}
      {isLiabilityModalOpen && (
        <LiabilityModal
          isOpen={isLiabilityModalOpen}
          onClose={() => setIsLiabilityModalOpen(false)}
          liabilityToEdit={liabilityToEdit}
        />
      )}

      {/* Debt Payoff & Opportunity Simulator */}
      {isSimulatorOpen && (
        <DebtSimulatorModal
          isOpen={isSimulatorOpen}
          onClose={() => setIsSimulatorOpen(false)}
          liabilities={liabilities}
          baseCurrency={baseCurrency}
          numberFormat={numberFormat}
        />
      )}

      {/* Asset Detail & SIP Lots Modal */}
      {detailAsset && (
        <AssetDetailModal
          isOpen={Boolean(detailAsset)}
          onClose={() => setDetailAsset(null)}
          asset={assets.find((a) => a.id === detailAsset.id) || detailAsset}
        />
      )}
    </div>
  );
};
