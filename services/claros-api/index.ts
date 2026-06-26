import { readFileSync } from 'node:fs';
import cors from 'cors';
import { config } from 'dotenv';
import express from 'express';
import { ClarosOracle } from 'claros-oracle';

config();

// Claros oracle read API — the "Hermes" of Claros. Serves real-world-data feeds
// read DIRECTLY from Casper on-chain state (values + self-describing metadata), plus
// the full EIA dataset discovery catalog. Free reads, like Pyth's price service.
const PORT = parseInt(process.env.PORT || '4030', 10);
const oracle = new ClarosOracle({
  rpc: process.env.CASPER_NODE_RPC,
  feedRegistry: process.env.FEED_REGISTRY_PACKAGE_HASH,
  attestationRegistry: process.env.ATTESTATION_REGISTRY_PACKAGE_HASH,
});

let datasets: any[] = [];
try {
  datasets = JSON.parse(readFileSync(new URL('../../sdk/eia-catalog.json', import.meta.url), 'utf8')).leaves;
} catch { /* discovery catalog optional */ }

const app = express();
app.use(cors({ origin: '*' }));

const serialize = (o: any) => JSON.parse(JSON.stringify(o, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)));

// List all feeds live on-chain, with metadata + latest value.
app.get('/v1/feeds', async (_req, res) => {
  try {
    const ids = await oracle.listFeedIds();
    const feeds = await Promise.all(ids.map(id => oracle.getReading(id)));
    res.json(serialize({ count: feeds.length, feeds: feeds.filter(Boolean) }));
  } catch (e) {
    res.status(502).json({ error: (e as Error).message });
  }
});

// One feed: full reading (metadata + value + human number) from on-chain.
app.get('/v1/feeds/:id', async (req, res) => {
  try {
    const r = await oracle.getReading(req.params.id);
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

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'claros-api', datasets: datasets.length }));

app.listen(PORT, () => console.log(`Claros oracle API on http://localhost:${PORT}  (/v1/feeds, /v1/feeds/:id, /v1/datasets)`));
