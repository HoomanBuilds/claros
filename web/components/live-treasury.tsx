"use client";

import { TreasuryPanel } from "./treasury-panel";
import { useApiData } from "@/lib/use-api-data";
import type { TreasurySnapshot } from "@/lib/format";
import { EmptyState, SectionHeading } from "@/components/product/ui";
import styles from "@/components/product/product.module.css";

export function LiveTreasury() {
  const { data, error, loading } = useApiData<TreasurySnapshot>(
    "/v1/treasury",
    120_000,
  );
  return (
    <section
      id="treasury"
      className={`${styles.section} ${styles.paper}`}
      aria-label="Agent treasury"
    >
      <SectionHeading
        label="Primary agent / TreasuryVault"
        title="What keeps it running."
      >
        <a
          className={styles.inlineLink}
          href="https://testnet.cspr.live/contract-package/a90b082d863c5977c6e54654fec10e523a38760529e664a87e9e8a8e887ffd7b"
          target="_blank"
          rel="noreferrer"
        >
          Verify the vault
        </a>
      </SectionHeading>
      <p className={styles.sectionIntro}>
        Primary agent only. On-chain balances and decisions, not network-wide
        health.
      </p>
      {error && (
        <p className={styles.notice} role="alert">
          The treasury connection is interrupted.
          {data
            ? " Showing the last available snapshot while we retry."
            : " Retrying automatically."}
        </p>
      )}
      {data ? (
        <TreasuryPanel snapshot={data} />
      ) : (
        <EmptyState
          title={
            loading ? "Reading the treasury" : "Treasury data is unavailable"
          }
        >
          {loading
            ? "Fetching the on-chain balance and decision ledger."
            : "The connection will retry automatically. The deployed contracts are still linked below."}
        </EmptyState>
      )}
    </section>
  );
}
