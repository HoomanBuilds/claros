// Operator-side enrollment: generate a secret identity + nullifier locally and
// print the public leaf. The secret file never leaves the operator's machine;
// only the leaf is shared (via PR to zk-gate/allowlist/leaves.json).
//   node enroll.js [outfile=operator-secret.json]
const fs = require('fs');
const crypto = require('crypto');
const { hasher } = require('./tree');

(async () => {
  const H = await hasher();
  const rnd = () => BigInt('0x' + crypto.randomBytes(31).toString('hex'));
  const identity = rnd();
  const nullifier = rnd();
  const leaf = H([identity, nullifier]);
  const out = process.argv[2] || 'operator-secret.json';
  fs.writeFileSync(out, JSON.stringify({
    identity: identity.toString(),
    nullifier: nullifier.toString(),
    leaf: leaf.toString(),
  }, null, 2));
  console.log('secret written to', out, '(keep it private, back it up)');
  console.log('your PUBLIC leaf (submit this):', leaf.toString());
})();
