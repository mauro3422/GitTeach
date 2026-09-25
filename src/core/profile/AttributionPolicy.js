export const ATTRIBUTION_STATUS = Object.freeze({
  REPOSITORY_ONLY: 'repository-only',
  IDENTITY_LINKED: 'identity-linked',
  AGENCY_SUPPORTED: 'agency-supported',
  USER_CONFIRMED: 'user-confirmed'
});

export const ACTOR_RELATIONS = Object.freeze({
  IDENTITY: Object.freeze(['authored-change', 'coauthored-change']),
  AGENCY: Object.freeze([
    'reviewed-change',
    'decision-record',
    'design-session',
    'debug-session',
    'test-session',
    'maintenance-session',
    'agent-direction'
  ]),
  CONFIRMATION: Object.freeze(['manual-confirmation'])
});

export const IMPLEMENTATION_ORIGINS = Object.freeze([
  'human',
  'ai-assisted',
  'mixed',
  'unknown'
]);

const IDENTITY_SET = new Set(ACTOR_RELATIONS.IDENTITY);
const AGENCY_SET = new Set(ACTOR_RELATIONS.AGENCY);
const CONFIRMATION_SET = new Set(ACTOR_RELATIONS.CONFIRMATION);
const ORIGIN_SET = new Set(IMPLEMENTATION_ORIGINS);

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function relationStatus(relation) {
  if (CONFIRMATION_SET.has(relation)) return ATTRIBUTION_STATUS.USER_CONFIRMED;
  if (AGENCY_SET.has(relation)) return ATTRIBUTION_STATUS.AGENCY_SUPPORTED;
  if (IDENTITY_SET.has(relation)) return ATTRIBUTION_STATUS.IDENTITY_LINKED;
  return ATTRIBUTION_STATUS.REPOSITORY_ONLY;
}

const STATUS_RANK = Object.freeze({
  [ATTRIBUTION_STATUS.REPOSITORY_ONLY]: 0,
  [ATTRIBUTION_STATUS.IDENTITY_LINKED]: 1,
  [ATTRIBUTION_STATUS.USER_CONFIRMED]: 2,
  [ATTRIBUTION_STATUS.AGENCY_SUPPORTED]: 3
});

export function summarizeAttribution(evidence = []) {
  let status = ATTRIBUTION_STATUS.REPOSITORY_ONLY;
  const actorEvidenceRefs = [];
  const actorRelations = [];
  const implementationOrigins = [];

  for (const record of evidence) {
    const relation = record?.metadata?.actorRelation ?? null;
    const relationLevel = relationStatus(relation);
    if (STATUS_RANK[relationLevel] === 0) continue;

    actorEvidenceRefs.push(record.id);
    actorRelations.push(relation);
    const origin = record?.metadata?.implementationOrigin;
    implementationOrigins.push(ORIGIN_SET.has(origin) ? origin : 'unknown');

    if (STATUS_RANK[relationLevel] > STATUS_RANK[status]) status = relationLevel;
  }

  return Object.freeze({
    status,
    actorEvidenceRefs: Object.freeze(unique(actorEvidenceRefs)),
    actorRelations: Object.freeze(unique(actorRelations)),
    implementationOrigins: Object.freeze(unique(implementationOrigins))
  });
}

export function summarizeActorEvidence(records = []) {
  let status = ATTRIBUTION_STATUS.REPOSITORY_ONLY;
  const actorEvidenceRefs = [];
  const actorRelations = [];
  const implementationOrigins = [];

  for (const record of records) {
    const relation = record?.relation ?? null;
    const relationLevel = relationStatus(relation);
    if (STATUS_RANK[relationLevel] === 0) continue;

    if (record?.id) actorEvidenceRefs.push(record.id);
    actorRelations.push(relation);
    const origin = record?.implementationOrigin;
    implementationOrigins.push(ORIGIN_SET.has(origin) ? origin : 'unknown');

    if (STATUS_RANK[relationLevel] > STATUS_RANK[status]) status = relationLevel;
  }

  return Object.freeze({
    status,
    actorEvidenceRefs: Object.freeze(unique(actorEvidenceRefs)),
    actorRelations: Object.freeze(unique(actorRelations)),
    implementationOrigins: Object.freeze(unique(implementationOrigins))
  });
}

export function isPersonalAttribution(status) {
  return status !== ATTRIBUTION_STATUS.REPOSITORY_ONLY;
}

export function isAgencySupported(status) {
  return status === ATTRIBUTION_STATUS.AGENCY_SUPPORTED;
}
