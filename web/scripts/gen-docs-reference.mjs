// gen-docs-reference.mjs
// Generates Nextra MDX docs from the live feed mappings (agent/src/eia-feeds.ts)
// and the full EIA dataset catalog (web/lib/eia-catalog.json).
// Run from repo root: node web/scripts/gen-docs-reference.mjs
// No em-dashes anywhere in output. No invented data.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '..', '..');
const FEEDS_TS = resolve(REPO, 'agent', 'src', 'eia-feeds.ts');
const CATALOG_JSON = resolve(REPO, 'web', 'lib', 'eia-catalog.json');
const OUT = resolve(REPO, 'web', 'content', 'docs');

// ---- parse eia-feeds.ts robustly ----
function parseFeeds(src) {
  const anchor = src.indexOf('EIA_FEEDS');
  const open = src.indexOf('= [', anchor);
  const bracket = src.indexOf('[', open);
  // bracket-match, ignoring single-quoted strings
  let depth = 0, inStr = false, end = -1;
  for (let i = bracket; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (c === '\\') { i++; continue; }
      if (c === "'") inStr = false;
      continue;
    }
    if (c === "'") { inStr = true; continue; }
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) { end = i; break; } }
  }
  const literal = src.slice(bracket, end + 1);
  // literal is valid JS (single-quoted, with // comments). Evaluate it.
  // eslint-disable-next-line no-new-func
  const arr = Function(`"use strict"; return (${literal});`)();
  return arr;
}

const feedsSrc = readFileSync(FEEDS_TS, 'utf8');
const FEEDS = parseFeeds(feedsSrc);
const catalog = JSON.parse(readFileSync(CATALOG_JSON, 'utf8'));
const LEAVES = catalog.leaves;
const leafByRoute = new Map(LEAVES.map((l) => [l.route, l]));
const liveRoutes = new Set(FEEDS.map((f) => f.route));

// ---- family mapping for live feeds (by asset_id prefix) ----
const PREFIX_FAMILY = [
  ['EIA.NG.', 'natural-gas'],
  ['EIA.PET.', 'petroleum'],
  ['EIA.ELEC.', 'electricity'],
  ['EIA.COAL.', 'coal'],
  ['EIA.DBF.', 'biomass'],
  ['EIA.NUC.', 'nuclear'],
  ['EIA.STEO.', 'outlooks'],
  ['EIA.TOTAL.', 'total-energy'],
  ['EIA.SEDS.', 'state-energy'],
  ['EIA.CO2.', 'emissions'],
  ['EIA.INTL.', 'international'],
];
const FAMILY_LABEL = {
  'natural-gas': 'Natural gas',
  petroleum: 'Petroleum',
  electricity: 'Electricity',
  coal: 'Coal',
  biomass: 'Biomass',
  nuclear: 'Nuclear',
  outlooks: 'Outlooks',
  'total-energy': 'Total energy',
  'state-energy': 'State energy (SEDS)',
  emissions: 'Emissions',
  international: 'International',
};
// lucide-react icon per family (imported in feeds/index.mdx).
const FAMILY_ICON = {
  'natural-gas': 'Flame',
  petroleum: 'Fuel',
  electricity: 'Zap',
  coal: 'Factory',
  biomass: 'Leaf',
  nuclear: 'Atom',
  outlooks: 'LineChart',
  'total-energy': 'BarChart3',
  'state-energy': 'Map',
  emissions: 'Cloud',
  international: 'Globe2',
};
function familyOf(assetId) {
  for (const [p, fam] of PREFIX_FAMILY) if (assetId.startsWith(p)) return fam;
  return 'other';
}
function shortName(assetId) {
  // drop the EIA.<FAM>. prefix and the trailing .FREQ token
  const parts = assetId.split('.');
  return parts.slice(2, -1).join('.') || assetId;
}
function facetDesc(route, facetId) {
  const leaf = leafByRoute.get(route);
  if (!leaf || !leaf.facets) return null;
  const f = leaf.facets.find((x) => x.id === facetId);
  return f ? cleanDesc(f.description) : null;
}
function cleanDesc(s) {
  if (s == null) return s;
  // strip backslashes used in catalog (e.g. "State\Region") and normalize dashes
  return String(s).replace(/\\/g, ' / ').replace(/—/g, ', ').trim();
}
function leafName(route) {
  const leaf = leafByRoute.get(route);
  return leaf ? leaf.name : route;
}
function facetsSummary(facets) {
  const keys = Object.keys(facets || {});
  if (keys.length === 0) return 'none (whole-dataset series)';
  return keys.map((k) => `${k}=${facets[k]}`).join(', ');
}
function whatItIs(f) {
  const name = leafName(f.route);
  const filt = facetsSummary(f.facets);
  return `${name}: ${f.data_col} (${f.frequency}), filtered to ${filt}, in ${f.unit}.`;
}

