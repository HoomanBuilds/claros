// Verify that the Claros contracts live on Casper testnet are byte-for-byte the
// wasm artifacts in this repository.
//
// For each contract in shared/deployments.json it fetches the install
// transaction from the public RPC, extracts the session `module_bytes` (the
// exact wasm the network stored), sha256s it, and compares against
// contracts/wasm/<Name>.wasm.
//
//   node scripts/verify-onchain.mjs
//
// No keys, no dependencies. Exit code 0 = every contract matches.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '..');
const manifest = JSON.parse(readFileSync(resolve(REPO, 'shared', 'deployments.json'), 'utf8'));
const RPC = manifest.rpc;

const WASM = {
  attestation_registry: 'AttestationRegistry.wasm',
  feed_registry: 'FeedRegistry.wasm',
  treasury_vault: 'TreasuryVault.wasm',
  eligibility_gate: 'EligibilityGate.wasm',
};

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

async function rpc(method, params) {
  const r = await fetch(RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const j = await r.json();
  if (j.error) throw new Error(`${method}: ${j.error.message}`);
  return j.result;
}

async function onchainWasmHash(txHash) {
  let result;
  try {
    result = await rpc('info_get_transaction', { transaction_hash: { Version1: txHash } });
  } catch {
    result = await rpc('info_get_transaction', { transaction_hash: { Deploy: txHash } });
  }
  // The session wasm is the (single, very long) module_bytes field. Regex the raw
  // JSON rather than walking the schema so this survives shape changes.
  const raw = JSON.stringify(result);
  const matches = [...raw.matchAll(/"module_bytes":"([0-9a-fA-F]+)"/g)].map((m) => m[1]);
  if (!matches.length) throw new Error('no module_bytes in transaction');
  const hex = matches.reduce((a, b) => (b.length > a.length ? b : a));
  return sha256(Buffer.from(hex, 'hex'));
}

let ok = true;
console.log(`network: ${manifest.network}   rpc: ${RPC}\n`);
for (const [key, entry] of Object.entries(manifest.contracts)) {
  const wasmFile = WASM[key];
  const local = sha256(readFileSync(resolve(REPO, 'contracts', 'wasm', wasmFile)));
  const chain = await onchainWasmHash(entry.deploy_tx);
  const match = local === chain;
  ok &&= match;
  console.log(`${match ? 'MATCH   ' : 'MISMATCH'} ${wasmFile}`);
  console.log(`         package   ${entry.package_hash}`);
  console.log(`         install   ${entry.deploy_tx}`);
  console.log(`         sha256    local ${local}`);
  console.log(`                   chain ${chain}\n`);
}
console.log(ok ? 'All contracts verified: on-chain wasm == repo artifacts.' : 'VERIFICATION FAILED');
process.exit(ok ? 0 : 1);
