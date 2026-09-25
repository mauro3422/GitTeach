import { createHash } from 'node:crypto';

import { buildBoundedJevRequest, validateBoundedJevResponse } from './JevContract.js';

export const JEV_OBSERVATION_SCHEMA = 'giteach-jev-observation-v1';
export const INCREMENTAL_JEV_PLAN_SCHEMA = 'giteach-incremental-jev-plan-v1';
export const PROJECT_SEMANTIC_CONTEXT_KEY = 'project-capability-evidence-v1';
export const PROJECT_SEMANTIC_QUESTION = 'For the supplied candidate project capability or characteristic, decide whether it is directly supported by the supplied repository evidence. Judge project semantics only. Do not infer developer authorship, personal expertise, seniority, or adjacent capabilities.';

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function hash(value) {
  return createHash('sha256').update(typeof value === 'string' ? value : stableStringify(value)).digest('hex');
}

function normalizeCandidates(values = []) {
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
}

function normalizeKey(value, field) {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw new Error(`${field} is required.`);
  return normalized;
}

function requestEvidenceIdentity(request) {
  return request.evidence.map((item) => Object.freeze({
    ref: item.ref,
    path: item.path,
    kind: item.kind,
    subject: item.subject ?? null,
    sourceHash: item.sourceHash ?? null,
    excerptHash: item.excerptHash ?? null,
    // Hash the exact text Jev saw even when an upstream producer did not provide hashes.
    excerptDigest: item.excerpt == null ? null : hash(String(item.excerpt))
  }));
}

function candidateRefs(evidence, candidate, candidateEvidenceRefs) {
  const hasSpecific = candidateEvidenceRefs != null
    && Object.prototype.hasOwnProperty.call(candidateEvidenceRefs, candidate);
  if (!hasSpecific) return evidence.map((item) => item.id);
  return [...new Set((candidateEvidenceRefs[candidate] ?? []).map(String).filter(Boolean))];
}

function candidateRequest({ repository, evidence, candidate, candidateEvidenceRefs, question }) {
  const refs = candidateRefs(evidence, candidate, candidateEvidenceRefs);
  if (refs.length === 0) return null;
  const byId = new Map(evidence.map((item) => [String(item.id), item]));
  const boundedEvidence = refs.map((ref) => {
    const record = byId.get(ref);
    if (!record) throw new Error(`candidateEvidenceRefs references unknown evidence: ${ref}`);
    return record;
  });
  return buildBoundedJevRequest({
    repository,
    evidence: boundedEvidence,
    question,
    candidates: [candidate],
    candidateEvidenceRefs: { [candidate]: refs }
  });
}

function fingerprints({ request, candidate, semanticContextKey, providerPolicyKey }) {
  const evidenceIdentity = requestEvidenceIdentity(request);
  const questionHash = hash(request.question);
  const evidenceFingerprint = hash(evidenceIdentity);
  const inputFingerprint = hash({
    contractSchema: request.schema,
    task: request.task,
    repository: request.repository,
    candidate,
    candidateEvidenceRefs: request.candidateEvidenceRefs[candidate] ?? [],
    evidence: evidenceIdentity,
    questionHash,
    semanticContextKey,
    providerPolicyKey
  });
  return { evidenceIdentity, questionHash, evidenceFingerprint, inputFingerprint };
}

function previousForCandidate(previousObservations, repositoryName, candidate, inputFingerprint) {
  const matching = previousObservations.filter((item) =>
    item?.schema === JEV_OBSERVATION_SCHEMA
    && item.repository?.name === repositoryName
    && item.candidate === candidate
  );
  return matching.find((item) => item.inputFingerprint === inputFingerprint)
    ?? matching.at(-1)
    ?? null;
}

function refreshReason(previous, current) {
  if (!previous) return 'missing-observation';
  if (previous.contractSchema !== current.request.schema) return 'contract-changed';
  if (previous.semanticContextKey !== current.semanticContextKey) return 'context-changed';
  if (previous.providerPolicyKey !== current.providerPolicyKey) return 'provider-policy-changed';
  if (previous.questionHash !== current.questionHash) return 'question-changed';
  if (previous.evidenceFingerprint !== current.evidenceFingerprint) return 'evidence-changed';
  return 'input-changed';
}

function normalizeMaxObservationAge(value) {
  if (value == null) return null;
  if (!Number.isFinite(value) || value < 0) throw new Error('maxObservationAgeMs must be a non-negative finite number or null.');
  return value;
}

