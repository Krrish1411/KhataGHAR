// Storage and Encrypted CRUD Operations for Khata Ghar via Dexie IndexedDB

import { db } from '../db';
import type {
  VaultMeta,
  EncryptedRecord,
  VaultData,
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
  CurrencyCode,
  NumberFormatType,
} from '../types';
import {
  generateSalt,
  deriveKey,
  generateVerifier,
  verifyKey,
  encryptData,
  decryptData,
} from './crypto';
import { generateStarterCategories } from '../utils/categories';

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface CreateVaultParams {
  name: string;
  password: string;
  currency?: CurrencyCode;
  numberFormat?: NumberFormatType;
  fyStartMonth?: number;
  autoLockMinutes?: number;
  isPrimary?: boolean;
}

// Create a new Vault with master password and starter categories
export async function createVault(params: CreateVaultParams): Promise<{
  vault: VaultMeta;
  key: CryptoKey;
  data: VaultData;
}> {
  const vaultId = generateUUID();
  const salt = generateSalt();
  const key = await deriveKey(params.password, salt);
  const verifier = await generateVerifier(key);

  const vault: VaultMeta = {
    id: vaultId,
    name: params.name || 'My Vault',
    salt,
    verifier,
    createdAt: new Date().toISOString(),
    currency: params.currency || 'INR',
    numberFormat: params.numberFormat || 'indian',
    fyStartMonth: params.fyStartMonth ?? 4, // April Indian FY
    isPrimary: params.isPrimary ?? true,
    includeInFamilyOverview: true,
    autoLockMinutes: params.autoLockMinutes ?? 5,
    exchangeRates: {
      INR: 1,
      USD: 86.5,
      EUR: 92.0,
      GBP: 110.0,
      AED: 23.5,
      SGD: 64.0,
      CAD: 60.5,
      AUD: 55.0,
    },
  };

  // Save vault metadata
  await db.vaults.put(vault);

  // Generate and encrypt starter categories and starter primary account
  const starterCategories = generateStarterCategories(vaultId);
  const encryptedRecords: EncryptedRecord[] = [];

  for (const cat of starterCategories) {
    const enc = await encryptData(cat, key);
    encryptedRecords.push({
      id: cat.id,
      vaultId,
      type: 'category',
      iv: enc.iv,
      ciphertext: enc.ciphertext,
      updatedAt: cat.updatedAt,
    });
  }

  const defaultAccount: Account = {
    id: generateUUID(),
    vaultId,
    name: 'Primary Account',
    type: 'bank',
    currency: params.currency || 'INR',
    balance: 0,
    initialBalance: 0,
    balanceAsOfDate: new Date().toISOString().split('T')[0],
    isVisibleOnDashboard: true,
    tag: 'personal',
    updatedAt: new Date().toISOString(),
  };
  const encAcc = await encryptData(defaultAccount, key);
  encryptedRecords.push({
    id: defaultAccount.id,
    vaultId,
    type: 'account',
    iv: encAcc.iv,
    ciphertext: encAcc.ciphertext,
    updatedAt: defaultAccount.updatedAt,
  });

  await db.records.bulkPut(encryptedRecords);

  const initialData: VaultData = {
    accounts: [defaultAccount],
    transactions: [],
    categories: starterCategories,
    peopleLedger: [],
    budgets: [],
    goals: [],
    assets: [],
    liabilities: [],
    documents: [],
    plannedExpenses: [],
  };

  return {
    vault,
    key,
    data: initialData,
  };
}

