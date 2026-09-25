import { EvidenceLedger } from './EvidenceLedger.js';

export const REPO_EVIDENCE_SCHEMA = 'giteach-repo-evidence-v1';

function assertBundle(bundle) {
  if (!bundle || bundle.schema !== REPO_EVIDENCE_SCHEMA) {
    throw new Error(`Expected ${REPO_EVIDENCE_SCHEMA} bundle.`);
  }
  if (!bundle.repository?.name || !Array.isArray(bundle.evidence)) {
    throw new Error('Repo evidence bundle requires repository.name and evidence[].');
  }
}

export function repoEvidenceRecordToLedgerInput(bundle, record) {
  const commit = bundle.repository.head_commit ?? null;
  const observedAt = bundle.repository.head_commit_time ?? null;
  return {
    id: record.id,
    repo: bundle.repository.name,
    path: record.path,
    kind: record.kind,
    subject: null,
    commit,
    sourceHash: record.source_hash ?? null,
    excerptHash: record.excerpt_hash ?? null,
    excerpt: record.excerpt ?? null,
    ...(observedAt ? { observedAt } : {}),
    metadata: {
      ...(record.metadata ?? {}),
      bytes: record.bytes,
      repoEvidenceSchema: bundle.schema,
      repoEvidenceId: record.id,
      repositoryCoverage: bundle.coverage ? { ...bundle.coverage } : {
        inventory: 'partial',
        summary_scope: 'selected-content',
        known_path_count: 0
      }
    }
  };
}
export function appendRepoEvidenceBundle(ledger, bundle) {
  if (!(ledger instanceof EvidenceLedger)) {
    throw new Error('appendRepoEvidenceBundle requires an EvidenceLedger.');
  }
  assertBundle(bundle);
  return bundle.evidence.map((record) =>
    ledger.append(repoEvidenceRecordToLedgerInput(bundle, record))
  );
}

export function repoEvidenceBundleToLedger(bundle) {
  const ledger = new EvidenceLedger();
  appendRepoEvidenceBundle(ledger, bundle);
  return ledger;
}
