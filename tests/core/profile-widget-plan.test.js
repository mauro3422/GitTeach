import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  PROFILE_WIDGET_PLAN_SCHEMA,
  PROFILE_PRESENTATION_PAYLOAD_SCHEMA,
  planProfileWidgets
} from '../../src/core/index.js';

function payload(overrides = {}) {
  return {
    schema: PROFILE_PRESENTATION_PAYLOAD_SCHEMA,
    actorKey: 'developer:mauro',
    statistics: {
      schema: 'giteach-profile-statistics-v1',
      technology: { analyzedRepositoryCount: 2, languages: [{ key: 'rust' }], technologies: [] },
      tendencies: { analyzedRepositoryCount: 2, metrics: [{ key: 'automation', value: 1, unit: 'repository-prevalence' }] },
      domains: { analyzedRepositoryCount: 2, metrics: [{ key: 'developer-tooling', value: 0.5, unit: 'repository-prevalence' }] },
      lifecycle: { analyzedRepositoryCount: 2, metrics: [{ key: 'repositories-with-history', value: 2, unit: 'repositories' }] },
      collaboration: { analyzedRepositoryCount: 2, coverage: { reviewCoverageMode: 'targeted' }, metrics: [{ key: 'authored-pull-requests', value: 3, unit: 'events' }] }
    },
    technologyEvolution: [{ repository: 'kode', snapshots: [] }],
    publicationContext: {
      schema: 'giteach-profile-publication-context-v1',
      actorKey: 'developer:mauro',
      declarations: [{ id: 'decl-1', category: 'development-tendency', key: 'automation', value: 'I automate repetitive work.', sourceKind: 'user-answer', repositories: ['kode'] }]
    },
    ...overrides
  };
}

function forbiddenKeys(value, path = '$') {
  const found = [];
  if (!value || typeof value !== 'object') return found;
  for (const [key, child] of Object.entries(value)) {
    if (/score|expertise|seniority|quality/i.test(key)) found.push(`${path}.${key}`);
    found.push(...forbiddenKeys(child, `${path}.${key}`));
  }
  return found;
}

test('widget plan maps each presentation plane to an explicit semantic widget without redefining values', () => {
  const plan = planProfileWidgets(payload());
  assert.equal(plan.schema, PROFILE_WIDGET_PLAN_SCHEMA);
  assert.deepEqual(plan.widgets.map((item) => item.kind), [
    'technology-footprint', 'development-tendencies', 'project-domains', 'project-lifecycle',
    'github-collaboration', 'technology-evolution', 'approved-profile-highlights'
  ]);
  assert.equal(plan.widgets.find((item) => item.kind === 'development-tendencies').source.section, 'tendencies');
  assert.match(plan.widgets.find((item) => item.kind === 'development-tendencies').valueMeaning, /not skill level/i);
  assert.equal(plan.widgets.find((item) => item.kind === 'technology-evolution').source.repository, 'kode');
  assert.equal(plan.widgets.find((item) => item.kind === 'approved-profile-highlights').source.plane, 'publication-context');
  assert.deepEqual(forbiddenKeys(plan), []);
});

test('empty presentation data produces no fabricated widgets', () => {
  const plan = planProfileWidgets(payload({
    statistics: {
      schema: 'giteach-profile-statistics-v1',
      technology: { analyzedRepositoryCount: 0, languages: [], technologies: [] },
      tendencies: { analyzedRepositoryCount: 0, metrics: [] },
      domains: { analyzedRepositoryCount: 0, metrics: [] },
      lifecycle: { analyzedRepositoryCount: 0, metrics: [] },
      collaboration: { analyzedRepositoryCount: 0, coverage: null, metrics: [] }
    },
    technologyEvolution: [],
    publicationContext: { schema: 'giteach-profile-publication-context-v1', actorKey: 'developer:mauro', declarations: [] }
  }));
  assert.deepEqual(plan.widgets, []);
});

test('targeted collaboration is rendered only when coverage is explicit', () => {
  const withoutCoverage = payload();
  withoutCoverage.statistics = { ...withoutCoverage.statistics, collaboration: { analyzedRepositoryCount: 2, coverage: null, metrics: [{ key: 'authored-pull-requests', value: 3, unit: 'events' }] } };
  assert.equal(planProfileWidgets(withoutCoverage).widgets.some((item) => item.kind === 'github-collaboration'), false);
});

test('widget plan references source planes instead of duplicating raw profile data', () => {
  const plan = planProfileWidgets(payload());
  const serialized = JSON.stringify(plan);
  assert.doesNotMatch(serialized, /I automate repetitive work\./);
  assert.doesNotMatch(serialized, /authored-pull-requests/);
  assert.doesNotMatch(serialized, /developer-tooling/);
});

test('widget plan rejects incompatible presentation contracts', () => {
  assert.throws(() => planProfileWidgets({ schema: 'wrong' }), /giteach-profile-presentation-v1/);
});

test('ProfileWidgetPlan JS matches the shared schema fixture', () => {
  const plan = planProfileWidgets(payload());
  const schema = JSON.parse(readFileSync(new URL('../fixtures/profile-widget-plan-v1-schema.json', import.meta.url), 'utf8'));
  for (const field of schema.fields) assert.ok(Object.hasOwn(plan, field), `missing widget plan field ${field}`);
  for (const field of schema.widgetFields) assert.ok(Object.hasOwn(plan.widgets[0], field), `missing widget field ${field}`);
  for (const field of schema.sourceFields) assert.ok(Object.hasOwn(plan.widgets[0].source, field), `missing widget source field ${field}`);
});
