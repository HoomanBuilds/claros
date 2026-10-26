"use client";

import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useExperience } from "@/components/landing/Experience";
import Button from "@/components/landing/ui/Button";
import { DECODE_CHARS, gsap, SplitText, useGSAP } from "@/lib/landing/gsap";
import { format, useLandingFeeds } from "@/lib/landing/feeds";
import { print } from "@/lib/landing/print";
import { sound } from "@/lib/landing/sound";
import styles from "./AttestedHero.module.css";

const LEAN = 0.14;

const f = (value: number) => value.toFixed(1);

const READINGS = [
  { id: "EIA.PET.PRICE.WTI.DAILY", note: "WTI crude, daily" },
  { id: "EIA.ELEC.DEMAND.US48.HOURLY", note: "US grid load, hourly" },
  { id: "OP-1", note: "San Diego parking, daily" },
  { id: "EIA.ELEC.GEN_SUN.US48.HOURLY", note: "US48 solar, by an operator" },
  { id: "EIA.NG.PRICE.HENRYHUB.DAILY", note: "Henry Hub gas, daily" },
];
const CYCLE_SECONDS = 3.4;
const PAINTING = "/landing/aztec/square.webp";

const GLYPHS = " .:-=+□▥";

export default function AttestedHero() {
  const { stage } = useExperience();
  const { byId } = useLandingFeeds();
  const readings = READINGS.map((reading) => {
    const feed = byId(reading.id);
    return {
      ...reading,
      feed,
      text:
        feed.value === null
          ? "-"
          : feed.unit === "USD" || feed.unit.startsWith("$")
            ? `$${feed.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : `${format(feed)} ${feed.unit}`,
    };
  });
  const currentReadings = useRef(readings);
  const root = useRef<HTMLElement>(null);
  const divider = useRef({ drag: 0, auto: 0, anchor: 0, touched: false });
  const cycle = useRef({ index: 0, hover: false });

  useEffect(() => {
    currentReadings.current = readings;
    if (stage !== "entered") return;
    const reading = readings[cycle.current.index];
    const value = root.current?.querySelector("[data-value]");
    const note = root.current?.querySelector("[data-note]");
    if (value)
      value.textContent = cycle.current.hover
        ? reading.feed.amount
        : reading.text;
    if (note)
      note.textContent = cycle.current.hover
        ? `÷ 10^${reading.feed.decimals} on Casper`
        : reading.note;
  }, [readings, stage]);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const scene = q<HTMLElement>(`.${styles.stage}`)[0];
      const shielded = q<HTMLElement>(`.${styles.shielded}`)[0];
      const canvas = q<HTMLCanvasElement>("[data-print]")[0];
      const render = () =>
        print(canvas, PAINTING, {
          cell: scene.clientWidth <= 760 ? 9 : 12,
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
      const line = q<SVGLineElement>(`.${styles.split} line`)[0];
      const handle = q<HTMLElement>(`.${styles.handle}`)[0];
      const frame = q<HTMLElement>(`.${styles.frame}`)[0];
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const state = divider.current;
      if (reduced) state.drag = 0.5;

      const draw = () => {
        const { clientWidth: w, clientHeight: h } = scene;
        if (state.auto <= 0) state.anchor = 0;
        const push =
          state.anchor >= 0.999
            ? 0
            : gsap.utils.clamp(
                0,
                1,
                (state.auto - state.anchor) / (1 - state.anchor),
              );
        const position = state.drag + (-LEAN - state.drag) * push;
        const lean = h * LEAN;
        const [top, bottom] = [
          position * w + lean / 2,
          position * w - lean / 2,
        ];
        shielded.style.clipPath = `polygon(${f(top)}px 0, ${f(w + lean)}px 0, ${f(w + lean)}px ${h}px, ${f(bottom)}px ${h}px)`;
        line.setAttribute("x1", f(top));
        line.setAttribute("x2", f(bottom));
        line.setAttribute("y2", String(h));
        const frameTop = frame.offsetTop;
        const y = frameTop + (h - frameTop) / 2;
        handle.style.transform = `translate(${f(top + ((bottom - top) * y) / h)}px, ${f(y)}px)`;
        const value = String(
          Math.round(gsap.utils.clamp(0, 1, position) * 100),
        );
        if (handle.getAttribute("aria-valuenow") !== value)
          handle.setAttribute("aria-valuenow", value);
      };
      gsap.ticker.add(draw);
      const cleanup = () => {
        gsap.ticker.remove(draw);
        observer.disconnect();
        clearTimeout(pending);
      };

      if (reduced) return cleanup;

      const split = SplitText.create(q("[data-line]"), {
        type: "words",
        mask: "words",
        wordsClass: "split-word",
      });
      const attested = q<HTMLElement>(`.${styles.redacted}`)[0];
      const number = attested.querySelector<HTMLElement>("[data-value]")!;
      const note = attested.querySelector<HTMLElement>("[data-note]")!;
      const show = (open: boolean) => {
        const {
          text,
          note: label,
          feed,
        } = currentReadings.current[cycle.current.index];
        gsap.to(number, {
          duration: 0.6,
          scrambleText: {
            text: open ? feed.amount : text,
            chars: GLYPHS,
            speed: 0.7,
          },
          overwrite: "auto",
        });
        gsap.to(note, {
          duration: 0.5,
          scrambleText: {
            text: open ? `÷ 10^${feed.decimals} on Casper` : label,
            chars: GLYPHS,
          },
          overwrite: "auto",
        });
      };
      const peek = (open: boolean) => () => {
        cycle.current.hover = open;
        show(open);
        if (open) sound.play("HoverUI_In");
      };
      attested.addEventListener("pointerenter", peek(true));
      attested.addEventListener("pointerleave", peek(false));
      let next: gsap.core.Tween | undefined;
      const advance = () => {
        next = gsap.delayedCall(CYCLE_SECONDS, () => {
          if (
            !cycle.current.hover &&
            root.current!.getBoundingClientRect().bottom > 0
          ) {
            cycle.current.index = (cycle.current.index + 1) % READINGS.length;
            show(false);
          }
          advance();
        });
      };
      attested.addEventListener("claros:cycle", advance, { once: true });

      gsap.set(split.words, { yPercent: 115 });
      gsap.set(q(`.${styles.bar}`), { scaleX: 0 });
      gsap.set(q("[data-value]"), { opacity: 0 });
      gsap.set(q("[data-hero-fade]"), {
        opacity: 0,
        y: 16,
        filter: "blur(8px)",
      });
      gsap.set(q(`.${styles.window}`), { yPercent: 60, opacity: 0 });
      const gutter = () =>
        parseFloat(getComputedStyle(q(".container")[0]).paddingLeft);
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
        .fromTo(
          frame,
          { top: cardTop, left: gutter, right: gutter },
          { top: 0, left: 0, right: 0, duration: 0.6 },
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
        .to(state, { auto: 1, duration: 0.6, ease: "power1.inOut" }, 0.3)
        .fromTo(
          q(`.${styles.closing}`),
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.2 },
          0.78,
        );

      return () => {
        cleanup();
        next?.kill();
      };
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
      const labels = q<HTMLElement>(`.${styles.labels} span`);
      gsap
        .timeline({ delay: 0.3, defaults: { ease: "power3.out" } })
        .to(
          q(".split-word"),
          { yPercent: 0, duration: 1.1, stagger: 0.07 },
          0.2,
        )
        .add(() => sound.play("DecodingUI"), 0.3)
        .add(() => {
          labels.forEach((label) =>
            gsap.to(label, {
              duration: 0.9,
              scrambleText: {
                text: label.textContent!,
                chars: DECODE_CHARS,
                speed: 0.5,
              },
            }),
          );
        }, 0.3)
        .to(
          q(`.${styles.bar}`),
          { scaleX: 1, duration: 0.7, ease: "power4.inOut" },
          1.1,
        )
        .set(q("[data-value]"), { opacity: 1 }, 1.3)
        .to(
          q("[data-value]"),
          {
            duration: 1.1,
            scrambleText: {
              text: currentReadings.current[0].text,
              chars: GLYPHS,
              speed: 0.5,
            },
          },
          1.3,
        )
        .add(() => sound.play("ClickUI"), 1.9)
        .add(
          () =>
            q(`.${styles.redacted}`)[0]?.dispatchEvent(
              new Event("claros:cycle"),
            ),
          2.4,
        )
        .to(
          q("[data-hero-fade]"),
          { opacity: 1, y: 0, filter: "blur(0px)", duration: 1, stagger: 0.1 },
          1,
        )
        .to(
          q(`.${styles.window}`),
          { yPercent: 0, opacity: 1, duration: 1.6, ease: "expo.out" },
          1.1,
        )
        .add(() => {
          if (!divider.current.touched)
            gsap.to(divider.current, {
              drag: 0.5,
              duration: 1.6,
              ease: "expo.inOut",
            });
        }, 1.6);
    },
    { dependencies: [stage === "intro"], scope: root },
  );
  const place = (drag: number) => {
    const state = divider.current;
    gsap.killTweensOf(state, "drag");
    state.touched = true;
    state.drag = gsap.utils.clamp(0.04, 0.96, drag);
    state.anchor = state.auto;
  };
  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    const onHandle = event.currentTarget.getAttribute("role") === "slider";
    if (!onHandle && event.pointerType === "touch") return;
    event.preventDefault();
    const scene = event.currentTarget.closest<HTMLElement>(`.${styles.stage}`)!;
    scene
      .querySelector<HTMLElement>(`.${styles.handle}`)!
      .focus({ preventScroll: true });
    const id = event.pointerId;
    const follow = (clientX: number) => {
      const box = scene.getBoundingClientRect();
      place((clientX - box.left) / box.width);
    };
    const move = (e: PointerEvent) => e.pointerId === id && follow(e.clientX);
    const end = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      delete scene.dataset.dragging;
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", end);
      removeEventListener("pointercancel", end);
    };
    follow(event.clientX);
    scene.dataset.dragging = "";
    addEventListener("pointermove", move);
    addEventListener("pointerup", end);
    addEventListener("pointercancel", end);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const step = { ArrowLeft: -0.05, ArrowRight: 0.05 }[event.key];
    if (!step) return;
    event.preventDefault();
    place(divider.current.drag + step);
  };

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
          <div className={styles.labels}>
            <span className="label">Real-world data oracle</span>
            <span className="label">On Casper testnet</span>
          </div>
          <div className={styles.headline}>
            <h1 className={styles.title}>
              <span data-line>
                Read{" "}
                <span className={styles.redacted} data-cursor="On chain">
                  <i className={styles.bar} aria-hidden="true" />
                  <span className={styles.value} data-value>
                    {readings[0].text}
                  </span>
                  <span className={`mono ${styles.note}`} data-note>
                    {READINGS[0].note}
                  </span>
                </span>
              </span>
              <span data-line>from Casper</span>
            </h1>
            <div className={styles.side} data-hero-fade>
              <p>
                Claros puts real-world readings on Casper: energy prices, the
                grid, civic revenue. Each one is attested by an agent with its
                source and a hash anyone can check, and read by any contract,
                app or agent.
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

        <div
          className={styles.window}
          onPointerDown={onPointerDown}
          data-cursor="Drag"
        >
          <img
            className={styles.painting}
            src={PAINTING}
            alt=""
            draggable={false}
          />
          <div className={styles.shielded}>
            <canvas className={styles.painting} data-print />
          </div>
          <svg className={styles.split} aria-hidden="true">
            <line y1="0" />
          </svg>
          <p className={styles.closing}>
            Every value carries its source, its hash and its signer.
          </p>
        </div>

        <div className={styles.frame} aria-hidden="true">
          <span className={`label ${styles.tag}`}>The source</span>
          <span className={`label ${styles.tag} ${styles.tagShielded}`}>
            On Casper
          </span>
        </div>

        <div
          className={styles.handle}
          role="slider"
          tabIndex={0}
          aria-label="Compare the source with the reading on Casper"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={50}
          onPointerDown={onPointerDown}
          onKeyDown={onKeyDown}
          data-cursor="Drag"
        >
          <span aria-hidden="true">‹ ›</span>
        </div>
      </div>
    </section>
  );
}
