use sha2::{Digest, Sha256};

use crate::{
    ACTOR_EVIDENCE_SCHEMA, ActorEvidence, ActorEvidenceError, ActorEvidenceSourceKind,
    ActorRelation, GitHubFact, GitHubFactKind, GitHubRepositoryFacts, ImplementationOrigin,
    validate_actor_evidence,
};

fn same_login(left: Option<&str>, right: &str) -> bool {
    left.is_some_and(|left| left.eq_ignore_ascii_case(right))
}

fn actor_evidence_id(actor_key: &str, relation: &ActorRelation, fact_ref: &str) -> String {
    let payload = format!("{actor_key}|{}|{fact_ref}", relation.as_str());
    let digest = Sha256::digest(payload.as_bytes());
    format!("{:x}", digest)[..24].to_string()
}

fn observed_at<'a>(bundle: &'a GitHubRepositoryFacts, fact: &'a GitHubFact) -> &'a str {
    fact.merged_at
        .as_deref()
        .or(fact.closed_at.as_deref())
        .or(fact.updated_at.as_deref())
        .or(fact.created_at.as_deref())
        .or(fact.published_at.as_deref())
        .unwrap_or(&bundle.observed_at)
}

fn evidence(
    actor_key: &str,
    bundle: &GitHubRepositoryFacts,
    fact: &GitHubFact,
    relation: ActorRelation,
    observed_at: &str,
    summary: String,
) -> Result<ActorEvidence, ActorEvidenceError> {
    validate_actor_evidence(ActorEvidence {
        schema: ACTOR_EVIDENCE_SCHEMA.to_string(),
        id: actor_evidence_id(actor_key, &relation, &fact.fact_ref),
        actor_key: actor_key.to_string(),
        relation,
        repository: bundle.repository.full_name.clone(),
        source_kind: ActorEvidenceSourceKind::Github,
        source_ref: fact.fact_ref.clone(),
        observed_at: observed_at.to_string(),
        implementation_origin: ImplementationOrigin::Unknown,
        capability_keys: Vec::new(),
        target_evidence_refs: vec![fact.fact_ref.clone()],
        summary: Some(summary),
        source_hash: None,
    })
}

pub fn github_facts_to_actor_evidence(
    actor_key: &str,
    bundle: &GitHubRepositoryFacts,
) -> Result<Vec<ActorEvidence>, ActorEvidenceError> {
    let Some(connected_login) = bundle.connected_login.as_deref() else {
        return Ok(Vec::new());
    };
    let mut records = Vec::new();

    for fact in &bundle.facts {
        if !same_login(fact.actor_login.as_deref(), connected_login) {
            continue;
        }

        match fact.kind {
            GitHubFactKind::PullRequest => {
                let summary = fact.number.map_or_else(
                    || "Authored a GitHub pull request.".to_string(),
                    |number| format!("Authored GitHub pull request #{number}."),
                );
                records.push(evidence(
                    actor_key,
                    bundle,
                    fact,
                    ActorRelation::AuthoredChange,
                    observed_at(bundle, fact),
                    summary,
                )?);
            }
            GitHubFactKind::Review => {
                if fact
                    .state
                    .as_deref()
                    .is_some_and(|state| state.eq_ignore_ascii_case("PENDING"))
                    || fact.created_at.is_none()
                {
                    continue;
                }
                let summary = fact.number.map_or_else(
                    || "Submitted a GitHub pull request review.".to_string(),
                    |number| format!("Submitted a GitHub review on pull request #{number}."),
                );
                records.push(evidence(
                    actor_key,
                    bundle,
                    fact,
                    ActorRelation::ReviewedChange,
                    fact.created_at.as_deref().expect("checked above"),
                    summary,
                )?);
            }
            GitHubFactKind::Release | GitHubFactKind::Issue => {}
        }
    }

    Ok(records)
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use super::*;
    use crate::{GitHubFactInput, create_github_repository_facts};

    fn input(kind: GitHubFactKind, id: &str, actor: &str) -> GitHubFactInput {
        GitHubFactInput {
            kind,
            source_id: id.into(),
            number: None,
            tag_name: None,
            state: None,
            actor_login: Some(actor.into()),
            created_at: None,
            updated_at: None,
            closed_at: None,
            merged_at: None,
            published_at: None,
            draft: None,
            prerelease: None,
            source_ref: None,
            metadata: BTreeMap::new(),
        }
    }

    #[test]
    fn authored_pr_is_identity_linked_and_submitted_review_is_agency() {
        let mut pull = input(GitHubFactKind::PullRequest, "200", "Mauro");
        pull.number = Some(12);
        pull.created_at = Some("2026-09-01T10:00:00Z".into());
        let mut review = input(GitHubFactKind::Review, "300", "mauro");
        review.number = Some(12);
        review.state = Some("APPROVED".into());
        review.created_at = Some("2026-09-02T10:00:00Z".into());
        let facts = create_github_repository_facts(
            "acme",
            "demo",
            Some("mauro".into()),
            "2026-09-23T20:00:00Z",
            vec![pull, review],
        )
        .unwrap();

        let records = github_facts_to_actor_evidence("developer:mauro", &facts).unwrap();
        assert_eq!(records.len(), 2);
        assert!(records.iter().any(|record| {
            record.relation == ActorRelation::AuthoredChange
                && record.target_evidence_refs == vec!["github:acme/demo:pull-request:200"]
                && record.implementation_origin == ImplementationOrigin::Unknown
        }));
        assert!(records.iter().any(|record| {
            record.relation == ActorRelation::ReviewedChange
                && record.target_evidence_refs == vec!["github:acme/demo:review:300"]
                && record.implementation_origin == ImplementationOrigin::Unknown
        }));
    }

    #[test]
    fn pending_review_is_not_agency() {
        let mut review = input(GitHubFactKind::Review, "300", "mauro");
        review.number = Some(12);
        review.state = Some("PENDING".into());
        let facts = create_github_repository_facts(
            "acme",
            "demo",
            Some("mauro".into()),
            "2026-09-23T20:00:00Z",
            vec![review],
        )
        .unwrap();
        assert!(
            github_facts_to_actor_evidence("developer:mauro", &facts)
                .unwrap()
                .is_empty()
        );
    }

    #[test]
    fn release_and_issue_do_not_fabricate_agency() {
        let facts = create_github_repository_facts(
            "acme",
            "demo",
            Some("mauro".into()),
            "2026-09-23T20:00:00Z",
            vec![
                input(GitHubFactKind::Release, "100", "mauro"),
                input(GitHubFactKind::Issue, "400", "mauro"),
            ],
        )
        .unwrap();
        assert!(
            github_facts_to_actor_evidence("developer:mauro", &facts)
                .unwrap()
                .is_empty()
        );
    }
}
