use std::str::FromStr;

use contracts::attestation_registry::{AttestationRegistry, AttestationRegistryUpgradeArgs};
use contracts::feed_registry::{FeedRegistry, FeedRegistryInitArgs, FeedRegistryUpgradeArgs};
use odra::host::{Deployer, InstallConfig};
use odra::prelude::{Address, Addressable};

// Usage (env vars; reads ODRA_CASPER_LIVENET_* from contracts/.env like deploys):
//   UPGRADE=dry                  deploy + upgrade a throwaway package, touches nothing live
//   UPGRADE=feed_registry        FEED_REGISTRY_PACKAGE=hash-.. GATE_PACKAGE=hash-..
//   UPGRADE=attestation_registry ATT_REGISTRY_PACKAGE=hash-..  FEED_REGISTRY_PACKAGE=hash-..
fn main() {
    env_logger::init();
    let env = odra_casper_livenet_env::env();
    env.set_gas(800_000_000_000);
    let mode = std::env::var("UPGRADE").expect("set UPGRADE=dry|feed_registry|attestation_registry");
    let addr = |var: &str| {
        Address::from_str(&std::env::var(var).unwrap_or_else(|_| panic!("missing env {var}")))
            .unwrap_or_else(|_| panic!("bad address in {var} (expected hash-<64 hex>)"))
    };
    match mode.as_str() {
        "dry" => {
            let owner = env.get_account(0);
            let c = FeedRegistry::deploy_with_cfg(
                &env,
                FeedRegistryInitArgs { owner },
                InstallConfig::upgradable::<FeedRegistry>(),
            );
            println!("throwaway deployed at {:?}", c.address());
            env.set_gas(800_000_000_000);
            let up = FeedRegistry::try_upgrade(
                &env,
                c.address(),
                FeedRegistryUpgradeArgs { eligibility_gate: c.address() },
            )
            .expect("dry-run upgrade failed");
            println!("dry-run upgrade OK at {:?}", up.address());
        }
        "feed_registry" => {
            let up = FeedRegistry::try_upgrade(
                &env,
                addr("FEED_REGISTRY_PACKAGE"),
                FeedRegistryUpgradeArgs { eligibility_gate: addr("GATE_PACKAGE") },
            )
            .expect("feed_registry upgrade failed");
            println!("feed_registry upgraded at {:?}", up.address());
        }
        "attestation_registry" => {
            let up = AttestationRegistry::try_upgrade(
                &env,
                addr("ATT_REGISTRY_PACKAGE"),
                AttestationRegistryUpgradeArgs { feed_registry: addr("FEED_REGISTRY_PACKAGE") },
            )
            .expect("attestation_registry upgrade failed");
            println!("attestation_registry upgraded at {:?}", up.address());
        }
        other => panic!("unknown UPGRADE mode: {other}"),
    }
}
