import styles from "./Corners.module.css";

export function Diamonds() {
  return (
    <>
      {["tl", "tr", "bl", "br"].map((corner) => (
        <span
          key={corner}
          className={`${styles.diamond} ${styles[corner]}`}
          aria-hidden="true"
        />
      ))}
    </>
  );
}

export function Pins() {
  return (
    <>
      {["tl", "tr", "bl", "br"].map((corner) => (
        <svg
          key={corner}
          className={`${styles.pin} ${styles[corner]}`}
          viewBox="0 0 11 11"
          fill="none"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M2 4.95C.86 4.72 0 3.71 0 2.5a2.5 2.5 0 0 1 4.95-.5H11v1H4.95A2.5 2.5 0 0 1 3 4.95V11H2V4.95Z"
            fill="currentColor"
          />
        </svg>
      ))}
    </>
  );
}
