import { config } from "dotenv";
import { readFileSync } from "node:fs";
import casper from "casper-js-sdk";

const { PrivateKey, KeyAlgorithm, SessionBuilder, Args, CLValue, CLTypeUInt8, RpcClient, HttpHandler } =
  casper;

config();

const RPC = process.env.CASPER_NODE_RPC || "https://node.testnet.casper.network/rpc";
const CHAIN = process.env.CASPER_CHAIN_NAME || "casper-test";
const WCSPR =
  process.env.WCSPR_PACKAGE_HASH || "3d80df21ba4ee4d66a2a1f60c32570dd5685e4b279f6538162a5fd1314847c1e";
const KEY_PATH = process.env.CLIENT_PRIVATE_KEY_PATH!;
const ALGO =
  (process.env.CLIENT_KEY_ALGO || "secp256k1").toLowerCase() === "ed25519"
    ? KeyAlgorithm.ED25519
    : KeyAlgorithm.SECP256K1;

const cspr = Number(process.argv[2] ?? 50);
const motes = (BigInt(Math.round(cspr)) * 1_000_000_000n).toString();

const key = PrivateKey.fromPem(readFileSync(KEY_PATH, "utf8"), ALGO);
const rpc = new RpcClient(new HttpHandler(RPC));
const proxy = new Uint8Array(readFileSync(new URL("./wasm/cargo-proxy.wasm", import.meta.url)));

// deposit() reads attached_value from its named args and pulls that much CSPR
// from the cargo purse the proxy funds; mints 1:1 WCSPR to the caller.
const innerArgs = Args.fromMap({ attached_value: CLValue.newCLUInt512(motes) }).toBytes();

const args = Args.fromMap({
  package_hash: CLValue.newCLByteArray(Uint8Array.from(Buffer.from(WCSPR, "hex"))),
  entry_point: CLValue.newCLString("deposit"),
  args: CLValue.newCLList(
    CLTypeUInt8,
    Array.from(innerArgs, b => CLValue.newCLUint8(b)),
  ),
  amount: CLValue.newCLUInt512(motes),
  attached_value: CLValue.newCLUInt512(motes),
});

const tx = new SessionBuilder()
  .wasm(proxy)
  .installOrUpgrade()
  .runtimeArgs(args)
  .chainName(CHAIN)
  .payment(8_000_000_000, 1)
  .from(key.publicKey)
  .build();
tx.sign(key);

const res = await rpc.putTransaction(tx);
const hash = res.transactionHash.toHex();
console.log(`wrap ${cspr} CSPR -> WCSPR`);
console.log("tx:", hash);
console.log("explorer:", `https://testnet.cspr.live/transaction/${hash}`);

async function poll(): Promise<void> {
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const r = await fetch(RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "info_get_transaction",
        params: { transaction_hash: { Version1: hash } },
      }),
    });
    const ei = ((await r.json()) as any)?.result?.execution_info;
    const er = ei?.execution_result?.Version2;
    if (er) {
      if (er.error_message) console.log("❌ failed:", er.error_message);
      else console.log("✅ wrapped. cost:", er.cost);
      return;
    }
    process.stdout.write(".");
  }
  console.log("\n(timed out waiting for execution; check the explorer)");
}

await poll();
