use crate::{
    app_middleware::auth::AuthUser,
    errors::AppError,
    models::file::{CreateFolderReq, FileNode, ListFilesQuery, RenameFileReq},
    AppConfig,
};
use actix_multipart::Multipart;
use actix_web::{web, HttpRequest, HttpResponse};
use futures_util::stream::StreamExt;
use sqlx::PgPool;
use tokio::io::AsyncWriteExt;
use uuid::Uuid;

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/files[?parent_id=uuid]
// ─────────────────────────────────────────────────────────────────────────────

/// List files and folders owned by the authenticated user.
///
/// - With `?parent_id=<uuid>`: lists children of that folder.
/// - Without `parent_id`:      lists root-level entries (parent_id IS NULL).
///
/// Results are sorted folders-first, then by name ASC.
pub async fn list_files(
    pool: web::Data<PgPool>,
    user: AuthUser,
    query: web::Query<ListFilesQuery>,
) -> Result<HttpResponse, AppError> {
    let files: Vec<FileNode> = match query.parent_id {
        // ── Scoped listing (inside a folder) ─────────────────────────────────
        Some(parent_id) => {
            // First verify the parent folder exists and belongs to this user.
            // This prevents path-traversal into other users' trees.
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

            sqlx::query_as::<_, FileNode>(
                "SELECT id, parent_id, owner_id, name, is_folder,
                        size_bytes, mime_type, classification, created_at, updated_at
                 FROM files
                 WHERE parent_id = $1 AND owner_id = $2
                 ORDER BY is_folder DESC, name ASC",
            )
            .bind(parent_id)
            .bind(user.id)
            .fetch_all(pool.get_ref())
            .await
            .map_err(AppError::Database)?
        }

        // ── Root listing (parent_id IS NULL) ──────────────────────────────────
        None => sqlx::query_as::<_, FileNode>(
            "SELECT id, parent_id, owner_id, name, is_folder,
                        size_bytes, mime_type, classification, created_at, updated_at
                 FROM files
                 WHERE parent_id IS NULL AND owner_id = $1
                 ORDER BY is_folder DESC, name ASC",
        )
        .bind(user.id)
        .fetch_all(pool.get_ref())
        .await
        .map_err(AppError::Database)?,
    };

    Ok(HttpResponse::Ok().json(files))
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
                   size_bytes, mime_type, classification, created_at, updated_at",
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

    let _ = write_audit_log(
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

    // ── Update — owner_id in WHERE clause enforces ownership ──────────────────
    let updated: Option<FileNode> = sqlx::query_as::<_, FileNode>(
        "UPDATE files
         SET name = $1
         WHERE id = $2 AND owner_id = $3
         RETURNING id, parent_id, owner_id, name, is_folder,
                   size_bytes, mime_type, classification, created_at, updated_at",
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

    let _ = write_audit_log(pool.get_ref(), user.id, "RENAME", &file_id.to_string(), &ip).await;

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
                size_bytes, mime_type, classification, created_at, updated_at
         FROM files
         WHERE id = $1 AND owner_id = $2",
    )
    .bind(file_id)
    .bind(user.id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    let file = file.ok_or(AppError::NotFound)?;

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

    // ── Hard delete ───────────────────────────────────────────────────────────
    sqlx::query("DELETE FROM files WHERE id = $1 AND owner_id = $2")
        .bind(file_id)
        .bind(user.id)
        .execute(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

    // ── Audit log ─────────────────────────────────────────────────────────────
    let ip = req.peer_addr().map(|a| a.to_string()).unwrap_or_default();

    let _ = write_audit_log(
        pool.get_ref(),
        user.id,
        if file.is_folder {
            "DELETE_FOLDER"
        } else {
            "DELETE_FILE"
        },
        &file_id.to_string(),
        &ip,
    )
    .await;

    tracing::info!(
        user_id   = %user.id,
        file_id   = %file_id,
        is_folder = %file.is_folder,
        "File/folder deleted"
    );

    Ok(HttpResponse::NoContent().finish())
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/// Fire-and-forget append to `audit_logs`.
/// Errors are logged but NEVER bubble up — we must not fail the primary
/// request due to an audit write failure.
async fn write_audit_log(
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

                    // Stream to disk using tokio::fs
                    let mut file = tokio::fs::File::create(&temp_filepath).await.map_err(|e| {
                        AppError::Internal(anyhow::anyhow!("Failed to create file on disk: {}", e))
                    })?;

                    file_written = true;

                    while let Some(chunk) = field.next().await {
                        let bytes = chunk.map_err(|e| {
                            AppError::BadRequest(format!("Failed to read chunk: {}", e))
                        })?;
                        file.write_all(&bytes).await.map_err(|e| {
                            AppError::Internal(anyhow::anyhow!("Failed to write chunk: {}", e))
                        })?;
                        size_bytes += bytes.len() as i64;
                    }

                    file.flush().await.map_err(|e| {
                        AppError::Internal(anyhow::anyhow!("Failed to flush file: {}", e))
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

    // ── Insert file record into database ──────────────────────────────────────
    let insert_res = sqlx::query_as::<_, FileNode>(
        "INSERT INTO files
            (id, parent_id, owner_id, name, is_folder, size_bytes, mime_type, classification)
         VALUES ($1, $2, $3, $4, FALSE, $5, $6, $7)
         RETURNING id, parent_id, owner_id, name, is_folder,
                   size_bytes, mime_type, classification, created_at, updated_at",
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

    // ── Audit log ─────────────────────────────────────────────────────────────
    let ip = req.peer_addr().map(|a| a.to_string()).unwrap_or_default();

    let _ = write_audit_log(
        pool.get_ref(),
        user.id,
        "UPLOAD_FILE",
        &file_node.id.to_string(),
        &ip,
    )
    .await;

    tracing::info!(
        user_id = %user.id,
        file_id = %file_node.id,
        name = %filename,
        "File uploaded successfully"
    );

    Ok(HttpResponse::Created().json(file_node))
}
