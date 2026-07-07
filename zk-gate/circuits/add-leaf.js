// Owner-side: append a member leaf and print the new root for
// EligibilityGate.set_root (agent/src/set-root.ts).
//   node add-leaf.js <leaf-decimal>
const fs = require('fs');
const path = require('path');
const { hasher, buildTree } = require('./tree');

const FILE = path.join(__dirname, '..', 'allowlist', 'leaves.json');

(async () => {
  const leaf = process.argv[2];
  if (!leaf || !/^\d+$/.test(leaf)) throw new Error('usage: node add-leaf.js <leaf-decimal>');
  const leaves = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  if (leaves.includes(leaf)) throw new Error('leaf already enrolled');
  leaves.push(leaf);
  const H = await hasher();
  const { root } = buildTree(H, leaves);
  fs.writeFileSync(FILE, JSON.stringify(leaves, null, 2));
  console.log(`member #${leaves.length - 1} added`);
  console.log('new root (set this on-chain):', root.toString());
})();
