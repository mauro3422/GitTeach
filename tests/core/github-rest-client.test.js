import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GITHUB_REST_API_VERSION,
  GitHubAuthenticationError,
  GitHubNotAccessibleError,
  GitHubPermissionError,
  GitHubProtocolError,
  GitHubRateLimitError,
  GitHubRestClient,
  MemoryGitHubHttpCache
} from '../../src/core/index.js';

function jsonResponse(value, { status = 200, headers = {} } = {}) {
  return new Response(status === 304 ? null : JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json', ...headers }
  });
}

function callUrl(input) {
  return input instanceof URL ? input.toString() : String(input);
}

test('GitHub REST transport obtains tokens lazily and never exposes them in errors', async () => {
  const token = 'test-token-value';
  let tokenCalls = 0;
  const seenAuth = [];
  const client = new GitHubRestClient({
    getAccessToken: async () => {
      tokenCalls += 1;
      return token;
    },
    fetchImpl: async (_url, options) => {
      seenAuth.push(options.headers.Authorization);
      return jsonResponse({ message: `bad ${token}` }, { status: 401 });
    }
  });

  await assert.rejects(client.getJson('/user'), (error) => {
    assert.ok(error instanceof GitHubAuthenticationError);
    assert.equal(error.status, 401);
    assert.equal(JSON.stringify(error).includes(token), false);
    assert.equal(error.message.includes(token), false);
    return true;
  });
  assert.equal(tokenCalls, 1);
  assert.deepEqual(seenAuth, [`Bearer ${token}`]);
});

test('requests are serialized even when callers invoke the client concurrently', async () => {
  let active = 0;
  let maxActive = 0;
  const order = [];
  const client = new GitHubRestClient({
    fetchImpl: async (url) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      order.push(`start:${new URL(url).pathname}`);
      await new Promise((resolve) => setTimeout(resolve, 5));
      order.push(`end:${new URL(url).pathname}`);
      active -= 1;
      return jsonResponse({ ok: true });
    }
  });

  await Promise.all([client.getJson('/a'), client.getJson('/b'), client.getJson('/c')]);
  assert.equal(maxActive, 1);
  assert.deepEqual(order, ['start:/a', 'end:/a', 'start:/b', 'end:/b', 'start:/c', 'end:/c']);
});

test('ETag cache sends If-None-Match and reuses cached value on 304', async () => {
  const cache = new MemoryGitHubHttpCache();
  const seen = [];
  let call = 0;
  const client = new GitHubRestClient({
    cache,
    getAccessToken: () => 'test-token',
    getCachePartition: () => 'account-test',
    fetchImpl: async (_url, options) => {
      seen.push({ ...options.headers });
      call += 1;
      if (call === 1) return jsonResponse([{ id: 1 }], { headers: { etag: '"abc"', link: '<https://api.github.com/items?page=2>; rel="next"' } });
      return jsonResponse(null, { status: 304, headers: { etag: '"abc"' } });
    }
  });

  const first = await client.getJson('/items?page=1');
  const second = await client.getJson('/items?page=1');

  assert.equal(first.fromCache, false);
  assert.equal(second.fromCache, true);
  assert.deepEqual(second.value, [{ id: 1 }]);
  assert.equal(second.link, '<https://api.github.com/items?page=2>; rel="next"');
  assert.equal(seen[1]['If-None-Match'], '"abc"');
  assert.equal(cache.size, 1);
});

test('304 without a cached representation fails closed', async () => {
  const client = new GitHubRestClient({ fetchImpl: async () => jsonResponse(null, { status: 304 }) });
  await assert.rejects(client.getJson('/items'), (error) => {
    assert.ok(error instanceof GitHubProtocolError);
    assert.equal(error.code, 'github-cache-miss-304');
    return true;
  });
});

