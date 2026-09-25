import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EvidenceLedger, JevSemanticProvider, ProfileAggregator, createActorEvidence, explainSkill } from '../../src/core/index.js';

test('skill claims keep the exact evidence used to support them', async () => {
  const ledger = new EvidenceLedger();
  const benchmark = ledger.append({
    repo: 'asr-benchmark', path: 'app.py', kind: 'source', subject: 'ASR benchmark workflow',
    commit: 'abc123', excerpt: 'compute WER and transcription latency', metadata: { language: 'python' }
  });
  const reference = ledger.append({
    repo: 'asr-benchmark', path: 'reference-es.txt', kind: 'reference', subject: 'Spanish reference transcript',
    commit: 'abc123', excerpt: 'texto de referencia para evaluar la transcripcion'
  });

  const provider = new JevSemanticProvider({
    judge: async () => ({ claims: [{ skill: 'Automatic Speech Recognition (ASR)', confidence: 0.93,
      reason: 'The repository evaluates speech recognition against reference transcripts.',
      evidenceRefs: [benchmark.id, reference.id] }] })
  });
  const semanticClaims = await provider.inferProjectSemantics({
    repository: { name: 'asr-benchmark' },
    evidence: ledger.list(),
    candidates: ['Automatic Speech Recognition (ASR)'],
    candidateEvidenceRefs: {
      'Automatic Speech Recognition (ASR)': [benchmark.id, reference.id]
    }
  });
  assert.equal(semanticClaims[0].scope, 'project');
  assert.equal(semanticClaims[0].claimType, 'semantic-observation');

  const aggregator = new ProfileAggregator({ ledger });
  const profile = aggregator.build({
    developer: { username: 'mauro3422' },
    repositories: [{ name: 'asr-benchmark' }],
    semanticClaims
  });

  const explanation = explainSkill(profile, 'Automatic Speech Recognition (ASR)', ledger);
  assert.ok(explanation);
  assert.equal(explanation.evidence.length, 2);
  assert.deepEqual(new Set(explanation.evidence.map((item) => item.path)), new Set(['app.py', 'reference-es.txt']));
  assert.equal(profile.skills[0].supportCount, 2);
});

test('separate ActorEvidence links only the configured subject actor to personal attribution', () => {
  const ledger = new EvidenceLedger();
  const evidence = ledger.append({
    repo: 'repo-a', path: 'src/main.rs', kind: 'source', excerpt: 'pub fn run() {}'
  });
  const ownCommit = createActorEvidence({
    actorKey: 'developer:mauro', relation: 'authored-change', repository: 'repo-a', sourceKind: 'git',
    sourceRef: 'git:commit:abc', observedAt: '2026-09-23T10:00:00.000Z', targetEvidenceRefs: [evidence.id]
  });
  const otherAgency = createActorEvidence({
    actorKey: 'developer:other', relation: 'agent-direction', repository: 'repo-a', sourceKind: 'agent-workflow',
    sourceRef: 'mssr:other', observedAt: '2026-09-23T10:01:00.000Z', implementationOrigin: 'ai-assisted',
    targetEvidenceRefs: [evidence.id]
  });

  const profile = new ProfileAggregator({ ledger }).build({
    developer: { username: 'mauro' },
    actorKey: 'developer:mauro',
    actorEvidence: [ownCommit, otherAgency],
    semanticClaims: [{ skill: 'Rust', repository: 'repo-a', evidenceRefs: [evidence.id], confidence: 0.9 }]
  });

  assert.equal(profile.skills[0].attribution.status, 'identity-linked');
  assert.deepEqual(profile.skills[0].attribution.actorEvidenceRefs, [ownCommit.id]);
  assert.deepEqual(profile.skills[0].attribution.actorRelations, ['authored-change']);
  assert.deepEqual(profile.skills[0].attribution.implementationOrigins, ['unknown']);
});

test('ActorEvidence mode requires an explicit subject actor key', () => {
  const ledger = new EvidenceLedger();
  const evidence = ledger.append({ repo: 'repo-a', path: 'src/a.js', kind: 'source', excerpt: 'x' });
  const actor = createActorEvidence({
    actorKey: 'developer:mauro', relation: 'authored-change', repository: 'repo-a', sourceKind: 'git',
    sourceRef: 'git:commit:abc', targetEvidenceRefs: [evidence.id]
  });
  assert.throws(() => new ProfileAggregator({ ledger }).build({
    actorEvidence: [actor],
    semanticClaims: [{ skill: 'JavaScript', repository: 'repo-a', evidenceRefs: [evidence.id], confidence: 0.9 }]
  }), /requires actorKey/i);
});

test('profile aggregation rejects semantic claims with missing evidence', () => {
  const ledger = new EvidenceLedger();
  const aggregator = new ProfileAggregator({ ledger });
  assert.throws(() => aggregator.build({
    developer: { username: 'mauro3422' },
    semanticClaims: [{ skill: 'ASR', repository: 'x', evidenceRefs: ['missing'], confidence: 0.9 }]
  }), /Unknown evidence reference/);
});


