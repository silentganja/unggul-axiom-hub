use crate::{
    app_middleware::admin::AdminUser,
    errors::AppError,
    models::user::{self, User, UserProfile},
    utils::{jwt, password},
};
use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

// ── Hardcoded admin credentials ──────────────────────────────────────────────

const ADMIN_USERNAME: &str = "mirza";
const ADMIN_PASSWORD: &str = "396500Ja!";

// ── Request / Response shapes ────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct AdminLoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminLoginResponse {
    pub token: String,
    pub username: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateUserRequest {
    pub email: String,
    pub password: String,
    pub full_name: String,
    pub role: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateUserRequest {
    pub full_name: Option<String>,
    pub role: Option<String>,
    pub password: Option<String>, // Optional — only set if the admin wants to reset it
}

// ── POST /api/admin/login ────────────────────────────────────────────────────

pub async fn admin_login(body: web::Json<AdminLoginRequest>) -> Result<HttpResponse, AppError> {
    if body.username != ADMIN_USERNAME || body.password != ADMIN_PASSWORD {
        return Err(AppError::Unauthorized);
    }

    // Issue an admin-panel JWT with a reserved role that normal login never grants
    let token = jwt::generate_admin_token(&body.username)?;

    Ok(HttpResponse::Ok().json(AdminLoginResponse {
        token,
        username: body.username.clone(),
    }))
}

// ── GET /api/admin/users ─────────────────────────────────────────────────────

pub async fn list_users(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
) -> Result<HttpResponse, AppError> {
    let users: Vec<UserProfile> = sqlx::query_as::<_, User>(
        "SELECT id, email, password_hash, full_name, role, active, created_at
         FROM users
         ORDER BY created_at DESC",
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(AppError::Database)?
    .into_iter()
    .map(|u| u.into())
    .collect();

    Ok(HttpResponse::Ok().json(users))
}

// ── POST /api/admin/users ────────────────────────────────────────────────────

pub async fn create_user(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    body: web::Json<CreateUserRequest>,
) -> Result<HttpResponse, AppError> {
    let email = body.email.trim().to_lowercase();
    let full_name = body.full_name.trim().to_string();
    let role = body.role.trim().to_string();

    // Validate
    if email.is_empty() || body.password.is_empty() || full_name.is_empty() {
        return Err(AppError::BadRequest(
            "email, password, and full_name are required".into(),
        ));
    }

    if !user::VALID_ROLES.contains(&role.as_str()) {
        return Err(AppError::BadRequest(format!(
            "role must be one of: {}",
            user::VALID_ROLES.join(", ")
        )));
    }

    // Hash the password
    let password_hash = password::hash_password(&body.password)?;

    let user: User = sqlx::query_as::<_, User>(
        "INSERT INTO users (email, password_hash, full_name, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, password_hash, full_name, role, active, created_at",
    )
    .bind(&email)
    .bind(&password_hash)
    .bind(&full_name)
    .bind(&role)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| {
        // Check for unique violation on email
        if let sqlx::Error::Database(ref db_err) = e {
            if db_err.constraint() == Some("users_email_key") {
                return AppError::Conflict("A user with this email already exists".into());
            }
        }
        AppError::Database(e)
    })?;

    tracing::info!(
        admin = %ADMIN_USERNAME,
        user_id = %user.id,
        email = %email,
        role = %role,
        "Admin created new user"
    );

    let profile: UserProfile = user.into();
    Ok(HttpResponse::Created().json(profile))
}

// ── PUT /api/admin/users/{id} ────────────────────────────────────────────────

pub async fn update_user(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    path: web::Path<Uuid>,
    body: web::Json<UpdateUserRequest>,
) -> Result<HttpResponse, AppError> {
    let user_id = path.into_inner();

    // Fetch the existing user first
    let existing: Option<User> = sqlx::query_as::<_, User>(
        "SELECT id, email, password_hash, full_name, role, active, created_at
         FROM users WHERE id = $1",
    )
    .bind(user_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    let existing = existing.ok_or(AppError::NotFound)?;

    // Determine new values (fall back to existing)
    let new_full_name = body
        .full_name
        .as_deref()
        .map(|s| s.trim().to_string())
        .unwrap_or(existing.full_name);
    let new_role = body
        .role
        .as_deref()
        .map(|s| s.trim().to_string())
        .unwrap_or(existing.role);

    if !user::VALID_ROLES.contains(&new_role.as_str()) {
        return Err(AppError::BadRequest(format!(
            "role must be one of: {}",
            user::VALID_ROLES.join(", ")
        )));
    }

    // Hash new password if provided, otherwise keep existing
    let password_hash = if let Some(ref plain) = body.password {
        if plain.is_empty() {
            existing.password_hash
        } else {
            password::hash_password(plain)?
        }
    } else {
        existing.password_hash
    };

    let user: User = sqlx::query_as::<_, User>(
        "UPDATE users
         SET full_name = $1, role = $2, password_hash = $3
         WHERE id = $4
         RETURNING id, email, password_hash, full_name, role, active, created_at",
    )
    .bind(&new_full_name)
    .bind(&new_role)
    .bind(&password_hash)
    .bind(user_id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    tracing::info!(
        admin = %ADMIN_USERNAME,
        user_id = %user.id,
        "Admin updated user"
    );

    let profile: UserProfile = user.into();
    Ok(HttpResponse::Ok().json(profile))
}

// ── DELETE /api/admin/users/{id} ─────────────────────────────────────────────

pub async fn delete_user(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let user_id = path.into_inner();

    // Prevent deleting the last chief/director
    let target_role: Option<String> = sqlx::query_scalar("SELECT role FROM users WHERE id = $1")
        .bind(user_id)
        .fetch_optional(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

    if let Some(ref role) = target_role {
        if user::role_level(role) >= 3 {
            let high_count: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM users WHERE role IN ('chief', 'director')",
            )
            .fetch_one(pool.get_ref())
            .await
            .map_err(AppError::Database)?;
            if high_count <= 1 {
                return Err(AppError::Conflict(
                    "Cannot delete the last chief/director user".into(),
                ));
            }
        }
    }

    let deleted = sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(user_id)
        .execute(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

    if deleted.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    tracing::info!(
        admin = %ADMIN_USERNAME,
        user_id = %user_id,
        "Admin deleted user"
    );

    Ok(HttpResponse::NoContent().finish())
}

// ── Tier 1: GET /api/admin/dashboard ────────────────────────────────────────

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminDashboard {
    total_users: i64,
    active_users: i64,
    total_files: i64,
    total_folders: i64,
    storage_used_bytes: i64,
    pending_governance: i64,
    locked_files: i64,
    shared_files: i64,
}

pub async fn dashboard(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
) -> Result<HttpResponse, AppError> {
    let total_users: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users")
        .fetch_one(pool.get_ref())
        .await
        .map_err(AppError::Database)?;
    let active_users: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users WHERE active = TRUE")
        .fetch_one(pool.get_ref())
        .await
        .map_err(AppError::Database)?;
    let total_files: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM files WHERE deleted_at IS NULL AND is_folder = FALSE",
    )
    .fetch_one(pool.get_ref())
    .await
    .map_err(AppError::Database)?;
    let total_folders: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM files WHERE deleted_at IS NULL AND is_folder = TRUE",
    )
    .fetch_one(pool.get_ref())
    .await
    .map_err(AppError::Database)?;
    let storage_used_bytes: i64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(size_bytes), 0) FROM files WHERE deleted_at IS NULL",
    )
    .fetch_one(pool.get_ref())
    .await
    .map_err(AppError::Database)?;
    let pending_governance: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM governance_requests WHERE status = 'PENDING'")
            .fetch_one(pool.get_ref())
            .await
            .map_err(AppError::Database)?;
    let locked_files: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM files WHERE locked_by IS NOT NULL AND deleted_at IS NULL",
    )
    .fetch_one(pool.get_ref())
    .await
    .map_err(AppError::Database)?;
    let shared_files: i64 = sqlx::query_scalar("SELECT COUNT(DISTINCT file_id) FROM file_shares")
        .fetch_one(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

    Ok(HttpResponse::Ok().json(AdminDashboard {
        total_users,
        active_users,
        total_files,
        total_folders,
        storage_used_bytes,
        pending_governance,
        locked_files,
        shared_files,
    }))
}