function mdEscape(s) {
  return String(s).replace(/\|/g, '\\|');
}

// frontmatter (always quote: descriptions contain colons, which break YAML unquoted)
function fm(title, description) {
  const q = (s) => `"${String(s).replace(/"/g, '\\"')}"`;
  return `---\ntitle: ${q(title)}\ndescription: ${q(description)}\n---\n\n`;
}

function ensureDir(p) {
  mkdirSync(dirname(p), { recursive: true });
}
function write(rel, content) {
  const p = resolve(OUT, rel);
  ensureDir(p);
  writeFileSync(p, content, 'utf8');
  return p;
}

const created = [];

// ===========================================================================
// A) feeds/index.mdx
// ===========================================================================
function genFeedsIndex() {
  const byFam = new Map();
  for (const f of FEEDS) {
    const fam = familyOf(f.asset_id);
    if (!byFam.has(fam)) byFam.set(fam, []);
    byFam.get(fam).push(f);
  }
  const fams = [...byFam.keys()].sort((a, b) =>
    (FAMILY_LABEL[a] || a).localeCompare(FAMILY_LABEL[b] || b),
  );

  let out = fm('Live feeds', `All ${FEEDS.length} live Claros feeds, grouped by family.`);
  out += `import { Callout, Cards } from 'nextra/components'\n`;
  out += `import { Flame, Fuel, Zap, Factory, Leaf, Atom, LineChart, BarChart3, Map, Cloud, Globe2 } from 'lucide-react'\n\n`;
  out += `# Live feeds\n\n`;
  out += `Claros publishes ${FEEDS.length} live feeds on Casper testnet. Each feed has a stable \`feed_id\`, and on-chain values are integers: the human value is \`amount / 10^decimals\` (Pyth-style). Every feed maps to one EIA APIv2 dataset (a route, a frequency, a data column, and a set of facet filters). See [the data catalog](/docs/catalog) for all 232 datasets you can request.\n\n`;
  out += `<Callout type="info">\nValues are read by \`feed_id\`. Use [the SDK](/docs/reading/sdk), [the REST API](/docs/reading/rest), or a [cross-contract call](/docs/reading/on-chain) to read them.\n</Callout>\n\n`;

  // family cards / links
  out += `## Families\n\n`;
  out += `<Cards>\n`;
  for (const fam of fams) {
    const label = FAMILY_LABEL[fam] || fam;
    const n = byFam.get(fam).length;
    const icon = FAMILY_ICON[fam] || 'Zap';
    out += `  <Cards.Card icon={<${icon} />} title="${label} (${n})" href="/docs/feeds/${fam}" arrow />\n`;
  }
  out += `</Cards>\n\n`;

  // overview table grouped by family
  out += `## All feeds\n\n`;
  for (const fam of fams) {
    const label = FAMILY_LABEL[fam] || fam;
    const rows = byFam.get(fam);
    out += `### [${label}](/docs/feeds/${fam})\n\n`;
    out += `| Feed ID | Ticker / short name | Family | Frequency | Unit | Decimals |\n`;
    out += `| --- | --- | --- | --- | --- | --- |\n`;
    for (const f of rows) {
      out += `| \`${f.asset_id}\` | ${mdEscape(shortName(f.asset_id))} | ${label} | ${f.frequency} | ${mdEscape(f.unit)} | ${f.decimals} |\n`;
    }
    out += `\n`;
  }
  created.push(write('feeds/index.mdx', out));
  return { byFam, fams };
}

