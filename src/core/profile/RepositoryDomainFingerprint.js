export const REPOSITORY_DOMAIN_FINGERPRINT_SCHEMA = 'giteach-repository-domain-fingerprint-v1';

const MAX_EVIDENCE_REFS_PER_CANDIDATE = 6;
const MAX_TOPIC_REFS_PER_CANDIDATE = 2;

const DEFINITIONS = Object.freeze([
  {
    key: 'game-development',
    label: 'Game development',
    technologies: ['godot'],
    languages: ['gdscript'],
    topics: ['game', 'game-development', 'gamedev', 'godot', 'game-engine', 'modding']
  },
  {
    key: 'web-application',
    label: 'Web application',
    technologies: ['svelte', '@sveltejs/kit', 'react', 'react-dom', 'next', 'vue', 'nuxt', '@angular/core', 'astro'],
    topics: ['web', 'web-app', 'web-application', 'frontend', 'svelte', 'react', 'nextjs', 'vue', 'angular']
  },
  {
    key: 'desktop-application',
    label: 'Desktop application',
    technologies: ['tauri', '@tauri-apps/api', '@tauri-apps/cli', 'electron'],
    topics: ['desktop', 'desktop-app', 'desktop-application', 'tauri', 'electron']
  },
  {
    key: 'developer-tooling',
    label: 'Developer tooling',
    technologies: ['monaco-editor', 'vscode', 'vscode-languageserver', 'vscode-languageclient', '@codingame/monaco-vscode-api'],
    topics: ['developer-tools', 'developer-tooling', 'devtools', 'ide', 'code-editor', 'language-server', 'lsp', 'cli', 'command-line-tool']
  },
  {
    key: 'ai-model-integration',
    label: 'AI / model integration',
    technologies: ['openai', '@anthropic-ai/sdk', 'anthropic', 'ollama', 'langchain', 'llama-index', '@google/generative-ai'],
    topics: ['ai', 'artificial-intelligence', 'llm', 'large-language-model', 'generative-ai', 'openai', 'ollama']
  },
  {
    key: 'service-api',
    label: 'Service / API',
    technologies: ['express', 'fastify', 'koa', 'axum', 'actix-web', 'rocket'],
    topics: ['api', 'rest-api', 'backend', 'server', 'service', 'microservice']
  }
]);

function normalize(value) {
  return String(value ?? '').trim().toLowerCase();
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function assertBundle(bundle) {
  if (!bundle?.repository?.name || !Array.isArray(bundle.evidence) || !Array.isArray(bundle.languages) || !Array.isArray(bundle.technologies)) {
    throw new Error('Repository domain fingerprint requires a RepoEvidenceBundle-like input.');
  }
}

function evidenceRefsForTechnology(bundle, technologyNames) {
  const wanted = new Set(technologyNames.map(normalize));
  const paths = new Set(
    bundle.technologies
      .filter((technology) => wanted.has(normalize(technology.name)))
      .map((technology) => String(technology.sourcePath ?? technology.source_path ?? '').replaceAll('\\\\', '/'))
      .filter(Boolean)
  );
  return bundle.evidence
    .filter((record) => paths.has(String(record.path ?? '').replaceAll('\\\\', '/')))
    .map((record) => record.id)
    .filter(Boolean);
}

function evidenceRefsForLanguage(bundle, languageNames) {
  const wanted = new Set(languageNames.map(normalize));
  return bundle.evidence
    .filter((record) => wanted.has(normalize(record?.metadata?.language)))
    .map((record) => record.id)
    .filter(Boolean);
}

function topicRef(repository, topic) {
  return `github-topic:${repository}:${topic}`;
}

export function analyzeRepositoryDomainFingerprint({ bundle, topics = [], repository = null } = {}) {
  assertBundle(bundle);
  if (!Array.isArray(topics)) throw new Error('topics must be an array when supplied.');

  const repositoryName = String(repository ?? bundle.repository.name).trim();
  if (!repositoryName) throw new Error('repository is required.');

  const declaredTopics = uniqueSorted(topics.map(normalize));
  const technologies = uniqueSorted(bundle.technologies.map((item) => normalize(item.name)));
  const languages = uniqueSorted(bundle.languages.map((item) => normalize(item.language)));
  const technologySet = new Set(technologies);
  const languageSet = new Set(languages);
  const topicSet = new Set(declaredTopics);
  const candidates = [];

  for (const definition of DEFINITIONS) {
    const matchedTechnologies = uniqueSorted((definition.technologies ?? []).map(normalize).filter((item) => technologySet.has(item)));
    const matchedLanguages = uniqueSorted((definition.languages ?? []).map(normalize).filter((item) => languageSet.has(item)));
    const matchedTopics = uniqueSorted((definition.topics ?? []).map(normalize).filter((item) => topicSet.has(item)));
    if (matchedTechnologies.length === 0 && matchedLanguages.length === 0 && matchedTopics.length === 0) continue;

    const evidenceRefs = uniqueSorted([
      ...evidenceRefsForTechnology(bundle, matchedTechnologies),
      ...evidenceRefsForLanguage(bundle, matchedLanguages)
    ]).slice(0, MAX_EVIDENCE_REFS_PER_CANDIDATE);
    const topicRefs = matchedTopics
      .map((topic) => topicRef(repositoryName, topic))
      .slice(0, MAX_TOPIC_REFS_PER_CANDIDATE);
    const sourceKinds = uniqueSorted([
      matchedTechnologies.length > 0 ? 'technology' : null,
      matchedLanguages.length > 0 ? 'language' : null,
      matchedTopics.length > 0 ? 'github-topic' : null
    ]);

    candidates.push(Object.freeze({
      key: definition.key,
      label: definition.label,
      sourceKinds,
      evidenceRefs,
      sourceRefs: Object.freeze(uniqueSorted([...evidenceRefs, ...topicRefs])),
      technologies: Object.freeze(matchedTechnologies),
      languages: Object.freeze(matchedLanguages),
      topics: Object.freeze(matchedTopics),
      ruleBased: true
    }));
  }

  candidates.sort((a, b) => a.label.localeCompare(b.label));
  return Object.freeze({
    schema: REPOSITORY_DOMAIN_FINGERPRINT_SCHEMA,
    repository: repositoryName,
    declaredTopics: Object.freeze(declaredTopics),
    candidates: Object.freeze(candidates)
  });
}
