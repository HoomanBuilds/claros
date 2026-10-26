import type { Metadata, Viewport } from "next";
import {
  ExternalLink,
  FileCheck2,
  Tags,
  Landmark,
  ShieldCheck,
} from "lucide-react";
import { PageShell } from "@/components/product/page-shell";
import { SectionHeading } from "@/components/product/ui";
import { TopologyGraph } from "@/components/topology-graph";
import { LiveTreasury } from "@/components/live-treasury";
import styles from "@/components/product/product.module.css";
import network from "@/components/product/network.module.css";

export const metadata: Metadata = {
  title: "Network: Claros On-Chain & Autonomous Agent",
  description:
    "Explore Claros's attestation pipeline, deployed Casper contracts, eligibility gate, and on-chain treasury decision ledger.",
};
export const viewport: Viewport = { themeColor: "#070b14" };

const CONTRACTS = [
  {
    title: "The readings",
    name: "AttestationRegistry",
    role: "Feed values and their source hashes.",
    icon: FileCheck2,
    pkg: "236b510436c60b6a797d175c72c6014de367d43f1de1ca45f580d112f98116cc",
  },
  {
    title: "The context",
    name: "FeedRegistry",
    role: "Units, decimals, and source metadata.",
    icon: Tags,
    pkg: "741cc223c14c2c00c9f06d7bb5c4be2f824fbf0c8b09a147bf1835570bddf5b6",
  },
  {
    title: "The decisions",
    name: "TreasuryVault",
    role: "Recorded treasury actions and reasoning.",
    icon: Landmark,
    pkg: "a90b082d863c5977c6e54654fec10e523a38760529e664a87e9e8a8e887ffd7b",
  },
  {
    title: "The access",
    name: "EligibilityGate",
    role: "Private eligibility proofs for operators.",
    icon: ShieldCheck,
    pkg: "7be33b056c8804e0886cd6f20a75109a0fe92deab505754b97a49fde15aa5227",
  },
];

export default function NetworkPage() {
  return (
    <PageShell
      active="Network"
      number="03"
      compact
      title="The network, connected."
      description="See how a reading reaches Casper, and how paid reads can help fund the next one."
      image="/landing/aztec/city.webp"
    >
      <nav className={network.sectionNav} aria-label="On this page">
        <a href="#architecture">
          <span>01</span> Architecture
        </a>
        <a href="#treasury">
          <span>02</span> Treasury
        </a>
        <a href="#contracts">
          <span>03</span> Contracts
        </a>
      </nav>
      <section
        id="architecture"
        className={network.mapSection}
        aria-label="Network architecture"
      >
        <TopologyGraph />
      </section>
      <LiveTreasury />
      <section
        id="contracts"
        className={styles.section}
        aria-label="Deployed contracts"
      >
        <SectionHeading
          label="The on-chain footprint"
          title="Four contracts. Clear boundaries."
        >
          <a href="/docs/network/contracts/" className={styles.inlineLink}>
            Contract reference <ExternalLink size={13} />
          </a>
        </SectionHeading>
        <div className={network.contracts}>
          {CONTRACTS.map((contract, index) => {
            const Icon = contract.icon;
            return (
              <article className={network.contractCard} key={contract.name}>
                <div className={network.contractTop}>
                  <span>0{index + 1}</span>
                  <Icon size={24} strokeWidth={1.4} aria-hidden="true" />
                </div>
                <h3>{contract.title}</h3>
                <span className={network.contractName}>{contract.name}</span>
                <p>{contract.role}</p>
                <a
                  href={
                    "https://testnet.cspr.live/contract-package/" + contract.pkg
                  }
                  target="_blank"
                  rel="noreferrer"
                  aria-label={"Open " + contract.name + " on Casper explorer"}
                >
                  Open on Casper <ExternalLink size={14} aria-hidden="true" />
                </a>
                <details className={network.packageHash}>
                  <summary>Package hash</summary>
                  <code>{contract.pkg}</code>
                </details>
              </article>
            );
          })}
        </div>
        <p className={styles.footnote}>
          Casper testnet deployments. Open a package to inspect its on-chain
          record.
        </p>
      </section>
    </PageShell>
  );
}
