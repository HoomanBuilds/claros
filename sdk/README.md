# claros-oracle

Read **Claros** real-world-data oracle feeds from **Casper** — values *and* self-describing metadata, straight from on-chain state. Like Pyth: the data lives on-chain; you read it.

Claros attests real-world data (energy from the U.S. EIA — electricity, gas, petroleum, coal, nuclear, CO₂, …; plus San Diego parking revenue) to two Casper contracts:
- **FeedRegistry** — per-feed metadata (`decimals`, `unit`, `source`, `route`, `frequency`, `title`, `description`).
- **AttestationRegistry** — the latest attested value (`period`, `amount`, `source_hash`, `attester`, `timestamp`).

A reading is `value = amount / 10^decimals` (e.g. amount `78940000`, decimals `6` → `$78.94`). Exactly the Pyth `price × 10^expo` model.

## Install
```bash
npm install claros-oracle
```

## Read a feed (off-chain consumer / app / frontend)
```ts
import { ClarosOracle } from 'claros-oracle';

const claros = new ClarosOracle(); // Casper testnet defaults

// one call: metadata + value + human number, all from on-chain
const wti = await claros.getReading('EIA.PET.PRICE.WTI.DAILY');
// → { feed_id, value: 78.94, unit: '$/bbl', decimals: 6, amount: 78940000n,
//     period: 20260622, source_hash, route: 'petroleum/pri/spt', frequency: 'daily', ... }

// enumerate every feed live on-chain
const ids = await claros.listFeedIds();

// metadata / value separately
const meta  = await claros.getFeed('EIA.NG.PRICE.HENRYHUB.DAILY');  // FeedRegistry
const value = await claros.getValue('EIA.NG.PRICE.HENRYHUB.DAILY'); // AttestationRegistry
```

Custom config:
```ts
new ClarosOracle({
  rpc: 'https://node.testnet.casper.network/rpc',
  feedRegistry: '741cc223…',          // FeedRegistry package hash
  attestationRegistry: '236b5104…',   // AttestationRegistry package hash
});
```

## Read a feed (HTTP — any language, the "Hermes" API)
```
GET /v1/feeds              → all on-chain feeds (metadata + latest value)
GET /v1/feeds/{feed_id}    → one feed reading
GET /v1/datasets?family=petroleum&q=price   → discover all EIA datasets Claros can attest
```
```bash
curl https://<claros-api>/v1/feeds/EIA.PET.PRICE.WTI.DAILY
# { "feed_id":"EIA.PET.PRICE.WTI.DAILY","value":78.94,"unit":"$/bbl","decimals":6,
#   "amount":"78940000","period":20260622,"source_hash":"…", … }
```

## Read on-chain (another Casper contract)
Cross-contract call both registries with the `feed_id`:
```rust
let v = AttestationRegistryRef::new(env, registry).get_latest(feed_id.clone()); // value
let m = FeedRegistryRef::new(env, feed_registry).get_feed(feed_id);             // decimals/unit
// real = v.amount / 10^m.decimals
```

## Feed IDs
`EIA.<DATASET>.<METRIC>.<SPECIFIER>.<FREQ>` — e.g. `EIA.PET.PRICE.WTI.DAILY`, `EIA.NG.PRICE.HENRYHUB.DAILY`, `EIA.ELEC.DEMAND.US48.HOURLY`, `EIA.CO2.AGG.US_TOTAL.ANNUAL`. The full EIA universe (232 datasets) is browsable via `GET /v1/datasets`; any series can be registered + attested on demand.

## How it works (on-chain read internals)
Odra stores every contract field in a single `state` dictionary, item key =
`hex(blake2b(index_bytes ++ key_bytes))`, fields 1-indexed, value = `List<U8>`
(4-byte length + raw Odra serialization). This SDK does that derivation + parsing
so you just call `getReading(id)`. No indexer required — it reads global state directly.
