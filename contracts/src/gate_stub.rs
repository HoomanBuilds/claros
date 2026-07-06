use odra::prelude::*;

// Test-only eligibility gate: NOT listed in Odra.toml, so it is never built to
// wasm or deployed. Lets registry tests toggle eligibility per address without
// generating Groth16 proofs.
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
