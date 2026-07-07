use odra::prelude::*;

// Test-only gate: not in Odra.toml so it never builds to wasm. Lets registry
// tests toggle eligibility without Groth16 proofs.
#[odra::module]
pub struct GateStub {
    allowed: Mapping<Address, bool>,
}

#[odra::module]
impl GateStub {
    pub fn allow(&mut self, who: Address) {
        self.allowed.set(&who, true);
    }

    pub fn is_eligible(&self, who: Address) -> bool {
        self.allowed.get(&who).unwrap_or(false)
    }
}
