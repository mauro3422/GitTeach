import {
  inspectionResultToViewModel,
  personalProfileInspectionToViewModel,
  profileInterviewSessionToViewModel,
  profileOutputBundleToViewModel,
  repositoryConnectionListToViewModel
} from './view-model.js';
import { renderDocumentDraft } from '../documents/DocumentDraftRenderer.js';
import { PROFILE_PUBLICATION_ENABLED } from './runtime-policy.js';

const runtimeStatus = document.querySelector('#runtime-status');
const form = document.querySelector('#repository-form');
const repositoryKind = document.querySelector('#repository-kind');
const localFields = document.querySelector('#local-fields');
const remoteFields = document.querySelector('#remote-fields');
const pathInput = document.querySelector('#repository-path');
const remoteOwner = document.querySelector('#remote-owner');
const remoteName = document.querySelector('#remote-name');
const remoteUrl = document.querySelector('#remote-url');
const analyzeButton = document.querySelector('#analyze-button');
const formStatus = document.querySelector('#form-status');
const result = document.querySelector('#result');
const repositoryName = document.querySelector('#repository-name');
const acquisitionLabel = document.querySelector('#acquisition-label');
const coverageBadge = document.querySelector('#coverage-badge');
const metrics = document.querySelector('#metrics');
const languages = document.querySelector('#languages');
const technologies = document.querySelector('#technologies');
const projectDomains = document.querySelector('#project-domains');
const evidence = document.querySelector('#evidence');
const inspectionBoundary = document.querySelector('#inspection-boundary');
const evidenceSummary = document.querySelector('#evidence-summary');
const rememberedStatus = document.querySelector('#remembered-status');
const rememberedList = document.querySelector('#remembered-list');
const profileForm = document.querySelector('#profile-form');
const profileTargets = document.querySelector('#profile-targets');
const profileActorKey = document.querySelector('#profile-actor-key');
const profileGitName = document.querySelector('#profile-git-name');
const profileGitEmail = document.querySelector('#profile-git-email');
const profileButton = document.querySelector('#profile-button');
const profileRestoreButton = document.querySelector('#profile-restore-button');
const profileStatus = document.querySelector('#profile-status');
const profileResult = document.querySelector('#profile-result');
const profileSubject = document.querySelector('#profile-subject');
const profileSummary = document.querySelector('#profile-summary');
const profileBoundary = document.querySelector('#profile-boundary');
const profileOmitted = document.querySelector('#profile-omitted');
const profileCapabilities = document.querySelector('#profile-capabilities');
const profileActorEvidence = document.querySelector('#profile-actor-evidence');
const profileEvidence = document.querySelector('#profile-evidence');
const guidedProfile = document.querySelector('#guided-profile');
const prepareInterviewButton = document.querySelector('#prepare-interview-button');
const interviewStatus = document.querySelector('#interview-status');
const interviewQuestion = document.querySelector('#interview-question');
const interviewQuestionText = document.querySelector('#interview-question-text');
const interviewQuestionMeta = document.querySelector('#interview-question-meta');
const interviewAnswerForm = document.querySelector('#interview-answer-form');
const interviewAnswer = document.querySelector('#interview-answer');
const profileDeclarations = document.querySelector('#profile-declarations');
const generateOutputsButton = document.querySelector('#generate-outputs-button');
const outputStatus = document.querySelector('#output-status');
const publishedDeclarations = document.querySelector('#published-declarations');
const profileOutputs = document.querySelector('#profile-outputs');

const invoke = window.__TAURI__?.core?.invoke;
const selectedProfileTargets = new Map();
const MAX_SELECTED_PROFILE_TARGETS = 32;
let rememberedRepositoryConnections = [];
let activeProfileRequest = null;
let privateDeclarations = [];
let activeInterviewSession = null;
let guidedProfileActivation = 0;

function setStatus(element, text, state) {
  element.textContent = text;
  element.dataset.state = state;
}

function replaceMetricRows(rows) {
  metrics.replaceChildren(
    ...rows.map(([label, value]) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'metric';
      const term = document.createElement('dt');
      term.textContent = label;
      const description = document.createElement('dd');
      description.textContent = value;
      wrapper.append(term, description);
      return wrapper;
    })
  );
}

