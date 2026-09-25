import { PROFILE_PUBLICATION_CONTEXT_SCHEMA } from '../profile/ProfilePublicationContext.js';
import { PROFILE_STATISTICS_SCHEMA } from './ProfileStatistics.js';
import { TECHNOLOGY_EVOLUTION_SCHEMA, normalizeTechnologyEvolution } from './TechnologyEvolution.js';

export const PROFILE_PRESENTATION_PAYLOAD_SCHEMA = 'giteach-profile-presentation-v1';

const STATISTICS_ROOT_FIELDS = Object.freeze(['schema', 'technology', 'tendencies', 'domains', 'lifecycle', 'collaboration']);

function requiredActorKey(value) {
  const actorKey = String(value ?? '').trim();
  if (!actorKey) throw new Error('Profile presentation requires actorKey.');
  return actorKey;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertNoScoreSemantics(value, label) {
  const visit = (current, path = '$') => {
    if (!current || typeof current !== 'object') return;
    for (const [key, child] of Object.entries(current)) {
      if (/score|expertise|seniority|quality/i.test(key)) {
        throw new Error(`${label} cannot contain score/expertise/seniority/quality semantics at ${path}.${key}.`);
      }
      visit(child, `${path}.${key}`);
    }
  };
  visit(value);
}

function normalizeStatistics(input) {
  if (!input || input.schema !== PROFILE_STATISTICS_SCHEMA) throw new Error(`Expected ${PROFILE_STATISTICS_SCHEMA}.`);
  const keys = Object.keys(input).sort();
  const expected = [...STATISTICS_ROOT_FIELDS].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new Error('ProfileStatistics root shape is incompatible with presentation v1.');
  }
  assertNoScoreSemantics(input, 'ProfileStatistics');
  return deepFreeze(cloneJson(input));
}

function normalizePublicationContext(input, actorKey) {
  if (!input || input.schema !== PROFILE_PUBLICATION_CONTEXT_SCHEMA) throw new Error(`Expected ${PROFILE_PUBLICATION_CONTEXT_SCHEMA}.`);
  if (requiredActorKey(input.actorKey) !== actorKey) throw new Error('Profile publication actor does not match presentation actor.');
  if (!Array.isArray(input.declarations)) throw new Error('Profile publication context requires declarations[].');

  const declarations = input.declarations.map((item) => deepFreeze({
    id: String(item?.id ?? '').trim(),
    category: String(item?.category ?? '').trim(),
    key: String(item?.key ?? '').trim(),
    value: String(item?.value ?? '').trim(),
    sourceKind: String(item?.sourceKind ?? '').trim(),
    repositories: Object.freeze(Array.isArray(item?.repositories) ? item.repositories.map((value) => String(value).trim()).filter(Boolean) : [])
  }));
  if (declarations.some((item) => !item.id || !item.category || !item.key || !item.value || !item.sourceKind)) {
    throw new Error('Published profile declaration is incomplete.');
  }

  return deepFreeze({
    schema: PROFILE_PUBLICATION_CONTEXT_SCHEMA,
    actorKey,
    declarations: Object.freeze(declarations)
  });
}

function normalizeEvolution(items) {
  if (!Array.isArray(items)) throw new Error('technologyEvolution must be an array.');
  const seen = new Set();
  const normalized = items.map((item) => {
    if (item?.schema !== TECHNOLOGY_EVOLUTION_SCHEMA) throw new Error(`Expected ${TECHNOLOGY_EVOLUTION_SCHEMA}.`);
    const evolution = normalizeTechnologyEvolution(item);
    const key = evolution.repository.toLowerCase();
    if (seen.has(key)) throw new Error(`Duplicate technology evolution repository: ${evolution.repository}.`);
    seen.add(key);
    return evolution;
  });
  normalized.sort((a, b) => a.repository.localeCompare(b.repository));
  return Object.freeze(normalized);
}

export function prepareProfilePresentationPayload({ actorKey, statistics, technologyEvolution = [], publicationContext } = {}) {
  const subject = requiredActorKey(actorKey);
  const normalizedStatistics = normalizeStatistics(statistics);
  const normalizedEvolution = normalizeEvolution(technologyEvolution);
  const normalizedPublication = normalizePublicationContext(publicationContext, subject);

  return deepFreeze({
    schema: PROFILE_PRESENTATION_PAYLOAD_SCHEMA,
    actorKey: subject,
    statistics: normalizedStatistics,
    technologyEvolution: normalizedEvolution,
    publicationContext: normalizedPublication
  });
}
