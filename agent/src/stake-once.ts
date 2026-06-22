import { readFileSync } from 'node:fs';
import { callWithValue } from './signer.js';

const WL =
  process.env.WISELENDING_PACKAGE_HASH ??
  'baa50d1500aa5361c497c06b40f2822ebb0b5fce5b1c3a037ea628cb68d920f3';
const proxy = new Uint8Array(readFileSync('wasm/wiselending-proxy.wasm'));
const AMOUNT_MOTES = '500000000000';

const hash = await callWithValue(proxy, WL, 'stake', AMOUNT_MOTES, 15_000_000_000);
console.log('agent staked 500 CSPR -> sCSPR tx:', hash);
console.log('explorer: https://testnet.cspr.live/transaction/' + hash);
