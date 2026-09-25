use std::{fs, path::Path, process::Command};

use giteach_core::{REPOSITORY_LIFECYCLE_SCHEMA, collect_repository_lifecycle};
use tempfile::TempDir;

fn git(repo: &Path, args: &[&str], date: Option<&str>) {
    let mut command = Command::new("git");
    command.arg("-C").arg(repo).args(args);
    if let Some(date) = date {
        command
            .env("GIT_AUTHOR_DATE", date)
            .env("GIT_COMMITTER_DATE", date);
    }
    let status = command.status().unwrap();
    assert!(status.success(), "git command failed: {args:?}");
}

fn commit(repo: &Path, contents: &str, date: &str, message: &str) {
    fs::write(repo.join("work.txt"), contents).unwrap();
    git(repo, &["add", "work.txt"], None);
    git(repo, &["commit", "-m", message], Some(date));
}

#[test]
fn collects_real_local_git_lifecycle_without_quality_scoring() {
    let repo = TempDir::new().unwrap();
    git(repo.path(), &["init"], None);
    git(
        repo.path(),
        &["config", "user.email", "test@example.com"],
        None,
    );
    git(repo.path(), &["config", "user.name", "GitTeach Test"], None);

    commit(repo.path(), "one", "2025-12-10T10:00:00+00:00", "first");
    commit(repo.path(), "two", "2026-01-15T10:00:00+00:00", "second");
    git(repo.path(), &["tag", "v1.0.0"], None);
    commit(
        repo.path(),
        "three",
        "2026-04-20T10:00:00+00:00",
        "post tag maintenance",
    );

    let lifecycle = collect_repository_lifecycle(repo.path()).unwrap();

    assert_eq!(lifecycle.schema, REPOSITORY_LIFECYCLE_SCHEMA);
    assert_eq!(lifecycle.source, "git-local");
    assert_eq!(lifecycle.commit_count, 3);
    assert_eq!(lifecycle.active_month_count, 3);
    assert_eq!(lifecycle.active_year_count, 2);
    assert_eq!(lifecycle.tag_count, 1);
    assert_eq!(
        lifecycle.latest_tag.as_ref().map(|tag| tag.name.as_str()),
        Some("v1.0.0")
    );
    assert_eq!(lifecycle.commits_after_latest_tag, Some(1));
    assert_eq!(lifecycle.has_post_tag_commits, Some(true));
    assert!(lifecycle.deterministic);
}

#[test]
fn ignores_tags_that_are_not_reachable_from_current_head() {
    let repo = TempDir::new().unwrap();
    git(repo.path(), &["init"], None);
    git(
        repo.path(),
        &["config", "user.email", "test@example.com"],
        None,
    );
    git(repo.path(), &["config", "user.name", "GitTeach Test"], None);

    commit(repo.path(), "base", "2026-01-01T10:00:00+00:00", "base");
    let main_branch = String::from_utf8(
        Command::new("git")
            .arg("-C")
            .arg(repo.path())
            .args(["branch", "--show-current"])
            .output()
            .unwrap()
            .stdout,
    )
    .unwrap()
    .trim()
    .to_string();

    git(repo.path(), &["checkout", "-b", "side"], None);
    commit(repo.path(), "side", "2026-02-01T10:00:00+00:00", "side");
    git(repo.path(), &["tag", "side-only"], None);
    git(repo.path(), &["checkout", &main_branch], None);
    commit(repo.path(), "main", "2026-03-01T10:00:00+00:00", "main");

    let lifecycle = collect_repository_lifecycle(repo.path()).unwrap();

    assert_eq!(lifecycle.tag_count, 0);
    assert_eq!(lifecycle.latest_tag, None);
    assert_eq!(lifecycle.commits_after_latest_tag, None);
    assert_eq!(lifecycle.has_post_tag_commits, None);
}
