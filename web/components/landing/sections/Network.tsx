"use client";

import { useRef } from "react";
import PhaseTag from "@/components/landing/ui/PhaseTag";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/landing/gsap";
import { useLandingFeeds } from "@/lib/landing/feeds";
import { sound } from "@/lib/landing/sound";
import styles from "./Network.module.css";

const ROLES = [
  {
    name: "The agent",
    job: "Attests on an hourly heartbeat and runs its own treasury",
    art: "/landing/penumbra/orb.webp",
  },
  {
    name: "Operators",
    job: "Prove in, claim a feed, attest it and earn per read",
    art: "/landing/penumbra/chevron.webp",
  },
  {
    name: "Facilitator",
    job: "Verifies and settles each x402 payment on Casper",
    art: "/landing/penumbra/arc.webp",
  },
  {
    name: "Readers",
    job: "Contracts, apps and agents, reading by feed_id",
    art: "/landing/penumbra/cone.webp",
  },
];

const CONTRACTS = [
  {
    name: "AttestationRegistry",
    hash: "236b510436c60b6a797d175c72c6014de367d43f1de1ca45f580d112f98116cc",
    role: "Values",
  },
  {
    name: "FeedRegistry",
    hash: "741cc223c14c2c00c9f06d7bb5c4be2f824fbf0c8b09a147bf1835570bddf5b6",
    role: "Metadata",
  },
  {
    name: "EligibilityGate",
    hash: "7be33b056c8804e0886cd6f20a75109a0fe92deab505754b97a49fde15aa5227",
    role: "ZK gate",
  },
  {
    name: "TreasuryVault",
    hash: "a90b082d863c5977c6e54654fec10e523a38760529e664a87e9e8a8e887ffd7b",
    role: "Decisions",
  },
  {
    name: "WCSPR",
    hash: "3d80df21ba4ee4d66a2a1f60c32570dd5685e4b279f6538162a5fd1314847c1e",
    role: "x402 asset",
  },
];

export default function Network() {
  const root = useRef<HTMLElement>(null);
  const { stats, loading, error } = useLandingFeeds();
  const counters = [
    { value: stats.feeds, label: "Feeds live on Casper, read by feed_id" },
    {
      value: stats.datasets,
      label: "EIA datasets mapped, ready for an attester",
    },
    {
      value: stats.attestations,
      label: "Attestations written, each with its source hash",
    },
  ];

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          q(`.${styles.painting}`),
          { yPercent: -12 },
          {
            yPercent: 12,
            ease: "none",
            scrollTrigger: {
              trigger: root.current,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          },
        );
      });
      const counters = q<HTMLElement>("[data-value]");
      if (
        loading ||
        error ||
        matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        return () => media.revert();
      const zero = (element: HTMLElement) =>
        (0).toFixed(Number(element.dataset.decimals));
      counters.forEach((element) => (element.textContent = zero(element)));
      ScrollTrigger.create({
        trigger: q(`.${styles.stats}`)[0],
        start: "top 85%",
        once: true,
        onEnter: () => {
          sound.play("DecodingUI");
          counters.forEach((element) => {
            const decimals = Number(element.dataset.decimals);
            const counter = { value: 0 };
            gsap.to(counter, {
              value: Number(element.dataset.value),
              duration: 2,
              ease: "power2.out",
              onUpdate: () =>
                (element.textContent = counter.value.toFixed(decimals)),
            });
          });
        },
      });

      return () => media.revert();
    },
    {
      scope: root,
      dependencies: [
        stats.feeds,
        stats.datasets,
        stats.attestations,
        loading,
        error,
      ],
      revertOnUpdate: true,
    },
  );

  return (
    <section
      ref={root}
      id="network"
      className={styles.network}
      data-theme="dark"
      data-phase="3"
    >
      <div className={styles.backdrop} aria-hidden="true">
        <img
          loading="lazy"
          className={styles.painting}
          src="/landing/aztec/city.webp"
          alt=""
        />
      </div>

      <div className={`container ${styles.inner}`}>
        <PhaseTag phase={4}>Network</PhaseTag>
        <h2 className={styles.title} data-reveal>
          A network that runs itself
        </h2>

        <div className={styles.stats}>
          {counters.map(({ value, label }) => (
            <div key={label} className={styles.stat}>
              <strong>
                <span data-value={value} data-decimals={0}>
                  {loading || (error && !value)
                    ? "-"
                    : value.toLocaleString("en-US")}
                </span>
              </strong>
              <span className="label">{label}</span>
            </div>
          ))}
        </div>

        <div className={styles.lower}>
          <ul className={styles.clusters} data-sound-cue="planetReveal">
            {ROLES.map(({ name, job, art }) => (
              <li key={name} className={styles.cluster} data-reveal>
                <img
                  loading="lazy"
                  src={art}
                  alt=""
                  className={styles.planet}
                  data-cursor="Listen"
                  onPointerEnter={() => sound.chime()}
                />
                <span className={styles.clusterName}>{name}</span>
                <span className={styles.clusterMeta}>{job}</span>
              </li>
            ))}
          </ul>

          <div className={styles.feedPanel} data-reveal>
            <div className={styles.feedHead}>
              <span className="label">Contracts</span>
              <span className={styles.deployed}>
                <img
                  loading="lazy"
                  src="/landing/partners/casper.svg"
                  alt="Casper"
                />
                <span className={styles.live}>casper-test</span>
              </span>
            </div>
            <ol className={`mono ${styles.feed}`}>
              {CONTRACTS.map(({ name, hash, role }, index) => (
                <li key={name}>
                  <span>{index + 1}</span>
                  <a
                    className={styles.hash}
                    href={`https://testnet.cspr.live/contract-package/${hash}`}
                    target="_blank"
                    rel="noreferrer"
                    data-cursor="Explorer"
                    data-sfx="ui"
                  >
                    <b>{name}</b> {hash.slice(0, 8)}…{hash.slice(-6)}
                  </a>
                  <span>{role}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
