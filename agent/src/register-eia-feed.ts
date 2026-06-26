import 'dotenv/config';
import { registerFeed, readEiaFeed } from './tools.js';
import { FEED_BY_ID } from './eia-feeds.js';
import { callContract, Args, CLValue } from './signer.js';

const REGISTRY = process.env.ATTESTATION_REGISTRY_PACKAGE_HASH!;
const assetId = process.argv[2] ?? 'EIA.PET.PRICE.WTI.DAILY';
const feed = FEED_BY_ID[assetId];
if (!feed) throw new Error(`unknown feed: ${assetId}`);

const title = assetId.split('.').slice(1).join(' ');
const description = `EIA ${feed.route} ${feed.frequency}, ${feed.unit}`;

console.log(`1) register feed metadata (FeedRegistry)...`);
const reg = await registerFeed(assetId, feed.decimals, feed.unit, title, 'EIA', feed.route, feed.frequency, description);
console.log('   tx:', reg.tx);

console.log(`2) read EIA + attest value (AttestationRegistry)...`);
const r = await readEiaFeed(assetId);
const args = Args.fromMap({
  asset_id: CLValue.newCLString(r.asset_id),
  period: CLValue.newCLUint64(r.period),
  amount: CLValue.newCLUInt512(r.amount),
  source_hash: CLValue.newCLString(r.source_hash),
});
const tx = await callContract(REGISTRY, 'attest', args, 20_000_000_000);
console.log(`   attested ${r.value} ${r.unit} @ ${r.period} | tx: ${tx}`);
console.log(`\n${assetId} is fully on-chain: metadata (decimals=${feed.decimals}, unit=${feed.unit}) + value.`);
