import test from 'node:test';
import assert from 'node:assert/strict';

import {
  analyzeDevelopmentTendencies,
  developmentTendenciesToProfileObservations,
  planProfileInterview,
  prepareProfilePublicationContext,
  profileInterviewAnswerToDeclaration,
  reconcileProfileDeclarations,
  renderProfileInterviewPrompts
} from '../../src/core/index.js';

function bundle(name, evidence) {
  return { repository: { name }, evidence };
}

test('deterministic tendency -> interview -> private declaration -> explicit publication is fail-closed', () => {
  const tendencies = analyzeDevelopmentTendencies({
    bundles: [
      bundle('repo-a', [{ id: 'ev-a', path: 'scripts/check.mjs', kind: 'tooling' }]),
      bundle('repo-b', [{ id: 'ev-b', path: 'tools/build.ps1', kind: 'tooling' }])
    ]
  });
  const observations = developmentTendenciesToProfileObservations(tendencies);
  const reconciliation = reconcileProfileDeclarations({
    actorKey: 'developer:mauro', declarations: [], observations
  });
  const plan = planProfileInterview({
    actorKey: 'developer:mauro', declarations: [], reconciliation, requiredCategories: []
  });
  const question = plan.questions.find((item) => item.subjectKey === 'automation');
  assert.ok(question);
  assert.equal(question.kind, 'confirm-observed-pattern');
  assert.deepEqual(question.evidenceRefs, ['ev-a', 'ev-b']);

  const prompt = renderProfileInterviewPrompts(plan).find((item) => item.subjectKey === 'automation');
  assert.match(prompt.text, /recurring automation pattern/i);

  const privateDeclaration = profileInterviewAnswerToDeclaration({
    actorKey: 'developer:mauro',
    question,
    answer: 'Yes. I deliberately automate repetitive development work.',
    answeredAt: '2026-09-24T01:20:00-03:00',
    repositories: ['repo-a', 'repo-b']
  });
  assert.equal(privateDeclaration.publicationStatus, 'private');
  assert.equal(prepareProfilePublicationContext({
    actorKey: 'developer:mauro', declarations: [privateDeclaration]
  }).declarations.length, 0);

  const approvedDeclaration = profileInterviewAnswerToDeclaration({
    actorKey: 'developer:mauro',
    question,
    answer: privateDeclaration.value,
    answeredAt: privateDeclaration.declaredAt,
    repositories: privateDeclaration.repositories,
    publicationStatus: 'approved'
  });
  const published = prepareProfilePublicationContext({
    actorKey: 'developer:mauro', declarations: [privateDeclaration, approvedDeclaration]
  });
  assert.equal(published.declarations.length, 1);
  assert.equal(published.declarations[0].id, approvedDeclaration.id);
  assert.equal(Object.hasOwn(published.declarations[0], 'authorizationRef'), false);
});
