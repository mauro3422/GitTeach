import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

import {
  IncrementalJevSemanticProvider,
  TypeSafeJevAdapter,
  repoEvidenceBundleToLedger,
  selectCandidateEvidence
} from '../src/core/index.js';

if (!process.env.TYPESAFE_API_KEY) {
  throw new Error('TYPESAFE_API_KEY is required. Use scripts/run-typesafe.ps1 locally.');
}

const bundlePath = new URL('../.mssr/runtime/kode-scan.json', import.meta.url);
const bundle = JSON.parse(readFileSync(bundlePath, 'utf8'));
const ledger = repoEvidenceBundleToLedger(bundle);
const candidates = ['Rust', 'Monaco', 'Kubernetes'];
const selected = selectCandidateEvidence({
  evidence: ledger.list(),
  candidates,
  maxPerCandidate: 3,
  maxTotal: 6
});
const candidateEvidenceRefs = Object.fromEntries(
  selected.candidateMatches.map((item) => [item.candidate, [...item.evidenceRefs]])
);

const adapter = new TypeSafeJevAdapter({ acceptThreshold: 0.75 });
let providerCalls = 0;
const provider = new IncrementalJevSemanticProvider({
  providerPolicyKey: adapter.getSemanticPolicyKey(),
  judge: async (args) => {
    providerCalls += 1;
    return adapter.judge(args);
  }
});

const repository = { name: bundle.repository.name, url: bundle.repository.remote_url ?? null };

const firstStarted = performance.now();
const first = await provider.inferProjectSemantics({
  repository,
  evidence: selected.evidence,
  candidates,
  candidateEvidenceRefs
});
const firstCalls = providerCalls;
const firstLatencyMs = Math.round(performance.now() - firstStarted);

const secondStarted = performance.now();
const second = await provider.inferProjectSemantics({
  repository,
  evidence: selected.evidence,
  candidates,
  candidateEvidenceRefs,
  previousObservations: first.observations
});
const secondCallDelta = providerCalls - firstCalls;
const secondLatencyMs = Math.round(performance.now() - secondStarted);

const rustRef = candidateEvidenceRefs.Rust?.[0];
if (!rustRef) throw new Error('Incremental canary requires at least one selected Rust evidence ref.');
const changedEvidence = selected.evidence.map((record) => record.id === rustRef
  ? { ...record, excerpt: `${record.excerpt ?? ''}\n// incremental-canary-content-change` }
  : record);

const thirdStarted = performance.now();
const third = await provider.inferProjectSemantics({
  repository,
  evidence: changedEvidence,
  candidates,
  candidateEvidenceRefs,
  previousObservations: second.observations
});
const thirdCallDelta = providerCalls - firstCalls - secondCallDelta;
const thirdLatencyMs = Math.round(performance.now() - thirdStarted);

if (firstCalls !== 2) throw new Error(`Expected two first-pass calls (Rust + Monaco); observed ${firstCalls}.`);
if (secondCallDelta !== 0) throw new Error(`Expected zero calls on exact reuse; observed ${secondCallDelta}.`);
if (thirdCallDelta !== 1) throw new Error(`Expected one call after Rust-only evidence change; observed ${thirdCallDelta}.`);
if (third.plan.refreshCandidates.length !== 1 || third.plan.refreshCandidates[0] !== 'Rust') {
  throw new Error(`Expected only Rust refresh; observed ${third.plan.refreshCandidates.join(',')}.`);
}
if (!third.plan.reusableCandidates.includes('Monaco')) throw new Error('Monaco should remain reusable.');
if (!third.plan.skippedCandidates.includes('Kubernetes')) throw new Error('Kubernetes should remain skipped without evidence.');

const usage = first.observations.reduce((acc, item) => {
  acc.input_tokens += Number(item.usage?.input_tokens ?? 0);
  acc.output_tokens += Number(item.usage?.output_tokens ?? 0);
  return acc;
}, { input_tokens: 0, output_tokens: 0 });

console.log(JSON.stringify({
  ok: true,
  repository: repository.name,
  candidates,
  selectedEvidenceCount: selected.selectedEvidenceCount,
  candidateEvidenceRefs,
  firstPass: {
    providerCalls: firstCalls,
    latencyMs: firstLatencyMs,
    refreshCandidates: first.plan.refreshCandidates,
    skippedCandidates: first.plan.skippedCandidates,
    accepted: first.claims.map((claim) => ({ skill: claim.skill, confidence: claim.confidence })),
    usage
  },
  secondPass: {
    providerCalls: secondCallDelta,
    latencyMs: secondLatencyMs,
    reusableCandidates: second.plan.reusableCandidates,
    refreshCandidates: second.plan.refreshCandidates
  },
  rustOnlyChange: {
    providerCalls: thirdCallDelta,
    latencyMs: thirdLatencyMs,
    reusableCandidates: third.plan.reusableCandidates,
    refreshCandidates: third.plan.refreshCandidates,
    reasons: Object.fromEntries(third.plan.candidatePlans.map((item) => [item.candidate, item.reason]))
  }
}));
