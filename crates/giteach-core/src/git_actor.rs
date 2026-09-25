use std::{
    collections::{BTreeMap, BTreeSet},
    path::Path,
    process::Command,
};

use sha2::{Digest, Sha256};
use thiserror::Error;

use crate::{
    actor::{
        ACTOR_EVIDENCE_SCHEMA, ActorEvidence, ActorEvidenceError, ActorEvidenceSourceKind,
        ActorRelation, ImplementationOrigin, validate_actor_evidence,
    },
    model::RepoEvidenceBundle,
};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GitActorIdentity {
    pub actor_key: String,
    pub names: Vec<String>,
    pub emails: Vec<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct GitActorEvidenceOptions {
    pub max_commits: usize,
}

impl Default for GitActorEvidenceOptions {
    fn default() -> Self {
        Self { max_commits: 200 }
    }
}

#[derive(Debug, Error)]
pub enum GitActorEvidenceError {
    #[error("repository root does not exist: {0}")]
    MissingRoot(String),
    #[error("git actor identity requires a non-empty actor_key")]
    MissingActorKey,
    #[error("git actor identity requires at least one configured name or email")]
    MissingIdentityMatcher,
    #[error("git command failed: {0}")]
    GitCommand(String),
    #[error(transparent)]
    InvalidActorEvidence(#[from] ActorEvidenceError),
}

#[derive(Debug)]
struct GitCommitRecord {
    sha: String,
    observed_at: String,
    author_name: String,
    author_email: String,
    body: String,
    paths: Vec<String>,
}

pub fn collect_git_actor_evidence(
    root: impl AsRef<Path>,
    bundle: &RepoEvidenceBundle,
    identities: &[GitActorIdentity],
    options: GitActorEvidenceOptions,
) -> Result<Vec<ActorEvidence>, GitActorEvidenceError> {
    let root = root.as_ref();
    if !root.exists() {
        return Err(GitActorEvidenceError::MissingRoot(
            root.to_string_lossy().to_string(),
        ));
    }
    if options.max_commits == 0 || identities.is_empty() {
        return Ok(Vec::new());
    }

    let identities = identities
        .iter()
        .map(normalize_identity)
        .collect::<Result<Vec<_>, _>>()?;
    let evidence_by_path = bundle
        .evidence
        .iter()
        .map(|record| (normalize_path(&record.path), record.id.as_str()))
        .collect::<BTreeMap<_, _>>();

    let commits = read_git_history(root, options.max_commits)?;
    let mut result = Vec::new();

    for commit in commits {
        let target_evidence_refs = commit
            .paths
            .iter()
            .filter_map(|path| evidence_by_path.get(&normalize_path(path)).copied())
            .map(str::to_string)
            .collect::<BTreeSet<_>>()
            .into_iter()
            .collect::<Vec<_>>();

        // A commit that does not touch evidence preserved in the bounded repository bundle
        // cannot become personal profile evidence.
        if target_evidence_refs.is_empty() {
            continue;
        }

        for identity in &identities {
            let relation = if identity_matches(identity, &commit.author_name, &commit.author_email)
            {
                Some(ActorRelation::AuthoredChange)
            } else if coauthor_matches(identity, &commit.body) {
                Some(ActorRelation::CoauthoredChange)
            } else {
                None
            };

            let Some(relation) = relation else {
                continue;
            };

            let source_ref = format!("git:commit:{}", commit.sha);
            let id = actor_evidence_id(
                &identity.actor_key,
                &relation,
                &bundle.repository.name,
                &source_ref,
                &target_evidence_refs,
            );
            let short_sha = commit.sha.chars().take(12).collect::<String>();
            let evidence = ActorEvidence {
                schema: ACTOR_EVIDENCE_SCHEMA.to_string(),
                id,
                actor_key: identity.actor_key.clone(),
                relation,
                repository: bundle.repository.name.clone(),
                source_kind: ActorEvidenceSourceKind::Git,
                source_ref,
                observed_at: commit.observed_at.clone(),
                implementation_origin: ImplementationOrigin::Unknown,
                capability_keys: Vec::new(),
                target_evidence_refs: target_evidence_refs.clone(),
                summary: Some(format!(
                    "Configured Git identity is linked to commit {short_sha}; {} evidence-backed path(s) from that commit are attached. Manual implementation authorship is not inferred.",
                    target_evidence_refs.len()
                )),
                source_hash: None,
            };
            result.push(validate_actor_evidence(evidence)?);
        }
    }

    result.sort_by(|a, b| {
        b.observed_at
            .cmp(&a.observed_at)
            .then_with(|| a.actor_key.cmp(&b.actor_key))
            .then_with(|| a.source_ref.cmp(&b.source_ref))
    });
    Ok(result)
}

#[derive(Debug)]
struct NormalizedIdentity {
    actor_key: String,
    names: BTreeSet<String>,
    emails: BTreeSet<String>,
}

fn normalize_identity(
    identity: &GitActorIdentity,
) -> Result<NormalizedIdentity, GitActorEvidenceError> {
    let actor_key = identity.actor_key.trim().to_string();
    if actor_key.is_empty() {
        return Err(GitActorEvidenceError::MissingActorKey);
    }
    let names = identity
        .names
        .iter()
        .map(|value| normalize_identity_value(value))
        .filter(|value| !value.is_empty())
        .collect::<BTreeSet<_>>();
    let emails = identity
        .emails
        .iter()
        .map(|value| normalize_identity_value(value))
        .filter(|value| !value.is_empty())
        .collect::<BTreeSet<_>>();
    if names.is_empty() && emails.is_empty() {
        return Err(GitActorEvidenceError::MissingIdentityMatcher);
    }
    Ok(NormalizedIdentity {
        actor_key,
        names,
        emails,
    })
}

fn normalize_identity_value(value: &str) -> String {
    value.trim().to_lowercase()
}

fn normalize_path(value: &str) -> String {
    value.trim().replace('\\', "/")
}

fn identity_matches(identity: &NormalizedIdentity, name: &str, email: &str) -> bool {
    let name = normalize_identity_value(name);
    let email = normalize_identity_value(email);
    (!email.is_empty() && identity.emails.contains(&email))
        || (!name.is_empty() && identity.names.contains(&name))
}

fn coauthor_matches(identity: &NormalizedIdentity, body: &str) -> bool {
    body.lines().any(|line| {
        let Some(value) = line.trim().strip_prefix("Co-authored-by:") else {
            return false;
        };
        let value = value.trim();
        let (name, email) = match (value.rfind('<'), value.rfind('>')) {
            (Some(start), Some(end)) if start < end => (&value[..start], &value[start + 1..end]),
            _ => (value, ""),
        };
        identity_matches(identity, name.trim(), email.trim())
    })
}

fn read_git_history(
    root: &Path,
    max_commits: usize,
) -> Result<Vec<GitCommitRecord>, GitActorEvidenceError> {
    let format = "%x1e%H%x00%cI%x00%an%x00%ae%x00%B%x00";
    let output = Command::new("git")
        .arg("-C")
        .arg(root)
        .arg("log")
        .arg("--no-show-signature")
        .arg("--name-only")
        .arg("-z")
        .arg(format!("-n{max_commits}"))
        .arg(format!("--format={format}"))
        .output()
        .map_err(|error| GitActorEvidenceError::GitCommand(error.to_string()))?;

    if !output.status.success() {
        return Err(GitActorEvidenceError::GitCommand(
            String::from_utf8_lossy(&output.stderr).trim().to_string(),
        ));
    }

    let text = String::from_utf8_lossy(&output.stdout);
    let mut commits = Vec::new();
    for raw_record in text.split('\x1e').filter(|record| !record.is_empty()) {
        let mut fields = raw_record.split('\0');
        let sha = fields.next().unwrap_or("").trim().to_string();
        let observed_at = fields.next().unwrap_or("").trim().to_string();
        let author_name = fields.next().unwrap_or("").trim().to_string();
        let author_email = fields.next().unwrap_or("").trim().to_string();
        let body = fields.next().unwrap_or("").to_string();
        if sha.is_empty() || observed_at.is_empty() {
            continue;
        }
        let paths = fields
            .map(normalize_path)
            .filter(|path| !path.is_empty())
            .collect::<BTreeSet<_>>()
            .into_iter()
            .collect();
        commits.push(GitCommitRecord {
            sha,
            observed_at,
            author_name,
            author_email,
            body,
            paths,
        });
    }
    Ok(commits)
}

fn actor_evidence_id(
    actor_key: &str,
    relation: &ActorRelation,
    repository: &str,
    source_ref: &str,
    target_evidence_refs: &[String],
) -> String {
    let relation = relation.as_str();
    let material = format!(
        "{actor_key}\0{relation}\0{repository}\0{source_ref}\0{}",
        target_evidence_refs.join("\0")
    );
    let mut hasher = Sha256::new();
    hasher.update(material.as_bytes());
    format!("{:x}", hasher.finalize())[..24].to_string()
}

#[cfg(test)]
mod tests {
    use std::{collections::BTreeMap, fs, process::Command};

    use tempfile::tempdir;

    use crate::{
        AttributionStatus, ClaimStance, CollectorOptions, ProfileEvidenceMeta,
        RepoEvidenceCollector, SemanticClaim, build_developer_profile_with_actor_evidence,
    };

    use super::*;

    fn git(root: &Path, args: &[&str]) {
        let status = Command::new("git")
            .arg("-C")
            .arg(root)
            .args(args)
            .status()
            .unwrap();
        assert!(status.success(), "git command failed: {args:?}");
    }

    fn commit(root: &Path, name: &str, email: &str, message: &str) {
        git(root, &["add", "."]);
        let status = Command::new("git")
            .arg("-C")
            .arg(root)
            .args([
                "-c",
                &format!("user.name={name}"),
                "-c",
                &format!("user.email={email}"),
                "commit",
                "-m",
                message,
            ])
            .status()
            .unwrap();
        assert!(status.success());
    }

    fn identity() -> GitActorIdentity {
        GitActorIdentity {
            actor_key: "developer:local".into(),
            names: vec!["Mauro Dev".into()],
            emails: vec!["mauro@example.com".into()],
        }
    }

    #[test]
    fn emits_identity_linkage_only_for_evidence_backed_paths() {
        let temp = tempdir().unwrap();
        let root = temp.path();
        git(root, &["init", "-q"]);
        fs::create_dir_all(root.join("src")).unwrap();
        fs::write(root.join("src/a.rs"), "pub fn a() {}\n").unwrap();
        fs::write(root.join("src/b.rs"), "pub fn b() {}\n").unwrap();
        commit(root, "Other Dev", "other@example.com", "initial");

        fs::write(root.join("src/a.rs"), "pub fn a() { println!(\"a\"); }\n").unwrap();
        commit(root, "Mauro Dev", "mauro@example.com", "touch a only");

        let bundle = RepoEvidenceCollector::new(CollectorOptions::default())
            .collect(root)
            .unwrap();
        let a_id = bundle
            .evidence
            .iter()
            .find(|record| record.path == "src/a.rs")
            .unwrap()
            .id
            .clone();
        let b_id = bundle
            .evidence
            .iter()
            .find(|record| record.path == "src/b.rs")
            .unwrap()
            .id
            .clone();

        let actor = collect_git_actor_evidence(
            root,
            &bundle,
            &[identity()],
            GitActorEvidenceOptions::default(),
        )
        .unwrap();
        assert_eq!(actor.len(), 1);
        assert_eq!(actor[0].relation, ActorRelation::AuthoredChange);
        assert_eq!(
            actor[0].implementation_origin,
            ImplementationOrigin::Unknown
        );
        assert_eq!(actor[0].target_evidence_refs, vec![a_id]);
        assert!(!actor[0].target_evidence_refs.contains(&b_id));
        assert!(
            actor[0]
                .summary
                .as_deref()
                .unwrap()
                .contains("not inferred")
        );
    }

    #[test]
    fn recognizes_explicit_coauthor_trailer_without_upgrading_origin() {
        let temp = tempdir().unwrap();
        let root = temp.path();
        git(root, &["init", "-q"]);
        fs::create_dir_all(root.join("src")).unwrap();
        fs::write(root.join("src/a.rs"), "pub fn a() {}\n").unwrap();
        commit(
            root,
            "Other Dev",
            "other@example.com",
            "feature\n\nCo-authored-by: Mauro Dev <mauro@example.com>",
        );

        let bundle = RepoEvidenceCollector::new(CollectorOptions::default())
            .collect(root)
            .unwrap();
        let actor = collect_git_actor_evidence(
            root,
            &bundle,
            &[identity()],
            GitActorEvidenceOptions::default(),
        )
        .unwrap();
        assert_eq!(actor.len(), 1);
        assert_eq!(actor[0].relation, ActorRelation::CoauthoredChange);
        assert_eq!(
            actor[0].implementation_origin,
            ImplementationOrigin::Unknown
        );
    }

    #[test]
    fn ignores_matching_commits_with_no_preserved_repository_evidence() {
        let temp = tempdir().unwrap();
        let root = temp.path();
        git(root, &["init", "-q"]);
        fs::write(
            root.join("notes.txt"),
            "not collected as bounded evidence\n",
        )
        .unwrap();
        commit(root, "Mauro Dev", "mauro@example.com", "notes only");

        let bundle = RepoEvidenceCollector::new(CollectorOptions::default())
            .collect(root)
            .unwrap();
        let actor = collect_git_actor_evidence(
            root,
            &bundle,
            &[identity()],
            GitActorEvidenceOptions::default(),
        )
        .unwrap();
        assert!(actor.is_empty());
    }

    #[test]
    fn git_identity_evidence_reaches_profile_as_identity_linked_only() {
        let temp = tempdir().unwrap();
        let root = temp.path();
        git(root, &["init", "-q"]);
        fs::create_dir_all(root.join("src")).unwrap();
        fs::write(root.join("src/a.rs"), "pub fn a() {}\n").unwrap();
        commit(root, "Mauro Dev", "mauro@example.com", "add rust source");

        let bundle = RepoEvidenceCollector::new(CollectorOptions::default())
            .collect(root)
            .unwrap();
        let source = bundle
            .evidence
            .iter()
            .find(|record| record.path == "src/a.rs")
            .unwrap();
        let actor = collect_git_actor_evidence(
            root,
            &bundle,
            &[identity()],
            GitActorEvidenceOptions::default(),
        )
        .unwrap();
        let evidence = bundle
            .evidence
            .iter()
            .map(|record| {
                (
                    record.id.clone(),
                    ProfileEvidenceMeta {
                        kind: record.kind.clone(),
                        observed_at: bundle.repository.head_commit_time.clone(),
                        stale: false,
                        actor_relation: None,
                        implementation_origin: None,
                    },
                )
            })
            .collect::<BTreeMap<_, _>>();
        let claim = SemanticClaim {
            skill: "Rust".into(),
            repository: bundle.repository.name.clone(),
            evidence_refs: vec![source.id.clone()],
            confidence: Some(0.9),
            stance: ClaimStance::Support,
            stale: false,
            reason: Some("project-scoped semantic observation".into()),
        };

        let profile = build_developer_profile_with_actor_evidence(
            BTreeMap::from([("username".into(), "mauro".into())]),
            vec![bundle.repository.name.clone()],
            vec![claim],
            &evidence,
            "developer:local",
            &actor,
        )
        .unwrap();

        let attribution = &profile.skills[0].attribution;
        assert_eq!(attribution.status, AttributionStatus::IdentityLinked);
        assert_eq!(attribution.actor_evidence_refs, vec![actor[0].id.clone()]);
        assert_eq!(attribution.actor_relations, vec!["authored-change"]);
        assert_eq!(attribution.implementation_origins, vec!["unknown"]);
    }

    #[test]
    fn rejects_identity_without_explicit_matchers() {
        let temp = tempdir().unwrap();
        let root = temp.path();
        git(root, &["init", "-q"]);
        let bundle = RepoEvidenceCollector::new(CollectorOptions::default())
            .collect(root)
            .unwrap();
        let error = collect_git_actor_evidence(
            root,
            &bundle,
            &[GitActorIdentity {
                actor_key: "developer:local".into(),
                names: vec![],
                emails: vec![],
            }],
            GitActorEvidenceOptions::default(),
        )
        .unwrap_err();
        assert!(matches!(
            error,
            GitActorEvidenceError::MissingIdentityMatcher
        ));
    }
}
