use std::collections::BTreeSet;
use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::{JEV_OBSERVATION_SCHEMA, JevObservation};

pub const JEV_OBSERVATION_STORE_SCHEMA: &str = "giteach-jev-observation-store-v1";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct JevObservationStoreFile {
    pub schema: String,
    pub observations: Vec<JevObservation>,
}

#[derive(Debug, Error)]
pub enum JevObservationStoreError {
    #[error("jev observation store io failure: {0}")]
    Io(#[from] std::io::Error),
    #[error("jev observation store JSON is malformed: {0}")]
    Json(#[from] serde_json::Error),
    #[error("expected {0}")]
    WrongSchema(String),
    #[error("invalid Jev observation persistence identity")]
    InvalidObservation,
}

fn validate_observation(observation: &JevObservation) -> Result<(), JevObservationStoreError> {
    if observation.schema != JEV_OBSERVATION_SCHEMA
        || observation.id.trim().is_empty()
        || observation.repository.name.trim().is_empty()
        || observation.candidate.trim().is_empty()
        || observation.input_fingerprint.trim().is_empty()
    {
        return Err(JevObservationStoreError::InvalidObservation);
    }
    Ok(())
}

pub fn merge_jev_observations(
    existing: &[JevObservation],
    incoming: &[JevObservation],
) -> Result<Vec<JevObservation>, JevObservationStoreError> {
    let mut seen = BTreeSet::new();
    let mut merged = Vec::new();
    for observation in existing.iter().chain(incoming.iter()) {
        validate_observation(observation)?;
        if seen.insert(observation.id.clone()) {
            merged.push(observation.clone());
        }
    }
    Ok(merged)
}

pub fn load_jev_observation_store(
    path: impl AsRef<Path>,
) -> Result<Vec<JevObservation>, JevObservationStoreError> {
    let path = path.as_ref();
    if !path.exists() {
        return Ok(Vec::new());
    }
    let file: JevObservationStoreFile = serde_json::from_slice(&fs::read(path)?)?;
    if file.schema != JEV_OBSERVATION_STORE_SCHEMA {
        return Err(JevObservationStoreError::WrongSchema(
            JEV_OBSERVATION_STORE_SCHEMA.to_string(),
        ));
    }
    merge_jev_observations(&[], &file.observations)
}

pub fn save_jev_observation_store(
    path: impl AsRef<Path>,
    observations: &[JevObservation],
) -> Result<(), JevObservationStoreError> {
    let path = path.as_ref();
    let normalized = merge_jev_observations(&[], observations)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let payload = JevObservationStoreFile {
        schema: JEV_OBSERVATION_STORE_SCHEMA.to_string(),
        observations: normalized,
    };
    let bytes = serde_json::to_vec_pretty(&payload)?;
    let temporary = temporary_path(path);
    fs::write(&temporary, bytes)?;
    if let Err(error) = fs::rename(&temporary, path) {
        if path.exists() {
            fs::remove_file(path)?;
            fs::rename(&temporary, path)?;
        } else {
            return Err(error.into());
        }
    }
    Ok(())
}

pub fn merge_and_save_jev_observations(
    path: impl AsRef<Path>,
    incoming: &[JevObservation],
) -> Result<Vec<JevObservation>, JevObservationStoreError> {
    let path = path.as_ref();
    let merged = merge_jev_observations(&load_jev_observation_store(path)?, incoming)?;
    save_jev_observation_store(path, &merged)?;
    Ok(merged)
}

fn temporary_path(path: &Path) -> PathBuf {
    let mut name = path
        .file_name()
        .map(|value| value.to_string_lossy().into_owned())
        .unwrap_or_else(|| "jev-observations.json".to_string());
    name.push_str(&format!(".tmp-{}", std::process::id()));
    path.with_file_name(name)
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use crate::{JevObservationClaim, JevObservationOutcome, JevRepositoryRef};

    use super::*;

    fn observation(id: &str, input: &str) -> JevObservation {
        JevObservation {
            schema: JEV_OBSERVATION_SCHEMA.into(),
            id: id.into(),
            repository: JevRepositoryRef {
                name: "kode".into(),
                url: None,
            },
            candidate: "Rust".into(),
            contract_schema: "giteach-jev-bounded-v1".into(),
            semantic_context_key: "project-capability-evidence-v1".into(),
            provider_policy_key: "typesafe:test".into(),
            question_hash: "question".into(),
            evidence_fingerprint: "evidence".into(),
            input_fingerprint: input.into(),
            evidence_refs: vec!["ev-1".into()],
            evidence_identity: Vec::new(),
            provider: "typesafe".into(),
            model: Some("jev-test".into()),
            response_id: None,
            observed_at: "2026-09-23T23:00:00.000Z".into(),
            usage: None,
            outcome: JevObservationOutcome {
                status: "supported".into(),
                reason: None,
                claims: vec![JevObservationClaim {
                    skill: "Rust".into(),
                    confidence: 0.9,
                    reason: None,
                    evidence_refs: vec!["ev-1".into()],
                    distribution: None,
                }],
            },
        }
    }

    #[test]
    fn round_trips_observations_across_file_store_instances() {
        let root = tempdir().unwrap();
        let path = root.path().join("observations.json");
        save_jev_observation_store(&path, &[observation("obs-1", "input-1")]).unwrap();
        let loaded = load_jev_observation_store(&path).unwrap();
        assert_eq!(loaded.len(), 1);
        assert_eq!(loaded[0].input_fingerprint, "input-1");
    }

    #[test]
    fn merge_preserves_changed_historical_observations() {
        let merged = merge_jev_observations(
            &[observation("obs-1", "input-1")],
            &[
                observation("obs-1", "input-1"),
                observation("obs-2", "input-2"),
            ],
        )
        .unwrap();
        assert_eq!(
            merged
                .iter()
                .map(|item| item.id.as_str())
                .collect::<Vec<_>>(),
            vec!["obs-1", "obs-2"]
        );
    }

    #[test]
    fn merge_and_save_reloads_prior_history_before_appending() {
        let root = tempdir().unwrap();
        let path = root.path().join("observations.json");
        save_jev_observation_store(&path, &[observation("obs-1", "input-1")]).unwrap();
        let merged =
            merge_and_save_jev_observations(&path, &[observation("obs-2", "input-2")]).unwrap();
        assert_eq!(merged.len(), 2);
        assert_eq!(load_jev_observation_store(&path).unwrap().len(), 2);
    }

    #[test]
    fn serialized_store_matches_shared_schema_fixture() {
        let schema: serde_json::Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/jev-observation-store-v1-schema.json"
        ))
        .unwrap();
        let payload = serde_json::to_value(JevObservationStoreFile {
            schema: JEV_OBSERVATION_STORE_SCHEMA.to_string(),
            observations: vec![observation("obs-1", "input-1")],
        })
        .unwrap();
        for field in schema["storeFields"].as_array().unwrap() {
            assert!(
                payload.get(field.as_str().unwrap()).is_some(),
                "missing store field {field}"
            );
        }
    }
}
