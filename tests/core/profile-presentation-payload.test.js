import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  PROFILE_PRESENTATION_PAYLOAD_SCHEMA,
  PROFILE_PUBLICATION_CONTEXT_SCHEMA,
  TECHNOLOGY_EVOLUTION_SCHEMA,
  buildProfileStatistics,
  prepareProfilePresentationPayload
} from '../../src/core/index.js';

function evolution(repository, commit = 'aaaa') {
  return {
    schema: TECHNOLOGY_EVOLUTION_SCHEMA,
    repository,
    source: 'git-local-tree',
    headCommit: commit,
    commitCount: 1,
    snapshotCount: 1,
    sampling: { strategy: 'evenly-spaced-commits-v1', maxSnapshots: 12, completeHistory: true },
    snapshots: [{ commit, committedAt: '2026-09-24T10:00:00Z', sourceFileCount: 1, languages: [{ language: 'Rust', files: 1, bytes: 100 }] }],
    deterministic: true
  };
}

function publication(overrides = {}) {
  return {
    schema: PROFILE_PUBLICATION_CONTEXT_SCHEMA,
    actorKey: 'developer:mauro',
    declarations: [{
      id: 'decl-1', category: 'development-tendency', key: 'automation',
      value: 'I deliberately automate repetitive development work.', sourceKind: 'user-answer', repositories: ['kode'],
      authorizationRef: 'must-not-leak'
    }],
    ...overrides
  };
}

test('presentation payload keeps statistics, history and approved self-report as separate planes', () => {
  const payload = prepareProfilePresentationPayload({
    actorKey: 'developer:mauro',
    statistics: buildProfileStatistics(),
    technologyEvolution: [evolution('kode'), evolution('GitTeach', 'bbbb')],
    publicationContext: publication()
  });

  assert.equal(payload.schema, PROFILE_PRESENTATION_PAYLOAD_SCHEMA);
  assert.equal(payload.actorKey, 'developer:mauro');
  assert.equal(payload.statistics.schema, 'giteach-profile-statistics-v1');
  assert.deepEqual(payload.technologyEvolution.map((item) => item.repository), ['GitTeach', 'kode']);
  assert.equal(payload.publicationContext.schema, PROFILE_PUBLICATION_CONTEXT_SCHEMA);
  assert.equal(payload.publicationContext.declarations[0].value, 'I deliberately automate repetitive development work.');
  assert.equal(Object.hasOwn(payload.publicationContext.declarations[0], 'authorizationRef'), false);
  assert.equal(Object.hasOwn(payload, 'score'), false);
});

test('presentation payload accepts no approved declarations without inventing prose', () => {
  const payload = prepareProfilePresentationPayload({
    actorKey: 'developer:mauro', statistics: buildProfileStatistics(), technologyEvolution: [],
    publicationContext: publication({ declarations: [] })
  });
  assert.deepEqual(payload.publicationContext.declarations, []);
  assert.deepEqual(payload.technologyEvolution, []);
});

test('presentation payload fails closed on actor mismatch or duplicate repository history', () => {
  assert.throws(() => prepareProfilePresentationPayload({
    actorKey: 'developer:mauro', statistics: buildProfileStatistics(),
    publicationContext: publication({ actorKey: 'developer:other' })
  }), /does not match/);

  assert.throws(() => prepareProfilePresentationPayload({
    actorKey: 'developer:mauro', statistics: buildProfileStatistics(),
    technologyEvolution: [evolution('kode'), evolution('KODE', 'bbbb')], publicationContext: publication()
  }), /Duplicate technology evolution repository/);
});

test('presentation payload rejects forged score semantics instead of repackaging them', () => {
  const statistics = { ...buildProfileStatistics(), score: 0.99 };
  assert.throws(() => prepareProfilePresentationPayload({
    actorKey: 'developer:mauro', statistics, publicationContext: publication()
  }), /root shape|score/i);
});

test('ProfilePresentationPayload JS matches the shared schema fixture', () => {
  const payload = prepareProfilePresentationPayload({
    actorKey: 'developer:mauro', statistics: buildProfileStatistics(), publicationContext: publication({ declarations: [] })
  });
  const schema = JSON.parse(readFileSync(new URL('../fixtures/profile-presentation-v1-schema.json', import.meta.url), 'utf8'));
  for (const field of schema.fields) assert.ok(Object.hasOwn(payload, field), `missing presentation field ${field}`);
});
