use std::collections::{BTreeMap, BTreeSet};

use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::{
    DEVELOPMENT_TENDENCIES_SCHEMA, DevelopmentTendencies, GITHUB_COLLABORATION_SUMMARY_SCHEMA,
    GitHubCollaborationCoverageSummary, GitHubCollaborationMetric, GitHubCollaborationSummary,
    LanguageFootprintMetric, PORTFOLIO_LIFECYCLE_SCHEMA, PortfolioLifecycleSummary,
    REPOSITORY_DOMAIN_FINGERPRINT_SCHEMA, RepositoryDomainFingerprint, TECHNOLOGY_FOOTPRINT_SCHEMA,
    TechnologyFootprint, TechnologyFootprintCoverage, TechnologyFootprintMetric,
};

pub const PROFILE_STATISTICS_SCHEMA: &str = "giteach-profile-statistics-v1";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ProfileStatisticsTendencyMetric {
    pub key: String,
    pub label: String,
    pub value: f64,
    pub unit: String,
    pub supporting_repository_count: usize,
    pub analyzed_repository_count: usize,
    pub repositories: Vec<String>,
    pub evidence_refs: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ProfileStatisticsDomainMetric {
    pub key: String,
    pub label: String,
    pub value: f64,
    pub unit: String,
    pub supporting_repository_count: usize,
    pub analyzed_repository_count: usize,
    pub repositories: Vec<String>,
    pub source_refs: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProfileStatisticsLifecycleMetric {
    pub key: String,
    pub label: String,
    pub value: usize,
    pub unit: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProfileStatisticsCollaborationMetric {
    pub key: String,
    pub label: String,
    pub value: usize,
    pub unit: String,
    pub supporting_repository_count: usize,
    pub supporting_unit: String,
    pub repositories: Vec<String>,
    pub evidence_refs: Vec<String>,
    pub omitted_evidence_ref_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ProfileStatisticsTendencySection {
    pub analyzed_repository_count: usize,
    pub metrics: Vec<ProfileStatisticsTendencyMetric>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ProfileStatisticsDomainSection {
    pub analyzed_repository_count: usize,
    pub metrics: Vec<ProfileStatisticsDomainMetric>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProfileStatisticsLifecycleSection {
    pub analyzed_repository_count: usize,
    pub metrics: Vec<ProfileStatisticsLifecycleMetric>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProfileStatisticsCollaborationSection {
    pub analyzed_repository_count: usize,
    pub coverage: Option<GitHubCollaborationCoverageSummary>,
    pub metrics: Vec<ProfileStatisticsCollaborationMetric>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ProfileStatisticsTechnologySection {
    pub analyzed_repository_count: usize,
    #[serde(default)]
    pub coverage: TechnologyFootprintCoverage,
    pub languages: Vec<LanguageFootprintMetric>,
    pub technologies: Vec<TechnologyFootprintMetric>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ProfileStatistics {
    pub schema: String,
    pub technology: ProfileStatisticsTechnologySection,
    pub tendencies: ProfileStatisticsTendencySection,
    pub domains: ProfileStatisticsDomainSection,
    pub lifecycle: ProfileStatisticsLifecycleSection,
    pub collaboration: ProfileStatisticsCollaborationSection,
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum ProfileStatisticsError {
    #[error("unsupported technology footprint schema: {0}")]
    UnsupportedTechnologySchema(String),
    #[error("unsupported development tendencies schema: {0}")]
    UnsupportedTendenciesSchema(String),
    #[error("unsupported repository domain fingerprint schema: {0}")]
    UnsupportedDomainSchema(String),
    #[error("repository domain fingerprint requires a named repository")]
    MissingDomainRepository,
    #[error("unsupported portfolio lifecycle schema: {0}")]
    UnsupportedLifecycleSchema(String),
    #[error("unsupported GitHub collaboration summary schema: {0}")]
    UnsupportedCollaborationSchema(String),
}

fn technology_section(
    input: Option<&TechnologyFootprint>,
) -> Result<ProfileStatisticsTechnologySection, ProfileStatisticsError> {
    let Some(input) = input else {
        return Ok(ProfileStatisticsTechnologySection {
            analyzed_repository_count: 0,
            coverage: TechnologyFootprintCoverage::default(),
            languages: Vec::new(),
            technologies: Vec::new(),
        });
    };
    if input.schema != TECHNOLOGY_FOOTPRINT_SCHEMA {
        return Err(ProfileStatisticsError::UnsupportedTechnologySchema(
            input.schema.clone(),
        ));
    }
    Ok(ProfileStatisticsTechnologySection {
        analyzed_repository_count: input.analyzed_repository_count,
        coverage: input.coverage.clone(),
        languages: input.languages.clone(),
        technologies: input.technologies.clone(),
    })
}

fn round_prevalence(value: f64) -> f64 {
    (value * 10_000.0).round() / 10_000.0
}

fn tendency_section(
    input: Option<&DevelopmentTendencies>,
) -> Result<ProfileStatisticsTendencySection, ProfileStatisticsError> {
    let Some(input) = input else {
        return Ok(ProfileStatisticsTendencySection {
            analyzed_repository_count: 0,
            metrics: Vec::new(),
        });
    };
    if input.schema != DEVELOPMENT_TENDENCIES_SCHEMA {
        return Err(ProfileStatisticsError::UnsupportedTendenciesSchema(
            input.schema.clone(),
        ));
    }
    Ok(ProfileStatisticsTendencySection {
        analyzed_repository_count: input.analyzed_repository_count,
        metrics: input
            .tendencies
            .iter()
            .map(|item| ProfileStatisticsTendencyMetric {
                key: item.key.clone(),
                label: item.label.clone(),
                value: item.prevalence,
                unit: "repository-prevalence".into(),
                supporting_repository_count: item.repository_count,
                analyzed_repository_count: item.analyzed_repository_count,
                repositories: item.repositories.clone(),
                evidence_refs: item.evidence_refs.clone(),
            })
            .collect(),
    })
}

fn domain_section(
    inputs: &[RepositoryDomainFingerprint],
) -> Result<ProfileStatisticsDomainSection, ProfileStatisticsError> {
    let mut by_repository = BTreeMap::new();
    for fingerprint in inputs {
        if fingerprint.schema != REPOSITORY_DOMAIN_FINGERPRINT_SCHEMA {
            return Err(ProfileStatisticsError::UnsupportedDomainSchema(
                fingerprint.schema.clone(),
            ));
        }
        let repository = fingerprint.repository.trim();
        if repository.is_empty() {
            return Err(ProfileStatisticsError::MissingDomainRepository);
        }
        by_repository
            .entry(repository.to_string())
            .or_insert(fingerprint);
    }

    let analyzed_repository_count = by_repository.len();
    let mut aggregate: BTreeMap<String, (String, BTreeSet<String>, BTreeSet<String>)> =
        BTreeMap::new();
    for (repository, fingerprint) in &by_repository {
        for candidate in &fingerprint.candidates {
            let entry = aggregate
                .entry(candidate.key.clone())
                .or_insert_with(|| (candidate.label.clone(), BTreeSet::new(), BTreeSet::new()));
            entry.1.insert(repository.clone());
            entry.2.extend(candidate.source_refs.iter().cloned());
        }
    }

    let mut metrics = aggregate
        .into_iter()
        .map(|(key, (label, repositories, source_refs))| {
            let repositories = repositories.into_iter().collect::<Vec<_>>();
            ProfileStatisticsDomainMetric {
                key,
                label,
                value: if analyzed_repository_count == 0 {
                    0.0
                } else {
                    round_prevalence(repositories.len() as f64 / analyzed_repository_count as f64)
                },
                unit: "repository-prevalence".into(),
                supporting_repository_count: repositories.len(),
                analyzed_repository_count,
                repositories,
                source_refs: source_refs.into_iter().collect(),
            }
        })
        .collect::<Vec<_>>();
    metrics.sort_by(|a, b| {
        b.supporting_repository_count
            .cmp(&a.supporting_repository_count)
            .then_with(|| a.label.cmp(&b.label))
    });

    Ok(ProfileStatisticsDomainSection {
        analyzed_repository_count,
        metrics,
    })
}

fn lifecycle_metric(
    key: &str,
    label: &str,
    value: usize,
    unit: &str,
) -> ProfileStatisticsLifecycleMetric {
    ProfileStatisticsLifecycleMetric {
        key: key.into(),
        label: label.into(),
        value,
        unit: unit.into(),
    }
}

fn lifecycle_section(
    input: Option<&PortfolioLifecycleSummary>,
) -> Result<ProfileStatisticsLifecycleSection, ProfileStatisticsError> {
    let Some(input) = input else {
        return Ok(ProfileStatisticsLifecycleSection {
            analyzed_repository_count: 0,
            metrics: Vec::new(),
        });
    };
    if input.schema != PORTFOLIO_LIFECYCLE_SCHEMA {
        return Err(ProfileStatisticsError::UnsupportedLifecycleSchema(
            input.schema.clone(),
        ));
    }
    Ok(ProfileStatisticsLifecycleSection {
        analyzed_repository_count: input.analyzed_repository_count,
        metrics: vec![
            lifecycle_metric(
                "repositories-with-history",
                "Repositories with Git history",
                input.repository_with_history_count,
                "repositories",
            ),
            lifecycle_metric(
                "multi-month-history-repositories",
                "Repositories with multi-month history",
                input.multi_month_history_repository_count,
                "repositories",
            ),
            lifecycle_metric(
                "tagged-repositories",
                "Repositories with reachable Git tags",
                input.tagged_repository_count,
                "repositories",
            ),
            lifecycle_metric(
                "post-tag-maintenance-repositories",
                "Repositories with post-tag work",
                input.post_tag_maintenance_repository_count,
                "repositories",
            ),
            lifecycle_metric(
                "reachable-git-tags",
                "Reachable Git tags",
                input.total_reachable_tag_count,
                "git-tags",
            ),
        ],
    })
}

fn collaboration_metric(
    key: &str,
    label: &str,
    metric: &GitHubCollaborationMetric,
) -> ProfileStatisticsCollaborationMetric {
    ProfileStatisticsCollaborationMetric {
        key: key.into(),
        label: label.into(),
        value: metric.observed_count,
        unit: "events".into(),
        supporting_repository_count: metric.repository_count,
        supporting_unit: "repositories".into(),
        repositories: metric.repositories.clone(),
        evidence_refs: metric.evidence_refs.clone(),
        omitted_evidence_ref_count: metric.omitted_evidence_ref_count,
    }
}

fn collaboration_section(
    input: Option<&GitHubCollaborationSummary>,
) -> Result<ProfileStatisticsCollaborationSection, ProfileStatisticsError> {
    let Some(input) = input else {
        return Ok(ProfileStatisticsCollaborationSection {
            analyzed_repository_count: 0,
            coverage: None,
            metrics: Vec::new(),
        });
    };
    if input.schema != GITHUB_COLLABORATION_SUMMARY_SCHEMA {
        return Err(ProfileStatisticsError::UnsupportedCollaborationSchema(
            input.schema.clone(),
        ));
    }
    Ok(ProfileStatisticsCollaborationSection {
        analyzed_repository_count: input.analyzed_repository_count,
        coverage: Some(input.coverage.clone()),
        metrics: vec![
            collaboration_metric(
                "authored-releases",
                "Authored releases",
                &input.authored_releases,
            ),
            collaboration_metric(
                "authored-pull-requests",
                "Authored pull requests",
                &input.authored_pull_requests,
            ),
            collaboration_metric(
                "merged-authored-pull-requests",
                "Merged authored pull requests",
                &input.merged_authored_pull_requests,
            ),
            collaboration_metric(
                "submitted-reviews",
                "Submitted reviews",
                &input.submitted_reviews,
            ),
            collaboration_metric("authored-issues", "Authored issues", &input.authored_issues),
        ],
    })
}

pub fn build_profile_statistics(
    technology: Option<&TechnologyFootprint>,
    tendencies: Option<&DevelopmentTendencies>,
    domain_fingerprints: &[RepositoryDomainFingerprint],
    lifecycle: Option<&PortfolioLifecycleSummary>,
    collaboration: Option<&GitHubCollaborationSummary>,
) -> Result<ProfileStatistics, ProfileStatisticsError> {
    Ok(ProfileStatistics {
        schema: PROFILE_STATISTICS_SCHEMA.into(),
        technology: technology_section(technology)?,
        tendencies: tendency_section(tendencies)?,
        domains: domain_section(domain_fingerprints)?,
        lifecycle: lifecycle_section(lifecycle)?,
        collaboration: collaboration_section(collaboration)?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{DevelopmentTendency, RepositoryDomainCandidate};

    #[test]
    fn statistics_keep_explicit_units_and_no_skill_score_field() {
        let tendencies = DevelopmentTendencies {
            schema: DEVELOPMENT_TENDENCIES_SCHEMA.into(),
            analyzed_repository_count: 2,
            minimum_repositories: 2,
            tendencies: vec![DevelopmentTendency {
                key: "automation".into(),
                label: "Automation".into(),
                repository_count: 2,
                analyzed_repository_count: 2,
                prevalence: 1.0,
                repositories: vec!["GitTeach".into(), "kode".into()],
                evidence_refs: vec!["ev-g".into(), "ev-k".into()],
                evidence_kinds: vec!["tooling".into()],
                deterministic: true,
            }],
        };
        let stats = build_profile_statistics(None, Some(&tendencies), &[], None, None).unwrap();
        assert_eq!(stats.tendencies.metrics[0].unit, "repository-prevalence");
        assert_eq!(stats.tendencies.metrics[0].value, 1.0);
        let json = serde_json::to_value(stats).unwrap();
        let serialized = serde_json::to_string(&json).unwrap();
        assert!(!serialized.contains("score"));
        assert!(!serialized.contains("seniority"));
        assert!(!serialized.contains("expertise"));
    }

    #[test]
    fn domain_statistics_deduplicate_repository_snapshots() {
        let fingerprint = RepositoryDomainFingerprint {
            schema: REPOSITORY_DOMAIN_FINGERPRINT_SCHEMA.into(),
            repository: "kode".into(),
            declared_topics: Vec::new(),
            candidates: vec![RepositoryDomainCandidate {
                key: "developer-tooling".into(),
                label: "Developer tooling".into(),
                source_kinds: vec!["technology".into()],
                evidence_refs: vec!["ev-k".into()],
                source_refs: vec!["ev-k".into()],
                technologies: vec!["monaco-editor".into()],
                languages: Vec::new(),
                topics: Vec::new(),
                rule_based: true,
            }],
        };
        let stats =
            build_profile_statistics(None, None, &[fingerprint.clone(), fingerprint], None, None)
                .unwrap();
        assert_eq!(stats.domains.analyzed_repository_count, 1);
        assert_eq!(stats.domains.metrics[0].supporting_repository_count, 1);
        assert_eq!(stats.domains.metrics[0].value, 1.0);
    }

    #[test]
    fn serialized_statistics_match_shared_schema_fixture() {
        let schema: serde_json::Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/profile-statistics-v1-schema.json"
        ))
        .unwrap();
        let tendencies = DevelopmentTendencies {
            schema: DEVELOPMENT_TENDENCIES_SCHEMA.into(),
            analyzed_repository_count: 2,
            minimum_repositories: 2,
            tendencies: vec![DevelopmentTendency {
                key: "automation".into(),
                label: "Automation".into(),
                repository_count: 2,
                analyzed_repository_count: 2,
                prevalence: 1.0,
                repositories: vec!["a".into(), "b".into()],
                evidence_refs: vec!["ev-a".into(), "ev-b".into()],
                evidence_kinds: vec!["tooling".into()],
                deterministic: true,
            }],
        };
        let stats = build_profile_statistics(None, Some(&tendencies), &[], None, None).unwrap();
        let value = serde_json::to_value(stats).unwrap();
        for field in schema["fields"].as_array().unwrap() {
            assert!(
                value.get(field.as_str().unwrap()).is_some(),
                "missing root field {field}"
            );
        }
        for field in schema["technologyFields"].as_array().unwrap() {
            assert!(
                value["technology"].get(field.as_str().unwrap()).is_some(),
                "missing technology section field {field}"
            );
        }
        for field in schema["technologyCoverageFields"].as_array().unwrap() {
            assert!(
                value["technology"]["coverage"]
                    .get(field.as_str().unwrap())
                    .is_some(),
                "missing technology coverage field {field}"
            );
        }
        for field in schema["tendencyMetricFields"].as_array().unwrap() {
            assert!(
                value["tendencies"]["metrics"][0]
                    .get(field.as_str().unwrap())
                    .is_some(),
                "missing tendency field {field}"
            );
        }
    }
}
