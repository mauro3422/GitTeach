use std::{
    collections::BTreeSet,
    fs,
    path::{Path, PathBuf},
};

use rusqlite::{Connection, OptionalExtension, params};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use thiserror::Error;

use crate::{
    PROFILE_DECLARATION_SCHEMA, ProfileDeclaration, ProfileDeclarationCategory,
    ProfileDeclarationPublicationStatus, ProfileDeclarationSourceKind, RepositoryAuditReceipt,
    validate_profile_declaration,
};

pub const PRODUCT_STORE_SCHEMA_VERSION: i64 = 4;
pub const REPOSITORY_CONNECTION_SCHEMA: &str = "giteach-repository-connection-v1";
pub const REPOSITORY_DERIVED_SNAPSHOT_SCHEMA: &str = "giteach-repository-derived-snapshot-v1";
pub const PERSONAL_PROFILE_DERIVED_SNAPSHOT_SCHEMA: &str =
    "giteach-personal-profile-derived-snapshot-v1";
const MAX_DERIVED_EVIDENCE: usize = 48;
const MAX_DERIVED_LANGUAGES: usize = 64;
const MAX_DERIVED_TECHNOLOGIES: usize = 256;
const MAX_DERIVED_DOMAINS: usize = 32;
const MAX_PROFILE_TARGETS: usize = 32;
const MAX_PROFILE_CAPABILITIES: usize = 24;
const MAX_PROFILE_EVIDENCE: usize = 192;
const MAX_PROFILE_ACTOR_EVIDENCE: usize = 96;
const MAX_PRIVATE_PROFILE_DECLARATIONS: usize = 64;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind")]
pub enum ProductRepositoryTarget {
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

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RepositoryConnectionSnapshot {
    pub target: ProductRepositoryTarget,
    pub repository_name: String,
    pub branch: Option<String>,
    pub head_commit: Option<String>,
    pub head_commit_time: Option<String>,
    pub acquisition_kind: String,
    pub audit_action: Option<String>,
    pub inventory_coverage: String,
    pub summary_scope: String,
    pub known_path_count: u64,
    pub files_scanned: u64,
    pub evidence_records: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PersistedRepositoryConnection {
    pub schema: &'static str,
    pub id: String,
    pub target: ProductRepositoryTarget,
    pub repository_name: String,
    pub branch: Option<String>,
    pub head_commit: Option<String>,
    pub head_commit_time: Option<String>,
    pub acquisition_kind: String,
    pub audit_action: Option<String>,
    pub inventory_coverage: String,
    pub summary_scope: String,
    pub known_path_count: u64,
    pub files_scanned: u64,
    pub evidence_records: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductLanguageSnapshot {
    pub language: String,
    pub files: u64,
    pub bytes: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductTechnologySnapshot {
    pub name: String,
    pub source_path: String,
    pub source_kind: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductEvidenceReceipt {
    pub id: String,
    pub path: String,
    pub kind: String,
    pub bytes: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductDomainSnapshot {
    pub key: String,
    pub label: String,
    pub source_kinds: Vec<String>,
    pub evidence_refs: Vec<String>,
    pub technologies: Vec<String>,
    pub languages: Vec<String>,
    pub rule_based: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryDerivedSnapshot {
    pub schema: String,
    pub repository_name: String,
    pub branch: Option<String>,
    pub head_commit: Option<String>,
    pub acquisition_kind: String,
    pub audit_action: Option<String>,
    pub inventory_coverage: String,
    pub summary_scope: String,
    pub known_path_count: u64,
    pub files_scanned: u64,
    pub bytes_scanned: u64,
    pub evidence_records: u64,
    pub manifests: u64,
    pub docs: u64,
    pub tests: u64,
    pub tooling_files: u64,
    pub source_files: u64,
    pub languages: Vec<ProductLanguageSnapshot>,
    pub technologies: Vec<ProductTechnologySnapshot>,
    pub available_evidence_count: u64,
    pub evidence: Vec<ProductEvidenceReceipt>,
    pub project_domains: Vec<ProductDomainSnapshot>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProductProfileIdentity {
    pub actor_key: String,
    pub names: Vec<String>,
    pub emails: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductPersonalProfileEvidenceReceipt {
    pub id: String,
    pub repository: String,
    pub path: String,
    pub kind: String,
    pub bytes: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductPersonalActorEvidenceReceipt {
    pub id: String,
    pub relation: String,
    pub repository: String,
    pub source_kind: String,
    pub source_ref: String,
    pub observed_at: String,
    pub implementation_origin: String,
    pub target_evidence_refs: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductPersonalCapabilitySnapshot {
    pub key: String,
    pub label: String,
    pub repository_count: u64,
    pub repositories: Vec<String>,
    pub attribution_status: String,
    pub actor_evidence_refs: Vec<String>,
    pub actor_relations: Vec<String>,
    pub implementation_origins: Vec<String>,
    pub support_evidence_refs: Vec<String>,
    pub evidence_diversity: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PersonalProfileDerivedSnapshot {
    pub schema: String,
    pub scope: String,
    pub subject_actor_key: String,
    pub analyzed_repository_count: u64,
    pub available_personal_capability_count: u64,
    pub shown_personal_capability_count: u64,
    pub repository_only_claims_omitted: u64,
    pub unresolved_attribution_claims_omitted: u64,
    pub available_evidence_count: u64,
    pub shown_evidence_count: u64,
    pub available_actor_evidence_count: u64,
    pub shown_actor_evidence_count: u64,
    pub truncated: bool,
    pub capabilities: Vec<ProductPersonalCapabilitySnapshot>,
    pub evidence: Vec<ProductPersonalProfileEvidenceReceipt>,
    pub actor_evidence: Vec<ProductPersonalActorEvidenceReceipt>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct PersistedPrivateDeclarationPayload {
    schema: String,
    id: String,
    actor_key: String,
    category: ProfileDeclarationCategory,
    key: String,
    value: String,
    source_kind: ProfileDeclarationSourceKind,
    source_ref: String,
    declared_at: String,
    repositories: Vec<String>,
}

impl PersistedPrivateDeclarationPayload {
    fn from_declaration(declaration: &ProfileDeclaration) -> Self {
        Self {
            schema: declaration.schema.clone(),
            id: declaration.id.clone(),
            actor_key: declaration.actor_key.clone(),
            category: declaration.category.clone(),
            key: declaration.key.clone(),
            value: declaration.value.clone(),
            source_kind: declaration.source_kind.clone(),
            source_ref: declaration.source_ref.clone(),
            declared_at: declaration.declared_at.clone(),
            repositories: declaration.repositories.clone(),
        }
    }

    fn into_private_declaration(self) -> ProfileDeclaration {
        ProfileDeclaration {
            schema: self.schema,
            id: self.id,
            actor_key: self.actor_key,
            category: self.category,
            key: self.key,
            value: self.value,
            source_kind: self.source_kind,
            source_ref: self.source_ref,
            declared_at: self.declared_at,
            authorization_ref: None,
            publication_status: ProfileDeclarationPublicationStatus::Private,
            source_hash: None,
            repositories: self.repositories,
        }
    }
}

#[derive(Debug, Error)]
pub enum ProductStoreError {
    #[error("failed to prepare product store directory: {0}")]
    Directory(String),
    #[error("failed to open product store: {0}")]
    Open(String),
    #[error("product store schema version {0} is unsupported")]
    UnsupportedSchema(i64),
    #[error("repository connection is invalid: {0}")]
    InvalidConnection(&'static str),
    #[error("repository connection count is outside SQLite integer range")]
    IntegerRange,
    #[error("repository derived snapshot is invalid: {0}")]
    InvalidDerivedSnapshot(&'static str),
    #[error("personal profile derived snapshot is invalid: {0}")]
    InvalidPersonalProfileSnapshot(&'static str),
    #[error("private profile declaration is invalid: {0}")]
    InvalidPrivateDeclaration(&'static str),
    #[error("derived snapshot serialization failed: {0}")]
    Serialization(String),
    #[error("product store operation failed: {0}")]
    Database(String),
}

#[derive(Debug, Clone)]
pub struct SqliteProductStore {
    path: PathBuf,
}

impl SqliteProductStore {
    pub fn new(path: impl Into<PathBuf>) -> Self {
        Self { path: path.into() }
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    pub fn upsert_repository_connection(
        &self,
        snapshot: &RepositoryConnectionSnapshot,
        audit_receipt: Option<&RepositoryAuditReceipt>,
    ) -> Result<PersistedRepositoryConnection, ProductStoreError> {
        validate_snapshot(snapshot, audit_receipt)?;
        let id = repository_connection_id(&snapshot.target)?;
        let mut connection = self.open_connection()?;
        let transaction = connection.transaction().map_err(database_error)?;
        let target_columns = target_columns(&snapshot.target);

        transaction
            .execute(
                "INSERT INTO repository_connections (
                    id, kind, local_path, remote_owner, remote_name, remote_url,
                    repository_name, branch, head_commit, head_commit_time,
                    acquisition_kind, audit_action, inventory_coverage, summary_scope,
                    known_path_count, files_scanned, evidence_records
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)
                 ON CONFLICT(id) DO UPDATE SET
                    kind = excluded.kind,
                    local_path = excluded.local_path,
                    remote_owner = excluded.remote_owner,
                    remote_name = excluded.remote_name,
                    remote_url = excluded.remote_url,
                    repository_name = excluded.repository_name,
                    branch = excluded.branch,
                    head_commit = excluded.head_commit,
                    head_commit_time = excluded.head_commit_time,
                    acquisition_kind = excluded.acquisition_kind,
                    audit_action = excluded.audit_action,
                    inventory_coverage = excluded.inventory_coverage,
                    summary_scope = excluded.summary_scope,
                    known_path_count = excluded.known_path_count,
                    files_scanned = excluded.files_scanned,
                    evidence_records = excluded.evidence_records",
                params![
                    id,
                    target_columns.kind,
                    target_columns.local_path,
                    target_columns.remote_owner,
                    target_columns.remote_name,
                    target_columns.remote_url,
                    snapshot.repository_name,
                    snapshot.branch,
                    snapshot.head_commit,
                    snapshot.head_commit_time,
                    snapshot.acquisition_kind,
                    snapshot.audit_action,
                    snapshot.inventory_coverage,
                    snapshot.summary_scope,
                    sqlite_integer(snapshot.known_path_count)?,
                    sqlite_integer(snapshot.files_scanned)?,
                    sqlite_integer(snapshot.evidence_records)?,
                ],
            )
            .map_err(database_error)?;

        transaction
            .execute(
                "DELETE FROM repository_derived_snapshots
                 WHERE connection_id = ?1 AND source_head_commit IS NOT ?2",
                params![id, snapshot.head_commit],
            )
            .map_err(database_error)?;

        if let Some(receipt) = audit_receipt {
            transaction
                .execute(
                    "INSERT INTO repository_audit_receipts (
                        connection_id, head_commit, head_commit_time, branch, tree_object_id
                     ) VALUES (?1, ?2, ?3, ?4, ?5)
                     ON CONFLICT(connection_id, head_commit) DO UPDATE SET
                        head_commit_time = excluded.head_commit_time,
                        branch = excluded.branch,
                        tree_object_id = excluded.tree_object_id",
                    params![
                        id,
                        receipt.head_commit,
                        receipt.head_commit_time,
                        receipt.branch,
                        receipt.tree_object_id
                    ],
                )
                .map_err(database_error)?;
            transaction
                .execute(
                    "DELETE FROM repository_audit_entries WHERE connection_id = ?1 AND head_commit = ?2",
                    params![id, receipt.head_commit],
                )
                .map_err(database_error)?;
            for entry in &receipt.entries {
                transaction
                    .execute(
                        "INSERT INTO repository_audit_entries (
                            connection_id, head_commit, path, git_object_id, kind, language
                         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                        params![
                            id,
                            receipt.head_commit,
                            entry.path,
                            entry.git_object_id,
                            entry.kind,
                            entry.language,
                        ],
                    )
                    .map_err(database_error)?;
            }
        }

        transaction.commit().map_err(database_error)?;
        self.repository_connection(&id)?
            .ok_or(ProductStoreError::Database(
                "persisted repository connection disappeared".into(),
            ))
    }

    pub fn list_repository_connections(
        &self,
    ) -> Result<Vec<PersistedRepositoryConnection>, ProductStoreError> {
        let connection = self.open_connection()?;
        let mut statement = connection
            .prepare(
                "SELECT id, kind, local_path, remote_owner, remote_name, remote_url,
                        repository_name, branch, head_commit, head_commit_time,
                        acquisition_kind, audit_action, inventory_coverage, summary_scope,
                        known_path_count, files_scanned, evidence_records
                 FROM repository_connections
                 ORDER BY repository_name COLLATE NOCASE, id",
            )
            .map_err(database_error)?;
        let rows = statement
            .query_map([], connection_from_row)
            .map_err(database_error)?;
        rows.collect::<Result<Vec<_>, _>>().map_err(database_error)
    }

    pub fn repository_connection(
        &self,
        id: &str,
    ) -> Result<Option<PersistedRepositoryConnection>, ProductStoreError> {
        let connection = self.open_connection()?;
        connection
            .query_row(
                "SELECT id, kind, local_path, remote_owner, remote_name, remote_url,
                        repository_name, branch, head_commit, head_commit_time,
                        acquisition_kind, audit_action, inventory_coverage, summary_scope,
                        known_path_count, files_scanned, evidence_records
                 FROM repository_connections WHERE id = ?1",
                [id],
                connection_from_row,
            )
            .optional()
            .map_err(database_error)
    }

    pub fn upsert_repository_derived_snapshot(
        &self,
        target: &ProductRepositoryTarget,
        snapshot: &RepositoryDerivedSnapshot,
    ) -> Result<(), ProductStoreError> {
        let connection_id = repository_connection_id(target)?;
        let persisted_connection = self.repository_connection(&connection_id)?.ok_or(
            ProductStoreError::InvalidDerivedSnapshot(
                "repository connection must exist before derived state is persisted",
            ),
        )?;
        validate_derived_snapshot(snapshot, &persisted_connection)?;
        let payload = serde_json::to_string(snapshot)
            .map_err(|error| ProductStoreError::Serialization(error.to_string()))?;
        let connection = self.open_connection()?;
        connection
            .execute(
                "INSERT INTO repository_derived_snapshots (
                    connection_id, payload_schema, source_head_commit, payload_json
                 ) VALUES (?1, ?2, ?3, ?4)
                 ON CONFLICT(connection_id) DO UPDATE SET
                    payload_schema = excluded.payload_schema,
                    source_head_commit = excluded.source_head_commit,
                    payload_json = excluded.payload_json",
                params![
                    connection_id,
                    REPOSITORY_DERIVED_SNAPSHOT_SCHEMA,
                    snapshot.head_commit,
                    payload
                ],
            )
            .map_err(database_error)?;
        Ok(())
    }

    pub fn repository_derived_snapshot(
        &self,
        connection_id: &str,
    ) -> Result<Option<RepositoryDerivedSnapshot>, ProductStoreError> {
        let persisted_connection = match self.repository_connection(connection_id)? {
            Some(connection) => connection,
            None => return Ok(None),
        };
        let connection = self.open_connection()?;
        let row = connection
            .query_row(
                "SELECT payload_schema, source_head_commit, payload_json
                 FROM repository_derived_snapshots WHERE connection_id = ?1",
                [connection_id],
                |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, Option<String>>(1)?,
                        row.get::<_, String>(2)?,
                    ))
                },
            )
            .optional()
            .map_err(database_error)?;
        let Some((payload_schema, source_head_commit, payload_json)) = row else {
            return Ok(None);
        };
        if payload_schema != REPOSITORY_DERIVED_SNAPSHOT_SCHEMA
            || source_head_commit != persisted_connection.head_commit
        {
            return Ok(None);
        }
        let snapshot: RepositoryDerivedSnapshot = serde_json::from_str(&payload_json)
            .map_err(|error| ProductStoreError::Serialization(error.to_string()))?;
        validate_derived_snapshot(&snapshot, &persisted_connection)?;
        Ok(Some(snapshot))
    }

    pub fn upsert_personal_profile_derived_snapshot(
        &self,
        identity: &ProductProfileIdentity,
        targets: &[ProductRepositoryTarget],
        snapshot: &PersonalProfileDerivedSnapshot,
    ) -> Result<(), ProductStoreError> {
        let key = personal_profile_snapshot_key(identity, targets)?;
        validate_personal_profile_snapshot(snapshot, identity, targets.len())?;
        let payload = serde_json::to_string(snapshot)
            .map_err(|error| ProductStoreError::Serialization(error.to_string()))?;
        let connection = self.open_connection()?;
        connection
            .execute(
                "INSERT INTO personal_profile_derived_snapshots (
                    id, actor_key, actor_identity_hash, repository_set_hash, payload_schema, payload_json
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
                 ON CONFLICT(id) DO UPDATE SET
                    actor_key = excluded.actor_key,
                    actor_identity_hash = excluded.actor_identity_hash,
                    repository_set_hash = excluded.repository_set_hash,
                    payload_schema = excluded.payload_schema,
                    payload_json = excluded.payload_json",
                params![
                    key.id,
                    key.actor_key,
                    key.actor_identity_hash,
                    key.repository_set_hash,
                    PERSONAL_PROFILE_DERIVED_SNAPSHOT_SCHEMA,
                    payload,
                ],
            )
            .map_err(database_error)?;
        Ok(())
    }

    pub fn personal_profile_derived_snapshot(
        &self,
        identity: &ProductProfileIdentity,
        targets: &[ProductRepositoryTarget],
    ) -> Result<Option<PersonalProfileDerivedSnapshot>, ProductStoreError> {
        let key = personal_profile_snapshot_key(identity, targets)?;
        let connection = self.open_connection()?;
        let row = connection
            .query_row(
                "SELECT actor_key, actor_identity_hash, repository_set_hash, payload_schema, payload_json
                 FROM personal_profile_derived_snapshots WHERE id = ?1",
                [&key.id],
                |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, String>(2)?,
                        row.get::<_, String>(3)?,
                        row.get::<_, String>(4)?,
                    ))
                },
            )
            .optional()
            .map_err(database_error)?;
        let Some((
            actor_key,
            actor_identity_hash,
            repository_set_hash,
            payload_schema,
            payload_json,
        )) = row
        else {
            return Ok(None);
        };
        if actor_key != key.actor_key
            || actor_identity_hash != key.actor_identity_hash
            || repository_set_hash != key.repository_set_hash
            || payload_schema != PERSONAL_PROFILE_DERIVED_SNAPSHOT_SCHEMA
        {
            return Ok(None);
        }
        let snapshot: PersonalProfileDerivedSnapshot = serde_json::from_str(&payload_json)
            .map_err(|error| ProductStoreError::Serialization(error.to_string()))?;
        validate_personal_profile_snapshot(&snapshot, identity, targets.len())?;
        Ok(Some(snapshot))
    }

    pub fn upsert_private_profile_declaration(
        &self,
        identity: &ProductProfileIdentity,
        targets: &[ProductRepositoryTarget],
        declaration: &ProfileDeclaration,
    ) -> Result<ProfileDeclaration, ProductStoreError> {
        let profile_key = personal_profile_snapshot_key(identity, targets)?;
        if self
            .personal_profile_derived_snapshot(identity, targets)?
            .is_none()
        {
            return Err(ProductStoreError::InvalidPrivateDeclaration(
                "personal profile snapshot must exist before private declarations are persisted",
            ));
        }
        let declaration =
            validate_persisted_private_declaration(declaration.clone(), &profile_key.actor_key)?;
        let payload = PersistedPrivateDeclarationPayload::from_declaration(&declaration);
        let payload_json = serde_json::to_string(&payload)
            .map_err(|error| ProductStoreError::Serialization(error.to_string()))?;
        let mut connection = self.open_connection()?;
        let transaction = connection.transaction().map_err(database_error)?;
        let exists: i64 = transaction
            .query_row(
                "SELECT COUNT(*) FROM profile_private_declarations WHERE profile_id = ?1 AND declaration_id = ?2",
                params![profile_key.id, declaration.id],
                |row| row.get(0),
            )
            .map_err(database_error)?;
        if exists == 0 {
            let count: i64 = transaction
                .query_row(
                    "SELECT COUNT(*) FROM profile_private_declarations WHERE profile_id = ?1",
                    [&profile_key.id],
                    |row| row.get(0),
                )
                .map_err(database_error)?;
            if usize::try_from(count).map_err(|_| ProductStoreError::IntegerRange)?
                >= MAX_PRIVATE_PROFILE_DECLARATIONS
            {
                return Err(ProductStoreError::InvalidPrivateDeclaration(
                    "private declaration limit reached for this profile",
                ));
            }
        }
        transaction
            .execute(
                "INSERT INTO profile_private_declarations (
                    profile_id, declaration_id, actor_key, payload_schema, payload_json
                 ) VALUES (?1, ?2, ?3, ?4, ?5)
                 ON CONFLICT(profile_id, declaration_id) DO UPDATE SET
                    actor_key = excluded.actor_key,
                    payload_schema = excluded.payload_schema,
                    payload_json = excluded.payload_json",
                params![
                    profile_key.id,
                    declaration.id,
                    profile_key.actor_key,
                    PROFILE_DECLARATION_SCHEMA,
                    payload_json,
                ],
            )
            .map_err(database_error)?;
        transaction.commit().map_err(database_error)?;
        Ok(declaration)
    }

    pub fn private_profile_declarations(
        &self,
        identity: &ProductProfileIdentity,
        targets: &[ProductRepositoryTarget],
    ) -> Result<Vec<ProfileDeclaration>, ProductStoreError> {
        let profile_key = personal_profile_snapshot_key(identity, targets)?;
        if self
            .personal_profile_derived_snapshot(identity, targets)?
            .is_none()
        {
            return Ok(Vec::new());
        }
        let connection = self.open_connection()?;
        let mut statement = connection
            .prepare(
                "SELECT actor_key, payload_schema, payload_json
                 FROM profile_private_declarations
                 WHERE profile_id = ?1
                 ORDER BY declaration_id",
            )
            .map_err(database_error)?;
        let rows = statement
            .query_map([&profile_key.id], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                ))
            })
            .map_err(database_error)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(database_error)?;
        if rows.len() > MAX_PRIVATE_PROFILE_DECLARATIONS {
            return Err(ProductStoreError::InvalidPrivateDeclaration(
                "private declaration count exceeds the bounded profile limit",
            ));
        }
        rows.into_iter()
            .map(|(actor_key, payload_schema, payload_json)| {
                if actor_key != profile_key.actor_key
                    || payload_schema != PROFILE_DECLARATION_SCHEMA
                {
                    return Err(ProductStoreError::InvalidPrivateDeclaration(
                        "stored private declaration does not match the active profile",
                    ));
                }
                let payload: PersistedPrivateDeclarationPayload =
                    serde_json::from_str(&payload_json)
                        .map_err(|error| ProductStoreError::Serialization(error.to_string()))?;
                validate_persisted_private_declaration(
                    payload.into_private_declaration(),
                    &profile_key.actor_key,
                )
            })
            .collect()
    }

    fn open_connection(&self) -> Result<Connection, ProductStoreError> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)
                .map_err(|error| ProductStoreError::Directory(error.to_string()))?;
        }
        let connection = Connection::open(&self.path)
            .map_err(|error| ProductStoreError::Open(error.to_string()))?;
        connection
            .execute_batch("PRAGMA foreign_keys = ON;")
            .map_err(database_error)?;
        let version: i64 = connection
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .map_err(database_error)?;
        match version {
            0 => {
                migrate_v1(&connection)?;
                migrate_v2(&connection)?;
                migrate_v3(&connection)?;
                migrate_v4(&connection)?;
            }
            1 => {
                migrate_v2(&connection)?;
                migrate_v3(&connection)?;
                migrate_v4(&connection)?;
            }
            2 => {
                migrate_v3(&connection)?;
                migrate_v4(&connection)?;
            }
            3 => migrate_v4(&connection)?,
            PRODUCT_STORE_SCHEMA_VERSION => {}
            unsupported => return Err(ProductStoreError::UnsupportedSchema(unsupported)),
        }
        Ok(connection)
    }
}

struct TargetColumns<'a> {
    kind: &'static str,
    local_path: Option<&'a str>,
    remote_owner: Option<&'a str>,
    remote_name: Option<&'a str>,
    remote_url: Option<&'a str>,
}

fn target_columns(target: &ProductRepositoryTarget) -> TargetColumns<'_> {
    match target {
        ProductRepositoryTarget::Local { path } => TargetColumns {
            kind: "local",
            local_path: Some(path),
            remote_owner: None,
            remote_name: None,
            remote_url: None,
        },
        ProductRepositoryTarget::Remote {
            owner,
            name,
            remote_url,
        } => TargetColumns {
            kind: "remote",
            local_path: None,
            remote_owner: Some(owner),
            remote_name: Some(name),
            remote_url: Some(remote_url),
        },
    }
}

