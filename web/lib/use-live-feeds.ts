"use client"

import { useEffect, useRef, useState } from "react"
import type { FeedReading, OracleStats } from "@/lib/format"

interface FeedsResponse {
  network: string
  stats: OracleStats
  count: number
  feeds: FeedReading[]
}

// Polls /api/feeds on an interval, seeded with server-rendered data so there is
// no loading flash. Returns the full on-chain feed set + oracle stats, "live".
export function useLiveFeeds(initial: FeedReading[], initialStats: OracleStats, intervalMs = 30_000) {
  const [feeds, setFeeds] = useState<FeedReading[]>(initial)
  const [stats, setStats] = useState<OracleStats>(initialStats)
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let alive = true
    async function tick() {
      try {
        const r = await fetch("/api/feeds", { cache: "no-store" })
        if (!r.ok) return
        const data: FeedsResponse = await r.json()
        if (!alive || !data.feeds?.length) return
        setFeeds(data.feeds)
        setStats(data.stats)
        setUpdatedAt(Date.now())
      } catch {
        /* keep last good data */
      }
    }
    timer.current = setInterval(tick, intervalMs)
    return () => {
      alive = false
      if (timer.current) clearInterval(timer.current)
    }
  }, [intervalMs])

  return { feeds, stats, updatedAt }
}

// Look up a single reading by id from a list.
export function byId(feeds: FeedReading[], id: string): FeedReading | undefined {
  return feeds.find((f) => f.feed_id === id)
}
