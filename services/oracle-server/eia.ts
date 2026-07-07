import { createHash } from 'node:crypto';

// Generic EIA API v2 adapter. Every EIA dataset is reached the same way:
// /v2/{route}/data?api_key=..&frequency=..&data[]=col&facets[id][]=val&sort..&length=1
// so one client serves electricity, gas, petroleum, coal, nuclear, SEDS, CO2, etc.
const BASE = 'https://api.eia.gov';

export interface EiaFeed {
  asset_id: string; // e.g. "EIA.NG.PRICE.HENRYHUB.DAILY"
  route: string; // e.g. "natural-gas/pri/fut"
  frequency: string; // "daily" | "weekly" | "monthly" | "annual" | "hourly" | "quarterly"
  data_col: string; // "value" | "price" | "generation" | ...
  facets: Record<string, string>; // { series: "RNGWHHD" }
  unit: string;
  decimals: number; // on-chain scale k: amount = round(value * 10^k)
}

export interface EiaReading {
  asset_id: string;
  period: number; // YYYYMMDD / YYYYMM / YYYY, or epoch seconds for hourly
  amount: bigint; // value * 10^decimals
  value: number; // human value
  unit: string;
  source_hash: string;
  latest_date: string; // raw EIA period string
}

function buildUrl(f: EiaFeed, apiKey: string): string {
  const p = new URLSearchParams();
  p.set('api_key', apiKey);
  p.set('frequency', f.frequency);
  p.append('data[0]', f.data_col);
  for (const [k, v] of Object.entries(f.facets)) p.append(`facets[${k}][]`, v);
  p.set('sort[0][column]', 'period');
  p.set('sort[0][direction]', 'desc');
  p.set('offset', '0');
  p.set('length', '1');
  return `${BASE}/v2/${f.route}/data?${p.toString()}`;
}

function periodToNumber(period: string, freq: string): number {
  if (freq === 'hourly') return Math.floor(Date.parse(period.replace(' ', 'T') + ':00Z') / 1000);
  return Number(period.replace(/[-:T ]/g, ''));
}

// Scale a decimal string by 10^k without float drift.
function scaleDecimalString(s: string, k: number): bigint {
  let neg = s.startsWith('-');
  if (neg) s = s.slice(1);
  let [int, frac = ''] = s.split('.');
  frac = (frac + '0'.repeat(k)).slice(0, k);
  const v = BigInt((int || '0') + frac);
  return neg ? -v : v;
}

// Deterministic provenance hash — stable fields only (no labels/version/echo).
function sourceHash(f: EiaFeed, row: Record<string, any>, frequency: string, unit: string): string {
  const canonical = JSON.stringify({
    route: f.route,
    frequency,
    facets: Object.entries(f.facets).sort(([a], [b]) => a.localeCompare(b)),
    period: row.period,
    value: String(row[f.data_col]),
    unit,
  });
  return createHash('sha256').update(canonical).digest('hex').slice(0, 32);
}

export async function fetchLatest(f: EiaFeed, apiKey: string): Promise<EiaReading> {
  const res = await fetch(buildUrl(f, apiKey));
  if (res.status === 429) throw new Error('EIA rate limit (429) — back off');
  if (!res.ok) throw new Error(`EIA HTTP ${res.status} for ${f.asset_id}`);
  const text = await res.text();
  if (!text) throw new Error(`EIA empty response for ${f.asset_id}`);
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`EIA non-JSON response for ${f.asset_id}`);
  }
  if (body?.error) {
    const e = body.error;
    throw new Error(`EIA error: ${typeof e === 'string' ? e : JSON.stringify(e)}`);
  }
  const rows = body?.response?.data ?? [];
  if (rows.length === 0) throw new Error(`EIA: no data for ${f.asset_id}`);
  const row = rows[0];
  const rawVal = row[f.data_col];
  if (rawVal == null) throw new Error(`EIA: null value for ${f.asset_id} @ ${row.period}`);
  const frequency = body.response.frequency ?? f.frequency;
  const unit = row['units'] ?? row[`${f.data_col}-units`] ?? f.unit;
  return {
    asset_id: f.asset_id,
    period: periodToNumber(row.period, frequency),
    amount: scaleDecimalString(String(rawVal), f.decimals),
    value: Number(rawVal),
    unit,
    source_hash: sourceHash(f, row, frequency, unit),
    latest_date: String(row.period),
  };
}

import { readFileSync } from 'node:fs';

const specs: Record<string, EiaFeed> = {};
if (process.env.FEED_SPEC_FILE) {
  for (const f of JSON.parse(readFileSync(process.env.FEED_SPEC_FILE, 'utf8')) as EiaFeed[]) {
    specs[f.asset_id] = f;
  }
}

export async function latestEia(assetId: string): Promise<EiaReading> {
  const spec = specs[assetId];
  if (!spec) throw new Error(`no spec for ${assetId} (set FEED_SPEC_FILE)`);
  return fetchLatest(spec, process.env.EIA_API_KEY!);
}
