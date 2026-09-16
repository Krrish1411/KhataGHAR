import type { VaultData, VaultMeta } from '../../types';
import type {
  SyncMessage,
  SyncStatus,
  SyncPeerInfo,
  EncryptedSyncPacket,
  SyncTransport,
  DeviceStats,
} from './syncTypes';
import { encryptSyncMessage, decryptSyncMessage } from './syncCrypto';
import { sendNativeNotification } from '../../utils/nativeNotification';

const SYNC_STORAGE_KEY = 'khataghar_sync_activeSession';
const MASTER_ESTABLISHED_KEY = 'khataghar_sync_masterEstablished';
const MASTER_ROLE_KEY = 'khataghar_sync_masterRole';
const MASTER_DEVICE_KEY = 'khataghar_sync_masterDeviceName';

interface SavedSyncSession {
  pin: string;
  secret: string;
  role: 'host' | 'joiner';
  deviceName: string;
  peer?: SyncPeerInfo | null;
}

export function detectPlatform(): SyncPeerInfo['platform'] {
  if (typeof navigator === 'undefined') return 'web';
  const ua = navigator.userAgent.toLowerCase();
  if (/android/i.test(ua)) return 'android';
  if (/windows/i.test(ua)) return 'windows';
  if (/linux/i.test(ua)) return 'linux';
  if (/macintosh|mac os x/i.test(ua)) return 'macos';
  return 'web';
}

export type SyncStatusListener = (status: SyncStatus, peer?: SyncPeerInfo) => void;
export type StateApplyListener = (receivedState: VaultData, meta?: VaultMeta) => Promise<void> | void;

export class KhataSyncEngine {
  private status: SyncStatus = 'idle';
  private connectedPeer: SyncPeerInfo | null = null;
  private transportType: SyncTransport = 'relay';
  private sharedSecret: string = '';
  private isHost: boolean = false;
  private activePin: string | null = null;

  private statusListeners: Set<SyncStatusListener> = new Set();
  private stateApplyListeners: Set<StateApplyListener> = new Set();
  private masterSetupListeners: Set<(event: { mode: 'clone_to_peer' | 'two_way'; masterDeviceName: string }) => void> = new Set();
  private roleSelectionListeners: Set<(event: { mode: 'clone_to_peer' | 'two_way'; masterDeviceName: string }) => void> = new Set();
  private peerDisconnectListeners: Set<() => void> = new Set();

  private eventSource: EventSource | null = null;
  private outgoingTopic: string = '';
  private incomingTopic: string = '';
  private processedMessageIds: Set<string> = new Set();

