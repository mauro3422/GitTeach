use std::path::{Component, Path};

const DENIED_DIRS: &[&str] = &[
    ".git",
    "node_modules",
    "target",
    "dist",
    "build",
    "vendor",
    ".venv",
    "venv",
    "coverage",
    "__pycache__",
];

const SENSITIVE_NAMES: &[&str] = &[
    ".env",
    "credentials.json",
    "secrets.json",
    "id_rsa",
    "id_ed25519",
];

pub fn is_denied_path(path: &Path) -> bool {
    if path.components().any(denied_component) {
        return true;
    }

    let Some(name) = path.file_name().and_then(|value| value.to_str()) else {
        return false;
    };
    let lower = name.to_ascii_lowercase();
    SENSITIVE_NAMES.contains(&lower.as_str())
        || lower.starts_with(".env.")
        || lower.contains("credential")
        || lower.contains("secret")
        || lower.contains("token")
        || matches!(
            path.extension()
                .and_then(|value| value.to_str())
                .map(str::to_ascii_lowercase)
                .as_deref(),
            Some("pem" | "key" | "p12" | "pfx")
        )
}

fn denied_component(component: Component<'_>) -> bool {
    let Component::Normal(value) = component else {
        return false;
    };
    let text = value.to_string_lossy();
    DENIED_DIRS
        .iter()
        .any(|denied| text.eq_ignore_ascii_case(denied))
}

pub fn is_probably_binary(bytes: &[u8]) -> bool {
    bytes.iter().take(8192).any(|byte| *byte == 0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_sensitive_and_generated_paths() {
        assert!(is_denied_path(Path::new("node_modules/pkg/index.js")));
        assert!(is_denied_path(Path::new("config/.env.local")));
        assert!(is_denied_path(Path::new("private/server.key")));
        assert!(!is_denied_path(Path::new(".github/workflows/ci.yml")));
    }
}
