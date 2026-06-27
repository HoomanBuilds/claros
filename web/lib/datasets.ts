import "server-only"
import catalog from "./eia-catalog.json"

// The full EIA dataset universe Claros can attest (232 leaf datasets crawled from
// the APIv2 metadata tree). Trimmed server-side; the client gets a compact list.

export interface DatasetRow {
  route: string
  name: string
  family: string
  group: string // top-level route segment, e.g. "petroleum"
  frequencies: string[]
  columns: string[]
  facets: string[]
}

const FAMILY: Record<string, string> = {
  petroleum: "PETROLEUM",
  "natural-gas": "NATURAL GAS",
  electricity: "ELECTRICITY",
  coal: "COAL",
  "nuclear-outages": "NUCLEAR",
  "co2-emissions": "EMISSIONS",
  "densified-biomass": "BIOMASS",
  seds: "STATE ENERGY",
  steo: "OUTLOOK",
  aeo: "OUTLOOK",
  ieo: "OUTLOOK",
  international: "INTERNATIONAL",
  "total-energy": "TOTAL ENERGY",
  "crude-oil-imports": "PETROLEUM",
}

export function getDatasets(): DatasetRow[] {
  const leaves = (catalog as any).leaves as any[]
  return leaves.map((l) => {
    const group = String(l.route).split("/")[0]
    return {
      route: l.route,
      name: l.name || l.route,
      family: FAMILY[group] ?? group.toUpperCase().replace(/-/g, " "),
      group,
      frequencies: (l.frequencies || []).map((f: any) => f.id),
      columns: l.columns || [],
      facets: (l.facets || []).map((f: any) => f.id),
    }
  })
}

export const DATASETS_TOTAL = (catalog as any).leaves.length as number
