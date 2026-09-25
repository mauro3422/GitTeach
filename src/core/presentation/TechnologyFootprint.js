import { REPO_EVIDENCE_SCHEMA } from '../evidence/RepoEvidenceAdapter.js';

export const TECHNOLOGY_FOOTPRINT_SCHEMA = 'giteach-technology-footprint-v1';

function normalizeKey(value) {
  return String(value ?? '').trim().toLowerCase();
}

function roundPrevalence(value) {
  return Math.round(value * 10_000) / 10_000;
}

function assertBundle(bundle) {
  if (!bundle || bundle.schema !== REPO_EVIDENCE_SCHEMA || !String(bundle.repository?.name ?? '').trim()) {
    throw new Error(`Expected ${REPO_EVIDENCE_SCHEMA} bundle with repository.name.`);
  }
  if (!Array.isArray(bundle.languages) || !Array.isArray(bundle.technologies) || !Array.isArray(bundle.evidence)) {
    throw new Error('Repo evidence bundle requires languages[], technologies[] and evidence[].');
  }
  return bundle;
}

function coverageForBundle(bundle) {
  const coverage = bundle.coverage ?? {};
  return {
    inventory: coverage.inventory === 'complete-policy-filtered' ? 'complete-policy-filtered' : 'partial',
    summaryScope: coverage.summary_scope === 'inventory' ? 'inventory' : 'selected-content',
    knownPathCount: Number(coverage.known_path_count ?? 0),
    summarizedPathCount: Number(bundle.summary?.files_scanned ?? 0)
  };
}

export function analyzeTechnologyFootprint({ bundles = [] } = {}) {
  if (!Array.isArray(bundles)) throw new Error('bundles must be an array.');

  const byRepository = new Map();
  for (const bundle of bundles) {
    const validated = assertBundle(bundle);
    const repository = String(validated.repository.name).trim();
    if (!byRepository.has(repository)) byRepository.set(repository, validated);
  }
  const analyzedRepositoryCount = byRepository.size;
  const coverage = {
    completeInventoryRepositoryCount: 0,
    partialInventoryRepositoryCount: 0,
    inventorySummaryRepositoryCount: 0,
    selectedContentSummaryRepositoryCount: 0,
    knownPathCount: 0,
    summarizedPathCount: 0
  };
  for (const bundle of byRepository.values()) {
    const repositoryCoverage = coverageForBundle(bundle);
    if (repositoryCoverage.inventory === 'complete-policy-filtered') coverage.completeInventoryRepositoryCount += 1;
    else coverage.partialInventoryRepositoryCount += 1;
    if (repositoryCoverage.summaryScope === 'inventory') coverage.inventorySummaryRepositoryCount += 1;
    else coverage.selectedContentSummaryRepositoryCount += 1;
    coverage.knownPathCount += repositoryCoverage.knownPathCount;
    coverage.summarizedPathCount += repositoryCoverage.summarizedPathCount;
  }
  const languages = new Map();
  const technologies = new Map();

  for (const [repository, bundle] of byRepository.entries()) {
    for (const language of bundle.languages) {
      const key = normalizeKey(language.language);
      if (!key) continue;
      const current = languages.get(key) ?? {
        key,
        label: String(language.language).trim(),
        repositories: new Set(),
        observedFileCount: 0,
        observedByteCount: 0
      };
      current.repositories.add(repository);
      current.observedFileCount += Number(language.files ?? 0);
      current.observedByteCount += Number(language.bytes ?? 0);
      languages.set(key, current);
    }

    for (const technology of bundle.technologies) {
      const key = normalizeKey(technology.name);
      if (!key) continue;
      const current = technologies.get(key) ?? {
        key,
        label: String(technology.name).trim(),
        repositories: new Set(),
        sourceRefs: new Set()
      };
      current.repositories.add(repository);
      const path = String(technology.source_path ?? '').trim();
      const matchingEvidence = bundle.evidence.find((record) => record.path === path);
      if (matchingEvidence?.id) current.sourceRefs.add(matchingEvidence.id);
      else if (path) current.sourceRefs.add(`${repository}:${path}`);
      technologies.set(key, current);
    }
  }

  const languageMetrics = [...languages.values()]
    .map((item) => {
      const repositories = [...item.repositories].sort((a, b) => a.localeCompare(b));
      return Object.freeze({
        key: item.key,
        label: item.label,
        repositoryCount: repositories.length,
        analyzedRepositoryCount,
        repositoryPrevalence: analyzedRepositoryCount === 0 ? 0 : roundPrevalence(repositories.length / analyzedRepositoryCount),
        observedFileCount: item.observedFileCount,
        observedFileUnit: 'files',
        observedByteCount: item.observedByteCount,
        observedByteUnit: 'bytes',
        repositories: Object.freeze(repositories)
      });
    })
    .sort((a, b) => b.repositoryCount - a.repositoryCount || b.observedFileCount - a.observedFileCount || a.label.localeCompare(b.label));

  const technologyMetrics = [...technologies.values()]
    .map((item) => {
      const repositories = [...item.repositories].sort((a, b) => a.localeCompare(b));
      return Object.freeze({
        key: item.key,
        label: item.label,
        repositoryCount: repositories.length,
        analyzedRepositoryCount,
        repositoryPrevalence: analyzedRepositoryCount === 0 ? 0 : roundPrevalence(repositories.length / analyzedRepositoryCount),
        repositories: Object.freeze(repositories),
        sourceRefs: Object.freeze([...item.sourceRefs].sort((a, b) => a.localeCompare(b)))
      });
    })
    .sort((a, b) => b.repositoryCount - a.repositoryCount || a.label.localeCompare(b.label));

  return Object.freeze({
    schema: TECHNOLOGY_FOOTPRINT_SCHEMA,
    analyzedRepositoryCount,
    coverage: Object.freeze({ ...coverage }),
    languages: Object.freeze(languageMetrics),
    technologies: Object.freeze(technologyMetrics)
  });
}
