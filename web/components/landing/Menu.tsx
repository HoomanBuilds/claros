"use client";

import { useEffect, useRef } from "react";
import { getLenis } from "@/components/landing/Experience";
import { gsap, useGSAP } from "@/lib/landing/gsap";
import { cellDisc } from "@/lib/landing/cells";
import styles from "./Menu.module.css";

const LINKS = [
  ["GitHub", "https://github.com/HoomanBuilds/claros"],
  ["SDK on npm", "https://www.npmjs.com/package/claros-oracle"],
  ["Explorer", "https://testnet.cspr.live"],
];

const PAGES = [
  { label: "Home", href: "/" },
  { label: "Feeds", href: "/feeds/" },
  { label: "Datasets", href: "/datasets/" },
  { label: "Network", href: "/network/" },
  { label: "Docs", href: "/docs/" },
];

export default function Menu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  useGSAP(
    () => {
      const menu = root.current!;
      if (!open && !wasOpen.current) return;
      wasOpen.current = true;
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      gsap.set(menu, { visibility: "visible" });

      const origin = document
        .querySelector<HTMLElement>("[aria-controls='site-menu']")!
        .getBoundingClientRect();
      const [x, y] = [
        origin.left + origin.width / 2,
        origin.top + origin.height / 2,
      ];
      const farthest = Math.hypot(
        Math.max(x, innerWidth - x),
        Math.max(y, innerHeight - y),
      );
      const ink = { radius: open ? 0 : farthest * 1.3, time: 0 };
      const cell = innerWidth < 760 ? 28 : 44;
      const draw = () => {
        menu.style.clipPath = `path("${cellDisc(x, y, ink.radius, cell) || "M0 0Z"}")`;
      };

      if (open) {
        menu.scrollTop = 0;
        draw();
        gsap.to(ink, {
          radius: farthest * 1.3,
          time: 1,
          duration: reduced ? 0 : 0.45,
          ease: "power3.inOut",
          onUpdate: draw,
          onComplete: () => gsap.set(menu, { clipPath: "none" }),
        });
        gsap.fromTo(
          menu.querySelectorAll("[data-menu-item]"),
          { yPercent: 110, opacity: 0 },
          {
            yPercent: 0,
            opacity: 1,
            duration: reduced ? 0 : 0.3,
            ease: "power3.out",
            stagger: reduced ? 0 : 0.025,
            delay: reduced ? 0 : 0.1,
          },
        );
      } else {
        gsap.to(ink, {
          radius: 0,
          time: 1,
          duration: reduced ? 0 : 0.25,
          ease: "power3.inOut",
          onUpdate: draw,
          onComplete: () => {
            gsap.set(menu, { visibility: "hidden" });
          },
        });
      }
    },
    { dependencies: [open], scope: root, revertOnUpdate: true },
  );

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    getLenis()?.stop();
    document.documentElement.classList.add("claros-locked");
    root.current?.querySelector("button")?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const elements = root.current?.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled])",
      );
      if (!elements?.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("claros-locked");
      getLenis()?.start();
      previousFocus?.focus({ preventScroll: true });
    };
  }, [open, onClose]);

  return (
    <div
      ref={root}
      id="site-menu"
      className={styles.menu}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      aria-hidden={!open}
      inert={!open}
      data-lenis-prevent
    >
      <img className={styles.backdrop} src="/landing/aztec/city.webp" alt="" />
      <button
        type="button"
        className={styles.close}
        onClick={onClose}
      >
        Close
      </button>

      <nav className={styles.links} aria-label="Explore Claros">
        {PAGES.map(({ href, label }, index) => (
          <div key={href} className={styles.row}>
            <a
              href={href}
              className={styles.link}
              onClick={onClose}
              data-menu-item
            >
              <span className={`figure ${styles.index}`}>0{index + 1}</span>
              <span className={styles.text}>{label}</span>
              <span className={styles.arrow} aria-hidden="true">
                +
              </span>
            </a>
          </div>
        ))}
      </nav>

      <div className={styles.aside}>
        <div className={styles.row}>
          <p className="label" data-menu-item>
            Build with Claros
          </p>
        </div>
        <div className={styles.row}>
          <p className={styles.mail} data-menu-item>
            npm install claros-oracle
          </p>
        </div>
        <ul className={styles.socials}>
          {LINKS.map(([name, href]) => (
            <li key={name} className={styles.row}>
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                data-menu-item
              >
                {name} +
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
