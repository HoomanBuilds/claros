"use client";

import { useEffect, useState } from "react";
import { useExperience } from "@/components/landing/Experience";
import styles from "./HeroSwitcher.module.css";

export type HeroName = "print" | "attested";

const OPTIONS: {
  name: HeroName;
  letter: string;
  label: string;
  href: string;
}[] = [
  { name: "print", letter: "A", label: "Print", href: "/" },
  { name: "attested", letter: "B", label: "Attested", href: "/b" },
];

export default function HeroSwitcher({ current }: { current: HeroName }) {
  const { stage } = useExperience();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const hero = document.getElementById("top");
    if (!hero) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "-88px 0px 0px 0px" },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      className={styles.switcher}
      aria-label="Hero options"
      data-hidden={stage === "intro" || !visible || undefined}
    >
      <span className="label">Hero</span>
      {OPTIONS.map(({ name, letter, label, href }) => (
        <a
          key={name}
          href={href}
          aria-current={name === current ? "page" : undefined}
          data-sfx="ui"
        >
          <b className="figure">{letter}</b>
          {label}
        </a>
      ))}
    </nav>
  );
}
