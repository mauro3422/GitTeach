import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GitHubAuthenticationError,
  GitHubRateLimitError,
  GitHubRestClient,
  GitHubTransportError,
  MemoryGitHubHttpCache
} from '../../src/core/index.js';

function jsonResponse(value, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json', ...headers }
  });
}

test('active rate-limit backoff blocks later network requests until retryAt', async () => {
  let now = Date.parse('2026-09-23T21:00:00Z');
  let calls = 0;
  const client = new GitHubRestClient({
    now: () => now,
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) {
        return jsonResponse({ message: 'API rate limit exceeded' }, {
          status: 403,
          headers: {
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': String(Math.floor(now / 1000) + 60)
          }
        });
      }
      return jsonResponse({ ok: true });
    }
  });

  await assert.rejects(client.getJson('/first'), GitHubRateLimitError);
  const state = client.getRateLimitState();
  assert.equal(state.blocked, true);
  assert.equal(state.retryAt, '2026-09-23T21:01:00.000Z');

  await assert.rejects(client.getJson('/second'), (error) => {
    assert.ok(error instanceof GitHubRateLimitError);
    assert.equal(error.code, 'github-rate-limit-active');
    return true;
  });
  assert.equal(calls, 1);

  now += 61_000;
  const recovered = await client.getJson('/third');
  assert.deepEqual(recovered.value, { ok: true });
  assert.equal(calls, 2);
  assert.equal(client.getRateLimitState().blocked, false);
});

test('transport timeout is bounded and does not expose underlying error details', async () => {
  const client = new GitHubRestClient({
    requestTimeoutMs: 5,
    fetchImpl: async (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => {
        const error = new Error('internal network details');
        error.name = 'AbortError';
        reject(error);
      }, { once: true });
    })
  });

  await assert.rejects(client.getJson('/slow'), (error) => {
    assert.ok(error instanceof GitHubTransportError);
    assert.equal(error.code, 'github-timeout');
    assert.equal(error.message.includes('internal network details'), false);
    return true;
  });
});

test('network failures are sanitized and do not poison the serial queue', async () => {
  let calls = 0;
  const client = new GitHubRestClient({
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) throw new Error('socket path with sensitive local detail');
      return jsonResponse({ recovered: true });
    }
  });

  await assert.rejects(client.getJson('/fail'), (error) => {
    assert.ok(error instanceof GitHubTransportError);
    assert.equal(error.code, 'github-network-error');
    assert.equal(error.message.includes('sensitive local detail'), false);
    return true;
  });
  const recovered = await client.getJson('/recover');
  assert.deepEqual(recovered.value, { recovered: true });
  assert.equal(calls, 2);
});

test('credential-provider failures are sanitized before any network request', async () => {
  let calls = 0;
  const client = new GitHubRestClient({
    getAccessToken: async () => {
      throw new Error('vault details should stay private');
    },
    fetchImpl: async () => {
      calls += 1;
      return jsonResponse({ ok: true });
    }
  });

  await assert.rejects(client.getJson('/user'), (error) => {
    assert.ok(error instanceof GitHubAuthenticationError);
    assert.equal(error.code, 'github-token-provider');
    assert.equal(error.message.includes('vault details'), false);
    return true;
  });
  assert.equal(calls, 0);
});

test('429 without retry headers still establishes a one-minute local backoff', async () => {
  const now = Date.parse('2026-09-23T21:00:00Z');
  const client = new GitHubRestClient({
    now: () => now,
    fetchImpl: async () => jsonResponse({ message: 'Too Many Requests' }, { status: 429 })
  });

  await assert.rejects(client.getJson('/busy'), (error) => {
    assert.ok(error instanceof GitHubRateLimitError);
    assert.equal(error.retryAt, '2026-09-23T21:01:00.000Z');
    return true;
  });
  assert.equal(client.getRateLimitState().blocked, true);
});


test('authenticated caching is disabled unless a stable non-secret cache partition is supplied', async () => {
  const cache = new MemoryGitHubHttpCache();
  const seenIfNoneMatch = [];
  let calls = 0;
  const client = new GitHubRestClient({
    cache,
    getAccessToken: async () => 'test-token-value',
    fetchImpl: async (_url, { headers }) => {
      calls += 1;
      seenIfNoneMatch.push(headers['If-None-Match'] ?? null);
      return jsonResponse({ call: calls }, { headers: { etag: '"repo-etag"' } });
    }
  });

  const first = await client.getJson('/user/repos');
  const second = await client.getJson('/user/repos');

  assert.deepEqual(first.value, { call: 1 });
  assert.deepEqual(second.value, { call: 2 });
  assert.deepEqual(seenIfNoneMatch, [null, null]);
  assert.equal(cache.size, 0);
});

test('authenticated cache entries are isolated by explicit connection partition', async () => {
  const cache = new MemoryGitHubHttpCache();
  let partition = 'account-a';
  const seen = [];
  const client = new GitHubRestClient({
    cache,
    getAccessToken: async () => 'test-token-value',
    getCachePartition: async () => partition,
    fetchImpl: async (_url, { headers }) => {
      const ifNoneMatch = headers['If-None-Match'] ?? null;
      seen.push({ partition, ifNoneMatch });
      if (ifNoneMatch === `"${partition}"`) {
        return new Response(null, { status: 304, headers: { etag: `"${partition}"` } });
      }
      return jsonResponse({ account: partition }, { headers: { etag: `"${partition}"` } });
    }
  });

  const a1 = await client.getJson('/user/repos');
  const a2 = await client.getJson('/user/repos');
  partition = 'account-b';
  const b1 = await client.getJson('/user/repos');
  partition = 'account-a';
  const a3 = await client.getJson('/user/repos');

  assert.deepEqual(a1.value, { account: 'account-a' });
  assert.equal(a2.fromCache, true);
  assert.deepEqual(b1.value, { account: 'account-b' });
  assert.equal(b1.fromCache, false);
  assert.equal(a3.fromCache, true);
  assert.deepEqual(a3.value, { account: 'account-a' });
  assert.deepEqual(seen, [
    { partition: 'account-a', ifNoneMatch: null },
    { partition: 'account-a', ifNoneMatch: '"account-a"' },
    { partition: 'account-b', ifNoneMatch: null },
    { partition: 'account-a', ifNoneMatch: '"account-a"' }
  ]);
  assert.equal(cache.size, 2);
});
