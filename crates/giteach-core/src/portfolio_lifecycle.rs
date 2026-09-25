use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
#[cfg(test)]
use serde_json::Value;
use thiserror::Error;

use crate::lifecycle::{REPOSITORY_LIFECYCLE_SCHEMA, RepositoryLifecycle};

pub const PORTFOLIO_LIFECYCLE_SCHEMA: &str = "giteach-portfolio-lifecycle-v1";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PortfolioRepositoryLifecycleFact {
    pub repository: String,
    pub commit_count: usize,
    pub active_month_count: usize,
    pub active_year_count: usize,
    pub tag_count: usize,
    pub has_post_tag_commits: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PortfolioLifecycleSummary {
    pub schema: String,
    pub analyzed_repository_count: usize,
    pub repository_with_history_count: usize,
    pub multi_month_history_repository_count: usize,
    pub tagged_repository_count: usize,
    pub post_tag_maintenance_repository_count: usize,
    pub total_reachable_tag_count: usize,
    pub repositories: Vec<PortfolioRepositoryLifecycleFact>,
    pub deterministic: bool,
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum PortfolioLifecycleError {
    #[error("unsupported repository lifecycle schema: {0}")]
    UnsupportedSchema(String),
    #[error("portfolio lifecycle requires named repositories")]
    MissingRepositoryName,
}

pub fn summarize_portfolio_lifecycle(
    lifecycles: &[RepositoryLifecycle],
) -> Result<PortfolioLifecycleSummary, PortfolioLifecycleError> {
    let mut repositories = BTreeMap::new();

    for lifecycle in lifecycles {
        if lifecycle.schema != REPOSITORY_LIFECYCLE_SCHEMA {
            return Err(PortfolioLifecycleError::UnsupportedSchema(
                lifecycle.schema.clone(),
            ));
        }
        let repository = lifecycle.repository.trim();
        if repository.is_empty() {
            return Err(PortfolioLifecycleError::MissingRepositoryName);
        }
        repositories
            .entry(repository.to_string())
            .or_insert(lifecycle);
    }

    let facts = repositories
        .into_iter()
        .map(|(repository, lifecycle)| PortfolioRepositoryLifecycleFact {
            repository,
            commit_count: lifecycle.commit_count,
            active_month_count: lifecycle.active_month_count,
            active_year_count: lifecycle.active_year_count,
            tag_count: lifecycle.tag_count,
            has_post_tag_commits: lifecycle.has_post_tag_commits,
        })
        .collect::<Vec<_>>();

    Ok(PortfolioLifecycleSummary {
        schema: PORTFOLIO_LIFECYCLE_SCHEMA.to_string(),
        analyzed_repository_count: facts.len(),
        repository_with_history_count: facts.iter().filter(|item| item.commit_count > 0).count(),
        multi_month_history_repository_count: facts
            .iter()
            .filter(|item| item.active_month_count >= 2)
            .count(),
        tagged_repository_count: facts.iter().filter(|item| item.tag_count > 0).count(),
        post_tag_maintenance_repository_count: facts
            .iter()
            .filter(|item| item.has_post_tag_commits == Some(true))
            .count(),
        total_reachable_tag_count: facts.iter().map(|item| item.tag_count).sum(),
        repositories: facts,
        deterministic: true,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn lifecycle(
        repository: &str,
        active_months: usize,
        tag_count: usize,
        post_tag: Option<bool>,
    ) -> RepositoryLifecycle {
        RepositoryLifecycle {
            schema: REPOSITORY_LIFECYCLE_SCHEMA.to_string(),
            repository: repository.to_string(),
            source: "git-local".to_string(),
            commit_count: if active_months == 0 { 0 } else { 1 },
            first_commit_at: None,
            latest_commit_at: None,
            active_month_count: active_months,
            active_year_count: if active_months == 0 { 0 } else { 1 },
            tag_count,
            first_tag: None,
            latest_tag: None,
            commits_after_latest_tag: post_tag.map(|value| if value { 1 } else { 0 }),
            has_post_tag_commits: post_tag,
            deterministic: true,
        }
    }

    #[test]
    fn summarizes_portfolio_lifecycle_without_expertise_scoring() {
        let summary = summarize_portfolio_lifecycle(&[
            lifecycle("repo-a", 4, 2, Some(true)),
            lifecycle("repo-b", 2, 1, Some(false)),
            lifecycle("repo-c", 0, 0, None),
        ])
        .unwrap();

        assert_eq!(summary.analyzed_repository_count, 3);
        assert_eq!(summary.repository_with_history_count, 2);
        assert_eq!(summary.multi_month_history_repository_count, 2);
        assert_eq!(summary.tagged_repository_count, 2);
        assert_eq!(summary.post_tag_maintenance_repository_count, 1);
        assert_eq!(summary.total_reachable_tag_count, 3);
    }

    #[test]
    fn duplicate_repository_snapshots_do_not_inflate_counts() {
        let summary = summarize_portfolio_lifecycle(&[
            lifecycle("repo-a", 1, 1, None),
            lifecycle("repo-a", 9, 99, Some(true)),
            lifecycle("repo-b", 1, 0, None),
        ])
        .unwrap();

        assert_eq!(summary.analyzed_repository_count, 2);
        assert_eq!(summary.tagged_repository_count, 1);
        assert_eq!(summary.total_reachable_tag_count, 1);
    }

    #[test]
    fn serialized_summary_matches_shared_schema_fixture() {
        let schema: Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/portfolio-lifecycle-v1-schema.json"
        ))
        .unwrap();
        let summary = summarize_portfolio_lifecycle(&[lifecycle("repo-a", 1, 0, None)]).unwrap();
        let value = serde_json::to_value(summary).unwrap();

        for field in schema["summaryFields"].as_array().unwrap() {
            assert!(value.get(field.as_str().unwrap()).is_some());
        }
        for field in schema["repositoryFields"].as_array().unwrap() {
            assert!(
                value["repositories"][0]
                    .get(field.as_str().unwrap())
                    .is_some()
            );
        }
    }
}