// Unlock an existing vault with password
export async function unlockVault(
  vaultId: string,
  password: string
): Promise<{ vault: VaultMeta; key: CryptoKey; data: VaultData } | null> {
  const vault = await db.vaults.get(vaultId);
  if (!vault) return null;

  const key = await deriveKey(password, vault.salt);
  const isValid = await verifyKey(key, vault.verifier);
  if (!isValid) return null;

  // Key is valid — decrypt all records for this vault
  const encryptedRows = await db.records.where('vaultId').equals(vaultId).toArray();

  const data: VaultData = {
    accounts: [],
    transactions: [],
    categories: [],
    peopleLedger: [],
    budgets: [],
    goals: [],
    assets: [],
    liabilities: [],
    documents: [],
    plannedExpenses: [],
  };

  await Promise.all(
    encryptedRows.map(async (row) => {
      try {
        switch (row.type) {
          case 'account': {
            const item = await decryptData<Account>(row.iv, row.ciphertext, key);
            data.accounts.push(item);
            break;
          }
          case 'transaction': {
            const item = await decryptData<Transaction>(row.iv, row.ciphertext, key);
            data.transactions.push(item);
            break;
          }
          case 'category': {
            const item = await decryptData<Category>(row.iv, row.ciphertext, key);
            data.categories.push(item);
            break;
          }
          case 'people': {
            const item = await decryptData<PeopleLedgerEntry>(row.iv, row.ciphertext, key);
            data.peopleLedger.push(item);
            break;
          }
          case 'budget': {
            const item = await decryptData<Budget>(row.iv, row.ciphertext, key);
            data.budgets.push(item);
            break;
          }
          case 'goal': {
            const item = await decryptData<SavingsGoal>(row.iv, row.ciphertext, key);
            data.goals.push(item);
            break;
          }
          case 'asset': {
            const item = await decryptData<Asset>(row.iv, row.ciphertext, key);
            data.assets.push(item);
            break;
          }
          case 'liability': {
            const item = await decryptData<Liability>(row.iv, row.ciphertext, key);
            data.liabilities.push(item);
            break;
          }
          case 'document': {
            const item = await decryptData<DocumentRecord>(row.iv, row.ciphertext, key);
            data.documents.push(item);
            break;
          }
          case 'plan': {
            const item = await decryptData<PlannedExpense>(row.iv, row.ciphertext, key);
            data.plannedExpenses!.push(item);
            break;
          }
        }
      } catch (err) {
        console.error(`Failed to decrypt record ${row.id}:`, err);
      }
    })
  );

  return { vault, key, data };
}

export const loadAndDecryptVault = unlockVault;

// Save single item encrypted to Dexie
export async function saveEncryptedRecord<T extends { id: string; vaultId: string; updatedAt?: string }>(
  type: EncryptedRecord['type'],
  item: T,
  key: CryptoKey
): Promise<void> {
  const enc = await encryptData(item, key);
  const record: EncryptedRecord = {
    id: item.id,
    vaultId: item.vaultId,
    type,
    iv: enc.iv,
    ciphertext: enc.ciphertext,
    updatedAt: item.updatedAt || new Date().toISOString(),
  };
  await db.records.put(record);
}

// Bulk save items encrypted to Dexie
export async function bulkSaveEncryptedRecords<T extends { id: string; vaultId: string; updatedAt?: string }>(
  type: EncryptedRecord['type'],
  items: T[],
  key: CryptoKey
): Promise<void> {
  const records: EncryptedRecord[] = [];
  for (const item of items) {
    const enc = await encryptData(item, key);
    records.push({
      id: item.id,
      vaultId: item.vaultId,
      type,
      iv: enc.iv,
      ciphertext: enc.ciphertext,
      updatedAt: item.updatedAt || new Date().toISOString(),
    });
  }
  await db.records.bulkPut(records);
}

// Delete item from Dexie
export async function deleteRecord(id: string): Promise<void> {
  await db.records.delete(id);
}

// Delete all records of a vault
export async function deleteVaultCompletely(vaultId: string): Promise<void> {
  await db.transaction('rw', db.vaults, db.records, async () => {
    await db.records.where('vaultId').equals(vaultId).delete();
    await db.vaults.delete(vaultId);
  });
}

