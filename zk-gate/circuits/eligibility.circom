pragma circom 2.1.0;

include "merkleTree.circom";
include "mimc.circom";

// Proves, in zero knowledge, that the prover knows a private (identity, nullifier)
// whose leaf = MiMC([identity, nullifier]) is a member of the public allowlist
// Merkle `root`, without revealing which leaf. Publishes nullifierHash =
// MiMC([nullifier]) to make each membership one-shot (sybil/replay resistant) and
// binds the on-chain caller `account` so a proof cannot be replayed by someone else.
template Eligibility(levels) {
    signal input identity;             // private
    signal input nullifier;            // private
    signal input pathElements[levels]; // private
    signal input pathIndices[levels];  // private

    signal input root;                 // public — allowlist anchor
    signal input nullifierHash;        // public — one-shot spend tag
    signal input account;              // public — bound caller account-hash

    component leafHasher = MultiMiMC7(2, 91);
    leafHasher.in[0] <== identity;
    leafHasher.in[1] <== nullifier;
    leafHasher.k <== 0;

    component tree = MerkleTreeChecker(levels);
    tree.leaf <== leafHasher.out;
    for (var i = 0; i < levels; i++) {
        tree.pathElements[i] <== pathElements[i];
        tree.pathIndices[i] <== pathIndices[i];
    }
    tree.root === root;

    component nh = MultiMiMC7(1, 91);
    nh.in[0] <== nullifier;
    nh.k <== 0;
    nh.out === nullifierHash;

    // Bind the caller into the constraint system (anti-tamper); the value is
    // checked on-chain against env::caller().
    signal accountSquare;
    accountSquare <== account * account;
}

component main {public [root, nullifierHash, account]} = Eligibility(20);
