<p align="center">
  <img src="web/app/icon.svg" alt="Claros" width="76" />
</p>

<h1 align="center">Claros</h1>

<p align="center">
  <b>A verifiable real-world-data oracle and autonomous agent on Casper. Energy markets and civic data, attested on-chain as self-describing feeds.</b>
</p>

> Claros pulls authoritative real-world data (U.S. EIA energy markets and City of San Diego parking revenue), scales each value to an integer, hashes its provenance, and attests it on Casper as a self-describing feed. A DeepSeek-driven agent runs the whole loop autonomously and funds its own gas. Read any feed for free from your contract, the SDK, or a REST API, or pay per call over x402.

Claros is a Pyth-style oracle for real-world data, built on **Casper testnet**. Two registries hold the data on-chain: an **AttestationRegistry** stores each value keyed by a `feed_id`, and a **FeedRegistry** stores the matching self-describing metadata (decimals, unit, source, cadence). An **autonomous agent** fetches the upstream data, scales and hashes it, signs a Casper `TransactionV1`, and attests it, with no human in the loop. The agent sells the feed over an **x402** payment rail to earn WCSPR, routes idle treasury into on-chain yield, and gates its own operation behind a **zero-knowledge eligibility proof**, all of which it records on-chain.

The whole thing is verifiable: every value is an attestation with a provenance hash, the registries are public Casper state anyone can read, and the agent's reinvest decisions (with their reasoning) are written to an on-chain treasury ledger. This repository is the working testnet build, deployed and live, built for the **Casper Agentic Buildathon 2026**.

---

## Table of Contents

