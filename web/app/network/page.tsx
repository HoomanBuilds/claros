import type { Metadata, Viewport } from "next"
import { ExternalLink } from "lucide-react"
import { PageShell } from "@/components/product/page-shell"
import { SectionHeading } from "@/components/product/ui"
import { TopologyGraph } from "@/components/topology-graph"
import { LiveTreasury } from "@/components/live-treasury"
import styles from "@/components/product/product.module.css"

export const metadata: Metadata = {
  title: "Network: Claros On-Chain & Autonomous Agent",
  description: "Explore Claros's attestation pipeline, deployed Casper contracts, eligibility gate, and on-chain treasury decision ledger.",
}
export const viewport: Viewport = { themeColor: "#070b14" }

const CONTRACTS = [
  { name: "AttestationRegistry", role: "Feed values and provenance, keyed by feed_id", pkg: "236b510436c60b6a797d175c72c6014de367d43f1de1ca45f580d112f98116cc" },
  { name: "FeedRegistry", role: "Self-describing decimals, units, and source metadata", pkg: "741cc223c14c2c00c9f06d7bb5c4be2f824fbf0c8b09a147bf1835570bddf5b6" },
  { name: "TreasuryVault", role: "The agent's on-chain reinvestment decision ledger", pkg: "a90b082d863c5977c6e54654fec10e523a38760529e664a87e9e8a8e887ffd7b" },
  { name: "EligibilityGate", role: "Groth16 eligibility verification for operators", pkg: "7be33b056c8804e0886cd6f20a75109a0fe92deab505754b97a49fde15aa5227" },
]
const ROLES = [
  { title: "Autonomous agents", text: "Fetch source data, normalize its value, hash its provenance, and sign attestations onto Casper.", art: "orb" },
  { title: "An earn rail", text: "Paid x402 reads settle WCSPR to the attester. That income can help cover the next attestation's gas.", art: "chevron" },
  { title: "Private eligibility", text: "Operators prove allowlist membership through the ZK gate, without publishing their membership secret.", art: "arc" },
  { title: "On-chain decisions", text: "Treasury decisions and their reasoning are recorded in the vault, with the results available for inspection.", art: "cone" },
]

export default function NetworkPage() {
  return (
    <PageShell active="Network" number="03" title="Trust has a structure." description="Agents carry the data. Contracts define who can attest it and keep the record. Follow the pipeline, inspect the contracts, and read the treasury's decisions." image="/landing/aztec/city.webp">
      <SectionHeading label="03 / Attestation pipeline" title="From source to shared state."><span className={styles.networkBadge}>Deployed on Casper testnet</span></SectionHeading>
      <TopologyGraph />
      <p className={styles.footnote}>A source reading and its provenance meet in the attestation registry. Any contract, app, or agent can read the result.</p>
      <section className={styles.section} aria-label="Network roles">
        <SectionHeading label="The moving parts" title="A system with clear boundaries." />
        <div className={styles.roleGrid}>{ROLES.map(role => <article className={styles.roleCard} key={role.title}><img loading="lazy" src={"/landing/penumbra/" + role.art + ".webp"} width={84} height={84} alt="" /><h3>{role.title}</h3><p>{role.text}</p></article>)}</div>
      </section>
      <LiveTreasury />
      <section className={styles.section} aria-label="Deployed contracts">
        <SectionHeading label="On-chain footprint" title="Nothing hidden behind the interface."><a href="/docs/network/contracts/" className={styles.inlineLink}>Contract reference <ExternalLink size={13} /></a></SectionHeading>
        <div className={styles.contractList}>{CONTRACTS.map((contract, index) => <a key={contract.name} className={styles.contract} href={"https://testnet.cspr.live/contract-package/" + contract.pkg} target="_blank" rel="noreferrer"><span>0{index + 1}</span><div><strong>{contract.name}</strong><span className={styles.meta}>{contract.role}</span></div><code>{contract.pkg}</code><ExternalLink size={15} aria-label="Open on Casper explorer" /></a>)}</div>
        <p className={styles.footnote}>These are Casper testnet contract package hashes. Explorer links open the deployed packages, not a simulated deployment.</p>
      </section>
    </PageShell>
  )
}
