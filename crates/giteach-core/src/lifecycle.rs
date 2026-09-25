use std::{
    collections::BTreeSet,
    path::Path,
    process::{Command, Output},
};

use serde::{Deserialize, Serialize};
#[cfg(test)]
use serde_json::Value;
use thiserror::Error;

pub const REPOSITORY_LIFECYCLE_SCHEMA: &str = "giteach-repository-lifecycle-v1";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GitCommitFact {
    pub id: String,
    pub committed_at: String,
    #[serde(skip_serializing, skip_deserializing, default)]
    pub committed_unix: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GitTagFact {
    pub name: String,
    pub target: String,
    pub observed_at: String,
    #[serde(skip_serializing, skip_deserializing, default)]
    pub observed_unix: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryLifecycle {
    pub schema: String,
    pub repository: String,
    pub source: String,
    pub commit_count: usize,
    pub first_commit_at: Option<String>,
    pub latest_commit_at: Option<String>,
    pub active_month_count: usize,
    pub active_year_count: usize,
    pub tag_count: usize,
    pub first_tag: Option<GitTagFact>,
    pub latest_tag: Option<GitTagFact>,
    pub commits_after_latest_tag: Option<u64>,
    pub has_post_tag_commits: Option<bool>,
    pub deterministic: bool,
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum RepositoryLifecycleError {
    #[error("repository lifecycle requires a repository name")]
    MissingRepositoryName,
    #[error("path is not a Git work tree: {0}")]
    NotGitRepository(String),
    #[error("git command failed: {0}")]
    GitCommandFailed(String),
    #[error("invalid git lifecycle record: {0}")]
    InvalidGitRecord(String),
}

pub fn analyze_repository_lifecycle(
    repository: &str,
    commits: &[GitCommitFact],
    tags: &[GitTagFact],
    commits_after_latest_tag: Option<u64>,
) -> Result<RepositoryLifecycle, RepositoryLifecycleError> {
    let repository = repository.trim();
    if repository.is_empty() {
        return Err(RepositoryLifecycleError::MissingRepositoryName);
    }

    let mut commits = commits
        .iter()
        .filter(|commit| !commit.id.trim().is_empty() && !commit.committed_at.trim().is_empty())
        .cloned()
        .collect::<Vec<_>>();
    commits.sort_by(|a, b| {
        a.committed_unix
            .cmp(&b.committed_unix)
            .then_with(|| a.id.cmp(&b.id))
    });

    let mut tags = tags
        .iter()
        .filter(|tag| {
            !tag.name.trim().is_empty()
                && !tag.target.trim().is_empty()
                && !tag.observed_at.trim().is_empty()
        })
        .cloned()
        .collect::<Vec<_>>();
    tags.sort_by(|a, b| {
        a.observed_unix
            .cmp(&b.observed_unix)
            .then_with(|| a.name.cmp(&b.name))
    });

    let active_months = commits
        .iter()
        .filter_map(|commit| date_prefix(&commit.committed_at, 7))
        .collect::<BTreeSet<_>>();
    let active_years = commits
        .iter()
        .filter_map(|commit| date_prefix(&commit.committed_at, 4))
        .collect::<BTreeSet<_>>();
    let first_tag = tags.first().cloned();
    let latest_tag = tags.last().cloned();
    let post_tag_commit_count = latest_tag.as_ref().and(commits_after_latest_tag);

    Ok(RepositoryLifecycle {
        schema: REPOSITORY_LIFECYCLE_SCHEMA.to_string(),
        repository: repository.to_string(),
        source: "git-local".to_string(),
        commit_count: commits.len(),
        first_commit_at: commits.first().map(|commit| commit.committed_at.clone()),
        latest_commit_at: commits.last().map(|commit| commit.committed_at.clone()),
        active_month_count: active_months.len(),
        active_year_count: active_years.len(),
        tag_count: tags.len(),
        first_tag,
        latest_tag,
        commits_after_latest_tag: post_tag_commit_count,
        has_post_tag_commits: post_tag_commit_count.map(|count| count > 0),
        deterministic: true,
    })
}

pub fn collect_repository_lifecycle(
    root: &Path,
) -> Result<RepositoryLifecycle, RepositoryLifecycleError> {
    let work_tree = git_output(root, &["rev-parse", "--is-inside-work-tree"])?;
    if work_tree.trim() != "true" {
        return Err(RepositoryLifecycleError::NotGitRepository(
            root.to_string_lossy().to_string(),
        ));
    }

    let repository = root
        .file_name()
        .and_then(|value| value.to_str())
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("repository");

    let has_head = git_try_output(root, &["rev-parse", "--verify", "HEAD"])?
        .is_some_and(|value| !value.trim().is_empty());
    let commits = if has_head {
        parse_commits(&git_output(root, &["log", "--format=%H%x09%ct%x09%cI"])?)?
    } else {
        Vec::new()
    };
    let tags = if has_head {
        parse_tags(&git_output(
            root,
            &[
                "for-each-ref",
                "--merged=HEAD",
                "--format=%(refname:short)%09%(creatordate:unix)%09%(creatordate:iso-strict)%09%(*objectname)%09%(objectname)",
                "refs/tags",
            ],
        )?)?
    } else {
        Vec::new()
    };

    let latest_tag_name = tags
        .iter()
        .max_by(|a, b| {
            a.observed_unix
                .cmp(&b.observed_unix)
                .then_with(|| a.name.cmp(&b.name))
        })
        .map(|tag| tag.name.clone());
    let commits_after_latest_tag = if has_head {
        match latest_tag_name {
            Some(tag) => Some(parse_count(&git_output(
                root,
                &["rev-list", "--count", &format!("{tag}..HEAD")],
            )?)?),
            None => None,
        }
    } else {
        None
    };

    analyze_repository_lifecycle(repository, &commits, &tags, commits_after_latest_tag)
}

fn date_prefix(value: &str, length: usize) -> Option<String> {
    let prefix = value.get(..length)?;
    if prefix
        .chars()
        .all(|character| character.is_ascii_digit() || character == '-')
    {
        Some(prefix.to_string())
    } else {
        None
    }
}

fn parse_commits(output: &str) -> Result<Vec<GitCommitFact>, RepositoryLifecycleError> {
    output
        .lines()
        .filter(|line| !line.trim().is_empty())
        .map(|line| {
            let mut parts = line.splitn(3, '\t');
            let id = parts.next().unwrap_or("").trim();
            let unix = parts.next().unwrap_or("").trim();
            let committed_at = parts.next().unwrap_or("").trim();
            if id.is_empty() || committed_at.is_empty() {
                return Err(RepositoryLifecycleError::InvalidGitRecord(
                    "commit record is missing id or timestamp".to_string(),
                ));
            }
            let committed_unix = unix.parse::<i64>().map_err(|_| {
                RepositoryLifecycleError::InvalidGitRecord(format!(
                    "commit {id} has invalid unix timestamp"
                ))
            })?;
            Ok(GitCommitFact {
                id: id.to_string(),
                committed_at: committed_at.to_string(),
                committed_unix,
            })
        })
        .collect()
}

fn parse_tags(output: &str) -> Result<Vec<GitTagFact>, RepositoryLifecycleError> {
    output
        .lines()
        .filter(|line| !line.trim().is_empty())
        .map(|line| {
            let parts = line.split('\t').collect::<Vec<_>>();
            if parts.len() < 5 {
                return Err(RepositoryLifecycleError::InvalidGitRecord(
                    "tag record has unexpected field count".to_string(),
                ));
            }
            let name = parts[0].trim();
            let unix = parts[1].trim();
            let observed_at = parts[2].trim();
            let peeled_target = parts[3].trim();
            let object_target = parts[4].trim();
            let target = if peeled_target.is_empty() {
                object_target
            } else {
                peeled_target
            };
            if name.is_empty() || target.is_empty() || observed_at.is_empty() {
                return Err(RepositoryLifecycleError::InvalidGitRecord(
                    "tag record is missing name, target or timestamp".to_string(),
                ));
            }
            let observed_unix = unix.parse::<i64>().map_err(|_| {
                RepositoryLifecycleError::InvalidGitRecord(format!(
                    "tag {name} has invalid unix timestamp"
                ))
            })?;
            Ok(GitTagFact {
                name: name.to_string(),
                target: target.to_string(),
                observed_at: observed_at.to_string(),
                observed_unix,
            })
        })
        .collect()
}

fn parse_count(value: &str) -> Result<u64, RepositoryLifecycleError> {
    value.trim().parse::<u64>().map_err(|_| {
        RepositoryLifecycleError::InvalidGitRecord(format!(
            "expected integer count, received {value:?}"
        ))
    })
}

fn git_output(root: &Path, args: &[&str]) -> Result<String, RepositoryLifecycleError> {
    let output = run_git(root, args)?;
    if !output.status.success() {
        return Err(RepositoryLifecycleError::GitCommandFailed(format!(
            "git {}",
            args.join(" ")
        )));
    }
    String::from_utf8(output.stdout).map_err(|_| {
        RepositoryLifecycleError::InvalidGitRecord("git returned non-UTF-8 output".to_string())
    })
}

fn git_try_output(root: &Path, args: &[&str]) -> Result<Option<String>, RepositoryLifecycleError> {
    let output = run_git(root, args)?;
    if !output.status.success() {
        return Ok(None);
    }
    String::from_utf8(output.stdout).map(Some).map_err(|_| {
        RepositoryLifecycleError::InvalidGitRecord("git returned non-UTF-8 output".to_string())
    })
}

fn run_git(root: &Path, args: &[&str]) -> Result<Output, RepositoryLifecycleError> {
    Command::new("git")
        .arg("-C")
        .arg(root)
        .args(args)
        .output()
        .map_err(|_| RepositoryLifecycleError::GitCommandFailed(format!("git {}", args.join(" "))))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn commit(id: &str, unix: i64, committed_at: &str) -> GitCommitFact {
        GitCommitFact {
            id: id.to_string(),
            committed_at: committed_at.to_string(),
            committed_unix: unix,
        }
    }

    fn tag(name: &str, target: &str, unix: i64, observed_at: &str) -> GitTagFact {
        GitTagFact {
            name: name.to_string(),
            target: target.to_string(),
            observed_at: observed_at.to_string(),
            observed_unix: unix,
        }
    }

    #[test]
    fn counts_active_months_without_turning_commit_volume_into_quality() {
        let lifecycle = analyze_repository_lifecycle(
            "demo",
            &[
                commit("a", 1, "2026-01-02T10:00:00+00:00"),
                commit("b", 2, "2026-01-20T10:00:00+00:00"),
                commit("c", 3, "2026-03-05T10:00:00+00:00"),
            ],
            &[],
            None,
        )
        .unwrap();

        assert_eq!(lifecycle.commit_count, 3);
        assert_eq!(lifecycle.active_month_count, 2);
        assert_eq!(lifecycle.active_year_count, 1);
        assert_eq!(
            lifecycle.first_commit_at.as_deref(),
            Some("2026-01-02T10:00:00+00:00")
        );
        assert_eq!(
            lifecycle.latest_commit_at.as_deref(),
            Some("2026-03-05T10:00:00+00:00")
        );
    }

    #[test]
    fn keeps_git_tags_distinct_from_github_releases() {
        let lifecycle = analyze_repository_lifecycle(
            "demo",
            &[commit("a", 1, "2026-01-01T00:00:00+00:00")],
            &[
                tag("v1.0.0", "a", 10, "2026-02-01T00:00:00+00:00"),
                tag("v1.1.0", "b", 20, "2026-03-01T00:00:00+00:00"),
            ],
            Some(4),
        )
        .unwrap();

        assert_eq!(lifecycle.tag_count, 2);
        assert_eq!(
            lifecycle.first_tag.as_ref().map(|tag| tag.name.as_str()),
            Some("v1.0.0")
        );
        assert_eq!(
            lifecycle.latest_tag.as_ref().map(|tag| tag.name.as_str()),
            Some("v1.1.0")
        );
        assert_eq!(lifecycle.commits_after_latest_tag, Some(4));
        assert_eq!(lifecycle.has_post_tag_commits, Some(true));
    }

    #[test]
    fn ignores_post_tag_count_when_no_tag_exists() {
        let lifecycle = analyze_repository_lifecycle(
            "demo",
            &[commit("a", 1, "2026-01-01T00:00:00+00:00")],
            &[],
            Some(9),
        )
        .unwrap();

        assert_eq!(lifecycle.commits_after_latest_tag, None);
        assert_eq!(lifecycle.has_post_tag_commits, None);
    }

    #[test]
    fn shared_schema_fixture_matches_serialized_rust_contract() {
        let schema: Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/repository-lifecycle-v1-schema.json"
        ))
        .unwrap();
        let lifecycle = analyze_repository_lifecycle("demo", &[], &[], None).unwrap();
        let value = serde_json::to_value(lifecycle).unwrap();

        for field in schema["lifecycleFields"].as_array().unwrap() {
            assert!(value.get(field.as_str().unwrap()).is_some());
        }
    }

    #[test]
    fn rejects_empty_repository_name() {
        let error = analyze_repository_lifecycle(" ", &[], &[], None).unwrap_err();
        assert_eq!(error, RepositoryLifecycleError::MissingRepositoryName);
    }
}
