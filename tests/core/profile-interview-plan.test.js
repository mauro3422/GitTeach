import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  PROFILE_INTERVIEW_PLAN_SCHEMA,
  createProfileDeclaration,
  planProfileInterview,
  reconcileProfileDeclarations
} from '../../src/core/index.js';

function declaration(category, key, value = key) {
  return createProfileDeclaration({
    actorKey: 'developer:mauro',
    category,
    key,
    value,
    sourceKind: 'user-answer',
    sourceRef: `interview:${category}:${key}`,
    declaredAt: '2026-09-24T01:00:00.000Z'
  });
}

test('interview planner asks only for missing required self-report categories', () => {
  const declarations = [
    declaration('role', 'current-role', 'Developer'),
    declaration('ai-workflow', 'ai-usage', 'I use coding agents with review and verification.')
  ];
  const reconciliation = reconcileProfileDeclarations({ actorKey: 'developer:mauro', declarations });
  const plan = planProfileInterview({ actorKey: 'developer:mauro', declarations, reconciliation });
  assert.equal(plan.schema, PROFILE_INTERVIEW_PLAN_SCHEMA);
  assert.deepEqual(
    plan.questions.filter((item) => item.kind === 'fill-profile-gap').map((item) => item.category),
    ['career-context', 'intent', 'responsibility']
  );
  assert.equal(plan.questions.length, 3);
  assert.equal(plan.questions.some((item) => item.category === 'role'), false);
  assert.equal(plan.questions.some((item) => item.category === 'ai-workflow'), false);
});

test('declared-not-observable triggers context clarification, not contradiction', () => {
  const declarations = [declaration('capability', 'rust', 'Rust')];
  const reconciliation = reconcileProfileDeclarations({ actorKey: 'developer:mauro', declarations });
  const plan = planProfileInterview({
    actorKey: 'developer:mauro',
    declarations,
    reconciliation,
    requiredCategories: []
  });
  assert.equal(plan.questions.length, 1);
  assert.equal(plan.questions[0].kind, 'clarify-unobserved-declaration');
  assert.equal(plan.questions[0].subjectKey, 'rust');
  assert.equal(plan.questions[0].sourceStatus, 'declared-not-observable');
  assert.deepEqual(plan.questions[0].declarationIds, [declarations[0].id]);
  assert.deepEqual(plan.questions[0].evidenceRefs, []);
});

test('observed undeclared pattern produces a bounded confirmation question', () => {
  const declarations = [];
  const reconciliation = reconcileProfileDeclarations({
    actorKey: 'developer:mauro',
    declarations,
    observations: [{
      key: 'automation',
      label: 'Automation',
      stance: 'support',
      sourceClass: 'cross-project-tendency',
      evidenceRefs: ['ev-a', 'ev-b']
    }]
  });
  const plan = planProfileInterview({
    actorKey: 'developer:mauro',
    declarations,
    reconciliation,
    requiredCategories: []
  });
  assert.equal(plan.questions.length, 1);
  assert.equal(plan.questions[0].kind, 'confirm-observed-pattern');
  assert.equal(plan.questions[0].category, 'development-tendency');
  assert.equal(plan.questions[0].subjectKey, 'automation');
  assert.deepEqual(plan.questions[0].evidenceRefs, ['ev-a', 'ev-b']);
});

test('ambiguous declaration produces reconciliation question with both support and contradiction refs', () => {
  const declarations = [declaration('capability', 'rust', 'Rust')];
  const reconciliation = reconcileProfileDeclarations({
    actorKey: 'developer:mauro',
    declarations,
    observations: [
      { key: 'rust', stance: 'support', sourceClass: 'repository-fact', evidenceRefs: ['ev-support'] },
      { key: 'rust', stance: 'contradict', sourceClass: 'semantic-observation', evidenceRefs: ['ev-conflict'] }
    ]
  });
  const plan = planProfileInterview({
    actorKey: 'developer:mauro',
    declarations,
    reconciliation,
    requiredCategories: []
  });
  assert.equal(plan.questions.length, 1);
  assert.equal(plan.questions[0].kind, 'reconcile-ambiguity');
  assert.deepEqual(plan.questions[0].evidenceRefs, ['ev-conflict', 'ev-support']);
  assert.deepEqual(plan.questions[0].declarationIds, [declarations[0].id]);
});

test('interview planner requires reconciliation for the same actor', () => {
  const declarations = [declaration('role', 'current-role', 'Developer')];
  const reconciliation = reconcileProfileDeclarations({ actorKey: 'developer:mauro', declarations });
  assert.throws(() => planProfileInterview({
    actorKey: 'developer:other',
    declarations,
    reconciliation
  }), /same actor/);
});

test('JS interview plan matches shared schema fixture', () => {
  const schema = JSON.parse(readFileSync(new URL('../fixtures/profile-interview-plan-v1-schema.json', import.meta.url), 'utf8'));
  const declarations = [];
  const reconciliation = reconcileProfileDeclarations({ actorKey: 'developer:mauro', declarations });
  const plan = planProfileInterview({ actorKey: 'developer:mauro', declarations, reconciliation });
  for (const field of schema.fields) assert.ok(Object.hasOwn(plan, field), `missing interview plan field ${field}`);
  for (const field of schema.questionFields) assert.ok(Object.hasOwn(plan.questions[0], field), `missing interview question field ${field}`);
});
