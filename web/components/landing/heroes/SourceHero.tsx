"use client";

import { useEffect, useRef } from "react";
import { useExperience } from "@/components/landing/Experience";
import Button from "@/components/landing/ui/Button";
import { DECODE_CHARS, gsap, SplitText, useGSAP } from "@/lib/landing/gsap";
import { print } from "@/lib/landing/print";
import styles from "./SourceHero.module.css";

const LEAN = 0.14;
const PAINTING = "/landing/aztec/square.webp";

export default function SourceHero() {
  const { stage } = useExperience();
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const scene = root.current!.querySelector<HTMLElement>(`.${styles.stage}`)!;
    const canvas = root.current!.querySelector<HTMLCanvasElement>("canvas")!;
    let pending = 0;
    const render = () => {
      void print(canvas, PAINTING, {
        cell: scene.clientWidth <= 760 ? 9 : 12,
        ink: "#c6ecff",
        ground: "#061528",
        tint: "#2aa8ff",
        tintAmount: 0.5,
        gamma: 1.05,
        focus: [0.5, 0.62],
      }).catch(() => canvas.style.setProperty("visibility", "hidden"));
    };
    const observer = new ResizeObserver(() => {
      clearTimeout(pending);
      pending = window.setTimeout(render, 160);
    });
    observer.observe(scene);
    render();
    return () => {
      observer.disconnect();
      clearTimeout(pending);
    };
  }, []);

  useGSAP(
    () => {
      if (stage === "intro") return;
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const q = gsap.utils.selector(root);
        const scene = q<HTMLElement>(`.${styles.stage}`)[0];
        const attested = q<HTMLElement>(`.${styles.attested}`)[0];
        const line = q<SVGLineElement>(`.${styles.split} line`)[0];
        const divider = { reveal: 0, scroll: 0 };
        const draw = () => {
          const { clientWidth: width, clientHeight: height } = scene;
          const position =
            divider.reveal + (-LEAN - divider.reveal) * divider.scroll;
          const lean = height * LEAN;
          const top = (position * width + lean / 2).toFixed(1);
          const bottom = (position * width - lean / 2).toFixed(1);
          attested.style.clipPath = `polygon(${top}px 0, ${width + lean}px 0, ${width + lean}px ${height}px, ${bottom}px ${height}px)`;
          line.setAttribute("x1", top);
          line.setAttribute("x2", bottom);
          line.setAttribute("y2", String(height));
        };
        const observer = new ResizeObserver(draw);
        observer.observe(scene);
        draw();

        const split = SplitText.create(q("[data-line]"), {
          type: "words",
          mask: "words",
          wordsClass: "split-word",
        });
        const gutter = () =>
          parseFloat(getComputedStyle(q(`.${styles.top}`)[0]).paddingLeft);
        const cardTop = () =>
          scene.clientHeight * (scene.clientWidth <= 760 ? 0.62 : 0.56);

        gsap
          .timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: root.current,
              start: "top top",
              end: "bottom bottom",
              scrub: 1,
              invalidateOnRefresh: true,
            },
          })
          .fromTo(
            q(`.${styles.window}`),
            {
              clipPath: () =>
                `inset(${cardTop()}px ${gutter()}px 0px ${gutter()}px round 22px 22px 0px 0px)`,
            },
            {
              clipPath: "inset(0px 0px 0px 0px round 0px 0px 0px 0px)",
              duration: 0.6,
            },
            0,
          )
          .to(
            q(`.${styles.top}`),
            { yPercent: -40, opacity: 0, duration: 0.45 },
            0,
          )
          .fromTo(
            q(`.${styles.painting}`),
            { scale: 1.1 },
            { scale: 1, duration: 1 },
            0,
          )
          .to(
            divider,
            { scroll: 1, duration: 0.6, ease: "power1.inOut", onUpdate: draw },
            0.3,
          )
          .fromTo(
            q(`.${styles.closing}`),
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 0.2 },
            0.78,
          );

        const intro = gsap.timeline({
          delay: 0.3,
          defaults: { ease: "power3.out" },
        });
        intro
          .from(
            split.words,
            { yPercent: 140, duration: 1.1, stagger: 0.07 },
            0.2,
          )
          .from(
            q("[data-hero-fade]"),
            {
              opacity: 0,
              y: 16,
              filter: "blur(8px)",
              duration: 1,
              stagger: 0.1,
            },
            1,
          )
          .fromTo(
            q(`.${styles.window}`),
            { yPercent: 60, opacity: 0 },
            { yPercent: 0, opacity: 1, duration: 1.6, ease: "expo.out" },
            1.1,
          )
          .to(
            divider,
            { reveal: 0.5, duration: 1.6, ease: "expo.inOut", onUpdate: draw },
            1.6,
          );
        for (const label of q<HTMLElement>("[data-scramble]")) {
          intro.to(
            label,
            {
              duration: 0.9,
              scrambleText: {
                text: label.textContent!,
                chars: DECODE_CHARS,
                speed: 0.5,
              },
            },
            0.3,
          );
        }

        return () => {
          observer.disconnect();
          split.revert();
          attested.style.removeProperty("clip-path");
          line.setAttribute("x1", "55%");
          line.setAttribute("x2", "45%");
          line.setAttribute("y2", "100%");
        };
      });
      return () => media.revert();
    },
    { dependencies: [stage === "intro"], scope: root, revertOnUpdate: true },
  );

  return (
    <section
      ref={root}
      id="top"
      className={styles.hero}
      data-theme="paper"
      data-phase="0"
    >
      <div className={styles.stage}>
        <div className={`container ${styles.top}`}>
          <p className={`label ${styles.kicker}`} data-scramble>
            Oracle on Casper
          </p>
          <div className={styles.headline}>
            <h1 className={styles.title}>
              <span data-line>The real world,</span>
              <span data-line>on chain</span>
            </h1>
            <div className={styles.side} data-hero-fade>
              <p>
                Claros reads energy prices, the grid and civic revenue, and
                writes every value onto Casper as a feed that any contract, app
                or agent can read, with proof of where it came from.
              </p>
              <div className={styles.actions}>
                <Button href="#feeds">See the feeds</Button>
                <Button href="#gap" variant="outline">
                  Why an oracle
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.window}>
          <img
            className={styles.painting}
            src={PAINTING}
            alt=""
            width={1600}
            height={900}
            draggable={false}
            fetchPriority="high"
          />
          <div className={styles.attested}>
            <img
              className={`${styles.painting} ${styles.fallback}`}
              src={PAINTING}
              alt=""
              width={1600}
              height={900}
              draggable={false}
            />
            <canvas className={styles.painting} aria-hidden="true" />
          </div>
          <svg className={styles.split} aria-hidden="true">
            <line x1="55%" x2="45%" y1="0" y2="100%" />
          </svg>
          <p className={styles.closing}>Source. Hash. Signer.</p>
        </div>
      </div>
    </section>
  );
}
