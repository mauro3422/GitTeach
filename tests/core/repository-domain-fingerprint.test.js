import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  REPOSITORY_DOMAIN_FINGERPRINT_SCHEMA,
  analyzeRepositoryDomainFingerprint
} from '../../src/core/index.js';

function bundle({ name = 'demo', languages = [], technologies = [], evidence = [] } = {}) {
  return {
    schema: 'giteach-repo-evidence-v1',
    repository: { name },
    summary: {},
    languages: languages.map((language) => ({ language, files: 1, bytes: 1 })),
    technologies: technologies.map(([technology, sourcePath = 'package.json']) => ({
      name: technology,
      sourcePath,
      sourceKind: sourcePath === 'Cargo.toml' ? 'cargo' : 'npm'
    })),
    evidence
  };
}

function record(id, path, kind = 'manifest', metadata = {}) {
  return { id, path, kind, metadata };
}

test('domain fingerprint keeps multiple explainable candidates instead of choosing one winner', () => {
  const result = analyzeRepositoryDomainFingerprint({
    repository: 'mauro/kode',
    topics: ['developer-tools', 'ai'],
    bundle: bundle({
      name: 'kode',
      languages: ['Rust', 'TypeScript'],
      technologies: [
        ['tauri', 'Cargo.toml'],
        ['monaco-editor', 'package.json'],
        ['openai', 'package.json']
      ],
      evidence: [
        record('cargo-ref', 'Cargo.toml'),
        record('npm-ref', 'package.json')
      ]
    })
  });

  assert.equal(result.schema, REPOSITORY_DOMAIN_FINGERPRINT_SCHEMA);
  assert.equal(result.repository, 'mauro/kode');
  assert.deepEqual(result.declaredTopics, ['ai', 'developer-tools']);
  assert.deepEqual(result.candidates.map((candidate) => candidate.key), [
    'ai-model-integration',
    'desktop-application',
    'developer-tooling'
  ]);

  const tooling = result.candidates.find((candidate) => candidate.key === 'developer-tooling');
  assert.deepEqual(tooling.sourceKinds, ['github-topic', 'technology']);
  assert.deepEqual(tooling.evidenceRefs, ['npm-ref']);
  assert.deepEqual(tooling.topics, ['developer-tools']);
  assert.ok(tooling.sourceRefs.includes('github-topic:mauro/kode:developer-tools'));
  assert.equal('confidence' in tooling, false);
  assert.equal('score' in tooling, false);
});

test('Godot/GDScript deterministically identify game-development without Jev', () => {
  const result = analyzeRepositoryDomainFingerprint({
    bundle: bundle({
      name: 'water-game',
      languages: ['GDScript'],
      technologies: [['Godot', 'project.godot']],
      evidence: [
        record('godot-manifest', 'project.godot'),
        record('gd-source', 'player.gd', 'source', { language: 'GDScript' })
      ]
    })
  });

  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].key, 'game-development');
  assert.deepEqual(result.candidates[0].sourceKinds, ['language', 'technology']);
  assert.deepEqual(result.candidates[0].evidenceRefs, ['gd-source', 'godot-manifest']);
});

test('language alone does not fabricate systems or tooling domain', () => {
  const result = analyzeRepositoryDomainFingerprint({
    bundle: bundle({
      name: 'rust-scratch',
      languages: ['Rust'],
      evidence: [record('rust-source', 'src/main.rs', 'source', { language: 'Rust' })]
    })
  });

  assert.deepEqual(result.candidates, []);
});

test('GitHub topics are preserved as declared repository metadata, not confidence', () => {
  const result = analyzeRepositoryDomainFingerprint({
    repository: 'acme/service',
    topics: ['REST-API', 'backend', 'rest-api'],
    bundle: bundle({ name: 'service' })
  });

  assert.deepEqual(result.declaredTopics, ['backend', 'rest-api']);
  const candidate = result.candidates.find((item) => item.key === 'service-api');
  assert.ok(candidate);
  assert.deepEqual(candidate.sourceKinds, ['github-topic']);
  assert.deepEqual(candidate.evidenceRefs, []);
  assert.deepEqual(candidate.sourceRefs, [
    'github-topic:acme/service:backend',
    'github-topic:acme/service:rest-api'
  ]);
});

test('domain provenance remains bounded even when many files support the same candidate', () => {
  const evidence = Array.from({ length: 12 }, (_, index) =>
    record(`gd-${index}`, `scripts/file_${index}.gd`, 'source', { language: 'GDScript' })
  );
  const result = analyzeRepositoryDomainFingerprint({
    repository: 'acme/game',
    topics: ['godot', 'gamedev', 'game', 'modding'],
    bundle: bundle({ name: 'game', languages: ['GDScript'], technologies: [['Godot', 'project.godot']], evidence })
  });

  const candidate = result.candidates.find((item) => item.key === 'game-development');
  assert.ok(candidate);
  assert.equal(candidate.evidenceRefs.length, 6);
  assert.equal(candidate.sourceRefs.length, 8);
  assert.equal(candidate.sourceRefs.filter((ref) => ref.startsWith('github-topic:')).length, 2);
});

test('repository domain fingerprint matches the shared v1 schema fixture', () => {
  const schema = JSON.parse(readFileSync(new URL('../fixtures/repository-domain-fingerprint-v1-schema.json', import.meta.url), 'utf8'));
  const result = analyzeRepositoryDomainFingerprint({
    topics: ['game'],
    bundle: bundle({ name: 'demo' })
  });

  for (const field of schema.profileFields) assert.ok(Object.hasOwn(result, field));
  for (const field of schema.candidateFields) assert.ok(Object.hasOwn(result.candidates[0], field));
});

test('malformed domain inputs fail closed', () => {
  assert.throws(() => analyzeRepositoryDomainFingerprint({ bundle: null }), /RepoEvidenceBundle/i);
  assert.throws(() => analyzeRepositoryDomainFingerprint({ bundle: bundle(), topics: 'game' }), /topics must be an array/i);
});
