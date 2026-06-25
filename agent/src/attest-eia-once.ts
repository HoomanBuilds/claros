import 'dotenv/config';
import { readEiaFeed } from './tools.js';
import { callContract, Args, CLValue } from './signer.js';

const REGISTRY = process.env.ATTESTATION_REGISTRY_PACKAGE_HASH!;
const assetId = process.argv[2] ?? 'EIA.PET.PRICE.WTI.DAILY';

const r = await readEiaFeed(assetId);
console.log('EIA reading:', JSON.stringify(r, null, 2));

const args = Args.fromMap({
  asset_id: CLValue.newCLString(r.asset_id),
  period: CLValue.newCLUint64(r.period),
  amount: CLValue.newCLUInt512(r.amount), // string → preserves U512 precision
  source_hash: CLValue.newCLString(r.source_hash),
});
const tx = await callContract(REGISTRY, 'attest', args, 20_000_000_000);
console.log(`attested ${assetId} = ${r.value} ${r.unit} (period ${r.period})`);
console.log('tx:', tx);
console.log('explorer:', `https://testnet.cspr.live/transaction/${tx}`);
