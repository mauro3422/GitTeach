use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use thiserror::Error;

pub const PROFILE_DECLARATION_SCHEMA: &str = "giteach-profile-declaration-v1";
pub const PROFILE_RECONCILIATION_SCHEMA: &str = "giteach-profile-reconciliation-v1";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum ProfileDeclarationCategory {
    Role,
    Intent,
    Responsibility,
    AiWorkflow,
    CareerContext,
    Education,
    Capability,
    DevelopmentTendency,
}

impl ProfileDeclarationCategory {
    fn as_str(&self) -> &'static str {
        match self {
            Self::Role => "role",
            Self::Intent => "intent",
            Self::Responsibility => "responsibility",
            Self::AiWorkflow => "ai-workflow",
            Self::CareerContext => "career-context",
            Self::Education => "education",
            Self::Capability => "capability",
            Self::DevelopmentTendency => "development-tendency",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum ProfileDeclarationSourceKind {
    UserAnswer,
    ProfileImport,
}

impl ProfileDeclarationSourceKind {
    fn as_str(&self) -> &'static str {
        match self {
            Self::UserAnswer => "user-answer",
            Self::ProfileImport => "profile-import",
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum ProfileDeclarationPublicationStatus {
    #[default]
    Private,
    Approved,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProfileDeclarationInput {
    #[serde(default)]
    pub schema: Option<String>,
    #[serde(default)]
    pub id: Option<String>,
    pub actor_key: String,
    pub category: ProfileDeclarationCategory,
    pub key: String,
    pub value: String,
    pub source_kind: ProfileDeclarationSourceKind,
    pub source_ref: String,
    pub declared_at: String,
    #[serde(default)]
    pub authorization_ref: Option<String>,
    #[serde(default)]
    pub publication_status: ProfileDeclarationPublicationStatus,
    #[serde(default)]
    pub source_hash: Option<String>,
    #[serde(default)]
    pub repositories: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProfileDeclaration {
    pub schema: String,
    pub id: String,
    pub actor_key: String,
    pub category: ProfileDeclarationCategory,
    pub key: String,
    pub value: String,
    pub source_kind: ProfileDeclarationSourceKind,
    pub source_ref: String,
    pub declared_at: String,
    pub authorization_ref: Option<String>,
    #[serde(default)]
    pub publication_status: ProfileDeclarationPublicationStatus,
    pub source_hash: Option<String>,
    pub repositories: Vec<String>,
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum ProfileDeclarationError {
    #[error("unsupported profile declaration schema")]
    InvalidSchema,
    #[error("profile declaration requires non-empty {0}")]
    MissingField(&'static str),
    #[error("profile declaration {0} exceeds {1} characters")]
    FieldTooLong(&'static str, usize),
    #[error("profile-import declarations require authorizationRef")]
    MissingAuthorization,
    #[error("observed reconciliation input requires at least one evidence ref")]
    MissingObservationEvidence,
    #[error("a reconciliation for the same actor is required")]
    MismatchedReconciliation,
}

fn bounded(
    value: String,
    field: &'static str,
    max: usize,
) -> Result<String, ProfileDeclarationError> {
    let value = value.trim().to_string();
    if value.is_empty() {
        return Err(ProfileDeclarationError::MissingField(field));
    }
    if value.chars().count() > max {
        return Err(ProfileDeclarationError::FieldTooLong(field, max));
    }
    Ok(value)
}

fn optional_bounded(
    value: Option<String>,
    field: &'static str,
    max: usize,
) -> Result<Option<String>, ProfileDeclarationError> {
    match value {
        None => Ok(None),
        Some(value) if value.trim().is_empty() => Ok(None),
        Some(value) => bounded(value, field, max).map(Some),
    }
}

fn normalized_strings(values: impl IntoIterator<Item = String>) -> Vec<String> {
    let mut values = values
        .into_iter()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .collect::<Vec<_>>();
    values.sort();
    values.dedup();
    values
}

fn declaration_id(value: &ProfileDeclaration) -> String {
    let repositories = value.repositories.join("\n");
    let identity = [
        value.actor_key.as_str(),
        value.category.as_str(),
        value.key.as_str(),
        value.value.as_str(),
        value.source_kind.as_str(),
        value.source_ref.as_str(),
        value.declared_at.as_str(),
        value.authorization_ref.as_deref().unwrap_or(""),
        repositories.as_str(),
    ]
    .join("\0");
    let digest = Sha256::digest(identity.as_bytes());
    format!("{digest:x}")[..24].to_string()
}

pub fn create_profile_declaration(
    input: ProfileDeclarationInput,
) -> Result<ProfileDeclaration, ProfileDeclarationError> {
    if input
        .schema
        .as_deref()
        .is_some_and(|schema| schema != PROFILE_DECLARATION_SCHEMA)
    {
        return Err(ProfileDeclarationError::InvalidSchema);
    }

    let actor_key = bounded(input.actor_key, "actorKey", 160)?;
    let key = bounded(input.key, "key", 160)?.to_lowercase();
    let value = bounded(input.value, "value", 500)?;
    let source_ref = bounded(input.source_ref, "sourceRef", 300)?;
    let declared_at = bounded(input.declared_at, "declaredAt", 80)?;
    let authorization_ref = optional_bounded(input.authorization_ref, "authorizationRef", 300)?;
    let source_hash = optional_bounded(input.source_hash, "sourceHash", 160)?;
    if input.source_kind == ProfileDeclarationSourceKind::ProfileImport
        && authorization_ref.is_none()
    {
        return Err(ProfileDeclarationError::MissingAuthorization);
    }

    let mut declaration = ProfileDeclaration {
        schema: PROFILE_DECLARATION_SCHEMA.to_string(),
        id: String::new(),
        actor_key,
        category: input.category,
        key,
        value,
        source_kind: input.source_kind,
        source_ref,
        declared_at,
        authorization_ref,
        publication_status: input.publication_status,
        source_hash,
        repositories: normalized_strings(input.repositories),
    };
    declaration.id = match input.id {
        Some(id) => bounded(id, "id", 160)?,
        None => declaration_id(&declaration),
    };
    Ok(declaration)
}

pub fn validate_profile_declaration(
    mut declaration: ProfileDeclaration,
) -> Result<ProfileDeclaration, ProfileDeclarationError> {
    if declaration.schema != PROFILE_DECLARATION_SCHEMA {
        return Err(ProfileDeclarationError::InvalidSchema);
    }
    declaration.id = bounded(declaration.id, "id", 160)?;
    declaration.actor_key = bounded(declaration.actor_key, "actorKey", 160)?;
    declaration.key = bounded(declaration.key, "key", 160)?.to_lowercase();
    declaration.value = bounded(declaration.value, "value", 500)?;
    declaration.source_ref = bounded(declaration.source_ref, "sourceRef", 300)?;
    declaration.declared_at = bounded(declaration.declared_at, "declaredAt", 80)?;
    declaration.authorization_ref =
        optional_bounded(declaration.authorization_ref, "authorizationRef", 300)?;
    declaration.source_hash = optional_bounded(declaration.source_hash, "sourceHash", 160)?;
    declaration.repositories = normalized_strings(declaration.repositories);
    if declaration.source_kind == ProfileDeclarationSourceKind::ProfileImport
        && declaration.authorization_ref.is_none()
    {
        return Err(ProfileDeclarationError::MissingAuthorization);
    }
    Ok(declaration)
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ProfileObservationStance {
    Support,
    Contradict,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "kebab-case")]
pub enum ProfileObservationSourceClass {
    RepositoryFact,
    CrossProjectTendency,
    SemanticObservation,
    ActorEvidence,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProfileObservedSignal {
    pub key: String,
    #[serde(default)]
    pub label: String,
    pub stance: ProfileObservationStance,
    pub source_class: ProfileObservationSourceClass,
    #[serde(default)]
    pub evidence_refs: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum ProfileReconciliationStatus {
    DeclaredSupported,
    DeclaredNotObservable,
    ObservedUndeclared,
    Ambiguous,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProfileReconciliationItem {
    pub key: String,
    pub label: String,
    pub status: ProfileReconciliationStatus,
    pub declaration_ids: Vec<String>,
    pub observed_support_refs: Vec<String>,
    pub observed_contradiction_refs: Vec<String>,
    pub source_classes: Vec<ProfileObservationSourceClass>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProfileReconciliation {
    pub schema: String,
    pub actor_key: String,
    pub items: Vec<ProfileReconciliationItem>,
}

fn normalize_observation(
    mut observation: ProfileObservedSignal,
) -> Result<ProfileObservedSignal, ProfileDeclarationError> {
    observation.key = bounded(observation.key, "observation.key", 160)?.to_lowercase();
    observation.label = if observation.label.trim().is_empty() {
        observation.key.clone()
    } else {
        bounded(observation.label, "observation.label", 500)?
    };
    observation.evidence_refs = normalized_strings(observation.evidence_refs);
    if observation.evidence_refs.is_empty() {
        return Err(ProfileDeclarationError::MissingObservationEvidence);
    }
    Ok(observation)
}

pub fn reconcile_profile_declarations(
    actor_key: &str,
    declarations: &[ProfileDeclaration],
    observations: Vec<ProfileObservedSignal>,
) -> Result<ProfileReconciliation, ProfileDeclarationError> {
    let actor_key = bounded(actor_key.to_string(), "actorKey", 160)?;
    let validated_declarations = declarations
        .iter()
        .cloned()
        .map(validate_profile_declaration)
        .collect::<Result<Vec<_>, _>>()?;
    let own_declarations = validated_declarations
        .iter()
        .filter(|item| item.actor_key == actor_key)
        .collect::<Vec<_>>();
    let observations = observations
        .into_iter()
        .map(normalize_observation)
        .collect::<Result<Vec<_>, _>>()?;

    let mut keys = BTreeSet::new();
    for declaration in &own_declarations {
        keys.insert(declaration.key.clone());
    }
    for observation in &observations {
        if observation.stance == ProfileObservationStance::Support {
            keys.insert(observation.key.clone());
        }
    }

    let mut items = Vec::new();
    for key in keys {
        let declared = own_declarations
            .iter()
            .filter(|item| item.key == key)
            .copied()
            .collect::<Vec<_>>();
        let support = observations
            .iter()
            .filter(|item| item.key == key && item.stance == ProfileObservationStance::Support)
            .collect::<Vec<_>>();
        let contradict = observations
            .iter()
            .filter(|item| item.key == key && item.stance == ProfileObservationStance::Contradict)
            .collect::<Vec<_>>();
        let declaration_values = declared
            .iter()
            .map(|item| item.value.trim().to_lowercase())
            .collect::<BTreeSet<_>>();

        let status =
            if declaration_values.len() > 1 || (!declared.is_empty() && !contradict.is_empty()) {
                ProfileReconciliationStatus::Ambiguous
            } else if !declared.is_empty() && !support.is_empty() {
                ProfileReconciliationStatus::DeclaredSupported
            } else if !declared.is_empty() {
                ProfileReconciliationStatus::DeclaredNotObservable
            } else {
                ProfileReconciliationStatus::ObservedUndeclared
            };

        let declaration_ids = normalized_strings(declared.iter().map(|item| item.id.clone()));
        let observed_support_refs = normalized_strings(
            support
                .iter()
                .flat_map(|item| item.evidence_refs.iter().cloned()),
        );
        let observed_contradiction_refs = normalized_strings(
            contradict
                .iter()
                .flat_map(|item| item.evidence_refs.iter().cloned()),
        );
        let mut source_classes = BTreeSet::new();
        for observation in support.iter().chain(contradict.iter()) {
            source_classes.insert(observation.source_class.clone());
        }

        items.push(ProfileReconciliationItem {
            key: key.clone(),
            label: declared
                .first()
                .map(|item| item.value.clone())
                .or_else(|| support.first().map(|item| item.label.clone()))
                .unwrap_or(key),
            status,
            declaration_ids,
            observed_support_refs,
            observed_contradiction_refs,
            source_classes: source_classes.into_iter().collect(),
        });
    }

    Ok(ProfileReconciliation {
        schema: PROFILE_RECONCILIATION_SCHEMA.to_string(),
        actor_key,
        items,
    })
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum ProfileInterviewQuestionKind {
    FillProfileGap,
    ClarifyUnobservedDeclaration,
    ReconcileAmbiguity,
    ConfirmObservedPattern,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProfileInterviewQuestion {
    pub id: String,
    pub kind: ProfileInterviewQuestionKind,
    pub category: Option<ProfileDeclarationCategory>,
    pub subject_key: Option<String>,
    pub source_status: Option<ProfileReconciliationStatus>,
    pub declaration_ids: Vec<String>,
    pub evidence_refs: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProfileInterviewPlan {
    pub schema: String,
    pub actor_key: String,
    pub questions: Vec<ProfileInterviewQuestion>,
}

pub const PROFILE_INTERVIEW_PLAN_SCHEMA: &str = "giteach-profile-interview-plan-v1";

pub fn default_profile_interview_categories() -> Vec<ProfileDeclarationCategory> {
    vec![
        ProfileDeclarationCategory::Role,
        ProfileDeclarationCategory::Intent,
        ProfileDeclarationCategory::Responsibility,
        ProfileDeclarationCategory::AiWorkflow,
        ProfileDeclarationCategory::CareerContext,
    ]
}

pub fn plan_profile_interview(
    actor_key: &str,
    declarations: &[ProfileDeclaration],
    reconciliation: &ProfileReconciliation,
    required_categories: &[ProfileDeclarationCategory],
) -> Result<ProfileInterviewPlan, ProfileDeclarationError> {
    let actor_key = bounded(actor_key.to_string(), "actorKey", 160)?;
    if reconciliation.schema != PROFILE_RECONCILIATION_SCHEMA
        || reconciliation.actor_key != actor_key
    {
        return Err(ProfileDeclarationError::MismatchedReconciliation);
    }

    let validated_declarations = declarations
        .iter()
        .cloned()
        .map(validate_profile_declaration)
        .collect::<Result<Vec<_>, _>>()?;
    let own_declarations = validated_declarations
        .iter()
        .filter(|item| item.actor_key == actor_key)
        .collect::<Vec<_>>();
    let mut questions = Vec::new();

    for category in required_categories {
        if !own_declarations
            .iter()
            .any(|item| &item.category == category)
        {
            questions.push(ProfileInterviewQuestion {
                id: format!("gap:{}", category.as_str()),
                kind: ProfileInterviewQuestionKind::FillProfileGap,
                category: Some(category.clone()),
                subject_key: None,
                source_status: None,
                declaration_ids: vec![],
                evidence_refs: vec![],
            });
        }
    }

    for item in &reconciliation.items {
        match item.status {
            ProfileReconciliationStatus::Ambiguous => questions.push(ProfileInterviewQuestion {
                id: format!("reconcile:{}", item.key),
                kind: ProfileInterviewQuestionKind::ReconcileAmbiguity,
                category: None,
                subject_key: Some(item.key.clone()),
                source_status: Some(item.status.clone()),
                declaration_ids: normalized_strings(item.declaration_ids.clone()),
                evidence_refs: normalized_strings(
                    item.observed_support_refs
                        .iter()
                        .chain(item.observed_contradiction_refs.iter())
                        .cloned(),
                ),
            }),
            ProfileReconciliationStatus::ObservedUndeclared => {
                let category = if item
                    .source_classes
                    .contains(&ProfileObservationSourceClass::CrossProjectTendency)
                {
                    ProfileDeclarationCategory::DevelopmentTendency
                } else {
                    ProfileDeclarationCategory::Capability
                };
                questions.push(ProfileInterviewQuestion {
                    id: format!("confirm:{}", item.key),
                    kind: ProfileInterviewQuestionKind::ConfirmObservedPattern,
                    category: Some(category),
                    subject_key: Some(item.key.clone()),
                    source_status: Some(item.status.clone()),
                    declaration_ids: vec![],
                    evidence_refs: normalized_strings(item.observed_support_refs.clone()),
                })
            }
            ProfileReconciliationStatus::DeclaredNotObservable => {
                let category = own_declarations.iter().find_map(|declaration| {
                    if !item.declaration_ids.contains(&declaration.id) {
                        return None;
                    }
                    match declaration.category {
                        ProfileDeclarationCategory::Capability
                        | ProfileDeclarationCategory::DevelopmentTendency => {
                            Some(declaration.category.clone())
                        }
                        _ => None,
                    }
                });
                if let Some(category) = category {
                    questions.push(ProfileInterviewQuestion {
                        id: format!("clarify:{}", item.key),
                        kind: ProfileInterviewQuestionKind::ClarifyUnobservedDeclaration,
                        category: Some(category),
                        subject_key: Some(item.key.clone()),
                        source_status: Some(item.status.clone()),
                        declaration_ids: normalized_strings(item.declaration_ids.clone()),
                        evidence_refs: vec![],
                    })
                }
            }
            ProfileReconciliationStatus::DeclaredSupported => {}
        }
    }

    questions.sort_by(|a, b| a.id.cmp(&b.id));
    Ok(ProfileInterviewPlan {
        schema: PROFILE_INTERVIEW_PLAN_SCHEMA.to_string(),
        actor_key,
        questions,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn declaration_input() -> ProfileDeclarationInput {
        ProfileDeclarationInput {
            schema: None,
            id: None,
            actor_key: "developer:mauro".into(),
            category: ProfileDeclarationCategory::Capability,
            key: "Rust".into(),
            value: "Rust".into(),
            source_kind: ProfileDeclarationSourceKind::UserAnswer,
            source_ref: "interview:answer:1".into(),
            declared_at: "2026-09-24T01:00:00.000Z".into(),
            authorization_ref: None,
            publication_status: ProfileDeclarationPublicationStatus::Private,
            source_hash: None,
            repositories: vec![],
        }
    }

    #[test]
    fn creates_bounded_self_report_without_actor_evidence_attachment() {
        let declaration = create_profile_declaration(declaration_input()).unwrap();
        assert_eq!(declaration.schema, PROFILE_DECLARATION_SCHEMA);
        assert_eq!(declaration.key, "rust");
        assert!(declaration.repositories.is_empty());
        assert!(declaration.authorization_ref.is_none());
        assert_eq!(
            declaration.publication_status,
            ProfileDeclarationPublicationStatus::Private
        );
    }

    #[test]
    fn profile_import_requires_authorization() {
        let mut input = declaration_input();
        input.source_kind = ProfileDeclarationSourceKind::ProfileImport;
        input.source_ref = "linkedin:skills:rust".into();
        assert_eq!(
            create_profile_declaration(input.clone()).unwrap_err(),
            ProfileDeclarationError::MissingAuthorization
        );
        input.authorization_ref = Some("authorization:linkedin:2026-09-24".into());
        assert!(create_profile_declaration(input).is_ok());
    }

    #[test]
    fn consumers_revalidate_loaded_profile_imports() {
        let mut declaration = create_profile_declaration(declaration_input()).unwrap();
        declaration.source_kind = ProfileDeclarationSourceKind::ProfileImport;
        declaration.source_ref = "linkedin:skills:rust".into();
        declaration.authorization_ref = None;
        assert_eq!(
            reconcile_profile_declarations("developer:mauro", &[declaration], vec![]).unwrap_err(),
            ProfileDeclarationError::MissingAuthorization
        );
    }

    #[test]
    fn input_deserialization_rejects_raw_prompt_fields() {
        let value = serde_json::json!({
            "actorKey": "developer:mauro",
            "category": "capability",
            "key": "rust",
            "value": "Rust",
            "sourceKind": "user-answer",
            "sourceRef": "interview:1",
            "declaredAt": "2026-09-24T01:00:00.000Z",
            "rawPrompt": "private"
        });
        assert!(serde_json::from_value::<ProfileDeclarationInput>(value).is_err());
    }

    #[test]
    fn declaration_id_normalizes_repository_order() {
        let mut first = declaration_input();
        first.repositories = vec!["repo-b".into(), "repo-a".into(), "repo-a".into()];
        let mut second = declaration_input();
        second.repositories = vec!["repo-a".into(), "repo-b".into()];
        let first = create_profile_declaration(first).unwrap();
        let second = create_profile_declaration(second).unwrap();
        assert_eq!(first.id, second.id);
        assert_eq!(first.repositories, vec!["repo-a", "repo-b"]);
    }

    #[test]
    fn reconciliation_preserves_not_observable_as_distinct_state() {
        let declaration = create_profile_declaration(declaration_input()).unwrap();
        let result =
            reconcile_profile_declarations("developer:mauro", &[declaration], vec![]).unwrap();
        assert_eq!(
            result.items[0].status,
            ProfileReconciliationStatus::DeclaredNotObservable
        );
        assert!(result.items[0].observed_contradiction_refs.is_empty());
    }

    #[test]
    fn reconciliation_distinguishes_supported_undeclared_and_ambiguous() {
        let declaration = create_profile_declaration(declaration_input()).unwrap();
        let result = reconcile_profile_declarations(
            "developer:mauro",
            std::slice::from_ref(&declaration),
            vec![
                ProfileObservedSignal {
                    key: "rust".into(),
                    label: "Rust".into(),
                    stance: ProfileObservationStance::Support,
                    source_class: ProfileObservationSourceClass::RepositoryFact,
                    evidence_refs: vec!["ev-rust".into()],
                },
                ProfileObservedSignal {
                    key: "typescript".into(),
                    label: "TypeScript".into(),
                    stance: ProfileObservationStance::Support,
                    source_class: ProfileObservationSourceClass::CrossProjectTendency,
                    evidence_refs: vec!["ev-ts".into()],
                },
            ],
        )
        .unwrap();
        assert_eq!(result.items[0].key, "rust");
        assert_eq!(
            result.items[0].status,
            ProfileReconciliationStatus::DeclaredSupported
        );
        assert_eq!(result.items[1].key, "typescript");
        assert_eq!(
            result.items[1].status,
            ProfileReconciliationStatus::ObservedUndeclared
        );

        let ambiguous = reconcile_profile_declarations(
            "developer:mauro",
            &[declaration],
            vec![ProfileObservedSignal {
                key: "rust".into(),
                label: "Rust".into(),
                stance: ProfileObservationStance::Contradict,
                source_class: ProfileObservationSourceClass::SemanticObservation,
                evidence_refs: vec!["ev-conflict".into()],
            }],
        )
        .unwrap();
        assert_eq!(
            ambiguous.items[0].status,
            ProfileReconciliationStatus::Ambiguous
        );
        assert_eq!(
            ambiguous.items[0].observed_contradiction_refs,
            vec!["ev-conflict"]
        );
    }

    #[test]
    fn reconciliation_isolates_subject_actor() {
        let own = create_profile_declaration(declaration_input()).unwrap();
        let mut other_input = declaration_input();
        other_input.actor_key = "developer:other".into();
        other_input.key = "Go".into();
        other_input.value = "Go".into();
        other_input.source_ref = "interview:other".into();
        let other = create_profile_declaration(other_input).unwrap();
        let result =
            reconcile_profile_declarations("developer:mauro", &[own, other], vec![]).unwrap();
        assert_eq!(result.items.len(), 1);
        assert_eq!(result.items[0].key, "rust");
    }

    #[test]
    fn serialized_contracts_match_shared_schema_fixtures() {
        let declaration_schema: serde_json::Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/profile-declaration-v1-schema.json"
        ))
        .unwrap();
        let reconciliation_schema: serde_json::Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/profile-reconciliation-v1-schema.json"
        ))
        .unwrap();
        let declaration = create_profile_declaration(declaration_input()).unwrap();
        let declaration_value = serde_json::to_value(&declaration).unwrap();
        for field in declaration_schema["fields"].as_array().unwrap() {
            assert!(declaration_value.get(field.as_str().unwrap()).is_some());
        }
        let reconciliation = reconcile_profile_declarations(
            "developer:mauro",
            std::slice::from_ref(&declaration),
            vec![],
        )
        .unwrap();
        let reconciliation_value = serde_json::to_value(&reconciliation).unwrap();
        for field in reconciliation_schema["fields"].as_array().unwrap() {
            assert!(reconciliation_value.get(field.as_str().unwrap()).is_some());
        }
        for field in reconciliation_schema["itemFields"].as_array().unwrap() {
            assert!(
                reconciliation_value["items"][0]
                    .get(field.as_str().unwrap())
                    .is_some()
            );
        }
    }

    #[test]
    fn interview_plan_asks_only_for_missing_categories() {
        let mut role_input = declaration_input();
        role_input.category = ProfileDeclarationCategory::Role;
        role_input.key = "current-role".into();
        role_input.value = "Developer".into();
        let role = create_profile_declaration(role_input).unwrap();
        let mut ai_input = declaration_input();
        ai_input.category = ProfileDeclarationCategory::AiWorkflow;
        ai_input.key = "ai-usage".into();
        ai_input.value = "I use coding agents with review and verification.".into();
        ai_input.source_ref = "interview:ai".into();
        let ai = create_profile_declaration(ai_input).unwrap();
        let declarations = vec![role, ai];
        let reconciliation =
            reconcile_profile_declarations("developer:mauro", &declarations, vec![]).unwrap();
        let plan = plan_profile_interview(
            "developer:mauro",
            &declarations,
            &reconciliation,
            &default_profile_interview_categories(),
        )
        .unwrap();
        let categories = plan
            .questions
            .iter()
            .filter(|item| item.kind == ProfileInterviewQuestionKind::FillProfileGap)
            .filter_map(|item| item.category.as_ref())
            .map(ProfileDeclarationCategory::as_str)
            .collect::<Vec<_>>();
        assert_eq!(
            categories,
            vec!["career-context", "intent", "responsibility"]
        );
    }

    #[test]
    fn declared_not_observable_triggers_context_clarification_not_conflict() {
        let declaration = create_profile_declaration(declaration_input()).unwrap();
        let declaration_id = declaration.id.clone();
        let reconciliation = reconcile_profile_declarations(
            "developer:mauro",
            std::slice::from_ref(&declaration),
            vec![],
        )
        .unwrap();
        let plan = plan_profile_interview("developer:mauro", &[declaration], &reconciliation, &[])
            .unwrap();
        assert_eq!(plan.questions.len(), 1);
        assert_eq!(plan.questions[0].id, "clarify:rust");
        assert_eq!(
            plan.questions[0].kind,
            ProfileInterviewQuestionKind::ClarifyUnobservedDeclaration
        );
        assert_eq!(plan.questions[0].declaration_ids, vec![declaration_id]);
        assert!(plan.questions[0].evidence_refs.is_empty());
    }

    #[test]
    fn interview_plan_targets_observed_undeclared_and_ambiguous_items() {
        let declaration = create_profile_declaration(declaration_input()).unwrap();
        let reconciliation = reconcile_profile_declarations(
            "developer:mauro",
            std::slice::from_ref(&declaration),
            vec![
                ProfileObservedSignal {
                    key: "rust".into(),
                    label: "Rust".into(),
                    stance: ProfileObservationStance::Contradict,
                    source_class: ProfileObservationSourceClass::SemanticObservation,
                    evidence_refs: vec!["ev-conflict".into()],
                },
                ProfileObservedSignal {
                    key: "automation".into(),
                    label: "Automation".into(),
                    stance: ProfileObservationStance::Support,
                    source_class: ProfileObservationSourceClass::CrossProjectTendency,
                    evidence_refs: vec!["ev-a".into(), "ev-b".into()],
                },
            ],
        )
        .unwrap();
        let plan = plan_profile_interview("developer:mauro", &[declaration], &reconciliation, &[])
            .unwrap();
        assert_eq!(plan.questions.len(), 2);
        assert_eq!(plan.questions[0].id, "confirm:automation");
        assert_eq!(
            plan.questions[0].category,
            Some(ProfileDeclarationCategory::DevelopmentTendency)
        );
        assert_eq!(plan.questions[1].id, "reconcile:rust");
        assert_eq!(plan.questions[1].evidence_refs, vec!["ev-conflict"]);
    }

    #[test]
    fn publication_consent_is_separate_from_declaration_identity() {
        let private = create_profile_declaration(declaration_input()).unwrap();
        let mut approved_input = declaration_input();
        approved_input.publication_status = ProfileDeclarationPublicationStatus::Approved;
        let approved = create_profile_declaration(approved_input).unwrap();
        assert_eq!(private.id, approved.id);
        assert_eq!(
            approved.publication_status,
            ProfileDeclarationPublicationStatus::Approved
        );
    }

    #[test]
    fn conflicting_declaration_sources_are_ambiguous_without_an_observed_winner() {
        let mut user_input = declaration_input();
        user_input.category = ProfileDeclarationCategory::Role;
        user_input.key = "current-role".into();
        user_input.value = "Developer Tooling Engineer".into();
        user_input.source_ref = "interview:role".into();
        let user_role = create_profile_declaration(user_input).unwrap();

        let mut imported_input = declaration_input();
        imported_input.category = ProfileDeclarationCategory::Role;
        imported_input.key = "current-role".into();
        imported_input.value = "Frontend Developer".into();
        imported_input.source_kind = ProfileDeclarationSourceKind::ProfileImport;
        imported_input.source_ref = "linkedin:headline".into();
        imported_input.authorization_ref = Some("authorization:linkedin:2026-09-24".into());
        let imported_role = create_profile_declaration(imported_input).unwrap();

        let reconciliation = reconcile_profile_declarations(
            "developer:mauro",
            &[user_role.clone(), imported_role.clone()],
            vec![],
        )
        .unwrap();
        assert_eq!(reconciliation.items.len(), 1);
        assert_eq!(
            reconciliation.items[0].status,
            ProfileReconciliationStatus::Ambiguous
        );
        assert_eq!(reconciliation.items[0].declaration_ids.len(), 2);

        let plan = plan_profile_interview(
            "developer:mauro",
            &[user_role, imported_role],
            &reconciliation,
            &[],
        )
        .unwrap();
        assert_eq!(plan.questions.len(), 1);
        assert_eq!(plan.questions[0].id, "reconcile:current-role");
        assert!(plan.questions[0].evidence_refs.is_empty());
    }

    #[test]
    fn serialized_interview_plan_matches_shared_schema_fixture() {
        let schema: serde_json::Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/profile-interview-plan-v1-schema.json"
        ))
        .unwrap();
        let reconciliation =
            reconcile_profile_declarations("developer:mauro", &[], vec![]).unwrap();
        let plan = plan_profile_interview(
            "developer:mauro",
            &[],
            &reconciliation,
            &default_profile_interview_categories(),
        )
        .unwrap();
        let value = serde_json::to_value(&plan).unwrap();
        for field in schema["fields"].as_array().unwrap() {
            assert!(value.get(field.as_str().unwrap()).is_some());
        }
        for field in schema["questionFields"].as_array().unwrap() {
            assert!(value["questions"][0].get(field.as_str().unwrap()).is_some());
        }
    }
}
