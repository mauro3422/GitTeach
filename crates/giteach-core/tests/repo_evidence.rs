use std::{fs, process::Command};

use giteach_core::{
    CollectorOptions, REPO_EVIDENCE_SCHEMA, RepoEvidenceBundle, RepoEvidenceCollector,
    RepositoryInventoryCoverage, RepositorySummaryScope,
};
use tempfile::TempDir;

fn write(path: impl AsRef<std::path::Path>, content: &str) {
    let path = path.as_ref();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).unwrap();
    }
    fs::write(path, content).unwrap();
}

fn git(repo: &std::path::Path, args: &[&str]) {
    let status = Command::new("git")
        .arg("-C")
        .arg(repo)
        .args(args)
        .status()
        .unwrap();
    assert!(status.success(), "git command failed: {args:?}");
}

fn sample_repo() -> TempDir {
    let temp = TempDir::new().unwrap();
    write(
        temp.path().join("README.md"),
        "# Demo\nEvidence backed repository.",
    );
    write(
        temp.path().join("src/main.rs"),
        "fn main() { println!(\"hello\"); }",
    );
    write(
        temp.path().join("tests/app.test.js"),
        "test('works', () => expect(true).toBe(true));",
    );
    write(
        temp.path().join("package.json"),
        r#"{"dependencies":{"typescript":"^5.0.0"},"devDependencies":{"vitest":"^1.0.0"}}"#,
    );
    write(temp.path().join(".env"), "SECRET=never_collect_this");
    write(
        temp.path().join("node_modules/noisy/index.js"),
        "console.log('skip');",
    );

    git(temp.path(), &["init"]);
    git(temp.path(), &["config", "user.email", "test@example.com"]);
    git(temp.path(), &["config", "user.name", "GitTeach Test"]);
    git(temp.path(), &["add", "."]);
    git(temp.path(), &["commit", "-m", "fixture"]);
    temp
}

#[test]
fn collects_bounded_traceable_repository_evidence() {
    let repo = sample_repo();
    let collector = RepoEvidenceCollector::new(CollectorOptions::default());
    let bundle = collector.collect(repo.path()).unwrap();

    assert_eq!(bundle.schema, REPO_EVIDENCE_SCHEMA);
    assert_eq!(
        bundle.coverage.inventory,
        RepositoryInventoryCoverage::CompletePolicyFiltered
    );
    assert_eq!(
        bundle.coverage.summary_scope,
        RepositorySummaryScope::Inventory
    );
    assert_eq!(
        bundle.coverage.known_path_count,
        bundle.summary.files_scanned
    );
    assert!(bundle.repository.head_commit.is_some());
    assert!(bundle.languages.iter().any(|item| item.language == "Rust"));
    assert!(
        bundle
            .languages
            .iter()
            .any(|item| item.language == "JavaScript")
    );
    assert!(
        bundle
            .technologies
            .iter()
            .any(|item| item.name == "typescript")
    );
    assert!(bundle.technologies.iter().any(|item| item.name == "vitest"));
    assert!(
        !bundle
            .evidence
            .iter()
            .any(|item| item.path.contains("node_modules"))
    );
    assert!(
        !bundle
            .evidence
            .iter()
            .any(|item| item.path.ends_with(".env"))
    );
    assert!(bundle.evidence.iter().all(|item| item.id.len() == 24));
    assert!(
        bundle
            .evidence
            .iter()
            .all(|item| !item.source_hash.is_empty())
    );
}

#[test]
fn repeated_collection_keeps_stable_evidence_identity() {
    let repo = sample_repo();
    let collector = RepoEvidenceCollector::new(CollectorOptions::default());
    let first = collector.collect(repo.path()).unwrap();
    let second = collector.collect(repo.path()).unwrap();

    let first_ids: Vec<_> = first.evidence.iter().map(|item| item.id.as_str()).collect();
    let second_ids: Vec<_> = second
        .evidence
        .iter()
        .map(|item| item.id.as_str())
        .collect();
    assert_eq!(first_ids, second_ids);
    assert_eq!(first.languages, second.languages);
    assert_eq!(first.technologies, second.technologies);
}

