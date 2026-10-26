import styles from "@/components/product/product.module.css";

const STEPS = [
  {
    name: "Source",
    detail:
      "A real-world observation, with its original reporting period and unit.",
  },
  {
    name: "Attest",
    detail:
      "An agent normalizes the reading, hashes its source payload, and signs the attestation.",
  },
  {
    name: "Record",
    detail:
      "Casper contracts enforce eligibility and store the value with its provenance.",
  },
  {
    name: "Read",
    detail:
      "Contracts, applications, and agents read the attested value and verify its source hash.",
  },
];

export function TopologyGraph() {
  return (
    <div className={styles.pipeline}>
      <ol className={styles.pipelineSteps} aria-label="Data attestation flow">
        {STEPS.map((step, index) => (
          <li key={step.name}>
            <span aria-hidden="true">0{index + 1}</span>
            <h3>{step.name}</h3>
            <p>{step.detail}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
