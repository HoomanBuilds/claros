"use client"

import { useEffect, useMemo, useState } from "react"
import type { FeedReading } from "@/lib/format"
import { formatValue, shortUnit, ticker } from "@/lib/format"

const STATIC_LINES = [
  "> claros agent: heartbeat OK",
  "> source: EIA APIv2 / data.gov",
  "> fetching latest readings ...",
  "> attest WTI = 78.94 $/bbl",
  "> attest BRENT = 76.49 $/bbl",
  "> attest HENRY HUB = 3.16 $/MMBtu",
  "> scaling values -> integer (10^decimals)",
  "> sha256 provenance hash computed",
  "> signing TransactionV1 (Casper)",
  "> AttestationRegistry.attest() OK",
  "> FeedRegistry metadata in sync",
  "> --------- CYCLE COMPLETE ---------",
]

function buildLog(feeds: FeedReading[]): string[] {
  if (!feeds.length) return STATIC_LINES
  const seen = new Set<string>()
  const uniq: FeedReading[] = []
  for (const f of feeds) {
    if (seen.has(f.feed_id)) continue
    seen.add(f.feed_id)
    uniq.push(f)
    if (uniq.length >= 10) break
  }
  return [
    "> claros agent: heartbeat OK",
    "> source: EIA APIv2 / data.gov",
    "> fetching latest readings ...",
    ...uniq.map((f) => `> attest ${ticker(f.feed_id)} = ${formatValue(f.value, f.decimals)} ${shortUnit(f.unit)}`),
    "> scaling values -> integer (10^decimals)",
    "> sha256 provenance hash computed",
    "> signing TransactionV1 (Casper)",
    "> AttestationRegistry.attest() OK",
    "> FeedRegistry metadata in sync",
    "> --------- CYCLE COMPLETE ---------",
  ]
}

const WINDOW = 11

export function TerminalCard({ feeds = [] }: { feeds?: FeedReading[] }) {
  const log = useMemo(() => buildLog(feeds), [feeds])
  const win = Math.min(WINDOW, log.length)
  const [lines, setLines] = useState<string[]>(() => log.slice(0, win))
  const [tick, setTick] = useState(0)

  useEffect(() => {
    setLines(log.slice(0, win))
    let idx = win % log.length
    const interval = setInterval(() => {
      setLines((l) => [...l.slice(-(win - 1)), log[idx]])
      idx = (idx + 1) % log.length
      setTick((t) => t + 1)
    }, 800)
    return () => clearInterval(interval)
  }, [log, win])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 border-b-2 border-foreground px-4 py-2">
        <span className="h-2 w-2 bg-[#ea580c]" />
        <span className="h-2 w-2 bg-foreground" />
        <span className="h-2 w-2 border border-foreground" />
        <span className="ml-auto text-[10px] tracking-widest text-muted-foreground uppercase">
          attestation.log
        </span>
      </div>
      <div className="flex-1 bg-foreground p-4 overflow-hidden">
        <div className="flex flex-col gap-1.5">
          {lines.map((line, i) => (
            <span
              key={`${tick}-${i}`}
              className="text-xs text-background font-mono block whitespace-nowrap"
              style={{ opacity: i === lines.length - 1 ? 1 : 0.45 + (i / Math.max(lines.length - 1, 1)) * 0.45 }}
            >
              {line}
            </span>
          ))}
          <span className="text-xs text-[#ea580c] font-mono animate-blink">{"_"}</span>
        </div>
      </div>
    </div>
  )
}