  private heartbeatTimer: any = null;
  private lastHeartbeatReceived: number = Date.now();
  private localStateGetter: (() => { data: VaultData; meta?: VaultMeta } | null) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      setTimeout(() => this.tryAutoReconnect(), 1000);
    }
  }

  public getStatus(): SyncStatus {
    return this.status;
  }

  public getConnectedPeer(): SyncPeerInfo | null {
    return this.connectedPeer;
  }

  public getActivePin(): string | null {
    return this.activePin;
  }

  public isMasterEstablished(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(MASTER_ESTABLISHED_KEY) === 'true';
  }

  public registerLocalStateGetter(getter: () => { data: VaultData; meta?: VaultMeta } | null) {
    this.localStateGetter = getter;
  }

  public onStatusChange(listener: SyncStatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status, this.connectedPeer ?? undefined);
    return () => this.statusListeners.delete(listener);
  }

  public onStateApply(listener: StateApplyListener): () => void {
    this.stateApplyListeners.add(listener);
    return () => this.stateApplyListeners.delete(listener);
  }

  public onMasterSetup(listener: (event: { mode: 'clone_to_peer' | 'two_way'; masterDeviceName: string }) => void): () => void {
    this.masterSetupListeners.add(listener);
    return () => this.masterSetupListeners.delete(listener);
  }

  public onRoleSelection(listener: (event: { mode: 'clone_to_peer' | 'two_way'; masterDeviceName: string }) => void): () => void {
    this.roleSelectionListeners.add(listener);
    return () => this.roleSelectionListeners.delete(listener);
  }

  public async sendRoleSelection(mode: 'clone_to_peer' | 'two_way', masterDeviceName: string): Promise<void> {
    if (this.status !== 'connected') return;
    await this.sendRelayMessage({
      type: 'ROLE_SELECTION',
      mode,
      masterDeviceName,
      timestamp: Date.now(),
    });
  }

  public onPeerDisconnect(listener: () => void): () => void {
    this.peerDisconnectListeners.add(listener);
    return () => this.peerDisconnectListeners.delete(listener);
  }

  private setStatus(status: SyncStatus, peer?: SyncPeerInfo | null) {
    this.status = status;
    if (peer !== undefined) this.connectedPeer = peer;

    if (status === 'connected') {
      this.startHeartbeat();
      if (this.activePin && this.sharedSecret && typeof localStorage !== 'undefined') {
        try {
          const saved: SavedSyncSession = {
            pin: this.activePin,
            secret: this.sharedSecret,
            role: this.isHost ? 'host' : 'joiner',
            deviceName: this.connectedPeer?.deviceName || 'Peer',
            peer: this.connectedPeer,
          };
          localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(saved));
        } catch {}
      }
    } else if (status === 'idle' || status === 'error') {
      this.stopHeartbeat();
    }

    for (const l of this.statusListeners) {
      l(this.status, this.connectedPeer ?? undefined);
    }
  }

  public getLocalStats(): DeviceStats {
    const s = this.localStateGetter ? this.localStateGetter() : null;
    if (!s || !s.data) {
      return { accountsCount: 0, transactionsCount: 0, assetsCount: 0, notesCount: 0, peopleCount: 0, isFreshSeed: true };
    }
    const d = s.data;
    const accountsCount = d.accounts ? d.accounts.length : 0;
    const transactionsCount = d.transactions ? d.transactions.length : 0;
    const assetsCount = d.assets ? d.assets.length : 0;
    const notesCount = d.notes ? d.notes.length : 0;
    const peopleCount = d.peopleLedger ? d.peopleLedger.length : 0;
    const isFreshSeed = transactionsCount === 0 && accountsCount <= 2;

    return {
      accountsCount,
      transactionsCount,
      assetsCount,
      notesCount,
      peopleCount,
      isFreshSeed,
    };
  }

  /**
   * Device 1 (Host): Creates a session with a 6-digit numeric PIN.
   */
  public async hostSession(
    deviceName: string,
    onProgress?: (msg: string) => void
  ): Promise<string> {
    this.stopHeartbeat();
    if (this.eventSource) {
      try { this.eventSource.close(); } catch {}
      this.eventSource = null;
    }

    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    this.activePin = pin;
    this.isHost = true;
    this.sharedSecret = `khataghar-secret-${pin}`;
    this.outgoingTopic = `khataghar-sync-${pin}-h2j`;
    this.incomingTopic = `khataghar-sync-${pin}-j2h`;
    this.processedMessageIds.clear();
    this.setStatus('generating');

    onProgress?.('Generating encrypted room...');

    const selfPeer: SyncPeerInfo = {
      deviceId: 'host-' + Date.now().toString(36),
      deviceName,
      platform: detectPlatform(),
      connectedAt: Date.now(),
      stats: this.getLocalStats(),
    };

    // Publish metadata to relay so joiner can verify host
    const metaPayload = JSON.stringify({
      secret: this.sharedSecret,
      hostPeer: selfPeer,
      timestamp: Date.now(),
    });

    await fetch(`https://ntfy.sh/khataghar-sync-${pin}-meta`, {
      method: 'POST',
      body: metaPayload,
      headers: {
        Title: 'KhataGHAR Room Meta',
        Tags: 'key',
      },
    }).catch((e) => console.warn('[Sync] Failed to publish room meta:', e));

    this.startRelayListener(this.incomingTopic, selfPeer);
    this.setStatus('waiting');
    onProgress?.(`Waiting for target device to enter PIN ${pin}...`);

    return pin;
  }

  /**
   * Device 2 (Joiner): Connects using the 6-digit PIN.
   */
  public async joinWithPin(
    pin: string,
    deviceName: string,
    onProgress?: (msg: string) => void
  ): Promise<void> {
    this.stopHeartbeat();
    if (this.eventSource) {
      try { this.eventSource.close(); } catch {}
      this.eventSource = null;
    }

    const cleanPin = pin.replace(/\s+/g, '');
    this.processedMessageIds.clear();
    this.setStatus('connecting');
    this.isHost = false;
    this.activePin = cleanPin;
    this.transportType = 'relay';

    onProgress?.('Locating pairing host...');

    let meta: any = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const res = await fetch(`https://ntfy.sh/khataghar-sync-${cleanPin}-meta/json?poll=1&since=all`);
        const text = await res.text();
        const lines = text.trim().split('\n').filter(Boolean);
        for (let i = lines.length - 1; i >= 0; i--) {
          try {
            const evt = JSON.parse(lines[i]);
            if (evt.event === 'message' && evt.message) {
              const parsed = JSON.parse(evt.message);
              if (parsed.secret && parsed.hostPeer) {
                meta = parsed;
                break;
              }
            }
          } catch {}
        }
        if (meta) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 700));
    }

    if (!meta) {
      this.setStatus('error');
      throw new Error(
        `No active pairing session found for PIN ${cleanPin}. Please verify that the Host device has KhataGHAR open with the PIN displayed.`
      );
    }

    this.sharedSecret = meta.secret;
    this.outgoingTopic = `khataghar-sync-${cleanPin}-j2h`;
    this.incomingTopic = `khataghar-sync-${cleanPin}-h2j`;

    onProgress?.('Host discovered! Initializing secure handshake...');

    const joinerPeer: SyncPeerInfo = {
      deviceId: 'joiner-' + Date.now().toString(36),
      deviceName,
      platform: detectPlatform(),
      connectedAt: Date.now(),
      stats: this.getLocalStats(),
    };

    this.startRelayListener(this.incomingTopic, joinerPeer);

    await this.sendRelayMessage({
      type: 'HANDSHAKE',
      peer: joinerPeer,
      lastSyncTs: Date.now(),
      stats: joinerPeer.stats,
    });

    this.connectedPeer = meta.hostPeer;
    this.setStatus('connected', meta.hostPeer);

    sendNativeNotification({
      title: 'KhataGHAR — Device Connected',
      body: `Connected securely to ${meta.hostPeer.deviceName}`,
    });

    onProgress?.(`Connected to ${meta.hostPeer.deviceName}!`);
  }

  private startRelayListener(topic: string, selfPeer: SyncPeerInfo) {
    if (this.eventSource) {
      try { this.eventSource.close(); } catch {}
      this.eventSource = null;
    }

    const url = `https://ntfy.sh/${topic}/sse?since=all`;
    const es = new EventSource(url);
    this.eventSource = es;

    es.onmessage = async (e) => {
      try {
        const evt = JSON.parse(e.data);
        if (evt.event !== 'message') return;

        if (this.processedMessageIds.has(evt.id)) return;
        this.processedMessageIds.add(evt.id);

        let payloadStr = '';
        if (evt.attachment && evt.attachment.url) {
          try {
            const res = await fetch(evt.attachment.url);
            payloadStr = await res.text();
          } catch {}
        } else {
          payloadStr = evt.message || '';
        }

        if (!payloadStr) return;
        const packet: EncryptedSyncPacket = JSON.parse(payloadStr);
        const msg = await decryptSyncMessage(packet, this.sharedSecret);
        await this.handleIncomingMessage(msg, selfPeer);
      } catch (err) {
        console.warn('[Sync] Error processing relay message:', err);
      }
    };

    es.onerror = () => {
      console.warn('[Sync] EventSource disconnected, will auto-reconnect...');
    };
  }

  private async sendRelayMessage(msg: SyncMessage): Promise<void> {
    if (!this.outgoingTopic || !this.sharedSecret) return;
    try {
      const packet = await encryptSyncMessage(msg, this.sharedSecret);
      const jsonStr = JSON.stringify(packet);

      // If packet > 4KB, post as attachment file to prevent relay length limits
      if (jsonStr.length > 4000) {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        await fetch(`https://ntfy.sh/${this.outgoingTopic}`, {
          method: 'PUT',
          body: blob,
          headers: {
            Title: 'KhataGHAR Sync Payload',
            Filename: 'payload.json',
          },
        });
      } else {
        await fetch(`https://ntfy.sh/${this.outgoingTopic}`, {
          method: 'POST',
          body: jsonStr,
          headers: {
            Title: 'KhataGHAR Sync Packet',
          },
        });
      }
    } catch (err) {
      console.warn('[Sync] Failed to send relay message:', err);
    }
  }

  private async handleIncomingMessage(msg: SyncMessage, selfPeer?: SyncPeerInfo) {
    this.lastHeartbeatReceived = Date.now();

    if (msg.type === 'PING') {
      this.sendRelayMessage({ type: 'PONG', timestamp: Date.now() }).catch(() => {});
    } else if (msg.type === 'PONG') {
      // Keepalive ack received
    } else if (msg.type === 'ROLE_SELECTION') {
      const masterName = msg.masterDeviceName || this.connectedPeer?.deviceName || 'Primary Device';
      for (const l of this.roleSelectionListeners) {
        l({ mode: msg.mode, masterDeviceName: masterName });
      }
    } else if (msg.type === 'HANDSHAKE') {
      this.connectedPeer = msg.peer;
      this.setStatus('connected', msg.peer);

      if (selfPeer) {
        await this.sendRelayMessage({
          type: 'HANDSHAKE_ACK',
          peer: { ...selfPeer, stats: this.getLocalStats() },
          lastSyncTs: Date.now(),
          stats: this.getLocalStats(),
        });
      }
    } else if (msg.type === 'HANDSHAKE_ACK') {
      this.connectedPeer = msg.peer;
      this.setStatus('connected', msg.peer);
    } else if (msg.type === 'FORCE_REPLACE_STATE') {
      this.setStatus('syncing');
      const masterName = msg.masterDeviceName || this.connectedPeer?.deviceName || 'Primary Device';

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(MASTER_ESTABLISHED_KEY, 'true');
        localStorage.setItem(MASTER_ROLE_KEY, 'secondary');
        localStorage.setItem(MASTER_DEVICE_KEY, masterName);
      }

      for (const l of this.stateApplyListeners) {
        await l(msg.state, msg.vaultMeta);
      }

      for (const l of this.masterSetupListeners) {
        l({ mode: 'clone_to_peer', masterDeviceName: masterName });
      }

      this.setStatus('synced');
      setTimeout(() => this.setStatus('connected'), 3000);

      sendNativeNotification({
        title: 'KhataGHAR — Vault Synced',
        body: `Cleanly mirrored vault from primary master ${masterName} without duplicates.`,
      });
    } else if (msg.type === 'FULL_STATE') {
      this.setStatus('syncing');
      for (const l of this.stateApplyListeners) {
        await l(msg.state, msg.vaultMeta);
      }
      this.setStatus('synced');
      setTimeout(() => this.setStatus('connected'), 3000);
    } else if (msg.type === 'REQUEST_FULL_STATE') {
      if (this.localStateGetter) {
        const local = this.localStateGetter();
        if (local && local.data) {
          const devName = typeof localStorage !== 'undefined' ? localStorage.getItem(MASTER_DEVICE_KEY) || 'Primary Device' : 'Primary Device';
          await this.forceCloneToPeer(local.data, local.meta, devName);
        }
      }
    } else if (msg.type === 'DISCONNECT') {
      this.disconnect(false);
    }
  }

  /**
   * Primary Master Selection:
   * Clones current device vault to connected peer, cleanly overwriting remote data.
   * Eliminates all duplication and clutter on initial sync.
   */
  public async forceCloneToPeer(state: VaultData, meta?: VaultMeta, masterDeviceName?: string): Promise<void> {
    if (this.status !== 'connected') return;
    this.setStatus('syncing');

    const devName = masterDeviceName || 'Primary Device';
    try {
      await this.sendRelayMessage({
        type: 'FORCE_REPLACE_STATE',
        state,
        vaultMeta: meta,
        masterDeviceName: devName,
        timestamp: Date.now(),
      });

      await this.sendRelayMessage({
        type: 'ROLE_SELECTION',
        mode: 'clone_to_peer',
        masterDeviceName: devName,
        timestamp: Date.now(),
      });

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(MASTER_ESTABLISHED_KEY, 'true');
        localStorage.setItem(MASTER_ROLE_KEY, 'master');
        localStorage.setItem(MASTER_DEVICE_KEY, devName);
      }

      this.setStatus('synced');
      setTimeout(() => this.setStatus('connected'), 3000);

      sendNativeNotification({
        title: 'KhataGHAR — Master Vault Synced',
        body: `Primary vault cloned to ${this.connectedPeer?.deviceName || 'peer device'} without duplicates.`,
      });
    } catch (e) {
      this.setStatus('connected');
      throw e;
    }
  }

  public async broadcastFullState(state: VaultData, meta?: VaultMeta): Promise<void> {
    if (this.status !== 'connected') return;
    this.setStatus('syncing');
    try {
      await this.sendRelayMessage({
        type: 'FULL_STATE',
        state,
        vaultMeta: meta,
        timestamp: Date.now(),
      });
      this.setStatus('synced');
      setTimeout(() => this.setStatus('connected'), 2500);
    } catch (e) {
      this.setStatus('connected');
      throw e;
    }
  }

  public async requestFullSync(): Promise<void> {
    if (this.status !== 'connected') return;
    this.setStatus('syncing');
    try {
      await this.sendRelayMessage({
        type: 'REQUEST_FULL_STATE',
        timestamp: Date.now(),
      });
    } catch (e) {
      this.setStatus('connected');
      throw e;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.lastHeartbeatReceived = Date.now();
    this.heartbeatTimer = setInterval(() => {
      if (this.status !== 'connected') {
        this.stopHeartbeat();
        return;
      }
      this.sendRelayMessage({ type: 'PING', timestamp: Date.now() }).catch(() => {});
      if (Date.now() - this.lastHeartbeatReceived > 30000) {
        console.warn('[Sync] Heartbeat timeout: peer silent for >30s.');
      }
    }, 10000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  public async tryAutoReconnect(): Promise<void> {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(SYNC_STORAGE_KEY) : null;
      if (!raw) return;
      const session: SavedSyncSession = JSON.parse(raw);
      if (!session.pin || !session.secret) return;

      this.isHost = session.role === 'host';
      this.activePin = session.pin;
      this.sharedSecret = session.secret;
      this.outgoingTopic = this.isHost ? `khataghar-sync-${session.pin}-h2j` : `khataghar-sync-${session.pin}-j2h`;
      this.incomingTopic = this.isHost ? `khataghar-sync-${session.pin}-j2h` : `khataghar-sync-${session.pin}-h2j`;

      const selfPeer: SyncPeerInfo = {
        deviceId: (this.isHost ? 'host-' : 'joiner-') + Date.now().toString(36),
        deviceName: session.deviceName || 'Device',
        platform: detectPlatform(),
        connectedAt: Date.now(),
      };

      this.startRelayListener(this.incomingTopic, selfPeer);
      this.setStatus('connected', session.peer || undefined);

      setTimeout(() => {
        this.sendRelayMessage({
          type: 'HANDSHAKE',
          peer: selfPeer,
          lastSyncTs: Date.now(),
        }).catch(() => {});
      }, 1000);
    } catch (e) {
      console.warn('[Sync] Auto reconnect error:', e);
    }
  }

  public async disconnect(notify = true): Promise<void> {
    if (notify) {
      await this.sendRelayMessage({ type: 'DISCONNECT', timestamp: Date.now() }).catch(() => {});
    }

    this.stopHeartbeat();
    if (this.eventSource) {
      try { this.eventSource.close(); } catch {}
      this.eventSource = null;
    }

    this.connectedPeer = null;
    this.activePin = null;
    this.sharedSecret = '';
    this.setStatus('idle');

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(SYNC_STORAGE_KEY);
    }

    for (const l of this.peerDisconnectListeners) {
      l();
    }
  }
}

// Global Singleton Instance
export const syncEngine = new KhataSyncEngine();
