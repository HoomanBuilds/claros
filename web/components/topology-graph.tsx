"use client";

import { useState } from "react";
import { ArrowUpRight, Coins, ShieldCheck } from "lucide-react";
import styles from "@/components/product/network.module.css";

const NODES = [
  {
    id: "source",
    title: "Real-world sources",
    caption: "EIA + civic data",
    art: "/landing/feed-thumbs/road.webp",
    heading: "Start with an observation.",
    detail:
      "Energy prices, grid activity, and civic revenue arrive with their source, unit, and reporting period. A new attestation does not make an old observation fresh.",
    href: "/datasets/",
    action: "Explore the source catalog",
  },
  {
    id: "agent",
    title: "Oracle agents",
    caption: "Fetch, normalize, sign",
    art: "/landing/penumbra/orb.webp",
    heading: "Agents carry the data.",
    detail:
      "An agent fetches the source payload, normalizes its value, hashes its provenance, and signs the attestation. The source hash stays with the on-chain reading.",
    href: "/docs/network/agent/",
    action: "Meet the agent",
  },
  {
    id: "registry",
    title: "Casper contracts",
    caption: "Values + provenance",
    art: "/landing/partners/casper.svg",
    heading: "Contracts are the trust boundary.",
    detail:
      "The registries store readings and their metadata on Casper. Eligibility controls who can attest; an attestation records a claim and its provenance, not independent proof that the source is correct.",
    href: "#contracts",
    action: "Inspect the contracts",
  },
  {
    id: "reader",
    title: "Data consumers",
    caption: "Contracts, apps, agents",
    art: "/landing/penumbra/cone.webp",
    heading: "Read it. Verify its origin.",
    detail:
      "Consumers read through a contract, the REST API, or the SDK. Each reading includes its reporting period and source hash so an integration can check what it is using.",
    href: "/docs/reading/rest/",
    action: "Read your first feed",
  },
  {
    id: "gate",
    title: "Eligibility gate",
    heading: "Prove membership. Keep the secret.",
    detail:
      "Operators prove allowlist membership through the Groth16 eligibility gate without publishing their membership secret. This is an access check, not multi-attester consensus.",
    href: "/docs/network/zk-gate/",
    action: "Understand the ZK gate",
  },
  {
    id: "payments",
    title: "x402 payments",
    heading: "Paid reads can fund the next write.",
    detail:
      "For a paid API read, the facilitator verifies and settles WCSPR to the attester. That revenue can help cover future attestation costs. This diagram does not show measured revenue or current traffic.",
    href: "/docs/reading/x402/",
    action: "Explore paid reads",
  },
];

export function TopologyGraph() {
  const [selected, setSelected] = useState("registry");
  const active = NODES.find((node) => node.id === selected)!;

  return (
    <div className={styles.topology}>
      <div
        className={styles.map}
        role="group"
        aria-label="Explore the network architecture"
      >
        <div className={styles.trustZone} aria-hidden="true">
          <span>Trust boundary</span>
        </div>
        <svg
          className={styles.wires}
          viewBox="0 0 1200 400"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <marker
              id="network-direction"
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path
                d="M1 1L7 4L1 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </marker>
          </defs>
          <g className={styles.dataWires} markerMid="url(#network-direction)">
            <path d="M150 160H300H450" />
            <path d="M450 160H600H750" />
            <path d="M750 160H900H1050" />
            <path d="M750 58V74V110" strokeDasharray="3 5" />
          </g>
          <path
            className={styles.paymentWire}
            d="M1050 280V350H450V280"
            markerEnd="url(#network-direction)"
          />
        </svg>
        <button
          type="button"
          className={styles.gate}
          aria-pressed={selected === "gate"}
          aria-controls="network-detail"
          onClick={() => setSelected("gate")}
        >
          <ShieldCheck size={16} aria-hidden="true" /> ZK eligibility{" "}
          <span aria-hidden="true">+</span>
        </button>
        <div className={styles.edgeLabels} aria-hidden="true">
          <span>Fetch</span>
          <span>Attest</span>
          <span>Read</span>
        </div>
        <ol className={styles.actors} aria-label="Data attestation flow">
          {NODES.slice(0, 4).map((node, index) => (
            <li key={node.id}>
              <button
                type="button"
                className={styles.actor}
                data-node={node.id}
                aria-pressed={selected === node.id}
                aria-controls="network-detail"
                onClick={() => setSelected(node.id)}
              >
                <span className={styles.nodeArt}>
                  <img src={node.art} width={128} height={128} alt="" />
                  <span className={styles.nodeIndex} aria-hidden="true">
                    0{index + 1}
                  </span>
                </span>
                <span className={styles.nodeTitle}>{node.title}</span>
                <span className={styles.nodeCaption}>{node.caption}</span>
              </button>
            </li>
          ))}
        </ol>
        <button
          type="button"
          className={styles.payment}
          aria-pressed={selected === "payments"}
          aria-controls="network-detail"
          onClick={() => setSelected("payments")}
        >
          <Coins size={16} aria-hidden="true" /> x402 paid reads{" "}
          <span aria-hidden="true">+</span>
        </button>
      </div>
      <div className={styles.legend}>
        <span>
          <i /> Data <i className={styles.returnKey} /> Payment return
        </span>
        <span>Select a component. Architecture, not live traffic.</span>
      </div>
      <div
        id="network-detail"
        className={styles.detail}
        aria-live="polite"
        aria-atomic="true"
      >
        <div>
          <span className={styles.detailLabel}>{active.title}</span>
          <h3>{active.heading}</h3>
        </div>
        <div>
          <p>{active.detail}</p>
          <a href={active.href}>
            {active.action} <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
}
