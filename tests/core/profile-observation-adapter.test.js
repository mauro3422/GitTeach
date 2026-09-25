import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildProfileObservations,
  developerProfileToProfileObservations,
  developmentTendenciesToProfileObservations,
  reconcileProfileDeclarations
} from '../../src/core/index.js';

function developerProfile() {
  return {
    schema: 'giteach-developer-profile-v1',
    developer: { username: 'mauro3422' },
    repositories: [{ name: 'kode' }],
    skills: [
      {
        key: 'rust',
        label: 'Rust',
        supportEvidenceRefs: ['ev-rust-2', 'ev-rust-1', 'ev-rust-1'],
        attribution: {
          status: 'identity-linked',
          actorEvidenceRefs: ['actor-git-1']
        },
        contradictions: []
      },
      {
        key: 'typescript',
        label: 'TypeScript',
        supportEvidenceRefs: ['ev-ts'],
        attribution: { status: 'repository-only', actorEvidenceRefs: [] },
        contradictions: [{ evidenceRefs: ['ev-ts-conflict'] }]
      }
    ]
  };
}

function tendencies() {
  return {
    schema: 'giteach-development-tendencies-v1',
    analyzedRepositoryCount: 2,
    minimumRepositories: 2,
    tendencies: [{
      key: 'automation',
      label: 'Automation',
      repositoryCount: 2,
      analyzedRepositoryCount: 2,
      prevalence: 1,
      repositories: ['kode', 'giteach'],
      evidenceRefs: ['ev-auto-b', 'ev-auto-a'],
      evidenceKinds: ['tooling'],
      deterministic: true
    }]
  };
}

test('DeveloperProfile outputs become bounded reconciliation observations', () => {
  const observations = developerProfileToProfileObservations(developerProfile());
  const rust = observations.find((item) => item.key === 'rust');
  const tsSupport = observations.find((item) => item.key === 'typescript' && item.stance === 'support');
  const tsConflict = observations.find((item) => item.key === 'typescript' && item.stance === 'contradict');

  assert.equal(rust.sourceClass, 'actor-evidence');
  assert.deepEqual(rust.evidenceRefs, ['actor-git-1', 'ev-rust-1', 'ev-rust-2']);
  assert.equal(tsSupport.sourceClass, 'semantic-observation');
  assert.deepEqual(tsSupport.evidenceRefs, ['ev-ts']);
  assert.deepEqual(tsConflict.evidenceRefs, ['ev-ts-conflict']);
});

test('combined profile observations merge DeveloperProfile and development tendencies without duplicate facts', () => {
  const tendencyObservations = developmentTendenciesToProfileObservations(tendencies());
  const observations = buildProfileObservations({
    developerProfile: developerProfile(),
    developmentTendencies: tendencies(),
    extraObservations: tendencyObservations
  });
  assert.equal(observations.filter((item) => item.key === 'automation').length, 1);
  assert.ok(observations.some((item) => item.key === 'rust'));
  assert.ok(observations.some((item) => item.key === 'typescript' && item.stance === 'contradict'));
});

test('real profile observations feed reconciliation instead of forcing interview questions for already observed capabilities', () => {
  const observations = buildProfileObservations({ developerProfile: developerProfile(), developmentTendencies: tendencies() });
  const reconciliation = reconcileProfileDeclarations({
    actorKey: 'developer:mauro',
    declarations: [],
    observations
  });
  assert.equal(reconciliation.items.find((item) => item.key === 'rust').status, 'observed-undeclared');
  assert.equal(reconciliation.items.find((item) => item.key === 'automation').status, 'observed-undeclared');
});

test('malformed DeveloperProfile capability fails closed', () => {
  const broken = developerProfile();
  broken.skills[0].key = '';
  assert.throws(() => developerProfileToProfileObservations(broken), /key and label/);
});


test('development tendency adapter still rejects non-deterministic or ungrounded tendencies', () => {
  const nonDeterministic = tendencies();
  nonDeterministic.tendencies[0].deterministic = false;
  assert.throws(() => developmentTendenciesToProfileObservations(nonDeterministic), /deterministic key\/label/);

  const ungrounded = tendencies();
  ungrounded.tendencies[0].evidenceRefs = [];
  assert.throws(() => developmentTendenciesToProfileObservations(ungrounded), /without evidence refs/);
});
