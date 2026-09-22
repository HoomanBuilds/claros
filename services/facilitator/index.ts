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

class ClarosExactCasperScheme extends ExactCasperScheme {
  constructor(
    private readonly facilitatorSigner: FacilitatorCasperSigner,
    private readonly paymentMotes: number,
  ) {
    super(facilitatorSigner, { limitedPaymentMotes: paymentMotes });
  }

  async settle(
    payload: PaymentPayload,
    requirements: PaymentRequirements,
    context?: any,
  ): Promise<SettleResponse> {
    const verified = await this.verify(payload, requirements, context);
    if (!verified.isValid) {
      return {
        success: false,
        errorReason: verified.invalidReason,
        errorMessage: verified.invalidMessage,
        payer: verified.payer,
        transaction: "",
        network: requirements.network,
      };
    }

    let transactionHash = "";
    try {
      const payment = (payload as any).payload;
      const publicKeyHex = this.facilitatorSigner.getPublicKeyHex(requirements.network);
      const facilitatorPublicKey = casperSdk.PublicKey.fromHex(publicKeyHex);
      const networkConfig = await this.facilitatorSigner.getNetworkConfig(requirements.network);
      const bytes = (value: string) => Uint8Array.from(Buffer.from(value.replace(/^0x/, ""), "hex"));
      const from = casperSdk.Key.newKey(`account-hash-${payment.authorization.from.slice(2)}`);
      const to = casperSdk.Key.newKey(`account-hash-${payment.authorization.to.slice(2)}`);
      const publicKey = casperSdk.PublicKey.fromHex(payment.publicKey);
      const args = casperSdk.Args.fromMap({
        from: casperSdk.CLValue.newCLKey(from),
        to: casperSdk.CLValue.newCLKey(to),
        value: casperSdk.CLValue.newCLUInt256(payment.authorization.value),
        valid_after: casperSdk.CLValue.newCLUint64(Number(payment.authorization.validAfter)),
        valid_before: casperSdk.CLValue.newCLUint64(Number(payment.authorization.validBefore)),
        nonce: casperSdk.CLValue.newCLList(
          casperSdk.CLTypeUInt8,
          Array.from(bytes(payment.authorization.nonce), value => casperSdk.CLValue.newCLUint8(value)),
        ),
        public_key: casperSdk.CLValue.newCLPublicKey(publicKey),
        signature: casperSdk.CLValue.newCLList(
          casperSdk.CLTypeUInt8,
          Array.from(bytes(payment.signature), value => casperSdk.CLValue.newCLUint8(value)),
        ),
      });
      const transaction = new casperSdk.ContractCallBuilder()
        .from(facilitatorPublicKey)
        .byPackageHash(requirements.asset)
        .entryPoint("transfer_with_authorization")
        .runtimeArgs(args)
        .chainName(networkConfig.chainName)
        .payment(this.paymentMotes)
        .build();
      await this.facilitatorSigner.signTransaction(transaction, requirements.network);
      transactionHash = await this.facilitatorSigner.putTransaction(requirements.network, transaction);
      await this.facilitatorSigner.waitForTransaction(requirements.network, transactionHash);
      return {
        success: true,
        transaction: transactionHash,
        network: requirements.network,
        payer: verified.payer,
      };
    } catch (error) {
      return {
        success: false,
        errorReason: "invalid_exact_casper_facilitator_settle_failed",
        errorMessage: error instanceof Error ? error.message : String(error),
        payer: verified.payer,
        transaction: transactionHash,
        network: requirements.network,
      };
    }
  }
}

for (const network of cfg.networks) {
  const key = cfg.keys[network];
  if (!key) throw new Error(`No signing material resolved for network ${network}`);
  const signer = await buildSigner(key);
  facilitator.register(
    network,
    new ClarosExactCasperScheme(signer, cfg.transactionPaymentMotes),
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
