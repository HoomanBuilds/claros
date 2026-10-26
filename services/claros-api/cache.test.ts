import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cached } from './cache.js';

test('concurrent requests share a single load', async () => {
  let calls = 0;
  const get = cached(async () => ++calls, 100);
  assert.deepEqual(await Promise.all([get(), get(), get()]), [1, 1, 1]);
  assert.equal(calls, 1);
});

test('cache expires at the TTL boundary', async () => {
  let now = 0;
  let calls = 0;
  const get = cached(async () => ++calls, 100, () => now);
  assert.equal(await get(), 1);
  now = 99;
  assert.equal(await get(), 1);
  now = 100;
  assert.equal(await get(), 2);
});

test('a failed refresh is reported and can recover', async () => {
  let now = 0;
  let fail = false;
  const get = cached(async () => {
    if (fail) throw new Error('RPC unavailable');
    return now;
  }, 100, () => now);
  assert.equal(await get(), 0);
  now = 100;
  fail = true;
  await assert.rejects(get(), /RPC unavailable/);
  fail = false;
  assert.equal(await get(), 100);
});
