"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import type { FeedReading, OracleStats } from "@/lib/format"
import { family, flagshipFirst, formatPeriod, formatValue, shortUnit, ticker, timeAgo } from "@/lib/format"
import { useLiveFeeds } from "@/lib/use-live-feeds"

const ease = [0.22, 1, 0.36, 1] as const

function TickerRow({ feeds }: { feeds: FeedReading[] }) {
  const row = [...feeds, ...feeds]
  return (
    <div className="overflow-hidden border-2 border-foreground">
      <div className="flex animate-marquee" style={{ width: "max-content" }}>
        {row.map((f, i) => (
          <div key={`${f.feed_id}-${i}`} className="flex items-center gap-3 px-6 py-3 border-r-2 border-foreground shrink-0">
            <span className="h-1.5 w-1.5 bg-[#ea580c]" />
            <span className="text-xs font-mono tracking-[0.15em] uppercase text-foreground whitespace-nowrap">
              {ticker(f.feed_id)}
            </span>
            <span className="text-xs font-mono font-bold tabular-nums whitespace-nowrap">
              {formatValue(f.value, f.decimals)}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">{shortUnit(f.unit)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function FeedCard({ f, index }: { f: FeedReading; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: (index % 4) * 0.06, duration: 0.5, ease }}
      className="group flex flex-col border-r-2 border-b-2 border-foreground bg-background hover:bg-foreground hover:text-background transition-colors duration-200"
    >
      <div className="flex items-center justify-between px-4 py-2 border-b-2 border-foreground group-hover:border-background/20">
        <span className="text-[9px] tracking-[0.18em] uppercase text-muted-foreground group-hover:text-background/60">
          {family(f.feed_id)}
        </span>
        <span className="h-1.5 w-1.5 bg-[#ea580c]" />
      </div>
      <div className="flex flex-col gap-1 px-4 py-5">
        <span className="text-2xl lg:text-3xl font-mono font-bold tracking-tight tabular-nums leading-none">
          {formatValue(f.value, f.decimals)}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground group-hover:text-background/60">
          {shortUnit(f.unit)}
        </span>
      </div>
      <div className="px-4 pb-3">
        <span className="text-xs font-mono tracking-[0.12em] uppercase text-foreground group-hover:text-background">
          {ticker(f.feed_id)}
        </span>
      </div>
      <div className="flex items-center justify-between px-4 py-2 border-t-2 border-foreground group-hover:border-background/20 mt-auto">
        <span className="text-[9px] font-mono text-muted-foreground group-hover:text-background/60">
          {formatPeriod(f.period, f.frequency)}
        </span>
        <span className="text-[9px] font-mono tracking-[0.15em] uppercase text-muted-foreground group-hover:text-background/60">
          {f.frequency}
        </span>
      </div>
    </motion.div>
  )
}

export function LiveFeeds({ initialFeeds, initialStats }: { initialFeeds: FeedReading[]; initialStats: OracleStats }) {
  const { feeds, stats, updatedAt } = useLiveFeeds(initialFeeds, initialStats)
  const cards = flagshipFirst(feeds).slice(0, 8)

  return (
    <section className="w-full px-6 py-20 lg:px-12">
      {/* Section label */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease }}
        className="flex items-center gap-4 mb-8"
      >
        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
          {"// SECTION: LIVE_FEEDS"}
        </span>
        <div className="flex-1 border-t border-border" />
        <span className="inline-block h-2 w-2 bg-[#ea580c] animate-blink" />
        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">003</span>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease }}
        className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8"
      >
        <div className="flex flex-col gap-3">
          <h2 className="text-2xl lg:text-3xl font-mono font-bold tracking-tight uppercase text-foreground text-balance">
            Live on-chain feeds
          </h2>
          <p className="text-xs lg:text-sm font-mono text-muted-foreground leading-relaxed max-w-md">
            Read straight from Casper global state — every value is an attestation with a
            provenance hash. No middleware, no API key.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] tracking-widest text-muted-foreground uppercase font-mono">
          <span className="h-1.5 w-1.5 bg-[#ea580c]" />
          <span>{stats.feedsLive} feeds · {stats.network}</span>
          <span className="text-foreground">{updatedAt ? `· synced ${timeAgo(updatedAt)}` : "· live"}</span>
        </div>
      </motion.div>

      {/* Ticker */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.6, ease }}
        className="mb-8"
      >
        <TickerRow feeds={feeds} />
      </motion.div>

      {/* Cards grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border-l-2 border-t-2 border-foreground">
        {cards.map((f, i) => (
          <FeedCard key={f.feed_id} f={f} index={i} />
        ))}
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3, duration: 0.5, ease }}
        className="flex items-center gap-4 mt-8"
      >
        <Link
          href="/feeds"
          className="group flex items-center gap-3 text-xs font-mono tracking-widest uppercase text-foreground hover:text-[#ea580c] transition-colors"
        >
          <span className="flex items-center justify-center w-7 h-7 bg-[#ea580c] group-hover:translate-x-1 transition-transform">
            <ArrowRight size={14} strokeWidth={2} className="text-background" />
          </span>
          Browse all {stats.feedsLive} feeds
        </Link>
        <div className="flex-1 border-t border-border" />
      </motion.div>
    </section>
  )
}
