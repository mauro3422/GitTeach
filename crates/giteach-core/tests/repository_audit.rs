use std::{fs, path::Path, process::Command};

use giteach_core::{
    CollectorOptions, REPOSITORY_AUDIT_SCHEMA, RemoteAuditRepositorySpec, RepositoryAuditAction,
    RepositoryAuditCacheManager, RepositoryInventoryCoverage, RepositorySummaryScope,
    diff_repository_audit_snapshots,
};
use tempfile::TempDir;

fn git(root: Option<&Path>, args: &[&str]) {
    let _ = git_output(root, args);
}

fn git_output(root: Option<&Path>, args: &[&str]) -> String {
    let mut command = Command::new("git");
    if let Some(root) = root {
        command.arg("-C").arg(root);
    }
    let output = command.args(args).output().expect("git should execute");
    assert!(
        output.status.success(),
        "git {:?} failed: {}",
        args,
        String::from_utf8_lossy(&output.stderr)
    );
    String::from_utf8(output.stdout).expect("git test output should be UTF-8")
}

fn write(path: impl AsRef<Path>, content: &str) {
    let path = path.as_ref();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).unwrap();
    }
    fs::write(path, content).unwrap();
}

fn commit_all(repo: &Path, message: &str) {
    git(Some(repo), &["add", "."]);
    git(Some(repo), &["commit", "-m", message]);
}

fn file_url(path: &Path) -> String {
    let mut normalized = path.to_string_lossy().replace('\\', "/");
    if let Some(stripped) = normalized.strip_prefix("//?/") {
        normalized = stripped.to_string();
    }
    if normalized.as_bytes().get(1) == Some(&b':') {
        format!("file:///{normalized}")
    } else {
        format!("file://{normalized}")
    }
}

