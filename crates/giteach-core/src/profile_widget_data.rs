use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};
use serde_json::Value;
use thiserror::Error;

use crate::{
    PROFILE_PRESENTATION_PAYLOAD_SCHEMA, PROFILE_WIDGET_PLAN_SCHEMA, ProfilePresentationPayload,
    ProfileWidget, ProfileWidgetPlan, ProfileWidgetSource,
};

pub const PROFILE_WIDGET_DATA_SCHEMA: &str = "giteach-profile-widget-data-v1";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProfileWidgetDataItem {
    pub id: String,
    pub kind: String,
    pub title: String,
    pub visualization: String,
    pub value_meaning: String,
    pub surfaces: Vec<String>,
    pub source: ProfileWidgetSource,
    pub data: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProfileWidgetData {
    pub schema: String,
    pub actor_key: String,
    pub widgets: Vec<ProfileWidgetDataItem>,
}

#[derive(Debug, Error)]
pub enum ProfileWidgetDataError {
    #[error("unsupported profile presentation schema: {0}")]
    UnsupportedPresentationSchema(String),
    #[error("unsupported profile widget plan schema: {0}")]
    UnsupportedWidgetPlanSchema(String),
    #[error("widget plan actor does not match presentation actor")]
    ActorMismatch,
    #[error("widget descriptor is incomplete: {0}")]
    IncompleteWidget(String),
    #[error("duplicate widget id: {0}")]
    DuplicateWidgetId(String),
    #[error("invalid widget source for {0}")]
    InvalidSource(String),
    #[error("missing widget source for {0}")]
    MissingSource(String),
    #[error("failed to serialize widget data: {0}")]
    Serialization(#[from] serde_json::Error),
}

fn source_value(
    payload: &ProfilePresentationPayload,
    widget: &ProfileWidget,
) -> Result<Value, ProfileWidgetDataError> {
    let source = &widget.source;
    match source.plane.as_str() {
        "statistics" => {
            if source.repository.is_some() {
                return Err(ProfileWidgetDataError::InvalidSource(widget.id.clone()));
            }
            match source.section.as_deref() {
                Some("technology") => Ok(serde_json::to_value(&payload.statistics.technology)?),
                Some("tendencies") => Ok(serde_json::to_value(&payload.statistics.tendencies)?),
                Some("domains") => Ok(serde_json::to_value(&payload.statistics.domains)?),
                Some("lifecycle") => Ok(serde_json::to_value(&payload.statistics.lifecycle)?),
                Some("collaboration") => {
                    Ok(serde_json::to_value(&payload.statistics.collaboration)?)
                }
                _ => Err(ProfileWidgetDataError::InvalidSource(widget.id.clone())),
            }
        }
        "technology-evolution" => {
            if source.section.is_some() {
                return Err(ProfileWidgetDataError::InvalidSource(widget.id.clone()));
            }
            let repository = source
                .repository
                .as_deref()
                .filter(|value| !value.trim().is_empty())
                .ok_or_else(|| ProfileWidgetDataError::InvalidSource(widget.id.clone()))?;
            let evolution = payload
                .technology_evolution
                .iter()
                .find(|item| item.repository == repository)
                .ok_or_else(|| ProfileWidgetDataError::MissingSource(widget.id.clone()))?;
            Ok(serde_json::to_value(evolution)?)
        }
        "publication-context" => {
            if source.section.as_deref() != Some("declarations") || source.repository.is_some() {
                return Err(ProfileWidgetDataError::InvalidSource(widget.id.clone()));
            }
            Ok(serde_json::to_value(
                &payload.publication_context.declarations,
            )?)
        }
        _ => Err(ProfileWidgetDataError::InvalidSource(widget.id.clone())),
    }
}

pub fn materialize_profile_widget_data(
    payload: &ProfilePresentationPayload,
    plan: &ProfileWidgetPlan,
) -> Result<ProfileWidgetData, ProfileWidgetDataError> {
    if payload.schema != PROFILE_PRESENTATION_PAYLOAD_SCHEMA {
        return Err(ProfileWidgetDataError::UnsupportedPresentationSchema(
            payload.schema.clone(),
        ));
    }
    if plan.schema != PROFILE_WIDGET_PLAN_SCHEMA {
        return Err(ProfileWidgetDataError::UnsupportedWidgetPlanSchema(
            plan.schema.clone(),
        ));
    }
    if payload.actor_key != plan.actor_key {
        return Err(ProfileWidgetDataError::ActorMismatch);
    }

    let mut seen = BTreeSet::new();
    let mut widgets = Vec::with_capacity(plan.widgets.len());
    for widget in &plan.widgets {
        if widget.id.trim().is_empty()
            || widget.kind.trim().is_empty()
            || widget.title.trim().is_empty()
            || widget.visualization.trim().is_empty()
            || widget.value_meaning.trim().is_empty()
            || widget.surfaces.is_empty()
            || widget
                .surfaces
                .iter()
                .any(|surface| surface.trim().is_empty())
        {
            return Err(ProfileWidgetDataError::IncompleteWidget(widget.id.clone()));
        }
        if !seen.insert(widget.id.clone()) {
            return Err(ProfileWidgetDataError::DuplicateWidgetId(widget.id.clone()));
        }

        widgets.push(ProfileWidgetDataItem {
            id: widget.id.clone(),
            kind: widget.kind.clone(),
            title: widget.title.clone(),
            visualization: widget.visualization.clone(),
            value_meaning: widget.value_meaning.clone(),
            surfaces: widget.surfaces.clone(),
            source: widget.source.clone(),
            data: source_value(payload, widget)?,
        });
    }

    Ok(ProfileWidgetData {
        schema: PROFILE_WIDGET_DATA_SCHEMA.to_string(),
        actor_key: payload.actor_key.clone(),
        widgets,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        PROFILE_PUBLICATION_CONTEXT_SCHEMA, PROFILE_STATISTICS_SCHEMA, plan_profile_widgets,
    };

    fn payload() -> ProfilePresentationPayload {
        serde_json::from_value(serde_json::json!({
            "schema": PROFILE_PRESENTATION_PAYLOAD_SCHEMA,
            "actorKey": "developer:mauro",
            "statistics": {
                "schema": PROFILE_STATISTICS_SCHEMA,
                "technology": { "analyzedRepositoryCount": 2, "languages": [{ "key": "rust", "label": "Rust", "repositoryCount": 2, "analyzedRepositoryCount": 2, "repositoryPrevalence": 1.0, "observedFileCount": 2, "observedFileUnit": "files", "observedByteCount": 200, "observedByteUnit": "bytes", "repositories": ["giteach", "kode"] }], "technologies": [] },
                "tendencies": { "analyzedRepositoryCount": 2, "metrics": [{ "key": "automation", "label": "Automation", "value": 1.0, "unit": "repository-prevalence", "supportingRepositoryCount": 2, "analyzedRepositoryCount": 2, "repositories": ["giteach", "kode"], "evidenceRefs": ["a", "b"] }] },
                "domains": { "analyzedRepositoryCount": 2, "metrics": [{ "key": "developer-tooling", "label": "Developer tooling", "value": 0.5, "unit": "repository-prevalence", "supportingRepositoryCount": 1, "analyzedRepositoryCount": 2, "repositories": ["kode"], "sourceRefs": ["a"] }] },
                "lifecycle": { "analyzedRepositoryCount": 0, "metrics": [] },
                "collaboration": { "analyzedRepositoryCount": 0, "coverage": null, "metrics": [] }
            },
            "technologyEvolution": [{
                "schema": "giteach-technology-evolution-v1", "repository": "kode", "source": "git-local-tree", "headCommit": "aaaa", "commitCount": 1, "snapshotCount": 1,
                "sampling": { "strategy": "evenly-spaced-commits-v1", "maxSnapshots": 8, "completeHistory": true },
                "snapshots": [{ "commit": "aaaa", "committedAt": "2026-09-24T10:00:00Z", "sourceFileCount": 1, "languages": [{ "language": "Rust", "files": 1, "bytes": 100 }] }], "deterministic": true
            }],
            "publicationContext": {
                "schema": PROFILE_PUBLICATION_CONTEXT_SCHEMA,
                "actorKey": "developer:mauro",
                "declarations": [{ "id": "decl-1", "category": "development-tendency", "key": "automation", "value": "I automate repetitive work.", "sourceKind": "user-answer", "repositories": ["kode"] }]
            }
        }))
        .unwrap()
    }

    #[test]
    fn resolves_only_each_planned_source_plane() {
        let payload = payload();
        let plan = plan_profile_widgets(&payload).unwrap();
        let result = materialize_profile_widget_data(&payload, &plan).unwrap();
        assert_eq!(result.schema, PROFILE_WIDGET_DATA_SCHEMA);
        assert_eq!(result.widgets.len(), 5);
        let technology = result
            .widgets
            .iter()
            .find(|item| item.kind == "technology-footprint")
            .unwrap();
        assert_eq!(technology.data["analyzedRepositoryCount"], 2);
        assert!(technology.data.get("declarations").is_none());
        let timeline = result
            .widgets
            .iter()
            .find(|item| item.kind == "technology-evolution")
            .unwrap();
        assert_eq!(timeline.data["repository"], "kode");
        let highlights = result
            .widgets
            .iter()
            .find(|item| item.kind == "approved-profile-highlights")
            .unwrap();
        assert_eq!(highlights.data[0]["value"], "I automate repetitive work.");
    }

    #[test]
    fn fails_closed_on_actor_mismatch_or_missing_timeline() {
        let payload = payload();
        let mut plan = plan_profile_widgets(&payload).unwrap();
        plan.actor_key = "developer:other".into();
        assert!(matches!(
            materialize_profile_widget_data(&payload, &plan),
            Err(ProfileWidgetDataError::ActorMismatch)
        ));

        let mut plan = plan_profile_widgets(&payload).unwrap();
        let timeline = plan
            .widgets
            .iter_mut()
            .find(|item| item.kind == "technology-evolution")
            .unwrap();
        timeline.source.repository = Some("missing".into());
        assert!(matches!(
            materialize_profile_widget_data(&payload, &plan),
            Err(ProfileWidgetDataError::MissingSource(_))
        ));
    }

    #[test]
    fn serialized_widget_data_matches_shared_schema_fixture() {
        let payload = payload();
        let plan = plan_profile_widgets(&payload).unwrap();
        let result = materialize_profile_widget_data(&payload, &plan).unwrap();
        let schema: Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/profile-widget-data-v1-schema.json"
        ))
        .unwrap();
        let value = serde_json::to_value(result).unwrap();
        for field in schema["fields"].as_array().unwrap() {
            assert!(
                value.get(field.as_str().unwrap()).is_some(),
                "missing widget data field {field}"
            );
        }
        let widget = &value["widgets"][0];
        for field in schema["widgetFields"].as_array().unwrap() {
            assert!(
                widget.get(field.as_str().unwrap()).is_some(),
                "missing widget item field {field}"
            );
        }
        for field in schema["sourceFields"].as_array().unwrap() {
            assert!(
                widget["source"].get(field.as_str().unwrap()).is_some(),
                "missing widget source field {field}"
            );
        }
    }

    #[test]
    fn statistics_source_rejects_repository_scope() {
        let payload = payload();
        let mut plan = plan_profile_widgets(&payload).unwrap();
        plan.widgets[0].source.repository = Some("kode".into());
        assert!(matches!(
            materialize_profile_widget_data(&payload, &plan),
            Err(ProfileWidgetDataError::InvalidSource(_))
        ));
    }
}
