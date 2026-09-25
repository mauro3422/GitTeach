export const LOCAL_REPOSITORY_ANALYSIS_SCHEMA = 'giteach-local-repository-analysis-v1';
export const REPOSITORY_ANALYSIS_SCHEMA = 'giteach-repository-analysis-v1';
export const REPOSITORY_CONNECTION_LIST_SCHEMA = 'giteach-repository-connection-list-v1';
export const REPOSITORY_INSPECTION_SCHEMA = 'giteach-repository-inspection-v1';
export const REPOSITORY_INSPECTION_RESULT_SCHEMA = 'giteach-repository-inspection-result-v1';
export const PERSONAL_PROFILE_INSPECTION_SCHEMA = 'giteach-personal-profile-inspection-v1';
export const PROFILE_INTERVIEW_SESSION_SCHEMA = 'giteach-profile-interview-session-v1';
export const PROFILE_INTERVIEW_PROMPT_SCHEMA = 'giteach-profile-interview-prompt-v1';
export const PROFILE_DECLARATION_SCHEMA = 'giteach-profile-declaration-v1';
export const PROFILE_OUTPUT_BUNDLE_SCHEMA = 'giteach-profile-output-bundle-v1';
export const PROFILE_PUBLICATION_CONTEXT_SCHEMA = 'giteach-profile-publication-context-v1';
export const DOCUMENT_INPUT_SCHEMA = 'giteach-document-input-v1';

const MAX_INSPECTION_EVIDENCE = 48;
const MAX_REMEMBERED_REPOSITORIES = 128;
const MAX_PROFILE_CAPABILITIES = 24;
const MAX_PROFILE_EVIDENCE = 192;
const MAX_PROFILE_ACTOR_EVIDENCE = 96;
const MAX_PROFILE_DECLARATIONS = 64;
const MAX_PROFILE_INTERVIEW_PROMPTS = 32;
const PERSONAL_ATTRIBUTION_STATUSES = new Set(['identity-linked', 'user-confirmed', 'agency-supported']);

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && value >= 1024; index += 1) {
    value /= 1024;
    unit = units[index];
  }
  return `${value >= 10 ? value.toFixed(1) : value.toFixed(2)} ${unit}`;
}

function acquisitionLabel(analysis) {
  if (analysis.schema === LOCAL_REPOSITORY_ANALYSIS_SCHEMA) return 'Local repository';
  if (!analysis.acquisition || typeof analysis.acquisition.kind !== 'string') {
    throw new TypeError('repository analysis is missing acquisition metadata');
  }
  if (analysis.acquisition.kind === 'local') return 'Local repository';
  if (analysis.acquisition.kind === 'remote-audit') {
    const action = analysis.acquisition.auditAction;
    return action ? `Remote audit · ${action}` : 'Remote audit';
  }
  throw new TypeError(`unsupported repository acquisition kind: ${analysis.acquisition.kind}`);
}

export function analysisToViewModel(analysis) {
  const supported = analysis && (
    analysis.schema === LOCAL_REPOSITORY_ANALYSIS_SCHEMA ||
    analysis.schema === REPOSITORY_ANALYSIS_SCHEMA
  );
  if (!supported) {
    throw new TypeError(`expected ${REPOSITORY_ANALYSIS_SCHEMA} or ${LOCAL_REPOSITORY_ANALYSIS_SCHEMA}`);
  }
  if (!analysis.repository || !analysis.coverage || !analysis.summary) {
    throw new TypeError('analysis is missing repository, coverage, or summary');
  }

  const summary = analysis.summary;
  const coverage = analysis.coverage;
  const languages = Array.isArray(analysis.languages) ? analysis.languages : [];
  const technologies = Array.isArray(analysis.technologies) ? analysis.technologies : [];

  return {
    repositoryName: analysis.repository.name || 'Unnamed repository',
    acquisitionLabel: acquisitionLabel(analysis),
    coverageLabel: `${coverage.summaryScope} · ${coverage.inventory}`,
    metrics: [
      ['Files summarized', String(summary.filesScanned ?? 0)],
      ['Known paths', String(coverage.knownPathCount ?? 0)],
      ['Bytes summarized', formatBytes(summary.bytesScanned ?? 0)],
      ['Evidence records', String(summary.evidenceRecords ?? 0)],
      ['Source files', String(summary.sourceFiles ?? 0)],
      ['Tests', String(summary.tests ?? 0)],
      ['Docs', String(summary.docs ?? 0)],
      ['Manifests', String(summary.manifests ?? 0)]
    ],
    languages: languages.map((item) => ({
      primary: item.language,
      secondary: `${item.files} files · ${formatBytes(item.bytes)}`
    })),
    technologies: technologies.map((item) => ({
      primary: item.name,
      secondary: `${item.sourceKind} · ${item.sourcePath}`
    }))
  };
}

