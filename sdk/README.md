<h1 align="center">claros-oracle</h1>

<p align="center">
  <b>Read Claros real-world-data oracle feeds straight from Casper on-chain state. Values and self-describing metadata, no indexer, no API key, no node to run.</b>
</p>

<p align="center">
  <a href="https://claros-oracle.vercel.app">Live app</a> ·
  <a href="https://claros-oracle.vercel.app/docs">Docs</a> ·
  <a href="https://claros-oracle.vercel.app/feeds">Live feeds</a> ·
  <a href="https://claros-oracle.vercel.app/network">Network</a> ·
  <a href="https://github.com/HoomanBuilds/claros">GitHub</a>
</p>

> Claros is a verifiable real-world-data oracle network on Casper. Autonomous agents attest energy markets (U.S. EIA: petroleum, natural gas, electricity, coal, nuclear, CO2, outlooks) and civic data (San Diego parking revenue) on-chain as self-describing feeds. This package reads them back: you construct a reader, call a method with a `feed_id`, and get the value already scaled to a human number. The testnet contract addresses are baked in, so the empty constructor just works.

Claros follows the Pyth model: the data lives on-chain, and a reading is `value = amount / 10^decimals`. Two registries hold every feed. The **FeedRegistry** stores the metadata that makes a feed self-describing (`decimals`, `unit`, `source`, `route`, `frequency`, `title`, `description`), and the **AttestationRegistry** stores the latest attested value (`period`, `amount`, `source_hash`, `attester`, `timestamp`). This SDK reads both by the same `feed_id` and joins them for you.

Every value carries a sha256 provenance hash of the exact upstream row and the address of the agent that attested it, so anything you read here can be independently reconciled against the chain.

---

## Install

```bash
npm install claros-oracle
```

Node 18+, ESM. One dependency (`@noble/hashes`), TypeScript types included.

## Quick start

```ts
import { ClarosOracle } from 'claros-oracle';

const claros = new ClarosOracle(); // Casper testnet defaults baked in

// one call: metadata + value + human-scaled number
const wti = await claros.getReading('EIA.PET.PRICE.WTI.DAILY');
if (wti) {
  console.log(wti.value, wti.unit);   // 71.87 $/bbl
  console.log(wti.amount, wti.decimals); // 71870000n 6
}

// enumerate every feed live on-chain
const ids = await claros.listFeedIds();

// or read the two registries separately
const meta  = await claros.getFeed('EIA.NG.PRICE.HENRYHUB.DAILY');  // FeedRegistry
const value = await claros.getValue('EIA.NG.PRICE.HENRYHUB.DAILY'); // AttestationRegistry
```

`getReading` returns `null` when the feed or its value is not on-chain, so check the result before using it.

## API

| Method | Returns | What it reads |
| ------ | ------- | ------------- |
| `getReading(feedId)` | `Reading \| null` | metadata + latest value, joined, with the human-scaled `value` |
| `getFeed(feedId)` | `Feed \| null` | self-describing metadata from the FeedRegistry |
| `getValue(feedId)` | `FeedValue \| null` | latest attestation from the AttestationRegistry, including the `attester` address |
| `feedCount()` | `number` | number of feeds registered on-chain |
| `feedIdAt(i)` | `string \| null` | the `feed_id` at a registry index |
| `listFeedIds()` | `string[]` | every registered `feed_id` |

Return types, exactly as exported:

```ts
interface Feed {
  decimals: number; unit: string; title: string; source: string;
  route: string; frequency: string; description: string;
}

interface FeedValue {
  period: number;        // YYYYMMDD / YYYYMM / YYYY (or epoch seconds for hourly)
  amount: bigint;        // raw scaled integer (U512-safe)
  source_hash: string;   // sha256 provenance digest of the exact upstream row
  attester: string;      // account-hash of the agent that wrote the value
  timestamp: number;     // chain commit time, epoch milliseconds
}

interface Reading extends Feed {
  feed_id: string;
  value: number;         // amount / 10^decimals, the human number
  amount: bigint;
  period: number;
  source_hash: string;
  updated_at: number;    // epoch milliseconds
}
```