function replaceDataRows(container, rows, emptyLabel) {
  if (rows.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-row';
    empty.textContent = emptyLabel;
    container.replaceChildren(empty);
    return;
  }

  container.replaceChildren(
    ...rows.map(({ primary, secondary }) => {
      const row = document.createElement('div');
      row.className = 'data-row';
      const name = document.createElement('strong');
      name.textContent = primary;
      const detail = document.createElement('span');
      detail.textContent = secondary;
      row.append(name, detail);
      return row;
    })
  );
}

function resetGuidedProfile() {
  guidedProfileActivation += 1;
  activeProfileRequest = null;
  privateDeclarations = [];
  activeInterviewSession = null;
  guidedProfile.hidden = true;
  interviewQuestion.hidden = true;
  interviewAnswer.value = '';
  profileDeclarations.replaceChildren();
  publishedDeclarations.replaceChildren();
  profileOutputs.replaceChildren();
  prepareInterviewButton.disabled = true;
  generateOutputsButton.disabled = true;
  setStatus(interviewStatus, 'Inspect a personal profile first.', 'idle');
  setStatus(outputStatus, 'Publication permissions are disabled during testing.', 'idle');
}

async function activateGuidedProfile(request) {
  const activation = guidedProfileActivation + 1;
  guidedProfileActivation = activation;
  const nextProfileRequest = structuredClone(request);
  const expectedActorKey = nextProfileRequest.identity.actorKey;
  activeProfileRequest = nextProfileRequest;
  privateDeclarations = [];
  activeInterviewSession = null;
  interviewAnswer.value = '';
  interviewQuestion.hidden = true;
  profileDeclarations.replaceChildren();
  publishedDeclarations.replaceChildren();
  profileOutputs.replaceChildren();
  guidedProfile.hidden = false;
  prepareInterviewButton.disabled = false;
  generateOutputsButton.disabled = true;
  setStatus(interviewStatus, 'Loading private answers saved for this exact profile...', 'loading');
  setStatus(
    outputStatus,
    PROFILE_PUBLICATION_ENABLED
      ? 'Publication approval is available.'
      : 'Publication and approval permissions are disabled during the extended persistence test phase.',
    'idle'
  );
  try {
    const restored = await invoke('load_private_profile_declarations', { request: nextProfileRequest });
    if (activation !== guidedProfileActivation) return;
    privateDeclarations = restored.map((declaration) => validatePrivateDeclaration(declaration, expectedActorKey));
    setStatus(
      interviewStatus,
      privateDeclarations.length === 0
        ? 'Ready to ask only the profile questions that remain unresolved.'
        : `${privateDeclarations.length} private answer${privateDeclarations.length === 1 ? '' : 's'} restored locally.`,
      'idle'
    );
  } catch (error) {
    if (activation !== guidedProfileActivation) return;
    privateDeclarations = [];
    setStatus(interviewStatus, String(error || 'Saved private answers could not be restored.'), 'error');
  }
  if (activation !== guidedProfileActivation) return;
  renderPrivateDeclarations();
}

function validatePrivateDeclaration(declaration, expectedActorKey = activeProfileRequest?.identity?.actorKey) {
  if (!declaration || declaration.schema !== 'giteach-profile-declaration-v1'
    || typeof declaration.id !== 'string' || !declaration.id
    || declaration.actorKey !== expectedActorKey
    || declaration.publicationStatus !== 'private'
    || typeof declaration.value !== 'string' || !declaration.value.trim()) {
    throw new TypeError('The native runtime returned an invalid private profile declaration.');
  }
  return declaration;
}

function renderPrivateDeclarations() {
  if (privateDeclarations.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-row';
    empty.textContent = 'No private answers have been saved yet.';
    profileDeclarations.replaceChildren(empty);
    return;
  }

  profileDeclarations.replaceChildren(...privateDeclarations.map((declaration) => {
    const row = document.createElement('div');
    row.className = 'approval-row';
    const copy = document.createElement('span');
    copy.className = 'approval-copy';
    const title = document.createElement('strong');
    title.textContent = `${declaration.category} · ${declaration.key}`;
    const value = document.createElement('span');
    value.textContent = declaration.value;
    const state = document.createElement('span');
    state.className = 'field-help';
    state.textContent = 'Private · saved locally · publication disabled';
    copy.append(title, value, state);
    row.append(copy);
    return row;
  }));
}

