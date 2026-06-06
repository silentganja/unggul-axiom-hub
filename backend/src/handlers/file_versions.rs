use crate::{app_middleware::auth::AuthUser, errors::AppError, models::file_version::FileVersion};
use actix_web::{web, HttpResponse};
use sqlx::PgPool;
use uuid::Uuid;

/// GET /api/files/{id}/versions
/// List all saved versions for a file (newest first).
pub async fn list_versions(
    pool: web::Data<PgPool>,
    user: AuthUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let file_id = path.into_inner();

    // Verify user owns the file or has access
    let owner: Option<Uuid> =
        sqlx::query_scalar("SELECT owner_id FROM files WHERE id = $1 AND deleted_at IS NULL")
            .bind(file_id)
            .fetch_optional(pool.get_ref())
            .await
            .map_err(AppError::Database)?
            .ok_or(AppError::NotFound)?;

    // Also check shared access
    let has_access = owner == Some(user.id)
        || sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS(SELECT 1 FROM file_shares WHERE file_id = $1 AND user_id = $2)",
        )
        .bind(file_id)
        .bind(user.id)
        .fetch_one(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

    if !has_access {
        return Err(AppError::Forbidden(
            "You do not have access to this file's versions.".into(),
        ));
    }

    let versions: Vec<FileVersion> = sqlx::query_as(
        "SELECT id, file_id, version_number, size_bytes, storage_path, uploaded_by, created_at
         FROM file_versions
         WHERE file_id = $1
         ORDER BY version_number DESC
         LIMIT 100",
    )
    .bind(file_id)
    .fetch_all(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    Ok(HttpResponse::Ok().json(versions))
}

/// POST /api/files/{id}/versions/{version_id}/restore
/// Restore a previous version (creates a new version from the old one).
pub async fn restore_version(
    pool: web::Data<PgPool>,
    config: web::Data<crate::AppConfig>,
    user: AuthUser,
    path: web::Path<(Uuid, Uuid)>,
) -> Result<HttpResponse, AppError> {
    let (file_id, version_id) = path.into_inner();

    // Verify ownership
    let owner: Option<Uuid> =
        sqlx::query_scalar("SELECT owner_id FROM files WHERE id = $1 AND deleted_at IS NULL")
            .bind(file_id)
            .fetch_optional(pool.get_ref())
            .await
            .map_err(AppError::Database)?
            .ok_or(AppError::NotFound)?;

    if owner != Some(user.id) {
        return Err(AppError::Forbidden(
            "You do not own this file and cannot restore versions.".into(),
        ));
    }

    // Get the version to restore
    let version: Option<FileVersion> = sqlx::query_as(
        "SELECT id, file_id, version_number, size_bytes, storage_path, uploaded_by, created_at
         FROM file_versions WHERE id = $1 AND file_id = $2",
    )
    .bind(version_id)
    .bind(file_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    let version = version.ok_or(AppError::NotFound)?;

    // Get current file info
    let _file_name: String = sqlx::query_scalar("SELECT name FROM files WHERE id = $1")
        .bind(file_id)
        .fetch_optional(pool.get_ref())
        .await
        .map_err(AppError::Database)?
        .ok_or(AppError::NotFound)?;

    let current_storage_path = std::path::Path::new(&config.storage_path)
        .join(file_id.to_string())
        .to_string_lossy()
        .to_string();

    // Get next version number
    let next_version: i32 = sqlx::query_scalar(
        "SELECT COALESCE(MAX(version_number), 0) + 1 FROM file_versions WHERE file_id = $1",
    )
    .bind(file_id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    // Create new version entry pointing to the old storage path (restoration)
    sqlx::query(
        "INSERT INTO file_versions (file_id, version_number, size_bytes, storage_path, uploaded_by)
         VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(file_id)
    .bind(next_version)
    .bind(version.size_bytes)
    .bind(&version.storage_path)
    .bind(user.id)
    .execute(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    // Update the current file to point to the restored version's storage path
    // We do this by copying the old version file over the current file
    let source_path = std::path::Path::new(&version.storage_path);
    let dest_path = std::path::Path::new(&current_storage_path);

    if !source_path.exists() {
        return Err(AppError::NotFound);
    }

    tokio::fs::copy(&source_path, &dest_path)
        .await
        .map_err(|e| {
            tracing::error!("Failed to restore file version: {:?}", e);
            AppError::Internal(anyhow::anyhow!("Failed to restore file version"))
        })?;

    let new_size = tokio::fs::metadata(&dest_path)
        .await
        .map(|m| m.len() as i64)
        .unwrap_or(version.size_bytes);

    sqlx::query("UPDATE files SET size_bytes = $1, updated_at = NOW() WHERE id = $2")
        .bind(new_size)
        .bind(file_id)
        .execute(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

    tracing::info!(
        user_id = %user.id,
        file_id = %file_id,
        restored_version = %version.version_number,
        new_version = %next_version,
        "File version restored"
    );

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "restored",
        "versionNumber": next_version
    })))
}
