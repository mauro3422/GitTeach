use std::{
    collections::BTreeMap,
    fs,
    path::{Path, PathBuf},
};

use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::{REPOSITORY_AUDIT_SCHEMA, RepositoryAuditEntry, RepositoryAuditSnapshot};

pub const REPOSITORY_AUDIT_HISTORY_SCHEMA: &str = "giteach-repository-audit-history-v1";
pub const REPOSITORY_AUDIT_RECEIPT_SCHEMA: &str = "giteach-repository-audit-receipt-v1";

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryAuditReceipt {
    pub schema: String,
    pub owner: String,
    pub repository: String,
    pub remote_url: String,
    pub branch: String,
    pub head_commit: String,
    pub head_commit_time: String,
    pub tree_object_id: String,
    pub entries: Vec<RepositoryAuditEntry>,
}

impl RepositoryAuditReceipt {
    pub fn from_snapshot(
        snapshot: &RepositoryAuditSnapshot,
    ) -> Result<Self, RepositoryAuditStoreError> {
        if snapshot.schema != REPOSITORY_AUDIT_SCHEMA {
            return Err(RepositoryAuditStoreError::InvalidSnapshot);
        }
        Ok(Self {
            schema: REPOSITORY_AUDIT_RECEIPT_SCHEMA.to_string(),
            owner: snapshot.owner.clone(),
            repository: snapshot.repository.clone(),
            remote_url: snapshot.remote_url.clone(),
            branch: snapshot.branch.clone(),
            head_commit: snapshot.head_commit.clone(),
            head_commit_time: snapshot.head_commit_time.clone(),
            tree_object_id: snapshot.tree_object_id.clone(),
            entries: snapshot.entries.clone(),
        })
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryAuditHistoryFile {
    pub schema: String,
    pub owner: String,
    pub repository: String,
    pub receipts: Vec<RepositoryAuditReceipt>,
}

#[derive(Debug, Error)]
pub enum RepositoryAuditStoreError {
    #[error("repository audit history io failure: {0}")]
    Io(#[from] std::io::Error),
    #[error("repository audit history JSON is malformed: {0}")]
    Json(#[from] serde_json::Error),
    #[error("expected repository audit history schema {0}")]
    WrongSchema(String),
    #[error("repository audit snapshot is invalid")]
    InvalidSnapshot,
    #[error("repository audit receipt is invalid")]
    InvalidReceipt,
    #[error("repository audit history mixes repository identities")]
    RepositoryMismatch,
    #[error("same commit was observed with conflicting tree identity")]
    ConflictingCommitTree,
}

pub fn load_repository_audit_history(
    path: impl AsRef<Path>,
) -> Result<Option<RepositoryAuditHistoryFile>, RepositoryAuditStoreError> {
    let path = path.as_ref();
    if !path.exists() {
        return Ok(None);
    }
    let history: RepositoryAuditHistoryFile = serde_json::from_slice(&fs::read(path)?)?;
    validate_history(&history)?;
    Ok(Some(history))
}

pub fn save_repository_audit_history(
    path: impl AsRef<Path>,
    history: &RepositoryAuditHistoryFile,
) -> Result<(), RepositoryAuditStoreError> {
    let path = path.as_ref();
    validate_history(history)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let bytes = serde_json::to_vec_pretty(history)?;
    let temporary = temporary_path(path);
    fs::write(&temporary, bytes)?;
    if let Err(error) = fs::rename(&temporary, path) {
        if path.exists() {
            fs::remove_file(path)?;
            fs::rename(&temporary, path)?;
        } else {
            return Err(error.into());
        }
    }
    Ok(())
}

pub fn merge_and_save_repository_audit_snapshot(
    path: impl AsRef<Path>,
    snapshot: &RepositoryAuditSnapshot,
) -> Result<RepositoryAuditHistoryFile, RepositoryAuditStoreError> {
    let path = path.as_ref();
    let receipt = RepositoryAuditReceipt::from_snapshot(snapshot)?;
    let history = match load_repository_audit_history(path)? {
        Some(existing) => merge_receipt(existing, receipt)?,
        None => RepositoryAuditHistoryFile {
            schema: REPOSITORY_AUDIT_HISTORY_SCHEMA.to_string(),
            owner: receipt.owner.clone(),
            repository: receipt.repository.clone(),
            receipts: vec![receipt],
        },
    };
    save_repository_audit_history(path, &history)?;
    Ok(history)
}

fn merge_receipt(
    mut history: RepositoryAuditHistoryFile,
    receipt: RepositoryAuditReceipt,
) -> Result<RepositoryAuditHistoryFile, RepositoryAuditStoreError> {
    validate_history(&history)?;
    validate_receipt(&receipt)?;
    if history.owner != receipt.owner || history.repository != receipt.repository {
        return Err(RepositoryAuditStoreError::RepositoryMismatch);
    }

    let existing_by_commit: BTreeMap<_, _> = history
        .receipts
        .iter()
        .map(|item| (item.head_commit.as_str(), item.tree_object_id.as_str()))
        .collect();
    if let Some(tree) = existing_by_commit.get(receipt.head_commit.as_str()) {
        if *tree != receipt.tree_object_id {
            return Err(RepositoryAuditStoreError::ConflictingCommitTree);
        }
        return Ok(history);
    }

    history.receipts.push(receipt);
    Ok(history)
}

fn validate_history(history: &RepositoryAuditHistoryFile) -> Result<(), RepositoryAuditStoreError> {
    if history.schema != REPOSITORY_AUDIT_HISTORY_SCHEMA {
        return Err(RepositoryAuditStoreError::WrongSchema(
            REPOSITORY_AUDIT_HISTORY_SCHEMA.to_string(),
        ));
    }
    if history.owner.trim().is_empty() || history.repository.trim().is_empty() {
        return Err(RepositoryAuditStoreError::RepositoryMismatch);
    }
    let mut commits = BTreeMap::new();
    for receipt in &history.receipts {
        validate_receipt(receipt)?;
        if receipt.owner != history.owner || receipt.repository != history.repository {
            return Err(RepositoryAuditStoreError::RepositoryMismatch);
        }
        if let Some(previous_tree) = commits.insert(&receipt.head_commit, &receipt.tree_object_id)
            && previous_tree != &receipt.tree_object_id
        {
            return Err(RepositoryAuditStoreError::ConflictingCommitTree);
        }
    }
    Ok(())
}

fn validate_receipt(receipt: &RepositoryAuditReceipt) -> Result<(), RepositoryAuditStoreError> {
    if receipt.schema != REPOSITORY_AUDIT_RECEIPT_SCHEMA
        || receipt.owner.trim().is_empty()
        || receipt.repository.trim().is_empty()
        || receipt.remote_url.trim().is_empty()
        || receipt.branch.trim().is_empty()
        || receipt.head_commit.trim().is_empty()
        || receipt.head_commit_time.trim().is_empty()
        || receipt.tree_object_id.trim().is_empty()
        || receipt.entries.iter().any(|entry| {
            entry.path.trim().is_empty()
                || entry.git_object_id.trim().is_empty()
                || entry.kind.trim().is_empty()
        })
    {
        return Err(RepositoryAuditStoreError::InvalidReceipt);
    }
    Ok(())
}

fn temporary_path(path: &Path) -> PathBuf {
    let mut name = path
        .file_name()
        .map(|value| value.to_string_lossy().into_owned())
        .unwrap_or_else(|| "repository-audit-history.json".to_string());
    name.push_str(&format!(".tmp-{}", std::process::id()));
    path.with_file_name(name)
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use crate::RepositoryAuditAction;

    use super::*;

    fn snapshot(commit: &str, tree: &str) -> RepositoryAuditSnapshot {
        RepositoryAuditSnapshot {
            schema: REPOSITORY_AUDIT_SCHEMA.into(),
            owner: "acme".into(),
            repository: "demo".into(),
            git_dir: "C:/temp/audit.git".into(),
            remote_url: "https://example.test/acme/demo.git".into(),
            branch: "main".into(),
            head_commit: commit.into(),
            head_commit_time: "2026-09-24T17:00:00+00:00".into(),
            tree_object_id: tree.into(),
            action: RepositoryAuditAction::Updated,
            entries: vec![RepositoryAuditEntry {
                path: "src/main.rs".into(),
                git_object_id: "blob-1".into(),
                kind: "source".into(),
                language: Some("Rust".into()),
            }],
        }
    }

    #[test]
    fn history_persists_only_audit_identity_not_cache_path_or_source_bytes() {
        let root = tempdir().unwrap();
        let path = root.path().join("history.json");
        let first = merge_and_save_repository_audit_snapshot(&path, &snapshot("c1", "t1")).unwrap();
        assert_eq!(first.receipts.len(), 1);
        let second =
            merge_and_save_repository_audit_snapshot(&path, &snapshot("c2", "t2")).unwrap();
        assert_eq!(second.receipts.len(), 2);
        let deduped =
            merge_and_save_repository_audit_snapshot(&path, &snapshot("c2", "t2")).unwrap();
        assert_eq!(deduped.receipts.len(), 2);

        let serialized = fs::read_to_string(path).unwrap();
        assert!(!serialized.contains("gitDir"));
        assert!(!serialized.contains("C:/temp/audit.git"));
        assert!(!serialized.contains("bytes"));
        assert!(serialized.contains("git_object_id"));
        assert!(serialized.contains("headCommit"));
    }
}
