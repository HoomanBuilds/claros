"use client";

import { useSyncExternalStore, type MouseEvent } from "react";
import { sound } from "@/lib/landing/sound";
import styles from "./SoundToggle.module.css";

export default function SoundToggle({ className }: { className?: string }) {
  const on = useSyncExternalStore(
    sound.subscribe,
    sound.isEnabled,
    () => false,
  );
  const toggle = (event: MouseEvent) => {
    event.stopPropagation();
    sound.toggle();
  };

  return (
    <button
      type="button"
      className={`${styles.toggle} ${className ?? ""}`}
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "Turn sound off" : "Turn sound on"}
      data-sfx="ui"
    >
      <span className={styles.label}>{on ? "Sound on" : "Sound off"}</span>
      <span
        className={styles.bars}
        data-on={on || undefined}
        aria-hidden="true"
      >
        <i />
        <i />
        <i />
        <i />
      </span>
    </button>
  );
}
