use std::{
    collections::{BTreeMap, BTreeSet},
    fs,
    path::{Path, PathBuf},
    process::{Command, Output},
};

use serde::{Deserialize, Serialize};
use serde_json::json;
use sha2::{Digest, Sha256};
use tempfile::TempDir;
use thiserror::Error;

use crate::{
    collector::{
        CollectorOptions, RepoEvidenceCollector, SelectedRepositoryFile, classify_evidence,
        language_for_path, profile_signal_kind,
    },
    model::{RepoEvidenceBundle, RepositoryIdentity},
    policy::is_denied_path,
};

pub const REPOSITORY_AUDIT_SCHEMA: &str = "giteach-repository-audit-cache-v1";

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum RepositoryAuditAction {
    Initialized,
    Updated,
    Unchanged,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RemoteAuditRepositorySpec {
    pub owner: String,
    pub name: String,
    pub remote_url: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RepositoryAuditEntry {
    pub path: String,
    pub git_object_id: String,
    pub kind: String,
    pub language: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RepositoryAuditSnapshot {
    pub schema: String,
    pub owner: String,
    pub repository: String,
    pub git_dir: String,
    pub remote_url: String,
    pub branch: String,
    pub head_commit: String,
    pub head_commit_time: String,
    pub tree_object_id: String,
    pub action: RepositoryAuditAction,
    pub entries: Vec<RepositoryAuditEntry>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RepositoryAuditDelta {
    pub from_commit: String,
    pub to_commit: String,
    pub added_paths: Vec<String>,
    pub modified_paths: Vec<String>,
    pub deleted_paths: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HydratedAuditBlob {
    pub path: String,
    pub git_object_id: String,
    pub sha256: String,
    pub bytes: Vec<u8>,
}

#[derive(Debug, Error)]
pub enum RepositoryAuditError {
    #[error("repository owner/name must be a safe path segment")]
    InvalidRepositoryIdentity,
    #[error("repository remote URL must not contain embedded HTTP credentials")]
    CredentialedRemote,
    #[error(
        "repository remote must be HTTPS, SSH, file://, git@host:path, or an absolute local path"
    )]
    UnsupportedRemote,
    #[error("failed to prepare repository audit cache directory: {0}")]
    CacheDirectory(String),
    #[error("audit cache path exists but is not a bare Git repository: {0}")]
    NotBareRepository(String),
    #[error("audit cache origin does not match the requested remote")]
    RemoteMismatch,
    #[error("remote HEAD did not resolve to a branch and commit")]
    RemoteHeadUnavailable,
    #[error("snapshot does not belong to this audit cache manager")]
    SnapshotPathMismatch,
    #[error("snapshot does not contain requested path: {0}")]
    UnknownSnapshotPath(String),
    #[error("remote HEAD changed before selective hydration; expected {expected}, got {actual}")]
    SnapshotDrift { expected: String, actual: String },
    #[error("hydrated blob exceeds configured byte limit: {bytes} > {limit}")]
    BlobTooLarge { bytes: usize, limit: usize },
    #[error("git executable is unavailable: {0}")]
    GitUnavailable(String),
    #[error("git {operation} failed: {message}")]
    GitFailed {
        operation: &'static str,
        message: String,
    },
    #[error("git {operation} returned invalid UTF-8")]
    InvalidGitOutput { operation: &'static str },
    #[error("failed to collect hydrated repository evidence: {0}")]
    Collection(String),
}

#[derive(Debug, Clone)]
pub struct RepositoryAuditCacheManager {
    cache_root: PathBuf,
}

impl RepositoryAuditCacheManager {
    pub fn new(cache_root: impl Into<PathBuf>) -> Self {
        Self {
            cache_root: cache_root.into(),
        }
    }

    pub fn cache_root(&self) -> &Path {
        &self.cache_root
    }

    pub fn audit_git_dir(
        &self,
        owner: &str,
        repository: &str,
    ) -> Result<PathBuf, RepositoryAuditError> {
        if !safe_segment(owner) || !safe_segment(repository) {
            return Err(RepositoryAuditError::InvalidRepositoryIdentity);
        }
        Ok(self
            .cache_root
            .join(owner)
            .join(format!("{repository}.git")))
    }

    pub fn prepare_remote(
        &self,
        spec: &RemoteAuditRepositorySpec,
    ) -> Result<RepositoryAuditSnapshot, RepositoryAuditError> {
        validate_remote(&spec.remote_url)?;
        let git_dir = self.audit_git_dir(&spec.owner, &spec.name)?;
        if let Some(parent) = git_dir.parent() {
            fs::create_dir_all(parent)
                .map_err(|error| RepositoryAuditError::CacheDirectory(error.to_string()))?;
        }

        let initialized = if git_dir.exists() {
            self.verify_existing(&git_dir, &spec.remote_url)?;
            false
        } else {
            git_command(
                None,
                "init-bare",
                ["init", "--bare", git_dir.to_string_lossy().as_ref()],
            )?;
            git_command(
                Some(&git_dir),
                "remote-add",
                ["remote", "add", "origin", spec.remote_url.as_str()],
            )?;
            git_command(
                Some(&git_dir),
                "promisor-config",
                ["config", "remote.origin.promisor", "true"],
            )?;
            git_command(
                Some(&git_dir),
                "partial-clone-filter-config",
                ["config", "remote.origin.partialclonefilter", "blob:none"],
            )?;
            true
        };

        let remote_head = resolve_remote_head(&spec.remote_url)?;
        let before = git_value_optional(
            &git_dir,
            "cached-head",
            ["rev-parse", "--verify", "refs/giteach/head"],
        )?;

        let action = if before.as_deref() == Some(remote_head.commit.as_str()) {
            RepositoryAuditAction::Unchanged
        } else {
            let source_ref = format!("refs/heads/{}", remote_head.branch);
            let refspec = format!("+{source_ref}:refs/giteach/head");
            git_command(
                Some(&git_dir),
                "fetch-current-tree",
                [
                    "fetch",
                    "--depth=1",
                    "--no-tags",
                    "--filter=blob:none",
                    "origin",
                    refspec.as_str(),
                ],
            )?;
            if initialized || before.is_none() {
                RepositoryAuditAction::Initialized
            } else {
                RepositoryAuditAction::Updated
            }
        };

        let head_commit = git_value(
            &git_dir,
            "head",
            ["rev-parse", "--verify", "refs/giteach/head"],
        )?;
        let head_commit_time = git_value(
            &git_dir,
            "head-time",
            ["show", "-s", "--format=%cI", head_commit.as_str()],
        )?;
        let tree_ref = format!("{head_commit}^{{tree}}");
        let tree_object_id = git_value(&git_dir, "tree", ["rev-parse", tree_ref.as_str()])?;
        let remote_url = git_value(
            &git_dir,
            "origin-url",
            ["config", "--get", "remote.origin.url"],
        )?;
        let entries = list_tree_entries(&git_dir, &head_commit)?;

        Ok(RepositoryAuditSnapshot {
            schema: REPOSITORY_AUDIT_SCHEMA.to_string(),
            owner: spec.owner.clone(),
            repository: spec.name.clone(),
            git_dir: git_dir.to_string_lossy().to_string(),
            remote_url,
            branch: remote_head.branch,
            head_commit,
            head_commit_time,
            tree_object_id,
            action,
            entries,
        })
    }

    pub fn analysis_targets(
        &self,
        snapshot: &RepositoryAuditSnapshot,
        options: &CollectorOptions,
    ) -> Result<Vec<RepositoryAuditEntry>, RepositoryAuditError> {
        self.verify_snapshot_path(snapshot)?;

        let mut manifests = Vec::new();
        let mut docs = Vec::new();
        let mut tests = Vec::new();
        let mut tooling = Vec::new();
        let mut profile_signals = Vec::new();
        let mut source_by_language = BTreeMap::<String, RepositoryAuditEntry>::new();
        let mut source_overflow = Vec::new();

        for entry in &snapshot.entries {
            match entry.kind.as_str() {
                "manifest" => {
                    if manifests.len() < 16 {
                        manifests.push(entry.clone());
                    }
                }
                "documentation" => {
                    if docs.len() < options.max_doc_evidence {
                        docs.push(entry.clone());
                    }
                }
                "test" => {
                    if tests.len() < options.max_test_evidence {
                        tests.push(entry.clone());
                    }
                }
                "tooling" => {
                    if tooling.len() < options.max_tooling_evidence {
                        tooling.push(entry.clone());
                    }
                }
                "observability" | "benchmark" => {
                    if profile_signals.len() < options.max_profile_signal_evidence {
                        profile_signals.push(entry.clone());
                    }
                }
                "source" => {
                    let language = entry
                        .language
                        .clone()
                        .unwrap_or_else(|| "Other".to_string());
                    source_by_language
                        .entry(language)
                        .or_insert_with(|| entry.clone());
                    if source_overflow.len() < options.max_source_evidence {
                        source_overflow.push(entry.clone());
                    }
                }
                _ => {}
            }
        }

        let mut source = Vec::new();
        let mut selected_paths = BTreeSet::new();
        for entry in source_by_language
            .values()
            .take(options.max_source_evidence)
        {
            selected_paths.insert(entry.path.clone());
            source.push(entry.clone());
        }
        for entry in source_overflow {
            if source.len() >= options.max_source_evidence {
                break;
            }
            if selected_paths.insert(entry.path.clone()) {
                source.push(entry);
            }
        }

        let mut targets = manifests;
        targets.extend(docs);
        targets.extend(tests);
        targets.extend(tooling);
        targets.extend(profile_signals);
        targets.extend(source);
        targets.sort_by(|a, b| a.kind.cmp(&b.kind).then_with(|| a.path.cmp(&b.path)));
        Ok(targets)
    }

    pub fn hydrate_blob(
        &self,
        snapshot: &RepositoryAuditSnapshot,
        path: &str,
        max_bytes: usize,
    ) -> Result<HydratedAuditBlob, RepositoryAuditError> {
        let paths = vec![path.to_string()];
        self.hydrate_blobs(snapshot, &paths, max_bytes)?
            .into_iter()
            .next()
            .ok_or_else(|| RepositoryAuditError::UnknownSnapshotPath(path.to_string()))
    }

    pub fn hydrate_blobs(
        &self,
        snapshot: &RepositoryAuditSnapshot,
        paths: &[String],
        max_bytes_per_blob: usize,
    ) -> Result<Vec<HydratedAuditBlob>, RepositoryAuditError> {
        self.verify_snapshot_path(snapshot)?;
        let mut entries = Vec::with_capacity(paths.len());
        for path in paths {
            let entry = snapshot
                .entries
                .iter()
                .find(|entry| entry.path == *path)
                .ok_or_else(|| RepositoryAuditError::UnknownSnapshotPath(path.clone()))?;
            entries.push(entry.clone());
        }
        if entries.is_empty() {
            return Ok(Vec::new());
        }

        let temporary = TempDir::new()
            .map_err(|error| RepositoryAuditError::CacheDirectory(error.to_string()))?;
        let git_dir = temporary.path().join("hydration.git");
        git_command(
            None,
            "hydrate-init-bare",
            ["init", "--bare", git_dir.to_string_lossy().as_ref()],
        )?;
        git_command(
            Some(&git_dir),
            "hydrate-remote-add",
            ["remote", "add", "origin", snapshot.remote_url.as_str()],
        )?;
        git_command(
            Some(&git_dir),
            "hydrate-promisor-config",
            ["config", "remote.origin.promisor", "true"],
        )?;
        git_command(
            Some(&git_dir),
            "hydrate-partial-clone-filter-config",
            ["config", "remote.origin.partialclonefilter", "blob:none"],
        )?;
        let source_ref = format!("refs/heads/{}", snapshot.branch);
        let refspec = format!("+{source_ref}:refs/giteach/head");
        git_command(
            Some(&git_dir),
            "hydrate-fetch-current-tree",
            [
                "fetch",
                "--depth=1",
                "--no-tags",
                "--filter=blob:none",
                "origin",
                refspec.as_str(),
            ],
        )?;
        let current = git_value(
            &git_dir,
            "hydrate-head",
            ["rev-parse", "--verify", "refs/giteach/head"],
        )?;
        if current != snapshot.head_commit {
            return Err(RepositoryAuditError::SnapshotDrift {
                expected: snapshot.head_commit.clone(),
                actual: current,
            });
        }

        let mut hydrated = Vec::with_capacity(entries.len());
        for entry in entries {
            let output = git_output(
                Some(&git_dir),
                "hydrate-blob",
                ["cat-file", "blob", entry.git_object_id.as_str()],
            )?;
            if output.stdout.len() > max_bytes_per_blob {
                return Err(RepositoryAuditError::BlobTooLarge {
                    bytes: output.stdout.len(),
                    limit: max_bytes_per_blob,
                });
            }
            let sha256 = format!("{:x}", Sha256::digest(&output.stdout));
            hydrated.push(HydratedAuditBlob {
                path: entry.path,
                git_object_id: entry.git_object_id,
                sha256,
                bytes: output.stdout,
            });
        }
        Ok(hydrated)
    }

    pub fn collect_selected_evidence(
        &self,
        snapshot: &RepositoryAuditSnapshot,
        options: &CollectorOptions,
    ) -> Result<RepoEvidenceBundle, RepositoryAuditError> {
        let targets = self.analysis_targets(snapshot, options)?;
        let paths = targets
            .iter()
            .map(|entry| entry.path.clone())
            .collect::<Vec<_>>();
        let hydrated = self.hydrate_blobs(snapshot, &paths, options.max_file_bytes as usize)?;
        let mut audit_identity = BTreeMap::new();
        let mut files = Vec::with_capacity(hydrated.len());
        for blob in hydrated {
            audit_identity.insert(
                blob.path.clone(),
                (blob.git_object_id.clone(), blob.sha256.clone()),
            );
            files.push(SelectedRepositoryFile {
                path: blob.path,
                bytes: blob.bytes,
            });
        }

        let repository = RepositoryIdentity {
            name: snapshot.repository.clone(),
            root: snapshot.remote_url.clone(),
            remote_url: Some(snapshot.remote_url.clone()),
            branch: Some(snapshot.branch.clone()),
            head_commit: Some(snapshot.head_commit.clone()),
            head_commit_time: Some(snapshot.head_commit_time.clone()),
        };
        let collector = RepoEvidenceCollector::new(options.clone());
        let mut bundle = collector
            .collect_selected_content(repository, snapshot.entries.len() as u64, &files)
            .map_err(|error| RepositoryAuditError::Collection(error.to_string()))?;

        for record in &mut bundle.evidence {
            if let Some((git_object_id, hydrated_sha256)) = audit_identity.get(&record.path) {
                record
                    .metadata
                    .insert("gitObjectId".into(), json!(git_object_id));
                record
                    .metadata
                    .insert("hydratedSha256".into(), json!(hydrated_sha256));
                record
                    .metadata
                    .insert("auditTreeObjectId".into(), json!(snapshot.tree_object_id));
            }
        }
        Ok(bundle)
    }

    fn verify_existing(
        &self,
        git_dir: &Path,
        expected_remote: &str,
    ) -> Result<(), RepositoryAuditError> {
        let bare = git_value(git_dir, "bare-check", ["rev-parse", "--is-bare-repository"])
            .map_err(|_| RepositoryAuditError::NotBareRepository(git_dir.display().to_string()))?;
        if bare != "true" {
            return Err(RepositoryAuditError::NotBareRepository(
                git_dir.display().to_string(),
            ));
        }
        let origin = git_value(
            git_dir,
            "origin-url",
            ["config", "--get", "remote.origin.url"],
        )?;
        if normalize_remote(&origin) != normalize_remote(expected_remote) {
            return Err(RepositoryAuditError::RemoteMismatch);
        }
        Ok(())
    }

    fn verify_snapshot_path(
        &self,
        snapshot: &RepositoryAuditSnapshot,
    ) -> Result<PathBuf, RepositoryAuditError> {
        let expected = self.audit_git_dir(&snapshot.owner, &snapshot.repository)?;
        let actual = PathBuf::from(&snapshot.git_dir);
        if expected != actual {
            return Err(RepositoryAuditError::SnapshotPathMismatch);
        }
        Ok(actual)
    }
}

pub fn diff_repository_audit_snapshots(
    before: &RepositoryAuditSnapshot,
    after: &RepositoryAuditSnapshot,
) -> RepositoryAuditDelta {
    let before_map: BTreeMap<_, _> = before
        .entries
        .iter()
        .map(|entry| (entry.path.as_str(), entry.git_object_id.as_str()))
        .collect();
    let after_map: BTreeMap<_, _> = after
        .entries
        .iter()
        .map(|entry| (entry.path.as_str(), entry.git_object_id.as_str()))
        .collect();

    let added_paths = after_map
        .keys()
        .filter(|path| !before_map.contains_key(**path))
        .map(|path| (*path).to_string())
        .collect();
    let deleted_paths = before_map
        .keys()
        .filter(|path| !after_map.contains_key(**path))
        .map(|path| (*path).to_string())
        .collect();
    let modified_paths = after_map
        .iter()
        .filter_map(|(path, object_id)| {
            before_map
                .get(path)
                .filter(|before_id| *before_id != object_id)
                .map(|_| (*path).to_string())
        })
        .collect();

    RepositoryAuditDelta {
        from_commit: before.head_commit.clone(),
        to_commit: after.head_commit.clone(),
        added_paths,
        modified_paths,
        deleted_paths,
    }
}

#[derive(Debug)]
struct RemoteHead {
    branch: String,
    commit: String,
}

fn resolve_remote_head(remote: &str) -> Result<RemoteHead, RepositoryAuditError> {
    let output = git_output(
        None,
        "ls-remote-head",
        ["ls-remote", "--symref", remote, "HEAD"],
    )?;
    let text =
        String::from_utf8(output.stdout).map_err(|_| RepositoryAuditError::InvalidGitOutput {
            operation: "ls-remote-head",
        })?;
    let mut branch = None;
    let mut commit = None;
    for line in text.lines() {
        if let Some(rest) = line.strip_prefix("ref: ") {
            if let Some((reference, target)) = rest.split_once('\t')
                && target == "HEAD"
            {
                branch = reference.strip_prefix("refs/heads/").map(str::to_string);
            }
            continue;
        }
        if let Some((object_id, target)) = line.split_once('\t')
            && target == "HEAD"
        {
            commit = Some(object_id.to_string());
        }
    }
    match (branch, commit) {
        (Some(branch), Some(commit)) => Ok(RemoteHead { branch, commit }),
        _ => Err(RepositoryAuditError::RemoteHeadUnavailable),
    }
}

fn list_tree_entries(
    git_dir: &Path,
    commit: &str,
) -> Result<Vec<RepositoryAuditEntry>, RepositoryAuditError> {
    let output = git_output(Some(git_dir), "ls-tree", ["ls-tree", "-r", "-z", commit])?;
    let text =
        String::from_utf8(output.stdout).map_err(|_| RepositoryAuditError::InvalidGitOutput {
            operation: "ls-tree",
        })?;
    let mut entries = Vec::new();
    for record in text.split('\0').filter(|record| !record.is_empty()) {
        let Some((metadata, path)) = record.split_once('\t') else {
            continue;
        };
        let mut fields = metadata.split_whitespace();
        let _mode = fields.next();
        let object_type = fields.next();
        let object_id = fields.next();
        if object_type != Some("blob") {
            continue;
        }
        let Some(object_id) = object_id else {
            continue;
        };
        let path_ref = Path::new(path);
        if is_denied_path(path_ref) {
            continue;
        }
        let kind = profile_signal_kind(path_ref).unwrap_or_else(|| classify_evidence(path_ref));
        entries.push(RepositoryAuditEntry {
            path: path.replace('\\', "/"),
            git_object_id: object_id.to_string(),
            kind: kind.to_string(),
            language: language_for_path(path_ref).map(str::to_string),
        });
    }
    entries.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(entries)
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

fn validate_remote(remote: &str) -> Result<(), RepositoryAuditError> {
    let remote = remote.trim();
    if remote.is_empty() {
        return Err(RepositoryAuditError::UnsupportedRemote);
    }
    if let Some(authority_and_path) = remote.strip_prefix("https://") {
        let authority = authority_and_path
            .split('/')
            .next()
            .unwrap_or(authority_and_path);
        if authority.contains('@') {
            return Err(RepositoryAuditError::CredentialedRemote);
        }
        return Ok(());
    }
    if remote.starts_with("ssh://")
        || remote.starts_with("git@")
        || remote.starts_with("file://")
        || Path::new(remote).is_absolute()
    {
        return Ok(());
    }
    Err(RepositoryAuditError::UnsupportedRemote)
}

fn normalize_remote(remote: &str) -> String {
    remote.trim().trim_end_matches('/').to_string()
}

fn git_value<const N: usize>(
    root: &Path,
    operation: &'static str,
    args: [&str; N],
) -> Result<String, RepositoryAuditError> {
    let output = git_output(Some(root), operation, args)?;
    let value = String::from_utf8(output.stdout)
        .map_err(|_| RepositoryAuditError::InvalidGitOutput { operation })?;
    Ok(value.trim().to_string())
}

fn git_value_optional<const N: usize>(
    root: &Path,
    operation: &'static str,
    args: [&str; N],
) -> Result<Option<String>, RepositoryAuditError> {
    let mut command = Command::new("git");
    command.arg("-C").arg(root).args(args);
    let output = command
        .output()
        .map_err(|error| RepositoryAuditError::GitUnavailable(error.to_string()))?;
    if !output.status.success() {
        return Ok(None);
    }
    let value = String::from_utf8(output.stdout)
        .map_err(|_| RepositoryAuditError::InvalidGitOutput { operation })?;
    Ok(Some(value.trim().to_string()))
}

fn git_command<const N: usize>(
    root: Option<&Path>,
    operation: &'static str,
    args: [&str; N],
) -> Result<(), RepositoryAuditError> {
    git_output(root, operation, args).map(|_| ())
}

fn git_output<const N: usize>(
    root: Option<&Path>,
    operation: &'static str,
    args: [&str; N],
) -> Result<Output, RepositoryAuditError> {
    let mut command = Command::new("git");
    if let Some(root) = root {
        command.arg("-C").arg(root);
    }
    let output = command
        .args(args)
        .output()
        .map_err(|error| RepositoryAuditError::GitUnavailable(error.to_string()))?;
    if output.status.success() {
        return Ok(output);
    }
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let message = if !stderr.is_empty() { stderr } else { stdout };
    Err(RepositoryAuditError::GitFailed { operation, message })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_credentialed_remote_and_unsafe_identity() {
        assert!(matches!(
            validate_remote("https://token:secret@github.com/acme/demo.git"),
            Err(RepositoryAuditError::CredentialedRemote)
        ));
        let manager = RepositoryAuditCacheManager::new("cache");
        assert!(matches!(
            manager.audit_git_dir("acme", "../demo"),
            Err(RepositoryAuditError::InvalidRepositoryIdentity)
        ));
    }
}
