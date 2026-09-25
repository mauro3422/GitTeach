import { readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  IncrementalJevSemanticProvider,
  JsonJevObservationStore,
  TypeSafeJevAdapter,
  repoEvidenceBundleToLedger,
  selectCandidateEvidence
} from '../src/core/index.js';

const mode = process.argv[2] ?? 'reuse';
if (!['seed', 'reuse', 'rust-change'].includes(mode)) throw new Error(`Unsupported mode: ${mode}`);
if (mode !== 'reuse' && !process.env.TYPESAFE_API_KEY) {
  throw new Error('TYPESAFE_API_KEY is required for seed/rust-change. Use scripts/run-typesafe.ps1 locally.');
}

const bundle = JSON.parse(readFileSync(new URL('../.mssr/runtime/kode-scan.json', import.meta.url), 'utf8'));
const ledger = repoEvidenceBundleToLedger(bundle);
const candidates = ['Rust', 'Monaco', 'Kubernetes'];
const selected = selectCandidateEvidence({ evidence: ledger.list(), candidates, maxPerCandidate: 3, maxTotal: 6 });
const candidateEvidenceRefs = Object.fromEntries(selected.candidateMatches.map((item) => [item.candidate, [...item.evidenceRefs]]));
const repository = { name: bundle.repository.name, url: bundle.repository.remote_url ?? null };
const storePath = fileURLToPath(new URL('../.mssr/runtime/jev-observations-canary.json', import.meta.url));
const store = new JsonJevObservationStore({ path: storePath });

if (mode === 'seed') rmSync(storePath, { force: true });
const previousObservations = mode === 'seed' ? [] : store.load();

let evidence = selected.evidence;
if (mode === 'rust-change') {
  const rustRef = candidateEvidenceRefs.Rust?.[0];
  if (!rustRef) throw new Error('Expected selected Rust evidence.');
  evidence = evidence.map((record) => record.id === rustRef
    ? { ...record, excerpt: `${record.excerpt ?? ''}\n// persisted-rust-change` }
    : record);
}

const adapter = new TypeSafeJevAdapter({ apiKey: mode === 'reuse' ? null : undefined, acceptThreshold: 0.75 });
let providerCalls = 0;
const provider = new IncrementalJevSemanticProvider({
  providerPolicyKey: adapter.getSemanticPolicyKey(),
  maxObservationAgeMs: 24 * 60 * 60 * 1000,
  judge: async (args) => {
    providerCalls += 1;
    if (mode === 'reuse') throw new Error('reuse mode must not call TypeSafe or require credentials.');
    return adapter.judge(args);
  }
});

const result = await provider.inferProjectSemantics({
  repository,
  evidence,
  candidates,
  candidateEvidenceRefs,
  previousObservations
});

if (mode === 'seed' && providerCalls !== 2) throw new Error(`seed expected 2 provider calls; observed ${providerCalls}`);
if (mode === 'reuse' && providerCalls !== 0) throw new Error(`reuse expected 0 provider calls; observed ${providerCalls}`);
if (mode === 'rust-change' && providerCalls !== 1) throw new Error(`rust-change expected 1 provider call; observed ${providerCalls}`);
if (mode === 'rust-change' && (result.plan.refreshCandidates.length !== 1 || result.plan.refreshCandidates[0] !== 'Rust')) {
  throw new Error(`rust-change expected only Rust refresh; observed ${result.plan.refreshCandidates.join(',')}`);
}

const stored = store.mergeAndSave(result.observations);
console.log(JSON.stringify({
  ok: true,
  mode,
  providerCalls,
  previousObservationCount: previousObservations.length,
  storedObservationCount: stored.length,
  reusableCandidates: result.plan.reusableCandidates,
  refreshCandidates: result.plan.refreshCandidates,
  skippedCandidates: result.plan.skippedCandidates,
  storePath
}));
