import { NextResponse } from "next/server"
import { getAllReadings } from "@/lib/claros"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const headers = { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=30" }

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const feeds = await getAllReadings()
  const reading = feeds.find(feed => feed.feed_id === id)
  if (!reading) return NextResponse.json({ error: `feed not found on-chain: ${id}` }, { status: 404, headers })
  return NextResponse.json(reading, { headers })
}
