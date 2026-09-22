import 'dotenv/config';
import { EIA_FEEDS } from './eia-feeds.js';
import { getLatest } from './casper-read.js';
import { attest, readEiaFeed } from './tools.js';

const REGISTRY = process.env.ATTESTATION_REGISTRY_PACKAGE_HASH!;
const INTERVAL_MS = Number(process.env.FEED_UPDATE_INTERVAL_MS ?? 3_600_000);
const BETWEEN_FEEDS_MS = Number(process.env.FEED_UPDATE_SPACING_MS ?? 1_000);
const configured = (process.env.FEED_UPDATE_ASSETS ?? '').split(',').map(value => value.trim()).filter(Boolean);
const configuredSet = new Set(configured);
const feeds = configured.length ? EIA_FEEDS.filter(feed => configuredSet.has(feed.asset_id)) : EIA_FEEDS;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const timestamp = () => new Date().toISOString();

async function updateFeed(assetId: string): Promise<'updated' | 'current'> {
  const reading = await readEiaFeed(assetId);
  if (!Number.isFinite(reading.value) || reading.value < 0) {
    throw new Error(`invalid EIA value ${reading.value}`);
  }
  const current = await getLatest(REGISTRY, assetId);
  if (current && reading.period <= current.period) return 'current';
  const result = await attest(reading.asset_id, reading.period, reading.amount, reading.source_hash);
  console.log(`[${timestamp()}] ${assetId}: attested period ${reading.period} in ${result.tx}`);
  return 'updated';
}

async function tick(): Promise<void> {
  let updated = 0;
  let current = 0;
  let failed = 0;
  for (const feed of feeds) {
    try {
      const result = await updateFeed(feed.asset_id);
      if (result === 'updated') updated++;
      else current++;
    } catch (error) {
      failed++;
      console.error(`[${timestamp()}] ${feed.asset_id}: ${(error as Error).message}`);
    }
    await sleep(BETWEEN_FEEDS_MS);
  }
  console.log(`[${timestamp()}] feed update complete: ${updated} updated, ${current} current, ${failed} failed`);
}

if (!feeds.length) throw new Error('no EIA feeds matched FEED_UPDATE_ASSETS');
console.log(`Claros feed updater: ${feeds.length} feeds, interval=${INTERVAL_MS}ms`);
while (true) {
  await tick();
  await sleep(INTERVAL_MS);
}
