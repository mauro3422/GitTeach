use std::collections::{BTreeMap, BTreeSet};

use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::actor::{ActorEvidence, actor_evidence_applies_to};

pub const DEVELOPER_PROFILE_SCHEMA: &str = "giteach-developer-profile-v1";

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ClaimStance {
    #[default]
    Support,
    Contradict,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum AttributionStatus {
    #[default]
    RepositoryOnly,
    IdentityLinked,
    AgencySupported,
    UserConfirmed,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProfileEvidenceMeta {
    pub kind: String,
    pub observed_at: Option<String>,
    #[serde(default)]
    pub stale: bool,
    #[serde(default)]
    pub actor_relation: Option<String>,
    #[serde(default)]
    pub implementation_origin: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CapabilityAttribution {
    pub status: AttributionStatus,
    pub actor_evidence_refs: Vec<String>,
    pub actor_relations: Vec<String>,
    pub implementation_origins: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SemanticClaim {
    pub skill: String,
    pub repository: String,
    pub evidence_refs: Vec<String>,
    pub confidence: Option<f64>,
    #[serde(default)]
    pub stance: ClaimStance,
    #[serde(default)]
    pub stale: bool,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CapabilityProfile {
    pub key: String,
    pub label: String,
    pub support_count: usize,
    pub repository_count: usize,
    pub repositories: Vec<String>,
    pub evidence_diversity: Vec<String>,
    pub latest_evidence_at: Option<String>,
    pub attribution: CapabilityAttribution,
    pub strongest_confidence: Option<f64>,
    pub evidence_refs: Vec<String>,
    pub support_evidence_refs: Vec<String>,
    pub stale_evidence_refs: Vec<String>,
    pub stale_claim_count: usize,
    pub contradictions: Vec<SemanticClaim>,
    pub semantic_claims: Vec<SemanticClaim>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DeveloperProfile {
    pub schema: String,
    pub developer: BTreeMap<String, String>,
    pub repositories: Vec<String>,
    pub skills: Vec<CapabilityProfile>,
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum ProfileError {
    #[error("unknown evidence reference: {0}")]
    UnknownEvidenceReference(String),
    #[error("unknown actor evidence target: {0}")]
    UnknownActorEvidenceReference(String),
    #[error("actor evidence requires an explicit subject actor key")]
    MissingActorKey,
}

fn normalize_key(value: &str) -> String {
    value.trim().to_lowercase()
}

fn unique_in_order(values: impl IntoIterator<Item = String>) -> Vec<String> {
    let mut seen = BTreeSet::new();
    values
        .into_iter()
        .filter(|value| !value.is_empty() && seen.insert(value.clone()))
        .collect()
}

fn latest_observed_at<'a>(
    refs: impl IntoIterator<Item = &'a String>,
    evidence: &BTreeMap<String, ProfileEvidenceMeta>,
) -> Option<String> {
    refs.into_iter()
        .filter_map(|id| evidence.get(id))
        .filter_map(|meta| meta.observed_at.as_ref())
        .max()
        .cloned()
}

fn attribution_rank(status: &AttributionStatus) -> u8 {
    match status {
        AttributionStatus::RepositoryOnly => 0,
        AttributionStatus::IdentityLinked => 1,
        AttributionStatus::UserConfirmed => 2,
        AttributionStatus::AgencySupported => 3,
    }
}

fn relation_status(relation: &str) -> AttributionStatus {
    match relation {
        "manual-confirmation" => AttributionStatus::UserConfirmed,
        "reviewed-change"
        | "decision-record"
        | "design-session"
        | "debug-session"
        | "test-session"
        | "maintenance-session"
        | "agent-direction" => AttributionStatus::AgencySupported,
        "authored-change" | "coauthored-change" => AttributionStatus::IdentityLinked,
        _ => AttributionStatus::RepositoryOnly,
    }
}

fn summarize_attribution(
    refs: &[String],
    evidence: &BTreeMap<String, ProfileEvidenceMeta>,
) -> CapabilityAttribution {
    let mut status = AttributionStatus::RepositoryOnly;
    let mut actor_evidence_refs = BTreeSet::new();
    let mut actor_relations = BTreeSet::new();
    let mut implementation_origins = BTreeSet::new();

    for id in refs {
        let Some(meta) = evidence.get(id) else {
            continue;
        };
        let Some(relation) = meta.actor_relation.as_deref() else {
            continue;
        };
        let relation_level = relation_status(relation);
        if attribution_rank(&relation_level) == 0 {
            continue;
        }

        actor_evidence_refs.insert(id.clone());
        actor_relations.insert(relation.to_string());
        let origin = meta.implementation_origin.as_deref().unwrap_or("unknown");
        implementation_origins.insert(match origin {
            "human" | "ai-assisted" | "mixed" | "unknown" => origin.to_string(),
            _ => "unknown".to_string(),
        });

        if attribution_rank(&relation_level) > attribution_rank(&status) {
            status = relation_level;
        }
    }

    CapabilityAttribution {
        status,
        actor_evidence_refs: actor_evidence_refs.into_iter().collect(),
        actor_relations: actor_relations.into_iter().collect(),
        implementation_origins: implementation_origins.into_iter().collect(),
    }
}

fn summarize_actor_evidence(
    actor_key: &str,
    capability_key: &str,
    support_evidence_refs: &[String],
    supporting_repositories: &[String],
    actor_evidence: &[ActorEvidence],
) -> CapabilityAttribution {
    let repositories = supporting_repositories.iter().collect::<BTreeSet<_>>();
    let mut status = AttributionStatus::RepositoryOnly;
    let mut actor_evidence_refs = BTreeSet::new();
    let mut actor_relations = BTreeSet::new();
    let mut implementation_origins = BTreeSet::new();

    for record in actor_evidence {
        if record.actor_key != actor_key
            || !repositories.contains(&record.repository)
            || !actor_evidence_applies_to(record, capability_key, support_evidence_refs)
        {
            continue;
        }

        let relation = record.relation.as_str();
        let relation_level = relation_status(relation);
        if attribution_rank(&relation_level) == 0 {
            continue;
        }
        actor_evidence_refs.insert(record.id.clone());
        actor_relations.insert(relation.to_string());
        implementation_origins.insert(record.implementation_origin.as_str().to_string());
        if attribution_rank(&relation_level) > attribution_rank(&status) {
            status = relation_level;
        }
    }

    CapabilityAttribution {
        status,
        actor_evidence_refs: actor_evidence_refs.into_iter().collect(),
        actor_relations: actor_relations.into_iter().collect(),
        implementation_origins: implementation_origins.into_iter().collect(),
    }
}

pub fn build_developer_profile(
    developer: BTreeMap<String, String>,
    repositories: Vec<String>,
    semantic_claims: Vec<SemanticClaim>,
    evidence: &BTreeMap<String, ProfileEvidenceMeta>,
) -> Result<DeveloperProfile, ProfileError> {
    build_developer_profile_with_actor_evidence(
        developer,
        repositories,
        semantic_claims,
        evidence,
        "",
        &[],
    )
}

pub fn build_developer_profile_with_actor_evidence(
    developer: BTreeMap<String, String>,
    repositories: Vec<String>,
    semantic_claims: Vec<SemanticClaim>,
    evidence: &BTreeMap<String, ProfileEvidenceMeta>,
    actor_key: &str,
    actor_evidence: &[ActorEvidence],
) -> Result<DeveloperProfile, ProfileError> {
    let actor_key = actor_key.trim();
    if !actor_evidence.is_empty() && actor_key.is_empty() {
        return Err(ProfileError::MissingActorKey);
    }
    for record in actor_evidence {
        for evidence_ref in &record.target_evidence_refs {
            if !evidence.contains_key(evidence_ref) {
                return Err(ProfileError::UnknownActorEvidenceReference(
                    evidence_ref.clone(),
                ));
            }
        }
    }

    let mut groups: BTreeMap<String, Vec<SemanticClaim>> = BTreeMap::new();

    for claim in semantic_claims {
        for evidence_ref in &claim.evidence_refs {
            if !evidence.contains_key(evidence_ref) {
                return Err(ProfileError::UnknownEvidenceReference(evidence_ref.clone()));
            }
        }
        let key = normalize_key(&claim.skill);
        if !key.is_empty() {
            groups.entry(key).or_default().push(claim);
        }
    }

    let mut skills = Vec::new();
    for (key, mut claims) in groups {
        claims.sort_by(|a, b| {
            b.confidence
                .partial_cmp(&a.confidence)
                .unwrap_or(std::cmp::Ordering::Equal)
                .then_with(|| a.repository.cmp(&b.repository))
        });

        let supporting: Vec<&SemanticClaim> = claims
            .iter()
            .filter(|claim| claim.stance == ClaimStance::Support)
            .collect();
        let contradicting: Vec<SemanticClaim> = claims
            .iter()
            .filter(|claim| claim.stance == ClaimStance::Contradict)
            .cloned()
            .collect();

        let support_refs = unique_in_order(
            supporting
                .iter()
                .flat_map(|claim| claim.evidence_refs.iter().cloned()),
        );
        let all_refs = unique_in_order(claims.iter().flat_map(|claim| claim.evidence_refs.clone()));
        let supporting_repositories =
            unique_in_order(supporting.iter().map(|claim| claim.repository.clone()));

        let mut diversity: BTreeSet<String> = BTreeSet::new();
        let mut stale_evidence_refs = Vec::new();
        for id in &support_refs {
            if let Some(meta) = evidence.get(id) {
                diversity.insert(meta.kind.clone());
            }
        }
        for id in &all_refs {
            if evidence.get(id).is_some_and(|meta| meta.stale) {
                stale_evidence_refs.push(id.clone());
            }
        }

        let stale_claim_count = claims
            .iter()
            .filter(|claim| {
                claim.stale
                    || claim
                        .evidence_refs
                        .iter()
                        .any(|id| evidence.get(id).is_some_and(|meta| meta.stale))
            })
            .count();

        let label = supporting
            .first()
            .map(|claim| claim.skill.clone())
            .or_else(|| claims.first().map(|claim| claim.skill.clone()))
            .unwrap_or_else(|| key.clone());
        let attribution = if actor_key.is_empty() {
            summarize_attribution(&support_refs, evidence)
        } else {
            summarize_actor_evidence(
                actor_key,
                &key,
                &support_refs,
                &supporting_repositories,
                actor_evidence,
            )
        };

        skills.push(CapabilityProfile {
            key,
            label,
            support_count: support_refs.len(),
            repository_count: supporting_repositories.len(),
            repositories: supporting_repositories,
            evidence_diversity: diversity.into_iter().collect(),
            latest_evidence_at: latest_observed_at(support_refs.iter(), evidence),
            attribution,
            strongest_confidence: supporting.iter().find_map(|claim| claim.confidence),
            evidence_refs: all_refs,
            support_evidence_refs: support_refs,
            stale_evidence_refs,
            stale_claim_count,
            contradictions: contradicting,
            semantic_claims: claims,
        });
    }

    skills.sort_by(|a, b| a.label.cmp(&b.label));

    Ok(DeveloperProfile {
        schema: DEVELOPER_PROFILE_SCHEMA.to_string(),
        developer,
        repositories,
        skills,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn claim(repo: &str, evidence_ref: &str, confidence: f64) -> SemanticClaim {
        SemanticClaim {
            skill: "TypeScript".into(),
            repository: repo.into(),
            evidence_refs: vec![evidence_ref.into()],
            confidence: Some(confidence),
            stance: ClaimStance::Support,
            stale: false,
            reason: None,
        }
    }

    #[test]
    fn aggregates_cross_repository_dimensions_without_expertise_score() {
        let evidence = BTreeMap::from([
            (
                "a".into(),
                ProfileEvidenceMeta {
                    kind: "source".into(),
                    observed_at: Some("2026-09-20T10:00:00.000Z".into()),
                    stale: false,
                    actor_relation: Some("agent-direction".into()),
                    implementation_origin: Some("ai-assisted".into()),
                },
            ),
            (
                "b".into(),
                ProfileEvidenceMeta {
                    kind: "test".into(),
                    observed_at: Some("2026-09-22T12:00:00.000Z".into()),
                    stale: false,
                    actor_relation: Some("test-session".into()),
                    implementation_origin: Some("mixed".into()),
                },
            ),
            (
                "old".into(),
                ProfileEvidenceMeta {
                    kind: "documentation".into(),
                    observed_at: Some("2026-08-01T09:00:00.000Z".into()),
                    stale: true,
                    actor_relation: None,
                    implementation_origin: None,
                },
            ),
            (
                "c".into(),
                ProfileEvidenceMeta {
                    kind: "manifest".into(),
                    observed_at: Some("2026-09-21T08:00:00.000Z".into()),
                    stale: false,
                    actor_relation: None,
                    implementation_origin: None,
                },
            ),
        ]);
        let mut claims = vec![
            claim("repo-a", "a", 0.91),
            claim("repo-b", "b", 0.82),
            claim("repo-old", "old", 0.77),
        ];
        claims.push(SemanticClaim {
            skill: "TypeScript".into(),
            repository: "repo-c".into(),
            evidence_refs: vec!["c".into()],
            confidence: Some(0.8),
            stance: ClaimStance::Contradict,
            stale: false,
            reason: Some("bounded contradiction".into()),
        });

        let profile = build_developer_profile(
            BTreeMap::from([("username".into(), "dev".into())]),
            vec!["repo-a".into(), "repo-b".into(), "repo-c".into()],
            claims,
            &evidence,
        )
        .unwrap();

        let skill = &profile.skills[0];
        assert_eq!(profile.schema, DEVELOPER_PROFILE_SCHEMA);
        assert_eq!(skill.repository_count, 3);
        assert_eq!(
            skill.evidence_diversity,
            vec!["documentation", "source", "test"]
        );
        assert_eq!(
            skill.latest_evidence_at.as_deref(),
            Some("2026-09-22T12:00:00.000Z")
        );
        assert_eq!(skill.stale_claim_count, 1);
        assert_eq!(skill.stale_evidence_refs, vec!["old"]);
        assert_eq!(skill.contradictions.len(), 1);
        assert_eq!(skill.attribution.status, AttributionStatus::AgencySupported);
        assert_eq!(
            skill.attribution.actor_relations,
            vec!["agent-direction", "test-session"]
        );
        assert_eq!(
            skill.attribution.implementation_origins,
            vec!["ai-assisted", "mixed"]
        );
    }

    #[test]
    fn serialized_profile_matches_shared_v1_schema_fixture() {
        let schema: serde_json::Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/developer-profile-v1-schema.json"
        ))
        .unwrap();
        let evidence = BTreeMap::from([(
            "a".into(),
            ProfileEvidenceMeta {
                kind: "source".into(),
                observed_at: Some("2026-09-20T10:00:00.000Z".into()),
                stale: false,
                actor_relation: Some("authored-change".into()),
                implementation_origin: None,
            },
        )]);
        let profile = build_developer_profile(
            BTreeMap::new(),
            vec!["repo-a".into()],
            vec![claim("repo-a", "a", 0.9)],
            &evidence,
        )
        .unwrap();
        let value = serde_json::to_value(profile).unwrap();
        for field in schema["profileFields"].as_array().unwrap() {
            assert!(
                value.get(field.as_str().unwrap()).is_some(),
                "missing profile field {field}"
            );
        }
        let skill = &value["skills"][0];
        for field in schema["skillFields"].as_array().unwrap() {
            assert!(
                skill.get(field.as_str().unwrap()).is_some(),
                "missing skill field {field}"
            );
        }
        let attribution = &skill["attribution"];
        for field in schema["attributionFields"].as_array().unwrap() {
            assert!(
                attribution.get(field.as_str().unwrap()).is_some(),
                "missing attribution field {field}"
            );
        }
    }

    #[test]
    fn rejects_unknown_evidence_reference() {
        let error = build_developer_profile(
            BTreeMap::new(),
            vec![],
            vec![claim("repo-a", "missing", 0.9)],
            &BTreeMap::new(),
        )
        .unwrap_err();

        assert_eq!(
            error,
            ProfileError::UnknownEvidenceReference("missing".into())
        );
    }
}
