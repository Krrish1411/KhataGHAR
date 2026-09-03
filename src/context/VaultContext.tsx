import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type {
  Account,
  Transaction,
  Category,
  PeopleLedgerEntry,
  Budget,
  SavingsGoal,
  Asset,
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

  // Transaction Operations
  addTransaction: (tx: Omit<Transaction, 'id' | 'vaultId' | 'updatedAt'>) => Promise<Transaction>;
  updateTransaction: (tx: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  bulkAddTransactions: (txs: Array<Omit<Transaction, 'id' | 'vaultId' | 'updatedAt'>>) => Promise<void>;

  // Category Operations
  addCategory: (cat: Omit<Category, 'id' | 'vaultId' | 'updatedAt'>) => Promise<Category>;
  updateCategory: (cat: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // People Ledger Operations
  addPeopleEntry: (entry: Omit<PeopleLedgerEntry, 'id' | 'vaultId' | 'updatedAt' | 'settlements' | 'status'>) => Promise<PeopleLedgerEntry>;
  updatePeopleEntry: (entry: PeopleLedgerEntry) => Promise<void>;
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

  // Transaction Operations
  const addTransaction = async (data: Omit<Transaction, 'id' | 'vaultId' | 'updatedAt'>): Promise<Transaction> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const newTx: Transaction = {
      ...data,
      id: generateUUID(),
      vaultId: activeVault.id,
      updatedAt: new Date().toISOString(),
    };

    // Update in-memory state & sort
    setTransactions((prev) => [newTx, ...prev].sort((a, b) => b.date.localeCompare(a.date)));

    // Update connected account balances
    if (newTx.type === 'expense') {
      setAccounts((prev) =>
        prev.map((acc) => {
          if (acc.id === newTx.accountId) {
            const updated = { ...acc, balance: acc.balance - newTx.amount, updatedAt: new Date().toISOString() };
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
            const updated = { ...acc, balance: acc.balance + newTx.amount, updatedAt: new Date().toISOString() };
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
            const updated = { ...acc, balance: acc.balance - newTx.amount, updatedAt: new Date().toISOString() };
            saveEncryptedRecord('account', updated, sessionKey);
            return updated;
          }
          if (acc.id === newTx.toAccountId) {
            const updated = { ...acc, balance: acc.balance + newTx.amount, updatedAt: new Date().toISOString() };
            saveEncryptedRecord('account', updated, sessionKey);
            return updated;
          }
          return acc;
        })
      );
    }

    await saveEncryptedRecord('transaction', newTx, sessionKey);
    return newTx;
  };

  const updateTransaction = async (tx: Transaction): Promise<void> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const updated = { ...tx, updatedAt: new Date().toISOString() };
    setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)).sort((a, b) => b.date.localeCompare(a.date)));
    await saveEncryptedRecord('transaction', updated, sessionKey);
  };

  const deleteTransaction = async (id: string): Promise<void> => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    await deleteRecord(id);
  };

  const bulkAddTransactions = async (
    items: Array<Omit<Transaction, 'id' | 'vaultId' | 'updatedAt'>>
  ): Promise<void> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const newTxs: Transaction[] = items.map((data) => ({
      ...data,
      id: generateUUID(),
      vaultId: activeVault.id,
      updatedAt: new Date().toISOString(),
    }));

    setTransactions((prev) => [...newTxs, ...prev].sort((a, b) => b.date.localeCompare(a.date)));

    // Update balances
    const balanceDeltas: Record<string, number> = {};
    newTxs.forEach((tx) => {
      if (tx.type === 'expense') {
        balanceDeltas[tx.accountId] = (balanceDeltas[tx.accountId] || 0) - tx.amount;
      } else if (tx.type === 'income') {
        balanceDeltas[tx.accountId] = (balanceDeltas[tx.accountId] || 0) + tx.amount;
      }
    });

    setAccounts((prev) =>
      prev.map((acc) => {
        if (balanceDeltas[acc.id]) {
          const updated = {
            ...acc,
            balance: acc.balance + balanceDeltas[acc.id],
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
    const newEntry: PeopleLedgerEntry = {
      ...data,
      id: generateUUID(),
      vaultId: activeVault.id,
      settlements: [],
      status: 'open',
      updatedAt: new Date().toISOString(),
    };
    setPeopleLedger((prev) => [newEntry, ...prev]);
    await saveEncryptedRecord('people', newEntry, sessionKey);
    return newEntry;
  };

  const updatePeopleEntry = async (entry: PeopleLedgerEntry): Promise<void> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const updated = { ...entry, updatedAt: new Date().toISOString() };
    setPeopleLedger((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    await saveEncryptedRecord('people', updated, sessionKey);
  };

  const addSettlement = async (entryId: string, settlement: Omit<SettlementRecord, 'id'>): Promise<void> => {
    if (!activeVault || !sessionKey) throw new Error('Vault is locked');
    const target = peopleLedger.find((p) => p.id === entryId);
    if (!target) return;

    const newSettlement: SettlementRecord = {
      ...settlement,
      id: generateUUID(),
    };

    const newSettlements = [...target.settlements, newSettlement];
    const totalSettled = newSettlements.reduce((sum, s) => sum + s.amount, 0);

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

    setPeopleLedger((prev) => prev.map((p) => (p.id === entryId ? updatedEntry : p)));
    await saveEncryptedRecord('people', updatedEntry, sessionKey);

    // If account was linked, adjust account balance
    if (settlement.accountId) {
      const acc = accounts.find((a) => a.id === settlement.accountId);
      if (acc) {
        // If lent money returned: +balance. If borrowed money paid back: -balance.
        const delta = target.type === 'lent' ? settlement.amount : -settlement.amount;
        const updatedAcc = { ...acc, balance: acc.balance + delta, updatedAt: new Date().toISOString() };
        setAccounts((prev) => prev.map((a) => (a.id === updatedAcc.id ? updatedAcc : a)));
        await saveEncryptedRecord('account', updatedAcc, sessionKey);
      }
    }
  };

  const deletePeopleEntry = async (id: string): Promise<void> => {
    setPeopleLedger((prev) => prev.filter((p) => p.id !== id));
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
    setAssets((prev) => [...prev, newAsset]);
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
        addTransaction,
        updateTransaction,
        deleteTransaction,
        bulkAddTransactions,
        addCategory,
        updateCategory,
        deleteCategory,
        addPeopleEntry,
        updatePeopleEntry,
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