## Configuration

Every field is optional and defaults to the live Casper testnet deployment, so most apps never pass a config.

```ts
new ClarosOracle({
  rpc: 'https://node.testnet.casper.network/rpc',
  feedRegistry: '741cc223c14c2c00c9f06d7bb5c4be2f824fbf0c8b09a147bf1835570bddf5b6',
  attestationRegistry: '236b510436c60b6a797d175c72c6014de367d43f1de1ca45f580d112f98116cc',
});
```

Both addresses are contract **package** hashes, verifiable on [cspr.live](https://testnet.cspr.live/contract-package/741cc223c14c2c00c9f06d7bb5c4be2f824fbf0c8b09a147bf1835570bddf5b6). The deployed wasm is reproducible from the open-source repo: `node scripts/verify-onchain.mjs` there compares sha256 digests of the on-chain `module_bytes` against the tracked artifacts.

## Feed IDs

`EIA.<DATASET>.<METRIC>.<SPECIFIER>.<FREQ>`, for example `EIA.PET.PRICE.WTI.DAILY`, `EIA.NG.PRICE.HENRYHUB.DAILY`, `EIA.ELEC.DEMAND.US48.HOURLY`, `EIA.CO2.AGG.US_TOTAL.ANNUAL`. The civic feed is `OP-1` (San Diego parking revenue, cents).

38 feeds serve live values today, drawn from a crawled catalog of 232 EIA datasets; any series in the catalog can be registered and attested on demand. Browse them at [/feeds](https://claros-oracle.vercel.app/feeds) and [/datasets](https://claros-oracle.vercel.app/datasets), or see the naming scheme in the [docs](https://claros-oracle.vercel.app/docs/concepts/feeds).

## Other ways to read

- **REST**: a Hermes-style read service with the same data as JSON (`GET /v1/feeds`, `GET /v1/feeds/{feed_id}`, `GET /v1/datasets`). Self-host it from [`services/claros-api`](https://github.com/HoomanBuilds/claros/tree/main/services/claros-api); it wraps this SDK. Free, no key.
- **Cross-contract**: your own Casper contract can call `get_latest(feed_id)` and `get_feed(feed_id)` on the registries directly, exactly like reading Pyth on-chain. Struct definitions are in the [integration docs](https://claros-oracle.vercel.app/docs/reading/on-chain).
- **x402 metered**: a hosted, pay-per-call endpoint settles WCSPR to the attesting agent over the x402 payment protocol. See [the x402 flow](https://claros-oracle.vercel.app/docs/reading/x402).

## How it reads the chain

Odra stores every contract field in a single `state` dictionary. The item key is `hex(blake2b(index_bytes ++ key_bytes))` with 1-indexed fields, and the stored CLValue is a `List<U8>` (4-byte length prefix plus the raw Odra serialization). This SDK performs that derivation and parsing over plain JSON-RPC (`query_global_state`, `state_get_dictionary_item`), which is why it needs no indexer, no websocket, and no running node of your own: every call reads current global state directly from a public RPC.

## The network behind the data

Feeds are written by autonomous agents, not humans: a tool-calling LLM loop that checks its on-chain ZK eligibility credential, anomaly-checks each reading against the asset's history, attests it, and funds its own gas by selling reads over x402. The network is open: operators enroll through a Groth16 eligibility gate, claim feeds (claims are enforced by the contracts), and attest with their own keys. The `attester` field on every `FeedValue` tells you exactly who wrote what. Details and evidence transactions: [github.com/HoomanBuilds/claros](https://github.com/HoomanBuilds/claros).

---

Built on Casper testnet (`casper-test`) for the Casper Agentic Buildathon 2026.
