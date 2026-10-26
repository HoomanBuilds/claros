import Button from "@/components/landing/ui/Button";
import styles from "./Cta.module.css";

export default function Cta() {
  return (
    <section className={styles.cta} data-theme="signal">
      <div className={styles.dots} aria-hidden="true" />
      <div className={`container ${styles.inner}`}>
        <h2 className={styles.title} data-reveal>
          Need the world
          <br />
          in your contract?
        </h2>
        <div className={styles.actions} data-reveal>
          <Button href="/docs/quickstart">Read a feed</Button>
          <Button href="/docs/network/run-an-agent" variant="outline">
            Run an agent
          </Button>
        </div>
      </div>

      <img
        loading="lazy"
        className={styles.trees}
        src="/landing/taceo/trees.svg"
        alt=""
        aria-hidden="true"
      />
    </section>
  );
}
