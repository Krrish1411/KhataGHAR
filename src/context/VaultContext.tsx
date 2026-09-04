import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type {
  Account,
  Transaction,
  Category,
  PeopleLedgerEntry,
  Budget,
  SavingsGoal,
  Asset,
  AssetTranche,
  Liability,
  DocumentRecord,
  PlannedExpense,
  VaultMeta,
  SettlementRecord,
  ValuationLog,
} from '../types';
import { useAuth } from './AuthContext';
import { db } from '../db';
import {
  saveEncryptedRecord,
  bulkSaveEncryptedRecords,
  deleteRecord,
  generateUUID,
} from '../services/storage';
import { decryptData } from '../services/crypto';
import { generateDemoDataset } from '../services/demoData';

interface VaultContextType {
  // Active Vault Meta
  activeVault: VaultMeta | null;

  // Demo Data Seeder
  loadDemoData: () => Promise<void>;

  // In-Memory Data
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  peopleLedger: PeopleLedgerEntry[];
  budgets: Budget[];
  goals: SavingsGoal[];
  assets: Asset[];
  liabilities: Liability[];
  documents: DocumentRecord[];
  plannedExpenses: PlannedExpense[];
  isDecrypting: boolean;

  // Account Operations
  addAccount: (account: Omit<Account, 'id' | 'vaultId' | 'updatedAt'>) => Promise<Account>;
  updateAccount: (account: Account) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  reconcileAccounts: () => Promise<void>;

  // Transaction Operations
  addTransaction: (tx: Omit<Transaction, 'id' | 'vaultId' | 'updatedAt'>) => Promise<Transaction>;
  updateTransaction: (tx: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  bulkAddTransactions: (txs: Array<Omit<Transaction, 'id' | 'vaultId' | 'updatedAt'>>) => Promise<void>;
  undoImport: (importBatchId: string) => Promise<number>;

  // Category Operations
  addCategory: (cat: Omit<Category, 'id' | 'vaultId' | 'updatedAt'>) => Promise<Category>;
  updateCategory: (cat: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // People Ledger Operations
  addPeopleEntry: (entry: Omit<PeopleLedgerEntry, 'id' | 'vaultId' | 'updatedAt' | 'settlements' | 'status'>) => Promise<PeopleLedgerEntry>;
  updatePeopleEntry: (entry: PeopleLedgerEntry) => Promise<void>;
  updateContactProfile: (
    oldName: string,
    newDetails: { name: string; phone?: string; notes?: string }
  ) => Promise<void>;
  addSettlement: (entryId: string, settlement: Omit<SettlementRecord, 'id'>) => Promise<void>;
  deletePeopleEntry: (id: string) => Promise<void>;

  // Budget & Goal Operations
  addBudget: (budget: Omit<Budget, 'id' | 'vaultId' | 'updatedAt'>) => Promise<Budget>;
  updateBudget: (budget: Budget) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  addGoal: (goal: Omit<SavingsGoal, 'id' | 'vaultId' | 'updatedAt'>) => Promise<SavingsGoal>;
  updateGoal: (goal: SavingsGoal) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;

  // Planned Expenses Operations
  addPlannedExpense: (plan: Omit<PlannedExpense, 'id' | 'vaultId' | 'updatedAt'>) => Promise<PlannedExpense>;
  updatePlannedExpense: (id: string, updates: Partial<PlannedExpense>) => Promise<void>;
  deletePlannedExpense: (id: string) => Promise<void>;
  markPlanPaid: (planId: string, accountId: string, date: string) => Promise<void>;

  // Asset & Liability Operations
  addAsset: (asset: Omit<Asset, 'id' | 'vaultId' | 'updatedAt' | 'valuationHistory'>) => Promise<Asset>;
  updateAsset: (asset: Asset) => Promise<void>;
  addValuationLog: (assetId: string, log: Omit<ValuationLog, 'id'>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  addAssetTranche: (assetId: string, tranche: Omit<AssetTranche, 'id'>) => Promise<void>;
  deleteAssetTranche: (assetId: string, trancheId: string) => Promise<void>;
  updateAssetUnitPrice: (assetId: string, newUnitPrice: number) => Promise<void>;
  sellAsset: (assetId: string, params: {
    unitsSold: number;
    salePricePerUnit?: number;
    totalProceeds: number;
    accountId: string;
    date: string;
    note?: string;
  }) => Promise<void>;
  recordDividend: (assetId: string, params: {
    amount: number;
    accountId: string;
    date: string;
    note?: string;
  }) => Promise<void>;

  // Liability Operations
  addLiability: (liability: Omit<Liability, 'id' | 'vaultId' | 'updatedAt'>) => Promise<Liability>;
  updateLiability: (liability: Liability) => Promise<void>;
  deleteLiability: (id: string) => Promise<void>;

  // Document Operations
  addDocument: (doc: Omit<DocumentRecord, 'id' | 'vaultId' | 'createdAt' | 'updatedAt'>) => Promise<DocumentRecord>;
  deleteDocument: (id: string) => Promise<void>;

  // Vault Settings Operations
  updateVaultSettings: (updatedSettings: Partial<VaultMeta>) => Promise<void>;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeVault, sessionKey, isUnlocked, isDecoyMode, setActiveVaultMeta, refreshVaultList } = useAuth();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [peopleLedger, setPeopleLedger] = useState<PeopleLedgerEntry[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [plannedExpenses, setPlannedExpenses] = useState<PlannedExpense[]>([]);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);

  // Synchronous refs to prevent stale closure bugs during multi-step batch / import loops
  const accountsRef = useRef<Account[]>(accounts);
  accountsRef.current = accounts;
  const transactionsRef = useRef<Transaction[]>(transactions);
  transactionsRef.current = transactions;
  const peopleLedgerRef = useRef<PeopleLedgerEntry[]>(peopleLedger);
  peopleLedgerRef.current = peopleLedger;
  const assetsRef = useRef<Asset[]>(assets);
  assetsRef.current = assets;
  const liabilitiesRef = useRef<Liability[]>(liabilities);
  liabilitiesRef.current = liabilities;

  // Load and decrypt records whenever activeVault and sessionKey change
  const loadVaultData = useCallback(async () => {
    if (!activeVault || !sessionKey) {
      setAccounts([]);
      setTransactions([]);
      setCategories([]);
      setPeopleLedger([]);
      setBudgets([]);
      setGoals([]);
      setAssets([]);
      setLiabilities([]);
      setDocuments([]);
      setPlannedExpenses([]);
      return;
    }

    if (isDecoyMode) {
      if (activeVault.decoyConfig?.encryptedSnapshot) {
        try {
          const snapshot = await decryptData<{
            accounts: Account[];
            transactions: Transaction[];
            categories: Category[];
          }>(
            activeVault.decoyConfig.encryptedSnapshot.iv,
            activeVault.decoyConfig.encryptedSnapshot.ciphertext,
            sessionKey
          );
          if (snapshot && snapshot.accounts && snapshot.accounts.length > 0) {
            setAccounts(snapshot.accounts);
            setTransactions(snapshot.transactions || []);
            setCategories(snapshot.categories && snapshot.categories.length > 0 ? snapshot.categories : categories);
            setPeopleLedger([]);
            setBudgets([]);
            setGoals([]);
            setAssets([]);
            setLiabilities([]);
            setDocuments([]);
            setPlannedExpenses([]);
            setIsDecrypting(false);
            return;
          }
        } catch (err) {
          console.warn('Could not decrypt decoy snapshot, using realistic pocket fallback', err);
        }
      }

      // Robust fallback: realistic pocket balance & expenses (never shows 0!)
      const todayStr = new Date().toISOString().split('T')[0];
      const cur = activeVault.currency || 'INR';
      setAccounts([
        {
          id: 'decoy-acc-1',
          vaultId: activeVault.id,
          name: 'Daily Wallet / Cash',
          type: 'wallet',
          currency: cur,
          balance: 1850,
          isVisibleOnDashboard: true,
          tag: 'personal',
          updatedAt: todayStr,
        },
        {
          id: 'decoy-acc-2',
          vaultId: activeVault.id,
          name: 'Primary Savings Bank',
          type: 'bank',
          currency: cur,
          balance: 4200,
          isVisibleOnDashboard: true,
          tag: 'personal',
          updatedAt: todayStr,
        },
      ]);
      const dCats: Category[] = [
        { id: 'decoy-c-1', vaultId: activeVault.id, name: 'Food & Groceries', type: 'expense', color: '#12855a', icon: 'shopping-cart', isEssential: true, updatedAt: todayStr },
        { id: 'decoy-c-2', vaultId: activeVault.id, name: 'Commute & Fuel', type: 'expense', color: '#0284c7', icon: 'car', isEssential: true, updatedAt: todayStr },
        { id: 'decoy-c-3', vaultId: activeVault.id, name: 'Chai & Snacks', type: 'expense', color: '#d97706', icon: 'coffee', isEssential: false, updatedAt: todayStr },
        { id: 'decoy-c-4', vaultId: activeVault.id, name: 'Pocket Allowance', type: 'income', color: '#16a34a', icon: 'wallet', isEssential: true, updatedAt: todayStr },
      ];
      setCategories(dCats);
      setTransactions([
        { id: 'decoy-t-1', vaultId: activeVault.id, date: todayStr, amount: 45, type: 'expense', currency: cur, accountId: 'decoy-acc-1', categoryId: 'decoy-c-3', note: 'Chai & snacks', updatedAt: todayStr },
        { id: 'decoy-t-2', vaultId: activeVault.id, date: todayStr, amount: 160, type: 'expense', currency: cur, accountId: 'decoy-acc-1', categoryId: 'decoy-c-1', note: 'Vegetables & milk', updatedAt: todayStr },
        { id: 'decoy-t-3', vaultId: activeVault.id, date: new Date(Date.now() - 86400000).toISOString().split('T')[0], amount: 50, type: 'expense', currency: cur, accountId: 'decoy-acc-1', categoryId: 'decoy-c-2', note: 'Metro recharge', updatedAt: todayStr },
        { id: 'decoy-t-4', vaultId: activeVault.id, date: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0], amount: 3500, type: 'income', currency: cur, accountId: 'decoy-acc-2', categoryId: 'decoy-c-4', note: 'Monthly allowance', updatedAt: todayStr },
      ]);
      setPeopleLedger([]);
      setBudgets([{ id: 'decoy-b-1', vaultId: activeVault.id, categoryId: 'decoy-c-1', amount: 2500, period: 'monthly', rollover: false, updatedAt: todayStr }]);
      setGoals([]);
      setAssets([]);
      setLiabilities([]);
      setDocuments([]);
      setPlannedExpenses([]);
      setIsDecrypting(false);
      return;
    }

    setIsDecrypting(true);
    try {
      const records = await db.records.where('vaultId').equals(activeVault.id).toArray();

      const accs: Account[] = [];
      const txs: Transaction[] = [];
      const cats: Category[] = [];
      const people: PeopleLedgerEntry[] = [];
      const bdgs: Budget[] = [];
      const gls: SavingsGoal[] = [];
      const asts: Asset[] = [];
      const liabs: Liability[] = [];
      const docs: DocumentRecord[] = [];
      const plans: PlannedExpense[] = [];

      await Promise.all(
        records.map(async (row) => {
          try {
            switch (row.type) {
              case 'account':
                accs.push(await decryptData<Account>(row.iv, row.ciphertext, sessionKey));
                break;
              case 'transaction':
                txs.push(await decryptData<Transaction>(row.iv, row.ciphertext, sessionKey));
                break;
              case 'category':
                cats.push(await decryptData<Category>(row.iv, row.ciphertext, sessionKey));
                break;
              case 'people':
                people.push(await decryptData<PeopleLedgerEntry>(row.iv, row.ciphertext, sessionKey));
                break;
              case 'budget':
                bdgs.push(await decryptData<Budget>(row.iv, row.ciphertext, sessionKey));
                break;
              case 'goal':
                gls.push(await decryptData<SavingsGoal>(row.iv, row.ciphertext, sessionKey));
                break;
              case 'asset':
                asts.push(await decryptData<Asset>(row.iv, row.ciphertext, sessionKey));
                break;
              case 'liability':
                liabs.push(await decryptData<Liability>(row.iv, row.ciphertext, sessionKey));
                break;
              case 'document':
                docs.push(await decryptData<DocumentRecord>(row.iv, row.ciphertext, sessionKey));
                break;
              case 'plan':
                plans.push(await decryptData<PlannedExpense>(row.iv, row.ciphertext, sessionKey));
                break;
            }
          } catch (err) {
            console.error(`Failed to decrypt record ${row.id}:`, err);
          }
        })
      );

      // Sort transactions descending by date
      txs.sort((a, b) => b.date.localeCompare(a.date));

      setAccounts(accs);
      setTransactions(txs);
      setCategories(cats);
      setPeopleLedger(people);
      setBudgets(bdgs);
      setGoals(gls);
      setAssets(asts);
      setLiabilities(liabs);
      setDocuments(docs);
      setPlannedExpenses(plans);
    } catch (err) {
      console.error('Error loading vault data:', err);
    } finally {
      setIsDecrypting(false);
    }
  }, [activeVault, sessionKey, isDecoyMode]);

  useEffect(() => {
    if (isUnlocked) {
      loadVaultData();
    }
  }, [isUnlocked, loadVaultData]);

  // Account Operations
  const addAccount = async (data: Omit<Account, 'id' | 'vaultId' | 'updatedAt'>): Promise<Account> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const newAccount: Account = {
      ...data,
      balance: typeof data.balance === 'number' && !isNaN(data.balance) ? data.balance : 0,
      initialBalance: typeof data.initialBalance === 'number' && !isNaN(data.initialBalance) ? data.initialBalance : (data.balance || 0),
      id: generateUUID(),
      vaultId: activeVault.id,
      updatedAt: new Date().toISOString(),
    };
    setAccounts((prev) => [...prev, newAccount]);
    await saveEncryptedRecord('account', newAccount, sessionKey);
    return newAccount;
  };

