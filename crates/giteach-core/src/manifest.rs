use std::{collections::BTreeSet, path::Path};

use serde_json::Value;

use crate::model::TechnologySignal;

pub fn manifest_kind(path: &Path) -> Option<&'static str> {
    match path.file_name().and_then(|value| value.to_str())? {
        "package.json" => Some("npm"),
        "Cargo.toml" => Some("cargo"),
        "pyproject.toml" => Some("python"),
        "requirements.txt" => Some("python-requirements"),
        "go.mod" => Some("go"),
        "project.godot" => Some("godot"),
        _ => None,
    }
}

pub fn technology_signals(path: &Path, text: &str) -> Vec<TechnologySignal> {
    let Some(kind) = manifest_kind(path) else {
        return Vec::new();
    };
    let names = match kind {
        "npm" => npm_dependencies(text),
        "cargo" => cargo_dependencies(text),
        "python" => pyproject_dependencies(text),
        "python-requirements" => requirement_dependencies(text),
        "go" => go_dependencies(text),
        "godot" => BTreeSet::from(["Godot".to_string()]),
        _ => BTreeSet::new(),
    };

    let source_path = path.to_string_lossy().replace('\\', "/");
    names
        .into_iter()
        .map(|name| TechnologySignal {
            name,
            source_path: source_path.clone(),
            source_kind: kind.to_string(),
        })
        .collect()
}

fn npm_dependencies(text: &str) -> BTreeSet<String> {
    let Ok(value) = serde_json::from_str::<Value>(text) else {
        return BTreeSet::new();
    };
    let mut out = BTreeSet::new();
    for field in ["dependencies", "devDependencies", "peerDependencies"] {
        if let Some(map) = value.get(field).and_then(Value::as_object) {
            out.extend(map.keys().cloned());
        }
    }
    out
}

fn cargo_dependencies(text: &str) -> BTreeSet<String> {
    let Ok(value) = text.parse::<toml::Table>() else {
        return BTreeSet::new();
    };
    let mut out = BTreeSet::new();
    for field in ["dependencies", "dev-dependencies", "build-dependencies"] {
        if let Some(table) = value.get(field).and_then(toml::Value::as_table) {
            out.extend(table.keys().cloned());
        }
    }
    out
}
fn pyproject_dependencies(text: &str) -> BTreeSet<String> {
    let Ok(value) = text.parse::<toml::Table>() else {
        return BTreeSet::new();
    };
    let mut out = BTreeSet::new();

    if let Some(items) = value
        .get("project")
        .and_then(|v| v.get("dependencies"))
        .and_then(toml::Value::as_array)
    {
        for item in items.iter().filter_map(toml::Value::as_str) {
            out.insert(normalize_python_requirement(item));
        }
    }

    if let Some(table) = value
        .get("tool")
        .and_then(|v| v.get("poetry"))
        .and_then(|v| v.get("dependencies"))
        .and_then(toml::Value::as_table)
    {
        out.extend(table.keys().filter(|name| *name != "python").cloned());
    }
    out.retain(|name| !name.is_empty());
    out
}

fn requirement_dependencies(text: &str) -> BTreeSet<String> {
    text.lines()
        .map(str::trim)
        .filter(|line| !line.is_empty() && !line.starts_with('#') && !line.starts_with('-'))
        .map(normalize_python_requirement)
        .filter(|name| !name.is_empty())
        .collect()
}
fn go_dependencies(text: &str) -> BTreeSet<String> {
    let mut out = BTreeSet::new();
    let mut in_block = false;
    for raw in text.lines() {
        let line = raw.trim();
        if line == "require (" {
            in_block = true;
            continue;
        }
        if in_block && line == ")" {
            in_block = false;
            continue;
        }
        let candidate = if let Some(rest) = line.strip_prefix("require ") {
            rest
        } else if in_block {
            line
        } else {
            continue;
        };
        if let Some(name) = candidate.split_whitespace().next()
            && !name.is_empty()
        {
            out.insert(name.to_string());
        }
    }
    out
}

fn normalize_python_requirement(value: &str) -> String {
    value
        .split(['=', '<', '>', '!', '~', '[', ';', ' '])
        .next()
        .unwrap_or("")
        .trim()
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_cargo_dependencies() {
        let text = r#"
[package]
name = "demo"
version = "0.1.0"

[dependencies]
serde = { version = "1", features = ["derive"] }
sha2 = "0.10"
"#;
        let signals = technology_signals(Path::new("Cargo.toml"), text);
        let names: BTreeSet<_> = signals.into_iter().map(|item| item.name).collect();
        assert!(names.contains("serde"));
        assert!(names.contains("sha2"));
    }

    #[test]
    fn extracts_npm_dependencies() {
        let text = r#"{"dependencies":{"typescript":"^5"},"devDependencies":{"vitest":"^1"}}"#;
        let signals = technology_signals(Path::new("package.json"), text);
        let names: BTreeSet<_> = signals.into_iter().map(|item| item.name).collect();
        assert!(names.contains("typescript"));
        assert!(names.contains("vitest"));
    }
}
