import { validateProfileDeclaration } from './ProfileDeclaration.js';

export const PROFILE_RECONCILIATION_SCHEMA = 'giteach-profile-reconciliation-v1';
export const PROFILE_RECONCILIATION_STATUSES = Object.freeze([
  'declared-supported',
  'declared-not-observable',
  'observed-undeclared',
  'ambiguous'
]);
export const PROFILE_OBSERVATION_SOURCE_CLASSES = Object.freeze([
  'repository-fact',
  'cross-project-tendency',
  'semantic-observation',
  'actor-evidence'
]);

const SOURCE_CLASSES = new Set(PROFILE_OBSERVATION_SOURCE_CLASSES);

function normalizeKey(value, field = 'key') {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${field} is required.`);
  return value.trim().toLowerCase();
}

function normalizedRefs(values, field) {
  if (!Array.isArray(values)) throw new Error(`${field} must be an array.`);
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))].sort();
}

function validateObservation(input) {
  const key = normalizeKey(input?.key);
  const stance = input?.stance ?? 'support';
  if (stance !== 'support' && stance !== 'contradict') throw new Error(`Unsupported observed stance: ${stance}`);
  const sourceClass = String(input?.sourceClass ?? '').trim();
  if (!SOURCE_CLASSES.has(sourceClass)) throw new Error(`Unsupported observation source class: ${sourceClass}`);
  const evidenceRefs = normalizedRefs(input?.evidenceRefs ?? [], 'evidenceRefs');
  if (evidenceRefs.length === 0) throw new Error('Observed reconciliation input requires at least one evidence ref.');
  return Object.freeze({
    key,
    label: String(input?.label ?? input?.key ?? '').trim() || key,
    stance,
    sourceClass,
    evidenceRefs: Object.freeze(evidenceRefs)
  });
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

export function reconcileProfileDeclarations({ actorKey, declarations = [], observations = [] } = {}) {
  const subject = String(actorKey ?? '').trim();
  if (!subject) throw new Error('actorKey is required.');
  if (!Array.isArray(declarations) || !Array.isArray(observations)) throw new Error('declarations and observations must be arrays.');

  const ownDeclarations = declarations.map(validateProfileDeclaration).filter((item) => item.actorKey === subject);
  const observed = observations.map(validateObservation);
  const keys = unique([
    ...ownDeclarations.map((item) => item.key),
    ...observed.filter((item) => item.stance === 'support').map((item) => item.key)
  ]);

  const items = keys.map((key) => {
    const declared = ownDeclarations.filter((item) => item.key === key);
    const support = observed.filter((item) => item.key === key && item.stance === 'support');
    const contradict = observed.filter((item) => item.key === key && item.stance === 'contradict');
    const declarationIds = unique(declared.map((item) => item.id));
    const declarationValues = unique(declared.map((item) => item.value.trim().toLowerCase()));
    const supportRefs = unique(support.flatMap((item) => item.evidenceRefs));
    const contradictionRefs = unique(contradict.flatMap((item) => item.evidenceRefs));
    const sourceClasses = unique([...support, ...contradict].map((item) => item.sourceClass));

    let status;
    if (declarationValues.length > 1 || (declared.length > 0 && contradict.length > 0)) status = 'ambiguous';
    else if (declared.length > 0 && support.length > 0) status = 'declared-supported';
    else if (declared.length > 0) status = 'declared-not-observable';
    else status = 'observed-undeclared';

    return Object.freeze({
      key,
      label: declared[0]?.value ?? support[0]?.label ?? key,
      status,
      declarationIds: Object.freeze(declarationIds),
      observedSupportRefs: Object.freeze(supportRefs),
      observedContradictionRefs: Object.freeze(contradictionRefs),
      sourceClasses: Object.freeze(sourceClasses)
    });
  });

  return Object.freeze({
    schema: PROFILE_RECONCILIATION_SCHEMA,
    actorKey: subject,
    items: Object.freeze(items)
  });
}
