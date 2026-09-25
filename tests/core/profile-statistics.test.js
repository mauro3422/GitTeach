import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  DEVELOPMENT_TENDENCIES_SCHEMA,
  GITHUB_COLLABORATION_SUMMARY_SCHEMA,
  PORTFOLIO_LIFECYCLE_SCHEMA,
  PROFILE_STATISTICS_SCHEMA,
  REPOSITORY_DOMAIN_FINGERPRINT_SCHEMA,
  TECHNOLOGY_FOOTPRINT_SCHEMA,
  buildProfileStatistics
} from '../../src/core/index.js';

function tendencies() {
  return {
    schema: DEVELOPMENT_TENDENCIES_SCHEMA,
    analyzedRepositoryCount: 2,
    minimumRepositories: 2,
    tendencies: [{
      key: 'automation', label: 'Automation', repositoryCount: 2, analyzedRepositoryCount: 2,
      prevalence: 1, repositories: ['GitTeach', 'kode'], evidenceRefs: ['ev-g', 'ev-k'], evidenceKinds: ['tooling'], deterministic: true
    }]
  };
}

function technology() {
  return {
    schema: TECHNOLOGY_FOOTPRINT_SCHEMA,
    analyzedRepositoryCount: 2,
    coverage: {
      completeInventoryRepositoryCount: 2,
      partialInventoryRepositoryCount: 0,
      inventorySummaryRepositoryCount: 2,
      selectedContentSummaryRepositoryCount: 0,
      knownPathCount: 15,
      summarizedPathCount: 15
    },
    languages: [{
      key: 'rust', label: 'Rust', repositoryCount: 2, analyzedRepositoryCount: 2,
      repositoryPrevalence: 1, observedFileCount: 15, observedFileUnit: 'files',
      observedByteCount: 1750, observedByteUnit: 'bytes', repositories: ['GitTeach', 'kode']
    }],
    technologies: [{
      key: 'tauri', label: 'Tauri', repositoryCount: 1, analyzedRepositoryCount: 2,
      repositoryPrevalence: 0.5, repositories: ['kode'], sourceRefs: ['tauri-ref']
    }]
  };
}

function domain(repository, key, label, ref) {
  return {
    schema: REPOSITORY_DOMAIN_FINGERPRINT_SCHEMA,
    repository,
    declaredTopics: [],
    candidates: [{
      key, label, sourceKinds: ['technology'], evidenceRefs: [ref], sourceRefs: [ref],
      technologies: ['example'], languages: [], topics: [], ruleBased: true
    }]
  };
}

function lifecycle() {
  return {
    schema: PORTFOLIO_LIFECYCLE_SCHEMA,
    analyzedRepositoryCount: 2,
    repositoryWithHistoryCount: 2,
    multiMonthHistoryRepositoryCount: 1,
    taggedRepositoryCount: 1,
    postTagMaintenanceRepositoryCount: 1,
    totalReachableTagCount: 3,
    repositories: [], deterministic: true
  };
}

function metric(observedCount, repositoryCount, repositories = [], refs = []) {
  return { observedCount, repositoryCount, repositories, evidenceRefs: refs, omittedEvidenceRefCount: 0 };
}

function collaboration() {
  return {
    schema: GITHUB_COLLABORATION_SUMMARY_SCHEMA,
    connectedLogin: 'mauro3422',
    analyzedRepositoryCount: 2,
    coverage: {
      completeBaseRepositoryCount: 2,
      partialBaseRepositoryCount: 0,
      allBaseSurfacesComplete: true,
      reviewCoverageMode: 'targeted',
      targetedReviewRepositoryCount: 1,
      completeRequestedReviewRepositoryCount: 1,
      partialRequestedReviewRepositoryCount: 0,
      requestedReviewPullCount: 1,
      queriedReviewPullCount: 1,
      omittedReviewPullCount: 0,
      reviewHistoryComplete: false
    },
    authoredReleases: metric(0, 0),
    authoredPullRequests: metric(3, 2, ['repo-a', 'repo-b'], ['pr-1', 'pr-2']),
    mergedAuthoredPullRequests: metric(2, 2, ['repo-a', 'repo-b'], ['pr-1', 'pr-2']),
    submittedReviews: metric(1, 1, ['repo-b'], ['review-1']),
    authoredIssues: metric(1, 1, ['repo-a'], ['issue-1']),
    repositories: [], deterministic: true
  };
}