function renderInterviewSession(sessionPayload) {
  const view = profileInterviewSessionToViewModel(sessionPayload);
  activeInterviewSession = view;
  setStatus(interviewStatus, view.summary, view.prompts.length === 0 ? 'success' : 'idle');
  if (view.prompts.length === 0) {
    interviewQuestion.hidden = true;
    return;
  }

  const prompt = view.prompts[0];
  interviewQuestionText.textContent = prompt.primary;
  interviewQuestionMeta.textContent = prompt.secondary;
  interviewQuestion.hidden = false;
}

function repositoriesForPrompt(prompt) {
  if (!activeInterviewSession) return [];
  const evidenceRepositories = new Map(
    activeInterviewSession.evidence.map((record) => [record.id, record.repository])
  );
  const actorRepositories = new Map(
    activeInterviewSession.actorEvidence.map((record) => [record.id, record.repository])
  );
  return [...new Set(prompt.evidenceRefs
    .map((ref) => evidenceRepositories.get(ref) || actorRepositories.get(ref))
    .filter(Boolean))].sort();
}

function renderProfileOutputs(bundlePayload) {
  const view = profileOutputBundleToViewModel(bundlePayload);
  replaceDataRows(
    publishedDeclarations,
    view.publishedDeclarations.map((declaration) => ({
      primary: `${declaration.category} ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· ${declaration.key}`,
      secondary: declaration.value
    })),
    'No private answers were approved for publication.'
  );

  profileOutputs.replaceChildren(...view.documents.map((documentInput) => {
    const card = document.createElement('article');
    card.className = 'draft-card';
    const heading = document.createElement('h4');
    heading.textContent = documentInput.target;
    const draft = document.createElement('pre');
    draft.textContent = renderDocumentDraft(documentInput);
    card.append(heading, draft);
    return card;
  }));
  setStatus(
    outputStatus,
    `Generated ${view.documents.length} evidence-backed drafts with ${view.approvedCount} explicitly approved private highlight${view.approvedCount === 1 ? '' : 's'}.`,
    'success'
  );
}

function profileTargetKey(target) {
  if (target.kind === 'remote') return `remote:${target.owner}/${target.name}:${target.remoteUrl}`;
  return `local:${target.path}`;
}

function profileTargetLabel(target) {
  if (target.kind === 'remote') return `${target.owner}/${target.name} ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· remote audit`;
  return target.path;
}

function renderRememberedRepositories() {
  if (rememberedRepositoryConnections.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-row';
    empty.textContent = 'No successful repository connections have been remembered yet.';
    rememberedList.replaceChildren(empty);
    return;
  }

  rememberedList.replaceChildren(...rememberedRepositoryConnections.map((connection) => {
    const row = document.createElement('article');
    row.className = 'remembered-row';

    const copy = document.createElement('div');
    copy.className = 'remembered-copy';
    const title = document.createElement('strong');
    title.textContent = connection.primary;
    const location = document.createElement('span');
    location.textContent = connection.secondary;
    const meta = document.createElement('span');
    meta.className = 'remembered-meta';
    meta.textContent = connection.meta;
    copy.append(title, location, meta);

    const key = profileTargetKey(connection.target);
    const selected = selectedProfileTargets.has(key);
    const selectionFull = selectedProfileTargets.size >= MAX_SELECTED_PROFILE_TARGETS && !selected;
    const actions = document.createElement('div');
    actions.className = 'remembered-actions';

    const restoreButton = document.createElement('button');
    restoreButton.type = 'button';
    restoreButton.textContent = 'Restore view';
    restoreButton.addEventListener('click', async () => {
      restoreButton.disabled = true;
      setStatus(rememberedStatus, `Loading the last bounded view for ${connection.primary}ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦`, 'loading');
      try {
        const snapshot = await invoke('load_repository_snapshot', { connectionId: connection.id });
        if (!snapshot) {
          setStatus(rememberedStatus, `${connection.primary} has no saved inspection snapshot yet. Re-inspect it to create one.`, 'idle');
          return;
        }
        renderInspection(snapshot);
        setStatus(rememberedStatus, `Restored the last bounded view for ${connection.primary}. Re-inspect to refresh the repository before relying on current state.`, 'success');
      } catch {
        setStatus(rememberedStatus, `The saved view for ${connection.primary} could not be restored. Current-session inspection is still available.`, 'error');
      } finally {
        restoreButton.disabled = false;
      }
    });

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = selected ? 'Selected' : (selectionFull ? 'Profile limit' : 'Use for profile');
    button.disabled = selected || selectionFull;
    button.addEventListener('click', () => {
      if (!addProfileTarget(connection.target)) {
        setStatus(rememberedStatus, `A profile can use at most ${MAX_SELECTED_PROFILE_TARGETS} repositories at once.`, 'error');
        return;
      }
      setStatus(rememberedStatus, `${connection.primary} added to the current profile session.`, 'success');
    });

    actions.append(restoreButton, button);
    row.append(copy, actions);
    return row;
  }));
}

