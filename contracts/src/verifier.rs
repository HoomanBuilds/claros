//! Groth16 proof verification for the eligibility circuit (forked from Shroud
//! Protocol's circuit-agnostic verifier).
//!
//! Accepts proofs in a compact 256-byte binary format (8 × 32-byte big-endian
//! field elements) so the on-chain args stay under Casper's per-transaction
//! size cap. The off-chain prover converts snarkjs JSON to this layout.
//!
//! Byte layout (each segment is an Fq big-endian, padded to 32 bytes):
//!   [  0..32 ] = A.x      [ 64..96 ] = B.x.c0   [128..160] = B.y.c0
//!   [ 32..64 ] = A.y      [ 96..128] = B.x.c1   [160..192] = B.y.c1
//!   [192..224] = C.x      [224..256] = C.y

use odra::casper_types::U256;
use odra::prelude::*;
use ark_groth16::{prepare_verifying_key, Groth16, Proof};
use ark_bn254::{Bn254, Fr, Fq, Fq2, G1Affine, G2Affine};
use ark_ff::PrimeField;
use ark_snark::SNARK;
use ark_std::vec::Vec;

use crate::vk::get_verification_key;

pub const PROOF_BYTES_LEN: usize = 256;

pub struct Verifier;

impl Verifier {
    /// Verify a Groth16 eligibility proof.
    ///
    /// Public inputs, in circuit order: `root`, `nullifier_hash`, `account`.
    /// `account` binds the on-chain caller into the proof so it cannot be
    /// replayed by a different address.
    pub fn verify(proof_bytes: &[u8], root: U256, nullifier_hash: U256, account: Address) -> bool {
        let proof = match parse_binary_proof(proof_bytes) {
            Some(p) => p,
            None => return false,
        };

        let vk = get_verification_key();
        let pvk = prepare_verifying_key(&vk);

        // ORDER MATCHES circuit main {public [root, nullifierHash, account]}
        let mut public_inputs: Vec<Fr> = Vec::with_capacity(3);
        public_inputs.push(u256_to_fr(root));
        public_inputs.push(u256_to_fr(nullifier_hash));
        public_inputs.push(address_to_fr(account));

        Groth16::<Bn254>::verify_with_processed_vk(&pvk, &public_inputs, &proof).unwrap_or(false)
    }
}

fn parse_binary_proof(bytes: &[u8]) -> Option<Proof<Bn254>> {
    if bytes.len() != PROOF_BYTES_LEN {
        return None;
    }
    let a_x = Fq::from_be_bytes_mod_order(&bytes[0..32]);
    let a_y = Fq::from_be_bytes_mod_order(&bytes[32..64]);
    let b_x_c0 = Fq::from_be_bytes_mod_order(&bytes[64..96]);
    let b_x_c1 = Fq::from_be_bytes_mod_order(&bytes[96..128]);
    let b_y_c0 = Fq::from_be_bytes_mod_order(&bytes[128..160]);
    let b_y_c1 = Fq::from_be_bytes_mod_order(&bytes[160..192]);
    let c_x = Fq::from_be_bytes_mod_order(&bytes[192..224]);
    let c_y = Fq::from_be_bytes_mod_order(&bytes[224..256]);

    Some(Proof {
        a: G1Affine::new_unchecked(a_x, a_y),
        b: G2Affine::new_unchecked(Fq2::new(b_x_c0, b_x_c1), Fq2::new(b_y_c0, b_y_c1)),
        c: G1Affine::new_unchecked(c_x, c_y),
    })
}

fn u256_to_fr(val: U256) -> Fr {
    let mut bytes = [0u8; 32];
    val.to_little_endian(&mut bytes);
    Fr::from_le_bytes_mod_order(&bytes)
}

fn address_to_fr(addr: Address) -> Fr {
    let hash_bytes = match addr {
        Address::Account(account_hash) => account_hash.value(),
        Address::Contract(contract_package_hash) => contract_package_hash.value(),
    };
    Fr::from_be_bytes_mod_order(&hash_bytes)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_binary_proof_rejects_wrong_length() {
        assert!(parse_binary_proof(&[]).is_none());
        assert!(parse_binary_proof(&[0u8; 255]).is_none());
        assert!(parse_binary_proof(&[0u8; 257]).is_none());
    }

    #[test]
    fn parse_binary_proof_accepts_256_zero_bytes() {
        assert!(parse_binary_proof(&[0u8; 256]).is_some());
    }

    // verifies_known_good_proof_from_snarkjs is generated into known_good_proof.rs
    // from a real snarkjs proof against the shipped vk.rs (see zk-gate/circuits).
    include!("known_good_proof.rs");
}
