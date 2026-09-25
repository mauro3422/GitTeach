use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::{PROFILE_PRESENTATION_PAYLOAD_SCHEMA, ProfilePresentationPayload};

pub const PROFILE_WIDGET_PLAN_SCHEMA: &str = "giteach-profile-widget-plan-v1";
const SURFACES: [&str; 2] = ["github-profile-readme", "portfolio"];

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProfileWidgetSource {
    pub plane: String,
    pub section: Option<String>,
    pub repository: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProfileWidget {
    pub id: String,
    pub kind: String,
    pub title: String,
    pub source: ProfileWidgetSource,
    pub visualization: String,
    pub value_meaning: String,
    pub surfaces: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProfileWidgetPlan {
    pub schema: String,
    pub actor_key: String,
    pub widgets: Vec<ProfileWidget>,
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum ProfileWidgetPlanError {
    #[error("unsupported profile presentation schema: {0}")]
    UnsupportedPresentationSchema(String),
}

fn widget(
    id: impl Into<String>,
    kind: impl Into<String>,
    title: impl Into<String>,
    source: (&str, Option<&str>, Option<&str>),
    visualization: &str,
    value_meaning: &str,
) -> ProfileWidget {
    ProfileWidget {
        id: id.into(),
        kind: kind.into(),
        title: title.into(),
        source: ProfileWidgetSource {
            plane: source.0.to_string(),
            section: source.1.map(str::to_string),
            repository: source.2.map(str::to_string),
        },
        visualization: visualization.to_string(),
        value_meaning: value_meaning.to_string(),
        surfaces: SURFACES.iter().map(|item| (*item).to_string()).collect(),
    }
}

pub fn plan_profile_widgets(
    payload: &ProfilePresentationPayload,
) -> Result<ProfileWidgetPlan, ProfileWidgetPlanError> {
    if payload.schema != PROFILE_PRESENTATION_PAYLOAD_SCHEMA {
        return Err(ProfileWidgetPlanError::UnsupportedPresentationSchema(
            payload.schema.clone(),
        ));
    }

    let mut widgets = Vec::new();
    let statistics = &payload.statistics;

    if !statistics.technology.languages.is_empty() || !statistics.technology.technologies.is_empty()
    {
        widgets.push(widget(
            "technology-footprint",
            "technology-footprint",
            "Technology footprint",
            ("statistics", Some("technology"), None),
            "ranked-bars",
            "repository prevalence is separate from observed file/byte volume",
        ));
    }
    if !statistics.tendencies.metrics.is_empty() {
        widgets.push(widget(
            "development-tendencies",
            "development-tendencies",
            "Development tendencies",
            ("statistics", Some("tendencies"), None),
            "prevalence-bars",
            "supporting repositories divided by analyzed repositories; not skill level",
        ));
    }
    if !statistics.domains.metrics.is_empty() {
        widgets.push(widget(
            "project-domains",
            "project-domains",
            "Project domains",
            ("statistics", Some("domains"), None),
            "prevalence-bars",
            "repositories supporting each project-domain candidate divided by analyzed repositories",
        ));
    }
    if !statistics.lifecycle.metrics.is_empty() {
        widgets.push(widget(
            "project-lifecycle",
            "project-lifecycle",
            "Project lifecycle",
            ("statistics", Some("lifecycle"), None),
            "metric-grid",
            "repository and reachable Git-tag counts; not quality or seniority",
        ));
    }
    if !statistics.collaboration.metrics.is_empty() && statistics.collaboration.coverage.is_some() {
        widgets.push(widget(
            "github-collaboration",
            "github-collaboration",
            "GitHub collaboration",
            ("statistics", Some("collaboration"), None),
            "event-grid",
            "observed events plus supporting repository counts under explicit collection coverage",
        ));
    }

    for evolution in &payload.technology_evolution {
        widgets.push(widget(
            format!("technology-evolution:{}", evolution.repository),
            "technology-evolution",
            format!("{} technology evolution", evolution.repository),
            ("technology-evolution", None, Some(&evolution.repository)),
            "timeline",
            "historical language file/byte observations at real sampled Git commits",
        ));
    }

    if !payload.publication_context.declarations.is_empty() {
        widgets.push(widget(
            "approved-profile-highlights",
            "approved-profile-highlights",
            "Profile highlights",
            ("publication-context", Some("declarations"), None),
            "text-cards",
            "explicitly approved self-reported or imported profile declarations; not deterministic statistics",
        ));
    }

    Ok(ProfileWidgetPlan {
        schema: PROFILE_WIDGET_PLAN_SCHEMA.to_string(),
        actor_key: payload.actor_key.clone(),
        widgets,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        PROFILE_PUBLICATION_CONTEXT_SCHEMA, PROFILE_STATISTICS_SCHEMA, ProfilePublicationContext,
        ProfileStatistics,
    };

    fn empty_payload() -> ProfilePresentationPayload {
        let statistics: ProfileStatistics = serde_json::from_value(serde_json::json!({
            "schema": PROFILE_STATISTICS_SCHEMA,
            "technology": { "analyzedRepositoryCount": 0, "languages": [], "technologies": [] },
            "tendencies": { "analyzedRepositoryCount": 0, "metrics": [] },
            "domains": { "analyzedRepositoryCount": 0, "metrics": [] },
            "lifecycle": { "analyzedRepositoryCount": 0, "metrics": [] },
            "collaboration": { "analyzedRepositoryCount": 0, "coverage": null, "metrics": [] }
        }))
        .unwrap();
        let publication_context: ProfilePublicationContext =
            serde_json::from_value(serde_json::json!({
                "schema": PROFILE_PUBLICATION_CONTEXT_SCHEMA,
                "actorKey": "developer:mauro",
                "declarations": []
            }))
            .unwrap();
        ProfilePresentationPayload {
            schema: PROFILE_PRESENTATION_PAYLOAD_SCHEMA.to_string(),
            actor_key: "developer:mauro".to_string(),
            statistics,
            technology_evolution: vec![],
            publication_context,
        }
    }

    #[test]
    fn empty_payload_produces_no_fabricated_widgets() {
        let plan = plan_profile_widgets(&empty_payload()).unwrap();
        assert_eq!(plan.schema, PROFILE_WIDGET_PLAN_SCHEMA);
        assert!(plan.widgets.is_empty());
    }

    #[test]
    fn rejects_incompatible_presentation_schema() {
        let mut payload = empty_payload();
        payload.schema = "wrong".into();
        assert!(matches!(
            plan_profile_widgets(&payload),
            Err(ProfileWidgetPlanError::UnsupportedPresentationSchema(_))
        ));
    }

    #[test]
    fn serialized_widget_plan_matches_shared_schema_fixture() {
        let plan = plan_profile_widgets(&empty_payload()).unwrap();
        let value = serde_json::to_value(plan).unwrap();
        let schema: serde_json::Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/profile-widget-plan-v1-schema.json"
        ))
        .unwrap();
        for field in schema["fields"].as_array().unwrap() {
            assert!(
                value.get(field.as_str().unwrap()).is_some(),
                "missing widget plan field {field}"
            );
        }
    }
}
