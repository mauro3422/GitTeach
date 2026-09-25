import { PROFILE_PRESENTATION_PAYLOAD_SCHEMA } from './ProfilePresentationPayload.js';
import { PROFILE_WIDGET_PLAN_SCHEMA } from './ProfileWidgetPlan.js';

export const PROFILE_WIDGET_DATA_SCHEMA = 'giteach-profile-widget-data-v1';

const STATISTIC_SECTIONS = new Set(['technology', 'tendencies', 'domains', 'lifecycle', 'collaboration']);

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function resolveWidgetSource(payload, widget) {
  const source = widget?.source;
  if (!source || typeof source.plane !== 'string') throw new Error(`Widget ${widget?.id ?? '<unknown>'} has no valid source.`);

  if (source.plane === 'statistics') {
    if (!STATISTIC_SECTIONS.has(source.section) || source.repository != null) {
      throw new Error(`Widget ${widget.id} has an invalid statistics source.`);
    }
    const value = payload.statistics?.[source.section];
    if (value == null) throw new Error(`Widget ${widget.id} references a missing statistics section.`);
    return value;
  }

  if (source.plane === 'technology-evolution') {
    if (source.section != null || typeof source.repository !== 'string' || !source.repository.trim()) {
      throw new Error(`Widget ${widget.id} has an invalid technology-evolution source.`);
    }
    const value = payload.technologyEvolution.find((item) => item.repository === source.repository);
    if (!value) throw new Error(`Widget ${widget.id} references missing technology evolution for ${source.repository}.`);
    return value;
  }

  if (source.plane === 'publication-context') {
    if (source.section !== 'declarations' || source.repository != null) {
      throw new Error(`Widget ${widget.id} has an invalid publication-context source.`);
    }
    return payload.publicationContext.declarations;
  }

  throw new Error(`Widget ${widget.id} references unsupported source plane ${source.plane}.`);
}

export function materializeProfileWidgetData({ payload, plan } = {}) {
  if (!payload || payload.schema !== PROFILE_PRESENTATION_PAYLOAD_SCHEMA) {
    throw new Error(`Expected ${PROFILE_PRESENTATION_PAYLOAD_SCHEMA}.`);
  }
  if (!plan || plan.schema !== PROFILE_WIDGET_PLAN_SCHEMA) {
    throw new Error(`Expected ${PROFILE_WIDGET_PLAN_SCHEMA}.`);
  }
  if (payload.actorKey !== plan.actorKey) throw new Error('Widget plan actor does not match presentation actor.');
  if (!Array.isArray(plan.widgets)) throw new Error('Widget plan requires widgets[].');

  const seen = new Set();
  const widgets = plan.widgets.map((widget) => {
    const id = String(widget?.id ?? '').trim();
    const kind = String(widget?.kind ?? '').trim();
    const title = String(widget?.title ?? '').trim();
    const visualization = String(widget?.visualization ?? '').trim();
    const valueMeaning = String(widget?.valueMeaning ?? '').trim();
    if (!id || !kind || !title || !visualization || !valueMeaning) throw new Error('Widget plan contains an incomplete widget descriptor.');
    if (seen.has(id)) throw new Error(`Duplicate widget id: ${id}.`);
    seen.add(id);
    if (!Array.isArray(widget.surfaces) || widget.surfaces.length === 0) throw new Error(`Widget ${id} requires surfaces[].`);

    return deepFreeze({
      id,
      kind,
      title,
      visualization,
      valueMeaning,
      surfaces: Object.freeze(widget.surfaces.map((value) => String(value).trim()).filter(Boolean)),
      source: deepFreeze(cloneJson(widget.source)),
      data: deepFreeze(cloneJson(resolveWidgetSource(payload, widget)))
    });
  });

  return deepFreeze({
    schema: PROFILE_WIDGET_DATA_SCHEMA,
    actorKey: payload.actorKey,
    widgets: Object.freeze(widgets)
  });
}
