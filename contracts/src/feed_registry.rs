use odra::prelude::*;
use odra::ContractRef;

#[odra::external_contract]
pub trait Eligibility {
    fn is_eligible(&self, who: Address) -> bool;
}

// Self-describing on-chain metadata for every Claros oracle feed, so a consumer
// reading a value from the AttestationRegistry can interpret it (decimals/unit)
// entirely on-chain — the Pyth model (price ships with its exponent). Values live
// in the AttestationRegistry keyed by the same feed_id; metadata lives here.
#[odra::odra_type]
pub struct Feed {
    pub decimals: u8,        // real value = amount / 10^decimals
    pub unit: String,        // e.g. "$/bbl", "MWh", "percent"
    pub title: String,       // human title
    pub source: String,      // e.g. "EIA" | "City of San Diego"
    pub route: String,       // provider route, e.g. "petroleum/pri/spt"
    pub frequency: String,   // "daily" | "weekly" | "monthly" | "annual" | "hourly" | "quarterly"
    pub description: String,
}

#[odra::odra_error]
pub enum Error {
    Unauthorized = 1,
    NotEligible = 2,
    GateNotSet = 3,
}

#[odra::event]
pub struct FeedRegistered {
    pub feed_id: String,
    pub decimals: u8,
    pub unit: String,
    pub source: String,
}

#[odra::module(events = [FeedRegistered])]
pub struct FeedRegistry {
    owner: Var<Address>,
    feeds: Mapping<String, Feed>,
    ids: Mapping<u64, String>, // index -> feed_id, for enumeration
    count: Var<u64>,
    feed_attester: Mapping<String, Address>, // feed_id -> address allowed to attest it
    eligibility_gate: Var<Address>,
}

#[odra::module]
impl FeedRegistry {
    pub fn init(&mut self, owner: Address) {
        self.owner.set(owner);
        self.count.set(0);
    }

    /// Runs during the package upgrade tx; Casper restricts it to the installer group.
    pub fn upgrade(&mut self, eligibility_gate: Address) {
        if self.env().caller() != self.owner.get().unwrap_or_revert(&self.env()) {
            self.env().revert(Error::Unauthorized);
        }
        self.eligibility_gate.set(eligibility_gate);
    }

    pub fn set_eligibility_gate(&mut self, gate: Address) {
        if self.env().caller() != self.owner.get().unwrap_or_revert(&self.env()) {
            self.env().revert(Error::Unauthorized);
        }
        self.eligibility_gate.set(gate);
    }

    pub fn get_attester(&self, feed_id: String) -> Option<Address> {
        self.feed_attester.get(&feed_id)
    }

    pub fn register_feed(
        &mut self,
        feed_id: String,
        decimals: u8,
        unit: String,
        title: String,
        source: String,
        route: String,
        frequency: String,
        description: String,
    ) {
        let caller = self.env().caller();
        match self.feed_attester.get(&feed_id) {
            Some(claimant) => {
                if caller != claimant {
                    self.env().revert(Error::Unauthorized);
                }
            }
            None => {
                if self.feeds.get(&feed_id).is_some() {
                    // pre-upgrade feeds have no claim entry; they stay with the owner
                    if caller != self.owner.get().unwrap_or_revert(&self.env()) {
                        self.env().revert(Error::Unauthorized);
                    }
                } else {
                    let gate = match self.eligibility_gate.get() {
                        Some(g) => g,
                        None => self.env().revert(Error::GateNotSet),
                    };
                    if !EligibilityContractRef::new(self.env(), gate).is_eligible(caller) {
                        self.env().revert(Error::NotEligible);
                    }
                }
                self.feed_attester.set(&feed_id, caller);
            }
        }
        let is_new = self.feeds.get(&feed_id).is_none();
        let feed = Feed {
            decimals,
            unit: unit.clone(),
            title,
            source: source.clone(),
            route,
            frequency,
            description,
        };
        self.feeds.set(&feed_id, feed);
        if is_new {
            let idx = self.count.get_or_default();
            self.ids.set(&idx, feed_id.clone());
            self.count.set(idx + 1);
        }
        self.env().emit_event(FeedRegistered { feed_id, decimals, unit, source });
    }

    pub fn get_feed(&self, feed_id: String) -> Option<Feed> {
        self.feeds.get(&feed_id)
    }

    pub fn get_feed_at(&self, index: u64) -> Option<String> {
        self.ids.get(&index)
    }

