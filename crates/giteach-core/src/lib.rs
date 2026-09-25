mod actor;
mod collector;
mod declaration;
mod document;
mod domain_fingerprint;
mod git;
mod git_actor;
mod github;
mod github_actor;
mod github_collaboration;
mod incremental;
mod interview_adapter;
mod jev_incremental;
mod jev_store;
mod lifecycle;
mod manifest;
mod model;
mod policy;
mod portfolio_lifecycle;
mod product_store;
mod profile;
mod profile_observation;
mod profile_presentation;
mod profile_publication;
mod profile_statistics;
mod profile_surface_composition;
mod profile_widget_data;
mod profile_widget_plan;
mod redaction;
mod repository_audit;
mod repository_audit_store;
mod repository_workspace;
mod technology_evolution;
mod technology_footprint;
mod tendencies;

pub use actor::{
    ACTOR_EVIDENCE_SCHEMA, ActorEvidence, ActorEvidenceError, ActorEvidenceSourceKind,
    ActorRelation, ImplementationOrigin, actor_evidence_applies_to, validate_actor_evidence,
};
pub use collector::{
    CollectorError, CollectorOptions, RepoEvidenceCollector, SelectedRepositoryFile,
};
pub use declaration::{
    PROFILE_DECLARATION_SCHEMA, PROFILE_INTERVIEW_PLAN_SCHEMA, PROFILE_RECONCILIATION_SCHEMA,
    ProfileDeclaration, ProfileDeclarationCategory, ProfileDeclarationError,
    ProfileDeclarationInput, ProfileDeclarationPublicationStatus, ProfileDeclarationSourceKind,
    ProfileInterviewPlan, ProfileInterviewQuestion, ProfileInterviewQuestionKind,
    ProfileObservationSourceClass, ProfileObservationStance, ProfileObservedSignal,
    ProfileReconciliation, ProfileReconciliationItem, ProfileReconciliationStatus,
    create_profile_declaration, default_profile_interview_categories, plan_profile_interview,
    reconcile_profile_declarations, validate_profile_declaration,
};
pub use document::{
    DOCUMENT_INPUT_SCHEMA, DocumentCautions, DocumentClaim, DocumentError, DocumentEvidenceSource,
    DocumentInput, DocumentSupportingStatement, DocumentTarget, prepare_document_input,
};
pub use domain_fingerprint::{
    REPOSITORY_DOMAIN_FINGERPRINT_SCHEMA, RepositoryDomainCandidate, RepositoryDomainFingerprint,
    RepositoryDomainFingerprintError, analyze_repository_domain_fingerprint,
};
pub use git_actor::{
    GitActorEvidenceError, GitActorEvidenceOptions, GitActorIdentity, collect_git_actor_evidence,
};
pub use github::{
    GITHUB_REPOSITORY_FACTS_SCHEMA, GitHubConnectedActorActivity, GitHubFact, GitHubFactInput,
    GitHubFactKind, GitHubRepositoryFacts, GitHubRepositoryFactsError,
    GitHubRepositoryFactsSummary, GitHubRepositoryRef, create_github_repository_facts,
};
pub use github_actor::github_facts_to_actor_evidence;
pub use github_collaboration::{
    GITHUB_COLLABORATION_SUMMARY_SCHEMA, GitHubCollaborationCoverageInput,
    GitHubCollaborationCoverageSummary, GitHubCollaborationError, GitHubCollaborationMetric,
    GitHubCollaborationObservation, GitHubCollaborationSummary, GitHubRepositoryCollaborationFact,
    GitHubReviewCoverageInput, summarize_github_collaboration,
};
pub use incremental::{
    INCREMENTAL_PROFILE_PLAN_SCHEMA, IncrementalProfilePlan, InvalidatedSkill, ReusableSkill,
    plan_incremental_profile_update,
};
pub use interview_adapter::{
    PROFILE_INTERVIEW_PROMPT_SCHEMA, ProfileInterviewAdapterError, ProfileInterviewPrompt,
    profile_interview_answer_to_declaration, render_profile_interview_prompts,
};
pub use jev_incremental::{
    INCREMENTAL_JEV_PLAN_SCHEMA, IncrementalJevPlan, JEV_OBSERVATION_SCHEMA, JevCandidateAction,
    JevCandidateFingerprint, JevCandidatePlan, JevEvidenceIdentity, JevObservation,
    JevObservationClaim, JevObservationOutcome, JevRepositoryRef, plan_incremental_jev_reuse,
    plan_incremental_jev_reuse_with_freshness,
};
pub use jev_store::{
    JEV_OBSERVATION_STORE_SCHEMA, JevObservationStoreError, JevObservationStoreFile,
    load_jev_observation_store, merge_and_save_jev_observations, merge_jev_observations,
    save_jev_observation_store,
};
pub use lifecycle::{
    GitCommitFact, GitTagFact, REPOSITORY_LIFECYCLE_SCHEMA, RepositoryLifecycle,
    RepositoryLifecycleError, analyze_repository_lifecycle, collect_repository_lifecycle,
};
pub use model::{
    EvidenceRecord, LanguageStat, REPO_EVIDENCE_SCHEMA, RepoEvidenceBundle,
    RepositoryEvidenceCoverage, RepositoryIdentity, RepositoryInventoryCoverage, RepositorySummary,
    RepositorySummaryScope, TechnologySignal,
};
pub use portfolio_lifecycle::{
    PORTFOLIO_LIFECYCLE_SCHEMA, PortfolioLifecycleError, PortfolioLifecycleSummary,
    PortfolioRepositoryLifecycleFact, summarize_portfolio_lifecycle,
};

