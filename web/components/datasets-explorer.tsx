"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Search } from "lucide-react"
import type { DatasetRow } from "@/lib/datasets"

const ease = [0.22, 1, 0.36, 1] as const

export function DatasetsExplorer({ datasets, liveRoutes }: { datasets: DatasetRow[]; liveRoutes: string[] }) {
  const live = useMemo(() => new Set(liveRoutes), [liveRoutes])
  const [query, setQuery] = useState("")
  const [fam, setFam] = useState("ALL")
  const [liveOnly, setLiveOnly] = useState(false)

  const families = useMemo(() => {
    const set = new Set(datasets.map((d) => d.family))
    return ["ALL", ...Array.from(set).sort()]
  }, [datasets])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return datasets.filter((d) => {
      if (fam !== "ALL" && d.family !== fam) return false
      if (liveOnly && !live.has(d.route)) return false
      if (!q) return true
      return (d.route + " " + d.name + " " + d.columns.join(" ") + " " + d.facets.join(" ")).toLowerCase().includes(q)
    })
  }, [datasets, query, fam, liveOnly, live])

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
              placeholder="search 232 datasets — crude, storage, retail…"
              className="w-full bg-transparent outline-none text-xs font-mono tracking-wide placeholder:text-muted-foreground/60"
            />
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLiveOnly((v) => !v)}
              className={`flex items-center gap-2 px-3 py-1.5 text-[10px] font-mono tracking-[0.15em] uppercase border-2 border-foreground transition-colors ${
                liveOnly ? "bg-[#ea580c] text-background border-[#ea580c]" : "bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className={`h-1.5 w-1.5 ${liveOnly ? "bg-background" : "bg-[#ea580c]"}`} />
              live only
            </button>
            <span className="text-[10px] tracking-widest text-muted-foreground uppercase font-mono">
              {rows.length}/{datasets.length} datasets
            </span>
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

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-l-2 border-t-2 border-foreground">
        {rows.map((d, i) => {
          const isLive = live.has(d.route)
          return (
            <motion.div
              key={d.route}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 24) * 0.012, duration: 0.3, ease }}
              className="group flex flex-col border-r-2 border-b-2 border-foreground px-4 py-3 hover:bg-foreground hover:text-background transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] tracking-[0.18em] uppercase text-muted-foreground group-hover:text-background/60 font-mono">
                  {d.family}
                </span>
                {isLive ? (
                  <span className="flex items-center gap-1.5 text-[9px] tracking-[0.15em] uppercase font-mono text-[#ea580c]">
                    <span className="h-1.5 w-1.5 bg-[#ea580c]" /> live
                  </span>
                ) : (
                  <span className="text-[9px] tracking-[0.15em] uppercase font-mono text-muted-foreground/50 group-hover:text-background/40">
                    indexed
                  </span>
                )}
              </div>
              <span className="text-sm font-mono font-bold tracking-tight leading-snug mb-1">{d.name}</span>
              <span className="text-[10px] font-mono text-muted-foreground group-hover:text-background/60 break-all mb-3">
                {d.route}
              </span>
              <div className="mt-auto flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1">
                  {d.frequencies.slice(0, 3).map((f) => (
                    <span
                      key={f}
                      className="text-[8px] tracking-[0.1em] uppercase font-mono border border-border group-hover:border-background/30 px-1.5 py-0.5 text-muted-foreground group-hover:text-background/70"
                    >
                      {f}
                    </span>
                  ))}
                </div>
                <span className="text-[9px] font-mono text-muted-foreground group-hover:text-background/60 whitespace-nowrap">
                  {d.columns.length}c · {d.facets.length}f
                </span>
              </div>
            </motion.div>
          )
        })}
        {rows.length === 0 && (
          <div className="col-span-full px-4 py-10 text-center text-xs font-mono text-muted-foreground border-r-2 border-b-2 border-foreground">
            no datasets match “{query}”.
          </div>
        )}
      </div>

      <p className="mt-4 text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-mono">
        * any indexed dataset can be attested on-chain via the Claros agent — c = columns, f = facets.
      </p>
    </section>
  )
}
