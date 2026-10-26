import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rpc } from './rpc.js';

test('RPC result is returned', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ result: { balance: '1' } }));
  assert.deepEqual(await rpc('query_balance', {}), { balance: '1' });
});

test('missing dictionary values are allowed', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: {
    code: -32003, data: 'value was not found in the global state',
  } }));
  assert.equal(await rpc('state_get_dictionary_item', {}), null);
});

test('upstream errors are not interpreted as empty feeds', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: { code: -32003, data: 'state root unavailable' } }));
  await assert.rejects(rpc('state_get_dictionary_item', {}), /failed \(-32003\)/);
});

test('HTTP failures propagate', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('unavailable', { status: 503 }));
  await assert.rejects(rpc('chain_get_state_root_hash', {}), /HTTP 503/);
});

test('malformed responses fail closed', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({}));
  await assert.rejects(rpc('chain_get_state_root_hash', {}), /no result/);
});
