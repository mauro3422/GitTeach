import { GITHUB_REPOSITORY_FACTS_SCHEMA } from './GitHubRepositoryFacts.js';

export const GITHUB_COLLABORATION_SUMMARY_SCHEMA = 'giteach-github-collaboration-summary-v1';

function requiredString(value, field) {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw new Error(`${field} is required.`);
  return normalized;
}

function nonNegativeInteger(value, field) {
  if (!Number.isInteger(value) || value < 0) throw new Error(`${field} must be an integer >= 0.`);
  return value;
}

function positiveInteger(value, field, fallback) {
  const resolved = value ?? fallback;
  if (!Number.isInteger(resolved) || resolved < 1) throw new Error(`${field} must be an integer >= 1.`);
  return resolved;
}

function sameLogin(left, right) {
  return Boolean(left && right && String(left).toLowerCase() === String(right).toLowerCase());
}

function normalizeCoverage(input) {
  const coverage = input?.coverage ?? input?.collection;
  if (!coverage || typeof coverage !== 'object') {
    throw new Error('GitHub collaboration observations require collection coverage.');
  }
  if (typeof coverage.baseSurfacesComplete !== 'boolean') {
    throw new Error('coverage.baseSurfacesComplete must be a boolean.');
  }
  const reviews = coverage.reviews;
  if (!reviews || typeof reviews !== 'object') {
    throw new Error('coverage.reviews is required.');
  }
  const mode = requiredString(reviews.mode, 'coverage.reviews.mode');
  if (mode !== 'targeted') throw new Error(`Unsupported GitHub review coverage mode: ${mode}`);

  const requestedPullCount = nonNegativeInteger(reviews.requestedPullCount, 'coverage.reviews.requestedPullCount');
  const queriedPullCount = nonNegativeInteger(reviews.queriedPullCount, 'coverage.reviews.queriedPullCount');
  const omittedPullCount = nonNegativeInteger(reviews.omittedPullCount, 'coverage.reviews.omittedPullCount');
  if (queriedPullCount > requestedPullCount) {
    throw new Error('coverage.reviews.queriedPullCount cannot exceed requestedPullCount.');
  }
  if (requestedPullCount - queriedPullCount !== omittedPullCount) {
    throw new Error('coverage.reviews.omittedPullCount must equal requestedPullCount - queriedPullCount.');
  }
  if (typeof reviews.truncated !== 'boolean') {
    throw new Error('coverage.reviews.truncated must be a boolean.');
  }

  return Object.freeze({
    baseSurfacesComplete: coverage.baseSurfacesComplete,
    reviews: Object.freeze({
      mode,
      requestedPullCount,
      queriedPullCount,
      omittedPullCount,
      truncated: reviews.truncated
    })
  });
}

function normalizeObservation(input, connectedLogin) {
  const bundle = input?.facts;
  if (bundle?.schema !== GITHUB_REPOSITORY_FACTS_SCHEMA) {
    throw new Error(`Expected ${GITHUB_REPOSITORY_FACTS_SCHEMA} facts.`);
  }
  const repository = requiredString(bundle.repository?.fullName, 'facts.repository.fullName');
  const bundleLogin = requiredString(bundle.connectedLogin, 'facts.connectedLogin');
  if (!sameLogin(bundleLogin, connectedLogin)) {
    throw new Error(`GitHub collaboration observation login mismatch for ${repository}.`);
  }
  if (!Array.isArray(bundle.facts)) throw new Error('facts.facts must be an array.');

  return Object.freeze({
    repository,
    bundle,
    coverage: normalizeCoverage(input)
  });
}

function isSubmittedReview(fact) {
  if (fact.kind !== 'review') return false;
  const state = String(fact.state ?? '').toUpperCase();
  return state !== 'PENDING' && Boolean(fact.createdAt);
}

function matchingFacts(observation, connectedLogin, predicate) {
  return observation.bundle.facts.filter((fact) => sameLogin(fact.actorLogin, connectedLogin) && predicate(fact));
}

function metric(repositories, selector, maxEvidenceRefs) {
  const support = [];
  for (const observation of repositories) {
    const facts = selector(observation);
    if (facts.length === 0) continue;
    support.push({ repository: observation.repository, facts });
  }

  const refs = support
    .flatMap((item) => item.facts.map((fact) => fact.factRef))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
  const observedCount = support.reduce((sum, item) => sum + item.facts.length, 0);
  const evidenceRefs = refs.slice(0, maxEvidenceRefs);

  return Object.freeze({
    observedCount,
    repositoryCount: support.length,
    repositories: Object.freeze(support.map((item) => item.repository)),
    evidenceRefs: Object.freeze(evidenceRefs),
    omittedEvidenceRefCount: Math.max(0, refs.length - evidenceRefs.length)
  });
}

