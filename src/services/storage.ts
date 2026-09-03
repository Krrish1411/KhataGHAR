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

  // Generate and encrypt starter categories
  const starterCategories = generateStarterCategories(vaultId);
  const encryptedCategoryRecords: EncryptedRecord[] = [];

  for (const cat of starterCategories) {
    const enc = await encryptData(cat, key);
    encryptedCategoryRecords.push({
      id: cat.id,
      vaultId,
      type: 'category',
      iv: enc.iv,
      ciphertext: enc.ciphertext,
      updatedAt: cat.updatedAt,
    });
  }

  await db.records.bulkPut(encryptedCategoryRecords);

  const initialData: VaultData = {
    accounts: [],
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
