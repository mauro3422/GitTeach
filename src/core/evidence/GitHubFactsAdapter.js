import { EvidenceLedger } from './EvidenceLedger.js';
import { GITHUB_REPOSITORY_FACTS_SCHEMA } from '../github/GitHubRepositoryFacts.js';

function assertFacts(bundle) {
  if (bundle?.schema !== GITHUB_REPOSITORY_FACTS_SCHEMA || !Array.isArray(bundle.facts)) {
    throw new Error(`Expected ${GITHUB_REPOSITORY_FACTS_SCHEMA} facts.`);
  }
}

function observedAt(bundle, fact) {
  return fact.publishedAt
    ?? fact.mergedAt
    ?? fact.closedAt
    ?? fact.updatedAt
    ?? fact.createdAt
    ?? bundle.observedAt;
}

export function gitHubFactToLedgerInput(bundle, fact) {
  assertFacts(bundle);
  const fullName = bundle.repository.fullName;
  const virtualPath = fact.sourceRef ?? `github://${fullName}/${fact.kind}/${fact.sourceId}`;

  return {
    id: fact.factRef,
    repo: fullName,
    path: virtualPath,
    kind: `github-${fact.kind}`,
    subject: fact.actorLogin ?? fact.tagName ?? (fact.number == null ? null : `#${fact.number}`),
    commit: fact.metadata?.commitId ?? null,
    observedAt: observedAt(bundle, fact),
    metadata: {
      sourceKind: 'github',
      factKind: fact.kind,
      sourceId: fact.sourceId,
      number: fact.number,
      tagName: fact.tagName,
      state: fact.state,
      actorLogin: fact.actorLogin,
      draft: fact.draft,
      prerelease: fact.prerelease,
      sourceRef: fact.sourceRef,
      ...fact.metadata
    }
  };
}

export function appendGitHubRepositoryFacts(ledger, bundle) {
  if (!(ledger instanceof EvidenceLedger)) {
    throw new Error('appendGitHubRepositoryFacts requires an EvidenceLedger.');
  }
  assertFacts(bundle);
  return bundle.facts.map((fact) => ledger.append(gitHubFactToLedgerInput(bundle, fact)));
}
