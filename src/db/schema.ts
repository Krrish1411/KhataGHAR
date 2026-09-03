import Dexie, { type Table } from 'dexie';
import type { VaultMeta, EncryptedRecord } from '../types';

export interface AppConfigRecord {
  key: string;
  value: any;
}

export class KhataGharDatabase extends Dexie {
  vaults!: Table<VaultMeta, string>;
  records!: Table<EncryptedRecord, string>;
  appConfig!: Table<AppConfigRecord, string>;

  constructor() {
    super('KhataGharDB');
    this.version(1).stores({
      vaults: 'id, name, isPrimary, createdAt',
      records: 'id, vaultId, type, updatedAt, [vaultId+type]',
      appConfig: 'key',
    });
  }
}

export const db = new KhataGharDatabase();
