use serde::{Deserialize, Serialize};
use serde_json::Value;

pub const JEV_OBSERVATION_SCHEMA: &str = "giteach-jev-observation-v1";
pub const INCREMENTAL_JEV_PLAN_SCHEMA: &str = "giteach-incremental-jev-plan-v1";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct JevRepositoryRef {
    pub name: String,
    pub url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct JevEvidenceIdentity {
    #[serde(rename = "ref")]
    pub evidence_ref: String,
    pub path: String,
    pub kind: String,
    pub subject: Option<String>,
    pub source_hash: Option<String>,
    pub excerpt_hash: Option<String>,
    pub excerpt_digest: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct JevObservationClaim {
    pub skill: String,
    pub confidence: f64,
    pub reason: Option<String>,
    pub evidence_refs: Vec<String>,
    pub distribution: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct JevObservationOutcome {
    pub status: String,
    pub reason: Option<String>,
    pub claims: Vec<JevObservationClaim>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct JevObservation {
    pub schema: String,
    pub id: String,
    pub repository: JevRepositoryRef,
    pub candidate: String,
    pub contract_schema: String,
    pub semantic_context_key: String,
    pub provider_policy_key: String,
    pub question_hash: String,
    pub evidence_fingerprint: String,
    pub input_fingerprint: String,
    pub evidence_refs: Vec<String>,
    pub evidence_identity: Vec<JevEvidenceIdentity>,
    pub provider: String,
    pub model: Option<String>,
    pub response_id: Option<String>,
    pub observed_at: String,
    pub usage: Option<Value>,
    pub outcome: JevObservationOutcome,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct JevCandidateFingerprint {
    pub candidate: String,
    pub contract_schema: String,
    pub question_hash: Option<String>,
    pub evidence_fingerprint: Option<String>,
    pub input_fingerprint: Option<String>,
    pub request: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum JevCandidateAction {
    Reuse,
    Refresh,
    SkipNoEvidence,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct JevCandidatePlan {
    pub candidate: String,
    pub action: JevCandidateAction,
    pub reason: String,
    pub input_fingerprint: Option<String>,
    pub evidence_fingerprint: Option<String>,
    pub question_hash: Option<String>,
    pub request: Option<Value>,
    pub reusable_observation: Option<JevObservation>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct IncrementalJevPlan {
    pub schema: String,
    pub repository: JevRepositoryRef,
    pub semantic_context_key: String,
    pub provider_policy_key: String,
    pub candidate_plans: Vec<JevCandidatePlan>,
    pub reusable_candidates: Vec<String>,
    pub refresh_candidates: Vec<String>,
    pub skipped_candidates: Vec<String>,
}

fn refresh_reason(
    previous: Option<&JevObservation>,
    current: &JevCandidateFingerprint,
    semantic_context_key: &str,
    provider_policy_key: &str,
) -> &'static str {
    let Some(previous) = previous else {
        return "missing-observation";
    };
    if previous.contract_schema != current.contract_schema {
        return "contract-changed";
    }
    if previous.semantic_context_key != semantic_context_key {
        return "context-changed";
    }
    if previous.provider_policy_key != provider_policy_key {
        return "provider-policy-changed";
    }
    if previous.question_hash != current.question_hash.as_deref().unwrap_or_default() {
        return "question-changed";
    }
    if previous.evidence_fingerprint != current.evidence_fingerprint.as_deref().unwrap_or_default()
    {
        return "evidence-changed";
    }
    "input-changed"
}

fn is_leap_year(year: i64) -> bool {
    year % 4 == 0 && (year % 100 != 0 || year % 400 == 0)
}

fn days_in_month(year: i64, month: i64) -> Option<i64> {
    Some(match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if is_leap_year(year) => 29,
        2 => 28,
        _ => return None,
    })
}

fn days_from_civil(year: i64, month: i64, day: i64) -> i64 {
    let year = year - i64::from(month <= 2);
    let era = if year >= 0 { year } else { year - 399 } / 400;
    let year_of_era = year - era * 400;
    let month_prime = month + if month > 2 { -3 } else { 9 };
    let day_of_year = (153 * month_prime + 2) / 5 + day - 1;
    let day_of_era = year_of_era * 365 + year_of_era / 4 - year_of_era / 100 + day_of_year;
    era * 146_097 + day_of_era - 719_468
}

fn parse_utc_iso_millis(value: &str) -> Option<i64> {
    let bytes = value.as_bytes();
    if bytes.len() < 20
        || bytes.get(4) != Some(&b'-')
        || bytes.get(7) != Some(&b'-')
        || bytes.get(10) != Some(&b'T')
        || bytes.get(13) != Some(&b':')
        || bytes.get(16) != Some(&b':')
        || *bytes.last()? != b'Z'
    {
        return None;
    }

    let parse = |start: usize, end: usize| value.get(start..end)?.parse::<i64>().ok();
    let year = parse(0, 4)?;
    let month = parse(5, 7)?;
    let day = parse(8, 10)?;
    let hour = parse(11, 13)?;
    let minute = parse(14, 16)?;
    let second = parse(17, 19)?;
    if day < 1
        || day > days_in_month(year, month)?
        || !(0..=23).contains(&hour)
        || !(0..=59).contains(&minute)
        || !(0..=59).contains(&second)
    {
        return None;
    }

    let millis = match value.get(19..)? {
        "Z" => 0,
        suffix if suffix.starts_with('.') && suffix.ends_with('Z') => {
            let fraction = &suffix[1..suffix.len() - 1];
            if fraction.is_empty()
                || fraction.len() > 3
                || !fraction.bytes().all(|byte| byte.is_ascii_digit())
            {
                return None;
            }
            let parsed = fraction.parse::<i64>().ok()?;
            parsed * 10_i64.pow((3 - fraction.len()) as u32)
        }
        _ => return None,
    };

    Some(
        days_from_civil(year, month, day) * 86_400_000
            + hour * 3_600_000
            + minute * 60_000
            + second * 1_000
            + millis,
    )
}

fn observation_expired(
    observation: &JevObservation,
    max_observation_age_ms: Option<u64>,
    now_ms: i64,
) -> bool {
    let Some(max_age) = max_observation_age_ms else {
        return false;
    };
    let Some(observed_at_ms) = parse_utc_iso_millis(&observation.observed_at) else {
        return true;
    };
    if now_ms < observed_at_ms {
        return false;
    }
    (now_ms - observed_at_ms) as u64 > max_age
}

pub fn plan_incremental_jev_reuse(
    repository: JevRepositoryRef,
    semantic_context_key: impl Into<String>,
    provider_policy_key: impl Into<String>,
    current: Vec<JevCandidateFingerprint>,
    previous_observations: &[JevObservation],
) -> IncrementalJevPlan {
    plan_incremental_jev_reuse_with_freshness(
        repository,
        semantic_context_key,
        provider_policy_key,
        current,
        previous_observations,
        None,
        0,
    )
}

pub fn plan_incremental_jev_reuse_with_freshness(
    repository: JevRepositoryRef,
    semantic_context_key: impl Into<String>,
    provider_policy_key: impl Into<String>,
    current: Vec<JevCandidateFingerprint>,
    previous_observations: &[JevObservation],
    max_observation_age_ms: Option<u64>,
    now_ms: i64,
) -> IncrementalJevPlan {
    let semantic_context_key = semantic_context_key.into();
    let provider_policy_key = provider_policy_key.into();
    let mut candidate_plans = Vec::with_capacity(current.len());

    for candidate in current {
        if candidate.input_fingerprint.is_none() {
            candidate_plans.push(JevCandidatePlan {
                candidate: candidate.candidate,
                action: JevCandidateAction::SkipNoEvidence,
                reason: "no-candidate-evidence".to_string(),
                input_fingerprint: None,
                evidence_fingerprint: candidate.evidence_fingerprint,
                question_hash: candidate.question_hash,
                request: candidate.request,
                reusable_observation: None,
            });
            continue;
        }

        let prior_for_candidate = previous_observations
            .iter()
            .filter(|item| {
                item.schema == JEV_OBSERVATION_SCHEMA
                    && item.repository.name == repository.name
                    && item.candidate == candidate.candidate
            })
            .collect::<Vec<_>>();
        let exact = prior_for_candidate.iter().copied().find(|item| {
            Some(item.input_fingerprint.as_str()) == candidate.input_fingerprint.as_deref()
        });
        let latest = prior_for_candidate.last().copied();
        let (action, reason, reusable_observation) = if let Some(exact) = exact {
            if observation_expired(exact, max_observation_age_ms, now_ms) {
                (
                    JevCandidateAction::Refresh,
                    "provider-refresh-due".to_string(),
                    None,
                )
            } else {
                (
                    JevCandidateAction::Reuse,
                    "exact-input-match".to_string(),
                    Some(exact.clone()),
                )
            }
        } else {
            (
                JevCandidateAction::Refresh,
                refresh_reason(
                    latest,
                    &candidate,
                    &semantic_context_key,
                    &provider_policy_key,
                )
                .to_string(),
                None,
            )
        };

        candidate_plans.push(JevCandidatePlan {
            candidate: candidate.candidate,
            action,
            reason,
            input_fingerprint: candidate.input_fingerprint,
            evidence_fingerprint: candidate.evidence_fingerprint,
            question_hash: candidate.question_hash,
            request: candidate.request,
            reusable_observation,
        });
    }

    let reusable_candidates = candidate_plans
        .iter()
        .filter(|item| item.action == JevCandidateAction::Reuse)
        .map(|item| item.candidate.clone())
        .collect();
    let refresh_candidates = candidate_plans
        .iter()
        .filter(|item| item.action == JevCandidateAction::Refresh)
        .map(|item| item.candidate.clone())
        .collect();
    let skipped_candidates = candidate_plans
        .iter()
        .filter(|item| item.action == JevCandidateAction::SkipNoEvidence)
        .map(|item| item.candidate.clone())
        .collect();

    IncrementalJevPlan {
        schema: INCREMENTAL_JEV_PLAN_SCHEMA.to_string(),
        repository,
        semantic_context_key,
        provider_policy_key,
        candidate_plans,
        reusable_candidates,
        refresh_candidates,
        skipped_candidates,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn observation(candidate: &str, input: &str, evidence: &str, policy: &str) -> JevObservation {
        JevObservation {
            schema: JEV_OBSERVATION_SCHEMA.to_string(),
            id: format!("obs-{candidate}"),
            repository: JevRepositoryRef {
                name: "kode".into(),
                url: None,
            },
            candidate: candidate.into(),
            contract_schema: "giteach-jev-bounded-v1".into(),
            semantic_context_key: "project-capability-evidence-v1".into(),
            provider_policy_key: policy.into(),
            question_hash: "question-v1".into(),
            evidence_fingerprint: evidence.into(),
            input_fingerprint: input.into(),
            evidence_refs: vec![format!("ev-{candidate}")],
            evidence_identity: vec![JevEvidenceIdentity {
                evidence_ref: format!("ev-{candidate}"),
                path: format!("src/{candidate}.txt"),
                kind: "source".into(),
                subject: Some(format!("{candidate} evidence")),
                source_hash: Some("source-hash".into()),
                excerpt_hash: Some("excerpt-hash".into()),
                excerpt_digest: Some("excerpt-digest".into()),
            }],
            provider: "fake-jev".into(),
            model: Some("jev-test-1".into()),
            response_id: None,
            observed_at: "2026-09-23T23:00:00.000Z".into(),
            usage: None,
            outcome: JevObservationOutcome {
                status: "supported".into(),
                reason: None,
                claims: vec![JevObservationClaim {
                    skill: candidate.into(),
                    confidence: 0.9,
                    reason: Some("supported by bounded repository evidence".into()),
                    evidence_refs: vec![format!("ev-{candidate}")],
                    distribution: Some(serde_json::json!({ "supported": 0.9, "unsupported": 0.1 })),
                }],
            },
        }
    }

    fn candidate(
        candidate: &str,
        input: Option<&str>,
        evidence: Option<&str>,
    ) -> JevCandidateFingerprint {
        JevCandidateFingerprint {
            candidate: candidate.into(),
            contract_schema: "giteach-jev-bounded-v1".into(),
            question_hash: Some("question-v1".into()),
            evidence_fingerprint: evidence.map(str::to_string),
            input_fingerprint: input.map(str::to_string),
            request: Some(serde_json::json!({ "candidate": candidate })),
        }
    }

    #[test]
    fn reuses_exact_candidate_and_refreshes_only_changed_slice() {
        let previous = vec![
            observation("Rust", "input-rust-v1", "ev-rust-v1", "policy-v1"),
            observation("React", "input-react-v1", "ev-react-v1", "policy-v1"),
        ];
        let plan = plan_incremental_jev_reuse(
            JevRepositoryRef {
                name: "kode".into(),
                url: None,
            },
            "project-capability-evidence-v1",
            "policy-v1",
            vec![
                candidate("Rust", Some("input-rust-v2"), Some("ev-rust-v2")),
                candidate("React", Some("input-react-v1"), Some("ev-react-v1")),
            ],
            &previous,
        );

        assert_eq!(plan.refresh_candidates, vec!["Rust"]);
        assert_eq!(plan.reusable_candidates, vec!["React"]);
        assert_eq!(plan.candidate_plans[0].reason, "evidence-changed");
        assert_eq!(plan.candidate_plans[1].reason, "exact-input-match");
    }

    #[test]
    fn provider_policy_change_invalidates_exact_evidence() {
        let previous = vec![observation(
            "Rust",
            "input-rust-v1",
            "ev-rust-v1",
            "policy-v1",
        )];
        let plan = plan_incremental_jev_reuse(
            JevRepositoryRef {
                name: "kode".into(),
                url: None,
            },
            "project-capability-evidence-v1",
            "policy-v2",
            vec![candidate("Rust", Some("input-rust-v2"), Some("ev-rust-v1"))],
            &previous,
        );
        assert_eq!(plan.refresh_candidates, vec!["Rust"]);
        assert_eq!(plan.candidate_plans[0].reason, "provider-policy-changed");
    }

    #[test]
    fn no_input_fingerprint_is_an_explicit_skip() {
        let plan = plan_incremental_jev_reuse(
            JevRepositoryRef {
                name: "kode".into(),
                url: None,
            },
            "project-capability-evidence-v1",
            "policy-v1",
            vec![candidate("Kubernetes", None, None)],
            &[],
        );
        assert_eq!(plan.skipped_candidates, vec!["Kubernetes"]);
        assert!(plan.refresh_candidates.is_empty());
        assert_eq!(plan.candidate_plans[0].reason, "no-candidate-evidence");
    }

    #[test]
    fn freshness_policy_refreshes_exact_input_after_max_age() {
        let previous = vec![observation(
            "Rust",
            "input-rust-v1",
            "ev-rust-v1",
            "policy-v1",
        )];
        let now_ms = parse_utc_iso_millis("2026-09-23T23:10:00.000Z").unwrap();
        let plan = plan_incremental_jev_reuse_with_freshness(
            JevRepositoryRef {
                name: "kode".into(),
                url: None,
            },
            "project-capability-evidence-v1",
            "policy-v1",
            vec![candidate("Rust", Some("input-rust-v1"), Some("ev-rust-v1"))],
            &previous,
            Some(5 * 60 * 1000),
            now_ms,
        );

        assert_eq!(plan.refresh_candidates, vec!["Rust"]);
        assert_eq!(plan.candidate_plans[0].reason, "provider-refresh-due");
        assert!(plan.candidate_plans[0].reusable_observation.is_none());
    }

    #[test]
    fn freshness_policy_reuses_exact_input_inside_max_age() {
        let previous = vec![observation(
            "Rust",
            "input-rust-v1",
            "ev-rust-v1",
            "policy-v1",
        )];
        let now_ms = parse_utc_iso_millis("2026-09-23T23:04:59.999Z").unwrap();
        let plan = plan_incremental_jev_reuse_with_freshness(
            JevRepositoryRef {
                name: "kode".into(),
                url: None,
            },
            "project-capability-evidence-v1",
            "policy-v1",
            vec![candidate("Rust", Some("input-rust-v1"), Some("ev-rust-v1"))],
            &previous,
            Some(5 * 60 * 1000),
            now_ms,
        );

        assert_eq!(plan.reusable_candidates, vec!["Rust"]);
        assert_eq!(plan.candidate_plans[0].reason, "exact-input-match");
    }

    #[test]
    fn invalid_observed_at_fails_closed_under_freshness_policy() {
        let mut previous = observation("Rust", "input-rust-v1", "ev-rust-v1", "policy-v1");
        previous.observed_at = "not-a-timestamp".into();
        let plan = plan_incremental_jev_reuse_with_freshness(
            JevRepositoryRef {
                name: "kode".into(),
                url: None,
            },
            "project-capability-evidence-v1",
            "policy-v1",
            vec![candidate("Rust", Some("input-rust-v1"), Some("ev-rust-v1"))],
            &[previous],
            Some(5 * 60 * 1000),
            parse_utc_iso_millis("2026-09-23T23:10:00.000Z").unwrap(),
        );

        assert_eq!(plan.refresh_candidates, vec!["Rust"]);
        assert_eq!(plan.candidate_plans[0].reason, "provider-refresh-due");
    }

    #[test]
    fn serialized_observation_matches_shared_persistence_schema() {
        let schema: serde_json::Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/jev-observation-v1-schema.json"
        ))
        .unwrap();
        let value = serde_json::to_value(observation(
            "Rust",
            "input-rust-v1",
            "ev-rust-v1",
            "policy-v1",
        ))
        .unwrap();

        for field in schema["observationFields"].as_array().unwrap() {
            assert!(
                value.get(field.as_str().unwrap()).is_some(),
                "missing observation field {field}"
            );
        }
        let identity = &value["evidenceIdentity"][0];
        for field in schema["evidenceIdentityFields"].as_array().unwrap() {
            assert!(
                identity.get(field.as_str().unwrap()).is_some(),
                "missing evidenceIdentity field {field}"
            );
        }
        let outcome = &value["outcome"];
        for field in schema["outcomeFields"].as_array().unwrap() {
            assert!(
                outcome.get(field.as_str().unwrap()).is_some(),
                "missing outcome field {field}"
            );
        }
        let claim = &outcome["claims"][0];
        for field in schema["claimFields"].as_array().unwrap() {
            assert!(
                claim.get(field.as_str().unwrap()).is_some(),
                "missing claim field {field}"
            );
        }
    }
}
