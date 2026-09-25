import { PROFILE_PRESENTATION_PAYLOAD_SCHEMA } from './ProfilePresentationPayload.js';

export const PROFILE_WIDGET_PLAN_SCHEMA = 'giteach-profile-widget-plan-v1';

const SURFACES = Object.freeze(['github-profile-readme', 'portfolio']);

function widget({ id, kind, title, plane, section = null, repository = null, visualization, valueMeaning }) {
  return Object.freeze({
    id,
    kind,
    title,
    source: Object.freeze({ plane, section, repository }),
    visualization,
    valueMeaning,
    surfaces: SURFACES
  });
}

function hasMetrics(section) {
  return Array.isArray(section?.metrics) && section.metrics.length > 0;
}

export function planProfileWidgets(payload) {
  if (!payload || payload.schema !== PROFILE_PRESENTATION_PAYLOAD_SCHEMA) {
    throw new Error(`Expected ${PROFILE_PRESENTATION_PAYLOAD_SCHEMA}.`);
  }

  const widgets = [];
  const statistics = payload.statistics;

  if ((statistics.technology?.languages?.length ?? 0) > 0 || (statistics.technology?.technologies?.length ?? 0) > 0) {
    widgets.push(widget({
      id: 'technology-footprint', kind: 'technology-footprint', title: 'Technology footprint',
      plane: 'statistics', section: 'technology', visualization: 'ranked-bars',
      valueMeaning: 'repository prevalence is separate from observed file/byte volume'
    }));
  }
  if (hasMetrics(statistics.tendencies)) {
    widgets.push(widget({
      id: 'development-tendencies', kind: 'development-tendencies', title: 'Development tendencies',
      plane: 'statistics', section: 'tendencies', visualization: 'prevalence-bars',
      valueMeaning: 'supporting repositories divided by analyzed repositories; not skill level'
    }));
  }
  if (hasMetrics(statistics.domains)) {
    widgets.push(widget({
      id: 'project-domains', kind: 'project-domains', title: 'Project domains',
      plane: 'statistics', section: 'domains', visualization: 'prevalence-bars',
      valueMeaning: 'repositories supporting each project-domain candidate divided by analyzed repositories'
    }));
  }
  if (hasMetrics(statistics.lifecycle)) {
    widgets.push(widget({
      id: 'project-lifecycle', kind: 'project-lifecycle', title: 'Project lifecycle',
      plane: 'statistics', section: 'lifecycle', visualization: 'metric-grid',
      valueMeaning: 'repository and reachable Git-tag counts; not quality or seniority'
    }));
  }
  if (hasMetrics(statistics.collaboration) && statistics.collaboration.coverage != null) {
    widgets.push(widget({
      id: 'github-collaboration', kind: 'github-collaboration', title: 'GitHub collaboration',
      plane: 'statistics', section: 'collaboration', visualization: 'event-grid',
      valueMeaning: 'observed events plus supporting repository counts under explicit collection coverage'
    }));
  }

  for (const evolution of payload.technologyEvolution ?? []) {
    widgets.push(widget({
      id: `technology-evolution:${evolution.repository}`, kind: 'technology-evolution', title: `${evolution.repository} technology evolution`,
      plane: 'technology-evolution', repository: evolution.repository, visualization: 'timeline',
      valueMeaning: 'historical language file/byte observations at real sampled Git commits'
    }));
  }

  if ((payload.publicationContext?.declarations?.length ?? 0) > 0) {
    widgets.push(widget({
      id: 'approved-profile-highlights', kind: 'approved-profile-highlights', title: 'Profile highlights',
      plane: 'publication-context', section: 'declarations', visualization: 'text-cards',
      valueMeaning: 'explicitly approved self-reported or imported profile declarations; not deterministic statistics'
    }));
  }

  return Object.freeze({
    schema: PROFILE_WIDGET_PLAN_SCHEMA,
    actorKey: payload.actorKey,
    widgets: Object.freeze(widgets)
  });
}
