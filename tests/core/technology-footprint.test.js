import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  REPO_EVIDENCE_SCHEMA,
  TECHNOLOGY_FOOTPRINT_SCHEMA,
  analyzeTechnologyFootprint
} from '../../src/core/index.js';

function bundle(name, { languages = [], technologies = [], evidence = [], coverage = null } = {}) {
  const summarizedPathCount = languages.reduce((total, language) => total + Number(language.files ?? 0), 0);
  return {
    schema: REPO_EVIDENCE_SCHEMA,
    repository: { name },
    coverage: coverage ?? {
      inventory: 'complete-policy-filtered',
      summary_scope: 'inventory',
      known_path_count: summarizedPathCount
    },
    summary: { files_scanned: summarizedPathCount },
    languages,
    technologies,
    evidence
  };
}

test('technology footprint reports repository prevalence separately from observed file/byte volume', () => {
  const footprint = analyzeTechnologyFootprint({
    bundles: [
      bundle('a', {
        languages: [
          { language: 'Rust', files: 10, bytes: 1000 },
          { language: 'TypeScript', files: 20, bytes: 2000 }
        ],
        technologies: [{ name: 'Tauri', source_path: 'Cargo.toml', source_kind: 'manifest' }],
        evidence: [{ id: 'ev-a-cargo', path: 'Cargo.toml' }]
      }),
      bundle('b', {
        languages: [{ language: 'Rust', files: 5, bytes: 750 }],
        technologies: [{ name: 'Tauri', source_path: 'Cargo.toml', source_kind: 'manifest' }],
        evidence: [{ id: 'ev-b-cargo', path: 'Cargo.toml' }]
      })
    ]
  });

  assert.deepEqual(footprint.coverage, {
    completeInventoryRepositoryCount: 2,
    partialInventoryRepositoryCount: 0,
    inventorySummaryRepositoryCount: 2,
    selectedContentSummaryRepositoryCount: 0,
    knownPathCount: 35,
    summarizedPathCount: 35
  });

  const rust = footprint.languages.find((item) => item.key === 'rust');
  assert.equal(rust.repositoryCount, 2);
  assert.equal(rust.repositoryPrevalence, 1);
  assert.equal(rust.observedFileCount, 15);
  assert.equal(rust.observedFileUnit, 'files');
  assert.equal(rust.observedByteCount, 1750);
  assert.equal(rust.observedByteUnit, 'bytes');
  assert.deepEqual(rust.repositories, ['a', 'b']);

  const typescript = footprint.languages.find((item) => item.key === 'typescript');
  assert.equal(typescript.repositoryPrevalence, 0.5);

  const tauri = footprint.technologies.find((item) => item.key === 'tauri');
  assert.equal(tauri.repositoryCount, 2);
  assert.equal(tauri.repositoryPrevalence, 1);
  assert.deepEqual(tauri.sourceRefs, ['ev-a-cargo', 'ev-b-cargo']);
});

test('duplicate repository bundles do not inflate technology prevalence or observed volume', () => {
  const sample = bundle('a', {
    languages: [{ language: 'Rust', files: 10, bytes: 1000 }],
    technologies: [{ name: 'Tauri', source_path: 'Cargo.toml', source_kind: 'manifest' }],
    evidence: [{ id: 'ev-a-cargo', path: 'Cargo.toml' }]
  });
  const footprint = analyzeTechnologyFootprint({ bundles: [sample, sample] });
  assert.equal(footprint.analyzedRepositoryCount, 1);
  assert.equal(footprint.languages[0].observedFileCount, 10);
  assert.equal(footprint.technologies[0].repositoryCount, 1);
});

test('technology source refs fall back to explicit repository:path when evidence sampling omitted the manifest', () => {
  const footprint = analyzeTechnologyFootprint({
    bundles: [bundle('a', {
      technologies: [{ name: 'Svelte', source_path: 'package.json', source_kind: 'manifest' }]
    })]
  });
  assert.deepEqual(footprint.technologies[0].sourceRefs, ['a:package.json']);
});

test('technology footprint preserves selected-content coverage instead of presenting it as full repository volume', () => {
  const footprint = analyzeTechnologyFootprint({
    bundles: [bundle('remote', {
      languages: [{ language: 'Rust', files: 2, bytes: 200 }],
      coverage: {
        inventory: 'complete-policy-filtered',
        summary_scope: 'selected-content',
        known_path_count: 10
      }
    })]
  });

  assert.deepEqual(footprint.coverage, {
    completeInventoryRepositoryCount: 1,
    partialInventoryRepositoryCount: 0,
    inventorySummaryRepositoryCount: 0,
    selectedContentSummaryRepositoryCount: 1,
    knownPathCount: 10,
    summarizedPathCount: 2
  });
});

test('technology footprint keeps metric meaning explicit and contains no skill-score fields', () => {
  const footprint = analyzeTechnologyFootprint({
    bundles: [bundle('a', { languages: [{ language: 'Rust', files: 1, bytes: 10 }] })]
  });
  const serialized = JSON.stringify(footprint);
  assert.doesNotMatch(serialized, /score|expertise|seniority/i);
  assert.equal(footprint.schema, TECHNOLOGY_FOOTPRINT_SCHEMA);
});

test('technology footprint rejects malformed repository bundles', () => {
  assert.throws(() => analyzeTechnologyFootprint({ bundles: [{ schema: 'wrong' }] }), /giteach-repo-evidence-v1/);
  assert.throws(() => analyzeTechnologyFootprint({ bundles: 'not-array' }), /bundles must be an array/);
});

test('technology footprint JS matches the shared v1 schema fixture', () => {
  const footprint = analyzeTechnologyFootprint({
    bundles: [bundle('a', {
      languages: [{ language: 'Rust', files: 1, bytes: 10 }],
      technologies: [{ name: 'Tauri', source_path: 'Cargo.toml', source_kind: 'manifest' }],
      evidence: [{ id: 'ev-cargo', path: 'Cargo.toml' }]
    })]
  });
  const schema = JSON.parse(readFileSync(new URL('../fixtures/technology-footprint-v1-schema.json', import.meta.url), 'utf8'));
  for (const field of schema.fields) assert.ok(Object.hasOwn(footprint, field), `missing root field ${field}`);
  for (const field of schema.coverageFields) assert.ok(Object.hasOwn(footprint.coverage, field), `missing coverage field ${field}`);
  for (const field of schema.languageFields) assert.ok(Object.hasOwn(footprint.languages[0], field), `missing language field ${field}`);
  for (const field of schema.technologyFields) assert.ok(Object.hasOwn(footprint.technologies[0], field), `missing technology field ${field}`);
});
