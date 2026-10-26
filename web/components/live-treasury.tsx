"use client"

import { TreasuryPanel } from "./treasury-panel"
import { useApiData } from "@/lib/use-api-data"
import type { TreasurySnapshot } from "@/lib/format"

export function LiveTreasury() {
  const { data, error, loading } = useApiData<TreasurySnapshot>("/v1/treasury", 120_000)

  return (
    <>
      {(loading || error) && (
        <p className="px-6 py-8 text-xs font-mono text-muted-foreground lg:px-12" role="status">
          {loading ? "Loading treasury..." : "Treasury service unavailable. Retrying shortly."}
        </p>
      )}
      {data && <TreasuryPanel snapshot={data} />}
    </>
  )
}
