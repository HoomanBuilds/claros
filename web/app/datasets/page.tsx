import type { Metadata, Viewport } from "next"
import { PageShell } from "@/components/product/page-shell"
import { DatasetsExplorer } from "@/components/datasets-explorer"
import { getDatasets } from "@/lib/datasets"

export const metadata: Metadata = {
  title: "Datasets: Claros Oracle Coverage",
  description: "Explore the EIA datasets Claros can attest on Casper. Search the catalog, inspect schemas, and find datasets with live feeds.",
}
export const viewport: Viewport = { themeColor: "#070b14" }

export default function DatasetsPage() {
  return (
    <PageShell active="Datasets" number="02" title="Find your next signal." description="Explore the energy data behind Claros. Browse the mapped EIA catalog, inspect a dataset's fields, and see where on-chain feeds are already available." image="/landing/avail/door.webp">
      <DatasetsExplorer datasets={getDatasets()} />
    </PageShell>
  )
}