fn migrate_v1(connection: &Connection) -> Result<(), ProductStoreError> {
    connection
        .execute_batch(
            "BEGIN IMMEDIATE;
             CREATE TABLE repository_connections (
                id TEXT PRIMARY KEY NOT NULL,
                kind TEXT NOT NULL CHECK (kind IN ('local', 'remote')),
                local_path TEXT,
                remote_owner TEXT,
                remote_name TEXT,
                remote_url TEXT,
                repository_name TEXT NOT NULL,
                branch TEXT,
                head_commit TEXT,
                head_commit_time TEXT,
                acquisition_kind TEXT NOT NULL,
                audit_action TEXT,
                inventory_coverage TEXT NOT NULL,
                summary_scope TEXT NOT NULL,
                known_path_count INTEGER NOT NULL CHECK (known_path_count >= 0),
                files_scanned INTEGER NOT NULL CHECK (files_scanned >= 0),
                evidence_records INTEGER NOT NULL CHECK (evidence_records >= 0),
                CHECK (
                    (kind = 'local' AND local_path IS NOT NULL AND remote_owner IS NULL AND remote_name IS NULL AND remote_url IS NULL)
                    OR
                    (kind = 'remote' AND local_path IS NULL AND remote_owner IS NOT NULL AND remote_name IS NOT NULL AND remote_url IS NOT NULL)
                )
             );
             CREATE TABLE repository_audit_receipts (
                connection_id TEXT NOT NULL,
                head_commit TEXT NOT NULL,
                head_commit_time TEXT NOT NULL,
                branch TEXT NOT NULL,
                tree_object_id TEXT NOT NULL,
                PRIMARY KEY (connection_id, head_commit),
                FOREIGN KEY (connection_id) REFERENCES repository_connections(id) ON DELETE CASCADE
             );
             CREATE TABLE repository_audit_entries (
                connection_id TEXT NOT NULL,
                head_commit TEXT NOT NULL,
                path TEXT NOT NULL,
                git_object_id TEXT NOT NULL,
                kind TEXT NOT NULL,
                language TEXT,
                PRIMARY KEY (connection_id, head_commit, path),
                FOREIGN KEY (connection_id, head_commit)
                    REFERENCES repository_audit_receipts(connection_id, head_commit) ON DELETE CASCADE
             );
             PRAGMA user_version = 1;
             COMMIT;",
        )
        .map_err(database_error)
}

