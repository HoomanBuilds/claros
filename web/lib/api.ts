export const API_BASE = (
  process.env.NEXT_PUBLIC_CLAROS_API_URL ?? "https://15-135-178-84.sslip.io/claros-api"
).replace(/\/+$/, "")

export async function readApi<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { signal })
  if (!response.ok) throw new Error(`Data service returned ${response.status}`)
  return response.json() as Promise<T>
}
