import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  ACTOR_EVIDENCE_SCHEMA,
  PROFILE_DECLARATION_SCHEMA,
  PROFILE_RECONCILIATION_SCHEMA,
  createProfileDeclaration,
  reconcileProfileDeclarations
} from '../../src/core/index.js';

function declaration(overrides = {}) {
  return createProfileDeclaration({
    actorKey: 'developer:mauro',
    category: 'capability',
    key: 'Rust',
    value: 'Rust',
    sourceKind: 'user-answer',
    sourceRef: 'interview:answer:1',
    declaredAt: '2026-09-24T01:00:00.000Z',
    ...overrides
  });
}

test('direct self-report is a declaration without repository or ActorEvidence attachment', () => {
  const item = declaration({
    category: 'ai-workflow',
    key: 'ai-usage',
    value: 'I use coding agents and focus on review and debugging.'
  });
  assert.equal(item.schema, PROFILE_DECLARATION_SCHEMA);
  assert.equal(item.schema === ACTOR_EVIDENCE_SCHEMA, false);
  assert.deepEqual(item.repositories, []);
  assert.equal(item.authorizationRef, null);
  assert.equal(item.publicationStatus, 'private');
});

test('profile import requires explicit authorization reference', () => {
  assert.throws(() => declaration({ sourceKind: 'profile-import', sourceRef: 'linkedin:skills:rust' }), /authorizationRef/);
  const imported = declaration({
    sourceKind: 'profile-import',
    sourceRef: 'linkedin:skills:rust',
    authorizationRef: 'authorization:linkedin:2026-09-24'
  });
  assert.equal(imported.authorizationRef, 'authorization:linkedin:2026-09-24');
});


test('publication is opt-in and remains separate from declaration/source authorization', () => {
  const approved = declaration({ publicationStatus: 'approved' });
  assert.equal(approved.publicationStatus, 'approved');
  assert.throws(() => declaration({ publicationStatus: 'automatic-public' }), /publication status/);
});

test('declaration refuses raw prompt transcript or credential-shaped fields', () => {
  for (const [field, value] of [
    ['rawPrompt', 'private prompt'],
    ['transcript', 'full conversation'],
    ['accessToken', 'secret-token']
  ]) {
    assert.throws(() => declaration({ [field]: value }), /must not contain/);
  }
});

test('publication consent does not change declaration identity', () => {
  const privateDeclaration = declaration({ publicationStatus: 'private' });
  const approvedDeclaration = declaration({ publicationStatus: 'approved' });
  assert.equal(privateDeclaration.id, approvedDeclaration.id);
});

test('declaration identity is deterministic for the same normalized declaration', () => {
  const first = declaration({ repositories: ['repo-b', 'repo-a', 'repo-a'] });
  const second = declaration({ repositories: ['repo-a', 'repo-b'] });
  assert.equal(first.id, second.id);
  assert.deepEqual(first.repositories, ['repo-a', 'repo-b']);
});

test('declaration validates categories, source kinds and bounded value', () => {
  assert.throws(() => declaration({ category: 'seniority' }), /category/);
  assert.throws(() => declaration({ sourceKind: 'scraped-profile' }), /source kind/);
  assert.throws(() => declaration({ value: 'x'.repeat(501) }), /500 characters/);
});


test('consumers revalidate loaded declarations before reconciliation', () => {
  const forgedImport = {
    ...declaration(),
    sourceKind: 'profile-import',
    sourceRef: 'linkedin:skills:rust',
    authorizationRef: null
  };
  assert.throws(() => reconcileProfileDeclarations({
    actorKey: 'developer:mauro',
    declarations: [forgedImport]
  }), /authorizationRef/);
});

test('reconciliation keeps declared not observable distinct from false', () => {
  const item = declaration();
  const result = reconcileProfileDeclarations({ actorKey: 'developer:mauro', declarations: [item], observations: [] });
  assert.equal(result.schema, PROFILE_RECONCILIATION_SCHEMA);
  assert.equal(result.items[0].status, 'declared-not-observable');
  assert.deepEqual(result.items[0].observedContradictionRefs, []);
});

