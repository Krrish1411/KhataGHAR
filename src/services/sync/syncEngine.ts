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

export const RELAY_SERVERS = [
  'https://ntfy.envs.net',
  'https://ntfy.sh',
];

export const STUN_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

interface SavedSyncSession {
  pin: string;
  secret: string;
  role: 'host' | 'joiner';
  deviceName: string;
  peer?: SyncPeerInfo | null;
  relayServer?: string;
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

/**
 * Post JSON payload to relay servers in parallel for zero split-brain and resilient delivery.
 */
async function postRelay(
  topic: string,
  body: string,
  preferredRelay?: string
): Promise<{ ok: boolean; relayUrl: string; status: number }> {
  const servers = preferredRelay
    ? [preferredRelay, ...RELAY_SERVERS.filter((s) => s !== preferredRelay)]
    : RELAY_SERVERS;

  const promises = servers.map(async (base) => {
    try {
      let res: Response;
      if (body.length > 4000) {
        res = await fetch(`${base}/${topic}`, {
          method: 'PUT',
          body,
          headers: {
            Filename: 'payload.json',
            Title: 'KhataGHAR Payload',
          },
        });
      } else {
        res = await fetch(`${base}/${topic}`, {
          method: 'POST',
          body,
          headers: {
            'Content-Type': 'application/json',
            Title: 'KhataGHAR Sync Packet',
          },
        });
      }
      return { ok: res.ok, relayUrl: base, status: res.status };
    } catch {
      return { ok: false, relayUrl: base, status: 0 };
    }
  });

  const results = await Promise.all(promises);
  const success = results.find((r) => r.ok);
  if (success) {
    return success;
  }
  return results[0] || { ok: false, relayUrl: servers[0], status: 0 };
}

/**
 * Query JSON messages from relay servers with automatic failover.
 */
async function queryRelayJson(
  topic: string,
  preferredRelay?: string
): Promise<{ data: any; relayUrl: string } | null> {
  const servers = preferredRelay
    ? [preferredRelay, ...RELAY_SERVERS.filter((s) => s !== preferredRelay)]
    : RELAY_SERVERS;

  for (const base of servers) {
    try {
      const res = await fetch(`${base}/${topic}/json?poll=1&since=all`);
      if (!res.ok) continue;
      const text = await res.text();
      const lines = text.trim().split('\n').filter(Boolean);
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const evt = JSON.parse(lines[i]);
          if (evt.event === 'message' && evt.message) {
            const parsed = JSON.parse(evt.message);
            if (parsed && (parsed.secret || parsed.pin || parsed.hostPeer)) {
              return { data: parsed, relayUrl: base };
            }
          }
        } catch {}
      }
    } catch {}
  }
  return null;
}