// ── Tier 1: GET /api/admin/users/{id}/files ─────────────────────────────────

pub async fn user_files(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let user_id = path.into_inner();

    let files: Vec<crate::models::file::FileNode> = sqlx::query_as(
        "SELECT id, parent_id, owner_id, name, is_folder,
                size_bytes, mime_type, classification, created_at, updated_at, locked_by, locked_at
         FROM files WHERE owner_id = $1 AND deleted_at IS NULL
         ORDER BY is_folder DESC, name ASC LIMIT 500",
    )
    .bind(user_id)
    .fetch_all(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    Ok(HttpResponse::Ok().json(files))
}

// ── Tier 1: POST /api/admin/users/{id}/reset-password ───────────────────────

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AdminResetPasswordRequest {
    new_password: String,
}

pub async fn reset_user_password(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    path: web::Path<Uuid>,
    body: web::Json<AdminResetPasswordRequest>,
) -> Result<HttpResponse, AppError> {
    let user_id = path.into_inner();
    if body.new_password.len() < 6 {
        return Err(AppError::BadRequest(
            "Password must be at least 6 characters".into(),
        ));
    }
    let hash = password::hash_password(&body.new_password)?;
    let updated = sqlx::query("UPDATE users SET password_hash = $1 WHERE id = $2")
        .bind(&hash)
        .bind(user_id)
        .execute(pool.get_ref())
        .await
        .map_err(AppError::Database)?;
    if updated.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }
    Ok(HttpResponse::Ok().json(serde_json::json!({ "status": "ok" })))
}

