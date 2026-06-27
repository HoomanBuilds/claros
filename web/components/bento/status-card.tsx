"use client"

import { useEffect, useState } from "react"
import type { FeedReading } from "@/lib/format"
import { formatValue, shortUnit, ticker } from "@/lib/format"

export function StatusCard({ feeds = [] }: { feeds?: FeedReading[] }) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 2000)
    return () => clearInterval(interval)
  }, [])

  const rows = feeds.slice(0, 4)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b-2 border-foreground px-4 py-2">
        <span className="text-[10px] tracking-widest text-muted-foreground uppercase">feeds.status</span>
        <span className="text-[10px] tracking-widest text-muted-foreground">
          {`TICK:${String(tick).padStart(4, "0")}`}
        </span>
      </div>
      <div className="flex-1 flex flex-col p-4 gap-0">
        {/* Table header */}
        <div className="grid grid-cols-[1.4fr_0.9fr_1fr] gap-2 border-b border-border pb-2 mb-2">
          <span className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground">Feed</span>
          <span className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground">Status</span>
          <span className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground text-right">Value</span>
        </div>
        {rows.map((f) => (
          <div key={f.feed_id} className="grid grid-cols-[1.4fr_0.9fr_1fr] gap-2 py-2 border-b border-border last:border-none items-center">
            <span className="text-xs font-mono text-foreground truncate">{ticker(f.feed_id)}</span>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 bg-[#ea580c]" />
              <span className="text-xs font-mono text-muted-foreground">LIVE</span>
            </div>
            <span className="text-xs font-mono text-foreground text-right tabular-nums truncate">
              {formatValue(f.value, f.decimals)}
              <span className="text-muted-foreground"> {shortUnit(f.unit)}</span>
            </span>
          </div>
        ))}
        {/* Provenance bar */}
        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground">Provenance</span>
            <span className="text-[9px] font-mono text-foreground">HASH-VERIFIED</span>
          </div>
          <div className="h-2 w-full border border-foreground">
            <div className="h-full bg-foreground" style={{ width: "100%" }} />
          </div>
        </div>
      </div>
    </div>
  )
}
