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
  SessionBuilder,
  Args,
  CLValue,
  CLTypeUInt8,
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

// Call a payable contract entry point that takes native CSPR, via the
// cargo-purse session proxy (the proxy creates a purse, funds it with
// attached_value, and forwards to package_hash::entry_point).
export async function callWithValue(
  proxyWasm: Uint8Array,
  packageHashHex: string,
  entryPoint: string,
  amountMotes: string,
  gasMotes: number,
  innerArgsBytes: Uint8Array = new Uint8Array([0, 0, 0, 0]),
): Promise<string> {
  const args = Args.fromMap({
    package_hash: CLValue.newCLByteArray(Uint8Array.from(Buffer.from(packageHashHex, 'hex'))),
    entry_point: CLValue.newCLString(entryPoint),
    args: CLValue.newCLList(
      CLTypeUInt8,
      Array.from(innerArgsBytes, (b) => CLValue.newCLUint8(b)),
    ),
    amount: CLValue.newCLUInt512(amountMotes),
    attached_value: CLValue.newCLUInt512(amountMotes),
  });
  const tx = new SessionBuilder()
    .wasm(proxyWasm)
    .runtimeArgs(args)
    .chainName(CHAIN)
    .payment(gasMotes, 1)
    .from(key.publicKey)
    .build();
  tx.sign(key);
  const res = await rpc.putTransaction(tx);
  return res.transactionHash.toHex();
}
