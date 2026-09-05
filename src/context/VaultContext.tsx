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
import { isTxAfterBaseline } from '../utils/dates';
import { generateStarterCategories } from '../utils/categories';

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
  reconcileAccounts: (targetBalances?: Record<string, number>) => Promise<void>;

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
  resetCategoriesToDefault: () => Promise<void>;

  // People Ledger Operations
  addPeopleEntry: (entry: Omit<PeopleLedgerEntry, 'id' | 'vaultId' | 'updatedAt' | 'settlements' | 'status'>) => Promise<PeopleLedgerEntry>;
  updatePeopleEntry: (entry: PeopleLedgerEntry) => Promise<void>;
  updateContactProfile: (
    oldName: string,
    newDetails: { name: string; phone?: string; notes?: string }
  ) => Promise<void>;
  addSettlement: (entryId: string, settlement: Omit<SettlementRecord, 'id'>) => Promise<void>;
  updateSettlement: (
    entryId: string,
    settlementId: string,
    updates: { amount: number; date: string; accountId?: string; note?: string }
  ) => Promise<void>;
  deleteSettlement: (entryId: string, settlementId: string) => Promise<void>;
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

  // Self-heal and auto-rebalance unbalanced settlements (e.g. 2k + 2k holding vs 4k return)
  const rebalancePeopleSettlements = async (
    entries: PeopleLedgerEntry[],
    key: CryptoKey
  ): Promise<PeopleLedgerEntry[]> => {
    const groups = new Map<string, PeopleLedgerEntry[]>();
    for (const e of entries) {
      const keyStr = `${e.contactName.trim().toLowerCase()}__${e.type}`;
      const list = groups.get(keyStr) || [];
      list.push(e);
      groups.set(keyStr, list);
    }

    let hasChanges = false;
    const finalEntries: PeopleLedgerEntry[] = [];

    for (const group of groups.values()) {
      if (group.length <= 1) {
        finalEntries.push(...group);
        continue;
      }

      // Check if rebalancing is needed
      const isAnyOverSettled = group.some((e) => {
        const sTotal = (e.settlements || []).reduce((sum, s) => sum + s.amount, 0);
        return sTotal > e.amount + 0.001;
      });
      const isAnyUnderSettled = group.some((e) => {
        const sTotal = (e.settlements || []).reduce((sum, s) => sum + s.amount, 0);
        return sTotal < e.amount - 0.001;
      });

      if (!isAnyOverSettled || !isAnyUnderSettled) {
        finalEntries.push(...group);
        continue;
      }

      hasChanges = true;
      const allSettlements: SettlementRecord[] = group.flatMap((e) => e.settlements || []);
      const sortedEntries = [...group].sort((a, b) => a.date.localeCompare(b.date));

      const rebalancedGroup: PeopleLedgerEntry[] = sortedEntries.map((e) => ({
        ...e,
        settlements: [],
      }));

      for (const s of allSettlements) {
        let sAmount = s.amount;
        for (let i = 0; i < rebalancedGroup.length; i++) {
          if (sAmount <= 0) break;
          const entry = rebalancedGroup[i];
          const currSettled = entry.settlements.reduce((sum, x) => sum + x.amount, 0);
          const needed = Math.max(0, round2(entry.amount - currSettled));

          if (needed <= 0 && i < rebalancedGroup.length - 1) {
            continue;
          }

          if (i === rebalancedGroup.length - 1 && needed <= 0) {
            const lastS = entry.settlements[entry.settlements.length - 1];
            if (lastS) {
              lastS.amount = round2(lastS.amount + sAmount);
            } else {
              entry.settlements.push({ ...s, amount: sAmount });
            }
            sAmount = 0;
            break;
          }

          const take = Math.min(needed, sAmount);
          entry.settlements.push({
            ...s,
            id: generateUUID(),
            amount: take,
          });
          sAmount = round2(sAmount - take);
        }
      }

      for (const entry of rebalancedGroup) {
        const total = round2(entry.settlements.reduce((sum, x) => sum + x.amount, 0));
        entry.status = total >= entry.amount ? 'closed' : total > 0 ? 'partially_settled' : 'open';
        entry.updatedAt = new Date().toISOString();
        await saveEncryptedRecord('people', entry, key);
        finalEntries.push(entry);
      }
    }

    return hasChanges ? finalEntries : entries;
  };

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

      // Auto-purge legacy subcategories (_sub_ or parentId) from vault
      let cleanCats = cats;
      const legacySubCats = cats.filter((c) => Boolean(c.parentId) || c.id.includes('_sub_'));
      if (legacySubCats.length > 0) {
        const subToParentMap = new Map<string, string>();
        legacySubCats.forEach((sc) => {
          if (sc.parentId) subToParentMap.set(sc.id, sc.parentId);
        });

        // Reassign any transactions referencing a subcategory to its parent
        for (const t of txs) {
          if (t.categoryId && subToParentMap.has(t.categoryId)) {
            t.categoryId = subToParentMap.get(t.categoryId)!;
            await saveEncryptedRecord('transaction', t, sessionKey);
          }
        }

        // Delete legacy subcategories from database
        for (const sc of legacySubCats) {
          await deleteRecord(sc.id);
        }

        cleanCats = cats.filter((c) => !c.parentId && !c.id.includes('_sub_'));
      }

      // Self-heal and auto-rebalance any unbalanced settlements (e.g. 2k + 2k holding vs 4k return)
      const rebalancedPeople = await rebalancePeopleSettlements(people, sessionKey);

      setAccounts(accs);
      setTransactions(txs);
      setCategories(cleanCats);
      setPeopleLedger(rebalancedPeople);
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
    const validBal = typeof data.balance === 'number' && !isNaN(data.balance) ? round2(data.balance) : 0;
    const validInitial = typeof data.initialBalance === 'number' && !isNaN(data.initialBalance)
      ? round2(data.initialBalance)
      : validBal;
    const baseDate = data.balanceAsOfDate || new Date().toISOString().split('T')[0];

    const newAccount: Account = {
      ...data,
      balance: validBal,
      initialBalance: validInitial,
      balanceAsOfDate: baseDate,
      id: generateUUID(),
      vaultId: activeVault.id,
      updatedAt: new Date().toISOString(),
    };
    accountsRef.current = [...accountsRef.current, newAccount];
    setAccounts(accountsRef.current);
    await saveEncryptedRecord('account', newAccount, sessionKey);
    return newAccount;
  };

  const updateAccount = async (account: Account): Promise<void> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const validBal = typeof account.balance === 'number' && !isNaN(account.balance) ? round2(account.balance) : 0;
    const validInitial = typeof account.initialBalance === 'number' && !isNaN(account.initialBalance)
      ? round2(account.initialBalance)
      : validBal;
    const updated = {
      ...account,
      balance: validBal,
      initialBalance: validInitial,
      balanceAsOfDate: account.balanceAsOfDate || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
    };
    accountsRef.current = accountsRef.current.map((a) => (a.id === updated.id ? updated : a));
    setAccounts(accountsRef.current);
    await saveEncryptedRecord('account', updated, sessionKey);
  };

  const deleteAccount = async (id: string): Promise<void> => {
    accountsRef.current = accountsRef.current.filter((a) => a.id !== id);
    setAccounts(accountsRef.current);
    await deleteRecord(id);
  };

  // Financial arithmetic precision helper (avoids floating-point errors like 0.1 + 0.2 = 0.30000000000000004)
  const round2 = (num: number): number => Math.round((num + Number.EPSILON) * 100) / 100;

  // Reconcile and recalculate current account balances from the complete transaction ledger and people records
  const reconcileAccounts = async (): Promise<void> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');

    // 1. Calculate ledger deltas for each account (strictly for activity after account's opening baseline date)
    const calculatedDeltas: Record<string, number> = {};

    transactionsRef.current.forEach((tx) => {
      const amt = round2(Math.abs(Number(tx.amount))) || 0;
      const sourceAcc = accountsRef.current.find((a) => a.id === tx.accountId);

      if (sourceAcc && isTxAfterBaseline(tx.date, sourceAcc.balanceAsOfDate)) {
        if (tx.type === 'expense') {
          calculatedDeltas[tx.accountId] = (calculatedDeltas[tx.accountId] || 0) - amt;
        } else if (tx.type === 'income') {
          calculatedDeltas[tx.accountId] = (calculatedDeltas[tx.accountId] || 0) + amt;
        } else if (tx.type === 'transfer') {
          calculatedDeltas[tx.accountId] = (calculatedDeltas[tx.accountId] || 0) - amt;
        }
      }

      if (tx.type === 'transfer' && tx.toAccountId) {
        const destAcc = accountsRef.current.find((a) => a.id === tx.toAccountId);
        if (destAcc && isTxAfterBaseline(tx.date, destAcc.balanceAsOfDate)) {
          calculatedDeltas[tx.toAccountId] = (calculatedDeltas[tx.toAccountId] || 0) + amt;
        }
      }
    });

    peopleLedgerRef.current.forEach((entry) => {
      if (entry.accountId) {
        const acc = accountsRef.current.find((a) => a.id === entry.accountId);
        if (acc && isTxAfterBaseline(entry.date, acc.balanceAsOfDate)) {
          const delta = entry.type === 'lent' ? -entry.amount : entry.amount;
          calculatedDeltas[entry.accountId] = (calculatedDeltas[entry.accountId] || 0) + delta;
        }
      }
      (entry.settlements || []).forEach((s) => {
        if (s.accountId) {
          const acc = accountsRef.current.find((a) => a.id === s.accountId);
          if (acc && isTxAfterBaseline(s.date, acc.balanceAsOfDate)) {
            const sDelta = entry.type === 'lent' ? s.amount : -s.amount;
            calculatedDeltas[s.accountId] = (calculatedDeltas[s.accountId] || 0) + sDelta;
          }
        }
      });
    });

    // 2. Recompute each account's balance strictly from its fixed baseline initialBalance
    const updatedAccs = accountsRef.current.map((acc) => {
      const delta = calculatedDeltas[acc.id] || 0;
      const initial = acc.initialBalance !== undefined ? acc.initialBalance : (acc.balance - delta);
      const newBal = round2(initial + delta);
      return {
        ...acc,
        initialBalance: initial,
        balance: newBal,
        updatedAt: new Date().toISOString(),
      };
    });

    accountsRef.current = updatedAccs;
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
    transactionsRef.current = [newTx, ...transactionsRef.current].sort((a, b) => b.date.localeCompare(a.date));
    setTransactions(transactionsRef.current);

    // Update connected account balances with precise 2-decimal rounding (strictly after baseline opening date)
    if (newTx.type === 'expense') {
      accountsRef.current = accountsRef.current.map((acc) => {
        if (acc.id === newTx.accountId) {
          if (!isTxAfterBaseline(newTx.date, acc.balanceAsOfDate)) return acc;
          const updated = { ...acc, balance: round2(acc.balance - newTx.amount), updatedAt: new Date().toISOString() };
          saveEncryptedRecord('account', updated, sessionKey);
          return updated;
        }
        return acc;
      });
      setAccounts(accountsRef.current);
    } else if (newTx.type === 'income') {
      accountsRef.current = accountsRef.current.map((acc) => {
        if (acc.id === newTx.accountId) {
          if (!isTxAfterBaseline(newTx.date, acc.balanceAsOfDate)) return acc;
          const updated = { ...acc, balance: round2(acc.balance + newTx.amount), updatedAt: new Date().toISOString() };
          saveEncryptedRecord('account', updated, sessionKey);
          return updated;
        }
        return acc;
      });
      setAccounts(accountsRef.current);
    } else if (newTx.type === 'transfer' && newTx.toAccountId) {
      accountsRef.current = accountsRef.current.map((acc) => {
        if (acc.id === newTx.accountId) {
          if (!isTxAfterBaseline(newTx.date, acc.balanceAsOfDate)) return acc;
          const updated = { ...acc, balance: round2(acc.balance - newTx.amount), updatedAt: new Date().toISOString() };
          saveEncryptedRecord('account', updated, sessionKey);
          return updated;
        }
        if (acc.id === newTx.toAccountId) {
          if (!isTxAfterBaseline(newTx.date, acc.balanceAsOfDate)) return acc;
          const updated = { ...acc, balance: round2(acc.balance + newTx.amount), updatedAt: new Date().toISOString() };
          saveEncryptedRecord('account', updated, sessionKey);
          return updated;
        }
        return acc;
      });
      setAccounts(accountsRef.current);
    }

    // If linked to an Asset (Investment / SIP / Asset purchase OR Asset Sale / Redemption)
    if (newTx.linkedAssetId) {
      if ((newTx as any).isSaleTrancheHandled) {
        // Tranche and asset valuation already updated by sellAsset
      } else {
        const targetAsset = assetsRef.current.find((a) => a.id === newTx.linkedAssetId);
        if (targetAsset) {
          const isSale =
            newTx.type === 'income' ||
            (newTx as any).subType === 'asset_sale' ||
            (newTx.tags && newTx.tags.includes('asset-sale'));

          const trancheId = generateUUID();
          newTx.trancheId = trancheId;
          const trancheUnits = (newTx as any).units || undefined;
          const trancheUnitPrice = (newTx as any).unitPrice || undefined;

          if (isSale) {
            // Asset Sale / Redemption: DEDUCT from currentValue and purchasePrice
            const unitsSold = trancheUnits || 0;
            const remainingUnits = Math.max(0, (targetAsset.totalUnits || 0) - unitsSold);
            let newCurrentVal = Math.max(0, round2(targetAsset.currentValue - newTx.amount));
            if (targetAsset.currentUnitPrice && remainingUnits > 0) {
              newCurrentVal = round2(remainingUnits * targetAsset.currentUnitPrice);
            } else if (remainingUnits === 0 && (targetAsset.totalUnits || 0) > 0) {
              newCurrentVal = 0;
            }

            const newTranche: AssetTranche = {
              id: trancheId,
              date: newTx.date,
              amount: newTx.amount,
              units: trancheUnits,
              unitPrice: trancheUnitPrice,
              type: 'sell',
              transactionId: newTx.id,
              note: newTx.note || 'Asset Sale / Redemption',
            };

            const updatedAsset: Asset = {
              ...targetAsset,
              tranches: [...(targetAsset.tranches || []), newTranche],
              totalUnits: remainingUnits > 0 ? remainingUnits : undefined,
              currentValue: newCurrentVal,
              purchasePrice: Math.max(0, round2((targetAsset.purchasePrice || 0) - newTx.amount)),
              updatedAt: new Date().toISOString(),
            };

            assetsRef.current = assetsRef.current.map((a) => (a.id === updatedAsset.id ? updatedAsset : a));
            setAssets(assetsRef.current);
            await saveEncryptedRecord('asset', updatedAsset, sessionKey);
          } else {
            // Asset Purchase / Investment: ADD to currentValue and purchasePrice
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

    const oldTx = transactionsRef.current.find((t) => t.id === tx.id);
    if (oldTx) {
      const balanceDeltas: Record<string, number> = {};

      // 1. Reverse old transaction's financial effect (strictly if after baseline)
      const oldSourceAcc = accountsRef.current.find((a) => a.id === oldTx.accountId);
      if (oldSourceAcc && isTxAfterBaseline(oldTx.date, oldSourceAcc.balanceAsOfDate)) {
        if (oldTx.type === 'expense') {
          balanceDeltas[oldTx.accountId] = (balanceDeltas[oldTx.accountId] || 0) + oldTx.amount;
        } else if (oldTx.type === 'income') {
          balanceDeltas[oldTx.accountId] = (balanceDeltas[oldTx.accountId] || 0) - oldTx.amount;
        } else if (oldTx.type === 'transfer') {
          balanceDeltas[oldTx.accountId] = (balanceDeltas[oldTx.accountId] || 0) + oldTx.amount;
        }
      }
      if (oldTx.type === 'transfer' && oldTx.toAccountId) {
        const oldDestAcc = accountsRef.current.find((a) => a.id === oldTx.toAccountId);
        if (oldDestAcc && isTxAfterBaseline(oldTx.date, oldDestAcc.balanceAsOfDate)) {
          balanceDeltas[oldTx.toAccountId] = (balanceDeltas[oldTx.toAccountId] || 0) - oldTx.amount;
        }
      }

      // 2. Apply updated transaction's financial effect (strictly if after baseline)
      const newSourceAcc = accountsRef.current.find((a) => a.id === updated.accountId);
      if (newSourceAcc && isTxAfterBaseline(updated.date, newSourceAcc.balanceAsOfDate)) {
        if (updated.type === 'expense') {
          balanceDeltas[updated.accountId] = (balanceDeltas[updated.accountId] || 0) - updated.amount;
        } else if (updated.type === 'income') {
          balanceDeltas[updated.accountId] = (balanceDeltas[updated.accountId] || 0) + updated.amount;
        } else if (updated.type === 'transfer') {
          balanceDeltas[updated.accountId] = (balanceDeltas[updated.accountId] || 0) - updated.amount;
        }
      }
      if (updated.type === 'transfer' && updated.toAccountId) {
        const newDestAcc = accountsRef.current.find((a) => a.id === updated.toAccountId);
        if (newDestAcc && isTxAfterBaseline(updated.date, newDestAcc.balanceAsOfDate)) {
          balanceDeltas[updated.toAccountId] = (balanceDeltas[updated.toAccountId] || 0) + updated.amount;
        }
      }

      // 3. Apply net non-zero balance changes to accounts
      const changedIds = Object.keys(balanceDeltas).filter((accId) => Math.abs(balanceDeltas[accId]) > 0.0001);
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

    transactionsRef.current = transactionsRef.current
      .map((t) => (t.id === updated.id ? updated : t))
      .sort((a, b) => b.date.localeCompare(a.date));
    setTransactions(transactionsRef.current);
    await saveEncryptedRecord('transaction', updated, sessionKey);
  };

  const deleteTransaction = async (id: string): Promise<void> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const txToDel = transactionsRef.current.find((t) => t.id === id);

    if (txToDel) {
      const balanceDeltas: Record<string, number> = {};
      const sourceAcc = accountsRef.current.find((a) => a.id === txToDel.accountId);

      if (sourceAcc && isTxAfterBaseline(txToDel.date, sourceAcc.balanceAsOfDate)) {
        if (txToDel.type === 'expense') {
          balanceDeltas[txToDel.accountId] = (balanceDeltas[txToDel.accountId] || 0) + txToDel.amount;
        } else if (txToDel.type === 'income') {
          balanceDeltas[txToDel.accountId] = (balanceDeltas[txToDel.accountId] || 0) - txToDel.amount;
        } else if (txToDel.type === 'transfer') {
          balanceDeltas[txToDel.accountId] = (balanceDeltas[txToDel.accountId] || 0) + txToDel.amount;
        }
      }

      if (txToDel.type === 'transfer' && txToDel.toAccountId) {
        const destAcc = accountsRef.current.find((a) => a.id === txToDel.toAccountId);
        if (destAcc && isTxAfterBaseline(txToDel.date, destAcc.balanceAsOfDate)) {
          balanceDeltas[txToDel.toAccountId] = (balanceDeltas[txToDel.toAccountId] || 0) - txToDel.amount;
        }
      }

      const changedAccIds = Object.keys(balanceDeltas);
      if (changedAccIds.length > 0) {
        accountsRef.current = accountsRef.current.map((acc) => {
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
        });
        setAccounts(accountsRef.current);
      }

      // If linked to an Asset, remove the tranche and adjust valuation/units
      if (txToDel.linkedAssetId) {
        const targetAsset = assetsRef.current.find((a) => a.id === txToDel.linkedAssetId);
        if (targetAsset && targetAsset.tranches) {
          const isSale =
            txToDel.type === 'income' ||
            (txToDel as any).subType === 'asset_sale' ||
            (txToDel.tags && txToDel.tags.includes('asset-sale'));
          const trancheToRemove = targetAsset.tranches.find(
            (t) => t.id === txToDel.trancheId || t.transactionId === txToDel.id
          );
          const updatedTranches = targetAsset.tranches.filter(
            (t) => t.id !== txToDel.trancheId && t.transactionId !== txToDel.id
          );
          const unitsDiff = trancheToRemove?.units || 0;

          let newTotalUnits = targetAsset.totalUnits || 0;
          let newCurrentVal = targetAsset.currentValue;
          let newPurchasePrice = targetAsset.purchasePrice || 0;

          if (isSale) {
            // Deleting a sale: restore units and add proceeds back to asset
            newTotalUnits = newTotalUnits + unitsDiff;
            newCurrentVal = round2(targetAsset.currentValue + txToDel.amount);
            newPurchasePrice = round2((targetAsset.purchasePrice || 0) + txToDel.amount);
          } else {
            // Deleting a purchase: remove units and subtract amount
            newTotalUnits = Math.max(0, newTotalUnits - unitsDiff);
            newCurrentVal = Math.max(0, round2(targetAsset.currentValue - txToDel.amount));
            newPurchasePrice = Math.max(0, round2((targetAsset.purchasePrice || 0) - txToDel.amount));
          }

          if (targetAsset.currentUnitPrice && newTotalUnits > 0) {
            newCurrentVal = round2(newTotalUnits * targetAsset.currentUnitPrice);
          }

          const updatedAsset: Asset = {
            ...targetAsset,
            tranches: updatedTranches,
            totalUnits: newTotalUnits > 0 ? newTotalUnits : undefined,
            currentValue: newCurrentVal,
            purchasePrice: newPurchasePrice,
            updatedAt: new Date().toISOString(),
          };

          assetsRef.current = assetsRef.current.map((a) => (a.id === updatedAsset.id ? updatedAsset : a));
          setAssets(assetsRef.current);
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

    transactionsRef.current = [...newTxs, ...transactionsRef.current].sort((a, b) => b.date.localeCompare(a.date));
    setTransactions(transactionsRef.current);

    // Update balances including transfers (strictly respecting account balanceAsOfDate baseline)
    const balanceDeltas: Record<string, number> = {};
    newTxs.forEach((tx) => {
      const sourceAcc = accountsRef.current.find((a) => a.id === tx.accountId);

      if (sourceAcc && isTxAfterBaseline(tx.date, sourceAcc.balanceAsOfDate)) {
        if (tx.type === 'expense') {
          balanceDeltas[tx.accountId] = (balanceDeltas[tx.accountId] || 0) - tx.amount;
        } else if (tx.type === 'income') {
          balanceDeltas[tx.accountId] = (balanceDeltas[tx.accountId] || 0) + tx.amount;
        } else if (tx.type === 'transfer') {
          balanceDeltas[tx.accountId] = (balanceDeltas[tx.accountId] || 0) - tx.amount;
        }
      }

      if (tx.type === 'transfer' && tx.toAccountId) {
        const destAcc = accountsRef.current.find((a) => a.id === tx.toAccountId);
        if (destAcc && isTxAfterBaseline(tx.date, destAcc.balanceAsOfDate)) {
          balanceDeltas[tx.toAccountId] = (balanceDeltas[tx.toAccountId] || 0) + tx.amount;
        }
      }
    });

    const changedAccIds = Object.keys(balanceDeltas);
    if (changedAccIds.length > 0) {
      accountsRef.current = accountsRef.current.map((acc) => {
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
      });
      setAccounts(accountsRef.current);
    }

    await bulkSaveEncryptedRecords('transaction', newTxs, sessionKey);
  };

  const undoImport = async (importBatchId: string): Promise<number> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const batchTxs = transactionsRef.current.filter((t) => t.importBatchId === importBatchId);
    const batchPeople = peopleLedgerRef.current.filter(
      (p) =>
        p.importBatchId === importBatchId ||
        (batchTxs.length === 0 && (p.notes?.includes('Imported from statement:') || p.notes?.includes('Settled on import:')))
    );
    const batchAssets = assetsRef.current.filter((a) => a.importBatchId === importBatchId);

    if (batchTxs.length === 0 && batchPeople.length === 0 && batchAssets.length === 0) return 0;

    // Calculate reverse balance deltas from transactions (strictly if after baseline)
    const balanceDeltas: Record<string, number> = {};
    for (const tx of batchTxs) {
      const amt = tx.amount;
      const sourceAcc = accountsRef.current.find((a) => a.id === tx.accountId);
      if (sourceAcc && isTxAfterBaseline(tx.date, sourceAcc.balanceAsOfDate)) {
        if (tx.type === 'expense') {
          balanceDeltas[tx.accountId] = (balanceDeltas[tx.accountId] || 0) + amt;
        } else if (tx.type === 'income') {
          balanceDeltas[tx.accountId] = (balanceDeltas[tx.accountId] || 0) - amt;
        } else if (tx.type === 'transfer') {
          balanceDeltas[tx.accountId] = (balanceDeltas[tx.accountId] || 0) + amt;
        }
      }
      if (tx.type === 'transfer' && tx.toAccountId) {
        const destAcc = accountsRef.current.find((a) => a.id === tx.toAccountId);
        if (destAcc && isTxAfterBaseline(tx.date, destAcc.balanceAsOfDate)) {
          balanceDeltas[tx.toAccountId] = (balanceDeltas[tx.toAccountId] || 0) - amt;
        }
      }

      // Revert any linked asset tranches
      if (tx.linkedAssetId) {
        const asset = assetsRef.current.find((a) => a.id === tx.linkedAssetId);
        if (asset && asset.tranches) {
          const isSale =
            tx.type === 'income' ||
            (tx as any).subType === 'asset_sale' ||
            (tx.tags && tx.tags.includes('asset-sale'));
          const trancheToRemove = asset.tranches.find(
            (tr) => tr.transactionId === tx.id || tr.id === tx.trancheId
          );
          const updatedTranches = asset.tranches.filter(
            (tr) => tr.transactionId !== tx.id && tr.id !== tx.trancheId
          );
          const unitsDiff = trancheToRemove?.units || 0;

          let newTotalUnits = asset.totalUnits || 0;
          let newCurrentVal = asset.currentValue;
          let newPurchasePrice = asset.purchasePrice || 0;

          if (isSale) {
            newTotalUnits = newTotalUnits + unitsDiff;
            newCurrentVal = round2(asset.currentValue + tx.amount);
            newPurchasePrice = round2((asset.purchasePrice || 0) + tx.amount);
          } else {
            newTotalUnits = Math.max(0, newTotalUnits - unitsDiff);
            newCurrentVal = Math.max(0, round2(asset.currentValue - tx.amount));
            newPurchasePrice = Math.max(0, round2((asset.purchasePrice || 0) - tx.amount));
          }

          if (asset.currentUnitPrice && newTotalUnits > 0) {
            newCurrentVal = round2(newTotalUnits * asset.currentUnitPrice);
          }

          const updatedAsset: Asset = {
            ...asset,
            tranches: updatedTranches,
            totalUnits: newTotalUnits > 0 ? newTotalUnits : undefined,
            currentValue: newCurrentVal,
            purchasePrice: newPurchasePrice,
            updatedAt: new Date().toISOString(),
          };
          assetsRef.current = assetsRef.current.map((a) => (a.id === updatedAsset.id ? updatedAsset : a));
          setAssets(assetsRef.current);
          await saveEncryptedRecord('asset', updatedAsset, sessionKey);
        }
      }

      // Revert any linked liability reductions
      if (tx.linkedLiabilityId) {
        const liab = liabilitiesRef.current.find((l) => l.id === tx.linkedLiabilityId);
        if (liab) {
          const updatedLiab: Liability = {
            ...liab,
            outstandingBalance: round2(liab.outstandingBalance + tx.amount),
            updatedAt: new Date().toISOString(),
          };
          liabilitiesRef.current = liabilitiesRef.current.map((l) => (l.id === updatedLiab.id ? updatedLiab : l));
          setLiabilities(liabilitiesRef.current);
          await saveEncryptedRecord('liability', updatedLiab, sessionKey);
        }
      }
    }

    // Calculate reverse balance deltas from people entries (strictly if after baseline)
    for (const p of batchPeople) {
      if (p.accountId) {
        const acc = accountsRef.current.find((a) => a.id === p.accountId);
        if (acc && isTxAfterBaseline(p.date, acc.balanceAsOfDate)) {
          const revDelta = p.type === 'lent' ? p.amount : -p.amount;
          balanceDeltas[p.accountId] = (balanceDeltas[p.accountId] || 0) + revDelta;
        }
      }
      (p.settlements || []).forEach((s) => {
        if (s.accountId) {
          const acc = accountsRef.current.find((a) => a.id === s.accountId);
          if (acc && isTxAfterBaseline(s.date, acc.balanceAsOfDate)) {
            const sRevDelta = p.type === 'lent' ? -s.amount : s.amount;
            balanceDeltas[s.accountId] = (balanceDeltas[s.accountId] || 0) + sRevDelta;
          }
        }
      });
    }

    // Also check any other people entries that received settlements from this batch
    for (const p of peopleLedgerRef.current) {
      if (batchPeople.some((bp) => bp.id === p.id)) continue;
      const matchingSettles = (p.settlements || []).filter(
        (s) => s.importBatchId === importBatchId
      );
      if (matchingSettles.length > 0) {
        for (const s of matchingSettles) {
          if (s.accountId) {
            const acc = accountsRef.current.find((a) => a.id === s.accountId);
            if (acc && isTxAfterBaseline(s.date, acc.balanceAsOfDate)) {
              const sRevDelta = p.type === 'lent' ? -s.amount : s.amount;
              balanceDeltas[s.accountId] = (balanceDeltas[s.accountId] || 0) + sRevDelta;
            }
          }
        }
        const remainingSettles = p.settlements.filter((s) => s.importBatchId !== importBatchId);
        const totalSettled = round2(remainingSettles.reduce((sum, s) => sum + s.amount, 0));
        let newStatus: PeopleLedgerEntry['status'] = 'open';
        if (totalSettled >= p.amount) newStatus = 'closed';
        else if (totalSettled > 0) newStatus = 'partially_settled';

        const updatedP: PeopleLedgerEntry = {
          ...p,
          settlements: remainingSettles,
          status: newStatus,
          updatedAt: new Date().toISOString(),
        };
        peopleLedgerRef.current = peopleLedgerRef.current.map((x) => (x.id === p.id ? updatedP : x));
        await saveEncryptedRecord('people', updatedP, sessionKey);
      }
    }

    // Apply combined account balance reversions
    const changedAccIds = Object.keys(balanceDeltas);
    if (changedAccIds.length > 0) {
      accountsRef.current = accountsRef.current.map((acc) => {
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
      });
      setAccounts(accountsRef.current);
    }

    // Delete batch transactions
    if (batchTxs.length > 0) {
      const batchTxIds = new Set(batchTxs.map((t) => t.id));
      transactionsRef.current = transactionsRef.current.filter((t) => !batchTxIds.has(t.id));
      setTransactions(transactionsRef.current);
      for (const id of batchTxIds) {
        await deleteRecord(id);
      }
    }

    // Delete batch people entries
    if (batchPeople.length > 0) {
      const batchPeopleIds = new Set(batchPeople.map((p) => p.id));
      peopleLedgerRef.current = peopleLedgerRef.current.filter((p) => !batchPeopleIds.has(p.id));
      setPeopleLedger(peopleLedgerRef.current);
      for (const id of batchPeopleIds) {
        await deleteRecord(id);
      }
    }

    // Delete batch assets (if created from this batch and has no other manual transactions)
    if (batchAssets.length > 0) {
      const assetIds = new Set(batchAssets.map((a) => a.id));
      assetsRef.current = assetsRef.current.filter((a) => !assetIds.has(a.id));
      setAssets(assetsRef.current);
      for (const id of assetIds) {
        await deleteRecord(id);
      }
    }

    return batchTxs.length + batchPeople.length;
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
    const toDelete = categories.filter((c) => c.id === id || c.parentId === id);
    setCategories((prev) => prev.filter((c) => c.id !== id && c.parentId !== id));
    for (const c of toDelete) {
      await deleteRecord(c.id);
    }
  };

  const resetCategoriesToDefault = async (): Promise<void> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    for (const c of categories) {
      await deleteRecord(c.id);
    }
    const freshCats = generateStarterCategories(activeVault.id);
    await bulkSaveEncryptedRecords('category', freshCats, sessionKey);
    setCategories(freshCats);
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

    // If an account is linked to this debt / loan, adjust account balance (strictly after baseline opening date)
    if (data.accountId) {
      const acc = accountsRef.current.find((a) => a.id === data.accountId);
      if (acc && isTxAfterBaseline(data.date, acc.balanceAsOfDate)) {
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
    const oldEntry = peopleLedgerRef.current.find((p) => p.id === entry.id);
    const validAmount = round2(Math.abs(Number(entry.amount)));

    // Recalculate status based on settlements and updated principal
    const totalSettled = round2((entry.settlements || []).reduce((sum, s) => sum + s.amount, 0));
    let newStatus: PeopleLedgerEntry['status'] = 'open';
    if (validAmount === 0 || totalSettled >= validAmount) {
      newStatus = 'closed';
    } else if (totalSettled > 0) {
      newStatus = 'partially_settled';
    }

    // Reconcile linked account balances if account, amount, or type changed
    const balanceDeltas: Record<string, number> = {};

    // 1. Reverse old entry's financial delta if linked to an account
    if (oldEntry && oldEntry.accountId) {
      const oldAcc = accountsRef.current.find((a) => a.id === oldEntry.accountId);
      if (oldAcc && isTxAfterBaseline(oldEntry.date, oldAcc.balanceAsOfDate)) {
        const revDelta = oldEntry.type === 'lent' ? oldEntry.amount : -oldEntry.amount;
        balanceDeltas[oldEntry.accountId] = (balanceDeltas[oldEntry.accountId] || 0) + revDelta;
      }
    }

    // 2. Apply new entry's financial delta
    if (entry.accountId) {
      const newAcc = accountsRef.current.find((a) => a.id === entry.accountId);
      if (newAcc && isTxAfterBaseline(entry.date, newAcc.balanceAsOfDate)) {
        const newDelta = entry.type === 'lent' ? -validAmount : validAmount;
        balanceDeltas[entry.accountId] = (balanceDeltas[entry.accountId] || 0) + newDelta;
      }
    }

    // Apply account updates if any delta is non-zero
    let accountsChanged = false;
    for (const [accId, delta] of Object.entries(balanceDeltas)) {
      if (Math.abs(delta) > 0.0001) {
        const acc = accountsRef.current.find((a) => a.id === accId);
        if (acc) {
          const updatedAcc = { ...acc, balance: round2(acc.balance + delta), updatedAt: new Date().toISOString() };
          accountsRef.current = accountsRef.current.map((a) => (a.id === updatedAcc.id ? updatedAcc : a));
          await saveEncryptedRecord('account', updatedAcc, sessionKey);
          accountsChanged = true;
        }
      }
    }
    if (accountsChanged) {
      setAccounts(accountsRef.current);
    }

    const updated: PeopleLedgerEntry = {
      ...entry,
      amount: validAmount,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
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
    if (validSettlementAmt <= 0) return;

    const targetSettled = round2((target.settlements || []).reduce((sum, s) => sum + s.amount, 0));
    const targetNeeded = Math.max(0, round2(target.amount - targetSettled));

    const targetAssign = Math.min(targetNeeded, validSettlementAmt);
    let remainder = round2(validSettlementAmt - targetAssign);

    const modifiedEntries: PeopleLedgerEntry[] = [];

    // 1. Update target entry
    const targetNewSettlements = [...(target.settlements || [])];
    const applyToTarget = targetAssign > 0 ? targetAssign : (remainder === validSettlementAmt ? validSettlementAmt : 0);
    if (applyToTarget > 0) {
      targetNewSettlements.push({
        ...settlement,
        amount: applyToTarget,
        id: generateUUID(),
      });
      if (targetAssign === 0) {
        remainder = 0;
      }
    }

    const newTargetTotal = round2(targetNewSettlements.reduce((sum, s) => sum + s.amount, 0));
    const updatedTarget: PeopleLedgerEntry = {
      ...target,
      settlements: targetNewSettlements,
      status: newTargetTotal >= target.amount ? 'closed' : newTargetTotal > 0 ? 'partially_settled' : 'open',
      updatedAt: new Date().toISOString(),
    };
    modifiedEntries.push(updatedTarget);

    // 2. If remainder > 0, cascade FIFO to other open entries for same contact & type
    if (remainder > 0) {
      const cNameLower = target.contactName.trim().toLowerCase();
      const otherOpenEntries = peopleLedgerRef.current
        .filter(
          (p) =>
            p.id !== target.id &&
            p.contactName.trim().toLowerCase() === cNameLower &&
            p.type === target.type &&
            p.status !== 'closed'
        )
        .sort((a, b) => a.date.localeCompare(b.date)); // FIFO

      for (const other of otherOpenEntries) {
        if (remainder <= 0) break;
        const otherSettled = round2((other.settlements || []).reduce((sum, s) => sum + s.amount, 0));
        const otherNeeded = Math.max(0, round2(other.amount - otherSettled));
        if (otherNeeded <= 0) continue;

        const otherAssign = Math.min(otherNeeded, remainder);
        const otherNewSettlements = [
          ...(other.settlements || []),
          {
            ...settlement,
            amount: otherAssign,
            id: generateUUID(),
            note: settlement.note ? `${settlement.note} (Cascaded)` : `Cascaded settlement`,
          },
        ];
        remainder = round2(remainder - otherAssign);
        const newOtherTotal = round2(otherNewSettlements.reduce((sum, s) => sum + s.amount, 0));
        modifiedEntries.push({
          ...other,
          settlements: otherNewSettlements,
          status: newOtherTotal >= other.amount ? 'closed' : newOtherTotal > 0 ? 'partially_settled' : 'open',
          updatedAt: new Date().toISOString(),
        });
      }

      // If there is still an excess remainder, add it to the last modified entry
      if (remainder > 0 && modifiedEntries.length > 0) {
        const lastEntry = modifiedEntries[modifiedEntries.length - 1];
        const lastS = lastEntry.settlements[lastEntry.settlements.length - 1];
        if (lastS) {
          lastS.amount = round2(lastS.amount + remainder);
        }
      }
    }

    // Update peopleLedgerRef and state
    const modifiedMap = new Map(modifiedEntries.map((e) => [e.id, e]));
    peopleLedgerRef.current = peopleLedgerRef.current.map((p) => modifiedMap.get(p.id) || p);
    setPeopleLedger(peopleLedgerRef.current);

    // Save modified entries
    for (const entry of modifiedEntries) {
      await saveEncryptedRecord('people', entry, sessionKey);
    }

    // Adjust account balance ONCE for the FULL settlement amount
    if (settlement.accountId) {
      const acc = accountsRef.current.find((a) => a.id === settlement.accountId);
      if (acc && isTxAfterBaseline(settlement.date, acc.balanceAsOfDate)) {
        const delta = target.type === 'lent' ? validSettlementAmt : -validSettlementAmt;
        const updatedAcc = { ...acc, balance: round2(acc.balance + delta), updatedAt: new Date().toISOString() };
        accountsRef.current = accountsRef.current.map((a) => (a.id === updatedAcc.id ? updatedAcc : a));
        setAccounts(accountsRef.current);
        await saveEncryptedRecord('account', updatedAcc, sessionKey);
      }
    }
  const updateSettlement = async (
    entryId: string,
    settlementId: string,
    updates: { amount: number; date: string; accountId?: string; note?: string }
  ): Promise<void> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const target = peopleLedgerRef.current.find((p) => p.id === entryId);
    if (!target) return;

    const oldSettlement = (target.settlements || []).find((s) => s.id === settlementId);
    if (!oldSettlement) return;

    const validAmount = round2(Math.abs(Number(updates.amount)));
    const balanceDeltas: Record<string, number> = {};

    // 1. Reverse old settlement effect from old account
    if (oldSettlement.accountId) {
      const oldAcc = accountsRef.current.find((a) => a.id === oldSettlement.accountId);
      if (oldAcc && isTxAfterBaseline(oldSettlement.date, oldAcc.balanceAsOfDate)) {
        const revDelta = target.type === 'lent' ? -oldSettlement.amount : oldSettlement.amount;
        balanceDeltas[oldSettlement.accountId] = (balanceDeltas[oldSettlement.accountId] || 0) + revDelta;
      }
    }

    // 2. Apply new settlement effect on new account
    if (updates.accountId) {
      const newAcc = accountsRef.current.find((a) => a.id === updates.accountId);
      if (newAcc && isTxAfterBaseline(updates.date, newAcc.balanceAsOfDate)) {
        const newDelta = target.type === 'lent' ? validAmount : -validAmount;
        balanceDeltas[updates.accountId] = (balanceDeltas[updates.accountId] || 0) + newDelta;
      }
    }

    // Apply account updates if any delta is non-zero
    let accountsChanged = false;
    for (const [accId, delta] of Object.entries(balanceDeltas)) {
      if (Math.abs(delta) > 0.0001) {
        const acc = accountsRef.current.find((a) => a.id === accId);
        if (acc) {
          const updatedAcc = { ...acc, balance: round2(acc.balance + delta), updatedAt: new Date().toISOString() };
          accountsRef.current = accountsRef.current.map((a) => (a.id === updatedAcc.id ? updatedAcc : a));
          await saveEncryptedRecord('account', updatedAcc, sessionKey);
          accountsChanged = true;
        }
      }
    }
    if (accountsChanged) {
      setAccounts(accountsRef.current);
    }

    // 3. Update settlement in target entry and recalculate status
    const updatedSettlements = (target.settlements || []).map((s) =>
      s.id === settlementId
        ? {
            ...s,
            amount: validAmount,
            date: updates.date,
            accountId: updates.accountId || undefined,
            note: updates.note !== undefined ? updates.note.trim() || undefined : s.note,
          }
        : s
    );

    const totalSettled = round2(updatedSettlements.reduce((sum, s) => sum + s.amount, 0));
    let newStatus: PeopleLedgerEntry['status'] = 'open';
    if (target.amount === 0 || totalSettled >= target.amount) {
      newStatus = 'closed';
    } else if (totalSettled > 0) {
      newStatus = 'partially_settled';
    }

    const updatedTarget: PeopleLedgerEntry = {
      ...target,
      settlements: updatedSettlements,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    peopleLedgerRef.current = peopleLedgerRef.current.map((p) => (p.id === entryId ? updatedTarget : p));
    setPeopleLedger(peopleLedgerRef.current);
    await saveEncryptedRecord('people', updatedTarget, sessionKey);
  };

  const deleteSettlement = async (entryId: string, settlementId: string): Promise<void> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const target = peopleLedgerRef.current.find((p) => p.id === entryId);
    if (!target) return;

    const settlementToDelete = (target.settlements || []).find((s) => s.id === settlementId);
    if (!settlementToDelete) return;

    const remainingSettlements = (target.settlements || []).filter((s) => s.id !== settlementId);
    const totalSettled = round2(remainingSettlements.reduce((sum, s) => sum + s.amount, 0));

    let newStatus: PeopleLedgerEntry['status'] = 'open';
    if (totalSettled >= target.amount) {
      newStatus = 'closed';
    } else if (totalSettled > 0) {
      newStatus = 'partially_settled';
    }

    const updatedEntry: PeopleLedgerEntry = {
      ...target,
      settlements: remainingSettlements,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    peopleLedgerRef.current = peopleLedgerRef.current.map((p) => (p.id === entryId ? updatedEntry : p));
    setPeopleLedger(peopleLedgerRef.current);
    await saveEncryptedRecord('people', updatedEntry, sessionKey);

    // Reverse account balance if settlement had an account linked
    if (settlementToDelete.accountId) {
      const acc = accountsRef.current.find((a) => a.id === settlementToDelete.accountId);
      if (acc && isTxAfterBaseline(settlementToDelete.date, acc.balanceAsOfDate)) {
        const revDelta = target.type === 'lent' ? -settlementToDelete.amount : settlementToDelete.amount;
        const updatedAcc = { ...acc, balance: round2(acc.balance + revDelta), updatedAt: new Date().toISOString() };
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

      // 1. Reverse initial principal if linked to an account (and after baseline)
      if (target.accountId) {
        const acc = accountsRef.current.find((a) => a.id === target.accountId);
        if (acc && isTxAfterBaseline(target.date, acc.balanceAsOfDate)) {
          const revDelta = target.type === 'lent' ? target.amount : -target.amount;
          balanceDeltas[target.accountId] = (balanceDeltas[target.accountId] || 0) + revDelta;
        }
      }

      // 2. Reverse each settlement (if after baseline)
      (target.settlements || []).forEach((s) => {
        if (s.accountId) {
          const acc = accountsRef.current.find((a) => a.id === s.accountId);
          if (acc && isTxAfterBaseline(s.date, acc.balanceAsOfDate)) {
            const sRevDelta = target.type === 'lent' ? -s.amount : s.amount;
            balanceDeltas[s.accountId] = (balanceDeltas[s.accountId] || 0) + sRevDelta;
          }
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
    const targetAsset = assetsRef.current.find((a) => a.id === assetId);
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

    assetsRef.current = assetsRef.current.map((a) => (a.id === updatedAsset.id ? updatedAsset : a));
    setAssets(assetsRef.current);
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
      trancheId: sellTrancheId,
      subType: 'asset_sale',
      realizedGain,
      tags: ['asset-sale', 'redemption'],
      isSaleTrancheHandled: true,
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
        resetCategoriesToDefault,
        addPeopleEntry,
        updatePeopleEntry,
        updateContactProfile,
        addSettlement,
        updateSettlement,
        deleteSettlement,
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
