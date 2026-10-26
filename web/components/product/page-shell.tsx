import type { ReactNode } from "react";
import Cell from "@/components/landing/ui/Cell";
import Footer from "@/components/landing/sections/Footer";
import { fontVariables } from "@/components/landing/fonts";
import headerStyles from "@/components/landing/Header.module.css";
import "@/components/landing/landing.css";
import styles from "./product.module.css";

const LINKS = [
  ["Feeds", "/feeds/"],
  ["Datasets", "/datasets/"],
  ["Network", "/network/"],
  ["Docs", "/docs/"],
];

export function PageShell({
  active,
  number,
  title,
  description,
  image,
  compact = false,
  children,
}: {
  active: string;
  number: string;
  title: ReactNode;
  description: string;
  image: string;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`claros-landing ${fontVariables} ${styles.shell}`}>
      <div className="grain" aria-hidden="true" />
      <a href="#main-content" className={styles.skip}>
        Skip to content
      </a>
      <header className={styles.header}>
        <a href="/" className={headerStyles.brand} aria-label="Claros home">
          <Cell className={headerStyles.mark} />
          <span>Claros</span>
        </a>
        <nav aria-label="Main navigation" className={styles.nav}>
          {LINKS.map(([label, href]) => (
            <a
              key={href}
              href={href}
              aria-current={active === label ? "page" : undefined}
            >
              {label}
            </a>
          ))}
        </nav>
        <span className={styles.networkBadge}>
          <i /> Casper testnet
        </span>
      </header>
      <main id="main-content" className={styles.main}>
        <section
          className={`${styles.pageHead} ${compact ? styles.compactHead : ""}`}
          aria-label={`${active} introduction`}
        >
          <div className={styles.headArt} aria-hidden="true">
            <img
              src={image}
              alt=""
              width={960}
              height={720}
              fetchPriority="high"
            />
            <span className={styles.artCaption}>
              <Cell /> Fig. {number} / Real world. On chain.
            </span>
          </div>
          <div className={styles.headCopy}>
            <div className={styles.eyebrow}>
              <span>Explore {number}</span>
              <span>{active}</span>
            </div>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        </section>
        {children}
      </main>
      <Footer />
    </div>
  );
}
