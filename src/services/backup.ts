// Encrypted Backup & Restore Service for Khata Ghar

import type { VaultMeta, VaultData } from '../types';
import {
  generateSalt,
  deriveKey,
  generateIV,
  bufferToHex,
  hexToBuffer,
  bufferToBase64,
  base64ToBuffer,
  generateVerifier,
  encryptData,
} from './crypto';
import { db } from '../db';
import { generateUUID } from './storage';

export interface BackupHeader {
  app: 'KhataGhar';
  version: '1.0';
  formatVersion: 1;
  vaultName: string;
  exportDate: string;
  salt: string;
  iv: string;
}

export interface BackupFileStructure {
  header: BackupHeader;
  ciphertext: string;
}

// 12-word mnemonic phrase wordlist (BIP-39 subset)
export const WORDLIST = [
  'amber', 'breeze', 'cedar', 'delta', 'ember', 'falcon', 'garnet', 'haven',
  'island', 'jasper', 'karma', 'lotus', 'marble', 'nectar', 'opal', 'pebble',
  'quartz', 'river', 'sapphire', 'timber', 'unity', 'valley', 'willow', 'zenith',
  'alpine', 'beacon', 'canyon', 'dune', 'echo', 'forest', 'grove', 'harbor',
  'indigo', 'jungle', 'lagoon', 'meadow', 'oasis', 'prairie', 'reef', 'summit',
  'tundra', 'upland', 'vortex', 'whisper', 'acorn', 'blossom', 'clover', 'drift',
];

export function generate12WordPassphrase(): string {
  const words: string[] = [];
  const randomBytes = new Uint8Array(12);
  crypto.getRandomValues(randomBytes);
  for (let i = 0; i < 12; i++) {
    const idx = randomBytes[i] % WORDLIST.length;
    words.push(WORDLIST[idx]);
  }
  return words.join(' ');
}

// Export Vault to Encrypted JSON string / file
export async function exportVaultEncrypted(
  vault: VaultMeta,
  data: VaultData,
  backupSecret: string
): Promise<string> {
  const salt = generateSalt();
  const key = await deriveKey(backupSecret, salt);
  const iv = generateIV();

  const payload = JSON.stringify({
    vault: {
      ...vault,
      id: generateUUID(), // New ID on export to avoid collisions
    },
    data,
  });

  const encoder = new TextEncoder();
  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    encoder.encode(payload)
  );

  const backupObj: BackupFileStructure = {
    header: {
      app: 'KhataGhar',
      version: '1.0',
      formatVersion: 1,
      vaultName: vault.name,
      exportDate: new Date().toISOString(),
      salt,
      iv: bufferToHex(iv),
    },
    ciphertext: bufferToBase64(ciphertextBuffer),
  };

  return JSON.stringify(backupObj, null, 2);
}

// Restore Vault from Encrypted JSON
export async function importVaultEncrypted(
  backupJsonString: string,
  backupSecret: string,
  newVaultNameOverride?: string
): Promise<{ vault: VaultMeta; data: VaultData; key: CryptoKey }> {
  const backupObj = JSON.parse(backupJsonString) as BackupFileStructure;

  if (backupObj.header?.app !== 'KhataGhar') {
    throw new Error('Invalid backup file: Not a Khata Ghar backup.');
  }

  const { salt, iv } = backupObj.header;
  const ivBytes = hexToBuffer(iv);
  const ciphertextBytes = base64ToBuffer(backupObj.ciphertext);

  let decryptedBuffer: ArrayBuffer | null = null;
  let effectiveSecret = backupSecret;

  try {
    const key = await deriveKey(backupSecret, salt);
    decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBytes,
      },
      key,
      ciphertextBytes
    );
  } catch (err) {
    // If decryption fails, try normalizing whitespace, newlines, commas & casing (crucial for 12-word recovery phrases)
    const normalized = backupSecret.trim().toLowerCase().replace(/[\r\n\t,]+/g, ' ').replace(/\s+/g, ' ');
    if (normalized !== backupSecret) {
      try {
        const altKey = await deriveKey(normalized, salt);
        decryptedBuffer = await crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv: ivBytes,
          },
          altKey,
          ciphertextBytes
        );
        effectiveSecret = normalized;
      } catch (altErr) {
        throw new Error('Incorrect backup password or passphrase. Decryption failed.');
      }
    } else {
      throw new Error('Incorrect backup password or passphrase. Decryption failed.');
    }
  }

  if (!decryptedBuffer) {
    throw new Error('Incorrect backup password or passphrase. Decryption failed.');
  }

  const decoder = new TextDecoder();
  const jsonString = decoder.decode(decryptedBuffer);
  const parsed = JSON.parse(jsonString) as { vault: VaultMeta; data: VaultData };

  const restoredVault: VaultMeta = {
    ...parsed.vault,
    id: generateUUID(),
    name: newVaultNameOverride || `${parsed.vault.name} (Restored)`,
    isPrimary: false,
    createdAt: new Date().toISOString(),
  };

  // Re-key vault with the user's effectiveSecret so it can be unlocked with the same secret
  const newVaultSalt = generateSalt();
  const newVaultKey = await deriveKey(effectiveSecret, newVaultSalt);
  restoredVault.salt = newVaultSalt;
  restoredVault.verifier = await generateVerifier(newVaultKey);

  // Save to IndexedDB
  await db.vaults.put(restoredVault);

  const encryptedRecords: Array<{ id: string; vaultId: string; type: any; iv: string; ciphertext: string; updatedAt: string }> = [];

  const types: Array<{ type: any; items: any[] }> = [
    { type: 'account', items: parsed.data.accounts || [] },
    { type: 'transaction', items: parsed.data.transactions || [] },
    { type: 'category', items: parsed.data.categories || [] },
    { type: 'people', items: parsed.data.peopleLedger || [] },
    { type: 'budget', items: parsed.data.budgets || [] },
    { type: 'goal', items: parsed.data.goals || [] },
    { type: 'asset', items: parsed.data.assets || [] },
    { type: 'liability', items: parsed.data.liabilities || [] },
    { type: 'document', items: parsed.data.documents || [] },
    { type: 'plan', items: parsed.data.plannedExpenses || [] },
    { type: 'note', items: (parsed.data as any).notes || [] },
    { type: 'folder', items: (parsed.data as any).folders || [] },
  ];

  for (const group of types) {
    for (const item of group.items) {
      item.vaultId = restoredVault.id;
      const enc = await encryptData(item, newVaultKey);
      encryptedRecords.push({
        id: item.id,
        vaultId: restoredVault.id,
        type: group.type,
        iv: enc.iv,
        ciphertext: enc.ciphertext,
        updatedAt: item.updatedAt || new Date().toISOString(),
      });
    }
  }

  await db.records.bulkPut(encryptedRecords);

  return {
    vault: restoredVault,
    data: parsed.data,
    key: newVaultKey,
  };
}