function requireBoundedCount(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${label} must be a non-negative integer`);
  }
  return value;
}

function requireExactKeys(value, allowedKeys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  const unexpected = Object.keys(value).filter((key) => !allowedKeys.has(key));
  if (unexpected.length > 0) {
    throw new TypeError(`${label} must not expose ${unexpected[0]}`);
  }
}

function optionalString(value, label) {
  if (value !== null && value !== undefined && typeof value !== 'string') {
    throw new TypeError(`${label} must be a string or null`);
  }
  return value ?? null;
}

function rememberedRepositoryTarget(target) {
  requireExactKeys(target, new Set(['kind', 'path', 'owner', 'name', 'remoteUrl']), 'remembered repository target');
  if (target.kind === 'local') {
    if (typeof target.path !== 'string' || !target.path.trim()) {
      throw new TypeError('remembered local repository target requires a path');
    }
    if (target.owner !== undefined || target.name !== undefined || target.remoteUrl !== undefined) {
      throw new TypeError('remembered local repository target must not contain remote fields');
    }
    return { kind: 'local', path: target.path };
  }
  if (target.kind === 'remote') {
    if (typeof target.owner !== 'string' || !target.owner.trim()
      || typeof target.name !== 'string' || !target.name.trim()
      || typeof target.remoteUrl !== 'string' || !target.remoteUrl.trim()) {
      throw new TypeError('remembered remote repository target requires owner, name, and remote URL');
    }
    if (target.path !== undefined) {
      throw new TypeError('remembered remote repository target must not contain a local path');
    }
    return {
      kind: 'remote',
      owner: target.owner,
      name: target.name,
      remoteUrl: target.remoteUrl
    };
  }
  throw new TypeError('remembered repository target kind is unsupported');
}

export function repositoryConnectionListToViewModel(payload) {
  if (!payload || payload.schema !== REPOSITORY_CONNECTION_LIST_SCHEMA) {
    throw new TypeError(`expected ${REPOSITORY_CONNECTION_LIST_SCHEMA}`);
  }
  requireExactKeys(
    payload,
    new Set(['schema', 'availableConnectionCount', 'truncated', 'connections']),
    'repository connection list'
  );
  const availableConnectionCount = requireBoundedCount(
    payload.availableConnectionCount,
    'available repository connection count'
  );
  if (typeof payload.truncated !== 'boolean'
    || !Array.isArray(payload.connections)
    || payload.connections.length > MAX_REMEMBERED_REPOSITORIES
    || payload.connections.length > availableConnectionCount
    || payload.truncated !== (payload.connections.length < availableConnectionCount)) {
    throw new TypeError('repository connection list bounds are inconsistent');
  }

  const ids = new Set();
  const connections = payload.connections.map((connection) => {
    requireExactKeys(
      connection,
      new Set([
        'id', 'target', 'repositoryName', 'branch', 'headCommit', 'acquisitionKind',
        'auditAction', 'inventoryCoverage', 'summaryScope', 'knownPathCount',
        'filesScanned', 'evidenceRecords'
      ]),
      'remembered repository connection'
    );
    if (typeof connection.id !== 'string' || !connection.id || ids.has(connection.id)) {
      throw new TypeError('remembered repository connection id must be non-empty and unique');
    }
    ids.add(connection.id);
    if (typeof connection.repositoryName !== 'string' || !connection.repositoryName.trim()) {
      throw new TypeError('remembered repository connection requires a repository name');
    }
    if (!['local', 'remote-audit'].includes(connection.acquisitionKind)) {
      throw new TypeError('remembered repository acquisition kind is unsupported');
    }
    if (!['complete-policy-filtered', 'partial'].includes(connection.inventoryCoverage)) {
      throw new TypeError('remembered repository inventory coverage is unsupported');
    }
    if (!['inventory', 'selected-content'].includes(connection.summaryScope)) {
      throw new TypeError('remembered repository summary scope is unsupported');
    }
    if (connection.acquisitionKind === 'local' && connection.summaryScope !== 'inventory') {
      throw new TypeError('remembered local repository must keep inventory summary scope');
    }
    if (connection.acquisitionKind === 'remote-audit' && connection.summaryScope !== 'selected-content') {
      throw new TypeError('remembered remote repository must keep selected-content summary scope');
    }
    const target = rememberedRepositoryTarget(connection.target);
    if ((target.kind === 'local') !== (connection.acquisitionKind === 'local')) {
      throw new TypeError('remembered repository target and acquisition kind do not match');
    }
    const branch = optionalString(connection.branch, 'remembered repository branch');
    const headCommit = optionalString(connection.headCommit, 'remembered repository head commit');
    const auditAction = optionalString(connection.auditAction, 'remembered repository audit action');
    if (target.kind === 'local' && auditAction !== null) {
      throw new TypeError('remembered local repository must not expose an audit action');
    }
    if (target.kind === 'remote' && auditAction !== null
      && !['initialized', 'updated', 'unchanged'].includes(auditAction)) {
      throw new TypeError('remembered remote repository audit action is unsupported');
    }
    const knownPathCount = requireBoundedCount(connection.knownPathCount, 'remembered known path count');
    const filesScanned = requireBoundedCount(connection.filesScanned, 'remembered files scanned');
    const evidenceRecords = requireBoundedCount(connection.evidenceRecords, 'remembered evidence records');
    if (filesScanned > knownPathCount) {
      throw new TypeError('remembered repository summarized files exceed known paths');
    }

    const location = target.kind === 'local'
      ? target.path
      : `${target.owner}/${target.name} · ${target.remoteUrl}`;
    const acquisition = target.kind === 'local'
      ? 'local'
      : `remote-audit${auditAction ? ` · ${auditAction}` : ''}`;
    return {
      id: connection.id,
      target,
      primary: connection.repositoryName,
      secondary: location,
      meta: `${acquisition} · ${connection.summaryScope} · ${filesScanned}/${knownPathCount} paths · ${evidenceRecords} evidence`,
      branch,
      headCommit
    };
  });

  return { availableConnectionCount, truncated: payload.truncated, connections };
}

function validateInspectionEvidence(evidence) {
  if (!Array.isArray(evidence) || evidence.length > MAX_INSPECTION_EVIDENCE) {
    throw new TypeError(`inspection evidence must contain at most ${MAX_INSPECTION_EVIDENCE} records`);
  }

  const ids = new Set();
  for (const record of evidence) {
    if (!record || typeof record.id !== 'string' || !record.id || typeof record.path !== 'string' || typeof record.kind !== 'string') {
      throw new TypeError('inspection evidence contains an invalid record');
    }
    requireBoundedCount(record.bytes, 'evidence bytes');
    if (ids.has(record.id)) throw new TypeError('inspection evidence contains duplicate ids');
    ids.add(record.id);
  }
  return ids;
}

function domainSecondary(domain) {
  const signals = [
    ...(Array.isArray(domain.technologies) ? domain.technologies : []),
    ...(Array.isArray(domain.languages) ? domain.languages : [])
  ];
  const evidenceCount = domain.evidenceRefs.length;
  const signalLabel = signals.length > 0 ? signals.join(', ') : 'deterministic repository signals';
  return `${domain.key} · ${signalLabel} · ${evidenceCount} evidence ref${evidenceCount === 1 ? '' : 's'}`;
}

export function inspectionResultToViewModel(result) {
  if (!result || result.schema !== REPOSITORY_INSPECTION_RESULT_SCHEMA) {
    throw new TypeError(`expected ${REPOSITORY_INSPECTION_RESULT_SCHEMA}`);
  }
  const analysis = analysisToViewModel(result.analysis);
  const inspection = result.inspection;
  if (!inspection || inspection.schema !== REPOSITORY_INSPECTION_SCHEMA) {
    throw new TypeError(`expected ${REPOSITORY_INSPECTION_SCHEMA}`);
  }
  if (inspection.scope !== 'repository-only' || inspection.personalExperienceClaimed !== false) {
    throw new TypeError('inspection must remain repository-only and must not claim personal experience');
  }

  const available = requireBoundedCount(inspection.availableEvidenceCount, 'available evidence count');
  const shown = requireBoundedCount(inspection.shownEvidenceCount, 'shown evidence count');
  const evidenceIds = validateInspectionEvidence(inspection.evidence);
  if (shown !== inspection.evidence.length || shown > available || inspection.truncated !== (shown < available)) {
    throw new TypeError('inspection evidence counts are inconsistent');
  }

  if (!Array.isArray(inspection.projectDomains)) {
    throw new TypeError('inspection project domains must be an array');
  }
  const projectDomains = inspection.projectDomains.map((domain) => {
    if (!domain || typeof domain.key !== 'string' || typeof domain.label !== 'string' || domain.ruleBased !== true) {
      throw new TypeError('inspection contains an invalid project-domain signal');
    }
    if (!Array.isArray(domain.evidenceRefs) || !Array.isArray(domain.sourceKinds)) {
      throw new TypeError('project-domain provenance must be explicit');
    }
    if (!domain.evidenceRefs.every((evidenceRef) => evidenceIds.has(evidenceRef))) {
      throw new TypeError('project-domain evidence refs must resolve in the visible bounded evidence set');
    }
    return {
      primary: domain.label,
      secondary: domainSecondary(domain)
    };
  });

  return {
    ...analysis,
    inspectionBoundary: 'Repository evidence only · no personal experience claim',
    evidenceSummary: inspection.truncated
      ? `Showing ${shown} of ${available} bounded evidence records.`
      : `${shown} bounded evidence record${shown === 1 ? '' : 's'} available.`,
    evidence: inspection.evidence.map((record) => ({
      primary: record.path,
      secondary: `${record.kind} · ${formatBytes(record.bytes)} · ref ${record.id}`
    })),
    projectDomains
  };
}

function validatePersonalEvidence(evidence) {
  if (!Array.isArray(evidence) || evidence.length > MAX_PROFILE_EVIDENCE) {
    throw new TypeError(`personal profile evidence must contain at most ${MAX_PROFILE_EVIDENCE} records`);
  }
  const ids = new Set();
  for (const record of evidence) {
    if (!record || typeof record.id !== 'string' || !record.id
      || typeof record.repository !== 'string' || !record.repository
      || typeof record.path !== 'string' || typeof record.kind !== 'string') {
      throw new TypeError('personal profile evidence contains an invalid record');
    }
    requireBoundedCount(record.bytes, 'personal evidence bytes');
    if (ids.has(record.id)) throw new TypeError('personal profile evidence contains duplicate ids');
    ids.add(record.id);
  }
  return ids;
}

function validateActorEvidence(records, evidenceIds) {
  if (!Array.isArray(records) || records.length > MAX_PROFILE_ACTOR_EVIDENCE) {
    throw new TypeError(`actor evidence must contain at most ${MAX_PROFILE_ACTOR_EVIDENCE} records`);
  }
  const ids = new Set();
  for (const record of records) {
    if (!record || typeof record.id !== 'string' || !record.id
      || typeof record.relation !== 'string' || !record.relation
      || typeof record.repository !== 'string' || !record.repository
      || typeof record.sourceKind !== 'string' || !record.sourceKind
      || typeof record.sourceRef !== 'string' || !record.sourceRef
      || typeof record.observedAt !== 'string' || !record.observedAt
      || typeof record.implementationOrigin !== 'string' || !record.implementationOrigin
      || !Array.isArray(record.targetEvidenceRefs)) {
      throw new TypeError('actor evidence contains an invalid record');
    }
    if (ids.has(record.id)) throw new TypeError('actor evidence contains duplicate ids');
    if (!record.targetEvidenceRefs.every((evidenceRef) => evidenceIds.has(evidenceRef))) {
      throw new TypeError('actor evidence target refs must resolve in the visible personal evidence set');
    }
    ids.add(record.id);
  }
  return ids;
}

export function personalProfileInspectionToViewModel(inspection) {
  if (!inspection || inspection.schema !== PERSONAL_PROFILE_INSPECTION_SCHEMA) {
    throw new TypeError(`expected ${PERSONAL_PROFILE_INSPECTION_SCHEMA}`);
  }
  if (inspection.scope !== 'personal-profile') {
    throw new TypeError('personal profile inspection must use the personal-profile scope');
  }
  if (typeof inspection.subjectActorKey !== 'string' || !inspection.subjectActorKey.trim()) {
    throw new TypeError('personal profile inspection requires an explicit subject actor key');
  }
  if (!Array.isArray(inspection.capabilities) || inspection.capabilities.length > MAX_PROFILE_CAPABILITIES) {
    throw new TypeError(`personal profile capabilities must contain at most ${MAX_PROFILE_CAPABILITIES} records`);
  }

  const analyzedRepositories = requireBoundedCount(inspection.analyzedRepositoryCount, 'analyzed repository count');
  const availableCapabilities = requireBoundedCount(inspection.availablePersonalCapabilityCount, 'available personal capability count');
  const shownCapabilities = requireBoundedCount(inspection.shownPersonalCapabilityCount, 'shown personal capability count');
  const repositoryOnlyOmitted = requireBoundedCount(inspection.repositoryOnlyClaimsOmitted, 'repository-only claims omitted');
  const unresolvedOmitted = requireBoundedCount(inspection.unresolvedAttributionClaimsOmitted, 'unresolved attribution claims omitted');
  const availableEvidence = requireBoundedCount(inspection.availableEvidenceCount, 'available personal evidence count');
  const shownEvidence = requireBoundedCount(inspection.shownEvidenceCount, 'shown personal evidence count');
  const availableActorEvidence = requireBoundedCount(inspection.availableActorEvidenceCount, 'available actor evidence count');
  const shownActorEvidence = requireBoundedCount(inspection.shownActorEvidenceCount, 'shown actor evidence count');
  const evidenceIds = validatePersonalEvidence(inspection.evidence);
  const actorIds = validateActorEvidence(inspection.actorEvidence, evidenceIds);

  if (shownCapabilities !== inspection.capabilities.length
    || shownEvidence !== inspection.evidence.length
    || shownActorEvidence !== inspection.actorEvidence.length
    || shownCapabilities > availableCapabilities
    || shownEvidence > availableEvidence
    || shownActorEvidence > availableActorEvidence) {
    throw new TypeError('personal profile inspection counts are inconsistent');
  }
  const expectedTruncated = shownCapabilities < availableCapabilities
    || shownEvidence < availableEvidence
    || shownActorEvidence < availableActorEvidence;
  if (inspection.truncated !== expectedTruncated) {
    throw new TypeError('personal profile inspection truncation flag is inconsistent');
  }

  const capabilities = inspection.capabilities.map((capability) => {
    if (!capability || typeof capability.key !== 'string' || !capability.key
      || typeof capability.label !== 'string' || !capability.label
      || !PERSONAL_ATTRIBUTION_STATUSES.has(capability.attributionStatus)
      || capability.attributionStatus === 'repository-only') {
      throw new TypeError('personal profile contains an invalid or repository-only capability');
    }
    if (!Array.isArray(capability.repositories)
      || !Array.isArray(capability.actorEvidenceRefs)
      || !Array.isArray(capability.actorRelations)
      || !Array.isArray(capability.implementationOrigins)
      || !Array.isArray(capability.supportEvidenceRefs)
      || !Array.isArray(capability.evidenceDiversity)) {
      throw new TypeError('personal capability provenance must be explicit');
    }
    const repositoryCount = requireBoundedCount(capability.repositoryCount, 'personal capability repository count');
    if (repositoryCount !== capability.repositories.length || repositoryCount === 0) {
      throw new TypeError('personal capability repository coverage is inconsistent');
    }
    if (capability.actorEvidenceRefs.length === 0 || capability.supportEvidenceRefs.length === 0) {
      throw new TypeError('personal capability requires actor and repository evidence');
    }
    if (!capability.actorEvidenceRefs.every((actorRef) => actorIds.has(actorRef))) {
      throw new TypeError('personal capability actor evidence refs must resolve');
    }
    if (!capability.supportEvidenceRefs.every((evidenceRef) => evidenceIds.has(evidenceRef))) {
      throw new TypeError('personal capability support evidence refs must resolve');
    }
    if (Object.hasOwn(capability, 'strongestConfidence')
      || Object.hasOwn(capability, 'skillScore')
      || Object.hasOwn(capability, 'seniority')) {
      throw new TypeError('personal profile inspection must not expose confidence, score, or seniority semantics');
    }

    const evidenceCount = capability.supportEvidenceRefs.length;
    return {
      primary: capability.label,
      secondary: `${capability.attributionStatus} · ${repositoryCount} attributable repo${repositoryCount === 1 ? '' : 's'} · ${evidenceCount} evidence ref${evidenceCount === 1 ? '' : 's'}`
    };
  });

  return {
    subjectActorKey: inspection.subjectActorKey,
    boundary: 'Personal profile · only exact actor-linked repository evidence is shown',
    summary: inspection.truncated
      ? `Showing ${shownCapabilities} of ${availableCapabilities} attributable observations after bounded provenance limits.`
      : `${shownCapabilities} attributable observation${shownCapabilities === 1 ? '' : 's'} from ${analyzedRepositories} analyzed repositor${analyzedRepositories === 1 ? 'y' : 'ies'}.`,
    omittedSummary: `${repositoryOnlyOmitted} repository-only · ${unresolvedOmitted} unresolved attribution omitted`,
    capabilities,
    actorEvidence: inspection.actorEvidence.map((record) => ({
      primary: `${record.relation} · ${record.repository}`,
      secondary: `${record.sourceKind} · ${record.implementationOrigin} · ${record.sourceRef}`
    })),
    evidence: inspection.evidence.map((record) => ({
      primary: `${record.repository} · ${record.path}`,
      secondary: `${record.kind} · ${formatBytes(record.bytes)} · ref ${record.id}`
    }))
  };
}

function rejectForbiddenKeys(value, forbidden, label) {
  if (Array.isArray(value)) {
    for (const item of value) rejectForbiddenKeys(item, forbidden, label);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value)) {
    if (forbidden.has(key)) throw new TypeError(`${label} must not expose ${key}`);
    rejectForbiddenKeys(nested, forbidden, label);
  }
}

export function profileInterviewSessionToViewModel(session) {
  if (!session || session.schema !== PROFILE_INTERVIEW_SESSION_SCHEMA) {
    throw new TypeError(`expected ${PROFILE_INTERVIEW_SESSION_SCHEMA}`);
  }
  if (typeof session.subjectActorKey !== 'string' || !session.subjectActorKey.trim()) {
    throw new TypeError('profile interview session requires an explicit subject actor key');
  }
  if (!Array.isArray(session.prompts) || session.prompts.length > MAX_PROFILE_INTERVIEW_PROMPTS) {
    throw new TypeError(`profile interview must contain at most ${MAX_PROFILE_INTERVIEW_PROMPTS} prompts`);
  }

  const evidenceIds = validatePersonalEvidence(session.evidence);
  const actorIds = validateActorEvidence(session.actorEvidence, evidenceIds);
  const resolvableRefs = new Set([...evidenceIds, ...actorIds]);
  const promptIds = new Set();
  const prompts = session.prompts.map((prompt) => {
    if (!prompt || prompt.schema !== PROFILE_INTERVIEW_PROMPT_SCHEMA
      || typeof prompt.id !== 'string' || !prompt.id
      || typeof prompt.questionId !== 'string' || !prompt.questionId
      || prompt.actorKey !== session.subjectActorKey
      || typeof prompt.kind !== 'string' || !prompt.kind
      || typeof prompt.text !== 'string' || !prompt.text.trim()
      || !Array.isArray(prompt.evidenceRefs)
      || !Array.isArray(prompt.declarationIds)) {
      throw new TypeError('profile interview contains an invalid prompt');
    }
    if (promptIds.has(prompt.id)) throw new TypeError('profile interview contains duplicate prompt ids');
    promptIds.add(prompt.id);
    if (!prompt.evidenceRefs.every((ref) => resolvableRefs.has(ref))) {
      throw new TypeError('profile interview prompt refs must resolve inside the bounded session');
    }
    if (Object.hasOwn(prompt, 'confidence') || Object.hasOwn(prompt, 'score') || Object.hasOwn(prompt, 'seniority')) {
      throw new TypeError('profile interview must not expose confidence, score, or seniority semantics');
    }
    return {
      id: prompt.id,
      primary: prompt.text,
      secondary: `${prompt.kind}${prompt.category ? ` · ${prompt.category}` : ''} · ${prompt.evidenceRefs.length} evidence ref${prompt.evidenceRefs.length === 1 ? '' : 's'}`,
      raw: prompt
    };
  });

  return {
    subjectActorKey: session.subjectActorKey,
    summary: prompts.length === 0
      ? 'No additional profile questions are required for the current bounded evidence and private answers.'
      : `${prompts.length} bounded question${prompts.length === 1 ? '' : 's'} remain before publication review.`,
    prompts,
    evidence: session.evidence,
    actorEvidence: session.actorEvidence
  };
}

function validatePublishedDeclaration(declaration) {
  if (!declaration || typeof declaration.id !== 'string' || !declaration.id
    || typeof declaration.category !== 'string' || !declaration.category
    || typeof declaration.key !== 'string' || !declaration.key
    || typeof declaration.value !== 'string' || !declaration.value.trim()
    || typeof declaration.sourceKind !== 'string' || !declaration.sourceKind
    || !Array.isArray(declaration.repositories)) {
    throw new TypeError('publication context contains an invalid declaration');
  }
  rejectForbiddenKeys(declaration, new Set([
    'authorizationRef', 'sourceHash', 'sourceRef', 'publicationStatus', 'declaredAt'
  ]), 'published declaration');
}

function validateDocumentClaim(claim) {
  if (!claim || typeof claim.key !== 'string' || !claim.key
    || typeof claim.label !== 'string' || !claim.label
    || !Array.isArray(claim.repositories)
    || !Array.isArray(claim.evidenceDiversity)
    || !Array.isArray(claim.evidenceRefs)
    || !Array.isArray(claim.supportingStatements)
    || !claim.cautions || typeof claim.cautions !== 'object'
    || !claim.attribution || !PERSONAL_ATTRIBUTION_STATUSES.has(claim.attribution.status)) {
    throw new TypeError('profile output contains an invalid personal document claim');
  }
  if (Object.hasOwn(claim, 'evidence')) {
    throw new TypeError('profile output document claims must not expose raw evidence objects');
  }
  rejectForbiddenKeys(claim, new Set([
    'path', 'sourceHash', 'excerptHash', 'remoteUrl', 'authorizationRef', 'sourceRef',
    'publicationStatus', 'strongestConfidence', 'confidence', 'skillScore', 'seniority'
  ]), 'profile output');
}

export function profileOutputBundleToViewModel(bundle) {
  if (!bundle || bundle.schema !== PROFILE_OUTPUT_BUNDLE_SCHEMA) {
    throw new TypeError(`expected ${PROFILE_OUTPUT_BUNDLE_SCHEMA}`);
  }
  if (typeof bundle.subjectActorKey !== 'string' || !bundle.subjectActorKey.trim()) {
    throw new TypeError('profile output bundle requires an explicit subject actor key');
  }
  const publication = bundle.publicationContext;
  if (!publication || publication.schema !== PROFILE_PUBLICATION_CONTEXT_SCHEMA
    || publication.actorKey !== bundle.subjectActorKey
    || !Array.isArray(publication.declarations)
    || publication.declarations.length > MAX_PROFILE_DECLARATIONS) {
    throw new TypeError('profile output bundle contains an invalid publication context');
  }
  publication.declarations.forEach(validatePublishedDeclaration);

  if (!Array.isArray(bundle.documents) || bundle.documents.length !== 5) {
    throw new TypeError('profile output bundle requires the five bounded personal draft targets');
  }
  const allowedTargets = new Set([
    'github-profile-readme', 'portfolio-card', 'linkedin-project', 'linkedin-skills', 'cv-evidence'
  ]);
  const seenTargets = new Set();
  for (const document of bundle.documents) {
    if (!document || document.schema !== DOCUMENT_INPUT_SCHEMA
      || !allowedTargets.has(document.target)
      || !document.developer || typeof document.developer !== 'object'
      || !Array.isArray(document.repositories)
      || !Array.isArray(document.claims)) {
      throw new TypeError('profile output bundle contains an invalid document input');
    }
    if (seenTargets.has(document.target)) throw new TypeError('profile output bundle contains duplicate document targets');
    seenTargets.add(document.target);
    document.claims.forEach(validateDocumentClaim);
    rejectForbiddenKeys(document, new Set([
      'path', 'sourceHash', 'excerptHash', 'remoteUrl', 'authorizationRef', 'sourceRef',
      'publicationStatus', 'strongestConfidence', 'confidence', 'skillScore', 'seniority'
    ]), 'profile output');
  }

  return {
    subjectActorKey: bundle.subjectActorKey,
    approvedCount: publication.declarations.length,
    publishedDeclarations: publication.declarations,
    documents: bundle.documents
  };
}
