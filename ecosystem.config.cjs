// pm2 process manager for running Claros live on a host.
//
//   npm i -g pm2
//   # install deps + create .env in each project first (see each .env.example):
//   (cd agent && npm install)
//   (cd services/claros-api && npm install)
//   (cd services/oracle-server && npm install)
//   (cd services/facilitator && npm install)
//   pm2 start ecosystem.config.cjs        # start all
//   pm2 logs                              # tail logs
//   pm2 save && pm2 startup               # survive reboots
//
// Each app loads its own .env from its cwd. The agent and the facilitator both
// sign transactions, so their keys must be funded with testnet CSPR.
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
      time: true,
    },
    {
      // Hermes-style REST read API (free): GET /v1/feeds, /v1/feeds/:id, /v1/datasets.
      name: "claros-api",
      cwd: "./services/claros-api",
      script: "npm",
      args: "start",
      autorestart: true,
      time: true,
    },
    {
      // x402-gated paid feed server: GET /oracle/feed (settled in WCSPR).
      name: "claros-oracle-server",
      cwd: "./services/oracle-server",
      script: "npm",
      args: "start",
      autorestart: true,
      time: true,
    },
    {
      // x402 facilitator: verifies and settles WCSPR payments on Casper.
      name: "claros-facilitator",
      cwd: "./services/facilitator",
      script: "npm",
      args: "start",
      autorestart: true,
      time: true,
    },
  ],
}
