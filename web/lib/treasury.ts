import "server-only"
import { blake2b } from "@noble/hashes/blake2b"

// Reads the Claros TreasuryVault on-chain (the agent's reinvest ledger + holdings)
// plus the agent account's liquid CSPR balance. TreasuryVault Odra fields (1-indexed):
// 1 agent · 2 reinvestments(Mapping<u64,Reinvestment>) · 3 count · 4 total_reinvested
// · 5 venue_total(Mapping<String,U512>) · 6 wcspr_liquid · 7 scspr_held.
// Reinvestment = { venue:String, amount_in:U512, amount_out:U512, reasoning:String, timestamp:u64 }

const RPC = process.env.CASPER_NODE_RPC ?? "https://node.testnet.casper.network/rpc"
const VAULT = process.env.TREASURY_VAULT_PACKAGE_HASH ?? "a90b082d863c5977c6e54654fec10e523a38760529e664a87e9e8a8e887ffd7b"
const AGENT_PUB = process.env.CLAROS_AGENT_PUBLIC_KEY ?? "020362ef3cb7536f7eac9a1d30a8d0fbdf7ed3384717b5365751005ebf1826c7b1f6"

export interface Reinvestment {
  index: number
  venue: string
  amount_in: string
  amount_out: string
  reasoning: string
  timestamp: number
}

export interface VenueTotal {
  key: string
  label: string
  amount: number // sum of recorded amount_in
}

export interface TreasurySnapshot {
  liquidCspr: number
  reinvestCount: number
  ledger: Reinvestment[]
  venues: VenueTotal[]
  primaryVenue: string
}

const u32le = (n: number) => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n, true); return b }
const u64le = (n: bigint) => { const b = new Uint8Array(8); new DataView(b.buffer).setBigUint64(0, n, true); return b }
const clString = (s: string) => { const u = new TextEncoder().encode(s); return new Uint8Array([...u32le(u.length), ...u]) }
const itemKey = (i: number, k: Uint8Array = new Uint8Array()) =>
  Buffer.from(blake2b(new Uint8Array([0, 0, 0, i, ...k]), { dkLen: 32 })).toString("hex")

class Cursor {
  pos = 0
  constructor(private b: Buffer) {}
  u8() { return this.b[this.pos++] }
  u32() { const v = this.b.readUInt32LE(this.pos); this.pos += 4; return v }
  u64() { const v = this.b.readBigUInt64LE(this.pos); this.pos += 8; return v }
  take(n: number) { const v = this.b.subarray(this.pos, this.pos + n); this.pos += n; return v }
  string() { return this.take(this.u32()).toString("utf8") }
  u512() { const n = this.u8(); const x = this.take(n); let v = 0n; for (let i = n - 1; i >= 0; i--) v = (v << 8n) | BigInt(x[i]); return v }
}

async function rpc(method: string, params: unknown): Promise<any> {
  const r = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  })
  return (await r.json())?.result
}

const VENUE_LABELS: Record<string, string> = {
  wiselending: "WiseLending (sCSPR)",
  native_delegation: "Native Delegation",
  cspr_trade: "CSPR.trade (DEX)",
}
const venueLabel = (k: string) => VENUE_LABELS[k.toLowerCase()] ?? k

async function load(): Promise<TreasurySnapshot> {
  const p = await rpc("query_global_state", { state_identifier: null, key: `hash-${VAULT}`, path: [] })
  const cp = p.stored_value.ContractPackage ?? p.stored_value.Package
  const ch = cp.versions[cp.versions.length - 1].contract_hash.replace("contract-", "")
  const c = await rpc("query_global_state", { state_identifier: null, key: `hash-${ch}`, path: [] })
  const uref = c.stored_value.Contract.named_keys.find((k: any) => k.name === "state").key
  const srh = (await rpc("chain_get_state_root_hash", {})).state_root_hash

  async function field(i: number, k?: Uint8Array): Promise<Buffer | null> {
    const r = await rpc("state_get_dictionary_item", {
      state_root_hash: srh,
      dictionary_identifier: { URef: { seed_uref: uref, dictionary_item_key: itemKey(i, k) } },
    })
    const cl = r?.stored_value?.CLValue
    return cl?.bytes ? Buffer.from(cl.bytes, "hex").subarray(4) : null
  }

  const cntB = await field(3)
  const count = cntB ? Number(new Cursor(cntB).u64()) : 0

  const ledger: Reinvestment[] = []
  const entries = await Promise.all(
    Array.from({ length: count }, (_, i) => field(2, u64le(BigInt(i))).then((b) => ({ i, b })))
  )
  for (const { i, b } of entries) {
    if (!b) continue
    const cur = new Cursor(b)
    ledger.push({
      index: i,
      venue: cur.string(),
      amount_in: cur.u512().toString(),
      amount_out: cur.u512().toString(),
      reasoning: cur.string(),
      timestamp: Number(cur.u64()),
    })
  }
  ledger.reverse() // newest first

  // venue allocation aggregated from the ledger (case-insensitive)
  const totals = new Map<string, number>()
  for (const e of ledger) {
    const key = e.venue.toLowerCase()
    totals.set(key, (totals.get(key) ?? 0) + Number(e.amount_in))
  }
  const venues: VenueTotal[] = Array.from(totals.entries())
    .map(([key, amount]) => ({ key, label: venueLabel(key), amount }))
    .sort((a, b) => b.amount - a.amount)

  const bal = await rpc("query_balance", { purse_identifier: { main_purse_under_public_key: AGENT_PUB } })
  const liquidCspr = Number(BigInt(bal?.balance ?? "0")) / 1e9

  return {
    liquidCspr,
    reinvestCount: count,
    ledger,
    venues,
    primaryVenue: venues[0] ? venues[0].label : "WiseLending (sCSPR)",
  }
}

const TTL = 120_000
let cache: { ts: number; snap: TreasurySnapshot } | null = null
let inflight: Promise<TreasurySnapshot> | null = null

export async function getTreasury(): Promise<TreasurySnapshot> {
  try {
    if (cache && Date.now() - cache.ts < TTL) return cache.snap
    if (!inflight) inflight = load().then((s) => { cache = { ts: Date.now(), snap: s }; inflight = null; return s }).catch((e) => { inflight = null; throw e })
    if (cache) return cache.snap // serve stale while refreshing
    return await inflight
  } catch {
    return cache?.snap ?? { liquidCspr: 0, reinvestCount: 0, ledger: [], venues: [], primaryVenue: "WiseLending (sCSPR)" }
  }
}
