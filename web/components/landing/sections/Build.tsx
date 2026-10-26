"use client";

import { useRef } from "react";
import { Arrow } from "@/components/landing/ui/Button";
import { Pins } from "@/components/landing/ui/Corners";
import Button from "@/components/landing/ui/Button";
import PhaseTag from "@/components/landing/ui/PhaseTag";
import { mountLottie } from "@/lib/landing/lottie";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/landing/gsap";
import styles from "./Build.module.css";

const VERTICALS = [
  {
    name: "REST",
    title: "Free over HTTP",
    body: "The Hermes of Claros. Read every live feed over plain HTTP, with no wallet and no key: one reading, all of them, or the 232-dataset catalog.",
    points: ["GET /v1/feeds", "CORS open, JSON", "Free, for good"],
    lottie: "prisms",
    tech: undefined,
  },
  {
    name: "SDK and contracts",
    title: "Straight from Casper",
    body: "claros-oracle reads node state directly, no indexer, and hands back the value with its decimals and unit. A Casper contract reads the same registries itself, for gas alone.",
    points: ["getReading(id)", "get_latest(id)", "Pyth-style scaling"],
    lottie: "blocks",
    tech: "casper",
  },
  {
    name: "Pay per read",
    title: "Metered over x402",
    body: "The hosted feed server answers HTTP 402, the client signs a WCSPR authorization, and the reading comes back with its provenance. Built for agents that pay as they go.",
    points: [
      "1 WCSPR a read",
      "transfer_with_authorization",
      "Paid to the attester",
    ],
    lottie: "horizon",
    tech: "x402",
  },
];

const DISCS = [
  { image: "/landing/avail/walk.webp", label: "Earn", width: 0.5 },
  { image: "/landing/avail/chain.webp", label: "Attest", width: 0.62 },
  { image: "/landing/avail/vault.webp", label: "Claim", width: 0.72 },
  { image: "/landing/avail/door.webp", label: "Prove", width: 0.8 },
  { image: "/landing/avail/dunes.webp", label: "Keys", width: 0.86 },
];

const ROLLOUT_STEPS = [
  {
    title: "Prove",
    body: "Enroll in the allowlist and verify a Groth16 proof on Casper, once. Your secret never leaves your machine, and the credential outlives every root rotation.",
  },
  {
    title: "Claim",
    body: "Register a feed_id from the 232-dataset catalog, or your own source. Claims are enforced on chain: only you can attest it from then on.",
  },
  {
    title: "Attest",
    body: "Your key signs, your model decides. Any tool-calling model works, DeepSeek to a local Ollama, and every reading is checked against its history first.",
  },
  {
    title: "Earn",
    body: "Serve your feed over x402 and every read settles WCSPR straight to your account. No middleman, no revenue share.",
  },
];

