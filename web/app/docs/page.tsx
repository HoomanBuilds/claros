import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CodeBlock } from "@/components/code-block"
import { getStats } from "@/lib/claros"

export const revalidate = 300

export const metadata: Metadata = {
  title: "Docs — Consume the Claros Oracle",
  description: "Read Claros real-world-data feeds three ways: a free REST API, the claros-oracle SDK, or a cross-contract call from your own Casper contract.",
}

const FEED_REGISTRY = "dac573fc3a4c9df921013300612cd289d193814e52a72f76abb0f18f04366f46"
const ATTESTATION_REGISTRY = "236b510436c60b6a797d175c72c6014de367d43f1de1ca45f580d112f98116cc"

function Label({ tag, n }: { tag: string; n: string }) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">{tag}</span>
      <div className="flex-1 border-t border-border" />
      <span className="inline-block h-2 w-2 bg-[#ea580c]" />
      <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">{n}</span>
    </div>
  )
}

function H2({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} className="text-2xl lg:text-3xl font-mono font-bold tracking-tight uppercase text-foreground mb-4 scroll-mt-24">
      {children}
    </h2>
  )
}

const REST_RESPONSE = `GET /v1/feeds/EIA.PET.PRICE.WTI.DAILY

{
  "feed_id": "EIA.PET.PRICE.WTI.DAILY",
  "value": 78.94,
  "amount": "78940000",
  "decimals": 6,
  "unit": "$/bbl",
  "title": "Cushing, OK WTI Spot Price FOB",
  "source": "EIA APIv2",
  "period": 20260622,
  "source_hash": "a1b2c3…",
  "updated_at": 1781740800000
}`

const SDK_CODE = `import { ClarosOracle } from "claros-oracle"

// testnet contract addresses are baked in
const oracle = new ClarosOracle()

// one call: metadata + value + human number
const wti = await oracle.getReading("EIA.PET.PRICE.WTI.DAILY")
console.log(wti.value, wti.unit)   // 78.94 $/bbl

// enumerate everything on-chain
const ids = await oracle.listFeedIds()  // 37 feed ids`

const ONCHAIN_CODE = `use odra::prelude::*;
use odra::casper_types::U512;
use odra::ContractRef;

#[odra::odra_type]
pub struct Attestation {            // value
    pub period: u64,
    pub amount: U512,               // value × 10^decimals
    pub source_hash: String,
    pub attester: Address,
    pub timestamp: u64,
}
#[odra::odra_type]
pub struct Feed {                   // metadata
    pub decimals: u8,
    pub unit: String,
    pub title: String,
    pub source: String,
    pub route: String,
    pub frequency: String,
    pub description: String,
}

#[odra::external_contract]
pub trait ClarosValues   { fn get_latest(&self, asset_id: String) -> Option<Attestation>; }
#[odra::external_contract]
pub trait ClarosMetadata { fn get_feed(&self, feed_id: String) -> Option<Feed>; }

// inside your module:
let v = ClarosValuesContractRef::new(self.env(), attestation_registry);
let m = ClarosMetadataContractRef::new(self.env(), feed_registry);

let att  = v.get_latest("EIA.PET.PRICE.WTI.DAILY".to_string()).unwrap_or_revert(&self.env());
let feed = m.get_feed("EIA.PET.PRICE.WTI.DAILY".to_string()).unwrap_or_revert(&self.env());

// real price = att.amount / 10^feed.decimals  (e.g. 78_940_000 / 10^6 = 78.94)
// att.period / att.timestamp let you reject stale data`

const DATASETS_CODE = `# search the 232 indexed datasets Claros can attest
GET /v1/datasets?q=coal
GET /v1/datasets?family=natural-gas

# families: petroleum · natural-gas · electricity · coal · nuclear
#           co2 · biomass · seds · steo · international · total-energy`

