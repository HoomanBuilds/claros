// Client-safe types + formatters (no server-only imports). The /api/feeds route
// returns this exact shape (amount serialized as string for U512 safety).

export interface FeedReading {
  feed_id: string
  value: number
  amount: string
  decimals: number
  unit: string
  title: string
  source: string
  route: string
  frequency: string
  description: string
  period: number
  source_hash: string
  attester: string
  updated_at: number // epoch ms
}

export interface OracleStats {
  feedsLive: number
  attestations: number
  datasets: number
  network: string
}

// Curated flagship feeds for the landing ticker + cards (order = display order).
export const FLAGSHIP_IDS = [
  "EIA.PET.PRICE.WTI.DAILY",
  "EIA.PET.PRICE.BRENT.DAILY",
  "EIA.NG.PRICE.HENRYHUB.DAILY",
  "EIA.PET.PRICE.GASOLINE_RETAIL.WEEKLY",
  "EIA.PET.PRICE.DIESEL_RETAIL.WEEKLY",
  "EIA.NG.STORAGE.L48_WORKING.WEEKLY",
  "EIA.ELEC.DEMAND.US48.HOURLY",
  "EIA.COAL.PRICE.MARKET.US.ANNUAL",
  "EIA.NUC.OUTAGE.US_PCT.DAILY",
  "EIA.CO2.AGG.US_TOTAL.ANNUAL",
  "EIA.NG.PROD.MARKETED.MONTHLY",
  "EIA.STEO.WTI_PRICE.MONTHLY",
]

// Order a feed list flagship-first, keeping the rest after.
export function flagshipFirst(feeds: FeedReading[]): FeedReading[] {
  const byId = new Map(feeds.map((f) => [f.feed_id, f]))
  const picked = FLAGSHIP_IDS.map((id) => byId.get(id)).filter((x): x is FeedReading => !!x)
  const seen = new Set(picked.map((f) => f.feed_id))
  return [...picked, ...feeds.filter((f) => !seen.has(f.feed_id))]
}

// Short ticker symbol for a feed id (Pyth-style). Falls back to the family code.
const TICKERS: Record<string, string> = {
  "EIA.PET.PRICE.WTI.DAILY": "WTI",
  "EIA.PET.PRICE.BRENT.DAILY": "BRENT",
  "EIA.NG.PRICE.HENRYHUB.DAILY": "HENRY HUB",
  "EIA.NG.PRICE.HENRYHUB_FUT1.DAILY": "NG FUT-1",
  "EIA.PET.PRICE.GASOLINE_RETAIL.WEEKLY": "GASOLINE",
  "EIA.PET.PRICE.DIESEL_RETAIL.WEEKLY": "DIESEL",
  "EIA.NG.STORAGE.L48_WORKING.WEEKLY": "NG STORAGE",
  "EIA.ELEC.DEMAND.US48.HOURLY": "US GRID LOAD",
  "EIA.COAL.PRICE.MARKET.US.ANNUAL": "COAL",
  "EIA.NUC.OUTAGE.US_PCT.DAILY": "NUCLEAR OUT",
  "EIA.CO2.AGG.US_TOTAL.ANNUAL": "US CO2",
  "EIA.NG.PROD.MARKETED.MONTHLY": "NG OUTPUT",
  "EIA.STEO.WTI_PRICE.MONTHLY": "WTI FCAST",
}

export function ticker(id: string): string {
  if (TICKERS[id]) return TICKERS[id]
  const parts = id.split(".")
  return parts.slice(2, 4).join(" ") || parts[parts.length - 1] || id
}

// Data family / category for grouping + color hints.
export function family(id: string): string {
  const p = id.split(".")
  const code = p[1] ?? ""
  const map: Record<string, string> = {
    PET: "PETROLEUM", NG: "NATURAL GAS", ELEC: "ELECTRICITY", COAL: "COAL",
    NUC: "NUCLEAR", CO2: "EMISSIONS", DBF: "BIOMASS", STEO: "OUTLOOK",
    SEDS: "STATE ENERGY", TOTAL: "TOTAL ENERGY", INTL: "INTERNATIONAL",
  }
  return map[code] ?? code
}

const nf = (max: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: max, minimumFractionDigits: 0 })

// Human value: prices keep precision, big counts get grouped, no trailing noise.
export function formatValue(value: number, decimals: number): string {
  if (!isFinite(value)) return "—"
  const abs = Math.abs(value)
  if (abs >= 1000) return nf(0).format(Math.round(value))
  if (abs >= 1) return nf(decimals >= 4 ? 2 : 3).format(value)
  return nf(Math.min(decimals, 4)).format(value)
}

// Unit shown compactly next to the value.
export function shortUnit(unit: string): string {
  return unit.replace("short ton", "st").replace("million ", "M ").replace("trillion ", "T ").replace("billion ", "B ")
}

// EIA period number → readable date.
export function formatPeriod(period: number, frequency: string): string {
  const s = String(period)
  if (frequency === "hourly" || s.length >= 10) {
    return new Date(period * 1000).toISOString().slice(0, 16).replace("T", " ") + "Z"
  }
  if (s.length === 8) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
  if (s.length === 6) return `${s.slice(0, 4)}-${s.slice(4, 6)}`
  return s
}

export function timeAgo(ms: number): string {
  const diff = Date.now() - ms
  if (diff < 0 || !isFinite(diff)) return "—"
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function shortHash(h: string, n = 6): string {
  const clean = h.replace(/^(account-hash-|hash-)/, "")
  return clean.length > n * 2 ? `${clean.slice(0, n)}…${clean.slice(-4)}` : clean
}
