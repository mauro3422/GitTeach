import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  EvidenceLedger,
  GITHUB_REPOSITORY_FACTS_SCHEMA,
  appendGitHubRepositoryFacts,
  createGitHubRepositoryFacts,
  githubFactsToActorEvidence,
  githubRestPayloadToRepositoryFacts
} from '../../src/core/index.js';

function payload() {
  return {
    repository: { owner: 'acme', name: 'demo' },
    connectedLogin: 'Mauro',
    observedAt: '2026-09-23T20:00:00.000Z',
    releases: [{
      id: 100,
      tag_name: 'v1.0.0',
      draft: false,
      prerelease: false,
      author: { login: 'mauro' },
      created_at: '2026-08-01T10:00:00Z',
      published_at: '2026-08-01T11:00:00Z',
      html_url: 'https://github.com/acme/demo/releases/tag/v1.0.0'
    }],
    pullRequests: [{
      id: 200,
      number: 12,
      state: 'closed',
      draft: false,
      user: { login: 'Mauro' },
      created_at: '2026-08-02T10:00:00Z',
      updated_at: '2026-08-03T10:00:00Z',
      closed_at: '2026-08-03T10:00:00Z',
      merged_at: '2026-08-03T09:59:00Z',
      html_url: 'https://github.com/acme/demo/pull/12',
      head: { ref: 'feature' },
      base: { ref: 'main' }
    }],
    reviews: [{
      id: 300,
      user: { login: 'MAURO' },
      state: 'APPROVED',
      submitted_at: '2026-08-03T09:00:00Z',
      commit_id: 'abc123',
      author_association: 'COLLABORATOR',
      pull_request_url: 'https://api.github.com/repos/acme/demo/pulls/12',
      html_url: 'https://github.com/acme/demo/pull/12#pullrequestreview-300'
    }],
    issues: [
      {
        id: 400,
        number: 5,
        state: 'closed',
        user: { login: 'other' },
        created_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        closed_at: '2026-07-02T10:00:00Z',
        html_url: 'https://github.com/acme/demo/issues/5'
      },
      {
        id: 401,
        number: 12,
        state: 'closed',
        user: { login: 'Mauro' },
        pull_request: { url: 'https://api.github.com/repos/acme/demo/pulls/12' },
        html_url: 'https://github.com/acme/demo/pull/12'
      }
    ]
  };
}

test('GitHub REST facts preserve releases, PRs, reviews and true issues as distinct facts', () => {
  const facts = githubRestPayloadToRepositoryFacts(payload());

  assert.equal(facts.schema, GITHUB_REPOSITORY_FACTS_SCHEMA);
  assert.equal(facts.repository.fullName, 'acme/demo');
  assert.equal(facts.summary.releaseCount, 1);
  assert.equal(facts.summary.publishedReleaseCount, 1);
  assert.equal(facts.summary.pullRequestCount, 1);
  assert.equal(facts.summary.mergedPullRequestCount, 1);
  assert.equal(facts.summary.reviewCount, 1);
  assert.equal(facts.summary.issueCount, 1);
  assert.equal(facts.summary.closedIssueCount, 1);
  assert.equal(facts.facts.length, 4);
  assert.equal(facts.facts.some((fact) => fact.factRef === 'github:acme/demo:issue:401'), false);
});

test('connected GitHub activity is descriptive identity-linked counting, not an expertise score', () => {
  const facts = githubRestPayloadToRepositoryFacts(payload());

  assert.deepEqual(facts.connectedActorActivity, {
    login: 'Mauro',
    authoredReleaseCount: 1,
    authoredPullRequestCount: 1,
    submittedReviewCount: 1,
    authoredIssueCount: 0
  });
  assert.equal('expertiseScore' in facts, false);
  assert.equal('seniority' in facts, false);
});
test('pending review remains a fact but is excluded from submitted connected activity', () => {
  const facts = createGitHubRepositoryFacts({
    repository: { owner: 'acme', name: 'demo' },
    connectedLogin: 'mauro',
    observedAt: '2026-09-23T20:00:00.000Z',
    facts: [
      { kind: 'review', sourceId: 'pending', actorLogin: 'mauro', state: 'PENDING', createdAt: null },
      { kind: 'review', sourceId: 'submitted', actorLogin: 'mauro', state: 'APPROVED', createdAt: '2026-09-23T19:00:00Z' }
    ]
  });

  assert.equal(facts.summary.reviewCount, 2);
  assert.equal(facts.connectedActorActivity.submittedReviewCount, 1);
});


test('GitHub facts keep release records distinct from ordinary Git tags', () => {
  const facts = githubRestPayloadToRepositoryFacts({
    repository: { owner: 'acme', name: 'demo' },
    releases: []
  });

  assert.equal(facts.summary.releaseCount, 0);
  assert.equal(facts.facts.some((fact) => fact.kind === 'release'), false);
});

