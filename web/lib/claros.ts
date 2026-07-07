import "server-only"
import { blake2b } from "@noble/hashes/blake2b"
import { FLAGSHIP_IDS } from "./format"

// Claros on-chain reader (server-only). Mirrors the published `claros-oracle` SDK
// (sdk/src/index.ts) but adds a single-snapshot batch path + an in-memory
// stale-while-revalidate cache so the site reads 30+ feeds from Casper global
// state without re-fetching the state-root-hash per field. Odra stores every
// field in one `state` dictionary; item key = hex(blake2b(index_bytes ++ key_bytes));
// fields are 1-indexed; stored CLValue is List<U8> = 4-byte LE length + raw bytes.

const RPC = process.env.CASPER_NODE_RPC ?? "https://node.testnet.casper.network/rpc"
const FEED_REGISTRY = process.env.FEED_REGISTRY_PACKAGE_HASH ?? "741cc223c14c2c00c9f06d7bb5c4be2f824fbf0c8b09a147bf1835570bddf5b6"
const ATTESTATION_REGISTRY = process.env.ATTESTATION_REGISTRY_PACKAGE_HASH ?? "236b510436c60b6a797d175c72c6014de367d43f1de1ca45f580d112f98116cc"

export const NETWORK = "casper-test"
export const DATASETS_TOTAL = 232 // EIA leaf datasets crawled (sdk/eia-catalog.json)

export interface Feed {
  decimals: number
  unit: string
  title: string
  source: string
  route: string
  frequency: string
  description: string
}

export interface Reading extends Feed {
  feed_id: string
  value: number // amount / 10^decimals
  amount: string // raw scaled integer, as string (U512-safe)
  period: number // YYYYMMDD / YYYYMM / YYYY (or epoch secs for hourly)
  source_hash: string
  attester: string
  updated_at: number // epoch MILLISECONDS (Casper block time)
}

export interface OracleStats {
  feedsLive: number
  attestations: number
  datasets: number
  network: string
}

/* ── byte helpers (match the SDK exactly) ── */
function u32le(n: number): Uint8Array {
  const b = new Uint8Array(4)
  new DataView(b.buffer).setUint32(0, n, true)
  return b
}
function u64le(n: bigint): Uint8Array {
  const b = new Uint8Array(8)
  new DataView(b.buffer).setBigUint64(0, n, true)
  return b
}
function clString(s: string): Uint8Array {
  const u = new TextEncoder().encode(s)
  return new Uint8Array([...u32le(u.length), ...u])
}
function itemKey(index: number, keyBytes: Uint8Array = new Uint8Array()): string {
  const idx = new Uint8Array([0, 0, 0, index]) // index <= 15 → u32 BE
  return Buffer.from(blake2b(new Uint8Array([...idx, ...keyBytes]), { dkLen: 32 })).toString("hex")
}

class Cursor {
  pos = 0
  constructor(private b: Buffer) {}
  u8() { return this.b[this.pos++] }
  u32() { const v = this.b.readUInt32LE(this.pos); this.pos += 4; return v }
  u64() { const v = this.b.readBigUInt64LE(this.pos); this.pos += 8; return v }
  take(n: number) { const v = this.b.subarray(this.pos, this.pos + n); this.pos += n; return v }
  string() { return this.take(this.u32()).toString("utf8") }
  u512() { const n = this.u8(); const x = this.take(n); let v = 0n; for (let i = n - 1; i >= 0; i--) v = (v << 8n) | BigInt(x[i]); return v }
  address() { const tag = this.u8(); const h = this.take(32); return (tag === 0 ? "account-hash-" : "hash-") + Buffer.from(h).toString("hex") }
}

/* ── concurrency-limited map (the public node throttles bursts) ── */
async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}

interface Snapshot { srh: string; feedUref: string; attUref: string }

class Reader {
  private urefCache = new Map<string, string>()

