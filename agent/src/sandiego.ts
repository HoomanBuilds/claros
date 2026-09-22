import { createHash } from 'node:crypto';

// City of San Diego publishes parking-meter revenue as a pre-aggregated daily
// CSV (one row per pole per day, amounts in CENTS). There is no queryable API,
// so we fetch the whole year file and cache it, refreshing with a conditional
// GET. Data lags ~2 days, so the "latest" reading is the max date in the file.
const YEAR = Number(process.env.SAN_DIEGO_YEAR ?? 2026);
const SOURCE_URL = `https://seshat.datasd.org/parking_meters_transactions_daily/treas_meters_${YEAR}_pole_by_mo_day_datasd.csv`;
const TTL_MS = 60 * 60 * 1000;

interface Daily {
  day: string;
  cents: number;
  n: number;
}
interface Cache {
  lastMod?: string;
  etag?: string;
  records: Daily[];
  maxDay: string;
  loadedAt: number;
}
const caches = new Map<string, Cache>();

async function load(assetId: string): Promise<Cache> {
  let cache = caches.get(assetId) ?? null;
  if (cache && Date.now() - cache.loadedAt < TTL_MS) return cache;
  const headers: Record<string, string> = {};
  if (cache?.lastMod) headers['If-Modified-Since'] = cache.lastMod;
  if (cache?.etag) headers['If-None-Match'] = cache.etag;

  const res = await fetch(SOURCE_URL, { headers });
  if (res.status === 304 && cache) {
    cache.loadedAt = Date.now();
    return cache;
  }
  if (!res.ok) {
    if (cache) return cache;
    throw new Error(`San Diego data fetch failed: ${res.status}`);
  }

  if (!res.body) throw new Error('San Diego data response had no body');
  const unq = (s: string) => s.replace(/^"|"$/g, '');
  let indexes: { pole: number; month: number; day: number; amount: number; count: number } | null = null;
  const records: Daily[] = [];
  let maxDay = '';
  const processLine = (line: string) => {
    if (!line) return;
    const columns = line.replace(/\r$/, '').split(',');
    if (!indexes) {
      const header = columns.map(unq);
      indexes = {
        pole: header.indexOf('pole_id'),
        month: header.indexOf('month'),
        day: header.indexOf('day'),
        amount: header.indexOf('sum_trans_amt'),
        count: header.indexOf('num_trans'),
      };
      if (Object.values(indexes).some(index => index < 0)) throw new Error('San Diego CSV columns changed');
      return;
    }
    const day = `${unq(columns[indexes.month]).padStart(2, '0')}-${unq(columns[indexes.day]).padStart(2, '0')}`;
    if (day > maxDay) maxDay = day;
    if (unq(columns[indexes.pole]) !== assetId) return;
    records.push({
      day,
      cents: Number(unq(columns[indexes.amount])),
      n: Number(unq(columns[indexes.count])),
    });
  };

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  while (true) {
    const { done, value } = await reader.read();
    pending += decoder.decode(value, { stream: !done });
    let newline = pending.indexOf('\n');
    while (newline >= 0) {
      processLine(pending.slice(0, newline));
      pending = pending.slice(newline + 1);
      newline = pending.indexOf('\n');
    }
    if (done) break;
  }
  processLine(pending);

  cache = {
    lastMod: res.headers.get('last-modified') ?? undefined,
    etag: res.headers.get('etag') ?? undefined,
    records,
    maxDay,
    loadedAt: Date.now(),
  };
  caches.set(assetId, cache);
  return cache;
}

export interface Reading {
  period: number;
  asset_id: string;
  amount_cents: number;
  txn_count: number;
  latest_date: string;
  source_url: string;
  source_hash: string;
}

export async function latestRevenue(assetId: string): Promise<Reading> {
  const c = await load(assetId);
  const rec = c.records.find(d => d.day === c.maxDay) ?? {
    day: c.maxDay,
    cents: 0,
    n: 0,
  };
  const [mm, dd] = c.maxDay.split('-');
  const period = Number(`${YEAR}${mm}${dd}`);
  // Canonical provenance hash, identical wherever this reading is computed, so
  // the on-chain attestation and the sold feed share one verifiable digest.
  const source_hash = createHash('sha256')
    .update(`${assetId}|${period}|${rec.cents}|${rec.n}|${SOURCE_URL}`)
    .digest('hex')
    .slice(0, 32);
  return {
    period,
    asset_id: assetId,
    amount_cents: rec.cents,
    txn_count: rec.n,
    latest_date: `${YEAR}-${mm}-${dd}`,
    source_url: SOURCE_URL,
    source_hash,
  };
}

export async function assetHistory(assetId: string) {
  const c = await load(assetId);
  const vals = c.records.map(d => d.cents).filter(v => v > 0);
  if (vals.length === 0) return { asset_id: assetId, min_cents: 0, max_cents: 0, avg_cents: 0, days: 0 };
  return {
    asset_id: assetId,
    min_cents: Math.min(...vals),
    max_cents: Math.max(...vals),
    avg_cents: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
    days: vals.length,
  };
}
