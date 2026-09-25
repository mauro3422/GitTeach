import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  PROFILE_PUBLICATION_CONTEXT_SCHEMA,
  createProfileDeclaration,
  prepareProfilePublicationContext
} from '../../src/core/index.js';

function declaration(overrides = {}) {
  return createProfileDeclaration({
    actorKey: 'developer:mauro',
    category: 'development-tendency',
    key: 'automation',
    value: 'I deliberately automate repetitive development work.',
    sourceKind: 'user-answer',
    sourceRef: 'interview:confirm:automation',
    declaredAt: '2026-09-24T01:20:00-03:00',
    repositories: ['kode', 'GitTeach'],
    ...overrides
  });
}

test('publication context excludes private declarations and includes only explicitly approved declarations', () => {
  const privateItem = declaration();
  const approved = declaration({ publicationStatus: 'approved' });
  const context = prepareProfilePublicationContext({
    actorKey: 'developer:mauro',
    declarations: [privateItem, approved]
  });

  assert.equal(context.schema, PROFILE_PUBLICATION_CONTEXT_SCHEMA);
  assert.equal(context.declarations.length, 1);
  assert.equal(context.declarations[0].id, approved.id);
  assert.equal(context.declarations[0].value, approved.value);
});

test('publication context isolates actors and strips consent/internal provenance metadata', () => {
  const approved = declaration({
    publicationStatus: 'approved',
    sourceKind: 'profile-import',
    sourceRef: 'linkedin:headline',
    authorizationRef: 'authorization:linkedin:2026-09-24',
    sourceHash: 'source-hash'
  });
  const other = declaration({ actorKey: 'developer:other', publicationStatus: 'approved', sourceRef: 'interview:other' });
  const context = prepareProfilePublicationContext({ actorKey: 'developer:mauro', declarations: [approved, other] });

  assert.equal(context.declarations.length, 1);
  const item = context.declarations[0];
  assert.equal(item.id, approved.id);
  assert.equal(item.sourceKind, 'profile-import');
  assert.equal(Object.hasOwn(item, 'authorizationRef'), false);
  assert.equal(Object.hasOwn(item, 'sourceHash'), false);
  assert.equal(Object.hasOwn(item, 'sourceRef'), false);
  assert.equal(Object.hasOwn(item, 'publicationStatus'), false);
});

test('publication context revalidates loaded declarations and fails closed on forged imports', () => {
  const forged = {
    ...declaration({ publicationStatus: 'approved' }),
    sourceKind: 'profile-import',
    sourceRef: 'linkedin:headline',
    authorizationRef: null
  };
  assert.throws(() => prepareProfilePublicationContext({ actorKey: 'developer:mauro', declarations: [forged] }), /authorizationRef/);
});

test('publication context matches shared schema fixture', () => {
  const approved = declaration({ publicationStatus: 'approved' });
  const context = prepareProfilePublicationContext({ actorKey: 'developer:mauro', declarations: [approved] });
  const schema = JSON.parse(readFileSync(new URL('../fixtures/profile-publication-context-v1-schema.json', import.meta.url), 'utf8'));

  for (const field of schema.fields) assert.ok(Object.hasOwn(context, field), `missing publication field ${field}`);
  for (const field of schema.declarationFields) assert.ok(Object.hasOwn(context.declarations[0], field), `missing published declaration field ${field}`);
});
