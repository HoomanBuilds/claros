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
import { sound, type CueName, type SfxName } from "@/lib/landing/sound";

export type Stage = "intro" | "revealing" | "entered";

type ExperienceValue = { stage: Stage; setStage: (stage: Stage) => void };

const ExperienceContext = createContext<ExperienceValue>({
  stage: "entered",
  setStage: () => {},
});

export const useExperience = () => useContext(ExperienceContext);

let lenis: Lenis | undefined;

export const getLenis = () => lenis;

const HOVER_SOUNDS: Record<string, SfxName> = {
  cta: "HoverCTA_In",
  ui: "HoverUI_In",
};

const chimeThreshold = (deltaMs: number) => {
  const fps = 1000 / deltaMs;
  return 5 + (Math.min(Math.max(fps, 30), 120) - 30) * (3 / 90);
};

export default function Experience({ children }: { children: ReactNode }) {
  const [stage, setStage] = useState<Stage>("intro");
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
    const tick = (time: number, deltaMs: number) => {
      instance.raf(time * 1000);
      if (
        deltaMs > 0 &&
        Math.abs(instance.velocity) / deltaMs > chimeThreshold(deltaMs)
      )
        sound.scrollChime();
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
      sound.dispose();
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
    if (stage !== "revealing") return;
    const timer = window.setTimeout(sound.startMusic, 100);
    return () => window.clearTimeout(timer);
  }, [stage]);
  useEffect(() => {
    const triggers: ScrollTrigger[] = [];
    const hero = document.getElementById("how");
    if (hero) {
      let transformed = false;
      triggers.push(
        ScrollTrigger.create({
          trigger: hero,
          start: "top 60%",
          end: "max",
          onUpdate: (self) => {
            const next = self.progress > 0;
            if (next === transformed) return;
            transformed = next;
            sound.setScene(next ? "griffin" : "egg");
            if (next) sound.cue("eggToGriffin");
            else sound.fadeCue("eggToGriffin");
          },
        }),
      );
    }
    for (const element of document.querySelectorAll<HTMLElement>(
      "[data-sound-cue]",
    )) {
      const cue = element.dataset.soundCue as CueName;
      triggers.push(
        ScrollTrigger.create({
          trigger: element,
          start: "top 65%",
          onEnter: () => sound.cue(cue),
          onLeaveBack: () => sound.fadeCue(cue),
        }),
      );
    }
    return () => triggers.forEach((trigger) => trigger.kill());
  }, []);
  useEffect(() => {
    const over = (event: MouseEvent) => {
      const target = (event.target as Element).closest<HTMLElement>(
        "[data-sfx]",
      );
      if (!target || target.contains(event.relatedTarget as Node | null))
        return;
      sound.play(HOVER_SOUNDS[target.dataset.sfx!] ?? "HoverUI_In");
    };
    const click = (event: MouseEvent) => {
      if ((event.target as Element).closest("[data-sfx]"))
        sound.play("ClickUI");
    };
    document.addEventListener("mouseover", over);
    document.addEventListener("click", click);
    return () => {
      document.removeEventListener("mouseover", over);
      document.removeEventListener("click", click);
    };
  }, []);
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