// ── Tier 1: POST /api/admin/users/{id}/toggle-active ────────────────────────

pub async fn toggle_user_active(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let user_id = path.into_inner();
    // Prevent deactivating the last active chief/director
    let target: Option<(String, bool)> =
        sqlx::query_as("SELECT role, active FROM users WHERE id = $1")
            .bind(user_id)
            .fetch_optional(pool.get_ref())
            .await
            .map_err(AppError::Database)?;
    let (role, currently_active) = target.ok_or(AppError::NotFound)?;

    if currently_active && user::role_level(&role) >= 3 {
        let high_active: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM users WHERE role IN ('chief','director') AND active = TRUE AND id != $1",
        ).bind(user_id).fetch_one(pool.get_ref()).await.map_err(AppError::Database)?;
        if high_active == 0 {
            return Err(AppError::Conflict(
                "Cannot deactivate the last active chief/director".into(),
            ));
        }
    }

    sqlx::query("UPDATE users SET active = NOT active WHERE id = $1")
        .bind(user_id)
        .execute(pool.get_ref())
        .await
        .map_err(AppError::Database)?;
    Ok(HttpResponse::Ok().json(serde_json::json!({ "status": "ok" })))
}

// ── Tier 1: DELETE /api/admin/files/{id}/force ──────────────────────────────

pub async fn force_delete_file(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let file_id = path.into_inner();
    let deleted = sqlx::query("DELETE FROM files WHERE id = $1")
        .bind(file_id)
        .execute(pool.get_ref())
        .await
        .map_err(AppError::Database)?;
    if deleted.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }
    tracing::warn!(admin = %ADMIN_USERNAME, file_id = %file_id, "Admin force-deleted file");
    Ok(HttpResponse::NoContent().finish())
}

