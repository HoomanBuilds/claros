import 'dotenv/config';
import { writeFileSync } from 'node:fs';

// Crawls the entire EIA APIv2 route tree via the metadata endpoint (GET /v2/{route},
// no /data) — the only way to enumerate every dataset, since the swagger uses
// {route} placeholders. Emits a complete LEAF catalog: every queryable dataset with
// its columns, facets, and frequencies. Individual series are enumerated on demand.
const BASE = 'https://api.eia.gov';
const KEY = process.env.EIA_API_KEY!;
if (!KEY) throw new Error('EIA_API_KEY required');

interface Leaf {
  route: string;
  name: string;
  description: string;
  frequencies: { id: string; format: string }[];
  columns: string[];
  facets: { id: string; description: string }[];
  defaultFrequency: string;
  startPeriod: string;
  endPeriod: string;
}

const leaves: Leaf[] = [];
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function meta(route: string, attempt = 0): Promise<any> {
  const url = `${BASE}/v2/${route}?api_key=${KEY}`;
  const res = await fetch(url);
  if (res.status === 429) {
    if (attempt > 5) throw new Error('429 give up');
    await sleep(2000 * (attempt + 1));
    return meta(route, attempt + 1);
  }
  return (await res.json())?.response;
}

async function crawl(route: string, depth: number): Promise<void> {
  await sleep(120); // be polite to the rate limit
  let r: any;
  try {
    r = await meta(route);
  } catch (e) {
    console.error(`! ${route}: ${(e as Error).message}`);
    return;
  }
  if (!r) return;

  // Leaf dataset: has data columns + frequencies.
  if (r.data && r.frequency) {
    leaves.push({
      route,
      name: r.name ?? route,
      description: (r.description ?? '').replace(/\s+/g, ' ').trim().slice(0, 240),
      frequencies: (r.frequency ?? []).map((f: any) => ({ id: f.id, format: f.format })),
      columns: Object.keys(r.data ?? {}),
      facets: (r.facets ?? []).map((f: any) => ({ id: f.id, description: f.description ?? '' })),
      defaultFrequency: r.defaultFrequency ?? '',
      startPeriod: r.startPeriod ?? '',
      endPeriod: r.endPeriod ?? '',
    });
    process.stdout.write(`leaf ${route} (${leaves.length})\n`);
    return;
  }
  // Parent node: recurse into child routes.
  const children: any[] = r.routes ?? [];
  for (const c of children) {
    if (depth > 6) continue;
    await crawl(route ? `${route}/${c.id}` : c.id, depth + 1);
  }
}

(async () => {
  console.log('crawling EIA route tree...');
  // top level
  const root = await meta('');
  for (const fam of root?.routes ?? []) {
    await crawl(fam.id, 1);
  }
  const out = { generated_at_note: 'EIA APIv2 leaf catalog', count: leaves.length, leaves };
  writeFileSync(new URL('./eia-catalog.json', import.meta.url), JSON.stringify(out, null, 2));
  console.log(`\nDONE — ${leaves.length} leaf datasets → eia-catalog.json`);
})();
