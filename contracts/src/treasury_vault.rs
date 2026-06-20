use odra::casper_types::U512;
use odra::prelude::*;

#[odra::odra_type]
pub struct Reinvestment {
    pub venue: String,
    pub amount_in: U512,
    pub amount_out: U512,
    pub reasoning: String,
    pub timestamp: u64,
}

#[odra::odra_error]
pub enum Error {
    Unauthorized = 1,
}

#[odra::event]
pub struct Reinvested {
    pub index: u64,
    pub venue: String,
    pub amount_in: U512,
    pub amount_out: U512,
    pub reasoning: String,
    pub timestamp: u64,
}

#[odra::event]
pub struct TreasuryUpdated {
    pub wcspr_liquid: U512,
    pub scspr_held: U512,
    pub timestamp: u64,
}

#[odra::module(events = [Reinvested, TreasuryUpdated])]
pub struct TreasuryVault {
    agent: Var<Address>,
    reinvestments: Mapping<u64, Reinvestment>,
    count: Var<u64>,
    total_reinvested: Var<U512>,
    venue_total: Mapping<String, U512>,
    wcspr_liquid: Var<U512>,
    scspr_held: Var<U512>,
}

#[odra::module]
impl TreasuryVault {
    pub fn init(&mut self, agent: Address) {
        self.agent.set(agent);
        self.count.set(0);
    }

    pub fn record_reinvest(
        &mut self,
        venue: String,
        amount_in: U512,
        amount_out: U512,
        reasoning: String,
    ) {
        let caller = self.env().caller();
        if caller != self.agent.get().unwrap_or_revert(&self.env()) {
            self.env().revert(Error::Unauthorized);
        }

        let timestamp = self.env().get_block_time();
        let index = self.count.get_or_default();

        let reinvestment = Reinvestment {
            venue: venue.clone(),
            amount_in,
            amount_out,
            reasoning: reasoning.clone(),
            timestamp,
        };

        self.reinvestments.set(&index, reinvestment);
        self.count.set(index + 1);
        self.total_reinvested
            .set(self.total_reinvested.get_or_default() + amount_in);
        let vt = self.venue_total.get_or_default(&venue);
        self.venue_total.set(&venue, vt + amount_in);

        self.env().emit_event(Reinvested {
            index,
            venue,
            amount_in,
            amount_out,
            reasoning,
            timestamp,
        });
    }

    pub fn update_holdings(&mut self, wcspr_liquid: U512, scspr_held: U512) {
        let caller = self.env().caller();
        if caller != self.agent.get().unwrap_or_revert(&self.env()) {
            self.env().revert(Error::Unauthorized);
        }
        self.wcspr_liquid.set(wcspr_liquid);
        self.scspr_held.set(scspr_held);
        self.env().emit_event(TreasuryUpdated {
            wcspr_liquid,
            scspr_held,
            timestamp: self.env().get_block_time(),
        });
    }

    pub fn get_reinvestment(&self, index: u64) -> Option<Reinvestment> {
        self.reinvestments.get(&index)
    }

    pub fn reinvestment_count(&self) -> u64 {
        self.count.get_or_default()
    }

    pub fn total_reinvested(&self) -> U512 {
        self.total_reinvested.get_or_default()
    }

    pub fn venue_total(&self, venue: String) -> U512 {
        self.venue_total.get_or_default(&venue)
    }

    pub fn wcspr_liquid(&self) -> U512 {
        self.wcspr_liquid.get_or_default()
    }

    pub fn scspr_held(&self) -> U512 {
        self.scspr_held.get_or_default()
    }

    pub fn get_agent(&self) -> Address {
        self.agent.get().unwrap_or_revert(&self.env())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use odra::host::Deployer;

    #[test]
    fn record_and_aggregate() {
        let env = odra_test::env();
        let agent = env.get_account(0);
        let mut v = TreasuryVault::deploy(&env, TreasuryVaultInitArgs { agent });

        env.set_caller(agent);
        v.record_reinvest(
            String::from("wiselending"),
            U512::from(500u64),
            U512::from(497u64),
            String::from("rate best; treasury over min"),
        );
        assert_eq!(v.reinvestment_count(), 1);
        assert_eq!(v.total_reinvested(), U512::from(500u64));
        assert_eq!(v.venue_total(String::from("wiselending")), U512::from(500u64));
        assert_eq!(v.get_reinvestment(0).unwrap().amount_out, U512::from(497u64));

        v.record_reinvest(
            String::from("cspr_trade"),
            U512::from(100u64),
            U512::from(99u64),
            String::from("small swap"),
        );
        assert_eq!(v.reinvestment_count(), 2);
        assert_eq!(v.total_reinvested(), U512::from(600u64));
        assert_eq!(v.venue_total(String::from("wiselending")), U512::from(500u64));
        assert_eq!(v.venue_total(String::from("cspr_trade")), U512::from(100u64));

        v.update_holdings(U512::from(50u64), U512::from(497u64));
        assert_eq!(v.wcspr_liquid(), U512::from(50u64));
        assert_eq!(v.scspr_held(), U512::from(497u64));
    }

    #[test]
    fn only_agent_can_record() {
        let env = odra_test::env();
        let agent = env.get_account(0);
        let stranger = env.get_account(1);
        let mut v = TreasuryVault::deploy(&env, TreasuryVaultInitArgs { agent });

        env.set_caller(stranger);
        let res = v.try_record_reinvest(
            String::from("wiselending"),
            U512::from(1u64),
            U512::from(1u64),
            String::from("x"),
        );
        assert!(res.is_err());
        assert_eq!(v.reinvestment_count(), 0);
    }
}
