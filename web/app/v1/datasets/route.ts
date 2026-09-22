import { NextResponse } from "next/server"
import { getDatasets } from "@/lib/datasets"

export const runtime = "nodejs"

const headers = { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=3600" }

export async function GET(request: Request) {
  const url = new URL(request.url)
  const query = (url.searchParams.get("q") ?? "").toLowerCase()
  const family = (url.searchParams.get("family") ?? "").toLowerCase()
  let datasets = getDatasets()
  if (family) datasets = datasets.filter(dataset => dataset.group === family || dataset.family.toLowerCase() === family)
  if (query) {
    datasets = datasets.filter(dataset =>
      `${dataset.route} ${dataset.name} ${dataset.family} ${dataset.columns.join(" ")} ${dataset.facets.join(" ")}`
        .toLowerCase()
        .includes(query),
    )
  }
  return NextResponse.json({ total: datasets.length, datasets }, { headers })
}
