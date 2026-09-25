import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { JEV_OBSERVATION_SCHEMA } from './IncrementalJevSemantics.js';

export const JEV_OBSERVATION_STORE_SCHEMA = 'giteach-jev-observation-store-v1';

function assertObservation(observation) {
  if (!observation || observation.schema !== JEV_OBSERVATION_SCHEMA) {
    throw new Error(`Jev observation store only accepts ${JEV_OBSERVATION_SCHEMA}.`);
  }
  if (!observation.id || !observation.repository?.name || !observation.candidate || !observation.inputFingerprint) {
    throw new Error('Jev observation is missing required persistence identity fields.');
  }
  if (!Array.isArray(observation.evidenceIdentity) || observation.evidenceIdentity.some((item) => Object.hasOwn(item, 'excerpt'))) {
    throw new Error('Jev observation persistence must contain bounded evidence identity without raw excerpts.');
  }
  return observation;
}

export function mergeJevObservations(existing = [], incoming = []) {
  if (!Array.isArray(existing) || !Array.isArray(incoming)) throw new Error('Jev observations must be arrays.');
  const merged = [];
  const seen = new Set();
  for (const observation of [...existing, ...incoming]) {
    assertObservation(observation);
    if (seen.has(observation.id)) continue;
    seen.add(observation.id);
    merged.push(observation);
  }
  return Object.freeze(merged);
}

export class JsonJevObservationStore {
  constructor({ path }) {
    if (!path || typeof path !== 'string') throw new Error('JsonJevObservationStore requires path.');
    this.path = resolve(path);
  }

  load() {
    if (!existsSync(this.path)) return [];
    let payload;
    try {
      payload = JSON.parse(readFileSync(this.path, 'utf8'));
    } catch {
      throw new Error('Jev observation store is unreadable or malformed JSON.');
    }
    if (payload?.schema !== JEV_OBSERVATION_STORE_SCHEMA || !Array.isArray(payload.observations)) {
      throw new Error(`Expected ${JEV_OBSERVATION_STORE_SCHEMA}.`);
    }
    return mergeJevObservations([], payload.observations);
  }

  save(observations = []) {
    const normalized = mergeJevObservations([], observations);
    mkdirSync(dirname(this.path), { recursive: true });
    const temporary = `${this.path}.tmp-${process.pid}`;
    const payload = {
      schema: JEV_OBSERVATION_STORE_SCHEMA,
      observations: normalized
    };
    writeFileSync(temporary, `${JSON.stringify(payload, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
    renameSync(temporary, this.path);
    return normalized;
  }

  mergeAndSave(incoming = []) {
    const merged = mergeJevObservations(this.load(), incoming);
    this.save(merged);
    return merged;
  }
}
