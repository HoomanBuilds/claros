import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { TopologyGraph } from "@/components/topology-graph"
import { TreasuryPanel } from "@/components/treasury-panel"
import { getStats } from "@/lib/claros"
import { getTreasury } from "@/lib/treasury"

export const revalidate = 300

export const metadata: Metadata = {
  title: "Network — Claros On-Chain & Autonomous Agent",
  description: "The Claros on-chain footprint: deployed Casper contracts, an autonomous attestation agent, an x402 earn rail, on-chain yield, and a ZK eligibility gate.",
}

const cspr = (pkg: string) => `https://testnet.cspr.live/contract-package/${pkg}`

const CONTRACTS = [
  { name: "AttestationRegistry", role: "feed values, keyed by feed_id", pkg: "236b510436c60b6a797d175c72c6014de367d43f1de1ca45f580d112f98116cc" },
  { name: "FeedRegistry", role: "self-describing metadata (decimals, unit, source)", pkg: "dac573fc3a4c9df921013300612cd289d193814e52a72f76abb0f18f04366f46" },
  { name: "TreasuryVault", role: "agent treasury + on-chain yield", pkg: "a90b082d863c5977c6e54654fec10e523a38760529e664a87e9e8a8e887ffd7b" },
  { name: "EligibilityGate", role: "ZK Groth16 access gate", pkg: "7be33b056c8804e0886cd6f20a75109a0fe92deab505754b97a49fde15aa5227" },
]

const PILLARS = [
  {
    tag: "AUTONOMOUS_AGENT",
    title: "Runs itself",
    body: "A DeepSeek-driven agent loops on a heartbeat: fetch EIA data, scale to integers, hash provenance, sign a Casper TransactionV1, and attest on-chain — no human in the loop.",
  },
  {
    tag: "X402_EARN_RAIL",
    title: "Pays its own way",
    body: "Consumers settle per-read over an x402 / WCSPR rail using transfer_with_authorization. The agent earns to fund the gas of its next attestation.",
  },
  {
    tag: "ZK_ELIGIBILITY",
    title: "Private access",
    body: "A Groth16 / BN254 verifier in Odra (Circom 2.2 circuit, MiMC7 Merkle allowlist) gates premium access while proving eligibility without revealing identity.",
  },
  {
    tag: "ON_CHAIN_YIELD",
    title: "Self-sustaining",
    body: "Idle treasury is staked into WiseLending sCSPR; compounding yield subsidizes attestation gas so the oracle keeps running on its own.",
  },
]

export default async function NetworkPage() {
  const [stats, treasury] = await Promise.all([getStats(), getTreasury()])

  return (
    <div className="min-h-screen dot-grid-bg">
      <Navbar />
      <main>
        {/* Header */}
        <section className="w-full px-6 pt-12 pb-8 lg:px-12">
          <div className="flex items-center gap-4 mb-8">
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
              {"// ON_CHAIN_FOOTPRINT"}
            </span>
            <div className="flex-1 border-t border-border" />
            <span className="inline-block h-2 w-2 bg-[#ea580c] animate-blink" />
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">001</span>
          </div>
          <h1 className="font-pixel text-4xl sm:text-5xl lg:text-6xl tracking-tight text-foreground mb-4 select-none">
            THE NETWORK
          </h1>
          <p className="text-xs lg:text-sm font-mono text-muted-foreground leading-relaxed max-w-2xl">
            Claros is an autonomous oracle on Casper {stats.network}. Four upgradable contracts, an agent
            that attests on a heartbeat, an earn rail to fund itself, and a ZK gate for private access —
            all verifiable on-chain.
          </p>
        </section>

        {/* Pipeline graphic */}
        <section className="w-full px-6 py-8 lg:px-12">
          <div className="flex items-center gap-4 mb-6">
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
              {"// ATTESTATION_PIPELINE"}
            </span>
            <div className="flex-1 border-t border-border" />
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">002</span>
          </div>
          <TopologyGraph />
          <p className="mt-4 text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-mono">
            * source → agent + provenance hash → on-chain registry → read by any consumer.
          </p>
        </section>

        {/* Autonomous split (reuses the isometric asset) */}
        <section className="w-full px-6 py-8 lg:px-12">
          <div className="flex flex-col lg:flex-row gap-0 border-2 border-foreground">
            <div className="relative w-full lg:w-1/2 min-h-[280px] lg:min-h-[440px] border-b-2 lg:border-b-0 lg:border-r-2 border-foreground overflow-hidden bg-foreground">
              <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2 bg-foreground/80 backdrop-blur-sm">
                <span className="text-[10px] tracking-[0.2em] uppercase text-background/60 font-mono">RENDER: agent_runtime.obj</span>
                <span className="text-[10px] tracking-[0.2em] uppercase text-[#ea580c] font-mono">LIVE</span>
              </div>
              <Image
                src="/images/about-isometric.jpg"
                alt="Isometric view of the Claros autonomous agent runtime attesting data on-chain"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2 bg-foreground/80 backdrop-blur-sm">
                <span className="text-[10px] tracking-[0.2em] uppercase text-background/40 font-mono">{"AGENT: DEEPSEEK-LOOP"}</span>
                <span className="text-[10px] tracking-[0.2em] uppercase text-background/40 font-mono">{"SIGN: TXV1"}</span>
              </div>
            </div>
            <div className="flex flex-col w-full lg:w-1/2">
              <div className="flex items-center justify-between px-5 py-3 border-b-2 border-foreground">
                <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">AGENT.md</span>
                <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">v1.0.0</span>
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-0">
                {PILLARS.map((p, i) => (
                  <div
                    key={p.tag}
                    className={`flex flex-col gap-2 px-5 py-5 border-foreground ${i % 2 === 0 ? "sm:border-r-2" : ""} ${i < 2 ? "border-b-2" : ""}`}
                  >
                    <span className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground font-mono">{p.tag}</span>
                    <span className="text-base font-mono font-bold tracking-tight uppercase text-[#ea580c]">{p.title}</span>
                    <span className="text-xs font-mono text-muted-foreground leading-relaxed">{p.body}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Treasury + earnings (live on-chain) */}
        <TreasuryPanel snapshot={treasury} />

        {/* Contracts */}
        <section className="w-full px-6 py-8 lg:px-12">
          <div className="flex items-center gap-4 mb-6">
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
              {"// DEPLOYED_CONTRACTS"}
            </span>
            <div className="flex-1 border-t border-border" />
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">004</span>
          </div>
          <div className="border-2 border-foreground">
            {CONTRACTS.map((c, i) => (
              <a
                key={c.name}
                href={cspr(c.pkg)}
                target="_blank"
                rel="noreferrer"
                className={`group grid grid-cols-1 md:grid-cols-[1.1fr_1.6fr_2fr] gap-1 md:gap-4 px-4 py-3 hover:bg-foreground hover:text-background transition-colors ${
                  i > 0 ? "border-t-2 border-foreground" : ""
                }`}
              >
                <span className="text-xs font-mono font-bold tracking-tight">{c.name}</span>
                <span className="text-[10px] font-mono tracking-wide uppercase text-muted-foreground group-hover:text-background/70 flex items-center">
                  {c.role}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground group-hover:text-background/60 break-all flex items-center">
                  {c.pkg}
                </span>
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-8">
            <Link href="/docs" className="bg-foreground text-background px-4 py-2 text-xs font-mono tracking-widest uppercase hover:opacity-90">
              Read Integration Docs →
            </Link>
            <div className="flex-1 border-t border-border" />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
