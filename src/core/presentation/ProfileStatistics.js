import { DEVELOPMENT_TENDENCIES_SCHEMA } from '../profile/DevelopmentTendencies.js';
import { REPOSITORY_DOMAIN_FINGERPRINT_SCHEMA } from '../profile/RepositoryDomainFingerprint.js';
import { PORTFOLIO_LIFECYCLE_SCHEMA } from '../profile/PortfolioLifecycle.js';
import { GITHUB_COLLABORATION_SUMMARY_SCHEMA } from '../github/GitHubCollaborationSummary.js';
import { TECHNOLOGY_FOOTPRINT_SCHEMA } from './TechnologyFootprint.js';

export const PROFILE_STATISTICS_SCHEMA = 'giteach-profile-statistics-v1';

const COLLABORATION_DEFINITIONS = Object.freeze([
  ['authored-releases', 'Authored releases', 'authoredReleases'],
  ['authored-pull-requests', 'Authored pull requests', 'authoredPullRequests'],
  ['merged-authored-pull-requests', 'Merged authored pull requests', 'mergedAuthoredPullRequests'],
  ['submitted-reviews', 'Submitted reviews', 'submittedReviews'],
  ['authored-issues', 'Authored issues', 'authoredIssues']
]);

function roundPrevalence(value) {
  return Math.round(value * 10_000) / 10_000;
}

function assertTechnology(input) {
  if (input == null) return null;
  if (input.schema !== TECHNOLOGY_FOOTPRINT_SCHEMA || !Array.isArray(input.languages) || !Array.isArray(input.technologies)) {
    throw new Error(`Expected ${TECHNOLOGY_FOOTPRINT_SCHEMA}.`);
  }
  return input;
}

function assertTendencies(input) {
  if (input == null) return null;
  if (input.schema !== DEVELOPMENT_TENDENCIES_SCHEMA || !Array.isArray(input.tendencies)) {
    throw new Error(`Expected ${DEVELOPMENT_TENDENCIES_SCHEMA}.`);
  }
  return input;
}

function assertDomainFingerprint(input) {
  if (input?.schema !== REPOSITORY_DOMAIN_FINGERPRINT_SCHEMA || !String(input.repository ?? '').trim() || !Array.isArray(input.candidates)) {
    throw new Error(`Expected ${REPOSITORY_DOMAIN_FINGERPRINT_SCHEMA}.`);
  }
  return input;
}

function assertLifecycle(input) {
  if (input == null) return null;
  if (input.schema !== PORTFOLIO_LIFECYCLE_SCHEMA) throw new Error(`Expected ${PORTFOLIO_LIFECYCLE_SCHEMA}.`);
  return input;
}

function assertCollaboration(input) {
  if (input == null) return null;
  if (input.schema !== GITHUB_COLLABORATION_SUMMARY_SCHEMA) throw new Error(`Expected ${GITHUB_COLLABORATION_SUMMARY_SCHEMA}.`);
  return input;
}

function emptyTechnologyCoverage() {
  return Object.freeze({
    completeInventoryRepositoryCount: 0,
    partialInventoryRepositoryCount: 0,
    inventorySummaryRepositoryCount: 0,
    selectedContentSummaryRepositoryCount: 0,
    knownPathCount: 0,
    summarizedPathCount: 0
  });
}

function buildTechnology(input) {
  if (!input) {
    return Object.freeze({
      analyzedRepositoryCount: 0,
      coverage: emptyTechnologyCoverage(),
      languages: Object.freeze([]),
      technologies: Object.freeze([])
    });
  }
  return Object.freeze({
    analyzedRepositoryCount: input.analyzedRepositoryCount,
    coverage: input.coverage ? Object.freeze({ ...input.coverage }) : emptyTechnologyCoverage(),
    languages: Object.freeze(input.languages.map((item) => Object.freeze({
      ...item,
      repositories: Object.freeze([...item.repositories])
    }))),
    technologies: Object.freeze(input.technologies.map((item) => Object.freeze({
      ...item,
      repositories: Object.freeze([...item.repositories]),
      sourceRefs: Object.freeze([...item.sourceRefs])
    })))
  });
}

function buildTendencies(input) {
  if (!input) return Object.freeze({ analyzedRepositoryCount: 0, metrics: Object.freeze([]) });
  return Object.freeze({
    analyzedRepositoryCount: input.analyzedRepositoryCount,
    metrics: Object.freeze(input.tendencies.map((item) => Object.freeze({
      key: item.key,
      label: item.label,
      value: item.prevalence,
      unit: 'repository-prevalence',
      supportingRepositoryCount: item.repositoryCount,
      analyzedRepositoryCount: item.analyzedRepositoryCount,
      repositories: Object.freeze([...item.repositories]),
      evidenceRefs: Object.freeze([...item.evidenceRefs])
    })))
  });
}

