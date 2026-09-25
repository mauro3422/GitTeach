export const GITHUB_REPOSITORY_FACTS_SCHEMA = 'giteach-github-repository-facts-v1';

const FACT_KINDS = new Set(['release', 'pull-request', 'review', 'issue']);

function requireString(value, field) {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw new Error(`${field} is required.`);
  return normalized;
}

function optionalString(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeRepository(repository) {
  const owner = requireString(repository?.owner, 'repository.owner');
  const name = requireString(repository?.name, 'repository.name');
  return Object.freeze({ owner, name, fullName: `${owner}/${name}` });
}

function normalizeFact(repository, input) {
  const kind = requireString(input?.kind, 'fact.kind');
  if (!FACT_KINDS.has(kind)) throw new Error(`Unsupported GitHub fact kind: ${kind}`);
  const sourceId = requireString(input?.sourceId, 'fact.sourceId');
  const factRef = `github:${repository.fullName}:${kind}:${sourceId}`;

  return Object.freeze({
    factRef,
    kind,
    sourceId,
    number: input?.number == null ? null : Number(input.number),
    tagName: optionalString(input?.tagName),
    state: optionalString(input?.state),
    actorLogin: optionalString(input?.actorLogin),
    createdAt: optionalString(input?.createdAt),
    updatedAt: optionalString(input?.updatedAt),
    closedAt: optionalString(input?.closedAt),
    mergedAt: optionalString(input?.mergedAt),
    publishedAt: optionalString(input?.publishedAt),
    draft: input?.draft == null ? null : Boolean(input.draft),
    prerelease: input?.prerelease == null ? null : Boolean(input.prerelease),
    sourceRef: optionalString(input?.sourceRef),
    metadata: Object.freeze({ ...(input?.metadata ?? {}) })
  });
}

function sameLogin(left, right) {
  return left && right && left.localeCompare(right, undefined, { sensitivity: 'accent' }) === 0;
}

function isSubmittedReview(fact) {
  const state = String(fact?.state ?? '').toUpperCase();
  return state !== 'PENDING' && Boolean(fact?.createdAt);
}

export function createGitHubRepositoryFacts({ repository, connectedLogin = null, observedAt = null, facts = [] } = {}) {
  const normalizedRepository = normalizeRepository(repository);
  const normalizedConnectedLogin = optionalString(connectedLogin);
  const normalizedFacts = facts.map((fact) => normalizeFact(normalizedRepository, fact));
  const refs = new Set();
  for (const fact of normalizedFacts) {
    if (refs.has(fact.factRef)) throw new Error(`Duplicate GitHub fact: ${fact.factRef}`);
    refs.add(fact.factRef);
  }

  const releases = normalizedFacts.filter((fact) => fact.kind === 'release');
  const pullRequests = normalizedFacts.filter((fact) => fact.kind === 'pull-request');
  const reviews = normalizedFacts.filter((fact) => fact.kind === 'review');
  const issues = normalizedFacts.filter((fact) => fact.kind === 'issue');

  const connectedActorActivity = normalizedConnectedLogin ? Object.freeze({
    login: normalizedConnectedLogin,
    authoredReleaseCount: releases.filter((fact) => sameLogin(fact.actorLogin, normalizedConnectedLogin)).length,
    authoredPullRequestCount: pullRequests.filter((fact) => sameLogin(fact.actorLogin, normalizedConnectedLogin)).length,
    submittedReviewCount: reviews.filter((fact) => sameLogin(fact.actorLogin, normalizedConnectedLogin) && isSubmittedReview(fact)).length,
    authoredIssueCount: issues.filter((fact) => sameLogin(fact.actorLogin, normalizedConnectedLogin)).length
  }) : null;

  return Object.freeze({
    schema: GITHUB_REPOSITORY_FACTS_SCHEMA,
    repository: normalizedRepository,
    connectedLogin: normalizedConnectedLogin,
    observedAt: observedAt ?? new Date().toISOString(),
    facts: Object.freeze(normalizedFacts),
    summary: Object.freeze({
      releaseCount: releases.length,
      publishedReleaseCount: releases.filter((fact) => fact.draft !== true).length,
      pullRequestCount: pullRequests.length,
      mergedPullRequestCount: pullRequests.filter((fact) => Boolean(fact.mergedAt)).length,
      reviewCount: reviews.length,
      issueCount: issues.length,
      closedIssueCount: issues.filter((fact) => fact.state === 'closed' || Boolean(fact.closedAt)).length
    }),
    connectedActorActivity,
    deterministic: true
  });
}