// Trigger browser file download
export function downloadFile(content: string, filename: string, mimeType: string = 'application/json') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Restore Vault from Unencrypted Portable Snapshot (.khataghar)
export async function importPlainSnapshot(
  snapshotJsonString: string,
  masterPassword: string,
  overrideName?: string
): Promise<{ vault: VaultMeta; data: VaultData; key: CryptoKey }> {
  const parsed = JSON.parse(snapshotJsonString);
  const data: VaultData = parsed.data;
  if (!data) throw new Error('Invalid snapshot: missing data payload.');

  const sourceMeta = parsed.vaultMeta || {};
  const newVaultSalt = generateSalt();
  const newVaultKey = await deriveKey(masterPassword, newVaultSalt);
  const verifier = await generateVerifier(newVaultKey);

  const restoredVault: VaultMeta = {
    ...sourceMeta,
    id: generateUUID(),
    name: overrideName || (sourceMeta.name ? `${sourceMeta.name} (Restored)` : 'Restored Vault'),
    currency: sourceMeta.currency || 'INR',
    numberFormat: sourceMeta.numberFormat || 'indian',
    fyStartMonth: sourceMeta.fyStartMonth || 4,
    includeInFamilyOverview: sourceMeta.includeInFamilyOverview ?? true,
    autoLockMinutes: sourceMeta.autoLockMinutes ?? 15,
    exchangeRates: sourceMeta.exchangeRates || { USD: 83.5, EUR: 90.2, GBP: 105.4, AED: 22.7, SGD: 62.1, CAD: 61.2, AUD: 54.8 },
    isPrimary: false,
    createdAt: new Date().toISOString(),
    salt: newVaultSalt,
    verifier,
  };

  await db.vaults.put(restoredVault);

  const encryptedRecords: Array<{ id: string; vaultId: string; type: any; iv: string; ciphertext: string; updatedAt: string }> = [];

  const types: Array<{ type: any; items: any[] }> = [
    { type: 'account', items: data.accounts || [] },
    { type: 'transaction', items: data.transactions || [] },
    { type: 'category', items: data.categories || [] },
    { type: 'people', items: data.peopleLedger || [] },
    { type: 'budget', items: data.budgets || [] },
    { type: 'goal', items: data.goals || [] },
    { type: 'asset', items: data.assets || [] },
    { type: 'liability', items: data.liabilities || [] },
    { type: 'document', items: data.documents || [] },
    { type: 'plan', items: data.plannedExpenses || [] },
    { type: 'note', items: (data as any).notes || [] },
    { type: 'folder', items: (data as any).folders || [] },
  ];

  for (const group of types) {
    for (const item of group.items) {
      item.vaultId = restoredVault.id;
      const enc = await encryptData(item, newVaultKey);
      encryptedRecords.push({
        id: item.id,
        vaultId: restoredVault.id,
        type: group.type,
        iv: enc.iv,
        ciphertext: enc.ciphertext,
        updatedAt: item.updatedAt || new Date().toISOString(),
      });
    }
  }

  await db.records.bulkPut(encryptedRecords);

  return {
    vault: restoredVault,
    data,
    key: newVaultKey,
  };
}

