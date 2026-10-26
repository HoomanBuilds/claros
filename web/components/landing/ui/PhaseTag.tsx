import styles from "./PhaseTag.module.css";

export default function PhaseTag({
  phase,
  children,
  tone = "dark",
}: {
  phase: number;
  children: string;
  tone?: "dark" | "light";
}) {
  return (
    <div className={styles.tag} data-tone={tone} data-reveal>
      <span className={`label ${styles.phase}`}>Part 0{phase}</span>
      <span className={`label ${styles.name}`}>{children}</span>
    </div>
  );
}
