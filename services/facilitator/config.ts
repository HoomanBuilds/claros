import { readFileSync } from "node:fs";

import type { Network } from "@x402/core/types";

export type KeyAlgorithm = "ed25519" | "secp256k1";

export const DefaultAlgorithm: KeyAlgorithm = "ed25519";

export interface NetworkKey {
  pem: string;
  algorithm: KeyAlgorithm;
  rpcUrl: string;
}

export interface Env {
  logLevel: string;
  port: number;
  networks: Network[];
  transactionPaymentMotes: number;
  keys: Record<string, NetworkKey>;
}

/** "casper:casper-test" -> "CASPER_CASPER_TEST" (per-network env-var suffix). */
export function networkEnvSuffix(network: string): string {
  return network.toUpperCase().replace(/[:\-]/g, "_");
}

export function normalizePEM(pem: string): string {
  return pem.replace(/\\n/g, "\n").replace(/\r/g, "");
}

export function parseEnv(): Env {
  const logLevel = process.env.LOG_LEVEL || "info";

  const portRaw = process.env.PORT || "4022";
  const port = parseInt(portRaw, 10);
  if (Number.isNaN(port) || port <= 0 || port > 65535) {
    throw new Error(`PORT must be a valid port number, got ${portRaw}`);
  }

  const networksRaw = process.env.CASPER_NETWORKS || "casper:casper-test";
  const networks = networksRaw
    .split(",")
    .map(n => n.trim())
    .filter(n => n.length > 0) as Network[];
  if (networks.length === 0) {
    throw new Error("CASPER_NETWORKS must list at least one CAIP-2 network id");
  }

  const motesRaw = process.env.TRANSACTION_PAYMENT_MOTES || "7000000000";
  const transactionPaymentMotes = parseInt(motesRaw, 10);
  if (Number.isNaN(transactionPaymentMotes) || transactionPaymentMotes <= 0) {
    throw new Error(`TRANSACTION_PAYMENT_MOTES must be a positive integer, got ${motesRaw}`);
  }

  const keys: Record<string, NetworkKey> = {};
  const missing: string[] = [];

  for (const net of networks) {
    const suffix = networkEnvSuffix(net);

    // Prefer a key file path (consistent with the rest of the repo); fall back to inline PEM.
    const pemPath = process.env[`SECRET_KEY_PATH_${suffix}`];
    const pemRaw = pemPath ? readFileSync(pemPath, "utf8") : process.env[`SECRET_KEY_PEM_${suffix}`];
    const rpcUrl = process.env[`RPCURL_${suffix}`];

    if (!pemRaw || !rpcUrl) {
      missing.push(net);
      continue;
    }

    const algoRaw = (process.env[`SECRET_KEY_ALGO_${suffix}`] || DefaultAlgorithm).toLowerCase();
    if (algoRaw !== "ed25519" && algoRaw !== "secp256k1") {
      throw new Error(`SECRET_KEY_ALGO_${suffix} must be 'ed25519' or 'secp256k1', got '${algoRaw}'`);
    }

    keys[net] = { pem: normalizePEM(pemRaw), algorithm: algoRaw as KeyAlgorithm, rpcUrl };
  }

  if (missing.length > 0) {
    throw new Error(
      `Incomplete config for networks ${missing.join(", ")}: set SECRET_KEY_PATH_<NET> (or SECRET_KEY_PEM_<NET>) and RPCURL_<NET>, where <NET> is the CAIP-2 id uppercased with ':' and '-' as '_' (e.g. CASPER_CASPER_TEST).`,
    );
  }

  return { logLevel, port, networks, transactionPaymentMotes, keys };
}