async function loadRememberedRepositories() {
  if (!invoke) {
    rememberedRepositoryConnections = [];
    renderRememberedRepositories();
    setStatus(rememberedStatus, 'Remembered repositories require the native desktop runtime.', 'idle');
    return;
  }

  try {
    const payload = await invoke('list_repository_connections');
    const view = repositoryConnectionListToViewModel(payload);
    rememberedRepositoryConnections = view.connections;
    renderRememberedRepositories();
    const suffix = view.truncated ? ' Only the first 128 are shown.' : '';
    setStatus(
      rememberedStatus,
      `${view.availableConnectionCount} remembered repositor${view.availableConnectionCount === 1 ? 'y' : 'ies'} available.${suffix}`,
      'success'
    );
  } catch {
    rememberedRepositoryConnections = [];
    renderRememberedRepositories();
    setStatus(rememberedStatus, 'Local repository history could not be loaded. Current-session analysis is still available.', 'error');
  }
}

function refreshProfileTargets() {
  const targets = [...selectedProfileTargets.values()];
  profileTargets.textContent = targets.length === 0
    ? 'No repositories selected yet.'
    : targets.map(profileTargetLabel).join(' ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· ');
  const profileUnavailable = !invoke || targets.length === 0;
  profileButton.disabled = profileUnavailable;
  profileRestoreButton.disabled = profileUnavailable;
  if (targets.length > 0 && (!profileStatus.dataset.state || profileStatus.dataset.state === 'idle')) {
    setStatus(profileStatus, `${targets.length} repositor${targets.length === 1 ? 'y' : 'ies'} ready for attribution inspection.`, 'idle');
  }
}

function addProfileTarget(target) {
  const key = profileTargetKey(target);
  if (!selectedProfileTargets.has(key) && selectedProfileTargets.size >= MAX_SELECTED_PROFILE_TARGETS) {
    return false;
  }
  selectedProfileTargets.set(key, { ...target });
  resetGuidedProfile();
  refreshProfileTargets();
  renderRememberedRepositories();
  return true;
}

function renderProfile(resultPayload) {
  const view = personalProfileInspectionToViewModel(resultPayload);
  profileSubject.textContent = view.subjectActorKey;
  profileSummary.textContent = view.summary;
  profileBoundary.textContent = view.boundary;
  profileOmitted.textContent = view.omittedSummary;
  replaceDataRows(profileCapabilities, view.capabilities, 'No attributable personal observations were established.');
  replaceDataRows(profileActorEvidence, view.actorEvidence, 'No actor evidence was selected.');
  replaceDataRows(profileEvidence, view.evidence, 'No personal-profile repository evidence was selected.');
  profileResult.hidden = false;
}

function renderInspection(resultPayload) {
  const view = inspectionResultToViewModel(resultPayload);
  repositoryName.textContent = view.repositoryName;
  acquisitionLabel.textContent = view.acquisitionLabel;
  coverageBadge.textContent = view.coverageLabel;
  inspectionBoundary.textContent = view.inspectionBoundary;
  evidenceSummary.textContent = view.evidenceSummary;
  replaceMetricRows(view.metrics);
  replaceDataRows(languages, view.languages, 'No recognized source languages.');
  replaceDataRows(technologies, view.technologies, 'No manifest technology signals found.');
  replaceDataRows(projectDomains, view.projectDomains, 'No deterministic project-domain signal was established.');
  replaceDataRows(evidence, view.evidence, 'No bounded evidence records were retained for inspection.');
  result.hidden = false;
}

function syncRepositoryKind() {
  const isRemote = repositoryKind.value === 'remote';
  localFields.hidden = isRemote;
  remoteFields.hidden = !isRemote;
  setStatus(
    formStatus,
    isRemote
      ? 'Remote analysis keeps only audit metadata and transient selected blobs.'
      : 'Local repositories are analyzed in place.',
    'idle'
  );
}

