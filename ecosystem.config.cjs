// pm2 process manager for running Claros live on a host.
//
//   npm i -g pm2
//   # install deps + create .env in each project first (see each .env.example):
//   (cd agent && npm install)
//   (cd services/claros-api && npm install)
//   (cd services/oracle-server && npm install)
//   (cd services/facilitator && npm install)
//   pm2 start ecosystem.config.cjs                 # start all
//   pm2 start ecosystem.config.cjs --only claros-agent,claros-api   # core only (small VMs)
//   pm2 logs ; pm2 monit                           # watch
//   pm2 save && pm2 startup                        # survive reboots
//
// Tuned for a ~1 GB VM: each app caps its V8 heap (NODE_OPTIONS) and pm2 restarts
// it if RSS exceeds max_memory_restart, so a leak can't OOM the host. On a 1 GB box
// already running other apps, prefer `--only claros-agent,claros-api`; add the two
// x402 services only if you need the paid endpoint and have swap headroom.
//
// Each app loads its own .env from its cwd. The agent and facilitator sign
// transactions, so their keys must hold testnet CSPR.
module.exports = {
  apps: [
    {
      // Autonomous attestation agent: heartbeat that runs a cycle only on new
      // data, attesting feeds and recording treasury decisions on-chain.
      name: "claros-agent",
      cwd: "./agent",
      script: "npm",
      args: "run loop",
      autorestart: true,
      max_restarts: 10,
      restart_delay: 10000,
      max_memory_restart: "260M",
      env: { NODE_OPTIONS: "--max-old-space-size=200" },
      time: true,
    },
    {
      // Hermes-style REST read API (free): GET /v1/feeds, /v1/feeds/:id, /v1/datasets.
      name: "claros-api",
      cwd: "./services/claros-api",
      script: "npm",
      args: "start",
      autorestart: true,
      max_memory_restart: "170M",
      env: { NODE_OPTIONS: "--max-old-space-size=128" },
      time: true,
    },
    {
      // x402-gated paid feed server: GET /oracle/feed (settled in WCSPR).
      name: "claros-oracle-server",
      cwd: "./services/oracle-server",
      script: "npm",
      args: "start",
      autorestart: true,
      max_memory_restart: "180M",
      env: { NODE_OPTIONS: "--max-old-space-size=128" },
      time: true,
    },
    {
      // x402 facilitator: verifies and settles WCSPR payments on Casper.
      name: "claros-facilitator",
      cwd: "./services/facilitator",
      script: "npm",
      args: "start",
      autorestart: true,
      max_memory_restart: "180M",
      env: { NODE_OPTIONS: "--max-old-space-size=128" },
      time: true,
    },
  ],
}