function observationExpired(observation, maxObservationAgeMs, nowMs) {
  if (maxObservationAgeMs == null) return false;
  const observedAtMs = Date.parse(observation?.observedAt ?? '');
  if (!Number.isFinite(observedAtMs)) return true;
  return nowMs - observedAtMs > maxObservationAgeMs;
}

export function planIncrementalJevSemantics({
  repository,
  evidence = [],
  candidates = [],
  candidateEvidenceRefs = null,
  previousObservations = [],
  semanticContextKey = PROJECT_SEMANTIC_CONTEXT_KEY,
  providerPolicyKey,
  question = PROJECT_SEMANTIC_QUESTION,
  maxObservationAgeMs = null,
  nowMs = Date.now()
} = {}) {
  if (!repository?.name) throw new Error('repository.name is required.');
  if (!Array.isArray(evidence)) throw new Error('evidence must be an array.');
  if (!Array.isArray(previousObservations)) throw new Error('previousObservations must be an array.');
  const contextKey = normalizeKey(semanticContextKey, 'semanticContextKey');
  const policyKey = normalizeKey(providerPolicyKey, 'providerPolicyKey');
  const normalizedQuestion = normalizeKey(question, 'question');
  const normalizedCandidates = normalizeCandidates(candidates);
  const observationMaxAge = normalizeMaxObservationAge(maxObservationAgeMs);
  if (!Number.isFinite(nowMs)) throw new Error('nowMs must be a finite epoch timestamp.');
  const candidatePlans = [];

  for (const candidate of normalizedCandidates) {
    const request = candidateRequest({ repository, evidence, candidate, candidateEvidenceRefs, question: normalizedQuestion });
    if (!request) {
      candidatePlans.push(Object.freeze({ candidate, action: 'skip-no-evidence', reason: 'no-candidate-evidence', inputFingerprint: null, request: null, reusableObservation: null }));
      continue;
    }

    const identity = fingerprints({ request, candidate, semanticContextKey: contextKey, providerPolicyKey: policyKey });
    const current = { request, semanticContextKey: contextKey, providerPolicyKey: policyKey, ...identity };
    const previous = previousForCandidate(previousObservations, repository.name, candidate, identity.inputFingerprint);
    const exactInput = previous?.inputFingerprint === identity.inputFingerprint;
    const expired = exactInput && observationExpired(previous, observationMaxAge, nowMs);
    const reusable = exactInput && !expired ? previous : null;
    candidatePlans.push(Object.freeze({
      candidate,
      action: reusable ? 'reuse' : 'refresh',
      reason: reusable ? 'exact-input-match' : expired ? 'provider-refresh-due' : refreshReason(previous, current),
      inputFingerprint: identity.inputFingerprint,
      evidenceFingerprint: identity.evidenceFingerprint,
      questionHash: identity.questionHash,
      request,
      reusableObservation: reusable
    }));
  }

  return Object.freeze({
    schema: INCREMENTAL_JEV_PLAN_SCHEMA,
    repository: Object.freeze({ name: repository.name, url: repository.url ?? null }),
    semanticContextKey: contextKey,
    providerPolicyKey: policyKey,
    candidatePlans: Object.freeze(candidatePlans),
    reusableCandidates: Object.freeze(candidatePlans.filter((item) => item.action === 'reuse').map((item) => item.candidate)),
    refreshCandidates: Object.freeze(candidatePlans.filter((item) => item.action === 'refresh').map((item) => item.candidate)),
    skippedCandidates: Object.freeze(candidatePlans.filter((item) => item.action === 'skip-no-evidence').map((item) => item.candidate))
  });
}

