use std::{
    collections::{BTreeMap, BTreeSet},
    path::{Path, PathBuf},
};

use giteach_core::{
    ActorEvidence, ActorEvidenceSourceKind, AttributionStatus, CapabilityAttribution, ClaimStance,
    CollectorOptions, DeveloperProfile, DocumentCautions, DocumentEvidenceSource, DocumentInput,
    DocumentSupportingStatement, DocumentTarget, GitActorEvidenceOptions, GitActorIdentity,
    PERSONAL_PROFILE_DERIVED_SNAPSHOT_SCHEMA, PersistedRepositoryConnection,
    PersonalProfileDerivedSnapshot, ProductDomainSnapshot, ProductEvidenceReceipt,
    ProductLanguageSnapshot, ProductPersonalActorEvidenceReceipt,
    ProductPersonalCapabilitySnapshot, ProductPersonalProfileEvidenceReceipt,
    ProductProfileIdentity, ProductRepositoryTarget, ProductTechnologySnapshot, ProfileDeclaration,
    ProfileDeclarationPublicationStatus, ProfileEvidenceMeta, ProfileInterviewPrompt,
    ProfileInterviewQuestion, ProfilePublicationContext, REPO_EVIDENCE_SCHEMA,
    REPOSITORY_DERIVED_SNAPSHOT_SCHEMA, RemoteAuditRepositorySpec, RepoEvidenceBundle,
    RepoEvidenceCollector, RepositoryAuditAction, RepositoryAuditCacheManager,
    RepositoryAuditError, RepositoryAuditReceipt, RepositoryConnectionSnapshot,
    RepositoryDerivedSnapshot, RepositoryInventoryCoverage, RepositorySummaryScope, SemanticClaim,
    SqliteProductStore, analyze_repository_domain_fingerprint,
    build_developer_profile_with_actor_evidence, collect_git_actor_evidence,
    default_profile_interview_categories, developer_profile_to_profile_observations,
    plan_profile_interview, prepare_document_input, prepare_profile_publication_context,
    profile_interview_answer_to_declaration, reconcile_profile_declarations,
    render_profile_interview_prompts, validate_profile_declaration,
};
use serde::{Deserialize, Serialize};
use tauri::State;

pub const DESKTOP_RUNTIME_SCHEMA: &str = "giteach-desktop-runtime-v1";
pub const LOCAL_REPOSITORY_ANALYSIS_SCHEMA: &str = "giteach-local-repository-analysis-v1";
pub const REPOSITORY_ANALYSIS_SCHEMA: &str = "giteach-repository-analysis-v1";
pub const REPOSITORY_INSPECTION_SCHEMA: &str = "giteach-repository-inspection-v1";
pub const REPOSITORY_INSPECTION_RESULT_SCHEMA: &str = "giteach-repository-inspection-result-v1";
pub const PERSONAL_PROFILE_INSPECTION_SCHEMA: &str = "giteach-personal-profile-inspection-v1";
pub const PROFILE_INTERVIEW_SESSION_SCHEMA: &str = "giteach-profile-interview-session-v1";
pub const PROFILE_OUTPUT_BUNDLE_SCHEMA: &str = "giteach-profile-output-bundle-v1";
pub const PROFILE_PUBLICATION_ENABLED: bool = false;
pub const REPOSITORY_CONNECTION_LIST_SCHEMA: &str = "giteach-repository-connection-list-v1";
const MAX_INSPECTION_EVIDENCE: usize = 48;
const MAX_REMEMBERED_REPOSITORIES: usize = 128;
const MAX_PROFILE_CAPABILITIES: usize = 24;
const MAX_PROFILE_EVIDENCE: usize = 192;
const MAX_PROFILE_ACTOR_EVIDENCE: usize = 96;
const MAX_PROFILE_DECLARATIONS: usize = 64;
const MAX_PROFILE_INTERVIEW_PROMPTS: usize = 32;

#[derive(Debug, Clone)]
pub(crate) struct DesktopState {
    audit_cache_root: PathBuf,
    product_store_path: PathBuf,
}

