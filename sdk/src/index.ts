import { blake2b } from '@noble/hashes/blake2b.js';

// Claros oracle reader — reads feed metadata (FeedRegistry) + values
// (AttestationRegistry) directly from Casper on-chain state. Odra stores every
// field in one `state` dictionary, item key = hex(blake2b(index_bytes ++ key_bytes));
// storage fields are 1-indexed; the stored CLValue is List<U8> = 4-byte LE length
// + the raw Odra serialization.

export interface ClarosConfig {
  rpc?: string;
  feedRegistry?: string; // package hash
  attestationRegistry?: string; // package hash
}

export interface Feed {
  decimals: number;
  unit: string;
  title: string;
  source: string;
  route: string;
  frequency: string;
  description: string;
}

export interface FeedValue {
  period: number;
  amount: bigint;
  source_hash: string;
  attester: string;
  timestamp: number;
}

export interface Reading extends Feed {
  feed_id: string;
  value: number; // amount / 10^decimals
  amount: bigint;
  period: number;
  source_hash: string;
  updated_at: number;
}

const DEFAULTS = {
  rpc: 'https://node.testnet.casper.network/rpc',
  feedRegistry: 'dac573fc3a4c9df921013300612cd289d193814e52a72f76abb0f18f04366f46',
  attestationRegistry: '236b510436c60b6a797d175c72c6014de367d43f1de1ca45f580d112f98116cc',
};

function u32le(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n, true);
  return b;
}
function u64le(n: bigint): Uint8Array {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setBigUint64(0, n, true);
  return b;
}
function clString(s: string): Uint8Array {
  const u = new TextEncoder().encode(s);
  return new Uint8Array([...u32le(u.length), ...u]);
}
function itemKey(index: number, keyBytes: Uint8Array = new Uint8Array()): string {
  const idx = new Uint8Array([0, 0, 0, index]); // index <= 15 → u32 BE
  const h = blake2b(new Uint8Array([...idx, ...keyBytes]), { dkLen: 32 });
  return Buffer.from(h).toString('hex');
}

class Cursor {
  pos = 0;
  constructor(private b: Buffer) {}
  u8() { return this.b[this.pos++]; }
  u32() { const v = this.b.readUInt32LE(this.pos); this.pos += 4; return v; }
  u64() { const v = this.b.readBigUInt64LE(this.pos); this.pos += 8; return v; }
  take(n: number) { const v = this.b.subarray(this.pos, this.pos + n); this.pos += n; return v; }
  string() { return this.take(this.u32()).toString('utf8'); }
  u512() { const n = this.u8(); const x = this.take(n); let v = 0n; for (let i = n - 1; i >= 0; i--) v = (v << 8n) | BigInt(x[i]); return v; }
  address() { const tag = this.u8(); const h = this.take(32); return (tag === 0 ? 'account-hash-' : 'hash-') + Buffer.from(h).toString('hex'); }
}

export class ClarosOracle {
  private rpc: string;
  private feedRegistry: string;
  private attestationRegistry: string;
  private urefCache = new Map<string, string>();

  constructor(cfg: ClarosConfig = {}) {
    this.rpc = cfg.rpc ?? DEFAULTS.rpc;
    this.feedRegistry = cfg.feedRegistry ?? DEFAULTS.feedRegistry;
    this.attestationRegistry = cfg.attestationRegistry ?? DEFAULTS.attestationRegistry;
  }

  private async call(method: string, params: any): Promise<any> {
    const r = await fetch(this.rpc, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    return ((await r.json()) as any)?.result;
  }

  private async stateUref(pkg: string): Promise<string> {
    if (this.urefCache.has(pkg)) return this.urefCache.get(pkg)!;
    const p = await this.call('query_global_state', { state_identifier: null, key: `hash-${pkg}`, path: [] });
    const cp = p.stored_value.ContractPackage ?? p.stored_value.Package;
    const ch = cp.versions[cp.versions.length - 1].contract_hash.replace('contract-', '');
    const c = await this.call('query_global_state', { state_identifier: null, key: `hash-${ch}`, path: [] });
    const uref = c.stored_value.Contract.named_keys.find((k: any) => k.name === 'state').key;
    this.urefCache.set(pkg, uref);
    return uref;
  }

  private async readField(pkg: string, index: number, keyBytes?: Uint8Array): Promise<Buffer | null> {
    const uref = await this.stateUref(pkg);
    const srh = (await this.call('chain_get_state_root_hash', {})).state_root_hash;
    const r = await this.call('state_get_dictionary_item', {
      state_root_hash: srh,
      dictionary_identifier: { URef: { seed_uref: uref, dictionary_item_key: itemKey(index, keyBytes) } },
    });
    const cl = r?.stored_value?.CLValue;
    if (!cl?.bytes) return null;
    return Buffer.from(cl.bytes, 'hex').subarray(4);
  }

  /** Self-describing metadata for a feed (FeedRegistry.feeds — field 2). */
  async getFeed(feedId: string): Promise<Feed | null> {
    const b = await this.readField(this.feedRegistry, 2, clString(feedId));
    if (!b) return null;
    const c = new Cursor(b);
    return { decimals: c.u8(), unit: c.string(), title: c.string(), source: c.string(), route: c.string(), frequency: c.string(), description: c.string() };
  }

  /** Latest attested value for a feed (AttestationRegistry.latest — field 2). */
  async getValue(feedId: string): Promise<FeedValue | null> {
    const b = await this.readField(this.attestationRegistry, 2, clString(feedId));
    if (!b) return null;
    const c = new Cursor(b);
    return { period: Number(c.u64()), amount: c.u512(), source_hash: c.string(), attester: c.address(), timestamp: Number(c.u64()) };
  }

  /** Full reading: metadata + value + human-scaled number. The one-call helper. */
  async getReading(feedId: string): Promise<Reading | null> {
    const [meta, val] = await Promise.all([this.getFeed(feedId), this.getValue(feedId)]);
    if (!meta || !val) return null;
    return {
      feed_id: feedId, ...meta,
      value: Number(val.amount) / 10 ** meta.decimals,
      amount: val.amount, period: val.period, source_hash: val.source_hash, updated_at: val.timestamp,
    };
  }

  /** Number of feeds registered on-chain (FeedRegistry.count — field 4). */
  async feedCount(): Promise<number> {
    const b = await this.readField(this.feedRegistry, 4);
    return b ? Number(new Cursor(b).u64()) : 0;
  }

  /** Feed id at index (FeedRegistry.ids — field 3). */
  async feedIdAt(i: number): Promise<string | null> {
    const b = await this.readField(this.feedRegistry, 3, u64le(BigInt(i)));
    return b ? new Cursor(b).string() : null;
  }

  /** Enumerate all on-chain feed ids. */
  async listFeedIds(): Promise<string[]> {
    const n = await this.feedCount();
    const ids: string[] = [];
    for (let i = 0; i < n; i++) { const id = await this.feedIdAt(i); if (id) ids.push(id); }
    return ids;
  }
}

export default ClarosOracle;
