import {
  EvidenceLedger,
  appendGitHubRepositoryFacts,
  githubFactsToActorEvidence,
  githubRestPayloadToRepositoryFacts
} from '../src/core/index.js';

const [owner, repo, pullNumberRaw, connectedLogin] = process.argv.slice(2);
const pullNumber = Number(pullNumberRaw);
if (!owner || !repo || !Number.isInteger(pullNumber) || pullNumber <= 0 || !connectedLogin) {
  console.error('usage: node scripts/github-public-canary.mjs OWNER REPO PULL_NUMBER LOGIN');
  process.exit(2);
}

const headers = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2026-03-10',
  'User-Agent': 'GitTeach-public-canary'
};

function rateLimit(response) {
  return {
    limit: response.headers.get('x-ratelimit-limit'),
    remaining: response.headers.get('x-ratelimit-remaining'),
    reset: response.headers.get('x-ratelimit-reset'),
    retryAfter: response.headers.get('retry-after'),
    resource: response.headers.get('x-ratelimit-resource')
  };
}

async function request(path, { required = false } = {}) {
  const response = await fetch(`https://api.github.com${path}`, { headers });
  const limit = rateLimit(response);
  if (response.ok) return { ok: true, status: response.status, limit, value: await response.json() };

  const failure = { ok: false, status: response.status, limit, path };
  if (required) {
    console.log(JSON.stringify({ status: 'degraded', reason: 'required-github-request-failed', failure }, null, 2));
    process.exit(response.status === 403 || response.status === 429 ? 3 : 4);
  }
  return failure;
}

const encodedOwner = encodeURIComponent(owner);
const encodedRepo = encodeURIComponent(repo);
const base = `/repos/${encodedOwner}/${encodedRepo}`;

// Keep public smoke requests serial. GitHub explicitly recommends serial requests
// to reduce secondary-rate-limit pressure.
const pullResult = await request(`${base}/pulls/${pullNumber}`, { required: true });
const reviewsResult = await request(`${base}/pulls/${pullNumber}/reviews`);
const issueResult = await request(`${base}/issues/${pullNumber}`);

const facts = githubRestPayloadToRepositoryFacts({
  repository: { owner, name: repo },
  connectedLogin,
  observedAt: new Date().toISOString(),
  pullRequests: [pullResult.value],
  reviews: reviewsResult.ok ? reviewsResult.value : [],
  // GitHub exposes PRs through Issues endpoints too; the adapter must filter this.
  issues: issueResult.ok ? [issueResult.value] : []
});
const ledger = new EvidenceLedger();
appendGitHubRepositoryFacts(ledger, facts);
const actorEvidence = githubFactsToActorEvidence({
  actorKey: `github:${connectedLogin.toLowerCase()}`,
  bundle: facts
});

const optionalFailures = [reviewsResult, issueResult]
  .filter((result) => !result.ok)
  .map(({ status, limit, path }) => ({ status, limit, path }));

console.log(JSON.stringify({
  status: optionalFailures.length === 0 ? 'pass' : 'degraded',
  repository: facts.repository.fullName,
  pullNumber,
  summary: facts.summary,
  connectedActorActivity: facts.connectedActorActivity,
  factRefs: facts.facts.map((fact) => fact.factRef),
  ledgerRecordCount: ledger.list().length,
  actorEvidence: actorEvidence.map((record) => ({
    relation: record.relation,
    sourceRef: record.sourceRef,
    targetEvidenceRefs: record.targetEvidenceRefs,
    implementationOrigin: record.implementationOrigin
  })),
  optionalFailures,
  rateLimit: pullResult.limit
}, null, 2));
