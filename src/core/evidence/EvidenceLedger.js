import { createHash } from 'node:crypto';

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function makeId(record) {
  const payload = {
    repo: record.repo,
    path: record.path,
    kind: record.kind,
    subject: record.subject,
    commit: record.commit ?? null,
    sourceHash: record.sourceHash ?? null,
    excerptHash: record.excerptHash ?? null
  };
  return createHash('sha256').update(stableStringify(payload)).digest('hex').slice(0, 24);
}

function normalizeRecord(input) {
  if (!input?.repo || !input?.path || !input?.kind) {
    throw new Error('Evidence requires repo, path and kind.');
  }
  const excerptHash = input.excerpt
    ? createHash('sha256').update(input.excerpt).digest('hex')
    : input.excerptHash ?? null;
  const normalized = Object.freeze({
    id: input.id ?? null,
    repo: input.repo,
    path: input.path,
    kind: input.kind,
    subject: input.subject ?? null,
    commit: input.commit ?? null,
    sourceHash: input.sourceHash ?? null,
    excerptHash,
    excerpt: input.excerpt ?? null,
    observedAt: input.observedAt ?? new Date().toISOString(),
    metadata: Object.freeze({ ...(input.metadata ?? {}) })
  });
  return Object.freeze({ ...normalized, id: normalized.id ?? makeId(normalized) });
}

export class EvidenceLedger {
  #records = new Map();

  append(input) {
    const record = normalizeRecord(input);
    const existing = this.#records.get(record.id);
    if (existing && stableStringify(existing) !== stableStringify(record)) {
      throw new Error(`Evidence id collision: ${record.id}`);
    }
    this.#records.set(record.id, record);
    return record;
  }

  has(id) {
    return this.#records.has(id);
  }

  get(id) {
    return this.#records.get(id) ?? null;
  }

  resolve(ids = []) {
    return ids.map((id) => {
      const record = this.get(id);
      if (!record) throw new Error(`Unknown evidence reference: ${id}`);
      return record;
    });
  }

  list() {
    return [...this.#records.values()];
  }

  toJSON() {
    return { schema: 'giteach-evidence-ledger-v1', records: this.list() };
  }
}
