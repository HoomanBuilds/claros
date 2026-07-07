// Canonical allowlist Merkle tree: depth 20, MiMC7 pair hashing, missing
// siblings are literal 0n. add-leaf.js and prove.js must both use this
// construction so the on-chain root and proof paths always agree.
const { buildMimc7 } = require('circomlibjs');

const LEVELS = 20;

async function hasher() {
  const mimc = await buildMimc7();
  return arr => mimc.F.toObject(mimc.multiHash(arr));
}

function buildTree(H, leaves) {
  const layers = [leaves.map(BigInt)];
  for (let l = 0; l < LEVELS; l++) {
    const cur = layers[l];
    const next = [];
    for (let i = 0; i < Math.max(1, Math.ceil(cur.length / 2)); i++) {
      const left = cur[2 * i] ?? 0n;
      const right = cur[2 * i + 1] ?? 0n;
      next.push(H([left, right]));
    }
    layers.push(next);
  }
  return { root: layers[LEVELS][0], layers };
}

function pathFor(layers, index) {
  const pathElements = [];
  const pathIndices = [];
  let idx = index;
  for (let l = 0; l < LEVELS; l++) {
    const sibling = layers[l][idx ^ 1] ?? 0n;
    pathElements.push(sibling.toString());
    pathIndices.push(idx % 2);
    idx = Math.floor(idx / 2);
  }
  return { pathElements, pathIndices };
}

module.exports = { LEVELS, hasher, buildTree, pathFor };
