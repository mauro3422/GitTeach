import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EvidenceLedger,
  appendRepoEvidenceBundle,
  repoEvidenceBundleToLedger
} from '../../src/core/index.js';

const bundle = {
  schema: 'giteach-repo-evidence-v1',
  repository: {
    name: 'demo',
    head_commit: 'abc123',
    head_commit_time: '2026-09-23T01:00:00-03:00'
  },
  coverage: {
    inventory: 'complete-policy-filtered',
    summary_scope: 'selected-content',
    known_path_count: 10
  },
  evidence: [{
    id: '0123456789abcdef01234567',
    path: 'src/main.rs',
    kind: 'source',
    source_hash: 'source-sha',
    excerpt_hash: 'ef32637cb9c3ec2e3968c9cbdf26a5e9c172be94f88af533e14bd43f892d5297',
    excerpt: 'fn main() {}',
    bytes: 12,
    metadata: { language: 'Rust' }
  }]
};

test('bundle adapter preserves provenance identity', () => {
  const ledger = repoEvidenceBundleToLedger(bundle);
  const [record] = ledger.list();
  assert.equal(record.id, bundle.evidence[0].id);
  assert.equal(record.repo, 'demo');
  assert.equal(record.commit, 'abc123');
  assert.equal(record.sourceHash, 'source-sha');
  assert.equal(record.excerptHash, bundle.evidence[0].excerpt_hash);
  assert.equal(record.observedAt, '2026-09-23T01:00:00-03:00');
  assert.equal(record.metadata.repoEvidenceId, bundle.evidence[0].id);
  assert.deepEqual(record.metadata.repositoryCoverage, bundle.coverage);
});

test('bundle adapter is deterministic', () => {
  const first = repoEvidenceBundleToLedger(bundle).toJSON();
  const second = repoEvidenceBundleToLedger(bundle).toJSON();
  assert.deepEqual(first, second);
});

test('bundle adapter rejects incompatible schemas', () => {
  assert.throws(
    () => repoEvidenceBundleToLedger({ ...bundle, schema: 'future-schema' }),
    /Expected giteach-repo-evidence-v1/
  );
});

test('bundle adapter can append into an existing ledger', () => {
  const ledger = new EvidenceLedger();
  const records = appendRepoEvidenceBundle(ledger, bundle);
  assert.equal(records.length, 1);
  assert.equal(ledger.get(bundle.evidence[0].id)?.path, 'src/main.rs');
});
