use std::collections::{BTreeMap, BTreeSet};

use serde::{Deserialize, Serialize};
use serde_json::Value;
use thiserror::Error;

pub const GITHUB_REPOSITORY_FACTS_SCHEMA: &str = "giteach-github-repository-facts-v1";

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum GitHubFactKind {
    Release,
    PullRequest,
    Review,
    Issue,
}

impl GitHubFactKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Release => "release",
            Self::PullRequest => "pull-request",
            Self::Review => "review",
            Self::Issue => "issue",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GitHubRepositoryRef {
    pub owner: String,
    pub name: String,
    pub full_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct GitHubFactInput {
    pub kind: GitHubFactKind,
    pub source_id: String,
    pub number: Option<u64>,
    pub tag_name: Option<String>,
    pub state: Option<String>,
    pub actor_login: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub closed_at: Option<String>,
    pub merged_at: Option<String>,
    pub published_at: Option<String>,
    pub draft: Option<bool>,
    pub prerelease: Option<bool>,
    pub source_ref: Option<String>,
    #[serde(default)]
    pub metadata: BTreeMap<String, Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct GitHubFact {
    pub fact_ref: String,
    pub kind: GitHubFactKind,
    pub source_id: String,
    pub number: Option<u64>,
    pub tag_name: Option<String>,
    pub state: Option<String>,
    pub actor_login: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub closed_at: Option<String>,
    pub merged_at: Option<String>,
    pub published_at: Option<String>,
    pub draft: Option<bool>,
    pub prerelease: Option<bool>,
    pub source_ref: Option<String>,
    pub metadata: BTreeMap<String, Value>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GitHubRepositoryFactsSummary {
    pub release_count: usize,
    pub published_release_count: usize,
    pub pull_request_count: usize,
    pub merged_pull_request_count: usize,
    pub review_count: usize,
    pub issue_count: usize,
    pub closed_issue_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GitHubConnectedActorActivity {
    pub login: String,
    pub authored_release_count: usize,
    pub authored_pull_request_count: usize,
    pub submitted_review_count: usize,
    pub authored_issue_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct GitHubRepositoryFacts {
    pub schema: String,
    pub repository: GitHubRepositoryRef,
    pub connected_login: Option<String>,
    pub observed_at: String,
    pub facts: Vec<GitHubFact>,
    pub summary: GitHubRepositoryFactsSummary,
    pub connected_actor_activity: Option<GitHubConnectedActorActivity>,
    pub deterministic: bool,
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum GitHubRepositoryFactsError {
    #[error("GitHub repository facts require non-empty {0}")]
    MissingField(&'static str),
    #[error("duplicate GitHub fact: {0}")]
    DuplicateFact(String),
}

fn required(value: &str, field: &'static str) -> Result<String, GitHubRepositoryFactsError> {
    let value = value.trim();
    if value.is_empty() {
        Err(GitHubRepositoryFactsError::MissingField(field))
    } else {
        Ok(value.to_string())
    }
}

fn optional(value: Option<String>) -> Option<String> {
    value.and_then(|value| {
        let value = value.trim().to_string();
        (!value.is_empty()).then_some(value)
    })
}

fn same_login(left: Option<&str>, right: &str) -> bool {
    left.is_some_and(|left| left.eq_ignore_ascii_case(right))
}

fn is_submitted_review(fact: &GitHubFact) -> bool {
    !fact
        .state
        .as_deref()
        .is_some_and(|state| state.eq_ignore_ascii_case("PENDING"))
        && fact.created_at.is_some()
}

pub fn create_github_repository_facts(
    owner: &str,
    name: &str,
    connected_login: Option<String>,
    observed_at: &str,
    inputs: Vec<GitHubFactInput>,
) -> Result<GitHubRepositoryFacts, GitHubRepositoryFactsError> {
    let owner = required(owner, "repository.owner")?;
    let name = required(name, "repository.name")?;
    let observed_at = required(observed_at, "observedAt")?;
    let full_name = format!("{owner}/{name}");
    let repository = GitHubRepositoryRef {
        owner,
        name,
        full_name: full_name.clone(),
    };
    let connected_login = optional(connected_login);
    let mut refs = BTreeSet::new();
    let mut facts = Vec::with_capacity(inputs.len());

    for input in inputs {
        let source_id = required(&input.source_id, "fact.sourceId")?;
        let fact_ref = format!("github:{full_name}:{}:{source_id}", input.kind.as_str());
        if !refs.insert(fact_ref.clone()) {
            return Err(GitHubRepositoryFactsError::DuplicateFact(fact_ref));
        }
        facts.push(GitHubFact {
            fact_ref,
            kind: input.kind,
            source_id,
            number: input.number,
            tag_name: optional(input.tag_name),
            state: optional(input.state),
            actor_login: optional(input.actor_login),
            created_at: optional(input.created_at),
            updated_at: optional(input.updated_at),
            closed_at: optional(input.closed_at),
            merged_at: optional(input.merged_at),
            published_at: optional(input.published_at),
            draft: input.draft,
            prerelease: input.prerelease,
            source_ref: optional(input.source_ref),
            metadata: input.metadata,
        });
    }

    let releases = facts
        .iter()
        .filter(|fact| fact.kind == GitHubFactKind::Release)
        .collect::<Vec<_>>();
    let pull_requests = facts
        .iter()
        .filter(|fact| fact.kind == GitHubFactKind::PullRequest)
        .collect::<Vec<_>>();
    let reviews = facts
        .iter()
        .filter(|fact| fact.kind == GitHubFactKind::Review)
        .collect::<Vec<_>>();
    let issues = facts
        .iter()
        .filter(|fact| fact.kind == GitHubFactKind::Issue)
        .collect::<Vec<_>>();

    let summary = GitHubRepositoryFactsSummary {
        release_count: releases.len(),
        published_release_count: releases
            .iter()
            .filter(|fact| fact.draft != Some(true))
            .count(),
        pull_request_count: pull_requests.len(),
        merged_pull_request_count: pull_requests
            .iter()
            .filter(|fact| fact.merged_at.is_some())
            .count(),
        review_count: reviews.len(),
        issue_count: issues.len(),
        closed_issue_count: issues
            .iter()
            .filter(|fact| fact.state.as_deref() == Some("closed") || fact.closed_at.is_some())
            .count(),
    };

    let connected_actor_activity =
        connected_login
            .as_ref()
            .map(|login| GitHubConnectedActorActivity {
                login: login.clone(),
                authored_release_count: releases
                    .iter()
                    .filter(|fact| same_login(fact.actor_login.as_deref(), login))
                    .count(),
                authored_pull_request_count: pull_requests
                    .iter()
                    .filter(|fact| same_login(fact.actor_login.as_deref(), login))
                    .count(),
                submitted_review_count: reviews
                    .iter()
                    .filter(|fact| {
                        same_login(fact.actor_login.as_deref(), login) && is_submitted_review(fact)
                    })
                    .count(),
                authored_issue_count: issues
                    .iter()
                    .filter(|fact| same_login(fact.actor_login.as_deref(), login))
                    .count(),
            });

    Ok(GitHubRepositoryFacts {
        schema: GITHUB_REPOSITORY_FACTS_SCHEMA.to_string(),
        repository,
        connected_login,
        observed_at,
        facts,
        summary,
        connected_actor_activity,
        deterministic: true,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn input(kind: GitHubFactKind, id: &str, actor: Option<&str>) -> GitHubFactInput {
        GitHubFactInput {
            kind,
            source_id: id.into(),
            number: None,
            tag_name: None,
            state: None,
            actor_login: actor.map(str::to_string),
            created_at: None,
            updated_at: None,
            closed_at: None,
            merged_at: None,
            published_at: None,
            draft: None,
            prerelease: None,
            source_ref: None,
            metadata: BTreeMap::new(),
        }
    }

    #[test]
    fn builds_bounded_github_facts_and_identity_counts() {
        let mut release = input(GitHubFactKind::Release, "100", Some("mauro"));
        release.tag_name = Some("v1.0.0".into());
        release.draft = Some(false);
        let mut pull = input(GitHubFactKind::PullRequest, "200", Some("Mauro"));
        pull.number = Some(12);
        pull.merged_at = Some("2026-09-23T10:00:00Z".into());
        let mut review = input(GitHubFactKind::Review, "300", Some("MAURO"));
        review.state = Some("APPROVED".into());
        review.created_at = Some("2026-09-23T09:00:00Z".into());
        let mut issue = input(GitHubFactKind::Issue, "400", Some("other"));
        issue.state = Some("closed".into());

        let facts = create_github_repository_facts(
            "acme",
            "demo",
            Some("Mauro".into()),
            "2026-09-23T20:00:00Z",
            vec![release, pull, review, issue],
        )
        .unwrap();

        assert_eq!(facts.repository.full_name, "acme/demo");
        assert_eq!(facts.summary.release_count, 1);
        assert_eq!(facts.summary.merged_pull_request_count, 1);
        assert_eq!(facts.summary.review_count, 1);
        assert_eq!(facts.summary.closed_issue_count, 1);
        let activity = facts.connected_actor_activity.unwrap();
        assert_eq!(activity.authored_release_count, 1);
        assert_eq!(activity.authored_pull_request_count, 1);
        assert_eq!(activity.submitted_review_count, 1);
        assert_eq!(activity.authored_issue_count, 0);
    }

    #[test]
    fn pending_review_remains_a_fact_but_is_not_submitted_activity() {
        let mut pending = input(GitHubFactKind::Review, "pending", Some("mauro"));
        pending.state = Some("PENDING".into());
        let mut submitted = input(GitHubFactKind::Review, "submitted", Some("mauro"));
        submitted.state = Some("APPROVED".into());
        submitted.created_at = Some("2026-09-23T19:00:00Z".into());

        let facts = create_github_repository_facts(
            "acme",
            "demo",
            Some("mauro".into()),
            "2026-09-23T20:00:00Z",
            vec![pending, submitted],
        )
        .unwrap();

        assert_eq!(facts.summary.review_count, 2);
        assert_eq!(
            facts
                .connected_actor_activity
                .unwrap()
                .submitted_review_count,
            1
        );
    }

    #[test]
    fn rejects_duplicate_fact_identity() {
        let err = create_github_repository_facts(
            "acme",
            "demo",
            None,
            "2026-09-23T20:00:00Z",
            vec![
                input(GitHubFactKind::Issue, "1", None),
                input(GitHubFactKind::Issue, "1", None),
            ],
        )
        .unwrap_err();
        assert!(matches!(err, GitHubRepositoryFactsError::DuplicateFact(_)));
    }

    #[test]
    fn serialized_contract_matches_shared_schema_fixture() {
        let schema: Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/github-repository-facts-v1-schema.json"
        ))
        .unwrap();
        let facts = create_github_repository_facts(
            "acme",
            "demo",
            Some("mauro".into()),
            "2026-09-23T20:00:00Z",
            vec![input(GitHubFactKind::Issue, "1", Some("mauro"))],
        )
        .unwrap();
        let value = serde_json::to_value(facts).unwrap();

        for field in schema["bundleFields"].as_array().unwrap() {
            assert!(value.get(field.as_str().unwrap()).is_some());
        }
        for field in schema["repositoryFields"].as_array().unwrap() {
            assert!(value["repository"].get(field.as_str().unwrap()).is_some());
        }
        for field in schema["factFields"].as_array().unwrap() {
            assert!(value["facts"][0].get(field.as_str().unwrap()).is_some());
        }
        for field in schema["summaryFields"].as_array().unwrap() {
            assert!(value["summary"].get(field.as_str().unwrap()).is_some());
        }
        for field in schema["connectedActorActivityFields"].as_array().unwrap() {
            assert!(
                value["connectedActorActivity"]
                    .get(field.as_str().unwrap())
                    .is_some()
            );
        }
    }
}