test('pagination follows GitHub Link headers and remains bounded by maxItems', async () => {
  const requested = [];
  const client = new GitHubRestClient({
    fetchImpl: async (url) => {
      const parsed = new URL(url);
      requested.push(parsed.toString());
      const page = parsed.searchParams.get('page') ?? '1';
      if (page === '1') {
        return jsonResponse([{ id: 1 }, { id: 2 }], {
          headers: { link: '<https://api.github.com/items?page=2>; rel="next", <https://api.github.com/items?page=3>; rel="last"' }
        });
      }
      return jsonResponse([{ id: 3 }, { id: 4 }], {
        headers: { link: '<https://api.github.com/items?page=3>; rel="next"' }
      });
    }
  });

  const result = await client.getPaginated('/items?page=1', { maxPages: 10, maxItems: 3, useCache: false });
  assert.deepEqual(result.items, [{ id: 1 }, { id: 2 }, { id: 3 }]);
  assert.equal(result.pagesFetched, 2);
  assert.equal(result.truncated, true);
  assert.equal(result.nextUrl, 'https://api.github.com/items?page=3');
  assert.equal(requested.length, 2);
});

test('pagination obeys maxPages and never synthesizes a page URL', async () => {
  const requested = [];
  const client = new GitHubRestClient({
    fetchImpl: async (url) => {
      requested.push(callUrl(url));
      return jsonResponse([{ id: 1 }], {
        headers: { link: '<https://api.github.com/custom-cursor?after=opaque>; rel="next"' }
      });
    }
  });

  const result = await client.getPaginated('/items', { maxPages: 1, maxItems: 100 });
  assert.equal(result.pagesFetched, 1);
  assert.equal(result.truncated, true);
  assert.equal(result.nextUrl, 'https://api.github.com/custom-cursor?after=opaque');
  assert.deepEqual(requested, ['https://api.github.com/items']);
});