test('reconciliation distinguishes supported, observed undeclared and ambiguous cases', () => {
  const rust = declaration();
  const result = reconcileProfileDeclarations({
    actorKey: 'developer:mauro',
    declarations: [rust],
    observations: [
      { key: 'rust', label: 'Rust', stance: 'support', sourceClass: 'repository-fact', evidenceRefs: ['ev-rust'] },
      { key: 'typescript', label: 'TypeScript', stance: 'support', sourceClass: 'cross-project-tendency', evidenceRefs: ['ev-ts'] }
    ]
  });
  assert.equal(result.items.find((item) => item.key === 'rust').status, 'declared-supported');
  assert.equal(result.items.find((item) => item.key === 'typescript').status, 'observed-undeclared');

  const ambiguous = reconcileProfileDeclarations({
    actorKey: 'developer:mauro',
    declarations: [rust],
    observations: [
      { key: 'rust', stance: 'support', sourceClass: 'repository-fact', evidenceRefs: ['ev-rust'] },
      { key: 'rust', stance: 'contradict', sourceClass: 'semantic-observation', evidenceRefs: ['ev-conflict'] }
    ]
  });
  assert.equal(ambiguous.items[0].status, 'ambiguous');
  assert.deepEqual(ambiguous.items[0].observedContradictionRefs, ['ev-conflict']);
});

test('conflicting declarations from authorized sources reconcile as ambiguous without inventing a winner', () => {
  const userRole = declaration({
    category: 'role', key: 'current-role', value: 'Developer Tooling Engineer', sourceRef: 'interview:role'
  });
  const importedRole = declaration({
    category: 'role', key: 'current-role', value: 'Frontend Developer',
    sourceKind: 'profile-import', sourceRef: 'linkedin:headline',
    authorizationRef: 'authorization:linkedin:2026-09-24'
  });
  const result = reconcileProfileDeclarations({
    actorKey: 'developer:mauro', declarations: [userRole, importedRole], observations: []
  });
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].status, 'ambiguous');
  assert.deepEqual([...result.items[0].declarationIds].sort(), [userRole.id, importedRole.id].sort());
});

test('reconciliation isolates declarations by actor and rejects ungrounded observations', () => {
  const own = declaration();
  const other = declaration({ actorKey: 'developer:other', key: 'Go', value: 'Go', sourceRef: 'interview:other' });
  const result = reconcileProfileDeclarations({ actorKey: 'developer:mauro', declarations: [own, other] });
  assert.deepEqual(result.items.map((item) => item.key), ['rust']);
  assert.throws(() => reconcileProfileDeclarations({
    actorKey: 'developer:mauro',
    declarations: [own],
    observations: [{ key: 'rust', sourceClass: 'repository-fact', evidenceRefs: [] }]
  }), /at least one evidence ref/);
});

test('JS declaration and reconciliation match shared schema fixtures', () => {
  const declarationSchema = JSON.parse(readFileSync(new URL('../fixtures/profile-declaration-v1-schema.json', import.meta.url), 'utf8'));
  const reconciliationSchema = JSON.parse(readFileSync(new URL('../fixtures/profile-reconciliation-v1-schema.json', import.meta.url), 'utf8'));
  const item = declaration();
  const reconciliation = reconcileProfileDeclarations({ actorKey: 'developer:mauro', declarations: [item] });
  for (const field of declarationSchema.fields) assert.ok(Object.hasOwn(item, field), `missing declaration field ${field}`);
  for (const field of reconciliationSchema.fields) assert.ok(Object.hasOwn(reconciliation, field), `missing reconciliation field ${field}`);
  for (const field of reconciliationSchema.itemFields) assert.ok(Object.hasOwn(reconciliation.items[0], field), `missing reconciliation item field ${field}`);
});
