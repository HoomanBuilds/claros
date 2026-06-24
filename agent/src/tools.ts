import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { callContract, callWithValue, delegate, Args, CLValue } from './signer.js';
import { latestRevenue, assetHistory } from './sandiego.js';

const RPC = process.env.CASPER_NODE_RPC!;
const REGISTRY = process.env.ATTESTATION_REGISTRY_PACKAGE_HASH!;
const VAULT = process.env.TREASURY_VAULT_PACKAGE_HASH!;
const WL = process.env.WISELENDING_PACKAGE_HASH!;
const AGENT_PUB = process.env.AGENT_PUBLIC_KEY!;
const WL_MAIN_PURSE = 'uref-fc3f0684d19865a5c020536e499dd3d9cf1c08201b85474762e86de7e85c0d34-007';
const VALIDATOR = '0106ca7c39cd272dbf21a86eeb3b36b7c26e2e9b94af64292419f7862936bca2ca';

async function rpc(method: string, params: unknown): Promise<any> {
  const r = await fetch(RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  return (await r.json()).result;
}

async function balanceOfPublicKey(pubHex: string): Promise<bigint> {
  const r = await rpc('query_balance', { purse_identifier: { main_purse_under_public_key: pubHex } });
  return BigInt(r?.balance ?? '0');
}

async function balanceOfUref(uref: string): Promise<bigint> {
  const r = await rpc('query_balance', { purse_identifier: { purse_uref: uref } });
  return BigInt(r?.balance ?? '0');
}

const motesToCspr = (m: bigint) => Number(m) / 1e9;

export async function readRevenue(assetId: string) {
  const r = await latestRevenue(assetId);
  return { asset_id: r.asset_id, period: r.period, amount: r.amount_cents, source_hash: r.source_hash };
}

export async function readAttestationHistory(assetId: string) {
  const h = await assetHistory(assetId);
  return {
    asset_id: assetId,
    typical_range_cents: { min: h.min_cents, max: h.max_cents },
    avg_cents: h.avg_cents,
    observed_days: h.days,
    note: 'real per-day revenue range (cents) for this San Diego meter across the year; flag readings far outside this range as anomalous',
  };
}

export async function readTreasury() {
  const cspr = await balanceOfPublicKey(AGENT_PUB).catch(() => 0n);
  return {
    cspr_liquid: motesToCspr(cspr),
    scspr_held_note: 'agent holds sCSPR from prior WiseLending stakes',
    stake_minimum_cspr: 500,
  };
}

export async function readVenueState() {
  const purse = await balanceOfUref(WL_MAIN_PURSE).catch(() => 0n);
  return {
    wiselending: { staked_pool_cspr: motesToCspr(purse), action: 'stake', token: 'sCSPR', growing_rate: true },
    native_delegation: { action: 'delegate', validator: VALIDATOR, min_cspr: 500 },
  };
}

export async function readX402Earnings() {
  const base = process.env.CSPR_CLOUD_BASE!;
  const wcspr = process.env.WCSPR_PACKAGE_HASH!;
  const agentHash = process.env.AGENT_ACCOUNT_HASH!;
  const r = await fetch(`${base}/accounts/${agentHash}/ft-token-ownership?contract_package_hash=${wcspr}`, {
    headers: { Authorization: process.env.CSPR_CLOUD_API_KEY! },
  });
  const motes = BigInt(((await r.json()) as any)?.data?.[0]?.balance ?? '0');
  return {
    wcspr_earned: motesToCspr(motes),
    note: 'WCSPR income earned by selling the oracle feed via x402; treat as treasury available to reinvest',
  };
}

export async function attest(asset_id: string, period: number, amount: number, source_hash: string) {
  const args = Args.fromMap({
    asset_id: CLValue.newCLString(asset_id),
    period: CLValue.newCLUint64(period),
    amount: CLValue.newCLUInt512(amount),
    source_hash: CLValue.newCLString(source_hash),
  });
  const tx = await callContract(REGISTRY, 'attest', args, 20_000_000_000);
  return { tx, explorer: `https://testnet.cspr.live/transaction/${tx}` };
}

export async function reinvest(action: 'stake' | 'delegate' | 'hold', amount_cspr: number) {
  if (action === 'hold') return { action, tx: null };
  const motes = String(BigInt(Math.round(amount_cspr)) * 1_000_000_000n);
  if (action === 'stake') {
    const proxy = new Uint8Array(readFileSync('wasm/wiselending-proxy.wasm'));
    const tx = await callWithValue(proxy, WL, 'stake', motes, 15_000_000_000);
    return { action, tx, explorer: `https://testnet.cspr.live/transaction/${tx}` };
  }
  const tx = await delegate(VALIDATOR, motes, 2_500_000_000);
  return { action, tx, explorer: `https://testnet.cspr.live/transaction/${tx}` };
}

export async function recordReinvest(venue: string, amount_in: number, amount_out: number, reasoning: string) {
  const args = Args.fromMap({
    venue: CLValue.newCLString(venue),
    amount_in: CLValue.newCLUInt512(amount_in),
    amount_out: CLValue.newCLUInt512(amount_out),
    reasoning: CLValue.newCLString(reasoning),
  });
  const tx = await callContract(VAULT, 'record_reinvest', args, 20_000_000_000);
  return { tx, explorer: `https://testnet.cspr.live/transaction/${tx}` };
}
