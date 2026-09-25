use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::{
    PROFILE_INTERVIEW_PLAN_SCHEMA, ProfileDeclaration, ProfileDeclarationCategory,
    ProfileDeclarationError, ProfileDeclarationInput, ProfileDeclarationPublicationStatus,
    ProfileDeclarationSourceKind, ProfileInterviewPlan, ProfileInterviewQuestion,
    ProfileInterviewQuestionKind, create_profile_declaration,
};

pub const PROFILE_INTERVIEW_PROMPT_SCHEMA: &str = "giteach-profile-interview-prompt-v1";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProfileInterviewPrompt {
    pub schema: String,
    pub id: String,
    pub question_id: String,
    pub actor_key: String,
    pub kind: ProfileInterviewQuestionKind,
    pub category: Option<ProfileDeclarationCategory>,
    pub subject_key: Option<String>,
    pub text: String,
    pub evidence_refs: Vec<String>,
    pub declaration_ids: Vec<String>,
}

#[derive(Debug, Error)]
pub enum ProfileInterviewAdapterError {
    #[error("expected {0}")]
    InvalidPlan(&'static str),
    #[error("interview question requires non-empty id")]
    MissingQuestionId,
    #[error("interview answer requires a declaration category")]
    MissingCategory,
    #[error("interview answer requires a declaration key")]
    MissingKey,
    #[error(transparent)]
    Declaration(#[from] ProfileDeclarationError),
}

fn category_name(category: &ProfileDeclarationCategory) -> &'static str {
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

fn default_key(category: &ProfileDeclarationCategory) -> &'static str {
    match category {
        ProfileDeclarationCategory::Role => "current-role",
        ProfileDeclarationCategory::Intent => "career-intent",
        ProfileDeclarationCategory::Responsibility => "project-responsibility",
        ProfileDeclarationCategory::AiWorkflow => "ai-workflow",
        ProfileDeclarationCategory::CareerContext => "career-context",
        ProfileDeclarationCategory::Education => "education-background",
        ProfileDeclarationCategory::Capability => "capability",
        ProfileDeclarationCategory::DevelopmentTendency => "development-tendency",
    }
}

fn gap_text(category: Option<&ProfileDeclarationCategory>) -> String {
    match category {
        Some(ProfileDeclarationCategory::Role) => {
            "How would you describe your current role or the kind of developer you are today?".into()
        }
        Some(ProfileDeclarationCategory::Intent) => {
            "What kind of software work do you want to focus on next?".into()
        }
        Some(ProfileDeclarationCategory::Responsibility) => {
            "What responsibilities do you usually take when carrying a software project forward?".into()
        }
        Some(ProfileDeclarationCategory::AiWorkflow) => {
            "How do you use AI in your development workflow, and what parts do you personally direct, review or verify?".into()
        }
        Some(ProfileDeclarationCategory::CareerContext) => {
            "What career context would help explain where your current projects fit in your professional path?".into()
        }
        Some(ProfileDeclarationCategory::Education) => {
            "What education or learning background do you want represented in your profile?".into()
        }
        Some(category) => format!(
            "What context would you like to add for {}?",
            category_name(category)
        ),
        None => "What context would you like to add for this profile area?".into(),
    }
}

fn question_text(question: &ProfileInterviewQuestion) -> String {
    let subject = question.subject_key.as_deref().unwrap_or("").trim();
    match question.kind {
        ProfileInterviewQuestionKind::FillProfileGap => gap_text(question.category.as_ref()),
        ProfileInterviewQuestionKind::ClarifyUnobservedDeclaration => format!(
            "You declared {subject}, but it is not observable in the connected evidence. How does {subject} fit your experience?"
        ),
        ProfileInterviewQuestionKind::ReconcileAmbiguity => format!(
            "I found conflicting information about {subject}. What should your profile say about it today?"
        ),
        ProfileInterviewQuestionKind::ConfirmObservedPattern => {
            if question.category == Some(ProfileDeclarationCategory::DevelopmentTendency) {
                format!(
                    "Across your connected projects I observe a recurring {subject} pattern. Is this a deliberate part of how you work?"
                )
            } else {
                format!(
                    "The connected evidence repeatedly supports {subject}. How would you describe your experience with it?"
                )
            }
        }
    }
}

pub fn render_profile_interview_prompts(
    plan: &ProfileInterviewPlan,
) -> Result<Vec<ProfileInterviewPrompt>, ProfileInterviewAdapterError> {
    if plan.schema != PROFILE_INTERVIEW_PLAN_SCHEMA || plan.actor_key.trim().is_empty() {
        return Err(ProfileInterviewAdapterError::InvalidPlan(
            PROFILE_INTERVIEW_PLAN_SCHEMA,
        ));
    }

    plan.questions
        .iter()
        .map(|question| {
            let question_id = question.id.trim();
            if question_id.is_empty() {
                return Err(ProfileInterviewAdapterError::MissingQuestionId);
            }
            Ok(ProfileInterviewPrompt {
                schema: PROFILE_INTERVIEW_PROMPT_SCHEMA.to_string(),
                id: format!("prompt:{question_id}"),
                question_id: question_id.to_string(),
                actor_key: plan.actor_key.clone(),
                kind: question.kind.clone(),
                category: question.category.clone(),
                subject_key: question.subject_key.clone(),
                text: question_text(question),
                evidence_refs: question.evidence_refs.clone(),
                declaration_ids: question.declaration_ids.clone(),
            })
        })
        .collect()
}

#[allow(clippy::too_many_arguments)]
pub fn profile_interview_answer_to_declaration(
    actor_key: &str,
    question: &ProfileInterviewQuestion,
    answer: &str,
    answered_at: &str,
    publication_status: ProfileDeclarationPublicationStatus,
    repositories: Vec<String>,
    category_override: Option<ProfileDeclarationCategory>,
    key_override: Option<String>,
) -> Result<ProfileDeclaration, ProfileInterviewAdapterError> {
    let category = category_override
        .or_else(|| question.category.clone())
        .ok_or(ProfileInterviewAdapterError::MissingCategory)?;
    let key = key_override
        .or_else(|| question.subject_key.clone())
        .unwrap_or_else(|| default_key(&category).to_string());
    if key.trim().is_empty() {
        return Err(ProfileInterviewAdapterError::MissingKey);
    }

    Ok(create_profile_declaration(ProfileDeclarationInput {
        schema: None,
        id: None,
        actor_key: actor_key.to_string(),
        category,
        key,
        value: answer.to_string(),
        source_kind: ProfileDeclarationSourceKind::UserAnswer,
        source_ref: format!("interview:{}", question.id.trim()),
        declared_at: answered_at.to_string(),
        authorization_ref: None,
        publication_status,
        source_hash: None,
        repositories,
    })?)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn automation_question() -> ProfileInterviewQuestion {
        ProfileInterviewQuestion {
            id: "confirm:automation".into(),
            kind: ProfileInterviewQuestionKind::ConfirmObservedPattern,
            category: Some(ProfileDeclarationCategory::DevelopmentTendency),
            subject_key: Some("automation".into()),
            source_status: None,
            declaration_ids: vec![],
            evidence_refs: vec!["ev-a".into(), "ev-b".into()],
        }
    }

    #[test]
    fn renders_bounded_observed_tendency_prompt() {
        let plan = ProfileInterviewPlan {
            schema: PROFILE_INTERVIEW_PLAN_SCHEMA.into(),
            actor_key: "developer:mauro".into(),
            questions: vec![automation_question()],
        };
        let prompts = render_profile_interview_prompts(&plan).unwrap();
        assert_eq!(prompts[0].schema, PROFILE_INTERVIEW_PROMPT_SCHEMA);
        assert!(prompts[0].text.contains("recurring automation pattern"));
        assert_eq!(prompts[0].evidence_refs, vec!["ev-a", "ev-b"]);
    }

    #[test]
    fn answer_becomes_private_self_report_by_default_policy_input() {
        let declaration = profile_interview_answer_to_declaration(
            "developer:mauro",
            &automation_question(),
            "Yes. I deliberately automate repetitive development work.",
            "2026-09-24T00:10:00-03:00",
            ProfileDeclarationPublicationStatus::Private,
            vec!["kode".into(), "giteach".into()],
            None,
            None,
        )
        .unwrap();
        assert_eq!(
            declaration.category,
            ProfileDeclarationCategory::DevelopmentTendency
        );
        assert_eq!(declaration.key, "automation");
        assert_eq!(declaration.source_ref, "interview:confirm:automation");
        assert_eq!(
            declaration.publication_status,
            ProfileDeclarationPublicationStatus::Private
        );
    }

    #[test]
    fn ambiguous_question_requires_category_override() {
        let mut question = automation_question();
        question.kind = ProfileInterviewQuestionKind::ReconcileAmbiguity;
        question.category = None;
        question.subject_key = Some("current-role".into());
        let error = profile_interview_answer_to_declaration(
            "developer:mauro",
            &question,
            "Developer tooling engineer",
            "2026-09-24T00:10:00-03:00",
            ProfileDeclarationPublicationStatus::Private,
            vec![],
            None,
            None,
        )
        .unwrap_err();
        assert!(matches!(
            error,
            ProfileInterviewAdapterError::MissingCategory
        ));
    }
}
