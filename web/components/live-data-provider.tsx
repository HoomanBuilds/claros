"use client"

import { createContext, useContext } from "react"
import { usePathname } from "next/navigation"
import type { FeedReading, OracleStats } from "@/lib/format"
import { useApiData } from "@/lib/use-api-data"

interface FeedsResponse {
  network: string
  stats: OracleStats
  count: number
  feeds: FeedReading[]
  fetched_at: number
}

const emptyStats: OracleStats = { feedsLive: 0, attestations: 0, datasets: 232, network: "casper-test" }
const LiveDataContext = createContext({
  feeds: [] as FeedReading[],
  stats: emptyStats,
  updatedAt: null as number | null,
  loading: true,
  error: null as string | null,
})

export function LiveDataProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname().replace(/\/$/, "") || "/"
  const enabled = ["/", "/b", "/feeds", "/datasets"].includes(pathname)
  const { data, error, loading } = useApiData<FeedsResponse>(enabled ? "/api/feeds" : null)

  return (
    <LiveDataContext.Provider value={{
      feeds: data?.feeds ?? [],
      stats: data?.stats ?? emptyStats,
      updatedAt: data?.fetched_at ?? null,
      loading,
      error,
    }}>
      {children}
    </LiveDataContext.Provider>
  )
}

export function useLiveData() {
  return useContext(LiveDataContext)
}
