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
// Tuned for the 8 GB production host. PM2 still enforces per-process limits so a
// single service cannot exhaust the machine.
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
      max_memory_restart: "1G",
      env: { NODE_OPTIONS: "--max-old-space-size=768" },
      time: true,
    },
    {
      name: "claros-feed-updater",
      cwd: "./agent",
      script: "npm",
      args: "run update-feeds",
      autorestart: true,
      max_memory_restart: "512M",
      env: { NODE_OPTIONS: "--max-old-space-size=384" },
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
