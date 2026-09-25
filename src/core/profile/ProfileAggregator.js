import { ACTOR_EVIDENCE_SCHEMA, actorEvidenceAppliesTo } from './ActorEvidence.js';
import { summarizeActorEvidence, summarizeAttribution } from './AttributionPolicy.js';

function normalizeKey(value) {
  return String(value ?? '').trim().toLowerCase();
}

function sortClaims(claims) {
  return [...claims].sort((a, b) => {
    const aConfidence = a.confidence ?? -1;
    const bConfidence = b.confidence ?? -1;
    if (aConfidence !== bConfidence) return bConfidence - aConfidence;
    return a.repository.localeCompare(b.repository);
  });
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined && value !== ''))];
}

function claimStance(claim) {
  const stance = claim.stance ?? 'support';
  if (stance !== 'support' && stance !== 'contradict') {
    throw new Error(`Unsupported semantic claim stance: ${stance}`);
  }
  return stance;
}

function latestObservedAt(records) {
  const timestamps = records
    .map((record) => record.observedAt)
    .filter(Boolean)
    .map((value) => Date.parse(value))
    .filter(Number.isFinite);
  if (timestamps.length === 0) return null;
  return new Date(Math.max(...timestamps)).toISOString();
}

function evidenceIsStale(record) {
  return record.metadata?.freshness === 'stale' || record.metadata?.stale === true;
}

export class ProfileAggregator {
  constructor({ ledger }) {
    if (!ledger) throw new Error('ProfileAggregator requires an EvidenceLedger.');
    this.ledger = ledger;
  }

  build({ developer, repositories = [], semanticClaims = [], actorKey = null, actorEvidence = [] }) {
    const normalizedActorKey = String(actorKey ?? '').trim();
    if (actorEvidence.length > 0 && !normalizedActorKey) {
      throw new Error('ProfileAggregator requires actorKey when actorEvidence is supplied.');
    }
    for (const record of actorEvidence) {
      if (record?.schema !== ACTOR_EVIDENCE_SCHEMA) {
        throw new Error(`Unsupported actor evidence schema: ${record?.schema ?? 'missing'}`);
      }
      for (const ref of record.targetEvidenceRefs ?? []) {
        if (!this.ledger.has(ref)) throw new Error(`Unknown actor evidence target: ${ref}`);
      }
    }

    const groups = new Map();

    for (const claim of semanticClaims) {
      const key = normalizeKey(claim.skill);
      if (!key) continue;
      const evidence = this.ledger.resolve(claim.evidenceRefs);
      const normalized = { ...claim, stance: claimStance(claim), evidence };
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(normalized);
    }

    const skills = [...groups.entries()].map(([key, claims]) => {
      const ordered = sortClaims(claims);
      const supporting = ordered.filter((claim) => claim.stance === 'support');
      const contradicting = ordered.filter((claim) => claim.stance === 'contradict');
      const allEvidence = ordered.flatMap((claim) => claim.evidence);
      const supportEvidence = supporting.flatMap((claim) => claim.evidence);
      const evidenceRefs = unique(allEvidence.map((record) => record.id));
      const supportEvidenceRefs = unique(supportEvidence.map((record) => record.id));
      const supportingRepositories = unique(supporting.map((claim) => claim.repository));
      const staleEvidenceRefs = unique(allEvidence.filter(evidenceIsStale).map((record) => record.id));
      const staleClaims = ordered.filter((claim) => claim.stale === true || claim.evidence.some(evidenceIsStale));
      const matchingActorEvidence = normalizedActorKey
        ? actorEvidence.filter((record) => record.actorKey === normalizedActorKey
          && supportingRepositories.includes(record.repository)
          && actorEvidenceAppliesTo({ record, capabilityKey: key, supportEvidenceRefs }))
        : [];
      const attribution = normalizedActorKey
        ? summarizeActorEvidence(matchingActorEvidence)
        : summarizeAttribution(supportEvidence);

      return {
        key,
        label: supporting[0]?.skill ?? ordered[0]?.skill ?? key,
        supportCount: supportEvidenceRefs.length,
        repositoryCount: supportingRepositories.length,
        repositories: supportingRepositories,
        evidenceDiversity: unique(supportEvidence.map((record) => record.kind)).sort(),
        latestEvidenceAt: latestObservedAt(supportEvidence),
        attribution,
        strongestConfidence: supporting.find((claim) => claim.confidence !== null && claim.confidence !== undefined)?.confidence ?? null,
        evidenceRefs,
        supportEvidenceRefs,
        staleEvidenceRefs,
        staleClaimCount: staleClaims.length,
        contradictions: contradicting.map(({ evidence, ...claim }) => ({ ...claim })),
        semanticClaims: ordered.map(({ evidence, ...claim }) => ({ ...claim }))
      };
    }).sort((a, b) => a.label.localeCompare(b.label));

    return {
      schema: 'giteach-developer-profile-v1',
      generatedAt: new Date().toISOString(),
      developer: { ...developer },
      repositories: repositories.map((repo) => ({ ...repo })),
      skills,
      evidenceLedger: this.ledger.toJSON()
    };
  }
}

export function explainSkill(profile, skill, ledger) {
  const key = normalizeKey(skill);
  const claim = profile.skills.find((item) => item.key === key);
  if (!claim) return null;
  return {
    skill: claim.label,
    repositories: claim.repositories,
    repositoryCount: claim.repositoryCount,
    evidenceDiversity: claim.evidenceDiversity,
    latestEvidenceAt: claim.latestEvidenceAt,
    attribution: claim.attribution,
    staleEvidenceRefs: claim.staleEvidenceRefs,
    contradictions: claim.contradictions,
    semanticClaims: claim.semanticClaims,
    evidence: ledger.resolve(claim.evidenceRefs)
  };
}
