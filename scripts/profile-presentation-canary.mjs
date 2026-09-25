import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import {
  analyzeDevelopmentTendencies,
  analyzeRepositoryDomainFingerprint,
  analyzeTechnologyFootprint,
  buildProfileStatistics,
  composeProfileSurface,
  materializeProfileWidgetData,
  planProfileWidgets,
  prepareProfilePresentationPayload
} from '../src/core/index.js';

if (process.argv.length < 4) {
  throw new Error('Usage: node scripts/profile-presentation-canary.mjs <repo-a-bundle.json> <repo-b-bundle.json>');
}

const bundles = process.argv.slice(2).map((path) => JSON.parse(readFileSync(pathToFileURL(path), 'utf8')));
const technology = analyzeTechnologyFootprint({ bundles });
const tendencies = analyzeDevelopmentTendencies({ bundles, minimumRepositories: 2 });
const domainFingerprints = bundles.map((bundle) => analyzeRepositoryDomainFingerprint({ bundle }));
const statistics = buildProfileStatistics({ technology, tendencies, domainFingerprints });
const payload = prepareProfilePresentationPayload({
  actorKey: 'developer:canary',
  statistics,
  technologyEvolution: [],
  publicationContext: {
    schema: 'giteach-profile-publication-context-v1',
    actorKey: 'developer:canary',
    declarations: []
  }
});
const plan = planProfileWidgets(payload);
const widgetData = materializeProfileWidgetData({ payload, plan });
const githubComposition = composeProfileSurface({ widgetData, surface: 'github-profile-readme' });
const portfolioComposition = composeProfileSurface({ widgetData, surface: 'portfolio' });

const forbidden = JSON.stringify({ widgetData, githubComposition, portfolioComposition }).match(/score|expertise|seniority|quality/gi) ?? [];
if (forbidden.length > 0) throw new Error(`Forbidden widget-data semantics: ${[...new Set(forbidden)].join(', ')}`);

console.log(JSON.stringify({
  ok: true,
  repositories: bundles.map((bundle) => bundle.repository.name),
  presentationSchema: payload.schema,
  widgetPlanSchema: plan.schema,
  widgetDataSchema: widgetData.schema,
  widgets: widgetData.widgets.map((widget) => ({
    id: widget.id,
    kind: widget.kind,
    visualization: widget.visualization,
    source: widget.source,
    valueMeaning: widget.valueMeaning,
    dataKeys: Array.isArray(widget.data) ? ['array'] : Object.keys(widget.data)
  })),
  githubSections: githubComposition.sections,
  portfolioSections: portfolioComposition.sections
}, null, 2));