function forbiddenKeys(value, path = '$') {
  const found = [];
  if (!value || typeof value !== 'object') return found;
  for (const [key, child] of Object.entries(value)) {
    if (/score|expertise|seniority/i.test(key)) found.push(`${path}.${key}`);
    found.push(...forbiddenKeys(child, `${path}.${key}`));
  }
  return found;
}

test('ProfileStatistics v1 exposes explicit semantic units instead of skill scores', () => {
  const stats = buildProfileStatistics({
    technology: technology(),
    tendencies: tendencies(),
    domainFingerprints: [
      domain('GitTeach', 'developer-tooling', 'Developer tooling', 'domain-g'),
      domain('kode', 'developer-tooling', 'Developer tooling', 'domain-k'),
      domain('kode', 'desktop-application', 'Desktop application', 'desktop-k')
    ],
    lifecycle: lifecycle(),
    collaboration: collaboration()
  });

  assert.equal(stats.technology.analyzedRepositoryCount, 2);
  assert.deepEqual(stats.technology.coverage, technology().coverage);
  assert.equal(stats.technology.languages[0].repositoryPrevalence, 1);
  assert.equal(stats.technology.languages[0].observedFileUnit, 'files');
  assert.equal(stats.technology.languages[0].observedByteUnit, 'bytes');
  assert.equal(stats.technology.technologies[0].repositoryPrevalence, 0.5);
  assert.equal(stats.schema, PROFILE_STATISTICS_SCHEMA);
  assert.deepEqual(stats.tendencies.metrics.map((item) => [item.key, item.value, item.unit]), [['automation', 1, 'repository-prevalence']]);
  assert.deepEqual(stats.domains.metrics.find((item) => item.key === 'developer-tooling'), {
    key: 'developer-tooling', label: 'Developer tooling', value: 1, unit: 'repository-prevalence',
    supportingRepositoryCount: 2, analyzedRepositoryCount: 2,
    repositories: ['GitTeach', 'kode'], sourceRefs: ['domain-g', 'domain-k']
  });
  assert.equal(stats.lifecycle.metrics.find((item) => item.key === 'reachable-git-tags').unit, 'git-tags');
  assert.equal(stats.collaboration.metrics.find((item) => item.key === 'authored-pull-requests').unit, 'events');
  assert.equal(stats.collaboration.metrics.find((item) => item.key === 'authored-pull-requests').supportingUnit, 'repositories');
  assert.deepEqual(forbiddenKeys(stats), []);
});

test('domain statistics count each repository once even when duplicate fingerprints are supplied', () => {
  const repeated = domain('kode', 'developer-tooling', 'Developer tooling', 'domain-k');
  const stats = buildProfileStatistics({ domainFingerprints: [repeated, repeated, domain('GitTeach', 'developer-tooling', 'Developer tooling', 'domain-g')] });
  const item = stats.domains.metrics[0];
  assert.equal(stats.domains.analyzedRepositoryCount, 2);
  assert.equal(item.supportingRepositoryCount, 2);
  assert.equal(item.value, 1);
});

test('collaboration coverage remains explicit and is not converted into a confidence value', () => {
  const stats = buildProfileStatistics({ collaboration: collaboration() });
  assert.equal(stats.collaboration.coverage.reviewCoverageMode, 'targeted');
  assert.equal(stats.collaboration.coverage.reviewHistoryComplete, false);
  assert.equal(Object.hasOwn(stats.collaboration, 'confidence'), false);
});

