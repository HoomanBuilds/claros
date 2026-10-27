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
        </div>
      </div>
    </section>
  );
}
