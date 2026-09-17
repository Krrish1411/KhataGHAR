import type { VaultData, VaultMeta } from '../../types';

export type SyncRole = 'host' | 'client';
export type SyncStatus = 'idle' | 'generating' | 'waiting' | 'connecting' | 'connected' | 'syncing' | 'synced' | 'error';

export interface DeviceStats {
  accountsCount: number;
  transactionsCount: number;
  assetsCount: number;
  notesCount: number;
  peopleCount: number;
  isFreshSeed: boolean;
}

export interface SyncPeerInfo {
  deviceId: string;
  deviceName: string;
  platform: 'android' | 'windows' | 'linux' | 'macos' | 'web';
  connectedAt: number;
  stats?: DeviceStats;
}

export type SyncTransport = 'relay' | 'webrtc';

export type SyncMessage =
  | { type: 'HANDSHAKE'; peer: SyncPeerInfo; lastSyncTs: number; stats?: DeviceStats }
  | { type: 'HANDSHAKE_ACK'; peer: SyncPeerInfo; lastSyncTs: number; stats?: DeviceStats }
  | { type: 'FULL_STATE'; state: VaultData; vaultMeta?: VaultMeta; timestamp: number }
  | { type: 'FORCE_REPLACE_STATE'; state: VaultData; vaultMeta?: VaultMeta; timestamp: number; masterDeviceName?: string }
  | { type: 'MASTER_SETUP_EVENT'; mode: 'clone_to_peer' | 'two_way'; masterDeviceName: string; timestamp: number }
  | { type: 'ROLE_SELECTION'; mode: 'clone_to_peer' | 'two_way'; masterDeviceName: string; timestamp: number }
  | { type: 'DELTA_STATE'; delta: Partial<VaultData>; timestamp: number }
  | { type: 'REQUEST_FULL_STATE'; timestamp: number }
  | { type: 'PING'; timestamp: number }
  | { type: 'PONG'; timestamp: number }
  | { type: 'DISCONNECT'; timestamp: number };

export interface EncryptedSyncPacket {
  iv: string; // base64 IV
  salt: string; // base64 salt
  ciphertext: string; // base64 AES-GCM ciphertext
  tagLength: number;
  isCompressed?: boolean;
}
