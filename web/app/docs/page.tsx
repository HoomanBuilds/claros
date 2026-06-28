import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CodeBlock } from "@/components/code-block"
import { DocTable } from "@/components/doc-table"
import { FeedReference } from "@/components/feed-reference"
import { getStats, getAllReadings } from "@/lib/claros"
import { flagshipFirst } from "@/lib/format"

export const revalidate = 300

export const metadata: Metadata = {
  title: "Docs — Consume the Claros Oracle",
  description: "Read Claros real-world-data feeds three ways: a free REST API, the claros-oracle SDK, or a cross-contract call from your own Casper contract. With parameter tables and a full feed reference.",
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

function Sub({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[11px] tracking-[0.2em] uppercase text-muted-foreground font-mono mt-8 mb-3">{children}</h3>
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
GET /v1/datasets?family=natural-gas`

const X402_CODE = `import { x402Client, wrapFetchWithPayment } from "@x402/fetch"
import { createClientCasperSigner } from "@make-software/casper-x402"
import { ExactCasperScheme } from "@make-software/casper-x402/exact/client"
import { KeyAlgorithm } from "casper-js-sdk"

// your Casper key funds the per-call payment (paid in WCSPR)
const signer = await createClientCasperSigner(KEY_PATH, KeyAlgorithm.SECP256K1)
const client = new x402Client().register("casper:*", new ExactCasperScheme(signer))
const pay = wrapFetchWithPayment(fetch, client)   // auto-pays on HTTP 402

// each call settles a small WCSPR payment, then returns the reading
const res  = await pay("https://api.claros.example/oracle/feed?asset_id=OP-1")
const feed = await res.json()   // { asset_id, amount_cents, source_hash, provenance, ... }`

const X402_STEPS = [
  "Client requests GET /oracle/feed?asset_id=… (no payment yet).",
  "Server replies 402 Payment Required with the requirements: scheme exact, asset WCSPR, amount, payTo, network casper-test.",
  "Client signs a WCSPR transfer_with_authorization for that amount and retries with the X-PAYMENT header.",
  "The x402 facilitator verifies and settles the transfer on Casper.",
  "Server returns 200 with the reading + on-chain provenance; the WCSPR lands with the Claros agent.",
]

export default async function DocsPage() {
  const [stats, readings] = await Promise.all([getStats(), getAllReadings()])
  const feedRefs = flagshipFirst(readings).map((r) => ({ feed_id: r.feed_id, decimals: r.decimals, unit: r.unit, frequency: r.frequency }))

  const quickstart = [
    { tag: "01 · REST", title: "HTTP, no key", body: "Read any feed over plain HTTP. Best for apps, dashboards, bots.", href: "#rest" },
    { tag: "02 · SDK", title: "claros-oracle", body: "Read Casper state directly in TypeScript — no indexer, no node.", href: "#sdk" },
    { tag: "03 · On-chain", title: "Cross-contract", body: "Call get_latest(id) from your own Casper contract.", href: "#onchain" },
    { tag: "04 · x402", title: "Pay-per-call", body: "Buy a reading over x402 — settled in WCSPR, per call.", href: "#x402" },
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
          <p className="text-xs lg:text-sm font-mono text-muted-foreground leading-relaxed max-w-2xl mb-8">
            Claros is a Pyth-style oracle: values are integers scaled by{" "}
            <span className="text-foreground">10^decimals</span>, stored next to self-describing
            metadata, keyed by <span className="text-foreground">feed_id</span>. Pick a method below, grab a{" "}
            <span className="text-foreground">feed_id</span> from the reference table, and read. On-chain
            reads are free; or pay per call with <span className="text-foreground">x402</span> for a hosted,
            metered feed.
          </p>

          {/* Which method? */}
          <Sub>Which method should I use?</Sub>
          <DocTable
            headers={["method", "best for", "cost", "runs", "returns"]}
            cols="1.2fr 1.9fr 1fr 1.3fr 1.4fr"
            minWidth={780}
            rows={[
              [<b key="m">REST API</b>, "web apps, dashboards, bots, AI agents", <span key="a" className="muted">free</span>, "off-chain (HTTP)", "JSON"],
              [<b key="m">SDK</b>, "TypeScript / JS backends & scripts", <span key="a" className="muted">free</span>, "off-chain (reads node)", "typed Reading object"],
              [<b key="m">Cross-contract</b>, "your own Casper smart contract", <span key="a" className="muted">gas only</span>, "on-chain (Casper VM)", "Attestation + Feed"],
              [<b key="m">x402 metered</b>, "hosted, pay-as-you-go; agent-to-agent", <span key="a"><b>WCSPR / call</b></span>, "off-chain (HTTP + settle)", "JSON + provenance"],
            ]}
          />
        </section>

        {/* Quickstart */}
        <section className="w-full py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border-l-2 border-t-2 border-foreground">
            {quickstart.map((q) => (
              <Link
                key={q.tag}
                href={q.href}
                className="group flex flex-col gap-2 px-5 py-6 border-r-2 border-b-2 border-foreground hover:bg-foreground hover:text-background transition-colors"
              >
                <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground group-hover:text-background/60 font-mono">{q.tag}</span>
                <span className="text-lg font-mono font-bold tracking-tight uppercase">{q.title}</span>
                <span className="text-xs font-mono text-muted-foreground group-hover:text-background/70 leading-relaxed">{q.body}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* REST */}
        <section className="w-full py-12 border-t border-border">
          <Label tag="// REST_API" n="002" />
          <H2 id="rest">REST API</H2>
          <p className="text-xs lg:text-sm font-mono text-muted-foreground leading-relaxed max-w-2xl mb-6">
            The Hermes of Claros — a read service that returns on-chain feeds as JSON. No wallet, no key,
            CORS open. Run <span className="text-foreground">services/claros-api</span> or point at a hosted
            instance.
          </p>

          <Sub>Endpoints & parameters</Sub>
          <DocTable
            headers={["endpoint", "method", "parameters", "returns"]}
            cols="1.7fr 0.7fr 1.7fr 1.5fr"
            minWidth={740}
            rows={[
              [<code key="e">/v1/feeds</code>, "GET", <span key="p" className="muted">none</span>, "all live feeds + values"],
              [<code key="e">/v1/feeds/:id</code>, "GET", <span key="p"><code>:id</code> = feed_id</span>, "one full reading"],
              [<code key="e">/v1/datasets</code>, "GET", <span key="p"><code>?q=</code> · <code>?family=</code></span>, "matching datasets"],
            ]}
          />

          <Sub>Response fields (a reading)</Sub>
          <DocTable
            headers={["field", "type", "meaning"]}
            cols="1.1fr 0.9fr 2.6fr"
            minWidth={640}
            rows={[
              [<code key="f">feed_id</code>, "string", "the key you requested"],
              [<code key="f">value</code>, "number", <span key="m">human value = <code>amount / 10^decimals</code></span>],
              [<code key="f">amount</code>, "string", "raw integer value×10^decimals (U512-safe)"],
              [<code key="f">decimals</code>, "number", "scale exponent (Pyth expo)"],
              [<code key="f">unit</code>, "string", "e.g. $/bbl, MWh, percent"],
              [<code key="f">period</code>, "number", "YYYYMMDD / YYYYMM / YYYY"],
              [<code key="f">source_hash</code>, "string", "sha256 provenance of the source row"],
              [<code key="f">updated_at</code>, "number", "attestation time, epoch ms"],
            ]}
          />

          <div className="mt-6">
            <CodeBlock lang="http" code={REST_RESPONSE} />
          </div>
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

          <Sub>Methods</Sub>
          <DocTable
            headers={["method", "returns", "description"]}
            cols="1.7fr 1.4fr 2fr"
            minWidth={760}
            rows={[
              [<code key="m">new ClarosOracle(cfg?)</code>, "instance", "testnet defaults baked in; cfg overrides rpc / registries"],
              [<code key="m">.getReading(id)</code>, <code key="r">Reading | null</code>, "metadata + value + human number (one call)"],
              [<code key="m">.getValue(id)</code>, <code key="r">FeedValue | null</code>, "just the latest value (amount, period…)"],
              [<code key="m">.getFeed(id)</code>, <code key="r">Feed | null</code>, "just the metadata (decimals, unit…)"],
              [<code key="m">.feedCount()</code>, <code key="r">number</code>, "how many feeds are registered on-chain"],
              [<code key="m">.feedIdAt(i)</code>, <code key="r">string | null</code>, "feed_id at index i"],
              [<code key="m">.listFeedIds()</code>, <code key="r">string[]</code>, "every feed_id on-chain"],
            ]}
          />

          <div className="mt-6 mb-4">
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
            registry interfaces, then call the entry points below with a{" "}
            <span className="text-foreground">feed_id</span>.
          </p>

          <Sub>Entry points</Sub>
          <DocTable
            headers={["contract", "entry point", "argument", "returns"]}
            cols="1.4fr 1.4fr 1.3fr 1.5fr"
            minWidth={740}
            rows={[
              [<b key="c">AttestationRegistry</b>, <code key="e">get_latest</code>, <span key="a"><code>asset_id: String</code></span>, <code key="r">{"Option<Attestation>"}</code>],
              [<b key="c">FeedRegistry</b>, <code key="e">get_feed</code>, <span key="a"><code>feed_id: String</code></span>, <code key="r">{"Option<Feed>"}</code>],
            ]}
          />

          <Sub>Attestation (the value)</Sub>
          <DocTable
            headers={["field", "type", "meaning"]}
            cols="1.1fr 1fr 2.5fr"
            minWidth={620}
            rows={[
              [<code key="f">period</code>, "u64", "reporting period (YYYYMMDD…)"],
              [<code key="f">amount</code>, "U512", "value × 10^decimals"],
              [<code key="f">source_hash</code>, "String", "sha256 provenance"],
              [<code key="f">attester</code>, "Address", "the Claros agent key"],
              [<code key="f">timestamp</code>, "u64", "attestation time, epoch ms"],
            ]}
          />

          <Sub>Feed (the metadata)</Sub>
          <DocTable
            headers={["field", "type", "meaning"]}
            cols="1.1fr 1fr 2.5fr"
            minWidth={620}
            rows={[
              [<code key="f">decimals</code>, "u8", "the 10^k scale to divide by"],
              [<code key="f">unit</code>, "String", "e.g. $/bbl"],
              [<code key="f">title</code>, "String", "human description"],
              [<code key="f">source</code>, "String", "e.g. EIA APIv2"],
              [<code key="f">route</code>, "String", "upstream dataset route"],
              [<code key="f">frequency</code>, "String", "cadence (daily…)"],
              [<code key="f">description</code>, "String", "long description"],
            ]}
          />

          <div className="mt-6">
            <CodeBlock lang="rust" code={ONCHAIN_CODE} />
          </div>
        </section>

        {/* x402 metered */}
        <section className="w-full py-12 border-t border-border">
          <Label tag="// PAY_PER_CALL · X402" n="005" />
          <H2 id="x402">Pay-per-call (x402)</H2>
          <p className="text-xs lg:text-sm font-mono text-muted-foreground leading-relaxed max-w-2xl mb-6">
            On-chain reads are free — but you can also buy a reading from the hosted feed server, where{" "}
            <span className="text-foreground">every call is settled in WCSPR</span> over the x402 protocol
            (HTTP 402). It's built for AI agents and apps that want a hosted, pay-as-you-go endpoint, and
            it's how the Claros agent funds its own attestations —{" "}
            <Link href="/network" className="text-foreground underline decoration-[#ea580c] underline-offset-4">see the earnings</Link>.
          </p>

          <Sub>How a call is paid</Sub>
          <div className="border-2 border-foreground mb-6">
            {X402_STEPS.map((s, i) => (
              <div key={i} className={`flex gap-4 px-4 py-3 ${i > 0 ? "border-t-2 border-foreground" : ""}`}>
                <span className="text-[#ea580c] font-mono font-bold text-xs tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-xs font-mono text-muted-foreground leading-relaxed">{s}</span>
              </div>
            ))}
          </div>

          <Sub>Payment parameters</Sub>
          <DocTable
            headers={["parameter", "value"]}
            cols="1.1fr 2.6fr"
            minWidth={640}
            rows={[
              ["endpoint", <code key="v">GET /oracle/feed</code>],
              ["query", <span key="v"><code>?asset_id</code> (e.g. OP-1)</span>],
              ["scheme", <span key="v"><code>exact</code> (ExactCasperScheme)</span>],
              ["asset", <span key="v">WCSPR <span className="muted">(9 decimals)</span></span>],
              ["price", <span key="v">per call — demo <code>$0.001</code> / ~1 WCSPR <span className="muted">(FEED_PRICE_MOTES)</span></span>],
              ["network", <span key="v"><code>casper:casper-test</code> <span className="muted">(CAIP-2)</span></span>],
              ["pay to", <span key="v" className="muted">the Claros agent payee</span>],
              ["settlement", <span key="v" className="muted">x402 facilitator — verify + settle on Casper</span>],
              ["headers", <span key="v"><code>X-PAYMENT</code> req · <code>PAYMENT-RESPONSE</code> resp</span>],
            ]}
          />

          <div className="mt-6">
            <CodeBlock lang="typescript" code={X402_CODE} />
          </div>
        </section>

        {/* Feed reference */}
        <section className="w-full py-12 border-t border-border">
          <Label tag="// FEED_REFERENCE" n="006" />
          <H2 id="feeds">Feed reference</H2>
          <p className="text-xs lg:text-sm font-mono text-muted-foreground leading-relaxed max-w-2xl mb-6">
            For each dataset, here is the exact <span className="text-foreground">feed_id</span> to pass and
            the <span className="text-foreground">decimals</span> to divide by. Copy the id verbatim into
            REST, the SDK, or a contract call.
          </p>
          <FeedReference feeds={feedRefs} />
        </section>

        {/* Datasets */}
        <section className="w-full py-12 border-t border-border">
          <Label tag="// DISCOVERY" n="007" />
          <H2 id="datasets">Datasets</H2>
          <p className="text-xs lg:text-sm font-mono text-muted-foreground leading-relaxed max-w-2xl mb-6">
            {stats.feedsLive} feeds are live today, crawled from {stats.datasets} indexed EIA datasets across
            every energy family. Browse them all on the{" "}
            <Link href="/datasets" className="text-foreground underline decoration-[#ea580c] underline-offset-4">datasets page</Link>,
            or query the discovery endpoint:
          </p>
          <CodeBlock lang="bash" code={DATASETS_CODE} />
        </section>

        {/* Addresses */}
        <section className="w-full py-12 border-t border-border">
          <Label tag="// CONTRACTS" n="008" />
          <H2>Addresses</H2>
          <DocTable
            headers={["key", "value"]}
            cols="1.1fr 2.6fr"
            minWidth={680}
            rows={[
              ["Network", <span key="v" className="muted">casper-test (testnet)</span>],
              ["RPC", <span key="v" className="muted break-all">https://node.testnet.casper.network/rpc</span>],
              [<span key="k">FeedRegistry <span className="muted">(metadata)</span></span>, <span key="v" className="break-all">{FEED_REGISTRY}</span>],
              [<span key="k">AttestationRegistry <span className="muted">(values)</span></span>, <span key="v" className="break-all">{ATTESTATION_REGISTRY}</span>],
            ]}
          />
          <div className="flex items-center gap-3 mt-8">
            <Link href="/feeds" className="bg-foreground text-background px-4 py-2 text-xs font-mono tracking-widest uppercase hover:opacity-90">
              Browse Live Feeds →
            </Link>
            <Link href="/network" className="border-2 border-foreground px-4 py-2 text-xs font-mono tracking-widest uppercase hover:bg-foreground hover:text-background transition-colors">
              See the Agent →
            </Link>
            <div className="flex-1 border-t border-border" />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