fn migrate_v2(connection: &Connection) -> Result<(), ProductStoreError> {
    connection
        .execute_batch(
            "BEGIN IMMEDIATE;
             CREATE TABLE IF NOT EXISTS repository_derived_snapshots (
                connection_id TEXT PRIMARY KEY NOT NULL,
                payload_schema TEXT NOT NULL,
                source_head_commit TEXT,
                payload_json TEXT NOT NULL,
                FOREIGN KEY (connection_id) REFERENCES repository_connections(id) ON DELETE CASCADE
             );
             PRAGMA user_version = 2;
             COMMIT;",
        )
        .map_err(database_error)
}

fn migrate_v3(connection: &Connection) -> Result<(), ProductStoreError> {
    connection
        .execute_batch(
            "BEGIN IMMEDIATE;
             CREATE TABLE IF NOT EXISTS personal_profile_derived_snapshots (
                id TEXT PRIMARY KEY NOT NULL,
                actor_key TEXT NOT NULL,
                actor_identity_hash TEXT NOT NULL,
                repository_set_hash TEXT NOT NULL,
                payload_schema TEXT NOT NULL,
                payload_json TEXT NOT NULL
             );
             PRAGMA user_version = 3;
             COMMIT;",
        )
        .map_err(database_error)
}

fn migrate_v4(connection: &Connection) -> Result<(), ProductStoreError> {
    connection
        .execute_batch(
            "BEGIN IMMEDIATE;
             CREATE TABLE IF NOT EXISTS profile_private_declarations (
                profile_id TEXT NOT NULL,
                declaration_id TEXT NOT NULL,
                actor_key TEXT NOT NULL,
                payload_schema TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                PRIMARY KEY (profile_id, declaration_id),
                FOREIGN KEY (profile_id) REFERENCES personal_profile_derived_snapshots(id) ON DELETE CASCADE
             );
             PRAGMA user_version = 4;
             COMMIT;",
        )
        .map_err(database_error)
}

