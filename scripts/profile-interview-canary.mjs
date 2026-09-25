import { readFileSync } from 'node:fs';

import {
  analyzeDevelopmentTendencies,
  developmentTendenciesToProfileObservations,
  planProfileInterview,
  profileInterviewAnswerToDeclaration,
  reconcileProfileDeclarations,
  renderProfileInterviewPrompts
} from '../src/core/index.js';

const actorKey = 'developer:mauro';
const bundleUrls = process.argv.length >= 4
  ? [new URL(`file:///${process.argv[2].replaceAll('\\\\', '/')}`), new URL(`file:///${process.argv[3].replaceAll('\\\\', '/')}`)]
  : [
      new URL('../.mssr/runtime/giteach-scan-local.json', import.meta.url),
      new URL('../.mssr/runtime/kode-scan-local.json', import.meta.url)
    ];
const bundles = bundleUrls.map((url) => JSON.parse(readFileSync(url, 'utf8')));

const tendencies = analyzeDevelopmentTendencies({ bundles, minimumRepositories: 2 });
const observations = developmentTendenciesToProfileObservations(tendencies);
const reconciliation = reconcileProfileDeclarations({ actorKey, declarations: [], observations });
const plan = planProfileInterview({ actorKey, declarations: [], reconciliation, requiredCategories: [] });
const prompts = renderProfileInterviewPrompts(plan);

const automation = tendencies.tendencies.find((item) => item.key === 'automation');
if (!automation) throw new Error('Expected real GitTeach+Kode snapshots to support automation tendency.');
if (automation.repositoryCount !== 2) throw new Error(`Expected automation support in 2 repositories, observed ${automation.repositoryCount}.`);

const automationPrompt = prompts.find((item) => item.subjectKey === 'automation');
if (!automationPrompt) throw new Error('Expected interview prompt for observed automation tendency.');
if (automationPrompt.kind !== 'confirm-observed-pattern') throw new Error(`Unexpected automation prompt kind: ${automationPrompt.kind}`);
if (automationPrompt.category !== 'development-tendency') throw new Error(`Unexpected automation prompt category: ${automationPrompt.category}`);
if (automationPrompt.evidenceRefs.length !== automation.evidenceRefs.length) throw new Error('Interview prompt lost automation provenance refs.');

const declaration = profileInterviewAnswerToDeclaration({
  actorKey,
  question: plan.questions.find((item) => item.subjectKey === 'automation'),
  answer: 'Yes. I deliberately automate repetitive development work when a project makes that useful.',
  answeredAt: '2026-09-24T01:15:00-03:00',
  repositories: automation.repositories
});

if (declaration.publicationStatus !== 'private') throw new Error('Interview answer must remain private by default.');
if (declaration.sourceKind !== 'user-answer') throw new Error('Interview answer must remain self-reported evidence.');
if (declaration.category !== 'development-tendency') throw new Error('Automation answer must remain a development-tendency declaration.');

console.log(JSON.stringify({
  ok: true,
  analyzedRepositories: bundles.map((bundle) => bundle.repository.name),
  tendencies: tendencies.tendencies.map((item) => ({
    key: item.key,
    repositoryCount: item.repositoryCount,
    analyzedRepositoryCount: item.analyzedRepositoryCount,
    prevalence: item.prevalence,
    repositories: item.repositories,
    evidenceRefs: item.evidenceRefs
  })),
  interview: {
    questionCount: plan.questions.length,
    prompts: prompts.map((item) => ({
      subjectKey: item.subjectKey,
      kind: item.kind,
      category: item.category,
      text: item.text,
      evidenceRefs: item.evidenceRefs
    }))
  },
  sampleDeclaration: {
    id: declaration.id,
    category: declaration.category,
    key: declaration.key,
    sourceKind: declaration.sourceKind,
    publicationStatus: declaration.publicationStatus,
    repositories: declaration.repositories
  }
}, null, 2));
