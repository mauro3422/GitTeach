use std::fs;
use std::path::Path;
use std::process::Command;

use giteach_core::{TechnologyEvolutionOptions, collect_technology_evolution};
use tempfile::tempdir;

fn git(root: &Path, args: &[&str]) -> String {
    let output = Command::new("git")
        .arg("-C")
        .arg(root)
        .args(args)
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "git {:?} failed: {}",
        args,
        String::from_utf8_lossy(&output.stderr)
    );
    String::from_utf8_lossy(&output.stdout).trim().to_string()
}

fn commit_all(root: &Path, message: &str, date: &str) -> String {
    git(root, &["add", "."]);
    let status = Command::new("git")
        .arg("-C")
        .arg(root)
        .args([
            "-c",
            "user.name=GitTeach Test",
            "-c",
            "user.email=giteach@example.invalid",
            "commit",
            "-m",
            message,
        ])
        .env("GIT_AUTHOR_DATE", date)
        .env("GIT_COMMITTER_DATE", date)
        .status()
        .unwrap();
    assert!(status.success());
    git(root, &["rev-parse", "HEAD"])
}

#[test]
fn collects_real_historical_language_snapshots_without_checkout_or_worktree_mutation() {
    let root = tempdir().unwrap();
    git(root.path(), &["init"]);

    fs::create_dir_all(root.path().join("src")).unwrap();
    fs::write(root.path().join("src/app.ts"), "export const v = 1;\n").unwrap();
    let first = commit_all(root.path(), "typescript", "2026-01-01T10:00:00Z");

    fs::write(
        root.path().join("src/lib.rs"),
        "pub fn value() -> u8 { 1 }\n",
    )
    .unwrap();
    let second = commit_all(root.path(), "add rust", "2026-02-01T10:00:00Z");

    fs::remove_file(root.path().join("src/app.ts")).unwrap();
    fs::write(
        root.path().join("src/lib.rs"),
        "pub fn value() -> u8 { 2 }\n",
    )
    .unwrap();
    let third = commit_all(root.path(), "rust only", "2026-03-01T10:00:00Z");

    let branch_before = git(root.path(), &["branch", "--show-current"]);
    let head_before = git(root.path(), &["rev-parse", "HEAD"]);
    let status_before = git(root.path(), &["status", "--porcelain"]);

    let evolution = collect_technology_evolution(
        root.path(),
        TechnologyEvolutionOptions { max_snapshots: 12 },
    )
    .unwrap();

    assert_eq!(evolution.commit_count, 3);
    assert_eq!(evolution.snapshot_count, 3);
    assert!(evolution.sampling.complete_history);
    assert_eq!(
        evolution
            .snapshots
            .iter()
            .map(|item| item.commit.as_str())
            .collect::<Vec<_>>(),
        vec![first, second, third]
    );
    assert_eq!(
        evolution.snapshots[0]
            .languages
            .iter()
            .map(|item| item.language.as_str())
            .collect::<Vec<_>>(),
        vec!["TypeScript"]
    );
    assert_eq!(
        evolution.snapshots[1]
            .languages
            .iter()
            .map(|item| item.language.as_str())
            .collect::<Vec<_>>(),
        vec!["Rust", "TypeScript"]
    );
    assert_eq!(
        evolution.snapshots[2]
            .languages
            .iter()
            .map(|item| item.language.as_str())
            .collect::<Vec<_>>(),
        vec!["Rust"]
    );
    assert_eq!(
        git(root.path(), &["branch", "--show-current"]),
        branch_before
    );
    assert_eq!(git(root.path(), &["rev-parse", "HEAD"]), head_before);
    assert_eq!(git(root.path(), &["status", "--porcelain"]), status_before);
}

#[test]
fn bounded_sampling_keeps_first_and_latest_real_commit_without_fabricating_intermediate_points() {
    let root = tempdir().unwrap();
    git(root.path(), &["init"]);
    fs::create_dir_all(root.path().join("src")).unwrap();
    let mut commits = Vec::new();
    for index in 0..7 {
        fs::write(
            root.path().join("src/app.rs"),
            format!("pub const V: u8 = {index};\n"),
        )
        .unwrap();
        commits.push(commit_all(
            root.path(),
            &format!("c{index}"),
            &format!("2026-01-0{}T10:00:00Z", index + 1),
        ));
    }

    let evolution =
        collect_technology_evolution(root.path(), TechnologyEvolutionOptions { max_snapshots: 3 })
            .unwrap();
    assert_eq!(evolution.commit_count, 7);
    assert_eq!(evolution.snapshot_count, 3);
    assert!(!evolution.sampling.complete_history);
    assert_eq!(evolution.snapshots[0].commit, commits[0]);
    assert_eq!(evolution.snapshots[1].commit, commits[3]);
    assert_eq!(evolution.snapshots[2].commit, commits[6]);
}
