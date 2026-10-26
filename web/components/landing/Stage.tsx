"use client";

import { useEffect, useRef } from "react";
import { useExperience } from "@/components/landing/Experience";
import { gsap } from "@/lib/landing/gsap";
import { announce, shared } from "@/lib/landing/instance";
import { World } from "@/lib/landing/world";
import styles from "./Stage.module.css";

export const PICTURES = { landscape: "/landing/aztec/landscape.webp" };

const load = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

export default function Stage() {
  const { stage } = useExperience();
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef(true);

  useEffect(() => {
    if (stage !== "entered") return;
    gsap.to(ref.current, {
      opacity: 0,
      duration: 0.6,
      delay: 0.1,
      onComplete: () => void (live.current = false),
    });
  }, [stage]);

  useEffect(() => {
    const canvas = ref.current!;
    let world: World | undefined;
    const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
    const cleanups: (() => void)[] = [];
    let disposed = false;

    const draw = (_t: number, deltaMs: number) => {
      if (!world || (!live.current && !shared.footer)) return;
      const dt = Math.min(deltaMs, 100) / 1000;
      pointer.sx += (pointer.x - pointer.sx) * Math.min(1, dt * 2);
      pointer.sy += (pointer.y - pointer.sy) * Math.min(1, dt * 2);
      world.pan = { x: pointer.sx * 0.012, y: -pointer.sy * 0.01 };
      world.render(dt);
    };

    Promise.all([
      load("/landing/hyperlane/glyphs.png"),
      ...Object.values(PICTURES).map(load),
    ])
      .then(([sprite, ...images]) => {
        if (disposed) return;
        const pictures = Object.fromEntries(
          Object.keys(PICTURES).map((name, i) => [name, images[i]]),
        );
        try {
          world = new World(canvas, sprite, pictures);
        } catch (error) {
          if (process.env.NODE_ENV !== "production")
            console.warn("The stage could not be drawn:", error);
          shared.failed = true;
          announce();
          return;
        }
        world.zoom = 1.2;
        shared.world = world;
        announce();
        const observer = new ResizeObserver(() => world?.resize());
        observer.observe(canvas);
        cleanups.push(() => observer.disconnect());
      })
      .catch(() => {
        if (disposed) return;
        shared.failed = true;
        announce();
      });

    const move = (event: PointerEvent) => {
      pointer.x = event.clientX / innerWidth - 0.5;
      pointer.y = event.clientY / innerHeight - 0.5;
    };
    addEventListener("pointermove", move);
    gsap.ticker.add(draw);
    return () => {
      disposed = true;
      removeEventListener("pointermove", move);
      gsap.ticker.remove(draw);
      cleanups.forEach((fn) => fn());
      world?.dispose();
      shared.world = undefined;
    };
  }, []);

  return <canvas ref={ref} className={styles.stage} aria-hidden="true" />;
}
