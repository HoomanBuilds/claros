import styles from "@/components/product/product.module.css";

const NODES = [
  {
    id: "source",
    label: "Source",
    detail: "Public real-world data",
    symbol: "Sc",
    x: 40,
    y: 146,
  },
  {
    id: "agent",
    label: "Agent",
    detail: "Checks and signs the reading",
    symbol: "Ag",
    x: 225,
    y: 64,
  },
  {
    id: "hash",
    label: "Provenance",
    detail: "Hash of the source payload",
    symbol: "#",
    x: 225,
    y: 228,
  },
  {
    id: "registry",
    label: "Registry",
    detail: "Value and proof on Casper",
    symbol: "Rg",
    x: 420,
    y: 146,
  },
  {
    id: "reader",
    label: "Reader",
    detail: "Contracts, apps, and agents",
    symbol: "Rd",
    x: 615,
    y: 146,
  },
];
const EDGES = [
  ["source", "agent"],
  ["source", "hash"],
  ["agent", "registry"],
  ["hash", "registry"],
  ["registry", "reader"],
];

export function TopologyGraph() {
  return (
    <div className={styles.pipeline}>
      <svg viewBox="0 0 800 360" role="img" aria-labelledby="pipeline-title">
        <title id="pipeline-title">
          Source data flows through the agent with a provenance hash into the
          on-chain registry, then to readers.
        </title>
        <defs>
          <pattern
            id="network-grid"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M24 0H0V24"
              fill="none"
              stroke="#1d2638"
              strokeWidth=".5"
            />
          </pattern>
        </defs>
        <rect width="800" height="360" fill="url(#network-grid)" />
        {EDGES.map(([fromId, toId]) => {
          const from = NODES.find((n) => n.id === fromId)!;
          const to = NODES.find((n) => n.id === toId)!;
          return (
            <g key={fromId + toId}>
              <line
                x1={from.x + 60}
                y1={from.y + 32}
                x2={to.x + 60}
                y2={to.y + 32}
                stroke="#42617f"
                strokeWidth="1.5"
                strokeDasharray="4 5"
              />
              <circle
                cx={(from.x + to.x) / 2 + 60}
                cy={(from.y + to.y) / 2 + 32}
                r="3"
                fill="#2aa8ff"
              />
            </g>
          );
        })}
        {NODES.map((node, i) => (
          <g key={node.id}>
            <rect
              x={node.x}
              y={node.y}
              width="120"
              height="64"
              fill="#0c1220"
              stroke="#2b4d70"
            />
            <text
              x={node.x + 8}
              y={node.y + 13}
              fill="#7cc8ff"
              fontSize="8"
              fontFamily="var(--font-triple), monospace"
            >
              0{i + 1}
            </text>
            <text
              x={node.x + 60}
              y={node.y + 41}
              textAnchor="middle"
              fill="#eef3f8"
              fontSize="17"
              fontFamily="var(--font-aeonik), sans-serif"
            >
              {node.label}
            </text>
            <circle cx={node.x + 109} cy={node.y + 10} r="2.5" fill="#2aa8ff" />
          </g>
        ))}
      </svg>
      <ol className={styles.pipelineMobile}>
        {NODES.map((node, i) => (
          <li key={node.id}>
            <span className={styles.element} aria-hidden="true">
              <small>0{i + 1}</small>
              {node.symbol}
            </span>
            <div>
              <strong>{node.label}</strong>
              <p>{node.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
