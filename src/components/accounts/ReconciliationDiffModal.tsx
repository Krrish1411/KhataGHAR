import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { useVault } from '../../context/VaultContext';
import { usePrivacy } from '../../context/PrivacyContext';
import { formatCurrency } from '../../utils/formatters';
import {
  Scale,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Check,
  AlertTriangle,
  Wallet,
  Building2,
  CreditCard,
  PiggyBank,
} from 'lucide-react';

interface ReconciliationDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReconciled?: () => void;
}

export const ReconciliationDiffModal: React.FC<ReconciliationDiffModalProps> = ({
  isOpen,
  onClose,
  onReconciled,
}) => {
  const { getReconciliationPreview, reconcileAccounts, activeVault } = useVault();
  const { isPrivacyMode } = usePrivacy();

  const baseCurrency = activeVault?.currency || 'INR';
  const numberFormat = activeVault?.numberFormat || 'indian';

  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());
  const [isApplying, setIsApplying] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Compute live discrepancy previews
  const previewData = useMemo(() => {
    if (!isOpen) return [];
    return getReconciliationPreview();
  }, [isOpen, getReconciliationPreview]);

  // Pre-select accounts that have discrepancies
  useEffect(() => {
    if (isOpen && previewData.length > 0) {
      const discrepancyIds = previewData
        .filter((item) => item.hasDiscrepancy)
        .map((item) => item.account.id);
      // If none have discrepancies, select all by default
      if (discrepancyIds.length > 0) {
        setSelectedAccountIds(new Set(discrepancyIds));
      } else {
        setSelectedAccountIds(new Set(previewData.map((p) => p.account.id)));
      }
      setSuccessMessage('');
    }
  }, [isOpen, previewData]);

  const discrepancyCount = useMemo(
    () => previewData.filter((p) => p.hasDiscrepancy).length,
    [previewData]
  );

  const totalAbsoluteDelta = useMemo(
    () =>
      previewData.reduce(
        (sum, p) => (p.hasDiscrepancy ? sum + Math.abs(p.delta) : sum),
        0
      ),
    [previewData]
  );

  const toggleAccount = (id: string) => {
    setSelectedAccountIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedAccountIds.size === previewData.length) {
      setSelectedAccountIds(new Set());
    } else {
      setSelectedAccountIds(new Set(previewData.map((p) => p.account.id)));
    }
  };

  const handleApply = async () => {
    if (selectedAccountIds.size === 0) return;
    setIsApplying(true);
    try {
      await reconcileAccounts(Array.from(selectedAccountIds));
      setSuccessMessage(
        `Successfully reconciled ${selectedAccountIds.size} account(s) against your transaction ledger!`
      );
      if (onReconciled) onReconciled();
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      console.error('Reconciliation failed:', err);
    } finally {
      setIsApplying(false);
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'bank':
        return <Building2 className="w-4 h-4 text-sky-600" />;
      case 'credit':
        return <CreditCard className="w-4 h-4 text-flare-600" />;
      case 'savings':
      case 'investment':
        return <PiggyBank className="w-4 h-4 text-pine-600" />;
      default:
        return <Wallet className="w-4 h-4 text-amber-600" />;
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reconcile Double-Entry Balances"
      description="Inspect balances against the historical transaction ledger before committing adjustments"
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Status Banner */}
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
            discrepancyCount > 0
              ? 'bg-amber-500/10 border-amber-500/30 text-ink'
              : 'bg-pine-500/10 border-pine-500/30 text-ink'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {discrepancyCount > 0 ? (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-pine-600 shrink-0" />
            )}
            <div>
              <p className="text-xs font-bold">
                {discrepancyCount > 0
                  ? `${discrepancyCount} account(s) have drift between stored and ledger balance`
                  : 'All account balances are currently in sync with the ledger'}
              </p>
              <p className="text-[11px] text-ink/60">
                {discrepancyCount > 0
                  ? `Total cumulative discrepancy: ${formatCurrency(
                      totalAbsoluteDelta,
                      baseCurrency,
                      numberFormat,
                      isPrivacyMode
                    )}`
                  : 'No phantom balances or drift detected across transactions.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleSelectAll}
            className="px-2.5 py-1 rounded-lg border border-line bg-card hover:bg-moss text-ink/70 text-xs font-semibold shrink-0 cursor-pointer transition-all"
          >
            {selectedAccountIds.size === previewData.length
              ? 'Deselect All'
              : 'Select All'}
          </button>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="p-3 rounded-xl bg-pine-100/80 dark:bg-pine-950/60 border border-pine-400 text-pine-800 dark:text-pine-200 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-pine-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Diff Table / List */}
        <div className="border border-line rounded-2xl overflow-hidden bg-card divide-y divide-line max-h-[380px] overflow-y-auto custom-scrollbar">
          {previewData.map((item) => {
            const isSelected = selectedAccountIds.has(item.account.id);
            return (
              <div
                key={item.account.id}
                onClick={() => toggleAccount(item.account.id)}
                className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                  item.hasDiscrepancy ? 'hover:bg-amber-500/5' : 'hover:bg-moss/40'
                } ${isSelected ? 'bg-moss/20' : ''}`}
              >
                {/* Left: Checkbox & Account Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}} // Handled by container onClick
                    className="w-4 h-4 rounded border-line text-pine-600 focus:ring-pine-500/20 cursor-pointer"
                  />
                  <div className="w-8 h-8 rounded-xl bg-moss border border-line grid place-items-center shrink-0">
                    {getAccountIcon(item.account.type)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink truncate">
                        {item.account.name}
                      </span>
                      <Badge tone="gray" size="xs" className="capitalize">
                        {item.account.type}
                      </Badge>
                    </div>
                    <span className="text-[10.5px] text-ink/45 block font-mono">
                      Baseline: {formatCurrency(item.initialBalance, baseCurrency, numberFormat, isPrivacyMode)}
                      {item.account.balanceAsOfDate ? ` as of ${item.account.balanceAsOfDate}` : ''}
                    </span>
                  </div>
                </div>

                {/* Right: Balances & Delta */}
                <div className="flex items-center gap-3 shrink-0 text-right">
                  <div className="space-y-0.5">
                    <div className="text-[11px] text-ink/50">
                      Stored:{' '}
                      <span className="font-mono font-semibold text-ink">
                        {formatCurrency(item.currentBalance, baseCurrency, numberFormat, isPrivacyMode)}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-ink flex items-center justify-end gap-1">
                      <span>Ledger:</span>
                      <span className="font-mono text-pine-700 dark:text-pine-400">
                        {formatCurrency(item.calculatedBalance, baseCurrency, numberFormat, isPrivacyMode)}
                      </span>
                    </div>
                  </div>

                  {/* Discrepancy Badge */}
                  <div className="w-24 text-right">
                    {item.hasDiscrepancy ? (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-mono font-extrabold border ${
                          item.delta > 0
                            ? 'bg-pine-100 dark:bg-pine-950/60 text-pine-700 dark:text-pine-300 border-pine-300/40'
                            : 'bg-flare-100 dark:bg-flare-950/60 text-flare-700 dark:text-flare-300 border-flare-300/40'
                        }`}
                      >
                        {item.delta > 0 ? `+${item.delta.toFixed(2)}` : item.delta.toFixed(2)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink/40">
                        <Check className="w-3 h-3 text-pine-600" />
                        <span>Matched</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Note on Ledger Calculation */}
        <p className="text-[11px] text-ink/50 leading-relaxed px-1">
          Reconciliation keeps your fixed opening baseline balance safe and recalculates current balances
          by summing all recorded expenses, deposits, transfers, and settled loans occurring after the opening date.
        </p>

        {/* Modal Actions */}
        <div className="pt-2 flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-line hover:bg-moss text-xs font-semibold text-ink transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={selectedAccountIds.size === 0 || isApplying}
            className="flex-1 py-2.5 rounded-xl bg-pine-700 hover:bg-pine-600 active:scale-[0.97] text-white text-xs font-bold shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-45"
          >
            {isApplying ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Reconciling…</span>
              </>
            ) : (
              <>
                <Scale className="w-3.5 h-3.5" />
                <span>
                  Apply Reconciliation ({selectedAccountIds.size} Selected)
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
