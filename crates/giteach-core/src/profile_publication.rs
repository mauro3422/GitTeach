use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::{
    ProfileDeclaration, ProfileDeclarationCategory, ProfileDeclarationError,
    ProfileDeclarationPublicationStatus, ProfileDeclarationSourceKind,
    validate_profile_declaration,
};

pub const PROFILE_PUBLICATION_CONTEXT_SCHEMA: &str = "giteach-profile-publication-context-v1";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PublishedProfileDeclaration {
    pub id: String,
    pub category: ProfileDeclarationCategory,
    pub key: String,
    pub value: String,
    pub source_kind: ProfileDeclarationSourceKind,
    pub repositories: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProfilePublicationContext {
    pub schema: String,
    pub actor_key: String,
    pub declarations: Vec<PublishedProfileDeclaration>,
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum ProfilePublicationContextError {
    #[error("actorKey is required")]
    MissingActorKey,
    #[error(transparent)]
    InvalidDeclaration(#[from] ProfileDeclarationError),
}

fn category_key(category: &ProfileDeclarationCategory) -> &'static str {
    match category {
        ProfileDeclarationCategory::Role => "role",
        ProfileDeclarationCategory::Intent => "intent",
        ProfileDeclarationCategory::Responsibility => "responsibility",
        ProfileDeclarationCategory::AiWorkflow => "ai-workflow",
        ProfileDeclarationCategory::CareerContext => "career-context",
        ProfileDeclarationCategory::Education => "education",
        ProfileDeclarationCategory::Capability => "capability",
        ProfileDeclarationCategory::DevelopmentTendency => "development-tendency",
    }
}

pub fn prepare_profile_publication_context(
    actor_key: &str,
    declarations: &[ProfileDeclaration],
) -> Result<ProfilePublicationContext, ProfilePublicationContextError> {
    let subject = actor_key.trim();
    if subject.is_empty() {
        return Err(ProfilePublicationContextError::MissingActorKey);
    }

    let mut approved = Vec::new();
    for declaration in declarations {
        let declaration = validate_profile_declaration(declaration.clone())?;
        if declaration.actor_key != subject
            || declaration.publication_status != ProfileDeclarationPublicationStatus::Approved
        {
            continue;
        }
        approved.push(PublishedProfileDeclaration {
            id: declaration.id,
            category: declaration.category,
            key: declaration.key,
            value: declaration.value,
            source_kind: declaration.source_kind,
            repositories: declaration.repositories,
        });
    }

    approved.sort_by(|a, b| {
        category_key(&a.category)
            .cmp(category_key(&b.category))
            .then_with(|| a.key.cmp(&b.key))
            .then_with(|| a.id.cmp(&b.id))
    });

    Ok(ProfilePublicationContext {
        schema: PROFILE_PUBLICATION_CONTEXT_SCHEMA.to_string(),
        actor_key: subject.to_string(),
        declarations: approved,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{ProfileDeclarationInput, create_profile_declaration};

    fn declaration(actor: &str, status: ProfileDeclarationPublicationStatus) -> ProfileDeclaration {
        create_profile_declaration(ProfileDeclarationInput {
            schema: None,
            id: None,
            actor_key: actor.into(),
            category: ProfileDeclarationCategory::DevelopmentTendency,
            key: "automation".into(),
            value: "I deliberately automate repetitive development work.".into(),
            source_kind: ProfileDeclarationSourceKind::UserAnswer,
            source_ref: "interview:confirm:automation".into(),
            declared_at: "2026-09-24T01:20:00-03:00".into(),
            authorization_ref: None,
            publication_status: status,
            source_hash: None,
            repositories: vec!["kode".into(), "GitTeach".into()],
        })
        .unwrap()
    }

    #[test]
    fn excludes_private_declarations_and_other_actors() {
        let private = declaration(
            "developer:mauro",
            ProfileDeclarationPublicationStatus::Private,
        );
        let approved = declaration(
            "developer:mauro",
            ProfileDeclarationPublicationStatus::Approved,
        );
        let other = declaration(
            "developer:other",
            ProfileDeclarationPublicationStatus::Approved,
        );
        let context = prepare_profile_publication_context(
            "developer:mauro",
            &[private, approved.clone(), other],
        )
        .unwrap();
        assert_eq!(context.declarations.len(), 1);
        assert_eq!(context.declarations[0].id, approved.id);
    }

    #[test]
    fn published_shape_omits_internal_consent_and_source_metadata() {
        let context = prepare_profile_publication_context(
            "developer:mauro",
            &[declaration(
                "developer:mauro",
                ProfileDeclarationPublicationStatus::Approved,
            )],
        )
        .unwrap();
        let value = serde_json::to_value(&context.declarations[0]).unwrap();
        assert!(value.get("authorizationRef").is_none());
        assert!(value.get("sourceHash").is_none());
        assert!(value.get("sourceRef").is_none());
        assert!(value.get("publicationStatus").is_none());
    }

    #[test]
    fn serialized_context_matches_shared_schema_fixture() {
        let context = prepare_profile_publication_context(
            "developer:mauro",
            &[declaration(
                "developer:mauro",
                ProfileDeclarationPublicationStatus::Approved,
            )],
        )
        .unwrap();
        let schema: serde_json::Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/profile-publication-context-v1-schema.json"
        ))
        .unwrap();
        let value = serde_json::to_value(context).unwrap();
        for field in schema["fields"].as_array().unwrap() {
            assert!(
                value.get(field.as_str().unwrap()).is_some(),
                "missing field {field}"
            );
        }
        let declaration = &value["declarations"][0];
        for field in schema["declarationFields"].as_array().unwrap() {
            assert!(
                declaration.get(field.as_str().unwrap()).is_some(),
                "missing declaration field {field}"
            );
        }
    }
}