fn validate_snapshot(
    snapshot: &RepositoryConnectionSnapshot,
    audit_receipt: Option<&RepositoryAuditReceipt>,
) -> Result<(), ProductStoreError> {
    if snapshot.repository_name.trim().is_empty() {
        return Err(ProductStoreError::InvalidConnection(
            "repository name is required",
        ));
    }
    if snapshot.acquisition_kind.trim().is_empty()
        || snapshot.inventory_coverage.trim().is_empty()
        || snapshot.summary_scope.trim().is_empty()
    {
        return Err(ProductStoreError::InvalidConnection(
            "refresh metadata is incomplete",
        ));
    }
    match &snapshot.target {
        ProductRepositoryTarget::Local { path } => {
            if path.trim().is_empty() {
                return Err(ProductStoreError::InvalidConnection(
                    "local path is required",
                ));
            }
            if audit_receipt.is_some() {
                return Err(ProductStoreError::InvalidConnection(
                    "local targets cannot carry remote audit receipts",
                ));
            }
        }
        ProductRepositoryTarget::Remote {
            owner,
            name,
            remote_url,
        } => {
            if owner.trim().is_empty() || name.trim().is_empty() || remote_url.trim().is_empty() {
                return Err(ProductStoreError::InvalidConnection(
                    "remote owner, name, and URL are required",
                ));
            }
            if http_remote_has_credentials(remote_url) {
                return Err(ProductStoreError::InvalidConnection(
                    "remote URL must not contain embedded HTTP credentials",
                ));
            }
            let receipt = audit_receipt.ok_or(ProductStoreError::InvalidConnection(
                "remote targets require an audit receipt",
            ))?;
            if receipt.owner != owner.trim()
                || receipt.repository != name.trim()
                || receipt.remote_url != remote_url.trim()
            {
                return Err(ProductStoreError::InvalidConnection(
                    "audit receipt does not match remote target",
                ));
            }
        }
    }
    Ok(())
}

fn validate_derived_snapshot(
    snapshot: &RepositoryDerivedSnapshot,
    connection: &PersistedRepositoryConnection,
) -> Result<(), ProductStoreError> {
    if snapshot.schema != REPOSITORY_DERIVED_SNAPSHOT_SCHEMA {
        return Err(ProductStoreError::InvalidDerivedSnapshot(
            "snapshot schema is unsupported",
        ));
    }
    if snapshot.repository_name != connection.repository_name
        || snapshot.branch != connection.branch
        || snapshot.head_commit != connection.head_commit
        || snapshot.acquisition_kind != connection.acquisition_kind
        || snapshot.audit_action != connection.audit_action
        || snapshot.inventory_coverage != connection.inventory_coverage
        || snapshot.summary_scope != connection.summary_scope
        || snapshot.known_path_count != connection.known_path_count
        || snapshot.files_scanned != connection.files_scanned
        || snapshot.evidence_records != connection.evidence_records
    {
        return Err(ProductStoreError::InvalidDerivedSnapshot(
            "snapshot identity or refresh metadata does not match the repository connection",
        ));
    }
    if snapshot.repository_name.trim().is_empty()
        || snapshot.acquisition_kind.trim().is_empty()
        || snapshot.inventory_coverage.trim().is_empty()
        || snapshot.summary_scope.trim().is_empty()
        || snapshot.files_scanned > snapshot.known_path_count
    {
        return Err(ProductStoreError::InvalidDerivedSnapshot(
            "snapshot analysis metadata is incomplete or inconsistent",
        ));
    }
    if snapshot.languages.len() > MAX_DERIVED_LANGUAGES
        || snapshot.technologies.len() > MAX_DERIVED_TECHNOLOGIES
        || snapshot.evidence.len() > MAX_DERIVED_EVIDENCE
        || snapshot.project_domains.len() > MAX_DERIVED_DOMAINS
        || snapshot.evidence.len() as u64 > snapshot.available_evidence_count
    {
        return Err(ProductStoreError::InvalidDerivedSnapshot(
            "snapshot exceeds a bounded derived-state limit",
        ));
    }
    if snapshot
        .languages
        .iter()
        .any(|item| item.language.trim().is_empty())
        || snapshot.technologies.iter().any(|item| {
            item.name.trim().is_empty()
                || item.source_path.trim().is_empty()
                || item.source_kind.trim().is_empty()
        })
    {
        return Err(ProductStoreError::InvalidDerivedSnapshot(
            "snapshot language or technology entries are invalid",
        ));
    }

    let mut visible_evidence = BTreeSet::new();
    for evidence in &snapshot.evidence {
        if evidence.id.trim().is_empty()
            || evidence.path.trim().is_empty()
            || evidence.kind.trim().is_empty()
            || !visible_evidence.insert(evidence.id.as_str())
        {
            return Err(ProductStoreError::InvalidDerivedSnapshot(
                "snapshot evidence receipts must be non-empty and unique",
            ));
        }
    }
    for domain in &snapshot.project_domains {
        if domain.key.trim().is_empty()
            || domain.label.trim().is_empty()
            || !domain.rule_based
            || domain.evidence_refs.is_empty()
            || domain.evidence_refs.len() > MAX_DERIVED_EVIDENCE
            || domain
                .evidence_refs
                .iter()
                .any(|evidence_ref| !visible_evidence.contains(evidence_ref.as_str()))
        {
            return Err(ProductStoreError::InvalidDerivedSnapshot(
                "snapshot project-domain provenance must resolve inside bounded evidence",
            ));
        }
    }
    Ok(())
}

