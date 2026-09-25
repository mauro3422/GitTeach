import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  ACTOR_EVIDENCE_SCHEMA,
  actorEvidenceAppliesTo,
  createActorEvidence
} from '../../src/core/index.js';

test('ActorEvidence v1 captures bounded agency without raw prompt content', () => {
  const record = createActorEvidence({
    actorKey: 'developer:local',
    relation: 'agent-direction',
    repository: 'kode',
    sourceKind: 'agent-workflow',
    sourceRef: 'mssr:trace-123',
    observedAt: '2026-09-23T10:00:00.000Z',
    implementationOrigin: 'ai-assisted',
    capabilityKeys: ['Editor Kernel'],
    targetEvidenceRefs: ['ev-1'],
    summary: 'Directed an editor-kernel change and required verification before acceptance.'
  });

  assert.equal(record.schema, ACTOR_EVIDENCE_SCHEMA);
  assert.equal(record.relation, 'agent-direction');
  assert.equal(record.implementationOrigin, 'ai-assisted');
  assert.equal(Object.hasOwn(record, 'prompt'), false);
  assert.equal(Object.hasOwn(record, 'transcript'), false);
  assert.match(record.id, /^[a-f0-9]{24}$/);
});

test('ActorEvidence v1 requires an explicit attachment to a capability or evidence ref', () => {
  assert.throws(() => createActorEvidence({
    actorKey: 'developer:local',
    relation: 'reviewed-change',
    repository: 'kode',
    sourceKind: 'github',
    sourceRef: 'pr:42'
  }), /at least one capability key or target evidence ref/i);
});

test('actor evidence can attach by normalized capability or exact target evidence identity', () => {
  const record = createActorEvidence({
    actorKey: 'developer:local',
    relation: 'debug-session',
    repository: 'kode',
    sourceKind: 'work-session',
    sourceRef: 'session:debug-1',
    capabilityKeys: ['Selective Invalidation'],
    targetEvidenceRefs: ['ev-scroll']
  });

  assert.equal(actorEvidenceAppliesTo({ record, capabilityKey: 'selective invalidation' }), true);
  assert.equal(actorEvidenceAppliesTo({ record, capabilityKey: 'other', supportEvidenceRefs: ['ev-scroll'] }), true);
  assert.equal(actorEvidenceAppliesTo({ record, capabilityKey: 'other', supportEvidenceRefs: ['ev-other'] }), false);
});

test('ActorEvidence v1 rejects unknown relations and implementation origins', () => {
  assert.throws(() => createActorEvidence({
    actorKey: 'developer:local', relation: 'wrote-everything', repository: 'kode', sourceKind: 'git',
    sourceRef: 'commit:1', targetEvidenceRefs: ['ev-1']
  }), /unsupported actor relation/i);

  assert.throws(() => createActorEvidence({
    actorKey: 'developer:local', relation: 'authored-change', repository: 'kode', sourceKind: 'git',
    sourceRef: 'commit:1', targetEvidenceRefs: ['ev-1'], implementationOrigin: 'definitely-human'
  }), /unsupported implementation origin/i);
});


test('JS ActorEvidence v1 matches the shared schema fixture', () => {
  const schema = JSON.parse(readFileSync(new URL('../fixtures/actor-evidence-v1-schema.json', import.meta.url), 'utf8'));
  const record = createActorEvidence({
    actorKey: 'developer:local',
    relation: 'reviewed-change',
    repository: 'kode',
    sourceKind: 'github',
    sourceRef: 'pr:42',
    observedAt: '2026-09-23T10:00:00.000Z',
    implementationOrigin: 'mixed',
    targetEvidenceRefs: ['ev-1']
  });
  for (const field of schema.fields) assert.ok(Object.hasOwn(record, field), `missing actor evidence field ${field}`);
});
