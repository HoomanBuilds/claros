import { readFileSync } from 'node:fs';
import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import { getSnapshot } from './oracle.js';
import { getTreasury } from './treasury.js';

// Claros oracle read API — the "Hermes" of Claros. Serves real-world-data feeds
// read DIRECTLY from Casper on-chain state (values + self-describing metadata), plus
// the full EIA dataset discovery catalog. Free reads, like Pyth's price service.
const PORT = parseInt(process.env.PORT || '4030', 10);

let datasets: any[] = [];
try {
  datasets = JSON.parse(readFileSync(new URL('../../web/lib/eia-catalog.json', import.meta.url), 'utf8')).leaves;
} catch { /* discovery catalog optional */ }

const app = express();
app.use(cors({ origin: '*' }));
app.disable('x-powered-by');

const serialize = (o: any) => JSON.parse(JSON.stringify(o, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)));

// List all feeds live on-chain, with metadata + latest value.
app.get('/v1/feeds', async (_req, res) => {
  try {
    const { readings } = await getSnapshot();
    res.json({ count: readings.length, feeds: readings });
  } catch (e) {
    res.status(502).json({ error: (e as Error).message });
  }
});

// One feed: full reading (metadata + value + human number) from on-chain.
app.get('/v1/feeds/:id', async (req, res) => {
  try {
    const { readings } = await getSnapshot();
    const r = readings.find(reading => reading.feed_id === req.params.id);
    if (!r) return res.status(404).json({ error: `feed not found on-chain: ${req.params.id}` });
    res.json(serialize(r));
  } catch (e) {
    res.status(502).json({ error: (e as Error).message });
  }
});

// Discovery: the full EIA dataset universe that Claros can attest (search by family/keyword).
app.get('/v1/datasets', (req, res) => {
  const q = ((req.query.q as string) || '').toLowerCase();
  const fam = (req.query.family as string) || '';
  let rows = datasets;
  if (fam) rows = rows.filter(d => d.route.startsWith(fam));
  if (q) rows = rows.filter(d => (d.route + ' ' + d.name + ' ' + d.description).toLowerCase().includes(q));
  res.json({ total: rows.length, datasets: rows.map(d => ({ route: d.route, name: d.name, frequencies: d.frequencies.map((f: any) => f.id), columns: d.columns, facets: d.facets.map((f: any) => f.id) })) });
});

app.get('/api/feeds', async (_req, res) => {
  try {
    const { readings, stats, ts } = await getSnapshot();
    res.json({ network: stats.network, stats, count: readings.length, feeds: readings, fetched_at: ts });
  } catch {
    res.status(503).json({ error: 'on-chain feeds unavailable' });
  }
});

app.get('/v1/treasury', async (_req, res) => {
  try {
    res.json(await getTreasury());
  } catch {
    res.status(503).json({ error: 'treasury unavailable' });
  }
});

app.get('/health', async (_req, res) => {
  try {
    const { stats, ts } = await getSnapshot();
    res.json({ status: 'ok', service: 'claros-api', ...stats, fetched_at: ts });
  } catch {
    res.status(503).json({ status: 'degraded', service: 'claros-api', error: 'Casper RPC unavailable' });
  }
});

app.listen(PORT, () => console.log(`Claros oracle API on http://localhost:${PORT}  (/v1/feeds, /v1/feeds/:id, /v1/datasets)`));