impl DesktopState {
    pub(crate) fn new(
        audit_cache_root: impl Into<PathBuf>,
        product_store_path: impl Into<PathBuf>,
    ) -> Self {
        Self {
            audit_cache_root: audit_cache_root.into(),
            product_store_path: product_store_path.into(),
        }
    }
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeInfo {
    pub schema: &'static str,
    pub product: &'static str,
    pub local_first: bool,
    pub hosted_analysis_required: bool,
    pub core_evidence_schema: &'static str,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(tag = "kind")]
pub enum RepositoryTarget {
    #[serde(rename = "local")]
    Local { path: String },
    #[serde(rename = "remote")]
    Remote {
        owner: String,
        name: String,
        #[serde(rename = "remoteUrl")]
        remote_url: String,
    },
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RememberedRepositoryConnection {
    pub id: String,
    pub target: RepositoryTarget,
    pub repository_name: String,
    pub branch: Option<String>,
    pub head_commit: Option<String>,
    pub acquisition_kind: String,
    pub audit_action: Option<String>,
    pub inventory_coverage: String,
    pub summary_scope: String,
    pub known_path_count: u64,
    pub files_scanned: u64,
    pub evidence_records: u64,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryConnectionList {
    pub schema: &'static str,
    pub available_connection_count: u64,
    pub truncated: bool,
    pub connections: Vec<RememberedRepositoryConnection>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AcquisitionView {
    pub kind: &'static str,
    pub audit_action: Option<&'static str>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryView {
    pub name: String,
    pub branch: Option<String>,
    pub head_commit: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CoverageView {
    pub inventory: &'static str,
    pub summary_scope: &'static str,
    pub known_path_count: u64,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SummaryView {
    pub files_scanned: u64,
    pub bytes_scanned: u64,
    pub evidence_records: u64,
    pub manifests: u64,
    pub docs: u64,
    pub tests: u64,
    pub tooling_files: u64,
    pub source_files: u64,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LanguageView {
    pub language: String,
    pub files: u64,
    pub bytes: u64,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TechnologyView {
    pub name: String,
    pub source_path: String,
    pub source_kind: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LocalRepositoryAnalysis {
    pub schema: &'static str,
    pub repository: RepositoryView,
    pub coverage: CoverageView,
    pub summary: SummaryView,
    pub languages: Vec<LanguageView>,
    pub technologies: Vec<TechnologyView>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryAnalysis {
    pub schema: &'static str,
    pub acquisition: AcquisitionView,
    pub repository: RepositoryView,
    pub coverage: CoverageView,
    pub summary: SummaryView,
    pub languages: Vec<LanguageView>,
    pub technologies: Vec<TechnologyView>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct EvidenceView {
    pub id: String,
    pub path: String,
    pub kind: String,
    pub bytes: u64,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProjectDomainView {
    pub key: String,
    pub label: String,
    pub source_kinds: Vec<String>,
    pub evidence_refs: Vec<String>,
    pub technologies: Vec<String>,
    pub languages: Vec<String>,
    pub rule_based: bool,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryInspectionView {
    pub schema: &'static str,
    pub scope: &'static str,
    pub personal_experience_claimed: bool,
    pub available_evidence_count: u64,
    pub shown_evidence_count: u64,
    pub truncated: bool,
    pub evidence: Vec<EvidenceView>,
    pub project_domains: Vec<ProjectDomainView>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryInspectionResult {
    pub schema: &'static str,
    pub analysis: RepositoryAnalysis,
    pub inspection: RepositoryInspectionView,
}

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProfileIdentityInput {
    pub actor_key: String,
    #[serde(default)]
    pub names: Vec<String>,
    #[serde(default)]
    pub emails: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PersonalProfileRequest {
    pub targets: Vec<RepositoryTarget>,
    pub identity: ProfileIdentityInput,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PersonalProfileEvidenceView {
    pub id: String,
    pub repository: String,
    pub path: String,
    pub kind: String,
    pub bytes: u64,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PersonalActorEvidenceView {
    pub id: String,
    pub relation: String,
    pub repository: String,
    pub source_kind: String,
    pub source_ref: String,
    pub observed_at: String,
    pub implementation_origin: String,
    pub target_evidence_refs: Vec<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PersonalCapabilityView {
    pub key: String,
    pub label: String,
    pub repository_count: usize,
    pub repositories: Vec<String>,
    pub attribution_status: &'static str,
    pub actor_evidence_refs: Vec<String>,
    pub actor_relations: Vec<String>,
    pub implementation_origins: Vec<String>,
    pub support_evidence_refs: Vec<String>,
    pub evidence_diversity: Vec<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PersonalProfileInspection {
    pub schema: &'static str,
    pub scope: &'static str,
    pub subject_actor_key: String,
    pub analyzed_repository_count: usize,
    pub available_personal_capability_count: usize,
    pub shown_personal_capability_count: usize,
    pub repository_only_claims_omitted: usize,
    pub unresolved_attribution_claims_omitted: usize,
    pub available_evidence_count: usize,
    pub shown_evidence_count: usize,
    pub available_actor_evidence_count: usize,
    pub shown_actor_evidence_count: usize,
    pub truncated: bool,
    pub capabilities: Vec<PersonalCapabilityView>,
    pub evidence: Vec<PersonalProfileEvidenceView>,
    pub actor_evidence: Vec<PersonalActorEvidenceView>,
}

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProfileInterviewSessionRequest {
    pub profile: PersonalProfileRequest,
    #[serde(default)]
    pub declarations: Vec<ProfileDeclaration>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProfileInterviewSession {
    pub schema: &'static str,
    pub subject_actor_key: String,
    pub prompts: Vec<ProfileInterviewPrompt>,
    pub evidence: Vec<PersonalProfileEvidenceView>,
    pub actor_evidence: Vec<PersonalActorEvidenceView>,
}

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProfileInterviewAnswerRequest {
    pub actor_key: String,
    pub prompt: ProfileInterviewPrompt,
    pub answer: String,
    pub answered_at: String,
    #[serde(default)]
    pub repositories: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PrivateProfileDeclarationRequest {
    pub profile: PersonalProfileRequest,
    pub declaration: ProfileDeclaration,
}

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProfileOutputRequest {
    pub profile: PersonalProfileRequest,
    #[serde(default)]
    pub declarations: Vec<ProfileDeclaration>,
    #[serde(default)]
    pub approved_declaration_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DesktopDocumentClaimView {
    pub key: String,
    pub label: String,
    pub repositories: Vec<String>,
    pub evidence_diversity: Vec<String>,
    pub latest_evidence_at: Option<String>,
    pub attribution: CapabilityAttribution,
    pub evidence_refs: Vec<String>,
    pub supporting_statements: Vec<DocumentSupportingStatement>,
    pub cautions: DocumentCautions,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DesktopDocumentInputView {
    pub schema: String,
    pub target: DocumentTarget,
    pub developer: BTreeMap<String, String>,
    pub repositories: Vec<String>,
    pub claims: Vec<DesktopDocumentClaimView>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProfileOutputBundle {
    pub schema: &'static str,
    pub subject_actor_key: String,
    pub publication_context: ProfilePublicationContext,
    pub documents: Vec<DesktopDocumentInputView>,
}

#[derive(Debug)]
struct PersonalProfileAggregate {
    actor_key: String,
    analyzed_repository_count: usize,
    profile: DeveloperProfile,
    profile_evidence: BTreeMap<String, ProfileEvidenceMeta>,
    evidence_views: BTreeMap<String, PersonalProfileEvidenceView>,
    actor_evidence: Vec<ActorEvidence>,
}

#[derive(Debug)]
struct AnalysisParts {
    repository: RepositoryView,
    coverage: CoverageView,
    summary: SummaryView,
    languages: Vec<LanguageView>,
    technologies: Vec<TechnologyView>,
}

#[derive(Debug)]
struct CollectedRepositoryTarget {
    bundle: RepoEvidenceBundle,
    acquisition: AcquisitionView,
    audit_receipt: Option<RepositoryAuditReceipt>,
}

#[tauri::command]
pub fn runtime_info() -> RuntimeInfo {
    RuntimeInfo {
        schema: DESKTOP_RUNTIME_SCHEMA,
        product: "GitTeach",
        local_first: true,
        hosted_analysis_required: false,
        core_evidence_schema: REPO_EVIDENCE_SCHEMA,
    }
}

#[tauri::command]
pub async fn list_repository_connections(
    state: State<'_, DesktopState>,
) -> Result<RepositoryConnectionList, String> {
    let product_store_path = state.product_store_path.clone();
    tauri::async_runtime::spawn_blocking(move || {
        list_repository_connections_impl(&product_store_path)
    })
    .await
    .map_err(|_| "repository connection listing task failed".to_string())?
}

#[tauri::command]
pub async fn load_repository_snapshot(
    connection_id: String,
    state: State<'_, DesktopState>,
) -> Result<Option<RepositoryInspectionResult>, String> {
    let connection_id = connection_id.trim().to_string();
    if connection_id.is_empty() {
        return Err("repository connection id is required".into());
    }
    let product_store_path = state.product_store_path.clone();
    tauri::async_runtime::spawn_blocking(move || {
        load_repository_snapshot_impl(&connection_id, &product_store_path)
    })
    .await
    .map_err(|_| "repository snapshot loading task failed".to_string())?
}

#[tauri::command]
pub async fn analyze_local_repository(path: String) -> Result<LocalRepositoryAnalysis, String> {
    let normalized = path.trim();
    if normalized.is_empty() {
        return Err("repository path is required".into());
    }

    let path = PathBuf::from(normalized);
    tauri::async_runtime::spawn_blocking(move || analyze_local_repository_impl(&path))
        .await
        .map_err(|_| "repository analysis task failed".to_string())?
}

#[tauri::command]
pub async fn analyze_repository(
    target: RepositoryTarget,
    state: State<'_, DesktopState>,
) -> Result<RepositoryAnalysis, String> {
    let audit_cache_root = state.audit_cache_root.clone();
    let product_store_path = state.product_store_path.clone();
    tauri::async_runtime::spawn_blocking(move || {
        analyze_repository_persisted_impl(target, &audit_cache_root, &product_store_path)
    })
    .await
    .map_err(|_| "repository analysis task failed".to_string())?
}

#[tauri::command]
pub async fn inspect_repository(
    target: RepositoryTarget,
    state: State<'_, DesktopState>,
) -> Result<RepositoryInspectionResult, String> {
    let audit_cache_root = state.audit_cache_root.clone();
    let product_store_path = state.product_store_path.clone();
    tauri::async_runtime::spawn_blocking(move || {
        inspect_repository_persisted_impl(target, &audit_cache_root, &product_store_path)
    })
    .await
    .map_err(|_| "repository inspection task failed".to_string())?
}

#[tauri::command]
pub async fn inspect_profile(
    request: PersonalProfileRequest,
    state: State<'_, DesktopState>,
) -> Result<PersonalProfileInspection, String> {
    let audit_cache_root = state.audit_cache_root.clone();
    let product_store_path = state.product_store_path.clone();
    tauri::async_runtime::spawn_blocking(move || {
        inspect_profile_persisted_impl(request, &audit_cache_root, &product_store_path)
    })
    .await
    .map_err(|_| "personal profile inspection task failed".to_string())?
}

#[tauri::command]
pub async fn load_profile_snapshot(
    request: PersonalProfileRequest,
    state: State<'_, DesktopState>,
) -> Result<Option<PersonalProfileInspection>, String> {
    let product_store_path = state.product_store_path.clone();
    tauri::async_runtime::spawn_blocking(move || {
        load_profile_snapshot_impl(&request, &product_store_path)
    })
    .await
    .map_err(|_| "personal profile snapshot loading task failed".to_string())?
}

#[tauri::command]
pub async fn prepare_profile_interview(
    request: ProfileInterviewSessionRequest,
    state: State<'_, DesktopState>,
) -> Result<ProfileInterviewSession, String> {
    let audit_cache_root = state.audit_cache_root.clone();
    tauri::async_runtime::spawn_blocking(move || {
        prepare_profile_interview_impl(request, &audit_cache_root)
    })
    .await
    .map_err(|_| "profile interview preparation task failed".to_string())?
}

#[tauri::command]
pub fn answer_profile_interview(
    request: ProfileInterviewAnswerRequest,
) -> Result<ProfileDeclaration, String> {
    answer_profile_interview_impl(request)
}

#[tauri::command]
pub async fn save_private_profile_declaration(
    request: PrivateProfileDeclarationRequest,
    state: State<'_, DesktopState>,
) -> Result<ProfileDeclaration, String> {
    let product_store_path = state.product_store_path.clone();
    tauri::async_runtime::spawn_blocking(move || {
        save_private_profile_declaration_impl(request, &product_store_path)
    })
    .await
    .map_err(|_| "private profile declaration persistence task failed".to_string())?
}

#[tauri::command]
pub async fn load_private_profile_declarations(
    request: PersonalProfileRequest,
    state: State<'_, DesktopState>,
) -> Result<Vec<ProfileDeclaration>, String> {
    let product_store_path = state.product_store_path.clone();
    tauri::async_runtime::spawn_blocking(move || {
        load_private_profile_declarations_impl(&request, &product_store_path)
    })
    .await
    .map_err(|_| "private profile declaration loading task failed".to_string())?
}

#[tauri::command]
pub async fn generate_profile_outputs(
    request: ProfileOutputRequest,
    state: State<'_, DesktopState>,
) -> Result<ProfileOutputBundle, String> {
    if !PROFILE_PUBLICATION_ENABLED {
        return Err(
            "profile publication is disabled while private persistence is under extended test"
                .into(),
        );
    }
    let audit_cache_root = state.audit_cache_root.clone();
    tauri::async_runtime::spawn_blocking(move || {
        generate_profile_outputs_impl(request, &audit_cache_root)
    })
    .await
    .map_err(|_| "profile output generation task failed".to_string())?
}

fn analyze_local_repository_impl(path: &Path) -> Result<LocalRepositoryAnalysis, String> {
    let bundle = collect_local_repository(path)?;
    let parts = analysis_parts(bundle);
    Ok(LocalRepositoryAnalysis {
        schema: LOCAL_REPOSITORY_ANALYSIS_SCHEMA,
        repository: parts.repository,
        coverage: parts.coverage,
        summary: parts.summary,
        languages: parts.languages,
        technologies: parts.technologies,
    })
}

fn list_repository_connections_impl(
    product_store_path: &Path,
) -> Result<RepositoryConnectionList, String> {
    let persisted = SqliteProductStore::new(product_store_path)
        .list_repository_connections()
        .map_err(|_| "local product state could not be loaded".to_string())?;
    let available_connection_count = persisted.len() as u64;
    let truncated = persisted.len() > MAX_REMEMBERED_REPOSITORIES;
    let connections = persisted
        .into_iter()
        .take(MAX_REMEMBERED_REPOSITORIES)
        .map(remembered_repository_connection)
        .collect();
    Ok(RepositoryConnectionList {
        schema: REPOSITORY_CONNECTION_LIST_SCHEMA,
        available_connection_count,
        truncated,
        connections,
    })
}

fn remembered_repository_connection(
    persisted: PersistedRepositoryConnection,
) -> RememberedRepositoryConnection {
    let target = match persisted.target {
        ProductRepositoryTarget::Local { path } => RepositoryTarget::Local { path },
        ProductRepositoryTarget::Remote {
            owner,
            name,
            remote_url,
        } => RepositoryTarget::Remote {
            owner,
            name,
            remote_url,
        },
    };
    RememberedRepositoryConnection {
        id: persisted.id,
        target,
        repository_name: persisted.repository_name,
        branch: persisted.branch,
        head_commit: persisted.head_commit,
        acquisition_kind: persisted.acquisition_kind,
        audit_action: persisted.audit_action,
        inventory_coverage: persisted.inventory_coverage,
        summary_scope: persisted.summary_scope,
        known_path_count: persisted.known_path_count,
        files_scanned: persisted.files_scanned,
        evidence_records: persisted.evidence_records,
    }
}

fn analyze_repository_persisted_impl(
    target: RepositoryTarget,
    audit_cache_root: &Path,
    product_store_path: &Path,
) -> Result<RepositoryAnalysis, String> {
    let persistence_target = product_target(&target)?;
    let collected = collect_repository_target_with_receipt(target, audit_cache_root)?;
    persist_repository_collection(product_store_path, persistence_target, &collected)?;
    Ok(repository_analysis(collected.bundle, collected.acquisition))
}

fn inspect_repository_persisted_impl(
    target: RepositoryTarget,
    audit_cache_root: &Path,
    product_store_path: &Path,
) -> Result<RepositoryInspectionResult, String> {
    let persistence_target = product_target(&target)?;
    let collected = collect_repository_target_with_receipt(target, audit_cache_root)?;
    persist_repository_collection(product_store_path, persistence_target.clone(), &collected)?;
    let inspection = repository_inspection(&collected.bundle)?;
    let result = RepositoryInspectionResult {
        schema: REPOSITORY_INSPECTION_RESULT_SCHEMA,
        analysis: repository_analysis(collected.bundle, collected.acquisition),
        inspection,
    };
    persist_repository_derived_snapshot(product_store_path, &persistence_target, &result)?;
    Ok(result)
}

fn persist_repository_derived_snapshot(
    product_store_path: &Path,
    target: &ProductRepositoryTarget,
    result: &RepositoryInspectionResult,
) -> Result<(), String> {
    let snapshot = RepositoryDerivedSnapshot {
        schema: REPOSITORY_DERIVED_SNAPSHOT_SCHEMA.to_string(),
        repository_name: result.analysis.repository.name.clone(),
        branch: result.analysis.repository.branch.clone(),
        head_commit: result.analysis.repository.head_commit.clone(),
        acquisition_kind: result.analysis.acquisition.kind.to_string(),
        audit_action: result.analysis.acquisition.audit_action.map(str::to_string),
        inventory_coverage: result.analysis.coverage.inventory.to_string(),
        summary_scope: result.analysis.coverage.summary_scope.to_string(),
        known_path_count: result.analysis.coverage.known_path_count,
        files_scanned: result.analysis.summary.files_scanned,
        bytes_scanned: result.analysis.summary.bytes_scanned,
        evidence_records: result.analysis.summary.evidence_records,
        manifests: result.analysis.summary.manifests,
        docs: result.analysis.summary.docs,
        tests: result.analysis.summary.tests,
        tooling_files: result.analysis.summary.tooling_files,
        source_files: result.analysis.summary.source_files,
        languages: result
            .analysis
            .languages
            .iter()
            .map(|item| ProductLanguageSnapshot {
                language: item.language.clone(),
                files: item.files,
                bytes: item.bytes,
            })
            .collect(),
        technologies: result
            .analysis
            .technologies
            .iter()
            .map(|item| ProductTechnologySnapshot {
                name: item.name.clone(),
                source_path: item.source_path.clone(),
                source_kind: item.source_kind.clone(),
            })
            .collect(),
        available_evidence_count: result.inspection.available_evidence_count,
        evidence: result
            .inspection
            .evidence
            .iter()
            .map(|item| ProductEvidenceReceipt {
                id: item.id.clone(),
                path: item.path.clone(),
                kind: item.kind.clone(),
                bytes: item.bytes,
            })
            .collect(),
        project_domains: result
            .inspection
            .project_domains
            .iter()
            .map(|item| ProductDomainSnapshot {
                key: item.key.clone(),
                label: item.label.clone(),
                source_kinds: item.source_kinds.clone(),
                evidence_refs: item.evidence_refs.clone(),
                technologies: item.technologies.clone(),
                languages: item.languages.clone(),
                rule_based: item.rule_based,
            })
            .collect(),
    };
    SqliteProductStore::new(product_store_path)
        .upsert_repository_derived_snapshot(target, &snapshot)
        .map_err(|_| "bounded repository snapshot could not be saved".to_string())
}

fn load_repository_snapshot_impl(
    connection_id: &str,
    product_store_path: &Path,
) -> Result<Option<RepositoryInspectionResult>, String> {
    SqliteProductStore::new(product_store_path)
        .repository_derived_snapshot(connection_id)
        .map_err(|_| "bounded repository snapshot could not be loaded".to_string())?
        .map(repository_inspection_result_from_snapshot)
        .transpose()
}

fn repository_inspection_result_from_snapshot(
    snapshot: RepositoryDerivedSnapshot,
) -> Result<RepositoryInspectionResult, String> {
    let acquisition_kind = match snapshot.acquisition_kind.as_str() {
        "local" => "local",
        "remote-audit" => "remote-audit",
        _ => return Err("stored repository acquisition kind is unsupported".into()),
    };
    let audit_action = match snapshot.audit_action.as_deref() {
        None => None,
        Some("initialized") => Some("initialized"),
        Some("updated") => Some("updated"),
        Some("unchanged") => Some("unchanged"),
        Some(_) => return Err("stored repository audit action is unsupported".into()),
    };
    let inventory = match snapshot.inventory_coverage.as_str() {
        "complete-policy-filtered" => "complete-policy-filtered",
        "partial" => "partial",
        _ => return Err("stored repository inventory coverage is unsupported".into()),
    };
    let summary_scope = match snapshot.summary_scope.as_str() {
        "inventory" => "inventory",
        "selected-content" => "selected-content",
        _ => return Err("stored repository summary scope is unsupported".into()),
    };
    let shown_evidence_count = snapshot.evidence.len() as u64;
    let truncated = shown_evidence_count < snapshot.available_evidence_count;
    Ok(RepositoryInspectionResult {
        schema: REPOSITORY_INSPECTION_RESULT_SCHEMA,
        analysis: RepositoryAnalysis {
            schema: REPOSITORY_ANALYSIS_SCHEMA,
            acquisition: AcquisitionView {
                kind: acquisition_kind,
                audit_action,
            },
            repository: RepositoryView {
                name: snapshot.repository_name,
                branch: snapshot.branch,
                head_commit: snapshot.head_commit,
            },
            coverage: CoverageView {
                inventory,
                summary_scope,
                known_path_count: snapshot.known_path_count,
            },
            summary: SummaryView {
                files_scanned: snapshot.files_scanned,
                bytes_scanned: snapshot.bytes_scanned,
                evidence_records: snapshot.evidence_records,
                manifests: snapshot.manifests,
                docs: snapshot.docs,
                tests: snapshot.tests,
                tooling_files: snapshot.tooling_files,
                source_files: snapshot.source_files,
            },
            languages: snapshot
                .languages
                .into_iter()
                .map(|item| LanguageView {
                    language: item.language,
                    files: item.files,
                    bytes: item.bytes,
                })
                .collect(),
            technologies: snapshot
                .technologies
                .into_iter()
                .map(|item| TechnologyView {
                    name: item.name,
                    source_path: item.source_path,
                    source_kind: item.source_kind,
                })
                .collect(),
        },
        inspection: RepositoryInspectionView {
            schema: REPOSITORY_INSPECTION_SCHEMA,
            scope: "repository-only",
            personal_experience_claimed: false,
            available_evidence_count: snapshot.available_evidence_count,
            shown_evidence_count,
            truncated,
            evidence: snapshot
                .evidence
                .into_iter()
                .map(|item| EvidenceView {
                    id: item.id,
                    path: item.path,
                    kind: item.kind,
                    bytes: item.bytes,
                })
                .collect(),
            project_domains: snapshot
                .project_domains
                .into_iter()
                .map(|item| ProjectDomainView {
                    key: item.key,
                    label: item.label,
                    source_kinds: item.source_kinds,
                    evidence_refs: item.evidence_refs,
                    technologies: item.technologies,
                    languages: item.languages,
                    rule_based: item.rule_based,
                })
                .collect(),
        },
    })
}

fn product_target(target: &RepositoryTarget) -> Result<ProductRepositoryTarget, String> {
    match target {
        RepositoryTarget::Local { path } => {
            let normalized = path.trim();
            if normalized.is_empty() {
                return Err("repository path is required".into());
            }
            let stable_path = Path::new(normalized)
                .canonicalize()
                .map_err(|_| "local repository path could not be normalized".to_string())?;
            Ok(ProductRepositoryTarget::Local {
                path: stable_path.to_string_lossy().into_owned(),
            })
        }
        RepositoryTarget::Remote {
            owner,
            name,
            remote_url,
        } => Ok(ProductRepositoryTarget::Remote {
            owner: owner.trim().to_string(),
            name: name.trim().to_string(),
            remote_url: remote_url.trim().to_string(),
        }),
    }
}

fn persist_repository_collection(
    product_store_path: &Path,
    target: ProductRepositoryTarget,
    collected: &CollectedRepositoryTarget,
) -> Result<(), String> {
    let inventory_coverage = match collected.bundle.coverage.inventory {
        RepositoryInventoryCoverage::CompletePolicyFiltered => "complete-policy-filtered",
        RepositoryInventoryCoverage::Partial => "partial",
    };
    let summary_scope = match collected.bundle.coverage.summary_scope {
        RepositorySummaryScope::Inventory => "inventory",
        RepositorySummaryScope::SelectedContent => "selected-content",
    };
    let snapshot = RepositoryConnectionSnapshot {
        target,
        repository_name: collected.bundle.repository.name.clone(),
        branch: collected.bundle.repository.branch.clone(),
        head_commit: collected.bundle.repository.head_commit.clone(),
        head_commit_time: collected.bundle.repository.head_commit_time.clone(),
        acquisition_kind: collected.acquisition.kind.to_string(),
        audit_action: collected.acquisition.audit_action.map(str::to_string),
        inventory_coverage: inventory_coverage.to_string(),
        summary_scope: summary_scope.to_string(),
        known_path_count: collected.bundle.coverage.known_path_count,
        files_scanned: collected.bundle.summary.files_scanned,
        evidence_records: collected.bundle.summary.evidence_records,
    };
    SqliteProductStore::new(product_store_path)
        .upsert_repository_connection(&snapshot, collected.audit_receipt.as_ref())
        .map(|_| ())
        .map_err(|_| "local product state could not be saved".to_string())
}

#[cfg(test)]
fn analyze_repository_impl(
    target: RepositoryTarget,
    audit_cache_root: &Path,
) -> Result<RepositoryAnalysis, String> {
    let (bundle, acquisition) = collect_repository_target(target, audit_cache_root)?;
    Ok(repository_analysis(bundle, acquisition))
}

#[cfg(test)]
fn inspect_repository_impl(
    target: RepositoryTarget,
    audit_cache_root: &Path,
) -> Result<RepositoryInspectionResult, String> {
    let (bundle, acquisition) = collect_repository_target(target, audit_cache_root)?;
    let inspection = repository_inspection(&bundle)?;
    Ok(RepositoryInspectionResult {
        schema: REPOSITORY_INSPECTION_RESULT_SCHEMA,
        analysis: repository_analysis(bundle, acquisition),
        inspection,
    })
}

fn inspect_profile_persisted_impl(
    request: PersonalProfileRequest,
    audit_cache_root: &Path,
    product_store_path: &Path,
) -> Result<PersonalProfileInspection, String> {
    let persistence_identity = product_profile_identity(&request.identity)?;
    let persistence_targets = product_profile_targets(&request.targets)?;
    let inspection = inspect_profile_impl(request, audit_cache_root)?;
    let snapshot = personal_profile_snapshot_from_inspection(&inspection);
    SqliteProductStore::new(product_store_path)
        .upsert_personal_profile_derived_snapshot(
            &persistence_identity,
            &persistence_targets,
            &snapshot,
        )
        .map_err(|_| "bounded personal profile snapshot could not be saved".to_string())?;
    Ok(inspection)
}

fn load_profile_snapshot_impl(
    request: &PersonalProfileRequest,
    product_store_path: &Path,
) -> Result<Option<PersonalProfileInspection>, String> {
    let identity = product_profile_identity(&request.identity)?;
    let targets = product_profile_targets(&request.targets)?;
    SqliteProductStore::new(product_store_path)
        .personal_profile_derived_snapshot(&identity, &targets)
        .map_err(|_| "bounded personal profile snapshot could not be loaded".to_string())?
        .map(personal_profile_inspection_from_snapshot)
        .transpose()
}

fn save_private_profile_declaration_impl(
    request: PrivateProfileDeclarationRequest,
    product_store_path: &Path,
) -> Result<ProfileDeclaration, String> {
    let identity = product_profile_identity(&request.profile.identity)?;
    let targets = product_profile_targets(&request.profile.targets)?;
    SqliteProductStore::new(product_store_path)
        .upsert_private_profile_declaration(&identity, &targets, &request.declaration)
        .map_err(|_| "private profile declaration could not be saved".to_string())
}

fn load_private_profile_declarations_impl(
    request: &PersonalProfileRequest,
    product_store_path: &Path,
) -> Result<Vec<ProfileDeclaration>, String> {
    let identity = product_profile_identity(&request.identity)?;
    let targets = product_profile_targets(&request.targets)?;
    SqliteProductStore::new(product_store_path)
        .private_profile_declarations(&identity, &targets)
        .map_err(|_| "private profile declarations could not be loaded".to_string())
}

fn product_profile_identity(
    identity: &ProfileIdentityInput,
) -> Result<ProductProfileIdentity, String> {
    let actor_key = identity.actor_key.trim().to_string();
    let names = normalized_identity_values(&identity.names);
    let emails = normalized_identity_values(&identity.emails);
    if actor_key.is_empty() {
        return Err("profile identity requires a non-empty actor key".into());
    }
    if names.is_empty() && emails.is_empty() {
        return Err("profile identity requires at least one Git name or email".into());
    }
    Ok(ProductProfileIdentity {
        actor_key,
        names,
        emails,
    })
}

fn product_profile_targets(
    targets: &[RepositoryTarget],
) -> Result<Vec<ProductRepositoryTarget>, String> {
    if targets.is_empty() {
        return Err("at least one repository target is required".into());
    }
    if targets.len() > 32 {
        return Err("personal profile inspection supports at most 32 repository targets".into());
    }
    targets.iter().map(product_target).collect()
}

fn personal_profile_snapshot_from_inspection(
    inspection: &PersonalProfileInspection,
) -> PersonalProfileDerivedSnapshot {
    PersonalProfileDerivedSnapshot {
        schema: PERSONAL_PROFILE_DERIVED_SNAPSHOT_SCHEMA.into(),
        scope: inspection.scope.into(),
        subject_actor_key: inspection.subject_actor_key.clone(),
        analyzed_repository_count: inspection.analyzed_repository_count as u64,
        available_personal_capability_count: inspection.available_personal_capability_count as u64,
        shown_personal_capability_count: inspection.shown_personal_capability_count as u64,
        repository_only_claims_omitted: inspection.repository_only_claims_omitted as u64,
        unresolved_attribution_claims_omitted: inspection.unresolved_attribution_claims_omitted
            as u64,
        available_evidence_count: inspection.available_evidence_count as u64,
        shown_evidence_count: inspection.shown_evidence_count as u64,
        available_actor_evidence_count: inspection.available_actor_evidence_count as u64,
        shown_actor_evidence_count: inspection.shown_actor_evidence_count as u64,
        truncated: inspection.truncated,
        capabilities: inspection
            .capabilities
            .iter()
            .map(|capability| ProductPersonalCapabilitySnapshot {
                key: capability.key.clone(),
                label: capability.label.clone(),
                repository_count: capability.repository_count as u64,
                repositories: capability.repositories.clone(),
                attribution_status: capability.attribution_status.into(),
                actor_evidence_refs: capability.actor_evidence_refs.clone(),
                actor_relations: capability.actor_relations.clone(),
                implementation_origins: capability.implementation_origins.clone(),
                support_evidence_refs: capability.support_evidence_refs.clone(),
                evidence_diversity: capability.evidence_diversity.clone(),
            })
            .collect(),
        evidence: inspection
            .evidence
            .iter()
            .map(|record| ProductPersonalProfileEvidenceReceipt {
                id: record.id.clone(),
                repository: record.repository.clone(),
                path: record.path.clone(),
                kind: record.kind.clone(),
                bytes: record.bytes,
            })
            .collect(),
        actor_evidence: inspection
            .actor_evidence
            .iter()
            .map(|record| ProductPersonalActorEvidenceReceipt {
                id: record.id.clone(),
                relation: record.relation.clone(),
                repository: record.repository.clone(),
                source_kind: record.source_kind.clone(),
                source_ref: record.source_ref.clone(),
                observed_at: record.observed_at.clone(),
                implementation_origin: record.implementation_origin.clone(),
                target_evidence_refs: record.target_evidence_refs.clone(),
            })
            .collect(),
    }
}

fn personal_profile_inspection_from_snapshot(
    snapshot: PersonalProfileDerivedSnapshot,
) -> Result<PersonalProfileInspection, String> {
    let scope = match snapshot.scope.as_str() {
        "personal-profile" => "personal-profile",
        _ => return Err("stored personal profile scope is unsupported".into()),
    };
    let capabilities = snapshot
        .capabilities
        .into_iter()
        .map(|capability| {
            let attribution_status = match capability.attribution_status.as_str() {
                "identity-linked" => "identity-linked",
                "user-confirmed" => "user-confirmed",
                "agency-supported" => "agency-supported",
                _ => return Err("stored personal profile attribution is unsupported".to_string()),
            };
            Ok(PersonalCapabilityView {
                key: capability.key,
                label: capability.label,
                repository_count: usize::try_from(capability.repository_count)
                    .map_err(|_| "stored profile repository count is invalid".to_string())?,
                repositories: capability.repositories,
                attribution_status,
                actor_evidence_refs: capability.actor_evidence_refs,
                actor_relations: capability.actor_relations,
                implementation_origins: capability.implementation_origins,
                support_evidence_refs: capability.support_evidence_refs,
                evidence_diversity: capability.evidence_diversity,
            })
        })
        .collect::<Result<Vec<_>, String>>()?;
    Ok(PersonalProfileInspection {
        schema: PERSONAL_PROFILE_INSPECTION_SCHEMA,
        scope,
        subject_actor_key: snapshot.subject_actor_key,
        analyzed_repository_count: usize::try_from(snapshot.analyzed_repository_count)
            .map_err(|_| "stored profile repository count is invalid".to_string())?,
        available_personal_capability_count: usize::try_from(
            snapshot.available_personal_capability_count,
        )
        .map_err(|_| "stored profile capability count is invalid".to_string())?,
        shown_personal_capability_count: usize::try_from(snapshot.shown_personal_capability_count)
            .map_err(|_| "stored profile capability count is invalid".to_string())?,
        repository_only_claims_omitted: usize::try_from(snapshot.repository_only_claims_omitted)
            .map_err(|_| "stored profile omission count is invalid".to_string())?,
        unresolved_attribution_claims_omitted: usize::try_from(
            snapshot.unresolved_attribution_claims_omitted,
        )
        .map_err(|_| "stored profile omission count is invalid".to_string())?,
        available_evidence_count: usize::try_from(snapshot.available_evidence_count)
            .map_err(|_| "stored profile evidence count is invalid".to_string())?,
        shown_evidence_count: usize::try_from(snapshot.shown_evidence_count)
            .map_err(|_| "stored profile evidence count is invalid".to_string())?,
        available_actor_evidence_count: usize::try_from(snapshot.available_actor_evidence_count)
            .map_err(|_| "stored profile actor evidence count is invalid".to_string())?,
        shown_actor_evidence_count: usize::try_from(snapshot.shown_actor_evidence_count)
            .map_err(|_| "stored profile actor evidence count is invalid".to_string())?,
        truncated: snapshot.truncated,
        capabilities,
        evidence: snapshot
            .evidence
            .into_iter()
            .map(|record| PersonalProfileEvidenceView {
                id: record.id,
                repository: record.repository,
                path: record.path,
                kind: record.kind,
                bytes: record.bytes,
            })
            .collect(),
        actor_evidence: snapshot
            .actor_evidence
            .into_iter()
            .map(|record| PersonalActorEvidenceView {
                id: record.id,
                relation: record.relation,
                repository: record.repository,
                source_kind: record.source_kind,
                source_ref: record.source_ref,
                observed_at: record.observed_at,
                implementation_origin: record.implementation_origin,
                target_evidence_refs: record.target_evidence_refs,
            })
            .collect(),
    })
}

fn inspect_profile_impl(
    request: PersonalProfileRequest,
    audit_cache_root: &Path,
) -> Result<PersonalProfileInspection, String> {
    let aggregate = build_personal_profile_aggregate(request, audit_cache_root)?;
    personal_profile_inspection(&aggregate)
}

fn build_personal_profile_aggregate(
    request: PersonalProfileRequest,
    audit_cache_root: &Path,
) -> Result<PersonalProfileAggregate, String> {
    if request.targets.is_empty() {
        return Err("at least one repository target is required".into());
    }
    if request.targets.len() > 32 {
        return Err("personal profile inspection supports at most 32 repository targets".into());
    }

    let actor_key = request.identity.actor_key.trim().to_string();
    if actor_key.is_empty() {
        return Err("profile identity requires a non-empty actor key".into());
    }
    let names = normalized_identity_values(&request.identity.names);
    let emails = normalized_identity_values(&request.identity.emails);
    if names.is_empty() && emails.is_empty() {
        return Err("profile identity requires at least one Git name or email".into());
    }
    let git_identity = GitActorIdentity {
        actor_key: actor_key.clone(),
        names,
        emails,
    };

    let analyzed_repository_count = request.targets.len();
    let mut repositories = BTreeSet::new();
    let mut semantic_claims = Vec::new();
    let mut profile_evidence = BTreeMap::new();
    let mut evidence_views = BTreeMap::new();
    let mut actor_evidence = Vec::new();

    for target in request.targets {
        let local_path = match &target {
            RepositoryTarget::Local { path } => Some(PathBuf::from(path.trim())),
            RepositoryTarget::Remote { .. } => None,
        };
        let (bundle, _) = collect_repository_target(target, audit_cache_root)?;
        let repository = bundle.repository.name.clone();
        repositories.insert(repository.clone());

        for record in &bundle.evidence {
            profile_evidence
                .entry(record.id.clone())
                .or_insert_with(|| ProfileEvidenceMeta {
                    kind: record.kind.clone(),
                    observed_at: bundle.repository.head_commit_time.clone(),
                    stale: false,
                    actor_relation: None,
                    implementation_origin: None,
                });
            evidence_views.entry(record.id.clone()).or_insert_with(|| {
                PersonalProfileEvidenceView {
                    id: record.id.clone(),
                    repository: repository.clone(),
                    path: record.path.clone(),
                    kind: record.kind.clone(),
                    bytes: record.bytes,
                }
            });
        }

        let fingerprint = analyze_repository_domain_fingerprint(&bundle, &[], None)
            .map_err(|_| "repository domain inspection failed".to_string())?;
        for candidate in fingerprint.candidates {
            let evidence_refs = candidate
                .evidence_refs
                .into_iter()
                .filter(|evidence_ref| profile_evidence.contains_key(evidence_ref))
                .collect::<Vec<_>>();
            if evidence_refs.is_empty() {
                continue;
            }
            semantic_claims.push(SemanticClaim {
                skill: candidate.label,
                repository: repository.clone(),
                evidence_refs,
                confidence: None,
                stance: ClaimStance::Support,
                stale: false,
                reason: Some("deterministic repository-domain evidence".into()),
            });
        }

        if let Some(root) = local_path.filter(|root| root.join(".git").exists()) {
            let records = collect_git_actor_evidence(
                &root,
                &bundle,
                std::slice::from_ref(&git_identity),
                GitActorEvidenceOptions::default(),
            )
            .map_err(|_| "local Git attribution analysis failed".to_string())?;
            actor_evidence.extend(records);
        }
    }

    let profile = build_developer_profile_with_actor_evidence(
        BTreeMap::from([("actorKey".into(), actor_key.clone())]),
        repositories.into_iter().collect(),
        semantic_claims,
        &profile_evidence,
        &actor_key,
        &actor_evidence,
    )
    .map_err(|_| "personal profile aggregation failed".to_string())?;

    Ok(PersonalProfileAggregate {
        actor_key,
        analyzed_repository_count,
        profile,
        profile_evidence,
        evidence_views,
        actor_evidence,
    })
}

fn personal_profile_inspection(
    aggregate: &PersonalProfileAggregate,
) -> Result<PersonalProfileInspection, String> {
    let actor_by_id = aggregate
        .actor_evidence
        .iter()
        .map(|record| (record.id.clone(), record))
        .collect::<BTreeMap<_, _>>();
    let mut repository_only_claims_omitted = 0usize;
    let mut unresolved_attribution_claims_omitted = 0usize;
    let mut candidates = Vec::new();
    let mut all_required_evidence = BTreeSet::new();
    let mut all_required_actor = BTreeSet::new();

    for capability in &aggregate.profile.skills {
        if capability.attribution.status == AttributionStatus::RepositoryOnly {
            repository_only_claims_omitted += 1;
            continue;
        }

        let support_set = capability
            .support_evidence_refs
            .iter()
            .map(String::as_str)
            .collect::<BTreeSet<_>>();
        let mut contributing_actor = Vec::new();
        let mut linked_support_refs = BTreeSet::new();
        for actor_ref in &capability.attribution.actor_evidence_refs {
            let Some(record) = actor_by_id.get(actor_ref) else {
                continue;
            };
            let matched = record
                .target_evidence_refs
                .iter()
                .filter(|evidence_ref| support_set.contains(evidence_ref.as_str()))
                .cloned()
                .collect::<Vec<_>>();
            if matched.is_empty() {
                continue;
            }
            linked_support_refs.extend(matched);
            contributing_actor.push(*record);
        }
        if linked_support_refs.is_empty() || contributing_actor.is_empty() {
            unresolved_attribution_claims_omitted += 1;
            continue;
        }

        let actor_refs = contributing_actor
            .iter()
            .map(|record| record.id.clone())
            .collect::<BTreeSet<_>>();
        let repositories = contributing_actor
            .iter()
            .map(|record| record.repository.clone())
            .collect::<BTreeSet<_>>();
        let actor_relations = contributing_actor
            .iter()
            .map(|record| record.relation.as_str().to_string())
            .collect::<BTreeSet<_>>();
        let implementation_origins = contributing_actor
            .iter()
            .map(|record| record.implementation_origin.as_str().to_string())
            .collect::<BTreeSet<_>>();
        let evidence_diversity = linked_support_refs
            .iter()
            .filter_map(|evidence_ref| aggregate.evidence_views.get(evidence_ref))
            .map(|record| record.kind.clone())
            .collect::<BTreeSet<_>>();
        let mut required_evidence = linked_support_refs.clone();
        for record in &contributing_actor {
            required_evidence.extend(record.target_evidence_refs.iter().cloned());
        }
        if required_evidence
            .iter()
            .any(|evidence_ref| !aggregate.evidence_views.contains_key(evidence_ref))
        {
            unresolved_attribution_claims_omitted += 1;
            continue;
        }

        let attribution_status = strongest_attribution_status(&contributing_actor);
        let view = PersonalCapabilityView {
            key: capability.key.clone(),
            label: capability.label.clone(),
            repository_count: repositories.len(),
            repositories: repositories.into_iter().collect(),
            attribution_status,
            actor_evidence_refs: actor_refs.iter().cloned().collect(),
            actor_relations: actor_relations.into_iter().collect(),
            implementation_origins: implementation_origins.into_iter().collect(),
            support_evidence_refs: linked_support_refs.into_iter().collect(),
            evidence_diversity: evidence_diversity.into_iter().collect(),
        };
        all_required_evidence.extend(required_evidence.iter().cloned());
        all_required_actor.extend(actor_refs.iter().cloned());
        candidates.push((view, required_evidence, actor_refs));
    }

    let available_personal_capability_count = candidates.len();
    let available_evidence_count = all_required_evidence.len();
    let available_actor_evidence_count = all_required_actor.len();
    let mut capabilities = Vec::new();
    let mut selected_evidence = BTreeSet::new();
    let mut selected_actor = BTreeSet::new();

    for (view, required_evidence, required_actor) in candidates {
        let next_evidence = selected_evidence.union(&required_evidence).count();
        let next_actor = selected_actor.union(&required_actor).count();
        if capabilities.len() >= MAX_PROFILE_CAPABILITIES
            || next_evidence > MAX_PROFILE_EVIDENCE
            || next_actor > MAX_PROFILE_ACTOR_EVIDENCE
        {
            continue;
        }
        selected_evidence.extend(required_evidence);
        selected_actor.extend(required_actor);
        capabilities.push(view);
    }

    let evidence = selected_evidence
        .iter()
        .filter_map(|evidence_ref| aggregate.evidence_views.get(evidence_ref).cloned())
        .collect::<Vec<_>>();
    let actor_evidence = selected_actor
        .iter()
        .filter_map(|actor_ref| actor_by_id.get(actor_ref).copied())
        .map(personal_actor_evidence_view)
        .collect::<Vec<_>>();
    let shown_personal_capability_count = capabilities.len();
    let shown_evidence_count = evidence.len();
    let shown_actor_evidence_count = actor_evidence.len();
    let truncated = shown_personal_capability_count < available_personal_capability_count
        || shown_evidence_count < available_evidence_count
        || shown_actor_evidence_count < available_actor_evidence_count;

    Ok(PersonalProfileInspection {
        schema: PERSONAL_PROFILE_INSPECTION_SCHEMA,
        scope: "personal-profile",
        subject_actor_key: aggregate.actor_key.clone(),
        analyzed_repository_count: aggregate.analyzed_repository_count,
        available_personal_capability_count,
        shown_personal_capability_count,
        repository_only_claims_omitted,
        unresolved_attribution_claims_omitted,
        available_evidence_count,
        shown_evidence_count,
        available_actor_evidence_count,
        shown_actor_evidence_count,
        truncated,
        capabilities,
        evidence,
        actor_evidence,
    })
}

fn safe_profile_from_inspection(
    aggregate: &PersonalProfileAggregate,
    inspection: &PersonalProfileInspection,
) -> Result<DeveloperProfile, String> {
    let visible_evidence_ids = inspection
        .evidence
        .iter()
        .map(|record| record.id.clone())
        .collect::<BTreeSet<_>>();
    let visible_actor_ids = inspection
        .actor_evidence
        .iter()
        .map(|record| record.id.clone())
        .collect::<BTreeSet<_>>();

    let mut claims_by_repo = BTreeMap::<(String, String), BTreeSet<String>>::new();
    let mut repositories = BTreeSet::new();
    for capability in &inspection.capabilities {
        for evidence_ref in &capability.support_evidence_refs {
            let record = aggregate
                .evidence_views
                .get(evidence_ref)
                .ok_or_else(|| "personal capability support evidence is unresolved".to_string())?;
            repositories.insert(record.repository.clone());
            claims_by_repo
                .entry((capability.label.clone(), record.repository.clone()))
                .or_default()
                .insert(evidence_ref.clone());
        }
    }

    let semantic_claims = claims_by_repo
        .into_iter()
        .map(|((skill, repository), evidence_refs)| SemanticClaim {
            skill,
            repository,
            evidence_refs: evidence_refs.into_iter().collect(),
            confidence: None,
            stance: ClaimStance::Support,
            stale: false,
            reason: Some("exact actor-linked repository-domain evidence".into()),
        })
        .collect::<Vec<_>>();
    let profile_evidence = aggregate
        .profile_evidence
        .iter()
        .filter(|(id, _)| visible_evidence_ids.contains(*id))
        .map(|(id, value)| (id.clone(), value.clone()))
        .collect::<BTreeMap<_, _>>();
    let actor_evidence = aggregate
        .actor_evidence
        .iter()
        .filter(|record| visible_actor_ids.contains(&record.id))
        .cloned()
        .collect::<Vec<_>>();

    build_developer_profile_with_actor_evidence(
        BTreeMap::from([("actorKey".into(), aggregate.actor_key.clone())]),
        repositories.into_iter().collect(),
        semantic_claims,
        &profile_evidence,
        &aggregate.actor_key,
        &actor_evidence,
    )
    .map_err(|_| "bounded personal profile reconstruction failed".to_string())
}

fn validate_session_declarations(
    actor_key: &str,
    declarations: Vec<ProfileDeclaration>,
) -> Result<Vec<ProfileDeclaration>, String> {
    if declarations.len() > MAX_PROFILE_DECLARATIONS {
        return Err(format!(
            "profile session supports at most {MAX_PROFILE_DECLARATIONS} declarations"
        ));
    }

    let mut ids = BTreeSet::new();
    let mut validated = Vec::with_capacity(declarations.len());
    for declaration in declarations {
        let declaration = validate_profile_declaration(declaration)
            .map_err(|_| "profile session contains an invalid declaration".to_string())?;
        if declaration.actor_key != actor_key {
            return Err("profile declaration actor does not match the active subject".into());
        }
        if !ids.insert(declaration.id.clone()) {
            return Err("profile session contains duplicate declaration ids".into());
        }
        validated.push(declaration);
    }
    Ok(validated)
}

fn prepare_profile_interview_impl(
    request: ProfileInterviewSessionRequest,
    audit_cache_root: &Path,
) -> Result<ProfileInterviewSession, String> {
    let aggregate = build_personal_profile_aggregate(request.profile, audit_cache_root)?;
    let inspection = personal_profile_inspection(&aggregate)?;
    let safe_profile = safe_profile_from_inspection(&aggregate, &inspection)?;
    let declarations = validate_session_declarations(&aggregate.actor_key, request.declarations)?;
    let observations = developer_profile_to_profile_observations(&safe_profile)
        .map_err(|_| "personal profile observations could not be prepared".to_string())?;
    let reconciliation =
        reconcile_profile_declarations(&aggregate.actor_key, &declarations, observations)
            .map_err(|_| "profile declarations could not be reconciled".to_string())?;
    let plan = plan_profile_interview(
        &aggregate.actor_key,
        &declarations,
        &reconciliation,
        &default_profile_interview_categories(),
    )
    .map_err(|_| "profile interview plan could not be prepared".to_string())?;
    let prompts = render_profile_interview_prompts(&plan)
        .map_err(|_| "profile interview prompts could not be rendered".to_string())?;
    if prompts.len() > MAX_PROFILE_INTERVIEW_PROMPTS {
        return Err(format!(
            "profile interview produced more than {MAX_PROFILE_INTERVIEW_PROMPTS} prompts"
        ));
    }

    let resolvable_refs = inspection
        .evidence
        .iter()
        .map(|record| record.id.as_str())
        .chain(
            inspection
                .actor_evidence
                .iter()
                .map(|record| record.id.as_str()),
        )
        .collect::<BTreeSet<_>>();
    if prompts.iter().any(|prompt| {
        prompt
            .evidence_refs
            .iter()
            .any(|evidence_ref| !resolvable_refs.contains(evidence_ref.as_str()))
    }) {
        return Err(
            "profile interview prompt references evidence outside the bounded session".into(),
        );
    }

    Ok(ProfileInterviewSession {
        schema: PROFILE_INTERVIEW_SESSION_SCHEMA,
        subject_actor_key: aggregate.actor_key,
        prompts,
        evidence: inspection.evidence,
        actor_evidence: inspection.actor_evidence,
    })
}

fn answer_profile_interview_impl(
    request: ProfileInterviewAnswerRequest,
) -> Result<ProfileDeclaration, String> {
    let actor_key = request.actor_key.trim();
    if actor_key.is_empty() || request.prompt.actor_key != actor_key {
        return Err("interview prompt actor does not match the active subject".into());
    }
    if request.prompt.schema != giteach_core::PROFILE_INTERVIEW_PROMPT_SCHEMA {
        return Err("invalid profile interview prompt schema".into());
    }

    let question = ProfileInterviewQuestion {
        id: request.prompt.question_id,
        kind: request.prompt.kind,
        category: request.prompt.category,
        subject_key: request.prompt.subject_key,
        source_status: None,
        declaration_ids: request.prompt.declaration_ids,
        evidence_refs: request.prompt.evidence_refs,
    };
    profile_interview_answer_to_declaration(
        actor_key,
        &question,
        &request.answer,
        &request.answered_at,
        ProfileDeclarationPublicationStatus::Private,
        request.repositories,
        None,
        None,
    )
    .map_err(|_| {
        "profile interview answer could not be stored as a private declaration".to_string()
    })
}

fn generate_profile_outputs_impl(
    request: ProfileOutputRequest,
    audit_cache_root: &Path,
) -> Result<ProfileOutputBundle, String> {
    let aggregate = build_personal_profile_aggregate(request.profile, audit_cache_root)?;
    let inspection = personal_profile_inspection(&aggregate)?;
    let safe_profile = safe_profile_from_inspection(&aggregate, &inspection)?;
    let mut declarations =
        validate_session_declarations(&aggregate.actor_key, request.declarations)?;
    let approved_ids = request
        .approved_declaration_ids
        .into_iter()
        .map(|id| id.trim().to_string())
        .filter(|id| !id.is_empty())
        .collect::<BTreeSet<_>>();
    let known_ids = declarations
        .iter()
        .map(|declaration| declaration.id.clone())
        .collect::<BTreeSet<_>>();
    if approved_ids.iter().any(|id| !known_ids.contains(id)) {
        return Err("publication approval references an unknown private declaration".into());
    }
    for declaration in &mut declarations {
        declaration.publication_status = if approved_ids.contains(&declaration.id) {
            ProfileDeclarationPublicationStatus::Approved
        } else {
            ProfileDeclarationPublicationStatus::Private
        };
    }
    let publication_context =
        prepare_profile_publication_context(&aggregate.actor_key, &declarations)
            .map_err(|_| "approved publication context could not be prepared".to_string())?;

    let document_sources = inspection
        .evidence
        .iter()
        .map(|record| {
            let observed_at = aggregate
                .profile_evidence
                .get(&record.id)
                .and_then(|meta| meta.observed_at.clone());
            (
                record.id.clone(),
                DocumentEvidenceSource {
                    id: record.id.clone(),
                    repo: record.repository.clone(),
                    path: record.path.clone(),
                    kind: record.kind.clone(),
                    subject: None,
                    commit: None,
                    source_hash: None,
                    excerpt_hash: None,
                    observed_at,
                    actor_relation: None,
                    implementation_origin: None,
                },
            )
        })
        .collect::<BTreeMap<_, _>>();
    let targets = [
        DocumentTarget::GithubProfileReadme,
        DocumentTarget::PortfolioCard,
        DocumentTarget::LinkedinProject,
        DocumentTarget::LinkedinSkills,
        DocumentTarget::CvEvidence,
    ];
    let documents = targets
        .into_iter()
        .map(|target| {
            prepare_document_input(&safe_profile, &document_sources, target)
                .map(document_input_view)
                .map_err(|_| "profile document input could not be prepared".to_string())
        })
        .collect::<Result<Vec<_>, _>>()?;

    Ok(ProfileOutputBundle {
        schema: PROFILE_OUTPUT_BUNDLE_SCHEMA,
        subject_actor_key: aggregate.actor_key,
        publication_context,
        documents,
    })
}

fn document_input_view(input: DocumentInput) -> DesktopDocumentInputView {
    DesktopDocumentInputView {
        schema: input.schema,
        target: input.target,
        developer: input.developer,
        repositories: input.repositories,
        claims: input
            .claims
            .into_iter()
            .map(|claim| DesktopDocumentClaimView {
                key: claim.key,
                label: claim.label,
                repositories: claim.repositories,
                evidence_diversity: claim.evidence_diversity,
                latest_evidence_at: claim.latest_evidence_at,
                attribution: claim.attribution,
                evidence_refs: claim.evidence_refs,
                supporting_statements: claim.supporting_statements,
                cautions: claim.cautions,
            })
            .collect(),
    }
}

fn normalized_identity_values(values: &[String]) -> Vec<String> {
    values
        .iter()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect()
}

fn strongest_attribution_status(records: &[&ActorEvidence]) -> &'static str {
    if records.iter().any(|record| {
        matches!(
            record.relation.as_str(),
            "reviewed-change"
                | "decision-record"
                | "design-session"
                | "debug-session"
                | "test-session"
                | "maintenance-session"
                | "agent-direction"
        )
    }) {
        "agency-supported"
    } else if records
        .iter()
        .any(|record| record.relation.as_str() == "manual-confirmation")
    {
        "user-confirmed"
    } else {
        "identity-linked"
    }
}

fn actor_source_kind_label(kind: &ActorEvidenceSourceKind) -> &'static str {
    match kind {
        ActorEvidenceSourceKind::Git => "git",
        ActorEvidenceSourceKind::Github => "github",
        ActorEvidenceSourceKind::DesignArtifact => "design-artifact",
        ActorEvidenceSourceKind::WorkSession => "work-session",
        ActorEvidenceSourceKind::AgentWorkflow => "agent-workflow",
        ActorEvidenceSourceKind::Manual => "manual",
    }
}

fn personal_actor_evidence_view(record: &ActorEvidence) -> PersonalActorEvidenceView {
    PersonalActorEvidenceView {
        id: record.id.clone(),
        relation: record.relation.as_str().to_string(),
        repository: record.repository.clone(),
        source_kind: actor_source_kind_label(&record.source_kind).to_string(),
        source_ref: record.source_ref.clone(),
        observed_at: record.observed_at.clone(),
        implementation_origin: record.implementation_origin.as_str().to_string(),
        target_evidence_refs: record.target_evidence_refs.clone(),
    }
}

fn collect_repository_target(
    target: RepositoryTarget,
    audit_cache_root: &Path,
) -> Result<(RepoEvidenceBundle, AcquisitionView), String> {
    let collected = collect_repository_target_with_receipt(target, audit_cache_root)?;
    Ok((collected.bundle, collected.acquisition))
}

fn collect_repository_target_with_receipt(
    target: RepositoryTarget,
    audit_cache_root: &Path,
) -> Result<CollectedRepositoryTarget, String> {
    match target {
        RepositoryTarget::Local { path } => {
            let normalized = path.trim();
            if normalized.is_empty() {
                return Err("repository path is required".into());
            }
            let bundle = collect_local_repository(Path::new(normalized))?;
            Ok(CollectedRepositoryTarget {
                bundle,
                acquisition: AcquisitionView {
                    kind: "local",
                    audit_action: None,
                },
                audit_receipt: None,
            })
        }
        RepositoryTarget::Remote {
            owner,
            name,
            remote_url,
        } => {
            let spec = RemoteAuditRepositorySpec {
                owner: owner.trim().to_string(),
                name: name.trim().to_string(),
                remote_url: remote_url.trim().to_string(),
            };
            if spec.owner.is_empty() || spec.name.is_empty() || spec.remote_url.is_empty() {
                return Err("remote owner, repository name, and URL are required".into());
            }

            let manager = RepositoryAuditCacheManager::new(audit_cache_root);
            let snapshot = manager
                .prepare_remote(&spec)
                .map_err(sanitize_audit_error)?;
            let audit_action = audit_action_label(&snapshot.action);
            let receipt = RepositoryAuditReceipt::from_snapshot(&snapshot)
                .map_err(|_| "remote audit receipt preparation failed".to_string())?;
            let bundle = manager
                .collect_selected_evidence(&snapshot, &CollectorOptions::default())
                .map_err(sanitize_audit_error)?;

            Ok(CollectedRepositoryTarget {
                bundle,
                acquisition: AcquisitionView {
                    kind: "remote-audit",
                    audit_action: Some(audit_action),
                },
                audit_receipt: Some(receipt),
            })
        }
    }
}

fn collect_local_repository(path: &Path) -> Result<RepoEvidenceBundle, String> {
    RepoEvidenceCollector::new(CollectorOptions::default())
        .collect(path)
        .map_err(|_| "local repository analysis failed".to_string())
}

fn repository_inspection(bundle: &RepoEvidenceBundle) -> Result<RepositoryInspectionView, String> {
    let fingerprint = analyze_repository_domain_fingerprint(bundle, &[], None)
        .map_err(|_| "repository domain inspection failed".to_string())?;

    let mut selected_ids = BTreeSet::new();
    let mut evidence = Vec::new();
    for evidence_ref in fingerprint
        .candidates
        .iter()
        .flat_map(|candidate| candidate.evidence_refs.iter())
    {
        if evidence.len() >= MAX_INSPECTION_EVIDENCE || !selected_ids.insert(evidence_ref.clone()) {
            continue;
        }
        if let Some(record) = bundle
            .evidence
            .iter()
            .find(|record| &record.id == evidence_ref)
        {
            evidence.push(EvidenceView {
                id: record.id.clone(),
                path: record.path.clone(),
                kind: record.kind.clone(),
                bytes: record.bytes,
            });
        }
    }

    for record in &bundle.evidence {
        if evidence.len() >= MAX_INSPECTION_EVIDENCE {
            break;
        }
        if selected_ids.insert(record.id.clone()) {
            evidence.push(EvidenceView {
                id: record.id.clone(),
                path: record.path.clone(),
                kind: record.kind.clone(),
                bytes: record.bytes,
            });
        }
    }

    let visible_ids: BTreeSet<_> = evidence.iter().map(|record| record.id.as_str()).collect();
    let project_domains = fingerprint
        .candidates
        .into_iter()
        .filter_map(|candidate| {
            let evidence_refs: Vec<_> = candidate
                .evidence_refs
                .into_iter()
                .filter(|evidence_ref| visible_ids.contains(evidence_ref.as_str()))
                .collect();
            if evidence_refs.is_empty() {
                return None;
            }
            Some(ProjectDomainView {
                key: candidate.key,
                label: candidate.label,
                source_kinds: candidate.source_kinds,
                evidence_refs,
                technologies: candidate.technologies,
                languages: candidate.languages,
                rule_based: candidate.rule_based,
            })
        })
        .collect();

    let available_evidence_count = bundle.evidence.len() as u64;
    let shown_evidence_count = evidence.len() as u64;
    Ok(RepositoryInspectionView {
        schema: REPOSITORY_INSPECTION_SCHEMA,
        scope: "repository-only",
        personal_experience_claimed: false,
        available_evidence_count,
        shown_evidence_count,
        truncated: shown_evidence_count < available_evidence_count,
        evidence,
        project_domains,
    })
}

fn repository_analysis(
    bundle: RepoEvidenceBundle,
    acquisition: AcquisitionView,
) -> RepositoryAnalysis {
    let parts = analysis_parts(bundle);
    RepositoryAnalysis {
        schema: REPOSITORY_ANALYSIS_SCHEMA,
        acquisition,
        repository: parts.repository,
        coverage: parts.coverage,
        summary: parts.summary,
        languages: parts.languages,
        technologies: parts.technologies,
    }
}

fn analysis_parts(bundle: RepoEvidenceBundle) -> AnalysisParts {
    let inventory = match bundle.coverage.inventory {
        RepositoryInventoryCoverage::CompletePolicyFiltered => "complete-policy-filtered",
        RepositoryInventoryCoverage::Partial => "partial",
    };
    let summary_scope = match bundle.coverage.summary_scope {
        RepositorySummaryScope::Inventory => "inventory",
        RepositorySummaryScope::SelectedContent => "selected-content",
    };

    AnalysisParts {
        repository: RepositoryView {
            name: bundle.repository.name,
            branch: bundle.repository.branch,
            head_commit: bundle.repository.head_commit,
        },
        coverage: CoverageView {
            inventory,
            summary_scope,
            known_path_count: bundle.coverage.known_path_count,
        },
        summary: SummaryView {
            files_scanned: bundle.summary.files_scanned,
            bytes_scanned: bundle.summary.bytes_scanned,
            evidence_records: bundle.summary.evidence_records,
            manifests: bundle.summary.manifests,
            docs: bundle.summary.docs,
            tests: bundle.summary.tests,
            tooling_files: bundle.summary.tooling_files,
            source_files: bundle.summary.source_files,
        },
        languages: bundle
            .languages
            .into_iter()
            .map(|item| LanguageView {
                language: item.language,
                files: item.files,
                bytes: item.bytes,
            })
            .collect(),
        technologies: bundle
            .technologies
            .into_iter()
            .map(|item| TechnologyView {
                name: item.name,
                source_path: item.source_path,
                source_kind: item.source_kind,
            })
            .collect(),
    }
}

fn audit_action_label(action: &RepositoryAuditAction) -> &'static str {
    match action {
        RepositoryAuditAction::Initialized => "initialized",
        RepositoryAuditAction::Updated => "updated",
        RepositoryAuditAction::Unchanged => "unchanged",
    }
}

fn sanitize_audit_error(error: RepositoryAuditError) -> String {
    match error {
        RepositoryAuditError::InvalidRepositoryIdentity => {
            "remote repository owner/name is invalid".into()
        }
        RepositoryAuditError::CredentialedRemote => {
            "remote URL must not contain embedded HTTP credentials".into()
        }
        RepositoryAuditError::UnsupportedRemote => {
            "remote URL must use HTTPS, SSH, file://, git@host:path, or an absolute local path"
                .into()
        }
        RepositoryAuditError::RemoteMismatch => {
            "remote URL does not match the existing repository audit cache".into()
        }
        RepositoryAuditError::RemoteHeadUnavailable => {
            "remote repository HEAD could not be resolved".into()
        }
        RepositoryAuditError::SnapshotDrift { .. } => {
            "remote repository changed during analysis; retry the analysis".into()
        }
        RepositoryAuditError::BlobTooLarge { .. } => {
            "a selected remote file exceeds the analysis byte limit".into()
        }
        RepositoryAuditError::GitUnavailable(_) => "git executable is unavailable".into(),
        RepositoryAuditError::CacheDirectory(_)
        | RepositoryAuditError::NotBareRepository(_)
        | RepositoryAuditError::SnapshotPathMismatch
        | RepositoryAuditError::UnknownSnapshotPath(_)
        | RepositoryAuditError::GitFailed { .. }
        | RepositoryAuditError::InvalidGitOutput { .. }
        | RepositoryAuditError::Collection(_) => "remote repository audit failed".into(),
    }
}

#[cfg(test)]
mod tests {
    use std::{fs, process::Command};

    use super::*;

    fn git(cwd: &Path, args: &[&str]) {
        let output = Command::new("git")
            .current_dir(cwd)
            .args(args)
            .output()
            .unwrap();
        assert!(
            output.status.success(),
            "git {} failed: {}",
            args.join(" "),
            String::from_utf8_lossy(&output.stderr)
        );
    }

    #[test]
    fn runtime_contract_is_explicitly_local_first() {
        let info = runtime_info();
        assert_eq!(info.schema, DESKTOP_RUNTIME_SCHEMA);
        assert!(info.local_first);
        assert!(!info.hosted_analysis_required);
        assert_eq!(info.core_evidence_schema, REPO_EVIDENCE_SCHEMA);
    }

    #[test]
    fn local_repository_analysis_is_bounded_to_summary_data() {
        let temp = tempfile::tempdir().unwrap();
        fs::create_dir_all(temp.path().join("src")).unwrap();
        fs::write(temp.path().join("src/main.rs"), "fn main() {}\n").unwrap();
        fs::write(
            temp.path().join("package.json"),
            r#"{"dependencies":{"typescript":"^5"}}"#,
        )
        .unwrap();

        let analysis = analyze_local_repository_impl(temp.path()).unwrap();
        assert_eq!(analysis.schema, LOCAL_REPOSITORY_ANALYSIS_SCHEMA);
        assert_eq!(analysis.coverage.summary_scope, "inventory");
        assert_eq!(analysis.summary.files_scanned, 2);
        assert!(
            analysis
                .languages
                .iter()
                .any(|item| item.language == "Rust")
        );

        let serialized = serde_json::to_string(&analysis).unwrap();
        assert!(!serialized.contains("excerpt"));
        assert!(!serialized.contains("sourceHash"));
        assert!(!serialized.contains("metadata"));
    }

    #[test]
    fn repository_inspection_is_bounded_repository_only_and_keeps_resolvable_domain_refs() {
        let temp = tempfile::tempdir().unwrap();
        fs::create_dir_all(temp.path().join("src")).unwrap();
        fs::write(
            temp.path().join("src/main.js"),
            "export const app = true;\n",
        )
        .unwrap();
        fs::write(
            temp.path().join("package.json"),
            r#"{"dependencies":{"react":"^19"}}"#,
        )
        .unwrap();

        let result = inspect_repository_impl(
            RepositoryTarget::Local {
                path: temp.path().to_string_lossy().into_owned(),
            },
            &temp.path().join("audit-cache"),
        )
        .unwrap();

        assert_eq!(result.schema, REPOSITORY_INSPECTION_RESULT_SCHEMA);
        assert_eq!(result.analysis.schema, REPOSITORY_ANALYSIS_SCHEMA);
        assert_eq!(result.inspection.schema, REPOSITORY_INSPECTION_SCHEMA);
        assert_eq!(result.inspection.scope, "repository-only");
        assert!(!result.inspection.personal_experience_claimed);
        assert!(result.inspection.evidence.len() <= MAX_INSPECTION_EVIDENCE);
        assert_eq!(
            result.inspection.shown_evidence_count,
            result.inspection.evidence.len() as u64
        );

        let visible_ids: BTreeSet<_> = result
            .inspection
            .evidence
            .iter()
            .map(|record| record.id.as_str())
            .collect();
        let web = result
            .inspection
            .project_domains
            .iter()
            .find(|domain| domain.key == "web-application")
            .expect("React should produce a deterministic repository web-domain signal");
        assert!(web.rule_based);
        assert!(!web.evidence_refs.is_empty());
        assert!(
            web.evidence_refs
                .iter()
                .all(|evidence_ref| visible_ids.contains(evidence_ref.as_str()))
        );

        let serialized = serde_json::to_string(&result).unwrap();
        assert!(!serialized.contains("excerpt"));
        assert!(!serialized.contains("sourceHash"));
        assert!(!serialized.contains("excerptHash"));
        assert!(!serialized.contains("metadata"));
        assert!(!serialized.contains("confidence"));
        assert!(!serialized.contains("seniority"));
        assert!(!serialized.contains("skillScore"));
    }

    #[test]
    fn personal_profile_inspection_requires_exact_actor_linkage_and_resolvable_refs() {
        let temp = tempfile::tempdir().unwrap();
        let repo_a = temp.path().join("repo-a");
        let repo_b = temp.path().join("repo-b");
        fs::create_dir_all(&repo_a).unwrap();
        fs::create_dir_all(&repo_b).unwrap();

        for (root, name, email) in [
            (&repo_a, "Mauro Dev", "mauro@example.com"),
            (&repo_b, "Other Dev", "other@example.com"),
        ] {
            git(root, &["init", "-q"]);
            git(root, &["config", "user.name", name]);
            git(root, &["config", "user.email", email]);
            fs::write(
                root.join("package.json"),
                r#"{"dependencies":{"react":"^19"}}"#,
            )
            .unwrap();
            if root == &repo_b {
                fs::write(
                    root.join("project.godot"),
                    "[application]\nconfig/name=\"Fixture\"\n",
                )
                .unwrap();
            }
            git(root, &["add", "."]);
            git(root, &["commit", "-m", "fixture"]);
        }

        let result = inspect_profile_impl(
            PersonalProfileRequest {
                targets: vec![
                    RepositoryTarget::Local {
                        path: repo_a.to_string_lossy().into_owned(),
                    },
                    RepositoryTarget::Local {
                        path: repo_b.to_string_lossy().into_owned(),
                    },
                ],
                identity: ProfileIdentityInput {
                    actor_key: "developer:local".into(),
                    names: vec!["Mauro Dev".into()],
                    emails: vec!["mauro@example.com".into()],
                },
            },
            &temp.path().join("audit-cache"),
        )
        .unwrap();

        assert_eq!(result.schema, PERSONAL_PROFILE_INSPECTION_SCHEMA);
        assert_eq!(result.scope, "personal-profile");
        assert_eq!(result.subject_actor_key, "developer:local");
        assert_eq!(result.analyzed_repository_count, 2);
        assert!(result.repository_only_claims_omitted >= 1);
        assert_eq!(result.unresolved_attribution_claims_omitted, 0);
        assert!(!result.capabilities.is_empty());
        assert!(!result.actor_evidence.is_empty());

        let web = result
            .capabilities
            .iter()
            .find(|capability| capability.label == "Web application")
            .expect("matching React repository should become identity-linked personal evidence");
        assert_eq!(web.attribution_status, "identity-linked");
        assert_eq!(web.repository_count, 1);
        assert_eq!(web.repositories, vec!["repo-a"]);
        assert!(!web.support_evidence_refs.is_empty());
        assert!(!web.actor_evidence_refs.is_empty());

        let evidence_ids = result
            .evidence
            .iter()
            .map(|record| record.id.as_str())
            .collect::<BTreeSet<_>>();
        let actor_ids = result
            .actor_evidence
            .iter()
            .map(|record| record.id.as_str())
            .collect::<BTreeSet<_>>();
        assert!(
            web.support_evidence_refs
                .iter()
                .all(|evidence_ref| evidence_ids.contains(evidence_ref.as_str()))
        );
        assert!(
            web.actor_evidence_refs
                .iter()
                .all(|actor_ref| actor_ids.contains(actor_ref.as_str()))
        );
        assert!(result.actor_evidence.iter().all(|record| {
            record
                .target_evidence_refs
                .iter()
                .all(|evidence_ref| evidence_ids.contains(evidence_ref.as_str()))
        }));
        assert!(
            result
                .evidence
                .iter()
                .all(|record| record.repository == "repo-a")
        );

        let serialized = serde_json::to_string(&result).unwrap();
        assert!(!serialized.contains("excerpt"));
        assert!(!serialized.contains("sourceHash"));
        assert!(!serialized.contains("confidence"));
        assert!(!serialized.contains("seniority"));
        assert!(!serialized.contains("skillScore"));
    }

    #[test]
    fn persisted_personal_profile_restores_only_exact_actor_and_repository_set() {
        let temp = tempfile::tempdir().unwrap();
        let repo = temp.path().join("profile-repo");
        fs::create_dir_all(&repo).unwrap();
        git(&repo, &["init", "-q"]);
        git(&repo, &["config", "user.name", "Mauro Dev"]);
        git(&repo, &["config", "user.email", "mauro@example.com"]);
        fs::write(
            repo.join("package.json"),
            r#"{"dependencies":{"react":"^19"}}"#,
        )
        .unwrap();
        git(&repo, &["add", "."]);
        git(&repo, &["commit", "-m", "fixture"]);

        let request = PersonalProfileRequest {
            targets: vec![RepositoryTarget::Local {
                path: repo.to_string_lossy().into_owned(),
            }],
            identity: ProfileIdentityInput {
                actor_key: "developer:local".into(),
                names: vec!["Mauro Dev".into()],
                emails: vec!["mauro@example.com".into()],
            },
        };
        let audit_cache = temp.path().join("audit-cache");
        let product_store = temp.path().join("product.sqlite3");
        let persisted =
            inspect_profile_persisted_impl(request.clone(), &audit_cache, &product_store).unwrap();
        assert!(!persisted.capabilities.is_empty());
        assert!(
            persisted
                .capabilities
                .iter()
                .all(|capability| capability.attribution_status != "repository-only")
        );

        let restored = load_profile_snapshot_impl(&request, &product_store)
            .unwrap()
            .expect("exact profile identity and repository set should restore");
        assert_eq!(restored, persisted);
        let serialized = serde_json::to_string(&restored).unwrap();
        assert!(!serialized.contains("excerpt"));
        assert!(!serialized.contains("sourceHash"));
        assert!(!serialized.contains("excerptHash"));
        assert!(!serialized.contains("hydratedSha256"));
        assert!(!serialized.contains("metadata"));
        assert!(!serialized.contains("publication"));
        assert!(!serialized.contains("declaration"));
        assert!(!serialized.contains(&audit_cache.to_string_lossy().to_string()));

        let mut different_identity = request.clone();
        different_identity.identity.emails = vec!["other@example.com".into()];
        assert!(
            load_profile_snapshot_impl(&different_identity, &product_store)
                .unwrap()
                .is_none()
        );

        let second_repo = temp.path().join("other-repo");
        fs::create_dir_all(&second_repo).unwrap();
        let mut different_set = request;
        different_set.targets.push(RepositoryTarget::Local {
            path: second_repo.to_string_lossy().into_owned(),
        });
        assert!(
            load_profile_snapshot_impl(&different_set, &product_store)
                .unwrap()
                .is_none()
        );
    }

    #[test]
    fn private_interview_answers_persist_for_exact_profile_while_publication_gate_stays_off() {
        let temp = tempfile::tempdir().unwrap();
        let repo = temp.path().join("profile-repo");
        fs::create_dir_all(&repo).unwrap();
        git(&repo, &["init", "-q"]);
        git(&repo, &["config", "user.name", "Mauro Dev"]);
        git(&repo, &["config", "user.email", "mauro@example.com"]);
        fs::write(
            repo.join("package.json"),
            r#"{"dependencies":{"react":"^19"}}"#,
        )
        .unwrap();
        git(&repo, &["add", "."]);
        git(&repo, &["commit", "-m", "fixture"]);

        let profile_request = PersonalProfileRequest {
            targets: vec![RepositoryTarget::Local {
                path: repo.to_string_lossy().into_owned(),
            }],
            identity: ProfileIdentityInput {
                actor_key: "developer:local".into(),
                names: vec!["Mauro Dev".into()],
                emails: vec!["mauro@example.com".into()],
            },
        };
        let cache_root = temp.path().join("audit-cache");
        let product_store = temp.path().join("product.sqlite3");
        inspect_profile_persisted_impl(profile_request.clone(), &cache_root, &product_store)
            .unwrap();
        let session = prepare_profile_interview_impl(
            ProfileInterviewSessionRequest {
                profile: profile_request.clone(),
                declarations: vec![],
            },
            &cache_root,
        )
        .unwrap();
        let declaration = answer_profile_interview_impl(ProfileInterviewAnswerRequest {
            actor_key: "developer:local".into(),
            prompt: session.prompts.first().unwrap().clone(),
            answer: "Developer focused on local-first tooling".into(),
            answered_at: "2026-09-25T05:00:00Z".into(),
            repositories: vec!["profile-repo".into()],
        })
        .unwrap();
        let saved = save_private_profile_declaration_impl(
            PrivateProfileDeclarationRequest {
                profile: profile_request.clone(),
                declaration: declaration.clone(),
            },
            &product_store,
        )
        .unwrap();
        assert_eq!(saved, declaration);
        assert_eq!(
            load_private_profile_declarations_impl(&profile_request, &product_store).unwrap(),
            vec![declaration.clone()]
        );

        let mut approved = declaration;
        approved.publication_status = ProfileDeclarationPublicationStatus::Approved;
        assert!(
            save_private_profile_declaration_impl(
                PrivateProfileDeclarationRequest {
                    profile: profile_request,
                    declaration: approved,
                },
                &product_store,
            )
            .is_err()
        );
    }

    #[test]
    fn guided_profile_flow_keeps_answers_private_until_explicit_approval_and_sanitizes_outputs() {
        let temp = tempfile::tempdir().unwrap();
        let repo = temp.path().join("profile-repo");
        fs::create_dir_all(&repo).unwrap();
        git(&repo, &["init", "-q"]);
        git(&repo, &["config", "user.name", "Mauro Dev"]);
        git(&repo, &["config", "user.email", "mauro@example.com"]);
        fs::create_dir_all(repo.join("src")).unwrap();
        fs::write(
            repo.join("package.json"),
            r#"{"dependencies":{"react":"^19"}}"#,
        )
        .unwrap();
        fs::write(repo.join("src/app.js"), "export const app = true;\n").unwrap();
        git(&repo, &["add", "."]);
        git(&repo, &["commit", "-m", "fixture"]);

        let profile_request = PersonalProfileRequest {
            targets: vec![RepositoryTarget::Local {
                path: repo.to_string_lossy().into_owned(),
            }],
            identity: ProfileIdentityInput {
                actor_key: "developer:local".into(),
                names: vec!["Mauro Dev".into()],
                emails: vec!["mauro@example.com".into()],
            },
        };
        let cache_root = temp.path().join("audit-cache");
        let session = prepare_profile_interview_impl(
            ProfileInterviewSessionRequest {
                profile: profile_request.clone(),
                declarations: vec![],
            },
            &cache_root,
        )
        .unwrap();
        assert_eq!(session.schema, PROFILE_INTERVIEW_SESSION_SCHEMA);
        assert_eq!(session.subject_actor_key, "developer:local");
        assert!(!session.prompts.is_empty());
        assert!(!session.evidence.is_empty());
        assert!(!session.actor_evidence.is_empty());

        let prompt = session.prompts.first().unwrap().clone();
        let declaration = answer_profile_interview_impl(ProfileInterviewAnswerRequest {
            actor_key: "developer:local".into(),
            prompt,
            answer: "Developer focused on local-first tooling".into(),
            answered_at: "2026-09-24T20:00:00Z".into(),
            repositories: vec!["profile-repo".into()],
        })
        .unwrap();
        assert_eq!(
            declaration.publication_status,
            ProfileDeclarationPublicationStatus::Private
        );

        let private_bundle = generate_profile_outputs_impl(
            ProfileOutputRequest {
                profile: profile_request.clone(),
                declarations: vec![declaration.clone()],
                approved_declaration_ids: vec![],
            },
            &cache_root,
        )
        .unwrap();
        assert_eq!(private_bundle.schema, PROFILE_OUTPUT_BUNDLE_SCHEMA);
        assert!(private_bundle.publication_context.declarations.is_empty());
        assert_eq!(private_bundle.documents.len(), 5);

        let approved_bundle = generate_profile_outputs_impl(
            ProfileOutputRequest {
                profile: profile_request,
                declarations: vec![declaration.clone()],
                approved_declaration_ids: vec![declaration.id.clone()],
            },
            &cache_root,
        )
        .unwrap();
        assert_eq!(approved_bundle.publication_context.declarations.len(), 1);
        assert_eq!(approved_bundle.documents.len(), 5);
        assert!(approved_bundle.documents.iter().all(|document| {
            document.claims.iter().all(|claim| {
                claim.attribution.status != AttributionStatus::RepositoryOnly
                    && !claim.evidence_refs.is_empty()
            })
        }));

        let serialized = serde_json::to_string(&approved_bundle).unwrap();
        assert!(!serialized.contains("sourceHash"));
        assert!(!serialized.contains("excerptHash"));
        assert!(!serialized.contains("remoteUrl"));
        assert!(!serialized.contains("authorizationRef"));
        assert!(!serialized.contains("\"evidence\":"));
        assert!(!serialized.contains("confidence"));
        assert!(!serialized.contains("seniority"));
        assert!(!serialized.contains("skillScore"));
    }

    #[test]
    fn generic_local_target_preserves_inventory_coverage() {
        let temp = tempfile::tempdir().unwrap();
        fs::create_dir_all(temp.path().join("src")).unwrap();
        fs::write(temp.path().join("src/main.rs"), "fn main() {}\n").unwrap();

        let analysis = analyze_repository_impl(
            RepositoryTarget::Local {
                path: temp.path().to_string_lossy().into_owned(),
            },
            &temp.path().join("audit-cache"),
        )
        .unwrap();

        assert_eq!(analysis.schema, REPOSITORY_ANALYSIS_SCHEMA);
        assert_eq!(analysis.acquisition.kind, "local");
        assert_eq!(analysis.acquisition.audit_action, None);
        assert_eq!(analysis.coverage.summary_scope, "inventory");
    }

    #[test]
    fn remote_target_uses_blobless_audit_and_returns_only_bounded_summary() {
        let source = tempfile::tempdir().unwrap();
        git(source.path(), &["init"]);
        git(
            source.path(),
            &["config", "user.email", "gitteach@example.test"],
        );
        git(source.path(), &["config", "user.name", "GitTeach Test"]);
        fs::create_dir_all(source.path().join("src")).unwrap();
        fs::write(
            source.path().join("src/main.rs"),
            "fn main() { println!(\"SECRET_SOURCE_BODY\"); }\n",
        )
        .unwrap();
        fs::write(source.path().join("README.md"), "# Remote fixture\n").unwrap();
        fs::write(
            source.path().join("package.json"),
            r#"{"dependencies":{"typescript":"^5"}}"#,
        )
        .unwrap();
        fs::write(
            source.path().join("notes.txt"),
            "tracked but not selected for evidence\n",
        )
        .unwrap();
        git(source.path(), &["add", "."]);
        git(source.path(), &["commit", "-m", "fixture"]);

        let cache = tempfile::tempdir().unwrap();
        let target = RepositoryTarget::Remote {
            owner: "local-test".into(),
            name: "remote-fixture".into(),
            remote_url: source.path().to_string_lossy().into_owned(),
        };

        let first = analyze_repository_impl(target.clone(), cache.path()).unwrap();
        assert_eq!(first.schema, REPOSITORY_ANALYSIS_SCHEMA);
        assert_eq!(first.acquisition.kind, "remote-audit");
        assert_eq!(first.acquisition.audit_action, Some("initialized"));
        assert_eq!(first.coverage.summary_scope, "selected-content");
        assert!(first.coverage.known_path_count > first.summary.files_scanned);

        let second = analyze_repository_impl(target.clone(), cache.path()).unwrap();
        assert_eq!(second.acquisition.audit_action, Some("unchanged"));

        let inspected = inspect_repository_impl(target.clone(), cache.path()).unwrap();
        assert_eq!(inspected.schema, REPOSITORY_INSPECTION_RESULT_SCHEMA);
        assert_eq!(
            inspected.analysis.acquisition.audit_action,
            Some("unchanged")
        );
        assert_eq!(inspected.inspection.scope, "repository-only");
        assert!(!inspected.inspection.personal_experience_claimed);

        let serialized = serde_json::to_string(&first).unwrap();
        assert!(!serialized.contains("SECRET_SOURCE_BODY"));
        assert!(!serialized.contains("remoteUrl"));
        assert!(!serialized.contains("gitObjectId"));
        assert!(!serialized.contains("hydratedSha256"));
        assert!(!serialized.contains("excerpt"));
        assert!(!serialized.contains("metadata"));
        assert!(!serialized.contains(&source.path().to_string_lossy().to_string()));
        assert!(!serialized.contains(&cache.path().to_string_lossy().to_string()));

        let inspected_serialized = serde_json::to_string(&inspected).unwrap();
        assert!(!inspected_serialized.contains("SECRET_SOURCE_BODY"));
        assert!(!inspected_serialized.contains("remoteUrl"));
        assert!(!inspected_serialized.contains("gitObjectId"));
        assert!(!inspected_serialized.contains("hydratedSha256"));
        assert!(!inspected_serialized.contains("sourceHash"));
        assert!(!inspected_serialized.contains("excerptHash"));
        assert!(!inspected_serialized.contains("excerpt"));
        assert!(!inspected_serialized.contains("metadata"));
        assert!(!inspected_serialized.contains(&source.path().to_string_lossy().to_string()));
        assert!(!inspected_serialized.contains(&cache.path().to_string_lossy().to_string()));

        let product_store = cache.path().join("giteach-product.sqlite3");
        let persisted =
            inspect_repository_persisted_impl(target, cache.path(), &product_store).unwrap();
        assert_eq!(
            persisted.analysis.acquisition.audit_action,
            Some("unchanged")
        );
        let remembered = list_repository_connections_impl(&product_store).unwrap();
        assert_eq!(remembered.available_connection_count, 1);
        assert_eq!(remembered.connections.len(), 1);
        assert!(matches!(
            remembered.connections[0].target,
            RepositoryTarget::Remote { .. }
        ));
        let restored = load_repository_snapshot_impl(&remembered.connections[0].id, &product_store)
            .unwrap()
            .expect("persisted inspection should be restart-restorable");
        assert_eq!(restored, persisted);
        let restored_serialized = serde_json::to_string(&restored).unwrap();
        assert!(!restored_serialized.contains("SECRET_SOURCE_BODY"));
        assert!(!restored_serialized.contains("gitObjectId"));
        assert!(!restored_serialized.contains("hydratedSha256"));
        assert!(!restored_serialized.contains("sourceHash"));
        assert!(!restored_serialized.contains("excerptHash"));
        assert!(!restored_serialized.contains("excerpt"));
        assert!(!restored_serialized.contains("metadata"));
        assert!(!restored_serialized.contains(&cache.path().to_string_lossy().to_string()));
        let remembered_serialized = serde_json::to_string(&remembered).unwrap();
        assert!(remembered_serialized.contains("remoteUrl"));
        assert!(!remembered_serialized.contains("gitObjectId"));
        assert!(!remembered_serialized.contains("treeObjectId"));
        assert!(!remembered_serialized.contains("hydratedSha256"));
        assert!(!remembered_serialized.contains("SECRET_SOURCE_BODY"));
        assert!(!remembered_serialized.contains(&cache.path().to_string_lossy().to_string()));
        let database_bytes = fs::read(product_store).unwrap();
        assert!(!String::from_utf8_lossy(&database_bytes).contains("SECRET_SOURCE_BODY"));
    }

    #[test]
    fn persisted_repository_connection_survives_reopen_without_duplicate_rows() {
        let repository = tempfile::tempdir().unwrap();
        fs::create_dir_all(repository.path().join("src")).unwrap();
        fs::write(repository.path().join("src/main.rs"), "fn main() {}\n").unwrap();
        let state_root = tempfile::tempdir().unwrap();
        let audit_cache = state_root.path().join("audit-cache");
        let product_store = state_root.path().join("product.sqlite3");
        let target = RepositoryTarget::Local {
            path: repository.path().to_string_lossy().into_owned(),
        };

        analyze_repository_persisted_impl(target.clone(), &audit_cache, &product_store).unwrap();
        let first = list_repository_connections_impl(&product_store).unwrap();
        assert_eq!(first.schema, REPOSITORY_CONNECTION_LIST_SCHEMA);
        assert_eq!(first.available_connection_count, 1);
        assert!(!first.truncated);
        assert_eq!(first.connections.len(), 1);
        assert_eq!(
            first.connections[0].repository_name,
            repository.path().file_name().unwrap().to_string_lossy()
        );
        assert_eq!(first.connections[0].acquisition_kind, "local");
        assert_eq!(first.connections[0].summary_scope, "inventory");

        inspect_repository_persisted_impl(target, &audit_cache, &product_store).unwrap();
        let reopened = list_repository_connections_impl(&product_store).unwrap();
        assert_eq!(reopened.available_connection_count, 1);
        assert_eq!(reopened.connections.len(), 1);
        assert_eq!(reopened.connections[0].id, first.connections[0].id);
    }

    #[test]
    fn remote_error_messages_do_not_echo_git_stderr_or_paths() {
        let message = sanitize_audit_error(RepositoryAuditError::GitFailed {
            operation: "fetch remote",
            message: "secret-token C:\\private\\repo".into(),
        });
        assert_eq!(message, "remote repository audit failed");
        assert!(!message.contains("secret-token"));
        assert!(!message.contains("private"));
    }
}
