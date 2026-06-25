use odra::casper_types::U256;
use odra::prelude::*;

use crate::verifier::Verifier;

#[odra::odra_error]
pub enum Error {
    NotOwner = 1,
    UnknownRoot = 2,
    InvalidProof = 3,
    AlreadyClaimed = 4,
}

#[odra::event]
pub struct EligibilityGranted {
    pub account: Address,
    pub nullifier_hash: U256,
    pub timestamp: u64,
}

#[odra::event]
pub struct RootUpdated {
    pub root: U256,
}

/// Gates access behind a zero-knowledge proof of allowlist membership. A caller
/// proves (off-chain) that it knows a secret whose leaf is in `allowlist_root`,
/// without revealing which leaf; this contract verifies the Groth16 proof on-chain
/// and marks the caller eligible. The proof binds the caller's address and burns a
/// nullifier, so it cannot be replayed by another account or reused.
#[odra::module(events = [EligibilityGranted, RootUpdated])]
pub struct EligibilityGate {
    owner: Var<Address>,
    allowlist_root: Var<U256>,
    eligible: Mapping<Address, bool>,
    spent_nullifiers: Mapping<U256, bool>,
    granted: Var<u64>,
}

#[odra::module]
impl EligibilityGate {
    pub fn init(&mut self, allowlist_root: U256) {
        self.owner.set(self.env().caller());
        self.allowlist_root.set(allowlist_root);
        self.granted.set(0);
    }

    /// Owner-only allowlist rotation (members are maintained off-chain; only the
    /// Merkle root lives on-chain).
    pub fn set_root(&mut self, new_root: U256) {
        if self.env().caller() != self.owner.get().unwrap_or_revert(&self.env()) {
            self.env().revert(Error::NotOwner);
        }
        self.allowlist_root.set(new_root);
        self.env().emit_event(RootUpdated { root: new_root });
    }

    /// Verify a 256-byte Groth16 eligibility proof. Public inputs are
    /// (root, nullifier_hash, caller); on success the caller is marked eligible.
    pub fn verify_eligibility(&mut self, proof: Vec<u8>, root: U256, nullifier_hash: U256) {
        if root != self.allowlist_root.get().unwrap_or_revert(&self.env()) {
            self.env().revert(Error::UnknownRoot);
        }
        if self.spent_nullifiers.get(&nullifier_hash).unwrap_or(false) {
            self.env().revert(Error::AlreadyClaimed);
        }
        let caller = self.env().caller();
        if !Verifier::verify(&proof, root, nullifier_hash, caller) {
            self.env().revert(Error::InvalidProof);
        }
        self.spent_nullifiers.set(&nullifier_hash, true);
        self.eligible.set(&caller, true);
        self.granted.set(self.granted.get_or_default() + 1);
        self.env().emit_event(EligibilityGranted {
            account: caller,
            nullifier_hash,
            timestamp: self.env().get_block_time(),
        });
    }

    pub fn is_eligible(&self, who: Address) -> bool {
        self.eligible.get(&who).unwrap_or(false)
    }

    pub fn get_root(&self) -> U256 {
        self.allowlist_root.get().unwrap_or_revert(&self.env())
    }

    pub fn granted_count(&self) -> u64 {
        self.granted.get_or_default()
    }
}
