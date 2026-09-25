import test from 'node:test';
import assert from 'node:assert/strict';

import {
  GITHUB_REPOSITORY_COLLECTION_SCHEMA,
  GitHubRepositoryFactsCollector
} from '../../src/core/providers/GitHubRepositoryFactsCollector.js';

function page(items, { pagesFetched = 1, truncated = false } = {}) {
  return Object.freeze({
    items: Object.freeze(items),
    pagesFetched,
    truncated,
    nextUrl: truncated ? 'https://api.github.com/next' : null,
    rateLimit: null
  });
}

function fakeClient({ releases, pulls, issues, reviewsByPull = new Map(), calls }) {
  return {
    async listReleases(owner, repo, options) {
      calls.push(['releases', owner, repo, options]);
      return releases;
    },
    async listPullRequests(owner, repo, options) {
      calls.push(['pulls', owner, repo, options]);
      return pulls;
    },
    async listIssues(owner, repo, options) {
      calls.push(['issues', owner, repo, options]);
      return issues;
    },
    async listPullRequestReviews(owner, repo, pullNumber, options) {
      calls.push(['reviews', owner, repo, pullNumber, options]);
      return reviewsByPull.get(pullNumber) ?? page([]);
    }
  };
}

test('repository collector keeps base GitHub surfaces and targeted review coverage explicit', async () => {
  const calls = [];
  const client = fakeClient({
    calls,
    releases: page([{ id: 10, tag_name: 'v1.0.0', author: { login: 'mauro' }, draft: false, prerelease: false }]),
    pulls: page([
      { id: 20, number: 7, state: 'closed', user: { login: 'mauro' }, merged_at: '2026-09-01T00:00:00Z' },
      { id: 21, number: 8, state: 'open', user: { login: 'other' }, merged_at: null }
    ]),
    issues: page([
      { id: 30, number: 2, state: 'open', user: { login: 'mauro' } },
      { id: 31, number: 7, state: 'closed', user: { login: 'mauro' }, pull_request: { url: 'https://api.github.com/pulls/7' } }
    ]),
    reviewsByPull: new Map([
      [7, page([{ id: 40, state: 'APPROVED', user: { login: 'mauro' }, submitted_at: '2026-09-02T00:00:00Z' }])],
      [8, page([{ id: 41, state: 'COMMENTED', user: { login: 'other' }, submitted_at: '2026-09-03T00:00:00Z' }])]
    ])
  });
  const collector = new GitHubRepositoryFactsCollector({
    client,
    maxPagesPerSurface: 3,
    maxItemsPerSurface: 250,
    maxReviewPulls: 4,
    now: () => '2026-09-23T21:30:00.000Z'
  });

  const result = await collector.collect({
    owner: 'mauro3422',
    repo: 'GitTeach',
    connectedLogin: 'mauro',
    reviewPullNumbers: [7, 8, 7]
  });

  assert.equal(result.schema, GITHUB_REPOSITORY_COLLECTION_SCHEMA);
  assert.equal(result.facts.repository.fullName, 'mauro3422/GitTeach');
  assert.equal(result.facts.connectedActorActivity.authoredReleaseCount, 1);
  assert.equal(result.facts.connectedActorActivity.authoredPullRequestCount, 1);
  assert.equal(result.facts.connectedActorActivity.submittedReviewCount, 1);
  assert.equal(result.facts.connectedActorActivity.authoredIssueCount, 1);
  assert.equal(result.facts.summary.issueCount, 1, 'PR-shaped issue entry must be filtered by the REST facts adapter');
  assert.equal(result.collection.baseSurfacesComplete, true);
  assert.deepEqual(result.collection.reviews.queriedPullNumbers, [7, 8]);
  assert.equal(result.collection.reviews.requestedPullCount, 2);
  assert.equal(result.collection.reviews.queriedPullCount, 2);
  assert.equal(result.collection.reviews.omittedPullCount, 0);
  assert.equal(result.collection.reviews.itemCount, 2);
  assert.equal(result.collection.reviews.truncated, false);

  assert.deepEqual(calls.map((entry) => entry[0]), ['releases', 'pulls', 'issues', 'reviews', 'reviews']);
  for (const entry of calls) {
    const options = entry.at(-1);
    assert.deepEqual(options, { maxPages: 3, maxItems: 250, useCache: true });
  }
});

test('repository collector makes partial base/review coverage observable instead of implying completeness', async () => {
  const calls = [];
  const client = fakeClient({
    calls,
    releases: page([], { pagesFetched: 2, truncated: true }),
    pulls: page([{ id: 1, number: 1, state: 'open', user: { login: 'mauro' } }]),
    issues: page([]),
    reviewsByPull: new Map([
      [1, page([{ id: 101, state: 'COMMENTED', user: { login: 'mauro' }, submitted_at: '2026-09-01T00:00:00Z' }])],
      [2, page([], { pagesFetched: 2, truncated: true })]
    ])
  });
  const collector = new GitHubRepositoryFactsCollector({
    client,
    maxReviewPulls: 2,
    now: () => '2026-09-23T21:30:00.000Z'
  });

  const result = await collector.collect({
    owner: 'mauro3422',
    repo: 'GitTeach',
    connectedLogin: 'mauro',
    reviewPullNumbers: [1, 2, 3]
  });

  assert.equal(result.collection.baseSurfacesComplete, false);
  assert.equal(result.collection.base.releases.truncated, true);
  assert.equal(result.collection.base.releases.completeWithinRequestedSurface, false);
  assert.deepEqual(result.collection.reviews.queriedPullNumbers, [1, 2]);
  assert.equal(result.collection.reviews.requestedPullCount, 3);
  assert.equal(result.collection.reviews.queriedPullCount, 2);
  assert.equal(result.collection.reviews.omittedPullCount, 1);
  assert.equal(result.collection.reviews.truncated, true);
  assert.equal(result.collection.reviews.pulls[1].truncated, true);
  assert.equal(calls.filter((entry) => entry[0] === 'reviews').length, 2);
});

test('repository collector performs no review N+1 work without explicitly selected pull numbers', async () => {
  const calls = [];
  const client = fakeClient({
    calls,
    releases: page([]),
    pulls: page(Array.from({ length: 50 }, (_, index) => ({
      id: index + 1,
      number: index + 1,
      state: 'closed',
      user: { login: 'mauro' }
    }))),
    issues: page([])
  });
  const collector = new GitHubRepositoryFactsCollector({
    client,
    now: () => '2026-09-23T21:30:00.000Z'
  });

  const result = await collector.collect({ owner: 'mauro3422', repo: 'GitTeach', connectedLogin: 'mauro' });

  assert.equal(result.facts.summary.pullRequestCount, 50);
  assert.equal(result.collection.reviews.mode, 'targeted');
  assert.equal(result.collection.reviews.requestedPullCount, 0);
  assert.equal(result.collection.reviews.queriedPullCount, 0);
  assert.equal(result.collection.reviews.itemCount, 0);
  assert.equal(calls.some((entry) => entry[0] === 'reviews'), false);
});

test('repository collector rejects malformed repository and review selection input before network work', async () => {
  const calls = [];
  const client = fakeClient({ calls, releases: page([]), pulls: page([]), issues: page([]) });
  const collector = new GitHubRepositoryFactsCollector({ client });

  await assert.rejects(() => collector.collect({ owner: '', repo: 'GitTeach' }), /owner is required/);
  await assert.rejects(
    () => collector.collect({ owner: 'mauro3422', repo: 'GitTeach', reviewPullNumbers: [0] }),
    /reviewPullNumbers must contain positive integers/
  );
  assert.equal(calls.length, 0);
});
