import 'dotenv/config';
import casper from 'casper-js-sdk';

const { byteHash } = casper as any; // Casper blake2b-256

const RPC = process.env.CASPER_NODE_RPC!;

// Reads Odra contract state off-chain. Odra stores every field in one `state`
// dictionary, item key = hex(blake2b(index_bytes ++ key_bytes)). Storage fields are
// 1-indexed (slot 0 is reserved); the stored CLValue is List<U8> = 4-byte LE length
// + the raw Odra serialization of the value.
async function rpc(method: string, params: any): Promise<any> {
  const r = await fetch(RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  return (await r.json())?.result;
}

const urefCache = new Map<string, string>();
async function stateUref(pkg: string): Promise<string> {
  if (urefCache.has(pkg)) return urefCache.get(pkg)!;
  const p = await rpc('query_global_state', { state_identifier: null, key: `hash-${pkg}`, path: [] });
  const cp = p.stored_value.ContractPackage ?? p.stored_value.Package;
  const ch = cp.versions[cp.versions.length - 1].contract_hash.replace('contract-', '');
  const c = await rpc('query_global_state', { state_identifier: null, key: `hash-${ch}`, path: [] });
  const uref = c.stored_value.Contract.named_keys.find((k: any) => k.name === 'state').key;
  urefCache.set(pkg, uref);
  return uref;
}

function clString(s: string): Uint8Array {
  const u = new TextEncoder().encode(s);
  const len = new Uint8Array(4);
  new DataView(len.buffer).setUint32(0, u.length, true);
  return new Uint8Array([...len, ...u]);
}

function itemKey(index: number, key?: string): string {
  const idx = new Uint8Array([0, 0, 0, index]); // index <= 15 → u32 BE
  const kb = key !== undefined ? clString(key) : new Uint8Array();
  return Buffer.from(byteHash(new Uint8Array([...idx, ...kb]))).toString('hex');
}

// Returns the raw Odra-serialized value bytes for field `index` (+ optional Mapping key), or null.
async function readField(pkg: string, index: number, key?: string): Promise<Buffer | null> {
  const uref = await stateUref(pkg);
  const srh = (await rpc('chain_get_state_root_hash', {})).state_root_hash;
  const r = await rpc('state_get_dictionary_item', {
    state_root_hash: srh,
    dictionary_identifier: { URef: { seed_uref: uref, dictionary_item_key: itemKey(index, key) } },
  });
  const cl = r?.stored_value?.CLValue;
  if (!cl?.bytes) return null;
  return Buffer.from(cl.bytes, 'hex').subarray(4); // strip List<U8> length prefix
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

export interface OnChainFeed {
  decimals: number; unit: string; title: string; source: string; route: string; frequency: string; description: string;
}
export interface OnChainValue {
  period: number; amount: bigint; source_hash: string; attester: string; timestamp: number;
}

// FeedRegistry.feeds is field index 2.
export async function getFeed(feedRegistryPkg: string, feedId: string): Promise<OnChainFeed | null> {
  const b = await readField(feedRegistryPkg, 2, feedId);
  if (!b) return null;
  const c = new Cursor(b);
  return { decimals: c.u8(), unit: c.string(), title: c.string(), source: c.string(), route: c.string(), frequency: c.string(), description: c.string() };
}

// AttestationRegistry.latest is field index 2.
export async function getLatest(registryPkg: string, assetId: string): Promise<OnChainValue | null> {
  const b = await readField(registryPkg, 2, assetId);
  if (!b) return null;
  const c = new Cursor(b);
  return { period: Number(c.u64()), amount: c.u512(), source_hash: c.string(), attester: c.address(), timestamp: Number(c.u64()) };
}

// AttestationRegistry.count is field index 4 (per-asset history length).
export async function getCount(registryPkg: string, assetId: string): Promise<number> {
  const b = await readField(registryPkg, 4, assetId);
  return b ? Number(new Cursor(b).u64()) : 0;
}

// AttestationRegistry.history is field index 3, keyed "<asset_id>#<index>".
export async function getAt(registryPkg: string, assetId: string, index: number): Promise<OnChainValue | null> {
  const b = await readField(registryPkg, 3, `${assetId}#${index}`);
  if (!b) return null;
  const c = new Cursor(b);
  return { period: Number(c.u64()), amount: c.u512(), source_hash: c.string(), attester: c.address(), timestamp: Number(c.u64()) };
}
