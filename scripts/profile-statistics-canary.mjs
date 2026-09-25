import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import {
  analyzeDevelopmentTendencies,
  analyzeRepositoryDomainFingerprint,
  analyzeTechnologyFootprint,
  buildProfileStatistics
} from '../src/core/index.js';

if (process.argv.length < 4) {
  throw new Error('Usage: node scripts/profile-statistics-canary.mjs <repo-a-bundle.json> <repo-b-bundle.json>');
}

const bundles = process.argv.slice(2).map((path) => JSON.parse(readFileSync(pathToFileURL(path), 'utf8')));
const technology = analyzeTechnologyFootprint({ bundles });
const tendencies = analyzeDevelopmentTendencies({ bundles, minimumRepositories: 2 });
const domainFingerprints = bundles.map((bundle) => analyzeRepositoryDomainFingerprint({ bundle }));
const statistics = buildProfileStatistics({ technology, tendencies, domainFingerprints });

const forbidden = [];
function scan(value, path = '$') {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (/score|expertise|seniority/i.test(key)) forbidden.push(`${path}.${key}`);
    scan(child, `${path}.${key}`);
  }
}
scan(statistics);
if (forbidden.length > 0) throw new Error(`Forbidden metric fields: ${forbidden.join(', ')}`);

console.log(JSON.stringify({
  ok: true,
  repositories: bundles.map((bundle) => bundle.repository.name),
  statistics
}, null, 2));