  const updateAccount = async (account: Account): Promise<void> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const updated = { ...account, updatedAt: new Date().toISOString() };
    setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    await saveEncryptedRecord('account', updated, sessionKey);
  };

  const deleteAccount = async (id: string): Promise<void> => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    await deleteRecord(id);
  };

  // Financial arithmetic precision helper (avoids floating-point errors like 0.1 + 0.2 = 0.30000000000000004)
  const round2 = (num: number): number => Math.round((num + Number.EPSILON) * 100) / 100;

  // Reconcile and recalculate current account balances from the complete transaction ledger and people records
  const reconcileAccounts = async (): Promise<void> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');

    // 1. Calculate ledger deltas for each account
    const calculatedDeltas: Record<string, number> = {};

    transactions.forEach((tx) => {
      const amt = round2(Math.abs(Number(tx.amount))) || 0;
      const sourceAcc = accounts.find((a) => a.id === tx.accountId);
      const sourceAsOf = sourceAcc?.balanceAsOfDate || '1970-01-01';

      if (tx.date > sourceAsOf) {
        if (tx.type === 'expense') {
          calculatedDeltas[tx.accountId] = (calculatedDeltas[tx.accountId] || 0) - amt;
        } else if (tx.type === 'income') {
          calculatedDeltas[tx.accountId] = (calculatedDeltas[tx.accountId] || 0) + amt;
        } else if (tx.type === 'transfer') {
          calculatedDeltas[tx.accountId] = (calculatedDeltas[tx.accountId] || 0) - amt;
        }
      }

      if (tx.type === 'transfer' && tx.toAccountId) {
        const destAcc = accounts.find((a) => a.id === tx.toAccountId);
        const destAsOf = destAcc?.balanceAsOfDate || '1970-01-01';
        if (tx.date > destAsOf) {
          calculatedDeltas[tx.toAccountId] = (calculatedDeltas[tx.toAccountId] || 0) + amt;
        }
      }
    });

    peopleLedger.forEach((entry) => {
      if (entry.accountId) {
        const acc = accounts.find((a) => a.id === entry.accountId);
        const asOf = acc?.balanceAsOfDate || '1970-01-01';
        if (entry.date > asOf) {
          const delta = entry.type === 'lent' ? -entry.amount : entry.amount;
          calculatedDeltas[entry.accountId] = (calculatedDeltas[entry.accountId] || 0) + delta;
        }
      }
      (entry.settlements || []).forEach((s) => {
        if (s.accountId) {
          const acc = accounts.find((a) => a.id === s.accountId);
          const asOf = acc?.balanceAsOfDate || '1970-01-01';
          if (s.date > asOf) {
            const sDelta = entry.type === 'lent' ? s.amount : -s.amount;
            calculatedDeltas[s.accountId] = (calculatedDeltas[s.accountId] || 0) + sDelta;
          }
        }
      });
    });

    // 2. Recompute each account's balance from its baseline initialBalance
    const updatedAccs = accounts.map((acc) => {
      const delta = calculatedDeltas[acc.id] || 0;
      const initial = acc.initialBalance !== undefined ? acc.initialBalance : round2(acc.balance - delta);
      const newBal = round2(initial + delta);
      return {
        ...acc,
        initialBalance: initial,
        balance: newBal,
        updatedAt: new Date().toISOString(),
      };
    });

    setAccounts(updatedAccs);
    for (const a of updatedAccs) {
      await saveEncryptedRecord('account', a, sessionKey);
    }
  };

  // Transaction Operations
  const addTransaction = async (data: Omit<Transaction, 'id' | 'vaultId' | 'updatedAt'>): Promise<Transaction> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const validAmount = round2(Math.abs(Number(data.amount)));
    const newTx: Transaction = {
      ...data,
      amount: validAmount,
      id: generateUUID(),
      vaultId: activeVault.id,
      updatedAt: new Date().toISOString(),
    };

    // Update in-memory state & sort
    setTransactions((prev) => [newTx, ...prev].sort((a, b) => b.date.localeCompare(a.date)));

    // Update connected account balances with precise 2-decimal rounding
    if (newTx.type === 'expense') {
      setAccounts((prev) =>
        prev.map((acc) => {
          if (acc.id === newTx.accountId) {
            const asOf = acc.balanceAsOfDate || '1970-01-01';
            if (newTx.date <= asOf) return acc;
            const updated = { ...acc, balance: round2(acc.balance - newTx.amount), updatedAt: new Date().toISOString() };
            saveEncryptedRecord('account', updated, sessionKey);
            return updated;
          }
          return acc;
        })
      );
    } else if (newTx.type === 'income') {
      setAccounts((prev) =>
        prev.map((acc) => {
          if (acc.id === newTx.accountId) {
            const asOf = acc.balanceAsOfDate || '1970-01-01';
            if (newTx.date <= asOf) return acc;
            const updated = { ...acc, balance: round2(acc.balance + newTx.amount), updatedAt: new Date().toISOString() };
            saveEncryptedRecord('account', updated, sessionKey);
            return updated;
          }
          return acc;
        })
      );
    } else if (newTx.type === 'transfer' && newTx.toAccountId) {
      setAccounts((prev) =>
        prev.map((acc) => {
          if (acc.id === newTx.accountId) {
            const asOf = acc.balanceAsOfDate || '1970-01-01';
            if (newTx.date <= asOf) return acc;
            const updated = { ...acc, balance: round2(acc.balance - newTx.amount), updatedAt: new Date().toISOString() };
            saveEncryptedRecord('account', updated, sessionKey);
            return updated;
          }
          if (acc.id === newTx.toAccountId) {
            const asOf = acc.balanceAsOfDate || '1970-01-01';
            if (newTx.date <= asOf) return acc;
            const updated = { ...acc, balance: round2(acc.balance + newTx.amount), updatedAt: new Date().toISOString() };
            saveEncryptedRecord('account', updated, sessionKey);
            return updated;
          }
          return acc;
        })
      );
    }

    // If linked to an Asset (Investment / SIP / Asset purchase)
    if (newTx.linkedAssetId) {
      const targetAsset = assetsRef.current.find((a) => a.id === newTx.linkedAssetId);
      if (targetAsset) {
        const trancheId = generateUUID();
        newTx.trancheId = trancheId;
        const trancheUnits = (newTx as any).units || undefined;
        const trancheUnitPrice = (newTx as any).unitPrice || undefined;

        const newTranche: AssetTranche = {
          id: trancheId,
          date: newTx.date,
          amount: newTx.amount,
          units: trancheUnits,
          unitPrice: trancheUnitPrice,
          transactionId: newTx.id,
          note: newTx.note,
        };

        const updatedTranches = [...(targetAsset.tranches || []), newTranche];
        const newTotalUnits = (targetAsset.totalUnits || 0) + (trancheUnits || 0);
        let newCurrentVal = round2(targetAsset.currentValue + newTx.amount);
        if (targetAsset.currentUnitPrice && newTotalUnits > 0) {
          newCurrentVal = round2(newTotalUnits * targetAsset.currentUnitPrice);
        }

        const updatedAsset: Asset = {
          ...targetAsset,
          tranches: updatedTranches,
          totalUnits: newTotalUnits > 0 ? newTotalUnits : undefined,
          currentValue: newCurrentVal,
          purchasePrice: round2((targetAsset.purchasePrice || 0) + newTx.amount),
          updatedAt: new Date().toISOString(),
        };

        assetsRef.current = assetsRef.current.map((a) => (a.id === updatedAsset.id ? updatedAsset : a));
        setAssets(assetsRef.current);
        await saveEncryptedRecord('asset', updatedAsset, sessionKey);
      }
    }

    // If linked to a Liability (Debt payment / EMI / Prepayment)
    if (newTx.linkedLiabilityId) {
      const targetLiab = liabilitiesRef.current.find((l) => l.id === newTx.linkedLiabilityId);
      if (targetLiab) {
        const newOutstanding = Math.max(0, round2(targetLiab.outstandingBalance - newTx.amount));
        const updatedLiab: Liability = {
          ...targetLiab,
          outstandingBalance: newOutstanding,
          updatedAt: new Date().toISOString(),
        };

        liabilitiesRef.current = liabilitiesRef.current.map((l) => (l.id === updatedLiab.id ? updatedLiab : l));
        setLiabilities(liabilitiesRef.current);
        await saveEncryptedRecord('liability', updatedLiab, sessionKey);
      }
    }

    // If transaction has Splits with linked assets or liabilities
    if (newTx.splits && newTx.splits.length > 0) {
      for (const sp of newTx.splits) {
        if (sp.linkedAssetId && sp.amount > 0) {
          const targetAsset = assets.find((a) => a.id === sp.linkedAssetId);
          if (targetAsset) {
            const trancheId = generateUUID();
            const newTranche: AssetTranche = {
              id: trancheId,
              date: newTx.date,
              amount: sp.amount,
              transactionId: newTx.id,
              note: sp.note || newTx.note || 'Split Allocation',
            };
            const updatedTranches = [...(targetAsset.tranches || []), newTranche];
            const updatedAsset: Asset = {
              ...targetAsset,
              tranches: updatedTranches,
              currentValue: round2(targetAsset.currentValue + sp.amount),
              purchasePrice: round2((targetAsset.purchasePrice || 0) + sp.amount),
              updatedAt: new Date().toISOString(),
            };
            setAssets((prev) => prev.map((a) => (a.id === updatedAsset.id ? updatedAsset : a)));
            await saveEncryptedRecord('asset', updatedAsset, sessionKey);
          }
        }
        if (sp.linkedLiabilityId && sp.amount > 0) {
          const targetLiab = liabilities.find((l) => l.id === sp.linkedLiabilityId);
          if (targetLiab) {
            const newOutstanding = Math.max(0, round2(targetLiab.outstandingBalance - sp.amount));
            const updatedLiab: Liability = {
              ...targetLiab,
              outstandingBalance: newOutstanding,
              updatedAt: new Date().toISOString(),
            };
            setLiabilities((prev) => prev.map((l) => (l.id === updatedLiab.id ? updatedLiab : l)));
            await saveEncryptedRecord('liability', updatedLiab, sessionKey);
          }
        }
      }
    }

    await saveEncryptedRecord('transaction', newTx, sessionKey);
    return newTx;
  };

  const updateTransaction = async (tx: Transaction): Promise<void> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const validAmount = round2(Math.abs(Number(tx.amount)));
    const updated: Transaction = {
      ...tx,
      amount: validAmount,
      updatedAt: new Date().toISOString(),
    };

    const oldTx = transactions.find((t) => t.id === tx.id);
    if (oldTx) {
      const balanceDeltas: Record<string, number> = {};

      // 1. Reverse old transaction's financial effect
      if (oldTx.type === 'expense') {
        balanceDeltas[oldTx.accountId] = (balanceDeltas[oldTx.accountId] || 0) + oldTx.amount;
      } else if (oldTx.type === 'income') {
        balanceDeltas[oldTx.accountId] = (balanceDeltas[oldTx.accountId] || 0) - oldTx.amount;
      } else if (oldTx.type === 'transfer' && oldTx.toAccountId) {
        balanceDeltas[oldTx.accountId] = (balanceDeltas[oldTx.accountId] || 0) + oldTx.amount;
        balanceDeltas[oldTx.toAccountId] = (balanceDeltas[oldTx.toAccountId] || 0) - oldTx.amount;
      }

      // 2. Apply updated transaction's financial effect
      if (updated.type === 'expense') {
        balanceDeltas[updated.accountId] = (balanceDeltas[updated.accountId] || 0) - updated.amount;
      } else if (updated.type === 'income') {
        balanceDeltas[updated.accountId] = (balanceDeltas[updated.accountId] || 0) + updated.amount;
      } else if (updated.type === 'transfer' && updated.toAccountId) {
        balanceDeltas[updated.accountId] = (balanceDeltas[updated.accountId] || 0) - updated.amount;
        balanceDeltas[updated.toAccountId] = (balanceDeltas[updated.toAccountId] || 0) + updated.amount;
      }

      // 3. Apply net non-zero balance changes to accounts
      const changedIds = Object.keys(balanceDeltas).filter((accId) => Math.abs(balanceDeltas[accId]) > 0.0001);
      if (changedIds.length > 0) {
        setAccounts((prev) =>
          prev.map((acc) => {
            if (balanceDeltas[acc.id]) {
              const updatedAcc = {
                ...acc,
                balance: round2(acc.balance + balanceDeltas[acc.id]),
                updatedAt: new Date().toISOString(),
              };
              saveEncryptedRecord('account', updatedAcc, sessionKey);
              return updatedAcc;
            }
            return acc;
          })
        );
      }
    }

    setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)).sort((a, b) => b.date.localeCompare(a.date)));
    await saveEncryptedRecord('transaction', updated, sessionKey);
  };

  const deleteTransaction = async (id: string): Promise<void> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const txToDel = transactions.find((t) => t.id === id);

    if (txToDel) {
      // Mathematically reverse the transaction's effect on connected account(s)
      if (txToDel.type === 'expense') {
        // Deleting expense refunds money back to account
        setAccounts((prev) =>
          prev.map((acc) => {
            if (acc.id === txToDel.accountId) {
              const updated = { ...acc, balance: round2(acc.balance + txToDel.amount), updatedAt: new Date().toISOString() };
              saveEncryptedRecord('account', updated, sessionKey);
              return updated;
            }
            return acc;
          })
        );
      } else if (txToDel.type === 'income') {
        // Deleting income deducts money from account
        setAccounts((prev) =>
          prev.map((acc) => {
            if (acc.id === txToDel.accountId) {
              const updated = { ...acc, balance: round2(acc.balance - txToDel.amount), updatedAt: new Date().toISOString() };
              saveEncryptedRecord('account', updated, sessionKey);
              return updated;
            }
            return acc;
          })
        );
      } else if (txToDel.type === 'transfer' && txToDel.toAccountId) {
        // Deleting transfer refunds accountId and deducts toAccountId
        setAccounts((prev) =>
          prev.map((acc) => {
            if (acc.id === txToDel.accountId) {
              const updated = { ...acc, balance: round2(acc.balance + txToDel.amount), updatedAt: new Date().toISOString() };
              saveEncryptedRecord('account', updated, sessionKey);
              return updated;
            }
            if (acc.id === txToDel.toAccountId) {
              const updated = { ...acc, balance: round2(acc.balance - txToDel.amount), updatedAt: new Date().toISOString() };
              saveEncryptedRecord('account', updated, sessionKey);
              return updated;
            }
            return acc;
          })
        );
      }

      // If linked to an Asset, remove the tranche and adjust valuation/units
      if (txToDel.linkedAssetId) {
        const targetAsset = assets.find((a) => a.id === txToDel.linkedAssetId);
        if (targetAsset && targetAsset.tranches) {
          const trancheToRemove = targetAsset.tranches.find(
            (t) => t.id === txToDel.trancheId || t.transactionId === txToDel.id
          );
          const updatedTranches = targetAsset.tranches.filter(
            (t) => t.id !== txToDel.trancheId && t.transactionId !== txToDel.id
          );
          const unitsToSubtract = trancheToRemove?.units || 0;
          const newTotalUnits = Math.max(0, (targetAsset.totalUnits || 0) - unitsToSubtract);
          let newCurrentVal = Math.max(0, round2(targetAsset.currentValue - txToDel.amount));
          if (targetAsset.currentUnitPrice && newTotalUnits > 0) {
            newCurrentVal = round2(newTotalUnits * targetAsset.currentUnitPrice);
          }

          const updatedAsset: Asset = {
            ...targetAsset,
            tranches: updatedTranches,
            totalUnits: newTotalUnits > 0 ? newTotalUnits : undefined,
            currentValue: newCurrentVal,
            purchasePrice: Math.max(0, round2((targetAsset.purchasePrice || 0) - txToDel.amount)),
            updatedAt: new Date().toISOString(),
          };

          setAssets((prev) => prev.map((a) => (a.id === updatedAsset.id ? updatedAsset : a)));
          await saveEncryptedRecord('asset', updatedAsset, sessionKey);
        }
      }

      // If linked to a Liability, restore the debt balance
      if (txToDel.linkedLiabilityId) {
        const targetLiab = liabilities.find((l) => l.id === txToDel.linkedLiabilityId);
        if (targetLiab) {
          const updatedLiab: Liability = {
            ...targetLiab,
            outstandingBalance: round2(targetLiab.outstandingBalance + txToDel.amount),
            updatedAt: new Date().toISOString(),
          };

          setLiabilities((prev) => prev.map((l) => (l.id === updatedLiab.id ? updatedLiab : l)));
          await saveEncryptedRecord('liability', updatedLiab, sessionKey);
        }
      }

      // If transaction had splits, reverse split assets and liabilities
      if (txToDel.splits && txToDel.splits.length > 0) {
        for (const sp of txToDel.splits) {
          if (sp.linkedAssetId && sp.amount > 0) {
            const targetAsset = assets.find((a) => a.id === sp.linkedAssetId);
            if (targetAsset && targetAsset.tranches) {
              const updatedTranches = targetAsset.tranches.filter(
                (t) => t.transactionId !== txToDel.id
              );
              const updatedAsset: Asset = {
                ...targetAsset,
                tranches: updatedTranches,
                currentValue: Math.max(0, round2(targetAsset.currentValue - sp.amount)),
                purchasePrice: Math.max(0, round2((targetAsset.purchasePrice || 0) - sp.amount)),
                updatedAt: new Date().toISOString(),
              };
              setAssets((prev) => prev.map((a) => (a.id === updatedAsset.id ? updatedAsset : a)));
              await saveEncryptedRecord('asset', updatedAsset, sessionKey);
            }
          }
          if (sp.linkedLiabilityId && sp.amount > 0) {
            const targetLiab = liabilities.find((l) => l.id === sp.linkedLiabilityId);
            if (targetLiab) {
              const updatedLiab: Liability = {
                ...targetLiab,
                outstandingBalance: round2(targetLiab.outstandingBalance + sp.amount),
                updatedAt: new Date().toISOString(),
              };
              setLiabilities((prev) => prev.map((l) => (l.id === updatedLiab.id ? updatedLiab : l)));
              await saveEncryptedRecord('liability', updatedLiab, sessionKey);
            }
          }
        }
      }
    }

    setTransactions((prev) => prev.filter((t) => t.id !== id));
    await deleteRecord(id);
  };

  const bulkAddTransactions = async (
    items: Array<Omit<Transaction, 'id' | 'vaultId' | 'updatedAt'>>
  ): Promise<void> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const newTxs: Transaction[] = items.map((data) => ({
      ...data,
      amount: round2(Math.abs(Number(data.amount))),
      id: generateUUID(),
      vaultId: activeVault.id,
      updatedAt: new Date().toISOString(),
    }));

    setTransactions((prev) => [...newTxs, ...prev].sort((a, b) => b.date.localeCompare(a.date)));

    // Update balances including transfers (respecting account balanceAsOfDate baseline)
    const balanceDeltas: Record<string, number> = {};
    newTxs.forEach((tx) => {
      const sourceAcc = accounts.find((a) => a.id === tx.accountId);
      const sourceAsOf = sourceAcc?.balanceAsOfDate || '1970-01-01';

      if (tx.date > sourceAsOf) {
        if (tx.type === 'expense') {
          balanceDeltas[tx.accountId] = (balanceDeltas[tx.accountId] || 0) - tx.amount;
        } else if (tx.type === 'income') {
          balanceDeltas[tx.accountId] = (balanceDeltas[tx.accountId] || 0) + tx.amount;
        } else if (tx.type === 'transfer') {
          balanceDeltas[tx.accountId] = (balanceDeltas[tx.accountId] || 0) - tx.amount;
        }
      }

      if (tx.type === 'transfer' && tx.toAccountId) {
        const destAcc = accounts.find((a) => a.id === tx.toAccountId);
        const destAsOf = destAcc?.balanceAsOfDate || '1970-01-01';
        if (tx.date > destAsOf) {
          balanceDeltas[tx.toAccountId] = (balanceDeltas[tx.toAccountId] || 0) + tx.amount;
        }
      }
    });

    setAccounts((prev) =>
      prev.map((acc) => {
        if (balanceDeltas[acc.id]) {
          const updated = {
            ...acc,
            balance: round2(acc.balance + balanceDeltas[acc.id]),
            updatedAt: new Date().toISOString(),
          };
          saveEncryptedRecord('account', updated, sessionKey);
          return updated;
        }
        return acc;
      })
    );

    await bulkSaveEncryptedRecords('transaction', newTxs, sessionKey);
  };

  const undoImport = async (importBatchId: string): Promise<number> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const batchTxs = transactions.filter((t) => t.importBatchId === importBatchId);
    if (batchTxs.length === 0) return 0;

    // Calculate reverse balance deltas
    const balanceDeltas: Record<string, number> = {};
    for (const tx of batchTxs) {
      const amt = tx.amount;
      if (tx.type === 'expense') {
        balanceDeltas[tx.accountId] = (balanceDeltas[tx.accountId] || 0) + amt;
      } else if (tx.type === 'income') {
        balanceDeltas[tx.accountId] = (balanceDeltas[tx.accountId] || 0) - amt;
      } else if (tx.type === 'transfer' && tx.toAccountId) {
        balanceDeltas[tx.accountId] = (balanceDeltas[tx.accountId] || 0) + amt;
        balanceDeltas[tx.toAccountId] = (balanceDeltas[tx.toAccountId] || 0) - amt;
      }

      // Revert any linked asset tranches
      if (tx.linkedAssetId) {
        const asset = assets.find((a) => a.id === tx.linkedAssetId);
        if (asset && asset.tranches) {
          const updatedTranches = asset.tranches.filter(
            (tr) => tr.transactionId !== tx.id && tr.id !== tx.trancheId
          );
          const updatedAsset: Asset = {
            ...asset,
            tranches: updatedTranches,
            currentValue: Math.max(0, round2(asset.currentValue - tx.amount)),
            purchasePrice: Math.max(0, round2((asset.purchasePrice || 0) - tx.amount)),
            updatedAt: new Date().toISOString(),
          };
          setAssets((prev) => prev.map((a) => (a.id === updatedAsset.id ? updatedAsset : a)));
          await saveEncryptedRecord('asset', updatedAsset, sessionKey);
        }
      }

      // Revert any linked liability reductions
      if (tx.linkedLiabilityId) {
        const liab = liabilities.find((l) => l.id === tx.linkedLiabilityId);
        if (liab) {
          const updatedLiab: Liability = {
            ...liab,
            outstandingBalance: round2(liab.outstandingBalance + tx.amount),
            updatedAt: new Date().toISOString(),
          };
          setLiabilities((prev) => prev.map((l) => (l.id === updatedLiab.id ? updatedLiab : l)));
          await saveEncryptedRecord('liability', updatedLiab, sessionKey);
        }
      }
    }

    // Apply account balance reversions
    const changedAccIds = Object.keys(balanceDeltas);
    if (changedAccIds.length > 0) {
      setAccounts((prev) =>
        prev.map((acc) => {
          if (balanceDeltas[acc.id]) {
            const updated = {
              ...acc,
              balance: round2(acc.balance + balanceDeltas[acc.id]),
              updatedAt: new Date().toISOString(),
            };
            saveEncryptedRecord('account', updated, sessionKey);
            return updated;
          }
          return acc;
        })
      );
    }

    // Remove transactions from state and IndexedDB
    const batchTxIds = new Set(batchTxs.map((t) => t.id));
    setTransactions((prev) => prev.filter((t) => !batchTxIds.has(t.id)));

    for (const id of batchTxIds) {
      await deleteRecord(id);
    }

    return batchTxs.length;
  };

  // Category Operations
  const addCategory = async (data: Omit<Category, 'id' | 'vaultId' | 'updatedAt'>): Promise<Category> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const newCat: Category = {
      ...data,
      id: generateUUID(),
      vaultId: activeVault.id,
      updatedAt: new Date().toISOString(),
    };
    setCategories((prev) => [...prev, newCat]);
    await saveEncryptedRecord('category', newCat, sessionKey);
    return newCat;
  };

  const updateCategory = async (cat: Category): Promise<void> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const updated = { ...cat, updatedAt: new Date().toISOString() };
    setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    await saveEncryptedRecord('category', updated, sessionKey);
  };

  const deleteCategory = async (id: string): Promise<void> => {
    setCategories((prev) => prev.filter((c) => c.id !== id && c.parentId !== id));
    await deleteRecord(id);
  };

  // People Ledger Operations
  const addPeopleEntry = async (
    data: Omit<PeopleLedgerEntry, 'id' | 'vaultId' | 'updatedAt' | 'settlements' | 'status'>
  ): Promise<PeopleLedgerEntry> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const validAmount = round2(Math.abs(Number(data.amount || 0)));
    const newEntry: PeopleLedgerEntry = {
      ...data,
      amount: validAmount,
      id: generateUUID(),
      vaultId: activeVault.id,
      settlements: [],
      status: validAmount === 0 ? 'closed' : 'open',
      updatedAt: new Date().toISOString(),
    };

    peopleLedgerRef.current = [newEntry, ...peopleLedgerRef.current];
    setPeopleLedger(peopleLedgerRef.current);
    await saveEncryptedRecord('people', newEntry, sessionKey);

    // If an account is linked to this debt / loan, adjust account balance (respecting baseline date)
    if (data.accountId) {
      const acc = accountsRef.current.find((a) => a.id === data.accountId);
      const asOf = acc?.balanceAsOfDate || '1970-01-01';
      if (acc && data.date > asOf) {
        const delta = data.type === 'lent' ? -validAmount : validAmount;
        const updatedAcc = { ...acc, balance: round2(acc.balance + delta), updatedAt: new Date().toISOString() };
        accountsRef.current = accountsRef.current.map((a) => (a.id === updatedAcc.id ? updatedAcc : a));
        setAccounts(accountsRef.current);
        await saveEncryptedRecord('account', updatedAcc, sessionKey);
      }
    }

    return newEntry;
  };

  const updatePeopleEntry = async (entry: PeopleLedgerEntry): Promise<void> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const updated = { ...entry, amount: round2(Math.abs(Number(entry.amount))), updatedAt: new Date().toISOString() };
    peopleLedgerRef.current = peopleLedgerRef.current.map((p) => (p.id === updated.id ? updated : p));
    setPeopleLedger(peopleLedgerRef.current);
    await saveEncryptedRecord('people', updated, sessionKey);
  };

  const updateContactProfile = async (
    oldName: string,
    newDetails: { name: string; phone?: string; notes?: string }
  ): Promise<void> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const trimmedOld = oldName.trim().toLowerCase();
    const trimmedNew = newDetails.name.trim();

    const affected = peopleLedgerRef.current.filter(
      (e) => e.contactName.trim().toLowerCase() === trimmedOld
    );

    if (affected.length === 0) {
      // Create a directory profile if no entries exist
      await addPeopleEntry({
        contactName: trimmedNew,
        contactPhone: newDetails.phone?.trim() || undefined,
        notes: newDetails.notes?.trim() || undefined,
        amount: 0,
        type: 'holding',
        currency: activeVault.currency || 'INR',
        date: new Date().toISOString().split('T')[0],
      });
      return;
    }

    const updated = peopleLedgerRef.current.map((e) => {
      if (e.contactName.trim().toLowerCase() === trimmedOld) {
        return {
          ...e,
          contactName: trimmedNew,
          contactPhone: newDetails.phone !== undefined ? newDetails.phone.trim() || undefined : e.contactPhone,
          notes: newDetails.notes !== undefined ? newDetails.notes.trim() || undefined : e.notes,
          updatedAt: new Date().toISOString(),
        };
      }
      return e;
    });

    peopleLedgerRef.current = updated;
    setPeopleLedger(updated);

    for (const entry of updated) {
      if (entry.contactName.trim().toLowerCase() === trimmedNew.toLowerCase()) {
        await saveEncryptedRecord('people', entry, sessionKey);
      }
    }
  };

  const addSettlement = async (entryId: string, settlement: Omit<SettlementRecord, 'id'>): Promise<void> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const target = peopleLedgerRef.current.find((p) => p.id === entryId);
    if (!target) return;

    const validSettlementAmt = round2(Math.abs(Number(settlement.amount)));
    const newSettlement: SettlementRecord = {
      ...settlement,
      amount: validSettlementAmt,
      id: generateUUID(),
    };

    const newSettlements = [...target.settlements, newSettlement];
    const totalSettled = round2(newSettlements.reduce((sum, s) => sum + s.amount, 0));

    let newStatus: PeopleLedgerEntry['status'] = 'open';
    if (totalSettled >= target.amount) {
      newStatus = 'closed';
    } else if (totalSettled > 0) {
      newStatus = 'partially_settled';
    }

    const updatedEntry: PeopleLedgerEntry = {
      ...target,
      settlements: newSettlements,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    peopleLedgerRef.current = peopleLedgerRef.current.map((p) => (p.id === entryId ? updatedEntry : p));
    setPeopleLedger(peopleLedgerRef.current);
    await saveEncryptedRecord('people', updatedEntry, sessionKey);

    // If account was linked, adjust account balance (respecting baseline date)
    if (settlement.accountId) {
      const acc = accountsRef.current.find((a) => a.id === settlement.accountId);
      const asOf = acc?.balanceAsOfDate || '1970-01-01';
      if (acc && settlement.date > asOf) {
        // If lent money returned: +balance. If borrowed/held money paid back: -balance.
        const delta = target.type === 'lent' ? validSettlementAmt : -validSettlementAmt;
        const updatedAcc = { ...acc, balance: round2(acc.balance + delta), updatedAt: new Date().toISOString() };
        accountsRef.current = accountsRef.current.map((a) => (a.id === updatedAcc.id ? updatedAcc : a));
        setAccounts(accountsRef.current);
        await saveEncryptedRecord('account', updatedAcc, sessionKey);
      }
    }
  };

  const deletePeopleEntry = async (id: string): Promise<void> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const target = peopleLedgerRef.current.find((p) => p.id === id);

    if (target) {
      const balanceDeltas: Record<string, number> = {};

      // 1. Reverse initial principal if linked to an account
      if (target.accountId) {
        const revDelta = target.type === 'lent' ? target.amount : -target.amount;
        balanceDeltas[target.accountId] = (balanceDeltas[target.accountId] || 0) + revDelta;
      }

      // 2. Reverse each settlement
      (target.settlements || []).forEach((s) => {
        if (s.accountId) {
          const sRevDelta = target.type === 'lent' ? -s.amount : s.amount;
          balanceDeltas[s.accountId] = (balanceDeltas[s.accountId] || 0) + sRevDelta;
        }
      });

      // Apply deltas to accounts
      const changedIds = Object.keys(balanceDeltas).filter((aId) => Math.abs(balanceDeltas[aId]) > 0.0001);
      if (changedIds.length > 0) {
        accountsRef.current = accountsRef.current.map((acc) => {
          if (balanceDeltas[acc.id]) {
            const updatedAcc = {
              ...acc,
              balance: round2(acc.balance + balanceDeltas[acc.id]),
              updatedAt: new Date().toISOString(),
            };
            saveEncryptedRecord('account', updatedAcc, sessionKey);
            return updatedAcc;
          }
          return acc;
        });
        setAccounts(accountsRef.current);
      }
    }

    peopleLedgerRef.current = peopleLedgerRef.current.filter((p) => p.id !== id);
    setPeopleLedger(peopleLedgerRef.current);
    await deleteRecord(id);
  };

  // Budget & Goal Operations
  const addBudget = async (data: Omit<Budget, 'id' | 'vaultId' | 'updatedAt'>): Promise<Budget> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const newBudget: Budget = {
      ...data,
      id: generateUUID(),
      vaultId: activeVault.id,
      updatedAt: new Date().toISOString(),
    };
    setBudgets((prev) => [...prev, newBudget]);
    await saveEncryptedRecord('budget', newBudget, sessionKey);
    return newBudget;
  };

  const updateBudget = async (budget: Budget): Promise<void> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const updated = { ...budget, updatedAt: new Date().toISOString() };
    setBudgets((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    await saveEncryptedRecord('budget', updated, sessionKey);
  };

  const deleteBudget = async (id: string): Promise<void> => {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
    await deleteRecord(id);
  };

  const addGoal = async (data: Omit<SavingsGoal, 'id' | 'vaultId' | 'updatedAt'>): Promise<SavingsGoal> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const newGoal: SavingsGoal = {
      ...data,
      id: generateUUID(),
      vaultId: activeVault.id,
      updatedAt: new Date().toISOString(),
    };
    setGoals((prev) => [...prev, newGoal]);
    await saveEncryptedRecord('goal', newGoal, sessionKey);
    return newGoal;
  };

  const updateGoal = async (goal: SavingsGoal): Promise<void> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const updated = { ...goal, updatedAt: new Date().toISOString() };
    setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
    await saveEncryptedRecord('goal', updated, sessionKey);
  };

  const deleteGoal = async (id: string): Promise<void> => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    await deleteRecord(id);
  };

  // Planned Expense Operations
  const addPlannedExpense = async (
    data: Omit<PlannedExpense, 'id' | 'vaultId' | 'updatedAt'>
  ): Promise<PlannedExpense> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const newPlan: PlannedExpense = {
      ...data,
      id: generateUUID(),
      vaultId: activeVault.id,
      updatedAt: new Date().toISOString(),
    };
    setPlannedExpenses((prev) => [...prev, newPlan]);
    await saveEncryptedRecord('plan', newPlan, sessionKey);
    return newPlan;
  };

  const updatePlannedExpense = async (id: string, updates: Partial<PlannedExpense>): Promise<void> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const existing = plannedExpenses.find((p) => p.id === id);
    if (!existing) return;
    const updated: PlannedExpense = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    setPlannedExpenses((prev) => prev.map((p) => (p.id === id ? updated : p)));
    await saveEncryptedRecord('plan', updated, sessionKey);
  };

  const deletePlannedExpense = async (id: string): Promise<void> => {
    setPlannedExpenses((prev) => prev.filter((p) => p.id !== id));
    await deleteRecord(id);
  };

  const markPlanPaid = async (planId: string, accountId: string, date: string): Promise<void> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const plan = plannedExpenses.find((p) => p.id === planId);
    if (!plan) return;

    // 1. Record expense transaction in ledger
    await addTransaction({
      date,
      amount: plan.amount,
      type: 'expense',
      currency: activeVault.currency || 'INR',
      accountId,
      categoryId: plan.categoryId || undefined,
      note: `Paid: ${plan.name}`,
    });

    // 2. Advance recurrence or mark paid
    if (plan.recurrence === 'monthly') {
      const cur = new Date(plan.dueDate);
      cur.setMonth(cur.getMonth() + 1);
      const nextDue = cur.toISOString().split('T')[0];
      await updatePlannedExpense(planId, { dueDate: nextDue, paidDate: date });
    } else if (plan.recurrence === 'yearly') {
      const cur = new Date(plan.dueDate);
      cur.setFullYear(cur.getFullYear() + 1);
      const nextDue = cur.toISOString().split('T')[0];
      await updatePlannedExpense(planId, { dueDate: nextDue, paidDate: date });
    } else {
      await updatePlannedExpense(planId, { status: 'paid', paidDate: date });
    }
  };

  // Asset & Liability Operations
  const addAsset = async (
    data: Omit<Asset, 'id' | 'vaultId' | 'updatedAt' | 'valuationHistory'>
  ): Promise<Asset> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const newAsset: Asset = {
      ...data,
      id: generateUUID(),
      vaultId: activeVault.id,
      valuationHistory: [
        {
          id: generateUUID(),
          date: data.purchaseDate || new Date().toISOString().split('T')[0],
          value: data.currentValue,
          note: 'Initial Valuation',
        },
      ],
      updatedAt: new Date().toISOString(),
    };
    assetsRef.current = [...assetsRef.current, newAsset];
    setAssets(assetsRef.current);
    await saveEncryptedRecord('asset', newAsset, sessionKey);
    return newAsset;
  };

  const updateAsset = async (asset: Asset): Promise<void> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const updated = { ...asset, updatedAt: new Date().toISOString() };
    setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    await saveEncryptedRecord('asset', updated, sessionKey);
  };

  const addValuationLog = async (assetId: string, log: Omit<ValuationLog, 'id'>): Promise<void> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const asset = assets.find((a) => a.id === assetId);
    if (!asset) return;

    const newLog: ValuationLog = { ...log, id: generateUUID() };
    const updatedHistory = [...asset.valuationHistory, newLog].sort((a, b) => a.date.localeCompare(b.date));
    const updatedAsset: Asset = {
      ...asset,
      currentValue: log.value,
      valuationHistory: updatedHistory,
      updatedAt: new Date().toISOString(),
    };

    setAssets((prev) => prev.map((a) => (a.id === assetId ? updatedAsset : a)));
    await saveEncryptedRecord('asset', updatedAsset, sessionKey);
  };

  const deleteAsset = async (id: string): Promise<void> => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
    await deleteRecord(id);
  };

  const addAssetTranche = async (assetId: string, trancheData: Omit<AssetTranche, 'id'>): Promise<void> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const asset = assets.find((a) => a.id === assetId);
    if (!asset) return;

    const validAmount = round2(Math.abs(Number(trancheData.amount)));
    const newTranche: AssetTranche = {
      ...trancheData,
      id: generateUUID(),
      amount: validAmount,
      units: trancheData.units ? Number(trancheData.units) : undefined,
      unitPrice: trancheData.unitPrice ? Number(trancheData.unitPrice) : undefined,
    };

    const updatedTranches = [...(asset.tranches || []), newTranche];
    const newTotalUnits = (asset.totalUnits || 0) + (newTranche.units || 0);
    let newCurrentVal = round2(asset.currentValue + newTranche.amount);
    if (asset.currentUnitPrice && newTotalUnits > 0) {
      newCurrentVal = round2(newTotalUnits * asset.currentUnitPrice);
    }

    const updatedAsset: Asset = {
      ...asset,
      tranches: updatedTranches,
      totalUnits: newTotalUnits > 0 ? newTotalUnits : undefined,
      currentValue: newCurrentVal,
      purchasePrice: round2((asset.purchasePrice || 0) + newTranche.amount),
      updatedAt: new Date().toISOString(),
    };

    setAssets((prev) => prev.map((a) => (a.id === assetId ? updatedAsset : a)));
    await saveEncryptedRecord('asset', updatedAsset, sessionKey);
  };

  const deleteAssetTranche = async (assetId: string, trancheId: string): Promise<void> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const asset = assets.find((a) => a.id === assetId);
    if (!asset || !asset.tranches) return;

    const targetTranche = asset.tranches.find((t) => t.id === trancheId);
    if (!targetTranche) return;

    const updatedTranches = asset.tranches.filter((t) => t.id !== trancheId);
    const newTotalUnits = Math.max(0, (asset.totalUnits || 0) - (targetTranche.units || 0));
    let newCurrentVal = Math.max(0, round2(asset.currentValue - targetTranche.amount));
    if (asset.currentUnitPrice && newTotalUnits > 0) {
      newCurrentVal = round2(newTotalUnits * asset.currentUnitPrice);
    }

    const updatedAsset: Asset = {
      ...asset,
      tranches: updatedTranches,
      totalUnits: newTotalUnits > 0 ? newTotalUnits : undefined,
      currentValue: newCurrentVal,
      purchasePrice: Math.max(0, round2((asset.purchasePrice || 0) - targetTranche.amount)),
      updatedAt: new Date().toISOString(),
    };

    setAssets((prev) => prev.map((a) => (a.id === assetId ? updatedAsset : a)));
    await saveEncryptedRecord('asset', updatedAsset, sessionKey);
  };

  const updateAssetUnitPrice = async (assetId: string, newUnitPrice: number): Promise<void> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const asset = assets.find((a) => a.id === assetId);
    if (!asset) return;

    const validPrice = round2(Math.abs(Number(newUnitPrice)));
    const newCurrentVal = asset.totalUnits && asset.totalUnits > 0
      ? round2(asset.totalUnits * validPrice)
      : asset.currentValue;

    const newLog: ValuationLog = {
      id: generateUUID(),
      date: new Date().toISOString().split('T')[0],
      value: newCurrentVal,
      note: `NAV / Market price updated to ${validPrice}`,
    };

    const updatedAsset: Asset = {
      ...asset,
      currentUnitPrice: validPrice,
      currentValue: newCurrentVal,
      valuationHistory: [...(asset.valuationHistory || []), newLog],
      updatedAt: new Date().toISOString(),
    };

    setAssets((prev) => prev.map((a) => (a.id === assetId ? updatedAsset : a)));
    await saveEncryptedRecord('asset', updatedAsset, sessionKey);
  };

  const sellAsset = async (
    assetId: string,
    params: {
      unitsSold: number;
      salePricePerUnit?: number;
      totalProceeds: number;
      accountId: string;
      date: string;
      note?: string;
    }
  ): Promise<void> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const targetAsset = assets.find((a) => a.id === assetId);
    if (!targetAsset) throw new Error('Asset not found');

    const unitsSold = Number(params.unitsSold) || 0;
    const totalProceeds = round2(Math.abs(Number(params.totalProceeds)));
    const totalUnits = targetAsset.totalUnits || 0;
    const currentCostBasis = targetAsset.purchasePrice || targetAsset.currentValue;

    // Cost basis of sold units: proportional if units tracked, else total proceeds
    const costBasis = totalUnits > 0 ? round2((unitsSold / totalUnits) * currentCostBasis) : totalProceeds;
    const realizedGain = round2(totalProceeds - costBasis);

    const remainingUnits = Math.max(0, totalUnits - unitsSold);
    const remainingCost = Math.max(0, round2(currentCostBasis - costBasis));

    let newCurrentVal = Math.max(0, round2(targetAsset.currentValue - totalProceeds));
    if (targetAsset.currentUnitPrice && remainingUnits > 0) {
      newCurrentVal = round2(remainingUnits * targetAsset.currentUnitPrice);
    } else if (remainingUnits === 0 && totalUnits > 0) {
      newCurrentVal = 0;
    }

    const sellTrancheId = generateUUID();
    const sellTranche: AssetTranche = {
      id: sellTrancheId,
      date: params.date,
      amount: totalProceeds,
      units: unitsSold > 0 ? unitsSold : undefined,
      unitPrice: params.salePricePerUnit,
      type: 'sell',
      realizedGain,
      note: params.note || (unitsSold > 0 ? `Redeemed ${unitsSold} units` : 'Asset Sale / Redemption'),
    };

    const updatedAsset: Asset = {
      ...targetAsset,
      totalUnits: remainingUnits > 0 ? remainingUnits : undefined,
      purchasePrice: remainingCost,
      currentValue: newCurrentVal,
      tranches: [...(targetAsset.tranches || []), sellTranche],
      updatedAt: new Date().toISOString(),
    };

    setAssets((prev) => prev.map((a) => (a.id === updatedAsset.id ? updatedAsset : a)));
    await saveEncryptedRecord('asset', updatedAsset, sessionKey);

    // Credit selected bank/cash account with sale proceeds
    await addTransaction({
      date: params.date,
      amount: totalProceeds,
      type: 'income',
      currency: targetAsset.currency || activeVault.currency || 'INR',
      accountId: params.accountId,
      note: `Asset Sale / Redemption: ${targetAsset.name}${params.note ? ` (${params.note})` : ''}`,
      linkedAssetId: targetAsset.id,
      subType: 'investment',
      realizedGain,
      tags: ['asset-sale', 'redemption'],
    } as any);
  };

  const recordDividend = async (
    assetId: string,
    params: {
      amount: number;
      accountId: string;
      date: string;
      note?: string;
    }
  ): Promise<void> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const targetAsset = assets.find((a) => a.id === assetId);
    if (!targetAsset) throw new Error('Asset not found');

    const divAmount = round2(Math.abs(Number(params.amount)));
    const updatedAsset: Asset = {
      ...targetAsset,
      totalDividends: round2((targetAsset.totalDividends || 0) + divAmount),
      updatedAt: new Date().toISOString(),
    };

    setAssets((prev) => prev.map((a) => (a.id === updatedAsset.id ? updatedAsset : a)));
    await saveEncryptedRecord('asset', updatedAsset, sessionKey);

    // Record pure income credited to user's chosen account
    await addTransaction({
      date: params.date,
      amount: divAmount,
      type: 'income',
      currency: targetAsset.currency || activeVault.currency || 'INR',
      accountId: params.accountId,
      note: `Dividend Inflow: ${targetAsset.name}${params.note ? ` (${params.note})` : ''}`,
      linkedAssetId: targetAsset.id,
      subType: 'regular',
      tags: ['dividend', 'investment-income'],
    } as any);
  };

  const addLiability = async (
    data: Omit<Liability, 'id' | 'vaultId' | 'updatedAt'>
  ): Promise<Liability> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const newLiability: Liability = {
      ...data,
      id: generateUUID(),
      vaultId: activeVault.id,
      updatedAt: new Date().toISOString(),
    };
    setLiabilities((prev) => [...prev, newLiability]);
    await saveEncryptedRecord('liability', newLiability, sessionKey);
    return newLiability;
  };

  const updateLiability = async (liability: Liability): Promise<void> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const updated = { ...liability, updatedAt: new Date().toISOString() };
    setLiabilities((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    await saveEncryptedRecord('liability', updated, sessionKey);
  };

  const deleteLiability = async (id: string): Promise<void> => {
    setLiabilities((prev) => prev.filter((l) => l.id !== id));
    await deleteRecord(id);
  };

  // Document Operations
  const addDocument = async (
    data: Omit<DocumentRecord, 'id' | 'vaultId' | 'createdAt' | 'updatedAt'>
  ): Promise<DocumentRecord> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const newDoc: DocumentRecord = {
      ...data,
      id: generateUUID(),
      vaultId: activeVault.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setDocuments((prev) => [...prev, newDoc]);
    await saveEncryptedRecord('document', newDoc, sessionKey);
    return newDoc;
  };

  const deleteDocument = async (id: string): Promise<void> => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    await deleteRecord(id);
  };

  // Vault Settings Operations
  const updateVaultSettings = async (updatedSettings: Partial<VaultMeta>): Promise<void> => {
    if (!activeVault) return;
    const updated: VaultMeta = {
      ...activeVault,
      ...updatedSettings,
    };
    await db.vaults.put(updated);
    setActiveVaultMeta(updated);
    await refreshVaultList();
  };

  const loadDemoData = async (): Promise<void> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const demo = generateDemoDataset(activeVault.id, activeVault.currency || 'INR');

    await bulkSaveEncryptedRecords('category', demo.categories, sessionKey);
    await bulkSaveEncryptedRecords('account', demo.accounts, sessionKey);
    await bulkSaveEncryptedRecords('transaction', demo.transactions, sessionKey);
    await bulkSaveEncryptedRecords('people', demo.peopleLedger, sessionKey);
    await bulkSaveEncryptedRecords('budget', demo.budgets, sessionKey);
    await bulkSaveEncryptedRecords('goal', demo.goals, sessionKey);
    await bulkSaveEncryptedRecords('asset', demo.assets, sessionKey);
    await bulkSaveEncryptedRecords('liability', demo.liabilities, sessionKey);
    await bulkSaveEncryptedRecords('plan', demo.plannedExpenses, sessionKey);

    await loadVaultData();
  };

  return (
    <VaultContext.Provider
      value={{
        activeVault,
        loadDemoData,
        accounts,
        transactions,
        categories,
        peopleLedger,
        budgets,
        goals,
        assets,
        liabilities,
        documents,
        plannedExpenses,
        isDecrypting,
        addAccount,
        updateAccount,
        deleteAccount,
        reconcileAccounts,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        bulkAddTransactions,
        undoImport,
        addCategory,
        updateCategory,
        deleteCategory,
        addPeopleEntry,
        updatePeopleEntry,
        updateContactProfile,
        addSettlement,
        deletePeopleEntry,
        addBudget,
        updateBudget,
        deleteBudget,
        addGoal,
        updateGoal,
        deleteGoal,
        addPlannedExpense,
        updatePlannedExpense,
        deletePlannedExpense,
        markPlanPaid,
        addAsset,
        updateAsset,
        addValuationLog,
        deleteAsset,
        addAssetTranche,
        deleteAssetTranche,
        updateAssetUnitPrice,
        sellAsset,
        recordDividend,
        addLiability,
        updateLiability,
        deleteLiability,
        addDocument,
        deleteDocument,
        updateVaultSettings,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
};

export function useVault() {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
}
