import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import casper from 'casper-js-sdk';

const { PrivateKey, KeyAlgorithm } = casper;

const out = process.argv[2] ?? 'keys/operator.pem';
const key = PrivateKey.generate(KeyAlgorithm.SECP256K1);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, key.toPem());
console.log('key written to  ', out);
console.log('public key      ', key.publicKey.toHex());
console.log('account hash    ', key.publicKey.accountHash().toHex());
console.log('fund it at       https://testnet.cspr.live/tools/faucet');