pub use product_store::{
    PERSONAL_PROFILE_DERIVED_SNAPSHOT_SCHEMA, PRODUCT_STORE_SCHEMA_VERSION,
    PersistedRepositoryConnection, PersonalProfileDerivedSnapshot, ProductDomainSnapshot,
    ProductEvidenceReceipt, ProductLanguageSnapshot, ProductPersonalActorEvidenceReceipt,
    ProductPersonalCapabilitySnapshot, ProductPersonalProfileEvidenceReceipt,
    ProductProfileIdentity, ProductRepositoryTarget, ProductStoreError, ProductTechnologySnapshot,
    REPOSITORY_CONNECTION_SCHEMA, REPOSITORY_DERIVED_SNAPSHOT_SCHEMA, RepositoryConnectionSnapshot,
    RepositoryDerivedSnapshot, SqliteProductStore,
};
pub use profile::{
    AttributionStatus, CapabilityAttribution, CapabilityProfile, ClaimStance,
    DEVELOPER_PROFILE_SCHEMA, DeveloperProfile, ProfileError, ProfileEvidenceMeta, SemanticClaim,
    build_developer_profile, build_developer_profile_with_actor_evidence,
};
pub use profile_observation::{
    ProfileObservationAdapterError, build_profile_observations,
    developer_profile_to_profile_observations, development_tendencies_to_profile_observations,
};
pub use profile_presentation::{
    PROFILE_PRESENTATION_PAYLOAD_SCHEMA, ProfilePresentationError, ProfilePresentationPayload,
    prepare_profile_presentation_payload,
};
pub use profile_publication::{
    PROFILE_PUBLICATION_CONTEXT_SCHEMA, ProfilePublicationContext, ProfilePublicationContextError,
    PublishedProfileDeclaration, prepare_profile_publication_context,
};
pub use profile_statistics::{
    PROFILE_STATISTICS_SCHEMA, ProfileStatistics, ProfileStatisticsCollaborationMetric,
    ProfileStatisticsCollaborationSection, ProfileStatisticsDomainMetric,
    ProfileStatisticsDomainSection, ProfileStatisticsError, ProfileStatisticsLifecycleMetric,
    ProfileStatisticsLifecycleSection, ProfileStatisticsTechnologySection,
    ProfileStatisticsTendencyMetric, ProfileStatisticsTendencySection, build_profile_statistics,
};
pub use profile_surface_composition::{
    PROFILE_SURFACE_COMPOSITION_SCHEMA, PROFILE_SURFACES, ProfileSurfaceComposition,
    ProfileSurfaceCompositionError, ProfileSurfaceSection, compose_profile_surface,
};
pub use profile_widget_data::{
    PROFILE_WIDGET_DATA_SCHEMA, ProfileWidgetData, ProfileWidgetDataError, ProfileWidgetDataItem,
    materialize_profile_widget_data,
};
pub use profile_widget_plan::{
    PROFILE_WIDGET_PLAN_SCHEMA, ProfileWidget, ProfileWidgetPlan, ProfileWidgetPlanError,
    ProfileWidgetSource, plan_profile_widgets,
};
pub use repository_audit::{
    HydratedAuditBlob, REPOSITORY_AUDIT_SCHEMA, RemoteAuditRepositorySpec, RepositoryAuditAction,
    RepositoryAuditCacheManager, RepositoryAuditDelta, RepositoryAuditEntry, RepositoryAuditError,
    RepositoryAuditSnapshot, diff_repository_audit_snapshots,
};
pub use repository_audit_store::{
    REPOSITORY_AUDIT_HISTORY_SCHEMA, REPOSITORY_AUDIT_RECEIPT_SCHEMA, RepositoryAuditHistoryFile,
    RepositoryAuditReceipt, RepositoryAuditStoreError, load_repository_audit_history,
    merge_and_save_repository_audit_snapshot, save_repository_audit_history,
};
pub use repository_workspace::{
    ManagedRepositoryWorkspace, REPOSITORY_WORKSPACE_SCHEMA, RemoteRepositorySpec,
    RepositoryWorkspaceAction, RepositoryWorkspaceError, RepositoryWorkspaceManager,
};
pub use technology_evolution::{
    TECHNOLOGY_EVOLUTION_SCHEMA, TechnologyEvolution, TechnologyEvolutionError,
    TechnologyEvolutionLanguage, TechnologyEvolutionOptions, TechnologyEvolutionSampling,
    TechnologyEvolutionSnapshot, collect_technology_evolution,
};
pub use technology_footprint::{
    LanguageFootprintMetric, TECHNOLOGY_FOOTPRINT_SCHEMA, TechnologyFootprint,
    TechnologyFootprintCoverage, TechnologyFootprintError, TechnologyFootprintMetric,
    analyze_technology_footprint,
};
pub use tendencies::{
    DEVELOPMENT_TENDENCIES_SCHEMA, DevelopmentTendencies, DevelopmentTendency,
    DevelopmentTendencyError, analyze_development_tendencies,
};
