import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  PROFILE_PRESENTATION_PAYLOAD_SCHEMA,
  PROFILE_WIDGET_DATA_SCHEMA,
  PROFILE_WIDGET_PLAN_SCHEMA,
  materializeProfileWidgetData,
  planProfileWidgets
} from '../../src/core/index.js';

function payload() {
  return {
    schema: PROFILE_PRESENTATION_PAYLOAD_SCHEMA,
    actorKey: 'developer:mauro',
    statistics: {
      schema: 'giteach-profile-statistics-v1',
      technology: { analyzedRepositoryCount: 2, languages: [{ key: 'rust', repositoryCount: 2 }], technologies: [] },
      tendencies: { analyzedRepositoryCount: 2, metrics: [{ key: 'automation', value: 1, unit: 'repository-prevalence' }] },
      domains: { analyzedRepositoryCount: 2, metrics: [{ key: 'developer-tooling', value: 0.5, unit: 'repository-prevalence' }] },
      lifecycle: { analyzedRepositoryCount: 0, metrics: [] },
      collaboration: { analyzedRepositoryCount: 0, coverage: null, metrics: [] }
    },
    technologyEvolution: [{
      schema: 'giteach-technology-evolution-v1',
      repository: 'kode', source: 'git-local-tree', headCommit: 'aaaa', commitCount: 1, snapshotCount: 1,
      sampling: { strategy: 'evenly-spaced-commits-v1', maxSnapshots: 8, completeHistory: true },
      snapshots: [{ commit: 'aaaa', committedAt: '2026-09-24T10:00:00Z', sourceFileCount: 1, languages: [{ language: 'Rust', files: 1, bytes: 100 }] }],
      deterministic: true
    }],
    publicationContext: {
      schema: 'giteach-profile-publication-context-v1', actorKey: 'developer:mauro',
      declarations: [{ id: 'decl-1', category: 'development-tendency', key: 'automation', value: 'I automate repetitive work.', sourceKind: 'user-answer', repositories: ['kode'] }]
    }
  };
}

test('widget data resolves only the source plane referenced by each planned widget', () => {
  const presentation = payload();
  const plan = planProfileWidgets(presentation);
  const result = materializeProfileWidgetData({ payload: presentation, plan });

  assert.equal(result.schema, PROFILE_WIDGET_DATA_SCHEMA);
  assert.equal(result.actorKey, 'developer:mauro');
  assert.deepEqual(result.widgets.map((item) => item.kind), [
    'technology-footprint', 'development-tendencies', 'project-domains',
    'technology-evolution', 'approved-profile-highlights'
  ]);
  assert.deepEqual(result.widgets[0].data, presentation.statistics.technology);
  assert.deepEqual(result.widgets.find((item) => item.kind === 'technology-evolution').data, presentation.technologyEvolution[0]);
  assert.deepEqual(result.widgets.find((item) => item.kind === 'approved-profile-highlights').data, presentation.publicationContext.declarations);
});

test('widget data does not expose unrelated presentation planes in a widget data payload', () => {
  const presentation = payload();
  const result = materializeProfileWidgetData({ payload: presentation, plan: planProfileWidgets(presentation) });
  const technology = result.widgets.find((item) => item.kind === 'technology-footprint');
  const serialized = JSON.stringify(technology);
  assert.doesNotMatch(serialized, /I automate repetitive work/);
  assert.doesNotMatch(serialized, /2026-09-24T10:00:00Z/);
  assert.doesNotMatch(serialized, /developer-tooling/);
});

test('widget data fails closed on actor mismatch, missing source and unsupported source plane', () => {
  const presentation = payload();
  const plan = planProfileWidgets(presentation);
  assert.throws(() => materializeProfileWidgetData({ payload: presentation, plan: { ...plan, actorKey: 'developer:other' } }), /actor does not match/);

  const missingRepo = structuredClone(plan);
  const timeline = missingRepo.widgets.find((item) => item.kind === 'technology-evolution');
  timeline.source.repository = 'missing';
  assert.throws(() => materializeProfileWidgetData({ payload: presentation, plan: missingRepo }), /missing technology evolution/);

  const unsupported = structuredClone(plan);
  unsupported.widgets[0].source.plane = 'private-ledger';
  assert.throws(() => materializeProfileWidgetData({ payload: presentation, plan: unsupported }), /unsupported source plane/);
});

test('widget data rejects duplicate widget ids and incomplete descriptors', () => {
  const presentation = payload();
  const plan = structuredClone(planProfileWidgets(presentation));
  plan.widgets[1].id = plan.widgets[0].id;
  assert.throws(() => materializeProfileWidgetData({ payload: presentation, plan }), /Duplicate widget id/);

  const incomplete = structuredClone(planProfileWidgets(presentation));
  incomplete.widgets[0].visualization = '';
  assert.throws(() => materializeProfileWidgetData({ payload: presentation, plan: incomplete }), /incomplete widget descriptor/);
});

test('ProfileWidgetData JS matches the shared schema fixture', () => {
  const presentation = payload();
  const result = materializeProfileWidgetData({ payload: presentation, plan: planProfileWidgets(presentation) });
  const schema = JSON.parse(readFileSync(new URL('../fixtures/profile-widget-data-v1-schema.json', import.meta.url), 'utf8'));
  for (const field of schema.fields) assert.ok(Object.hasOwn(result, field), `missing widget data field ${field}`);
  for (const field of schema.widgetFields) assert.ok(Object.hasOwn(result.widgets[0], field), `missing widget data widget field ${field}`);
  for (const field of schema.sourceFields) assert.ok(Object.hasOwn(result.widgets[0].source, field), `missing widget data source field ${field}`);
});

test('widget data requires the canonical presentation and widget-plan schemas', () => {
  const presentation = payload();
  const plan = planProfileWidgets(presentation);
  assert.throws(() => materializeProfileWidgetData({ payload: { ...presentation, schema: 'wrong' }, plan }), new RegExp(PROFILE_PRESENTATION_PAYLOAD_SCHEMA));
  assert.throws(() => materializeProfileWidgetData({ payload: presentation, plan: { ...plan, schema: 'wrong' } }), new RegExp(PROFILE_WIDGET_PLAN_SCHEMA));
});
