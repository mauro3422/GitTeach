use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::model::RepoEvidenceBundle;

pub const REPOSITORY_DOMAIN_FINGERPRINT_SCHEMA: &str = "giteach-repository-domain-fingerprint-v1";
const MAX_EVIDENCE_REFS_PER_CANDIDATE: usize = 6;
const MAX_TOPIC_REFS_PER_CANDIDATE: usize = 2;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryDomainCandidate {
    pub key: String,
    pub label: String,
    pub source_kinds: Vec<String>,
    pub evidence_refs: Vec<String>,
    pub source_refs: Vec<String>,
    pub technologies: Vec<String>,
    pub languages: Vec<String>,
    pub topics: Vec<String>,
    pub rule_based: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryDomainFingerprint {
    pub schema: String,
    pub repository: String,
    pub declared_topics: Vec<String>,
    pub candidates: Vec<RepositoryDomainCandidate>,
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum RepositoryDomainFingerprintError {
    #[error("repository is required")]
    MissingRepository,
}

struct Definition {
    key: &'static str,
    label: &'static str,
    technologies: &'static [&'static str],
    languages: &'static [&'static str],
    topics: &'static [&'static str],
}

const DEFINITIONS: &[Definition] = &[
    Definition {
        key: "game-development",
        label: "Game development",
        technologies: &["godot"],
        languages: &["gdscript"],
        topics: &[
            "game",
            "game-development",
            "gamedev",
            "godot",
            "game-engine",
            "modding",
        ],
    },
    Definition {
        key: "web-application",
        label: "Web application",
        technologies: &[
            "svelte",
            "@sveltejs/kit",
            "react",
            "react-dom",
            "next",
            "vue",
            "nuxt",
            "@angular/core",
            "astro",
        ],
        languages: &[],
        topics: &[
            "web",
            "web-app",
            "web-application",
            "frontend",
            "svelte",
            "react",
            "nextjs",
            "vue",
            "angular",
        ],
    },
    Definition {
        key: "desktop-application",
        label: "Desktop application",
        technologies: &["tauri", "@tauri-apps/api", "@tauri-apps/cli", "electron"],
        languages: &[],
        topics: &[
            "desktop",
            "desktop-app",
            "desktop-application",
            "tauri",
            "electron",
        ],
    },
    Definition {
        key: "developer-tooling",
        label: "Developer tooling",
        technologies: &[
            "monaco-editor",
            "vscode",
            "vscode-languageserver",
            "vscode-languageclient",
            "@codingame/monaco-vscode-api",
        ],
        languages: &[],
        topics: &[
            "developer-tools",
            "developer-tooling",
            "devtools",
            "ide",
            "code-editor",
            "language-server",
            "lsp",
            "cli",
            "command-line-tool",
        ],
    },
    Definition {
        key: "ai-model-integration",
        label: "AI / model integration",
        technologies: &[
            "openai",
            "@anthropic-ai/sdk",
            "anthropic",
            "ollama",
            "langchain",
            "llama-index",
            "@google/generative-ai",
        ],
        languages: &[],
        topics: &[
            "ai",
            "artificial-intelligence",
            "llm",
            "large-language-model",
            "generative-ai",
            "openai",
            "ollama",
        ],
    },
    Definition {
        key: "service-api",
        label: "Service / API",
        technologies: &["express", "fastify", "koa", "axum", "actix-web", "rocket"],
        languages: &[],
        topics: &[
            "api",
            "rest-api",
            "backend",
            "server",
            "service",
            "microservice",
        ],
    },
];

fn normalize(value: &str) -> String {
    value.trim().to_ascii_lowercase()
}

fn sorted(values: impl IntoIterator<Item = String>) -> Vec<String> {
    values
        .into_iter()
        .filter(|value| !value.is_empty())
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect()
}

