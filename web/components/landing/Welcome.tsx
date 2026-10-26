"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useExperience } from "@/components/landing/Experience";
import SoundToggle from "@/components/landing/ui/SoundToggle";
import { gsap, useGSAP } from "@/lib/landing/gsap";
import { listen, shared } from "@/lib/landing/instance";
import { sound } from "@/lib/landing/sound";
import styles from "./Welcome.module.css";

const PRELOAD = [
  "/landing/aztec/landscape.webp",
  "/landing/hyperlane/glyphs.png",
  "/landing/aztec/city.webp",
  "/landing/penumbra/noise.gif",
  "/landing/partners/casper.svg",
];

const MIN_SECONDS = 2.2;
const LENS = 120;
const RING = 2 * Math.PI * 29;

export default function Welcome() {
  const { stage, setStage } = useExperience();
  const root = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const progress = useRef({ value: 0 });

  const leaving = useRef(false);
  useEffect(() => {
    const state = progress.current;
    const total = PRELOAD.length + 2;
    let loaded = 0;
    let cancelled = false;
    const started = performance.now();
    const advance = () => {
      if (cancelled) return;
      loaded++;
      const elapsed = (performance.now() - started) / 1000;
      gsap.to(state, {
        value: loaded / total,
        duration: loaded === total ? Math.max(0.6, MIN_SECONDS - elapsed) : 0.7,
        ease: "power2.out",
        overwrite: true,
        onComplete: () => loaded === total && setReady(true),
      });
    };
    for (const src of PRELOAD) {
      const image = new Image();
      image.onload = image.onerror = advance;
      image.src = src;
    }
    document.fonts.ready.then(advance);
    let counted = false;
    const renderer = () => {
      if (counted || (!shared.world && !shared.failed)) return;
      counted = true;
      advance();
    };
    const off = listen(renderer);
    const timeout = window.setTimeout(() => setReady(true), 12000);
    renderer();
    return () => {
      cancelled = true;
      off();
      window.clearTimeout(timeout);
      gsap.killTweensOf(state);
    };
  }, []);

  useEffect(() => {
    if (ready && stage === "intro")
      root.current
        ?.querySelector<HTMLButtonElement>("button:not([disabled])")
        ?.focus({ preventScroll: true });
  }, [ready, stage]);

  useGSAP(
    () => {
      if (stage === "entered") return;
      const overlay = root.current!;
      const cursor = overlay.querySelector<HTMLElement>(`.${styles.cursor}`)!;
      const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
      gsap.from(overlay.querySelectorAll(`.${styles.edge}`), {
        opacity: 0,
        y: 8,
        duration: 1,
        stagger: 0.1,
        delay: 0.3,
      });

      const target = {
        x: innerWidth / 2,
        y: innerHeight / 2,
        r: fine ? 0 : LENS,
      };
      const lens = { ...target, time: 0 };
      const moveCursor = {
        x: gsap.quickTo(cursor, "x", { duration: 0.35, ease: "power3.out" }),
        y: gsap.quickTo(cursor, "y", { duration: 0.35, ease: "power3.out" }),
      };
      const onMove = (event: PointerEvent) => {
        target.x = event.clientX;
        target.y = event.clientY;
        target.r = LENS;
        moveCursor.x(event.clientX);
        moveCursor.y(event.clientY);
      };
      const onLeave = () => (target.r = 0);
      if (fine) {
        overlay.addEventListener("pointermove", onMove);
        overlay.addEventListener("pointerleave", onLeave);
      }

      const tick = (_t: number, deltaMs: number) => {
        if (leaving.current) return;
        const dt = Math.min(deltaMs, 50) / 1000;
        lens.time += dt;
        if (!fine) {
          target.x =
            innerWidth / 2 + Math.cos(lens.time * 0.55) * innerWidth * 0.25;
          target.y =
            innerHeight / 2 + Math.sin(lens.time * 0.8) * innerHeight * 0.16;
        }
        const ease = 1 - Math.exp(-dt * 8);
        lens.x += (target.x - lens.x) * ease;
        lens.y += (target.y - lens.y) * ease;
        lens.r += (target.r - lens.r) * ease;
        const world = shared.world;
        if (world) {
          world.frost = 1;
          world.data = 0;
          world.clarity = progress.current.value * 0.42;
          world.lens = { x: lens.x, y: lens.y, r: lens.r };
        }
      };
      gsap.ticker.add(tick);
      return () => {
        gsap.ticker.remove(tick);
        overlay.removeEventListener("pointermove", onMove);
        overlay.removeEventListener("pointerleave", onLeave);
      };
    },
    { scope: root, dependencies: [stage === "entered"], revertOnUpdate: true },
  );
  const reveal = (overlay: HTMLDivElement, x: number, y: number) => {
    const ring = overlay.querySelector<SVGCircleElement>(
      `.${styles.ringProgress}`,
    )!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const world = shared.world;
    leaving.current = true;
    sound.play("Quick_Buildup");
    const finish = () => {
      if (world) world.frost = 0;
      setStage("entered");
      document
        .querySelector<HTMLElement>("[aria-controls='site-menu']")
        ?.focus({ preventScroll: true });
    };
    if (reduced || !world) {
      setStage("revealing");
      gsap.to(overlay, { opacity: 0, duration: 0.5, onComplete: finish });
      return;
    }
    const far =
      Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) *
      1.25;
    const wave = { r: 0 };
    gsap
      .timeline()
      .to(ring, { strokeDashoffset: 0, duration: 0.5, ease: "power1.in" })
      .add(() => {
        sound.play("ExpSFX_In");
        setStage("revealing");
        overlay.dataset.leaving = "";
      })
      .to(wave, {
        r: far,
        duration: 1.5,
        ease: "power2.in",
        onUpdate: () => void (world.wave = { x, y, r: wave.r }),
      })
      .add(finish);
  };

  if (stage === "entered") return null;

  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!ready || stage !== "intro") return;
    const fromPointer = event.detail > 0;
    reveal(
      event.currentTarget,
      fromPointer ? event.clientX : innerWidth / 2,
      fromPointer ? event.clientY : innerHeight / 2,
    );
  };

  return (
    <div
      ref={root}
      className={styles.overlay}
      data-ready={ready || undefined}
      role="dialog"
      aria-modal="true"
      aria-label="Enter Claros"
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const buttons = root.current?.querySelectorAll<HTMLButtonElement>(
          "button:not([disabled])",
        );
        if (!buttons?.length) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      onClick={onClick}
    >
      <p className={`label ${styles.edge} ${styles.top}`}>Loading 5 parts</p>
      <p className={`label ${styles.edge} ${styles.bottom}`}>
        Headphones recommended
      </p>
      <div className={styles.soundCorner}>
        <SoundToggle />
      </div>
      <button
        type="button"
        className={`label ${styles.enter}`}
        disabled={!ready}
      >
        {ready ? "Click to see clearly" : "Clearing the view"}
      </button>
      <div className={styles.cursor} aria-hidden="true">
        <svg className={styles.ring} viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="29" />
          <circle
            className={styles.ringProgress}
            cx="32"
            cy="32"
            r="29"
            strokeDasharray={RING}
            strokeDashoffset={RING}
          />
        </svg>
        <span className={`label ${styles.cursorText}`}>
          {ready ? "Click to enter" : "Loading"}
        </span>
      </div>
    </div>
  );
}
