import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DOCUMENT_INPUT_SCHEMA,
  LOCAL_REPOSITORY_ANALYSIS_SCHEMA,
  PERSONAL_PROFILE_INSPECTION_SCHEMA,
  PROFILE_INTERVIEW_PROMPT_SCHEMA,
  PROFILE_INTERVIEW_SESSION_SCHEMA,
  PROFILE_OUTPUT_BUNDLE_SCHEMA,
  PROFILE_PUBLICATION_CONTEXT_SCHEMA,
  REPOSITORY_ANALYSIS_SCHEMA,
  REPOSITORY_CONNECTION_LIST_SCHEMA,
  REPOSITORY_INSPECTION_RESULT_SCHEMA,
  REPOSITORY_INSPECTION_SCHEMA,
  analysisToViewModel,
  formatBytes,
  inspectionResultToViewModel,
  personalProfileInspectionToViewModel,
  profileInterviewSessionToViewModel,
  profileOutputBundleToViewModel,
  repositoryConnectionListToViewModel
} from '../../src/core/app/view-model.js';

import { renderDocumentDraft } from '../../src/core/documents/DocumentDraftRenderer.js';
import { PROFILE_PUBLICATION_ENABLED } from '../../src/core/app/runtime-policy.js';
function analysis(overrides = {}) {
  return {
    schema: REPOSITORY_ANALYSIS_SCHEMA,
    acquisition: { kind: 'local', auditAction: null },
    repository: { name: 'kode', branch: 'main', headCommit: 'abc' },
    coverage: {
      inventory: 'complete-policy-filtered',
      summaryScope: 'inventory',
      knownPathCount: 12
    },
    summary: {
      filesScanned: 12,
      bytesScanned: 2048,
      evidenceRecords: 4,
      manifests: 1,
      docs: 1,
      tests: 2,
      toolingFiles: 1,
      sourceFiles: 7
    },
    languages: [{ language: 'Rust', files: 3, bytes: 1536 }],
    technologies: [{ name: 'tauri', sourcePath: 'Cargo.toml', sourceKind: 'cargo' }],
    ...overrides
  };
}

function inspection(overrides = {}) {
  return {
    schema: REPOSITORY_INSPECTION_RESULT_SCHEMA,
    analysis: analysis(),
    inspection: {
      schema: REPOSITORY_INSPECTION_SCHEMA,
      scope: 'repository-only',
      personalExperienceClaimed: false,
      availableEvidenceCount: 2,
      shownEvidenceCount: 2,
      truncated: false,
      evidence: [
        { id: 'evidence-a', path: 'Cargo.toml', kind: 'manifest', bytes: 320 },
        { id: 'evidence-b', path: 'src/main.rs', kind: 'source', bytes: 1024 }
      ],
      projectDomains: [{
        key: 'desktop-application',
        label: 'Desktop application',
        sourceKinds: ['technology'],
        evidenceRefs: ['evidence-a'],
        technologies: ['tauri'],
        languages: [],
        ruleBased: true
      }]
    },
    ...overrides
  };
}

function personalInspection(overrides = {}) {
  return {
    schema: PERSONAL_PROFILE_INSPECTION_SCHEMA,
    scope: 'personal-profile',
    subjectActorKey: 'developer:local',
    analyzedRepositoryCount: 2,
    availablePersonalCapabilityCount: 1,
    shownPersonalCapabilityCount: 1,
    repositoryOnlyClaimsOmitted: 1,
    unresolvedAttributionClaimsOmitted: 0,
    availableEvidenceCount: 1,
    shownEvidenceCount: 1,
    availableActorEvidenceCount: 1,
    shownActorEvidenceCount: 1,
    truncated: false,
    capabilities: [{
      key: 'web-application',
      label: 'Web application',
      repositoryCount: 1,
      repositories: ['kode'],
      attributionStatus: 'identity-linked',
      actorEvidenceRefs: ['actor-a'],
      actorRelations: ['authored-change'],
      implementationOrigins: ['unknown'],
      supportEvidenceRefs: ['evidence-a'],
      evidenceDiversity: ['manifest']
    }],
    evidence: [{
      id: 'evidence-a',
      repository: 'kode',
      path: 'package.json',
      kind: 'manifest',
      bytes: 320
    }],
    actorEvidence: [{
      id: 'actor-a',
      relation: 'authored-change',
      repository: 'kode',
      sourceKind: 'git',
      sourceRef: 'git:commit:abc',
      observedAt: '2026-09-24T12:00:00Z',
      implementationOrigin: 'unknown',
      targetEvidenceRefs: ['evidence-a']
    }],
    ...overrides
  };
}

