export const REPOSITORY_LIFECYCLE_SCHEMA = 'giteach-repository-lifecycle-v1';

function normalizeTimestamp(value) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

function normalizeCommits(commits = []) {
  return commits
    .map((commit) => ({
      id: String(commit?.id ?? '').trim(),
      committedAt: normalizeTimestamp(commit?.committedAt)
    }))
    .filter((commit) => commit.id && commit.committedAt)
    .sort((a, b) => a.committedAt.localeCompare(b.committedAt) || a.id.localeCompare(b.id));
}

function normalizeTags(tags = []) {
  return tags
    .map((tag) => ({
      name: String(tag?.name ?? '').trim(),
      target: String(tag?.target ?? '').trim(),
      observedAt: normalizeTimestamp(tag?.observedAt)
    }))
    .filter((tag) => tag.name && tag.target && tag.observedAt)
    .sort((a, b) => a.observedAt.localeCompare(b.observedAt) || a.name.localeCompare(b.name));
}

export function analyzeRepositoryLifecycle({
  repository,
  commits = [],
  tags = [],
  commitsAfterLatestTag = null
} = {}) {
  const repositoryName = String(repository ?? '').trim();
  if (!repositoryName) throw new Error('Repository lifecycle requires a repository name.');
  if (commitsAfterLatestTag !== null && (!Number.isInteger(commitsAfterLatestTag) || commitsAfterLatestTag < 0)) {
    throw new Error('commitsAfterLatestTag must be null or an integer >= 0.');
  }

  const normalizedCommits = normalizeCommits(commits);
  const normalizedTags = normalizeTags(tags);
  const activeMonths = new Set(normalizedCommits.map((commit) => commit.committedAt.slice(0, 7)));
  const activeYears = new Set(normalizedCommits.map((commit) => commit.committedAt.slice(0, 4)));
  const firstTag = normalizedTags[0] ?? null;
  const latestTag = normalizedTags.at(-1) ?? null;
  const postTagCommitCount = latestTag ? commitsAfterLatestTag : null;

  return {
    schema: REPOSITORY_LIFECYCLE_SCHEMA,
    repository: repositoryName,
    source: 'git-local',
    commitCount: normalizedCommits.length,
    firstCommitAt: normalizedCommits[0]?.committedAt ?? null,
    latestCommitAt: normalizedCommits.at(-1)?.committedAt ?? null,
    activeMonthCount: activeMonths.size,
    activeYearCount: activeYears.size,
    tagCount: normalizedTags.length,
    firstTag,
    latestTag,
    commitsAfterLatestTag: postTagCommitCount,
    hasPostTagCommits: postTagCommitCount === null ? null : postTagCommitCount > 0,
    deterministic: true
  };
}
