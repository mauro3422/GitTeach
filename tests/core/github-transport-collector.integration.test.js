import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import {
  GitHubRestClient,
  GitHubRepositoryFactsCollector
} from '../../src/core/index.js';

function json(res, value, { status = 200, headers = {} } = {}) {
  res.writeHead(status, { 'content-type': 'application/json', ...headers });
  res.end(JSON.stringify(value));
}

test('local HTTP integration flows through transport, bounded collector and GitHub facts', async (t) => {
  const requestPaths = [];
  const server = http.createServer((req, res) => {
    requestPaths.push(req.url);
    if (req.url === '/repos/mauro3422/GitTeach/releases?per_page=100') {
      json(res, [{
        id: 10,
        tag_name: 'v1.0.0',
        draft: false,
        prerelease: false,
        author: { login: 'mauro3422' },
        html_url: 'https://github.com/mauro3422/GitTeach/releases/tag/v1.0.0'
      }], { headers: { etag: '"releases-v1"' } });
      return;
    }
    if (req.url === '/repos/mauro3422/GitTeach/pulls?state=all&per_page=100&sort=created&direction=asc') {
      json(res, [{
        id: 20,
        number: 7,
        state: 'closed',
        user: { login: 'mauro3422' },
        merged_at: '2026-09-20T12:00:00Z',
        html_url: 'https://github.com/mauro3422/GitTeach/pull/7'
      }], { headers: { etag: '"pulls-v1"' } });
      return;
    }
    if (req.url === '/repos/mauro3422/GitTeach/issues?state=all&per_page=100&sort=created&direction=asc') {
      json(res, [
        { id: 30, number: 2, state: 'open', user: { login: 'mauro3422' } },
        { id: 31, number: 7, state: 'closed', user: { login: 'mauro3422' }, pull_request: { url: 'x' } }
      ], { headers: { etag: '"issues-v1"' } });
      return;
    }
    if (req.url === '/repos/mauro3422/GitTeach/pulls/7/reviews?per_page=100') {
      json(res, [{
        id: 40,
        state: 'APPROVED',
        user: { login: 'mauro3422' },
        submitted_at: '2026-09-21T12:00:00Z',
        html_url: 'https://github.com/mauro3422/GitTeach/pull/7#pullrequestreview-40'
      }], { headers: { etag: '"reviews-v1"' } });
      return;
    }
    json(res, { message: 'not found' }, { status: 404 });
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const client = new GitHubRestClient({ baseUrl, maxPages: 2, maxItems: 50 });
  const collector = new GitHubRepositoryFactsCollector({
    client,
    maxPagesPerSurface: 2,
    maxItemsPerSurface: 50,
    maxReviewPulls: 2,
    now: () => '2026-09-23T21:40:00.000Z'
  });

  const result = await collector.collect({
    owner: 'mauro3422',
    repo: 'GitTeach',
    connectedLogin: 'mauro3422',
    reviewPullNumbers: [7]
  });

  assert.deepEqual(requestPaths, [
    '/repos/mauro3422/GitTeach/releases?per_page=100',
    '/repos/mauro3422/GitTeach/pulls?state=all&per_page=100&sort=created&direction=asc',
    '/repos/mauro3422/GitTeach/issues?state=all&per_page=100&sort=created&direction=asc',
    '/repos/mauro3422/GitTeach/pulls/7/reviews?per_page=100'
  ]);
  assert.equal(result.collection.baseSurfacesComplete, true);
  assert.equal(result.collection.reviews.truncated, false);
  assert.equal(result.facts.summary.releaseCount, 1);
  assert.equal(result.facts.summary.pullRequestCount, 1);
  assert.equal(result.facts.summary.mergedPullRequestCount, 1);
  assert.equal(result.facts.summary.reviewCount, 1);
  assert.equal(result.facts.summary.issueCount, 1);
  assert.deepEqual(result.facts.connectedActorActivity, {
    login: 'mauro3422',
    authoredReleaseCount: 1,
    authoredPullRequestCount: 1,
    submittedReviewCount: 1,
    authoredIssueCount: 1
  });
  assert.equal(result.facts.facts.every((fact) => fact.factRef.startsWith('github:mauro3422/GitTeach:')), true);
});
