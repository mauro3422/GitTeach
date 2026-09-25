use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::Value;

pub const REPO_EVIDENCE_SCHEMA: &str = "giteach-repo-evidence-v1";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RepositoryIdentity {
    pub name: String,
    pub root: String,
    pub remote_url: Option<String>,
    pub branch: Option<String>,
    pub head_commit: Option<String>,
    pub head_commit_time: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct LanguageStat {
    pub language: String,
    pub files: u64,
    pub bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TechnologySignal {
    pub name: String,
    pub source_path: String,
    pub source_kind: String,
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct EvidenceRecord {
    pub id: String,
    pub path: String,
    pub kind: String,
    pub source_hash: String,
    pub excerpt_hash: Option<String>,
    pub excerpt: Option<String>,
    pub bytes: u64,
    pub metadata: BTreeMap<String, Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RepositorySummary {
    pub files_scanned: u64,
    pub bytes_scanned: u64,
    pub evidence_records: u64,
    pub manifests: u64,
    pub docs: u64,
    pub tests: u64,
    pub tooling_files: u64,
    pub source_files: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum RepositoryInventoryCoverage {
    CompletePolicyFiltered,
    Partial,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum RepositorySummaryScope {
    Inventory,
    SelectedContent,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RepositoryEvidenceCoverage {
    pub inventory: RepositoryInventoryCoverage,
    pub summary_scope: RepositorySummaryScope,
    pub known_path_count: u64,
}

impl Default for RepositoryEvidenceCoverage {
    fn default() -> Self {
        Self {
            inventory: RepositoryInventoryCoverage::Partial,
            summary_scope: RepositorySummaryScope::SelectedContent,
            known_path_count: 0,
        }
    }
}

impl RepositoryEvidenceCoverage {
    pub fn complete_inventory(known_path_count: u64) -> Self {
        Self {
            inventory: RepositoryInventoryCoverage::CompletePolicyFiltered,
            summary_scope: RepositorySummaryScope::Inventory,
            known_path_count,
        }
    }

    pub fn selected_content(known_path_count: u64) -> Self {
        Self {
            inventory: RepositoryInventoryCoverage::CompletePolicyFiltered,
            summary_scope: RepositorySummaryScope::SelectedContent,
            known_path_count,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct RepoEvidenceBundle {
    pub schema: String,
    pub repository: RepositoryIdentity,
    #[serde(default)]
    pub coverage: RepositoryEvidenceCoverage,
    pub summary: RepositorySummary,
    pub languages: Vec<LanguageStat>,
    pub technologies: Vec<TechnologySignal>,
    pub evidence: Vec<EvidenceRecord>,
}

impl RepoEvidenceBundle {
    pub fn new(
        repository: RepositoryIdentity,
        summary: RepositorySummary,
        languages: Vec<LanguageStat>,
        technologies: Vec<TechnologySignal>,
        evidence: Vec<EvidenceRecord>,
    ) -> Self {
        let coverage = RepositoryEvidenceCoverage::complete_inventory(summary.files_scanned);
        Self::with_coverage(
            repository,
            coverage,
            summary,
            languages,
            technologies,
            evidence,
        )
    }

    pub fn with_coverage(
        repository: RepositoryIdentity,
        coverage: RepositoryEvidenceCoverage,
        summary: RepositorySummary,
        languages: Vec<LanguageStat>,
        technologies: Vec<TechnologySignal>,
        evidence: Vec<EvidenceRecord>,
    ) -> Self {
        Self {
            schema: REPO_EVIDENCE_SCHEMA.to_string(),
            repository,
            coverage,
            summary,
            languages,
            technologies,
            evidence,
        }
    }
}