function buildDomains(fingerprints) {
  const byRepository = new Map();
  for (const fingerprint of fingerprints) {
    const validated = assertDomainFingerprint(fingerprint);
    const repository = String(validated.repository).trim();
    if (!byRepository.has(repository)) byRepository.set(repository, validated);
  }

  const domainMap = new Map();
  for (const [repository, fingerprint] of byRepository.entries()) {
    for (const candidate of fingerprint.candidates) {
      const current = domainMap.get(candidate.key) ?? {
        key: candidate.key,
        label: candidate.label,
        repositories: [],
        sourceRefs: []
      };
      current.repositories.push(repository);
      current.sourceRefs.push(...candidate.sourceRefs);
      domainMap.set(candidate.key, current);
    }
  }

  const analyzedRepositoryCount = byRepository.size;
  const metrics = [...domainMap.values()]
    .map((item) => {
      const repositories = [...new Set(item.repositories)].sort((a, b) => a.localeCompare(b));
      const sourceRefs = [...new Set(item.sourceRefs.filter(Boolean))].sort((a, b) => a.localeCompare(b));
      return Object.freeze({
        key: item.key,
        label: item.label,
        value: analyzedRepositoryCount === 0 ? 0 : roundPrevalence(repositories.length / analyzedRepositoryCount),
        unit: 'repository-prevalence',
        supportingRepositoryCount: repositories.length,
        analyzedRepositoryCount,
        repositories: Object.freeze(repositories),
        sourceRefs: Object.freeze(sourceRefs)
      });
    })
    .sort((a, b) => b.supportingRepositoryCount - a.supportingRepositoryCount || a.label.localeCompare(b.label));

  return Object.freeze({ analyzedRepositoryCount, metrics: Object.freeze(metrics) });
}

function lifecycleMetric(key, label, value, unit) {
  return Object.freeze({ key, label, value, unit });
}

function buildLifecycle(input) {
  if (!input) return Object.freeze({ analyzedRepositoryCount: 0, metrics: Object.freeze([]) });
  return Object.freeze({
    analyzedRepositoryCount: input.analyzedRepositoryCount,
    metrics: Object.freeze([
      lifecycleMetric('repositories-with-history', 'Repositories with Git history', input.repositoryWithHistoryCount, 'repositories'),
      lifecycleMetric('multi-month-history-repositories', 'Repositories with multi-month history', input.multiMonthHistoryRepositoryCount, 'repositories'),
      lifecycleMetric('tagged-repositories', 'Repositories with reachable Git tags', input.taggedRepositoryCount, 'repositories'),
      lifecycleMetric('post-tag-maintenance-repositories', 'Repositories with post-tag work', input.postTagMaintenanceRepositoryCount, 'repositories'),
      lifecycleMetric('reachable-git-tags', 'Reachable Git tags', input.totalReachableTagCount, 'git-tags')
    ])
  });
}

function collaborationMetric(key, label, metric) {
  return Object.freeze({
    key,
    label,
    value: metric.observedCount,
    unit: 'events',
    supportingRepositoryCount: metric.repositoryCount,
    supportingUnit: 'repositories',
    repositories: Object.freeze([...metric.repositories]),
    evidenceRefs: Object.freeze([...metric.evidenceRefs]),
    omittedEvidenceRefCount: metric.omittedEvidenceRefCount
  });
}

function buildCollaboration(input) {
  if (!input) return Object.freeze({ analyzedRepositoryCount: 0, coverage: null, metrics: Object.freeze([]) });
  const metrics = COLLABORATION_DEFINITIONS.map(([key, label, field]) => collaborationMetric(key, label, input[field]));
  return Object.freeze({
    analyzedRepositoryCount: input.analyzedRepositoryCount,
    coverage: Object.freeze({ ...input.coverage }),
    metrics: Object.freeze(metrics)
  });
}

export function buildProfileStatistics({
  technology = null,
  tendencies = null,
  domainFingerprints = [],
  lifecycle = null,
  collaboration = null
} = {}) {
  if (!Array.isArray(domainFingerprints)) throw new Error('domainFingerprints must be an array.');

  const validatedTechnology = assertTechnology(technology);
  const validatedTendencies = assertTendencies(tendencies);
  const validatedLifecycle = assertLifecycle(lifecycle);
  const validatedCollaboration = assertCollaboration(collaboration);

  return Object.freeze({
    schema: PROFILE_STATISTICS_SCHEMA,
    technology: buildTechnology(validatedTechnology),
    tendencies: buildTendencies(validatedTendencies),
    domains: buildDomains(domainFingerprints),
    lifecycle: buildLifecycle(validatedLifecycle),
    collaboration: buildCollaboration(validatedCollaboration)
  });
}