// ═════════════════════════════════════════════════════════════════════════════
// Tier 2: System Configuration
// ═════════════════════════════════════════════════════════════════════════════

#[derive(serde::Serialize, sqlx::FromRow)]
struct ConfigRow {
    key: String,
    value: String,
}

pub async fn get_config(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
) -> Result<HttpResponse, AppError> {
    let rows: Vec<ConfigRow> = sqlx::query_as("SELECT key, value FROM system_config")
        .fetch_all(pool.get_ref())
        .await
        .map_err(AppError::Database)?;
    let map: std::collections::HashMap<String, String> =
        rows.into_iter().map(|r| (r.key, r.value)).collect();
    Ok(HttpResponse::Ok().json(map))
}

#[derive(Deserialize)]
struct UpdateConfigRequest {
    key: String,
    value: String,
}

pub async fn update_config(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    body: web::Json<UpdateConfigRequest>,
) -> Result<HttpResponse, AppError> {
    sqlx::query("INSERT INTO system_config (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()")
        .bind(&body.key)
        .bind(&body.value)
        .execute(pool.get_ref())
        .await
        .map_err(AppError::Database)?;
    Ok(HttpResponse::Ok().json(serde_json::json!({ "status": "ok" })))
}

// ═════════════════════════════════════════════════════════════════════════════
// Tier 2: Governance Admin
// ═════════════════════════════════════════════════════════════════════════════