function interviewSession(overrides = {}) {
  const personal = personalInspection();
  return {
    schema: PROFILE_INTERVIEW_SESSION_SCHEMA,
    subjectActorKey: personal.subjectActorKey,
    prompts: [{
      schema: PROFILE_INTERVIEW_PROMPT_SCHEMA,
      id: 'prompt-role',
      questionId: 'gap:role',
      actorKey: personal.subjectActorKey,
      kind: 'fill-gap',
      category: 'role',
      subjectKey: 'primary-role',
      declarationIds: [],
      evidenceRefs: ['evidence-a', 'actor-a'],
      text: 'What role best describes your work across these repositories?'
    }],
    evidence: personal.evidence,
    actorEvidence: personal.actorEvidence,
    ...overrides
  };
}

function documentInput(target) {
  return {
    schema: DOCUMENT_INPUT_SCHEMA,
    target,
    developer: { actorKey: 'developer:local' },
    repositories: ['kode'],
    claims: [{
      key: 'web-application',
      label: 'Web application',
      repositories: ['kode'],
      evidenceDiversity: ['manifest'],
      latestEvidenceAt: '2026-09-24T12:00:00Z',
      attribution: {
        status: 'identity-linked',
        actorEvidenceRefs: ['actor-a'],
        actorRelations: ['authored-change'],
        implementationOrigins: ['unknown']
      },
      evidenceRefs: ['evidence-a'],
      supportingStatements: [{
        repository: 'kode',
        reason: 'exact actor-linked repository-domain evidence',
        evidenceRefs: ['evidence-a']
      }],
      cautions: {
        hasStaleEvidence: false,
        staleEvidenceRefs: [],
        hasContradictions: false,
        contradictionCount: 0,
        personalAttributionMissing: false,
        identityOnly: true,
        aiAssistanceObserved: false
      }
    }]
  };
}

function outputBundle(overrides = {}) {
  return {
    schema: PROFILE_OUTPUT_BUNDLE_SCHEMA,
    subjectActorKey: 'developer:local',
    publicationContext: {
      schema: PROFILE_PUBLICATION_CONTEXT_SCHEMA,
      actorKey: 'developer:local',
      declarations: [{
        id: 'declaration-role',
        actorKey: 'developer:local',
        category: 'role',
        key: 'primary-role',
        value: 'Developer focused on local-first tooling',
        sourceKind: 'user-answer',
        repositories: ['kode']
      }]
    },
    documents: [
      'github-profile-readme',
      'portfolio-card',
      'linkedin-project',
      'linkedin-skills',
      'cv-evidence'
    ].map(documentInput),
    ...overrides
  };
}

function repositoryConnectionList(overrides = {}) {
  return {
    schema: REPOSITORY_CONNECTION_LIST_SCHEMA,
    availableConnectionCount: 2,
    truncated: false,
    connections: [
      {
        id: 'repo:local',
        target: { kind: 'local', path: 'D:\\Dev\\kode' },
        repositoryName: 'kode',
        branch: 'main',
        headCommit: 'abc',
        acquisitionKind: 'local',
        auditAction: null,
        inventoryCoverage: 'complete-policy-filtered',
        summaryScope: 'inventory',
        knownPathCount: 120,
        filesScanned: 120,
        evidenceRecords: 44
      },
      {
        id: 'repo:remote',
        target: {
          kind: 'remote',
          owner: 'mauro',
          name: 'GitTeach',
          remoteUrl: 'https://github.com/mauro/GitTeach.git'
        },
        repositoryName: 'GitTeach',
        branch: 'main',
        headCommit: 'def',
        acquisitionKind: 'remote-audit',
        auditAction: 'unchanged',
        inventoryCoverage: 'complete-policy-filtered',
        summaryScope: 'selected-content',
        knownPathCount: 80,
        filesScanned: 9,
        evidenceRecords: 9
      }
    ],
    ...overrides
  };
}

test('remembered repository list exposes restart-safe connection targets with bounded refresh metadata', () => {
  const view = repositoryConnectionListToViewModel(repositoryConnectionList());

  assert.equal(view.availableConnectionCount, 2);
  assert.equal(view.truncated, false);
  assert.equal(view.connections.length, 2);
  assert.deepEqual(view.connections[0].target, { kind: 'local', path: 'D:\\Dev\\kode' });
  assert.equal(view.connections[0].primary, 'kode');
  assert.match(view.connections[0].meta, /local · inventory · 120\/120 paths · 44 evidence/);
  assert.deepEqual(view.connections[1].target, {
    kind: 'remote',
    owner: 'mauro',
    name: 'GitTeach',
    remoteUrl: 'https://github.com/mauro/GitTeach.git'
  });
  assert.match(view.connections[1].meta, /remote-audit · unchanged · selected-content · 9\/80 paths/);
});

