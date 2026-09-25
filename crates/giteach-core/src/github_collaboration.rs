use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
#[cfg(test)]
use serde_json::Value;
use thiserror::Error;

use crate::{GITHUB_REPOSITORY_FACTS_SCHEMA, GitHubFact, GitHubFactKind, GitHubRepositoryFacts};

pub const GITHUB_COLLABORATION_SUMMARY_SCHEMA: &str = "giteach-github-collaboration-summary-v1";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GitHubReviewCoverageInput {
    pub mode: String,
    pub requested_pull_count: usize,
    pub queried_pull_count: usize,
    pub omitted_pull_count: usize,
    pub truncated: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GitHubCollaborationCoverageInput {
    pub base_surfaces_complete: bool,
    pub reviews: GitHubReviewCoverageInput,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct GitHubCollaborationObservation {
    pub facts: GitHubRepositoryFacts,
    pub coverage: GitHubCollaborationCoverageInput,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GitHubCollaborationMetric {
    pub observed_count: usize,
    pub repository_count: usize,
    pub repositories: Vec<String>,
    pub evidence_refs: Vec<String>,
    pub omitted_evidence_ref_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GitHubCollaborationCoverageSummary {
    pub complete_base_repository_count: usize,
    pub partial_base_repository_count: usize,
    pub all_base_surfaces_complete: bool,
    pub review_coverage_mode: String,
    pub targeted_review_repository_count: usize,
    pub complete_requested_review_repository_count: usize,
    pub partial_requested_review_repository_count: usize,
    pub requested_review_pull_count: usize,
    pub queried_review_pull_count: usize,
    pub omitted_review_pull_count: usize,
    pub review_history_complete: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GitHubRepositoryCollaborationFact {
    pub repository: String,
    pub base_coverage_complete: bool,
    pub review_coverage_requested: bool,
    pub review_coverage_complete_for_requested_pulls: bool,
    pub requested_review_pull_count: usize,
    pub queried_review_pull_count: usize,
    pub omitted_review_pull_count: usize,
    pub review_coverage_truncated: bool,
    pub authored_release_count: usize,
    pub authored_pull_request_count: usize,
    pub merged_authored_pull_request_count: usize,
    pub submitted_review_count: usize,
    pub authored_issue_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GitHubCollaborationSummary {
    pub schema: String,
    pub connected_login: String,
    pub analyzed_repository_count: usize,
    pub coverage: GitHubCollaborationCoverageSummary,
    pub authored_releases: GitHubCollaborationMetric,
    pub authored_pull_requests: GitHubCollaborationMetric,
    pub merged_authored_pull_requests: GitHubCollaborationMetric,
    pub submitted_reviews: GitHubCollaborationMetric,
    pub authored_issues: GitHubCollaborationMetric,
    pub repositories: Vec<GitHubRepositoryCollaborationFact>,
    pub deterministic: bool,
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum GitHubCollaborationError {
    #[error("connectedLogin is required")]
    MissingConnectedLogin,
    #[error("maxEvidenceRefsPerMetric must be >= 1")]
    InvalidEvidenceLimit,
    #[error("unsupported GitHub repository facts schema: {0}")]
    UnsupportedFactsSchema(String),
    #[error("GitHub collaboration observation requires connected login for {0}")]
    MissingObservationLogin(String),
    #[error("GitHub collaboration observation login mismatch for {0}")]
    LoginMismatch(String),
    #[error("unsupported GitHub review coverage mode: {0}")]
    UnsupportedReviewCoverageMode(String),
    #[error("queried review pull count cannot exceed requested count for {0}")]
    InvalidQueriedReviewCount(String),
    #[error("omitted review pull count must equal requested minus queried for {0}")]
    InvalidOmittedReviewCount(String),
}

#[derive(Clone, Copy)]
enum MetricKind {
    AuthoredRelease,
    AuthoredPullRequest,
    MergedAuthoredPullRequest,
    SubmittedReview,
    AuthoredIssue,
}

fn same_login(left: Option<&str>, right: &str) -> bool {
    left.is_some_and(|left| left.eq_ignore_ascii_case(right))
}

fn submitted_review(fact: &GitHubFact) -> bool {
    fact.kind == GitHubFactKind::Review
        && !fact
            .state
            .as_deref()
            .is_some_and(|state| state.eq_ignore_ascii_case("PENDING"))
        && fact.created_at.is_some()
}

fn matches_metric(fact: &GitHubFact, login: &str, kind: MetricKind) -> bool {
    if !same_login(fact.actor_login.as_deref(), login) {
        return false;
    }
    match kind {
        MetricKind::AuthoredRelease => fact.kind == GitHubFactKind::Release,
        MetricKind::AuthoredPullRequest => fact.kind == GitHubFactKind::PullRequest,
        MetricKind::MergedAuthoredPullRequest => {
            fact.kind == GitHubFactKind::PullRequest && fact.merged_at.is_some()
        }
        MetricKind::SubmittedReview => submitted_review(fact),
        MetricKind::AuthoredIssue => fact.kind == GitHubFactKind::Issue,
    }
}

fn count_metric(
    observation: &GitHubCollaborationObservation,
    login: &str,
    kind: MetricKind,
) -> usize {
    observation
        .facts
        .facts
        .iter()
        .filter(|fact| matches_metric(fact, login, kind))
        .count()
}

fn metric(
    observations: &[&GitHubCollaborationObservation],
    login: &str,
    kind: MetricKind,
    max_evidence_refs: usize,
) -> GitHubCollaborationMetric {
    let mut repositories = Vec::new();
    let mut evidence_refs = Vec::new();
    let mut observed_count = 0;

    for observation in observations {
        let matched = observation
            .facts
            .facts
            .iter()
            .filter(|fact| matches_metric(fact, login, kind))
            .collect::<Vec<_>>();
        if matched.is_empty() {
            continue;
        }
        repositories.push(observation.facts.repository.full_name.clone());
        observed_count += matched.len();
        evidence_refs.extend(matched.into_iter().map(|fact| fact.fact_ref.clone()));
    }

    evidence_refs.sort();
    let total_refs = evidence_refs.len();
    evidence_refs.truncate(max_evidence_refs);

    GitHubCollaborationMetric {
        observed_count,
        repository_count: repositories.len(),
        repositories,
        evidence_refs,
        omitted_evidence_ref_count: total_refs.saturating_sub(max_evidence_refs),
    }
}

fn validate_observation(
    observation: &GitHubCollaborationObservation,
    connected_login: &str,
) -> Result<(), GitHubCollaborationError> {
    if observation.facts.schema != GITHUB_REPOSITORY_FACTS_SCHEMA {
        return Err(GitHubCollaborationError::UnsupportedFactsSchema(
            observation.facts.schema.clone(),
        ));
    }
    let repository = observation.facts.repository.full_name.clone();
    let Some(login) = observation.facts.connected_login.as_deref() else {
        return Err(GitHubCollaborationError::MissingObservationLogin(
            repository,
        ));
    };
    if !login.eq_ignore_ascii_case(connected_login) {
        return Err(GitHubCollaborationError::LoginMismatch(repository));
    }
    if observation.coverage.reviews.mode != "targeted" {
        return Err(GitHubCollaborationError::UnsupportedReviewCoverageMode(
            observation.coverage.reviews.mode.clone(),
        ));
    }
    if observation.coverage.reviews.queried_pull_count
        > observation.coverage.reviews.requested_pull_count
    {
        return Err(GitHubCollaborationError::InvalidQueriedReviewCount(
            repository,
        ));
    }
    if observation.coverage.reviews.requested_pull_count
        - observation.coverage.reviews.queried_pull_count
        != observation.coverage.reviews.omitted_pull_count
    {
        return Err(GitHubCollaborationError::InvalidOmittedReviewCount(
            repository,
        ));
    }
    Ok(())
}

pub fn summarize_github_collaboration(
    connected_login: &str,
    observations: &[GitHubCollaborationObservation],
    max_evidence_refs_per_metric: usize,
) -> Result<GitHubCollaborationSummary, GitHubCollaborationError> {
    let connected_login = connected_login.trim();
    if connected_login.is_empty() {
        return Err(GitHubCollaborationError::MissingConnectedLogin);
    }
    if max_evidence_refs_per_metric == 0 {
        return Err(GitHubCollaborationError::InvalidEvidenceLimit);
    }

    let mut by_repository = BTreeMap::new();
    for observation in observations {
        validate_observation(observation, connected_login)?;
        by_repository
            .entry(observation.facts.repository.full_name.clone())
            .or_insert(observation);
    }
    let selected = by_repository.values().copied().collect::<Vec<_>>();

    let repositories = selected
        .iter()
        .map(|observation| {
            let requested = observation.coverage.reviews.requested_pull_count > 0;
            let complete_for_requested = requested
                && !observation.coverage.reviews.truncated
                && observation.coverage.reviews.omitted_pull_count == 0;
            GitHubRepositoryCollaborationFact {
                repository: observation.facts.repository.full_name.clone(),
                base_coverage_complete: observation.coverage.base_surfaces_complete,
                review_coverage_requested: requested,
                review_coverage_complete_for_requested_pulls: complete_for_requested,
                requested_review_pull_count: observation.coverage.reviews.requested_pull_count,
                queried_review_pull_count: observation.coverage.reviews.queried_pull_count,
                omitted_review_pull_count: observation.coverage.reviews.omitted_pull_count,
                review_coverage_truncated: observation.coverage.reviews.truncated,
                authored_release_count: count_metric(
                    observation,
                    connected_login,
                    MetricKind::AuthoredRelease,
                ),
                authored_pull_request_count: count_metric(
                    observation,
                    connected_login,
                    MetricKind::AuthoredPullRequest,
                ),
                merged_authored_pull_request_count: count_metric(
                    observation,
                    connected_login,
                    MetricKind::MergedAuthoredPullRequest,
                ),
                submitted_review_count: count_metric(
                    observation,
                    connected_login,
                    MetricKind::SubmittedReview,
                ),
                authored_issue_count: count_metric(
                    observation,
                    connected_login,
                    MetricKind::AuthoredIssue,
                ),
            }
        })
        .collect::<Vec<_>>();

    let complete_base_repository_count = repositories
        .iter()
        .filter(|item| item.base_coverage_complete)
        .count();
    let targeted = repositories
        .iter()
        .filter(|item| item.review_coverage_requested)
        .collect::<Vec<_>>();
    let complete_targeted = targeted
        .iter()
        .filter(|item| item.review_coverage_complete_for_requested_pulls)
        .count();

    Ok(GitHubCollaborationSummary {
        schema: GITHUB_COLLABORATION_SUMMARY_SCHEMA.to_string(),
        connected_login: connected_login.to_string(),
        analyzed_repository_count: repositories.len(),
        coverage: GitHubCollaborationCoverageSummary {
            complete_base_repository_count,
            partial_base_repository_count: repositories.len() - complete_base_repository_count,
            all_base_surfaces_complete: repositories.iter().all(|item| item.base_coverage_complete),
            review_coverage_mode: "targeted".to_string(),
            targeted_review_repository_count: targeted.len(),
            complete_requested_review_repository_count: complete_targeted,
            partial_requested_review_repository_count: targeted.len() - complete_targeted,
            requested_review_pull_count: repositories
                .iter()
                .map(|item| item.requested_review_pull_count)
                .sum(),
            queried_review_pull_count: repositories
                .iter()
                .map(|item| item.queried_review_pull_count)
                .sum(),
            omitted_review_pull_count: repositories
                .iter()
                .map(|item| item.omitted_review_pull_count)
                .sum(),
            review_history_complete: false,
        },
        authored_releases: metric(
            &selected,
            connected_login,
            MetricKind::AuthoredRelease,
            max_evidence_refs_per_metric,
        ),
        authored_pull_requests: metric(
            &selected,
            connected_login,
            MetricKind::AuthoredPullRequest,
            max_evidence_refs_per_metric,
        ),
        merged_authored_pull_requests: metric(
            &selected,
            connected_login,
            MetricKind::MergedAuthoredPullRequest,
            max_evidence_refs_per_metric,
        ),
        submitted_reviews: metric(
            &selected,
            connected_login,
            MetricKind::SubmittedReview,
            max_evidence_refs_per_metric,
        ),
        authored_issues: metric(
            &selected,
            connected_login,
            MetricKind::AuthoredIssue,
            max_evidence_refs_per_metric,
        ),
        repositories,
        deterministic: true,
    })
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use super::*;
    use crate::{GitHubFactInput, create_github_repository_facts};

    fn input(kind: GitHubFactKind, id: &str, actor: &str) -> GitHubFactInput {
        GitHubFactInput {
            kind,
            source_id: id.into(),
            number: None,
            tag_name: None,
            state: None,
            actor_login: Some(actor.into()),
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

    fn observation(name: &str, inputs: Vec<GitHubFactInput>) -> GitHubCollaborationObservation {
        GitHubCollaborationObservation {
            facts: create_github_repository_facts(
                "acme",
                name,
                Some("mauro".into()),
                "2026-09-23T21:45:00Z",
                inputs,
            )
            .unwrap(),
            coverage: GitHubCollaborationCoverageInput {
                base_surfaces_complete: true,
                reviews: GitHubReviewCoverageInput {
                    mode: "targeted".into(),
                    requested_pull_count: 0,
                    queried_pull_count: 0,
                    omitted_pull_count: 0,
                    truncated: false,
                },
            },
        }
    }

    #[test]
    fn aggregates_cross_repository_activity_without_expertise_scoring() {
        let mut pr_a = input(GitHubFactKind::PullRequest, "p1", "Mauro");
        pr_a.merged_at = Some("2026-09-01T00:00:00Z".into());
        let mut review_a = input(GitHubFactKind::Review, "v1", "mauro");
        review_a.state = Some("APPROVED".into());
        review_a.created_at = Some("2026-09-02T00:00:00Z".into());
        let mut a = observation(
            "repo-a",
            vec![
                input(GitHubFactKind::Release, "r1", "mauro"),
                pr_a,
                input(GitHubFactKind::PullRequest, "p2", "mauro"),
                review_a,
                input(GitHubFactKind::Issue, "i1", "mauro"),
            ],
        );
        a.coverage.reviews.requested_pull_count = 2;
        a.coverage.reviews.queried_pull_count = 2;

        let mut pr_b = input(GitHubFactKind::PullRequest, "p3", "mauro");
        pr_b.merged_at = Some("2026-09-03T00:00:00Z".into());
        let mut review_b = input(GitHubFactKind::Review, "v2", "mauro");
        review_b.state = Some("COMMENTED".into());
        review_b.created_at = Some("2026-09-04T00:00:00Z".into());
        let mut b = observation("repo-b", vec![pr_b, review_b]);
        b.coverage.base_surfaces_complete = false;
        b.coverage.reviews.requested_pull_count = 2;
        b.coverage.reviews.queried_pull_count = 1;
        b.coverage.reviews.omitted_pull_count = 1;
        b.coverage.reviews.truncated = true;

        let summary = summarize_github_collaboration("mauro", &[a, b], 50).unwrap();
        assert_eq!(summary.analyzed_repository_count, 2);
        assert_eq!(summary.authored_pull_requests.observed_count, 3);
        assert_eq!(summary.authored_pull_requests.repository_count, 2);
        assert_eq!(summary.merged_authored_pull_requests.observed_count, 2);
        assert_eq!(summary.submitted_reviews.observed_count, 2);
        assert_eq!(summary.authored_issues.observed_count, 1);
        assert_eq!(summary.authored_releases.observed_count, 1);
        assert_eq!(summary.coverage.complete_base_repository_count, 1);
        assert_eq!(summary.coverage.partial_base_repository_count, 1);
        assert_eq!(
            summary.coverage.complete_requested_review_repository_count,
            1
        );
        assert_eq!(
            summary.coverage.partial_requested_review_repository_count,
            1
        );
        assert!(!summary.coverage.review_history_complete);
    }

    #[test]
    fn duplicate_repository_observations_do_not_inflate_counts() {
        let summary = summarize_github_collaboration(
            "mauro",
            &[
                observation(
                    "repo-a",
                    vec![input(GitHubFactKind::PullRequest, "first", "mauro")],
                ),
                observation(
                    "repo-a",
                    vec![
                        input(GitHubFactKind::PullRequest, "later-1", "mauro"),
                        input(GitHubFactKind::PullRequest, "later-2", "mauro"),
                    ],
                ),
                observation(
                    "repo-b",
                    vec![input(GitHubFactKind::PullRequest, "other", "mauro")],
                ),
            ],
            50,
        )
        .unwrap();
        assert_eq!(summary.analyzed_repository_count, 2);
        assert_eq!(summary.authored_pull_requests.observed_count, 2);
    }

    #[test]
    fn pending_review_is_not_counted_as_submitted_collaboration() {
        let mut pending = input(GitHubFactKind::Review, "pending", "mauro");
        pending.state = Some("PENDING".into());
        let mut submitted = input(GitHubFactKind::Review, "submitted", "mauro");
        submitted.state = Some("CHANGES_REQUESTED".into());
        submitted.created_at = Some("2026-09-02T00:00:00Z".into());

        let summary = summarize_github_collaboration(
            "mauro",
            &[observation("repo-a", vec![pending, submitted])],
            50,
        )
        .unwrap();
        assert_eq!(summary.submitted_reviews.observed_count, 1);
        assert_eq!(
            summary.submitted_reviews.evidence_refs,
            vec!["github:acme/repo-a:review:submitted"]
        );
    }

    #[test]
    fn mixed_identity_fails_closed() {
        let mut other = observation("repo-a", Vec::new());
        other.facts.connected_login = Some("other".into());
        assert!(matches!(
            summarize_github_collaboration("mauro", &[other], 50),
            Err(GitHubCollaborationError::LoginMismatch(_))
        ));
    }

    #[test]
    fn evidence_refs_are_bounded_without_changing_observed_count() {
        let summary = summarize_github_collaboration(
            "mauro",
            &[observation(
                "repo-a",
                vec![
                    input(GitHubFactKind::PullRequest, "3", "mauro"),
                    input(GitHubFactKind::PullRequest, "1", "mauro"),
                    input(GitHubFactKind::PullRequest, "2", "mauro"),
                ],
            )],
            2,
        )
        .unwrap();
        assert_eq!(summary.authored_pull_requests.observed_count, 3);
        assert_eq!(summary.authored_pull_requests.evidence_refs.len(), 2);
        assert_eq!(summary.authored_pull_requests.omitted_evidence_ref_count, 1);
    }

    #[test]
    fn serialized_summary_matches_shared_schema_fixture() {
        let schema: Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/github-collaboration-summary-v1-schema.json"
        ))
        .unwrap();
        let summary = summarize_github_collaboration(
            "mauro",
            &[observation(
                "repo-a",
                vec![input(GitHubFactKind::PullRequest, "1", "mauro")],
            )],
            50,
        )
        .unwrap();
        let value = serde_json::to_value(summary).unwrap();

        for field in schema["summaryFields"].as_array().unwrap() {
            assert!(value.get(field.as_str().unwrap()).is_some());
        }
        for field in schema["coverageFields"].as_array().unwrap() {
            assert!(value["coverage"].get(field.as_str().unwrap()).is_some());
        }
        for field in schema["metricFields"].as_array().unwrap() {
            assert!(
                value["authoredPullRequests"]
                    .get(field.as_str().unwrap())
                    .is_some()
            );
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
