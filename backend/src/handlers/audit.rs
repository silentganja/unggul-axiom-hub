use crate::{app_middleware::auth::AuthUser, errors::AppError};
use actix_web::{web, HttpResponse};
use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::PgPool;
use uuid::Uuid;

// ── Response shape ────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct AuditLogEntry {
    pub id: Uuid,
    pub user_id: Option<Uuid>,
    pub action: String,
    pub target_resource: Option<String>,
    pub ip_address: Option<String>,
    pub created_at: DateTime<Utc>,
}

// ── Handler ───────────────────────────────────────────────────────────────────

/// GET /api/audit
///
/// Returns audit log entries. Admins see all entries; staff see only their own.
///
/// # Errors
/// - `401 Unauthorized` — missing or invalid JWT
pub async fn list_audit_logs(
    pool: web::Data<PgPool>,
    user: AuthUser,
) -> Result<HttpResponse, AppError> {
    let is_admin = user.role == "admin";

    let entries: Vec<AuditLogEntry> = if is_admin {
        sqlx::query_as::<_, AuditLogEntry>(
            "SELECT id, user_id, action, target_resource, ip_address, created_at
             FROM audit_logs
             ORDER BY created_at DESC
             LIMIT 500",
        )
        .fetch_all(pool.get_ref())
        .await
        .map_err(AppError::Database)?
    } else {
        sqlx::query_as::<_, AuditLogEntry>(
            "SELECT id, user_id, action, target_resource, ip_address, created_at
             FROM audit_logs
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT 500",
        )
        .bind(user.id)
        .fetch_all(pool.get_ref())
        .await
        .map_err(AppError::Database)?
    };

    Ok(HttpResponse::Ok().json(entries))
}