export function getItemTs(item: any): number {
  if (!item) return 0;
  if (item.updatedAt) {
    const t = new Date(item.updatedAt).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (item.date) {
    const t = new Date(item.date).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (item.createdAt) {
    const t = new Date(item.createdAt).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  return 0;
}

export function mergeList<T extends { id: string }>(
  local: T[] = [],
  remote: T[] = [],
  getTs: (item: T) => number = getItemTs
): T[] {
  const map = new Map<string, T>();
  for (const item of local) {
    if (item && item.id) map.set(item.id, item);
  }
  for (const item of remote) {
    if (!item || !item.id) continue;
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
    } else {
      const tLocal = getTs(existing);
      const tRemote = getTs(item);
      if (tRemote >= tLocal) {
        map.set(item.id, item);
      }
    }
  }
  return Array.from(map.values());
}

/**
 * Merge two full vault states using Last-Write-Wins (LWW) per entity ID.
 */
export function mergeFullState(local: VaultData, remote: VaultData): VaultData {
  return {
    accounts: mergeList(local.accounts, remote.accounts),
    transactions: mergeList(local.transactions, remote.transactions),
    categories: mergeList(local.categories, remote.categories),
    peopleLedger: mergeList(local.peopleLedger, remote.peopleLedger),
    budgets: mergeList(local.budgets, remote.budgets),
    goals: mergeList(local.goals, remote.goals),
    assets: mergeList(local.assets, remote.assets),
    liabilities: mergeList(local.liabilities, remote.liabilities),
    documents: mergeList(local.documents, remote.documents),
    plannedExpenses: mergeList(local.plannedExpenses || [], remote.plannedExpenses || []),
    notes: mergeList(local.notes || [], remote.notes || []),
    folders: mergeList(local.folders || [], remote.folders || []),
  };
}

/**
 * Merge a partial delta into local vault state.
 */
export function mergeDelta(local: VaultData, delta: Partial<VaultData>): VaultData {
  return {
    accounts: delta.accounts ? mergeList(local.accounts, delta.accounts) : local.accounts,
    transactions: delta.transactions ? mergeList(local.transactions, delta.transactions) : local.transactions,
    categories: delta.categories ? mergeList(local.categories, delta.categories) : local.categories,
    peopleLedger: delta.peopleLedger ? mergeList(local.peopleLedger, delta.peopleLedger) : local.peopleLedger,
    budgets: delta.budgets ? mergeList(local.budgets, delta.budgets) : local.budgets,
    goals: delta.goals ? mergeList(local.goals, delta.goals) : local.goals,
    assets: delta.assets ? mergeList(local.assets, delta.assets) : local.assets,
    liabilities: delta.liabilities ? mergeList(local.liabilities, delta.liabilities) : local.liabilities,
    documents: delta.documents ? mergeList(local.documents, delta.documents) : local.documents,
    plannedExpenses: delta.plannedExpenses ? mergeList(local.plannedExpenses || [], delta.plannedExpenses) : local.plannedExpenses,
    notes: delta.notes ? mergeList(local.notes || [], delta.notes) : local.notes,
    folders: delta.folders ? mergeList(local.folders || [], delta.folders) : local.folders,
  };
}

export type SyncStatusListener = (status: SyncStatus, peer?: SyncPeerInfo) => void;
export type StateApplyListener = (receivedState: VaultData, meta?: VaultMeta) => Promise<void> | void;

export class KhataSyncEngine {
  private pc: RTCPeerConnection | null = null;
  private channel: RTCDataChannel | null = null;
  private sharedSecret: string = '';
  private status: SyncStatus = 'idle';
  private connectedPeer: SyncPeerInfo | null = null;
  private transportType: SyncTransport = 'relay';
  private isHost: boolean = false;
  private activePin: string | null = null;
  private activeRelayServer: string = RELAY_SERVERS[0];
  private sessionMasterEstablished: boolean = false;

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
      // Auto-reconnect once on boot if pairing exists
      setTimeout(() => this.tryAutoReconnect(), 800);

      // Reconnect when network returns online
      window.addEventListener('online', () => {
        if (this.status === 'idle' || this.status === 'connecting') {
          this.tryAutoReconnect();
        }
      });

      // Probe reconnect when app or mobile tab regains visibility / focus
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          if (this.status !== 'connected' && this.status !== 'syncing') {
            this.tryAutoReconnect();
          }
        }
      });

      window.addEventListener('focus', () => {
        if (this.status !== 'connected' && this.status !== 'syncing') {
          this.tryAutoReconnect();
        }
      });

      // Background heartbeat: periodically probe SSE liveness if paired session exists
      setInterval(() => {
        if (this.status !== 'connected' && this.status !== 'syncing') {
          const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(SYNC_STORAGE_KEY) : null;
          if (raw) {
            this.tryAutoReconnect();
          }
        }
      }, 25000);
    }
  }

  public getStatus(): SyncStatus {
    return this.status;
  }

  public getConnectedPeer(): SyncPeerInfo | null {
    return this.connectedPeer;
  }

  public getTransportType(): SyncTransport {
    return this.transportType;
  }

  public getActivePin(): string | null {
    return this.activePin;
  }

  public isMasterEstablished(): boolean {
    return this.sessionMasterEstablished;
  }

  public setMasterEstablished(established: boolean, masterDeviceName?: string): void {
    this.sessionMasterEstablished = established;
    if (typeof localStorage !== 'undefined') {
      if (established) {
        localStorage.setItem(MASTER_ESTABLISHED_KEY, 'true');
        if (masterDeviceName) localStorage.setItem(MASTER_DEVICE_KEY, masterDeviceName);
      } else {
        localStorage.removeItem(MASTER_ESTABLISHED_KEY);
        localStorage.removeItem(MASTER_ROLE_KEY);
        localStorage.removeItem(MASTER_DEVICE_KEY);
      }
    }
    for (const l of this.masterSetupListeners) {
      if (established) {
        l({ mode: 'clone_to_peer', masterDeviceName: masterDeviceName || 'Primary Master' });
      }
    }
  }

  public resetMasterStatus(): void {
    this.sessionMasterEstablished = false;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(MASTER_ESTABLISHED_KEY);
      localStorage.removeItem(MASTER_ROLE_KEY);
      localStorage.removeItem(MASTER_DEVICE_KEY);
    }
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
    await this.sendMessage({
      type: 'ROLE_SELECTION',
      mode,
      masterDeviceName,
      timestamp: Date.now(),
    });
  }

  public async sendMasterSetupEvent(mode: 'clone_to_peer' | 'two_way', masterDeviceName: string): Promise<void> {
    if (this.status !== 'connected') return;
    await this.sendMessage({
      type: 'MASTER_SETUP_EVENT',
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
            relayServer: this.activeRelayServer,
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

  public getLocalPeerInfo(overrideName?: string): SyncPeerInfo {
    return {
      deviceId: (this.isHost ? 'host-' : 'joiner-') + Date.now().toString(36),
      deviceName: overrideName || (this.isHost ? 'Host Device' : 'Joiner Device'),
      platform: detectPlatform(),
      connectedAt: Date.now(),
      stats: this.getLocalStats(),
      relayServer: this.activeRelayServer,
    };
  }

  private waitForAllIceCandidates(pc: RTCPeerConnection, maxMs: number = 1200): Promise<void> {
    return new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve();
        return;
      }
      let timer: any = null;
      const check = () => {
        if (pc.iceGatheringState === 'complete') {
          pc.removeEventListener('icegatheringstatechange', check);
          if (timer) clearTimeout(timer);
          resolve();
        }
      };
      pc.addEventListener('icegatheringstatechange', check);
      timer = setTimeout(() => {
        pc.removeEventListener('icegatheringstatechange', check);
        resolve();
      }, maxMs);
    });
  }

  private setupChannel(ch: RTCDataChannel) {
    this.channel = ch;
    ch.onopen = () => {
      console.log('[Sync] WebRTC DataChannel established! Direct P2P active.');
      this.transportType = 'webrtc';
      this.setStatus('connected', this.connectedPeer);
      this.startHeartbeat();

      this.sendMessage({
        type: 'HANDSHAKE',
        peer: this.getLocalPeerInfo(),
        lastSyncTs: Date.now(),
        stats: this.getLocalStats(),
      }).catch(() => {});
    };

    ch.onclose = () => {
      console.warn('[Sync] WebRTC DataChannel closed, falling back to multi-relay.');
      this.channel = null;
      if (this.status === 'connected') {
        this.transportType = 'relay';
      }
    };

    ch.onerror = (err) => {
      console.warn('[Sync] WebRTC DataChannel error:', err);
      if (this.status === 'connected') {
        this.transportType = 'relay';
      }
    };

    ch.onmessage = async (e) => {
      try {
        const rawPacket = JSON.parse(e.data) as EncryptedSyncPacket;
        const msg = await decryptSyncMessage(rawPacket, this.sharedSecret);
        await this.handleIncomingMessage(msg);
      } catch (err) {
        console.error('[Sync] Error decoding WebRTC message:', err);
      }
    };
  }

  private async extractMessagePayload(data: any): Promise<string> {
    if (data.attachment && data.attachment.url) {
      try {
        const res = await fetch(data.attachment.url);
        return await res.text();
      } catch (e) {
        console.warn('[Sync] Failed to fetch attachment payload from relay:', e);
        return '';
      }
    }
    return data.message || '';
  }

  private startRelayListener(topic: string, selfPeer: SyncPeerInfo, relayServer?: string) {
    if (this.eventSource) {
      try { this.eventSource.close(); } catch {}
      this.eventSource = null;
    }

    const base = relayServer || this.activeRelayServer || RELAY_SERVERS[0];
    const url = `${base}/${topic}/sse?since=all`;
    const es = new EventSource(url);
    this.eventSource = es;

    es.onmessage = async (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.event !== 'message') return;

        if (data.id && this.processedMessageIds.has(data.id)) return;
        if (data.id) {
          this.processedMessageIds.add(data.id);
          if (this.processedMessageIds.size > 500) {
            const first = this.processedMessageIds.values().next().value;
            if (first) this.processedMessageIds.delete(first);
          }
        }

        const payload = await this.extractMessagePayload(data);
        if (!payload || !this.sharedSecret) return;

        const packet: EncryptedSyncPacket = JSON.parse(payload);
        const msg: SyncMessage = await decryptSyncMessage(packet, this.sharedSecret);
        await this.handleIncomingMessage(msg, selfPeer);
      } catch (err) {
        console.warn('[Sync] Error decoding incoming relay packet:', err);
      }
    };

    es.onerror = () => {
      // Browser EventSource automatically reconnects
    };
  }

  public async sendMessage(msg: SyncMessage): Promise<void> {
    if (this.transportType === 'webrtc' && this.channel && this.channel.readyState === 'open') {
      try {
        const packet = await encryptSyncMessage(msg, this.sharedSecret);
        this.channel.send(JSON.stringify(packet));
        return;
      } catch (e) {
        console.warn('[Sync] WebRTC send failed, falling back to relay:', e);
        this.transportType = 'relay';
      }
    }
    await this.sendRelayMessage(msg);
  }

  private async sendRelayMessage(msg: SyncMessage): Promise<void> {
    if (!this.outgoingTopic || !this.sharedSecret) return;
    try {
      const packet = await encryptSyncMessage(msg, this.sharedSecret);
      const jsonStr = JSON.stringify(packet);
      const res = await postRelay(this.outgoingTopic, jsonStr, this.activeRelayServer);
      if (res.ok && res.relayUrl !== this.activeRelayServer) {
        this.activeRelayServer = res.relayUrl;
      }
    } catch (e) {
      console.error('[Sync] Failed to send relay packet:', e);
    }
  }

  /**
   * Device 1 (Host): Creates a session with a 6-digit numeric PIN.
   */
  public async hostSession(
    deviceName: string,
    onProgress?: (msg: string) => void
  ): Promise<string> {
    this.resetMasterStatus();
    this.stopHeartbeat();
    if (this.eventSource) {
      try { this.eventSource.close(); } catch {}
      this.eventSource = null;
    }
    if (this.channel) {
      try { this.channel.close(); } catch {}
      this.channel = null;
    }
    if (this.pc) {
      try { this.pc.close(); } catch {}
      this.pc = null;
    }
    this.processedMessageIds.clear();
    this.setStatus('generating');
    this.isHost = true;
    this.transportType = 'relay';

    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    this.activePin = pin;

    // Generate 256-bit crypto-secure random hex secret
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    this.sharedSecret = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');

    this.outgoingTopic = `khataghar-sync-${pin}-h2j`;
    this.incomingTopic = `khataghar-sync-${pin}-j2h`;

    const hostPeer: SyncPeerInfo = {
      deviceId: 'host-' + Date.now().toString(36),
      deviceName,
      platform: detectPlatform(),
      connectedAt: Date.now(),
      stats: this.getLocalStats(),
    };

    onProgress?.('Generating Google STUN direct P2P connection...');

    // Create RTCPeerConnection & DataChannel for direct P2P
    let sdpOfferStr = '';
    try {
      this.pc = new RTCPeerConnection(STUN_SERVERS);
      const ch = this.pc.createDataChannel('khata-sync', { ordered: true });
      this.setupChannel(ch);

      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      await this.waitForAllIceCandidates(this.pc, 1000);
      sdpOfferStr = JSON.stringify(this.pc.localDescription);
    } catch (e) {
      console.warn('[Sync] WebRTC offer generation error (relay fallback active):', e);
    }

    onProgress?.('Broadcasting room across multi-relay mesh...');

    const metaPayload = JSON.stringify({
      pin,
      secret: this.sharedSecret,
      hostPeer,
      sdpOffer: sdpOfferStr || undefined,
      createdAt: Date.now(),
    });

    const postRes = await postRelay(`khataghar-sync-${pin}-meta`, metaPayload);
    this.activeRelayServer = postRes.relayUrl;

    this.startRelayListener(this.incomingTopic, hostPeer, this.activeRelayServer);
    this.setStatus('waiting');
    onProgress?.(`Waiting for peer to enter PIN ${pin}...`);

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
    this.resetMasterStatus();
    this.stopHeartbeat();
    if (this.eventSource) {
      try { this.eventSource.close(); } catch {}
      this.eventSource = null;
    }
    if (this.channel) {
      try { this.channel.close(); } catch {}
      this.channel = null;
    }
    if (this.pc) {
      try { this.pc.close(); } catch {}
      this.pc = null;
    }
    this.processedMessageIds.clear();
    this.setStatus('connecting');
    this.isHost = false;
    const cleanPin = pin.replace(/\s+/g, '');
    this.activePin = cleanPin;
    this.transportType = 'relay';

    onProgress?.('Locating pairing host across multi-relay mesh...');

    let metaResult: { data: any; relayUrl: string } | null = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      metaResult = await queryRelayJson(`khataghar-sync-${cleanPin}-meta`);
      if (metaResult && metaResult.data?.secret && metaResult.data?.hostPeer) break;
      await new Promise((r) => setTimeout(r, 600));
    }

    if (!metaResult || !metaResult.data) {
      this.setStatus('error');
      throw new Error(
        `No active pairing session found for PIN ${cleanPin}. Please verify that the Host device has KhataGHAR open with the PIN displayed.`
      );
    }

    const meta = metaResult.data;
    this.activeRelayServer = metaResult.relayUrl;
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
      relayServer: this.activeRelayServer,
    };

    this.startRelayListener(this.incomingTopic, joinerPeer, this.activeRelayServer);

    // If Host provided SDP offer, answer it for direct WebRTC DataChannel
    if (meta.sdpOffer) {
      try {
        this.pc = new RTCPeerConnection(STUN_SERVERS);
        this.pc.ondatachannel = (e) => {
          this.setupChannel(e.channel);
        };
        const remoteDesc = JSON.parse(meta.sdpOffer) as RTCSessionDescriptionInit;
        await this.pc.setRemoteDescription(remoteDesc);
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        await this.waitForAllIceCandidates(this.pc, 1000);

        await this.sendRelayMessage({
          type: 'SDP_ANSWER',
          sdpAnswer: JSON.stringify(this.pc.localDescription),
          peer: joinerPeer,
        });
      } catch (e) {
        console.warn('[Sync] WebRTC answer negotiation failed (relay transport active):', e);
      }
    }

    // Send immediate HANDSHAKE to Host
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

  private async handleIncomingMessage(msg: SyncMessage, selfPeer?: SyncPeerInfo) {
    this.lastHeartbeatReceived = Date.now();

    if (msg.type === 'SDP_OFFER') {
      try {
        if (this.pc) {
          try { this.pc.close(); } catch {}
          this.pc = null;
        }
        this.pc = new RTCPeerConnection(STUN_SERVERS);
        this.pc.ondatachannel = (e) => {
          this.setupChannel(e.channel);
        };
        const remoteOffer = JSON.parse(msg.sdpOffer) as RTCSessionDescriptionInit;
        await this.pc.setRemoteDescription(remoteOffer);
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        await this.waitForAllIceCandidates(this.pc, 1000);

        const replyPeer = selfPeer || this.getLocalPeerInfo();
        await this.sendRelayMessage({
          type: 'SDP_ANSWER',
          sdpAnswer: JSON.stringify(this.pc.localDescription),
          peer: replyPeer,
        });
      } catch (e) {
        console.warn('[Sync] Error answering WebRTC offer:', e);
      }
      return;
    }

    if (msg.type === 'SDP_ANSWER') {
      if (this.pc && this.pc.signalingState !== 'closed' && !this.pc.currentRemoteDescription) {
        try {
          const desc = JSON.parse(msg.sdpAnswer) as RTCSessionDescriptionInit;
          await this.pc.setRemoteDescription(desc);
          console.log('[Sync] Remote SDP answer set on Host successfully.');
        } catch (e) {
          console.warn('[Sync] Failed to set remote description from SDP answer:', e);
        }
      }
      if (msg.peer) {
        this.connectedPeer = msg.peer;
        this.setStatus('connected', msg.peer);
      }
      return;
    }

    if (msg.type === 'PING') {
      this.sendMessage({ type: 'PONG', timestamp: Date.now() }).catch(() => {});
      return;
    }

    if (msg.type === 'PONG') {
      return;
    }

    if (msg.type === 'ROLE_SELECTION') {
      const masterName = msg.masterDeviceName || this.connectedPeer?.deviceName || 'Primary Device';
      for (const l of this.roleSelectionListeners) {
        l({ mode: msg.mode, masterDeviceName: masterName });
      }
      return;
    }

    if (msg.type === 'HANDSHAKE') {
      this.connectedPeer = msg.peer;
      this.setStatus('connected', msg.peer);

      const replyPeer = selfPeer || this.getLocalPeerInfo();
      await this.sendMessage({
        type: 'HANDSHAKE_ACK',
        peer: { ...replyPeer, stats: this.getLocalStats() },
        lastSyncTs: Date.now(),
        stats: this.getLocalStats(),
      });
      return;
    }

    if (msg.type === 'HANDSHAKE_ACK') {
      this.connectedPeer = msg.peer;
      this.setStatus('connected', msg.peer);
      return;
    }

    if (msg.type === 'FORCE_REPLACE_STATE') {
      this.setStatus('syncing');
      const masterName = msg.masterDeviceName || this.connectedPeer?.deviceName || 'Primary Device';

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(MASTER_ESTABLISHED_KEY, 'true');
        localStorage.setItem(MASTER_ROLE_KEY, 'secondary');
        localStorage.setItem(MASTER_DEVICE_KEY, masterName);
      }
      this.sessionMasterEstablished = true;

      for (const l of this.stateApplyListeners) {
        await l(msg.state, msg.vaultMeta);
      }

      for (const l of this.masterSetupListeners) {
        l({ mode: 'clone_to_peer', masterDeviceName: masterName });
      }

      this.setStatus('synced');
      setTimeout(() => this.setStatus('connected'), 1500);

      sendNativeNotification({
        title: 'KhataGHAR — Vault Synced',
        body: `Cleanly mirrored vault from primary master ${masterName} without duplicates.`,
      });
      return;
    }

    if (msg.type === 'MASTER_SETUP_EVENT') {
      const masterName = msg.masterDeviceName || this.connectedPeer?.deviceName || 'Primary Device';
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(MASTER_ESTABLISHED_KEY, 'true');
        localStorage.setItem(MASTER_ROLE_KEY, msg.mode === 'clone_to_peer' ? 'secondary' : 'two_way');
        localStorage.setItem(MASTER_DEVICE_KEY, masterName);
      }
      this.sessionMasterEstablished = true;

      for (const l of this.masterSetupListeners) {
        l({ mode: msg.mode, masterDeviceName: masterName });
      }
      return;
    }

    if (msg.type === 'FULL_STATE') {
      this.setStatus('syncing');
      for (const l of this.stateApplyListeners) {
        await l(msg.state, msg.vaultMeta);
      }
      this.setStatus('synced');
      setTimeout(() => this.setStatus('connected'), 1500);
      return;
    }

    if (msg.type === 'DELTA_STATE') {
      this.setStatus('syncing');
      if (this.localStateGetter) {
        const local = this.localStateGetter();
        if (local && local.data) {
          const merged = mergeDelta(local.data, msg.delta);
          for (const l of this.stateApplyListeners) {
            await l(merged, local.meta);
          }
        }
      }
      this.setStatus('synced');
      setTimeout(() => this.setStatus('connected'), 1500);
      return;
    }

    if (msg.type === 'REQUEST_FULL_STATE') {
      if (this.localStateGetter) {
        const local = this.localStateGetter();
        if (local && local.data) {
          const devName = typeof localStorage !== 'undefined' ? localStorage.getItem(MASTER_DEVICE_KEY) || 'Primary Device' : 'Primary Device';
          await this.forceCloneToPeer(local.data, local.meta, devName);
        }
      }
      return;
    }

    if (msg.type === 'DISCONNECT') {
      this.disconnect(false, false);
      for (const l of this.peerDisconnectListeners) {
        try { l(); } catch {}
      }
      return;
    }
  }

  /**
   * Primary Master Selection:
   * Clones current device vault to connected peer, cleanly overwriting remote data.
   */
  public async forceCloneToPeer(state: VaultData, meta?: VaultMeta, masterDeviceName?: string): Promise<void> {
    if (this.status !== 'connected') return;
    this.setStatus('syncing');

    const devName = masterDeviceName || 'Primary Device';
    try {
      await this.sendMessage({
        type: 'FORCE_REPLACE_STATE',
        state,
        vaultMeta: meta,
        masterDeviceName: devName,
        timestamp: Date.now(),
      });

      await this.sendMessage({
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
      this.sessionMasterEstablished = true;

      this.setStatus('synced');
      setTimeout(() => this.setStatus('connected'), 1500);

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
    if (this.status !== 'connected' && this.status !== 'synced') return;
    try {
      await this.sendMessage({
        type: 'FULL_STATE',
        state,
        vaultMeta: meta,
        timestamp: Date.now(),
      });
    } catch (e) {
      console.warn('[Sync] Broadcast full state error:', e);
      throw e;
    }
  }

  public async requestFullSync(): Promise<void> {
    if (this.status !== 'connected' && this.status !== 'synced') return;
    this.setStatus('syncing');
    try {
      await this.sendMessage({
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

    if (this.transportType === 'webrtc') {
      this.heartbeatTimer = setInterval(() => {
        if (this.status !== 'connected' || this.transportType !== 'webrtc') {
          this.stopHeartbeat();
          return;
        }
        this.sendMessage({ type: 'PING', timestamp: Date.now() }).catch(() => {});
        if (Date.now() - this.lastHeartbeatReceived > 45000) {
          console.warn('[Sync] WebRTC silent >45s, falling back to relay transport');
          this.transportType = 'relay';
          this.stopHeartbeat();
        }
      }, 25000);
    }
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  public async tryAutoReconnect(): Promise<void> {
    if (this.status === 'connected' || this.status === 'syncing') return;
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(SYNC_STORAGE_KEY) : null;
      if (!raw) return;
      const session: SavedSyncSession = JSON.parse(raw);
      if (!session.pin || !session.secret) return;

      this.isHost = session.role === 'host';
      this.activePin = session.pin;
      this.sharedSecret = session.secret;
      this.activeRelayServer = session.relayServer || RELAY_SERVERS[0];
      this.transportType = 'relay';
      this.outgoingTopic = this.isHost ? `khataghar-sync-${session.pin}-h2j` : `khataghar-sync-${session.pin}-j2h`;
      this.incomingTopic = this.isHost ? `khataghar-sync-${session.pin}-j2h` : `khataghar-sync-${session.pin}-h2j`;

      if (typeof localStorage !== 'undefined' && localStorage.getItem(MASTER_ESTABLISHED_KEY) === 'true') {
        this.sessionMasterEstablished = true;
      }

      const selfPeer = this.getLocalPeerInfo(session.deviceName);

      this.startRelayListener(this.incomingTopic, selfPeer, this.activeRelayServer);
      this.setStatus('connecting', session.peer || undefined);

      setTimeout(() => {
        if (this.status === 'connecting') {
          this.sendRelayMessage({
            type: 'HANDSHAKE',
            peer: selfPeer,
            lastSyncTs: Date.now(),
          }).catch(() => {});
        }
      }, 1000);

      // If host, initiate WebRTC offer negotiation over relay to upgrade to direct P2P DataChannel
      if (this.isHost) {
        setTimeout(async () => {
          try {
            if (this.pc) {
              try { this.pc.close(); } catch {}
              this.pc = null;
            }
            this.pc = new RTCPeerConnection(STUN_SERVERS);
            const ch = this.pc.createDataChannel('khata-sync', { ordered: true });
            this.setupChannel(ch);

            const offer = await this.pc.createOffer();
            await this.pc.setLocalDescription(offer);
            await this.waitForAllIceCandidates(this.pc, 1000);

            await this.sendRelayMessage({
              type: 'SDP_OFFER',
              sdpOffer: JSON.stringify(this.pc.localDescription),
              peer: selfPeer,
            });
          } catch (e) {
            console.warn('[Sync] Auto-reconnect WebRTC offer error:', e);
          }
        }, 1500);
      }
    } catch (e) {
      console.warn('[Sync] Auto reconnect error:', e);
    }
  }

  public async disconnect(notifyPeer: boolean = true, forgetSession: boolean = false): Promise<void> {
    this.stopHeartbeat();

    if (notifyPeer && (this.status === 'connected' || this.status === 'syncing') && this.outgoingTopic && this.sharedSecret) {
      try {
        await this.sendMessage({
          type: 'DISCONNECT',
          timestamp: Date.now(),
        });
        await new Promise((r) => setTimeout(r, 120));
      } catch (err) {
        console.warn('[Sync] Error dispatching disconnect packet:', err);
      }
    }

    if (this.eventSource) {
      try { this.eventSource.close(); } catch {}
      this.eventSource = null;
    }
    if (this.channel) {
      try { this.channel.close(); } catch {}
      this.channel = null;
    }
    if (this.pc) {
      try { this.pc.close(); } catch {}
      this.pc = null;
    }

    if (forgetSession && typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(SYNC_STORAGE_KEY);
        localStorage.removeItem(MASTER_ESTABLISHED_KEY);
        localStorage.removeItem(MASTER_ROLE_KEY);
        localStorage.removeItem(MASTER_DEVICE_KEY);
      } catch {}
    }

    this.outgoingTopic = '';
    this.incomingTopic = '';
    this.activePin = null;
    this.isHost = false;
    this.transportType = 'relay';
    this.processedMessageIds.clear();
    this.setStatus('idle', null);

    for (const l of this.peerDisconnectListeners) {
      try { l(); } catch {}
    }
  }

  public async unlink(): Promise<void> {
    this.resetMasterStatus();
    await this.disconnect(true, true);
  }
}

// Global Singleton Instance
export const syncEngine = new KhataSyncEngine();
