"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { DocTable } from "@/components/doc-table"
import { ticker } from "@/lib/format"

export interface FeedRef {
  feed_id: string
  decimals: number
  unit: string
  frequency: string
}

// The "for this data, use these parameters" table: every feed_id with its ticker,
// decimals (the 10^k scale), unit and cadence — copy the feed_id straight into any
// of the three read methods.
export function FeedReference({ feeds }: { feeds: FeedRef[] }) {
  const [query, setQuery] = useState("")

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return feeds
      .filter((f) => !q || (f.feed_id + " " + ticker(f.feed_id) + " " + f.unit).toLowerCase().includes(q))
      .map((f) => [
        <code key="id" className="break-all">{f.feed_id}</code>,
        <b key="t">{ticker(f.feed_id)}</b>,
        <span key="d" className="tabular-nums">{f.decimals}</span>,
        <span key="u" className="muted">{f.unit}</span>,
        <span key="c" className="muted uppercase">{f.frequency}</span>,
      ])
  }, [feeds, query])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 border-2 border-foreground px-3 py-2 w-full md:max-w-sm">
        <Search size={14} strokeWidth={2} className="text-muted-foreground shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="filter feeds — wti, coal, henry hub…"
          className="w-full bg-transparent outline-none text-xs font-mono tracking-wide placeholder:text-muted-foreground/60"
        />
      </div>
      <DocTable
        headers={["feed_id (the key you pass)", "ticker", "decimals", "unit", "cadence"]}
        cols="2.6fr 1fr 0.7fr 1fr 0.9fr"
        minWidth={760}
        rows={rows}
      />
      <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-mono">
        * human value = amount / 10^decimals · {feeds.length} feeds live · pass feed_id verbatim to REST, SDK, or a contract.
      </p>
    </div>
  )
}
