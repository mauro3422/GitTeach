import { PROFILE_WIDGET_DATA_SCHEMA } from './ProfileWidgetData.js';

export const PROFILE_SURFACE_COMPOSITION_SCHEMA = 'giteach-profile-surface-composition-v1';
export const PROFILE_SURFACES = Object.freeze(['github-profile-readme', 'portfolio']);

const SECTION_BY_KIND = Object.freeze({
  'approved-profile-highlights': 'profile',
  'technology-footprint': 'technology',
  'development-tendencies': 'patterns',
  'project-domains': 'patterns',
  'project-lifecycle': 'history',
  'technology-evolution': 'history',
  'github-collaboration': 'collaboration'
});

const TITLES = Object.freeze({
  profile: 'Profile highlights',
  technology: 'Technology',
  patterns: 'Development patterns',
  history: 'Project history',
  collaboration: 'Collaboration'
});

const ORDERS = Object.freeze({
  'github-profile-readme': Object.freeze(['profile', 'technology', 'patterns', 'history', 'collaboration']),
  portfolio: Object.freeze(['profile', 'patterns', 'technology', 'history', 'collaboration'])
});

function normalizeSurface(value) {
  if (!PROFILE_SURFACES.includes(value)) throw new Error(`Unsupported profile surface: ${value}.`);
  return value;
}

export function composeProfileSurface({ widgetData, surface } = {}) {
  if (!widgetData || widgetData.schema !== PROFILE_WIDGET_DATA_SCHEMA) {
    throw new Error(`Expected ${PROFILE_WIDGET_DATA_SCHEMA}.`);
  }
  const target = normalizeSurface(surface);
  if (!Array.isArray(widgetData.widgets)) throw new Error('Widget data requires widgets[].');

  const groups = new Map();
  const seen = new Set();
  for (const widget of widgetData.widgets) {
    const id = String(widget?.id ?? '').trim();
    if (!id) throw new Error('Widget data contains an empty id.');
    if (seen.has(id)) throw new Error(`Duplicate widget id: ${id}.`);
    seen.add(id);
    if (!Array.isArray(widget.surfaces)) throw new Error(`Widget ${id} requires surfaces[].`);
    if (!widget.surfaces.includes(target)) continue;
    const sectionId = SECTION_BY_KIND[widget.kind];
    if (!sectionId) throw new Error(`Unsupported widget kind for composition: ${widget.kind}.`);
    if (!groups.has(sectionId)) groups.set(sectionId, []);
    groups.get(sectionId).push(id);
  }

  const sections = ORDERS[target]
    .filter((id) => (groups.get(id)?.length ?? 0) > 0)
    .map((id) => Object.freeze({
      id,
      title: TITLES[id],
      widgetIds: Object.freeze([...groups.get(id)])
    }));

  return Object.freeze({
    schema: PROFILE_SURFACE_COMPOSITION_SCHEMA,
    actorKey: widgetData.actorKey,
    surface: target,
    sections: Object.freeze(sections)
  });
}
