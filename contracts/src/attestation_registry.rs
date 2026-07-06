use odra::casper_types::U512;
use odra::prelude::*;
use odra::ContractRef;

// Cross-contract view of the FeedRegistry claim table.
#[odra::external_contract]
pub trait FeedAttesters {
    fn get_attester(&self, feed_id: String) -> Option<Address>;
}

#[odra::odra_type]
pub struct Attestation {
    pub period: u64,
    pub amount: U512,
    pub source_hash: String,
    pub attester: Address,
    pub timestamp: u64,
}

#[odra::odra_error]
pub enum Error {
    Unauthorized = 1,
}

#[odra::event]
pub struct RevenueAttested {
    pub asset_id: String,
    pub period: u64,
    pub amount: U512,
    pub source_hash: String,
    pub index: u64,
    pub timestamp: u64,
}

#[odra::module(events = [RevenueAttested])]
pub struct AttestationRegistry {
    attester: Var<Address>,
    latest: Mapping<String, Attestation>,
    history: Mapping<String, Attestation>,
    count: Mapping<String, u64>,
    total: Var<u64>,
    // multi-agent upgrade: FeedRegistry holding per-feed attester claims
    feed_registry: Var<Address>,
}

#[odra::module]
impl AttestationRegistry {
    pub fn init(&mut self, attester: Address) {
        self.attester.set(attester);
        self.total.set(0);
    }

    /// Upgrade constructor: wires the FeedRegistry claim table.
    pub fn upgrade(&mut self, feed_registry: Address) {
        self.feed_registry.set(feed_registry);
    }

    pub fn set_feed_registry(&mut self, feed_registry: Address) {
        if self.env().caller() != self.attester.get().unwrap_or_revert(&self.env()) {
            self.env().revert(Error::Unauthorized);
        }
        self.feed_registry.set(feed_registry);
    }

    pub fn attest(&mut self, asset_id: String, period: u64, amount: U512, source_hash: String) {
        let caller = self.env().caller();
        let claimant = self
            .feed_registry
            .get()
            .and_then(|fr| FeedAttestersContractRef::new(self.env(), fr).get_attester(asset_id.clone()));
        match claimant {
            // claimed feed: only its claimant may attest
            Some(a) => {
                if caller != a {
                    self.env().revert(Error::Unauthorized);
                }
            }
            // unclaimed/unknown: the legacy first-party attester (pre-upgrade behavior)
            None => {
                if caller != self.attester.get().unwrap_or_revert(&self.env()) {
                    self.env().revert(Error::Unauthorized);
                }
            }
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

    pub fn get_latest(&self, asset_id: String) -> Option<Attestation> {
        self.latest.get(&asset_id)
    }

    pub fn get_at(&self, asset_id: String, index: u64) -> Option<Attestation> {
        self.history.get(&format!("{}#{}", asset_id, index))
    }

    pub fn get_count(&self, asset_id: String) -> u64 {
        self.count.get_or_default(&asset_id)
    }

    pub fn total_attestations(&self) -> u64 {
        self.total.get_or_default()
    }

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

        c.attest(String::from("zone-1"), 20260627, U512::from(750u64), String::from("hash-def"));
        assert_eq!(c.get_count(String::from("zone-1")), 2);
        assert_eq!(c.total_attestations(), 2);
        assert_eq!(c.get_at(String::from("zone-1"), 0).unwrap().amount, U512::from(500u64));
        assert_eq!(c.get_latest(String::from("zone-1")).unwrap().amount, U512::from(750u64));

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

    #[test]
    fn claimed_feed_attested_only_by_claimant() {
        use crate::feed_registry::{FeedRegistry, FeedRegistryInitArgs};
        use crate::gate_stub::GateStub;
        use odra::host::NoArgs;

        let env = odra_test::env();
        let legacy = env.get_account(0);
        let operator = env.get_account(1);

        let mut reg = AttestationRegistry::deploy(&env, AttestationRegistryInitArgs { attester: legacy });
        let mut feeds = FeedRegistry::deploy(&env, FeedRegistryInitArgs { owner: legacy });
        let mut gate = GateStub::deploy(&env, NoArgs);
        gate.allow(operator);
        env.set_caller(legacy);
        feeds.set_eligibility_gate(gate.address());
        reg.set_feed_registry(feeds.address());

        // operator claims a new feed
        env.set_caller(operator);
        feeds.register_feed(
            "OP2.SOLAR".into(), 3, "MWh".into(), "t".into(), "EIA".into(),
            "electricity/rto/fuel-type-data".into(), "hourly".into(), "d".into(),
        );

        // claimant attests: OK
        reg.attest("OP2.SOLAR".into(), 20260706, U512::from(1000u64), "h1".into());
        assert_eq!(reg.get_latest("OP2.SOLAR".into()).unwrap().attester, operator);

        // the legacy attester may NOT attest someone else's claimed feed
        env.set_caller(legacy);
        assert!(reg.try_attest("OP2.SOLAR".into(), 20260707, U512::from(1u64), "h2".into()).is_err());

        // unclaimed/unknown feeds still fall back to the legacy attester
        reg.attest("zone-legacy".into(), 20260707, U512::from(5u64), "h3".into());
        // and a non-legacy caller still cannot touch them
        env.set_caller(operator);
        assert!(reg.try_attest("zone-legacy".into(), 20260708, U512::from(5u64), "h4".into()).is_err());
    }

    #[test]
    fn set_feed_registry_gated_to_legacy_attester() {
        use crate::feed_registry::{FeedRegistry, FeedRegistryInitArgs};
        let env = odra_test::env();
        let legacy = env.get_account(0);
        let stranger = env.get_account(1);
        let mut reg = AttestationRegistry::deploy(&env, AttestationRegistryInitArgs { attester: legacy });
        let feeds = FeedRegistry::deploy(&env, FeedRegistryInitArgs { owner: legacy });
        env.set_caller(stranger);
        assert!(reg.try_set_feed_registry(feeds.address()).is_err());
    }
}
