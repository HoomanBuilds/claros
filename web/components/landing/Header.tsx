"use client";

import { useCallback, useRef, useState } from "react";
import Menu from "@/components/landing/Menu";
import { ScrollTrigger, useGSAP } from "@/lib/landing/gsap";
import { PHASES } from "@/lib/landing/phases";
import { ClarosMark } from "@/components/claros-mark";
import styles from "./Header.module.css";

const HEADER_LINE = 44;

export default function Header() {
  const root = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState(0);
  const [tone, setTone] = useState("paper");
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const [scrolled, setScrolled] = useState(false);

  useGSAP(() => {
    const onTone = (event: Event) =>
      setTone((event as CustomEvent<string>).detail);
    addEventListener("claros:tone", onTone);
    ScrollTrigger.create({
      start: 80,
      end: "max",
      onToggle: (self) => setScrolled(self.isActive),
    });
    for (const section of document.querySelectorAll<HTMLElement>(
      "[data-theme]",
    )) {
      ScrollTrigger.create({
        trigger: section,
        start: `top ${HEADER_LINE}px`,
        end: `bottom ${HEADER_LINE}px`,
        onToggle: (self) => self.isActive && setTone(section.dataset.theme!),
      });
    }
    for (const section of document.querySelectorAll<HTMLElement>(
      "main [data-phase]",
    )) {
      ScrollTrigger.create({
        trigger: section,
        start: "top 55%",
        end: "bottom 55%",
        onToggle: (self) =>
          self.isActive && setPhase(Number(section.dataset.phase)),
      });
    }
    return () => removeEventListener("claros:tone", onTone);
  });

  return (
    <>
      <header
        ref={root}
        className={styles.header}
        data-tone={tone}
        data-scrolled={scrolled || undefined}
      >
        <a
          href="#top"
          className={styles.brand}
          aria-label="Claros, back to top"
        >
          <ClarosMark size={22} className={styles.mark} />
          <span>Claros</span>
        </a>

        <nav className={styles.phases} aria-label="Phases">
          {PHASES.map(({ id, label }, index) => (
            <a
              key={id}
              href={`#${id}`}
              className={styles.dot}
              aria-current={index === phase ? "step" : undefined}
              aria-label={`Part ${index + 1}: ${label}`}
            >
              <span className={`label ${styles.tip}`} aria-hidden="true">
                0{index + 1} {label}
              </span>
            </a>
          ))}
        </nav>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.menuButton}
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
          >
            Menu
          </button>
        </div>
      </header>
      <Menu open={menuOpen} onClose={closeMenu} />
    </>
  );
}
