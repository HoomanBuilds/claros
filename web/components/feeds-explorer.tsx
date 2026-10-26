"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import {
  family,
  flagshipFirst,
  formatCount,
  formatTimestamp,
  formatValue,
  safePeriod,
  shortHash,
  shortUnit,
  ticker,
  timeAgo,
} from "@/lib/format";
import { useLiveFeeds } from "@/lib/use-live-feeds";
import {
  EmptyState,
  Metrics,
  SearchField,
  SectionHeading,
} from "@/components/product/ui";
import styles from "@/components/product/product.module.css";

const ATTESTATION_PKG =
  "236b510436c60b6a797d175c72c6014de367d43f1de1ca45f580d112f98116cc";
const category = (id: string) => family(id) || "CIVIC REVENUE";
const ARTWORK: Record<string, string> = {
  PET: "road",
  NG: "vault",
  ELEC: "walk",
  COAL: "road",
  NUC: "door",
  CO2: "dunes",
  STEO: "sun",
  DBF: "road",
  INTL: "door",
  SEDS: "walk",
  TOTAL: "dunes",
};
const feedArtwork = (id: string) => {
  if (id.includes("GEN_SUN")) return "sun";
  if (id.includes("L48_WORKING")) return "van";
  return ARTWORK[id.split(".")[1]] || "park";
};

