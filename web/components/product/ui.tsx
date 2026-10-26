import type { ReactNode } from "react";
import { Search, X } from "lucide-react";
import styles from "./product.module.css";

export function Metrics({
  items,
}: {
  items: { label: string; value: ReactNode; detail: string }[];
}) {
  return (
    <dl className={styles.metrics}>
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
          <span>{item.detail}</span>
        </div>
      ))}
    </dl>
  );
}

export function SectionHeading({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className={styles.sectionHeading}>
      <div>
        <span className={styles.kicker}>{label}</span>
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  label,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
}) {
  return (
    <div className={styles.search} role="search">
      <Search size={17} aria-hidden="true" />
      <label
        className={styles.srOnly}
        htmlFor={label.toLowerCase().replace(/\s+/g, "-")}
      >
        {label}
      </label>
      <input
        id={label.toLowerCase().replace(/\s+/g, "-")}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="search"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={`Clear ${label.toLowerCase()}`}
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  children,
  onReset,
}: {
  title: string;
  children: ReactNode;
  onReset?: () => void;
}) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyMark} aria-hidden="true">
        ∅
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
      {onReset && (
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onReset}
        >
          Reset filters
        </button>
      )}
    </div>
  );
}
