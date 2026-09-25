use serde::{Deserialize, Serialize};
use thiserror::Error;

pub const ACTOR_EVIDENCE_SCHEMA: &str = "giteach-actor-evidence-v1";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum ActorRelation {
    AuthoredChange,
    CoauthoredChange,
    ReviewedChange,
    DecisionRecord,
    DesignSession,
    DebugSession,
    TestSession,
    MaintenanceSession,
    AgentDirection,
    ManualConfirmation,
}

impl ActorRelation {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::AuthoredChange => "authored-change",
            Self::CoauthoredChange => "coauthored-change",
            Self::ReviewedChange => "reviewed-change",
            Self::DecisionRecord => "decision-record",
            Self::DesignSession => "design-session",
            Self::DebugSession => "debug-session",
            Self::TestSession => "test-session",
            Self::MaintenanceSession => "maintenance-session",
            Self::AgentDirection => "agent-direction",
            Self::ManualConfirmation => "manual-confirmation",
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum ImplementationOrigin {
    Human,
    AiAssisted,
    Mixed,
    #[default]
    Unknown,
}

impl ImplementationOrigin {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Human => "human",
            Self::AiAssisted => "ai-assisted",
            Self::Mixed => "mixed",
            Self::Unknown => "unknown",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum ActorEvidenceSourceKind {
    Git,
    Github,
    DesignArtifact,
    WorkSession,
    AgentWorkflow,
    Manual,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ActorEvidence {
    pub schema: String,
    pub id: String,
    pub actor_key: String,
    pub relation: ActorRelation,
    pub repository: String,
    pub source_kind: ActorEvidenceSourceKind,
    pub source_ref: String,
    pub observed_at: String,
    pub implementation_origin: ImplementationOrigin,
    #[serde(default)]
    pub capability_keys: Vec<String>,
    #[serde(default)]
    pub target_evidence_refs: Vec<String>,
    pub summary: Option<String>,
    pub source_hash: Option<String>,
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum ActorEvidenceError {
    #[error("actor evidence schema must be giteach-actor-evidence-v1")]
    InvalidSchema,
    #[error("actor evidence requires non-empty {0}")]
    MissingField(&'static str),
    #[error("actor evidence requires at least one capability key or target evidence ref")]
    MissingAttachment,
    #[error("actor evidence summary exceeds 500 characters")]
    SummaryTooLong,
}

fn normalize(values: &[String]) -> Vec<String> {
    let mut result = values
        .iter()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .collect::<Vec<_>>();
    result.sort();
    result.dedup();
    result
}

pub fn validate_actor_evidence(
    mut evidence: ActorEvidence,
) -> Result<ActorEvidence, ActorEvidenceError> {
    if evidence.schema != ACTOR_EVIDENCE_SCHEMA {
        return Err(ActorEvidenceError::InvalidSchema);
    }
    for (name, value) in [
        ("id", evidence.id.as_str()),
        ("actorKey", evidence.actor_key.as_str()),
        ("repository", evidence.repository.as_str()),
        ("sourceRef", evidence.source_ref.as_str()),
        ("observedAt", evidence.observed_at.as_str()),
    ] {
        if value.trim().is_empty() {
            return Err(ActorEvidenceError::MissingField(name));
        }
    }

    evidence.capability_keys = normalize(&evidence.capability_keys);
    evidence.target_evidence_refs = normalize(&evidence.target_evidence_refs);
    if evidence.capability_keys.is_empty() && evidence.target_evidence_refs.is_empty() {
        return Err(ActorEvidenceError::MissingAttachment);
    }
    if evidence
        .summary
        .as_ref()
        .is_some_and(|summary| summary.chars().count() > 500)
    {
        return Err(ActorEvidenceError::SummaryTooLong);
    }
    Ok(evidence)
}

pub fn actor_evidence_applies_to(
    evidence: &ActorEvidence,
    capability_key: &str,
    support_evidence_refs: &[String],
) -> bool {
    let capability = capability_key.trim().to_lowercase();
    evidence
        .capability_keys
        .iter()
        .any(|key| key.to_lowercase() == capability)
        || evidence.target_evidence_refs.iter().any(|target| {
            support_evidence_refs
                .iter()
                .any(|reference| reference == target)
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> ActorEvidence {
        ActorEvidence {
            schema: ACTOR_EVIDENCE_SCHEMA.into(),
            id: "actor-1".into(),
            actor_key: "developer:local".into(),
            relation: ActorRelation::AgentDirection,
            repository: "kode".into(),
            source_kind: ActorEvidenceSourceKind::AgentWorkflow,
            source_ref: "mssr:trace-123".into(),
            observed_at: "2026-09-23T10:00:00.000Z".into(),
            implementation_origin: ImplementationOrigin::AiAssisted,
            capability_keys: vec!["Editor Kernel".into()],
            target_evidence_refs: vec!["ev-1".into()],
            summary: Some(
                "Directed the change and required verification before acceptance.".into(),
            ),
            source_hash: None,
        }
    }

    #[test]
    fn validates_bounded_actor_evidence() {
        let evidence = validate_actor_evidence(sample()).unwrap();
        assert_eq!(evidence.schema, ACTOR_EVIDENCE_SCHEMA);
        assert_eq!(evidence.relation, ActorRelation::AgentDirection);
        assert_eq!(
            evidence.implementation_origin,
            ImplementationOrigin::AiAssisted
        );
    }

    #[test]
    fn requires_an_attachment_target() {
        let mut evidence = sample();
        evidence.capability_keys.clear();
        evidence.target_evidence_refs.clear();
        assert_eq!(
            validate_actor_evidence(evidence).unwrap_err(),
            ActorEvidenceError::MissingAttachment
        );
    }

    #[test]
    fn applies_by_capability_or_evidence_identity() {
        let evidence = sample();
        assert!(actor_evidence_applies_to(&evidence, "editor kernel", &[]));
        assert!(actor_evidence_applies_to(
            &evidence,
            "other",
            &["ev-1".into()]
        ));
        assert!(!actor_evidence_applies_to(
            &evidence,
            "other",
            &["ev-2".into()]
        ));
    }

    #[test]
    fn serialized_actor_evidence_matches_shared_schema_fixture() {
        let schema: serde_json::Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/actor-evidence-v1-schema.json"
        ))
        .unwrap();
        let value = serde_json::to_value(validate_actor_evidence(sample()).unwrap()).unwrap();
        for field in schema["fields"].as_array().unwrap() {
            assert!(
                value.get(field.as_str().unwrap()).is_some(),
                "missing actor evidence field {field}"
            );
        }
    }
}
