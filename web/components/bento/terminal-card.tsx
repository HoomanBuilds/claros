"use client"

import { useEffect, useMemo, useState } from "react"
import type { FeedReading } from "@/lib/format"
import { formatValue, shortUnit, ticker } from "@/lib/format"

const STATIC_LINES = [
  "> claros agent: heartbeat OK",
  "> source: EIA APIv2 / data.gov",
  "> scaling value -> integer (10^decimals)",
  "> sha256 provenance hash computed",
  "> signing TransactionV1 (Casper)",
  "> AttestationRegistry.attest() sent",
  "> FeedRegistry metadata in sync",
  "> --------- CYCLE COMPLETE ---------",
]

function buildLog(feeds: FeedReading[]): string[] {
  if (!feeds.length) return STATIC_LINES
  const lines: string[] = ["> claros agent: heartbeat OK", "> source: EIA APIv2 / data.gov"]
  for (const f of feeds.slice(0, 7)) {
    lines.push(`> attest ${ticker(f.feed_id)} = ${formatValue(f.value, f.decimals)} ${shortUnit(f.unit)}`)
  }
  lines.push("> AttestationRegistry.attest() OK")
  lines.push("> --------- CYCLE COMPLETE ---------")
  return lines
}

export function TerminalCard({ feeds = [] }: { feeds?: FeedReading[] }) {
  const log = useMemo(() => buildLog(feeds), [feeds])
  const [lines, setLines] = useState<string[]>([])
  const [currentLine, setCurrentLine] = useState(0)

  useEffect(() => {
    setLines([log[0]])
    setCurrentLine(0)
    const interval = setInterval(() => {
      setCurrentLine((prev) => {
        const next = prev + 1
        if (next >= log.length) {
          setLines([])
          return 0
        }
        setLines((l) => [...l.slice(-8), log[next]])
        return next
      })
    }, 600)
    return () => clearInterval(interval)
  }, [log])

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
        <div className="flex flex-col gap-1">
          {lines.map((line, i) => (
            <span
              key={`${currentLine}-${i}`}
              className="text-xs text-background font-mono block"
              style={{ opacity: i === lines.length - 1 ? 1 : 0.6 }}
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
