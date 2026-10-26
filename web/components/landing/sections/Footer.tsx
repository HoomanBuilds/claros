"use client";

import { useEffect, useRef, useState } from "react";
import { Arrow } from "@/components/landing/ui/Button";
import { gsap, useGSAP } from "@/lib/landing/gsap";
import styles from "./Footer.module.css";

const DOCS = "/docs";

const COLUMNS = [
  {
    title: "Product",
    links: [
      ["Live feeds", "/feeds"],
      ["Datasets", "/datasets"],
      ["Network", "/network"],
      ["Docs", DOCS],
    ],
  },
  {
    title: "Read",
    links: [
      ["REST API", `${DOCS}/reading/rest`],
      ["SDK", `${DOCS}/reading/sdk`],
      ["From a contract", `${DOCS}/reading/on-chain`],
      ["Pay per call", `${DOCS}/reading/x402`],
    ],
  },
  {
    title: "Operate",
    links: [
      ["Run an agent", `${DOCS}/network/run-an-agent`],
      ["The agent", `${DOCS}/network/agent`],
      ["ZK gate", `${DOCS}/network/zk-gate`],
      ["Contracts", `${DOCS}/network/contracts`],
    ],
  },
  {
    title: "Source",
    links: [
      ["GitHub", "https://github.com/HoomanBuilds/claros"],
      ["npm", "https://www.npmjs.com/package/claros-oracle"],
      ["Explorer", "https://testnet.cspr.live"],
    ],
  },
];

const ANNOTATIONS = [
  { text: "Attested", className: "private" },
  { text: "Self-describing", className: "final" },
  { text: "Verifiable", className: "verifiable" },
  { text: "On Casper", className: "onchain" },
] as const;

const INSTALL = "npm install claros-oracle";

export default function Footer() {
  const root = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const timeline = gsap.timeline({
          scrollTrigger: { trigger: `.${styles.wordmark}`, start: "top 90%" },
          defaults: { ease: "power3.out" },
        });
        timeline
          .from(`.${styles.letters} span`, {
            yPercent: 100,
            duration: 1.1,
            stagger: 0.05,
          })
          .from(
            `.${styles.annotation} i`,
            { scale: 0, duration: 0.8, stagger: 0.1 },
            0.5,
          )
          .from(
            `.${styles.annotation} b`,
            { opacity: 0, y: 8, duration: 0.6, stagger: 0.1 },
            0.7,
          );
      });
      return () => media.revert();
    },
    { scope: root },
  );

  const copy = async () => {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(INSTALL);
      setCopied(true);
      setCopyError(false);
      timer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyError(true);
      root.current?.querySelector("input")?.select();
    }
  };

  return (
    <footer ref={root} className={styles.footer} data-theme="dark">
      <div className={`container ${styles.top}`}>
        <div className={styles.newsletter}>
          <h2 className={styles.newsTitle}>Read a feed in one line</h2>
          <div className={styles.form}>
            <input
              className="mono"
              value={INSTALL}
              readOnly
              aria-label="Install command"
              onFocus={(event) => event.currentTarget.select()}
            />
            <button
              type="button"
              aria-label="Copy the install command"
              onClick={copy}
              data-sfx="cta"
              data-cursor={copied ? "Copied" : "Copy"}
            >
              <Arrow />
            </button>
          </div>
          <p className={styles.formNote} role="status">
            {copied
              ? "Copied. Then: new ClarosOracle().getReading(id)"
              : copyError
                ? "Select the command and copy it manually."
                : "Casper testnet defaults are built in."}
          </p>
          <div className={styles.built}>
            <span className="label">Built with</span>
            <a
              href="https://casper.network"
              target="_blank"
              rel="noreferrer"
              data-sfx="ui"
            >
              <img
                loading="lazy"
                className={styles.casper}
                src="/landing/partners/casper.svg"
                alt="Casper"
              />
            </a>
            <a
              href="https://www.x402.org"
              target="_blank"
              rel="noreferrer"
              data-sfx="ui"
            >
              <img
                loading="lazy"
                className={styles.x402}
                src="/landing/partners/x402.svg"
                alt="x402"
              />
            </a>
          </div>
        </div>

        <nav className={styles.columns} aria-label="Footer">
          {COLUMNS.map(({ title, links }) => (
            <div key={title}>
              <p className="label">{title}</p>
              <ul>
                {links.map(([label, href]) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      data-sfx="ui"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div
        className={`container ${styles.wordmark}`}
        role="img"
        aria-label="Claros"
      >
        <div className={styles.letters} aria-hidden="true">
          {"CLAROS".split("").map((letter, index) => (
            <span key={index}>{letter}</span>
          ))}
        </div>
        {ANNOTATIONS.map(({ text, className }) => (
          <span
            key={text}
            className={`${styles.annotation} ${styles[className]}`}
            aria-hidden="true"
          >
            <i />
            <b>{text}</b>
          </span>
        ))}
      </div>

      <div className={`container ${styles.legal}`}>
        <span>© 2026 Claros</span>
        <span className={styles.credits}>
          Data from the U.S. EIA and the City of San Diego. Values are
          attestations on Casper testnet.
        </span>
      </div>
    </footer>
  );
}
