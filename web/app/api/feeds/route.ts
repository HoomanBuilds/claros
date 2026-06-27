import { NextResponse } from "next/server"
import { getAllReadings, getStats } from "@/lib/claros"

// Live on-chain feed reads for client polling. Node runtime (uses Buffer + blake2b);
// the underlying reader has its own 60s stale-while-revalidate cache, so polling
// this endpoint is cheap and never blocks on the RPC node.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const [feeds, stats] = await Promise.all([getAllReadings(), getStats()])
  return NextResponse.json({ network: stats.network, stats, count: feeds.length, feeds })
}
