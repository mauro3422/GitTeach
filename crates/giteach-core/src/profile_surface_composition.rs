use std::collections::{BTreeMap, BTreeSet};

use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::{PROFILE_WIDGET_DATA_SCHEMA, ProfileWidgetData};

pub const PROFILE_SURFACE_COMPOSITION_SCHEMA: &str = "giteach-profile-surface-composition-v1";
pub const PROFILE_SURFACES: [&str; 2] = ["github-profile-readme", "portfolio"];

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProfileSurfaceSection {
    pub id: String,
    pub title: String,
    pub widget_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProfileSurfaceComposition {
    pub schema: String,
    pub actor_key: String,
    pub surface: String,
    pub sections: Vec<ProfileSurfaceSection>,
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum ProfileSurfaceCompositionError {
    #[error("unsupported profile widget data schema: {0}")]
    UnsupportedWidgetDataSchema(String),
    #[error("unsupported profile surface: {0}")]
    UnsupportedSurface(String),
    #[error("widget data contains an empty id")]
    EmptyWidgetId,
    #[error("duplicate widget id: {0}")]
    DuplicateWidgetId(String),
    #[error("unsupported widget kind for composition: {0}")]
    UnsupportedWidgetKind(String),
}

fn section_for_kind(kind: &str) -> Option<&'static str> {
    match kind {
        "approved-profile-highlights" => Some("profile"),
        "technology-footprint" => Some("technology"),
        "development-tendencies" | "project-domains" => Some("patterns"),
        "project-lifecycle" | "technology-evolution" => Some("history"),
        "github-collaboration" => Some("collaboration"),
        _ => None,
    }
}

fn section_title(id: &str) -> &'static str {
    match id {
        "profile" => "Profile highlights",
        "technology" => "Technology",
        "patterns" => "Development patterns",
        "history" => "Project history",
        "collaboration" => "Collaboration",
        _ => "",
    }
}

fn section_order(surface: &str) -> Option<&'static [&'static str]> {
    match surface {
        "github-profile-readme" => Some(&[
            "profile",
            "technology",
            "patterns",
            "history",
            "collaboration",
        ]),
        "portfolio" => Some(&[
            "profile",
            "patterns",
            "technology",
            "history",
            "collaboration",
        ]),
        _ => None,
    }
}

