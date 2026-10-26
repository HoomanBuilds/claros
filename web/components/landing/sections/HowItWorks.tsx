"use client";

import { useRef, useState } from "react";
import { Diamonds } from "@/components/landing/ui/Corners";
import PhaseTag from "@/components/landing/ui/PhaseTag";
import Printed from "@/components/landing/ui/Printed";
import { format, useLandingFeeds } from "@/lib/landing/feeds";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/landing/gsap";
import styles from "./HowItWorks.module.css";

const STEPS = [
  {
    name: "Fetch",
    title: "An agent reads the source",
    body: "On an hourly heartbeat, an agent checks each source for a period it hasn't seen: the EIA's energy series, San Diego's parking revenue. Only new data starts a cycle.",
    icon: "/landing/namada/papers.png",
    who: "Read from",
    sees: "EIA API v2, petroleum/pri/spt",
  },
  {
    name: "Attest",
    title: "It proves, checks and signs the reading",
    body: "The agent clears a zero-knowledge eligibility gate, checks the value against the feed's own history, scales it to an exact integer, hashes its provenance and signs it onto Casper.",
    icon: "/landing/namada/attested.png",
    who: "Written by",
    sees: "a known attester, after two checks",
  },
  {
    name: "Read",
    title: "Anyone reads it by feed_id",
    body: "The value and the metadata that explains it sit side by side on Casper under one feed_id. A contract, a backend, a dapp or an agent reads it and divides by 10 to the decimals.",
    icon: "/landing/namada/window.png",
    who: "Anyone can check",
    sees: "the value, its hash and its signer",
  },
];
const USE_CASES = [
  {
    title: "Contracts that settle on real prices",
    body: "A lending market or a derivative reads WTI or Henry Hub inside the same transaction it acts on, for gas alone.",
    image: "/landing/avail/road.webp",
  },
  {
    title: "Agents that pay for data",
    body: "An agent pays 1 WCSPR over x402 for a reading and gets it back with the proof of where it came from.",
    image: "/landing/avail/head.webp",
  },
];
const STEP_SECONDS = 5.5;
const PRINT = {
  cell: 9,
  ink: "#c6ecff",
  ground: "#061528",
  tint: "#2aa8ff",
  tintAmount: 0.5,
  gamma: 1.05,
};

export default function HowItWorks() {
  const { byId, stats } = useLandingFeeds();
  const wti = byId("EIA.PET.PRICE.WTI.DAILY");
  const facts = [
    `period ${wti.sourcePeriod ?? "-"}`,
    `amount ${wti.amount}`,
    `hash ${wti.hash ? `${wti.hash.slice(0, 8)}…` : "-"}`,
  ];
  const record = `feed_id      ${wti.id}
period       ${wti.sourcePeriod ?? "-"}
amount       ${wti.amount}
decimals     ${wti.value === null ? "-" : wti.decimals}
unit         ${wti.unit || "-"}
source_hash  ${wti.hash || "-"}
attester     ${wti.attester}`;
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  useGSAP(
    () => {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const bar = root.current!.querySelector<HTMLElement>(
        `[data-step="${active}"] .${styles.progress}`,
      );
      if (!bar) return;
      const timer = gsap.fromTo(
        bar,
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: STEP_SECONDS,
          ease: "none",
          paused: true,
          onComplete: () => setActive((index) => (index + 1) % STEPS.length),
        },
      );
      ScrollTrigger.create({
        trigger: root.current,
        start: "top 70%",
        end: "bottom 30%",
        onToggle: (self) => (self.isActive ? timer.play() : timer.pause()),
      });
    },
    { dependencies: [active], scope: root, revertOnUpdate: true },
  );

  return (
    <section
      ref={root}
      id="how"
      className={styles.how}
      data-theme="dark"
      data-phase="2"
    >
      <div className="container">
        <header className={styles.head}>
          <PhaseTag phase={3}>How it works</PhaseTag>
          <h2 className={styles.title} data-reveal>
            From a source to a contract
          </h2>
          <p className={styles.sub} data-reveal>
            Every value on Claros is made the same way, and read the same way:
            an integer on Casper, with the decimals and the provenance that make
            it mean something.
          </p>
        </header>

        <div className={styles.flow}>
          <figure className={styles.proof} data-reveal>
            <Diamonds />
            <div className={styles.frames} aria-hidden="true">
              <div
                className={styles.frame}
                data-active={active === 0 || undefined}
              >
                <img
                  loading="lazy"
                  className={styles.crop}
                  src="/landing/aztec/feast.webp"
                  alt=""
                />
                <div className={`${styles.crop} ${styles.sweep}`}>
                  <Printed
                    className={styles.fill}
                    src="/landing/aztec/feast.webp"
                    {...PRINT}
                  />
                </div>
              </div>
              <div
                className={styles.frame}
                data-active={active === 1 || undefined}
              >
                {facts.map((fact, index) => (
                  <div
                    key={fact}
                    className={styles.share}
                    style={{ ["--share" as string]: index }}
                  >
                    <div className={styles.crop}>
                      <Printed
                        className={styles.fill}
                        src="/landing/aztec/feast.webp"
                        {...PRINT}
                      />
                    </div>
                    <span className="mono">{fact}</span>
                  </div>
                ))}
              </div>
              <div
                className={`${styles.frame} ${styles.proven}`}
                data-active={active === 2 || undefined}
              >
                <pre className="mono">{record}</pre>
                <span className={`mono ${styles.stamp}`}>
                  {wti.value === null
                    ? wti.period
                    : `= ${format(wti)} ${wti.unit}, on Casper`}
                </span>
              </div>
            </div>
            <figcaption className={styles.sees}>
              <span className="label">{STEPS[active].who}</span>
              <span className="mono">{STEPS[active].sees}</span>
            </figcaption>
          </figure>

          <ol className={styles.steps}>
            {STEPS.map(({ name, title, body, icon }, index) => (
              <li
                key={name}
                data-step={index}
                className={styles.step}
                data-active={active === index || undefined}
              >
                <button
                  type="button"
                  className={styles.stepButton}
                  onClick={() => setActive(index)}
                  data-sfx="ui"
                >
                  <span className={styles.stepText}>
                    <span className={`mono ${styles.stepIndex}`}>
                      0{index + 1}
                    </span>
                    <strong>{title}</strong>
                    <span className={styles.stepBody}>{body}</span>
                    <span className={styles.more}>Learn more +</span>
                  </span>
                  <span className={styles.stepIcon}>
                    <img loading="lazy" src={icon} alt="" />
                  </span>
                </button>
                <span className={styles.progress} aria-hidden="true" />
              </li>
            ))}
          </ol>
        </div>

        <h3 className={styles.actionTitle} data-reveal>
          Who reads it
        </h3>
        <div className={styles.actions}>
          {USE_CASES.map(({ title, body, image }) => (
            <article key={title} className={styles.case} data-reveal>
              <Diamonds />

              <img
                loading="lazy"
                className={styles.caseImage}
                src={image}
                alt=""
              />
              <h4>{title}</h4>
              <p>{body}</p>
            </article>
          ))}
          <a
            href="/docs/catalog/request"
            target="_blank"
            rel="noreferrer"
            className={`${styles.case} ${styles.caseOpen}`}
            data-reveal
            data-sfx="ui"
            data-cursor="Request"
          >
            <span className={styles.plus} aria-hidden="true" />
            <h4>A dataset you need</h4>
            <p>
              {stats.datasets} EIA datasets are mapped and waiting for an
              attester. Ask for the one you need, or run the agent that serves
              it.
            </p>
          </a>
        </div>
      </div>
    </section>
  );
}
