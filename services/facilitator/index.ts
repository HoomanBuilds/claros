import { x402Facilitator } from "@x402/core/facilitator";
import {
  PaymentPayload,
  PaymentRequirements,
  SettleResponse,
  VerifyResponse,
} from "@x402/core/types";
import { ExactCasperScheme } from "@make-software/casper-x402/exact/facilitator";
import { FacilitatorCasperSigner, toFacilitatorCasperSigner } from "@make-software/casper-x402";
import casperSdk from "casper-js-sdk";
import dotenv from "dotenv";
import express from "express";

import { NetworkKey, parseEnv } from "./config.js";

dotenv.config();

const cfg = parseEnv();

const app = express();
app.use(express.json());

const facilitator = new x402Facilitator()
  .onBeforeSettle(async () => console.log("settling payment..."))
  .onAfterSettle(async ctx => console.log("settled", ctx))
  .onSettleFailure(async ctx => console.log("settle failure", ctx));

async function buildSigner(key: NetworkKey): Promise<FacilitatorCasperSigner> {
  const algorithm =
    key.algorithm === "secp256k1" ? casperSdk.KeyAlgorithm.SECP256K1 : casperSdk.KeyAlgorithm.ED25519;
  const privateKey = casperSdk.PrivateKey.fromPem(key.pem, algorithm);
  return toFacilitatorCasperSigner(privateKey, key.rpcUrl);
}

for (const network of cfg.networks) {
  const key = cfg.keys[network];
  if (!key) throw new Error(`No signing material resolved for network ${network}`);
  const signer = await buildSigner(key);
  facilitator.register(
    network,
    new ExactCasperScheme(signer, { limitedPaymentMotes: cfg.transactionPaymentMotes }),
  );
  console.log(`network ${network} configured (algo=${key.algorithm}, rpc=${key.rpcUrl})`);
}

app.post("/verify", async (req, res) => {
  try {
    const { paymentPayload, paymentRequirements } = req.body as {
      paymentPayload: PaymentPayload;
      paymentRequirements: PaymentRequirements;
    };
    if (!paymentPayload || !paymentRequirements) {
      return res.status(400).json({ error: "Missing paymentPayload or paymentRequirements" });
    }
    const response: VerifyResponse = await facilitator.verify(paymentPayload, paymentRequirements);
    res.json(response);
  } catch (error) {
    console.error("Verify error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.post("/settle", async (req, res) => {
  try {
    const { paymentPayload, paymentRequirements } = req.body;
    if (!paymentPayload || !paymentRequirements) {
      return res.status(400).json({ error: "Missing paymentPayload or paymentRequirements" });
    }
    const response: SettleResponse = await facilitator.settle(
      paymentPayload as PaymentPayload,
      paymentRequirements as PaymentRequirements,
    );
    res.json(response);
  } catch (error) {
    console.error("Settle error:", error);
    if (error instanceof Error && error.message.includes("Settlement aborted:")) {
      return res.json({
        success: false,
        errorReason: error.message.replace("Settlement aborted: ", ""),
        network: req.body?.paymentPayload?.network || "unknown",
      } as SettleResponse);
    }
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.get("/supported", async (_req, res) => {
  try {
    res.json(facilitator.getSupported());
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(cfg.port, () => console.log(`🚀 Facilitator listening on http://localhost:${cfg.port}`));
