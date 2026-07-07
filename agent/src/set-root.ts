import 'dotenv/config';
import { callContract, Args, CLValue } from './signer.js';

const GATE = process.env.ELIGIBILITY_GATE_PACKAGE_HASH!;
const root = process.argv[2];
if (!root || !/^\d+$/.test(root)) throw new Error('usage: tsx src/set-root.ts <root-decimal>');
const args = Args.fromMap({ new_root: CLValue.newCLUInt256(root) });
const tx = await callContract(GATE, 'set_root', args, 5_000_000_000);
console.log(`set_root sent: https://testnet.cspr.live/transaction/${tx}`);
