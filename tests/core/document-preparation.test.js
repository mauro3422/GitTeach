import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  DOCUMENT_INPUT_SCHEMA,
  DOCUMENT_TARGETS,
  EvidenceLedger,
  ProfileAggregator,
  prepareDocumentInput,
  renderDocumentDraft
} from '../../src/core/index.js';

function buildProfile() {
  const ledger = new EvidenceLedger();
  const source = ledger.append({
    repo: 'kode',
    path: 'src/core/editor.ts',
    kind: 'source',
    subject: 'Editor kernel integration',
    commit: 'abc123',
    sourceHash: 'source-hash',
    excerpt: 'export function integrateEditorKernel() {}',
    observedAt: '2026-09-22T10:00:00.000Z',
    metadata: {
      language: 'typescript',
      actorRelation: 'agent-direction',
      implementationOrigin: 'ai-assisted',
      internalNote: 'must-not-leak'
    }
  });
  const contradiction = ledger.append({
    repo: 'legacy',
    path: 'README.md',
    kind: 'documentation',
    subject: 'Legacy claim',
    excerpt: 'older architecture note'
  });

  const profile = new ProfileAggregator({ ledger }).build({
    developer: { username: 'mauro3422' },
    repositories: [{ name: 'kode' }, { name: 'legacy' }],
    semanticClaims: [
      {
        skill: 'TypeScript',
        repository: 'kode',
        evidenceRefs: [source.id],
        confidence: 0.92,
        reason: 'Typed editor integration is directly evidenced.'
      },
      {
        skill: 'TypeScript',
        repository: 'legacy',
        evidenceRefs: [contradiction.id],
        confidence: 0.8,
        stance: 'contradict',
        reason: 'Legacy note does not support the current bounded claim.'
      }
    ]
  });

  return { ledger, profile, source };
}

test('DocumentInput v1 contains curated claims and bounded provenance, not raw repository dumps', () => {
  const { ledger, profile, source } = buildProfile();
  const input = prepareDocumentInput({ profile, ledger, target: 'portfolio-card' });

  assert.equal(input.schema, DOCUMENT_INPUT_SCHEMA);
  assert.equal(input.target, 'portfolio-card');
  assert.deepEqual(input.repositories, ['kode', 'legacy']);
  assert.equal(input.claims.length, 1);
  assert.equal(input.claims[0].label, 'TypeScript');
  assert.equal(input.claims[0].attribution.status, 'agency-supported');
  assert.deepEqual(input.claims[0].attribution.actorRelations, ['agent-direction']);
  assert.deepEqual(input.claims[0].attribution.implementationOrigins, ['ai-assisted']);
  assert.deepEqual(input.claims[0].evidenceRefs, [source.id]);
  assert.equal(input.claims[0].cautions.hasContradictions, true);
  assert.equal(input.claims[0].cautions.contradictionCount, 1);

  const evidence = input.claims[0].evidence[0];
  assert.equal(evidence.path, 'src/core/editor.ts');
  assert.equal(evidence.actorRelation, 'agent-direction');
  assert.equal(evidence.implementationOrigin, 'ai-assisted');
  assert.equal(Object.hasOwn(evidence, 'excerpt'), false);
  assert.equal(Object.hasOwn(evidence, 'metadata'), false);
  assert.equal(Object.hasOwn(input, 'evidenceLedger'), false);
  assert.equal(JSON.stringify(input).includes('must-not-leak'), false);
});

test('DocumentInput v1 rejects unsupported targets', () => {
  const { ledger, profile } = buildProfile();
  assert.throws(
    () => prepareDocumentInput({ profile, ledger, target: 'free-form-marketing-copy' }),
    /Unsupported document target/
  );
});

test('DocumentInput v1 fails closed when a support evidence ref cannot resolve', () => {
  const { ledger, profile } = buildProfile();
  const forged = structuredClone(profile);
  forged.skills[0].supportEvidenceRefs = ['missing-evidence'];
  assert.throws(
    () => prepareDocumentInput({ profile: forged, ledger, target: 'cv-evidence' }),
    /Unknown evidence reference/
  );
});


