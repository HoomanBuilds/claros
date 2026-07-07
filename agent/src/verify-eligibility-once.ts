import 'dotenv/config';
import { readFileSync } from 'node:fs';
import casper from 'casper-js-sdk';
import { callContract, Args, CLValue } from './signer.js';

const { CLTypeUInt8 } = casper;

const RPC = process.env.CASPER_NODE_RPC!;
const GATE = process.env.ELIGIBILITY_GATE_PACKAGE_HASH!;

const proof = JSON.parse(readFileSync(new URL('../proof.json', import.meta.url), 'utf8')) as {
  proof_hex: string;
  root: string;
  nullifier_hash: string;
  account: string;
};

const proofBytes = Uint8Array.from(Buffer.from(proof.proof_hex, 'hex'));

const args = Args.fromMap({
  proof: CLValue.newCLList(
    CLTypeUInt8,
    Array.from(proofBytes, b => CLValue.newCLUint8(b)),
  ),
  root: CLValue.newCLUInt256(proof.root),
  nullifier_hash: CLValue.newCLUInt256(proof.nullifier_hash),
});

console.log('submitting eligibility proof (on-chain Groth16 verify)...');
const tx = await callContract(GATE, 'verify_eligibility', args, 150_000_000_000);
console.log('tx:', tx);
console.log('explorer:', `https://testnet.cspr.live/transaction/${tx}`);

for (let i = 0; i < 40; i++) {
  await new Promise(r => setTimeout(r, 5000));
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'info_get_transaction',
      params: { transaction_hash: { Version1: tx } },
    }),
  });
  const er = ((await res.json()) as any)?.result?.execution_info?.execution_result?.Version2;
  if (er) {
    if (er.error_message) {
      console.log('❌ reverted:', er.error_message, '(proof rejected on-chain)');
    } else {
      console.log('✅ proof VERIFIED on-chain — caller marked eligible. cost:', er.cost, 'motes');
    }
    process.exit(er.error_message ? 1 : 0);
  }
  process.stdout.write('.');
}
console.log('\n(timed out; check the explorer)');
