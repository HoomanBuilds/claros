use contracts::attestation_registry::{AttestationRegistry, AttestationRegistryInitArgs};
use contracts::eligibility_gate::{EligibilityGate, EligibilityGateInitArgs};
use contracts::treasury_vault::{TreasuryVault, TreasuryVaultInitArgs};
use odra::casper_types::U256;
use odra::host::{HostEnv, InstallConfig};
use odra_cli::{
    deploy::DeployScript, DeployedContractsContainer, DeployerExt, OdraCli,
};

pub struct ProofYieldDeployScript;

impl DeployScript for ProofYieldDeployScript {
    fn deploy(
        &self,
        env: &HostEnv,
        container: &mut DeployedContractsContainer,
    ) -> Result<(), odra_cli::deploy::Error> {
        let account = env.get_account(0);
        // upgradable from day 1 — cannot be retrofitted
        AttestationRegistry::load_or_deploy_with_cfg(
            env,
            None,
            AttestationRegistryInitArgs { attester: account },
            InstallConfig::upgradable::<AttestationRegistry>(),
            container,
            800_000_000_000,
        )?;
        TreasuryVault::load_or_deploy_with_cfg(
            env,
            None,
            TreasuryVaultInitArgs { agent: account },
            InstallConfig::upgradable::<TreasuryVault>(),
            container,
            800_000_000_000,
        )?;
        // Allowlist root is computed off-chain (zk-gate/circuits/proof.json) and
        // passed in so the deployed root matches the proof we submit.
        let allowlist_root = std::env::var("ELIGIBILITY_ALLOWLIST_ROOT")
            .ok()
            .and_then(|s| U256::from_dec_str(&s).ok())
            .unwrap_or_default();
        EligibilityGate::load_or_deploy_with_cfg(
            env,
            None,
            EligibilityGateInitArgs { allowlist_root },
            InstallConfig::upgradable::<EligibilityGate>(),
            container,
            800_000_000_000,
        )?;
        Ok(())
    }
}

pub fn main() {
    env_logger::init();
    OdraCli::new()
        .about("ProofYield contracts CLI")
        .deploy(ProofYieldDeployScript)
        .contract::<AttestationRegistry>()
        .contract::<TreasuryVault>()
        .contract::<EligibilityGate>()
        .build()
        .run();
}
