import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { FeedsExplorer } from "@/components/feeds-explorer"
import { getAllReadings, getStats } from "@/lib/claros"

export const revalidate = 60

export const metadata: Metadata = {
  title: "Live Feeds: Claros Oracle",
  description: "Every Claros feed live on Casper: energy markets and civic data, attested on-chain with provenance hashes. Search, filter, and verify each value.",
}

export default async function FeedsPage() {
  const [all, stats] = await Promise.all([getAllReadings(), getStats()])

  return (
    <div className="min-h-screen dot-grid-bg">
      <Navbar />
      <main>
        {/* Header */}
        <section className="w-full px-6 pt-12 lg:px-12">
          <div className="flex items-center gap-4 mb-8">
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
              {"// FEEDS_REGISTRY"}
            </span>
            <div className="flex-1 border-t border-border" />
            <span className="inline-block h-2 w-2 bg-[#ea580c] animate-blink" />
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">001</span>
          </div>
          <h1 className="font-pixel text-4xl sm:text-5xl lg:text-6xl tracking-tight text-foreground mb-4 select-none">
            LIVE FEEDS
          </h1>
          <p className="text-xs lg:text-sm font-mono text-muted-foreground leading-relaxed max-w-2xl">
            {stats.feedsLive} feeds attested on Casper {stats.network}, drawn from {stats.datasets} indexed
            datasets. Each value is read straight from on-chain state: self-describing, hashed, and
            verifiable by anyone.
          </p>
        </section>

        <FeedsExplorer initialFeeds={all} initialStats={stats} />
      </main>
      <Footer />
    </div>
  )
}
