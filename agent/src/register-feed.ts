import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { registerFeed } from './tools.js';

// feed config: { feed_id, decimals, unit, title, source, route, frequency, description }
const cfg = JSON.parse(readFileSync(process.argv[2] ?? 'feed.json', 'utf8'));
const r = await registerFeed(
  cfg.feed_id, cfg.decimals, cfg.unit, cfg.title, cfg.source, cfg.route, cfg.frequency, cfg.description,
);
console.log(`registered ${cfg.feed_id}: ${r.explorer}`);
