"use client";

import { useEffect, useRef } from "react";
import { print, type Print } from "@/lib/landing/print";

export default function Printed({
  src,
  className,
  ...options
}: Print & { src: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const settings = JSON.stringify(options);

  useEffect(() => {
    const canvas = ref.current!;
    const render = () =>
      void print(canvas, src, JSON.parse(settings) as Print).catch(() => {});
    let visible = false;
    let pending = 0;
    const observer = new ResizeObserver(() => {
      if (!visible) return;
      clearTimeout(pending);
      pending = window.setTimeout(render, 160);
    });
    observer.observe(canvas);
    const visibility = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        visible = true;
        render();
        visibility.disconnect();
      },
      { rootMargin: "400px" },
    );
    visibility.observe(canvas);
    return () => {
      observer.disconnect();
      visibility.disconnect();
      clearTimeout(pending);
    };
  }, [src, settings]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
