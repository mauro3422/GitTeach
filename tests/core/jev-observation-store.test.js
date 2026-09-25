import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  JEV_OBSERVATION_SCHEMA,
  JEV_OBSERVATION_STORE_SCHEMA,
  JsonJevObservationStore,
  mergeJevObservations
} from '../../src/core/index.js';

function observation({ id = 'obs-1', candidate = 'Rust', inputFingerprint = 'input-1' } = {}) {
  return {
    schema: JEV_OBSERVATION_SCHEMA,
    id,
    repository: { name: 'kode', url: null },
    candidate,
    contractSchema: 'giteach-jev-bounded-v1',
    semanticContextKey: 'project-capability-evidence-v1',
    providerPolicyKey: 'typesafe:test',
    questionHash: 'question-hash',
    evidenceFingerprint: 'evidence-hash',
    inputFingerprint,
    evidenceRefs: ['ev-1'],
    evidenceIdentity: [{
      ref: 'ev-1', path: 'src/lib.rs', kind: 'source', subject: null,
      sourceHash: 'source-hash', excerptHash: 'excerpt-hash', excerptDigest: 'digest'
    }],
    provider: 'typesafe',
    model: 'jev-test',
    responseId: 'resp-1',
    observedAt: '2026-09-23T23:00:00.000Z',
    usage: { input_tokens: 10, output_tokens: 1 },
    outcome: { status: 'supported', reason: null, claims: [] }
  };
}

test('observation merge deduplicates exact identity but preserves changed historical observations', () => {
  const first = observation();
  const changed = observation({ id: 'obs-2', inputFingerprint: 'input-2' });
  const merged = mergeJevObservations([first], [first, changed]);
  assert.deepEqual(merged.map((item) => item.id), ['obs-1', 'obs-2']);
});

test('JSON observation store round-trips portable observations between executions', () => {
  const root = mkdtempSync(join(tmpdir(), 'giteach-jev-store-'));
  try {
    const path = join(root, 'observations.json');
    const store = new JsonJevObservationStore({ path });
    store.save([observation()]);
    const loaded = new JsonJevObservationStore({ path }).load();
    assert.equal(loaded.length, 1);
    assert.equal(loaded[0].inputFingerprint, 'input-1');
    const payload = JSON.parse(readFileSync(path, 'utf8'));
    assert.equal(payload.schema, JEV_OBSERVATION_STORE_SCHEMA);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('store merge preserves prior observations and appends a changed candidate input', () => {
  const root = mkdtempSync(join(tmpdir(), 'giteach-jev-store-'));
  try {
    const path = join(root, 'observations.json');
    const store = new JsonJevObservationStore({ path });
    store.save([observation()]);
    const merged = store.mergeAndSave([observation({ id: 'obs-2', inputFingerprint: 'input-2' })]);
    assert.deepEqual(merged.map((item) => item.id), ['obs-1', 'obs-2']);
    assert.deepEqual(store.load().map((item) => item.inputFingerprint), ['input-1', 'input-2']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('observation persistence rejects raw evidence excerpts', () => {
  const unsafe = observation();
  unsafe.evidenceIdentity[0].excerpt = 'raw code or private text must not be persisted here';
  assert.throws(() => mergeJevObservations([], [unsafe]), /without raw excerpts/);
});

test('malformed observation store schema fails closed', () => {
  const root = mkdtempSync(join(tmpdir(), 'giteach-jev-store-'));
  try {
    const path = join(root, 'observations.json');
    writeFileSync(path, JSON.stringify({ schema: 'wrong-schema', observations: [] }));
    assert.throws(() => new JsonJevObservationStore({ path }).load(), /giteach-jev-observation-store-v1/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});


test('JSON observation store matches the shared store schema fixture', () => {
  const root = mkdtempSync(join(tmpdir(), 'giteach-jev-store-'));
  try {
    const path = join(root, 'observations.json');
    const store = new JsonJevObservationStore({ path });
    store.save([observation()]);
    const payload = JSON.parse(readFileSync(path, 'utf8'));
    const schema = JSON.parse(readFileSync(new URL('../fixtures/jev-observation-store-v1-schema.json', import.meta.url), 'utf8'));
    for (const field of schema.storeFields) assert.ok(Object.hasOwn(payload, field), `missing store field ${field}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
