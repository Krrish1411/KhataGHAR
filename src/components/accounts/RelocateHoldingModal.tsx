import React, { useState, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { useVault } from '../../context/VaultContext';
import { formatCurrency } from '../../utils/formatters';
import type { Account, PeopleLedgerEntry, Asset } from '../../types';
import { ArrowRightLeft, ShieldCheck, Wallet, Briefcase, CheckCircle2 } from 'lucide-react';

interface RelocateHoldingModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceAccount: Account | null;
}

export const RelocateHoldingModal: React.FC<RelocateHoldingModalProps> = ({
  isOpen,
  onClose,
  sourceAccount,
}) => {
  const { peopleLedger, accounts, assets, updatePeopleEntry, activeVault } = useVault();

  const baseCurrency = activeVault?.currency || 'INR';
  const numberFormat = activeVault?.numberFormat || 'indian';

  // Find all active holding entries linked to this source account
  const accountHoldingEntries = useMemo(() => {
    if (!sourceAccount) return [];
    return peopleLedger.filter((p) => {
      if (p.type !== 'holding' || p.status === 'closed') return false;
      return p.accountId === sourceAccount.id && p.heldInType !== 'asset';
    });
  }, [peopleLedger, sourceAccount]);

  const [selectedEntryId, setSelectedEntryId] = useState<string>('');
  const [destType, setDestType] = useState<'account' | 'asset' | 'unallocated'>('account');
  const [targetAccountId, setTargetAccountId] = useState<string>('');
  const [targetAssetId, setTargetAssetId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Update selected entry when modal opens or entries change
  React.useEffect(() => {
    if (isOpen && accountHoldingEntries.length > 0) {
      setSelectedEntryId(accountHoldingEntries[0].id);
      const otherAccounts = accounts.filter((a) => a.id !== sourceAccount?.id);
      setTargetAccountId(otherAccounts.length > 0 ? otherAccounts[0].id : '');
      setTargetAssetId(assets.length > 0 ? assets[0].id : '');
      setDestType(otherAccounts.length > 0 ? 'account' : assets.length > 0 ? 'asset' : 'unallocated');
      setError('');
    }
  }, [isOpen, accountHoldingEntries, accounts, assets, sourceAccount]);

  if (!sourceAccount) return null;

  const currentEntry = accountHoldingEntries.find((e) => e.id === selectedEntryId);
  const currentSettled = currentEntry
    ? (currentEntry.settlements || []).reduce((sum, s) => sum + s.amount, 0)
    : 0;
  const currentRemaining = currentEntry ? Math.max(0, currentEntry.amount - currentSettled) : 0;

  const handleRelocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEntry) {
      setError('Please select a holding entry to move.');
      return;
    }

    if (destType === 'account' && !targetAccountId) {
      setError('Please select the target bank/cash account.');
      return;
    }

    if (destType === 'asset' && !targetAssetId) {
      setError('Please select the target asset where funds are parked.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (destType === 'account') {
        await updatePeopleEntry({
          ...currentEntry,
          accountId: targetAccountId,
          heldInType: 'account',
          linkedAssetId: undefined,
        });
      } else if (destType === 'asset') {
        await updatePeopleEntry({
          ...currentEntry,
          accountId: undefined,
          heldInType: 'asset',
          linkedAssetId: targetAssetId,
        });
      } else {
        await updatePeopleEntry({
          ...currentEntry,
          accountId: undefined,
          heldInType: 'unallocated',
          linkedAssetId: undefined,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to move holding location');
    } finally {
      setIsSubmitting(false);
    }
  };

  const otherAccounts = accounts.filter((a) => a.id !== sourceAccount.id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-mari-600" />
          <span>Relocate Custodial Funds</span>
        </div>
      }
      description={`Move held money currently accounted under ${sourceAccount.name} to another account or asset`}
      maxWidth="md"
    >
      <form onSubmit={handleRelocate} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        {accountHoldingEntries.length === 0 ? (
          <div className="p-4 text-center text-xs text-ink/60">
            No active custodial holdings found under this account.
          </div>
        ) : (
          <>
            {/* Step 1: Select which holding to move */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink">
                Select Custodial Holding to Move ({accountHoldingEntries.length} Active)
              </label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {accountHoldingEntries.map((entry) => {
                  const setl = (entry.settlements || []).reduce((sum, s) => sum + s.amount, 0);
                  const rem = Math.max(0, entry.amount - setl);
                  const isSelected = entry.id === selectedEntryId;

                  return (
                    <div
                      key={entry.id}
                      onClick={() => setSelectedEntryId(entry.id)}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-mari-500 bg-mari-50/50 dark:bg-mari-950/40 ring-1 ring-mari-500'
                          : 'border-line bg-card hover:border-mari-300'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-ink truncate">{entry.contactName}</div>
                        {entry.notes && (
                          <div className="text-[10.5px] text-ink/50 truncate">{entry.notes}</div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-xs text-mari-700 dark:text-mari-300">
                          {formatCurrency(rem, entry.currency || baseCurrency, numberFormat)}
                        </div>
                        <div className="text-[10px] text-ink/40">Remaining</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Select destination type */}
            <div className="space-y-2 pt-2 border-t border-line">
              <label className="text-xs font-bold text-ink">Move Held Funds To</label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-navy-900 rounded-xl">
                <button
                  type="button"
                  onClick={() => setDestType('account')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    destType === 'account'
                      ? 'bg-mari-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Other Account</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDestType('asset')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    destType === 'asset'
                      ? 'bg-mari-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Asset / MF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDestType('unallocated')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    destType === 'unallocated'
                      ? 'bg-mari-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <span>General / None</span>
                </button>
              </div>

              {destType === 'account' && (
                <div className="space-y-1 pt-1">
                  <Select
                    label="Destination Bank / Cash Account"
                    value={targetAccountId}
                    onChange={(e) => setTargetAccountId(e.target.value)}
                    options={otherAccounts.map((a) => ({
                      value: a.id,
                      label: `${a.name} (${a.currency} ${a.balance.toFixed(2)})`,
                    }))}
                    helperText={`Relocating to this account will clear the ${formatCurrency(currentRemaining, baseCurrency, numberFormat)} obligation from ${sourceAccount.name} and assign it here.`}
                  />
                </div>
              )}

              {destType === 'asset' && (
                <div className="space-y-1 pt-1">
                  {assets.length === 0 ? (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs rounded-xl">
                      No assets found. Create an asset (like Liquid Mutual Fund or FD) first from Assets & Liabilities tab.
                    </div>
                  ) : (
                    <Select
                      label="Destination Asset (e.g. Liquid MF, FD, Gold)"
                      value={targetAssetId}
                      onChange={(e) => setTargetAssetId(e.target.value)}
                      options={assets.map((a) => ({
                        value: a.id,
                        label: `${a.name} (${a.type.replace('_', ' ')}) — Val: ${a.currency} ${a.currentValue.toLocaleString()}`,
                      }))}
                      helperText="Parking in an asset ensures your liquid cash won't show false negative balance, while the asset clearly displays your true personal equity."
                    />
                  )}
                </div>
              )}

              {destType === 'unallocated' && (
                <div className="p-3 bg-slate-50 dark:bg-navy-900/50 rounded-xl border border-line text-xs text-ink/70">
                  This will detach the custodial obligation from any specific account. It remains tracked under the contact in People Ledger.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                disabled={destType === 'asset' && assets.length === 0}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                <span>Move Holding</span>
              </Button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
};