export function summarizeGitHubCollaboration({
  observations = [],
  connectedLogin,
  maxEvidenceRefsPerMetric = 50
} = {}) {
  if (!Array.isArray(observations)) throw new Error('observations must be an array.');
  const login = requiredString(connectedLogin, 'connectedLogin');
  const evidenceLimit = positiveInteger(maxEvidenceRefsPerMetric, 'maxEvidenceRefsPerMetric', 50);

  const repositoryMap = new Map();
  for (const input of observations) {
    const observation = normalizeObservation(input, login);
    if (!repositoryMap.has(observation.repository)) repositoryMap.set(observation.repository, observation);
  }
  const repositories = [...repositoryMap.values()].sort((a, b) => a.repository.localeCompare(b.repository));

  const repositoryFacts = repositories.map((observation) => {
    const authoredReleases = matchingFacts(observation, login, (fact) => fact.kind === 'release');
    const authoredPullRequests = matchingFacts(observation, login, (fact) => fact.kind === 'pull-request');
    const mergedAuthoredPullRequests = authoredPullRequests.filter((fact) => Boolean(fact.mergedAt));
    const submittedReviews = matchingFacts(observation, login, isSubmittedReview);
    const authoredIssues = matchingFacts(observation, login, (fact) => fact.kind === 'issue');
    const requested = observation.coverage.reviews.requestedPullCount > 0;
    const completeForRequestedPulls = requested
      && !observation.coverage.reviews.truncated
      && observation.coverage.reviews.omittedPullCount === 0;

    return Object.freeze({
      repository: observation.repository,
      baseCoverageComplete: observation.coverage.baseSurfacesComplete,
      reviewCoverageRequested: requested,
      reviewCoverageCompleteForRequestedPulls: completeForRequestedPulls,
      requestedReviewPullCount: observation.coverage.reviews.requestedPullCount,
      queriedReviewPullCount: observation.coverage.reviews.queriedPullCount,
      omittedReviewPullCount: observation.coverage.reviews.omittedPullCount,
      reviewCoverageTruncated: observation.coverage.reviews.truncated,
      authoredReleaseCount: authoredReleases.length,
      authoredPullRequestCount: authoredPullRequests.length,
      mergedAuthoredPullRequestCount: mergedAuthoredPullRequests.length,
      submittedReviewCount: submittedReviews.length,
      authoredIssueCount: authoredIssues.length
    });
  });

  const targeted = repositoryFacts.filter((item) => item.reviewCoverageRequested);
  const completeTargeted = targeted.filter((item) => item.reviewCoverageCompleteForRequestedPulls);

  return Object.freeze({
    schema: GITHUB_COLLABORATION_SUMMARY_SCHEMA,
    connectedLogin: login,
    analyzedRepositoryCount: repositories.length,
    coverage: Object.freeze({
      completeBaseRepositoryCount: repositoryFacts.filter((item) => item.baseCoverageComplete).length,
      partialBaseRepositoryCount: repositoryFacts.filter((item) => !item.baseCoverageComplete).length,
      allBaseSurfacesComplete: repositoryFacts.every((item) => item.baseCoverageComplete),
      reviewCoverageMode: 'targeted',
      targetedReviewRepositoryCount: targeted.length,
      completeRequestedReviewRepositoryCount: completeTargeted.length,
      partialRequestedReviewRepositoryCount: targeted.length - completeTargeted.length,
      requestedReviewPullCount: repositoryFacts.reduce((sum, item) => sum + item.requestedReviewPullCount, 0),
      queriedReviewPullCount: repositoryFacts.reduce((sum, item) => sum + item.queriedReviewPullCount, 0),
      omittedReviewPullCount: repositoryFacts.reduce((sum, item) => sum + item.omittedReviewPullCount, 0),
      reviewHistoryComplete: false
    }),
    authoredReleases: metric(
      repositories,
      (observation) => matchingFacts(observation, login, (fact) => fact.kind === 'release'),
      evidenceLimit
    ),
    authoredPullRequests: metric(
      repositories,
      (observation) => matchingFacts(observation, login, (fact) => fact.kind === 'pull-request'),
      evidenceLimit
    ),
    mergedAuthoredPullRequests: metric(
      repositories,
      (observation) => matchingFacts(observation, login, (fact) => fact.kind === 'pull-request' && Boolean(fact.mergedAt)),
      evidenceLimit
    ),
    submittedReviews: metric(
      repositories,
      (observation) => matchingFacts(observation, login, isSubmittedReview),
      evidenceLimit
    ),
    authoredIssues: metric(
      repositories,
      (observation) => matchingFacts(observation, login, (fact) => fact.kind === 'issue'),
      evidenceLimit
    ),
    repositories: Object.freeze(repositoryFacts),
    deterministic: true
  });
}
