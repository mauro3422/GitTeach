use std::{
    fs,
    path::{Path, PathBuf},
    process::{Command, Output},
};

use serde::{Deserialize, Serialize};
use thiserror::Error;

pub const REPOSITORY_WORKSPACE_SCHEMA: &str = "giteach-repository-workspace-v1";

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum RepositoryWorkspaceAction {
    Cloned,
    Updated,
    Unchanged,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RemoteRepositorySpec {
    pub owner: String,
    pub name: String,
    pub remote_url: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ManagedRepositoryWorkspace {
    pub schema: String,
    pub owner: String,
    pub repository: String,
    pub root: String,
    pub remote_url: String,
    pub head_commit: String,
    pub action: RepositoryWorkspaceAction,
}

#[derive(Debug, Error)]
pub enum RepositoryWorkspaceError {
    #[error("repository owner/name must be a safe path segment")]
    InvalidRepositoryIdentity,
    #[error("repository remote URL must not contain embedded HTTP credentials")]
    CredentialedRemote,
    #[error(
        "repository remote must be HTTPS, SSH, file://, git@host:path, or an absolute local path"
    )]
    UnsupportedRemote,
    #[error("failed to prepare repository cache directory: {0}")]
    CacheDirectory(String),
    #[error("managed repository path exists but is not a Git work tree: {0}")]
    NotGitRepository(String),
    #[error("managed repository origin does not match the requested remote")]
    RemoteMismatch,
    #[error("repository is on a detached HEAD; managed refresh requires a branch")]
    DetachedHead,
    #[error("git executable is unavailable: {0}")]
    GitUnavailable(String),
    #[error("git {operation} failed: {message}")]
    GitFailed {
        operation: &'static str,
        message: String,
    },
    #[error("git {operation} returned invalid UTF-8")]
    InvalidGitOutput { operation: &'static str },
}

#[derive(Debug, Clone)]
pub struct RepositoryWorkspaceManager {
    cache_root: PathBuf,
}

impl RepositoryWorkspaceManager {
    pub fn new(cache_root: impl Into<PathBuf>) -> Self {
        Self {
            cache_root: cache_root.into(),
        }
    }

    pub fn cache_root(&self) -> &Path {
        &self.cache_root
    }

    pub fn repository_root(
        &self,
        owner: &str,
        repository: &str,
    ) -> Result<PathBuf, RepositoryWorkspaceError> {
        if !safe_segment(owner) || !safe_segment(repository) {
            return Err(RepositoryWorkspaceError::InvalidRepositoryIdentity);
        }
        Ok(self.cache_root.join(owner).join(repository))
    }

    pub fn prepare_remote(
        &self,
        spec: &RemoteRepositorySpec,
    ) -> Result<ManagedRepositoryWorkspace, RepositoryWorkspaceError> {
        validate_remote(&spec.remote_url)?;
        let root = self.repository_root(&spec.owner, &spec.name)?;
        fs::create_dir_all(&self.cache_root)
            .map_err(|error| RepositoryWorkspaceError::CacheDirectory(error.to_string()))?;

        let action = if root.exists() {
            self.refresh_existing(&root, &spec.remote_url)?
        } else {
            if let Some(parent) = root.parent() {
                fs::create_dir_all(parent)
                    .map_err(|error| RepositoryWorkspaceError::CacheDirectory(error.to_string()))?;
            }
            git_command(
                None,
                "clone",
                [
                    "clone",
                    "--filter=blob:none",
                    "--origin",
                    "origin",
                    spec.remote_url.as_str(),
                    root.to_string_lossy().as_ref(),
                ],
            )?;
            RepositoryWorkspaceAction::Cloned
        };

        let head_commit = git_value(&root, "head", ["rev-parse", "HEAD"])?;
        let remote_url = git_value(
            &root,
            "origin-url",
            ["config", "--get", "remote.origin.url"],
        )?;

        Ok(ManagedRepositoryWorkspace {
            schema: REPOSITORY_WORKSPACE_SCHEMA.to_string(),
            owner: spec.owner.clone(),
            repository: spec.name.clone(),
            root: root.to_string_lossy().to_string(),
            remote_url,
            head_commit,
            action,
        })
    }

    fn refresh_existing(
        &self,
        root: &Path,
        expected_remote: &str,
    ) -> Result<RepositoryWorkspaceAction, RepositoryWorkspaceError> {
        let inside = git_value(
            root,
            "work-tree-check",
            ["rev-parse", "--is-inside-work-tree"],
        )
        .map_err(|_| RepositoryWorkspaceError::NotGitRepository(root.display().to_string()))?;
        if inside != "true" {
            return Err(RepositoryWorkspaceError::NotGitRepository(
                root.display().to_string(),
            ));
        }

        let origin = git_value(root, "origin-url", ["config", "--get", "remote.origin.url"])?;
        if normalize_remote(&origin) != normalize_remote(expected_remote) {
            return Err(RepositoryWorkspaceError::RemoteMismatch);
        }

        let before = git_value(root, "head-before-refresh", ["rev-parse", "HEAD"])?;
        git_command(
            Some(root),
            "fetch",
            ["fetch", "--prune", "--tags", "origin"],
        )?;

        let branch = git_value(root, "current-branch", ["branch", "--show-current"])?;
        if branch.is_empty() {
            return Err(RepositoryWorkspaceError::DetachedHead);
        }
        let remote_branch = format!("origin/{branch}");
        git_command(
            Some(root),
            "fast-forward",
            ["merge", "--ff-only", remote_branch.as_str()],
        )?;
        let after = git_value(root, "head-after-refresh", ["rev-parse", "HEAD"])?;

        Ok(if before == after {
            RepositoryWorkspaceAction::Unchanged
        } else {
            RepositoryWorkspaceAction::Updated
        })
    }
}

fn safe_segment(value: &str) -> bool {
    !value.is_empty()
        && value != "."
        && value != ".."
        && value.len() <= 128
        && value.chars().all(|character| {
            character.is_ascii_alphanumeric() || matches!(character, '-' | '_' | '.')
        })
}

fn validate_remote(remote: &str) -> Result<(), RepositoryWorkspaceError> {
    let remote = remote.trim();
    if remote.is_empty() {
        return Err(RepositoryWorkspaceError::UnsupportedRemote);
    }

    if let Some(authority_and_path) = remote.strip_prefix("https://") {
        let authority = authority_and_path
            .split('/')
            .next()
            .unwrap_or(authority_and_path);
        if authority.contains('@') {
            return Err(RepositoryWorkspaceError::CredentialedRemote);
        }
        return Ok(());
    }

    if remote.starts_with("ssh://") {
        return Ok(());
    }

    if remote.starts_with("git@")
        || remote.starts_with("file://")
        || Path::new(remote).is_absolute()
    {
        return Ok(());
    }

    Err(RepositoryWorkspaceError::UnsupportedRemote)
}

fn normalize_remote(remote: &str) -> String {
    remote.trim().trim_end_matches('/').to_string()
}

fn git_value<const N: usize>(
    root: &Path,
    operation: &'static str,
    args: [&str; N],
) -> Result<String, RepositoryWorkspaceError> {
    let output = git_output(Some(root), operation, args)?;
    let value = String::from_utf8(output.stdout)
        .map_err(|_| RepositoryWorkspaceError::InvalidGitOutput { operation })?;
    Ok(value.trim().to_string())
}

fn git_command<const N: usize>(
    root: Option<&Path>,
    operation: &'static str,
    args: [&str; N],
) -> Result<(), RepositoryWorkspaceError> {
    git_output(root, operation, args).map(|_| ())
}

fn git_output<const N: usize>(
    root: Option<&Path>,
    operation: &'static str,
    args: [&str; N],
) -> Result<Output, RepositoryWorkspaceError> {
    let mut command = Command::new("git");
    if let Some(root) = root {
        command.arg("-C").arg(root);
    }
    let output = command
        .args(args)
        .output()
        .map_err(|error| RepositoryWorkspaceError::GitUnavailable(error.to_string()))?;

    if output.status.success() {
        return Ok(output);
    }

    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let message = if !stderr.is_empty() { stderr } else { stdout };
    Err(RepositoryWorkspaceError::GitFailed { operation, message })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_http_credentials_and_unsafe_repository_segments() {
        assert!(matches!(
            validate_remote("https://token:secret@github.com/acme/demo.git"),
            Err(RepositoryWorkspaceError::CredentialedRemote)
        ));

        let manager = RepositoryWorkspaceManager::new("cache");
        assert!(matches!(
            manager.repository_root("acme", "../demo"),
            Err(RepositoryWorkspaceError::InvalidRepositoryIdentity)
        ));
    }
}
