import cors from "cors";
import { config } from "dotenv";
import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactCasperScheme } from "@make-software/casper-x402/exact/server";
import { FacilitatorConfig, HTTPFacilitatorClient } from "@x402/core/server";
import { AssetAmount, Network } from "@x402/core/types";

import { latestRevenue } from "./sandiego.js";

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

// The paid product: the oracle's latest attested reading (San Diego parking or
// any EIA feed the operator serves), stamped with on-chain registry provenance
// so the buyer can independently verify it. source_hash is the same canonical
// digest the agent attests on-chain.
async function latestFeed(assetId: string) {
  if (assetId.startsWith("EIA.")) {
    const { latestEia } = await import("./eia.js");
    const r = await latestEia(assetId);
    return {
      asset_id: r.asset_id,
      period: r.period,
      amount: String(r.amount),
      value: r.value,
      unit: r.unit,
      latest_date: r.latest_date,
      source_hash: r.source_hash,
      provenance: {
        network: chainID,
        registry_package_hash: cfg.registryPackage,
        attester: ATTESTER,
        source: "U.S. Energy Information Administration APIv2",
        verify: `https://testnet.cspr.live/contract-package/${cfg.registryPackage}`,
      },
      served_at: new Date().toISOString(),
    };
  }
  const r = await latestRevenue(assetId);
  return {
    asset_id: r.asset_id,
    period: r.period,
    amount_cents: r.amount_cents,
    txn_count: r.txn_count,
    latest_date: r.latest_date,
    source_hash: r.source_hash,
    provenance: {
      network: chainID,
      registry_package_hash: cfg.registryPackage,
      attester: ATTESTER,
      source: "City of San Diego — parking-meter daily transactions",
      source_url: r.source_url,
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
        description: "Claros: latest attested parking-revenue reading for an asset",
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
