import { NextResponse } from "next/server"
import { getStats } from "@/lib/claros"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const stats = await getStats()
  return NextResponse.json({ status: "ok", service: "claros-api", ...stats }, {
    headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" },
  })
}
