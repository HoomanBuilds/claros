import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { DatasetsExplorer } from "@/components/datasets-explorer"
import { getDatasets } from "@/lib/datasets"
import { getAllReadings } from "@/lib/claros"

export const revalidate = 300

export const metadata: Metadata = {
  title: "Datasets — Claros Oracle Coverage",
  description: "The full EIA dataset universe Claros can attest on-chain: 232 datasets across petroleum, natural gas, electricity, coal, nuclear, emissions and more. Search, filter, and see what's already live.",
}

export default async function DatasetsPage() {
  const [datasets, readings] = await Promise.all([Promise.resolve(getDatasets()), getAllReadings()])
  const liveRoutes = Array.from(new Set(readings.map((r) => r.route).filter(Boolean)))

  return (
    <div className="min-h-screen dot-grid-bg">
      <Navbar />
      <main>
        <section className="w-full px-6 pt-12 lg:px-12">
          <div className="flex items-center gap-4 mb-8">
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
              {"// DATASET_UNIVERSE"}
            </span>
            <div className="flex-1 border-t border-border" />
            <span className="inline-block h-2 w-2 bg-[#ea580c] animate-blink" />
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">001</span>
          </div>
          <h1 className="font-pixel text-4xl sm:text-5xl lg:text-6xl tracking-tight text-foreground mb-4 select-none">
            DATASETS
          </h1>
          <p className="text-xs lg:text-sm font-mono text-muted-foreground leading-relaxed max-w-2xl">
            Claros crawled the entire EIA APIv2 metadata tree — {datasets.length} leaf datasets across
            every energy family. A generic adapter means any of them can be attested on-chain on request;
            the ones marked <span className="text-[#ea580c]">live</span> already are.
          </p>
        </section>

        <DatasetsExplorer datasets={datasets} liveRoutes={liveRoutes} />
      </main>
      <Footer />
    </div>
  )
}
