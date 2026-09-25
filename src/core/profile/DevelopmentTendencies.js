export const DEVELOPMENT_TENDENCIES_SCHEMA = 'giteach-development-tendencies-v1';

const DEFINITIONS = Object.freeze([
  {
    key: 'testing-verification',
    label: 'Testing / verification',
    matches: (record) => record.kind === 'test'
  },
  {
    key: 'documentation',
    label: 'Documentation',
    matches: (record) => record.kind === 'documentation'
  },
  {
    key: 'tooling-configuration',
    label: 'Tooling / configuration',
    matches: (record) => record.kind === 'tooling'
  },
  {
    key: 'automation',
    label: 'Automation',
    matches: (record) => isAutomationPath(record.path)
  },
  {
    key: 'ci-delivery',
    label: 'CI / delivery',
    matches: (record) => isCiPath(record.path)
  },
  {
    key: 'observability-instrumentation',
    label: 'Observability / instrumentation',
    matches: (record) => record.kind === 'observability' || isObservabilityPath(record.path)
  },
  {
    key: 'experimentation-benchmarking',
    label: 'Experimentation / benchmarking',
    matches: (record) => record.kind === 'benchmark' || isBenchmarkPath(record.path)
  }
]);

function normalizePath(value) {
  return String(value ?? '').replaceAll('\\', '/').replace(/^\.\//, '').toLowerCase();
}

function fileName(path) {
  return normalizePath(path).split('/').at(-1) ?? '';
}

function isCiPath(path) {
  const normalized = normalizePath(path);
  const name = fileName(normalized);
  return normalized.startsWith('.github/workflows/')
    || normalized.includes('/.github/workflows/')
    || normalized.startsWith('.circleci/')
    || normalized.includes('/.circleci/')
    || name === '.gitlab-ci.yml'
    || name === 'jenkinsfile';
}

function isAutomationPath(path) {
  const normalized = normalizePath(path);
  const name = fileName(normalized);
  return isCiPath(normalized)
    || normalized.startsWith('scripts/')
    || normalized.includes('/scripts/')
    || normalized.startsWith('tools/')
    || normalized.includes('/tools/')
    || ['makefile', 'justfile', 'taskfile.yml', 'taskfile.yaml'].includes(name);
}

function hasPathSegment(path, segments) {
  const normalized = `/${normalizePath(path)}/`;
  return segments.some((segment) => normalized.includes(`/${segment}/`));
}

function isObservabilityPath(path) {
  const normalized = normalizePath(path);
  const name = fileName(normalized);
  return hasPathSegment(normalized, ['observability', 'telemetry', 'metrics', 'tracing', 'instrumentation'])
    || /(^|[._-])(telemetry|metrics|tracing|instrumentation)([._-]|$)/.test(name)
    || ['prometheus.yml', 'prometheus.yaml', 'grafana.ini'].includes(name)
    || name.startsWith('otel.')
    || name.startsWith('opentelemetry.');
}

function isBenchmarkPath(path) {
  const normalized = normalizePath(path);
  const name = fileName(normalized);
  return hasPathSegment(normalized, ['bench', 'benches', 'benchmark', 'benchmarks'])
    || /(^|[._-])(bench|benchmark)([._-]|$)/.test(name)
    || name === 'criterion.toml';
}

function assertBundle(bundle) {
  if (!bundle?.repository?.name || !Array.isArray(bundle.evidence)) {
    throw new Error('Development tendencies require repository evidence bundles.');
  }
}

function unique(values) {
  return [...new Set(values)];
}

function roundPrevalence(value) {
  return Math.round(value * 10_000) / 10_000;
}

export function analyzeDevelopmentTendencies({ bundles = [], minimumRepositories = 2 } = {}) {
  if (!Number.isInteger(minimumRepositories) || minimumRepositories < 2) {
    throw new Error('minimumRepositories must be an integer >= 2.');
  }

  const repositories = new Map();
  for (const bundle of bundles) {
    assertBundle(bundle);
    const name = String(bundle.repository.name).trim();
    if (!name) continue;
    const existing = repositories.get(name) ?? [];
    existing.push(...bundle.evidence);
    repositories.set(name, existing);
  }

  const analyzedRepositoryCount = repositories.size;
  const tendencies = [];

  for (const definition of DEFINITIONS) {
    const support = [];
    for (const [repository, evidence] of repositories.entries()) {
      const matched = evidence.filter(definition.matches);
      if (matched.length === 0) continue;
      support.push({ repository, evidence: matched });
    }

    if (support.length < minimumRepositories) continue;

    const evidenceRefs = unique(support.map((item) => item.evidence.find((record) => record.id)?.id).filter(Boolean));
    const evidenceKinds = unique(support.flatMap((item) => item.evidence.map((record) => record.kind).filter(Boolean))).sort();
    const supportingRepositories = support.map((item) => item.repository).sort();

    tendencies.push({
      key: definition.key,
      label: definition.label,
      repositoryCount: supportingRepositories.length,
      analyzedRepositoryCount,
      prevalence: analyzedRepositoryCount === 0 ? 0 : roundPrevalence(supportingRepositories.length / analyzedRepositoryCount),
      repositories: supportingRepositories,
      evidenceRefs,
      evidenceKinds,
      deterministic: true
    });
  }

  tendencies.sort((a, b) => b.repositoryCount - a.repositoryCount || a.label.localeCompare(b.label));

  return {
    schema: DEVELOPMENT_TENDENCIES_SCHEMA,
    analyzedRepositoryCount,
    minimumRepositories,
    tendencies
  };
}