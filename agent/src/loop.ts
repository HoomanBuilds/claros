import 'dotenv/config';
import { readFileSync, writeFileSync } from 'node:fs';
import { latestRevenue } from './sandiego.js';
import { runCycle } from './agent-cycle.js';

const ASSETS = (process.env.CYCLE_ASSETS ?? 'OP-1').split(',').map(s => s.trim()).filter(Boolean);
const INTERVAL_MS = Number(process.env.CYCLE_INTERVAL_MS ?? 3_600_000);
const STATE_FILE = process.env.CYCLE_STATE_FILE ?? '.cycle-state.json';
const DRY_RUN = process.env.CYCLE_DRY_RUN === '1';

const ts = () => new Date().toISOString();

function loadState(): Record<string, number> {
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return {};
  }
}
function saveState(s: Record<string, number>): void {
  writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}

// One heartbeat: for each asset, run a full cycle only when the data source has a
// newer period than we last processed (San Diego data lags ~daily, so re-attesting
// the same period would just waste gas).
async function tick(): Promise<void> {
  const state = loadState();
  for (const asset of ASSETS) {
    try {
      const { period } = await latestRevenue(asset);
      const last = state[asset];
      if (last && period <= last) {
        console.log(`[${ts()}] ${asset}: no new data (period ${period} already processed) — skip`);
        continue;
      }
      console.log(`[${ts()}] ${asset}: new data period ${period} — ${DRY_RUN ? 'WOULD run cycle (dry run)' : 'running cycle'}`);
      if (!DRY_RUN) await runCycle(asset);
      state[asset] = period;
      saveState(state);
    } catch (e) {
      console.error(`[${ts()}] ${asset}: cycle error — ${(e as Error).message}`);
    }
  }
}

console.log(`ProofYield heartbeat: assets=[${ASSETS.join(', ')}], interval=${INTERVAL_MS}ms${DRY_RUN ? ' (DRY RUN)' : ''}`);
await tick();
setInterval(tick, INTERVAL_MS);
