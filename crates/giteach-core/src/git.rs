use std::{path::Path, process::Command};

use crate::model::RepositoryIdentity;

pub fn repository_identity(root: &Path) -> RepositoryIdentity {
    RepositoryIdentity {
        name: root
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("repository")
            .to_string(),
        root: root.to_string_lossy().to_string(),
        remote_url: git_value(root, &["config", "--get", "remote.origin.url"])
            .map(|value| sanitize_remote_url(&value)),
        branch: git_value(root, &["branch", "--show-current"]),
        head_commit: git_value(root, &["rev-parse", "HEAD"]),
        head_commit_time: git_value(root, &["log", "-1", "--format=%cI"]),
    }
}

fn git_value(root: &Path, args: &[&str]) -> Option<String> {
    let output = Command::new("git")
        .arg("-C")
        .arg(root)
        .args(args)
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let value = String::from_utf8(output.stdout).ok()?.trim().to_string();
    if value.is_empty() { None } else { Some(value) }
}

fn sanitize_remote_url(value: &str) -> String {
    let without_suffix = value.split(['?', '#']).next().unwrap_or(value);
    let Some(scheme_pos) = without_suffix.find("://") else {
        return without_suffix.to_string();
    };

    let authority_start = scheme_pos + 3;
    let tail = &without_suffix[authority_start..];
    let authority_end = tail.find('/').unwrap_or(tail.len());
    let authority = &tail[..authority_end];
    let rest = &tail[authority_end..];

    if let Some(at) = authority.rfind('@') {
        let host = &authority[at + 1..];
        format!("{}://{}{}", &without_suffix[..scheme_pos], host, rest)
    } else {
        without_suffix.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strips_http_remote_credentials() {
        assert_eq!(
            sanitize_remote_url("https://token:secret@github.com/acme/demo.git?x=1"),
            "https://github.com/acme/demo.git"
        );
    }
}
