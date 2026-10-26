"use client"

import { useEffect, useState } from "react"
import { readApi } from "./api"

export function useApiData<T>(path: string | null, intervalMs = 60_000) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!path) return
    const endpoint = path
    let active = true
    let failures = 0
    let controller: AbortController | null = null
    let timer: ReturnType<typeof setTimeout> | undefined

    async function tick() {
      if (!active || document.hidden || controller) return
      controller = new AbortController()
      try {
        const result = await readApi<T>(endpoint, AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)]))
        if (active) {
          setData(result)
          setError(null)
          failures = 0
        }
      } catch (err) {
        if (active) {
          failures++
          setError(err instanceof Error ? err.message : "Data service unavailable")
        }
      } finally {
        controller = null
        if (active && !document.hidden) {
          timer = setTimeout(tick, Math.min(intervalMs * 2 ** failures, 300_000))
        }
      }
    }

    function visibilityChanged() {
      clearTimeout(timer)
      if (!document.hidden) void tick()
    }

    void tick()
    document.addEventListener("visibilitychange", visibilityChanged)
    return () => {
      active = false
      clearTimeout(timer)
      controller?.abort()
      document.removeEventListener("visibilitychange", visibilityChanged)
    }
  }, [path, intervalMs])

  return { data, error, loading: !!path && !data && !error }
}
