use crate::{
    app_middleware::auth::AuthUser,
    errors::AppError,
    models::file::{CreateFolderReq, FileListResponse, FileNode, ListFilesQuery, RenameFileReq},
    models::user,
    AppConfig,
};
use actix_multipart::Multipart;
use actix_web::{web, HttpRequest, HttpResponse};
use chrono::{DateTime, Utc};
use futures_util::stream::StreamExt;
use sqlx::PgPool;
use uuid::Uuid;

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/files/{id}
// ─────────────────────────────────────────────────────────────────────────────

/// Get a single file or folder by ID (must be owned by the authenticated user).
///
/// Returns `404` if not found or ownership mismatch.
pub async fn get_file(
    pool: web::Data<PgPool>,
    user: AuthUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let file_id = path.into_inner();

    let file: Option<FileNode> = sqlx::query_as::<_, FileNode>(
        "SELECT id, parent_id, owner_id, name, is_folder,
                size_bytes, mime_type, classification, created_at, updated_at, locked_by, locked_at, lock_reason
         FROM files
         WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL",
    )
    .bind(file_id)
    .bind(user.id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    let file = match file {
        Some(f) => f,
        None => {
            // Check if file is shared with the user
            let is_shared: bool = sqlx::query_scalar(
                "SELECT EXISTS(SELECT 1 FROM file_shares WHERE file_id = $1 AND user_id = $2)",
            )
            .bind(file_id)
            .bind(user.id)
            .fetch_one(pool.get_ref())
            .await
            .map_err(AppError::Database)?;

            if is_shared {
                sqlx::query_as::<_, FileNode>(
                    "SELECT id, parent_id, owner_id, name, is_folder,
                            size_bytes, mime_type, classification, created_at, updated_at, locked_by, locked_at, lock_reason
                     FROM files
                     WHERE id = $1 AND deleted_at IS NULL",
                )
                .bind(file_id)
                .fetch_optional(pool.get_ref())
                .await
                .map_err(AppError::Database)?
                .ok_or(AppError::NotFound)?
            } else {
                return Err(AppError::NotFound);
            }
        }
    };

    Ok(HttpResponse::Ok().json(file))
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/files[?parent_id=uuid]
// ─────────────────────────────────────────────────────────────────────────────

/// List files and folders owned by the authenticated user.
///
/// Supports:
/// - `?parent_id=<uuid>` — scoped folder listing
/// - `?q=<search>` — full-text search on name
/// - `?page=1&perPage=50` — pagination
/// - `?sort=name&order=asc` — sorting (name, size, classification, updated)
pub async fn list_files(
    pool: web::Data<PgPool>,
    user: AuthUser,
    query: web::Query<ListFilesQuery>,
) -> Result<HttpResponse, AppError> {
    let page = query.page.unwrap_or(1).max(1);
    let per_page = query.per_page.unwrap_or(50).clamp(1, 200);
    let offset = ((page - 1) * per_page) as i64;
    let search = query.q.as_deref().unwrap_or("").trim();

    // Validate sort column
    let sort_col = match query.sort.as_deref().unwrap_or("name") {
        "name" => "f.name",
        "size" => "f.size_bytes",
        "classification" => "f.classification",
        "updated" => "f.updated_at",
        _ => "f.name",
    };
    let order = match query.order.as_deref().unwrap_or("asc") {
        "desc" => "DESC",
        _ => "ASC",
    };

    // Detect whether the tsvector search_vector column exists (added by migration 9015)
    let has_tsvector: bool = if !search.is_empty() {
        sqlx::query_scalar(
            "SELECT EXISTS(
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'files' AND column_name = 'search_vector'
            )",
        )
        .fetch_one(pool.get_ref())
        .await
        .map_err(AppError::Database)?
    } else {
        false
    };

    // Build WHERE clauses dynamically
    let parent_clause = if query.parent_id.is_some() {
        "AND f.parent_id = $2"
    } else {
        "AND f.parent_id IS NULL"
    };
    // Search parameter index: $2 when no parent_id, $3 when parent_id is present
    let search_param_idx = if query.parent_id.is_some() { 3 } else { 2 };
    let (search_clause, search_param): (String, fn(&str) -> String) = if !search.is_empty() {
        if has_tsvector {
            (
                format!(
                    "AND f.search_vector @@ plainto_tsquery('english', ${})",
                    search_param_idx
                ),
                |s: &str| s.to_string(),
            )
        } else {
            (
                format!("AND f.name ILIKE ${}", search_param_idx),
                |s: &str| format!("%{}%", s),
            )
        }
    } else {
        (String::new(), |_: &str| String::new())
    };

    // Verify parent if scoped
    if let Some(parent_id) = query.parent_id {
        let parent_exists: bool = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM files WHERE id = $1 AND owner_id = $2 AND is_folder = TRUE)",
        )
        .bind(parent_id)
        .bind(user.id)
        .fetch_one(pool.get_ref())
        .await
        .map_err(AppError::Database)?;
        if !parent_exists {
            return Err(AppError::NotFound);
        }
    }

    // Count query
    let count_sql = format!(
        "SELECT COUNT(*) FROM files f WHERE f.owner_id = $1 AND f.deleted_at IS NULL {parent} {search}",
        parent = parent_clause,
        search = search_clause,
    );
    let total: i64 = if !search.is_empty() && query.parent_id.is_some() {
        sqlx::query_scalar(&count_sql)
            .bind(user.id)
            .bind(query.parent_id.unwrap_or_default())
            .bind(search_param(search))
            .fetch_one(pool.get_ref())
            .await
            .map_err(AppError::Database)?
    } else if !search.is_empty() {
        // No parent_id, SQL has $1 (owner_id) and $2 (search)
        sqlx::query_scalar(&count_sql)
            .bind(user.id)
            .bind(search_param(search))
            .fetch_one(pool.get_ref())
            .await
            .map_err(AppError::Database)?
    } else if query.parent_id.is_some() {
        sqlx::query_scalar(&count_sql)
            .bind(user.id)
            .bind(query.parent_id.unwrap_or_default())
            .fetch_one(pool.get_ref())
            .await
            .map_err(AppError::Database)?
    } else {
        sqlx::query_scalar(&count_sql)
            .bind(user.id)
            .fetch_one(pool.get_ref())
            .await
            .map_err(AppError::Database)?
    };

    // Data query
    let data_sql = format!(
        "SELECT f.id, f.parent_id, f.owner_id, f.name, f.is_folder,
                f.size_bytes, f.mime_type, f.classification, f.created_at, f.updated_at,
                f.locked_by, f.locked_at, f.lock_reason
         FROM files f
         WHERE f.owner_id = $1 AND f.deleted_at IS NULL {parent} {search}
         ORDER BY f.is_folder DESC, {sort_col} {order}
         LIMIT {per_page} OFFSET {offset}",
        parent = parent_clause,
        search = search_clause,
        sort_col = sort_col,
        order = order,
        per_page = per_page,
        offset = offset,
    );

    let files: Vec<FileNode> = if !search.is_empty() && query.parent_id.is_some() {
        sqlx::query_as::<_, FileNode>(&data_sql)
            .bind(user.id)
            .bind(query.parent_id.unwrap_or_default())
            .bind(search_param(search))
            .fetch_all(pool.get_ref())
            .await
            .map_err(AppError::Database)?
    } else if !search.is_empty() {
        // No parent_id, SQL has $1 (owner_id) and $2 (search)
        sqlx::query_as::<_, FileNode>(&data_sql)
            .bind(user.id)
            .bind(search_param(search))
            .fetch_all(pool.get_ref())
            .await
            .map_err(AppError::Database)?
    } else if query.parent_id.is_some() {
        sqlx::query_as::<_, FileNode>(&data_sql)
            .bind(user.id)
            .bind(query.parent_id.unwrap_or_default())
            .fetch_all(pool.get_ref())
            .await
            .map_err(AppError::Database)?
    } else {
        sqlx::query_as::<_, FileNode>(&data_sql)
            .bind(user.id)
            .fetch_all(pool.get_ref())
            .await
            .map_err(AppError::Database)?
    };

    let total_pages = ((total as f64) / (per_page as f64)).ceil() as u32;

    Ok(HttpResponse::Ok().json(FileListResponse {
        files,
        total,
        page,
        per_page,
        total_pages,
    }))
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/files/folder
// ─────────────────────────────────────────────────────────────────────────────

