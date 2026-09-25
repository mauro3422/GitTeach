import { createGitHubRepositoryFacts } from '../github/GitHubRepositoryFacts.js';

function parsePullNumber(value) {
  if (Number.isInteger(value) && value > 0) return value;
  const match = String(value ?? '').match(/\/pulls\/(\d+)(?:\/|$)/);
  return match ? Number(match[1]) : null;
}

function sourceId(value, field) {
  if (value === null || value === undefined || String(value).trim() === '') {
    throw new Error(`GitHub REST ${field} is required.`);
  }
  return String(value);
}

function releaseFact(release) {
  return {
    kind: 'release',
    sourceId: sourceId(release?.id, 'release.id'),
    tagName: release?.tag_name ?? null,
    state: release?.draft ? 'draft' : release?.prerelease ? 'prerelease' : 'published',
    actorLogin: release?.author?.login ?? null,
    createdAt: release?.created_at ?? null,
    publishedAt: release?.published_at ?? null,
    draft: release?.draft ?? false,
    prerelease: release?.prerelease ?? false,
    sourceRef: release?.html_url ?? release?.url ?? null,
    metadata: {
      targetCommitish: release?.target_commitish ?? null
    }
  };
}

function pullRequestFact(pull) {
  return {
    kind: 'pull-request',
    sourceId: sourceId(pull?.id, 'pullRequest.id'),
    number: pull?.number ?? null,
    state: pull?.state ?? null,
    actorLogin: pull?.user?.login ?? null,
    createdAt: pull?.created_at ?? null,
    updatedAt: pull?.updated_at ?? null,
    closedAt: pull?.closed_at ?? null,
    mergedAt: pull?.merged_at ?? null,
    draft: pull?.draft ?? false,
    sourceRef: pull?.html_url ?? pull?.url ?? null,
    metadata: {
      headRef: pull?.head?.ref ?? null,
      baseRef: pull?.base?.ref ?? null
    }
  };
}

function reviewFact(entry) {
  const review = entry?.review ?? entry;
  const pullNumber = parsePullNumber(entry?.pullNumber ?? review?.pull_request_url);
  if (!pullNumber) throw new Error('GitHub REST review requires pullNumber or pull_request_url.');

  return {
    kind: 'review',
    sourceId: sourceId(review?.id, 'review.id'),
    number: pullNumber,
    state: review?.state ?? null,
    actorLogin: review?.user?.login ?? null,
    createdAt: review?.submitted_at ?? null,
    sourceRef: review?.html_url ?? review?.url ?? null,
    metadata: {
      commitId: review?.commit_id ?? null,
      authorAssociation: review?.author_association ?? null
    }
  };
}

function issueFact(issue) {
  return {
    kind: 'issue',
    sourceId: sourceId(issue?.id, 'issue.id'),
    number: issue?.number ?? null,
    state: issue?.state ?? null,
    actorLogin: issue?.user?.login ?? null,
    createdAt: issue?.created_at ?? null,
    updatedAt: issue?.updated_at ?? null,
    closedAt: issue?.closed_at ?? null,
    sourceRef: issue?.html_url ?? issue?.url ?? null,
    metadata: {
      stateReason: issue?.state_reason ?? null
    }
  };
}

export function githubRestPayloadToRepositoryFacts({
  repository,
  connectedLogin = null,
  observedAt = null,
  releases = [],
  pullRequests = [],
  reviews = [],
  issues = []
} = {}) {
  for (const [name, value] of Object.entries({ releases, pullRequests, reviews, issues })) {
    if (!Array.isArray(value)) throw new Error(`GitHub REST ${name} must be an array.`);
  }

  const facts = [
    ...releases.map(releaseFact),
    ...pullRequests.map(pullRequestFact),
    ...reviews.map(reviewFact),
    // GitHub's Issues REST endpoints can also return pull requests. Those are
    // represented by the dedicated pull-request facts above, so exclude them here.
    ...issues.filter((issue) => !issue?.pull_request).map(issueFact)
  ];

  return createGitHubRepositoryFacts({ repository, connectedLogin, observedAt, facts });
}
