import { githubRestPayloadToRepositoryFacts } from './GitHubRestFactsAdapter.js';

export const GITHUB_REPOSITORY_COLLECTION_SCHEMA = 'giteach-github-repository-collection-v1';

function positiveInteger(value, field, fallback) {
  const resolved = value ?? fallback;
  if (!Number.isInteger(resolved) || resolved < 1) throw new Error(`${field} must be an integer >= 1.`);
  return resolved;
}

function repositoryPart(value, field) {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw new Error(`${field} is required.`);
  return normalized;
}

function uniquePullNumbers(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const number = Number(value);
    if (!Number.isInteger(number) || number < 1) throw new Error('reviewPullNumbers must contain positive integers.');
    if (seen.has(number)) continue;
    seen.add(number);
    result.push(number);
  }
  return result;
}

function coverage(result) {
  return Object.freeze({
    itemCount: result.items.length,
    pagesFetched: result.pagesFetched,
    truncated: result.truncated,
    completeWithinRequestedSurface: !result.truncated
  });
}

export class GitHubRepositoryFactsCollector {
  #client;
  #maxPagesPerSurface;
  #maxItemsPerSurface;
  #maxReviewPulls;
  #now;

  constructor({
    client,
    maxPagesPerSurface = 5,
    maxItemsPerSurface = 500,
    maxReviewPulls = 20,
    now = () => new Date().toISOString()
  } = {}) {
    const requiredMethods = ['listReleases', 'listPullRequests', 'listIssues', 'listPullRequestReviews'];
    if (!client || requiredMethods.some((method) => typeof client[method] !== 'function')) {
      throw new Error('GitHubRepositoryFactsCollector requires a compatible read-only GitHub client.');
    }
    if (typeof now !== 'function') throw new Error('now must be a function.');
    this.#client = client;
    this.#maxPagesPerSurface = positiveInteger(maxPagesPerSurface, 'maxPagesPerSurface', 5);
    this.#maxItemsPerSurface = positiveInteger(maxItemsPerSurface, 'maxItemsPerSurface', 500);
    this.#maxReviewPulls = positiveInteger(maxReviewPulls, 'maxReviewPulls', 20);
    this.#now = now;
  }

  #pageOptions() {
    return {
      maxPages: this.#maxPagesPerSurface,
      maxItems: this.#maxItemsPerSurface,
      useCache: true
    };
  }

  async collect({ owner, repo, connectedLogin = null, reviewPullNumbers = [] } = {}) {
    const repositoryOwner = repositoryPart(owner, 'owner');
    const repositoryName = repositoryPart(repo, 'repo');
    const requestedReviewPulls = uniquePullNumbers(reviewPullNumbers);
    const queriedReviewPulls = requestedReviewPulls.slice(0, this.#maxReviewPulls);

    // Keep these awaits intentionally serial even though GitHubRestClient also
    // serializes requests. The collector must not reintroduce burst concurrency.
    const releases = await this.#client.listReleases(repositoryOwner, repositoryName, this.#pageOptions());
    const pullRequests = await this.#client.listPullRequests(repositoryOwner, repositoryName, this.#pageOptions());
    const issues = await this.#client.listIssues(repositoryOwner, repositoryName, this.#pageOptions());

    const reviews = [];
    const reviewCoverage = [];
    for (const pullNumber of queriedReviewPulls) {
      const result = await this.#client.listPullRequestReviews(
        repositoryOwner,
        repositoryName,
        pullNumber,
        this.#pageOptions()
      );
      reviewCoverage.push(Object.freeze({ pullNumber, ...coverage(result) }));
      reviews.push(...result.items.map((review) => ({ pullNumber, review })));
    }

    const observedAt = this.#now();
    const facts = githubRestPayloadToRepositoryFacts({
      repository: { owner: repositoryOwner, name: repositoryName },
      connectedLogin,
      observedAt,
      releases: releases.items,
      pullRequests: pullRequests.items,
      reviews,
      issues: issues.items
    });

    const baseCoverage = Object.freeze({
      releases: coverage(releases),
      pullRequests: coverage(pullRequests),
      issues: coverage(issues)
    });
    const baseSurfacesComplete = Object.values(baseCoverage)
      .every((surface) => surface.completeWithinRequestedSurface);

    return Object.freeze({
      schema: GITHUB_REPOSITORY_COLLECTION_SCHEMA,
      facts,
      collection: Object.freeze({
        observedAt,
        baseSurfacesComplete,
        base: baseCoverage,
        reviews: Object.freeze({
          mode: 'targeted',
          requestedPullCount: requestedReviewPulls.length,
          queriedPullCount: queriedReviewPulls.length,
          omittedPullCount: requestedReviewPulls.length - queriedReviewPulls.length,
          queriedPullNumbers: Object.freeze([...queriedReviewPulls]),
          itemCount: reviews.length,
          truncated: requestedReviewPulls.length > queriedReviewPulls.length
            || reviewCoverage.some((surface) => surface.truncated),
          pulls: Object.freeze(reviewCoverage)
        })
      })
    });
  }
}
