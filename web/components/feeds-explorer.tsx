"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Search, ExternalLink } from "lucide-react"
import type { FeedReading, OracleStats } from "@/lib/format"
import { family, flagshipFirst, formatPeriod, formatValue, shortHash, shortUnit, ticker, timeAgo } from "@/lib/format"
import { useLiveFeeds } from "@/lib/use-live-feeds"

const ease = [0.22, 1, 0.36, 1] as const
const ATTESTATION_PKG = "236b510436c60b6a797d175c72c6014de367d43f1de1ca45f580d112f98116cc"

export function FeedsExplorer({ initialFeeds, initialStats }: { initialFeeds: FeedReading[]; initialStats: OracleStats }) {
  const { feeds, stats, updatedAt } = useLiveFeeds(initialFeeds, initialStats)
  const [query, setQuery] = useState("")
  const [fam, setFam] = useState<string>("ALL")

  const families = useMemo(() => {
    const set = new Set(feeds.map((f) => family(f.feed_id)).filter(Boolean))
    return ["ALL", ...Array.from(set).sort()]
  }, [feeds])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return flagshipFirst(feeds).filter((f) => {
      if (fam !== "ALL" && family(f.feed_id) !== fam) return false
      if (!q) return true
      return (f.feed_id + " " + ticker(f.feed_id) + " " + f.title + " " + f.unit).toLowerCase().includes(q)
    })
  }, [feeds, query, fam])

  return (
    <section className="w-full px-6 py-10 lg:px-12">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
          <div className="flex items-center gap-3 border-2 border-foreground px-3 py-2 w-full md:max-w-sm">
            <Search size={14} strokeWidth={2} className="text-muted-foreground shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="search feeds — wti, coal, henry hub…"
              className="w-full bg-transparent outline-none text-xs font-mono tracking-wide placeholder:text-muted-foreground/60"
            />
          </div>
          <div className="flex items-center gap-2 text-[10px] tracking-widest text-muted-foreground uppercase font-mono">
            <span className="h-1.5 w-1.5 bg-[#ea580c] animate-blink" />
            <span>
              {rows.length}/{stats.feedsLive} feeds · {stats.network}
            </span>
            <span className="text-foreground">{updatedAt ? `· synced ${timeAgo(updatedAt)}` : "· live"}</span>
          </div>
        </div>

        {/* Family filter chips */}
        <div className="flex flex-wrap gap-0 border-l-2 border-t-2 border-foreground">
          {families.map((f) => (
            <button
              key={f}
              onClick={() => setFam(f)}
              className={`px-3 py-1.5 text-[10px] font-mono tracking-[0.15em] uppercase border-r-2 border-b-2 border-foreground transition-colors ${
                fam === f ? "bg-foreground text-background" : "bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table header (md+) */}
      <div className="hidden md:grid grid-cols-[1.7fr_1.1fr_1.2fr_1fr_0.8fr_0.9fr_0.5fr] gap-3 px-4 py-2 border-2 border-foreground bg-foreground text-background">
        {["Feed", "Family", "Value", "Period", "Cadence", "Updated", ""].map((h, i) => (
          <span key={i} className={`text-[9px] tracking-[0.18em] uppercase ${i === 2 ? "text-right" : ""}`}>
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      <div className="border-l-2 border-r-2 border-b-2 border-foreground md:border-t-0">
        {rows.map((f, i) => (
          <motion.a
            key={f.feed_id}
            href={`https://testnet.cspr.live/contract-package/${ATTESTATION_PKG}`}
            target="_blank"
            rel="noreferrer"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i, 20) * 0.015, duration: 0.3, ease }}
            className="group grid grid-cols-2 md:grid-cols-[1.7fr_1.1fr_1.2fr_1fr_0.8fr_0.9fr_0.5fr] gap-x-3 gap-y-1 px-4 py-3 border-b-2 border-foreground last:border-b-0 hover:bg-foreground hover:text-background transition-colors"
          >
            {/* Feed */}
            <div className="flex flex-col col-span-2 md:col-span-1">
              <span className="text-xs font-mono font-bold tracking-[0.1em] uppercase">{ticker(f.feed_id)}</span>
              <span className="text-[9px] font-mono text-muted-foreground group-hover:text-background/60 truncate">{f.feed_id}</span>
            </div>
            {/* Family */}
            <span className="flex items-center text-[10px] font-mono tracking-[0.12em] uppercase text-muted-foreground group-hover:text-background/70">
              {family(f.feed_id)}
            </span>
            {/* Value */}
            <span className="flex items-center md:justify-end text-sm font-mono font-bold tabular-nums">
              {formatValue(f.value, f.decimals)}
              <span className="ml-1 text-[10px] font-normal text-muted-foreground group-hover:text-background/60">{shortUnit(f.unit)}</span>
            </span>
            {/* Period */}
            <span className="flex items-center text-[10px] font-mono text-muted-foreground group-hover:text-background/70">
              {formatPeriod(f.period, f.frequency)}
            </span>
            {/* Cadence */}
            <span className="flex items-center text-[10px] font-mono tracking-[0.1em] uppercase text-muted-foreground group-hover:text-background/70">
              {f.frequency}
            </span>
            {/* Updated + hash */}
            <span className="flex flex-col justify-center text-[10px] font-mono text-muted-foreground group-hover:text-background/70">
              <span>{timeAgo(f.updated_at)}</span>
              <span className="text-[8px] opacity-60">#{shortHash(f.source_hash, 4)}</span>
            </span>
            {/* Verify */}
            <span className="hidden md:flex items-center justify-end">
              <ExternalLink size={12} strokeWidth={2} className="text-muted-foreground group-hover:text-[#ea580c]" />
            </span>
          </motion.a>
        ))}
        {rows.length === 0 && (
          <div className="px-4 py-10 text-center text-xs font-mono text-muted-foreground">no feeds match “{query}”.</div>
        )}
      </div>

      <p className="mt-4 text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-mono">
        * every row is an attestation on Casper — click to verify the registry on-chain.
      </p>
    </section>
  )
}