test('remembered repository list rejects internal audit fields instead of leaking them into the webview', () => {
  const payload = repositoryConnectionList();
  payload.connections[1].treeObjectId = 'tree-private';
  assert.throws(
    () => repositoryConnectionListToViewModel(payload),
    /must not expose treeObjectId/
  );
});

test('remembered repository list fails closed on inconsistent bounds or target/acquisition mismatch', () => {
  assert.throws(
    () => repositoryConnectionListToViewModel(repositoryConnectionList({ availableConnectionCount: 3, truncated: false })),
    /bounds are inconsistent/
  );

  const mismatched = repositoryConnectionList();
  mismatched.connections[0].acquisitionKind = 'remote-audit';
  mismatched.connections[0].summaryScope = 'selected-content';
  assert.throws(
    () => repositoryConnectionListToViewModel(mismatched),
    /target and acquisition kind do not match/
  );
});

test('desktop shell view model keeps coverage scope visible beside bounded repository summary', () => {
  const view = analysisToViewModel(analysis());

  assert.equal(view.repositoryName, 'kode');
  assert.equal(view.acquisitionLabel, 'Local repository');
  assert.equal(view.coverageLabel, 'inventory · complete-policy-filtered');
  assert.deepEqual(view.languages, [{ primary: 'Rust', secondary: '3 files · 1.50 KB' }]);
  assert.deepEqual(view.technologies, [{ primary: 'tauri', secondary: 'cargo · Cargo.toml' }]);
  assert.ok(view.metrics.some(([label, value]) => label === 'Known paths' && value === '12'));
});

test('remote audit acquisition remains visible beside selected-content coverage', () => {
  const view = analysisToViewModel(analysis({
    acquisition: { kind: 'remote-audit', auditAction: 'updated' },
    coverage: {
      inventory: 'complete-policy-filtered',
      summaryScope: 'selected-content',
      knownPathCount: 80
    },
    summary: {
      filesScanned: 9,
      bytesScanned: 4096,
      evidenceRecords: 9,
      manifests: 1,
      docs: 1,
      tests: 2,
      toolingFiles: 1,
      sourceFiles: 4
    }
  }));

  assert.equal(view.acquisitionLabel, 'Remote audit · updated');
  assert.equal(view.coverageLabel, 'selected-content · complete-policy-filtered');
  assert.ok(view.metrics.some(([label, value]) => label === 'Files summarized' && value === '9'));
  assert.ok(view.metrics.some(([label, value]) => label === 'Known paths' && value === '80'));
});

test('legacy local analysis schema remains readable during desktop contract migration', () => {
  const legacy = analysis({
    schema: LOCAL_REPOSITORY_ANALYSIS_SCHEMA,
    acquisition: undefined
  });
  const view = analysisToViewModel(legacy);
  assert.equal(view.acquisitionLabel, 'Local repository');
});

test('desktop shell view model rejects incompatible analysis contracts instead of guessing', () => {
  assert.throws(() => analysisToViewModel({ schema: 'wrong' }), /giteach-repository-analysis-v1/);
  assert.throws(
    () => analysisToViewModel(analysis({ repository: null })),
    /missing repository, coverage, or summary/
  );
  assert.throws(
    () => analysisToViewModel(analysis({ acquisition: { kind: 'unknown' } })),
    /unsupported repository acquisition kind/
  );
});

test('desktop shell byte formatting is deterministic and bounded', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(1024), '1.00 KB');
  assert.equal(formatBytes(10 * 1024), '10.0 KB');
  assert.equal(formatBytes(-1), '—');
});


test('repository inspection exposes bounded provenance without turning project evidence into personal experience', () => {
  const view = inspectionResultToViewModel(inspection());

  assert.equal(view.inspectionBoundary, 'Repository evidence only · no personal experience claim');
  assert.equal(view.evidenceSummary, '2 bounded evidence records available.');
  assert.deepEqual(view.evidence, [
    { primary: 'Cargo.toml', secondary: 'manifest · 320 B · ref evidence-a' },
    { primary: 'src/main.rs', secondary: 'source · 1.00 KB · ref evidence-b' }
  ]);
  assert.deepEqual(view.projectDomains, [{
    primary: 'Desktop application',
    secondary: 'desktop-application · tauri · 1 evidence ref'
  }]);
});

test('repository inspection fails closed if a payload claims personal experience', () => {
  const payload = inspection();
  payload.inspection.personalExperienceClaimed = true;

  assert.throws(
    () => inspectionResultToViewModel(payload),
    /must remain repository-only and must not claim personal experience/
  );
});

