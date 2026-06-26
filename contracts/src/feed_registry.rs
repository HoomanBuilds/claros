use odra::prelude::*;

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
}

#[odra::module]
impl FeedRegistry {
    pub fn init(&mut self, owner: Address) {
        self.owner.set(owner);
        self.count.set(0);
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
        if self.env().caller() != self.owner.get().unwrap_or_revert(&self.env()) {
            self.env().revert(Error::Unauthorized);
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
    use odra::host::Deployer;

    #[test]
    fn register_and_read() {
        let env = odra_test::env();
        let owner = env.get_account(0);
        let mut c = FeedRegistry::deploy(&env, FeedRegistryInitArgs { owner });
        env.set_caller(owner);
        c.register_feed(
            "EIA.PET.PRICE.WTI.DAILY".into(),
            6,
            "$/bbl".into(),
            "WTI crude spot".into(),
            "EIA".into(),
            "petroleum/pri/spt".into(),
            "daily".into(),
            "Cushing WTI spot price".into(),
        );
        let f = c.get_feed("EIA.PET.PRICE.WTI.DAILY".into()).unwrap();
        assert_eq!(f.decimals, 6);
        assert_eq!(f.unit, "$/bbl");
        assert_eq!(c.feed_count(), 1);
        // re-register same id updates, does not double-count
        c.register_feed(
            "EIA.PET.PRICE.WTI.DAILY".into(), 6, "$/bbl".into(), "WTI".into(),
            "EIA".into(), "petroleum/pri/spt".into(), "daily".into(), "x".into(),
        );
        assert_eq!(c.feed_count(), 1);
    }

    #[test]
    fn only_owner_registers() {
        let env = odra_test::env();
        let owner = env.get_account(0);
        let stranger = env.get_account(1);
        let mut c = FeedRegistry::deploy(&env, FeedRegistryInitArgs { owner });
        env.set_caller(stranger);
        let res = c.try_register_feed(
            "x".into(), 0, "u".into(), "t".into(), "s".into(), "r".into(), "f".into(), "d".into(),
        );
        assert!(res.is_err());
    }
}
