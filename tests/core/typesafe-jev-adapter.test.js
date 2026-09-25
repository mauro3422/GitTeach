import test from 'node:test';
import assert from 'node:assert/strict';
import { TypeSafeJevAdapter, buildBoundedJevRequest } from '../../src/core/index.js';

const evidence = [{
  id: 'ev-1', path: 'src/main.rs', kind: 'source', subject: 'parser',
  excerpt: 'fn parse() {}', sourceHash: 'source', excerptHash: 'excerpt'
}];

function bounded(candidates = ['Rust', 'React']) {
  return buildBoundedJevRequest({
    repository: { name: 'demo' },
    evidence,
    candidates,
    question: 'Which supplied capabilities are directly supported?'
  });
}

function response(payload, { ok = true, status = 200, requestId = 'req-1' } = {}) {
  return {
    ok, status,
    headers: { get: (name) => name === 'x-request-id' ? requestId : null },
    json: async () => payload
  };
}

test('maps candidate capabilities to TypeSafe Noul questions and preserves provenance', async () => {
  let sent;
  const adapter = new TypeSafeJevAdapter({
    apiKey: 'test-key',
    observedAt: () => '2026-09-23T12:00:00.000Z',
    fetchImpl: async (_url, options) => {
      sent = JSON.parse(options.body);
      return response({
        model: 'jev-1.13.0',
        answers: {
          skill_0: { type: 'noul', noul: 0.94 },
          skill_1: { type: 'noul', noul: 0.08 }
        },
        usage: { input_tokens: 123, output_tokens: 10 }
      });
    }
  });

  const result = await adapter.judge({ state: bounded() });
  assert.equal(sent.model, 'jev-latest');
  assert.equal(sent.questions.skill_0.type, 'noul');
  assert.equal(sent.questions.skill_0.instructions.candidate_capability, 'Rust');
  assert.deepEqual(result.claims.map((claim) => claim.skill), ['Rust']);
  assert.deepEqual(result.claims[0].evidenceRefs, ['ev-1']);
  assert.equal(result.claims[0].confidence, 0.94);
  assert.equal(result.model, 'jev-1.13.0');
  assert.equal(result.responseId, 'req-1');
  assert.deepEqual(result.usage, { input_tokens: 123, output_tokens: 10 });
});

test('abstains without a provider call when there are no candidates', async () => {
  let calls = 0;
  const adapter = new TypeSafeJevAdapter({
    apiKey: 'test-key',
    fetchImpl: async () => { calls += 1; throw new Error('should not call'); }
  });
  const result = await adapter.judge({ state: bounded([]) });
  assert.equal(calls, 0);
  assert.equal(result.abstain, true);
  assert.equal(result.reason, 'no-candidates');
});

test('abstains when no candidate reaches the acceptance threshold', async () => {
  const adapter = new TypeSafeJevAdapter({
    apiKey: 'test-key',
    fetchImpl: async () => response({
      model: 'jev-1.13.0',
      answers: {
        skill_0: { type: 'noul', noul: 0.51 },
        skill_1: { type: 'noul', noul: 0.2 }
      },
      usage: { input_tokens: 100, output_tokens: 10 }
    })
  });
  const result = await adapter.judge({ state: bounded() });
  assert.equal(result.abstain, true);
  assert.deepEqual(result.claims, []);
});

test('rejects malformed provider output', async () => {
  const adapter = new TypeSafeJevAdapter({
    apiKey: 'test-key',
    fetchImpl: async () => response({ model: 'jev-1.13.0', answers: { skill_0: { type: 'choice' } } })
  });
  await assert.rejects(() => adapter.judge({ state: bounded(['Rust']) }), /malformed Noul answer/);
});

test('surfaces provider HTTP errors without leaking response bodies', async () => {
  const adapter = new TypeSafeJevAdapter({
    apiKey: 'test-key',
    fetchImpl: async () => response({}, { ok: false, status: 429 })
  });
  await assert.rejects(() => adapter.judge({ state: bounded(['Rust']) }), /HTTP 429/);
});

test('turns aborts into an explicit timeout error', async () => {
  const adapter = new TypeSafeJevAdapter({
    apiKey: 'test-key',
    timeoutMs: 5,
    fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      });
    })
  });
  await assert.rejects(() => adapter.judge({ state: bounded(['Rust']) }), /timed out/);
});


test('candidate-specific evidence refs are sent to TypeSafe and preserved on accepted claims', async () => {
  const extraEvidence = [
    ...evidence,
    { id: 'ev-2', path: 'src/ui.ts', kind: 'source', subject: 'ui', excerpt: 'const ui = true', sourceHash: 's2', excerptHash: 'e2' }
  ];
  let sent;
  const boundedRequest = buildBoundedJevRequest({
    repository: { name: 'demo' },
    evidence: extraEvidence,
    candidates: ['Rust', 'React'],
    candidateEvidenceRefs: { Rust: ['ev-1'], React: ['ev-2'] },
    question: 'Which supplied capabilities are directly supported?'
  });
  const adapter = new TypeSafeJevAdapter({
    apiKey: 'test-key',
    fetchImpl: async (_url, options) => {
      sent = JSON.parse(options.body);
      return response({
        model: 'jev-1.13.0',
        answers: {
          skill_0: { type: 'noul', noul: 0.94 },
          skill_1: { type: 'noul', noul: 0.1 }
        }
      });
    }
  });

  const result = await adapter.judge({ state: boundedRequest });
  assert.deepEqual(sent.state.candidateEvidenceRefs.Rust, ['ev-1']);
  assert.deepEqual(sent.questions.skill_0.instructions.evidence_refs, ['ev-1']);
  assert.deepEqual(result.claims[0].evidenceRefs, ['ev-1']);
});


test('semantic policy key changes with model or acceptance threshold', () => {
  const base = new TypeSafeJevAdapter({ apiKey: 'test-key', model: 'jev-a', acceptThreshold: 0.75 });
  const thresholdChanged = new TypeSafeJevAdapter({ apiKey: 'test-key', model: 'jev-a', acceptThreshold: 0.8 });
  const modelChanged = new TypeSafeJevAdapter({ apiKey: 'test-key', model: 'jev-b', acceptThreshold: 0.75 });

  assert.notEqual(base.getSemanticPolicyKey(), thresholdChanged.getSemanticPolicyKey());
  assert.notEqual(base.getSemanticPolicyKey(), modelChanged.getSemanticPolicyKey());
  assert.match(base.getSemanticPolicyKey(), /threshold=0\.75/);
});

test('explicit empty candidate-specific refs cannot become an accepted claim', async () => {
  const boundedRequest = buildBoundedJevRequest({
    repository: { name: 'demo' },
    evidence,
    candidates: ['Kubernetes'],
    candidateEvidenceRefs: { Kubernetes: [] },
    question: 'Is Kubernetes directly supported?'
  });
  const adapter = new TypeSafeJevAdapter({
    apiKey: 'test-key',
    fetchImpl: async () => response({
      model: 'jev-1.13.0',
      answers: { skill_0: { type: 'noul', noul: 0.99 } }
    })
  });

  const result = await adapter.judge({ state: boundedRequest });
  assert.equal(result.abstain, true);
  assert.deepEqual(result.claims, []);
});
