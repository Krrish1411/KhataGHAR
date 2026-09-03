import React, { useState, useMemo } from 'react';
import { useVault } from '../context/VaultContext';
import { usePrivacy } from '../context/PrivacyContext';
import { Button } from '../components/common/Button';
import { Card, Surface } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { AnimatedNumber } from '../components/common/AnimatedNumber';
import { Sparkline } from '../components/charts/Sparkline';
import { AccountModal } from '../components/accounts/AccountModal';
import { QuickAddModal } from '../components/transactions/QuickAddModal';
import type { Account, AccountType } from '../types';
import {
  Wallet,
  Landmark,
  CreditCard,
  Plus,
  ArrowLeftRight,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Coins,
  Smartphone,
  ShieldAlert,
  Database,
  RefreshCw,
} from 'lucide-react';

export const AccountsView: React.FC = () => {
  const { accounts, transactions, peopleLedger, activeVault, deleteAccount, updateAccount, loadDemoData, reconcileAccounts } = useVault();
  const { isPrivacyMode } = usePrivacy();
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<Account | undefined>(undefined);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');

  const baseCurrency = activeVault?.currency || 'INR';
  const numberFormat = activeVault?.numberFormat || 'indian';

  // Total balance sum
  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, a) => sum + a.balance, 0);
  }, [accounts]);

  // Calculate held-for-others breakdown per account
  const accountHeldMap = useMemo(() => {
    const map = new Map<string, number>();
    peopleLedger.forEach((p) => {
      if (p.type === 'holding' && p.accountId) {
        const settled = p.settlements.reduce((sum, s) => sum + s.amount, 0);
        const remaining = Math.max(0, p.amount - settled);
        if (remaining > 0) {
          const current = map.get(p.accountId) || 0;
          map.set(p.accountId, current + remaining);
        }
      }
    });
    return map;
  }, [peopleLedger]);

  const totalHeldAcrossAccounts = useMemo(() => {
    let sum = 0;
    accountHeldMap.forEach((val) => {
      sum += val;
    });
    return sum;
  }, [accountHeldMap]);

  // 7-day sparkline calculator per account
  const accountSparklines = useMemo(() => {
    const map = new Map<string, number[]>();
    const now = new Date();

    accounts.forEach((acc) => {
      const accTxs = transactions.filter(
        (t) => t.accountId === acc.id || t.toAccountId === acc.id
      );

      const days: number[] = [];
      let running = acc.balance;

      for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const iso = d.toISOString().split('T')[0];

        const dayChange = accTxs
          .filter((t) => t.date === iso)
          .reduce((sum, t) => {
            if (t.accountId === acc.id && t.type === 'income') return sum + t.amount;
            if (t.accountId === acc.id && t.type === 'expense') return sum - t.amount;
            if (t.toAccountId === acc.id && t.type === 'transfer') return sum + t.amount;
            if (t.accountId === acc.id && t.type === 'transfer') return sum - t.amount;
            return sum;
          }, 0);

        days.unshift(running);
        running -= dayChange;
      }

      map.set(acc.id, days);
    });

    return map;
  }, [accounts, transactions]);

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((a) => {
      if (selectedTypeFilter !== 'all' && a.type !== selectedTypeFilter) return false;
      if (selectedTagFilter !== 'all' && a.tag !== selectedTagFilter) return false;
      return true;
    });
  }, [accounts, selectedTypeFilter, selectedTagFilter]);

  const handleEdit = (account: Account) => {
    setAccountToEdit(account);
    setIsAccountModalOpen(true);
  };

  const handleToggleVisibility = async (account: Account) => {
    await updateAccount({
      ...account,
      isVisibleOnDashboard: !account.isVisibleOnDashboard,
    });
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete account "${name}"? Existing transactions referencing it will be preserved.`)) {
      await deleteAccount(id);
    }
  };

  const getAccountTypeIcon = (type: AccountType) => {
    switch (type) {
      case 'bank':
        return <Landmark className="w-4 h-4 text-amber-500" />;
      case 'cash':
        return <Coins className="w-4 h-4 text-emerald-500" />;
      case 'credit_card':
        return <CreditCard className="w-4 h-4 text-rose-500" />;
      case 'upi':
      case 'wallet':
        return <Smartphone className="w-4 h-4 text-sky-500" />;
      default:
        return <Wallet className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Wallet className="w-6 h-6 text-amber-500" />
            <span>Liquid Accounts & Wallets</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your bank accounts, cash reserves, credit cards, and custodial holdings
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={async () => {
              setIsLoadingDemo(true);
              try {
                await loadDemoData();
              } finally {
                setIsLoadingDemo(false);
              }
            }}
            variant="outline"
            size="sm"
            isLoading={isLoadingDemo}
          >
            <Database className="w-3.5 h-3.5 mr-1 text-pine-600" />
            <span>Load Demo Accounts</span>
          </Button>

          <Button
            onClick={async () => {
              if (window.confirm('Recalculate and reconcile all account balances based on your complete transaction ledger?')) {
                setIsReconciling(true);
                try {
                  await reconcileAccounts();
                } finally {
                  setIsReconciling(false);
                }
              }
            }}
            variant="outline"
            size="sm"
            isLoading={isReconciling}
            title="Recalculate balances from ledger"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1 text-pine-600" />
            <span>Reconcile</span>
          </Button>

          <Button
            onClick={() => setIsQuickAddOpen(true)}
            variant="secondary"
            size="sm"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 mr-1" />
            <span>Transfer Funds</span>
          </Button>

          <Button
            onClick={() => {
              setAccountToEdit(undefined);
              setIsAccountModalOpen(true);
            }}
            variant="primary"
            size="sm"
          >
            <Plus className="w-3.5 h-3.5 mr-1 stroke-[2.5]" />
            <span>Add Account</span>
          </Button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Surface className="p-4 sm:p-5">
          <span className="text-xs font-semibold text-ink/50 uppercase tracking-wider block">
            Gross Liquid Balance
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink mt-1 tabular-nums font-mono">
            <AnimatedNumber
              value={totalBalance}
              currency={baseCurrency}
              numberFormat={numberFormat}
              isPrivacyMode={isPrivacyMode}
            />
          </div>
          <span className="text-[11px] text-ink/40 mt-1 block">
            {accounts.length} active enclaves registered
          </span>
        </Surface>

        <Surface className="p-4 sm:p-5">
          <span className="text-xs font-semibold text-skyx-600 dark:text-skyx-400 uppercase tracking-wider block">
            Holding for Others
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-skyx-600 dark:text-skyx-400 mt-1 tabular-nums font-mono">
            <AnimatedNumber
              value={totalHeldAcrossAccounts}
              currency={baseCurrency}
              numberFormat={numberFormat}
              isPrivacyMode={isPrivacyMode}
            />
          </div>
          <span className="text-[11px] text-skyx-600/70 dark:text-skyx-400/70 mt-1 block">
            Custodial funds in your accounts
          </span>
        </Surface>

        <Surface className="p-4 sm:p-5">
          <span className="text-xs font-semibold text-pine-700 dark:text-pine-400 uppercase tracking-wider block">
            Net Unencumbered Cash
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-pine-700 dark:text-pine-400 mt-1 tabular-nums font-mono">
            <AnimatedNumber
              value={Math.max(0, totalBalance - totalHeldAcrossAccounts)}
              currency={baseCurrency}
              numberFormat={numberFormat}
              isPrivacyMode={isPrivacyMode}
            />
          </div>
          <span className="text-[11px] text-pine-700/60 dark:text-pine-400/60 mt-1 block">
            Your true spendable liquidity
          </span>
        </Surface>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-moss/80 rounded-xl border border-line">
          {[
            { id: 'all', label: 'All Accounts' },
            { id: 'bank', label: 'Bank' },
            { id: 'cash', label: 'Cash' },
            { id: 'credit_card', label: 'Credit Cards' },
            { id: 'wallet', label: 'Wallets / UPI' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTypeFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedTypeFilter === tab.id
                  ? 'bg-card text-ink font-bold shadow-xs border border-line'
                  : 'text-ink/60 hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 p-1 bg-moss/80 rounded-xl border border-line">
          {[
            { id: 'all', label: 'All Tags' },
            { id: 'personal', label: 'Personal' },
            { id: 'household', label: 'Household' },
          ].map((tagTab) => (
            <button
              key={tagTab.id}
              onClick={() => setSelectedTagFilter(tagTab.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedTagFilter === tagTab.id
                  ? 'bg-card text-ink font-bold shadow-xs border border-line'
                  : 'text-ink/60 hover:text-ink'
              }`}
            >
              {tagTab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Accounts Grid */}
      {filteredAccounts.length === 0 ? (
        <Card className="text-center py-12 text-ink/50 text-xs space-y-3">
          <Wallet className="w-10 h-10 mx-auto text-pine-600/40" />
          <div>
            <p className="font-bold text-ink text-sm">No accounts found</p>
            <p className="text-[11px] text-ink/50 mt-0.5">Add an account or load realistic demo accounts to explore.</p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              onClick={async () => {
                setIsLoadingDemo(true);
                try {
                  await loadDemoData();
                } finally {
                  setIsLoadingDemo(false);
                }
              }}
              variant="outline"
              size="sm"
              isLoading={isLoadingDemo}
            >
              <Database className="w-3.5 h-3.5 mr-1 text-pine-600" />
              <span>Load Demo Accounts</span>
            </Button>
            <Button
              onClick={() => {
                setAccountToEdit(undefined);
                setIsAccountModalOpen(true);
              }}
              variant="primary"
              size="sm"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>Add Account</span>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAccounts.map((account) => {
            const heldAmount = accountHeldMap.get(account.id) || 0;
            const ownFunds = account.balance - heldAmount;
            const sparklineData = accountSparklines.get(account.id) || [account.balance, account.balance];
            const isCredit = account.type === 'credit_card';

            return (
              <div
                key={account.id}
                className="rounded-2xl border border-line bg-card p-4 sm:p-5 space-y-3.5 flex flex-col justify-between shadow-sm lift"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 grid place-items-center text-pine-600 shrink-0">
                        {getAccountTypeIcon(account.type)}
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-sm font-bold font-display text-ink truncate">
                          {account.name}
                        </h2>
                        <div className="flex items-center gap-1.5 text-[11px] text-ink/50">
                          {account.institutionName && <span className="truncate">{account.institutionName}</span>}
                          {account.accountNumberLast4 && (
                            <span>• **{account.accountNumberLast4}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => handleToggleVisibility(account)}
                        title={account.isVisibleOnDashboard ? 'Visible on dashboard' : 'Hidden on dashboard'}
                        className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                          account.isVisibleOnDashboard
                            ? 'text-ink/40 hover:text-ink'
                            : 'text-mari-600 bg-mari-100/50'
                        }`}
                        aria-label="Toggle Dashboard Visibility"
                      >
                        {account.isVisibleOnDashboard ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(account)}
                        className="p-1.5 rounded-lg text-ink/40 hover:text-ink transition-colors cursor-pointer"
                        title="Edit Account"
                        aria-label="Edit Account"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(account.id, account.name)}
                        className="p-1.5 rounded-lg text-ink/40 hover:text-flare-600 transition-colors cursor-pointer"
                        title="Delete Account"
                        aria-label="Delete Account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Balance Display + Micro-Sparkline */}
                  <div className="pt-2 flex items-end justify-between gap-3">
                    <div>
                      <span className="text-[10px] text-ink/45 font-bold uppercase tracking-wider block">
                        Total Balance
                      </span>
                      <div
                        className={`text-2xl font-extrabold font-display tabular-nums num mt-0.5 ${
                          isCredit && account.balance < 0 ? 'text-flare-600' : 'text-ink'
                        }`}
                      >
                        <AnimatedNumber
                          value={account.balance}
                          currency={account.currency}
                          numberFormat={numberFormat}
                          isPrivacyMode={isPrivacyMode}
                        />
                      </div>
                    </div>

                    {/* 7-day sparkline */}
                    <div className="pb-1">
                      <Sparkline
                        data={sparklineData}
                        width={76}
                        height={26}
                        color={account.balance >= 0 ? 'emerald' : 'rose'}
                      />
                    </div>
                  </div>

                  {/* Custodial Holding Pill if holding money for someone */}
                  {heldAmount > 0 && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-mari-100/70 dark:bg-mari-950/40 border border-mari-400/35 text-xs space-y-1">
                      <div className="flex items-center justify-between font-semibold text-mari-700 dark:text-mari-300 text-[11px]">
                        <span className="flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" />
                          Holding for Others:
                        </span>
                        <span className="font-mono tabular-nums num font-bold">
                          <AnimatedNumber
                            value={heldAmount}
                            currency={account.currency}
                            numberFormat={numberFormat}
                            isPrivacyMode={isPrivacyMode}
                          />
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-ink/50 pt-1 border-t border-mari-400/20">
                        <span>Your Unencumbered Portion:</span>
                        <span className="font-mono font-bold text-ink tabular-nums num">
                          <AnimatedNumber
                            value={ownFunds}
                            currency={account.currency}
                            numberFormat={numberFormat}
                            isPrivacyMode={isPrivacyMode}
                          />
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Badges footer */}
                <div className="pt-2.5 border-t border-line flex items-center justify-between text-xs">
                  <Badge tone={account.tag === 'household' ? 'sky' : 'gray'} size="xs">
                    {account.tag === 'household' ? 'Household' : 'Personal'}
                  </Badge>
                  <span className="text-[11px] text-ink/50 font-medium capitalize">
                    {account.type.replace('_', ' ')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Account Modal */}
      {isAccountModalOpen && (
        <AccountModal
          isOpen={isAccountModalOpen}
          onClose={() => setIsAccountModalOpen(false)}
          accountToEdit={accountToEdit}
        />
      )}

      {/* Quick Add / Transfer Modal */}
      {isQuickAddOpen && (
        <QuickAddModal
          isOpen={isQuickAddOpen}
          onClose={() => setIsQuickAddOpen(false)}
          initialType="transfer"
        />
      )}
    </div>
  );
};