// ===========================================================================
// B) feeds/<family>.mdx
// ===========================================================================
function genFamilyPages(byFam) {
  for (const [fam, rows] of byFam) {
    const label = FAMILY_LABEL[fam] || fam;
    let out = fm(label, `Live ${label.toLowerCase()} feeds: exact feed ids, routes, facets, and units.`);
    out += `import { Callout } from 'nextra/components'\n\n`;
    out += `# ${label}\n\n`;
    out += `${rows.length} live feed${rows.length === 1 ? '' : 's'} in the ${label.toLowerCase()} family. Each section gives the exact \`feed_id\`, the EIA route, the frequency, the data column you read, every facet filter (id, the value Claros uses, and what that filter means in the EIA catalog), the unit, and the decimals. To turn an on-chain integer into a human value, compute \`amount / 10^decimals\`.\n\n`;
    out += `<Callout type="info">\nFacet ids are the EIA filters. The "Means" column is taken from the dataset definition in the [data catalog](/docs/catalog). Pick a feed by its \`feed_id\` and read it with [the SDK](/docs/reading/sdk) or [REST](/docs/reading/rest).\n</Callout>\n\n`;

    for (const f of rows) {
      const leaf = leafByRoute.get(f.route);
      out += `## ${shortName(f.asset_id)}\n\n`;
      out += `${whatItIs(f)}\n\n`;
      out += `| Field | Value |\n| --- | --- |\n`;
      out += `| Feed ID | \`${f.asset_id}\` |\n`;
      out += `| EIA route | \`${f.route}\` |\n`;
      if (leaf) out += `| Dataset | ${mdEscape(cleanDesc(leaf.name))} |\n`;
      out += `| Frequency | ${f.frequency} |\n`;
      out += `| Data column | \`${f.data_col}\` |\n`;
      out += `| Unit | ${mdEscape(f.unit)} |\n`;
      out += `| Decimals | ${f.decimals} |\n`;
      out += `\n`;

      const facetKeys = Object.keys(f.facets || {});
      if (facetKeys.length === 0) {
        out += `Facets: none. This route exposes a single series, so no filter is required.\n\n`;
      } else {
        out += `Facets (the filters):\n\n`;
        out += `| Facet id | Value used | Means |\n| --- | --- | --- |\n`;
        for (const k of facetKeys) {
          const desc = facetDesc(f.route, k);
          out += `| \`${k}\` | \`${f.facets[k]}\` | ${desc ? mdEscape(desc) : 'not described in catalog'} |\n`;
        }
        out += `\n`;
      }
    }
    created.push(write(`feeds/${fam}.mdx`, out));
  }
}

