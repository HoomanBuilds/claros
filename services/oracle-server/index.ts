import cors from "cors";
import { config } from "dotenv";
import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactCasperScheme } from "@make-software/casper-x402/exact/server";
import { FacilitatorConfig, HTTPFacilitatorClient } from "@x402/core/server";
import { AssetAmount, Network } from "@x402/core/types";

config();

interface Env {
  port: number;
  payeeAddress: string;
  facilitatorURL: string;
  facilitatorAPIKey: string;
  chainID: string;
  assetPackage: string;
  assetName: string;
  priceMotes: string;
  registryPackage: string;
}

function parseEnv(): Env {
  const required = (key: string): string => {
    const v = process.env[key];
    if (!v) {
      console.error(`❌ ${key} environment variable is required`);
      process.exit(1);
    }
    return v;
  };
  return {
    port: parseInt(process.env.PORT || "4021", 10),
    payeeAddress: required("PAYEE_ADDRESS"),
    facilitatorURL: required("FACILITATOR_URL"),
    facilitatorAPIKey: process.env.FACILITATOR_API_KEY || "",
    chainID: required("CAIP2_CHAIN_ID"),
    assetPackage: required("ASSET_PACKAGE").replace(/^hash-/, ""),
    assetName: required("ASSET_NAME"),
    priceMotes: process.env.FEED_PRICE_MOTES || "1000000000",
    registryPackage: required("ATTESTATION_REGISTRY_PACKAGE"),
  };
}

const cfg = parseEnv();
const chainID = cfg.chainID as Network;

const ATTESTER =
  process.env.ATTESTER_ACCOUNT_HASH ??
  "account-hash-43d7dd06d5538e504e54a3f235f1596f7d2e803e9065bf3c0d040f5cd31a21d4";
const CLAROS_API_URL = process.env.CLAROS_API_URL ?? "http://localhost:4030";

async function latestFeed(assetId: string) {
  const response = await fetch(`${CLAROS_API_URL}/v1/feeds/${encodeURIComponent(assetId)}`);
  if (response.status === 404) throw new Error(`feed not found on-chain: ${assetId}`);
  if (!response.ok) throw new Error(`on-chain feed API returned ${response.status}`);
  const r = await response.json() as any;
  return {
    asset_id: r.feed_id,
    period: r.period,
    amount: r.amount,
    value: r.value,
    decimals: r.decimals,
    unit: r.unit,
    title: r.title,
    frequency: r.frequency,
    source_hash: r.source_hash,
    updated_at: r.updated_at,
    provenance: {
      network: chainID,
      registry_package_hash: cfg.registryPackage,
      attester: r.attester ?? ATTESTER,
      source: r.source,
      verify: `https://testnet.cspr.live/contract-package/${cfg.registryPackage}`,
    },
    served_at: new Date().toISOString(),
  };
}

const facilitatorConfig: FacilitatorConfig = { url: cfg.facilitatorURL };
if (cfg.facilitatorAPIKey) {
  const auth = { Authorization: cfg.facilitatorAPIKey };
  facilitatorConfig.createAuthHeaders = async () => ({
    verify: auth,
    settle: auth,
    supported: auth,
    bazaar: auth,
  });
}
const facilitatorClient = new HTTPFacilitatorClient(facilitatorConfig);

const assetAmount: AssetAmount = {
  asset: cfg.assetPackage,
  amount: cfg.priceMotes,
  extra: { name: cfg.assetName, symbol: "WCSPR", version: "1", decimals: "9" },
};

const casperScheme = new ExactCasperScheme()
  .registerAsset(chainID, cfg.assetPackage, 9)
  .registerMoneyParser(() => Promise.resolve(assetAmount));

const app = express();
app.set("trust proxy", 1);
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Accept", "Authorization", "Content-Type", "Origin", "Payment-Signature"],
    exposedHeaders: ["PAYMENT-REQUIRED", "PAYMENT-RESPONSE"],
    maxAge: 24 * 60 * 60,
  }),
);

app.use(
  paymentMiddleware(
    {
      "GET /oracle/feed": {
        accepts: [{ scheme: "exact", price: "$0.001", network: chainID, payTo: cfg.payeeAddress }],
        description: "Claros: latest on-chain attested reading for an asset",
        mimeType: "application/json",
      },
    },
    new x402ResourceServer(facilitatorClient).register(chainID, casperScheme),
  ),
);

app.get("/oracle/feed", async (req, res) => {
  const assetId = (req.query.asset_id as string) || "OP-1";
  try {
    res.json(await latestFeed(assetId));
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "feed unavailable" });
  }
});

app.get("/health", (_req, res) => res.json({ status: "ok", service: "claros-oracle" }));

app.listen(cfg.port, () => console.log(`Oracle feed server listening at http://localhost:${cfg.port}`));
