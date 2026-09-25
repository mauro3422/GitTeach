import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ATTRIBUTION_STATUS,
  EvidenceLedger,
  summarizeAttribution
} from '../../src/core/index.js';

function evidence(metadata = {}) {
  const ledger = new EvidenceLedger();
  return ledger.append({
    repo: 'repo',
    path: 'src/file.ts',
    kind: 'source',
    excerpt: 'export const value = 1',
    metadata
  });
}

test('repository evidence alone does not establish personal attribution', () => {
  const record = evidence({ language: 'typescript' });
  const attribution = summarizeAttribution([record]);
  assert.equal(attribution.status, ATTRIBUTION_STATUS.REPOSITORY_ONLY);
  assert.deepEqual(attribution.actorEvidenceRefs, []);
});

test('git authored-change links identity but does not imply manual implementation origin', () => {
  const record = evidence({ actorRelation: 'authored-change' });
  const attribution = summarizeAttribution([record]);
  assert.equal(attribution.status, ATTRIBUTION_STATUS.IDENTITY_LINKED);
  assert.deepEqual(attribution.actorRelations, ['authored-change']);
  assert.deepEqual(attribution.implementationOrigins, ['unknown']);
});

test('agent direction is agency evidence and may explicitly retain AI-assisted provenance', () => {
  const record = evidence({ actorRelation: 'agent-direction', implementationOrigin: 'ai-assisted' });
  const attribution = summarizeAttribution([record]);
  assert.equal(attribution.status, ATTRIBUTION_STATUS.AGENCY_SUPPORTED);
  assert.deepEqual(attribution.actorEvidenceRefs, [record.id]);
  assert.deepEqual(attribution.actorRelations, ['agent-direction']);
  assert.deepEqual(attribution.implementationOrigins, ['ai-assisted']);
});

test('manual confirmation is kept distinct from observed agency evidence', () => {
  const record = evidence({ actorRelation: 'manual-confirmation', implementationOrigin: 'mixed' });
  const attribution = summarizeAttribution([record]);
  assert.equal(attribution.status, ATTRIBUTION_STATUS.USER_CONFIRMED);
  assert.deepEqual(attribution.implementationOrigins, ['mixed']);
});

test('unknown actor metadata cannot promote a repository fact into personal experience', () => {
  const record = evidence({ actorRelation: 'magic-owner', implementationOrigin: 'human' });
  const attribution = summarizeAttribution([record]);
  assert.equal(attribution.status, ATTRIBUTION_STATUS.REPOSITORY_ONLY);
  assert.deepEqual(attribution.actorRelations, []);
  assert.deepEqual(attribution.implementationOrigins, []);
});


test('observed agency takes precedence over self-confirmation when both exist', () => {
  const confirmed = evidence({ actorRelation: 'manual-confirmation', implementationOrigin: 'unknown' });
  const directed = evidence({ actorRelation: 'agent-direction', implementationOrigin: 'ai-assisted' });
  const attribution = summarizeAttribution([confirmed, directed]);
  assert.equal(attribution.status, ATTRIBUTION_STATUS.AGENCY_SUPPORTED);
  assert.deepEqual(new Set(attribution.actorRelations), new Set(['manual-confirmation', 'agent-direction']));
});