export function FeedsExplorer() {
  const { feeds, stats, updatedAt, loading, error } = useLiveFeeds();
  const [query, setQuery] = useState("");
  const [fam, setFam] = useState("ALL");
  const [sort, setSort] = useState("featured");
  useEffect(() => {
    setQuery(new URLSearchParams(window.location.search).get("q") || "");
  }, []);
  const families = useMemo(
    () => [
      "ALL",
      ...Array.from(new Set(feeds.map((f) => category(f.feed_id)))).sort(),
    ],
    [feeds],
  );
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = flagshipFirst(feeds).filter(
      (f) =>
        (fam === "ALL" || category(f.feed_id) === fam) &&
        (!q ||
          [f.feed_id, ticker(f.feed_id), f.title, f.unit, f.route]
            .join(" ")
            .toLowerCase()
            .includes(q)),
    );
    if (sort === "updated") result.sort((a, b) => b.updated_at - a.updated_at);
    if (sort === "name")
      result.sort((a, b) => ticker(a.feed_id).localeCompare(ticker(b.feed_id)));
    return result;
  }, [feeds, query, fam, sort]);
  const reset = () => {
    setQuery("");
    setFam("ALL");
    setSort("featured");
  };

  return (
    <section aria-label="Feed registry" className={styles.workspace}>
      <Metrics
        items={[
          {
            label: "Feeds available",
            value:
              loading || (error && !feeds.length)
                ? "-"
                : formatCount(stats.feedsLive),
            detail: "Registered on Casper",
          },
          {
            label: "Attestations",
            value:
              loading || (error && !feeds.length)
                ? "-"
                : formatCount(stats.attestations),
            detail: "Provenance recorded on-chain",
          },
          {
            label: "Data families",
            value:
              loading || (error && !feeds.length)
                ? "-"
                : formatCount(families.length - 1),
            detail: "Energy and civic sources",
          },
          {
            label: "Network",
            value: "Testnet",
            detail: "Casper / casper-test",
          },
        ]}
      />
      <SectionHeading
        label="01 / Feed registry"
        title="Readings, not black boxes."
      >
        <a className={styles.inlineLink} href="/docs/reading/rest/">
          Integrate a feed <ExternalLink size={13} />
        </a>
      </SectionHeading>
      {error && (
        <p className={styles.notice} role="alert">
          {feeds.length
            ? "The data connection is interrupted. Showing the last available readings while we retry."
            : "The feed service is unavailable. Retrying automatically. No cached readings are being presented as live."}
        </p>
      )}
      <div className={styles.toolbar}>
        <SearchField
          label="Search feeds"
          value={query}
          onChange={setQuery}
          placeholder="Search WTI, solar, a feed ID, or a dataset route..."
        />
        <div className={styles.toolbarRight}>
          <span className={styles.status} role="status">
            <i className={styles.dot} aria-hidden="true" />
            {loading
              ? "Reading on-chain data..."
              : error
                ? "Connection interrupted"
                : updatedAt
                  ? "API checked " + timeAgo(updatedAt)
                  : "Waiting for data"}
          </span>
          <label className={styles.selectLabel}>
            Sort
            <select
              aria-label="Sort feeds"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="featured">Featured</option>
              <option value="updated">Latest attestation</option>
              <option value="name">Feed name</option>
            </select>
          </label>
        </div>
      </div>
      <div
        className={styles.filters}
        role="group"
        aria-label="Filter feeds by family"
      >
        {families.map((f) => (
          <button
            type="button"
            className={styles.filter}
            key={f}
            aria-pressed={fam === f}
            onClick={() => setFam(f)}
          >
            {f === "ALL" ? "All families" : f}
          </button>
        ))}
      </div>
      <div className={styles.resultLine}>
        <span role="status">
          {loading
            ? "Loading feeds"
            : formatCount(rows.length) +
              " of " +
              formatCount(feeds.length) +
              " feeds"}
        </span>
        {(query || fam !== "ALL") && (
          <button type="button" className={styles.inlineLink} onClick={reset}>
            Reset filters
          </button>
        )}
      </div>
      {rows.length ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className={styles.srOnly}>
              Attested real-world feeds. Reporting periods describe the source
              data, not when this page refreshed.
            </caption>
            <thead>
              <tr>
                <th scope="col">Feed / source family</th>
                <th scope="col" className={styles.numeric}>
                  Reading
                </th>
                <th scope="col">Reporting period</th>
                <th scope="col">Last attested</th>
                <th scope="col">
                  <span className={styles.srOnly}>Verify provenance</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((f, i) => (
                <tr key={f.feed_id}>
                  <td>
                    <div className={styles.feedCell}>
                      <span className={styles.feedArt} aria-hidden="true">
                        <img
                          loading="lazy"
                          src={`/landing/feed-thumbs/${feedArtwork(f.feed_id)}.webp`}
                          width={80}
                          height={64}
                          alt=""
                        />
                        <small>{String(i + 1).padStart(2, "0")}</small>
                      </span>
                      <div className={styles.feedName}>
                        <strong>{ticker(f.feed_id)}</strong>
                        <code>{f.feed_id}</code>
                        <span>{category(f.feed_id)}</span>
                      </div>
                    </div>
                  </td>
                  <td className={styles.reading} data-label="Reading">
                    <strong>{formatValue(f.value, f.decimals)}</strong>
                    <span>{shortUnit(f.unit)}</span>
                  </td>
                  <td data-label="Reporting period">
                    <span className={styles.period}>
                      {safePeriod(f.period, f.frequency)}
                    </span>
                    <span className={styles.meta}>{f.frequency}</span>
                  </td>
                  <td data-label="Last attested">
                    <time
                      className={styles.meta}
                      title={formatTimestamp(f.updated_at)}
                    >
                      {timeAgo(f.updated_at)}
                    </time>
                    <span className={styles.hash} title={f.source_hash}>
                      #{shortHash(f.source_hash, 4)}
                    </span>
                  </td>
                  <td>
                    <a
                      className={styles.verify}
                      href={
                        "https://testnet.cspr.live/contract-package/" +
                        ATTESTATION_PKG
                      }
                      target="_blank"
                      rel="noreferrer"
                      aria-label={"Verify " + ticker(f.feed_id) + " on Casper"}
                    >
                      Verify <ExternalLink size={13} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title={
            loading
              ? "Fetching the latest attestations"
              : error
                ? "Readings are temporarily unavailable"
                : !feeds.length
                  ? "No attestations yet"
                  : "No readings match"
          }
          onReset={
            !loading && !error && (query !== "" || fam !== "ALL")
              ? reset
              : undefined
          }
        >
          {loading
            ? "The registry is being read from AWS. Values appear here when the request completes."
            : error
              ? "The connection will retry automatically. You can still browse the dataset catalog."
              : !feeds.length
                ? "The registry returned no readings. Explore the dataset catalog or check back after an attestation is recorded."
                : "Try another name, feed ID, or source family."}
        </EmptyState>
      )}
      <p className={styles.footnote}>
        Reporting periods show when the source measured a value. Last attested
        shows when it was written on Casper. Refreshing the API does not make an
        old reading fresh.
      </p>
    </section>
  );
}