fn validate_personal_profile_snapshot(
    snapshot: &PersonalProfileDerivedSnapshot,
    identity: &ProductProfileIdentity,
    target_count: usize,
) -> Result<(), ProductStoreError> {
    let actor_key = identity.actor_key.trim();
    if snapshot.schema != PERSONAL_PROFILE_DERIVED_SNAPSHOT_SCHEMA
        || snapshot.scope != "personal-profile"
        || snapshot.subject_actor_key != actor_key
    {
        return Err(ProductStoreError::InvalidPersonalProfileSnapshot(
            "snapshot schema, scope, or actor identity is invalid",
        ));
    }
    if actor_key.is_empty()
        || target_count == 0
        || target_count > MAX_PROFILE_TARGETS
        || snapshot.analyzed_repository_count != target_count as u64
    {
        return Err(ProductStoreError::InvalidPersonalProfileSnapshot(
            "snapshot repository or actor scope is invalid",
        ));
    }
    if snapshot.capabilities.len() > MAX_PROFILE_CAPABILITIES
        || snapshot.evidence.len() > MAX_PROFILE_EVIDENCE
        || snapshot.actor_evidence.len() > MAX_PROFILE_ACTOR_EVIDENCE
        || snapshot.shown_personal_capability_count != snapshot.capabilities.len() as u64
        || snapshot.shown_evidence_count != snapshot.evidence.len() as u64
        || snapshot.shown_actor_evidence_count != snapshot.actor_evidence.len() as u64
        || snapshot.shown_personal_capability_count > snapshot.available_personal_capability_count
        || snapshot.shown_evidence_count > snapshot.available_evidence_count
        || snapshot.shown_actor_evidence_count > snapshot.available_actor_evidence_count
    {
        return Err(ProductStoreError::InvalidPersonalProfileSnapshot(
            "snapshot exceeds bounded profile limits or count metadata is inconsistent",
        ));
    }
    let expected_truncated = snapshot.shown_personal_capability_count
        < snapshot.available_personal_capability_count
        || snapshot.shown_evidence_count < snapshot.available_evidence_count
        || snapshot.shown_actor_evidence_count < snapshot.available_actor_evidence_count;
    if snapshot.truncated != expected_truncated {
        return Err(ProductStoreError::InvalidPersonalProfileSnapshot(
            "snapshot truncation metadata is inconsistent",
        ));
    }

    let mut evidence_ids = BTreeSet::new();
    for evidence in &snapshot.evidence {
        if evidence.id.trim().is_empty()
            || evidence.repository.trim().is_empty()
            || evidence.path.trim().is_empty()
            || evidence.kind.trim().is_empty()
            || !evidence_ids.insert(evidence.id.as_str())
        {
            return Err(ProductStoreError::InvalidPersonalProfileSnapshot(
                "profile evidence receipts must be non-empty and unique",
            ));
        }
    }

    let mut actor_ids = BTreeSet::new();
    for actor in &snapshot.actor_evidence {
        if actor.id.trim().is_empty()
            || actor.relation.trim().is_empty()
            || actor.repository.trim().is_empty()
            || actor.source_kind.trim().is_empty()
            || actor.source_ref.trim().is_empty()
            || actor.observed_at.trim().is_empty()
            || actor.implementation_origin.trim().is_empty()
            || actor.target_evidence_refs.is_empty()
            || actor
                .target_evidence_refs
                .iter()
                .any(|evidence_ref| !evidence_ids.contains(evidence_ref.as_str()))
            || !actor_ids.insert(actor.id.as_str())
        {
            return Err(ProductStoreError::InvalidPersonalProfileSnapshot(
                "actor evidence must be bounded, unique, and resolve to visible evidence",
            ));
        }
    }

    let mut capability_keys = BTreeSet::new();
    for capability in &snapshot.capabilities {
        let attribution_allowed = matches!(
            capability.attribution_status.as_str(),
            "identity-linked" | "user-confirmed" | "agency-supported"
        );
        let unique_repositories = capability
            .repositories
            .iter()
            .map(String::as_str)
            .collect::<BTreeSet<_>>();
        if capability.key.trim().is_empty()
            || capability.label.trim().is_empty()
            || !attribution_allowed
            || capability.attribution_status == "repository-only"
            || capability.repositories.is_empty()
            || capability.repository_count != unique_repositories.len() as u64
            || unique_repositories
                .iter()
                .any(|repo| repo.trim().is_empty())
            || capability.actor_evidence_refs.is_empty()
            || capability.support_evidence_refs.is_empty()
            || capability
                .actor_evidence_refs
                .iter()
                .any(|actor_ref| !actor_ids.contains(actor_ref.as_str()))
            || capability
                .support_evidence_refs
                .iter()
                .any(|evidence_ref| !evidence_ids.contains(evidence_ref.as_str()))
            || !capability_keys.insert(capability.key.as_str())
        {
            return Err(ProductStoreError::InvalidPersonalProfileSnapshot(
                "personal capability provenance is invalid or unresolved",
            ));
        }
    }
    Ok(())
}

fn validate_persisted_private_declaration(
    declaration: ProfileDeclaration,
    actor_key: &str,
) -> Result<ProfileDeclaration, ProductStoreError> {
    let declaration = validate_profile_declaration(declaration).map_err(|_| {
        ProductStoreError::InvalidPrivateDeclaration("declaration contract validation failed")
    })?;
    if declaration.actor_key != actor_key {
        return Err(ProductStoreError::InvalidPrivateDeclaration(
            "declaration actor does not match the active profile",
        ));
    }
    if declaration.publication_status != ProfileDeclarationPublicationStatus::Private {
        return Err(ProductStoreError::InvalidPrivateDeclaration(
            "publication approval is not persistable while the desktop publication gate is disabled",
        ));
    }
    if declaration.source_kind != ProfileDeclarationSourceKind::UserAnswer {
        return Err(ProductStoreError::InvalidPrivateDeclaration(
            "only direct private interview answers are persistable in this phase",
        ));
    }
    if declaration.authorization_ref.is_some() || declaration.source_hash.is_some() {
        return Err(ProductStoreError::InvalidPrivateDeclaration(
            "private declaration persistence excludes authorization and source-hash metadata",
        ));
    }
    Ok(declaration)
}

struct PersonalProfileSnapshotKey {
    id: String,
    actor_key: String,
    actor_identity_hash: String,
    repository_set_hash: String,
}

fn personal_profile_snapshot_key(
    identity: &ProductProfileIdentity,
    targets: &[ProductRepositoryTarget],
) -> Result<PersonalProfileSnapshotKey, ProductStoreError> {
    let actor_key = identity.actor_key.trim().to_string();
    if actor_key.is_empty() {
        return Err(ProductStoreError::InvalidPersonalProfileSnapshot(
            "actor key is required",
        ));
    }
    let names = normalized_profile_identity_values(&identity.names);
    let emails = normalized_profile_identity_values(&identity.emails);
    if names.is_empty() && emails.is_empty() {
        return Err(ProductStoreError::InvalidPersonalProfileSnapshot(
            "at least one Git identity matcher is required",
        ));
    }
    if targets.is_empty() || targets.len() > MAX_PROFILE_TARGETS {
        return Err(ProductStoreError::InvalidPersonalProfileSnapshot(
            "profile repository target count is invalid",
        ));
    }

    let mut actor_identity = format!("actor\0{actor_key}");
    for name in names {
        actor_identity.push_str("\0name\0");
        actor_identity.push_str(&name);
    }
    for email in emails {
        actor_identity.push_str("\0email\0");
        actor_identity.push_str(&email);
    }
    let actor_identity_hash = format!("actor:{:x}", Sha256::digest(actor_identity.as_bytes()));

    let mut repository_ids = targets
        .iter()
        .map(repository_connection_id)
        .collect::<Result<Vec<_>, _>>()?;
    repository_ids.sort();
    if repository_ids.windows(2).any(|pair| pair[0] == pair[1]) {
        return Err(ProductStoreError::InvalidPersonalProfileSnapshot(
            "profile repository targets must be unique",
        ));
    }
    let mut repository_identity = format!("count\0{}", repository_ids.len());
    for repository_id in repository_ids {
        repository_identity.push('\0');
        repository_identity.push_str(&repository_id);
    }
    let repository_set_hash = format!("repos:{:x}", Sha256::digest(repository_identity.as_bytes()));
    let id = format!(
        "profile:{:x}",
        Sha256::digest(format!("{actor_identity_hash}\0{repository_set_hash}").as_bytes())
    );
    Ok(PersonalProfileSnapshotKey {
        id,
        actor_key,
        actor_identity_hash,
        repository_set_hash,
    })
}

fn normalized_profile_identity_values(values: &[String]) -> Vec<String> {
    values
        .iter()
        .map(|value| value.trim().to_lowercase())
        .filter(|value| !value.is_empty())
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect()
}

fn repository_connection_id(target: &ProductRepositoryTarget) -> Result<String, ProductStoreError> {
    let identity = match target {
        ProductRepositoryTarget::Local { path } => {
            let path = path.trim();
            if path.is_empty() {
                return Err(ProductStoreError::InvalidConnection(
                    "local path is required",
                ));
            }
            format!("local\0{path}")
        }
        ProductRepositoryTarget::Remote {
            owner,
            name,
            remote_url,
        } => {
            let owner = owner.trim();
            let name = name.trim();
            let remote_url = remote_url.trim();
            if owner.is_empty() || name.is_empty() || remote_url.is_empty() {
                return Err(ProductStoreError::InvalidConnection(
                    "remote owner, name, and URL are required",
                ));
            }
            format!("remote\0{owner}\0{name}\0{remote_url}")
        }
    };
    Ok(format!("repo:{:x}", Sha256::digest(identity.as_bytes())))
}