export function createJevObservation({ candidatePlan, response, semanticContextKey, providerPolicyKey }) {
  if (candidatePlan?.action !== 'refresh' || !candidatePlan.request) {
    throw new Error('createJevObservation requires a refresh candidate plan.');
  }
  const request = candidatePlan.request;
  const candidate = candidatePlan.candidate;
  const validated = validateBoundedJevResponse(response, request);
  const evidenceIdentity = requestEvidenceIdentity(request);
  const claims = validated.claims.map((claim) => Object.freeze({
    skill: claim.skill,
    confidence: claim.confidence,
    reason: claim.reason,
    evidenceRefs: Object.freeze([...claim.evidenceRefs]),
    distribution: claim.distribution ?? null
  }));
  const outcome = Object.freeze({
    status: validated.abstained ? 'abstained' : 'supported',
    reason: validated.abstained ? validated.reason : null,
    claims: Object.freeze(claims)
  });
  const observation = {
    schema: JEV_OBSERVATION_SCHEMA,
    repository: Object.freeze({ ...request.repository }),
    candidate,
    contractSchema: request.schema,
    semanticContextKey: normalizeKey(semanticContextKey, 'semanticContextKey'),
    providerPolicyKey: normalizeKey(providerPolicyKey, 'providerPolicyKey'),
    questionHash: candidatePlan.questionHash,
    evidenceFingerprint: candidatePlan.evidenceFingerprint,
    inputFingerprint: candidatePlan.inputFingerprint,
    evidenceRefs: Object.freeze(evidenceIdentity.map((item) => item.ref)),
    evidenceIdentity: Object.freeze(evidenceIdentity),
    provider: validated.provider,
    model: validated.model,
    responseId: validated.responseId,
    observedAt: validated.observedAt ?? new Date().toISOString(),
    usage: validated.usage ?? null,
    outcome
  };
  return Object.freeze({ ...observation, id: hash(observation) });
}

export function jevObservationToSemanticClaims(observation) {
  if (observation?.schema !== JEV_OBSERVATION_SCHEMA) throw new Error('Expected giteach-jev-observation-v1.');
  return Object.freeze((observation.outcome?.claims ?? []).map((claim) => Object.freeze({
    provider: observation.provider,
    skill: claim.skill,
    scope: 'project',
    claimType: 'semantic-observation',
    confidence: claim.confidence,
    reason: claim.reason,
    evidenceRefs: Object.freeze([...claim.evidenceRefs]),
    repository: observation.repository.name,
    model: observation.model,
    responseId: observation.responseId,
    distribution: claim.distribution,
    usage: observation.usage,
    observedAt: observation.observedAt,
    observationId: observation.id
  })));
}

export class IncrementalJevSemanticProvider {
  constructor({
    judge,
    providerPolicyKey,
    semanticContextKey = PROJECT_SEMANTIC_CONTEXT_KEY,
    question = PROJECT_SEMANTIC_QUESTION,
    maxObservationAgeMs = null,
    now = () => Date.now()
  } = {}) {
    if (typeof judge !== 'function') throw new Error('IncrementalJevSemanticProvider requires a judge function.');
    if (typeof now !== 'function') throw new Error('IncrementalJevSemanticProvider now must be a function.');
    this.judge = judge;
    this.providerPolicyKey = normalizeKey(providerPolicyKey, 'providerPolicyKey');
    this.semanticContextKey = normalizeKey(semanticContextKey, 'semanticContextKey');
    this.question = normalizeKey(question, 'question');
    this.maxObservationAgeMs = normalizeMaxObservationAge(maxObservationAgeMs);
    this.now = now;
  }

  async inferProjectSemantics({ repository, evidence = [], candidates = [], candidateEvidenceRefs = null, previousObservations = [] } = {}) {
    const plan = planIncrementalJevSemantics({
      repository,
      evidence,
      candidates,
      candidateEvidenceRefs,
      previousObservations,
      semanticContextKey: this.semanticContextKey,
      providerPolicyKey: this.providerPolicyKey,
      question: this.question,
      maxObservationAgeMs: this.maxObservationAgeMs,
      nowMs: this.now()
    });

    const observationsByCandidate = new Map();
    for (const candidatePlan of plan.candidatePlans) {
      if (candidatePlan.action === 'reuse') {
        observationsByCandidate.set(candidatePlan.candidate, candidatePlan.reusableObservation);
        continue;
      }
      if (candidatePlan.action === 'skip-no-evidence') continue;
      const raw = await this.judge({ state: candidatePlan.request, question: candidatePlan.request.question });
      const observation = createJevObservation({
        candidatePlan,
        response: raw,
        semanticContextKey: this.semanticContextKey,
        providerPolicyKey: this.providerPolicyKey
      });
      observationsByCandidate.set(candidatePlan.candidate, observation);
    }

    const observations = Object.freeze([...observationsByCandidate.values()]);
    const claims = Object.freeze(observations.flatMap(jevObservationToSemanticClaims));
    return Object.freeze({ plan, observations, claims });
  }
}
