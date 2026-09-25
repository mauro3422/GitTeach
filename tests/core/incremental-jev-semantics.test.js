import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  EvidenceLedger,
  IncrementalJevSemanticProvider,
  JEV_OBSERVATION_SCHEMA,
  planIncrementalJevSemantics
} from '../../src/core/index.js';

function fixture() {
  const ledger = new EvidenceLedger();
  const rust = ledger.append({
    repo: 'kode', path: 'src-tauri/src/lib.rs', kind: 'source', subject: 'Rust command runtime',
    excerpt: 'pub fn run() {}'
  });
  const react = ledger.append({
    repo: 'kode', path: 'src/ui.tsx', kind: 'source', subject: 'React surface',
    excerpt: 'export function App() { return <main />; }'
  });
  return { ledger, refs: { Rust: [rust.id], React: [react.id] }, records: { rust, react } };
}

function supportedJudge(calls) {
  return async ({ state }) => {
    calls.push(state);
    const candidate = state.candidates[0];
    return {
      provider: 'fake-jev',
      model: 'jev-test-1',
      responseId: `response-${calls.length}`,
      observedAt: '2026-09-23T23:00:00.000Z',
      usage: { input_tokens: 10, output_tokens: 1 },
      claims: [{
        skill: candidate,
        confidence: 0.9,
        evidenceRefs: [...state.candidateEvidenceRefs[candidate]],
        distribution: { supported: 0.9, unsupported: 0.1 }
      }]
    };
  };
}

test('incremental Jev isolates one candidate and only its evidence per provider call', async () => {
  const { ledger, refs } = fixture();
  const calls = [];
  const provider = new IncrementalJevSemanticProvider({
    judge: supportedJudge(calls),
    providerPolicyKey: 'fake-jev:test-policy-v1'
  });

  const result = await provider.inferProjectSemantics({
    repository: { name: 'kode' },
    evidence: ledger.list(),
    candidates: ['Rust', 'React'],
    candidateEvidenceRefs: refs
  });

  assert.equal(calls.length, 2);
  assert.deepEqual(calls.map((state) => state.candidates), [['Rust'], ['React']]);
  assert.deepEqual(calls[0].evidence.map((item) => item.ref), refs.Rust);
  assert.deepEqual(calls[1].evidence.map((item) => item.ref), refs.React);
  assert.deepEqual(result.claims.map((claim) => claim.skill), ['Rust', 'React']);
  assert.ok(result.observations.every((item) => item.schema === JEV_OBSERVATION_SCHEMA));
});

test('exact second pass reuses observations and unrelated evidence does not rerun Jev', async () => {
  const { ledger, refs } = fixture();
  const calls = [];
  const provider = new IncrementalJevSemanticProvider({
    judge: supportedJudge(calls),
    providerPolicyKey: 'fake-jev:test-policy-v1'
  });

  const first = await provider.inferProjectSemantics({
    repository: { name: 'kode' }, evidence: ledger.list(), candidates: ['Rust', 'React'], candidateEvidenceRefs: refs
  });
  assert.equal(calls.length, 2);

  const second = await provider.inferProjectSemantics({
    repository: { name: 'kode' }, evidence: ledger.list(), candidates: ['Rust', 'React'], candidateEvidenceRefs: refs,
    previousObservations: first.observations
  });
  assert.equal(calls.length, 2);
  assert.deepEqual(second.plan.reusableCandidates, ['Rust', 'React']);
  assert.deepEqual(second.plan.refreshCandidates, []);

  ledger.append({ repo: 'kode', path: 'docs/unrelated.md', kind: 'documentation', excerpt: 'unrelated release note' });
  const third = await provider.inferProjectSemantics({
    repository: { name: 'kode' }, evidence: ledger.list(), candidates: ['Rust', 'React'], candidateEvidenceRefs: refs,
    previousObservations: second.observations
  });
  assert.equal(calls.length, 2);
  assert.deepEqual(third.plan.reusableCandidates, ['Rust', 'React']);
});

test('changing one candidate evidence slice refreshes only that candidate', async () => {
  const { ledger, refs, records } = fixture();
  const calls = [];
  const provider = new IncrementalJevSemanticProvider({
    judge: supportedJudge(calls),
    providerPolicyKey: 'fake-jev:test-policy-v1'
  });

  const first = await provider.inferProjectSemantics({
    repository: { name: 'kode' }, evidence: ledger.list(), candidates: ['Rust', 'React'], candidateEvidenceRefs: refs
  });
  assert.equal(calls.length, 2);

  const current = new EvidenceLedger();
  const changedRust = current.append({
    repo: 'kode', path: 'src-tauri/src/lib.rs', kind: 'source', subject: 'Rust command runtime',
    excerpt: 'pub fn run() { println!("changed"); }'
  });
  current.append(records.react);

  const second = await provider.inferProjectSemantics({
    repository: { name: 'kode' },
    evidence: current.list(),
    candidates: ['Rust', 'React'],
    candidateEvidenceRefs: { Rust: [changedRust.id], React: refs.React },
    previousObservations: first.observations
  });

  assert.equal(calls.length, 3);
  assert.deepEqual(second.plan.refreshCandidates, ['Rust']);
  assert.deepEqual(second.plan.reusableCandidates, ['React']);
  assert.equal(second.plan.candidatePlans.find((item) => item.candidate === 'Rust').reason, 'evidence-changed');
});

