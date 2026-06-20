use contracts::attestation_registry::{AttestationRegistry, AttestationRegistryInitArgs};
use contracts::treasury_vault::{TreasuryVault, TreasuryVaultInitArgs};
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
        .build()
        .run();
}
