import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PROFILE_DECLARATION_SCHEMA,
  PROFILE_INTERVIEW_PROMPT_SCHEMA,
  profileInterviewAnswerToDeclaration,
  renderProfileInterviewPrompts
} from '../../src/core/index.js';

function plan(question) {
  return {
    schema: 'giteach-profile-interview-plan-v1',
    actorKey: 'developer:mauro',
    questions: [question]
  };
}

function observedAutomationQuestion() {
  return {
    id: 'confirm:automation',
    kind: 'confirm-observed-pattern',
    category: 'development-tendency',
    subjectKey: 'automation',
    sourceStatus: 'observed-undeclared',
    declarationIds: [],
    evidenceRefs: ['ev-a', 'ev-b']
  };
}

test('interview adapter renders bounded user-facing wording from the deterministic plan', () => {
  const prompts = renderProfileInterviewPrompts(plan(observedAutomationQuestion()));
  assert.equal(prompts.length, 1);
  assert.equal(prompts[0].schema, PROFILE_INTERVIEW_PROMPT_SCHEMA);
  assert.match(prompts[0].text, /recurring automation pattern/i);
  assert.match(prompts[0].text, /deliberate part of how you work/i);
  assert.deepEqual(prompts[0].evidenceRefs, ['ev-a', 'ev-b']);
  assert.equal(Object.hasOwn(prompts[0], 'evidence'), false);
  assert.equal(Object.hasOwn(prompts[0], 'prompt'), false);
});

test('missing profile categories get direct bounded interview questions', () => {
  const prompts = renderProfileInterviewPrompts(plan({
    id: 'gap:ai-workflow', kind: 'fill-profile-gap', category: 'ai-workflow', subjectKey: null,
    sourceStatus: null, declarationIds: [], evidenceRefs: []
  }));
  assert.match(prompts[0].text, /how do you use ai/i);
  assert.match(prompts[0].text, /direct, review or verify/i);
});

test('interview answer becomes private self-reported declaration by default', () => {
  const question = observedAutomationQuestion();
  const declaration = profileInterviewAnswerToDeclaration({
    actorKey: 'developer:mauro',
    question,
    answer: 'Yes. I deliberately automate repetitive development work.',
    answeredAt: '2026-09-24T00:10:00.000-03:00',
    repositories: ['kode', 'giteach']
  });
  assert.equal(declaration.schema, PROFILE_DECLARATION_SCHEMA);
  assert.equal(declaration.category, 'development-tendency');
  assert.equal(declaration.key, 'automation');
  assert.equal(declaration.sourceKind, 'user-answer');
  assert.equal(declaration.sourceRef, 'interview:confirm:automation');
  assert.equal(declaration.publicationStatus, 'private');
  assert.deepEqual(declaration.repositories, ['giteach', 'kode']);
});

test('publication approval remains explicit and separate from answering', () => {
  const question = observedAutomationQuestion();
  const approved = profileInterviewAnswerToDeclaration({
    actorKey: 'developer:mauro', question, answer: 'Yes, this is intentional.', publicationStatus: 'approved'
  });
  assert.equal(approved.publicationStatus, 'approved');
});

test('ambiguous question requires an explicit declaration category before storing an answer', () => {
  const question = {
    id: 'reconcile:current-role', kind: 'reconcile-ambiguity', category: null, subjectKey: 'current-role',
    sourceStatus: 'ambiguous', declarationIds: ['decl-a', 'decl-b'], evidenceRefs: []
  };
  assert.throws(() => profileInterviewAnswerToDeclaration({
    actorKey: 'developer:mauro', question, answer: 'Developer tooling engineer.'
  }), /declaration category/);
  const declaration = profileInterviewAnswerToDeclaration({
    actorKey: 'developer:mauro', question, answer: 'Developer tooling engineer.', categoryOverride: 'role'
  });
  assert.equal(declaration.category, 'role');
  assert.equal(declaration.key, 'current-role');
});

test('interview answers remain bounded and malformed plans fail closed', () => {
  assert.throws(() => profileInterviewAnswerToDeclaration({
    actorKey: 'developer:mauro', question: observedAutomationQuestion(), answer: 'x'.repeat(501)
  }), /500 characters/);
  assert.throws(() => renderProfileInterviewPrompts({ schema: 'wrong', actorKey: 'developer:mauro', questions: [] }), /profile-interview-plan-v1/);
});
