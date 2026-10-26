import type { Metadata, Viewport } from "next"
import { PageShell } from "@/components/product/page-shell"
import { FeedsExplorer } from "@/components/feeds-explorer"

export const metadata: Metadata = {
  title: "Live Feeds: Claros Oracle",
  description: "Browse real-world readings attested on Casper. Search energy and civic feeds and verify their reporting periods and provenance.",
}
export const viewport: Viewport = { themeColor: "#070b14" }

export default function FeedsPage() {
  return (
    <PageShell active="Feeds" number="01" title="The world, in readings." description="Energy markets, the grid, and civic revenue. Every reading carries a reporting period, a source hash, and an attester you can verify on Casper." image="/landing/avail/road.webp">
      <FeedsExplorer />
    </PageShell>
  )
}