test('missing optional sources produce empty sections rather than fabricated zeros with hidden coverage', () => {
  const stats = buildProfileStatistics();
  assert.equal(stats.technology.analyzedRepositoryCount, 0);
  assert.deepEqual(stats.technology.coverage, {
    completeInventoryRepositoryCount: 0,
    partialInventoryRepositoryCount: 0,
    inventorySummaryRepositoryCount: 0,
    selectedContentSummaryRepositoryCount: 0,
    knownPathCount: 0,
    summarizedPathCount: 0
  });
  assert.deepEqual(stats.technology.languages, []);
  assert.deepEqual(stats.technology.technologies, []);
  assert.equal(stats.tendencies.analyzedRepositoryCount, 0);
  assert.deepEqual(stats.tendencies.metrics, []);
  assert.equal(stats.domains.analyzedRepositoryCount, 0);
  assert.deepEqual(stats.lifecycle.metrics, []);
  assert.equal(stats.collaboration.coverage, null);
});

test('ProfileStatistics rejects incompatible upstream contracts', () => {
  assert.throws(() => buildProfileStatistics({ technology: { schema: 'wrong', languages: [], technologies: [] } }), /giteach-technology-footprint-v1/);
  assert.throws(() => buildProfileStatistics({ tendencies: { schema: 'wrong', tendencies: [] } }), /giteach-development-tendencies-v1/);
  assert.throws(() => buildProfileStatistics({ domainFingerprints: [{ schema: 'wrong', repository: 'x', candidates: [] }] }), /giteach-repository-domain-fingerprint-v1/);
  assert.throws(() => buildProfileStatistics({ lifecycle: { schema: 'wrong' } }), /giteach-portfolio-lifecycle-v1/);
  assert.throws(() => buildProfileStatistics({ collaboration: { schema: 'wrong' } }), /giteach-github-collaboration-summary-v1/);
});

test('ProfileStatistics JS matches the shared v1 schema fixture', () => {
  const stats = buildProfileStatistics({
    technology: technology(),
    tendencies: tendencies(),
    domainFingerprints: [domain('kode', 'developer-tooling', 'Developer tooling', 'domain-k')],
    lifecycle: lifecycle(),
    collaboration: collaboration()
  });
  const schema = JSON.parse(readFileSync(new URL('../fixtures/profile-statistics-v1-schema.json', import.meta.url), 'utf8'));
  for (const field of schema.fields) assert.ok(Object.hasOwn(stats, field), `missing root field ${field}`);
  for (const field of schema.technologyFields) assert.ok(Object.hasOwn(stats.technology, field), `missing technology section field ${field}`);
  for (const field of schema.technologyCoverageFields) assert.ok(Object.hasOwn(stats.technology.coverage, field), `missing technology coverage field ${field}`);
  for (const field of schema.technologyLanguageFields) assert.ok(Object.hasOwn(stats.technology.languages[0], field), `missing technology language field ${field}`);
  for (const field of schema.technologyMetricFields) assert.ok(Object.hasOwn(stats.technology.technologies[0], field), `missing technology metric field ${field}`);
  for (const field of schema.sectionFields) assert.ok(Object.hasOwn(stats.tendencies, field), `missing tendency section field ${field}`);
  for (const field of schema.tendencyMetricFields) assert.ok(Object.hasOwn(stats.tendencies.metrics[0], field), `missing tendency metric field ${field}`);
  for (const field of schema.domainMetricFields) assert.ok(Object.hasOwn(stats.domains.metrics[0], field), `missing domain metric field ${field}`);
  for (const field of schema.lifecycleMetricFields) assert.ok(Object.hasOwn(stats.lifecycle.metrics[0], field), `missing lifecycle metric field ${field}`);
  for (const field of schema.collaborationFields) assert.ok(Object.hasOwn(stats.collaboration, field), `missing collaboration field ${field}`);
  for (const field of schema.collaborationMetricFields) assert.ok(Object.hasOwn(stats.collaboration.metrics[0], field), `missing collaboration metric field ${field}`);
});
