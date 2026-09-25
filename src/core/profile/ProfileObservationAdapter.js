import { DEVELOPMENT_TENDENCIES_SCHEMA } from './DevelopmentTendencies.js';

const DEVELOPER_PROFILE_SCHEMA = 'giteach-developer-profile-v1';

function uniqueStrings(values = []) {
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))].sort();
}

function observationIdentity(item) {
  return [item.key, item.stance, item.sourceClass, item.evidenceRefs.join('\n')].join('\0');
}

export function developmentTendenciesToProfileObservations(tendencies) {
  if (!tendencies || tendencies.schema !== DEVELOPMENT_TENDENCIES_SCHEMA || !Array.isArray(tendencies.tendencies)) {
    throw new Error(`Expected ${DEVELOPMENT_TENDENCIES_SCHEMA}.`);
  }

  return Object.freeze(tendencies.tendencies.map((tendency) => {
    const key = String(tendency?.key ?? '').trim();
    const label = String(tendency?.label ?? '').trim();
    const evidenceRefs = uniqueStrings(tendency?.evidenceRefs ?? []);
    if (!key || !label || tendency?.deterministic !== true) {
      throw new Error('Development tendency observations require deterministic key/label inputs.');
    }
    if (evidenceRefs.length === 0) {
      throw new Error(`Development tendency ${key} cannot become a profile observation without evidence refs.`);
    }

    return Object.freeze({
      key,
      label,
      stance: 'support',
      sourceClass: 'cross-project-tendency',
      evidenceRefs: Object.freeze(evidenceRefs)
    });
  }));
}

export function developerProfileToProfileObservations(profile) {
  if (!profile || profile.schema !== DEVELOPER_PROFILE_SCHEMA || !Array.isArray(profile.skills)) {
    throw new Error(`Expected ${DEVELOPER_PROFILE_SCHEMA}.`);
  }

  const observations = [];
  for (const capability of profile.skills) {
    const key = String(capability?.key ?? '').trim();
    const label = String(capability?.label ?? '').trim();
    if (!key || !label) throw new Error('DeveloperProfile capabilities require key and label.');

    const supportRefs = uniqueStrings(capability?.supportEvidenceRefs ?? []);
    const actorRefs = uniqueStrings(capability?.attribution?.actorEvidenceRefs ?? []);
    if (supportRefs.length > 0 || actorRefs.length > 0) {
      const actorLinked = actorRefs.length > 0 && capability?.attribution?.status !== 'repository-only';
      observations.push(Object.freeze({
        key,
        label,
        stance: 'support',
        sourceClass: actorLinked ? 'actor-evidence' : 'semantic-observation',
        evidenceRefs: Object.freeze(uniqueStrings(actorLinked ? [...supportRefs, ...actorRefs] : supportRefs))
      }));
    }

    const contradictionRefs = uniqueStrings((capability?.contradictions ?? []).flatMap((claim) => claim?.evidenceRefs ?? []));
    if (contradictionRefs.length > 0) {
      observations.push(Object.freeze({
        key,
        label,
        stance: 'contradict',
        sourceClass: 'semantic-observation',
        evidenceRefs: Object.freeze(contradictionRefs)
      }));
    }
  }

  return Object.freeze(observations);
}

export function buildProfileObservations({ developerProfile = null, developmentTendencies = null, extraObservations = [] } = {}) {
  if (!Array.isArray(extraObservations)) throw new Error('extraObservations must be an array.');
  const sources = [
    ...(developerProfile ? developerProfileToProfileObservations(developerProfile) : []),
    ...(developmentTendencies ? developmentTendenciesToProfileObservations(developmentTendencies) : []),
    ...extraObservations
  ];

  const deduped = new Map();
  for (const item of sources) {
    if (!item || !item.key || !item.stance || !item.sourceClass || !Array.isArray(item.evidenceRefs) || item.evidenceRefs.length === 0) {
      throw new Error('Profile observations require key, stance, sourceClass and at least one evidence ref.');
    }
    const normalized = Object.freeze({
      key: String(item.key).trim(),
      label: String(item.label ?? item.key).trim(),
      stance: item.stance,
      sourceClass: item.sourceClass,
      evidenceRefs: Object.freeze(uniqueStrings(item.evidenceRefs))
    });
    deduped.set(observationIdentity(normalized), normalized);
  }

  return Object.freeze([...deduped.values()].sort((a, b) => observationIdentity(a).localeCompare(observationIdentity(b))));
}
