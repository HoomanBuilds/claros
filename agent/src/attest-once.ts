import 'dotenv/config';
import { readFileSync } from 'node:fs';
import casper from 'casper-js-sdk';

const { PrivateKey, KeyAlgorithm, ContractCallBuilder, Args, CLValue, RpcClient, HttpHandler } =
  casper;

const RPC = process.env.CASPER_NODE_RPC!;
const CHAIN = process.env.CASPER_CHAIN_NAME!;
const REGISTRY = process.env.ATTESTATION_REGISTRY_PACKAGE_HASH!;

const algo =
  (process.env.AGENT_KEY_ALGO ?? 'secp256k1').toLowerCase() === 'ed25519'
    ? KeyAlgorithm.ED25519
    : KeyAlgorithm.SECP256K1;
const key = PrivateKey.fromPem(readFileSync(process.env.AGENT_KEY_PEM_PATH!, 'utf8'), algo);

const args = Args.fromMap({
  asset_id: CLValue.newCLString('sd-parking-202'),
  period: CLValue.newCLUint64(20260626),
  amount: CLValue.newCLUInt512(73210),
  source_hash: CLValue.newCLString('agent-source-hash-001'),
});

const tx = new ContractCallBuilder()
  .byPackageHash(REGISTRY)
  .entryPoint('attest')
  .runtimeArgs(args)
  .chainName(CHAIN)
  .payment(20_000_000_000, 1)
  .from(key.publicKey)
  .build();

tx.sign(key);

const rpc = new RpcClient(new HttpHandler(RPC));
const res = await rpc.putTransaction(tx);
const hash = res.transactionHash.toHex();
console.log('agent submitted attest tx:', hash);
console.log('explorer: https://testnet.cspr.live/transaction/' + hash);
