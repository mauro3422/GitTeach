import { createHash } from 'node:crypto';

import { ACTOR_RELATIONS, IMPLEMENTATION_ORIGINS } from './AttributionPolicy.js';

export const ACTOR_EVIDENCE_SCHEMA = 'giteach-actor-evidence-v1';

export const ACTOR_EVIDENCE_SOURCE_KINDS = Object.freeze([
  'git',
  'github',
  'design-artifact',
  'work-session',
  'agent-workflow',
  'manual'
]);

const RELATIONS = new Set([
  ...ACTOR_RELATIONS.IDENTITY,
  ...ACTOR_RELATIONS.AGENCY,
  ...ACTOR_RELATIONS.CONFIRMATION
]);
const ORIGINS = new Set(IMPLEMENTATION_ORIGINS);
const SOURCE_KINDS = new Set(ACTOR_EVIDENCE_SOURCE_KINDS);

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function normalizedStrings(values = []) {
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))].sort();
}

function assertNonEmpty(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${field} is required.`);
  return value.trim();
}

function makeId(value) {
  const identity = {
    actorKey: value.actorKey,
    relation: value.relation,
    repository: value.repository,
    sourceKind: value.sourceKind,
    sourceRef: value.sourceRef,
    observedAt: value.observedAt,
    capabilityKeys: value.capabilityKeys,
    targetEvidenceRefs: value.targetEvidenceRefs
  };
  return createHash('sha256').update(stableStringify(identity)).digest('hex').slice(0, 24);
}

export function createActorEvidence(input) {
  if (input?.schema && input.schema !== ACTOR_EVIDENCE_SCHEMA) {
    throw new Error(`Unsupported actor evidence schema: ${input.schema}`);
  }

  const actorKey = assertNonEmpty(input?.actorKey, 'actorKey');
  const repository = assertNonEmpty(input?.repository, 'repository');
  const relation = assertNonEmpty(input?.relation, 'relation');
  if (!RELATIONS.has(relation)) throw new Error(`Unsupported actor relation: ${relation}`);

  const sourceKind = assertNonEmpty(input?.sourceKind, 'sourceKind');
  if (!SOURCE_KINDS.has(sourceKind)) throw new Error(`Unsupported actor evidence source kind: ${sourceKind}`);
  const sourceRef = assertNonEmpty(input?.sourceRef, 'sourceRef');

  const implementationOrigin = input?.implementationOrigin ?? 'unknown';
  if (!ORIGINS.has(implementationOrigin)) {
    throw new Error(`Unsupported implementation origin: ${implementationOrigin}`);
  }

  const capabilityKeys = normalizedStrings(input?.capabilityKeys);
  const targetEvidenceRefs = normalizedStrings(input?.targetEvidenceRefs);
  if (capabilityKeys.length === 0 && targetEvidenceRefs.length === 0) {
    throw new Error('Actor evidence requires at least one capability key or target evidence ref.');
  }

  const observedAt = input?.observedAt ?? new Date().toISOString();
  const summary = input?.summary == null ? null : String(input.summary).trim();
  if (summary && summary.length > 500) throw new Error('Actor evidence summary exceeds 500 characters.');

  const normalized = {
    schema: ACTOR_EVIDENCE_SCHEMA,
    actorKey,
    relation,
    repository,
    sourceKind,
    sourceRef,
    observedAt,
    implementationOrigin,
    capabilityKeys,
    targetEvidenceRefs,
    summary,
    sourceHash: input?.sourceHash ?? null
  };

  return Object.freeze({ id: input?.id ?? makeId(normalized), ...normalized });
}

export function actorEvidenceAppliesTo({ record, capabilityKey, supportEvidenceRefs = [] }) {
  const capability = String(capabilityKey ?? '').trim().toLowerCase();
  const targetSet = new Set(supportEvidenceRefs);
  return record.capabilityKeys.some((key) => key.toLowerCase() === capability)
    || record.targetEvidenceRefs.some((ref) => targetSet.has(ref));
}