    pub fn feed_count(&self) -> u64 {
        self.count.get_or_default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::gate_stub::{GateStub, GateStubHostRef};
    use odra::host::{Deployer, HostEnv, NoArgs};

    fn setup() -> (HostEnv, FeedRegistryHostRef, GateStubHostRef) {
        let env = odra_test::env();
        let owner = env.get_account(0);
        let mut c = FeedRegistry::deploy(&env, FeedRegistryInitArgs { owner });
        let gate = GateStub::deploy(&env, NoArgs);
        env.set_caller(owner);
        c.set_eligibility_gate(gate.address());
        (env, c, gate)
    }

    fn reg(c: &mut FeedRegistryHostRef, id: &str) {
        c.register_feed(
            id.into(), 6, "$/bbl".into(), "t".into(), "EIA".into(),
            "petroleum/pri/spt".into(), "daily".into(), "d".into(),
        );
    }

    #[test]
    fn register_and_read() {
        let (env, mut c, mut gate) = setup();
        let owner = env.get_account(0);
        gate.allow(owner);
        env.set_caller(owner);
        reg(&mut c, "EIA.PET.PRICE.WTI.DAILY");
        let f = c.get_feed("EIA.PET.PRICE.WTI.DAILY".into()).unwrap();
        assert_eq!(f.decimals, 6);
        assert_eq!(c.feed_count(), 1);
        // update by claimant, no double count
        reg(&mut c, "EIA.PET.PRICE.WTI.DAILY");
        assert_eq!(c.feed_count(), 1);
        assert_eq!(c.get_attester("EIA.PET.PRICE.WTI.DAILY".into()), Some(owner));
    }

    #[test]
    fn eligible_stranger_registers_new_feed_and_claims_it() {
        let (env, mut c, mut gate) = setup();
        let operator = env.get_account(1);
        gate.allow(operator);
        env.set_caller(operator);
        reg(&mut c, "EIA.ELEC.GEN_SUN.US48.HOURLY");
        assert_eq!(c.get_attester("EIA.ELEC.GEN_SUN.US48.HOURLY".into()), Some(operator));
    }

    #[test]
    fn ineligible_caller_cannot_register_new_feed() {
        let (env, mut c, _gate) = setup();
        env.set_caller(env.get_account(1));
        let res = c.try_register_feed(
            "x".into(), 0, "u".into(), "t".into(), "s".into(), "r".into(), "f".into(), "d".into(),
        );
        assert!(res.is_err());
    }

    #[test]
    fn claimed_feed_rejects_other_callers_even_owner() {
        let (env, mut c, mut gate) = setup();
        let owner = env.get_account(0);
        let operator = env.get_account(1);
        gate.allow(operator);
        env.set_caller(operator);
        reg(&mut c, "OP.X");
        env.set_caller(owner);
        let res = c.try_register_feed(
            "OP.X".into(), 6, "u".into(), "t".into(), "s".into(), "r".into(), "f".into(), "d".into(),
        );
        assert!(res.is_err());
    }

    #[test]
    fn owner_needs_eligibility_for_new_feeds_too() {
        // exists-but-unclaimed only arises from pre-upgrade storage; covered by testnet smoke
        let (env, mut c, _gate) = setup();
        env.set_caller(env.get_account(0));
        let res = c.try_register_feed(
            "NEW.Y".into(), 0, "u".into(), "t".into(), "s".into(), "r".into(), "f".into(), "d".into(),
        );
        assert!(res.is_err()); // owner not allowed on stub -> NotEligible
    }

    #[test]
    fn gate_unset_rejects_new_feeds() {
        let env = odra_test::env();
        let owner = env.get_account(0);
        let mut c = FeedRegistry::deploy(&env, FeedRegistryInitArgs { owner });
        env.set_caller(owner);
        let res = c.try_register_feed(
            "x".into(), 0, "u".into(), "t".into(), "s".into(), "r".into(), "f".into(), "d".into(),
        );
        assert!(res.is_err()); // GateNotSet
    }

    #[test]
    fn set_gate_is_owner_only() {
        let env = odra_test::env();
        let owner = env.get_account(0);
        let stranger = env.get_account(1);
        let mut c = FeedRegistry::deploy(&env, FeedRegistryInitArgs { owner });
        let gate = GateStub::deploy(&env, NoArgs);
        env.set_caller(stranger);
        assert!(c.try_set_eligibility_gate(gate.address()).is_err());
    }
}
