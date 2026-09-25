use std::{fs, path::Path, process::Command};

use giteach_core::{
    REPOSITORY_WORKSPACE_SCHEMA, RemoteRepositorySpec, RepositoryWorkspaceAction,
    RepositoryWorkspaceManager,
};
use tempfile::TempDir;

fn git(root: Option<&Path>, args: &[&str]) {
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
}

fn commit_file(repo: &Path, content: &str, message: &str) {
    fs::write(repo.join("README.md"), content).unwrap();
    git(Some(repo), &["add", "README.md"]);
    git(Some(repo), &["commit", "-m", message]);
}

#[test]
fn clones_once_then_fetches_and_fast_forwards_managed_repository() {
    let temp = TempDir::new().unwrap();
    let source = temp.path().join("source");
    let remote = temp.path().join("remote.git");
    let cache = temp.path().join("cache");

    fs::create_dir_all(&source).unwrap();
    git(Some(&source), &["init", "-b", "main"]);
    git(
        Some(&source),
        &["config", "user.email", "giteach@example.test"],
    );
    git(Some(&source), &["config", "user.name", "GitTeach Test"]);
    commit_file(&source, "v1\n", "initial");

    let remote_string = remote.to_string_lossy().to_string();
    git(
        None,
        &["init", "--bare", "-b", "main", remote_string.as_str()],
    );
    git(
        Some(&source),
        &["remote", "add", "origin", remote_string.as_str()],
    );
    git(Some(&source), &["push", "-u", "origin", "main"]);

    let manager = RepositoryWorkspaceManager::new(&cache);
    let spec = RemoteRepositorySpec {
        owner: "acme".into(),
        name: "demo".into(),
        remote_url: remote_string,
    };

    let first = manager.prepare_remote(&spec).unwrap();
    assert_eq!(first.schema, REPOSITORY_WORKSPACE_SCHEMA);
    assert_eq!(first.action, RepositoryWorkspaceAction::Cloned);
    assert_eq!(
        fs::read_to_string(Path::new(&first.root).join("README.md"))
            .unwrap()
            .trim_end(),
        "v1"
    );

    commit_file(&source, "v2\n", "update");
    git(Some(&source), &["push", "origin", "main"]);

    let second = manager.prepare_remote(&spec).unwrap();
    assert_eq!(second.action, RepositoryWorkspaceAction::Updated);
    assert_ne!(first.head_commit, second.head_commit);
    assert_eq!(
        fs::read_to_string(Path::new(&second.root).join("README.md"))
            .unwrap()
            .trim_end(),
        "v2"
    );

    let third = manager.prepare_remote(&spec).unwrap();
    assert_eq!(third.action, RepositoryWorkspaceAction::Unchanged);
    assert_eq!(second.head_commit, third.head_commit);
}
