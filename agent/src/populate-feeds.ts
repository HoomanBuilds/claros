import 'dotenv/config';
import { registerFeed, readEiaFeed } from './tools.js';
import { EIA_FEEDS } from './eia-feeds.js';
import { callContract, Args, CLValue } from './signer.js';

const REGISTRY = process.env.ATTESTATION_REGISTRY_PACKAGE_HASH!;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

let ok = 0;
let fail = 0;
for (const feed of EIA_FEEDS) {
  try {
    const r = await readEiaFeed(feed.asset_id);
    const title = feed.asset_id.split('.').slice(1).join(' ');
    const desc = `EIA ${feed.route} ${feed.frequency}, ${feed.unit}`;
    await registerFeed(feed.asset_id, feed.decimals, feed.unit, title, 'EIA', feed.route, feed.frequency, desc);
    await sleep(700);
    const args = Args.fromMap({
      asset_id: CLValue.newCLString(r.asset_id),
      period: CLValue.newCLUint64(r.period),
      amount: CLValue.newCLUInt512(r.amount),
      source_hash: CLValue.newCLString(r.source_hash),
    });
    await callContract(REGISTRY, 'attest', args, 20_000_000_000);
    console.log(`OK   ${feed.asset_id} = ${r.value} ${r.unit}`);
    ok++;
  } catch (e) {
    console.log(`FAIL ${feed.asset_id}: ${(e as Error).message}`);
    fail++;
  }
  await sleep(700);
}
console.log(`\nregistered + attested ${ok} feeds on-chain, ${fail} failed.`);