- [What Claros Does](#what-claros-does)
- [Why It Exists](#why-it-exists)
- [How It Works](#how-it-works)
  - [The On-Chain Oracle: Two Registries](#the-on-chain-oracle-two-registries)
  - [The Autonomous Agent](#the-autonomous-agent)
  - [The x402 Earn Rail](#the-x402-earn-rail)
  - [The Treasury and On-Chain Yield](#the-treasury-and-on-chain-yield)
  - [The ZK Eligibility Gate](#the-zk-eligibility-gate)
  - [The Consumption Layer: SDK, REST, Cross-Contract](#the-consumption-layer-sdk-rest-cross-contract)
  - [The Web App](#the-web-app)
- [Data Coverage](#data-coverage)
- [Deployed Contracts](#deployed-contracts)
- [Verify It Yourself](#verify-it-yourself)
- [Reading the Data](#reading-the-data)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Tech Stack](#tech-stack)
- [Security and Operational Notes](#security-and-operational-notes)
- [For Judges and Reviewers](#for-judges-and-reviewers)

---

## What Claros Does

Claros is five parts working as one:

1. **An on-chain oracle (Odra / Rust).** Two contracts: `AttestationRegistry` stores values by `feed_id`, and `FeedRegistry` stores self-describing metadata (decimals, unit, source, route, cadence) for the same id. Reading is `amount / 10^decimals`, exactly like Pyth's `price × 10^expo`. Both are deployed and upgradable on Casper testnet.

2. **An autonomous agent (TypeScript).** A DeepSeek tool-calling loop on a heartbeat. Each cycle it checks its on-chain ZK eligibility, fetches the latest data, anomaly-checks it against the asset's history, attests clean readings on-chain, then decides whether to reinvest treasury, and records the decision and reasoning on-chain. No human approves any step.

3. **An x402 earn rail (TypeScript).** A paid feed server gated by the x402 HTTP-402 payment protocol, a self-hosted Casper facilitator that verifies and settles payments in WCSPR, and an example paying consumer. This is how the oracle funds its own attestations.

4. **A consumption layer.** The `claros-oracle` npm SDK reads feeds straight from Casper state with no indexer; a Hermes-style REST API serves them as JSON; and any Casper contract can read a feed cross-contract with a single call. All on-chain reads are free.

5. **A web app (Next.js).** A landing page plus live explorers for the feeds, the full dataset catalog, the integration docs, and the agent's on-chain treasury and earnings, every figure read live from the testnet contracts.

Put together: the agent attests real-world data on-chain, sells it over x402 to pay for itself, compounds the proceeds into on-chain yield, and anyone, a contract or an app, reads the same verifiable numbers back out.

---

## Why It Exists

On-chain apps that touch the real world (prediction markets, RWA protocols, energy and carbon products, parametric insurance) need real-world data they can trust and verify. Most oracles hand you a number; Claros hands you a number plus everything you need to check it: the value as a scaled integer, its decimals and unit, its source and cadence, a provenance hash of the exact upstream row, and the period it covers, all stored on-chain next to each other.

It is also an experiment in an oracle that runs itself. Keeping a feed fresh is repetitive work: fetch, validate, scale, hash, sign, submit, then manage the gas budget that pays for it. Claros wraps that in an autonomous agent that decides and acts through tools, anomaly-checks its own inputs before attesting, earns its own gas by selling reads over x402, and parks idle treasury in on-chain yield so it can keep going. Every decision it makes, including "hold," is recorded on-chain with its reasoning.

The design is deliberately verifiable rather than trust-me. The agent operates behind a zero-knowledge eligibility gate (a regulation-ready pattern: prove you are on an allowlist without revealing which member you are), values and provenance live on-chain, and the same provenance hash the agent attests is the one served to paying consumers, so a buyer can independently reconcile what they bought against the chain.

---

## How It Works

### The On-Chain Oracle: Two Registries

`AttestationRegistry` is the value store. The agent calls `attest(asset_id, period, amount, source_hash)`; the contract records the latest `Attestation { period, amount (U512), source_hash, attester, timestamp }` keyed by `asset_id`, keeps history, and exposes `get_latest(asset_id)`. Values are integers scaled by `10^decimals`, so there are no floats on-chain.

`FeedRegistry` is the metadata store and the reason feeds are self-describing. Per `feed_id` it holds `Feed { decimals, unit, title, source, route, frequency, description }`, plus an enumerable index (`feed_count`, `feed_id_at`, `get_feed`). A consumer reads both registries by the same `feed_id`: `get_latest` for the value, `get_feed` for the decimals and unit, then `value = amount / 10^decimals`.

Both are Odra contracts, deployed upgradable, and owner-gated for writes (only the agent key can attest or register).

### The Autonomous Agent

The agent (`agent/src/`) is a DeepSeek tool-calling loop. Its system prompt makes it an autonomous oracle-and-treasury operator; it is given tools and decides which to call. One cycle:

1. **Compliance gate**: `read_eligibility`. If the agent's on-chain ZK credential is not confirmed, it stops.
2. **Read and anomaly-check**: `read_revenue` and `read_attestation_history`. If the new reading falls outside the asset's typical range, it refuses to attest and explains why.
3. **Attest**: `attest` with the exact period, amount, and source hash from the reading.
4. **Treasury decision**: `read_treasury`, `read_x402_earnings`, `read_venue_state`, then `reinvest` (stake / delegate / hold) and `record_reinvest` with a one-sentence justification. Restraint is valid: a "hold" is recorded too.

A heartbeat (`loop.ts`) runs a cycle only when the upstream source has a newer period than last processed, so it never wastes gas re-attesting the same data. All signing is `casper-js-sdk` v5 building Casper 2.0 (`Condor`) `TransactionV1`s.

### The x402 Earn Rail

The paid product is a hosted feed endpoint, `GET /oracle/feed?asset_id=`, that returns the latest attested reading with its on-chain provenance. It is gated by the x402 protocol:

1. A client requests the feed with no payment.
2. The server replies `402 Payment Required` with the requirements (scheme `exact`, asset WCSPR, amount, payTo, network `casper-test`).
3. The client signs a WCSPR `transfer_with_authorization` and retries with an `X-PAYMENT` header.
4. A self-hosted **facilitator** verifies and settles the transfer on Casper.
5. The server returns `200` with the reading; the WCSPR lands with the agent.

`services/oracle-server` is the resource server, `services/facilitator` does verify/settle, and `services/consumer` is a worked example that auto-pays on 402 using `@x402/fetch` and `@make-software/casper-x402`. Reading the data on-chain is always free; x402 is the metered, hosted path that funds the oracle.

### The Treasury and On-Chain Yield

`TreasuryVault` is the agent's on-chain ledger. `record_reinvest(venue, amount_in, amount_out, reasoning)` writes a `Reinvestment` entry and aggregates per-venue totals; `update_holdings` tracks WCSPR and sCSPR. Every reinvest decision the agent makes, with the DeepSeek reasoning that produced it, is stored on-chain and emitted as a `Reinvested` event.

The agent's yield venues are real Casper DeFi:

- **WiseLending** (primary): stake CSPR, receive yield-bearing **sCSPR** (via a cargo-purse session proxy).
- **Native delegation** (fallback): delegate CSPR to a validator for protocol staking rewards.
- **CSPR.trade (DEX)**: swap rates are evaluated each cycle; staking currently wins, so the agent stakes. (The DEX is compared in the agent's reasoning, not yet a live swap integration.)

### The ZK Eligibility Gate

`EligibilityGate` gates the oracle behind a zero-knowledge proof of allowlist membership, a regulation-ready access pattern where the agent proves it is authorized without revealing its identity. The on-chain `verify_eligibility(proof, root, nullifier_hash)` runs a **Groth16 / BN254** verifier (`ark-groth16`, forked from Shroud Protocol) compiled into the contract, checks the proof against the on-chain allowlist Merkle `root`, burns a nullifier (one-shot, replay-safe), binds the caller's account, and marks it eligible.

The circuit (`zk-gate/circuits/eligibility.circom`, Circom 2.1) proves knowledge of a private `(identity, nullifier)` whose MiMC7 leaf sits in a **20-level Merkle allowlist**, publishes the nullifier hash, and binds the caller account-hash. Setup is snarkjs Groth16 over a bn128 power-16 trusted setup. A real proof has been verified on-chain.

### The Consumption Layer: SDK, REST, Cross-Contract

There are three ways to read a feed, all sharing one model (`amount / 10^decimals`, keyed by `feed_id`):

- **REST**: the `services/claros-api` Hermes-style read service. `GET /v1/feeds`, `GET /v1/feeds/:id`, `GET /v1/datasets`. JSON, CORS open, no key. Free.
- **SDK**: `claros-oracle` (npm), reads feed metadata and values directly from Casper global state with no indexer and no running node. `new ClarosOracle().getReading(id)` returns metadata + value + the human number. Free.
- **Cross-contract**: from your own Casper contract, declare the registry interfaces and call `get_latest(feed_id)` and `get_feed(feed_id)`, exactly like reading Pyth on-chain. Gas only.

The on-chain reader is the same code in all three: the SDK and REST API read Casper state off-chain, and a contract reads the same state on-chain.

### The Web App

`web/` is a Next.js 16 app (React 19, Tailwind, Framer Motion) for the landing page and four live explorers, every figure read live from the testnet contracts:

- **`/`**: landing page with a live feed ticker, on-chain stats, and the attestation pipeline.
- **`/feeds`**: searchable, family-filtered table of every live feed (value, period, cadence, age, provenance hash).
- **`/datasets`**: the full catalog of EIA datasets Claros can attest, with badges for the ones already live.
- **`/docs`**: integration guide with method-comparison and parameter tables, a full feed reference, and the x402 flow.
- **`/network`** is the on-chain footprint: contracts, the attestation pipeline, and the agent's **live treasury and earnings** read from the TreasuryVault.

---

## Data Coverage

Claros crawled the entire U.S. EIA APIv2 metadata tree into a catalog of **232 leaf datasets** across every energy family, and a generic adapter means any of them can be attested on request. Today **37 feeds are live on-chain**, plus a civic feed (San Diego parking revenue).

| Family | Datasets indexed | Example live feed |
| ------ | ---------------- | ----------------- |
| Petroleum | 112 | `EIA.PET.PRICE.WTI.DAILY` (WTI spot, $/bbl) |
| Natural gas | 53 | `EIA.NG.PRICE.HENRYHUB.DAILY` (Henry Hub, $/MMBtu) |
| Electricity | 19 | `EIA.ELEC.DEMAND.US48.HOURLY` (US grid load, MWh) |
| Coal | 13 | `EIA.COAL.PRICE.MARKET.US.ANNUAL` ($/short ton) |
| Outlooks (AEO / IEO / STEO) | 18 | `EIA.STEO.WTI_PRICE.MONTHLY` |
| Densified biomass | 8 | `EIA.DBF.PROD.US.MONTHLY` |
| Nuclear outages | 3 | `EIA.NUC.OUTAGE.US_PCT.DAILY` (percent) |
| CO2 emissions | 2 | `EIA.CO2.AGG.US_TOTAL.ANNUAL` (MMT CO2) |
| Crude imports / international / SEDS / total energy | 4 | `EIA.INTL.CRUDE_PROD.WORLD.ANNUAL` |
| **Civic** | n/a | `OP-1` (San Diego parking revenue, cents) |

Sources: [U.S. EIA APIv2](https://www.eia.gov/opendata/) and the [City of San Diego open-data portal](https://seshat.datasd.org). Each value carries a sha256 provenance hash of the exact upstream row.

---

## Deployed Contracts

All contracts are live and upgradable on **Casper testnet** (`casper-test`). Explorer: https://testnet.cspr.live

| Contract | Package hash | Role |
| -------- | ------------ | ---- |
| **AttestationRegistry** | [`236b510436c60b6a797d175c72c6014de367d43f1de1ca45f580d112f98116cc`](https://testnet.cspr.live/contract-package/236b510436c60b6a797d175c72c6014de367d43f1de1ca45f580d112f98116cc) | feed values, keyed by `feed_id` |
| **FeedRegistry** | [`dac573fc3a4c9df921013300612cd289d193814e52a72f76abb0f18f04366f46`](https://testnet.cspr.live/contract-package/dac573fc3a4c9df921013300612cd289d193814e52a72f76abb0f18f04366f46) | self-describing metadata |
| **TreasuryVault** | [`a90b082d863c5977c6e54654fec10e523a38760529e664a87e9e8a8e887ffd7b`](https://testnet.cspr.live/contract-package/a90b082d863c5977c6e54654fec10e523a38760529e664a87e9e8a8e887ffd7b) | agent reinvest ledger + holdings |
| **EligibilityGate** | [`7be33b056c8804e0886cd6f20a75109a0fe92deab505754b97a49fde15aa5227`](https://testnet.cspr.live/contract-package/7be33b056c8804e0886cd6f20a75109a0fe92deab505754b97a49fde15aa5227) | ZK Groth16 access gate |

| Linked / external (testnet) | Package hash |
| --------------------------- | ------------ |
| WCSPR (x402 settlement asset) | `3d80df21ba4ee4d66a2a1f60c32570dd5685e4b279f6538162a5fd1314847c1e` |
| WiseLending (sCSPR staking) | `baa50d1500aa5361c497c06b40f2822ebb0b5fce5b1c3a037ea628cb68d920f3` |

Deploy transactions and account hashes are in [`shared/deployments.json`](shared/deployments.json). The attester / agent / owner is one key: account-hash `43d7dd06…21d4`.

---

## Verify It Yourself

Everything below was read from Casper testnet at the time of writing; the live figures move as the agent runs.

| Claim | How to check | Value (verified) |
| ----- | ------------ | ---------------- |
| 4 contracts deployed | open each package on cspr.live (links above) | all live, version 1 |
| Deploys + ZK verify succeeded | [attestation deploy](https://testnet.cspr.live/transaction/ed0820135e92d66bd5aae307402b698fb8b95e2c5c586df95def17c40bb490fd) · [ZK verify](https://testnet.cspr.live/transaction/b3048a56044adb67796f7e94c9c0298700b5cf822b326fd71e8fe8370333a433) | success |
| Feeds registered (FeedRegistry) | `FeedRegistry.feed_count` | **37** |
| Total attestations (AttestationRegistry) | on-chain state | **72** |
| WTI spot price on-chain | `get_latest("EIA.PET.PRICE.WTI.DAILY")` ÷ 10^6 | **$78.94 /bbl** |
| San Diego parking attested | `get_latest("OP-1")` | period 2026-06-23, **$2,734.20** |
| ZK eligibility granted on-chain | `EligibilityGate.granted_count` | **1** (root matches allowlist) |
| Agent self-funding | agent account liquid balance | **~2,380 CSPR** |
| Reinvest decisions logged | `TreasuryVault.reinvestment_count` | **3** (with on-chain reasoning) |

The SDK reproduces all of this off-chain in a few lines (`new ClarosOracle().getReading(id)`), and the `/network` and `/feeds` pages render it live.

---

## Reading the Data

| Method | Best for | Cost | Runs |
| ------ | -------- | ---- | ---- |
| **REST API** | apps, dashboards, bots, AI agents | free | off-chain (HTTP) |
| **SDK** (`claros-oracle`) | TypeScript / JS backends and scripts | free | off-chain (reads node state) |
| **Cross-contract** | your own Casper smart contract | gas only | on-chain (Casper VM) |
| **x402 metered** | hosted, pay-as-you-go, agent-to-agent | WCSPR / call | off-chain (HTTP + settle) |

```ts
// SDK: read a feed off-chain, no indexer
import { ClarosOracle } from "claros-oracle"
const oracle = new ClarosOracle()                       // testnet defaults baked in
const wti = await oracle.getReading("EIA.PET.PRICE.WTI.DAILY")
console.log(wti.value, wti.unit)                        // 78.94 $/bbl
```

```rust
// Cross-contract: read a feed from your own Casper contract
let v = ClarosValuesContractRef::new(self.env(), attestation_registry);
let m = ClarosMetadataContractRef::new(self.env(), feed_registry);
let att  = v.get_latest("EIA.PET.PRICE.WTI.DAILY".to_string()).unwrap_or_revert(&self.env());
let feed = m.get_feed("EIA.PET.PRICE.WTI.DAILY".to_string()).unwrap_or_revert(&self.env());
// real price = att.amount / 10^feed.decimals
```

The full integration guide (REST endpoints, SDK methods, the cross-contract struct definitions, the x402 flow, and a reference table of every `feed_id` with its decimals and unit) is on the **`/docs`** page.

---

## Project Structure

```
claros/
├── contracts/                     Odra 2.8 smart contracts (Rust)
│   ├── src/
│   │   ├── attestation_registry.rs   values, keyed by feed_id
│   │   ├── feed_registry.rs          self-describing metadata
│   │   ├── treasury_vault.rs         agent reinvest ledger + holdings
│   │   ├── eligibility_gate.rs       ZK Groth16 access gate
│   │   ├── verifier.rs / vk.rs       BN254 Groth16 verifier (forked from Shroud)
│   │   └── lib.rs
│   ├── bin/cli.rs                    odra-cli deploy script
│   └── Odra.toml
│
├── agent/                         autonomous agent (TypeScript, casper-js-sdk 5)
│   └── src/
│       ├── agent-cycle.ts            DeepSeek tool-calling cycle
│       ├── loop.ts                   heartbeat (runs only on new data)
│       ├── signer.ts                 TransactionV1 signer (attest / stake / delegate)
│       ├── tools.ts                  agent tools (attest, reinvest, read_*)
│       ├── eia*.ts                   EIA APIv2 adapter, 37-feed catalog, 232-dataset crawler
│       └── sandiego.ts               San Diego parking adapter
│
├── services/                     off-chain services (TypeScript)
│   ├── claros-api/                   Hermes-style REST read API (:4030)
│   ├── oracle-server/                x402-gated paid feed (:4021)
│   ├── facilitator/                  x402 settlement on Casper (:4022)
│   └── consumer/                     example x402 paying client
│
├── sdk/                          claros-oracle npm SDK (reads Casper state directly)
├── zk-gate/                      ZK eligibility (Circom 2.1 + snarkjs)
│   └── circuits/                     eligibility.circom, MiMC7, Merkle, setup, prover
│
├── web/                          Next.js 16 app (landing + feeds/datasets/docs/network)
├── shared/deployments.json       canonical address record
└── vendor/                       patched odra-casper-rpc-client (gas-price fix)
```

---

## Quick Start

You need the Rust toolchain with [cargo-odra](https://github.com/odradev/cargo-odra) for the contracts, Node 20+ and npm for everything else. Each TypeScript folder (`agent/`, `services/*`, `sdk/`, `web/`) is an independent npm project. Signing on-chain needs a funded Casper testnet key; exercising x402 needs WCSPR.

```bash
git clone https://github.com/HoomanBuilds/claros && cd claros

# 1. contracts (already deployed; build/test locally)
cd contracts && cargo odra test

# 2. agent (needs a funded testnet key + EIA/DeepSeek keys in agent/.env)
cd ../agent && npm install
npm run eia-feeds              # list the feed catalog (no key)
npm run attest-eia-once EIA.PET.PRICE.WTI.DAILY   # fetch + attest one feed
npm run loop                  # autonomous heartbeat (runs cycles on new data)

# 3. read the oracle (no key, free)
cd ../services/claros-api && npm install && npm run dev   # REST API on :4030
# GET http://localhost:4030/v1/feeds/EIA.PET.PRICE.WTI.DAILY

# 4. web app
cd ../../web && npm install && npm run dev                # http://localhost:3000
```

Secrets (Casper key, EIA API key, DeepSeek key, CSPR.cloud key) live only in gitignored `.env` files; see each project's `.env.example`. The web app bakes the testnet addresses in, so it reads live state with no env.

---

## Tech Stack

| Layer | Tools |
| ----- | ----- |
| Smart contracts | Odra 2.8 (Rust), Casper 2.0 `Condor`, `TransactionV1` |
| ZK gate | Groth16 / BN254 (`ark-groth16`, forked from Shroud), Circom 2.1, MiMC7 + 20-level Merkle, snarkjs |
| Agent | TypeScript, `casper-js-sdk` 5.0.12, DeepSeek (OpenAI-compatible tool calling) |
| Payments | x402 (`@x402/*`, `@make-software/casper-x402`), WCSPR `transfer_with_authorization` |
| Yield | WiseLending sCSPR staking (cargo-purse proxy), native Casper delegation |
| Consumption | `claros-oracle` SDK (`@noble/hashes`), Hermes-style REST API |
| Frontend | Next.js 16.1.6, React 19.2.3, Tailwind CSS, Framer Motion |
| Data | U.S. EIA APIv2 (232-dataset crawl), City of San Diego open data |
| Network | Casper testnet (`casper-test`) |

---

## Security and Operational Notes

A few honest notes about the live system:

- **Writes are owner-gated.** Only the agent key can `attest` or `register_feed`; reads are open to anyone (it is public chain state).
- **No floats on-chain.** Values are integers scaled by `10^decimals`; `U512` is unsigned, so the few naturally-signed metrics (e.g. electricity interchange) are intentionally excluded rather than misrepresented.
- **Provenance is the contract.** The sha256 hash the agent attests is computed from the exact upstream row and is identical to the one served over x402, so a buyer can reconcile what they bought against the chain.
- **The agent self-funds, conservatively.** Reinvest sizing is representative testnet sizing (e.g. 500 CSPR), and "hold" is a valid, recorded decision; the on-chain reinvest amounts are nominal demo figures, the reasoning is the substance.
- **x402 vs free reads.** On-chain reads (SDK, cross-contract, the public REST mirror) are free; the x402 endpoint is the metered, hosted path and is what pays for attestations.
- **Upgradable contracts.** All four contracts were deployed upgradable, so fixes do not require new addresses.

---

## For Judges and Reviewers

### Network

| Field | Value |
| ----- | ----- |
| Network | Casper testnet (`casper-test`) |
| RPC | `https://node.testnet.casper.network/rpc` |
| Explorer | `https://testnet.cspr.live` |
| Gas token | CSPR |

### What to Look For

1. **A self-describing oracle, live on-chain.** Open `FeedRegistry` and `AttestationRegistry` on cspr.live and read any feed by `feed_id`: the value is in one, the decimals/unit in the other, and `value = amount / 10^decimals`. 37 feeds, 72 attestations.
2. **An agent that runs itself.** `agent/src/agent-cycle.ts` is a DeepSeek loop that gates on ZK eligibility, anomaly-checks, attests, and decides treasury moves; the heartbeat only acts on new data. Its decisions, with reasoning, are on-chain in `TreasuryVault` (`reinvestment_count` = 3).
3. **Real ZK verification on-chain.** The Groth16 proof was verified by the on-chain `EligibilityGate` ([verify tx](https://testnet.cspr.live/transaction/b3048a56044adb67796f7e94c9c0298700b5cf822b326fd71e8fe8370333a433)); `granted_count` = 1 and the on-chain root matches the allowlist.
4. **It pays for itself.** The x402 feed server settles WCSPR through a self-hosted Casper facilitator, and idle treasury is staked on WiseLending for yield. The agent account holds ~2,380 CSPR.
5. **Verifiable end to end.** The SDK, REST API, and a cross-contract call all return the same numbers as the chain, and the `/feeds`, `/datasets`, and `/network` pages render them live.

### The One-Line Story

Real-world data, attested on-chain on Casper as self-describing feeds by an autonomous agent that anomaly-checks its own inputs, sells reads over x402 to fund its gas, compounds the proceeds into on-chain yield, and gates itself behind a zero-knowledge proof, with every value, decision, and dollar verifiable on-chain.
