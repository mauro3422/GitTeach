import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBoundedJevRequest, validateBoundedJevResponse } from '../../src/core/index.js';

const evidence = [{
  id: 'ev-1', path: 'src/main.rs', kind: 'source', subject: 'parser',
  excerpt: 'fn parse() {}', sourceHash: 'source', excerptHash: 'excerpt'
}];

function request() {
  return buildBoundedJevRequest({
    repository: { name: 'demo' }, evidence,
    question: 'Which capability is directly supported?'
  });
}

test('bounded request contains only provenance-bearing evidence fields', () => {
  const value = request();
  assert.equal(value.schema, 'giteach-jev-bounded-v1');
  assert.equal(value.evidence[0].ref, 'ev-1');
  assert.equal(value.evidence[0].sourceHash, 'source');
});

test('bounded response accepts explicit abstention', () => {
  const value = validateBoundedJevResponse({ abstain: true, reason: 'ambiguous' }, request());
  assert.equal(value.abstained, true);
  assert.deepEqual(value.claims, []);
});

test('bounded response preserves provider metadata and valid refs', () => {
  const value = validateBoundedJevResponse({
    provider: 'jev', model: 'system-one', responseId: 'r1',
    claims: [{ skill: 'Parsing', confidence: 0.8, evidenceRefs: ['ev-1'] }]
  }, request());
  assert.equal(value.model, 'system-one');
  assert.equal(value.responseId, 'r1');
  assert.deepEqual(value.claims[0].evidenceRefs, ['ev-1']);
});

test('bounded response rejects evidence refs outside supplied bundle', () => {
  assert.throws(() => validateBoundedJevResponse({
    claims: [{ skill: 'Invented', confidence: 0.9, evidenceRefs: ['missing'] }]
  }, request()), /outside request/);
});

test('bounded response rejects malformed confidence and ungrounded claims', () => {
  assert.throws(() => validateBoundedJevResponse({
    claims: [{ skill: 'Parsing', confidence: 4, evidenceRefs: ['ev-1'] }]
  }, request()), /between 0 and 1/);
  assert.throws(() => validateBoundedJevResponse({
    claims: [{ skill: 'Parsing', confidence: 0.5, evidenceRefs: [] }]
  }, request()), /requires evidence refs/);
});

test('bounded response rejects claims outside an explicit candidate set', () => {
  const bounded = buildBoundedJevRequest({
    repository: { name: 'demo' }, evidence,
    candidates: ['Rust'],
    question: 'Is the supplied capability supported?'
  });
  assert.throws(() => validateBoundedJevResponse({
    claims: [{ skill: 'React', confidence: 0.9, evidenceRefs: ['ev-1'] }]
  }, bounded), /outside supplied candidates/);
});


test('bounded request preserves candidate-specific evidence refs', () => {
  const bounded = buildBoundedJevRequest({
    repository: { name: 'demo' },
    evidence,
    candidates: ['Rust'],
    candidateEvidenceRefs: { Rust: ['ev-1'] },
    question: 'Is Rust directly supported?'
  });
  assert.deepEqual(bounded.candidateEvidenceRefs.Rust, ['ev-1']);
});

test('bounded request rejects invalid candidate-specific provenance', () => {
  assert.throws(() => buildBoundedJevRequest({
    repository: { name: 'demo' },
    evidence,
    candidates: ['Rust'],
    candidateEvidenceRefs: { Rust: ['missing'] },
    question: 'Is Rust directly supported?'
  }), /outside request/);

  assert.throws(() => buildBoundedJevRequest({
    repository: { name: 'demo' },
    evidence,
    candidates: ['Rust'],
    candidateEvidenceRefs: { React: ['ev-1'] },
    question: 'Is Rust directly supported?'
  }), /outside supplied set/);
});
