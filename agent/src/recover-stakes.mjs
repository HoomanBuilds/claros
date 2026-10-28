import 'dotenv/config';
import { readFileSync, existsSync, writeFileSync, renameSync } from 'node:fs';
import casper from 'casper-js-sdk';

const OWNER = '020362ef3cb7536f7eac9a1d30a8d0fbdf7ed3384717b5365751005ebf1826c7b1f6';
const PACKAGE = 'baa50d1500aa5361c497c06b40f2822ebb0b5fce5b1c3a037ea628cb68d920f3';
const CONTRACT = '1a1115e8fd76e6e557a033c7706d5f532724b17152abc7cf5d258a7b29b9047c';
const STATE_SEED = 'uref-ea39c9a9e85906ee6b7cee850b76e3dfde3659f497e4fac92ab5d86b56d99363-007';
const VALIDATOR = '0106ca7c39cd272dbf21a86eeb3b36b7c26e2e9b94af64292419f7862936bca2ca';
const STATE_FILE = '.stake-recovery.json';
const { PrivateKey, KeyAlgorithm, PublicKey, ContractCallBuilder, NativeUndelegateBuilder, Args, CLValue, RpcClient, HttpHandler, byteHash } = casper;
const ownerHash = PublicKey.fromHex(OWNER).accountHash().toHex();
const mode = process.argv[2] ?? 'inspect';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const log = value => console.log(JSON.stringify({ at: new Date().toISOString(), ...value }));

if (!['inspect', 'unstake', 'claim', 'watch-claim'].includes(mode)) throw new Error('Use inspect, unstake, claim or watch-claim');
if (process.env.CASPER_CHAIN_NAME !== 'casper-test' || process.env.AGENT_PUBLIC_KEY !== OWNER || process.env.WISELENDING_PACKAGE_HASH !== PACKAGE) {
  throw new Error('Recovery is restricted to the approved Casper testnet account and staking package');
}

let state = existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, 'utf8')) : { owner: OWNER, package: PACKAGE, createdAt: new Date().toISOString() };
if (state.owner !== OWNER || state.package !== PACKAGE) throw new Error('Recovery state target mismatch');
function save() {
  writeFileSync(`${STATE_FILE}.tmp`, JSON.stringify(state, null, 2), { mode: 0o600 });
  renameSync(`${STATE_FILE}.tmp`, STATE_FILE);
}

