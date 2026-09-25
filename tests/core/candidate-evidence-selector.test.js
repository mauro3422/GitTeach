import test from 'node:test';
import assert from 'node:assert/strict';

import { selectCandidateEvidence } from '../../src/core/index.js';

const evidence = [
  { id: 'manifest', path: 'package.json', kind: 'manifest', excerpt: 'typescript svelte @tauri-apps/api monaco-editor' },
  { id: 'ts-source', path: 'src/lib/editor.ts', kind: 'source', excerpt: 'import * as monaco from "monaco-editor";' },
  { id: 'svelte-source', path: 'src/routes/+page.svelte', kind: 'source', excerpt: '<script lang="ts"> import { invoke } from "@tauri-apps/api/core";' },
  { id: 'cargo', path: 'src-tauri/Cargo.toml', kind: 'manifest', excerpt: 'tauri = "2" serde = "1"' },
  { id: 'rust-source', path: 'src-tauri/src/lib.rs', kind: 'source', excerpt: 'use tauri::Manager; pub fn run() {}' },
  { id: 'unrelated', path: 'README.md', kind: 'documentation', excerpt: 'general project notes' }
];

const candidates = [
  'TypeScript programming',
  'Rust programming',
  'Tauri desktop application development',
  'Svelte application development',
  'Monaco Editor integration',
  'Kubernetes cluster administration'
];

test('candidate-specific evidence selection keeps relevant positive evidence and no-match negatives empty', () => {
  const result = selectCandidateEvidence({ evidence, candidates, maxPerCandidate: 2, maxTotal: 8 });

  assert.ok(result.selectedEvidenceCount < evidence.length);
  assert.ok(result.evidence.some((item) => item.id === 'ts-source'));
  assert.ok(result.evidence.some((item) => item.id === 'rust-source'));
  assert.ok(result.evidence.some((item) => item.id === 'cargo'));
  assert.equal(result.evidence.some((item) => item.id === 'unrelated'), false);

  const negative = result.candidateMatches.find((item) => item.candidate.startsWith('Kubernetes'));
  assert.deepEqual(negative.evidenceRefs, []);

  const monaco = result.candidateMatches.find((item) => item.candidate.startsWith('Monaco'));
  assert.ok(monaco.evidenceRefs.includes('ts-source'));
});

test('candidate-specific evidence selection is deterministic and bounded', () => {
  const a = selectCandidateEvidence({ evidence, candidates, maxPerCandidate: 1, maxTotal: 4 });
  const b = selectCandidateEvidence({ evidence, candidates, maxPerCandidate: 1, maxTotal: 4 });

  assert.deepEqual(a, b);
  assert.ok(a.selectedEvidenceCount <= 4);
  assert.ok(a.candidateMatches.every((match) => match.evidenceRefs.length <= 1));
});

test('candidate-specific evidence selection validates budgets', () => {
  assert.throws(() => selectCandidateEvidence({ evidence, candidates, maxPerCandidate: 0 }), /maxPerCandidate/);
  assert.throws(() => selectCandidateEvidence({ evidence, candidates, maxTotal: 0 }), /maxTotal/);
});


test('candidate-specific refs are always contained in the final globally bounded evidence set', () => {
  const bounded = selectCandidateEvidence({ evidence, candidates, maxPerCandidate: 2, maxTotal: 2 });
  const selected = new Set(bounded.evidence.map((item) => item.id));
  for (const match of bounded.candidateMatches) {
    assert.ok(match.evidenceRefs.every((ref) => selected.has(ref)));
    assert.ok(match.scores.every((item) => selected.has(item.ref)));
  }
});
