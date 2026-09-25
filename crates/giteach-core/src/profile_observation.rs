use thiserror::Error;

use crate::{
    AttributionStatus, DEVELOPER_PROFILE_SCHEMA, DEVELOPMENT_TENDENCIES_SCHEMA, DeveloperProfile,
    DevelopmentTendencies, ProfileObservationSourceClass, ProfileObservationStance,
    ProfileObservedSignal,
};

#[derive(Debug, Error, PartialEq, Eq)]
pub enum ProfileObservationAdapterError {
    #[error("expected {0}")]
    InvalidSchema(&'static str),
    #[error("development tendency observation requires deterministic key/label input")]
    InvalidTendency,
    #[error("development tendency {0} has no evidence refs")]
    MissingEvidence(String),
    #[error("expected {0}")]
    InvalidDeveloperProfile(&'static str),
    #[error("developer profile capability requires non-empty key and label")]
    InvalidCapability,
}

pub fn development_tendencies_to_profile_observations(
    tendencies: &DevelopmentTendencies,
) -> Result<Vec<ProfileObservedSignal>, ProfileObservationAdapterError> {
    if tendencies.schema != DEVELOPMENT_TENDENCIES_SCHEMA {
        return Err(ProfileObservationAdapterError::InvalidSchema(
            DEVELOPMENT_TENDENCIES_SCHEMA,
        ));
    }

    tendencies
        .tendencies
        .iter()
        .map(|tendency| {
            let key = tendency.key.trim();
            let label = tendency.label.trim();
            if key.is_empty() || label.is_empty() || !tendency.deterministic {
                return Err(ProfileObservationAdapterError::InvalidTendency);
            }
            let mut evidence_refs = tendency
                .evidence_refs
                .iter()
                .map(|value| value.trim().to_string())
                .filter(|value| !value.is_empty())
                .collect::<Vec<_>>();
            evidence_refs.sort();
            evidence_refs.dedup();
            if evidence_refs.is_empty() {
                return Err(ProfileObservationAdapterError::MissingEvidence(
                    key.to_string(),
                ));
            }

            Ok(ProfileObservedSignal {
                key: key.to_string(),
                label: label.to_string(),
                stance: ProfileObservationStance::Support,
                source_class: ProfileObservationSourceClass::CrossProjectTendency,
                evidence_refs,
            })
        })
        .collect()
}
fn unique_sorted(values: impl IntoIterator<Item = String>) -> Vec<String> {
    let mut values = values
        .into_iter()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .collect::<Vec<_>>();
    values.sort();
    values.dedup();
    values
}

fn observation_identity(item: &ProfileObservedSignal) -> String {
    let stance = match item.stance {
        ProfileObservationStance::Support => "support",
        ProfileObservationStance::Contradict => "contradict",
    };
    let source_class = match item.source_class {
        ProfileObservationSourceClass::RepositoryFact => "repository-fact",
        ProfileObservationSourceClass::CrossProjectTendency => "cross-project-tendency",
        ProfileObservationSourceClass::SemanticObservation => "semantic-observation",
        ProfileObservationSourceClass::ActorEvidence => "actor-evidence",
    };
    format!(
        "{}\0{}\0{}\0{}",
        item.key,
        stance,
        source_class,
        item.evidence_refs.join("\n")
    )
}

pub fn developer_profile_to_profile_observations(
    profile: &DeveloperProfile,
) -> Result<Vec<ProfileObservedSignal>, ProfileObservationAdapterError> {
    if profile.schema != DEVELOPER_PROFILE_SCHEMA {
        return Err(ProfileObservationAdapterError::InvalidDeveloperProfile(
            DEVELOPER_PROFILE_SCHEMA,
        ));
    }

    let mut observations = Vec::new();
    for capability in &profile.skills {
        let key = capability.key.trim();
        let label = capability.label.trim();
        if key.is_empty() || label.is_empty() {
            return Err(ProfileObservationAdapterError::InvalidCapability);
        }

        let support_refs = unique_sorted(capability.support_evidence_refs.clone());
        let actor_refs = unique_sorted(capability.attribution.actor_evidence_refs.clone());
        let actor_linked = !actor_refs.is_empty()
            && capability.attribution.status != AttributionStatus::RepositoryOnly;
        if !support_refs.is_empty() || !actor_refs.is_empty() {
            let evidence_refs = if actor_linked {
                unique_sorted(
                    support_refs
                        .iter()
                        .cloned()
                        .chain(actor_refs.iter().cloned()),
                )
            } else {
                support_refs
            };
            if !evidence_refs.is_empty() {
                observations.push(ProfileObservedSignal {
                    key: key.to_string(),
                    label: label.to_string(),
                    stance: ProfileObservationStance::Support,
                    source_class: if actor_linked {
                        ProfileObservationSourceClass::ActorEvidence
                    } else {
                        ProfileObservationSourceClass::SemanticObservation
                    },
                    evidence_refs,
                });
            }
        }

        let contradiction_refs = unique_sorted(
            capability
                .contradictions
                .iter()
                .flat_map(|claim| claim.evidence_refs.iter().cloned()),
        );
        if !contradiction_refs.is_empty() {
            observations.push(ProfileObservedSignal {
                key: key.to_string(),
                label: label.to_string(),
                stance: ProfileObservationStance::Contradict,
                source_class: ProfileObservationSourceClass::SemanticObservation,
                evidence_refs: contradiction_refs,
            });
        }
    }
    Ok(observations)
}

pub fn build_profile_observations(
    developer_profile: Option<&DeveloperProfile>,
    development_tendencies: Option<&DevelopmentTendencies>,
    extra_observations: &[ProfileObservedSignal],
) -> Result<Vec<ProfileObservedSignal>, ProfileObservationAdapterError> {
    let mut observations = Vec::new();
    if let Some(profile) = developer_profile {
        observations.extend(developer_profile_to_profile_observations(profile)?);
    }
    if let Some(tendencies) = development_tendencies {
        observations.extend(development_tendencies_to_profile_observations(tendencies)?);
    }
    observations.extend(extra_observations.iter().cloned());

    observations.sort_by_key(observation_identity);
    observations.dedup_by(|a, b| observation_identity(a) == observation_identity(b));
    Ok(observations)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::DevelopmentTendency;

    fn tendencies() -> DevelopmentTendencies {
        DevelopmentTendencies {
            schema: DEVELOPMENT_TENDENCIES_SCHEMA.to_string(),
            analyzed_repository_count: 2,
            minimum_repositories: 2,
            tendencies: vec![DevelopmentTendency {
                key: "automation".into(),
                label: "Automation".into(),
                repository_count: 2,
                analyzed_repository_count: 2,
                prevalence: 1.0,
                repositories: vec!["kode".into(), "giteach".into()],
                evidence_refs: vec!["ev-b".into(), "ev-a".into(), "ev-a".into()],
                evidence_kinds: vec!["tooling".into()],
                deterministic: true,
            }],
        }
    }

    #[test]
    fn maps_deterministic_tendencies_to_cross_project_observations() {
        let observations = development_tendencies_to_profile_observations(&tendencies()).unwrap();
        assert_eq!(observations.len(), 1);
        assert_eq!(observations[0].key, "automation");
        assert_eq!(observations[0].label, "Automation");
        assert_eq!(
            observations[0].source_class,
            ProfileObservationSourceClass::CrossProjectTendency
        );
        assert_eq!(observations[0].stance, ProfileObservationStance::Support);
        assert_eq!(observations[0].evidence_refs, vec!["ev-a", "ev-b"]);
    }

    #[test]
    fn rejects_non_deterministic_or_unproven_tendencies() {
        let mut input = tendencies();
        input.tendencies[0].deterministic = false;
        assert_eq!(
            development_tendencies_to_profile_observations(&input).unwrap_err(),
            ProfileObservationAdapterError::InvalidTendency
        );

        let mut input = tendencies();
        input.tendencies[0].evidence_refs.clear();
        assert_eq!(
            development_tendencies_to_profile_observations(&input).unwrap_err(),
            ProfileObservationAdapterError::MissingEvidence("automation".into())
        );
    }

    fn developer_profile() -> DeveloperProfile {
        serde_json::from_value(serde_json::json!({
            "schema": DEVELOPER_PROFILE_SCHEMA,
            "developer": {"username": "mauro3422"},
            "repositories": ["kode"],
            "skills": [{
                "key": "rust",
                "label": "Rust",
                "supportCount": 2,
                "repositoryCount": 1,
                "repositories": ["kode"],
                "evidenceDiversity": ["source"],
                "latestEvidenceAt": null,
                "attribution": {
                    "status": "identity-linked",
                    "actorEvidenceRefs": ["actor-git-1"],
                    "actorRelations": ["authored-change"],
                    "implementationOrigins": ["unknown"]
                },
                "strongestConfidence": 0.9,
                "evidenceRefs": ["ev-rust-1", "ev-rust-2"],
                "supportEvidenceRefs": ["ev-rust-2", "ev-rust-1"],
                "staleEvidenceRefs": [],
                "staleClaimCount": 0,
                "contradictions": [{
                    "skill": "Rust",
                    "repository": "kode",
                    "evidenceRefs": ["ev-rust-conflict"],
                    "confidence": 0.2,
                    "stance": "contradict",
                    "stale": false,
                    "reason": "bounded conflicting evidence"
                }],
                "semanticClaims": []
            }]
        }))
        .unwrap()
    }

    #[test]
    fn maps_developer_profile_support_and_contradiction_to_reconciliation_observations() {
        let observations = developer_profile_to_profile_observations(&developer_profile()).unwrap();
        assert_eq!(observations.len(), 2);
        let support = observations
            .iter()
            .find(|item| item.stance == ProfileObservationStance::Support)
            .unwrap();
        assert_eq!(
            support.source_class,
            ProfileObservationSourceClass::ActorEvidence
        );
        assert_eq!(
            support.evidence_refs,
            vec!["actor-git-1", "ev-rust-1", "ev-rust-2"]
        );
        let contradiction = observations
            .iter()
            .find(|item| item.stance == ProfileObservationStance::Contradict)
            .unwrap();
        assert_eq!(
            contradiction.source_class,
            ProfileObservationSourceClass::SemanticObservation
        );
        assert_eq!(contradiction.evidence_refs, vec!["ev-rust-conflict"]);
    }

    #[test]
    fn combines_profile_and_tendency_observations_without_duplicate_tendency_records() {
        let tendency_observations =
            development_tendencies_to_profile_observations(&tendencies()).unwrap();
        let observations = build_profile_observations(
            Some(&developer_profile()),
            Some(&tendencies()),
            &tendency_observations,
        )
        .unwrap();
        assert_eq!(
            observations
                .iter()
                .filter(|item| item.key == "automation")
                .count(),
            1
        );
        assert!(observations.iter().any(|item| item.key == "rust"));
    }
}
