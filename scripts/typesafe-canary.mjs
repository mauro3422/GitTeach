import { performance } from 'node:perf_hooks';
import { TypeSafeJevAdapter, buildBoundedJevRequest } from '../src/core/index.js';

if (!process.env.TYPESAFE_API_KEY) {
  throw new Error('TYPESAFE_API_KEY is required. Use scripts/run-typesafe.ps1 locally or a CI secret.');
}

const evidence = [{
  id: 'typesafe-ci-canary',
  path: 'src/core/providers/TypeSafeJevAdapter.js',
  kind: 'source',
  subject: 'TypeSafe Jev HTTP adapter',
  excerpt: 'JavaScript class TypeSafeJevAdapter sends bounded Noul questions to the TypeSafe API.',
  sourceHash: 'typesafe-ci-source-v1',
  excerptHash: 'typesafe-ci-excerpt-v1'
}];

const state = buildBoundedJevRequest({
  repository: { name: 'GitTeach' },
  evidence,
  candidates: ['JavaScript programming', 'Kubernetes cluster administration'],
  question: 'Judge each supplied capability only from the evidence.'
});

const started = performance.now();
const result = await new TypeSafeJevAdapter({ acceptThreshold: 0 }).judge({ state });
const bySkill = new Map(result.claims.map((claim) => [claim.skill, claim.confidence]));
const positive = bySkill.get('JavaScript programming');
const negative = bySkill.get('Kubernetes cluster administration');

if (!Number.isFinite(positive) || !Number.isFinite(negative) || positive < 0.75 || negative > 0.25) {
  throw new Error(`TypeSafe canary failed: expected positive >= 0.75 and negative <= 0.25; observed positive=${positive}, negative=${negative}`);
}

console.log(JSON.stringify({
  ok: true,
  provider: result.provider,
  model: result.model,
  latencyMs: Math.round(performance.now() - started),
  usage: result.usage,
  positive,
  negative
}));
