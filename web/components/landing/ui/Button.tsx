import type { ReactNode } from "react";
import styles from "./Button.module.css";

type Variant = "cta" | "outline" | "square" | "pill";

export default function Button({
  href,
  variant = "cta",
  children,
  className = "",
}: {
  href: string;
  variant?: Variant;
  children: ReactNode;
  className?: string;
}) {
  const external = href.startsWith("http");
  const common = {
    href,
    className: `${styles.button} ${styles[variant]} ${className}`,
    "data-sfx": "cta",
    ...(external ? { target: "_blank", rel: "noreferrer" } : {}),
  };

  if (variant === "square") {
    return (
      <a {...common}>
        <span className={styles.box} aria-hidden="true">
          <span className={styles.plus} />
        </span>
        <span className={styles.dot} aria-hidden="true" />
        <span>{children}</span>
      </a>
    );
  }

  if (variant === "pill") {
    return (
      <a {...common}>
        {children}
        <Arrow className={styles.pillArrow} />
      </a>
    );
  }

  return (
    <a {...common}>
      <span className={styles.content}>
        <Arrow className={styles.leading} />
        <span className={styles.text}>{children}</span>
        <Arrow className={styles.trailing} />
      </span>
    </a>
  );
}

export function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 8h11M9 3.5 13.5 8 9 12.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
