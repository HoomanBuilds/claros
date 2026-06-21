import { callContract, Args, CLValue } from './signer.js';

const VAULT = process.env.TREASURY_VAULT_PACKAGE_HASH!;

const args = Args.fromMap({
  venue: CLValue.newCLString('wiselending'),
  amount_in: CLValue.newCLUInt512(500),
  amount_out: CLValue.newCLUInt512(497),
  reasoning: CLValue.newCLString('demo: staking rate beats DEX; treasury over stake minimum'),
});

const hash = await callContract(VAULT, 'record_reinvest', args, 20_000_000_000);
console.log('agent recorded reinvest tx:', hash);
console.log('explorer: https://testnet.cspr.live/transaction/' + hash);
