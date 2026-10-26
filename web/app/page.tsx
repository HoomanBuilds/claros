import { Navbar } from "@/components/navbar"
import { HeroSection } from "@/components/hero-section"
import { LiveFeeds } from "@/components/live-feeds"
import { FeatureGrid } from "@/components/feature-grid"
import { AboutSection } from "@/components/about-section"
import { PricingSection } from "@/components/pricing-section"
import { JoinNetwork } from "@/components/join-network"
import { GlitchMarquee } from "@/components/glitch-marquee"
import { Footer } from "@/components/footer"
export default function Page() {
  return (
    <div className="min-h-screen dot-grid-bg">
      <Navbar />
      <main>
        <HeroSection />
        <LiveFeeds />
        <FeatureGrid />
        <AboutSection />
        <PricingSection />
        <JoinNetwork />
        <GlitchMarquee />
      </main>
      <Footer />
    </div>
  )
}
