export function cached<T>(load: () => Promise<T>, ttlMs: number, now = Date.now): () => Promise<T> {
  let value: { data: T; expiresAt: number } | undefined
  let inflight: Promise<T> | undefined

  return async () => {
    if (value && now() < value.expiresAt) return value.data
    if (!inflight) {
      inflight = load().then(data => {
        value = { data, expiresAt: now() + ttlMs }
        return data
      }).finally(() => { inflight = undefined })
    }
    return inflight
  }
}