test('cross-origin Link targets are rejected before credentials can be sent', async () => {
  const calls = [];
  const client = new GitHubRestClient({
    getAccessToken: () => 'test-token',
    fetchImpl: async (url, options) => {
      calls.push({ url: callUrl(url), auth: options.headers.Authorization });
      return jsonResponse([{ id: 1 }], { headers: { link: '<https://evil.example/steal>; rel="next"' } });
    }
  });

  await assert.rejects(client.getPaginated('/items'), (error) => {
    assert.ok(error instanceof GitHubProtocolError);
    assert.equal(error.code, 'github-cross-origin-url');
    return true;
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.github.com/items');
});

test('primary rate-limit 403 returns retryAt and does not retry automatically', async () => {
  let calls = 0;
  const client = new GitHubRestClient({
    now: () => 1_700_000_000_000,
    fetchImpl: async () => {
      calls += 1;
      return jsonResponse({ message: 'API rate limit exceeded' }, {
        status: 403,
        headers: {
          'x-ratelimit-limit': '60',
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': '1700000120',
          'x-ratelimit-resource': 'core'
        }
      });
    }
  });

  await assert.rejects(client.getJson('/rate'), (error) => {
    assert.ok(error instanceof GitHubRateLimitError);
    assert.equal(error.code, 'github-rate-limit');
    assert.equal(error.retryAt, '2023-11-14T22:15:20.000Z');
    assert.equal(error.rateLimit.remaining, 0);
    return true;
  });
  assert.equal(calls, 1);
  assert.deepEqual(client.getRateLimitState(), {
    blocked: true,
    retryAt: '2023-11-14T22:15:20.000Z',
    rateLimit: {
      limit: 60,
      remaining: 0,
      used: null,
      resetEpochSeconds: 1700000120,
      resource: 'core',
      retryAfterSeconds: null
    }
  });
  await assert.rejects(client.getJson('/blocked'), (error) => {
    assert.ok(error instanceof GitHubRateLimitError);
    assert.equal(error.code, 'github-rate-limit-active');
    return true;
  });
  assert.equal(calls, 1);
});

test('secondary rate-limit uses a one-minute boundary when GitHub gives no reset header', async () => {
  const now = Date.parse('2026-09-23T21:00:00Z');
  const client = new GitHubRestClient({
    now: () => now,
    fetchImpl: async () => jsonResponse({ message: 'You have exceeded a secondary rate limit.' }, { status: 403 })
  });

  await assert.rejects(client.getJson('/secondary'), (error) => {
    assert.ok(error instanceof GitHubRateLimitError);
    assert.equal(error.code, 'github-secondary-rate-limit');
    assert.equal(error.retryAt, '2026-09-23T21:01:00.000Z');
    return true;
  });
});

test('429 honors Retry-After without automatic retry', async () => {
  const now = Date.parse('2026-09-23T21:00:00Z');
  let calls = 0;
  const client = new GitHubRestClient({
    now: () => now,
    fetchImpl: async () => {
      calls += 1;
      return jsonResponse({ message: 'slow down' }, { status: 429, headers: { 'retry-after': '90' } });
    }
  });

  await assert.rejects(client.getJson('/retry'), (error) => {
    assert.ok(error instanceof GitHubRateLimitError);
    assert.equal(error.retryAt, '2026-09-23T21:01:30.000Z');
    return true;
  });
  assert.equal(calls, 1);
});

test('permission errors surface accepted permissions without response-body leakage', async () => {
  const client = new GitHubRestClient({
    fetchImpl: async () => jsonResponse({ message: 'private implementation detail' }, {
      status: 403,
      headers: { 'x-accepted-github-permissions': 'pull_requests=read; issues=read' }
    })
  });

  await assert.rejects(client.getJson('/denied'), (error) => {
    assert.ok(error instanceof GitHubPermissionError);
    assert.deepEqual(error.acceptedPermissions, ['pull_requests=read', 'issues=read']);
    assert.equal(error.message.includes('private implementation detail'), false);
    return true;
  });
});

test('404 stays ambiguous between absent and unauthorized private resource', async () => {
  const client = new GitHubRestClient({ fetchImpl: async () => jsonResponse({ message: 'Not Found' }, { status: 404 }) });
  await assert.rejects(client.getJson('/private'), (error) => {
    assert.ok(error instanceof GitHubNotAccessibleError);
    assert.equal(error.code, 'github-not-accessible');
    assert.match(error.message, /not found or is not accessible/i);
    return true;
  });
});

test('read-only endpoint helpers use stable bounded query shapes', async () => {
  const urls = [];
  const client = new GitHubRestClient({
    fetchImpl: async (url) => {
      urls.push(callUrl(url));
      const pathname = new URL(url).pathname;
      return pathname.endsWith('/topics')
        ? jsonResponse({ names: ['Developer-Tools', 'ai', 'developer-tools'] })
        : jsonResponse([]);
    }
  });

  await client.listAuthenticatedRepositories({ maxPages: 1 });
  const topics = await client.getRepositoryTopics('acme', 'demo');
  await client.listReleases('acme', 'demo', { maxPages: 1 });
  await client.listPullRequests('acme', 'demo', { maxPages: 1 });
  await client.listIssues('acme', 'demo', { maxPages: 1 });
  await client.listPullRequestReviews('acme', 'demo', 12, { maxPages: 1 });

  assert.deepEqual(topics.names, ['ai', 'developer-tools']);
  assert.equal(urls[0], 'https://api.github.com/user/repos?per_page=100&sort=full_name&direction=asc');
  assert.equal(urls[1], 'https://api.github.com/repos/acme/demo/topics');
  assert.equal(urls[2], 'https://api.github.com/repos/acme/demo/releases?per_page=100');
  assert.equal(urls[3], 'https://api.github.com/repos/acme/demo/pulls?state=all&per_page=100&sort=created&direction=asc');
  assert.equal(urls[4], 'https://api.github.com/repos/acme/demo/issues?state=all&per_page=100&sort=created&direction=asc');
  assert.equal(urls[5], 'https://api.github.com/repos/acme/demo/pulls/12/reviews?per_page=100');
});

test('repository topics helper rejects malformed payloads instead of inventing empty topics', async () => {
  const client = new GitHubRestClient({
    fetchImpl: async () => jsonResponse({ topics: ['wrong-shape'] })
  });

  await assert.rejects(client.getRepositoryTopics('acme', 'demo'), (error) => {
    assert.ok(error instanceof GitHubProtocolError);
    assert.equal(error.code, 'github-topics-shape');
    return true;
  });
});

test('transport publishes the current GitHub REST API version header', async () => {
  let headers;
  const client = new GitHubRestClient({
    fetchImpl: async (_url, options) => {
      headers = options.headers;
      return jsonResponse({ ok: true });
    }
  });
  await client.getJson('/meta');
  assert.equal(headers['X-GitHub-Api-Version'], GITHUB_REST_API_VERSION);
  assert.equal(headers.Accept, 'application/vnd.github+json');
});