// Change Vault Password (re-encrypts all items with new key)
export async function changeVaultPassword(
  vault: VaultMeta,
  oldKey: CryptoKey,
  newPassword: string
): Promise<{ updatedVault: VaultMeta; newKey: CryptoKey }> {
  // 1. Fetch and decrypt all records with old key
  const oldEncrypted = await db.records.where('vaultId').equals(vault.id).toArray();
  const decryptedItems: Array<{ id: string; type: EncryptedRecord['type']; data: any }> = [];

  for (const row of oldEncrypted) {
    const decrypted = await decryptData(row.iv, row.ciphertext, oldKey);
    decryptedItems.push({ id: row.id, type: row.type, data: decrypted });
  }

  // 2. Generate new salt, derive new key, and create new verifier
  const newSalt = generateSalt();
  const newKey = await deriveKey(newPassword, newSalt);
  const newVerifier = await generateVerifier(newKey);

  // 3. Re-encrypt all items with new key
  const newEncryptedRows: EncryptedRecord[] = [];
  for (const item of decryptedItems) {
    const enc = await encryptData(item.data, newKey);
    newEncryptedRows.push({
      id: item.id,
      vaultId: vault.id,
      type: item.type,
      iv: enc.iv,
      ciphertext: enc.ciphertext,
      updatedAt: new Date().toISOString(),
    });
  }

  const updatedVault: VaultMeta = {
    ...vault,
    salt: newSalt,
    verifier: newVerifier,
  };

  // 4. Atomic transaction update
  await db.transaction('rw', db.vaults, db.records, async () => {
    await db.vaults.put(updatedVault);
    await db.records.bulkPut(newEncryptedRows);
  });

  return { updatedVault, newKey };
}

// Rename any vault in IndexedDB
export async function renameVault(vaultId: string, newName: string): Promise<void> {
  await db.vaults.update(vaultId, { name: newName.trim() });
}

export interface CreateMergedVaultParams {
  name: string;
  password: string;
  currency?: CurrencyCode;
  numberFormat?: NumberFormatType;
  sourceVaultsData: Array<{
    vault: VaultMeta;
    data: VaultData;
  }>;
}

// Create an aggregated multi-vault enclave encrypted with its own master key
export async function createMergedVault(
  params: CreateMergedVaultParams
): Promise<{ vault: VaultMeta; key: CryptoKey }> {
  const vaultId = generateUUID();
  const salt = generateSalt();
  const key = await deriveKey(params.password, salt);
  const verifier = await generateVerifier(key);

  const mergedVault: VaultMeta = {
    id: vaultId,
    name: params.name || 'Consolidated Family Vault',
    salt,
    verifier,
    createdAt: new Date().toISOString(),
    currency: params.currency || 'INR',
    numberFormat: params.numberFormat || 'indian',
    fyStartMonth: 4,
    isPrimary: false,
    includeInFamilyOverview: true,
    autoLockMinutes: 5,
    exchangeRates: {
      INR: 1,
      USD: 86.5,
      EUR: 92.0,
      GBP: 110.0,
      AED: 23.5,
      SGD: 64.0,
      CAD: 60.5,
      AUD: 55.0,
    },
    isMerged: true,
    mergedSourceVaultIds: params.sourceVaultsData.map((s) => s.vault.id),
  };

  const allRecords = await buildConsolidatedRecords(vaultId, key, params.sourceVaultsData);

  // Save vault and all records atomically
  await db.transaction('rw', db.vaults, db.records, async () => {
    await db.vaults.put(mergedVault);
    await db.records.bulkPut(allRecords);
  });

  return { vault: mergedVault, key };
}

export interface ReSyncMergedVaultParams {
  mergedVault: VaultMeta;
  mergedVaultKey: CryptoKey;
  sourceVaultsData: Array<{
    vault: VaultMeta;
    key?: CryptoKey;
    data: VaultData;
  }>;
}