  private async call(method: string, params: unknown): Promise<any> {
    const r = await fetch(RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      cache: "no-store",
    })
    return (await r.json())?.result
  }

  private async stateUref(pkg: string): Promise<string> {
    if (this.urefCache.has(pkg)) return this.urefCache.get(pkg)!
    const p = await this.call("query_global_state", { state_identifier: null, key: `hash-${pkg}`, path: [] })
    const cp = p.stored_value.ContractPackage ?? p.stored_value.Package
    const ch = cp.versions[cp.versions.length - 1].contract_hash.replace("contract-", "")
    const c = await this.call("query_global_state", { state_identifier: null, key: `hash-${ch}`, path: [] })
    const uref = c.stored_value.Contract.named_keys.find((k: any) => k.name === "state").key
    this.urefCache.set(pkg, uref)
    return uref
  }

  async snapshot(): Promise<Snapshot> {
    const [srh, feedUref, attUref] = await Promise.all([
      this.call("chain_get_state_root_hash", {}).then((r: any) => r.state_root_hash),
      this.stateUref(FEED_REGISTRY),
      this.stateUref(ATTESTATION_REGISTRY),
    ])
    return { srh, feedUref, attUref }
  }

  private async field(uref: string, srh: string, index: number, keyBytes?: Uint8Array): Promise<Buffer | null> {
    const r = await this.call("state_get_dictionary_item", {
      state_root_hash: srh,
      dictionary_identifier: { URef: { seed_uref: uref, dictionary_item_key: itemKey(index, keyBytes) } },
    })
    const cl = r?.stored_value?.CLValue
    if (!cl?.bytes) return null
    return Buffer.from(cl.bytes, "hex").subarray(4)
  }

  private async getFeed(s: Snapshot, id: string): Promise<Feed | null> {
    const b = await this.field(s.feedUref, s.srh, 2, clString(id))
    if (!b) return null
    const c = new Cursor(b)
    return { decimals: c.u8(), unit: c.string(), title: c.string(), source: c.string(), route: c.string(), frequency: c.string(), description: c.string() }
  }

  private async getValue(s: Snapshot, id: string) {
    const b = await this.field(s.attUref, s.srh, 2, clString(id))
    if (!b) return null
    const c = new Cursor(b)
    return { period: Number(c.u64()), amount: c.u512(), source_hash: c.string(), attester: c.address(), timestamp: Number(c.u64()) }
  }

  async getReading(s: Snapshot, id: string): Promise<Reading | null> {
    const [meta, val] = await Promise.all([this.getFeed(s, id), this.getValue(s, id)])
    if (!meta || !val) return null
    return {
      feed_id: id, ...meta,
      value: Number(val.amount) / 10 ** meta.decimals,
      amount: val.amount.toString(), period: val.period, source_hash: val.source_hash,
      attester: val.attester, updated_at: val.timestamp,
    }
  }

  async feedCount(s: Snapshot): Promise<number> {
    const b = await this.field(s.feedUref, s.srh, 4)
    return b ? Number(new Cursor(b).u64()) : 0
  }

  async attestationTotal(s: Snapshot): Promise<number> {
    const b = await this.field(s.attUref, s.srh, 5) // AttestationRegistry.total
    return b ? Number(new Cursor(b).u64()) : 0
  }

  async listFeedIds(s: Snapshot): Promise<string[]> {
    const n = await this.feedCount(s)
    const ids = await mapLimit(Array.from({ length: n }, (_, i) => i), 16, async (i) => {
      const b = await this.field(s.feedUref, s.srh, 3, u64le(BigInt(i)))
      return b ? new Cursor(b).string() : null
    })
    return ids.filter((x): x is string => !!x)
  }

  async getReadings(s: Snapshot, ids: string[]): Promise<Reading[]> {
    const r = await mapLimit(ids, 16, (id) => this.getReading(s, id))
    return r.filter((x): x is Reading => !!x)
  }
}

const reader = new Reader()

/* ── stale-while-revalidate cache ── */
const TTL_MS = 60_000
type Cache = { ts: number; readings: Reading[]; stats: OracleStats }
let cache: Cache | null = null
let inflight: Promise<Cache> | null = null

async function load(): Promise<Cache> {
  const s = await reader.snapshot()
  const [ids, attestations] = await Promise.all([reader.listFeedIds(s), reader.attestationTotal(s)])
  const readings = await reader.getReadings(s, ids)
  // newest first by period, then by id for stability
  readings.sort((a, b) => b.period - a.period || a.feed_id.localeCompare(b.feed_id))
  return {
    ts: Date.now(),
    readings,
    // registered ids can include feeds with no attested value yet; "live" means serving a value
    stats: { feedsLive: readings.length, attestations, datasets: DATASETS_TOTAL, network: NETWORK },
  }
}

async function snapshotCached(): Promise<Cache> {
  if (cache && Date.now() - cache.ts < TTL_MS) return cache
  if (cache) {
    // stale: refresh in background, serve stale now
    if (!inflight) inflight = load().then((c) => { cache = c; inflight = null; return c }).catch((e) => { inflight = null; throw e })
    return cache
  }
  // cold: must await
  if (!inflight) inflight = load().then((c) => { cache = c; inflight = null; return c }).catch((e) => { inflight = null; throw e })
  return inflight
}

export async function getAllReadings(): Promise<Reading[]> {
  try { return (await snapshotCached()).readings } catch { return cache?.readings ?? [] }
}

export async function getStats(): Promise<OracleStats> {
  try { return (await snapshotCached()).stats } catch { return cache?.stats ?? { feedsLive: 37, attestations: 0, datasets: DATASETS_TOTAL, network: NETWORK } }
}

export async function getFlagshipReadings(): Promise<Reading[]> {
  const all = await getAllReadings()
  const byId = new Map(all.map((r) => [r.feed_id, r]))
  const picked = FLAGSHIP_IDS.map((id) => byId.get(id)).filter((x): x is Reading => !!x)
  // top up with whatever else is live if some flagships are missing
  if (picked.length < 8) {
    for (const r of all) { if (!FLAGSHIP_IDS.includes(r.feed_id)) picked.push(r); if (picked.length >= 12) break }
  }
  return picked
}
