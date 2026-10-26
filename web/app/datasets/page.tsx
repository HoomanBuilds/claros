import type { Metadata, Viewport } from "next";
import { PageShell } from "@/components/product/page-shell";
import { DatasetsExplorer } from "@/components/datasets-explorer";
import { getDatasets } from "@/lib/datasets";

export const metadata: Metadata = {
  title: "Datasets: Claros Oracle Coverage",
  description:
    "Explore the EIA datasets Claros can attest on Casper. Search the catalog, inspect schemas, and find datasets with live feeds.",
};
export const viewport: Viewport = { themeColor: "#070b14" };

export default function DatasetsPage() {
  return (
    <PageShell
      active="Datasets"
      number="02"
      title={
        <>
          Find your
          <br />
          next signal.
        </>
      }
      description="An open field of energy data. Explore the catalog, inspect the schema, and find the next feed to bring on-chain."
      image="/landing/avail/door.webp"
    >
      <DatasetsExplorer datasets={getDatasets()} />
    </PageShell>
  );
}
