"use client";

import { useRef } from "react";
import Cell from "@/components/landing/ui/Cell";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/landing/gsap";
import styles from "./Marquee.module.css";

const ITEMS = [
  "Petroleum",
  "Natural gas",
  "Electricity",
  "Coal",
  "Nuclear",
  "CO2 emissions",
  "Biomass",
  "State energy",
  "Short-term outlooks",
  "International",
  "Civic revenue",
];

export default function Marquee() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const loop = gsap.to(`.${styles.track}`, {
          xPercent: -50,
          duration: 38,
          ease: "none",
          repeat: -1,
        });
        ScrollTrigger.create({
          trigger: root.current,
          start: "top bottom",
          end: "bottom top",
          onUpdate: (self) => {
            const boost = Math.min(Math.abs(self.getVelocity()) / 250, 7);
            gsap.to(loop, {
              timeScale: self.direction * (1 + boost),
              duration: 0.25,
              overwrite: true,
              onComplete: () =>
                void gsap.to(loop, {
                  timeScale: self.direction,
                  duration: 1.2,
                }),
            });
          },
        });
      });
      return () => media.revert();
    },
    { scope: root },
  );

  const run = (copy: number) =>
    ITEMS.map((item) => (
      <span
        key={`${copy}-${item}`}
        className={styles.item}
        aria-hidden={copy > 0 || undefined}
      >
        {item}
        <Cell className={styles.cell} />
      </span>
    ));

  return (
    <div ref={root} className={styles.marquee}>
      <div className={styles.track}>
        {run(0)}
        {run(1)}
      </div>
    </div>
  );
}
