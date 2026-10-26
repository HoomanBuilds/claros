"use client";

import { useRef } from "react";
import { useExperience } from "@/components/landing/Experience";
import Button from "@/components/landing/ui/Button";
import {
  DECODE_CHARS,
  gsap,
  ScrollTrigger,
  SplitText,
  useGSAP,
} from "@/lib/landing/gsap";
import { cellDisc } from "@/lib/landing/cells";
import { print } from "@/lib/landing/print";
import { sound } from "@/lib/landing/sound";
import styles from "./PrintHero.module.css";

const SLAB = {
  desktop: { angle: -9, centreY: 0.56, rest: 0.2 },
  mobile: { angle: -14, centreY: 0.5, rest: 0.22 },
};
const LENS_RADIUS = 104;

const CELL = { desktop: 13, mobile: 9 };
const PAINTING = "/landing/aztec/landscape.webp";

type Point = [number, number];
const f = (value: number) => value.toFixed(1);

export default function PrintHero() {
  const { stage } = useExperience();
  const root = useRef<HTMLElement>(null);
  const slab = useRef({ intro: 0, scroll: 0 });

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const scene = q<HTMLElement>(`.${styles.stage}`)[0];
      const shield = q<HTMLElement>(`.${styles.shield}`)[0];
      const [edgeTop, edgeBottom] = q<SVGLineElement>(`.${styles.edges} line`);
      const labels = q<HTMLElement>(`.${styles.edgeLabels}`)[0];
      const meterValue = q<HTMLElement>("[data-meter-value]")[0];
      const meterBar = q<HTMLElement>("[data-meter-bar]")[0];
      const meterHint = q<HTMLElement>("[data-meter-hint]")[0];
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const finePointer = matchMedia(
        "(hover: hover) and (pointer: fine)",
      ).matches;
      const state = slab.current;
      if (reduced) state.intro = 1;

      const lens = { x: 0, y: 0, r: 0, target: 0, tx: 0, ty: 0, time: 0 };
      let shielded = false;

      const draw = () => {
        const { clientWidth: w, clientHeight: h } = scene;
        const config = w <= 760 ? SLAB.mobile : SLAB.desktop;
        const angle = (config.angle * Math.PI) / 180;
        const [dx, dy] = [Math.cos(angle), Math.sin(angle)];
        const [nx, ny] = [-dy, dx];
        const [cx, cy] = [w / 2, h * config.centreY];
        const rest = h * config.rest;
        const full = Math.hypot(w, h) / 2 + 24;
        const half = rest * state.intro + (full - rest) * state.scroll;
        const reach = w + h;
        const at = (along: number, across: number): Point => [
          cx + dx * along + nx * across,
          cy + dy * along + ny * across,
        ];
        const corners = [
          at(reach, half),
          at(-reach, half),
          at(-reach, -half),
          at(reach, -half),
        ];
        let path = `M${corners.map(([x, y]) => `${f(x)} ${f(y)}`).join("L")}Z`;
        if (lens.r > 1)
          path += cellDisc(
            lens.x,
            lens.y,
            lens.r,
            w <= 760 ? CELL.mobile : CELL.desktop,
          );
        shield.style.clipPath = `path("${path}")`;
        for (const [line, side] of [
          [edgeTop, -1],
          [edgeBottom, 1],
        ] as const) {
          const [[x1, y1], [x2, y2]] = [
            at(-reach, side * half),
            at(reach, side * half),
          ];
          line.setAttribute("x1", f(x1));
          line.setAttribute("y1", f(y1));
          line.setAttribute("x2", f(x2));
          line.setAttribute("y2", f(y2));
        }
        const [lx, ly] = at((w * 0.78 - cx - dy * half) / dx, -half);
        labels.style.transform = `translate(${f(lx)}px, ${f(ly)}px) rotate(${config.angle}deg)`;
        labels.style.opacity = String(
          Math.min(1, state.intro * 1.4) * Math.max(0, 1 - state.scroll * 1.8),
        );

        const percent = Math.round(Math.min(1, state.scroll / 0.7) * 100);
        meterValue.textContent = `${percent}%`;
        meterBar.style.transform = `scaleX(${percent / 100})`;
        if (percent === 100 && !shielded) {
          shielded = true;
          meterHint.textContent = "All of it on chain";
          sound.play("DecodingUI");
        } else if (percent < 100 && shielded) {
          shielded = false;
          meterHint.textContent = "Scroll to print it";
        }
      };

      const tick = (_time: number, deltaMs: number) => {
        const dt = Math.min(deltaMs, 50) / 1000;
        const ease = 1 - Math.exp(-dt * 10);
        lens.time += dt * 0.7;
        lens.x += (lens.tx - lens.x) * ease;
        lens.y += (lens.ty - lens.y) * ease;
        lens.r += (lens.target - lens.r) * ease;
        draw();
      };
      draw();
      ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) =>
          self.isActive ? gsap.ticker.add(tick) : gsap.ticker.remove(tick),
      });
      const canvas = q<HTMLCanvasElement>("[data-print]")[0];
      const render = () =>
        print(canvas, PAINTING, {
          cell: scene.clientWidth <= 760 ? CELL.mobile : CELL.desktop,
          ink: "#c6ecff",
          ground: "#061528",
          tint: "#2aa8ff",
          tintAmount: 0.5,
          gamma: 1.05,
        });
      render();
      let pending = 0;
      const observer = new ResizeObserver(() => {
        clearTimeout(pending);
        pending = window.setTimeout(render, 160);
      });
      observer.observe(scene);
      const cleanup = () => {
        gsap.ticker.remove(tick);
        observer.disconnect();
        clearTimeout(pending);
        removePointerListeners?.();
      };

      let removePointerListeners: (() => void) | undefined;

      if (reduced) return cleanup;
      if (finePointer) {
        const move = (event: PointerEvent) => {
          const box = scene.getBoundingClientRect();
          lens.tx = event.clientX - box.left;
          lens.ty = event.clientY - box.top;
          if (!lens.target) [lens.x, lens.y] = [lens.tx, lens.ty];
          lens.target = LENS_RADIUS;
        };
        const leave = () => (lens.target = 0);
        scene.addEventListener("pointermove", move);
        scene.addEventListener("pointerleave", leave);
        removePointerListeners = () => {
          scene.removeEventListener("pointermove", move);
          scene.removeEventListener("pointerleave", leave);
        };
      }
      const split = SplitText.create(q("[data-line]"), {
        type: "words",
        mask: "words",
        wordsClass: "split-word",
      });
      gsap.set(split.words, { yPercent: 115 });
      gsap.set(q("[data-hero-fade]"), {
        opacity: 0,
        y: 16,
        filter: "blur(8px)",
      });
      gsap.set(q(`.${styles.kicker}`), { opacity: 0 });
      gsap.set(q(`.${styles.edges}`), { opacity: 0 });
      const lineA = q<HTMLElement>("[data-line='a']")[0];
      const lineB = q<HTMLElement>("[data-line='b']")[0];
      const room = (line: HTMLElement) =>
        line.parentElement!.clientWidth - line.offsetWidth;
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
        .to(state, { scroll: 1, duration: 1, ease: "power1.in" }, 0)
        .fromTo(lineA, { x: 0 }, { x: () => room(lineA) / 2, duration: 0.6 }, 0)
        .fromTo(
          lineB,
          { x: () => room(lineB) },
          { x: () => room(lineB) / 2, duration: 0.6 },
          0,
        )
        .fromTo(
          q(`.${styles.picture}`),
          { scale: 1.12 },
          { scale: 1, duration: 1 },
          0,
        )
        .fromTo(
          q(`.${styles.wordmark}`),
          { scale: 1.35, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.45, ease: "power2.out" },
          0.3,
        )
        .to(
          q(`.${styles.kicker} span`),
          { yPercent: -120, duration: 0.25 },
          0.5,
        );

      return cleanup;
    },
    { scope: root },
  );
  useGSAP(
    () => {
      if (
        stage === "intro" ||
        matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        return;
      const q = gsap.utils.selector(root);
      const kicker = q<HTMLElement>(`.${styles.kicker} span`)[0];
      gsap
        .timeline({ delay: 0.3, defaults: { ease: "power3.out" } })
        .fromTo(
          q(`.${styles.painting}`),
          { scale: 1.2 },
          { scale: 1, duration: 2.6, ease: "expo.out" },
          0,
        )
        .to(slab.current, { intro: 1, duration: 1.6, ease: "expo.inOut" }, 0.2)
        .to(q(`.${styles.edges}`), { opacity: 1, duration: 1 }, 0.9)
        .to(
          q(".split-word"),
          { yPercent: 0, duration: 1.2, stagger: 0.07 },
          0.7,
        )
        .set(q(`.${styles.kicker}`), { opacity: 1 }, 1)
        .add(() => sound.play("DecodingUI"), 1)
        .to(
          kicker,
          {
            duration: 1,
            scrambleText: {
              text: kicker.textContent!,
              chars: DECODE_CHARS,
              speed: 0.5,
            },
          },
          1,
        )
        .to(
          q("[data-hero-fade]"),
          { opacity: 1, y: 0, filter: "blur(0px)", duration: 1, stagger: 0.12 },
          1.3,
        );
    },
    { dependencies: [stage === "intro"], scope: root },
  );

  return (
    <section
      ref={root}
      id="top"
      className={styles.hero}
      data-theme="dark"
      data-phase="0"
    >
      <div className={styles.stage} data-cursor="none">
        <div className={styles.picture} aria-hidden="true">
          <img className={styles.painting} src={PAINTING} alt="" />
        </div>

        <div className={styles.shield} aria-hidden="true">
          <div className={styles.picture}>
            <canvas className={styles.painting} data-print />
          </div>
          <span className={styles.wordmark}>CLAROS</span>
        </div>

        <svg className={styles.edges} aria-hidden="true">
          <line />
          <line />
        </svg>
        <div className={styles.edgeLabels} aria-hidden="true">
          <span className="mono">Real world</span>
          <span className="mono">On Casper</span>
        </div>

        <div className={styles.scrim} aria-hidden="true" />

        <div className={`container ${styles.content}`}>
          <p className={styles.kicker}>
            <span>Oracle on Casper</span>
          </p>
          <h1 className={styles.title}>
            <span data-line="a">The real world,</span>
            <span data-line="b">on chain</span>
          </h1>
        </div>

        <div className={`container ${styles.bar}`}>
          <div className={styles.intro} data-hero-fade>
            <p>
              Claros reads energy prices, the grid and civic revenue, and writes
              every value onto Casper as a feed that any contract, app or agent
              can read, with proof of where it came from.
            </p>
            <div className={styles.actions}>
              <Button href="#feeds">See the feeds</Button>
              <Button href="#gap" variant="square">
                Why an oracle
              </Button>
            </div>
          </div>

          <div className={styles.meter} data-hero-fade>
            <span className={styles.meterIcon} aria-hidden="true" />
            <div className={styles.meterText}>
              <strong className="mono" data-meter-value>
                0%
              </strong>
              <span className={styles.meterTrack}>
                <i data-meter-bar />
              </span>
              <span className="label" data-meter-hint>
                Scroll to print it
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
