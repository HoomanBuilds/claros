import { NextResponse } from "next/server"
import { getAllReadings } from "@/lib/claros"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const headers = { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=30" }

export async function GET() {
  const feeds = await getAllReadings()
  return NextResponse.json({ count: feeds.length, feeds }, { headers })
}
