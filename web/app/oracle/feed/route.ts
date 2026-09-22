const UPSTREAM = process.env.CLAROS_ORACLE_UPSTREAM ?? "https://15-135-178-84.sslip.io/claros-oracle"
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Accept, Authorization, Content-Type, Origin, Payment-Signature",
  "Access-Control-Expose-Headers": "PAYMENT-REQUIRED, PAYMENT-RESPONSE",
}

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders })
}

export async function GET(request: Request) {
  const incoming = new URL(request.url)
  const upstream = new URL(`${UPSTREAM.replace(/\/$/, "")}/oracle/feed`)
  upstream.search = incoming.search
  const requestHeaders = new Headers()
  for (const name of ["accept", "authorization", "payment-signature"]) {
    const value = request.headers.get(name)
    if (value) requestHeaders.set(name, value)
  }

  try {
    const response = await fetch(upstream, { headers: requestHeaders, cache: "no-store" })
    const responseHeaders = new Headers(corsHeaders)
    for (const name of ["content-type", "payment-required", "payment-response", "www-authenticate"]) {
      const value = response.headers.get(name)
      if (value) responseHeaders.set(name, value)
    }
    return new Response(await response.arrayBuffer(), { status: response.status, headers: responseHeaders })
  } catch {
    return Response.json({ error: "oracle service unavailable" }, { status: 503, headers: corsHeaders })
  }
}
