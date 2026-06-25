import { listEiaFeeds } from './tools.js';

for (const f of listEiaFeeds()) {
  console.log(`${f.asset_id.padEnd(40)} ${f.frequency.padEnd(9)} ${f.unit.padEnd(14)} ${f.route}`);
}
console.log(`\n${listEiaFeeds().length} EIA feeds in the Claros catalog.`);
