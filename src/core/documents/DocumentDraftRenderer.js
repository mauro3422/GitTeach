function escapeMarkdown(value) {
  return String(value ?? '').replace(/([\\`*_{}\[\]()#+\-.!|>])/g, '\\$1');
}

function compactRefs(refs) {
  return refs.map((ref) => `\`${escapeMarkdown(ref)}\``).join(', ');
}

function identity(input) {
  return input.developer?.name ?? input.developer?.username ?? 'Developer';
}

function repoText(claim) {
  return claim.repositories.map(escapeMarkdown).join(', ') || 'n/a';
}

function relationSet(claim) {
  return new Set(claim.attribution?.actorRelations ?? []);
}

function attributionStatement(claim) {
  const status = claim.attribution?.status ?? 'repository-only';
  const relations = relationSet(claim);
  const label = escapeMarkdown(claim.label);
  const repos = repoText(claim);

  if (status === 'repository-only') {
    return `Project evidence indicates **${label}** in ${repos}; this is not attributed to the developer.`;
  }
  if (status === 'identity-linked') {
    return `Identity-linked contribution involving **${label}** in ${repos}.`;
  }
  if (status === 'user-confirmed') {
    return `User-confirmed experience involving **${label}** in ${repos}, backed by repository evidence.`;
  }
  if (relations.has('agent-direction')) {
    return `Directed AI-assisted work involving **${label}** in ${repos}.`;
  }
  if (relations.has('decision-record') || relations.has('design-session')) {
    return `Made or recorded design decisions involving **${label}** in ${repos}.`;
  }
  if (relations.has('debug-session')) {
    return `Debugged work involving **${label}** in ${repos}.`;
  }
  if (relations.has('test-session')) {
    return `Tested or validated work involving **${label}** in ${repos}.`;
  }
  if (relations.has('reviewed-change')) {
    return `Reviewed changes involving **${label}** in ${repos}.`;
  }
  if (relations.has('maintenance-session')) {
    return `Maintained work involving **${label}** in ${repos}.`;
  }
  return `Agency-supported work involving **${label}** in ${repos}.`;
}

function cautionLines(claim, indent = '') {
  const lines = [];
  if (claim.cautions?.personalAttributionMissing) {
    lines.push(`${indent}Project evidence only: no developer attribution is established.`);
  }
  if (claim.cautions?.identityOnly) {
    lines.push(`${indent}Identity-linked only: Git association does not prove manual authorship of the implementation.`);
  }
  if (claim.cautions?.aiAssistanceObserved) {
    lines.push(`${indent}AI-assisted or mixed implementation provenance is recorded.`);
  }
  if (claim.cautions?.hasStaleEvidence) {
    lines.push(`${indent}Review required: ${claim.cautions.staleEvidenceRefs.length} stale evidence reference(s).`);
  }
  if (claim.cautions?.hasContradictions) {
    lines.push(`${indent}Review required: ${claim.cautions.contradictionCount} contradictory observation(s).`);
  }
  return lines;
}

function renderClaimsAsBullets(input, prefix = '- ') {
  const lines = [];
  for (const claim of input.claims) {
    lines.push(`${prefix}${attributionStatement(claim)} Evidence: ${compactRefs(claim.evidenceRefs)}.`);
    for (const caution of cautionLines(claim, '  - ')) lines.push(caution);
  }
  return lines;
}

function renderGithubProfile(input) {
  return [
    `# ${escapeMarkdown(identity(input))}`,
    '',
    '## Evidence-backed experience',
    '',
    ...renderClaimsAsBullets(input)
  ];
}

function renderProjectSummary(input) {
  const repositories = input.repositories.map(escapeMarkdown).join(', ') || 'n/a';
  return [
    '## Evidence-backed project summary',
    '',
    `Repositories: ${repositories}`,
    '',
    '### Observed project capabilities and contribution evidence',
    '',
    ...renderClaimsAsBullets(input)
  ];
}

function renderPortfolioCard(input) {
  return [
    `### ${escapeMarkdown(input.repositories[0] ?? identity(input))}`,
    '',
    ...input.claims.flatMap((claim) => [
      attributionStatement(claim),
      `Evidence: ${compactRefs(claim.evidenceRefs)}`,
      ...cautionLines(claim),
      ''
    ])
  ];
}

function renderLinkedInProject(input) {
  return [
    '## LinkedIn project evidence draft',
    '',
    ...input.claims.flatMap((claim) => [
      attributionStatement(claim),
      `Evidence refs: ${compactRefs(claim.evidenceRefs)}`,
      ...cautionLines(claim),
      ''
    ])
  ];
}

function renderLinkedInSkills(input) {
  return [
    '## Evidence-backed LinkedIn experience',
    '',
    ...input.claims.flatMap((claim) => [
      `- ${attributionStatement(claim)} Refs: ${compactRefs(claim.evidenceRefs)}.`,
      ...cautionLines(claim, '  ')
    ])
  ];
}

function renderCvEvidence(input) {
  return [
    '## CV evidence bundle',
    '',
    ...input.claims.flatMap((claim) => [
      `- ${attributionStatement(claim)} Evidence: ${compactRefs(claim.evidenceRefs)}.`,
      ...cautionLines(claim, '  ')
    ])
  ];
}

const RENDERERS = Object.freeze({
  'github-profile-readme': renderGithubProfile,
  'project-readme-summary': renderProjectSummary,
  'portfolio-card': renderPortfolioCard,
  'linkedin-project': renderLinkedInProject,
  'linkedin-skills': renderLinkedInSkills,
  'cv-evidence': renderCvEvidence
});

export function renderDocumentDraft(input) {
  if (input?.schema !== 'giteach-document-input-v1') {
    throw new Error('Document renderer requires giteach-document-input-v1.');
  }
  const render = RENDERERS[input.target];
  if (!render) throw new Error(`Unsupported document target: ${input.target}`);

  if ((input.claims ?? []).length === 0) {
    return '_No evidence-backed claims with sufficient attribution are available for this draft._';
  }

  const lines = render(input);
  lines.push('', '_Draft generated only from curated DocumentInput v1 claims. Project facts, identity links and agency evidence remain explicitly distinct._');
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