test('JS DocumentInput v1 matches the shared schema fixture', () => {
  const schema = JSON.parse(readFileSync(new URL('../fixtures/document-input-v1-schema.json', import.meta.url), 'utf8'));
  const { ledger, profile } = buildProfile();
  const input = prepareDocumentInput({ profile, ledger, target: 'github-profile-readme' });

  for (const field of schema.topLevelFields) assert.ok(Object.hasOwn(input, field), `missing top-level field ${field}`);
  for (const field of schema.claimFields) assert.ok(Object.hasOwn(input.claims[0], field), `missing claim field ${field}`);
  for (const field of schema.attributionFields) assert.ok(Object.hasOwn(input.claims[0].attribution, field), `missing attribution field ${field}`);
  for (const field of schema.evidenceFields) assert.ok(Object.hasOwn(input.claims[0].evidence[0], field), `missing evidence field ${field}`);
  for (const field of schema.supportingStatementFields) assert.ok(Object.hasOwn(input.claims[0].supportingStatements[0], field), `missing statement field ${field}`);
  for (const field of schema.cautionFields) assert.ok(Object.hasOwn(input.claims[0].cautions, field), `missing caution field ${field}`);
});


test('deterministic document draft renders only capabilities present in DocumentInput v1', () => {
  const { ledger, profile } = buildProfile();
  const input = prepareDocumentInput({ profile, ledger, target: 'github-profile-readme' });
  const draft = renderDocumentDraft(input);

  assert.match(draft, /TypeScript/);
  assert.match(draft, /kode/);
  assert.match(draft, /Directed AI-assisted work/i);
  assert.match(draft, /AI-assisted or mixed implementation provenance is recorded/i);
  assert.match(draft, /Evidence:/);
  assert.equal(draft.includes('Kubernetes'), false);
  assert.equal(draft.includes('must-not-leak'), false);
});

test('deterministic renderer refuses non-DocumentInput payloads', () => {
  assert.throws(() => renderDocumentDraft({ schema: 'raw-repository-dump-v1' }), /requires giteach-document-input-v1/);
});


test('all F4 document targets render from the same safe DocumentInput boundary', () => {
  const { ledger, profile } = buildProfile();
  for (const target of DOCUMENT_TARGETS) {
    const input = prepareDocumentInput({ profile, ledger, target });
    const draft = renderDocumentDraft(input);
    assert.ok(draft.length > 0, `empty draft for ${target}`);
    assert.match(draft, /TypeScript/, `supported claim missing for ${target}`);
    assert.equal(draft.includes('Kubernetes'), false, `unsupported capability leaked for ${target}`);
    assert.equal(draft.includes('must-not-leak'), false, `raw metadata leaked for ${target}`);
  }
});


test('repository-only observations remain project facts and are omitted from personal drafts', () => {
  const ledger = new EvidenceLedger();
  const source = ledger.append({
    repo: 'sample',
    path: 'src/main.ts',
    kind: 'source',
    excerpt: 'export const value = 1',
    metadata: { language: 'typescript' }
  });
  const profile = new ProfileAggregator({ ledger }).build({
    developer: { username: 'dev' },
    repositories: [{ name: 'sample' }],
    semanticClaims: [{
      skill: 'TypeScript',
      repository: 'sample',
      evidenceRefs: [source.id],
      confidence: 0.99,
      reason: 'TypeScript source exists in the repository.'
    }]
  });

  assert.equal(profile.skills[0].attribution.status, 'repository-only');

  const projectInput = prepareDocumentInput({ profile, ledger, target: 'project-readme-summary' });
  assert.equal(projectInput.claims.length, 1);
  assert.equal(projectInput.claims[0].cautions.personalAttributionMissing, true);
  assert.match(renderDocumentDraft(projectInput), /not attributed to the developer/i);

  const personalInput = prepareDocumentInput({ profile, ledger, target: 'github-profile-readme' });
  assert.equal(personalInput.claims.length, 0);
  assert.match(renderDocumentDraft(personalInput), /sufficient attribution/i);
});
