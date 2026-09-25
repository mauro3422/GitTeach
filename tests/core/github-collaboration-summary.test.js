import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  createGitHubRepositoryFacts,
  GITHUB_COLLABORATION_SUMMARY_SCHEMA,
  summarizeGitHubCollaboration
} from '../../src/core/index.js';

function fact(kind, sourceId, actorLogin = 'mauro', overrides = {}) {
  return {
    kind,
    sourceId,
    actorLogin,
    ...overrides
  };
}

function observation(name, inputs, coverageOverrides = {}, login = 'mauro') {
  const facts = createGitHubRepositoryFacts({
    repository: { owner: 'acme', name },
    connectedLogin: login,
    observedAt: '2026-09-23T21:45:00.000Z',
    facts: inputs
  });
  const reviewOverrides = coverageOverrides.reviews ?? {};
  const requestedPullCount = reviewOverrides.requestedPullCount ?? 0;
  const queriedPullCount = reviewOverrides.queriedPullCount ?? requestedPullCount;
  return {
    facts,
    collection: {
      baseSurfacesComplete: coverageOverrides.baseSurfacesComplete ?? true,
      reviews: {
        mode: 'targeted',
        requestedPullCount,
        queriedPullCount,
        omittedPullCount: reviewOverrides.omittedPullCount ?? (requestedPullCount - queriedPullCount),
        truncated: reviewOverrides.truncated ?? false
      }
    }
  };
}

test('GitHub collaboration aggregates observed activity across independent repositories without scoring it', () => {
  const result = summarizeGitHubCollaboration({
    connectedLogin: 'mauro',
    observations: [
      observation('repo-a', [
        fact('release', 'r1'),
        fact('pull-request', 'p1', 'Mauro', { mergedAt: '2026-09-01T00:00:00Z' }),
        fact('pull-request', 'p2'),
        fact('review', 'v1', 'MAURO', { state: 'APPROVED', createdAt: '2026-09-02T00:00:00Z' }),
        fact('issue', 'i1')
      ], { reviews: { requestedPullCount: 2 } }),
      observation('repo-b', [
        fact('pull-request', 'p3', 'mauro', { mergedAt: '2026-09-03T00:00:00Z' }),
        fact('review', 'v2', 'mauro', { state: 'COMMENTED', createdAt: '2026-09-04T00:00:00Z' }),
        fact('issue', 'i2', 'other')
      ], { baseSurfacesComplete: false, reviews: { requestedPullCount: 2, queriedPullCount: 1, truncated: true } }),
      observation('repo-c', [fact('release', 'r3', 'other')])
    ]
  });

  assert.equal(result.schema, GITHUB_COLLABORATION_SUMMARY_SCHEMA);
  assert.equal(result.analyzedRepositoryCount, 3);
  assert.equal(result.authoredPullRequests.observedCount, 3);
  assert.equal(result.authoredPullRequests.repositoryCount, 2);
  assert.deepEqual(result.authoredPullRequests.repositories, ['acme/repo-a', 'acme/repo-b']);
  assert.equal(result.mergedAuthoredPullRequests.observedCount, 2);
  assert.equal(result.submittedReviews.observedCount, 2);
  assert.equal(result.authoredIssues.observedCount, 1);
  assert.equal(result.authoredReleases.observedCount, 1);
  assert.equal(result.coverage.completeBaseRepositoryCount, 2);
  assert.equal(result.coverage.partialBaseRepositoryCount, 1);
  assert.equal(result.coverage.allBaseSurfacesComplete, false);
  assert.equal(result.coverage.targetedReviewRepositoryCount, 2);
  assert.equal(result.coverage.completeRequestedReviewRepositoryCount, 1);
  assert.equal(result.coverage.partialRequestedReviewRepositoryCount, 1);
  assert.equal(result.coverage.requestedReviewPullCount, 4);
  assert.equal(result.coverage.queriedReviewPullCount, 3);
  assert.equal(result.coverage.omittedReviewPullCount, 1);
  assert.equal(result.coverage.reviewHistoryComplete, false);
  assert.equal('expertiseScore' in result, false);
  assert.equal('seniority' in result, false);
  assert.equal('qualityScore' in result, false);
});

