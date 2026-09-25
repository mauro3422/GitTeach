import { ATTRIBUTION_STATUS, isPersonalAttribution } from '../profile/AttributionPolicy.js';

export const DOCUMENT_INPUT_SCHEMA = 'giteach-document-input-v1';

export const DOCUMENT_TARGETS = Object.freeze([
  'github-profile-readme',
  'project-readme-summary',
  'portfolio-card',
  'linkedin-project',
  'linkedin-skills',
  'cv-evidence'
]);

export const PERSONAL_DOCUMENT_TARGETS = Object.freeze([
  'github-profile-readme',
  'portfolio-card',
  'linkedin-project',
  'linkedin-skills',
  'cv-evidence'
]);

const TARGET_SET = new Set(DOCUMENT_TARGETS);
const PERSONAL_TARGET_SET = new Set(PERSONAL_DOCUMENT_TARGETS);

function unique(values) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined && value !== ''))];
}

function repositoryName(repository) {
  if (typeof repository === 'string') return repository;
  return repository?.name ?? repository?.repository ?? null;
}

function toEvidenceSummary(record) {
  return {
    id: record.id,
    repo: record.repo,
    path: record.path,
    kind: record.kind,
    subject: record.subject ?? null,
    commit: record.commit ?? null,
    sourceHash: record.sourceHash ?? null,
    excerptHash: record.excerptHash ?? null,
    observedAt: record.observedAt ?? null,
    actorRelation: record.metadata?.actorRelation ?? null,
    implementationOrigin: record.metadata?.implementationOrigin ?? null
  };
}

function toSupportingStatement(claim) {
  return {
    repository: claim.repository,
    reason: claim.reason ?? null,
    evidenceRefs: [...claim.evidenceRefs]
  };
}

function normalizeAttribution(skill) {
  return {
    status: skill.attribution?.status ?? ATTRIBUTION_STATUS.REPOSITORY_ONLY,
    actorEvidenceRefs: [...(skill.attribution?.actorEvidenceRefs ?? [])],
    actorRelations: [...(skill.attribution?.actorRelations ?? [])],
    implementationOrigins: [...(skill.attribution?.implementationOrigins ?? [])]
  };
}

export function prepareDocumentInput({ profile, ledger, target, skillKeys = null }) {
  if (profile?.schema !== 'giteach-developer-profile-v1') {
    throw new Error('Document preparation requires giteach-developer-profile-v1.');
  }
  if (!ledger) throw new Error('Document preparation requires an EvidenceLedger.');
  if (!TARGET_SET.has(target)) throw new Error(`Unsupported document target: ${target}`);

  const requested = skillKeys === null ? null : new Set(skillKeys.map((key) => String(key).trim().toLowerCase()));
  const personalTarget = PERSONAL_TARGET_SET.has(target);
  const claims = [];

  for (const skill of profile.skills ?? []) {
    if (requested && !requested.has(skill.key)) continue;
    if ((skill.supportEvidenceRefs?.length ?? 0) === 0) continue;

    const attribution = normalizeAttribution(skill);
    if (personalTarget && !isPersonalAttribution(attribution.status)) continue;

    const evidence = ledger.resolve(skill.supportEvidenceRefs);
    const supportingStatements = (skill.semanticClaims ?? [])
      .filter((claim) => (claim.stance ?? 'support') === 'support')
      .map(toSupportingStatement);

    claims.push({
      key: skill.key,
      label: skill.label,
      repositories: [...skill.repositories],
      evidenceDiversity: [...skill.evidenceDiversity],
      latestEvidenceAt: skill.latestEvidenceAt ?? null,
      attribution,
      evidenceRefs: [...skill.supportEvidenceRefs],
      evidence: evidence.map(toEvidenceSummary),
      supportingStatements,
      cautions: {
        hasStaleEvidence: (skill.staleEvidenceRefs?.length ?? 0) > 0,
        staleEvidenceRefs: [...(skill.staleEvidenceRefs ?? [])],
        hasContradictions: (skill.contradictions?.length ?? 0) > 0,
        contradictionCount: skill.contradictions?.length ?? 0,
        personalAttributionMissing: attribution.status === ATTRIBUTION_STATUS.REPOSITORY_ONLY,
        identityOnly: attribution.status === ATTRIBUTION_STATUS.IDENTITY_LINKED,
        aiAssistanceObserved: attribution.implementationOrigins.some((origin) => origin === 'ai-assisted' || origin === 'mixed')
      }
    });
  }

  return {
    schema: DOCUMENT_INPUT_SCHEMA,
    target,
    developer: { ...(profile.developer ?? {}) },
    repositories: unique((profile.repositories ?? []).map(repositoryName)),
    claims
  };
}
