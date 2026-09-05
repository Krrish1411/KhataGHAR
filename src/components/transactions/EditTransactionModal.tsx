import React, { useState, useEffect } from 'react';
import { useVault } from '../../context/VaultContext';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import type { Transaction, TransactionType, Account, Category, Asset, Liability } from '../../types';
import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Edit3,
  TrendingUp,
  TrendingDown,
  Landmark,
  Sparkles,
} from 'lucide-react';
import { getCategoryEmoji } from '../common/IconRenderer';
import { formatCurrency } from '../../utils/formatters';

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  onClose,
  transaction,
}) => {
  const { accounts, categories, assets, liabilities, updateTransaction, activeVault } = useVault();

  const isAssetSaleInit =
    transaction.subType === 'asset_sale' ||
    (Boolean(transaction.linkedAssetId) && transaction.type === 'income') ||
    Boolean(transaction.tags && transaction.tags.includes('asset-sale'));

  const isAssetBuyInit =
    transaction.subType === 'investment' ||
    (Boolean(transaction.linkedAssetId) && transaction.type === 'expense') ||
    Boolean(transaction.tags && transaction.tags.includes('investment'));

  const isLoanReceivedInit =
    transaction.subType === 'loan_received' ||
    (Boolean(transaction.linkedLiabilityId) && transaction.type === 'income') ||
    Boolean(transaction.tags && transaction.tags.includes('loan-disbursement'));

  const isDebtPaymentInit =
    transaction.subType === 'debt_payment' ||
    (Boolean(transaction.linkedLiabilityId) && transaction.type === 'expense');

  const [type, setType] = useState<TransactionType>(transaction.type);
  const [amount, setAmount] = useState<string>(String(transaction.amount));
  const [date, setDate] = useState<string>(transaction.date);
  const [accountId, setAccountId] = useState<string>(transaction.accountId);
  const [toAccountId, setToAccountId] = useState<string>(transaction.toAccountId || '');
  const [categoryId, setCategoryId] = useState<string>(transaction.categoryId || '');
  const [note, setNote] = useState<string>(transaction.note || '');
  const [tagsInput, setTagsInput] = useState<string>((transaction.tags || []).join(', '));
  
  // Asset & Liability Linkage state
  const [linkedAssetId, setLinkedAssetId] = useState<string>(transaction.linkedAssetId || '');
  const [linkedLiabilityId, setLinkedLiabilityId] = useState<string>(transaction.linkedLiabilityId || '');
  const [units, setUnits] = useState<string>(transaction.units ? String(transaction.units) : '');
  const [unitPrice, setUnitPrice] = useState<string>(transaction.unitPrice ? String(transaction.unitPrice) : '');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const baseCurrency = activeVault?.currency || 'INR';
  const numberFormat = activeVault?.numberFormat || 'indian';

  useEffect(() => {
    setType(transaction.type);
    setAmount(String(transaction.amount));
    setDate(transaction.date);
    setAccountId(transaction.accountId);
    setToAccountId(transaction.toAccountId || '');
    setCategoryId(transaction.categoryId || '');
    setNote(transaction.note || '');
    setTagsInput((transaction.tags || []).join(', '));
    setLinkedAssetId(transaction.linkedAssetId || '');
    setLinkedLiabilityId(transaction.linkedLiabilityId || '');
    setUnits(transaction.units ? String(transaction.units) : '');
    setUnitPrice(transaction.unitPrice ? String(transaction.unitPrice) : '');
    setError('');
  }, [transaction]);

  const filteredCategories = categories.filter((c) => c.type === type && !c.hidden && !c.parentId);

  // Live calculation for Asset Sale Realized Gain / Loss
  const selectedAsset = assets.find((a) => a.id === linkedAssetId);
  const numAmount = parseFloat(amount) || 0;
  const numUnits = parseFloat(units) || 0;

  const liveSaleMetrics = React.useMemo(() => {
    if (!selectedAsset) return { costBasis: numAmount, realizedGain: 0 };
    const totalUnits = selectedAsset.totalUnits || 0;
    const currentCostBasis = selectedAsset.purchasePrice || selectedAsset.currentValue;

    const costBasis =
      totalUnits > 0 && numUnits > 0
        ? Math.round(((numUnits / totalUnits) * currentCostBasis) * 100) / 100
        : selectedAsset.currentValue > 0
        ? Math.round(((numAmount / selectedAsset.currentValue) * currentCostBasis) * 100) / 100
        : numAmount;
    const realizedGain = Math.round((numAmount - costBasis) * 100) / 100;
    return { costBasis, realizedGain };
  }, [selectedAsset, numAmount, numUnits]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsedAmt = Math.round((parseFloat(amount) + Number.EPSILON) * 100) / 100;
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    if (!accountId) {
      setError('Please select an account');
      return;
    }

    if (type === 'transfer' && !toAccountId) {
      setError('Please select a destination account for the transfer');
      return;
    }

    if (type === 'transfer' && accountId === toAccountId) {
      setError('Source and destination accounts must be different');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedTags = tagsInput
        .split(/[,#\s]+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const parsedUnits = units ? parseFloat(units) : undefined;
      const parsedUnitPrice = unitPrice ? parseFloat(unitPrice) : undefined;

      const updatedTx: Transaction = {
        ...transaction,
        type,
        amount: parsedAmt,
        date,
        accountId,
        toAccountId: type === 'transfer' ? toAccountId : undefined,
        categoryId: type !== 'transfer' && !linkedAssetId && !linkedLiabilityId ? (categoryId || undefined) : undefined,
        note: note.trim() || undefined,
        tags: parsedTags.length > 0 ? parsedTags : undefined,
        linkedAssetId: linkedAssetId || undefined,
        linkedLiabilityId: linkedLiabilityId || undefined,
        units: parsedUnits,
        unitPrice: parsedUnitPrice,
        realizedGain: isAssetSaleInit ? liveSaleMetrics.realizedGain : transaction.realizedGain,
      };

      await updateTransaction(updatedTx);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. DEDICATED ASSET SALE / REDEMPTION FORM
  if (isAssetSaleInit) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-pine-600" />
            <span>Edit Asset Sale / Redemption</span>
          </div>
        }
        description="Return of capital returns to bank liquidity; only the net realized gain/loss affects P&L."
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-flare-50 dark:bg-flare-950/60 border border-flare-200 dark:border-flare-800 text-flare-600 dark:text-flare-400 text-xs rounded-xl">
              {error}
            </div>
          )}

          {/* Banner */}
          <div className="p-3 rounded-xl bg-pine-50/80 dark:bg-pine-950/40 border border-pine-200 dark:border-pine-800/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-pine-800 dark:text-pine-300 font-medium">
              <Sparkles className="w-4 h-4 text-pine-600 shrink-0" />
              <span>Capital Redemption Entry</span>
            </div>
            <Badge tone="pine" size="xs">Asset Divestment</Badge>
          </div>

          {/* Asset Selector */}
          <div className="space-y-1.5">
            <Select
              label="Sold / Redeemed Asset"
              value={linkedAssetId}
              onChange={(e) => setLinkedAssetId(e.target.value)}
              options={assets.map((a: Asset) => ({
                value: a.id,
                label: `${a.name} (Value: ${formatCurrency(a.currentValue, a.currency || baseCurrency, numberFormat)}${a.totalUnits ? `, ${a.totalUnits} units` : ''})`,
              }))}
            />
          </div>

          {/* Units Sold & Sale Price Per Unit */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              step="any"
              label="Units Redeemed (Optional)"
              placeholder="e.g. 50"
              value={units}
              onChange={(e) => setUnits(e.target.value)}
              tabularNums
            />
            <Input
              type="number"
              step="any"
              label="Sale Price / NAV per Unit"
              placeholder="e.g. 150.00"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              tabularNums
            />
          </div>

          {/* Gross Proceeds & Date */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              step="any"
              label={`Gross Proceeds (${activeVault?.currency || 'INR'})`}
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              tabularNums
              required
              autoFocus
            />
            <Input
              type="date"
              label="Sale Date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Live P&L Accounting Indicator */}
          <div className="p-3.5 rounded-xl border border-line bg-card space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink/60">Estimated Cost Basis of Sold Units:</span>
              <span className="font-semibold num text-ink">
                {formatCurrency(liveSaleMetrics.costBasis, baseCurrency, numberFormat)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-line/60">
              <span className="text-ink/75 font-medium">Realized Capital Gain / Loss:</span>
              {liveSaleMetrics.realizedGain > 0 ? (
                <span className="flex items-center gap-1 font-bold text-pine-700 dark:text-pine-400 num">
                  <TrendingUp className="w-3.5 h-3.5" />
                  +{formatCurrency(liveSaleMetrics.realizedGain, baseCurrency, numberFormat)} (Gain)
                </span>
              ) : liveSaleMetrics.realizedGain < 0 ? (
                <span className="flex items-center gap-1 font-bold text-flare-600 dark:text-flare-400 num">
                  <TrendingDown className="w-3.5 h-3.5" />
                  -{formatCurrency(Math.abs(liveSaleMetrics.realizedGain), baseCurrency, numberFormat)} (Loss)
                </span>
              ) : (
                <span className="font-bold text-ink/60 num">₹0.00 (At Par)</span>
              )}
            </div>
          </div>

          {/* Bank Account (Credit) */}
          <Select
            label="Deposited Into Account"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            options={accounts.map((a: Account) => ({
              value: a.id,
              label: `${a.name} (${a.currency} ${a.balance.toFixed(2)})`,
            }))}
          />

          {/* Notes & Tags */}
          <Input
            label="Notes / Trade Details"
            placeholder="e.g. Redeemed for emergency fund or profit taking"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <Input
            label="Tags (Comma separated)"
            placeholder="e.g. redemption, mutual-fund, capital-gains"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving changes…' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>
    );
  }

  // 2. DEDICATED ASSET PURCHASE / INVESTMENT FORM
  if (isAssetBuyInit) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-pine-600" />
            <span>Edit Asset Investment / Acquisition</span>
          </div>
        }
        description="Balance sheet capital allocation. Increases your asset holding without burdening living expenses."
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-flare-50 dark:bg-flare-950/60 border border-flare-200 dark:border-flare-800 text-flare-600 dark:text-flare-400 text-xs rounded-xl">
              {error}
            </div>
          )}

          <div className="p-3 rounded-xl bg-pine-50/80 dark:bg-pine-950/40 border border-pine-200 dark:border-pine-800/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-pine-800 dark:text-pine-300 font-medium">
              <Sparkles className="w-4 h-4 text-pine-600 shrink-0" />
              <span>Capital Acquisition Entry</span>
            </div>
            <Badge tone="pine" size="xs">Investment</Badge>
          </div>

          <Select
            label="Target Asset"
            value={linkedAssetId}
            onChange={(e) => setLinkedAssetId(e.target.value)}
            options={assets.map((a: Asset) => ({
              value: a.id,
              label: `${a.name} (${a.type})`,
            }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              step="any"
              label={`Invested Amount (${activeVault?.currency || 'INR'})`}
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              tabularNums
              required
              autoFocus
            />
            <Input
              type="date"
              label="Investment Date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              step="any"
              label="Units Acquired (Optional)"
              placeholder="e.g. 25.5"
              value={units}
              onChange={(e) => setUnits(e.target.value)}
              tabularNums
            />
            <Input
              type="number"
              step="any"
              label="Purchase Price / NAV per Unit"
              placeholder="e.g. 100.00"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              tabularNums
            />
          </div>

          <Select
            label="Funded From Account (Debit)"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            options={accounts.map((a: Account) => ({
              value: a.id,
              label: `${a.name} (${a.currency} ${a.balance.toFixed(2)})`,
            }))}
          />

          <Input
            label="Notes / Description"
            placeholder="e.g. Monthly SIP tranche or stock purchase"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <Input
            label="Tags (Comma separated)"
            placeholder="e.g. sip, index-fund, long-term"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving changes…' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>
    );
  }

  // 3. DEDICATED LIABILITY DEBT PAYMENT / LOAN INFLOW FORM
  if (isDebtPaymentInit || isLoanReceivedInit) {
    const isReceived = isLoanReceivedInit;
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-flare-600" />
            <span>{isReceived ? 'Edit Loan Disbursement Inflow' : 'Edit Debt Payment / EMI'}</span>
          </div>
        }
        description={
          isReceived
            ? 'Financing inflow increases debt liability. Does not count as operating revenue.'
            : 'Principal paydown directly decreases outstanding liability on your balance sheet.'
        }
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-flare-50 dark:bg-flare-950/60 border border-flare-200 dark:border-flare-800 text-flare-600 dark:text-flare-400 text-xs rounded-xl">
              {error}
            </div>
          )}

          <div className="p-3 rounded-xl bg-flare-50/80 dark:bg-flare-950/40 border border-flare-200 dark:border-flare-800/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-flare-800 dark:text-flare-300 font-medium">
              <Landmark className="w-4 h-4 text-flare-600 shrink-0" />
              <span>{isReceived ? 'Loan Principal Receipt' : 'Debt Servicing / Paydown'}</span>
            </div>
            <Badge tone="flare" size="xs">{isReceived ? 'Financing Inflow' : 'Debt Paydown'}</Badge>
          </div>

          <Select
            label="Linked Liability / Loan"
            value={linkedLiabilityId}
            onChange={(e) => setLinkedLiabilityId(e.target.value)}
            options={liabilities.map((l: Liability) => ({
              value: l.id,
              label: `${l.name} (${l.lender}, Balance: ${formatCurrency(l.outstandingBalance, l.currency || baseCurrency, numberFormat)})`,
            }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              step="any"
              label={`Amount (${activeVault?.currency || 'INR'})`}
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              tabularNums
              required
              autoFocus
            />
            <Input
              type="date"
              label="Date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <Select
            label={isReceived ? 'Deposited Into Account (Credit)' : 'Paid From Account (Debit)'}
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            options={accounts.map((a: Account) => ({
              value: a.id,
              label: `${a.name} (${a.currency} ${a.balance.toFixed(2)})`,
            }))}
          />

          <Input
            label="Notes / Payment Reference"
            placeholder="e.g. EMI installment, Prepayment, or Loan disbursal"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <Input
            label="Tags (Comma separated)"
            placeholder="e.g. loan, emi, debt-reduction"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving changes…' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>
    );
  }

  // 4. STANDARD EXPENSE / INCOME / TRANSFER FORM
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Edit3 className="w-5 h-5 text-pine-600" />
          <span>Edit Transaction</span>
        </div>
      }
      description="Updating this entry will automatically recalculate and adjust connected account balances."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-flare-50 dark:bg-flare-950/60 border border-flare-200 dark:border-flare-800 text-flare-600 dark:text-flare-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Type Selector */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-moss/80 rounded-xl border border-line">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              type === 'expense'
                ? 'bg-flare-600 text-white shadow-xs'
                : 'text-ink/65 hover:text-ink'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Expense</span>
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              type === 'income'
                ? 'bg-pine-600 text-white shadow-xs'
                : 'text-ink/65 hover:text-ink'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Income</span>
          </button>
          <button
            type="button"
            onClick={() => setType('transfer')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              type === 'transfer'
                ? 'bg-skyx-600 text-white shadow-xs'
                : 'text-ink/65 hover:text-ink'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Transfer</span>
          </button>
        </div>

        {/* Amount & Date */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            step="any"
            label={`Amount (${activeVault?.currency || 'INR'})`}
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            tabularNums
            required
            autoFocus
          />
          <Input
            type="date"
            label="Date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        {/* Accounts Selection */}
        {type === 'transfer' ? (
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="From Account (Debit)"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              options={accounts.map((a: Account) => ({
                value: a.id,
                label: `${a.name} (${a.currency} ${a.balance.toFixed(2)})`,
              }))}
            />
            <Select
              label="To Account (Credit)"
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              options={accounts
                .filter((a) => a.id !== accountId)
                .map((a: Account) => ({
                  value: a.id,
                  label: `${a.name} (${a.currency} ${a.balance.toFixed(2)})`,
                }))}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              options={accounts.map((a: Account) => ({
                value: a.id,
                label: `${a.name} (${a.currency} ${a.balance.toFixed(2)})`,
              }))}
            />
            <Select
              label="Category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              options={[
                { value: '', label: 'Uncategorized' },
                ...filteredCategories.map((c: Category) => ({
                  value: c.id,
                  label: `${getCategoryEmoji(c.icon, c.type)} ${c.name}`,
                })),
              ]}
            />
          </div>
        )}

        {/* Note / Description */}
        <Input
          label="Note / Description"
          placeholder="e.g. Swiggy order, Grocery run, Client invoice"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {/* Tags */}
        <Input
          label="Tags (Comma separated)"
          placeholder="e.g. personal, food, reimbursable"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
        />

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving changes…' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
