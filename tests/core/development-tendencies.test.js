import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyzeDevelopmentTendencies, DEVELOPMENT_TENDENCIES_SCHEMA } from '../../src/core/index.js';

function bundle(name, evidence) {
  return {
    schema: 'giteach-repo-evidence-v1',
    repository: { name },
    evidence
  };
}

function evidence(id, path, kind) {
  return { id, path, kind };
}

test('development tendencies require repeated support across independent repositories', () => {
  const result = analyzeDevelopmentTendencies({
    bundles: [
      bundle('repo-a', [
        evidence('a-test-1', 'tests/a.test.js', 'test'),
        evidence('a-test-2', 'tests/b.test.js', 'test'),
        evidence('a-test-3', 'tests/c.test.js', 'test')
      ]),
      bundle('repo-b', [evidence('b-source', 'src/main.rs', 'source')])
    ]
  });

  assert.equal(result.schema, DEVELOPMENT_TENDENCIES_SCHEMA);
  assert.equal(result.analyzedRepositoryCount, 2);
  assert.equal(result.tendencies.some((item) => item.key === 'testing-verification'), false);
});

test('repository prevalence counts repositories, not file volume', () => {
  const result = analyzeDevelopmentTendencies({
    bundles: [
      bundle('repo-a', [
        evidence('a-test-1', 'tests/a.test.js', 'test'),
        evidence('a-test-2', 'tests/b.test.js', 'test')
      ]),
      bundle('repo-b', [evidence('b-test', 'tests/core_test.rs', 'test')]),
      bundle('repo-c', [evidence('c-source', 'src/main.go', 'source')])
    ]
  });

  const tendency = result.tendencies.find((item) => item.key === 'testing-verification');
  assert.ok(tendency);
  assert.equal(tendency.repositoryCount, 2);
  assert.equal(tendency.analyzedRepositoryCount, 3);
  assert.equal(tendency.prevalence, 0.6667);
  assert.deepEqual(tendency.repositories, ['repo-a', 'repo-b']);
  assert.deepEqual(new Set(tendency.evidenceRefs), new Set(['a-test-1', 'b-test']));
  assert.equal('expertiseScore' in tendency, false);
  assert.equal('seniority' in tendency, false);
});

test('automation and CI are deterministic path observations and can overlap', () => {
  const result = analyzeDevelopmentTendencies({
    bundles: [
      bundle('repo-a', [
        evidence('a-ci', '.github/workflows/ci.yml', 'tooling'),
        evidence('a-doc', 'README.md', 'documentation')
      ]),
      bundle('repo-b', [
        evidence('b-ci', '.circleci/config.yml', 'tooling'),
        evidence('b-doc', 'docs/ARCHITECTURE.md', 'documentation')
      ]),
      bundle('repo-c', [evidence('c-script', 'scripts/release.mjs', 'source')])
    ]
  });

  const automation = result.tendencies.find((item) => item.key === 'automation');
  const ci = result.tendencies.find((item) => item.key === 'ci-delivery');
  const documentation = result.tendencies.find((item) => item.key === 'documentation');
  const tooling = result.tendencies.find((item) => item.key === 'tooling-configuration');

  assert.equal(automation.repositoryCount, 3);
  assert.equal(automation.prevalence, 1);
  assert.deepEqual(ci.repositories, ['repo-a', 'repo-b']);
  assert.deepEqual(documentation.repositories, ['repo-a', 'repo-b']);
  assert.deepEqual(tooling.repositories, ['repo-a', 'repo-b']);
});

test('observability and benchmarking are deterministic repeated profile signals', () => {
  const result = analyzeDevelopmentTendencies({
    bundles: [
      bundle('repo-a', [
        evidence('a-metrics', 'src/telemetry/metrics.rs', 'observability'),
        evidence('a-bench', 'benches/throughput.rs', 'benchmark')
      ]),
      bundle('repo-b', [
        evidence('b-otel', 'src/instrumentation/otel.ts', 'source'),
        evidence('b-bench', 'benchmarks/render.bench.ts', 'source')
      ]),
      bundle('repo-c', [evidence('c-source', 'src/main.go', 'source')])
    ]
  });

  const observability = result.tendencies.find((item) => item.key === 'observability-instrumentation');
  const benchmarking = result.tendencies.find((item) => item.key === 'experimentation-benchmarking');

  assert.ok(observability);
  assert.ok(benchmarking);
  assert.deepEqual(observability.repositories, ['repo-a', 'repo-b']);
  assert.deepEqual(benchmarking.repositories, ['repo-a', 'repo-b']);
  assert.equal(observability.prevalence, 0.6667);
  assert.equal(benchmarking.prevalence, 0.6667);
});

test('duplicate bundles for the same repository do not inflate prevalence', () => {
  const result = analyzeDevelopmentTendencies({
    bundles: [
      bundle('repo-a', [evidence('a-test', 'tests/a.test.js', 'test')]),
      bundle('repo-a', [evidence('a-test-2', 'tests/b.test.js', 'test')]),
      bundle('repo-b', [evidence('b-test', 'tests/c.test.js', 'test')])
    ]
  });

  const tendency = result.tendencies.find((item) => item.key === 'testing-verification');
  assert.ok(tendency);
  assert.equal(result.analyzedRepositoryCount, 2);
  assert.equal(tendency.repositoryCount, 2);
  assert.equal(tendency.prevalence, 1);
});

test('minimum repository threshold cannot be weakened to a single repository', () => {
  assert.throws(() => analyzeDevelopmentTendencies({ minimumRepositories: 1 }), /integer >= 2/i);
});


test('JS development tendencies match the shared v1 schema fixture', () => {
  const schema = JSON.parse(readFileSync(new URL('../fixtures/development-tendencies-v1-schema.json', import.meta.url), 'utf8'));
  const result = analyzeDevelopmentTendencies({
    bundles: [
      bundle('repo-a', [evidence('a-test', 'tests/a.test.js', 'test')]),
      bundle('repo-b', [evidence('b-test', 'tests/b.test.js', 'test')])
    ]
  });

  for (const field of schema.profileFields) {
    assert.ok(Object.hasOwn(result, field), `missing profile field ${field}`);
  }
  for (const field of schema.tendencyFields) {
    assert.ok(Object.hasOwn(result.tendencies[0], field), `missing tendency field ${field}`);
  }
});