export default async function DocsPage() {
  const stats = await getStats()

  const quickstart = [
    { tag: "01 · REST", title: "HTTP, no key", body: "Read any feed over plain HTTP. Best for apps, dashboards, bots.", href: "#rest" },
    { tag: "02 · SDK", title: "claros-oracle", body: "Read Casper state directly in TypeScript — no indexer, no node.", href: "#sdk" },
    { tag: "03 · On-chain", title: "Cross-contract", body: "Call get_latest(id) from your own Casper contract.", href: "#onchain" },
  ]

  return (
    <div className="min-h-screen dot-grid-bg">
      <Navbar />
      <main className="px-6 lg:px-12">
        {/* Header */}
        <section className="w-full pt-12 pb-8">
          <Label tag="// INTEGRATION_GUIDE" n="DOCS" />
          <h1 className="font-pixel text-4xl sm:text-5xl lg:text-6xl tracking-tight text-foreground mb-4 select-none">
            INTEGRATE
          </h1>
          <p className="text-xs lg:text-sm font-mono text-muted-foreground leading-relaxed max-w-2xl">
            Claros is a Pyth-style oracle: values are integers scaled by{" "}
            <span className="text-foreground">10^decimals</span>, stored next to self-describing
            metadata, keyed by <span className="text-foreground">feed_id</span>. Read them three ways —
            all reads are free.
          </p>
        </section>

        {/* Quickstart */}
        <section className="w-full py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-l-2 border-t-2 border-foreground">
            {quickstart.map((q) => (
              <Link
                key={q.tag}
                href={q.href}
                className="group flex flex-col gap-2 px-5 py-6 border-r-2 border-b-2 border-foreground hover:bg-foreground hover:text-background transition-colors"
              >
                <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground group-hover:text-background/60 font-mono">
                  {q.tag}
                </span>
                <span className="text-lg font-mono font-bold tracking-tight uppercase">{q.title}</span>
                <span className="text-xs font-mono text-muted-foreground group-hover:text-background/70 leading-relaxed">
                  {q.body}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* REST */}
        <section className="w-full py-12 border-t border-border">
          <Label tag="// REST_API" n="002" />
          <H2 id="rest">REST API</H2>
          <p className="text-xs lg:text-sm font-mono text-muted-foreground leading-relaxed max-w-2xl mb-6">
            The Hermes of Claros — a read service that returns on-chain feeds as JSON. No wallet, no
            key, CORS open. Run <span className="text-foreground">services/claros-api</span> or point at a
            hosted instance.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border-l-2 border-t-2 border-foreground mb-6">
            {[
              { m: "GET /v1/feeds", d: "all live feeds + values" },
              { m: "GET /v1/feeds/:id", d: "one full reading" },
              { m: "GET /v1/datasets", d: "discover 232 datasets" },
            ].map((e) => (
              <div key={e.m} className="flex flex-col gap-1 px-5 py-4 border-r-2 border-b-2 border-foreground">
                <span className="text-xs font-mono font-bold text-foreground">{e.m}</span>
                <span className="text-[10px] font-mono tracking-wide uppercase text-muted-foreground">{e.d}</span>
              </div>
            ))}
          </div>
          <CodeBlock lang="http" code={REST_RESPONSE} />
        </section>

        {/* SDK */}
        <section className="w-full py-12 border-t border-border">
          <Label tag="// SDK" n="003" />
          <H2 id="sdk">TypeScript SDK</H2>
          <p className="text-xs lg:text-sm font-mono text-muted-foreground leading-relaxed max-w-2xl mb-6">
            <span className="text-foreground">claros-oracle</span> reads feed metadata and values directly
            from Casper global state — no indexer, no running node. The same numbers an on-chain consumer
            sees.
          </p>
          <div className="mb-4">
            <CodeBlock lang="bash" code="npm install claros-oracle" />
          </div>
          <CodeBlock lang="typescript" code={SDK_CODE} />
        </section>

        {/* On-chain */}
        <section className="w-full py-12 border-t border-border">
          <Label tag="// ON_CHAIN" n="004" />
          <H2 id="onchain">On-chain (cross-contract)</H2>
          <p className="text-xs lg:text-sm font-mono text-muted-foreground leading-relaxed max-w-2xl mb-6">
            Consume Claros from your own Casper contract, exactly like reading Pyth on-chain. Declare the
            registry interfaces, then call <span className="text-foreground">get_latest(feed_id)</span> for
            the value and <span className="text-foreground">get_feed(feed_id)</span> for decimals/unit.
          </p>
          <CodeBlock lang="rust" code={ONCHAIN_CODE} />
        </section>

        {/* Datasets */}
        <section className="w-full py-12 border-t border-border">
          <Label tag="// DISCOVERY" n="005" />
          <H2 id="datasets">Datasets</H2>
          <p className="text-xs lg:text-sm font-mono text-muted-foreground leading-relaxed max-w-2xl mb-6">
            {stats.feedsLive} feeds are live today, crawled from {stats.datasets} indexed EIA datasets across
            every energy family. Any of them can be attested on request.
          </p>
          <CodeBlock lang="bash" code={DATASETS_CODE} />
        </section>

        {/* Addresses */}
        <section className="w-full py-12 border-t border-border">
          <Label tag="// CONTRACTS" n="006" />
          <H2>Addresses</H2>
          <div className="border-2 border-foreground">
            {[
              { k: "Network", v: "casper-test (testnet)" },
              { k: "RPC", v: "https://node.testnet.casper.network/rpc" },
              { k: "FeedRegistry (metadata)", v: FEED_REGISTRY },
              { k: "AttestationRegistry (values)", v: ATTESTATION_REGISTRY },
            ].map((r, i) => (
              <div
                key={r.k}
                className={`grid grid-cols-1 md:grid-cols-[1fr_2.4fr] gap-1 md:gap-4 px-4 py-3 ${
                  i > 0 ? "border-t-2 border-foreground" : ""
                }`}
              >
                <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-mono">{r.k}</span>
                <span className="text-xs font-mono text-foreground break-all">{r.v}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-8">
            <Link
              href="/feeds"
              className="bg-foreground text-background px-4 py-2 text-xs font-mono tracking-widest uppercase hover:opacity-90"
            >
              Browse Live Feeds →
            </Link>
            <div className="flex-1 border-t border-border" />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