function buildRepositoryTarget() {
  if (repositoryKind.value === 'remote') {
    const owner = remoteOwner.value.trim();
    const name = remoteName.value.trim();
    const url = remoteUrl.value.trim();
    if (!owner || !name || !url) {
      throw new TypeError('Enter the remote owner, repository name, and Git URL.');
    }
    return { kind: 'remote', owner, name, remoteUrl: url };
  }

  const path = pathInput.value.trim();
  if (!path) throw new TypeError('Enter a local repository path.');
  return { kind: 'local', path };
}

async function initializeRuntime() {
  if (!invoke) {
    setStatus(runtimeStatus, 'Browser preview ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· native runtime unavailable', 'preview');
    analyzeButton.disabled = true;
    setStatus(formStatus, 'Run the Tauri desktop shell to inspect repositories.', 'error');
    await loadRememberedRepositories();
    return;
  }

  try {
    const runtime = await invoke('runtime_info');
    const mode = runtime.localFirst && !runtime.hostedAnalysisRequired ? 'Local runtime ready' : 'Runtime policy mismatch';
    setStatus(runtimeStatus, mode, runtime.localFirst ? 'ready' : 'preview');
  } catch {
    setStatus(runtimeStatus, 'Native runtime unavailable', 'preview');
    analyzeButton.disabled = true;
    setStatus(formStatus, 'The Rust runtime did not answer the startup check.', 'error');
  }
  await loadRememberedRepositories();
}

repositoryKind.addEventListener('change', syncRepositoryKind);

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!invoke) return;

  let target;
  try {
    target = buildRepositoryTarget();
  } catch (error) {
    setStatus(formStatus, error.message, 'error');
    return;
  }

  analyzeButton.disabled = true;
  setStatus(
    formStatus,
    target.kind === 'remote'
      ? 'Refreshing the blobless audit and building bounded repository evidenceÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦'
      : 'Analyzing locally and building bounded repository evidenceÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦',
    'loading'
  );

  try {
    const inspection = await invoke('inspect_repository', { target });
    renderInspection(inspection);
    const addedToProfile = addProfileTarget(target);
    await loadRememberedRepositories();
    const selectionNote = addedToProfile
      ? ''
      : ` The repository was remembered, but the current profile selection is limited to ${MAX_SELECTED_PROFILE_TARGETS} repositories.`;
    setStatus(
      formStatus,
      `${target.kind === 'remote'
        ? 'Remote inspection complete. Selected source blobs were transient; only bounded provenance is shown.'
        : 'Local inspection complete. Evidence stays repository-scoped; no personal experience is inferred.'}${selectionNote}`,
      'success'
    );
  } catch (error) {
    result.hidden = true;
    setStatus(formStatus, String(error || 'Repository inspection failed.'), 'error');
  } finally {
    analyzeButton.disabled = false;
  }
});

function currentProfileRequest() {
  const actorKey = profileActorKey.value.trim();
  const gitName = profileGitName.value.trim();
  const gitEmail = profileGitEmail.value.trim();
  const targets = [...selectedProfileTargets.values()];
  if (!actorKey) return { error: 'Enter an explicit subject actor key.' };
  if (!gitName && !gitEmail) {
    return { error: 'Enter at least one Git name or email to link repository work.' };
  }
  if (targets.length === 0) return { error: 'Inspect at least one repository first.' };
  return {
    request: {
      targets,
      identity: {
        actorKey,
        names: gitName ? [gitName] : [],
        emails: gitEmail ? [gitEmail] : []
      }
    }
  };
}

profileForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!invoke) return;

  const { request, error } = currentProfileRequest();
  if (!request) {
    setStatus(profileStatus, error, 'error');
    return;
  }

  profileButton.disabled = true;
  profileRestoreButton.disabled = true;
  setStatus(profileStatus, 'Joining repository evidence with exact actor attributionÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦', 'loading');
  try {
    const inspection = await invoke('inspect_profile', { request });
    renderProfile(inspection);
    await activateGuidedProfile(request);
    setStatus(
      profileStatus,
      'Personal profile inspection complete. Repository-only evidence was not promoted.',
      'success'
    );
  } catch (error) {
    profileResult.hidden = true;
    setStatus(profileStatus, String(error || 'Personal profile inspection failed.'), 'error');
  } finally {
    refreshProfileTargets();
  }
});

