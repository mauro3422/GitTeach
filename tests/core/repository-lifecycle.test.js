import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { analyzeRepositoryLifecycle, REPOSITORY_LIFECYCLE_SCHEMA } from '../../src/core/index.js';

function commit(id, committedAt) {
  return { id, committedAt };
}

function tag(name, target, observedAt) {
  return { name, target, observedAt };
}

test('repository lifecycle counts active months instead of treating commit volume as cadence quality', () => {
  const lifecycle = analyzeRepositoryLifecycle({
    repository: 'demo',
    commits: [
      commit('a', '2026-01-02T10:00:00Z'),
      commit('b', '2026-01-20T10:00:00Z'),
      commit('c', '2026-03-05T10:00:00Z')
    ]
  });

  assert.equal(lifecycle.schema, REPOSITORY_LIFECYCLE_SCHEMA);
  assert.equal(lifecycle.commitCount, 3);
  assert.equal(lifecycle.activeMonthCount, 2);
  assert.equal(lifecycle.activeYearCount, 1);
  assert.equal(lifecycle.firstCommitAt, '2026-01-02T10:00:00.000Z');
  assert.equal(lifecycle.latestCommitAt, '2026-03-05T10:00:00.000Z');
  assert.equal('expertiseScore' in lifecycle, false);
  assert.equal('seniority' in lifecycle, false);
});

test('local Git tags remain tag facts and expose bounded post-tag maintenance', () => {
  const lifecycle = analyzeRepositoryLifecycle({
    repository: 'demo',
    commits: [commit('a', '2026-01-01T00:00:00Z'), commit('b', '2026-04-01T00:00:00Z')],
    tags: [
      tag('v1.0.0', 'a', '2026-02-01T00:00:00Z'),
      tag('v1.1.0', 'b', '2026-03-01T00:00:00Z')
    ],
    commitsAfterLatestTag: 4
  });

  assert.equal(lifecycle.tagCount, 2);
  assert.equal(lifecycle.firstTag.name, 'v1.0.0');
  assert.equal(lifecycle.latestTag.name, 'v1.1.0');
  assert.equal(lifecycle.commitsAfterLatestTag, 4);
  assert.equal(lifecycle.hasPostTagCommits, true);
  assert.equal('releaseCount' in lifecycle, false);
});

test('post-tag fields are unknown when there are no local Git tags', () => {
  const lifecycle = analyzeRepositoryLifecycle({
    repository: 'demo',
    commits: [commit('a', '2026-01-01T00:00:00Z')],
    commitsAfterLatestTag: 9
  });

  assert.equal(lifecycle.tagCount, 0);
  assert.equal(lifecycle.firstTag, null);
  assert.equal(lifecycle.latestTag, null);
  assert.equal(lifecycle.commitsAfterLatestTag, null);
  assert.equal(lifecycle.hasPostTagCommits, null);
});

test('invalid timestamps are omitted rather than fabricated', () => {
  const lifecycle = analyzeRepositoryLifecycle({
    repository: 'demo',
    commits: [commit('bad', 'not-a-date'), commit('good', '2026-05-01T00:00:00Z')],
    tags: [tag('broken', 'bad', 'invalid')]
  });

  assert.equal(lifecycle.commitCount, 1);
  assert.equal(lifecycle.tagCount, 0);
});

test('repository lifecycle validates bounded post-tag count', () => {
  assert.throws(() => analyzeRepositoryLifecycle({ repository: 'demo', commitsAfterLatestTag: -1 }), /integer >= 0/i);
});

test('JS repository lifecycle matches the shared v1 schema fixture', () => {
  const schema = JSON.parse(readFileSync(new URL('../fixtures/repository-lifecycle-v1-schema.json', import.meta.url), 'utf8'));
  const lifecycle = analyzeRepositoryLifecycle({ repository: 'demo' });

  for (const field of schema.lifecycleFields) {
    assert.ok(Object.hasOwn(lifecycle, field), `missing lifecycle field ${field}`);
  }
});
