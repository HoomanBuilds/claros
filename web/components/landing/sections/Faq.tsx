"use client";

import { useId, useState } from "react";
import Button from "@/components/landing/ui/Button";
import Cell from "@/components/landing/ui/Cell";
import styles from "./Faq.module.css";

const QUESTIONS = [
  {
    q: "What is Claros?",
    a: "A verifiable real-world-data oracle on Casper. An agent reads trusted public sources, energy data from the EIA and civic feeds such as San Diego's parking revenue, attests each value on chain with its provenance, and exposes it as a self-describing feed anyone reads by feed_id.",
  },
  {
    q: "What does it cost to read a feed?",
    a: "Nothing off chain: the REST API and the claros-oracle SDK need no key, no wallet and no indexer. A contract reading the registries pays only gas. The hosted x402 endpoint charges 1 WCSPR a read, paid straight to the agent that attested it.",
  },
  {
    q: "How do I know a value is real?",
    a: "Every attestation carries its reporting period, a source_hash of the upstream payload, the attester's address and a block timestamp. Recompute the hash from the source and compare it with the registry, or open the attestation on cspr.live.",
  },
  {
    q: "Why an integer and decimals?",
    a: "Contracts have no floating point, so each value is an unsigned integer at the feed's fixed decimals, the way Pyth ships a price with its exponent. The decimals sit on chain beside the value, so you never hardcode them: value = amount / 10^decimals.",
  },
  {
    q: "Who can write a feed?",
    a: "Only its claimant. An operator first clears the EligibilityGate with a Groth16 proof of allowlist membership, then registers a feed, which claims it on chain. attest reverts for anyone else, so every value has one signer.",
  },
  {
    q: "How fresh is the data?",
    a: "The agent wakes every hour and attests only when a source publishes a period it hasn't processed. Each feed states its own frequency, from hourly grid demand to annual reserves.",
  },
];

export default function Faq() {
  const [open, setOpen] = useState(0);
  const id = useId();

  return (
    <section className={styles.faq} data-theme="dark">
      <div className={`container ${styles.inner}`}>
        <div className={styles.intro}>
          <h2 className={styles.title} data-reveal>
            Questions
          </h2>
          <p data-reveal>
            Short answers to what builders and operators ask first. The docs go
            deeper, down to the contract types.
          </p>
          <div data-reveal>
            <Button href="/docs" variant="pill">
              Read the docs
            </Button>
          </div>
        </div>

        <ul className={styles.list}>
          {QUESTIONS.map(({ q, a }, index) => {
            const expanded = open === index;
            return (
              <li
                key={q}
                className={styles.item}
                data-open={expanded || undefined}
                data-reveal
              >
                <button
                  type="button"
                  className={styles.question}
                  aria-expanded={expanded}
                  aria-controls={`${id}-${index}`}
                  onClick={() => setOpen(expanded ? -1 : index)}
                  data-sfx="ui"
                >
                  <Cell className={styles.cell} />
                  <span>{q}</span>

                  <img
                    className={styles.chevron}
                    src="/landing/penumbra/plus.svg"
                    alt=""
                  />
                </button>
                <div
                  id={`${id}-${index}`}
                  className={styles.answer}
                  role="region"
                  aria-hidden={!expanded}
                >
                  <div>
                    <p>{a}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
