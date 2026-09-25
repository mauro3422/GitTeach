import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { TECHNOLOGY_EVOLUTION_SCHEMA, normalizeTechnologyEvolution } from '../../src/core/index.js';

function sample() {
  return {
    schema: TECHNOLOGY_EVOLUTION_SCHEMA,
    repository: 'kode',
    source: 'git-local-tree',
    headCommit: 'cccc',
    commitCount: 3,
    snapshotCount: 3,
    sampling: { strategy: 'evenly-spaced-commits-v1', maxSnapshots: 12, completeHistory: true },
    snapshots: [
      { commit: 'aaaa', committedAt: '2026-01-01T10:00:00Z', sourceFileCount: 1, languages: [{ language: 'TypeScript', files: 1, bytes: 100 }] },
      { commit: 'bbbb', committedAt: '2026-02-01T10:00:00Z', sourceFileCount: 2, languages: [{ language: 'TypeScript', files: 1, bytes: 120 }, { language: 'Rust', files: 1, bytes: 90 }] },
      { commit: 'cccc', committedAt: '2026-03-01T10:00:00Z', sourceFileCount: 2, languages: [{ language: 'Rust', files: 2, bytes: 220 }] }
    ],
    deterministic: true
  };
}

test('technology evolution preserves real commit snapshots without converting them into skill scores', () => {
  const evolution = normalizeTechnologyEvolution(sample());
  assert.equal(evolution.repository, 'kode');
  assert.equal(evolution.commitCount, 3);
  assert.equal(evolution.snapshotCount, 3);
  assert.equal(evolution.sampling.completeHistory, true);
  assert.deepEqual(evolution.snapshots.map((item) => item.commit), ['aaaa', 'bbbb', 'cccc']);
  assert.deepEqual(evolution.snapshots[1].languages.map((item) => item.language), ['TypeScript', 'Rust']);
  assert.doesNotMatch(JSON.stringify(evolution), /score|expertise|seniority/i);
});

test('sampled technology history declares incomplete commit coverage explicitly', () => {
  const input = sample();
  input.commitCount = 20;
  input.snapshotCount = 3;
  input.sampling.completeHistory = false;
  const evolution = normalizeTechnologyEvolution(input);
  assert.equal(evolution.commitCount, 20);
  assert.equal(evolution.snapshotCount, 3);
  assert.equal(evolution.sampling.completeHistory, false);
});

test('technology evolution fails closed on inconsistent coverage or unsupported source', () => {
  const inconsistent = sample();
  inconsistent.snapshotCount = 2;
  assert.throws(() => normalizeTechnologyEvolution(inconsistent), /snapshotCount/);

  const wrongCoverage = sample();
  wrongCoverage.sampling.completeHistory = false;
  assert.throws(() => normalizeTechnologyEvolution(wrongCoverage), /completeHistory/);

  const wrongSource = sample();
  wrongSource.source = 'working-tree';
  assert.throws(() => normalizeTechnologyEvolution(wrongSource), /git-local-tree/);
});

test('technology evolution JS matches the shared schema fixture', () => {
  const evolution = normalizeTechnologyEvolution(sample());
  const schema = JSON.parse(readFileSync(new URL('../fixtures/technology-evolution-v1-schema.json', import.meta.url), 'utf8'));
  for (const field of schema.fields) assert.ok(Object.hasOwn(evolution, field), `missing root field ${field}`);
  for (const field of schema.samplingFields) assert.ok(Object.hasOwn(evolution.sampling, field), `missing sampling field ${field}`);
  for (const field of schema.snapshotFields) assert.ok(Object.hasOwn(evolution.snapshots[0], field), `missing snapshot field ${field}`);
  for (const field of schema.languageFields) assert.ok(Object.hasOwn(evolution.snapshots[0].languages[0], field), `missing language field ${field}`);
});
