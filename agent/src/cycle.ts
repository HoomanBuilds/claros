import { runCycle } from './agent-cycle.js';

const asset = process.argv[2] ?? 'OP-1';
await runCycle(asset);