test('DeveloperProfile v1 tracks independent repositories, evidence diversity, recency, stale evidence and contradictions without expertise scoring', () => {
  const ledger = new EvidenceLedger();
  const sourceA = ledger.append({
    repo: 'repo-a', path: 'src/index.js', kind: 'source', subject: 'TypeScript runtime',
    commit: 'a1', excerpt: 'export const value = 1', observedAt: '2026-09-20T10:00:00.000Z',
    metadata: { freshness: 'current' }
  });
  const testB = ledger.append({
    repo: 'repo-b', path: 'tests/core.test.ts', kind: 'test', subject: 'TypeScript tests',
    commit: 'b1', excerpt: 'test("works", () => {})', observedAt: '2026-09-22T12:00:00.000Z',
    metadata: { freshness: 'current' }
  });
  const staleDoc = ledger.append({
    repo: 'repo-old', path: 'README.md', kind: 'documentation', subject: 'Old TypeScript note',
    commit: 'old1', excerpt: 'TypeScript experiment', observedAt: '2026-08-01T09:00:00.000Z',
    metadata: { freshness: 'stale' }
  });
  const contradiction = ledger.append({
    repo: 'repo-c', path: 'package.json', kind: 'manifest', subject: 'JavaScript-only package',
    commit: 'c1', excerpt: '{"type":"module"}', observedAt: '2026-09-21T08:00:00.000Z'
  });

  const profile = new ProfileAggregator({ ledger }).build({
    developer: { username: 'dev' },
    repositories: [{ name: 'repo-a' }, { name: 'repo-b' }, { name: 'repo-c' }],
    semanticClaims: [
      { skill: 'TypeScript', repository: 'repo-a', evidenceRefs: [sourceA.id], confidence: 0.91 },
      { skill: 'TypeScript', repository: 'repo-b', evidenceRefs: [testB.id], confidence: 0.82 },
      { skill: 'TypeScript', repository: 'repo-old', evidenceRefs: [staleDoc.id], confidence: 0.77, stale: true },
      { skill: 'TypeScript', repository: 'repo-c', evidenceRefs: [contradiction.id], confidence: 0.8, stance: 'contradict', reason: 'No TypeScript evidence in this bounded package state.' }
    ]
  });

  const skill = profile.skills[0];
  assert.equal(profile.schema, 'giteach-developer-profile-v1');
  assert.equal(skill.repositoryCount, 3);
  assert.deepEqual(skill.repositories, ['repo-a', 'repo-b', 'repo-old']);
  assert.deepEqual(skill.evidenceDiversity, ['documentation', 'source', 'test']);
  assert.equal(skill.latestEvidenceAt, '2026-09-22T12:00:00.000Z');
  assert.equal(skill.staleClaimCount, 1);
  assert.deepEqual(skill.staleEvidenceRefs, [staleDoc.id]);
  assert.equal(skill.contradictions.length, 1);
  assert.equal(skill.contradictions[0].repository, 'repo-c');
  assert.equal('expertiseScore' in skill, false);
  assert.equal('seniority' in skill, false);

  const explanation = explainSkill(profile, 'typescript', ledger);
  assert.equal(explanation.repositoryCount, 3);
  assert.equal(explanation.evidence.length, 4);
  assert.equal(explanation.contradictions.length, 1);
});

test('profile aggregation rejects unsupported contradiction stance', () => {
  const ledger = new EvidenceLedger();
  const evidence = ledger.append({ repo: 'x', path: 'x.js', kind: 'source', excerpt: 'x' });
  const aggregator = new ProfileAggregator({ ledger });
  assert.throws(() => aggregator.build({
    semanticClaims: [{ skill: 'JavaScript', repository: 'x', evidenceRefs: [evidence.id], stance: 'maybe' }]
  }), /Unsupported semantic claim stance/);
});
test('JS DeveloperProfile matches the shared v1 schema fixture', () => {
  const schema = JSON.parse(readFileSync(new URL('../fixtures/developer-profile-v1-schema.json', import.meta.url), 'utf8'));
  const ledger = new EvidenceLedger();
  const evidence = ledger.append({ repo: 'repo-a', path: 'src/a.js', kind: 'source', excerpt: 'export const a = 1' });
  const profile = new ProfileAggregator({ ledger }).build({
    semanticClaims: [{ skill: 'JavaScript', repository: 'repo-a', evidenceRefs: [evidence.id], confidence: 0.9 }]
  });
  for (const field of schema.profileFields) {
    assert.ok(Object.hasOwn(profile, field), `missing profile field ${field}`);
  }
  for (const field of schema.skillFields) {
    assert.ok(Object.hasOwn(profile.skills[0], field), `missing skill field ${field}`);
  }
  for (const field of schema.attributionFields) {
    assert.ok(Object.hasOwn(profile.skills[0].attribution, field), `missing attribution field ${field}`);
  }
});