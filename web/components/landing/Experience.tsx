"use client";

import Lenis from "lenis";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { gsap, ScrollTrigger } from "@/lib/landing/gsap";

export type Stage = "intro" | "revealing" | "entered";

type ExperienceValue = { stage: Stage; setStage: (stage: Stage) => void };

const ExperienceContext = createContext<ExperienceValue>({
  stage: "entered",
  setStage: () => {},
});

export const useExperience = () => useContext(ExperienceContext);

let lenis: Lenis | undefined;

export const getLenis = () => lenis;

export default function Experience({ children }: { children: ReactNode }) {
  const [stage, setStage] = useState<Stage>("entered");
  const value = useMemo(() => ({ stage, setStage }), [stage]);
  useEffect(() => {
    const restoration = history.scrollRestoration;
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    const instance = new Lenis({
      autoRaf: false,
      anchors: true,
      lerp: 0.1,
    });
    lenis = instance;
    instance.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => {
      instance.raf(time * 1000);
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    document.fonts.ready.then(() => ScrollTrigger.refresh());
    return () => {
      gsap.ticker.remove(tick);
      instance.destroy();
      lenis = undefined;
      history.scrollRestoration = restoration;
      document.documentElement.classList.remove("claros-locked");
    };
  }, []);
  useEffect(() => {
    const locked = stage !== "entered";
    document.documentElement.classList.toggle("claros-locked", locked);
    if (locked) lenis?.stop();
    else {
      lenis?.start();
      ScrollTrigger.refresh();
    }
  }, [stage]);
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      ScrollTrigger.batch("[data-reveal]", {
        start: "top 90%",
        once: true,
        onEnter: (elements) => {
          elements.forEach(
            (element) => ((element as HTMLElement).dataset.revealed = ""),
          );
          gsap.fromTo(
            elements,
            { opacity: 0, filter: "blur(8px)", y: 16 },
            {
              opacity: 1,
              filter: "blur(0px)",
              y: 0,
              duration: 0.9,
              ease: "power3.out",
              stagger: 0.08,
              clearProps: "opacity,filter,transform",
            },
          );
        },
      });
    });
    return () => media.revert();
  }, []);

  return (
    <ExperienceContext.Provider value={value}>
      {children}
    </ExperienceContext.Provider>
  );
}