test('duplicate repository observations do not inflate collaboration counts', () => {
  const result = summarizeGitHubCollaboration({
    connectedLogin: 'mauro',
    observations: [
      observation('repo-a', [fact('pull-request', 'first')]),
      observation('repo-a', [
        fact('pull-request', 'later-1'),
        fact('pull-request', 'later-2'),
        fact('review', 'later-review', 'mauro', { state: 'APPROVED', createdAt: '2026-09-02T00:00:00Z' })
      ]),
      observation('repo-b', [fact('pull-request', 'other')])
    ]
  });

  assert.equal(result.analyzedRepositoryCount, 2);
  assert.equal(result.authoredPullRequests.observedCount, 2);
  assert.deepEqual(result.authoredPullRequests.repositories, ['acme/repo-a', 'acme/repo-b']);
  assert.equal(result.submittedReviews.observedCount, 0, 'first observation per repository is the deterministic owner');
});

test('pending or unsubmitted reviews are excluded from submitted-review collaboration facts', () => {
  const result = summarizeGitHubCollaboration({
    connectedLogin: 'mauro',
    observations: [observation('repo-a', [
      fact('review', 'pending', 'mauro', { state: 'PENDING', createdAt: null }),
      fact('review', 'missing-time', 'mauro', { state: 'APPROVED', createdAt: null }),
      fact('review', 'submitted', 'mauro', { state: 'CHANGES_REQUESTED', createdAt: '2026-09-02T00:00:00Z' })
    ], { reviews: { requestedPullCount: 1 } })]
  });

  assert.equal(result.submittedReviews.observedCount, 1);
  assert.deepEqual(result.submittedReviews.evidenceRefs, ['github:acme/repo-a:review:submitted']);
});

test('review coverage with zero selected pulls is not misrepresented as complete history', () => {
  const result = summarizeGitHubCollaboration({
    connectedLogin: 'mauro',
    observations: [observation('repo-a', [])]
  });

  assert.equal(result.coverage.reviewCoverageMode, 'targeted');
  assert.equal(result.coverage.targetedReviewRepositoryCount, 0);
  assert.equal(result.coverage.completeRequestedReviewRepositoryCount, 0);
  assert.equal(result.coverage.reviewHistoryComplete, false);
  assert.equal(result.repositories[0].reviewCoverageRequested, false);
  assert.equal(result.repositories[0].reviewCoverageCompleteForRequestedPulls, false);
});

test('evidence refs remain bounded while observed counts remain exact for the collected facts', () => {
  const result = summarizeGitHubCollaboration({
    connectedLogin: 'mauro',
    maxEvidenceRefsPerMetric: 2,
    observations: [observation('repo-a', [
      fact('pull-request', '3'),
      fact('pull-request', '1'),
      fact('pull-request', '2')
    ])]
  });

  assert.equal(result.authoredPullRequests.observedCount, 3);
  assert.deepEqual(result.authoredPullRequests.evidenceRefs, [
    'github:acme/repo-a:pull-request:1',
    'github:acme/repo-a:pull-request:2'
  ]);
  assert.equal(result.authoredPullRequests.omittedEvidenceRefCount, 1);
});

test('mixed connected identities and malformed coverage fail closed', () => {
  assert.throws(
    () => summarizeGitHubCollaboration({
      connectedLogin: 'mauro',
      observations: [observation('repo-a', [], {}, 'other')]
    }),
    /login mismatch/i
  );

  const malformed = observation('repo-a', []);
  malformed.collection.reviews.omittedPullCount = 1;
  assert.throws(
    () => summarizeGitHubCollaboration({ connectedLogin: 'mauro', observations: [malformed] }),
    /omittedPullCount must equal/i
  );
});

test('JS GitHub collaboration summary matches the shared v1 schema fixture', () => {
  const schema = JSON.parse(readFileSync(new URL('../fixtures/github-collaboration-summary-v1-schema.json', import.meta.url), 'utf8'));
  const result = summarizeGitHubCollaboration({
    connectedLogin: 'mauro',
    observations: [observation('repo-a', [fact('pull-request', '1')])]
  });

  for (const field of schema.summaryFields) assert.ok(Object.hasOwn(result, field), `missing summary field ${field}`);
  for (const field of schema.coverageFields) assert.ok(Object.hasOwn(result.coverage, field), `missing coverage field ${field}`);
  for (const field of schema.metricFields) assert.ok(Object.hasOwn(result.authoredPullRequests, field), `missing metric field ${field}`);
  for (const field of schema.repositoryFields) assert.ok(Object.hasOwn(result.repositories[0], field), `missing repository field ${field}`);
});
