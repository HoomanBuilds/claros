import type { ReactNode } from "react"

// Brutalist data table for the docs. Horizontally scrollable on small screens so
// columns never crush. `cols` is a CSS grid-template-columns string (md+).
export function DocTable({
  headers,
  rows,
  cols,
  minWidth = 720,
}: {
  headers: string[]
  rows: ReactNode[][]
  cols: string
  minWidth?: number
}) {
  return (
    <div className="overflow-x-auto border-2 border-foreground">
      <div style={{ minWidth }}>
        <div className="grid bg-foreground text-background" style={{ gridTemplateColumns: cols }}>
          {headers.map((h, i) => (
            <span key={i} className="px-4 py-2 text-[9px] tracking-[0.18em] uppercase font-mono">
              {h}
            </span>
          ))}
        </div>
        {rows.map((row, ri) => (
          <div key={ri} className="grid border-t-2 border-foreground" style={{ gridTemplateColumns: cols }}>
            {row.map((cell, ci) => (
              <span
                key={ci}
                className="px-4 py-2.5 text-xs font-mono leading-relaxed text-foreground [&_b]:font-bold [&_code]:text-[#ea580c] [&_.muted]:text-muted-foreground"
              >
                {cell}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