test('review pull number can be derived from the official pull_request_url shape', () => {
  const facts = githubRestPayloadToRepositoryFacts({
    repository: { owner: 'acme', name: 'demo' },
    reviews: [{
      id: 300,
      state: 'CHANGES_REQUESTED',
      user: { login: 'reviewer' },
      pull_request_url: 'https://api.github.com/repos/acme/demo/pulls/42'
    }]
  });

  assert.equal(facts.facts[0].kind, 'review');
  assert.equal(facts.facts[0].number, 42);
});

test('GitHub facts append to EvidenceLedger with stable resolvable fact refs', () => {
  const facts = githubRestPayloadToRepositoryFacts(payload());
  const ledger = new EvidenceLedger();
  const appended = appendGitHubRepositoryFacts(ledger, facts);

  assert.equal(appended.length, 4);
  for (const fact of facts.facts) {
    assert.equal(ledger.has(fact.factRef), true);
    const evidence = ledger.get(fact.factRef);
    assert.equal(evidence.repo, 'acme/demo');
    assert.equal(evidence.kind, `github-${fact.kind}`);
    assert.equal(evidence.metadata.sourceKind, 'github');
  }
  assert.equal(ledger.get('github:acme/demo:review:300').commit, 'abc123');
});

test('duplicate GitHub facts are rejected instead of silently double-counting', () => {
  assert.throws(() => createGitHubRepositoryFacts({
    repository: { owner: 'acme', name: 'demo' },
    facts: [
      { kind: 'issue', sourceId: '1' },
      { kind: 'issue', sourceId: '1' }
    ]
  }), /duplicate github fact/i);
});

test('GitHub repository facts match the shared v1 schema fixture', () => {
  const schema = JSON.parse(readFileSync(new URL('../fixtures/github-repository-facts-v1-schema.json', import.meta.url), 'utf8'));
  const facts = githubRestPayloadToRepositoryFacts(payload());

  for (const field of schema.bundleFields) assert.ok(Object.hasOwn(facts, field), `missing bundle field ${field}`);
  for (const field of schema.repositoryFields) assert.ok(Object.hasOwn(facts.repository, field), `missing repository field ${field}`);
  for (const field of schema.factFields) assert.ok(Object.hasOwn(facts.facts[0], field), `missing fact field ${field}`);
  for (const field of schema.summaryFields) assert.ok(Object.hasOwn(facts.summary, field), `missing summary field ${field}`);
  for (const field of schema.connectedActorActivityFields) {
    assert.ok(Object.hasOwn(facts.connectedActorActivity, field), `missing actor activity field ${field}`);
  }
});


test('connected authored PR becomes identity-linked ActorEvidence and submitted review becomes agency evidence', () => {
  const facts = githubRestPayloadToRepositoryFacts(payload());
  const actorEvidence = githubFactsToActorEvidence({ actorKey: 'developer:mauro', bundle: facts });

  assert.equal(actorEvidence.length, 2);
  const authored = actorEvidence.find((record) => record.relation === 'authored-change');
  const reviewed = actorEvidence.find((record) => record.relation === 'reviewed-change');
  assert.ok(authored);
  assert.ok(reviewed);
  assert.equal(authored.implementationOrigin, 'unknown');
  assert.equal(reviewed.implementationOrigin, 'unknown');
  assert.deepEqual(authored.targetEvidenceRefs, ['github:acme/demo:pull-request:200']);
  assert.deepEqual(reviewed.targetEvidenceRefs, ['github:acme/demo:review:300']);
  assert.equal(authored.sourceKind, 'github');
  assert.equal(reviewed.sourceKind, 'github');
});

test('pending GitHub review is not promoted to review agency before submission', () => {
  const facts = githubRestPayloadToRepositoryFacts({
    repository: { owner: 'acme', name: 'demo' },
    connectedLogin: 'mauro',
    reviews: [{
      id: 301,
      user: { login: 'mauro' },
      state: 'PENDING',
      pull_request_url: 'https://api.github.com/repos/acme/demo/pulls/12'
    }]
  });

  assert.deepEqual(githubFactsToActorEvidence({ actorKey: 'developer:mauro', bundle: facts }), []);
});

test('GitHub releases and issues remain facts and do not fabricate engineering agency relations', () => {
  const facts = githubRestPayloadToRepositoryFacts({
    repository: { owner: 'acme', name: 'demo' },
    connectedLogin: 'mauro',
    releases: [{ id: 1, tag_name: 'v1', author: { login: 'mauro' } }],
    issues: [{ id: 2, number: 2, user: { login: 'mauro' }, state: 'open' }]
  });

  assert.equal(facts.connectedActorActivity.authoredReleaseCount, 1);
  assert.equal(facts.connectedActorActivity.authoredIssueCount, 1);
  assert.deepEqual(githubFactsToActorEvidence({ actorKey: 'developer:mauro', bundle: facts }), []);
});