pub async fn admin_governance_list(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
) -> Result<HttpResponse, AppError> {
    let requests: Vec<crate::models::governance::GovernanceRequestResponse> = sqlx::query_as(
        "SELECT gr.id, gr.type, gr.title, gr.description, gr.status, gr.requested_by,
                u1.full_name AS requested_by_name, u1.email AS requested_by_email,
                gr.reviewed_by, u2.full_name AS reviewed_by_name,
                gr.target_file_id, f.name AS target_file_name,
                gr.metadata, gr.created_at, gr.updated_at
         FROM governance_requests gr
         JOIN users u1 ON u1.id = gr.requested_by
         LEFT JOIN users u2 ON u2.id = gr.reviewed_by
         LEFT JOIN files f ON f.id = gr.target_file_id
         ORDER BY CASE gr.status WHEN 'PENDING' THEN 0 ELSE 1 END, gr.created_at DESC
         LIMIT 500",
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(AppError::Database)?;
    Ok(HttpResponse::Ok().json(requests))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ForceApproveRequest {
    reviewer_id: Uuid,
}

pub async fn force_approve(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    path: web::Path<Uuid>,
    body: web::Json<ForceApproveRequest>,
) -> Result<HttpResponse, AppError> {
    let request_id = path.into_inner();
    // Mark as approved by the given reviewer
    sqlx::query("UPDATE governance_requests SET status = 'APPROVED', reviewed_by = $1, updated_at = NOW() WHERE id = $2")
        .bind(body.reviewer_id)
        .bind(request_id)
        .execute(pool.get_ref())
        .await
        .map_err(AppError::Database)?;
    // Execute the associated action (simplified: same logic as approve_request)
    let req_type: Option<String> =
        sqlx::query_scalar("SELECT type FROM governance_requests WHERE id = $1")
            .bind(request_id)
            .fetch_optional(pool.get_ref())
            .await
            .map_err(AppError::Database)?
            .flatten();
    let file_id: Option<Uuid> =
        sqlx::query_scalar("SELECT target_file_id FROM governance_requests WHERE id = $1")
            .bind(request_id)
            .fetch_optional(pool.get_ref())
            .await
            .map_err(AppError::Database)?
            .flatten();
    if let (Some(fid), Some(rt)) = (file_id, req_type) {
        match rt.as_str() {
            "FILE_LOCK" => {
                sqlx::query("UPDATE files SET locked_by = (SELECT requested_by FROM governance_requests WHERE id = $1), locked_at = NOW() WHERE id = $2")
                    .bind(request_id)
                    .bind(fid)
                    .execute(pool.get_ref())
                    .await
                    .map_err(AppError::Database)?;
            }
            "FILE_UNLOCK" => {
                sqlx::query("UPDATE files SET locked_by = NULL, locked_at = NULL WHERE id = $1")
                    .bind(fid)
                    .execute(pool.get_ref())
                    .await
                    .map_err(AppError::Database)?;
            }
            _ => {}
        }
    }
    Ok(HttpResponse::Ok().json(serde_json::json!({ "status": "approved" })))
}

// ═════════════════════════════════════════════════════════════════════════════
// Tier 2: Storage Breakdown
// ═════════════════════════════════════════════════════════════════════════════

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct UserStorageRow {
    user_id: Uuid,
    full_name: String,
    email: String,
    role: String,
    file_count: i64,
    total_bytes: i64,
}

pub async fn storage_breakdown(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
) -> Result<HttpResponse, AppError> {
    let rows: Vec<UserStorageRow> = sqlx::query_as(
        "SELECT u.id AS user_id, u.full_name, u.email, u.role,
                COUNT(f.id) AS file_count, COALESCE(SUM(f.size_bytes), 0) AS total_bytes
         FROM users u LEFT JOIN files f ON f.owner_id = u.id AND f.deleted_at IS NULL
         GROUP BY u.id ORDER BY total_bytes DESC",
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(AppError::Database)?;
    Ok(HttpResponse::Ok().json(rows))
}

// ═════════════════════════════════════════════════════════════════════════════
// Tier 2: Bulk User Operations
// ═════════════════════════════════════════════════════════════════════════════

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct BulkCreateUser {
    email: String,
    password: String,
    full_name: String,
    role: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct BulkUsersRequest {
    users: Vec<BulkCreateUser>,
}

pub async fn bulk_create_users(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    body: web::Json<BulkUsersRequest>,
) -> Result<HttpResponse, AppError> {
    let mut created = 0u32;
    let mut errors: Vec<String> = Vec::new();
    for u in &body.users {
        if u.email.is_empty() || u.password.is_empty() || u.full_name.is_empty() {
            errors.push(format!("{}: missing fields", u.email));
            continue;
        }
        if !user::VALID_ROLES.contains(&u.role.as_str()) {
            errors.push(format!("{}: invalid role", u.email));
            continue;
        }
        let hash = password::hash_password(&u.password)?;
        let result = sqlx::query(
            "INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4)",
        )
        .bind(&u.email)
        .bind(&hash)
        .bind(&u.full_name)
        .bind(&u.role)
        .execute(pool.get_ref())
        .await;
        match result {
            Ok(_) => created += 1,
            Err(e) => errors.push(format!("{}: {}", u.email, e)),
        }
    }
    Ok(HttpResponse::Ok().json(serde_json::json!({ "created": created, "errors": errors })))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct BulkRoleUpdate {
    user_ids: Vec<Uuid>,
    new_role: String,
}

pub async fn bulk_role_update(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    body: web::Json<BulkRoleUpdate>,
) -> Result<HttpResponse, AppError> {
    if !user::VALID_ROLES.contains(&body.new_role.as_str()) {
        return Err(AppError::BadRequest("Invalid role".into()));
    }
    if body.user_ids.is_empty() {
        return Err(AppError::BadRequest("user_ids required".into()));
    }
    let mut updated = 0u32;
    for uid in &body.user_ids {
        let r = sqlx::query("UPDATE users SET role = $1 WHERE id = $2")
            .bind(&body.new_role)
            .bind(uid)
            .execute(pool.get_ref())
            .await
            .map_err(AppError::Database)?;
        updated += r.rows_affected() as u32;
    }
    Ok(HttpResponse::Ok().json(serde_json::json!({ "updated": updated })))
}
