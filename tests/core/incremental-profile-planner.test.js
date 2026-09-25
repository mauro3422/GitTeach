import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  EvidenceLedger,
  ProfileAggregator,
  planIncrementalProfileUpdate
} from '../../src/core/index.js';

function previousState() {
  const ledger = new EvidenceLedger();
  const ts = ledger.append({ repo: 'kode', path: 'src/editor.ts', kind: 'source', excerpt: 'const editor: string = "kode";' });
  const rust = ledger.append({ repo: 'kode', path: 'src-tauri/src/lib.rs', kind: 'source', excerpt: 'pub fn run() {}' });
  const profile = new ProfileAggregator({ ledger }).build({
    developer: { username: 'mauro3422' },
    repositories: [{ name: 'kode' }],
    semanticClaims: [
      { skill: 'TypeScript', repository: 'kode', evidenceRefs: [ts.id], confidence: 0.95 },
      { skill: 'Rust', repository: 'kode', evidenceRefs: [rust.id], confidence: 0.9 }
    ]
  });
  return { ledger, profile, ts, rust };
}

test('incremental plan reuses claims whose evidence identity is unchanged', () => {
  const { ledger, profile } = previousState();
  const plan = planIncrementalProfileUpdate({ previousProfile: profile, currentLedger: ledger });

  assert.equal(plan.reusableSkills.length, 2);
  assert.equal(plan.invalidatedSkills.length, 0);
  assert.equal(plan.requiresSemanticRefresh, false);
  assert.equal(plan.requiresDiscovery, false);
});

test('incremental plan invalidates only the skill whose evidence ref disappeared', () => {
  const { profile, ts } = previousState();
  const current = new EvidenceLedger();
  current.append(ts);
  const changedRust = current.append({
    repo: 'kode', path: 'src-tauri/src/lib.rs', kind: 'source', excerpt: 'pub fn run() { println!("changed"); }'
  });

  const plan = planIncrementalProfileUpdate({ previousProfile: profile, currentLedger: current });
  assert.deepEqual(plan.reusableSkills.map((item) => item.key), ['typescript']);
  assert.deepEqual(plan.invalidatedSkills.map((item) => item.key), ['rust']);
  assert.equal(plan.invalidatedSkills[0].missingEvidenceRefs.length, 1);
  assert.ok(plan.newEvidenceRefs.includes(changedRust.id));
  assert.equal(plan.requiresSemanticRefresh, true);
  assert.equal(plan.requiresDiscovery, true);
});

test('unrelated new evidence requests discovery without invalidating existing skills', () => {
  const { ledger, profile } = previousState();
  const extra = ledger.append({ repo: 'kode', path: 'docs/new.md', kind: 'documentation', excerpt: 'new unrelated note' });
  const plan = planIncrementalProfileUpdate({ previousProfile: profile, currentLedger: ledger });

  assert.equal(plan.invalidatedSkills.length, 0);
  assert.equal(plan.requiresSemanticRefresh, false);
  assert.equal(plan.requiresDiscovery, true);
  assert.deepEqual(plan.newEvidenceRefs, [extra.id]);
});

test('incremental plan matches the shared v1 schema fixture', () => {
  const schema = JSON.parse(readFileSync(new URL('../fixtures/incremental-profile-plan-v1-schema.json', import.meta.url), 'utf8'));
  const { ledger, profile } = previousState();
  const plan = planIncrementalProfileUpdate({ previousProfile: profile, currentLedger: ledger });

  for (const field of schema.topLevelFields) assert.ok(Object.hasOwn(plan, field), `missing top-level field ${field}`);
  for (const field of schema.reusableSkillFields) assert.ok(Object.hasOwn(plan.reusableSkills[0], field), `missing reusable field ${field}`);
});
