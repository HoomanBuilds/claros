import { Navbar } from "@/components/navbar"
import { HeroSection } from "@/components/hero-section"
import { LiveFeeds } from "@/components/live-feeds"
import { FeatureGrid } from "@/components/feature-grid"
import { AboutSection } from "@/components/about-section"
import { PricingSection } from "@/components/pricing-section"
import { JoinNetwork } from "@/components/join-network"
import { GlitchMarquee } from "@/components/glitch-marquee"
import { Footer } from "@/components/footer"
import { getAllReadings, getStats } from "@/lib/claros"
import { flagshipFirst } from "@/lib/format"

export const revalidate = 60

export default async function Page() {
  const [all, stats] = await Promise.all([getAllReadings(), getStats()])
  const flagship = flagshipFirst(all)

  return (
    <div className="min-h-screen dot-grid-bg">
      <Navbar />
      <main>
        <HeroSection />
        <LiveFeeds initialFeeds={all} initialStats={stats} />
        <FeatureGrid feeds={flagship} stats={stats} />
        <AboutSection stats={stats} />
        <PricingSection />
        <JoinNetwork />
        <GlitchMarquee />
      </main>
      <Footer />
    </div>
  )
}
