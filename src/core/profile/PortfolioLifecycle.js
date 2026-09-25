import { REPOSITORY_LIFECYCLE_SCHEMA } from './RepositoryLifecycle.js';

export const PORTFOLIO_LIFECYCLE_SCHEMA = 'giteach-portfolio-lifecycle-v1';

function assertLifecycle(lifecycle) {
  if (lifecycle?.schema !== REPOSITORY_LIFECYCLE_SCHEMA) {
    throw new Error(`Unsupported repository lifecycle schema: ${lifecycle?.schema ?? 'missing'}`);
  }
  if (!String(lifecycle.repository ?? '').trim()) {
    throw new Error('Portfolio lifecycle requires named repositories.');
  }
}

export function summarizePortfolioLifecycle({ lifecycles = [] } = {}) {
  const repositories = new Map();

  for (const lifecycle of lifecycles) {
    assertLifecycle(lifecycle);
    const repository = String(lifecycle.repository).trim();
    if (!repositories.has(repository)) repositories.set(repository, lifecycle);
  }

  const facts = [...repositories.entries()]
    .map(([repository, lifecycle]) => ({
      repository,
      commitCount: lifecycle.commitCount,
      activeMonthCount: lifecycle.activeMonthCount,
      activeYearCount: lifecycle.activeYearCount,
      tagCount: lifecycle.tagCount,
      hasPostTagCommits: lifecycle.hasPostTagCommits
    }))
    .sort((a, b) => a.repository.localeCompare(b.repository));

  return {
    schema: PORTFOLIO_LIFECYCLE_SCHEMA,
    analyzedRepositoryCount: facts.length,
    repositoryWithHistoryCount: facts.filter((item) => item.commitCount > 0).length,
    multiMonthHistoryRepositoryCount: facts.filter((item) => item.activeMonthCount >= 2).length,
    taggedRepositoryCount: facts.filter((item) => item.tagCount > 0).length,
    postTagMaintenanceRepositoryCount: facts.filter((item) => item.hasPostTagCommits === true).length,
    totalReachableTagCount: facts.reduce((sum, item) => sum + item.tagCount, 0),
    repositories: facts,
    deterministic: true
  };
}
