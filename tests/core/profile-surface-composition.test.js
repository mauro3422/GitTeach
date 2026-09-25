import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  PROFILE_SURFACE_COMPOSITION_SCHEMA,
  PROFILE_WIDGET_DATA_SCHEMA,
  composeProfileSurface
} from '../../src/core/index.js';

function widget(id, kind, surfaces = ['github-profile-readme', 'portfolio']) {
  return {
    id,
    kind,
    title: id,
    visualization: 'test',
    valueMeaning: 'test semantic meaning',
    surfaces,
    source: { plane: 'statistics', section: 'technology', repository: null },
    data: { secretMarker: `data:${id}` }
  };
}

function widgetData(overrides = {}) {
  return {
    schema: PROFILE_WIDGET_DATA_SCHEMA,
    actorKey: 'developer:mauro',
    widgets: [
      widget('highlights', 'approved-profile-highlights'),
      widget('technology', 'technology-footprint'),
      widget('tendencies', 'development-tendencies'),
      widget('domains', 'project-domains'),
      widget('lifecycle', 'project-lifecycle'),
      widget('timeline:kode', 'technology-evolution'),
      widget('collaboration', 'github-collaboration')
    ],
    ...overrides
  };
}

test('GitHub README composition references widget ids in semantic section order without copying data', () => {
  const result = composeProfileSurface({ widgetData: widgetData(), surface: 'github-profile-readme' });
  assert.equal(result.schema, PROFILE_SURFACE_COMPOSITION_SCHEMA);
  assert.equal(result.actorKey, 'developer:mauro');
  assert.deepEqual(result.sections.map((item) => item.id), ['profile', 'technology', 'patterns', 'history', 'collaboration']);
  assert.deepEqual(result.sections.find((item) => item.id === 'patterns').widgetIds, ['tendencies', 'domains']);
  assert.deepEqual(result.sections.find((item) => item.id === 'history').widgetIds, ['lifecycle', 'timeline:kode']);
  assert.doesNotMatch(JSON.stringify(result), /secretMarker|data:technology/);
});

test('portfolio composition uses portfolio ordering without redefining widget values', () => {
  const result = composeProfileSurface({ widgetData: widgetData(), surface: 'portfolio' });
  assert.deepEqual(result.sections.map((item) => item.id), ['profile', 'patterns', 'technology', 'history', 'collaboration']);
});

test('surface composition omits widgets not enabled for the target surface', () => {
  const data = widgetData();
  data.widgets = data.widgets.map((item) => item.id === 'collaboration' ? { ...item, surfaces: ['portfolio'] } : item);
  const github = composeProfileSurface({ widgetData: data, surface: 'github-profile-readme' });
  const portfolio = composeProfileSurface({ widgetData: data, surface: 'portfolio' });
  assert.equal(github.sections.some((section) => section.widgetIds.includes('collaboration')), false);
  assert.equal(portfolio.sections.some((section) => section.widgetIds.includes('collaboration')), true);
});

test('surface composition fails closed on duplicate ids or unknown visible widget kinds', () => {
  const duplicated = widgetData();
  duplicated.widgets[1] = { ...duplicated.widgets[1], id: duplicated.widgets[0].id };
  assert.throws(() => composeProfileSurface({ widgetData: duplicated, surface: 'portfolio' }), /Duplicate widget id/);

  const unknown = widgetData();
  unknown.widgets.push(widget('future', 'unknown-kind'));
  assert.throws(() => composeProfileSurface({ widgetData: unknown, surface: 'portfolio' }), /Unsupported widget kind/);
});

test('surface composition rejects unsupported schemas and surfaces', () => {
  assert.throws(() => composeProfileSurface({ widgetData: { ...widgetData(), schema: 'wrong' }, surface: 'portfolio' }), new RegExp(PROFILE_WIDGET_DATA_SCHEMA));
  assert.throws(() => composeProfileSurface({ widgetData: widgetData(), surface: 'social-feed' }), /Unsupported profile surface/);
});

test('ProfileSurfaceComposition JS matches shared schema fixture', () => {
  const result = composeProfileSurface({ widgetData: widgetData(), surface: 'portfolio' });
  const schema = JSON.parse(readFileSync(new URL('../fixtures/profile-surface-composition-v1-schema.json', import.meta.url), 'utf8'));
  for (const field of schema.fields) assert.ok(Object.hasOwn(result, field), `missing composition field ${field}`);
  for (const field of schema.sectionFields) assert.ok(Object.hasOwn(result.sections[0], field), `missing section field ${field}`);
});