export default function Build() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const media = gsap.matchMedia();
      let alive = true;
      const animations: {
        play: () => void;
        pause: () => void;
        destroy: () => void;
      }[] = [];
      const playing = ScrollTrigger.create({
        trigger: q(`.${styles.verticals}`)[0],
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) =>
          animations.forEach((animation) =>
            self.isActive &&
            !matchMedia("(prefers-reduced-motion: reduce)").matches
              ? animation.play()
              : animation.pause(),
          ),
      });
      const visibility = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          visibility.disconnect();
          q<HTMLElement>("[data-lottie]").forEach((el) => {
            void mountLottie(el, el.dataset.lottie!)
              .then((animation) => {
                if (!alive) return animation.destroy();
                animation.loop = true;
                animations.push(animation);
                if (
                  playing.isActive &&
                  !matchMedia("(prefers-reduced-motion: reduce)").matches
                )
                  animation.play();
              })
              .catch(() => {});
          });
        },
        { rootMargin: "400px" },
      );
      visibility.observe(q<HTMLElement>(`.${styles.verticals}`)[0]);

      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(q(`.${styles.connector} span`), {
          scaleY: 0,
          duration: 1.2,
          ease: "power3.inOut",
          stagger: 0.1,
          scrollTrigger: {
            trigger: q(`.${styles.connector}`)[0],
            start: "top 80%",
          },
        });
        gsap.from(q(`.${styles.vertical}`), {
          y: 60,
          opacity: 0,
          duration: 1,
          ease: "power3.out",
          stagger: 0.12,
          scrollTrigger: {
            trigger: q(`.${styles.verticals}`)[0],
            start: "top 85%",
          },
        });
      });
      media.add(
        "(min-width: 901px) and (prefers-reduced-motion: no-preference)",
        () => {
          const discs = q<HTMLElement>(`.${styles.disc}`);
          const steps = q<HTMLElement>(`.${styles.rolloutStep}`);
          const spread = (index: number) => (index - (discs.length - 1)) * 104;
          gsap.set(discs, { y: (index) => (discs.length - 1 - index) * -10 });
          const timeline = gsap.timeline({
            defaults: { ease: "power2.inOut" },
            scrollTrigger: {
              trigger: q(`.${styles.rollout}`)[0],
              start: "top top",
              end: "+=160%",
              pin: true,
              scrub: 0.8,
              onUpdate: (self) => {
                const current = Math.min(
                  steps.length - 1,
                  Math.floor(self.progress * steps.length),
                );
                steps.forEach((step, index) =>
                  step.toggleAttribute("data-active", index === current),
                );
              },
            },
          });
          timeline
            .to(discs, {
              y: (index) => spread(index),
              duration: 1,
              stagger: 0.04,
            })
            .to(
              q(`.${styles.discLabel}`),
              { opacity: 1, x: 0, duration: 0.5, stagger: 0.06 },
              0.4,
            )
            .to(
              q(`.${styles.disc} img`),
              { rotation: (index) => (index % 2 ? 3 : -3), duration: 0.6 },
              1,
            );
        },
      );

      return () => {
        alive = false;
        visibility.disconnect();
        playing.kill();
        animations.forEach((animation) => animation.destroy());
        media.revert();
      };
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="read"
      className={styles.build}
      data-theme="warm"
      data-phase="4"
    >
      <div className="container">
        <header className={styles.head}>
          <PhaseTag phase={5}>Read it</PhaseTag>
          <h2 className={styles.title} data-reveal>
            Three ways to read a feed
          </h2>
        </header>

        <div className={styles.connector} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <div className={styles.verticals}>
          {VERTICALS.map(
            ({ name, title, body, points, lottie, tech }, index) => (
              <article key={name} className={styles.vertical}>
                <Pins />
                <div className={styles.verticalHead}>
                  <span className="label">{name}</span>
                  <span className="mono">0{index + 1}</span>
                </div>
                <div
                  className={styles.illustration}
                  data-lottie={lottie}
                  aria-hidden="true"
                >
                  {tech && (
                    <img
                      loading="lazy"
                      className={styles.tech}
                      data-tech={tech}
                      src={`/landing/partners/${tech}.svg`}
                      alt={tech === "casper" ? "Casper" : "x402"}
                    />
                  )}
                </div>
                <h3>{title}</h3>
                <p>{body}</p>
                <ul>
                  {points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
                <a
                  href={`/docs/reading/${["rest", "sdk", "x402"][index]}`}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.verticalLink}
                  data-sfx="ui"
                >
                  <span>Read the guide</span>
                  <Arrow />
                </a>
              </article>
            ),
          )}
        </div>
      </div>

      <div
        id="operators"
        className={styles.rollout}
        data-sound-cue="griffinArmor"
      >
        <div className={`container ${styles.rolloutInner}`}>
          <div className={styles.rolloutCopy}>
            <p className="label">Operators</p>
            <h3 className={styles.rolloutTitle} data-reveal>
              Run an agent. Earn.
            </h3>
            <ol className={styles.rolloutSteps}>
              {ROLLOUT_STEPS.map(({ title, body }, index) => (
                <li
                  key={title}
                  className={styles.rolloutStep}
                  data-active={index === 0 || undefined}
                >
                  <span className="mono">0{index + 1}</span>
                  <div>
                    <strong>{title}</strong>
                    <p>{body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className={styles.proof}>
              An independent operator has done all four: it claimed the US48
              solar feed, attested 4,291 MWh with its own model, and was paid 1
              WCSPR for a single read.
            </p>
            <Button href="/docs/network/run-an-agent" variant="outline">
              Start earning
            </Button>
          </div>

          <div className={styles.tower} aria-hidden="true">
            {DISCS.map(({ image, label, width }, index) => (
              <div
                key={label}
                className={styles.disc}
                style={{
                  width: `${width * 100}%`,
                  zIndex: DISCS.length - index,
                  ["--index" as string]: index,
                }}
              >
                <img loading="lazy" src={image} alt="" />
                <span className={`label ${styles.discLabel}`}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