profileRestoreButton.addEventListener('click', async () => {
  if (!invoke) return;
  const { request, error } = currentProfileRequest();
  if (!request) {
    setStatus(profileStatus, error, 'error');
    return;
  }

  profileButton.disabled = true;
  profileRestoreButton.disabled = true;
  setStatus(profileStatus, 'Loading the last bounded profile for this exact identity and repository selectionÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦', 'loading');
  try {
    const inspection = await invoke('load_profile_snapshot', { request });
    if (!inspection) {
      setStatus(
        profileStatus,
        'No saved personal profile matches this exact actor identity and repository selection. Inspect it first.',
        'idle'
      );
      return;
    }
    renderProfile(inspection);
    await activateGuidedProfile(request);
    setStatus(
      profileStatus,
      'Restored the last bounded personal profile and its private answers for this exact profile. Publication approval remains disabled; re-inspect before relying on current repository state.',
      'success'
    );
  } catch (error) {
    profileResult.hidden = true;
    setStatus(profileStatus, String(error || 'Saved personal profile could not be restored.'), 'error');
  } finally {
    refreshProfileTargets();
  }
});

prepareInterviewButton.addEventListener('click', async () => {
  if (!invoke || !activeProfileRequest) return;
  prepareInterviewButton.disabled = true;
  setStatus(interviewStatus, 'Reconciling bounded evidence with your private answersÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦', 'loading');
  try {
    const session = await invoke('prepare_profile_interview', {
      request: {
        profile: activeProfileRequest,
        declarations: privateDeclarations
      }
    });
    renderInterviewSession(session);
  } catch (error) {
    interviewQuestion.hidden = true;
    setStatus(interviewStatus, String(error || 'Profile interview preparation failed.'), 'error');
  } finally {
    prepareInterviewButton.disabled = false;
  }
});

interviewAnswerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!invoke || !activeProfileRequest || !activeInterviewSession?.prompts?.length) return;

  const answer = interviewAnswer.value.trim();
  if (!answer) {
    setStatus(interviewStatus, 'Enter an answer before saving it privately.', 'error');
    return;
  }

  const prompt = activeInterviewSession.prompts[0].raw;
  setStatus(interviewStatus, 'Saving this answer as a private declarationÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦', 'loading');
  try {
    const declaration = validatePrivateDeclaration(await invoke('answer_profile_interview', {
      request: {
        actorKey: activeProfileRequest.identity.actorKey,
        prompt,
        answer,
        answeredAt: new Date().toISOString(),
        repositories: repositoriesForPrompt(prompt)
      }
    }));
    const savedDeclaration = validatePrivateDeclaration(await invoke('save_private_profile_declaration', {
      request: {
        profile: activeProfileRequest,
        declaration
      }
    }));
    const existingIndex = privateDeclarations.findIndex((item) => item.id === savedDeclaration.id);
    if (existingIndex >= 0) privateDeclarations.splice(existingIndex, 1, savedDeclaration);
    else privateDeclarations.push(savedDeclaration);
    renderPrivateDeclarations();
    interviewAnswer.value = '';

    const session = await invoke('prepare_profile_interview', {
      request: {
        profile: activeProfileRequest,
        declarations: privateDeclarations
      }
    });
    renderInterviewSession(session);
  } catch (error) {
    setStatus(interviewStatus, String(error || 'Private profile answer could not be saved.'), 'error');
  }
});

generateOutputsButton.addEventListener('click', async () => {
  if (!invoke || !activeProfileRequest) return;
  if (!PROFILE_PUBLICATION_ENABLED) {
    setStatus(
      outputStatus,
      'Publication and approval permissions are disabled during the extended persistence test phase.',
      'idle'
    );
    return;
  }
  generateOutputsButton.disabled = true;
  setStatus(outputStatus, 'Applying explicit publication approval and preparing bounded draftsÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦', 'loading');
  try {
    const bundle = await invoke('generate_profile_outputs', {
      request: {
        profile: activeProfileRequest,
        declarations: privateDeclarations,
        approvedDeclarationIds: []
      }
    });
    renderProfileOutputs(bundle);
  } catch (error) {
    publishedDeclarations.replaceChildren();
    profileOutputs.replaceChildren();
    setStatus(outputStatus, String(error || 'Profile drafts could not be generated.'), 'error');
  } finally {
    generateOutputsButton.disabled = false;
  }
});

syncRepositoryKind();
resetGuidedProfile();
refreshProfileTargets();
initializeRuntime();
