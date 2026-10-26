import type { ReactNode } from "react";
import Cell from "@/components/landing/ui/Cell";
import { fontVariables } from "@/components/landing/fonts";
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
  children,
}: {
  active: string;
  number: string;
  title: string;
  description: string;
  image: string;
  children: ReactNode;
}) {
  return (
    <div className={`claros-landing ${fontVariables} ${styles.shell}`}>
      <a href="#main-content" className={styles.skip}>
        Skip to content
      </a>
      <header className={styles.header}>
        <a href="/" className={styles.brand} aria-label="Claros home">
          <Cell />
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
        <section className={styles.pageHead}>
          <div>
            <div className={styles.eyebrow}>
              <span>{number}</span>
              <span>Claros / {active}</span>
            </div>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <div className={styles.headArt} aria-hidden="true">
            <img src={image} alt="" width={320} height={200} />
            <span className={styles.artCaption}>
              <Cell /> Real world. On chain.
            </span>
          </div>
        </section>
        {children}
      </main>
      <footer className={styles.footer}>
        <a className={styles.brand} href="/">
          <Cell />
          <span>Claros</span>
        </a>
        <p>Real-world data. Verifiable on Casper.</p>
        <nav aria-label="Footer">
          <a href="/docs/">Docs</a>
          <a
            href="https://github.com/HoomanBuilds/claros"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          <a
            href="https://www.npmjs.com/package/claros-oracle"
            target="_blank"
            rel="noreferrer"
          >
            SDK
          </a>
          <a href="https://testnet.cspr.live" target="_blank" rel="noreferrer">
            Explorer
          </a>
        </nav>
      </footer>
    </div>
  );
}
