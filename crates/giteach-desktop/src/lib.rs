mod commands;

use tauri::Manager;

pub use commands::{
    DESKTOP_RUNTIME_SCHEMA, DesktopDocumentClaimView, DesktopDocumentInputView,
    LOCAL_REPOSITORY_ANALYSIS_SCHEMA, LocalRepositoryAnalysis, PERSONAL_PROFILE_INSPECTION_SCHEMA,
    PROFILE_INTERVIEW_SESSION_SCHEMA, PROFILE_OUTPUT_BUNDLE_SCHEMA, PROFILE_PUBLICATION_ENABLED,
    PersonalActorEvidenceView, PersonalCapabilityView, PersonalProfileEvidenceView,
    PersonalProfileInspection, PersonalProfileRequest, PrivateProfileDeclarationRequest,
    ProfileIdentityInput, ProfileInterviewAnswerRequest, ProfileInterviewSession,
    ProfileInterviewSessionRequest, ProfileOutputBundle, ProfileOutputRequest,
    REPOSITORY_ANALYSIS_SCHEMA, REPOSITORY_INSPECTION_RESULT_SCHEMA, REPOSITORY_INSPECTION_SCHEMA,
    RepositoryAnalysis, RepositoryInspectionResult, RepositoryInspectionView, RepositoryTarget,
    RuntimeInfo,
};

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_data_root = app.path().app_local_data_dir()?;
            let audit_cache_root = app_data_root.join("repository-audit-cache");
            let product_store_path = app_data_root.join("giteach-product.sqlite3");
            app.manage(commands::DesktopState::new(
                audit_cache_root,
                product_store_path,
            ));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::runtime_info,
            commands::list_repository_connections,
            commands::load_repository_snapshot,
            commands::analyze_local_repository,
            commands::analyze_repository,
            commands::inspect_repository,
            commands::inspect_profile,
            commands::load_profile_snapshot,
            commands::prepare_profile_interview,
            commands::answer_profile_interview,
            commands::save_private_profile_declaration,
            commands::load_private_profile_declarations,
            commands::generate_profile_outputs
        ])
        .run(tauri::generate_context!())
        .expect("failed to run GitTeach desktop shell");
}
