"use client";

import { useState } from "react";
import { Coins, ExternalLink, TrendingUp } from "lucide-react";
import type { TreasurySnapshot } from "@/lib/format";
import {
  formatCount,
  formatCspr,
  formatLedgerAmount,
  formatTimestamp,
  timeAgo,
} from "@/lib/format";
import { EmptyState, Metrics, SectionHeading } from "@/components/product/ui";
import styles from "@/components/product/product.module.css";

const VENUES = [
  {
    key: "wiselending",
    label: "WiseLending",
    token: "sCSPR",
    icon: Coins,
    role: "Liquid staking converts CSPR into yield-bearing sCSPR. Selection is recorded in the decision ledger.",
    href: "https://testnet.cspr.live/contract-package/baa50d1500aa5361c497c06b40f2822ebb0b5fce5b1c3a037ea628cb68d920f3",
  },
  {
    key: "native_delegation",
    label: "Native delegation",
    token: "CSPR",
    icon: TrendingUp,
    role: "Delegating CSPR to a validator can earn protocol staking rewards across eras.",
    href: "https://testnet.cspr.live/validator/0106ca7c39cd272dbf21a86eeb3b36b7c26e2e9b94af64292419f7862936bca2ca",
  },
  {
    key: "cspr_trade",
    label: "CSPR.trade",
    token: "DEX",
    icon: TrendingUp,
    role: "A swap venue available to evaluate alongside staking. An evaluated venue is not a confirmed allocation.",
    href: "https://www.cspr.trade",
  },
];

export function TreasuryPanel({ snapshot }: { snapshot: TreasurySnapshot }) {
  const [expanded, setExpanded] = useState(false);
  const ledger = expanded ? snapshot.ledger : snapshot.ledger.slice(0, 5);
  const chosen = new Set(
    snapshot.venues.filter((v) => v.amount > 0).map((v) => v.key.toLowerCase()),
  );
  const last = snapshot.ledger[0];
  return (
    <>
      {snapshot.liquidCspr === 0 && (
        <p className={styles.notice}>
          The primary agent has no liquid CSPR for gas. This does not indicate
          whether independent operators are running.
        </p>
      )}
      <Metrics
        items={[
          {
            label: "Agent liquid",
            value: (
              <>
                {formatCspr(snapshot.liquidCspr)}
                <small>CSPR</small>
              </>
            ),
            detail: "Primary account balance",
          },
          {
            label: "Recorded decisions",
            value: formatCount(snapshot.reinvestCount),
            detail: "On-chain ledger entries",
          },
          {
            label: "Most selected",
            value: snapshot.reinvestCount
              ? snapshot.primaryVenue.split(" (")[0]
              : "-",
            detail: "By recorded input, not settled yield",
          },
          {
            label: "Last decision",
            value: last ? timeAgo(last.timestamp) : "-",
            detail: last
              ? formatTimestamp(last.timestamp)
              : "No decisions recorded",
          },
        ]}
      />
      <SectionHeading
        label="Yield venues"
        title="Considered, not blindly allocated."
      />
      <div className={styles.venueGrid}>
        {VENUES.map((venue) => {
          const Icon = venue.icon;
          const active = Array.from(chosen).some(
            (key) => key === venue.key || key.startsWith(venue.key + "_"),
          );
          return (
            <article className={styles.venue} key={venue.key}>
              <div className={styles.cardTop}>
                <Icon size={22} />
                <span
                  className={styles.badge}
                  data-muted={!active || undefined}
                >
                  {active ? "Recorded selection" : "Available venue"}
                </span>
              </div>
              <h3>{venue.label}</h3>
              <span className={styles.kicker}>{venue.token}</span>
              <p>{venue.role}</p>
              <a
                className={styles.inlineLink}
                href={venue.href}
                target="_blank"
                rel="noreferrer"
              >
                Inspect venue <ExternalLink size={13} />
              </a>
            </article>
          );
        })}
      </div>
      <SectionHeading
        label="Decision ledger"
        title="The reasoning stays with the record."
      >
        <span className={styles.status}>
          {formatCount(snapshot.reinvestCount)} entries
        </span>
      </SectionHeading>
      <p className={styles.sectionIntro}>
        These entries record the agent's decisions. They do not, by themselves,
        prove a completed venue deposit or realized yield.
      </p>
      {ledger.length ? (
        <div className={styles.ledger}>
          {ledger.map((entry) => (
            <article className={styles.ledgerEntry} key={entry.index}>
              <div className={styles.cardTop}>
                <span className={styles.badge}>
                  {entry.venue.replace(/_/g, " ")}
                </span>
                <time title={formatTimestamp(entry.timestamp)}>
                  #{entry.index} · {timeAgo(entry.timestamp)}
                </time>
              </div>
              <p>{entry.reasoning}</p>
              <details className={styles.schema}>
                <summary>Inspect recorded amounts</summary>
                <p>
                  Input: {formatLedgerAmount(entry.amount_in)} contract units.
                  Output: {formatLedgerAmount(entry.amount_out)} contract units.
                </p>
                <p>
                  Recorded {formatTimestamp(entry.timestamp)}. Amounts are
                  unscaled ledger integers; this record does not specify token
                  decimals.
                </p>
              </details>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No treasury decisions yet">
          Recorded decisions and their reasoning will appear here.
        </EmptyState>
      )}
      {snapshot.ledger.length > 5 && (
        <div className={styles.pagination}>
          <span>
            Showing {ledger.length} of {snapshot.ledger.length} records
          </span>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Show latest five" : "Show all decisions"}
          </button>
        </div>
      )}
      <p className={styles.footnote}>
        Testnet figures. A zero balance is shown as zero, not as missing data.
        Newly finalized decisions appear on the next treasury refresh.
      </p>
    </>
  );
}