// Re-synchronize an existing merged vault with latest data from its source constituent vaults
export async function reSyncMergedVault(
  params: ReSyncMergedVaultParams
): Promise<{ vault: VaultMeta; key: CryptoKey }> {
  const { mergedVault, mergedVaultKey, sourceVaultsData } = params;
  const vaultId = mergedVault.id;

  const allRecords = await buildConsolidatedRecords(vaultId, mergedVaultKey, sourceVaultsData);

  const updatedVault: VaultMeta = {
    ...mergedVault,
    mergedSourceVaultIds: sourceVaultsData.map((s) => s.vault.id),
  };

  await db.transaction('rw', db.vaults, db.records, async () => {
    // Purge old merged snapshot records for this vault
    await db.records.where('vaultId').equals(vaultId).delete();
    // Insert updated consolidated records
    await db.records.bulkPut(allRecords);
    // Update vault metadata
    await db.vaults.put(updatedVault);
  });

  return { vault: updatedVault, key: mergedVaultKey };
}

// Internal helper to map and encrypt records from source vaults for a merged enclave
async function buildConsolidatedRecords(
  vaultId: string,
  key: CryptoKey,
  sourceVaultsData: Array<{
    vault: VaultMeta;
    key?: CryptoKey;
    data: VaultData;
  }>
): Promise<EncryptedRecord[]> {
  const allRecords: EncryptedRecord[] = [];

  // Aggregated ID mappings
  const accountIdMap = new Map<string, string>();
  const categoryIdMap = new Map<string, string>();
  const assetIdMap = new Map<string, string>();
  const liabilityIdMap = new Map<string, string>();

  // 1. Categories
  const categoryNameMap = new Map<string, string>();
  for (const source of sourceVaultsData) {
    for (const cat of source.data.categories || []) {
      const lower = cat.name.toLowerCase().trim();
      let targetCatId = categoryNameMap.get(lower);
      if (!targetCatId) {
        targetCatId = generateUUID();
        categoryNameMap.set(lower, targetCatId);
        const newCat: Category = {
          ...cat,
          id: targetCatId,
          vaultId,
          updatedAt: new Date().toISOString(),
        };
        const enc = await encryptData(newCat, key);
        allRecords.push({
          id: newCat.id,
          vaultId,
          type: 'category',
          iv: enc.iv,
          ciphertext: enc.ciphertext,
          updatedAt: newCat.updatedAt,
        });
      }
      categoryIdMap.set(cat.id, targetCatId);
    }
  }

  // 2. Accounts (prefixed with source vault name)
  for (const source of sourceVaultsData) {
    for (const acc of source.data.accounts || []) {
      const newAccId = generateUUID();
      accountIdMap.set(acc.id, newAccId);
      const newAcc: Account = {
        ...acc,
        id: newAccId,
        vaultId,
        name: `[${source.vault.name}] ${acc.name}`,
        updatedAt: new Date().toISOString(),
      };
      const enc = await encryptData(newAcc, key);
      allRecords.push({
        id: newAcc.id,
        vaultId,
        type: 'account',
        iv: enc.iv,
        ciphertext: enc.ciphertext,
        updatedAt: newAcc.updatedAt,
      });
    }
  }

  // 3. Assets
  for (const source of sourceVaultsData) {
    for (const asset of source.data.assets || []) {
      const newAssetId = generateUUID();
      assetIdMap.set(asset.id, newAssetId);
      const newAsset: Asset = {
        ...asset,
        id: newAssetId,
        vaultId,
        name: `[${source.vault.name}] ${asset.name}`,
        updatedAt: new Date().toISOString(),
      };
      const enc = await encryptData(newAsset, key);
      allRecords.push({
        id: newAsset.id,
        vaultId,
        type: 'asset',
        iv: enc.iv,
        ciphertext: enc.ciphertext,
        updatedAt: newAsset.updatedAt,
      });
    }
  }

  // 4. Liabilities
  for (const source of sourceVaultsData) {
    for (const liab of source.data.liabilities || []) {
      const newLiabId = generateUUID();
      liabilityIdMap.set(liab.id, newLiabId);
      const newLiab: Liability = {
        ...liab,
        id: newLiabId,
        vaultId,
        name: `[${source.vault.name}] ${liab.name}`,
        updatedAt: new Date().toISOString(),
      };
      const enc = await encryptData(newLiab, key);
      allRecords.push({
        id: newLiab.id,
        vaultId,
        type: 'liability',
        iv: enc.iv,
        ciphertext: enc.ciphertext,
        updatedAt: newLiab.updatedAt,
      });
    }
  }

  // 5. Transactions
  for (const source of sourceVaultsData) {
    for (const tx of source.data.transactions || []) {
      const newTxId = generateUUID();
      const newTx: Transaction = {
        ...tx,
        id: newTxId,
        vaultId,
        accountId: accountIdMap.get(tx.accountId) || tx.accountId,
        toAccountId: tx.toAccountId ? (accountIdMap.get(tx.toAccountId) || tx.toAccountId) : undefined,
        categoryId: tx.categoryId ? (categoryIdMap.get(tx.categoryId) || tx.categoryId) : undefined,
        linkedAssetId: tx.linkedAssetId ? (assetIdMap.get(tx.linkedAssetId) || tx.linkedAssetId) : undefined,
        linkedLiabilityId: tx.linkedLiabilityId ? (liabilityIdMap.get(tx.linkedLiabilityId) || tx.linkedLiabilityId) : undefined,
        updatedAt: new Date().toISOString(),
      };
      const enc = await encryptData(newTx, key);
      allRecords.push({
        id: newTx.id,
        vaultId,
        type: 'transaction',
        iv: enc.iv,
        ciphertext: enc.ciphertext,
        updatedAt: newTx.updatedAt,
      });
    }
  }

  // 6. People Ledger
  for (const source of sourceVaultsData) {
    for (const p of source.data.peopleLedger || []) {
      const newPId = generateUUID();
      const newP: PeopleLedgerEntry = {
        ...p,
        id: newPId,
        vaultId,
        contactName: `[${source.vault.name}] ${p.contactName}`,
        accountId: p.accountId ? (accountIdMap.get(p.accountId) || p.accountId) : undefined,
        updatedAt: new Date().toISOString(),
      };
      const enc = await encryptData(newP, key);
      allRecords.push({
        id: newP.id,
        vaultId,
        type: 'people',
        iv: enc.iv,
        ciphertext: enc.ciphertext,
        updatedAt: newP.updatedAt,
      });
    }
  }

  // 7. Budgets
  for (const source of sourceVaultsData) {
    for (const b of source.data.budgets || []) {
      const newBId = generateUUID();
      const newB: Budget = {
        ...b,
        id: newBId,
        vaultId,
        categoryId: categoryIdMap.get(b.categoryId) || b.categoryId,
        updatedAt: new Date().toISOString(),
      };
      const enc = await encryptData(newB, key);
      allRecords.push({
        id: newB.id,
        vaultId,
        type: 'budget',
        iv: enc.iv,
        ciphertext: enc.ciphertext,
        updatedAt: newB.updatedAt,
      });
    }
  }

  // 8. Goals
  for (const source of sourceVaultsData) {
    for (const g of source.data.goals || []) {
      const newGId = generateUUID();
      const newG: SavingsGoal = {
        ...g,
        id: newGId,
        vaultId,
        name: `[${source.vault.name}] ${g.name}`,
        updatedAt: new Date().toISOString(),
      };
      const enc = await encryptData(newG, key);
      allRecords.push({
        id: newG.id,
        vaultId,
        type: 'goal',
        iv: enc.iv,
        ciphertext: enc.ciphertext,
        updatedAt: newG.updatedAt,
      });
    }
  }

  return allRecords;
}