#[test]
fn legacy_bundle_without_coverage_fails_closed_to_partial_selected_content() {
    let repo = sample_repo();
    let collector = RepoEvidenceCollector::new(CollectorOptions::default());
    let bundle = collector.collect(repo.path()).unwrap();
    let mut serialized = serde_json::to_value(bundle).unwrap();
    serialized.as_object_mut().unwrap().remove("coverage");

    let restored: RepoEvidenceBundle = serde_json::from_value(serialized).unwrap();
    assert_eq!(
        restored.coverage.inventory,
        RepositoryInventoryCoverage::Partial
    );
    assert_eq!(
        restored.coverage.summary_scope,
        RepositorySummaryScope::SelectedContent
    );
    assert_eq!(restored.coverage.known_path_count, 0);
}

#[test]
fn profile_signal_evidence_survives_source_sampling_budget() {
    let repo = TempDir::new().unwrap();
    for index in 0..12 {
        write(
            repo.path().join(format!("src/file_{index}.rs")),
            "pub fn value() -> usize { 1 }",
        );
    }
    write(
        repo.path().join("src/telemetry/metrics.rs"),
        "pub fn record_metric() {}",
    );
    write(
        repo.path().join("benches/throughput.rs"),
        "pub fn benchmark() {}",
    );

    let options = CollectorOptions {
        max_source_evidence: 1,
        max_profile_signal_evidence: 4,
        ..CollectorOptions::default()
    };
    let bundle = RepoEvidenceCollector::new(options)
        .collect(repo.path())
        .unwrap();

    assert_eq!(
        bundle
            .evidence
            .iter()
            .filter(|item| item.kind == "source")
            .count(),
        1
    );
    assert!(
        bundle.evidence.iter().any(|item| {
            item.kind == "observability" && item.path == "src/telemetry/metrics.rs"
        })
    );
    assert!(
        bundle
            .evidence
            .iter()
            .any(|item| { item.kind == "benchmark" && item.path == "benches/throughput.rs" })
    );
}

#[test]
fn source_evidence_budget_does_not_hide_repository_counts() {
    let repo = TempDir::new().unwrap();
    for index in 0..10 {
        write(
            repo.path().join(format!("src/file_{index}.rs")),
            "pub fn value() -> usize { 1 }",
        );
    }
    let options = CollectorOptions {
        max_source_evidence: 3,
        ..CollectorOptions::default()
    };
    let bundle = RepoEvidenceCollector::new(options)
        .collect(repo.path())
        .unwrap();

    assert_eq!(bundle.summary.source_files, 10);
    assert_eq!(
        bundle
            .evidence
            .iter()
            .filter(|item| item.kind == "source")
            .count(),
        3
    );
}

#[test]
fn source_evidence_budget_preserves_language_diversity() {
    let repo = TempDir::new().unwrap();
    for index in 0..8 {
        write(
            repo.path().join(format!("src/frontend_{index}.ts")),
            "export const value: number = 1;",
        );
    }
    for index in 0..2 {
        write(
            repo.path()
                .join(format!("src-tauri/src/backend_{index}.rs")),
            "pub fn value() -> usize { 1 }",
        );
    }
    write(
        repo.path().join("src/routes/+page.svelte"),
        "<script lang=\"ts\">let value = 1;</script>",
    );

    let options = CollectorOptions {
        max_source_evidence: 3,
        ..CollectorOptions::default()
    };
    let bundle = RepoEvidenceCollector::new(options)
        .collect(repo.path())
        .unwrap();
    let source: Vec<_> = bundle
        .evidence
        .iter()
        .filter(|item| item.kind == "source")
        .collect();

    assert_eq!(source.len(), 3);
    for language in ["TypeScript", "Rust", "Svelte"] {
        assert!(
            source.iter().any(|item| {
                item.metadata
                    .get("language")
                    .and_then(|value| value.as_str())
                    == Some(language)
            }),
            "missing source representative for {language}"
        );
    }
}
