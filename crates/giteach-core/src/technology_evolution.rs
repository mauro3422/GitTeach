use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::process::Command;

use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::collector::language_for_path;

pub const TECHNOLOGY_EVOLUTION_SCHEMA: &str = "giteach-technology-evolution-v1";
const SAMPLING_STRATEGY: &str = "evenly-spaced-commits-v1";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TechnologyEvolutionOptions {
    pub max_snapshots: usize,
}

impl Default for TechnologyEvolutionOptions {
    fn default() -> Self {
        Self { max_snapshots: 12 }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TechnologyEvolutionLanguage {
    pub language: String,
    pub files: u64,
    pub bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TechnologyEvolutionSnapshot {
    pub commit: String,
    pub committed_at: String,
    pub source_file_count: u64,
    pub languages: Vec<TechnologyEvolutionLanguage>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TechnologyEvolutionSampling {
    pub strategy: String,
    pub max_snapshots: usize,
    pub complete_history: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TechnologyEvolution {
    pub schema: String,
    pub repository: String,
    pub source: String,
    pub head_commit: Option<String>,
    pub commit_count: usize,
    pub snapshot_count: usize,
    pub sampling: TechnologyEvolutionSampling,
    pub snapshots: Vec<TechnologyEvolutionSnapshot>,
    pub deterministic: bool,
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum TechnologyEvolutionError {
    #[error("technology evolution max_snapshots must be at least 2")]
    InvalidSnapshotBudget,
    #[error("repository has no readable Git history")]
    GitHistoryUnavailable,
    #[error("Git command failed while reading {0}")]
    GitCommandFailed(&'static str),
    #[error("Git history contains malformed commit metadata")]
    MalformedCommitMetadata,
    #[error("Git tree contains malformed entries")]
    MalformedTreeEntry,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct CommitMetadata {
    commit: String,
    committed_at: String,
}

pub fn collect_technology_evolution(
    root: &Path,
    options: TechnologyEvolutionOptions,
) -> Result<TechnologyEvolution, TechnologyEvolutionError> {
    if options.max_snapshots < 2 {
        return Err(TechnologyEvolutionError::InvalidSnapshotBudget);
    }
    let commits = collect_commits(root)?;
    if commits.is_empty() {
        return Err(TechnologyEvolutionError::GitHistoryUnavailable);
    }
    let selected_indices = select_snapshot_indices(commits.len(), options.max_snapshots);
    let mut snapshots = Vec::with_capacity(selected_indices.len());
    for index in selected_indices {
        let metadata = &commits[index];
        snapshots.push(snapshot_for_commit(root, metadata)?);
    }

    let repository = root
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("repository")
        .to_string();
    let head_commit = commits.last().map(|item| item.commit.clone());

    Ok(TechnologyEvolution {
        schema: TECHNOLOGY_EVOLUTION_SCHEMA.to_string(),
        repository,
        source: "git-local-tree".to_string(),
        head_commit,
        commit_count: commits.len(),
        snapshot_count: snapshots.len(),
        sampling: TechnologyEvolutionSampling {
            strategy: SAMPLING_STRATEGY.to_string(),
            max_snapshots: options.max_snapshots,
            complete_history: snapshots.len() == commits.len(),
        },
        snapshots,
        deterministic: true,
    })
}

fn collect_commits(root: &Path) -> Result<Vec<CommitMetadata>, TechnologyEvolutionError> {
    let output = git_output(
        root,
        &["log", "--reverse", "--format=%H%x09%cI", "HEAD"],
        "commit history",
    )?;
    let text =
        String::from_utf8(output).map_err(|_| TechnologyEvolutionError::MalformedCommitMetadata)?;
    text.lines()
        .filter(|line| !line.trim().is_empty())
        .map(|line| {
            let (commit, committed_at) = line
                .split_once('\t')
                .ok_or(TechnologyEvolutionError::MalformedCommitMetadata)?;
            if commit.trim().is_empty() || committed_at.trim().is_empty() {
                return Err(TechnologyEvolutionError::MalformedCommitMetadata);
            }
            Ok(CommitMetadata {
                commit: commit.trim().to_string(),
                committed_at: committed_at.trim().to_string(),
            })
        })
        .collect()
}

fn select_snapshot_indices(commit_count: usize, max_snapshots: usize) -> Vec<usize> {
    if commit_count <= max_snapshots {
        return (0..commit_count).collect();
    }
    let denominator = max_snapshots - 1;
    (0..max_snapshots)
        .map(|slot| slot * (commit_count - 1) / denominator)
        .collect()
}

fn snapshot_for_commit(
    root: &Path,
    metadata: &CommitMetadata,
) -> Result<TechnologyEvolutionSnapshot, TechnologyEvolutionError> {
    let output = git_output(
        root,
        &["ls-tree", "-r", "-l", "-z", "--full-tree", &metadata.commit],
        "commit tree",
    )?;
    let mut by_language: BTreeMap<String, (u64, u64)> = BTreeMap::new();

    for raw_record in output
        .split(|byte| *byte == 0)
        .filter(|record| !record.is_empty())
    {
        let record = String::from_utf8(raw_record.to_vec())
            .map_err(|_| TechnologyEvolutionError::MalformedTreeEntry)?;
        let (meta, path) = record
            .split_once('\t')
            .ok_or(TechnologyEvolutionError::MalformedTreeEntry)?;
        let parts = meta.split_whitespace().collect::<Vec<_>>();
        if parts.len() < 4 || parts[1] != "blob" {
            continue;
        }
        let Ok(bytes) = parts[3].parse::<u64>() else {
            continue;
        };
        let Some(language) = language_for_path(&PathBuf::from(path)) else {
            continue;
        };
        let entry = by_language.entry(language.to_string()).or_insert((0, 0));
        entry.0 += 1;
        entry.1 += bytes;
    }

    let languages = by_language
        .into_iter()
        .map(|(language, (files, bytes))| TechnologyEvolutionLanguage {
            language,
            files,
            bytes,
        })
        .collect::<Vec<_>>();
    let source_file_count = languages.iter().map(|item| item.files).sum();

    Ok(TechnologyEvolutionSnapshot {
        commit: metadata.commit.clone(),
        committed_at: metadata.committed_at.clone(),
        source_file_count,
        languages,
    })
}

fn git_output(
    root: &Path,
    args: &[&str],
    operation: &'static str,
) -> Result<Vec<u8>, TechnologyEvolutionError> {
    let output = Command::new("git")
        .arg("-C")
        .arg(root)
        .args(args)
        .output()
        .map_err(|_| TechnologyEvolutionError::GitCommandFailed(operation))?;
    if !output.status.success() {
        return Err(TechnologyEvolutionError::GitCommandFailed(operation));
    }
    Ok(output.stdout)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn snapshot_sampling_is_deterministic_and_keeps_first_and_last_commit() {
        assert_eq!(select_snapshot_indices(3, 12), vec![0, 1, 2]);
        assert_eq!(select_snapshot_indices(20, 4), vec![0, 6, 12, 19]);
    }

    #[test]
    fn snapshot_budget_below_two_is_rejected() {
        let result = collect_technology_evolution(
            Path::new("."),
            TechnologyEvolutionOptions { max_snapshots: 1 },
        );
        assert_eq!(
            result.unwrap_err(),
            TechnologyEvolutionError::InvalidSnapshotBudget
        );
    }

    #[test]
    fn serialized_contract_matches_shared_schema_fixture() {
        let schema: serde_json::Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/technology-evolution-v1-schema.json"
        ))
        .unwrap();
        let value = serde_json::to_value(TechnologyEvolution {
            schema: TECHNOLOGY_EVOLUTION_SCHEMA.to_string(),
            repository: "kode".into(),
            source: "git-local-tree".into(),
            head_commit: Some("bbbb".into()),
            commit_count: 2,
            snapshot_count: 2,
            sampling: TechnologyEvolutionSampling {
                strategy: SAMPLING_STRATEGY.into(),
                max_snapshots: 12,
                complete_history: true,
            },
            snapshots: vec![TechnologyEvolutionSnapshot {
                commit: "aaaa".into(),
                committed_at: "2026-01-01T00:00:00Z".into(),
                source_file_count: 1,
                languages: vec![TechnologyEvolutionLanguage {
                    language: "Rust".into(),
                    files: 1,
                    bytes: 10,
                }],
            }],
            deterministic: true,
        })
        .unwrap();
        for field in schema["fields"].as_array().unwrap() {
            assert!(value.get(field.as_str().unwrap()).is_some());
        }
        for field in schema["samplingFields"].as_array().unwrap() {
            assert!(value["sampling"].get(field.as_str().unwrap()).is_some());
        }
        for field in schema["snapshotFields"].as_array().unwrap() {
            assert!(value["snapshots"][0].get(field.as_str().unwrap()).is_some());
        }
        for field in schema["languageFields"].as_array().unwrap() {
            assert!(
                value["snapshots"][0]["languages"][0]
                    .get(field.as_str().unwrap())
                    .is_some()
            );
        }
    }
}
