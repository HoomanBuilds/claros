export async function rpc(method: string, params: unknown): Promise<any> {
  const response = await fetch(process.env.CASPER_NODE_RPC ?? 'https://node.testnet.casper.network/rpc', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Casper RPC HTTP ${response.status}`);
  const body = await response.json() as any;
  if (body.error) {
    if (method === 'state_get_dictionary_item' && body.error.code === -32003 &&
      String(body.error.data).includes('value was not found in the global state')) return null;
    throw new Error(`Casper RPC ${method} failed (${body.error.code})`);
  }
  if (!body.result) throw new Error(`Casper RPC ${method} returned no result`);
  return body.result;
}