fn http_remote_has_credentials(remote_url: &str) -> bool {
    let lower = remote_url.to_ascii_lowercase();
    if !(lower.starts_with("http://") || lower.starts_with("https://")) {
        return false;
    }
    let Some((_, rest)) = remote_url.split_once("://") else {
        return false;
    };
    rest.split('/')
        .next()
        .is_some_and(|authority| authority.contains('@'))
}

fn sqlite_integer(value: u64) -> Result<i64, ProductStoreError> {
    i64::try_from(value).map_err(|_| ProductStoreError::IntegerRange)
}

fn stored_count(value: i64) -> Result<u64, rusqlite::Error> {
    u64::try_from(value).map_err(|_| rusqlite::Error::IntegralValueOutOfRange(0, value))
}

fn connection_from_row(
    row: &rusqlite::Row<'_>,
) -> Result<PersistedRepositoryConnection, rusqlite::Error> {
    let kind: String = row.get(1)?;
    let target = match kind.as_str() {
        "local" => ProductRepositoryTarget::Local {
            path: row.get::<_, Option<String>>(2)?.ok_or_else(|| {
                rusqlite::Error::InvalidColumnType(
                    2,
                    "local_path".into(),
                    rusqlite::types::Type::Null,
                )
            })?,
        },
        "remote" => ProductRepositoryTarget::Remote {
            owner: row.get::<_, Option<String>>(3)?.ok_or_else(|| {
                rusqlite::Error::InvalidColumnType(
                    3,
                    "remote_owner".into(),
                    rusqlite::types::Type::Null,
                )
            })?,
            name: row.get::<_, Option<String>>(4)?.ok_or_else(|| {
                rusqlite::Error::InvalidColumnType(
                    4,
                    "remote_name".into(),
                    rusqlite::types::Type::Null,
                )
            })?,
            remote_url: row.get::<_, Option<String>>(5)?.ok_or_else(|| {
                rusqlite::Error::InvalidColumnType(
                    5,
                    "remote_url".into(),
                    rusqlite::types::Type::Null,
                )
            })?,
        },
        _ => {
            return Err(rusqlite::Error::InvalidColumnType(
                1,
                "kind".into(),
                rusqlite::types::Type::Text,
            ));
        }
    };
    Ok(PersistedRepositoryConnection {
        schema: REPOSITORY_CONNECTION_SCHEMA,
        id: row.get(0)?,
        target,
        repository_name: row.get(6)?,
        branch: row.get(7)?,
        head_commit: row.get(8)?,
        head_commit_time: row.get(9)?,
        acquisition_kind: row.get(10)?,
        audit_action: row.get(11)?,
        inventory_coverage: row.get(12)?,
        summary_scope: row.get(13)?,
        known_path_count: stored_count(row.get(14)?)?,
        files_scanned: stored_count(row.get(15)?)?,
        evidence_records: stored_count(row.get(16)?)?,
    })
}