#[test]
fn audits_remote_tree_without_persistent_checkout_and_hydrates_only_selected_blob() {
    let temp = TempDir::new().unwrap();
    let source = temp.path().join("source");
    let remote = temp.path().join("remote.git");
    let cache = temp.path().join("audit-cache");

    fs::create_dir_all(&source).unwrap();
    git(Some(&source), &["init", "-b", "main"]);
    git(
        Some(&source),
        &["config", "user.email", "giteach@example.test"],
    );
    git(Some(&source), &["config", "user.name", "GitTeach Test"]);
    write(source.join("README.md"), "# Demo\nAudit me.\n");
    write(source.join("src/main.rs"), "fn main() {}\n");
    write(
        source.join("notes.txt"),
        "Tracked but not selected for evidence.\n",
    );
    write(
        source.join("package.json"),
        r#"{"dependencies":{"typescript":"^5"}}"#,
    );
    write(source.join(".env"), "SECRET=never-index-this\n");
    commit_all(&source, "initial");

    let remote_string = remote.to_string_lossy().to_string();
    git(
        None,
        &["init", "--bare", "-b", "main", remote_string.as_str()],
    );
    git(Some(&remote), &["config", "uploadpack.allowFilter", "true"]);
    git(
        Some(&remote),
        &["config", "uploadpack.allowAnySHA1InWant", "true"],
    );
    git(
        Some(&source),
        &["remote", "add", "origin", remote_string.as_str()],
    );
    git(Some(&source), &["push", "-u", "origin", "main"]);

    let manager = RepositoryAuditCacheManager::new(&cache);
    let spec = RemoteAuditRepositorySpec {
        owner: "acme".into(),
        name: "demo".into(),
        remote_url: file_url(&remote),
    };

    let first = manager.prepare_remote(&spec).unwrap();
    assert_eq!(first.schema, REPOSITORY_AUDIT_SCHEMA);
    assert_eq!(first.action, RepositoryAuditAction::Initialized);
    assert_eq!(first.branch, "main");
    assert!(first.entries.iter().any(|entry| entry.path == "README.md"));
    assert!(
        first
            .entries
            .iter()
            .any(|entry| entry.path == "src/main.rs")
    );
    assert!(!first.entries.iter().any(|entry| entry.path == ".env"));
    assert!(!Path::new(&first.git_dir).join("README.md").exists());

    let targets = manager
        .analysis_targets(&first, &CollectorOptions::default())
        .unwrap();
    assert!(targets.iter().any(|entry| entry.path == "README.md"));
    assert!(targets.iter().any(|entry| entry.path == "package.json"));
    assert!(targets.iter().any(|entry| entry.path == "src/main.rs"));

    let readme_object_id = first
        .entries
        .iter()
        .find(|entry| entry.path == "README.md")
        .unwrap()
        .git_object_id
        .clone();
    let missing_marker = format!("?{readme_object_id}");
    let persistent_missing_before = git_output(
        Some(Path::new(&first.git_dir)),
        &[
            "rev-list",
            "--objects",
            "--missing=print",
            "refs/giteach/head",
        ],
    );
    assert!(
        persistent_missing_before
            .lines()
            .any(|line| line == missing_marker)
    );

    let bundle = manager
        .collect_selected_evidence(&first, &CollectorOptions::default())
        .unwrap();
    assert_eq!(
        bundle.coverage.inventory,
        RepositoryInventoryCoverage::CompletePolicyFiltered
    );
    assert_eq!(
        bundle.coverage.summary_scope,
        RepositorySummaryScope::SelectedContent
    );
    assert_eq!(bundle.coverage.known_path_count, first.entries.len() as u64);
    assert_eq!(bundle.summary.files_scanned, targets.len() as u64);
    assert!(bundle.summary.files_scanned < bundle.coverage.known_path_count);
    assert_eq!(
        bundle.repository.remote_url.as_deref(),
        Some(spec.remote_url.as_str())
    );
    assert_eq!(
        bundle.repository.head_commit.as_deref(),
        Some(first.head_commit.as_str())
    );
    assert!(
        !bundle
            .evidence
            .iter()
            .any(|record| record.path == "notes.txt")
    );
    assert!(bundle.evidence.iter().all(|record| {
        record.metadata.contains_key("gitObjectId")
            && record.metadata.contains_key("hydratedSha256")
            && record.metadata.contains_key("auditTreeObjectId")
    }));

    let readme = manager
        .hydrate_blob(&first, "README.md", 64 * 1024)
        .unwrap();
    assert_eq!(
        String::from_utf8(readme.bytes).unwrap(),
        "# Demo\nAudit me.\n"
    );
    assert_eq!(readme.sha256.len(), 64);
    let persistent_missing_after = git_output(
        Some(Path::new(&first.git_dir)),
        &[
            "rev-list",
            "--objects",
            "--missing=print",
            "refs/giteach/head",
        ],
    );
    assert!(
        persistent_missing_after
            .lines()
            .any(|line| line == missing_marker)
    );

    write(
        source.join("src/main.rs"),
        "fn main() { println!(\"v2\"); }\n",
    );
    write(source.join("docs/ARCHITECTURE.md"), "# Architecture\n");
    commit_all(&source, "update");
    git(Some(&source), &["push", "origin", "main"]);

    let second = manager.prepare_remote(&spec).unwrap();
    assert_eq!(second.action, RepositoryAuditAction::Updated);
    assert_ne!(first.head_commit, second.head_commit);
    let delta = diff_repository_audit_snapshots(&first, &second);
    assert_eq!(delta.added_paths, vec!["docs/ARCHITECTURE.md"]);
    assert_eq!(delta.modified_paths, vec!["src/main.rs"]);
    assert!(delta.deleted_paths.is_empty());

    let third = manager.prepare_remote(&spec).unwrap();
    assert_eq!(third.action, RepositoryAuditAction::Unchanged);
    assert_eq!(second.head_commit, third.head_commit);
    assert_eq!(second.tree_object_id, third.tree_object_id);
}
