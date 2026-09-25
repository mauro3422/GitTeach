use std::collections::{BTreeMap, BTreeSet};

use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::{
    REPO_EVIDENCE_SCHEMA, RepoEvidenceBundle, RepositoryInventoryCoverage, RepositorySummaryScope,
};

pub const TECHNOLOGY_FOOTPRINT_SCHEMA: &str = "giteach-technology-footprint-v1";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LanguageFootprintMetric {
    pub key: String,
    pub label: String,
    pub repository_count: usize,
    pub analyzed_repository_count: usize,
    pub repository_prevalence: f64,
    pub observed_file_count: u64,
    pub observed_file_unit: String,
    pub observed_byte_count: u64,
    pub observed_byte_unit: String,
    pub repositories: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TechnologyFootprintMetric {
    pub key: String,
    pub label: String,
    pub repository_count: usize,
    pub analyzed_repository_count: usize,
    pub repository_prevalence: f64,
    pub repositories: Vec<String>,
    pub source_refs: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TechnologyFootprintCoverage {
    pub complete_inventory_repository_count: usize,
    pub partial_inventory_repository_count: usize,
    pub inventory_summary_repository_count: usize,
    pub selected_content_summary_repository_count: usize,
    pub known_path_count: u64,
    pub summarized_path_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TechnologyFootprint {
    pub schema: String,
    pub analyzed_repository_count: usize,
    #[serde(default)]
    pub coverage: TechnologyFootprintCoverage,
    pub languages: Vec<LanguageFootprintMetric>,
    pub technologies: Vec<TechnologyFootprintMetric>,
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum TechnologyFootprintError {
    #[error("unsupported repository evidence schema: {0}")]
    UnsupportedSchema(String),
    #[error("repository evidence bundle requires repository.name")]
    MissingRepository,
}

fn key(value: &str) -> String {
    value.trim().to_lowercase()
}

fn round_prevalence(value: f64) -> f64 {
    (value * 10_000.0).round() / 10_000.0
}

pub fn analyze_technology_footprint(
    bundles: &[RepoEvidenceBundle],
) -> Result<TechnologyFootprint, TechnologyFootprintError> {
    let mut by_repository: BTreeMap<String, &RepoEvidenceBundle> = BTreeMap::new();
    for bundle in bundles {
        if bundle.schema != REPO_EVIDENCE_SCHEMA {
            return Err(TechnologyFootprintError::UnsupportedSchema(
                bundle.schema.clone(),
            ));
        }
        let repository = bundle.repository.name.trim();
        if repository.is_empty() {
            return Err(TechnologyFootprintError::MissingRepository);
        }
        by_repository
            .entry(repository.to_string())
            .or_insert(bundle);
    }

    let analyzed_repository_count = by_repository.len();
    let mut coverage = TechnologyFootprintCoverage::default();
    for bundle in by_repository.values() {
        match bundle.coverage.inventory {
            RepositoryInventoryCoverage::CompletePolicyFiltered => {
                coverage.complete_inventory_repository_count += 1;
            }
            RepositoryInventoryCoverage::Partial => {
                coverage.partial_inventory_repository_count += 1;
            }
        }
        match bundle.coverage.summary_scope {
            RepositorySummaryScope::Inventory => {
                coverage.inventory_summary_repository_count += 1;
            }
            RepositorySummaryScope::SelectedContent => {
                coverage.selected_content_summary_repository_count += 1;
            }
        }
        coverage.known_path_count += bundle.coverage.known_path_count;
        coverage.summarized_path_count += bundle.summary.files_scanned;
    }
    let mut languages: BTreeMap<String, (String, BTreeSet<String>, u64, u64)> = BTreeMap::new();
    let mut technologies: BTreeMap<String, (String, BTreeSet<String>, BTreeSet<String>)> =
        BTreeMap::new();

    for (repository, bundle) in &by_repository {
        for language in &bundle.languages {
            let normalized = key(&language.language);
            if normalized.is_empty() {
                continue;
            }
            let entry = languages
                .entry(normalized)
                .or_insert_with(|| (language.language.trim().to_string(), BTreeSet::new(), 0, 0));
            entry.1.insert(repository.clone());
            entry.2 += language.files;
            entry.3 += language.bytes;
        }

        for technology in &bundle.technologies {
            let normalized = key(&technology.name);
            if normalized.is_empty() {
                continue;
            }
            let entry = technologies.entry(normalized).or_insert_with(|| {
                (
                    technology.name.trim().to_string(),
                    BTreeSet::new(),
                    BTreeSet::new(),
                )
            });
            entry.1.insert(repository.clone());
            if let Some(record) = bundle
                .evidence
                .iter()
                .find(|record| record.path == technology.source_path)
            {
                entry.2.insert(record.id.clone());
            } else if !technology.source_path.trim().is_empty() {
                entry
                    .2
                    .insert(format!("{}:{}", repository, technology.source_path.trim()));
            }
        }
    }

    let mut language_metrics = languages
        .into_iter()
        .map(|(key, (label, repositories, files, bytes))| {
            let repositories = repositories.into_iter().collect::<Vec<_>>();
            LanguageFootprintMetric {
                key,
                label,
                repository_count: repositories.len(),
                analyzed_repository_count,
                repository_prevalence: if analyzed_repository_count == 0 {
                    0.0
                } else {
                    round_prevalence(repositories.len() as f64 / analyzed_repository_count as f64)
                },
                observed_file_count: files,
                observed_file_unit: "files".into(),
                observed_byte_count: bytes,
                observed_byte_unit: "bytes".into(),
                repositories,
            }
        })
        .collect::<Vec<_>>();
    language_metrics.sort_by(|a, b| {
        b.repository_count
            .cmp(&a.repository_count)
            .then_with(|| b.observed_file_count.cmp(&a.observed_file_count))
            .then_with(|| a.label.cmp(&b.label))
    });

    let mut technology_metrics = technologies
        .into_iter()
        .map(|(key, (label, repositories, source_refs))| {
            let repositories = repositories.into_iter().collect::<Vec<_>>();
            TechnologyFootprintMetric {
                key,
                label,
                repository_count: repositories.len(),
                analyzed_repository_count,
                repository_prevalence: if analyzed_repository_count == 0 {
                    0.0
                } else {
                    round_prevalence(repositories.len() as f64 / analyzed_repository_count as f64)
                },
                repositories,
                source_refs: source_refs.into_iter().collect(),
            }
        })
        .collect::<Vec<_>>();
    technology_metrics.sort_by(|a, b| {
        b.repository_count
            .cmp(&a.repository_count)
            .then_with(|| a.label.cmp(&b.label))
    });

    Ok(TechnologyFootprint {
        schema: TECHNOLOGY_FOOTPRINT_SCHEMA.into(),
        analyzed_repository_count,
        coverage,
        languages: language_metrics,
        technologies: technology_metrics,
    })
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use serde_json::json;

    use crate::{
        EvidenceRecord, LanguageStat, RepositoryEvidenceCoverage, RepositoryIdentity,
        RepositorySummary, TechnologySignal,
    };

    use super::*;

    fn bundle(name: &str, rust_files: u64) -> RepoEvidenceBundle {
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
                files_scanned: rust_files,
                bytes_scanned: rust_files * 100,
                evidence_records: 1,
                manifests: 1,
                docs: 0,
                tests: 0,
                tooling_files: 0,
                source_files: rust_files,
            },
            vec![LanguageStat {
                language: "Rust".into(),
                files: rust_files,
                bytes: rust_files * 100,
            }],
            vec![TechnologySignal {
                name: "Tauri".into(),
                source_path: "Cargo.toml".into(),
                source_kind: "manifest".into(),
            }],
            vec![EvidenceRecord {
                id: format!("ev-{name}"),
                path: "Cargo.toml".into(),
                kind: "manifest".into(),
                source_hash: "hash".into(),
                excerpt_hash: None,
                excerpt: None,
                bytes: 10,
                metadata: BTreeMap::from([("kind".into(), json!("manifest"))]),
            }],
        )
    }

    #[test]
    fn separates_repository_prevalence_from_observed_volume() {
        let footprint = analyze_technology_footprint(&[bundle("a", 10), bundle("b", 5)]).unwrap();
        assert_eq!(footprint.coverage.complete_inventory_repository_count, 2);
        assert_eq!(footprint.coverage.partial_inventory_repository_count, 0);
        assert_eq!(footprint.coverage.inventory_summary_repository_count, 2);
        assert_eq!(
            footprint.coverage.selected_content_summary_repository_count,
            0
        );
        assert_eq!(footprint.coverage.known_path_count, 15);
        assert_eq!(footprint.coverage.summarized_path_count, 15);
        let rust = &footprint.languages[0];
        assert_eq!(rust.repository_count, 2);
        assert_eq!(rust.repository_prevalence, 1.0);
        assert_eq!(rust.observed_file_count, 15);
        assert_eq!(rust.observed_file_unit, "files");
        assert_eq!(rust.observed_byte_count, 1500);
        assert_eq!(footprint.technologies[0].source_refs, vec!["ev-a", "ev-b"]);
    }

    #[test]
    fn duplicate_repository_bundle_does_not_inflate_counts() {
        let sample = bundle("a", 10);
        let footprint = analyze_technology_footprint(&[sample.clone(), sample]).unwrap();
        assert_eq!(footprint.analyzed_repository_count, 1);
        assert_eq!(footprint.languages[0].observed_file_count, 10);
        assert_eq!(footprint.technologies[0].repository_count, 1);
    }

    #[test]
    fn preserves_selected_content_coverage_in_aggregate() {
        let mut remote = bundle("remote", 2);
        remote.coverage = RepositoryEvidenceCoverage::selected_content(10);
        let footprint = analyze_technology_footprint(&[remote]).unwrap();

        assert_eq!(footprint.coverage.complete_inventory_repository_count, 1);
        assert_eq!(footprint.coverage.partial_inventory_repository_count, 0);
        assert_eq!(footprint.coverage.inventory_summary_repository_count, 0);
        assert_eq!(
            footprint.coverage.selected_content_summary_repository_count,
            1
        );
        assert_eq!(footprint.coverage.known_path_count, 10);
        assert_eq!(footprint.coverage.summarized_path_count, 2);
    }

    #[test]
    fn serialized_footprint_matches_shared_schema_fixture() {
        let footprint = analyze_technology_footprint(&[bundle("a", 1)]).unwrap();
        let schema: serde_json::Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/technology-footprint-v1-schema.json"
        ))
        .unwrap();
        let value = serde_json::to_value(footprint).unwrap();
        for field in schema["fields"].as_array().unwrap() {
            assert!(
                value.get(field.as_str().unwrap()).is_some(),
                "missing root field {field}"
            );
        }
        for field in schema["coverageFields"].as_array().unwrap() {
            assert!(
                value["coverage"].get(field.as_str().unwrap()).is_some(),
                "missing coverage field {field}"
            );
        }
        for field in schema["languageFields"].as_array().unwrap() {
            assert!(
                value["languages"][0].get(field.as_str().unwrap()).is_some(),
                "missing language field {field}"
            );
        }
        for field in schema["technologyFields"].as_array().unwrap() {
            assert!(
                value["technologies"][0]
                    .get(field.as_str().unwrap())
                    .is_some(),
                "missing technology field {field}"
            );
        }
    }
}
