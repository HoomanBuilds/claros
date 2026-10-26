"use client";

import { useState } from "react";
import { Coins, ExternalLink, TrendingUp, TriangleAlert } from "lucide-react";
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
import network from "@/components/product/network.module.css";

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
      <div className={network.overview}>
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
      </div>
      {snapshot.liquidCspr === 0 && (
        <p className={network.gasNotice}>
          <TriangleAlert size={17} aria-hidden="true" />
          No liquid CSPR available for the primary agent's gas.
        </p>
      )}
      <div className={network.subheading}>
        <h3>Venues considered</h3>
        <span>Expand a venue for details</span>
      </div>
      <div className={network.venues}>
        {VENUES.map((venue) => {
          const Icon = venue.icon;
          const active = Array.from(chosen).some(
            (key) => key === venue.key || key.startsWith(venue.key + "_"),
          );
          return (
            <details className={network.venue} key={venue.key}>
              <summary>
                <Icon size={22} aria-hidden="true" />
                <span>
                  <strong>{venue.label}</strong>
                  <small>
                    {venue.token} ·{" "}
                    {active ? "Recorded selection" : "Available venue"}
                  </small>
                </span>
              </summary>
              <p>{venue.role}</p>
              <a
                className={styles.inlineLink}
                href={venue.href}
                target="_blank"
                rel="noreferrer"
              >
                Inspect venue <ExternalLink size={13} />
              </a>
            </details>
          );
        })}
      </div>
      <SectionHeading
        label="Decision ledger"
        title="Every decision leaves a trail."
      >
        <span className={styles.status}>
          {formatCount(snapshot.reinvestCount)} entries
        </span>
      </SectionHeading>
      <p className={styles.sectionIntro}>
        Decision records are not proof of completed deposits or realized yield.
      </p>
      {ledger.length ? (
        <div className={network.ledger}>
          {ledger.map((entry) => (
            <details
              className={network.entry}
              name="treasury-decisions"
              key={entry.index}
            >
              <summary>
                <span className={network.entryIndex}>
                  #{formatCount(entry.index)}
                </span>
                <span className={network.entryName}>
                  <strong>{entry.venue.replace(/_/g, " ")}</strong>
                  <small>View reasoning and recorded amounts</small>
                </span>
                <time title={formatTimestamp(entry.timestamp)}>
                  {timeAgo(entry.timestamp)}
                </time>
              </summary>
              <div className={network.entryBody}>
                <p>{entry.reasoning}</p>
                <dl className={network.amounts}>
                  <div>
                    <dt>Recorded input</dt>
                    <dd>
                      {formatLedgerAmount(entry.amount_in)} contract units
                    </dd>
                  </div>
                  <div>
                    <dt>Recorded output</dt>
                    <dd>
                      {formatLedgerAmount(entry.amount_out)} contract units
                    </dd>
                  </div>
                </dl>
                <small>
                  Recorded {formatTimestamp(entry.timestamp)}. Amounts are
                  unscaled ledger integers; this record does not specify token
                  decimals.
                </small>
              </div>
            </details>
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
        Testnet records. New decisions appear after the next treasury refresh.
      </p>
    </>
  );
}