async function rpc(method, params) {
  const response = await fetch(process.env.CASPER_NODE_RPC, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
  const body = await response.json();
  if (body.error) throw new Error(`${method}: ${JSON.stringify(body.error)}`);
  if (!body.result) throw new Error(`${method}: missing result`);
  return body.result;
}

async function cloud(path) {
  const response = await fetch(process.env.CSPR_CLOUD_BASE.replace(/\/$/, '') + path, {
    headers: { Authorization: process.env.CSPR_CLOUD_API_KEY }, signal: AbortSignal.timeout(20000),
  });
  const body = await response.json();
  if (!response.ok || !Object.hasOwn(body, 'data')) throw new Error(`Cloud HTTP ${response.status}`);
  return body.data ?? [];
}

async function field(index, key = Buffer.alloc(0)) {
  const prefix = Buffer.alloc(4); prefix.writeUInt32BE(index);
  const item = Buffer.from(byteHash(Buffer.concat([prefix, key]))).toString('hex');
  const result = await rpc('state_get_dictionary_item', {
    state_root_hash: (await rpc('chain_get_state_root_hash', {})).state_root_hash,
    dictionary_identifier: { URef: { seed_uref: STATE_SEED, dictionary_item_key: item } },
  });
  const value = result.stored_value?.CLValue;
  if (!value?.bytes) throw new Error('Missing staking state');
  const bytes = Buffer.from(value.bytes, 'hex');
  if (bytes.length < 4 || bytes.readUInt32LE(0) !== bytes.length - 4) throw new Error('Invalid staking state encoding');
  return bytes.subarray(4);
}

async function claims() {
  const ids = await field(4, Buffer.concat([Buffer.from([0]), Buffer.from(ownerHash, 'hex')]));
  const count = ids.readUInt32LE(0);
  if (count > 100 || ids.length !== 4 + count * 4) throw new Error('Invalid unstake ID list');
  const result = [];
  for (let i = 0; i < count; i++) {
    const id = ids.readUInt32LE(4 + i * 4);
    const k = Buffer.alloc(4); k.writeUInt32LE(id);
    const b = await field(0x50, k);
    if (b.readUInt32LE(0) !== id || b[4] !== 0 || b.subarray(5, 37).toString('hex') !== ownerHash) throw new Error('Unstake record owner mismatch');
    const length = b[37];
    if (length > 64 || b.length !== 47 + length) throw new Error('Invalid unstake record length');
    let amount = 0n;
    for (let j = length - 1; j >= 0; j--) amount = (amount << 8n) | BigInt(b[38 + j]);
    result.push({ id, amountMotes: amount.toString(), claimableAt: Number(b.readBigUInt64LE(38 + length)), claimed: Boolean(b[46 + length]) });
  }
  return result;
}

async function inspect() {
  const [native, tokens, delegations, cooldown] = await Promise.all([
    rpc('query_balance_details', { purse_identifier: { main_purse_under_public_key: OWNER } }),
    cloud(`/accounts/${OWNER}/ft-token-ownership?page_size=100`),
    cloud(`/accounts/${OWNER}/delegations?page_size=100`), field(8),
  ]);
  if (!/^\d+$/.test(native.available_balance)) throw new Error('Missing native available balance');
  const token = tokens.find(t => t.contract_package_hash === PACKAGE);
  const delegation = delegations.find(d => d.validator_public_key === VALIDATOR);
  return { nativeMotes: native.available_balance, scsprMotes: token?.balance ?? '0', delegatedMotes: delegation?.stake ?? '0', cooldownMs: Number(cooldown.readBigUInt64LE(0)) };
}

async function confirm(hash) {
  const deadline = Date.now() + 300000;
  while (Date.now() < deadline) {
    let response;
    try { response = await rpc('info_get_transaction', { transaction_hash: { Version1: hash } }); }
    catch (error) { log({ checking: hash, warning: error.message }); await sleep(5000); continue; }
    const execution = response.execution_info?.execution_result;
    if (execution) {
      const result = execution.Version2 ?? execution.Version1;
      if (!result) throw new Error('Unsupported execution result');
      const error = result.error_message ?? result.Failure?.error_message;
      if (error) throw new Error(`Transaction ${hash} failed: ${error}`);
      return { blockHash: response.execution_info.block_hash, costMotes: result.cost, success: true };
    }
    await sleep(5000);
  }
  throw new Error(`Transaction ${hash} confirmation timed out; do not resubmit without checking it`);
}

function signer() {
  const algo = (process.env.AGENT_KEY_ALGO ?? 'secp256k1').toLowerCase() === 'ed25519' ? KeyAlgorithm.ED25519 : KeyAlgorithm.SECP256K1;
  const key = PrivateKey.fromPem(readFileSync(process.env.AGENT_KEY_PEM_PATH, 'utf8'), algo);
  if (key.publicKey.toHex() !== OWNER) throw new Error('Signer mismatch');
  return key;
}

async function submit(label, builder, payment) {
  if (state[label]?.hash) {
    state[label].execution = await confirm(state[label].hash); save(); return;
  }
  const native = await rpc('query_balance', { purse_identifier: { main_purse_under_public_key: OWNER } });
  if (!native.balance || BigInt(native.balance) < BigInt(payment) + 100_000_000_000n) throw new Error('Insufficient gas reserve');
  const key = signer();
  const tx = builder.chainName('casper-test').payment(payment, 1).from(key.publicKey).ttl(600000).build();
  tx.sign(key);
  state[label] = { hash: tx.hash.toHex(), submittedAt: new Date().toISOString(), paymentMotes: String(payment) };
  save();
  log({ submitting: label, hash: state[label].hash, maxGasCSPR: payment / 1e9 });
  const response = await new RpcClient(new HttpHandler(process.env.CASPER_NODE_RPC)).putTransaction(tx);
  if (response.transactionHash.toHex() !== state[label].hash) throw new Error('Transaction hash mismatch');
  state[label].execution = await confirm(state[label].hash); save();
  log({ confirmed: label, ...state[label] });
}

async function verifyContract() {
  const result = await rpc('query_global_state', { state_identifier: null, key: `hash-${PACKAGE}`, path: [] });
  const version = (result.stored_value.ContractPackage ?? result.stored_value.Package).versions.at(-1);
  if (version.contract_hash.replace(/^contract-/, '') !== CONTRACT) throw new Error('Staking contract changed; review before recovery');
}

async function unstake() {
  await verifyContract();
  const before = await inspect(); log({ before });
  if (BigInt(before.scsprMotes) > 4_390_375_895_553n || BigInt(before.delegatedMotes) > 520_000_000_000n) throw new Error('Position exceeds the approved recovery scope');
  state.before ??= before; save();
  if (BigInt(before.scsprMotes) > 0n || state.liquidUnstake?.hash) {
    await submit('liquidUnstake', new ContractCallBuilder().byPackageHash(PACKAGE).entryPoint('unstake').runtimeArgs(Args.fromMap({ scspr_amount: CLValue.newCLUInt256(state.before.scsprMotes) })), 60_000_000_000);
    state.claims = await claims();
    if (!state.claims.length) throw new Error('No pending claim found after unstake');
    save(); log({ pendingClaims: state.claims });
  }
  if (BigInt(before.delegatedMotes) > 0n || state.nativeUndelegate?.hash) {
    await submit('nativeUndelegate', new NativeUndelegateBuilder().validator(PublicKey.fromHex(VALIDATOR)).amount(state.before.delegatedMotes), 2_500_000_000);
  }
  log({ after: await inspect(), state });
}

async function claim() {
  await verifyContract();
  if (!state.liquidUnstake?.execution?.success || !state.claims?.length) throw new Error('No verified unstake in recovery state');
  if (state.claim?.hash) {
    state.claim.execution = await confirm(state.claim.hash); save();
  } else {
    const pending = (await claims()).filter(c => !c.claimed);
    if (!pending.length) { state.claimedElsewhere = true; save(); log({ alreadyClaimed: true }); return; }
    if (pending.some(c => !state.claims.some(s => s.id === c.id && s.amountMotes === c.amountMotes))) throw new Error('Unexpected claim outside recovery scope');
    const readyAt = Math.max(...pending.map(c => c.claimableAt)) + 60000;
    if (Date.now() < readyAt) throw new Error(`Claim is not ready until ${new Date(readyAt).toISOString()}`);
    await submit('claim', new ContractCallBuilder().byPackageHash(PACKAGE).entryPoint('claim').runtimeArgs(Args.fromMap({})), 30_000_000_000);
  }
  const remaining = (await claims()).filter(c => !c.claimed);
  if (remaining.length) throw new Error('Claim transaction did not clear the pending position');
  state.completedAt = new Date().toISOString(); save();
  log({ recovered: true, state, balances: await inspect() });
}

async function watchClaim() {
  if (!state.claims?.length) throw new Error('No claim scheduled');
  if (state.completedAt || state.claimedElsewhere) { log({ alreadyComplete: true }); return; }
  const readyAt = Math.max(...state.claims.map(c => c.claimableAt)) + 300000;
  log({ scheduledClaimAt: new Date(readyAt).toISOString(), owner: OWNER });
  while (Date.now() < readyAt) await sleep(Math.min(60000, readyAt - Date.now()));
  for (let attempt = 1; attempt <= 12; attempt++) {
    try { await claim(); return; }
    catch (error) {
      log({ claimAttempt: attempt, error: error.message });
      if (attempt === 12) throw error;
      await sleep(300000);
    }
  }
}

try {
  if (mode === 'inspect') log({ balances: await inspect(), recovery: state });
  if (mode === 'unstake') await unstake();
  if (mode === 'claim') await claim();
  if (mode === 'watch-claim') await watchClaim();
} catch (error) {
  log({ error: error.message });
  process.exitCode = 1;
}
