use std::{
    collections::{BTreeMap, BTreeSet},
    fs,
    path::{Component, Path},
};

use ignore::WalkBuilder;
use serde_json::json;
use sha2::{Digest, Sha256};
use thiserror::Error;

use crate::{
    git::repository_identity,
    manifest::{manifest_kind, technology_signals},
    model::{
        EvidenceRecord, LanguageStat, RepoEvidenceBundle, RepositoryEvidenceCoverage,
        RepositoryIdentity, RepositorySummary, TechnologySignal,
    },
    policy::{is_denied_path, is_probably_binary},
    redaction::bounded_redacted_excerpt,
};

#[derive(Debug, Clone)]
pub struct CollectorOptions {
    pub max_file_bytes: u64,
    pub max_excerpt_chars: usize,
    pub max_source_evidence: usize,
    pub max_doc_evidence: usize,
    pub max_test_evidence: usize,
    pub max_tooling_evidence: usize,
    pub max_profile_signal_evidence: usize,
}

impl Default for CollectorOptions {
    fn default() -> Self {
        Self {
            max_file_bytes: 512 * 1024,
            max_excerpt_chars: 1600,
            max_source_evidence: 24,
            max_doc_evidence: 16,
            max_test_evidence: 16,
            max_tooling_evidence: 16,
            max_profile_signal_evidence: 12,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SelectedRepositoryFile {
    pub path: String,
    pub bytes: Vec<u8>,
}

#[derive(Debug, Error)]
pub enum CollectorError {
    #[error("repository root does not exist: {0}")]
    MissingRoot(String),
    #[error("repository root is not a directory: {0}")]
    NotDirectory(String),
    #[error("failed to walk repository: {0}")]
    Walk(String),
    #[error("selected repository path is unsafe or absolute: {0}")]
    InvalidSelectedPath(String),
}

#[derive(Default)]
struct Counters {
    files_scanned: u64,
    bytes_scanned: u64,
    manifests: u64,
    docs: u64,
    tests: u64,
    tooling_files: u64,
    source_files: u64,
}

pub struct RepoEvidenceCollector {
    options: CollectorOptions,
}

impl RepoEvidenceCollector {
    pub fn new(options: CollectorOptions) -> Self {
        Self { options }
    }
    pub fn collect(&self, root: impl AsRef<Path>) -> Result<RepoEvidenceBundle, CollectorError> {
        let root = root.as_ref();
        if !root.exists() {
            return Err(CollectorError::MissingRoot(
                root.to_string_lossy().to_string(),
            ));
        }
        if !root.is_dir() {
            return Err(CollectorError::NotDirectory(
                root.to_string_lossy().to_string(),
            ));
        }

        let identity = repository_identity(root);
        let mut counters = Counters::default();
        let mut language_totals: BTreeMap<String, (u64, u64)> = BTreeMap::new();
        let mut technologies = BTreeSet::<(String, String, String)>::new();
        let mut manifest_evidence = Vec::new();
        let mut doc_evidence = Vec::new();
        let mut test_evidence = Vec::new();
        let mut tooling_evidence = Vec::new();
        let mut profile_signal_evidence = Vec::new();
        let mut source_representatives = BTreeMap::<String, EvidenceRecord>::new();
        let mut source_overflow = Vec::new();

        let mut builder = WalkBuilder::new(root);
        builder
            .hidden(false)
            .git_ignore(true)
            .git_global(true)
            .git_exclude(true)
            .follow_links(false);

        for entry in builder.build() {
            let entry = entry.map_err(|error| CollectorError::Walk(error.to_string()))?;
            let path = entry.path();
            if path == root || entry.file_type().is_none_or(|kind| !kind.is_file()) {
                continue;
            }
            let relative = path.strip_prefix(root).unwrap_or(path);
            if is_denied_path(relative) {
                continue;
            }

            let Ok(metadata) = fs::metadata(path) else {
                continue;
            };
            let bytes = metadata.len();
            counters.files_scanned += 1;
            counters.bytes_scanned += bytes;

            if let Some(language) = language_for_path(relative) {
                let entry = language_totals.entry(language.to_string()).or_default();
                entry.0 += 1;
                entry.1 += bytes;
            }

            if bytes > self.options.max_file_bytes {
                continue;
            }
            let Ok(raw) = fs::read(path) else {
                continue;
            };
            if is_probably_binary(&raw) {
                continue;
            }
            let Ok(text) = String::from_utf8(raw.clone()) else {
                continue;
            };

            let path_text = relative.to_string_lossy().replace('\\', "/");
            let kind = profile_signal_kind(relative).unwrap_or_else(|| classify_evidence(relative));
            let record = make_record(
                &identity.name,
                &path_text,
                kind,
                &raw,
                &text,
                self.options.max_excerpt_chars,
            );
            if let Some(manifest_type) = manifest_kind(relative) {
                counters.manifests += 1;
                for signal in technology_signals(relative, &text) {
                    technologies.insert((signal.name, signal.source_path, signal.source_kind));
                }
                let mut record = record;
                record
                    .metadata
                    .insert("manifestType".into(), json!(manifest_type));
                manifest_evidence.push(record);
                continue;
            }

            match kind {
                "documentation" => {
                    counters.docs += 1;
                    if doc_evidence.len() < self.options.max_doc_evidence {
                        doc_evidence.push(record);
                    }
                }
                "test" => {
                    counters.tests += 1;
                    if test_evidence.len() < self.options.max_test_evidence {
                        test_evidence.push(record);
                    }
                }
                "tooling" => {
                    counters.tooling_files += 1;
                    if tooling_evidence.len() < self.options.max_tooling_evidence {
                        tooling_evidence.push(record);
                    }
                }
                "observability" | "benchmark" => {
                    if profile_signal_evidence.len() < self.options.max_profile_signal_evidence {
                        profile_signal_evidence.push(record);
                    }
                }
                "source" => {
                    counters.source_files += 1;
                    let language = language_for_path(relative).unwrap_or("Other").to_string();
                    source_representatives
                        .entry(language)
                        .or_insert_with(|| record.clone());
                    if source_overflow.len() < self.options.max_source_evidence {
                        source_overflow.push(record);
                    }
                }
                _ => {}
            }
        }

        let source_evidence = select_diverse_source_evidence(
            source_representatives,
            source_overflow,
            &language_totals,
            self.options.max_source_evidence,
        );
        let mut evidence = manifest_evidence;
        evidence.extend(doc_evidence);
        evidence.extend(test_evidence);
        evidence.extend(tooling_evidence);
        evidence.extend(profile_signal_evidence);
        evidence.extend(source_evidence);
        evidence.sort_by(|a, b| a.kind.cmp(&b.kind).then_with(|| a.path.cmp(&b.path)));
        let languages = language_totals
            .into_iter()
            .map(|(language, (files, bytes))| LanguageStat {
                language,
                files,
                bytes,
            })
            .collect();
        let technologies = technologies
            .into_iter()
            .map(|(name, source_path, source_kind)| TechnologySignal {
                name,
                source_path,
                source_kind,
            })
            .collect();

        let summary = RepositorySummary {
            files_scanned: counters.files_scanned,
            bytes_scanned: counters.bytes_scanned,
            evidence_records: evidence.len() as u64,
            manifests: counters.manifests,
            docs: counters.docs,
            tests: counters.tests,
            tooling_files: counters.tooling_files,
            source_files: counters.source_files,
        };

        Ok(RepoEvidenceBundle::new(
            identity,
            summary,
            languages,
            technologies,
            evidence,
        ))
    }

    pub fn collect_selected_content(
        &self,
        repository: RepositoryIdentity,
        known_path_count: u64,
        files: &[SelectedRepositoryFile],
    ) -> Result<RepoEvidenceBundle, CollectorError> {
        let mut counters = Counters::default();
        let mut language_totals: BTreeMap<String, (u64, u64)> = BTreeMap::new();
        let mut technologies = BTreeSet::<(String, String, String)>::new();
        let mut manifest_evidence = Vec::new();
        let mut doc_evidence = Vec::new();
        let mut test_evidence = Vec::new();
        let mut tooling_evidence = Vec::new();
        let mut profile_signal_evidence = Vec::new();
        let mut source_representatives = BTreeMap::<String, EvidenceRecord>::new();
        let mut source_overflow = Vec::new();

        for file in files {
            let relative = Path::new(&file.path);
            if relative.is_absolute()
                || relative.components().any(|component| {
                    matches!(
                        component,
                        Component::ParentDir | Component::RootDir | Component::Prefix(_)
                    )
                })
                || is_denied_path(relative)
            {
                return Err(CollectorError::InvalidSelectedPath(file.path.clone()));
            }

            let raw = &file.bytes;
            let bytes = raw.len() as u64;
            counters.files_scanned += 1;
            counters.bytes_scanned += bytes;

            if let Some(language) = language_for_path(relative) {
                let entry = language_totals.entry(language.to_string()).or_default();
                entry.0 += 1;
                entry.1 += bytes;
            }

            if bytes > self.options.max_file_bytes || is_probably_binary(raw) {
                continue;
            }
            let Ok(text) = String::from_utf8(raw.clone()) else {
                continue;
            };

            let path_text = relative.to_string_lossy().replace('\\', "/");
            let kind = profile_signal_kind(relative).unwrap_or_else(|| classify_evidence(relative));
            let record = make_record(
                &repository.name,
                &path_text,
                kind,
                raw,
                &text,
                self.options.max_excerpt_chars,
            );
            if let Some(manifest_type) = manifest_kind(relative) {
                counters.manifests += 1;
                for signal in technology_signals(relative, &text) {
                    technologies.insert((signal.name, signal.source_path, signal.source_kind));
                }
                let mut record = record;
                record
                    .metadata
                    .insert("manifestType".into(), json!(manifest_type));
                manifest_evidence.push(record);
                continue;
            }

            match kind {
                "documentation" => {
                    counters.docs += 1;
                    if doc_evidence.len() < self.options.max_doc_evidence {
                        doc_evidence.push(record);
                    }
                }
                "test" => {
                    counters.tests += 1;
                    if test_evidence.len() < self.options.max_test_evidence {
                        test_evidence.push(record);
                    }
                }
                "tooling" => {
                    counters.tooling_files += 1;
                    if tooling_evidence.len() < self.options.max_tooling_evidence {
                        tooling_evidence.push(record);
                    }
                }
                "observability" | "benchmark" => {
                    if profile_signal_evidence.len() < self.options.max_profile_signal_evidence {
                        profile_signal_evidence.push(record);
                    }
                }
                "source" => {
                    counters.source_files += 1;
                    let language = language_for_path(relative).unwrap_or("Other").to_string();
                    source_representatives
                        .entry(language)
                        .or_insert_with(|| record.clone());
                    if source_overflow.len() < self.options.max_source_evidence {
                        source_overflow.push(record);
                    }
                }
                _ => {}
            }
        }

        let source_evidence = select_diverse_source_evidence(
            source_representatives,
            source_overflow,
            &language_totals,
            self.options.max_source_evidence,
        );
        let mut evidence = manifest_evidence;
        evidence.extend(doc_evidence);
        evidence.extend(test_evidence);
        evidence.extend(tooling_evidence);
        evidence.extend(profile_signal_evidence);
        evidence.extend(source_evidence);
        evidence.sort_by(|a, b| a.kind.cmp(&b.kind).then_with(|| a.path.cmp(&b.path)));
        let languages = language_totals
            .into_iter()
            .map(|(language, (files, bytes))| LanguageStat {
                language,
                files,
                bytes,
            })
            .collect();
        let technologies = technologies
            .into_iter()
            .map(|(name, source_path, source_kind)| TechnologySignal {
                name,
                source_path,
                source_kind,
            })
            .collect();
        let summary = RepositorySummary {
            files_scanned: counters.files_scanned,
            bytes_scanned: counters.bytes_scanned,
            evidence_records: evidence.len() as u64,
            manifests: counters.manifests,
            docs: counters.docs,
            tests: counters.tests,
            tooling_files: counters.tooling_files,
            source_files: counters.source_files,
        };
        let coverage = RepositoryEvidenceCoverage::selected_content(known_path_count);

        Ok(RepoEvidenceBundle::with_coverage(
            repository,
            coverage,
            summary,
            languages,
            technologies,
            evidence,
        ))
    }
}

fn select_diverse_source_evidence(
    representatives: BTreeMap<String, EvidenceRecord>,
    overflow: Vec<EvidenceRecord>,
    language_totals: &BTreeMap<String, (u64, u64)>,
    max_source_evidence: usize,
) -> Vec<EvidenceRecord> {
    if max_source_evidence == 0 {
        return Vec::new();
    }

    let mut languages: Vec<_> = representatives.keys().cloned().collect();
    languages.sort_by(|a, b| {
        let a_files = language_totals.get(a).map(|value| value.0).unwrap_or(0);
        let b_files = language_totals.get(b).map(|value| value.0).unwrap_or(0);
        b_files.cmp(&a_files).then_with(|| a.cmp(b))
    });

    let mut selected = Vec::new();
    let mut selected_ids = BTreeSet::new();
    for language in languages.into_iter().take(max_source_evidence) {
        if let Some(record) = representatives.get(&language) {
            selected_ids.insert(record.id.clone());
            selected.push(record.clone());
        }
    }

    for record in overflow {
        if selected.len() >= max_source_evidence {
            break;
        }
        if selected_ids.insert(record.id.clone()) {
            selected.push(record);
        }
    }

    selected
}

pub(crate) fn profile_signal_kind(path: &Path) -> Option<&'static str> {
    let normalized = path
        .to_string_lossy()
        .replace('\\', "/")
        .to_ascii_lowercase();
    let wrapped = format!("/{normalized}/");
    let file_name = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();

    let observability_segment = [
        "observability",
        "telemetry",
        "metrics",
        "tracing",
        "instrumentation",
    ]
    .iter()
    .any(|segment| wrapped.contains(&format!("/{segment}/")));
    let observability_file = matches!(
        file_name.as_str(),
        "prometheus.yml" | "prometheus.yaml" | "grafana.ini"
    ) || file_name.starts_with("otel.")
        || file_name.starts_with("opentelemetry.")
        || ["telemetry", "metrics", "tracing", "instrumentation"]
            .iter()
            .any(|token| {
                file_name == *token
                    || file_name.starts_with(&format!("{token}."))
                    || file_name.starts_with(&format!("{token}_"))
                    || file_name.starts_with(&format!("{token}-"))
                    || file_name.contains(&format!(".{token}."))
                    || file_name.contains(&format!("_{token}_"))
                    || file_name.contains(&format!("-{token}-"))
            });
    if observability_segment || observability_file {
        return Some("observability");
    }

    let benchmark_segment = ["bench", "benches", "benchmark", "benchmarks"]
        .iter()
        .any(|segment| wrapped.contains(&format!("/{segment}/")));
    let benchmark_file = file_name == "criterion.toml"
        || ["bench", "benchmark"].iter().any(|token| {
            file_name == *token
                || file_name.starts_with(&format!("{token}."))
                || file_name.starts_with(&format!("{token}_"))
                || file_name.starts_with(&format!("{token}-"))
                || file_name.contains(&format!(".{token}."))
                || file_name.contains(&format!("_{token}_"))
                || file_name.contains(&format!("-{token}-"))
        });
    if benchmark_segment || benchmark_file {
        return Some("benchmark");
    }

    None
}

pub(crate) fn classify_evidence(path: &Path) -> &'static str {
    if manifest_kind(path).is_some() {
        return "manifest";
    }
    let lower = path.to_string_lossy().to_ascii_lowercase();
    let file_name = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();

    if lower.starts_with(".github/workflows/")
        || lower.contains("/.github/workflows/")
        || lower.starts_with(".circleci/")
        || matches!(
            file_name.as_str(),
            ".gitlab-ci.yml"
                | "jenkinsfile"
                | "dockerfile"
                | "docker-compose.yml"
                | "compose.yml"
                | "makefile"
                | "justfile"
                | "taskfile.yml"
                | "tauri.conf.json"
                | "wrangler.toml"
                | "rustfmt.toml"
                | ".editorconfig"
        )
        || file_name.starts_with("tsconfig.")
        || file_name.starts_with("vite.config.")
        || file_name.starts_with("vitest.config.")
        || file_name.starts_with("playwright.config.")
        || file_name.starts_with("svelte.config.")
    {
        return "tooling";
    }

    if matches!(
        file_name.as_str(),
        "readme.md" | "architecture.md" | "roadmap.md" | "changelog.md" | "agents.md"
    ) || lower.starts_with("docs/")
        || lower.contains("/docs/")
        || matches!(
            path.extension()
                .and_then(|value| value.to_str())
                .map(str::to_ascii_lowercase)
                .as_deref(),
            Some("md" | "mdx" | "rst")
        )
    {
        return "documentation";
    }

    if lower.contains("/test/")
        || lower.contains("/tests/")
        || lower.contains("/__tests__/")
        || file_name.contains(".test.")
        || file_name.contains(".spec.")
        || file_name.starts_with("test_")
        || file_name.ends_with("_test.rs")
        || file_name.ends_with("_test.go")
    {
        return "test";
    }

    if language_for_path(path).is_some() {
        return "source";
    }

    "other"
}

pub(crate) fn language_for_path(path: &Path) -> Option<&'static str> {
    let extension = path.extension()?.to_str()?.to_ascii_lowercase();
    match extension.as_str() {
        "rs" => Some("Rust"),
        "ts" | "tsx" => Some("TypeScript"),
        "js" | "jsx" | "mjs" | "cjs" => Some("JavaScript"),
        "py" => Some("Python"),
        "go" => Some("Go"),
        "java" => Some("Java"),
        "kt" | "kts" => Some("Kotlin"),
        "cs" => Some("C#"),
        "cpp" | "cc" | "cxx" | "hpp" | "hxx" => Some("C++"),
        "c" | "h" => Some("C"),
        "swift" => Some("Swift"),
        "php" => Some("PHP"),
        "rb" => Some("Ruby"),
        "lua" => Some("Lua"),
        "gd" => Some("GDScript"),
        "svelte" => Some("Svelte"),
        "html" | "htm" => Some("HTML"),
        "css" | "scss" | "sass" => Some("CSS"),
        "sql" => Some("SQL"),
        "sh" | "bash" | "zsh" => Some("Shell"),
        "ps1" => Some("PowerShell"),
        _ => None,
    }
}

fn make_record(
    repo_name: &str,
    path: &str,
    kind: &str,
    raw: &[u8],
    text: &str,
    max_excerpt_chars: usize,
) -> EvidenceRecord {
    let source_hash = sha256_hex(raw);
    let (excerpt, redaction_count) = bounded_redacted_excerpt(text, max_excerpt_chars);
    let excerpt_hash = excerpt.as_ref().map(|value| sha256_hex(value.as_bytes()));
    let id_material = format!("{repo_name}\0{path}\0{kind}\0{source_hash}");
    let id = sha256_hex(id_material.as_bytes())[..24].to_string();
    let mut metadata = BTreeMap::new();
    metadata.insert("lineCount".into(), json!(text.lines().count()));
    metadata.insert("redactionCount".into(), json!(redaction_count));
    if let Some(language) = language_for_path(Path::new(path)) {
        metadata.insert("language".into(), json!(language));
    }

    EvidenceRecord {
        id,
        path: path.to_string(),
        kind: kind.to_string(),
        source_hash,
        excerpt_hash,
        excerpt,
        bytes: raw.len() as u64,
        metadata,
    }
}

fn sha256_hex(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}
