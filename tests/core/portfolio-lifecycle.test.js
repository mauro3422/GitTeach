import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  PORTFOLIO_LIFECYCLE_SCHEMA,
  REPOSITORY_LIFECYCLE_SCHEMA,
  summarizePortfolioLifecycle
} from '../../src/core/index.js';

function lifecycle(repository, overrides = {}) {
  return {
    schema: REPOSITORY_LIFECYCLE_SCHEMA,
    repository,
    source: 'git-local',
    commitCount: 1,
    firstCommitAt: '2026-01-01T00:00:00.000Z',
    latestCommitAt: '2026-01-01T00:00:00.000Z',
    activeMonthCount: 1,
    activeYearCount: 1,
    tagCount: 0,
    firstTag: null,
    latestTag: null,
    commitsAfterLatestTag: null,
    hasPostTagCommits: null,
    deterministic: true,
    ...overrides
  };
}

test('portfolio lifecycle summarizes deterministic repository lifecycle facts without skill scoring', () => {
  const summary = summarizePortfolioLifecycle({
    lifecycles: [
      lifecycle('repo-a', { activeMonthCount: 4, tagCount: 2, commitsAfterLatestTag: 3, hasPostTagCommits: true }),
      lifecycle('repo-b', { activeMonthCount: 2, tagCount: 1, commitsAfterLatestTag: 0, hasPostTagCommits: false }),
      lifecycle('repo-c', { commitCount: 0, activeMonthCount: 0, activeYearCount: 0 })
    ]
  });

  assert.equal(summary.schema, PORTFOLIO_LIFECYCLE_SCHEMA);
  assert.equal(summary.analyzedRepositoryCount, 3);
  assert.equal(summary.repositoryWithHistoryCount, 2);
  assert.equal(summary.multiMonthHistoryRepositoryCount, 2);
  assert.equal(summary.taggedRepositoryCount, 2);
  assert.equal(summary.postTagMaintenanceRepositoryCount, 1);
  assert.equal(summary.totalReachableTagCount, 3);
  assert.equal('expertiseScore' in summary, false);
  assert.equal('seniority' in summary, false);
});

test('duplicate lifecycle snapshots for one repository do not inflate portfolio counts', () => {
  const summary = summarizePortfolioLifecycle({
    lifecycles: [
      lifecycle('repo-a', { tagCount: 1 }),
      lifecycle('repo-a', { tagCount: 99 }),
      lifecycle('repo-b')
    ]
  });

  assert.equal(summary.analyzedRepositoryCount, 2);
  assert.equal(summary.taggedRepositoryCount, 1);
  assert.equal(summary.totalReachableTagCount, 1);
});

test('portfolio lifecycle rejects incompatible repository lifecycle contracts', () => {
  assert.throws(
    () => summarizePortfolioLifecycle({ lifecycles: [{ schema: 'other', repository: 'repo-a' }] }),
    /unsupported repository lifecycle schema/i
  );
});

test('JS portfolio lifecycle matches the shared v1 schema fixture', () => {
  const schema = JSON.parse(readFileSync(new URL('../fixtures/portfolio-lifecycle-v1-schema.json', import.meta.url), 'utf8'));
  const summary = summarizePortfolioLifecycle({ lifecycles: [lifecycle('repo-a')] });

  for (const field of schema.summaryFields) {
    assert.ok(Object.hasOwn(summary, field), `missing summary field ${field}`);
  }
  for (const field of schema.repositoryFields) {
    assert.ok(Object.hasOwn(summary.repositories[0], field), `missing repository field ${field}`);
  }
});
