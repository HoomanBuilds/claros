import 'dotenv/config';
import { ClarosOracle } from '../../sdk/src/index.js';
import { registerFeed } from './tools.js';

const OLD = process.env.OLD_FEED_REGISTRY!;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const oracle = new ClarosOracle({ feedRegistry: OLD });
const n = await oracle.feedCount();
console.log(`old registry has ${n} feeds; target = ${process.env.FEED_REGISTRY_PACKAGE_HASH}`);

let ok = 0;
for (let i = 0; i < n; i++) {
  const id = await oracle.feedIdAt(i);
  if (!id) continue;
  const f = await oracle.getFeed(id);
  if (!f) { console.log(`SKIP ${id}: no metadata`); continue; }
  try {
    await registerFeed(id, f.decimals, f.unit, f.title, f.source, f.route, f.frequency, f.description);
    console.log(`OK   ${i} ${id}`);
    ok++;
  } catch (e) {
    console.log(`FAIL ${i} ${id}: ${(e as Error).message}`);
  }
  await sleep(700);
}
console.log(`migrated ${ok}/${n} feeds`);
