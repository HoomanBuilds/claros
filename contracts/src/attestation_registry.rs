use odra::casper_types::U512;
use odra::prelude::*;

/// A single revenue attestation for an asset in a period.
#[odra::odra_type]
pub struct Attestation {
    pub period: u64,
    pub amount: U512,
    pub source_hash: String,
    pub attester: Address,
    pub timestamp: u64,
}

/// Contract errors.
#[odra::odra_error]
pub enum Error {
    /// Caller is not the authorized attester.
    Unauthorized = 1,
}

/// Emitted on every successful attestation. Indexed off-chain via CSPR.cloud
/// (we do NOT iterate state on-chain to build feeds — see the contract guide).
#[odra::event]
pub struct RevenueAttested {
    pub asset_id: String,
    pub period: u64,
    pub amount: U512,
    pub source_hash: String,
    pub index: u64,
    pub timestamp: u64,
}

/// First-party verifiable RWA-revenue oracle registry.
///
/// Storage discipline (docs/proofyield-casper-contract-guide.md):
/// - `Mapping`s are NOT iterable. Per-asset `count` and the global `total`
///   are maintained INCREMENTALLY on each write — never derived by iteration.
/// - History is keyed by a composite `"asset_id#index"` string.
#[odra::module(events = [RevenueAttested])]
pub struct AttestationRegistry {
    /// The only address allowed to attest (the agent key). Set at init.
    attester: Var<Address>,
    /// asset_id -> latest attestation (O(1) read).
    latest: Mapping<String, Attestation>,
    /// "asset_id#index" -> attestation (queryable history).
    history: Mapping<String, Attestation>,
    /// asset_id -> number of attestations (incremental aggregate).
    count: Mapping<String, u64>,
    /// global attestation count (incremental aggregate).
    total: Var<u64>,
}

#[odra::module]
impl AttestationRegistry {
    /// Initialize with the authorized attester (the agent's account).
    pub fn init(&mut self, attester: Address) {
        self.attester.set(attester);
        self.total.set(0);
    }

    /// Attest a revenue figure for an asset + period. Only the attester may call.
    pub fn attest(&mut self, asset_id: String, period: u64, amount: U512, source_hash: String) {
        let caller = self.env().caller();
        if caller != self.attester.get().unwrap_or_revert(&self.env()) {
            self.env().revert(Error::Unauthorized);
        }

        let timestamp = self.env().get_block_time();
        let index = self.count.get_or_default(&asset_id);

        let attestation = Attestation {
            period,
            amount,
            source_hash: source_hash.clone(),
            attester: caller,
            timestamp,
        };

        self.history
            .set(&format!("{}#{}", asset_id, index), attestation.clone());
        self.latest.set(&asset_id, attestation);
        self.count.set(&asset_id, index + 1);
        self.total.set(self.total.get_or_default() + 1);

        self.env().emit_event(RevenueAttested {
            asset_id,
            period,
            amount,
            source_hash,
            index,
            timestamp,
        });
    }

    /// Latest attestation for an asset, if any.
    pub fn get_latest(&self, asset_id: String) -> Option<Attestation> {
        self.latest.get(&asset_id)
    }

    /// Attestation at a specific index for an asset, if any.
    pub fn get_at(&self, asset_id: String, index: u64) -> Option<Attestation> {
        self.history.get(&format!("{}#{}", asset_id, index))
    }

    /// Number of attestations recorded for an asset.
    pub fn get_count(&self, asset_id: String) -> u64 {
        self.count.get_or_default(&asset_id)
    }

    /// Total attestations across all assets.
    pub fn total_attestations(&self) -> u64 {
        self.total.get_or_default()
    }

    /// The authorized attester address.
    pub fn get_attester(&self) -> Address {
        self.attester.get().unwrap_or_revert(&self.env())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use odra::host::Deployer;

    #[test]
    fn attest_and_read() {
        let env = odra_test::env();
        let attester = env.get_account(0);
        let mut c = AttestationRegistry::deploy(&env, AttestationRegistryInitArgs { attester });

        env.set_caller(attester);
        c.attest(String::from("zone-1"), 20260626, U512::from(500u64), String::from("hash-abc"));

        let latest = c.get_latest(String::from("zone-1")).unwrap();
        assert_eq!(latest.amount, U512::from(500u64));
        assert_eq!(latest.period, 20260626);
        assert_eq!(c.get_count(String::from("zone-1")), 1);
        assert_eq!(c.total_attestations(), 1);

        // second attestation for the same asset — history + incremental aggregates
        c.attest(String::from("zone-1"), 20260627, U512::from(750u64), String::from("hash-def"));
        assert_eq!(c.get_count(String::from("zone-1")), 2);
        assert_eq!(c.total_attestations(), 2);
        assert_eq!(c.get_at(String::from("zone-1"), 0).unwrap().amount, U512::from(500u64));
        assert_eq!(c.get_latest(String::from("zone-1")).unwrap().amount, U512::from(750u64));

        // a different asset has its own independent count
        c.attest(String::from("zone-2"), 20260627, U512::from(100u64), String::from("hash-ghi"));
        assert_eq!(c.get_count(String::from("zone-2")), 1);
        assert_eq!(c.total_attestations(), 3);
    }

    #[test]
    fn only_attester_can_attest() {
        let env = odra_test::env();
        let attester = env.get_account(0);
        let stranger = env.get_account(1);
        let mut c = AttestationRegistry::deploy(&env, AttestationRegistryInitArgs { attester });

        env.set_caller(stranger);
        let res = c.try_attest(String::from("zone-1"), 1, U512::from(1u64), String::from("h"));
        assert!(res.is_err());
        assert_eq!(c.total_attestations(), 0);
    }
}
