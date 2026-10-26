"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { DatasetRow } from "@/lib/datasets";
import { formatCount } from "@/lib/format";
import { useLiveFeeds } from "@/lib/use-live-feeds";
import {
  EmptyState,
  Metrics,
  SearchField,
  SectionHeading,
} from "@/components/product/ui";
import styles from "@/components/product/product.module.css";

const PAGE_SIZE = 24;
const datasetName = (name: string) => name.replaceAll("\\", " / ");

export function DatasetsExplorer({ datasets }: { datasets: DatasetRow[] }) {
  const { feeds, loading, error } = useLiveFeeds();
  const live = useMemo(() => new Set(feeds.map((feed) => feed.route)), [feeds]);
  const [query, setQuery] = useState("");
  const [fam, setFam] = useState("ALL");
  const [liveOnly, setLiveOnly] = useState(false);
  const [page, setPage] = useState(0);
  const families = useMemo(
    () => ["ALL", ...Array.from(new Set(datasets.map((d) => d.family))).sort()],
    [datasets],
  );
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return datasets.filter(
      (d) =>
        (fam === "ALL" || d.family === fam) &&
        (!liveOnly || live.has(d.route)) &&
        (!q ||
          [d.route, d.name, datasetName(d.name), ...d.columns, ...d.facets]
            .join(" ")
            .toLowerCase()
            .includes(q)),
    );
  }, [datasets, query, fam, liveOnly, live]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const visible = rows.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const reset = () => {
    setQuery("");
    setFam("ALL");
    setLiveOnly(false);
    setPage(0);
  };
  const coverageKnown = !loading && (!error || feeds.length > 0);
  const covered = datasets.filter((d) => live.has(d.route)).length;
  const changePage = (next: number) => {
    setPage(next);
    document
      .getElementById("catalog-results")
      ?.scrollIntoView({ block: "start" });
  };

  return (
    <section
      aria-label="Dataset catalog"
      className={`${styles.workspace} ${styles.paper}`}
    >
      <Metrics
        items={[
          {
            label: "Datasets mapped",
            value: formatCount(datasets.length),
            detail: "EIA API v2 catalog",
          },
          {
            label: "With live feeds",
            value: coverageKnown ? formatCount(covered) : "-",
            detail: "At least one attested series",
          },
          {
            label: "Data families",
            value: formatCount(families.length - 1),
            detail: "Across the energy economy",
          },
          {
            label: "Source",
            value: "US EIA",
            detail: "Public energy datasets",
          },
        ]}
      />
      <SectionHeading
        label="02 / Source catalog"
        title="An open field of data."
      >
        <a className={styles.primaryButton} href="/docs/catalog/request/">
          Request a feed <ArrowUpRight size={15} />
        </a>
      </SectionHeading>
      {error && (
        <p role="alert" className={styles.notice}>
          The catalog is available, but live coverage could not be refreshed.
          {feeds.length
            ? " Coverage labels use the last available readings."
            : " Coverage labels are unavailable until the connection recovers."}
        </p>
      )}
      <div className={styles.toolbar}>
        <SearchField
          label="Search datasets"
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(0);
          }}
          placeholder="Search crude oil, storage, retail, or a data field..."
        />
        <div className={styles.toolbarRight}>
          <span className={styles.status} role="status">
            {loading
              ? "Checking live coverage..."
              : error
                ? "Live coverage interrupted"
                : "Coverage checked against attested feeds"}
          </span>
          <button
            type="button"
            className={styles.filter}
            aria-pressed={liveOnly}
            disabled={!coverageKnown}
            onClick={() => {
              setLiveOnly((value) => !value);
              setPage(0);
            }}
          >
            With live feeds
            {coverageKnown ? " (" + formatCount(covered) + ")" : ""}
          </button>
        </div>
      </div>
      <div
        className={styles.filters}
        role="group"
        aria-label="Filter datasets by family"
      >
        {families.map((f) => (
          <button
            type="button"
            className={styles.filter}
            key={f}
            aria-pressed={fam === f}
            onClick={() => {
              setFam(f);
              setPage(0);
            }}
          >
            {f === "ALL" ? "All families" : f}
          </button>
        ))}
      </div>
      <div className={styles.resultLine} id="catalog-results">
        <span role="status">
          {rows.length
            ? current * PAGE_SIZE +
              1 +
              "-" +
              Math.min((current + 1) * PAGE_SIZE, rows.length)
            : "0"}{" "}
          of {formatCount(rows.length)} datasets
        </span>
        {(query || fam !== "ALL" || liveOnly) && (
          <button className={styles.inlineLink} type="button" onClick={reset}>
            Reset filters
          </button>
        )}
      </div>
      {visible.length ? (
        <div className={styles.datasetGrid}>
          {visible.map((d, index) => {
            const isLive = live.has(d.route);
            return (
              <article className={styles.datasetCard} key={d.route}>
                <div className={styles.cardTop}>
                  <span className={styles.catalogIndex} aria-hidden="true">
                    {String(current * PAGE_SIZE + index + 1).padStart(3, "0")}
                  </span>
                  <span
                    className={styles.badge}
                    data-muted={!isLive || undefined}
                  >
                    {isLive
                      ? "Has live feeds"
                      : coverageKnown
                        ? "Mapped"
                        : loading
                          ? "Checking"
                          : "Status unknown"}
                  </span>
                </div>
                <span className={styles.kicker}>{d.family}</span>
                <h3>{datasetName(d.name)}</h3>
                <code className={styles.route}>{d.route}</code>
                <div className={styles.tags}>
                  {d.frequencies.length ? (
                    d.frequencies.map((f) => <span key={f}>{f}</span>)
                  ) : (
                    <span>Cadence not listed</span>
                  )}
                </div>
                <details className={styles.schema}>
                  <summary>
                    {formatCount(d.columns.length)} data fields ·{" "}
                    {formatCount(d.facets.length)} filters
                  </summary>
                  <p>
                    <strong>Fields:</strong>{" "}
                    {d.columns.join(", ") || "None listed"}
                  </p>
                  <p>
                    <strong>Filters:</strong>{" "}
                    {d.facets.join(", ") || "None listed"}
                  </p>
                </details>
                <a
                  className={styles.cardLink}
                  href={
                    isLive
                      ? "/feeds/?q=" + encodeURIComponent(d.route)
                      : "/docs/catalog/request/"
                  }
                >
                  {isLive ? "Browse its feeds" : "Request an attester"}
                  <ArrowUpRight size={15} />
                </a>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No datasets match" onReset={reset}>
          Try another keyword or family, or turn off the live-feed filter.
        </EmptyState>
      )}
      {rows.length > PAGE_SIZE && (
        <nav className={styles.pagination} aria-label="Catalog pagination">
          <span>
            Page {current + 1} of {pages}
          </span>
          <div>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={current === 0}
              onClick={() => changePage(current - 1)}
            >
              <ChevronLeft size={15} /> Previous
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={current === pages - 1}
              onClick={() => changePage(current + 1)}
            >
              Next <ChevronRight size={15} />
            </button>
          </div>
        </nav>
      )}
      <p className={styles.footnote}>
        Mapped datasets are available for integration, not necessarily attested
        on-chain. A live badge means at least one series from that dataset has
        an attested reading.
      </p>
    </section>
  );
}
