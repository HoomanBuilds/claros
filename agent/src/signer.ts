import 'dotenv/config';
import { readFileSync } from 'node:fs';
import casper from 'casper-js-sdk';
import type { Args as ArgsType } from 'casper-js-sdk';

const {
  PrivateKey,
  KeyAlgorithm,
  PublicKey,
  ContractCallBuilder,
  NativeDelegateBuilder,
  Args,
  CLValue,
  RpcClient,
  HttpHandler,
} = casper;

const RPC = process.env.CASPER_NODE_RPC!;
const CHAIN = process.env.CASPER_CHAIN_NAME!;

const algo =
  (process.env.AGENT_KEY_ALGO ?? 'secp256k1').toLowerCase() === 'ed25519'
    ? KeyAlgorithm.ED25519
    : KeyAlgorithm.SECP256K1;
const key = PrivateKey.fromPem(readFileSync(process.env.AGENT_KEY_PEM_PATH!, 'utf8'), algo);
const rpc = new RpcClient(new HttpHandler(RPC));

export { Args, CLValue };

export async function callContract(
  packageHash: string,
  entryPoint: string,
  args: ArgsType,
  gasMotes: number,
): Promise<string> {
  const tx = new ContractCallBuilder()
    .byPackageHash(packageHash)
    .entryPoint(entryPoint)
    .runtimeArgs(args)
    .chainName(CHAIN)
    .payment(gasMotes, 1)
    .from(key.publicKey)
    .build();
  tx.sign(key);
  const res = await rpc.putTransaction(tx);
  return res.transactionHash.toHex();
}

export async function delegate(
  validatorHex: string,
  amountMotes: string,
  gasMotes: number,
): Promise<string> {
  const tx = new NativeDelegateBuilder()
    .validator(PublicKey.fromHex(validatorHex))
    .amount(amountMotes)
    .chainName(CHAIN)
    .payment(gasMotes, 1)
    .from(key.publicKey)
    .build();
  tx.sign(key);
  const res = await rpc.putTransaction(tx);
  return res.transactionHash.toHex();
}
