use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::{AttributionStatus, CapabilityAttribution, ClaimStance, DeveloperProfile};

pub const DOCUMENT_INPUT_SCHEMA: &str = "giteach-document-input-v1";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum DocumentTarget {
    GithubProfileReadme,
    ProjectReadmeSummary,
    PortfolioCard,
    LinkedinProject,
    LinkedinSkills,
    CvEvidence,
}

impl DocumentTarget {
    fn is_personal(&self) -> bool {
        !matches!(self, Self::ProjectReadmeSummary)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DocumentEvidenceSource {
    pub id: String,
    pub repo: String,
    pub path: String,
    pub kind: String,
    pub subject: Option<String>,
    pub commit: Option<String>,
    pub source_hash: Option<String>,
    pub excerpt_hash: Option<String>,
    pub observed_at: Option<String>,
    pub actor_relation: Option<String>,
    pub implementation_origin: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DocumentSupportingStatement {
    pub repository: String,
    pub reason: Option<String>,
    pub evidence_refs: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DocumentCautions {
    pub has_stale_evidence: bool,
    pub stale_evidence_refs: Vec<String>,
    pub has_contradictions: bool,
    pub contradiction_count: usize,
    pub personal_attribution_missing: bool,
    pub identity_only: bool,
    pub ai_assistance_observed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DocumentClaim {
    pub key: String,
    pub label: String,
    pub repositories: Vec<String>,
    pub evidence_diversity: Vec<String>,
    pub latest_evidence_at: Option<String>,
    pub attribution: CapabilityAttribution,
    pub evidence_refs: Vec<String>,
    pub evidence: Vec<DocumentEvidenceSource>,
    pub supporting_statements: Vec<DocumentSupportingStatement>,
    pub cautions: DocumentCautions,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DocumentInput {
    pub schema: String,
    pub target: DocumentTarget,
    pub developer: BTreeMap<String, String>,
    pub repositories: Vec<String>,
    pub claims: Vec<DocumentClaim>,
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum DocumentError {
    #[error("unknown evidence reference: {0}")]
    UnknownEvidenceReference(String),
}

pub fn prepare_document_input(
    profile: &DeveloperProfile,
    evidence: &BTreeMap<String, DocumentEvidenceSource>,
    target: DocumentTarget,
) -> Result<DocumentInput, DocumentError> {
    let personal_target = target.is_personal();
    let mut claims = Vec::new();

    for skill in &profile.skills {
        if skill.support_evidence_refs.is_empty() {
            continue;
        }
        if personal_target && skill.attribution.status == AttributionStatus::RepositoryOnly {
            continue;
        }

        let mut resolved = Vec::new();
        for evidence_ref in &skill.support_evidence_refs {
            let Some(record) = evidence.get(evidence_ref) else {
                return Err(DocumentError::UnknownEvidenceReference(
                    evidence_ref.clone(),
                ));
            };
            resolved.push(record.clone());
        }

        let supporting_statements = skill
            .semantic_claims
            .iter()
            .filter(|claim| claim.stance == ClaimStance::Support)
            .map(|claim| DocumentSupportingStatement {
                repository: claim.repository.clone(),
                reason: claim.reason.clone(),
                evidence_refs: claim.evidence_refs.clone(),
            })
            .collect();

        let ai_assistance_observed = skill
            .attribution
            .implementation_origins
            .iter()
            .any(|origin| origin == "ai-assisted" || origin == "mixed");

        claims.push(DocumentClaim {
            key: skill.key.clone(),
            label: skill.label.clone(),
            repositories: skill.repositories.clone(),
            evidence_diversity: skill.evidence_diversity.clone(),
            latest_evidence_at: skill.latest_evidence_at.clone(),
            attribution: skill.attribution.clone(),
            evidence_refs: skill.support_evidence_refs.clone(),
            evidence: resolved,
            supporting_statements,
            cautions: DocumentCautions {
                has_stale_evidence: !skill.stale_evidence_refs.is_empty(),
                stale_evidence_refs: skill.stale_evidence_refs.clone(),
                has_contradictions: !skill.contradictions.is_empty(),
                contradiction_count: skill.contradictions.len(),
                personal_attribution_missing: skill.attribution.status
                    == AttributionStatus::RepositoryOnly,
                identity_only: skill.attribution.status == AttributionStatus::IdentityLinked,
                ai_assistance_observed,
            },
        });
    }

    Ok(DocumentInput {
        schema: DOCUMENT_INPUT_SCHEMA.to_string(),
        target,
        developer: profile.developer.clone(),
        repositories: profile.repositories.clone(),
        claims,
    })
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use crate::{ClaimStance, ProfileEvidenceMeta, SemanticClaim, build_developer_profile};

    use super::*;

    fn source(
        id: &str,
        actor_relation: Option<&str>,
        implementation_origin: Option<&str>,
    ) -> DocumentEvidenceSource {
        DocumentEvidenceSource {
            id: id.into(),
            repo: "kode".into(),
            path: "src/core/editor.ts".into(),
            kind: "source".into(),
            subject: Some("Editor kernel integration".into()),
            commit: Some("abc123".into()),
            source_hash: Some("source-hash".into()),
            excerpt_hash: Some("excerpt-hash".into()),
            observed_at: Some("2026-09-22T10:00:00.000Z".into()),
            actor_relation: actor_relation.map(str::to_string),
            implementation_origin: implementation_origin.map(str::to_string),
        }
    }

    fn profile(
        actor_relation: Option<&str>,
        implementation_origin: Option<&str>,
    ) -> DeveloperProfile {
        let evidence = BTreeMap::from([
            (
                "support".into(),
                ProfileEvidenceMeta {
                    kind: "source".into(),
                    observed_at: Some("2026-09-22T10:00:00.000Z".into()),
                    stale: false,
                    actor_relation: actor_relation.map(str::to_string),
                    implementation_origin: implementation_origin.map(str::to_string),
                },
            ),
            (
                "contradiction".into(),
                ProfileEvidenceMeta {
                    kind: "documentation".into(),
                    observed_at: Some("2026-09-20T10:00:00.000Z".into()),
                    stale: false,
                    actor_relation: None,
                    implementation_origin: None,
                },
            ),
        ]);

        build_developer_profile(
            BTreeMap::from([("username".into(), "mauro3422".into())]),
            vec!["kode".into(), "legacy".into()],
            vec![
                SemanticClaim {
                    skill: "TypeScript".into(),
                    repository: "kode".into(),
                    evidence_refs: vec!["support".into()],
                    confidence: Some(0.92),
                    stance: ClaimStance::Support,
                    stale: false,
                    reason: Some("Typed editor integration is directly evidenced.".into()),
                },
                SemanticClaim {
                    skill: "TypeScript".into(),
                    repository: "legacy".into(),
                    evidence_refs: vec!["contradiction".into()],
                    confidence: Some(0.8),
                    stance: ClaimStance::Contradict,
                    stale: false,
                    reason: Some("Legacy note does not support the bounded claim.".into()),
                },
            ],
            &evidence,
        )
        .unwrap()
    }

    #[test]
    fn prepares_bounded_personal_document_input_with_agency_attribution() {
        let profile = profile(Some("agent-direction"), Some("ai-assisted"));
        let sources = BTreeMap::from([(
            "support".into(),
            source("support", Some("agent-direction"), Some("ai-assisted")),
        )]);
        let input =
            prepare_document_input(&profile, &sources, DocumentTarget::PortfolioCard).unwrap();

        assert_eq!(input.schema, DOCUMENT_INPUT_SCHEMA);
        assert_eq!(input.claims.len(), 1);
        assert_eq!(
            input.claims[0].attribution.status,
            AttributionStatus::AgencySupported
        );
        assert_eq!(input.claims[0].evidence_refs, vec!["support"]);
        assert!(input.claims[0].cautions.has_contradictions);
        assert!(input.claims[0].cautions.ai_assistance_observed);

        let json = serde_json::to_value(input).unwrap();
        let evidence = &json["claims"][0]["evidence"][0];
        assert!(evidence.get("excerpt").is_none());
        assert!(evidence.get("metadata").is_none());
        assert_eq!(evidence["actorRelation"], "agent-direction");
    }

    #[test]
    fn repository_only_claim_is_project_visible_but_not_personal() {
        let profile = profile(None, None);
        let sources = BTreeMap::from([("support".into(), source("support", None, None))]);

        let project =
            prepare_document_input(&profile, &sources, DocumentTarget::ProjectReadmeSummary)
                .unwrap();
        assert_eq!(project.claims.len(), 1);
        assert!(project.claims[0].cautions.personal_attribution_missing);

        let personal =
            prepare_document_input(&profile, &sources, DocumentTarget::GithubProfileReadme)
                .unwrap();
        assert!(personal.claims.is_empty());
    }

    #[test]
    fn fails_closed_when_support_evidence_cannot_resolve() {
        let error = prepare_document_input(
            &profile(Some("agent-direction"), Some("ai-assisted")),
            &BTreeMap::new(),
            DocumentTarget::CvEvidence,
        )
        .unwrap_err();

        assert_eq!(
            error,
            DocumentError::UnknownEvidenceReference("support".into())
        );
    }

    #[test]
    fn serialized_document_input_matches_shared_v1_schema_fixture() {
        let schema: serde_json::Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/document-input-v1-schema.json"
        ))
        .unwrap();
        let profile = profile(Some("agent-direction"), Some("ai-assisted"));
        let sources = BTreeMap::from([(
            "support".into(),
            source("support", Some("agent-direction"), Some("ai-assisted")),
        )]);
        let input = prepare_document_input(&profile, &sources, DocumentTarget::GithubProfileReadme)
            .unwrap();
        let value = serde_json::to_value(input).unwrap();

        for field in schema["topLevelFields"].as_array().unwrap() {
            assert!(
                value.get(field.as_str().unwrap()).is_some(),
                "missing top-level field {field}"
            );
        }
        let claim = &value["claims"][0];
        for field in schema["claimFields"].as_array().unwrap() {
            assert!(
                claim.get(field.as_str().unwrap()).is_some(),
                "missing claim field {field}"
            );
        }
        let attribution = &claim["attribution"];
        for field in schema["attributionFields"].as_array().unwrap() {
            assert!(
                attribution.get(field.as_str().unwrap()).is_some(),
                "missing attribution field {field}"
            );
        }
        let evidence = &claim["evidence"][0];
        for field in schema["evidenceFields"].as_array().unwrap() {
            assert!(
                evidence.get(field.as_str().unwrap()).is_some(),
                "missing evidence field {field}"
            );
        }
        let statement = &claim["supportingStatements"][0];
        for field in schema["supportingStatementFields"].as_array().unwrap() {
            assert!(
                statement.get(field.as_str().unwrap()).is_some(),
                "missing statement field {field}"
            );
        }
        let cautions = &claim["cautions"];
        for field in schema["cautionFields"].as_array().unwrap() {
            assert!(
                cautions.get(field.as_str().unwrap()).is_some(),
                "missing caution field {field}"
            );
        }
    }
}