fn technology_evidence_refs(bundle: &RepoEvidenceBundle, technologies: &[String]) -> Vec<String> {
    let wanted: BTreeSet<_> = technologies.iter().cloned().collect();
    let paths: BTreeSet<_> = bundle
        .technologies
        .iter()
        .filter(|technology| wanted.contains(&normalize(&technology.name)))
        .map(|technology| technology.source_path.replace('\\', "/"))
        .collect();

    sorted(
        bundle
            .evidence
            .iter()
            .filter(|record| paths.contains(&record.path.replace('\\', "/")))
            .map(|record| record.id.clone()),
    )
}

fn language_evidence_refs(bundle: &RepoEvidenceBundle, languages: &[String]) -> Vec<String> {
    let wanted: BTreeSet<_> = languages.iter().cloned().collect();
    sorted(bundle.evidence.iter().filter_map(|record| {
        let language = record
            .metadata
            .get("language")
            .and_then(|value| value.as_str())
            .map(normalize)?;
        wanted.contains(&language).then(|| record.id.clone())
    }))
}

pub fn analyze_repository_domain_fingerprint(
    bundle: &RepoEvidenceBundle,
    topics: &[String],
    repository: Option<&str>,
) -> Result<RepositoryDomainFingerprint, RepositoryDomainFingerprintError> {
    let repository = repository
        .unwrap_or(&bundle.repository.name)
        .trim()
        .to_string();
    if repository.is_empty() {
        return Err(RepositoryDomainFingerprintError::MissingRepository);
    }

    let declared_topics = sorted(topics.iter().map(|topic| normalize(topic)));
    let technology_set: BTreeSet<_> = bundle
        .technologies
        .iter()
        .map(|technology| normalize(&technology.name))
        .collect();
    let language_set: BTreeSet<_> = bundle
        .languages
        .iter()
        .map(|language| normalize(&language.language))
        .collect();
    let topic_set: BTreeSet<_> = declared_topics.iter().cloned().collect();
    let mut candidates = Vec::new();

    for definition in DEFINITIONS {
        let matched_technologies = sorted(
            definition
                .technologies
                .iter()
                .map(|value| normalize(value))
                .filter(|value| technology_set.contains(value)),
        );
        let matched_languages = sorted(
            definition
                .languages
                .iter()
                .map(|value| normalize(value))
                .filter(|value| language_set.contains(value)),
        );
        let matched_topics = sorted(
            definition
                .topics
                .iter()
                .map(|value| normalize(value))
                .filter(|value| topic_set.contains(value)),
        );

        if matched_technologies.is_empty()
            && matched_languages.is_empty()
            && matched_topics.is_empty()
        {
            continue;
        }

        let evidence_refs = sorted(
            technology_evidence_refs(bundle, &matched_technologies)
                .into_iter()
                .chain(language_evidence_refs(bundle, &matched_languages)),
        )
        .into_iter()
        .take(MAX_EVIDENCE_REFS_PER_CANDIDATE)
        .collect::<Vec<_>>();
        let topic_refs = matched_topics
            .iter()
            .take(MAX_TOPIC_REFS_PER_CANDIDATE)
            .map(|topic| format!("github-topic:{repository}:{topic}"));
        let source_refs = sorted(evidence_refs.iter().cloned().chain(topic_refs));
        let source_kinds = sorted(
            [
                (!matched_technologies.is_empty()).then_some("technology".to_string()),
                (!matched_languages.is_empty()).then_some("language".to_string()),
                (!matched_topics.is_empty()).then_some("github-topic".to_string()),
            ]
            .into_iter()
            .flatten(),
        );

        candidates.push(RepositoryDomainCandidate {
            key: definition.key.to_string(),
            label: definition.label.to_string(),
            source_kinds,
            evidence_refs,
            source_refs,
            technologies: matched_technologies,
            languages: matched_languages,
            topics: matched_topics,
            rule_based: true,
        });
    }

    candidates.sort_by(|left, right| left.label.cmp(&right.label));
    Ok(RepositoryDomainFingerprint {
        schema: REPOSITORY_DOMAIN_FINGERPRINT_SCHEMA.to_string(),
        repository,
        declared_topics,
        candidates,
    })
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use serde_json::{Value, json};

    use super::*;
    use crate::model::{
        EvidenceRecord, LanguageStat, RepoEvidenceBundle, RepositoryEvidenceCoverage,
        RepositoryIdentity, RepositorySummary, TechnologySignal,
    };

    fn record(id: &str, path: &str, kind: &str, language: Option<&str>) -> EvidenceRecord {
        let mut metadata = BTreeMap::new();
        if let Some(language) = language {
            metadata.insert("language".into(), json!(language));
        }
        EvidenceRecord {
            id: id.into(),
            path: path.into(),
            kind: kind.into(),
            source_hash: "hash".into(),
            excerpt_hash: None,
            excerpt: None,
            bytes: 1,
            metadata,
        }
    }

    fn bundle(
        name: &str,
        languages: &[&str],
        technologies: &[(&str, &str)],
        evidence: Vec<EvidenceRecord>,
    ) -> RepoEvidenceBundle {
        RepoEvidenceBundle {
            schema: "giteach-repo-evidence-v1".into(),
            repository: RepositoryIdentity {
                name: name.into(),
                root: name.into(),
                remote_url: None,
                branch: None,
                head_commit: None,
                head_commit_time: None,
            },
            coverage: RepositoryEvidenceCoverage::complete_inventory(evidence.len() as u64),
            summary: RepositorySummary {
                files_scanned: evidence.len() as u64,
                bytes_scanned: evidence.len() as u64,
                evidence_records: evidence.len() as u64,
                manifests: evidence
                    .iter()
                    .filter(|item| item.kind == "manifest")
                    .count() as u64,
                docs: evidence
                    .iter()
                    .filter(|item| item.kind == "documentation")
                    .count() as u64,
                tests: evidence.iter().filter(|item| item.kind == "test").count() as u64,
                tooling_files: evidence
                    .iter()
                    .filter(|item| item.kind == "tooling")
                    .count() as u64,
                source_files: evidence.iter().filter(|item| item.kind == "source").count() as u64,
            },
            languages: languages
                .iter()
                .map(|language| LanguageStat {
                    language: (*language).into(),
                    files: 1,
                    bytes: 1,
                })
                .collect(),
            technologies: technologies
                .iter()
                .map(|(name, path)| TechnologySignal {
                    name: (*name).into(),
                    source_path: (*path).into(),
                    source_kind: if *path == "Cargo.toml" {
                        "cargo"
                    } else {
                        "npm"
                    }
                    .into(),
                })
                .collect(),
            evidence,
        }
    }

    #[test]
    fn keeps_multiple_explainable_candidates_without_a_winner() {
        let bundle = bundle(
            "kode",
            &["Rust", "TypeScript"],
            &[
                ("tauri", "Cargo.toml"),
                ("monaco-editor", "package.json"),
                ("openai", "package.json"),
            ],
            vec![
                record("cargo-ref", "Cargo.toml", "manifest", None),
                record("npm-ref", "package.json", "manifest", None),
            ],
        );
        let result = analyze_repository_domain_fingerprint(
            &bundle,
            &["developer-tools".into(), "ai".into()],
            Some("mauro/kode"),
        )
        .unwrap();

        assert_eq!(result.schema, REPOSITORY_DOMAIN_FINGERPRINT_SCHEMA);
        assert_eq!(result.declared_topics, vec!["ai", "developer-tools"]);
        let keys: Vec<_> = result
            .candidates
            .iter()
            .map(|item| item.key.as_str())
            .collect();
        assert_eq!(
            keys,
            vec![
                "ai-model-integration",
                "desktop-application",
                "developer-tooling"
            ]
        );
        let tooling = result
            .candidates
            .iter()
            .find(|item| item.key == "developer-tooling")
            .unwrap();
        assert_eq!(tooling.source_kinds, vec!["github-topic", "technology"]);
        assert_eq!(tooling.evidence_refs, vec!["npm-ref"]);
        assert!(
            tooling
                .source_refs
                .contains(&"github-topic:mauro/kode:developer-tools".to_string())
        );
    }

    #[test]
    fn godot_and_gdscript_are_deterministic_game_signals() {
        let bundle = bundle(
            "game",
            &["GDScript"],
            &[("Godot", "project.godot")],
            vec![
                record("godot-manifest", "project.godot", "manifest", None),
                record("gd-source", "player.gd", "source", Some("GDScript")),
            ],
        );
        let result = analyze_repository_domain_fingerprint(&bundle, &[], None).unwrap();
        assert_eq!(result.candidates.len(), 1);
        assert_eq!(result.candidates[0].key, "game-development");
        assert_eq!(
            result.candidates[0].evidence_refs,
            vec!["gd-source", "godot-manifest"]
        );
    }

    #[test]
    fn rust_language_alone_does_not_fabricate_systems_or_tooling() {
        let bundle = bundle(
            "scratch",
            &["Rust"],
            &[],
            vec![record("rust", "src/main.rs", "source", Some("Rust"))],
        );
        let result = analyze_repository_domain_fingerprint(&bundle, &[], None).unwrap();
        assert!(result.candidates.is_empty());
    }

    #[test]
    fn topics_are_declarative_source_refs_not_confidence() {
        let bundle = bundle("service", &[], &[], vec![]);
        let result = analyze_repository_domain_fingerprint(
            &bundle,
            &["REST-API".into(), "backend".into(), "rest-api".into()],
            Some("acme/service"),
        )
        .unwrap();
        assert_eq!(result.declared_topics, vec!["backend", "rest-api"]);
        let service = result
            .candidates
            .iter()
            .find(|candidate| candidate.key == "service-api")
            .unwrap();
        assert_eq!(service.source_kinds, vec!["github-topic"]);
        assert!(service.evidence_refs.is_empty());
        assert_eq!(
            service.source_refs,
            vec![
                "github-topic:acme/service:backend",
                "github-topic:acme/service:rest-api"
            ]
        );
    }

    #[test]
    fn candidate_provenance_stays_bounded_with_many_supporting_files() {
        let evidence = (0..12)
            .map(|index| {
                record(
                    &format!("gd-{index}"),
                    &format!("scripts/file_{index}.gd"),
                    "source",
                    Some("GDScript"),
                )
            })
            .collect();
        let bundle = bundle(
            "game",
            &["GDScript"],
            &[("Godot", "project.godot")],
            evidence,
        );
        let result = analyze_repository_domain_fingerprint(
            &bundle,
            &[
                "godot".into(),
                "gamedev".into(),
                "game".into(),
                "modding".into(),
            ],
            Some("acme/game"),
        )
        .unwrap();
        let candidate = result
            .candidates
            .iter()
            .find(|candidate| candidate.key == "game-development")
            .unwrap();
        assert_eq!(candidate.evidence_refs.len(), 6);
        assert_eq!(candidate.source_refs.len(), 8);
        assert_eq!(
            candidate
                .source_refs
                .iter()
                .filter(|source_ref| source_ref.starts_with("github-topic:"))
                .count(),
            2
        );
    }

    #[test]
    fn serialized_contract_matches_shared_schema_fixture() {
        let schema: Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/repository-domain-fingerprint-v1-schema.json"
        ))
        .unwrap();
        let bundle = bundle("demo", &[], &[], vec![]);
        let result =
            analyze_repository_domain_fingerprint(&bundle, &["game".into()], None).unwrap();
        let value = serde_json::to_value(result).unwrap();
        for field in schema["profileFields"].as_array().unwrap() {
            assert!(value.get(field.as_str().unwrap()).is_some());
        }
        let candidate = &value["candidates"][0];
        for field in schema["candidateFields"].as_array().unwrap() {
            assert!(candidate.get(field.as_str().unwrap()).is_some());
        }
    }
}
