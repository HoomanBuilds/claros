# Casper Forward Builder Application

## Project name

Claros

## Team / primary contact

Shreyas Patil

## Email or preferred contact

shreyassp002@gmail.com

## What does your project do?

Claros is a self-sustaining real-world data oracle network built on Casper. Autonomous agents fetch authoritative energy and civic data, validate each reading, hash its provenance, and attest it on-chain as a self-describing feed.

Casper applications can consume the data through smart contracts, an npm SDK, a REST API, or a metered x402 endpoint. x402 payments in WCSPR help fund oracle operations, while a Groth16 zero-knowledge eligibility gate allows independent operators to join, claim feeds, attest data using their own keys, and earn from paid reads.

Claros currently provides 38 live feeds from a catalog of 232 datasets. It is designed for RWA protocols, DeFi, prediction markets, energy and carbon products, and parametric insurance.

## What stage is the project currently at?

Testnet

The product and supporting services are live, but the contracts are currently deployed on Casper Testnet.

## What is the last milestone or goal achieved?

Claros won 2nd place at the Casper Agentic Buildathon 2026.

We delivered a complete working testnet deployment with four Odra smart contracts, 38 live oracle feeds, two independent oracle operators, a Groth16 eligibility system, an npm SDK, public REST APIs, and a working x402 payment flow that settles WCSPR payments on Casper.

## What are your main technical needs or blockers right now?

Our main challenge is moving from a working testnet prototype to a production-grade decentralized oracle network.

We need:

- Security review and audit support for the Odra contracts, Groth16 verifier, and x402 settlement flow
- Guidance on Casper mainnet deployment, contract upgrades, and production infrastructure
- Multi-attester aggregation, reputation, and dispute-handling mechanisms
- Reliable production RPC and indexing infrastructure
- Pilot integrations with Casper DeFi and RWA applications that can consume Claros feeds

## What is your next goal for the project on Casper?

Our next goal is to launch a production-ready mainnet pilot on Casper.

The target milestone is to complete contract hardening and security review, add multi-attester aggregation and dispute handling, deploy the Claros contracts and services on mainnet, onboard at least five independent oracle operators, expand the production feed catalog, and complete integrations with at least two Casper DeFi or RWA applications.

## Project links

Website: https://claros-oracle.vercel.app

Documentation: https://claros-oracle.vercel.app/docs

Live feeds: https://claros-oracle.vercel.app/feeds

Network dashboard: https://claros-oracle.vercel.app/network

GitHub: https://github.com/HoomanBuilds/claros

npm SDK: https://www.npmjs.com/package/claros-oracle

## Social profiles and usernames

GitHub: @HoomanBuilds

X/Twitter: [add your personal X username]

Project X/Twitter: [add the Claros username if available]
