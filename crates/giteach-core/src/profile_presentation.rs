use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::{
    PROFILE_PUBLICATION_CONTEXT_SCHEMA, PROFILE_STATISTICS_SCHEMA, ProfilePublicationContext,
    ProfileStatistics, TECHNOLOGY_EVOLUTION_SCHEMA, TechnologyEvolution,
};

pub const PROFILE_PRESENTATION_PAYLOAD_SCHEMA: &str = "giteach-profile-presentation-v1";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProfilePresentationPayload {
    pub schema: String,
    pub actor_key: String,
    pub statistics: ProfileStatistics,
    pub technology_evolution: Vec<TechnologyEvolution>,
    pub publication_context: ProfilePublicationContext,
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum ProfilePresentationError {
    #[error("actorKey is required")]
    MissingActorKey,
    #[error("unsupported profile statistics schema: {0}")]
    UnsupportedStatisticsSchema(String),
    #[error("unsupported technology evolution schema: {0}")]
    UnsupportedTechnologyEvolutionSchema(String),
    #[error("unsupported profile publication context schema: {0}")]
    UnsupportedPublicationSchema(String),
    #[error("profile publication actor does not match presentation actor")]
    ActorMismatch,
    #[error("duplicate technology evolution repository: {0}")]
    DuplicateRepository(String),
}

pub fn prepare_profile_presentation_payload(
    actor_key: &str,
    statistics: &ProfileStatistics,
    technology_evolution: &[TechnologyEvolution],
    publication_context: &ProfilePublicationContext,
) -> Result<ProfilePresentationPayload, ProfilePresentationError> {
    let actor_key = actor_key.trim();
    if actor_key.is_empty() {
        return Err(ProfilePresentationError::MissingActorKey);
    }
    if statistics.schema != PROFILE_STATISTICS_SCHEMA {
        return Err(ProfilePresentationError::UnsupportedStatisticsSchema(
            statistics.schema.clone(),
        ));
    }
    if publication_context.schema != PROFILE_PUBLICATION_CONTEXT_SCHEMA {
        return Err(ProfilePresentationError::UnsupportedPublicationSchema(
            publication_context.schema.clone(),
        ));
    }
    if publication_context.actor_key.trim() != actor_key {
        return Err(ProfilePresentationError::ActorMismatch);
    }

    let mut seen = BTreeSet::new();
    let mut timelines = Vec::with_capacity(technology_evolution.len());
    for item in technology_evolution {
        if item.schema != TECHNOLOGY_EVOLUTION_SCHEMA {
            return Err(
                ProfilePresentationError::UnsupportedTechnologyEvolutionSchema(item.schema.clone()),
            );
        }
        let identity = item.repository.trim().to_lowercase();
        if !seen.insert(identity) {
            return Err(ProfilePresentationError::DuplicateRepository(
                item.repository.clone(),
            ));
        }
        timelines.push(item.clone());
    }
    timelines.sort_by(|a, b| a.repository.cmp(&b.repository));

    Ok(ProfilePresentationPayload {
        schema: PROFILE_PRESENTATION_PAYLOAD_SCHEMA.to_string(),
        actor_key: actor_key.to_string(),
        statistics: statistics.clone(),
        technology_evolution: timelines,
        publication_context: publication_context.clone(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn statistics() -> ProfileStatistics {
        serde_json::from_value(serde_json::json!({
            "schema": PROFILE_STATISTICS_SCHEMA,
            "technology": { "analyzedRepositoryCount": 0, "languages": [], "technologies": [] },
            "tendencies": { "analyzedRepositoryCount": 0, "metrics": [] },
            "domains": { "analyzedRepositoryCount": 0, "metrics": [] },
            "lifecycle": { "analyzedRepositoryCount": 0, "metrics": [] },
            "collaboration": { "analyzedRepositoryCount": 0, "coverage": null, "metrics": [] }
        }))
        .unwrap()
    }

    fn publication(actor: &str) -> ProfilePublicationContext {
        serde_json::from_value(serde_json::json!({
            "schema": PROFILE_PUBLICATION_CONTEXT_SCHEMA,
            "actorKey": actor,
            "declarations": []
        }))
        .unwrap()
    }

    fn evolution(repository: &str, commit: &str) -> TechnologyEvolution {
        serde_json::from_value(serde_json::json!({
            "schema": TECHNOLOGY_EVOLUTION_SCHEMA,
            "repository": repository,
            "source": "git-local-tree",
            "headCommit": commit,
            "commitCount": 1,
            "snapshotCount": 1,
            "sampling": { "strategy": "evenly-spaced-commits-v1", "maxSnapshots": 12, "completeHistory": true },
            "snapshots": [{
                "commit": commit,
                "committedAt": "2026-09-24T10:00:00Z",
                "sourceFileCount": 1,
                "languages": [{ "language": "Rust", "files": 1, "bytes": 100 }]
            }],
            "deterministic": true
        }))
        .unwrap()
    }

    #[test]
    fn composes_planes_without_merging_their_meaning() {
        let payload = prepare_profile_presentation_payload(
            "developer:mauro",
            &statistics(),
            &[evolution("kode", "aaaa"), evolution("GitTeach", "bbbb")],
            &publication("developer:mauro"),
        )
        .unwrap();
        assert_eq!(payload.schema, PROFILE_PRESENTATION_PAYLOAD_SCHEMA);
        assert_eq!(payload.actor_key, "developer:mauro");
        assert_eq!(
            payload
                .technology_evolution
                .iter()
                .map(|item| item.repository.as_str())
                .collect::<Vec<_>>(),
            vec!["GitTeach", "kode"]
        );
        assert!(payload.publication_context.declarations.is_empty());
    }

    #[test]
    fn rejects_actor_mismatch_and_duplicate_history() {
        assert_eq!(
            prepare_profile_presentation_payload(
                "developer:mauro",
                &statistics(),
                &[],
                &publication("developer:other"),
            )
            .unwrap_err(),
            ProfilePresentationError::ActorMismatch
        );

        assert!(matches!(
            prepare_profile_presentation_payload(
                "developer:mauro",
                &statistics(),
                &[evolution("kode", "aaaa"), evolution("KODE", "bbbb")],
                &publication("developer:mauro"),
            ),
            Err(ProfilePresentationError::DuplicateRepository(_))
        ));
    }

    #[test]
    fn serialized_payload_matches_shared_schema_fixture() {
        let payload = prepare_profile_presentation_payload(
            "developer:mauro",
            &statistics(),
            &[],
            &publication("developer:mauro"),
        )
        .unwrap();
        let value = serde_json::to_value(payload).unwrap();
        let schema: serde_json::Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/profile-presentation-v1-schema.json"
        ))
        .unwrap();
        for field in schema["fields"].as_array().unwrap() {
            assert!(
                value.get(field.as_str().unwrap()).is_some(),
                "missing presentation field {field}"
            );
        }
    }
}
