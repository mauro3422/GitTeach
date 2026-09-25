use std::collections::{BTreeMap, BTreeSet};

use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::model::{EvidenceRecord, RepoEvidenceBundle};

pub const DEVELOPMENT_TENDENCIES_SCHEMA: &str = "giteach-development-tendencies-v1";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DevelopmentTendency {
    pub key: String,
    pub label: String,
    pub repository_count: usize,
    pub analyzed_repository_count: usize,
    pub prevalence: f64,
    pub repositories: Vec<String>,
    pub evidence_refs: Vec<String>,
    pub evidence_kinds: Vec<String>,
    pub deterministic: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DevelopmentTendencies {
    pub schema: String,
    pub analyzed_repository_count: usize,
    pub minimum_repositories: usize,
    pub tendencies: Vec<DevelopmentTendency>,
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum DevelopmentTendencyError {
    #[error("minimum_repositories must be an integer >= 2")]
    MinimumRepositoriesTooSmall,
}

struct Definition {
    key: &'static str,
    label: &'static str,
}

const DEFINITIONS: &[Definition] = &[
    Definition {
        key: "testing-verification",
        label: "Testing / verification",
    },
    Definition {
        key: "documentation",
        label: "Documentation",
    },
    Definition {
        key: "tooling-configuration",
        label: "Tooling / configuration",
    },
    Definition {
        key: "automation",
        label: "Automation",
    },
    Definition {
        key: "ci-delivery",
        label: "CI / delivery",
    },
    Definition {
        key: "observability-instrumentation",
        label: "Observability / instrumentation",
    },
    Definition {
        key: "experimentation-benchmarking",
        label: "Experimentation / benchmarking",
    },
];

fn normalize_path(value: &str) -> String {
    value
        .replace('\\', "/")
        .strip_prefix("./")
        .unwrap_or(value)
        .to_ascii_lowercase()
}

fn file_name(path: &str) -> &str {
    path.rsplit('/').next().unwrap_or("")
}

fn is_ci_path(path: &str) -> bool {
    let normalized = normalize_path(path);
    let name = file_name(&normalized);
    normalized.starts_with(".github/workflows/")
        || normalized.contains("/.github/workflows/")
        || normalized.starts_with(".circleci/")
        || normalized.contains("/.circleci/")
        || name == ".gitlab-ci.yml"
        || name == "jenkinsfile"
}

fn is_automation_path(path: &str) -> bool {
    let normalized = normalize_path(path);
    let name = file_name(&normalized);
    is_ci_path(&normalized)
        || normalized.starts_with("scripts/")
        || normalized.contains("/scripts/")
        || normalized.starts_with("tools/")
        || normalized.contains("/tools/")
        || matches!(
            name,
            "makefile" | "justfile" | "taskfile.yml" | "taskfile.yaml"
        )
}

fn has_path_segment(path: &str, segments: &[&str]) -> bool {
    let normalized = format!("/{}/", normalize_path(path));
    segments
        .iter()
        .any(|segment| normalized.contains(&format!("/{segment}/")))
}

fn is_observability_path(path: &str) -> bool {
    let normalized = normalize_path(path);
    let name = file_name(&normalized);
    has_path_segment(
        &normalized,
        &[
            "observability",
            "telemetry",
            "metrics",
            "tracing",
            "instrumentation",
        ],
    ) || ["prometheus.yml", "prometheus.yaml", "grafana.ini"].contains(&name)
        || name.starts_with("otel.")
        || name.starts_with("opentelemetry.")
        || ["telemetry", "metrics", "tracing", "instrumentation"]
            .iter()
            .any(|token| {
                name == *token
                    || name.starts_with(&format!("{token}."))
                    || name.starts_with(&format!("{token}_"))
                    || name.starts_with(&format!("{token}-"))
                    || name.contains(&format!(".{token}."))
                    || name.contains(&format!("_{token}_"))
                    || name.contains(&format!("-{token}-"))
            })
}

fn is_benchmark_path(path: &str) -> bool {
    let normalized = normalize_path(path);
    let name = file_name(&normalized);
    has_path_segment(
        &normalized,
        &["bench", "benches", "benchmark", "benchmarks"],
    ) || name == "criterion.toml"
        || ["bench", "benchmark"].iter().any(|token| {
            name == *token
                || name.starts_with(&format!("{token}."))
                || name.starts_with(&format!("{token}_"))
                || name.starts_with(&format!("{token}-"))
                || name.contains(&format!(".{token}."))
                || name.contains(&format!("_{token}_"))
                || name.contains(&format!("-{token}-"))
        })
}

fn matches_definition(key: &str, record: &EvidenceRecord) -> bool {
    match key {
        "testing-verification" => record.kind == "test",
        "documentation" => record.kind == "documentation",
        "tooling-configuration" => record.kind == "tooling",
        "automation" => is_automation_path(&record.path),
        "ci-delivery" => is_ci_path(&record.path),
        "observability-instrumentation" => {
            record.kind == "observability" || is_observability_path(&record.path)
        }
        "experimentation-benchmarking" => {
            record.kind == "benchmark" || is_benchmark_path(&record.path)
        }
        _ => false,
    }
}

fn round_prevalence(value: f64) -> f64 {
    (value * 10_000.0).round() / 10_000.0
}

pub fn analyze_development_tendencies(
    bundles: &[RepoEvidenceBundle],
    minimum_repositories: usize,
) -> Result<DevelopmentTendencies, DevelopmentTendencyError> {
    if minimum_repositories < 2 {
        return Err(DevelopmentTendencyError::MinimumRepositoriesTooSmall);
    }

    let mut repositories: BTreeMap<String, Vec<&EvidenceRecord>> = BTreeMap::new();
    for bundle in bundles {
        let name = bundle.repository.name.trim();
        if name.is_empty() {
            continue;
        }
        repositories
            .entry(name.to_string())
            .or_default()
            .extend(bundle.evidence.iter());
    }

    let analyzed_repository_count = repositories.len();
    let mut tendencies = Vec::new();

    for definition in DEFINITIONS {
        let mut supporting_repositories = Vec::new();
        let mut evidence_refs = Vec::new();
        let mut evidence_ref_seen = BTreeSet::new();
        let mut evidence_kinds = BTreeSet::new();

        for (repository, evidence) in &repositories {
            let matched: Vec<_> = evidence
                .iter()
                .copied()
                .filter(|record| matches_definition(definition.key, record))
                .collect();
            if matched.is_empty() {
                continue;
            }

            supporting_repositories.push(repository.clone());
            if let Some(record) = matched.iter().find(|record| !record.id.is_empty())
                && evidence_ref_seen.insert(record.id.clone())
            {
                evidence_refs.push(record.id.clone());
            }
            for record in matched {
                if !record.kind.is_empty() {
                    evidence_kinds.insert(record.kind.clone());
                }
            }
        }

        if supporting_repositories.len() < minimum_repositories {
            continue;
        }

        let prevalence = if analyzed_repository_count == 0 {
            0.0
        } else {
            round_prevalence(
                supporting_repositories.len() as f64 / analyzed_repository_count as f64,
            )
        };

        tendencies.push(DevelopmentTendency {
            key: definition.key.to_string(),
            label: definition.label.to_string(),
            repository_count: supporting_repositories.len(),
            analyzed_repository_count,
            prevalence,
            repositories: supporting_repositories,
            evidence_refs,
            evidence_kinds: evidence_kinds.into_iter().collect(),
            deterministic: true,
        });
    }

    tendencies.sort_by(|a, b| {
        b.repository_count
            .cmp(&a.repository_count)
            .then_with(|| a.label.cmp(&b.label))
    });

    Ok(DevelopmentTendencies {
        schema: DEVELOPMENT_TENDENCIES_SCHEMA.to_string(),
        analyzed_repository_count,
        minimum_repositories,
        tendencies,
    })
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use serde_json::Value;

    use super::*;
    use crate::model::{RepositoryIdentity, RepositorySummary};

    fn record(id: &str, path: &str, kind: &str) -> EvidenceRecord {
        EvidenceRecord {
            id: id.into(),
            path: path.into(),
            kind: kind.into(),
            source_hash: format!("hash-{id}"),
            excerpt_hash: None,
            excerpt: None,
            bytes: 1,
            metadata: BTreeMap::new(),
        }
    }

    fn bundle(name: &str, evidence: Vec<EvidenceRecord>) -> RepoEvidenceBundle {
        RepoEvidenceBundle::new(
            RepositoryIdentity {
                name: name.into(),
                root: name.into(),
                remote_url: None,
                branch: None,
                head_commit: None,
                head_commit_time: None,
            },
            RepositorySummary {
                files_scanned: evidence.len() as u64,
                bytes_scanned: evidence.len() as u64,
                evidence_records: evidence.len() as u64,
                manifests: 0,
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
            vec![],
            vec![],
            evidence,
        )
    }

    #[test]
    fn requires_repeated_support_across_independent_repositories() {
        let result = analyze_development_tendencies(
            &[
                bundle(
                    "repo-a",
                    vec![
                        record("a1", "tests/a.test.js", "test"),
                        record("a2", "tests/b.test.js", "test"),
                    ],
                ),
                bundle("repo-b", vec![record("b1", "src/main.rs", "source")]),
            ],
            2,
        )
        .unwrap();

        assert_eq!(result.schema, DEVELOPMENT_TENDENCIES_SCHEMA);
        assert_eq!(result.analyzed_repository_count, 2);
        assert!(
            result
                .tendencies
                .iter()
                .all(|item| item.key != "testing-verification")
        );
    }

    #[test]
    fn prevalence_counts_repositories_not_file_volume() {
        let result = analyze_development_tendencies(
            &[
                bundle(
                    "repo-a",
                    vec![
                        record("a1", "tests/a.test.js", "test"),
                        record("a2", "tests/b.test.js", "test"),
                    ],
                ),
                bundle("repo-b", vec![record("b1", "tests/core_test.rs", "test")]),
                bundle("repo-c", vec![record("c1", "src/main.go", "source")]),
            ],
            2,
        )
        .unwrap();

        let tendency = result
            .tendencies
            .iter()
            .find(|item| item.key == "testing-verification")
            .unwrap();
        assert_eq!(tendency.repository_count, 2);
        assert_eq!(tendency.analyzed_repository_count, 3);
        assert_eq!(tendency.prevalence, 0.6667);
        assert_eq!(tendency.repositories, vec!["repo-a", "repo-b"]);
        assert_eq!(tendency.evidence_refs, vec!["a1", "b1"]);
    }

    #[test]
    fn automation_and_ci_are_deterministic_path_observations() {
        let result = analyze_development_tendencies(
            &[
                bundle(
                    "repo-a",
                    vec![
                        record("a-ci", ".github/workflows/ci.yml", "tooling"),
                        record("a-doc", "README.md", "documentation"),
                    ],
                ),
                bundle(
                    "repo-b",
                    vec![
                        record("b-ci", ".circleci/config.yml", "tooling"),
                        record("b-doc", "docs/ARCHITECTURE.md", "documentation"),
                    ],
                ),
                bundle(
                    "repo-c",
                    vec![record("c-script", "scripts/release.mjs", "source")],
                ),
            ],
            2,
        )
        .unwrap();

        let automation = result
            .tendencies
            .iter()
            .find(|item| item.key == "automation")
            .unwrap();
        let ci = result
            .tendencies
            .iter()
            .find(|item| item.key == "ci-delivery")
            .unwrap();
        assert_eq!(automation.repository_count, 3);
        assert_eq!(automation.prevalence, 1.0);
        assert_eq!(ci.repositories, vec!["repo-a", "repo-b"]);
    }

    #[test]
    fn observability_and_benchmarking_are_repeated_profile_signals() {
        let result = analyze_development_tendencies(
            &[
                bundle(
                    "repo-a",
                    vec![
                        record("a-metrics", "src/telemetry/metrics.rs", "observability"),
                        record("a-bench", "benches/throughput.rs", "benchmark"),
                    ],
                ),
                bundle(
                    "repo-b",
                    vec![
                        record("b-otel", "src/instrumentation/otel.ts", "source"),
                        record("b-bench", "benchmarks/render.bench.ts", "source"),
                    ],
                ),
                bundle("repo-c", vec![record("c-source", "src/main.go", "source")]),
            ],
            2,
        )
        .unwrap();

        let observability = result
            .tendencies
            .iter()
            .find(|item| item.key == "observability-instrumentation")
            .unwrap();
        let benchmarking = result
            .tendencies
            .iter()
            .find(|item| item.key == "experimentation-benchmarking")
            .unwrap();
        assert_eq!(observability.repositories, vec!["repo-a", "repo-b"]);
        assert_eq!(benchmarking.repositories, vec!["repo-a", "repo-b"]);
        assert_eq!(observability.prevalence, 0.6667);
        assert_eq!(benchmarking.prevalence, 0.6667);
    }

    #[test]
    fn duplicate_bundles_do_not_inflate_repository_prevalence() {
        let result = analyze_development_tendencies(
            &[
                bundle("repo-a", vec![record("a1", "tests/a.test.js", "test")]),
                bundle("repo-a", vec![record("a2", "tests/b.test.js", "test")]),
                bundle("repo-b", vec![record("b1", "tests/c.test.js", "test")]),
            ],
            2,
        )
        .unwrap();

        let tendency = result
            .tendencies
            .iter()
            .find(|item| item.key == "testing-verification")
            .unwrap();
        assert_eq!(result.analyzed_repository_count, 2);
        assert_eq!(tendency.repository_count, 2);
        assert_eq!(tendency.prevalence, 1.0);
    }

    #[test]
    fn shared_schema_fixture_matches_serialized_rust_contract() {
        let schema: Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/development-tendencies-v1-schema.json"
        ))
        .unwrap();
        let result = analyze_development_tendencies(
            &[
                bundle("repo-a", vec![record("a1", "tests/a.test.js", "test")]),
                bundle("repo-b", vec![record("b1", "tests/b.test.js", "test")]),
            ],
            2,
        )
        .unwrap();
        let value = serde_json::to_value(result).unwrap();
        for field in schema["profileFields"].as_array().unwrap() {
            assert!(value.get(field.as_str().unwrap()).is_some());
        }
        let tendency = &value["tendencies"][0];
        for field in schema["tendencyFields"].as_array().unwrap() {
            assert!(tendency.get(field.as_str().unwrap()).is_some());
        }
    }

    #[test]
    fn minimum_repository_threshold_cannot_drop_below_two() {
        let error = analyze_development_tendencies(&[], 1).unwrap_err();
        assert_eq!(error, DevelopmentTendencyError::MinimumRepositoriesTooSmall);
    }
}
