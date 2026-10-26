"use client";

import { useRef } from "react";
import { Arrow } from "@/components/landing/ui/Button";
import PhaseTag from "@/components/landing/ui/PhaseTag";
import Printed from "@/components/landing/ui/Printed";
import { gsap, useGSAP } from "@/lib/landing/gsap";
import styles from "./Problem.module.css";

const CARDS = [
  {
    glyph: "1",
    title: "Contracts can't call an API",
    body: "Energy prices, generation, emissions and city revenue live behind public web APIs. A smart contract has no way to fetch them, or to trust them if it could.",
    footer: "Web APIs",
  },
  {
    glyph: "2",
    title: "No shared record of the truth",
    body: "Even when an app fetches a value off chain, nothing records what was true at that time in a way anyone else can check later.",
    footer: "Records",
  },
  {
    glyph: "3",
    title: "Every app scales numbers its own way",
    body: "Contracts have no floating point, so each integration hardcodes its own decimals, and a feed that changes scale breaks everyone reading it.",
    footer: "Decimals",
  },
  {
    glyph: "4",
    title: "A number without a source",
    body: "A value with no reporting period, no source hash and no signer can't be audited, so it can't carry anything that matters.",
    footer: "Provenance",
  },
];

export default function Problem() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const scrub = {
          trigger: root.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        };
        gsap.fromTo(
          `.${styles.diagonal}`,
          { rotation: -45, xPercent: -8, scaleX: 0.7 },
          {
            rotation: -24,
            xPercent: 12,
            scaleX: 1.05,
            ease: "none",
            scrollTrigger: scrub,
          },
        );
        gsap.fromTo(
          `.${styles.print}`,
          { yPercent: 10 },
          { yPercent: -10, ease: "none", scrollTrigger: scrub },
        );
        gsap.from(`.${styles.card}`, {
          y: 80,
          opacity: 0,
          duration: 1.1,
          ease: "power3.out",
          stagger: 0.12,
          scrollTrigger: { trigger: `.${styles.cards}`, start: "top 85%" },
        });
      });
      return () => media.revert();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="gap"
      className={styles.problem}
      data-theme="paper"
      data-phase="1"
    >
      <div className={styles.diagonal} aria-hidden="true" />

      <div className={`container ${styles.top}`}>
        <header className={styles.head}>
          <PhaseTag phase={2} tone="light">
            The gap
          </PhaseTag>
          <h2 className={styles.title} data-reveal>
            Contracts can&apos;t see the real world.
          </h2>
          <p className={styles.intro} data-reveal>
            The numbers that matter off chain, what energy costs, what the grid
            carries, what a city takes in, reach a contract only if someone
            brings them, and nothing proves they arrived as they left.
          </p>
        </header>

        <div className={styles.art} aria-hidden="true">
          <Printed
            className={styles.print}
            src="/landing/aztec/music.webp"
            cell={8}
            ink="#0b4f96"
            ground="#eef2f5"
            tint="#9fd6ff"
            tintAmount={0.55}
            gamma={0.9}
            invert
          />
        </div>
      </div>

      <div className={`container ${styles.cards}`}>
        {CARDS.map(({ glyph, title, body, footer }) => (
          <article key={title} className={styles.card}>
            <header className={styles.cardHead}>
              <span className={`mono ${styles.glyph}`} aria-hidden="true">
                {glyph}
              </span>
              <h3>{title}</h3>
            </header>
            <p className={styles.cardBody}>{body}</p>
            <a href="#how" className={styles.cardFooter} data-sfx="ui">
              <span className="label">{footer}</span>
              <span className={styles.cardArrow}>
                <Arrow />
              </span>
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
