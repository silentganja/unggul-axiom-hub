use crate::{
    app_middleware::auth::AuthUser,
    errors::AppError,
    models::share::{
        FileShareEntry, FileShareRow, ShareFileRequest, SharedFileNode, SharedFileRow,
    },
    models::user,
};
use actix_web::{web, HttpRequest, HttpResponse};
use sqlx::PgPool;
use uuid::Uuid;

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/files/shared
// ─────────────────────────────────────────────────────────────────────────────

/// List files that have been shared WITH the authenticated user.
pub async fn list_shared_files(
    pool: web::Data<PgPool>,
    user: AuthUser,
) -> Result<HttpResponse, AppError> {
    let rows: Vec<SharedFileRow> = sqlx::query_as::<_, SharedFileRow>(
        "SELECT
            f.id,
            f.parent_id,
            f.owner_id,
            f.name,
            f.is_folder,
            f.size_bytes,
            f.mime_type,
            f.classification,
            f.created_at,
            f.updated_at,
            fs.role AS share_role,
            u.id    AS shared_by_id,
            u.full_name AS shared_by_full_name,
            u.email AS shared_by_email
         FROM file_shares fs
         JOIN files f ON f.id = fs.file_id AND f.deleted_at IS NULL
         JOIN users u ON u.id = fs.shared_by
         WHERE fs.user_id = $1
         ORDER BY fs.created_at DESC
         LIMIT 500",
    )
    .bind(user.id)
    .fetch_all(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    let shared: Vec<SharedFileNode> = rows.into_iter().map(|r| r.into()).collect();

    Ok(HttpResponse::Ok().json(shared))
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/files/{id}/share
// ─────────────────────────────────────────────────────────────────────────────

/// Share a file with another user. Only the file owner can share.
pub async fn share_file(
    pool: web::Data<PgPool>,
    user: AuthUser,
    req: HttpRequest,
    path: web::Path<Uuid>,
    body: web::Json<ShareFileRequest>,
) -> Result<HttpResponse, AppError> {
    let file_id = path.into_inner();
    let recipient_email = body.email.trim().to_lowercase();
    let role = body.role.trim().to_string();

    if recipient_email.is_empty() {
        return Err(AppError::BadRequest("email is required".into()));
    }
    if !["editor", "viewer"].contains(&role.as_str()) {
        return Err(AppError::BadRequest(
            "role must be 'editor' or 'viewer'".into(),
        ));
    }

    // Verify the file exists and is owned by the authenticated user
    let owner_id: Option<Uuid> =
        sqlx::query_scalar("SELECT owner_id FROM files WHERE id = $1 AND owner_id = $2")
            .bind(file_id)
            .bind(user.id)
            .fetch_optional(pool.get_ref())
            .await
            .map_err(AppError::Database)?
            .ok_or(AppError::NotFound)?;

    // ── Enforce lock: hierarchical — must be the locker or have >= role level ──
    let lock_info: Option<(Option<Uuid>, Option<String>)> = sqlx::query_as(
        "SELECT f.locked_by, u.role FROM files f LEFT JOIN users u ON u.id = f.locked_by WHERE f.id = $1",
    )
    .bind(file_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    if let Some((locker, locker_role)) = lock_info {
        match locker_role {
            Some(role) => {
                if locker != user.id
                    && user::role_level(&user.role) < user::role_level(&role)
                {
                    return Err(AppError::Conflict(
                        "This file is locked by a higher authority and cannot be shared".into(),
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

    // Find the recipient user by email
    let recipient_id: Option<Uuid> = sqlx::query_scalar("SELECT id FROM users WHERE email = $1")
        .bind(&recipient_email)
        .fetch_optional(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

    let recipient_id =
        recipient_id.ok_or(AppError::BadRequest("No user found with that email".into()))?;

    // Prevent sharing with yourself
    if recipient_id == user.id {
        return Err(AppError::BadRequest(
            "You cannot share a file with yourself".into(),
        ));
    }

    // Upsert: insert or update the share
    sqlx::query(
        "INSERT INTO file_shares (file_id, user_id, role, shared_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (file_id, user_id)
         DO UPDATE SET role = $3, shared_by = $4",
    )
    .bind(file_id)
    .bind(recipient_id)
    .bind(&role)
    .bind(owner_id)
    .execute(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    // ── Emit notification ────────────────────────────────────────────────────
    let file_name: String = sqlx::query_scalar("SELECT name FROM files WHERE id = $1")
        .bind(file_id)
        .fetch_optional(pool.get_ref())
        .await
        .map_err(AppError::Database)?
        .unwrap_or_default();
    let shared_by_name: String = sqlx::query_scalar("SELECT full_name FROM users WHERE id = $1")
        .bind(user.id)
        .fetch_optional(pool.get_ref())
        .await
        .map_err(AppError::Database)?
        .unwrap_or_default();
    crate::handlers::notifications::emit_notification(
        crate::models::notification::NotificationEvent::ShareAdded {
            file_name,
            shared_by: shared_by_name,
        },
    );

    // ── Audit log ─────────────────────────────────────────────────────────────
    let ip = req.peer_addr().map(|a| a.to_string()).unwrap_or_default();
    let _ = crate::handlers::files::write_audit_log_internal(
        pool.get_ref(),
        user.id,
        "SHARE_FILE",
        &file_id.to_string(),
        &ip,
    )
    .await;

    tracing::info!(
        user_id = %user.id,
        file_id = %file_id,
        recipient = %recipient_email,
        role = %role,
        "File shared"
    );

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "ok",
        "message": "File shared successfully"
    })))
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/files/{id}/share/{user_id}
// ─────────────────────────────────────────────────────────────────────────────

/// Remove a share. Only the file owner can revoke access.
pub async fn remove_share(
    pool: web::Data<PgPool>,
    user: AuthUser,
    path: web::Path<(Uuid, Uuid)>,
) -> Result<HttpResponse, AppError> {
    let (file_id, target_user_id) = path.into_inner();

    // Verify ownership
    let _owner_id: Option<Uuid> =
        sqlx::query_scalar("SELECT owner_id FROM files WHERE id = $1 AND owner_id = $2")
            .bind(file_id)
            .bind(user.id)
            .fetch_optional(pool.get_ref())
            .await
            .map_err(AppError::Database)?
            .ok_or(AppError::NotFound)?;

    let deleted = sqlx::query("DELETE FROM file_shares WHERE file_id = $1 AND user_id = $2")
        .bind(file_id)
        .bind(target_user_id)
        .execute(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

    if deleted.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    tracing::info!(
        user_id = %user.id,
        file_id = %file_id,
        target_user = %target_user_id,
        "Share revoked"
    );

    Ok(HttpResponse::NoContent().finish())
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/files/{id}/shares
// ─────────────────────────────────────────────────────────────────────────────

/// List all shares for a given file. The caller must own the file.
pub async fn list_file_shares(
    pool: web::Data<PgPool>,
    user: AuthUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let file_id = path.into_inner();

    // Verify ownership
    let _owner_id: Option<Uuid> =
        sqlx::query_scalar("SELECT owner_id FROM files WHERE id = $1 AND owner_id = $2")
            .bind(file_id)
            .bind(user.id)
            .fetch_optional(pool.get_ref())
            .await
            .map_err(AppError::Database)?
            .ok_or(AppError::NotFound)?;

    let rows: Vec<FileShareRow> = sqlx::query_as::<_, FileShareRow>(
        "SELECT
            fs.id,
            u.id    AS user_id,
            u.full_name AS user_full_name,
            u.email AS user_email,
            fs.role,
            fs.created_at
         FROM file_shares fs
         JOIN users u ON u.id = fs.user_id
         WHERE fs.file_id = $1
         ORDER BY fs.created_at DESC",
    )
    .bind(file_id)
    .fetch_all(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    let entries: Vec<FileShareEntry> = rows.into_iter().map(|r| r.into()).collect();

    Ok(HttpResponse::Ok().json(entries))
}