// ===========================================================================
// C) catalog/index.mdx
// ===========================================================================
function genCatalog() {
  let out = fm('Data catalog', `All ${LEAVES.length} EIA datasets Claros can attest, with routes, frequencies, columns, and facet filters.`);
  out += `import { Callout } from 'nextra/components'\n\n`;
  out += `# Data catalog\n\n`;
  out += `Claros is a generic adapter over the EIA APIv2, one uniform faceted API. Any of the ${LEAVES.length} datasets below can become a Claros feed by mapping it to a \`feed_id\`. ${FEEDS.length} are already live (see [live feeds](/docs/feeds)); the rest are one mapping row away.\n\n`;

  out += `## How to read this catalog\n\n`;
  out += `Every EIA dataset is addressed the same way:\n\n`;
  out += `- **Route**: the dataset path, for example \`petroleum/pri/spt\`. This is the \`{route}\` in the EIA endpoint \`/v2/{route}/data\`.\n`;
  out += `- **Frequencies**: the time resolutions the dataset supports (daily, weekly, monthly, quarterly, annual, hourly). You pick exactly one.\n`;
  out += `- **Columns**: the numeric columns the dataset returns, for example \`value\`, \`price\`, \`quantity\`. You read one as the feed value.\n`;
  out += `- **Facets**: the filters. Each facet has an \`id\` (for example \`series\`, \`duoarea\`, \`stateid\`, \`fueltype\`) and you choose a value for it to pin down one series.\n\n`;
  out += `A Claros feed is exactly this tuple: \`{ route, frequency, data_col, facets }\`. For example \`EIA.PET.PRICE.WTI.DAILY\` is route \`petroleum/pri/spt\`, frequency \`daily\`, column \`value\`, facet \`series=RWTC\`.\n\n`;
  out += `<Callout type="info">\nRows marked **Live** already have a Claros \`feed_id\`. The rest are available to map: same adapter, one more row in the feed catalog.\n</Callout>\n\n`;

  // group by top-level family (route first segment)
  const byTop = new Map();
  for (const l of LEAVES) {
    const top = l.route.split('/')[0];
    if (!byTop.has(top)) byTop.set(top, []);
    byTop.get(top).push(l);
  }
  const tops = [...byTop.keys()].sort();

  out += `## Datasets by family\n\n`;
  out += `| Family | Datasets | Live feeds here |\n| --- | --- | --- |\n`;
  for (const top of tops) {
    const ls = byTop.get(top);
    const liveCount = ls.filter((l) => liveRoutes.has(l.route)).length;
    out += `| [${top}](#${top}) | ${ls.length} | ${liveCount} |\n`;
  }
  out += `\n`;

  for (const top of tops) {
    const ls = byTop.get(top).slice().sort((a, b) => a.route.localeCompare(b.route));
    out += `## ${top}\n\n`;
    out += `${ls.length} dataset${ls.length === 1 ? '' : 's'}.\n\n`;
    for (const l of ls) {
      const live = liveRoutes.has(l.route);
      out += `### \`${l.route}\`${live ? ' (Live)' : ''}\n\n`;
      out += `**${mdEscape(cleanDesc(l.name))}**`;
      if (l.description) out += ` ${mdEscape(cleanDesc(l.description))}`;
      out += `\n\n`;
      const freqs = (l.frequencies || []).map((x) => x.id).join(', ') || 'not listed';
      const cols = (l.columns || []).map((c) => `\`${c}\``).join(', ') || 'not listed';
      out += `- **Frequencies**: ${freqs}\n`;
      out += `- **Columns**: ${cols}\n`;
      if ((l.facets || []).length === 0) {
        out += `- **Facets**: none\n`;
      } else {
        out += `- **Facets** (filters):\n`;
        for (const fc of l.facets) {
          out += `  - \`${fc.id}\`: ${mdEscape(cleanDesc(fc.description) || '')}\n`;
        }
      }
      if (live) {
        const here = FEEDS.filter((f) => f.route === l.route);
        out += `- **Live Claros feeds**: ${here.map((f) => `\`${f.asset_id}\``).join(', ')}\n`;
      }
      out += `\n`;
    }
  }
  created.push(write('catalog/index.mdx', out));
}

// ---- run ----
const { byFam } = genFeedsIndex();
genFamilyPages(byFam);
genCatalog();

console.log(`Parsed ${FEEDS.length} live feeds, ${LEAVES.length} catalog datasets.`);
console.log('Created files:');
for (const p of created) console.log('  ' + p);
