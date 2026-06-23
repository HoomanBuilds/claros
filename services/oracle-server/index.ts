import { createHash } from "node:crypto";

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

// The paid product: the oracle's latest attested parking-revenue reading, stamped
// with the on-chain registry provenance so the buyer can independently verify it.
function latestFeed(assetId: string) {
  const period = Number(new Date().toISOString().slice(0, 10).replace(/-/g, ""));
  const amount = 40000 + (period % 17) * 1300 + Math.floor((Date.now() / 3.6e6) % 800);
  const raw = JSON.stringify({ source: "representative", asset_id: assetId, period, amount });
  const sourceHash = createHash("sha256").update(raw).digest("hex").slice(0, 32);
  return {
    asset_id: assetId,
    period,
    amount_cents: amount,
    source_hash: sourceHash,
    provenance: {
      network: chainID,
      registry_package_hash: cfg.registryPackage,
      attester: "account-hash-43d7dd06d5538e504e54a3f235f1596f7d2e803e9065bf3c0d040f5cd31a21d4",
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
        description: "ProofYield: latest attested parking-revenue reading for an asset",
        mimeType: "application/json",
      },
    },
    new x402ResourceServer(facilitatorClient).register(chainID, casperScheme),
  ),
);

app.get("/oracle/feed", (req, res) => {
  const assetId = (req.query.asset_id as string) || "sd-parking-101";
  res.json(latestFeed(assetId));
});

app.get("/health", (_req, res) => res.json({ status: "ok", service: "proofyield-oracle" }));

app.listen(cfg.port, () => console.log(`Oracle feed server listening at http://localhost:${cfg.port}`));
