const CONTRACT_SCHEMA = 'giteach-jev-bounded-v1';

function uniqueRefs(values = []) {
  return [...new Set(values.map(String).filter(Boolean))];
}

function uniqueCandidates(values = []) {
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
}

function normalizeCandidateEvidenceRefs(candidates, candidateEvidenceRefs, allowedRefs) {
  if (candidateEvidenceRefs == null) return Object.freeze({});
  if (typeof candidateEvidenceRefs !== 'object' || Array.isArray(candidateEvidenceRefs)) {
    throw new Error('candidateEvidenceRefs must be an object keyed by supplied candidate.');
  }

  const allowedCandidates = new Set(candidates);
  for (const key of Object.keys(candidateEvidenceRefs)) {
    if (!allowedCandidates.has(key)) {
      throw new Error(`candidateEvidenceRefs contains candidate outside supplied set: ${key}`);
    }
  }

  const normalized = {};
  for (const candidate of candidates) {
    const refs = uniqueRefs(candidateEvidenceRefs[candidate] ?? []);
    for (const ref of refs) {
      if (!allowedRefs.has(ref)) {
        throw new Error(`candidateEvidenceRefs references evidence outside request: ${ref}`);
      }
    }
    normalized[candidate] = Object.freeze(refs);
  }
  return Object.freeze(normalized);
}

export function buildBoundedJevRequest({
  repository,
  evidence,
  question,
  candidates = [],
  candidateEvidenceRefs = null
}) {
  if (!repository?.name) throw new Error('repository.name is required.');
  if (!Array.isArray(evidence) || evidence.length === 0) {
    throw new Error('bounded Jev request requires evidence.');
  }
  if (!String(question ?? '').trim()) throw new Error('question is required.');

  const normalizedCandidates = uniqueCandidates(candidates);
  const normalizedEvidence = evidence.map((item) => Object.freeze({
    ref: item.id,
    path: item.path,
    kind: item.kind,
    subject: item.subject ?? null,
    excerpt: item.excerpt ?? null,
    sourceHash: item.sourceHash ?? null,
    excerptHash: item.excerptHash ?? null
  }));
  const allowedRefs = new Set(normalizedEvidence.map((item) => item.ref));
  const normalizedCandidateRefs = normalizeCandidateEvidenceRefs(
    normalizedCandidates,
    candidateEvidenceRefs,
    allowedRefs
  );

  return Object.freeze({
    schema: CONTRACT_SCHEMA,
    task: 'developer-skill-evidence',
    question: String(question).trim(),
    candidates: Object.freeze(normalizedCandidates),
    candidateEvidenceRefs: normalizedCandidateRefs,
    repository: Object.freeze({ name: repository.name, url: repository.url ?? null }),
    evidence: Object.freeze(normalizedEvidence)
  });
}

export function validateBoundedJevResponse(raw, request) {
  const allowedRefs = new Set(request.evidence.map((item) => item.ref));
  const allowedCandidates = new Set(request.candidates ?? []);
  const provider = raw?.provider ?? 'jev';
  const model = raw?.model ?? null;
  const responseId = raw?.responseId ?? null;
  const observedAt = raw?.observedAt ?? null;
  const usage = raw?.usage ?? null;

  if (raw?.abstain === true) {
    return Object.freeze({
      abstained: true,
      reason: raw.reason ?? 'insufficient-evidence',
      provider, model, responseId, observedAt, usage,
      claims: []
    });
  }

  const claims = Array.isArray(raw?.claims) ? raw.claims : [];
  const normalized = claims.map((claim) => {
    const skill = String(claim.skill ?? '').trim();
    const evidenceRefs = uniqueRefs(claim.evidenceRefs);
    if (!skill) throw new Error('Jev claim requires skill.');
    if (allowedCandidates.size > 0 && !allowedCandidates.has(skill)) {
      throw new Error(`Jev claim is outside supplied candidates: ${skill}`);
    }
    if (evidenceRefs.length === 0) throw new Error('Jev claim requires evidence refs.');
    for (const ref of evidenceRefs) {
      if (!allowedRefs.has(ref)) throw new Error(`Jev claim references evidence outside request: ${ref}`);
    }
    const candidateRefs = request.candidateEvidenceRefs?.[skill] ?? [];
    if (candidateRefs.length > 0) {
      const candidateRefSet = new Set(candidateRefs);
      for (const ref of evidenceRefs) {
        if (!candidateRefSet.has(ref)) {
          throw new Error(`Jev claim references evidence outside candidate-specific refs: ${ref}`);
        }
      }
    }
    const confidence = Number(claim.confidence);
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      throw new Error('Jev claim confidence must be between 0 and 1.');
    }
    return Object.freeze({
      skill, confidence,
      reason: claim.reason ?? null, evidenceRefs,
      distribution: claim.distribution ?? null
    });
  });

  return Object.freeze({ abstained: false, provider, model, responseId, observedAt, usage, claims: normalized });
}

export { CONTRACT_SCHEMA as JEV_CONTRACT_SCHEMA };