test('provider policy change invalidates otherwise identical observations', async () => {
  const { ledger, refs } = fixture();
  const calls = [];
  const firstProvider = new IncrementalJevSemanticProvider({
    judge: supportedJudge(calls), providerPolicyKey: 'fake-jev:test-policy-v1'
  });
  const first = await firstProvider.inferProjectSemantics({
    repository: { name: 'kode' }, evidence: ledger.list(), candidates: ['Rust'], candidateEvidenceRefs: refs
  });
  assert.equal(calls.length, 1);

  const secondProvider = new IncrementalJevSemanticProvider({
    judge: supportedJudge(calls), providerPolicyKey: 'fake-jev:test-policy-v2'
  });
  const second = await secondProvider.inferProjectSemantics({
    repository: { name: 'kode' }, evidence: ledger.list(), candidates: ['Rust'], candidateEvidenceRefs: refs,
    previousObservations: first.observations
  });

  assert.equal(calls.length, 2);
  assert.deepEqual(second.plan.refreshCandidates, ['Rust']);
  assert.equal(second.plan.candidatePlans[0].reason, 'provider-policy-changed');
});

test('explicit candidate with no selected evidence is skipped without a provider call', () => {
  const { ledger } = fixture();
  const plan = planIncrementalJevSemantics({
    repository: { name: 'kode' },
    evidence: ledger.list(),
    candidates: ['Kubernetes'],
    candidateEvidenceRefs: { Kubernetes: [] },
    previousObservations: [],
    providerPolicyKey: 'fake-jev:test-policy-v1'
  });

  assert.deepEqual(plan.skippedCandidates, ['Kubernetes']);
  assert.deepEqual(plan.refreshCandidates, []);
  assert.equal(plan.candidatePlans[0].reason, 'no-candidate-evidence');
});


test('JevObservation v1 matches the shared persistence schema fixture', async () => {
  const { ledger, refs } = fixture();
  const calls = [];
  const provider = new IncrementalJevSemanticProvider({
    judge: supportedJudge(calls),
    providerPolicyKey: 'fake-jev:test-policy-v1'
  });
  const result = await provider.inferProjectSemantics({
    repository: { name: 'kode' },
    evidence: ledger.list(),
    candidates: ['Rust'],
    candidateEvidenceRefs: refs
  });
  const observation = result.observations[0];
  const schema = JSON.parse(readFileSync(new URL('../fixtures/jev-observation-v1-schema.json', import.meta.url), 'utf8'));

  for (const field of schema.observationFields) assert.ok(Object.hasOwn(observation, field), `missing observation field ${field}`);
  for (const field of schema.evidenceIdentityFields) assert.ok(Object.hasOwn(observation.evidenceIdentity[0], field), `missing evidenceIdentity field ${field}`);
  for (const field of schema.outcomeFields) assert.ok(Object.hasOwn(observation.outcome, field), `missing outcome field ${field}`);
  for (const field of schema.claimFields) assert.ok(Object.hasOwn(observation.outcome.claims[0], field), `missing claim field ${field}`);
});


test('bounded observation age refreshes an exact cached input instead of reusing it forever', async () => {
  const { ledger, refs } = fixture();
  const calls = [];
  const seedProvider = new IncrementalJevSemanticProvider({
    judge: supportedJudge(calls),
    providerPolicyKey: 'fake-jev:floating-model',
    now: () => Date.parse('2026-09-23T23:00:00.000Z')
  });
  const first = await seedProvider.inferProjectSemantics({
    repository: { name: 'kode' }, evidence: ledger.list(), candidates: ['Rust'], candidateEvidenceRefs: refs
  });
  assert.equal(calls.length, 1);

  const refreshProvider = new IncrementalJevSemanticProvider({
    judge: supportedJudge(calls),
    providerPolicyKey: 'fake-jev:floating-model',
    maxObservationAgeMs: 5 * 60 * 1000,
    now: () => Date.parse('2026-09-23T23:10:00.000Z')
  });
  const second = await refreshProvider.inferProjectSemantics({
    repository: { name: 'kode' }, evidence: ledger.list(), candidates: ['Rust'], candidateEvidenceRefs: refs,
    previousObservations: first.observations
  });

  assert.equal(calls.length, 2);
  assert.deepEqual(second.plan.refreshCandidates, ['Rust']);
  assert.equal(second.plan.candidatePlans[0].reason, 'provider-refresh-due');
});

test('invalid observation age policy fails closed', () => {
  assert.throws(() => new IncrementalJevSemanticProvider({
    judge: async () => ({ abstain: true }),
    providerPolicyKey: 'fake-jev:test',
    maxObservationAgeMs: -1
  }), /maxObservationAgeMs/);
});
