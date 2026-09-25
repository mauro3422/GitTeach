use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};

use crate::DeveloperProfile;

pub const INCREMENTAL_PROFILE_PLAN_SCHEMA: &str = "giteach-incremental-profile-plan-v1";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ReusableSkill {
    pub key: String,
    pub label: String,
    pub evidence_refs: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct InvalidatedSkill {
    pub key: String,
    pub label: String,
    pub missing_evidence_refs: Vec<String>,
    pub retained_evidence_refs: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct IncrementalProfilePlan {
    pub schema: String,
    pub reusable_skills: Vec<ReusableSkill>,
    pub invalidated_skills: Vec<InvalidatedSkill>,
    pub new_evidence_refs: Vec<String>,
    pub removed_evidence_refs: Vec<String>,
    pub requires_semantic_refresh: bool,
    pub requires_discovery: bool,
}

pub fn plan_incremental_profile_update(
    previous_profile: &DeveloperProfile,
    previous_evidence_ids: &BTreeSet<String>,
    current_evidence_ids: &BTreeSet<String>,
) -> IncrementalProfilePlan {
    let mut reusable_skills = Vec::new();
    let mut invalidated_skills = Vec::new();

    for skill in &previous_profile.skills {
        let evidence_refs: BTreeSet<_> = skill.evidence_refs.iter().cloned().collect();
        let missing_evidence_refs: Vec<_> = evidence_refs
            .difference(current_evidence_ids)
            .cloned()
            .collect();
        let retained_evidence_refs: Vec<_> = evidence_refs
            .intersection(current_evidence_ids)
            .cloned()
            .collect();

        if missing_evidence_refs.is_empty() {
            reusable_skills.push(ReusableSkill {
                key: skill.key.clone(),
                label: skill.label.clone(),
                evidence_refs: evidence_refs.into_iter().collect(),
            });
        } else {
            invalidated_skills.push(InvalidatedSkill {
                key: skill.key.clone(),
                label: skill.label.clone(),
                missing_evidence_refs,
                retained_evidence_refs,
            });
        }
    }

    let new_evidence_refs: Vec<_> = current_evidence_ids
        .difference(previous_evidence_ids)
        .cloned()
        .collect();
    let removed_evidence_refs: Vec<_> = previous_evidence_ids
        .difference(current_evidence_ids)
        .cloned()
        .collect();

    IncrementalProfilePlan {
        schema: INCREMENTAL_PROFILE_PLAN_SCHEMA.to_string(),
        requires_semantic_refresh: !invalidated_skills.is_empty(),
        requires_discovery: !new_evidence_refs.is_empty(),
        reusable_skills,
        invalidated_skills,
        new_evidence_refs,
        removed_evidence_refs,
    }
}

#[cfg(test)]
mod tests {
    use std::collections::{BTreeMap, BTreeSet};

    use crate::{ClaimStance, ProfileEvidenceMeta, SemanticClaim, build_developer_profile};

    use super::*;

    fn profile() -> DeveloperProfile {
        let evidence = BTreeMap::from([
            (
                "ts".into(),
                ProfileEvidenceMeta {
                    kind: "source".into(),
                    observed_at: None,
                    stale: false,
                    actor_relation: None,
                    implementation_origin: None,
                },
            ),
            (
                "rust".into(),
                ProfileEvidenceMeta {
                    kind: "source".into(),
                    observed_at: None,
                    stale: false,
                    actor_relation: None,
                    implementation_origin: None,
                },
            ),
        ]);
        build_developer_profile(
            BTreeMap::new(),
            vec!["kode".into()],
            vec![
                SemanticClaim {
                    skill: "TypeScript".into(),
                    repository: "kode".into(),
                    evidence_refs: vec!["ts".into()],
                    confidence: Some(0.95),
                    stance: ClaimStance::Support,
                    stale: false,
                    reason: None,
                },
                SemanticClaim {
                    skill: "Rust".into(),
                    repository: "kode".into(),
                    evidence_refs: vec!["rust".into()],
                    confidence: Some(0.9),
                    stance: ClaimStance::Support,
                    stale: false,
                    reason: None,
                },
            ],
            &evidence,
        )
        .unwrap()
    }

    #[test]
    fn reuses_unchanged_claims() {
        let ids = BTreeSet::from(["ts".into(), "rust".into()]);
        let plan = plan_incremental_profile_update(&profile(), &ids, &ids);
        assert_eq!(plan.reusable_skills.len(), 2);
        assert!(plan.invalidated_skills.is_empty());
        assert!(!plan.requires_semantic_refresh);
        assert!(!plan.requires_discovery);
    }

    #[test]
    fn invalidates_only_claims_with_missing_evidence() {
        let previous = BTreeSet::from(["ts".into(), "rust".into()]);
        let current = BTreeSet::from(["ts".into(), "rust-new".into()]);
        let plan = plan_incremental_profile_update(&profile(), &previous, &current);

        assert_eq!(plan.reusable_skills.len(), 1);
        assert_eq!(plan.reusable_skills[0].key, "typescript");
        assert_eq!(plan.invalidated_skills.len(), 1);
        assert_eq!(plan.invalidated_skills[0].key, "rust");
        assert_eq!(
            plan.invalidated_skills[0].missing_evidence_refs,
            vec!["rust"]
        );
        assert_eq!(plan.new_evidence_refs, vec!["rust-new"]);
        assert_eq!(plan.removed_evidence_refs, vec!["rust"]);
        assert!(plan.requires_semantic_refresh);
        assert!(plan.requires_discovery);
    }

    #[test]
    fn serialized_plan_matches_shared_schema_fixture() {
        let ids = BTreeSet::from(["ts".into(), "rust".into()]);
        let plan = plan_incremental_profile_update(&profile(), &ids, &ids);
        let schema: serde_json::Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/incremental-profile-plan-v1-schema.json"
        ))
        .unwrap();
        let value = serde_json::to_value(plan).unwrap();

        for field in schema["topLevelFields"].as_array().unwrap() {
            assert!(
                value.get(field.as_str().unwrap()).is_some(),
                "missing top-level field {field}"
            );
        }
        let reusable = &value["reusableSkills"][0];
        for field in schema["reusableSkillFields"].as_array().unwrap() {
            assert!(
                reusable.get(field.as_str().unwrap()).is_some(),
                "missing reusable field {field}"
            );
        }
    }
}