/// Create a new folder owned by the authenticated user.
///
/// # Validations
/// - `name` must be non-empty.
/// - `classification` must be a recognised tier (defaults to `TERBUKA`).
/// - If `parent_id` is provided, the parent folder must exist and belong to
///   the same user. This enforces strict ownership of the full tree path.
pub async fn create_folder(
    pool: web::Data<PgPool>,
    user: AuthUser,
    req: HttpRequest,
    body: web::Json<CreateFolderReq>,
) -> Result<HttpResponse, AppError> {
    // ── Validate payload ──────────────────────────────────────────────────────
    let classification = body
        .validate()
        .map_err(|e| AppError::BadRequest(e.to_string()))?;

    let name = body.name.trim().to_string();

    // ── Validate parent ownership (if scoped) ─────────────────────────────────
    if let Some(parent_id) = body.parent_id {
        let parent_exists: bool = sqlx::query_scalar(
            "SELECT EXISTS(
                SELECT 1 FROM files
                WHERE id = $1 AND owner_id = $2 AND is_folder = TRUE
            )",
        )
        .bind(parent_id)
        .bind(user.id)
        .fetch_one(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

        if !parent_exists {
            return Err(AppError::NotFound);
        }
    }

    // ── Insert the folder ─────────────────────────────────────────────────────
    // No sqlx macros — raw query_as per engineering rules.
    let folder: FileNode = sqlx::query_as::<_, FileNode>(
        "INSERT INTO files
            (parent_id, owner_id, name, is_folder, size_bytes, classification)
         VALUES ($1, $2, $3, TRUE, 0, $4)
         RETURNING id, parent_id, owner_id, name, is_folder,
                   size_bytes, mime_type, classification, created_at, updated_at, locked_by, locked_at, lock_reason",
    )
    .bind(body.parent_id)
    .bind(user.id)
    .bind(&name)
    .bind(classification)
    .fetch_one(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    // ── Audit log ─────────────────────────────────────────────────────────────
    let ip = req.peer_addr().map(|a| a.to_string()).unwrap_or_default();

    let _ = write_audit_log_internal(
        pool.get_ref(),
        user.id,
        "CREATE_FOLDER",
        &folder.id.to_string(),
        &ip,
    )
    .await;

    tracing::info!(
        user_id = %user.id,
        folder_id = %folder.id,
        name = %name,
        "Folder created"
    );

    Ok(HttpResponse::Created().json(folder))
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/files/{id}/rename
// ─────────────────────────────────────────────────────────────────────────────

/// Rename a file or folder.
///
/// The resource MUST be owned by the authenticated user.
/// Returns `404` if not found or ownership mismatch — never leaks existence
/// of resources belonging to other users.
// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/files/{id}/classification
// ─────────────────────────────────────────────────────────────────────────────

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct UpdateClassificationRequest {
    classification: String,
}

/// Update the classification of a file. Owner only.
pub async fn update_classification(
    pool: web::Data<PgPool>,
    user: AuthUser,
    req: HttpRequest,
    path: web::Path<Uuid>,
    body: web::Json<UpdateClassificationRequest>,
) -> Result<HttpResponse, AppError> {
    let file_id = path.into_inner();

    if !crate::models::file::VALID_CLASSIFICATIONS.contains(&body.classification.as_str()) {
        return Err(AppError::BadRequest("Invalid classification".into()));
    }

    // ── Enforce lock: hierarchical — must be the locker or have >= role level ──
    let lock_info: Option<(Option<Uuid>, Option<String>)> = sqlx::query_as(
        "SELECT f.locked_by, u.role FROM files f LEFT JOIN users u ON u.id = f.locked_by WHERE f.id = $1 AND f.owner_id = $2",
    )
    .bind(file_id)
    .bind(user.id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    if let Some((locker, locker_role)) = lock_info {
        if let Some(locker_id) = locker {
            match locker_role {
                Some(role) => {
                    if locker_id != user.id
                        && user::role_level(&user.role) < user::role_level(&role)
                    {
                        return Err(AppError::Conflict(
                            "This file is locked by a higher authority and cannot change classification".into(),
                        ));
                    }
                }
                None => {
                    return Err(AppError::Conflict(
                        "File is locked by a deleted user. Contact an administrator.".into(),
                    ));
                }
            }
        }
    }

    let updated: Option<FileNode> = sqlx::query_as::<_, FileNode>(
        "UPDATE files
         SET classification = $1
         WHERE id = $2 AND owner_id = $3
         RETURNING id, parent_id, owner_id, name, is_folder,
                   size_bytes, mime_type, classification, created_at, updated_at, locked_by, locked_at, lock_reason",
    )
    .bind(&body.classification)
    .bind(file_id)
    .bind(user.id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    let file = updated.ok_or(AppError::NotFound)?;

    let ip = req.peer_addr().map(|a| a.to_string()).unwrap_or_default();
    let _ = write_audit_log_internal(
        pool.get_ref(),
        user.id,
        "UPDATE_CLASSIFICATION",
        &file_id.to_string(),
        &ip,
    )
    .await;

    tracing::info!(
        user_id = %user.id,
        file_id = %file_id,
        classification = %body.classification,
        "File classification updated"
    );

    Ok(HttpResponse::Ok().json(file))
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/files/{id}/rename
// ─────────────────────────────────────────────────────────────────────────────

pub async fn rename_file(
    pool: web::Data<PgPool>,
    user: AuthUser,
    req: HttpRequest,
    path: web::Path<Uuid>,
    body: web::Json<RenameFileReq>,
) -> Result<HttpResponse, AppError> {
    let file_id = path.into_inner();

    // ── Validate payload ──────────────────────────────────────────────────────
    body.validate()
        .map_err(|e| AppError::BadRequest(e.to_string()))?;

    let new_name = body.new_name.trim().to_string();

    // ── Enforce lock: hierarchical — must be the locker or have >= role level ──
    let lock_info: Option<(Option<Uuid>, Option<String>)> = sqlx::query_as(
        "SELECT f.locked_by, u.role FROM files f LEFT JOIN users u ON u.id = f.locked_by WHERE f.id = $1 AND f.owner_id = $2",
    )
    .bind(file_id)
    .bind(user.id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    if let Some((locker, locker_role)) = lock_info {
        if let Some(locker_id) = locker {
            match locker_role {
                Some(role) => {
                    if locker_id != user.id
                        && user::role_level(&user.role) < user::role_level(&role)
                    {
                        return Err(AppError::Conflict(
                            "This file is locked by a higher authority and cannot be renamed"
                                .into(),
                        ));
                    }
                }
                None => {
                    return Err(AppError::Conflict(
                        "File is locked by a deleted user. Contact an administrator.".into(),
                    ));
                }
            }
        }
    }

    // ── Update — owner_id in WHERE clause enforces ownership ──────────────────
    let updated: Option<FileNode> = sqlx::query_as::<_, FileNode>(
        "UPDATE files
         SET name = $1
         WHERE id = $2 AND owner_id = $3
         RETURNING id, parent_id, owner_id, name, is_folder,
                   size_bytes, mime_type, classification, created_at, updated_at, locked_by, locked_at, lock_reason",
    )
    .bind(&new_name)
    .bind(file_id)
    .bind(user.id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    let file = updated.ok_or(AppError::NotFound)?;

    // ── Audit log ─────────────────────────────────────────────────────────────
    let ip = req.peer_addr().map(|a| a.to_string()).unwrap_or_default();

    let _ = write_audit_log_internal(pool.get_ref(), user.id, "RENAME", &file_id.to_string(), &ip)
        .await;

    tracing::info!(
        user_id  = %user.id,
        file_id  = %file_id,
        new_name = %new_name,
        "File/folder renamed"
    );

    Ok(HttpResponse::Ok().json(file))
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/files/{id}
// ─────────────────────────────────────────────────────────────────────────────

/// Delete a file or folder owned by the authenticated user.
///
/// **Folder semantics:** Folders with children are rejected with `409 Conflict`.
/// The caller must delete all contents first (or use a dedicated
/// `DELETE /api/files/{id}?recursive=true` endpoint added in a later phase).
///
/// **Cascade:** The DB schema has `ON DELETE CASCADE` on `parent_id`, so if a
/// future recursive delete is needed it can be done in a single CTE.
pub async fn delete_file(
    pool: web::Data<PgPool>,
    user: AuthUser,
    req: HttpRequest,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let file_id = path.into_inner();

    // ── Fetch the row — verify it exists AND belongs to this user ─────────────
    let file: Option<FileNode> = sqlx::query_as::<_, FileNode>(
        "SELECT id, parent_id, owner_id, name, is_folder,
                size_bytes, mime_type, classification, created_at, updated_at, locked_by, locked_at, lock_reason
         FROM files
         WHERE id = $1 AND owner_id = $2",
    )
    .bind(file_id)
    .bind(user.id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    let file = file.ok_or(AppError::NotFound)?;

    // ── Enforce lock: hierarchical — must be the locker or have >= role level ──
    if let Some(locker) = file.locked_by {
        if locker != user.id {
            let locker_role: Option<String> =
                sqlx::query_scalar("SELECT role FROM users WHERE id = $1")
                    .bind(locker)
                    .fetch_optional(pool.get_ref())
                    .await
                    .map_err(AppError::Database)?;

            let locker_level = locker_role.as_deref().map(user::role_level).unwrap_or(0);

            if user::role_level(&user.role) < locker_level {
                return Err(AppError::Conflict(
                    "This file is locked by a higher authority and cannot be deleted".into(),
                ));
            }
        }
    }

    // ── Guard: refuse to delete non-empty folders ─────────────────────────────
    if file.is_folder {
        let child_count: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM files WHERE parent_id = $1")
                .bind(file_id)
                .fetch_one(pool.get_ref())
                .await
                .map_err(AppError::Database)?;

        if child_count > 0 {
            return Err(AppError::Conflict(
                "Folder is not empty. Delete all contents before removing the folder.".into(),
            ));
        }
    }

    // ── Soft delete ───────────────────────────────────────────────────────────
    sqlx::query("UPDATE files SET deleted_at = NOW() WHERE id = $1 AND owner_id = $2")
        .bind(file_id)
        .bind(user.id)
        .execute(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

    // ── Audit log ─────────────────────────────────────────────────────────────
    let ip = req.peer_addr().map(|a| a.to_string()).unwrap_or_default();

    let _ = write_audit_log_internal(
        pool.get_ref(),
        user.id,
        if file.is_folder {
            "TRASH_FOLDER"
        } else {
            "TRASH_FILE"
        },
        &file_id.to_string(),
        &ip,
    )
    .await;

    tracing::info!(
        user_id   = %user.id,
        file_id   = %file_id,
        is_folder = %file.is_folder,
        "File/folder moved to trash"
    );

    Ok(HttpResponse::NoContent().finish())
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/files/trash
// ─────────────────────────────────────────────────────────────────────────────

/// List files in the authenticated user's trash (soft-deleted).
pub async fn list_trash(pool: web::Data<PgPool>, user: AuthUser) -> Result<HttpResponse, AppError> {
    let files: Vec<FileNode> = sqlx::query_as::<_, FileNode>(
        "SELECT id, parent_id, owner_id, name, is_folder,
                size_bytes, mime_type, classification, created_at, updated_at, locked_by, locked_at, lock_reason
         FROM files
         WHERE owner_id = $1 AND deleted_at IS NOT NULL
         ORDER BY updated_at DESC
         LIMIT 500",
    )
    .bind(user.id)
    .fetch_all(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    Ok(HttpResponse::Ok().json(files))
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/files/{id}/restore
// ─────────────────────────────────────────────────────────────────────────────

/// Restore a file or folder from the trash.
pub async fn restore_file(
    pool: web::Data<PgPool>,
    user: AuthUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let file_id = path.into_inner();

    let restored = sqlx::query(
        "UPDATE files SET deleted_at = NULL WHERE id = $1 AND owner_id = $2 AND deleted_at IS NOT NULL",
    )
    .bind(file_id)
    .bind(user.id)
    .execute(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    if restored.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    let file: FileNode = sqlx::query_as::<_, FileNode>(
        "SELECT id, parent_id, owner_id, name, is_folder,
                size_bytes, mime_type, classification, created_at, updated_at, locked_by, locked_at, lock_reason
         FROM files WHERE id = $1",
    )
    .bind(file_id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    tracing::info!(user_id = %user.id, file_id = %file_id, "File restored from trash");

    Ok(HttpResponse::Ok().json(file))
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/files/{id}/permanent
// ─────────────────────────────────────────────────────────────────────────────

/// Permanently delete a file or folder. Only works on already-trashed items.
pub async fn permanent_delete(
    pool: web::Data<PgPool>,
    user: AuthUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let file_id = path.into_inner();

    let deleted =
        sqlx::query("DELETE FROM files WHERE id = $1 AND owner_id = $2 AND deleted_at IS NOT NULL")
            .bind(file_id)
            .bind(user.id)
            .execute(pool.get_ref())
            .await
            .map_err(AppError::Database)?;

    if deleted.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    tracing::info!(user_id = %user.id, file_id = %file_id, "File permanently deleted");

    Ok(HttpResponse::NoContent().finish())
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/files/quota
// ─────────────────────────────────────────────────────────────────────────────

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct QuotaResponse {
    used_bytes: i64,
    quota_bytes: i64, // Default 100 GB
    file_count: i64,
    folder_count: i64,
}

const DEFAULT_QUOTA: i64 = 100 * 1024 * 1024 * 1024; // 100 GB

pub async fn get_quota(pool: web::Data<PgPool>, user: AuthUser) -> Result<HttpResponse, AppError> {
    let used: i64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(size_bytes), 0) FROM files WHERE owner_id = $1 AND deleted_at IS NULL AND is_folder = FALSE",
    )
    .bind(user.id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    let file_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM files WHERE owner_id = $1 AND deleted_at IS NULL AND is_folder = FALSE",
    )
    .bind(user.id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    let folder_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM files WHERE owner_id = $1 AND deleted_at IS NULL AND is_folder = TRUE",
    )
    .bind(user.id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    // Check per-user quota, falling back to system default
    let user_quota: Option<i64> =
        sqlx::query_scalar("SELECT storage_quota_bytes FROM users WHERE id = $1")
            .bind(user.id)
            .fetch_optional(pool.get_ref())
            .await
            .map_err(AppError::Database)?
            .flatten();

    let quota_bytes = user_quota.filter(|&q| q > 0).unwrap_or(DEFAULT_QUOTA);

    Ok(HttpResponse::Ok().json(QuotaResponse {
        used_bytes: used,
        quota_bytes,
        file_count,
        folder_count,
    }))
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/files/move
// ─────────────────────────────────────────────────────────────────────────────

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct MoveFilesRequest {
    file_ids: Vec<Uuid>,
    target_folder_id: Option<Uuid>,
}

/// Bulk-move files to a target folder. All files must be owned by the user.
pub async fn move_files(
    pool: web::Data<PgPool>,
    user: AuthUser,
    body: web::Json<MoveFilesRequest>,
) -> Result<HttpResponse, AppError> {
    if body.file_ids.is_empty() {
        return Err(AppError::BadRequest("file_ids must not be empty".into()));
    }

    // Verify target folder exists and belongs to user (if specified)
    if let Some(target_id) = body.target_folder_id {
        let exists: bool = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM files WHERE id = $1 AND owner_id = $2 AND is_folder = TRUE AND deleted_at IS NULL)",
        )
        .bind(target_id)
        .bind(user.id)
        .fetch_one(pool.get_ref())
        .await
        .map_err(AppError::Database)?;
        if !exists {
            return Err(AppError::NotFound);
        }
    }

    // ── Enforce lock: hierarchical — must be the locker or have >= role level ──
    for file_id in &body.file_ids {
        let lock_info: Option<(Option<Uuid>, Option<String>)> = sqlx::query_as(
            "SELECT f.locked_by, u.role FROM files f LEFT JOIN users u ON u.id = f.locked_by WHERE f.id = $1 AND f.owner_id = $2",
        )
        .bind(file_id)
        .bind(user.id)
        .fetch_optional(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

        if let Some((locker, locker_role)) = lock_info {
            if let Some(locker_id) = locker {
                match locker_role {
                    Some(role) => {
                        if locker_id != user.id
                            && user::role_level(&user.role) < user::role_level(&role)
                        {
                            return Err(AppError::Conflict(
                                "This file is locked by a higher authority and cannot be moved"
                                    .into(),
                            ));
                        }
                    }
                    None => {
                        return Err(AppError::Conflict(
                            "File is locked by a deleted user. Contact an administrator.".into(),
                        ));
                    }
                }
            }
        }
    }

    // Use a transaction to move all files atomically
    let mut tx = pool.begin().await.map_err(AppError::Database)?;

    for file_id in &body.file_ids {
        let result = sqlx::query(
            "UPDATE files SET parent_id = $1 WHERE id = $2 AND owner_id = $3 AND deleted_at IS NULL",
        )
        .bind(body.target_folder_id)
        .bind(file_id)
        .bind(user.id)
        .execute(&mut *tx)
        .await
        .map_err(AppError::Database)?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound);
        }
    }

    tx.commit().await.map_err(AppError::Database)?;

    tracing::info!(
        user_id = %user.id,
        count = body.file_ids.len(),
        target = ?body.target_folder_id,
        "Files moved"
    );

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "moved": body.file_ids.len()
    })))
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/activity
// ─────────────────────────────────────────────────────────────────────────────

#[derive(serde::Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
struct ActivityEntry {
    id: Uuid,
    action: String,
    target_resource: Option<String>,
    actor: String,
    occurred_at: DateTime<Utc>,
}

/// Returns a combined activity feed from audit logs, shares, and governance.
pub async fn activity_feed(
    pool: web::Data<PgPool>,
    user: AuthUser,
) -> Result<HttpResponse, AppError> {
    // Recent audit log entries relevant to this user (their actions + shares received)
    let entries: Vec<ActivityEntry> = sqlx::query_as::<_, ActivityEntry>(
        "SELECT id, action, target_resource, '' AS actor, created_at AS occurred_at
         FROM audit_logs
         WHERE user_id = $1
         UNION ALL
         SELECT fs.id, 'SHARED_WITH_YOU' AS action, f.name AS target_resource,
                u.full_name AS actor, fs.created_at AS occurred_at
         FROM file_shares fs
         JOIN files f ON f.id = fs.file_id
         JOIN users u ON u.id = fs.shared_by
         WHERE fs.user_id = $1
         UNION ALL
         SELECT gr.id, 'GOV_' || gr.status AS action, gr.title AS target_resource,
                '' AS actor, gr.updated_at AS occurred_at
         FROM governance_requests gr
         WHERE gr.requested_by = $1 AND gr.status != 'PENDING'
         ORDER BY occurred_at DESC
         LIMIT 50",
    )
    .bind(user.id)
    .fetch_all(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    Ok(HttpResponse::Ok().json(entries))
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/files/{id}/download
// ─────────────────────────────────────────────────────────────────────────────

/// Stream a file to the client for download.
pub async fn download_file(
    pool: web::Data<PgPool>,
    user: AuthUser,
    config: web::Data<AppConfig>,
    req: HttpRequest,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let file_id = path.into_inner();

    let file: Option<FileNode> = sqlx::query_as::<_, FileNode>(
        "SELECT id, parent_id, owner_id, name, is_folder,
                size_bytes, mime_type, classification, created_at, updated_at, locked_by, locked_at, lock_reason
         FROM files WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL AND is_folder = FALSE",
    )
    .bind(file_id)
    .bind(user.id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    let file = file.ok_or(AppError::NotFound)?;

    let filepath = std::path::Path::new(&config.storage_path).join(file_id.to_string());

    if !filepath.exists() {
        return Err(AppError::NotFound);
    }

    let encrypted = tokio::fs::read(&filepath)
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Failed to read file: {}", e)))?;

    // Decrypt if encryption key is configured
    let data = if let Some(ref enc_key) = config.encryption_key {
        crate::utils::crypto::decrypt(enc_key, &encrypted)?
    } else {
        encrypted
    };

    // ── Audit log ─────────────────────────────────────────────────────────────
    let ip = req.peer_addr().map(|a| a.to_string()).unwrap_or_default();
    let _ = write_audit_log_internal(
        pool.get_ref(),
        user.id,
        "DOWNLOAD",
        &file_id.to_string(),
        &ip,
    )
    .await;

    let mime = file
        .mime_type
        .as_deref()
        .unwrap_or("application/octet-stream");
    let filename = &file.name;

    Ok(HttpResponse::Ok()
        .insert_header(("Content-Type", mime.to_string()))
        .insert_header((
            "Content-Disposition",
            format!("attachment; filename=\"{}\"", filename),
        ))
        .insert_header(("Content-Length", data.len().to_string()))
        .body(data))
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/files/{id}/content
// ─────────────────────────────────────────────────────────────────────────────

/// Return raw file content for preview rendering.
pub async fn get_file_content(
    pool: web::Data<PgPool>,
    user: AuthUser,
    config: web::Data<AppConfig>,
    req: HttpRequest,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let file_id = path.into_inner();

    let file: Option<FileNode> = sqlx::query_as::<_, FileNode>(
        "SELECT id, parent_id, owner_id, name, is_folder,
                size_bytes, mime_type, classification, created_at, updated_at, locked_by, locked_at, lock_reason
         FROM files WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL AND is_folder = FALSE",
    )
    .bind(file_id)
    .bind(user.id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    let file = file.ok_or(AppError::NotFound)?;

    let filepath = std::path::Path::new(&config.storage_path).join(file_id.to_string());

    if !filepath.exists() {
        // Return empty content for files without stored data
        return Ok(HttpResponse::Ok()
            .insert_header(("Content-Type", "text/plain"))
            .body(Vec::new()));
    }

    let encrypted = tokio::fs::read(&filepath)
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Failed to read file: {}", e)))?;

    // Decrypt if encryption key is configured
    let data = if let Some(ref enc_key) = config.encryption_key {
        crate::utils::crypto::decrypt(enc_key, &encrypted)?
    } else {
        encrypted
    };

    // ── Audit log ─────────────────────────────────────────────────────────────
    let ip = req.peer_addr().map(|a| a.to_string()).unwrap_or_default();
    let _ = write_audit_log_internal(
        pool.get_ref(),
        user.id,
        "PREVIEW",
        &file_id.to_string(),
        &ip,
    )
    .await;

    let mime = file
        .mime_type
        .as_deref()
        .unwrap_or("application/octet-stream");

    Ok(HttpResponse::Ok()
        .insert_header(("Content-Type", mime.to_string()))
        .insert_header(("Content-Length", data.len().to_string()))
        .insert_header(("Cache-Control", "private, max-age=300"))
        .body(data))
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/// Fire-and-forget append to `audit_logs`.
/// Errors are logged but NEVER bubble up — we must not fail the primary
/// request due to an audit write failure.
pub(crate) async fn write_audit_log_internal(
    pool: &PgPool,
    user_id: Uuid,
    action: &str,
    target_resource: &str,
    ip_address: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO audit_logs (user_id, action, target_resource, ip_address)
         VALUES ($1, $2, $3, $4)",
    )
    .bind(user_id)
    .bind(action)
    .bind(target_resource)
    .bind(ip_address)
    .execute(pool)
    .await
    .map_err(|e| {
        tracing::error!("Audit log write failed: {:?}", e);
        e
    })?;
    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/files/upload
// ─────────────────────────────────────────────────────────────────────────────

/// Upload a file and stream its content directly to disk.
///
/// Ensures memory efficiency by streaming chunks from `actix-multipart`
/// without loading the entire payload into RAM.
///
/// # Workflow
/// 1. Iterates over fields to extract metadata (`parent_id`, `classification`).
/// 2. If `parent_id` is specified, verifies the parent folder exists and is owned by the user.
/// 3. Streams file chunks directly to disk using `tokio::fs`.
/// 4. Inserts file metadata into database. If insert fails, deletes the physical file.
pub async fn upload_file(
    pool: web::Data<PgPool>,
    user: AuthUser,
    config: web::Data<AppConfig>,
    req: HttpRequest,
    mut payload: Multipart,
) -> Result<HttpResponse, AppError> {
    let mut parent_id: Option<Uuid> = None;
    let mut classification = "TERBUKA".to_string();
    let mut filename = String::new();
    let mut mime_type: Option<String> = None;
    let mut size_bytes = 0i64;

    let generated_uuid = Uuid::new_v4();
    let temp_filepath = std::path::Path::new(&config.storage_path).join(generated_uuid.to_string());
    let mut file_written = false;

    // Wrap the multipart stream processing in an async block to facilitate error cleanup.
    let process_result = async {
        while let Some(item) = payload.next().await {
            let mut field = item.map_err(|e| AppError::BadRequest(e.to_string()))?;
            let content_disposition = field.content_disposition();
            let name = content_disposition
                .as_ref()
                .and_then(|cd| cd.get_name())
                .unwrap_or("");

            match name {
                "parent_id" => {
                    let mut bytes = Vec::new();
                    while let Some(chunk) = field.next().await {
                        let chunk = chunk.map_err(|e| AppError::BadRequest(e.to_string()))?;
                        bytes.extend_from_slice(&chunk);
                    }
                    let val_str = String::from_utf8(bytes)
                        .map_err(|e| AppError::BadRequest(e.to_string()))?;
                    let val_str = val_str.trim();
                    if !val_str.is_empty() {
                        let parsed_uuid = Uuid::parse_str(val_str).map_err(|_| {
                            AppError::BadRequest("Invalid parent_id UUID format".to_string())
                        })?;

                        // Validate parent_id belongs to the authenticated user and is a folder
                        let parent_exists: bool = sqlx::query_scalar(
                            "SELECT EXISTS(
                                SELECT 1 FROM files
                                WHERE id = $1 AND owner_id = $2 AND is_folder = TRUE
                            )",
                        )
                        .bind(parsed_uuid)
                        .bind(user.id)
                        .fetch_one(pool.get_ref())
                        .await
                        .map_err(AppError::Database)?;

                        if !parent_exists {
                            return Err(AppError::NotFound);
                        }
                        parent_id = Some(parsed_uuid);
                    }
                }
                "classification" => {
                    let mut bytes = Vec::new();
                    while let Some(chunk) = field.next().await {
                        let chunk = chunk.map_err(|e| AppError::BadRequest(e.to_string()))?;
                        bytes.extend_from_slice(&chunk);
                    }
                    let val_str = String::from_utf8(bytes)
                        .map_err(|e| AppError::BadRequest(e.to_string()))?;
                    let val_str = val_str.trim().to_uppercase();
                    if !val_str.is_empty() {
                        if !crate::models::file::VALID_CLASSIFICATIONS.contains(&val_str.as_str()) {
                            return Err(AppError::BadRequest(
                                "Invalid classification tier".to_string(),
                            ));
                        }
                        classification = val_str;
                    }
                }
                "file" => {
                    let fname = content_disposition
                        .as_ref()
                        .and_then(|cd| cd.get_filename())
                        .ok_or_else(|| {
                            AppError::BadRequest("No filename in file field".to_string())
                        })?
                        .to_string();

                    filename = fname;
                    mime_type = field.content_type().map(|m| m.to_string());

                    file_written = true;

                    // Accumulate all bytes in memory, checking size limit as we go
                    let mut all_bytes: Vec<u8> = Vec::new();

                    while let Some(chunk) = field.next().await {
                        let bytes = chunk.map_err(|e| {
                            AppError::BadRequest(format!("Failed to read chunk: {}", e))
                        })?;
                        size_bytes += bytes.len() as i64;

                        // Enforce maximum upload size
                        if size_bytes > config.max_upload_size_bytes {
                            return Err(AppError::BadRequest(format!(
                                "File exceeds maximum upload size of {} bytes",
                                config.max_upload_size_bytes
                            )));
                        }

                        all_bytes.extend_from_slice(&bytes);
                    }

                    // Encrypt bytes before writing to disk (if encryption key is configured)
                    let bytes_to_write: Vec<u8> = if let Some(ref enc_key) = config.encryption_key {
                        crate::utils::crypto::encrypt(enc_key, &all_bytes)?
                    } else {
                        all_bytes
                    };

                    // Write (possibly encrypted) bytes to disk
                    tokio::fs::write(&temp_filepath, &bytes_to_write)
                        .await
                        .map_err(|e| {
                            AppError::Internal(anyhow::anyhow!(
                                "Failed to write file to disk: {}",
                                e
                            ))
                        })?;
                }
                _ => {
                    // Ignore unknown fields
                }
            }
        }

        if !file_written {
            return Err(AppError::BadRequest("Missing file field".to_string()));
        }

        Ok(())
    }
    .await;

    // If streaming/processing failed, cleanup the file from disk if it was created
    if let Err(e) = process_result {
        if file_written {
            let _ = tokio::fs::remove_file(&temp_filepath).await;
        }
        return Err(e);
    }

    // ── Storage quota enforcement ─────────────────────────────────────────────
    let used_bytes: i64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(size_bytes), 0) FROM files WHERE owner_id = $1 AND deleted_at IS NULL",
    )
    .bind(user.id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    let user_quota: Option<i64> =
        sqlx::query_scalar("SELECT storage_quota_bytes FROM users WHERE id = $1")
            .bind(user.id)
            .fetch_optional(pool.get_ref())
            .await
            .map_err(AppError::Database)?
            .flatten();

    let quota_bytes = user_quota
        .filter(|&q| q > 0)
        .unwrap_or(100 * 1024 * 1024 * 1024); // 100 GB default

    if used_bytes + size_bytes > quota_bytes {
        let _ = tokio::fs::remove_file(&temp_filepath).await;
        return Err(AppError::BadRequest("Storage quota exceeded".into()));
    }

    // ── Re-validate parent_id (TOCTOU guard) ────────────────────────────────
    if let Some(pid) = parent_id {
        let parent_still_exists: bool = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM files WHERE id = $1 AND owner_id = $2 AND is_folder = TRUE)",
        )
        .bind(pid)
        .bind(user.id)
        .fetch_one(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

        if !parent_still_exists {
            let _ = tokio::fs::remove_file(&temp_filepath).await;
            return Err(AppError::NotFound);
        }
    }

    // ── Insert file record into database ──────────────────────────────────────
    let insert_res = sqlx::query_as::<_, FileNode>(
        "INSERT INTO files
            (id, parent_id, owner_id, name, is_folder, size_bytes, mime_type, classification)
         VALUES ($1, $2, $3, $4, FALSE, $5, $6, $7)
         RETURNING id, parent_id, owner_id, name, is_folder,
                   size_bytes, mime_type, classification, created_at, updated_at, locked_by, locked_at, lock_reason",
    )
    .bind(generated_uuid)
    .bind(parent_id)
    .bind(user.id)
    .bind(&filename)
    .bind(size_bytes)
    .bind(mime_type)
    .bind(&classification)
    .fetch_one(pool.get_ref())
    .await;

    let file_node = match insert_res {
        Ok(node) => node,
        Err(e) => {
            // Delete physical file on database insertion failure
            let _ = tokio::fs::remove_file(&temp_filepath).await;
            return Err(AppError::Database(e));
        }
    };

    // ── File versioning — save as version 1 ──────────────────────────────────
    let version_path = temp_filepath.to_string_lossy().to_string();
    if let Err(e) = sqlx::query(
        "INSERT INTO file_versions (file_id, version_number, size_bytes, storage_path, uploaded_by)
         VALUES ($1, 1, $2, $3, $4)
         ON CONFLICT (file_id, version_number) DO NOTHING",
    )
    .bind(file_node.id)
    .bind(size_bytes)
    .bind(&version_path)
    .bind(user.id)
    .execute(pool.get_ref())
    .await
    {
        tracing::warn!(file_id = %file_node.id, error = %e, "Failed to create initial file version");
    }

    // ── Audit log ─────────────────────────────────────────────────────────────
    let ip = req.peer_addr().map(|a| a.to_string()).unwrap_or_default();

    let _ = write_audit_log_internal(
        pool.get_ref(),
        user.id,
        "UPLOAD_FILE",
        &file_node.id.to_string(),
        &ip,
    )
    .await;

    // ── Emit notification ────────────────────────────────────────────────────
    crate::handlers::notifications::emit_notification(
        crate::models::notification::NotificationEvent::FileUploaded {
            file_name: filename.clone(),
            size_bytes,
        },
    );

    tracing::info!(
        user_id = %user.id,
        file_id = %file_node.id,
        name = %filename,
        "File uploaded successfully"
    );

    Ok(HttpResponse::Created().json(file_node))
}
