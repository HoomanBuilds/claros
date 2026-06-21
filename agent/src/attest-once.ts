import { callContract, Args, CLValue } from './signer.js';

const REGISTRY = process.env.ATTESTATION_REGISTRY_PACKAGE_HASH!;

const args = Args.fromMap({
  asset_id: CLValue.newCLString('sd-parking-202'),
  period: CLValue.newCLUint64(20260626),
  amount: CLValue.newCLUInt512(73210),
  source_hash: CLValue.newCLString('agent-source-hash-001'),
});

const hash = await callContract(REGISTRY, 'attest', args, 20_000_000_000);
console.log('agent submitted attest tx:', hash);
console.log('explorer: https://testnet.cspr.live/transaction/' + hash);