pub fn compose_profile_surface(
    widget_data: &ProfileWidgetData,
    surface: &str,
) -> Result<ProfileSurfaceComposition, ProfileSurfaceCompositionError> {
    if widget_data.schema != PROFILE_WIDGET_DATA_SCHEMA {
        return Err(ProfileSurfaceCompositionError::UnsupportedWidgetDataSchema(
            widget_data.schema.clone(),
        ));
    }
    let order = section_order(surface)
        .ok_or_else(|| ProfileSurfaceCompositionError::UnsupportedSurface(surface.to_string()))?;

    let mut groups: BTreeMap<&str, Vec<String>> = BTreeMap::new();
    let mut seen = BTreeSet::new();
    for widget in &widget_data.widgets {
        let id = widget.id.trim();
        if id.is_empty() {
            return Err(ProfileSurfaceCompositionError::EmptyWidgetId);
        }
        if !seen.insert(id.to_string()) {
            return Err(ProfileSurfaceCompositionError::DuplicateWidgetId(
                id.to_string(),
            ));
        }
        if !widget.surfaces.iter().any(|item| item == surface) {
            continue;
        }
        let section = section_for_kind(&widget.kind).ok_or_else(|| {
            ProfileSurfaceCompositionError::UnsupportedWidgetKind(widget.kind.clone())
        })?;
        groups.entry(section).or_default().push(id.to_string());
    }

    let sections = order
        .iter()
        .filter_map(|id| {
            groups.get(id).map(|widget_ids| ProfileSurfaceSection {
                id: (*id).to_string(),
                title: section_title(id).to_string(),
                widget_ids: widget_ids.clone(),
            })
        })
        .collect();

    Ok(ProfileSurfaceComposition {
        schema: PROFILE_SURFACE_COMPOSITION_SCHEMA.to_string(),
        actor_key: widget_data.actor_key.clone(),
        surface: surface.to_string(),
        sections,
    })
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;
    use crate::{ProfileWidgetDataItem, ProfileWidgetSource};

    fn widget(id: &str, kind: &str, surfaces: &[&str]) -> ProfileWidgetDataItem {
        ProfileWidgetDataItem {
            id: id.into(),
            kind: kind.into(),
            title: id.into(),
            visualization: "test".into(),
            value_meaning: "test semantic meaning".into(),
            surfaces: surfaces.iter().map(|item| (*item).to_string()).collect(),
            source: ProfileWidgetSource {
                plane: "statistics".into(),
                section: Some("technology".into()),
                repository: None,
            },
            data: json!({ "secretMarker": format!("data:{id}") }),
        }
    }

    fn widget_data() -> ProfileWidgetData {
        let both = ["github-profile-readme", "portfolio"];
        ProfileWidgetData {
            schema: PROFILE_WIDGET_DATA_SCHEMA.into(),
            actor_key: "developer:mauro".into(),
            widgets: vec![
                widget("highlights", "approved-profile-highlights", &both),
                widget("technology", "technology-footprint", &both),
                widget("tendencies", "development-tendencies", &both),
                widget("domains", "project-domains", &both),
                widget("lifecycle", "project-lifecycle", &both),
                widget("timeline:kode", "technology-evolution", &both),
                widget("collaboration", "github-collaboration", &both),
            ],
        }
    }

    #[test]
    fn github_composition_orders_semantic_sections_without_copying_widget_data() {
        let result = compose_profile_surface(&widget_data(), "github-profile-readme").unwrap();
        assert_eq!(
            result
                .sections
                .iter()
                .map(|item| item.id.as_str())
                .collect::<Vec<_>>(),
            vec![
                "profile",
                "technology",
                "patterns",
                "history",
                "collaboration"
            ]
        );
        assert_eq!(
            result
                .sections
                .iter()
                .find(|item| item.id == "history")
                .unwrap()
                .widget_ids,
            vec!["lifecycle", "timeline:kode"]
        );
        let serialized = serde_json::to_string(&result).unwrap();
        assert!(!serialized.contains("secretMarker"));
        assert!(!serialized.contains("data:technology"));
    }

    #[test]
    fn portfolio_has_distinct_order_and_respects_surface_filter() {
        let mut data = widget_data();
        data.widgets
            .iter_mut()
            .find(|item| item.id == "collaboration")
            .unwrap()
            .surfaces = vec!["portfolio".into()];
        let github = compose_profile_surface(&data, "github-profile-readme").unwrap();
        let portfolio = compose_profile_surface(&data, "portfolio").unwrap();
        assert_eq!(
            portfolio
                .sections
                .iter()
                .map(|item| item.id.as_str())
                .collect::<Vec<_>>(),
            vec![
                "profile",
                "patterns",
                "technology",
                "history",
                "collaboration"
            ]
        );
        assert!(
            !github
                .sections
                .iter()
                .any(|item| item.id == "collaboration")
        );
    }

    #[test]
    fn duplicate_ids_and_unknown_visible_kinds_fail_closed() {
        let mut duplicate = widget_data();
        duplicate.widgets[1].id = duplicate.widgets[0].id.clone();
        assert!(matches!(
            compose_profile_surface(&duplicate, "portfolio"),
            Err(ProfileSurfaceCompositionError::DuplicateWidgetId(_))
        ));

        let mut unknown = widget_data();
        unknown.widgets.push(widget(
            "future",
            "unknown-kind",
            &["github-profile-readme", "portfolio"],
        ));
        assert!(matches!(
            compose_profile_surface(&unknown, "portfolio"),
            Err(ProfileSurfaceCompositionError::UnsupportedWidgetKind(_))
        ));
    }

    #[test]
    fn serialized_composition_matches_shared_schema_fixture() {
        let result = compose_profile_surface(&widget_data(), "portfolio").unwrap();
        let schema: serde_json::Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/profile-surface-composition-v1-schema.json"
        ))
        .unwrap();
        let value = serde_json::to_value(result).unwrap();
        for field in schema["fields"].as_array().unwrap() {
            assert!(
                value.get(field.as_str().unwrap()).is_some(),
                "missing composition field {field}"
            );
        }
        for field in schema["sectionFields"].as_array().unwrap() {
            assert!(
                value["sections"][0].get(field.as_str().unwrap()).is_some(),
                "missing section field {field}"
            );
        }
    }
}
