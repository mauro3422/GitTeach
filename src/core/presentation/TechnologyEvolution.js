export const TECHNOLOGY_EVOLUTION_SCHEMA = 'giteach-technology-evolution-v1';

function normalizeCount(value, field) {
  if (!Number.isInteger(value) || value < 0) throw new Error(`${field} must be a non-negative integer.`);
  return value;
}

function normalizeLanguage(item) {
  const language = String(item?.language ?? '').trim();
  if (!language) throw new Error('Technology evolution language requires language.');
  return Object.freeze({
    language,
    files: normalizeCount(item.files, 'language.files'),
    bytes: normalizeCount(item.bytes, 'language.bytes')
  });
}

function normalizeSnapshot(snapshot) {
  const commit = String(snapshot?.commit ?? '').trim();
  const committedAt = String(snapshot?.committedAt ?? '').trim();
  if (!commit || !committedAt || Number.isNaN(Date.parse(committedAt))) {
    throw new Error('Technology evolution snapshot requires commit and ISO-like committedAt.');
  }
  if (!Array.isArray(snapshot.languages)) throw new Error('Technology evolution snapshot requires languages[].');
  return Object.freeze({
    commit,
    committedAt,
    sourceFileCount: normalizeCount(snapshot.sourceFileCount, 'snapshot.sourceFileCount'),
    languages: Object.freeze(snapshot.languages.map(normalizeLanguage))
  });
}

export function normalizeTechnologyEvolution(input) {
  if (!input || input.schema !== TECHNOLOGY_EVOLUTION_SCHEMA) throw new Error(`Expected ${TECHNOLOGY_EVOLUTION_SCHEMA}.`);
  const repository = String(input.repository ?? '').trim();
  if (!repository) throw new Error('Technology evolution requires repository.');
  if (input.source !== 'git-local-tree') throw new Error('Technology evolution source must be git-local-tree.');
  if (!Array.isArray(input.snapshots)) throw new Error('Technology evolution requires snapshots[].');
  const commitCount = normalizeCount(input.commitCount, 'commitCount');
  const snapshotCount = normalizeCount(input.snapshotCount, 'snapshotCount');
  if (snapshotCount !== input.snapshots.length || snapshotCount > commitCount) throw new Error('Technology evolution snapshotCount is inconsistent.');
  const sampling = input.sampling;
  if (!sampling || sampling.strategy !== 'evenly-spaced-commits-v1') throw new Error('Unsupported technology evolution sampling strategy.');
  const maxSnapshots = normalizeCount(sampling.maxSnapshots, 'sampling.maxSnapshots');
  if (maxSnapshots < 2) throw new Error('Technology evolution maxSnapshots must be at least 2.');
  if (sampling.completeHistory !== (snapshotCount === commitCount)) throw new Error('Technology evolution completeHistory is inconsistent.');
  const snapshots = input.snapshots.map(normalizeSnapshot);
  const serialized = JSON.stringify(input);
  if (/score|expertise|seniority/i.test(serialized)) throw new Error('Technology evolution cannot contain skill-score semantics.');

  return Object.freeze({
    schema: TECHNOLOGY_EVOLUTION_SCHEMA,
    repository,
    source: 'git-local-tree',
    headCommit: input.headCommit == null ? null : String(input.headCommit),
    commitCount,
    snapshotCount,
    sampling: Object.freeze({
      strategy: 'evenly-spaced-commits-v1',
      maxSnapshots,
      completeHistory: sampling.completeHistory
    }),
    snapshots: Object.freeze(snapshots),
    deterministic: input.deterministic === true
  });
}