test('repository inspection requires project-domain evidence refs to resolve in the visible bounded set', () => {
  const payload = inspection();
  payload.inspection.projectDomains[0].evidenceRefs = ['missing-evidence'];

  assert.throws(
    () => inspectionResultToViewModel(payload),
    /evidence refs must resolve in the visible bounded evidence set/
  );
});

test('personal profile inspection exposes only attributable observations with resolvable provenance', () => {
  const view = personalProfileInspectionToViewModel(personalInspection());

  assert.equal(view.subjectActorKey, 'developer:local');
  assert.equal(view.boundary, 'Personal profile · only exact actor-linked repository evidence is shown');
  assert.equal(view.summary, '1 attributable observation from 2 analyzed repositories.');
  assert.equal(view.omittedSummary, '1 repository-only · 0 unresolved attribution omitted');
  assert.deepEqual(view.capabilities, [{
    primary: 'Web application',
    secondary: 'identity-linked · 1 attributable repo · 1 evidence ref'
  }]);
  assert.deepEqual(view.actorEvidence, [{
    primary: 'authored-change · kode',
    secondary: 'git · unknown · git:commit:abc'
  }]);
  assert.deepEqual(view.evidence, [{
    primary: 'kode · package.json',
    secondary: 'manifest · 320 B · ref evidence-a'
  }]);
});

test('personal profile inspection fails closed on repository-only capability promotion', () => {
  const payload = personalInspection();
  payload.capabilities[0].attributionStatus = 'repository-only';

  assert.throws(
    () => personalProfileInspectionToViewModel(payload),
    /invalid or repository-only capability/
  );
});

test('personal profile inspection requires support, actor, and actor-target refs to resolve', () => {
  const missingSupport = personalInspection();
  missingSupport.capabilities[0].supportEvidenceRefs = ['missing'];
  assert.throws(
    () => personalProfileInspectionToViewModel(missingSupport),
    /support evidence refs must resolve/
  );

  const missingActor = personalInspection();
  missingActor.capabilities[0].actorEvidenceRefs = ['missing'];
  assert.throws(
    () => personalProfileInspectionToViewModel(missingActor),
    /actor evidence refs must resolve/
  );

  const missingTarget = personalInspection();
  missingTarget.actorEvidence[0].targetEvidenceRefs = ['missing'];
  assert.throws(
    () => personalProfileInspectionToViewModel(missingTarget),
    /actor evidence target refs must resolve/
  );
});


test('desktop publication permission remains hard-gated off during persistence testing', () => {
  assert.equal(PROFILE_PUBLICATION_ENABLED, false);
});

test('profile interview session exposes only bounded questions with resolvable provenance', () => {
  const view = profileInterviewSessionToViewModel(interviewSession());

  assert.equal(view.subjectActorKey, 'developer:local');
  assert.equal(view.prompts.length, 1);
  assert.equal(view.prompts[0].raw.questionId, 'gap:role');
  assert.match(view.summary, /1 bounded question/);
});

test('profile interview session fails closed when a prompt references provenance outside the session', () => {
  const payload = interviewSession();
  payload.prompts[0].evidenceRefs = ['missing-evidence'];

  assert.throws(
    () => profileInterviewSessionToViewModel(payload),
    /prompt refs must resolve inside the bounded session/
  );
});

test('profile output bundle accepts five sanitized evidence-backed draft targets plus approved highlights', () => {
  const view = profileOutputBundleToViewModel(outputBundle());

  assert.equal(view.subjectActorKey, 'developer:local');
  assert.equal(view.approvedCount, 1);
  assert.equal(view.documents.length, 5);
  assert.deepEqual(view.documents.map((document) => document.target), [
    'github-profile-readme',
    'portfolio-card',
    'linkedin-project',
    'linkedin-skills',
    'cv-evidence'
  ]);
  assert.ok(view.documents.every((document) => renderDocumentDraft(document).trim().length > 0));
});

test('profile output bundle rejects raw evidence internals and publication metadata at the webview boundary', () => {
  const rawEvidence = outputBundle();
  rawEvidence.documents[0].claims[0].evidence = [{ path: 'src/private.js' }];
  assert.throws(
    () => profileOutputBundleToViewModel(rawEvidence),
    /must not expose raw evidence objects/
  );

  const sourceHash = outputBundle();
  sourceHash.documents[0].claims[0].sourceHash = 'secret-hash';
  assert.throws(
    () => profileOutputBundleToViewModel(sourceHash),
    /must not expose sourceHash/
  );

  const authorization = outputBundle();
  authorization.publicationContext.declarations[0].authorizationRef = 'private-auth-ref';
  assert.throws(
    () => profileOutputBundleToViewModel(authorization),
    /must not expose authorizationRef/
  );
});
