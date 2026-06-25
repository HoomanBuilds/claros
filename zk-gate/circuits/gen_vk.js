// Convert a snarkjs verification_key.json into the hardcoded ark-bn254 vk.rs the
// Odra verifier compiles in. No coordinate swap (ark Fq2::new takes c0 first,
// matching snarkjs); drop the projective "1". IC length == nPublic + 1.
//   usage: node gen_vk.js verification_key.json > ../../contracts/src/vk.rs
const fs = require('fs');
const vk = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

const g1 = (p, label) =>
  `        // ${label}\n        G1Affine::new_unchecked(\n            MontFp!("${p[0]}"),\n            MontFp!("${p[1]}"),\n        )`;
const g2 = p =>
  `        Fq2::new(\n            MontFp!("${p[0][0]}"),\n            MontFp!("${p[0][1]}"),\n        ),\n        Fq2::new(\n            MontFp!("${p[1][0]}"),\n            MontFp!("${p[1][1]}"),\n        ),`;

const ic = vk.IC.map((p, i) => g1(p, `IC[${i}]`)).join(',\n');

process.stdout.write(`//! Hardcoded verification key for the eligibility circuit.
//! Generated from circuits/verification_key.json by gen_vk.js — do not edit by hand.
//! Public inputs: ${vk.nPublic} (root, nullifierHash, account); IC length = ${vk.IC.length}.

use ark_bn254::{Bn254, Fq2, G1Affine, G2Affine};
use ark_ff::MontFp;
use ark_groth16::VerifyingKey;
use alloc::vec;
use alloc::vec::Vec;

pub fn get_verification_key() -> VerifyingKey<Bn254> {
    let alpha_g1 = G1Affine::new_unchecked(
        MontFp!("${vk.vk_alpha_1[0]}"),
        MontFp!("${vk.vk_alpha_1[1]}"),
    );

    let beta_g2 = G2Affine::new_unchecked(
${g2(vk.vk_beta_2)}
    );

    let gamma_g2 = G2Affine::new_unchecked(
${g2(vk.vk_gamma_2)}
    );

    let delta_g2 = G2Affine::new_unchecked(
${g2(vk.vk_delta_2)}
    );

    let gamma_abc_g1: Vec<G1Affine> = vec![
${ic},
    ];

    VerifyingKey {
        alpha_g1,
        beta_g2,
        gamma_g2,
        delta_g2,
        gamma_abc_g1,
    }
}
`);