fn database_error(error: rusqlite::Error) -> ProductStoreError {
    ProductStoreError::Database(error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{REPOSITORY_AUDIT_RECEIPT_SCHEMA, RepositoryAuditEntry};

    fn local_snapshot(path: &Path) -> RepositoryConnectionSnapshot {
        RepositoryConnectionSnapshot {
            target: ProductRepositoryTarget::Local {
                path: path.to_string_lossy().into_owned(),
            },
            repository_name: "local-repo".into(),
            branch: Some("main".into()),
            head_commit: Some("abc123".into()),
            head_commit_time: Some("2026-09-24T12:00:00Z".into()),
            acquisition_kind: "local".into(),
            audit_action: None,
            inventory_coverage: "complete-policy-filtered".into(),
            summary_scope: "inventory".into(),
            known_path_count: 12,
            files_scanned: 12,
            evidence_records: 5,
        }
    }

    fn remote_snapshot(remote_url: &str) -> (RepositoryConnectionSnapshot, RepositoryAuditReceipt) {
        let snapshot = RepositoryConnectionSnapshot {
            target: ProductRepositoryTarget::Remote {
                owner: "mauro".into(),
                name: "remote-repo".into(),
                remote_url: remote_url.into(),
            },
            repository_name: "remote-repo".into(),
            branch: Some("main".into()),
            head_commit: Some("deadbeef".into()),
            head_commit_time: Some("2026-09-24T13:00:00Z".into()),
            acquisition_kind: "remote-audit".into(),
            audit_action: Some("initialized".into()),
            inventory_coverage: "complete-policy-filtered".into(),
            summary_scope: "selected-content".into(),
            known_path_count: 80,
            files_scanned: 9,
            evidence_records: 9,
        };
        let receipt = RepositoryAuditReceipt {
            schema: REPOSITORY_AUDIT_RECEIPT_SCHEMA.to_string(),
            owner: "mauro".into(),
            repository: "remote-repo".into(),
            remote_url: remote_url.into(),
            branch: "main".into(),
            head_commit: "deadbeef".into(),
            head_commit_time: "2026-09-24T13:00:00Z".into(),
            tree_object_id: "tree-123".into(),
            entries: vec![RepositoryAuditEntry {
                path: "src/main.rs".into(),
                git_object_id: "blob-123".into(),
                kind: "source".into(),
                language: Some("Rust".into()),
            }],
        };
        (snapshot, receipt)
    }

    #[test]
    fn repository_connections_survive_store_reopen_and_upsert_in_place() {
        let temp = tempfile::tempdir().unwrap();
        let db = temp.path().join("product.sqlite3");
        let store = SqliteProductStore::new(&db);
        let mut snapshot = local_snapshot(temp.path());
        let first = store.upsert_repository_connection(&snapshot, None).unwrap();
        assert_eq!(store.list_repository_connections().unwrap().len(), 1);

        snapshot.head_commit = Some("def456".into());
        snapshot.evidence_records = 7;
        let updated = SqliteProductStore::new(&db)
            .upsert_repository_connection(&snapshot, None)
            .unwrap();
        assert_eq!(first.id, updated.id);

        let reopened = SqliteProductStore::new(&db)
            .list_repository_connections()
            .unwrap();
        assert_eq!(reopened.len(), 1);
        assert_eq!(reopened[0].head_commit.as_deref(), Some("def456"));
        assert_eq!(reopened[0].evidence_records, 7);
    }

    #[test]
    fn remote_audit_identity_persists_without_source_or_cache_payloads() {
        let temp = tempfile::tempdir().unwrap();
        let db = temp.path().join("product.sqlite3");
        let remote = "https://example.test/mauro/remote-repo.git";
        let (snapshot, receipt) = remote_snapshot(remote);
        let stored = SqliteProductStore::new(&db)
            .upsert_repository_connection(&snapshot, Some(&receipt))
            .unwrap();

        let connection = Connection::open(&db).unwrap();
        let receipt_count: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM repository_audit_receipts",
                [],
                |row| row.get(0),
            )
            .unwrap();
        let entry_count: i64 = connection
            .query_row("SELECT COUNT(*) FROM repository_audit_entries", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(receipt_count, 1);
        assert_eq!(entry_count, 1);
        assert_eq!(stored.summary_scope, "selected-content");

        let bytes = fs::read(&db).unwrap();
        let haystack = String::from_utf8_lossy(&bytes);
        assert!(!haystack.contains("SECRET_SOURCE_BODY"));
        assert!(!haystack.contains("hydratedSha256"));
        assert!(!haystack.contains("gitDir"));
        assert!(!haystack.contains("repository-audit-cache"));
    }

    fn derived_snapshot(snapshot: &RepositoryConnectionSnapshot) -> RepositoryDerivedSnapshot {
        RepositoryDerivedSnapshot {
            schema: REPOSITORY_DERIVED_SNAPSHOT_SCHEMA.into(),
            repository_name: snapshot.repository_name.clone(),
            branch: snapshot.branch.clone(),
            head_commit: snapshot.head_commit.clone(),
            acquisition_kind: snapshot.acquisition_kind.clone(),
            audit_action: snapshot.audit_action.clone(),
            inventory_coverage: snapshot.inventory_coverage.clone(),
            summary_scope: snapshot.summary_scope.clone(),
            known_path_count: snapshot.known_path_count,
            files_scanned: snapshot.files_scanned,
            bytes_scanned: 2048,
            evidence_records: snapshot.evidence_records,
            manifests: 1,
            docs: 1,
            tests: 1,
            tooling_files: 1,
            source_files: 1,
            languages: vec![ProductLanguageSnapshot {
                language: "Rust".into(),
                files: 1,
                bytes: 128,
            }],
            technologies: vec![ProductTechnologySnapshot {
                name: "Rust".into(),
                source_path: "Cargo.toml".into(),
                source_kind: "manifest".into(),
            }],
            available_evidence_count: 1,
            evidence: vec![ProductEvidenceReceipt {
                id: "evidence:manifest".into(),
                path: "Cargo.toml".into(),
                kind: "manifest".into(),
                bytes: 128,
            }],
            project_domains: vec![ProductDomainSnapshot {
                key: "developer-tooling".into(),
                label: "Developer tooling".into(),
                source_kinds: vec!["manifest".into()],
                evidence_refs: vec!["evidence:manifest".into()],
                technologies: vec!["Rust".into()],
                languages: vec!["Rust".into()],
                rule_based: true,
            }],
        }
    }

    #[test]
    fn derived_snapshot_survives_reopen_without_raw_source_payloads() {
        let temp = tempfile::tempdir().unwrap();
        let db = temp.path().join("product.sqlite3");
        let store = SqliteProductStore::new(&db);
        let snapshot = local_snapshot(temp.path());
        let connection = store.upsert_repository_connection(&snapshot, None).unwrap();
        let derived = derived_snapshot(&snapshot);
        store
            .upsert_repository_derived_snapshot(&snapshot.target, &derived)
            .unwrap();

        let reopened = SqliteProductStore::new(&db)
            .repository_derived_snapshot(&connection.id)
            .unwrap()
            .unwrap();
        assert_eq!(reopened, derived);
        assert_eq!(reopened.evidence[0].path, "Cargo.toml");

        let bytes = fs::read(&db).unwrap();
        let haystack = String::from_utf8_lossy(&bytes);
        assert!(!haystack.contains("SECRET_SOURCE_BODY"));
        assert!(!haystack.contains("excerptHash"));
        assert!(!haystack.contains("hydratedSha256"));
        assert!(!haystack.contains("gitDir"));
    }

    #[test]
    fn connection_head_change_invalidates_derived_snapshot() {
        let temp = tempfile::tempdir().unwrap();
        let db = temp.path().join("product.sqlite3");
        let store = SqliteProductStore::new(&db);
        let mut snapshot = local_snapshot(temp.path());
        let connection = store.upsert_repository_connection(&snapshot, None).unwrap();
        store
            .upsert_repository_derived_snapshot(&snapshot.target, &derived_snapshot(&snapshot))
            .unwrap();
        assert!(
            store
                .repository_derived_snapshot(&connection.id)
                .unwrap()
                .is_some()
        );

        snapshot.head_commit = Some("new-head".into());
        store.upsert_repository_connection(&snapshot, None).unwrap();
        assert!(
            store
                .repository_derived_snapshot(&connection.id)
                .unwrap()
                .is_none()
        );
    }

    fn profile_identity() -> ProductProfileIdentity {
        ProductProfileIdentity {
            actor_key: "developer:local".into(),
            names: vec!["Mauro Dev".into()],
            emails: vec!["mauro@example.com".into()],
        }
    }

    fn private_profile_declaration() -> ProfileDeclaration {
        ProfileDeclaration {
            schema: PROFILE_DECLARATION_SCHEMA.into(),
            id: "declaration:role".into(),
            actor_key: "developer:local".into(),
            category: ProfileDeclarationCategory::Role,
            key: "primary-role".into(),
            value: "Developer focused on local-first tooling".into(),
            source_kind: ProfileDeclarationSourceKind::UserAnswer,
            source_ref: "interview:gap:role".into(),
            declared_at: "2026-09-25T05:00:00Z".into(),
            authorization_ref: None,
            publication_status: ProfileDeclarationPublicationStatus::Private,
            source_hash: None,
            repositories: vec!["local-repo".into()],
        }
    }

    fn personal_profile_snapshot() -> PersonalProfileDerivedSnapshot {
        PersonalProfileDerivedSnapshot {
            schema: PERSONAL_PROFILE_DERIVED_SNAPSHOT_SCHEMA.into(),
            scope: "personal-profile".into(),
            subject_actor_key: "developer:local".into(),
            analyzed_repository_count: 1,
            available_personal_capability_count: 1,
            shown_personal_capability_count: 1,
            repository_only_claims_omitted: 2,
            unresolved_attribution_claims_omitted: 0,
            available_evidence_count: 1,
            shown_evidence_count: 1,
            available_actor_evidence_count: 1,
            shown_actor_evidence_count: 1,
            truncated: false,
            capabilities: vec![ProductPersonalCapabilitySnapshot {
                key: "web-application".into(),
                label: "Web application".into(),
                repository_count: 1,
                repositories: vec!["local-repo".into()],
                attribution_status: "identity-linked".into(),
                actor_evidence_refs: vec!["actor:commit".into()],
                actor_relations: vec!["authored-commit".into()],
                implementation_origins: vec!["unknown".into()],
                support_evidence_refs: vec!["evidence:source".into()],
                evidence_diversity: vec!["source".into()],
            }],
            evidence: vec![ProductPersonalProfileEvidenceReceipt {
                id: "evidence:source".into(),
                repository: "local-repo".into(),
                path: "src/main.rs".into(),
                kind: "source".into(),
                bytes: 128,
            }],
            actor_evidence: vec![ProductPersonalActorEvidenceReceipt {
                id: "actor:commit".into(),
                relation: "authored-commit".into(),
                repository: "local-repo".into(),
                source_kind: "git".into(),
                source_ref: "commit:abc123".into(),
                observed_at: "2026-09-24T12:00:00Z".into(),
                implementation_origin: "unknown".into(),
                target_evidence_refs: vec!["evidence:source".into()],
            }],
        }
    }

    #[test]
    fn personal_profile_snapshot_survives_reopen_without_identity_matchers_or_source_payloads() {
        let temp = tempfile::tempdir().unwrap();
        let db = temp.path().join("product.sqlite3");
        let target = ProductRepositoryTarget::Local {
            path: temp.path().to_string_lossy().into_owned(),
        };
        let identity = profile_identity();
        let snapshot = personal_profile_snapshot();
        SqliteProductStore::new(&db)
            .upsert_personal_profile_derived_snapshot(
                &identity,
                std::slice::from_ref(&target),
                &snapshot,
            )
            .unwrap();

        let reopened = SqliteProductStore::new(&db)
            .personal_profile_derived_snapshot(&identity, std::slice::from_ref(&target))
            .unwrap()
            .unwrap();
        assert_eq!(reopened, snapshot);

        let bytes = fs::read(&db).unwrap();
        let haystack = String::from_utf8_lossy(&bytes);
        assert!(!haystack.contains("Mauro Dev"));
        assert!(!haystack.contains("mauro@example.com"));
        assert!(!haystack.contains("SECRET_SOURCE_BODY"));
        assert!(!haystack.contains("excerptHash"));
        assert!(!haystack.contains("hydratedSha256"));
    }

    #[test]
    fn personal_profile_snapshot_identity_is_order_independent_and_matcher_exact() {
        let temp = tempfile::tempdir().unwrap();
        let db = temp.path().join("product.sqlite3");
        let first = ProductRepositoryTarget::Local {
            path: temp.path().join("a").to_string_lossy().into_owned(),
        };
        let second = ProductRepositoryTarget::Local {
            path: temp.path().join("b").to_string_lossy().into_owned(),
        };
        let identity = profile_identity();
        let mut snapshot = personal_profile_snapshot();
        snapshot.analyzed_repository_count = 2;
        let store = SqliteProductStore::new(&db);
        store
            .upsert_personal_profile_derived_snapshot(
                &identity,
                &[first.clone(), second.clone()],
                &snapshot,
            )
            .unwrap();
        assert!(
            store
                .personal_profile_derived_snapshot(&identity, &[second.clone(), first.clone()],)
                .unwrap()
                .is_some()
        );

        let mut changed = identity.clone();
        changed.emails = vec!["other@example.com".into()];
        assert!(
            store
                .personal_profile_derived_snapshot(&changed, &[first.clone(), second])
                .unwrap()
                .is_none()
        );

        assert!(matches!(
            store.personal_profile_derived_snapshot(&identity, &[first.clone(), first]),
            Err(ProductStoreError::InvalidPersonalProfileSnapshot(_))
        ));
    }

    #[test]
    fn personal_profile_snapshot_rejects_repository_only_or_unresolved_provenance() {
        let temp = tempfile::tempdir().unwrap();
        let db = temp.path().join("product.sqlite3");
        let target = ProductRepositoryTarget::Local {
            path: temp.path().to_string_lossy().into_owned(),
        };
        let identity = profile_identity();
        let mut snapshot = personal_profile_snapshot();
        snapshot.capabilities[0].attribution_status = "repository-only".into();
        assert!(matches!(
            SqliteProductStore::new(&db).upsert_personal_profile_derived_snapshot(
                &identity,
                std::slice::from_ref(&target),
                &snapshot,
            ),
            Err(ProductStoreError::InvalidPersonalProfileSnapshot(_))
        ));

        let mut snapshot = personal_profile_snapshot();
        snapshot.capabilities[0].actor_evidence_refs = vec!["actor:missing".into()];
        assert!(matches!(
            SqliteProductStore::new(&db).upsert_personal_profile_derived_snapshot(
                &identity,
                std::slice::from_ref(&target),
                &snapshot,
            ),
            Err(ProductStoreError::InvalidPersonalProfileSnapshot(_))
        ));
    }

    #[test]
    fn private_profile_declarations_survive_reopen_without_persisting_consent_metadata() {
        let temp = tempfile::tempdir().unwrap();
        let db = temp.path().join("product.sqlite3");
        let target = ProductRepositoryTarget::Local {
            path: temp.path().to_string_lossy().into_owned(),
        };
        let identity = profile_identity();
        let snapshot = personal_profile_snapshot();
        let store = SqliteProductStore::new(&db);
        store
            .upsert_personal_profile_derived_snapshot(
                &identity,
                std::slice::from_ref(&target),
                &snapshot,
            )
            .unwrap();
        let declaration = private_profile_declaration();
        let stored = store
            .upsert_private_profile_declaration(
                &identity,
                std::slice::from_ref(&target),
                &declaration,
            )
            .unwrap();
        assert_eq!(stored, declaration);

        let reopened = SqliteProductStore::new(&db)
            .private_profile_declarations(&identity, std::slice::from_ref(&target))
            .unwrap();
        assert_eq!(reopened, vec![declaration]);
        let bytes = fs::read(&db).unwrap();
        let haystack = String::from_utf8_lossy(&bytes);
        assert!(!haystack.contains("publicationStatus"));
        assert!(!haystack.contains("authorizationRef"));
        assert!(!haystack.contains("sourceHash"));
    }

    #[test]
    fn private_profile_declaration_persistence_rejects_approval_and_wrong_profile_scope() {
        let temp = tempfile::tempdir().unwrap();
        let db = temp.path().join("product.sqlite3");
        let target = ProductRepositoryTarget::Local {
            path: temp.path().to_string_lossy().into_owned(),
        };
        let identity = profile_identity();
        let store = SqliteProductStore::new(&db);
        store
            .upsert_personal_profile_derived_snapshot(
                &identity,
                std::slice::from_ref(&target),
                &personal_profile_snapshot(),
            )
            .unwrap();

        let mut approved = private_profile_declaration();
        approved.publication_status = ProfileDeclarationPublicationStatus::Approved;
        assert!(matches!(
            store.upsert_private_profile_declaration(
                &identity,
                std::slice::from_ref(&target),
                &approved,
            ),
            Err(ProductStoreError::InvalidPrivateDeclaration(_))
        ));

        let mut other_identity = identity.clone();
        other_identity.actor_key = "developer:other".into();
        let declaration = private_profile_declaration();
        assert!(matches!(
            store.upsert_private_profile_declaration(
                &other_identity,
                std::slice::from_ref(&target),
                &declaration,
            ),
            Err(ProductStoreError::InvalidPrivateDeclaration(_))
        ));
    }

    #[test]
    fn v3_database_migrates_to_v4_without_losing_personal_profile_snapshot() {
        let temp = tempfile::tempdir().unwrap();
        let db = temp.path().join("product.sqlite3");
        let target = ProductRepositoryTarget::Local {
            path: temp.path().to_string_lossy().into_owned(),
        };
        let identity = profile_identity();
        let snapshot = personal_profile_snapshot();
        let key = personal_profile_snapshot_key(&identity, std::slice::from_ref(&target)).unwrap();
        let connection = Connection::open(&db).unwrap();
        migrate_v1(&connection).unwrap();
        migrate_v2(&connection).unwrap();
        migrate_v3(&connection).unwrap();
        connection
            .execute(
                "INSERT INTO personal_profile_derived_snapshots (id, actor_key, actor_identity_hash, repository_set_hash, payload_schema, payload_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    key.id,
                    key.actor_key,
                    key.actor_identity_hash,
                    key.repository_set_hash,
                    PERSONAL_PROFILE_DERIVED_SNAPSHOT_SCHEMA,
                    serde_json::to_string(&snapshot).unwrap(),
                ],
            )
            .unwrap();
        drop(connection);

        let reopened = SqliteProductStore::new(&db)
            .personal_profile_derived_snapshot(&identity, std::slice::from_ref(&target))
            .unwrap()
            .unwrap();
        assert_eq!(reopened, snapshot);
        let connection = Connection::open(&db).unwrap();
        let version: i64 = connection
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .unwrap();
        assert_eq!(version, PRODUCT_STORE_SCHEMA_VERSION);
        let table_count: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'profile_private_declarations'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(table_count, 1);
    }

    #[test]
    fn v2_database_migrates_to_v4_without_losing_repository_derived_snapshot() {
        let temp = tempfile::tempdir().unwrap();
        let db = temp.path().join("product.sqlite3");
        let snapshot = local_snapshot(temp.path());
        let derived = derived_snapshot(&snapshot);
        let id = repository_connection_id(&snapshot.target).unwrap();
        let connection = Connection::open(&db).unwrap();
        migrate_v1(&connection).unwrap();
        migrate_v2(&connection).unwrap();
        connection
            .execute(
                "INSERT INTO repository_connections (
                    id, kind, local_path, repository_name, branch, head_commit, head_commit_time,
                    acquisition_kind, audit_action, inventory_coverage, summary_scope,
                    known_path_count, files_scanned, evidence_records
                 ) VALUES (?1, 'local', ?2, ?3, ?4, ?5, NULL, ?6, NULL, ?7, ?8, ?9, ?10, ?11)",
                params![
                    id,
                    match &snapshot.target {
                        ProductRepositoryTarget::Local { path } => path,
                        ProductRepositoryTarget::Remote { .. } => unreachable!(),
                    },
                    snapshot.repository_name,
                    snapshot.branch,
                    snapshot.head_commit,
                    snapshot.acquisition_kind,
                    snapshot.inventory_coverage,
                    snapshot.summary_scope,
                    snapshot.known_path_count,
                    snapshot.files_scanned,
                    snapshot.evidence_records,
                ],
            )
            .unwrap();
        connection
            .execute(
                "INSERT INTO repository_derived_snapshots (
                    connection_id, payload_schema, source_head_commit, payload_json
                 ) VALUES (?1, ?2, ?3, ?4)",
                params![
                    id,
                    REPOSITORY_DERIVED_SNAPSHOT_SCHEMA,
                    derived.head_commit,
                    serde_json::to_string(&derived).unwrap(),
                ],
            )
            .unwrap();
        drop(connection);

        let reopened = SqliteProductStore::new(&db)
            .repository_derived_snapshot(&id)
            .unwrap()
            .expect("schema-v2 repository derived state must survive the v4 migration");
        assert_eq!(reopened, derived);
        let connection = Connection::open(&db).unwrap();
        let version: i64 = connection
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .unwrap();
        assert_eq!(version, PRODUCT_STORE_SCHEMA_VERSION);
    }

    #[test]
    fn v1_database_migrates_to_v4_without_losing_connections() {
        let temp = tempfile::tempdir().unwrap();
        let db = temp.path().join("product.sqlite3");
        let connection = Connection::open(&db).unwrap();
        migrate_v1(&connection).unwrap();
        connection
            .execute(
                "INSERT INTO repository_connections (
                    id, kind, local_path, repository_name, branch, head_commit, head_commit_time,
                    acquisition_kind, inventory_coverage, summary_scope,
                    known_path_count, files_scanned, evidence_records
                 ) VALUES (?1, 'local', ?2, 'legacy-local', 'main', 'abc123', NULL,
                    'local', 'complete-policy-filtered', 'inventory', 1, 1, 1)",
                params!["repo:legacy", temp.path().to_string_lossy()],
            )
            .unwrap();
        drop(connection);

        let rows = SqliteProductStore::new(&db)
            .list_repository_connections()
            .unwrap();
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].repository_name, "legacy-local");
        let connection = Connection::open(&db).unwrap();
        let version: i64 = connection
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .unwrap();
        assert_eq!(version, PRODUCT_STORE_SCHEMA_VERSION);
        let table_count: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'repository_derived_snapshots'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(table_count, 1);
        let profile_table_count: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'personal_profile_derived_snapshots'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(profile_table_count, 1);
    }

    #[test]
    fn credentialed_remote_is_rejected_before_it_can_be_persisted() {
        let temp = tempfile::tempdir().unwrap();
        let db = temp.path().join("product.sqlite3");
        let (snapshot, receipt) = remote_snapshot("https://user:secret@example.test/repo.git");
        let error = SqliteProductStore::new(&db)
            .upsert_repository_connection(&snapshot, Some(&receipt))
            .unwrap_err();
        assert!(error.to_string().contains("embedded HTTP credentials"));
        assert!(
            SqliteProductStore::new(&db)
                .list_repository_connections()
                .unwrap()
                .is_empty()
        );
    }

    #[test]
    fn unsupported_schema_fails_closed() {
        let temp = tempfile::tempdir().unwrap();
        let db = temp.path().join("product.sqlite3");
        let connection = Connection::open(&db).unwrap();
        connection
            .execute_batch("PRAGMA user_version = 99;")
            .unwrap();
        drop(connection);
        let error = SqliteProductStore::new(&db)
            .list_repository_connections()
            .unwrap_err();
        assert!(matches!(error, ProductStoreError::UnsupportedSchema(99)));
    }
}
