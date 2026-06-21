import { delegate } from './signer.js';

const VALIDATOR =
  process.env.DELEGATE_VALIDATOR_HEX ??
  '0106ca7c39cd272dbf21a86eeb3b36b7c26e2e9b94af64292419f7862936bca2ca';
const AMOUNT_MOTES = '500000000000';

const hash = await delegate(VALIDATOR, AMOUNT_MOTES, 2_500_000_000);
console.log('agent delegated 500 CSPR tx:', hash);
console.log('explorer: https://testnet.cspr.live/transaction/' + hash);
