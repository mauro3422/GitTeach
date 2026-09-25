import { createActorEvidence } from '../profile/ActorEvidence.js';
import { GITHUB_REPOSITORY_FACTS_SCHEMA } from './GitHubRepositoryFacts.js';

function sameLogin(left, right) {
  return Boolean(left && right && String(left).toLowerCase() === String(right).toLowerCase());
}

function factObservedAt(bundle, fact) {
  return fact.mergedAt
    ?? fact.closedAt
    ?? fact.updatedAt
    ?? fact.createdAt
    ?? fact.publishedAt
    ?? bundle.observedAt;
}

export function githubFactsToActorEvidence({ actorKey, bundle } = {}) {
  if (bundle?.schema !== GITHUB_REPOSITORY_FACTS_SCHEMA) {
    throw new Error(`Expected ${GITHUB_REPOSITORY_FACTS_SCHEMA} facts.`);
  }
  const connectedLogin = String(bundle.connectedLogin ?? '').trim();
  if (!connectedLogin) return [];

  const records = [];
  for (const fact of bundle.facts) {
    if (!sameLogin(fact.actorLogin, connectedLogin)) continue;

    if (fact.kind === 'pull-request') {
      records.push(createActorEvidence({
        actorKey,
        relation: 'authored-change',
        repository: bundle.repository.fullName,
        sourceKind: 'github',
        sourceRef: fact.factRef,
        observedAt: factObservedAt(bundle, fact),
        implementationOrigin: 'unknown',
        targetEvidenceRefs: [fact.factRef],
        summary: fact.number == null ? 'Authored a GitHub pull request.' : `Authored GitHub pull request #${fact.number}.`
      }));
      continue;
    }

    if (fact.kind === 'review') {
      const state = String(fact.state ?? '').toUpperCase();
      // GitHub pending reviews have not been submitted and do not carry
      // submitted_at. They are not observable review agency yet.
      if (state === 'PENDING' || !fact.createdAt) continue;
      records.push(createActorEvidence({
        actorKey,
        relation: 'reviewed-change',
        repository: bundle.repository.fullName,
        sourceKind: 'github',
        sourceRef: fact.factRef,
        observedAt: fact.createdAt,
        implementationOrigin: 'unknown',
        targetEvidenceRefs: [fact.factRef],
        summary: fact.number == null ? 'Submitted a GitHub pull request review.' : `Submitted a GitHub review on pull request #${fact.number}.`
      }));
    }
  }

  return records;
}
