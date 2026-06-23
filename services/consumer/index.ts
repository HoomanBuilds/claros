import { config } from "dotenv";
import {
  x402Client,
  x402HTTPClient,
  wrapFetchWithPayment,
  type PaymentRequirements,
} from "@x402/fetch";
import { createClientCasperSigner } from "@make-software/casper-x402";
import { ExactCasperScheme } from "@make-software/casper-x402/exact/client";
import casperSdk from "casper-js-sdk";

const { KeyAlgorithm } = casperSdk;

config();

const keyPath = process.env.CLIENT_PRIVATE_KEY_PATH;
const keyAlgo = process.env.CLIENT_KEY_ALGO || "secp256k1";
const baseURL = process.env.SERVER_URL || "http://localhost:4021";
const endpointPath = process.env.ENDPOINT_PATH || "/oracle/feed";
const url = `${baseURL}${endpointPath}`;

// Among the payment options both sides support, prefer any Casper network.
const selectCasper = (_v: number, options: PaymentRequirements[]): PaymentRequirements =>
  options.find(o => o.network.startsWith("casper:")) ?? options[0];

async function main(): Promise<void> {
  if (!keyPath) {
    console.error("❌ CLIENT_PRIVATE_KEY_PATH is required");
    process.exit(1);
  }

  const algorithm = keyAlgo === "secp256k1" ? KeyAlgorithm.SECP256K1 : KeyAlgorithm.ED25519;
  const signer = await createClientCasperSigner(keyPath, algorithm);
  const client = new x402Client(selectCasper).register("casper:*", new ExactCasperScheme(signer));
  const fetchWithPayment = wrapFetchWithPayment(fetch, client);

  console.log(`🌐 GET ${url} (will auto-pay on 402)\n`);
  const response = await fetchWithPayment(url, { method: "GET" });
  const body = await response.json();

  console.log("✅ Feed received:\n", JSON.stringify(body, null, 2));

  const settle = new x402HTTPClient(client).getPaymentSettleResponse(name =>
    response.headers.get(name),
  );
  if (settle) console.log("\n💰 Settlement:", JSON.stringify(settle, null, 2));
}

main().catch(error => {
  console.error(error?.response?.data?.error ?? error);
  process.exit(1);
});
