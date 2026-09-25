const GENERIC_WORDS = new Set([
  'application', 'administration', 'capability', 'cluster', 'development',
  'desktop', 'editor', 'integration', 'programming', 'software'
]);

const ALIASES = Object.freeze({
  typescript: ['typescript', 'tsconfig', '.ts', '.tsx'],
  javascript: ['javascript', '.js', '.mjs', '.cjs'],
  rust: ['rust', 'cargo', '.rs'],
  tauri: ['tauri', 'src-tauri'],
  svelte: ['svelte', 'sveltekit', '.svelte'],
  monaco: ['monaco', 'monaco-editor'],
  kubernetes: ['kubernetes', 'k8s', 'helm']
});

function normalize(value) {
  return String(value ?? '').toLowerCase();
}

function candidateTerms(candidate) {
  const words = normalize(candidate)
    .split(/[^a-z0-9+#.-]+/)
    .map((value) => value.trim())
    .filter((value) => value.length >= 2 && !GENERIC_WORDS.has(value));

  const terms = new Set(words);
  for (const word of words) {
    for (const alias of ALIASES[word] ?? []) terms.add(alias);
  }
  return [...terms].sort();
}

function occurrences(haystack, needle) {
  if (!needle || !haystack) return 0;
  let count = 0;
  let offset = 0;
  while ((offset = haystack.indexOf(needle, offset)) !== -1) {
    count += 1;
    offset += needle.length;
  }
  return count;
}

function scoreEvidence(record, terms) {
  const path = normalize(record.path);
  const subject = normalize(record.subject);
  const excerpt = normalize(record.excerpt);
  const metadata = normalize(JSON.stringify(record.metadata ?? {}));

  let score = 0;
  for (const term of terms) {
    score += occurrences(path, term) * 10;
    score += occurrences(subject, term) * 7;
    score += Math.min(occurrences(excerpt, term), 4) * 3;
    score += Math.min(occurrences(metadata, term), 2);
  }

  if (score > 0) {
    if (record.kind === 'source') score += 4;
    else if (record.kind === 'manifest') score += 3;
    else if (record.kind === 'tooling') score += 2;
  }
  return score;
}

export function selectCandidateEvidence({ evidence = [], candidates = [], maxPerCandidate = 3, maxTotal = 12 }) {
  if (!Number.isInteger(maxPerCandidate) || maxPerCandidate < 1) {
    throw new Error('maxPerCandidate must be a positive integer.');
  }
  if (!Number.isInteger(maxTotal) || maxTotal < 1) {
    throw new Error('maxTotal must be a positive integer.');
  }

  const indexById = new Map(evidence.map((record, index) => [record.id, index]));
  const candidateMatches = [];
  const selectedScores = new Map();

  for (const candidate of candidates) {
    const terms = candidateTerms(candidate);
    const ranked = evidence
      .map((record, index) => ({ record, index, score: scoreEvidence(record, terms) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, maxPerCandidate);

    candidateMatches.push({
      candidate,
      terms,
      evidenceRefs: ranked.map((item) => item.record.id),
      scores: ranked.map((item) => ({ ref: item.record.id, score: item.score }))
    });

    for (const item of ranked) {
      const previous = selectedScores.get(item.record.id);
      if (!previous || item.score > previous.score) {
        selectedScores.set(item.record.id, { record: item.record, score: item.score });
      }
    }
  }

  const selected = [...selectedScores.values()]
    .sort((a, b) => b.score - a.score || indexById.get(a.record.id) - indexById.get(b.record.id))
    .slice(0, maxTotal)
    .map((item) => item.record);
  const selectedIds = new Set(selected.map((record) => record.id));
  const boundedCandidateMatches = candidateMatches.map((match) => {
    const scores = match.scores.filter((item) => selectedIds.has(item.ref));
    return Object.freeze({
      ...match,
      evidenceRefs: Object.freeze(scores.map((item) => item.ref)),
      scores: Object.freeze(scores)
    });
  });

  return Object.freeze({
    evidence: Object.freeze(selected),
    candidateMatches: Object.freeze(boundedCandidateMatches),
    inputEvidenceCount: evidence.length,
    selectedEvidenceCount: selected.length
  });
}
