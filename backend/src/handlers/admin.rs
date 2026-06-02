use crate::{
    app_middleware::admin::AdminUser,
    errors::AppError,
    models::user::{self, User, UserProfile},
    utils::{jwt, password},
    AppConfig,
};
use actix_web::{web, HttpRequest, HttpResponse};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

// â”€â”€ Request / Response shapes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    pub storage_quota_bytes: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateUserRequest {
    pub full_name: Option<String>,
    pub role: Option<String>,
    pub password: Option<String>,
    pub storage_quota_bytes: Option<i64>,
}

// â”€â”€ POST /api/admin/login â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

pub async fn admin_login(
    config: web::Data<AppConfig>,
    body: web::Json<AdminLoginRequest>,
) -> Result<HttpResponse, AppError> {
    if body.username != config.admin_username || body.password != config.admin_password {
        return Err(AppError::Unauthorized);
    }

    // Issue an admin-panel JWT with a reserved role that normal login never grants
    let token = jwt::generate_admin_token(&body.username)?;

    Ok(HttpResponse::Ok().json(AdminLoginResponse {
        token,
        username: body.username.clone(),
    }))
}

// â”€â”€ GET /api/admin/users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

pub async fn list_users(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
) -> Result<HttpResponse, AppError> {
    // #[allow(dead_code)] — selects 7 of 12 columns; User struct has more fields
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

// â”€â”€ POST /api/admin/users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
        "INSERT INTO users (email, password_hash, full_name, role, storage_quota_bytes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, password_hash, full_name, role, active, storage_quota_bytes, created_at",
    )
    .bind(&email)
    .bind(&password_hash)
    .bind(&full_name)
    .bind(&role)
    .bind(body.storage_quota_bytes)
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
        admin = "admin",
        user_id = %user.id,
        email = %email,
        role = %role,
        "Admin created new user"
    );

    let profile: UserProfile = user.into();
    Ok(HttpResponse::Created().json(profile))
}

// â”€â”€ PUT /api/admin/users/{id} â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

pub async fn update_user(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    path: web::Path<Uuid>,
    body: web::Json<UpdateUserRequest>,
) -> Result<HttpResponse, AppError> {
    let user_id = path.into_inner();

    // Fetch the existing user first
    let existing: Option<User> = sqlx::query_as::<_, User>(
        "SELECT id, email, password_hash, full_name, role, active, storage_quota_bytes, created_at
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

    // Storage quota: explicit `null` clears it (use default), absent keeps existing
    let new_quota = if body.storage_quota_bytes.is_some() {
        body.storage_quota_bytes // can be Some(null) â†’ explicitly set to None
    } else {
        existing.storage_quota_bytes
    };

    let user: User = sqlx::query_as::<_, User>(
        "UPDATE users
         SET full_name = $1, role = $2, password_hash = $3, storage_quota_bytes = $4
         WHERE id = $5
         RETURNING id, email, password_hash, full_name, role, active, storage_quota_bytes, created_at",
    )
    .bind(&new_full_name)
    .bind(&new_role)
    .bind(&password_hash)
    .bind(new_quota)
    .bind(user_id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    tracing::info!(
        admin = "admin",
        user_id = %user.id,
        "Admin updated user"
    );

    let profile: UserProfile = user.into();
    Ok(HttpResponse::Ok().json(profile))
}

// â”€â”€ DELETE /api/admin/users/{id} â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

    // Prevent deletion of users who own files
    let file_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM files WHERE owner_id = $1")
        .bind(user_id)
        .fetch_one(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

    if file_count > 0 {
        return Err(AppError::Conflict(
            "User owns files. Delete or transfer files first.".into(),
        ));
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
        admin = "admin",
        user_id = %user_id,
        "Admin deleted user"
    );

    Ok(HttpResponse::NoContent().finish())
}

// â”€â”€ Tier 1: GET /api/admin/dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ Tier 1: GET /api/admin/users/{id}/files â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

pub async fn user_files(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let user_id = path.into_inner();

    let files: Vec<crate::models::file::FileNode> = sqlx::query_as(
        "SELECT id, parent_id, owner_id, name, is_folder,
                size_bytes, mime_type, classification, created_at, updated_at, locked_by, locked_at, lock_reason
         FROM files WHERE owner_id = $1 AND deleted_at IS NULL
         ORDER BY is_folder DESC, name ASC LIMIT 500",
    )
    .bind(user_id)
    .fetch_all(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    Ok(HttpResponse::Ok().json(files))
}

// â”€â”€ Tier 1: POST /api/admin/users/{id}/reset-password â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AdminResetPasswordRequest {
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

// â”€â”€ Tier 1: POST /api/admin/users/{id}/toggle-active â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

pub async fn toggle_user_active(
    pool: web::Data<PgPool>,
    redis_client: web::Data<crate::utils::redis::RedisClient>,
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

    // If deactivating, revoke all refresh tokens for this user
    if currently_active {
        let _ = crate::utils::redis::revoke_user_tokens_async(&redis_client, &user_id.to_string())
            .await;
        tracing::info!(user_id = %user_id, "User deactivated â€” tokens revoked");
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({ "status": "ok" })))
}

// â”€â”€ Tier 1: DELETE /api/admin/files/{id}/force â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

pub async fn list_all_shares(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
) -> Result<HttpResponse, AppError> {
    #[derive(serde::Serialize, sqlx::FromRow)]
    #[serde(rename_all = "camelCase")]
    struct AdminShareRow {
        id: Uuid,
        file_id: Uuid,
        file_name: String,
        owner_id: Uuid,
        owner_name: String,
        shared_with_id: Uuid,
        shared_with_name: String,
        shared_with_email: String,
        role: String,
        shared_by_id: Uuid,
        shared_by_name: String,
        created_at: chrono::DateTime<chrono::Utc>,
    }

    let shares: Vec<AdminShareRow> = sqlx::query_as(
        "SELECT
            fs.id,
            fs.file_id,
            f.name AS file_name,
            f.owner_id,
            u_owner.full_name AS owner_name,
            fs.user_id AS shared_with_id,
            u_user.full_name AS shared_with_name,
            u_user.email AS shared_with_email,
            fs.role,
            fs.shared_by AS shared_by_id,
            u_shared.full_name AS shared_by_name,
            fs.created_at
         FROM file_shares fs
         JOIN files f ON f.id = fs.file_id
         JOIN users u_owner ON u_owner.id = f.owner_id
         JOIN users u_user ON u_user.id = fs.user_id
         JOIN users u_shared ON u_shared.id = fs.shared_by
         ORDER BY fs.created_at DESC
         LIMIT 500",
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    Ok(HttpResponse::Ok().json(shares))
}

pub async fn revoke_share(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let share_id = path.into_inner();

    let deleted = sqlx::query("DELETE FROM file_shares WHERE id = $1")
        .bind(share_id)
        .execute(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

    if deleted.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    tracing::warn!(admin = "admin", share_id = %share_id, "Admin revoked share");

    Ok(HttpResponse::NoContent().finish())
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TransferOwnershipRequest {
    new_owner_id: Uuid,
}

pub async fn transfer_ownership(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    path: web::Path<Uuid>,
    body: web::Json<TransferOwnershipRequest>,
) -> Result<HttpResponse, AppError> {
    let file_id = path.into_inner();
    let new_owner_id = body.new_owner_id;

    // Verify the new owner exists
    let new_owner_exists: bool =
        sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)")
            .bind(new_owner_id)
            .fetch_one(pool.get_ref())
            .await
            .map_err(AppError::Database)?;

    if !new_owner_exists {
        return Err(AppError::BadRequest("New owner not found".into()));
    }

    // Verify the file exists
    let file_exists: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM files WHERE id = $1 AND deleted_at IS NULL)",
    )
    .bind(file_id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    if !file_exists {
        return Err(AppError::NotFound);
    }

    // Transfer ownership
    sqlx::query("UPDATE files SET owner_id = $1 WHERE id = $2")
        .bind(new_owner_id)
        .bind(file_id)
        .execute(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

    tracing::warn!(
        admin = "admin",
        file_id = %file_id,
        new_owner = %new_owner_id,
        "File ownership transferred"
    );

    Ok(HttpResponse::Ok().json(serde_json::json!({ "status": "ok" })))
}

pub async fn force_delete_file(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    config: web::Data<AppConfig>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let file_id = path.into_inner();
    // Read the file record first to verify it exists
    let file_exists: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM files WHERE id = $1)")
        .bind(file_id)
        .fetch_one(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

    if !file_exists {
        return Err(AppError::NotFound);
    }

    let deleted = sqlx::query("DELETE FROM files WHERE id = $1")
        .bind(file_id)
        .execute(pool.get_ref())
        .await
        .map_err(AppError::Database)?;
    if deleted.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    // Remove the physical file from disk
    let filepath = std::path::Path::new(&config.storage_path).join(file_id.to_string());
    if filepath.exists() {
        let _ = tokio::fs::remove_file(&filepath).await;
    }

    tracing::warn!(admin = "admin", file_id = %file_id, "Admin force-deleted file");
    Ok(HttpResponse::NoContent().finish())
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Tier 2: System Configuration
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
pub(crate) struct UpdateConfigRequest {
    key: String,
    value: String,
}

pub async fn update_config(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    body: web::Json<UpdateConfigRequest>,
) -> Result<HttpResponse, AppError> {
    sqlx::query(
        "INSERT INTO system_config (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()",
    )
    .bind(&body.key)
        .bind(&body.value)
        .execute(pool.get_ref())
        .await
        .map_err(AppError::Database)?;
    Ok(HttpResponse::Ok().json(serde_json::json!({ "status": "ok" })))
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Tier 2: Governance Admin
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AdminGovernanceQuery {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub status: Option<String>,
    #[serde(alias = "type")]
    pub r#type: Option<String>,
}

pub async fn admin_governance_list(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    query: web::Query<AdminGovernanceQuery>,
) -> Result<HttpResponse, AppError> {
    let page = query.page.unwrap_or(1).max(1);
    let per_page = query.per_page.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * per_page;

    // Validate status filter if provided
    if let Some(ref status) = query.status {
        if !["PENDING", "APPROVED", "REJECTED"].contains(&status.as_str()) {
            return Err(AppError::BadRequest(
                "Invalid status filter. Must be PENDING, APPROVED, or REJECTED".into(),
            ));
        }
    }

    // Validate type filter if provided
    if let Some(ref r#type) = query.r#type {
        if ![
            "FILE_LOCK",
            "FILE_UNLOCK",
            "CLASSIFICATION_UPGRADE",
            "CLASSIFICATION_DOWNGRADE",
            "FILE_MOVE",
            "FILE_DELETE",
        ]
        .contains(&r#type.as_str())
        {
            return Err(AppError::BadRequest("Invalid type filter".into()));
        }
    }

    let mut param_idx = 0u32;

    let status_clause = if let Some(ref status) = query.status {
        param_idx += 1;
        format!("AND gr.status = ${}", param_idx)
    } else {
        String::new()
    };

    let type_clause = if let Some(ref _type) = query.r#type {
        param_idx += 1;
        format!("AND gr.type = ${}", param_idx)
    } else {
        String::new()
    };

    let sql = format!(
        "SELECT gr.id, gr.type, gr.title, gr.description, gr.status,
                gr.requested_by, u1.full_name AS requested_by_name, u1.email AS requested_by_email,
                gr.reviewed_by, u2.full_name AS reviewed_by_name,
                gr.target_file_id, f.name AS target_file_name,
                gr.metadata, gr.review_note, gr.created_at, gr.updated_at
         FROM governance_requests gr
         JOIN users u1 ON u1.id = gr.requested_by
         LEFT JOIN users u2 ON u2.id = gr.reviewed_by
         LEFT JOIN files f ON f.id = gr.target_file_id
         WHERE 1=1
         {status_clause}
         {type_clause}
         ORDER BY CASE gr.status WHEN 'PENDING' THEN 0 ELSE 1 END, gr.created_at DESC
         LIMIT {per_page} OFFSET {offset}",
        status_clause = status_clause,
        type_clause = type_clause,
        per_page = per_page,
        offset = offset,
    );

    let count_sql = format!(
        "SELECT COUNT(*) FROM governance_requests gr
         WHERE 1=1
         {status_clause}
         {type_clause}",
        status_clause = status_clause,
        type_clause = type_clause,
    );

    let mut requests_query =
        sqlx::query_as::<_, crate::models::governance::GovernanceRequestResponse>(&sql);
    let mut count_query = sqlx::query_scalar::<_, i64>(&count_sql);

    if let Some(ref status) = query.status {
        requests_query = requests_query.bind(status);
        count_query = count_query.bind(status);
    }

    if let Some(ref r#type) = query.r#type {
        requests_query = requests_query.bind(r#type);
        count_query = count_query.bind(r#type);
    }

    let requests = requests_query
        .fetch_all(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

    let total: i64 = count_query
        .fetch_one(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

    let total_pages = if per_page > 0 {
        (total + per_page - 1) / per_page
    } else {
        0
    };

    Ok(
        HttpResponse::Ok().json(crate::models::governance::GovernanceListResponse {
            requests,
            total,
            page,
            per_page,
            total_pages,
        }),
    )
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ForceApproveRequest {
    reviewer_id: Uuid,
}

pub async fn force_approve(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    req: HttpRequest,
    path: web::Path<Uuid>,
    body: web::Json<ForceApproveRequest>,
) -> Result<HttpResponse, AppError> {
    let request_id = path.into_inner();

    // Check current status first — only proceed if PENDING
    let current_status: Option<String> =
        sqlx::query_scalar("SELECT status FROM governance_requests WHERE id = $1")
            .bind(request_id)
            .fetch_optional(pool.get_ref())
            .await
            .map_err(AppError::Database)?
            .flatten();

    match current_status.as_deref() {
        Some("PENDING") => {} // OK to proceed
        Some(other) => {
            return Err(AppError::Conflict(format!(
                "Request is already {} and cannot be force-approved",
                other
            )));
        }
        None => return Err(AppError::NotFound),
    }

    // Mark as approved by the given reviewer
    sqlx::query(
        "UPDATE governance_requests SET status = 'APPROVED', reviewed_by = $1, updated_at = NOW() WHERE id = $2 AND status = 'PENDING'",
    )
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
    let metadata: Option<serde_json::Value> =
        sqlx::query_scalar("SELECT metadata FROM governance_requests WHERE id = $1")
            .bind(request_id)
            .fetch_optional(pool.get_ref())
            .await
            .map_err(AppError::Database)?
            .flatten();
    if let (Some(fid), Some(rt)) = (file_id, req_type) {
        match rt.as_str() {
            "FILE_LOCK" => {
                let title: Option<String> =
                    sqlx::query_scalar("SELECT title FROM governance_requests WHERE id = $1")
                        .bind(request_id)
                        .fetch_optional(pool.get_ref())
                        .await
                        .map_err(AppError::Database)?
                        .flatten();
                sqlx::query(
                    "UPDATE files SET locked_by = (SELECT requested_by FROM governance_requests WHERE id = $1), locked_at = NOW(), lock_reason = $2 WHERE id = $3",
                )
                .bind(request_id)
                    .bind(title.as_deref())
                    .bind(fid)
                    .execute(pool.get_ref())
                    .await
                    .map_err(AppError::Database)?;
            }
            "FILE_UNLOCK" => {
                sqlx::query(
                    "UPDATE files SET locked_by = NULL, locked_at = NULL, lock_reason = NULL WHERE id = $1",
                )
                .bind(fid)
                    .execute(pool.get_ref())
                    .await
                    .map_err(AppError::Database)?;
            }
            "CLASSIFICATION_UPGRADE" | "CLASSIFICATION_DOWNGRADE" => {
                let meta = metadata.as_ref();
                if let Some(meta) = meta {
                    if let Some(new_class) = meta.get("newClassification").and_then(|v| v.as_str())
                    {
                        if crate::models::file::VALID_CLASSIFICATIONS.contains(&new_class) {
                            let _ =
                                sqlx::query("UPDATE files SET classification = $1 WHERE id = $2")
                                    .bind(new_class)
                                    .bind(fid)
                                    .execute(pool.get_ref())
                                    .await;
                        }
                    }
                }
            }
            "FILE_MOVE" => {
                if let Some(ref meta) = metadata {
                    if let Some(target_folder_id) =
                        meta.get("targetFolderId").and_then(|v| v.as_str())
                    {
                        if let Ok(folder_uuid) = uuid::Uuid::parse_str(target_folder_id) {
                            let _ = sqlx::query("UPDATE files SET parent_id = $1 WHERE id = $2")
                                .bind(folder_uuid)
                                .bind(fid)
                                .execute(pool.get_ref())
                                .await;
                        }
                    }
                }
            }
            "FILE_DELETE" => {
                let _ = sqlx::query("UPDATE files SET deleted_at = NOW() WHERE id = $1")
                    .bind(fid)
                    .execute(pool.get_ref())
                    .await;
            }
            _ => {}
        }
    }

    // ── Audit log ──────────────────────────────────────────────────────────────
    let ip = req.peer_addr().map(|a| a.to_string()).unwrap_or_default();
    let _ = crate::handlers::files::write_audit_log_internal(
        pool.get_ref(),
        body.reviewer_id,
        "GOVERNANCE_FORCE_APPROVE",
        &request_id.to_string(),
        &ip,
    )
    .await;

    // ── Emit notification ──────────────────────────────────────────────────
    let req_title: Option<String> =
        sqlx::query_scalar("SELECT title FROM governance_requests WHERE id = $1")
            .bind(request_id)
            .fetch_optional(pool.get_ref())
            .await
            .map_err(AppError::Database)?
            .flatten();
    if let Some(ref title) = req_title {
        crate::handlers::notifications::emit_notification(
            crate::models::notification::NotificationEvent::GovernanceUpdate {
                request_id: request_id.to_string(),
                status: "APPROVED".into(),
                title: title.clone(),
            },
        );
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({ "status": "approved" })))
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Tier 2: Storage Breakdown
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

#[derive(serde::Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
struct UserStorageRow {
    user_id: Uuid,
    full_name: String,
    email: String,
    role: String,
    file_count: i64,
    total_bytes: i64,
    storage_quota_bytes: Option<i64>,
}

pub async fn storage_breakdown(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
) -> Result<HttpResponse, AppError> {
    let rows: Vec<UserStorageRow> = sqlx::query_as(
        "SELECT u.id AS user_id, u.full_name, u.email, u.role,
                COUNT(f.id) AS file_count, COALESCE(SUM(f.size_bytes), 0) AS total_bytes,
                u.storage_quota_bytes
         FROM users u LEFT JOIN files f ON f.owner_id = u.id AND f.deleted_at IS NULL
         GROUP BY u.id ORDER BY total_bytes DESC",
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(AppError::Database)?;
    Ok(HttpResponse::Ok().json(rows))
}

// ===== Tier 2: Storage Analytics =====

#[derive(serde::Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
struct ClassificationBreakdown {
    classification: String,
    file_count: i64,
    bytes: i64,
}

#[derive(serde::Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
struct LargestFileEntry {
    id: Uuid,
    name: String,
    owner_name: String,
    size_bytes: i64,
    classification: String,
}

#[derive(serde::Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
struct StorageTrendEntry {
    date: String,
    bytes: i64,
    file_count: i64,
}

#[derive(serde::Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
struct OverQuotaUser {
    user_id: Uuid,
    full_name: String,
    email: String,
    used_bytes: i64,
    quota_bytes: i64,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct StorageAnalyticsResponse {
    by_classification: Vec<ClassificationBreakdown>,
    top_files: Vec<LargestFileEntry>,
    trend: Vec<StorageTrendEntry>,
    over_quota_users: Vec<OverQuotaUser>,
}

pub async fn storage_analytics(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
) -> Result<HttpResponse, AppError> {
    let by_classification: Vec<ClassificationBreakdown> = sqlx::query_as(
        "SELECT classification, COUNT(*) AS file_count, COALESCE(SUM(size_bytes), 0) AS bytes
         FROM files WHERE deleted_at IS NULL
         GROUP BY classification
         ORDER BY bytes DESC",
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    let largest_files: Vec<LargestFileEntry> = sqlx::query_as(
        "SELECT f.id, f.name, u.full_name AS owner_name, f.size_bytes, f.classification
         FROM files f
         JOIN users u ON u.id = f.owner_id
         WHERE f.deleted_at IS NULL AND f.is_folder = FALSE
         ORDER BY f.size_bytes DESC
         LIMIT 50",
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    let storage_trend: Vec<StorageTrendEntry> = sqlx::query_as(
        "SELECT
            d.date::TEXT AS date,
            COALESCE(SUM(f.size_bytes), 0) AS bytes,
            COUNT(f.id) AS file_count
         FROM generate_series(
            CURRENT_DATE - INTERVAL '29 days',
            CURRENT_DATE,
            INTERVAL '1 day'
         ) d(date)
         LEFT JOIN files f ON f.created_at::DATE = d.date::DATE AND f.deleted_at IS NULL
         GROUP BY d.date
         ORDER BY d.date ASC",
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    let over_quota_users: Vec<OverQuotaUser> = sqlx::query_as(
        "SELECT
            u.id AS user_id,
            u.full_name AS full_name,
            u.email,
            COALESCE(SUM(f.size_bytes), 0) AS used_bytes,
            u.storage_quota_bytes AS quota_bytes
         FROM users u
         LEFT JOIN files f ON f.owner_id = u.id AND f.deleted_at IS NULL
         WHERE u.storage_quota_bytes IS NOT NULL
         GROUP BY u.id
         HAVING COALESCE(SUM(f.size_bytes), 0) > u.storage_quota_bytes
         ORDER BY used_bytes DESC",
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    Ok(HttpResponse::Ok().json(StorageAnalyticsResponse {
        by_classification,
        top_files: largest_files,
        trend: storage_trend,
        over_quota_users,
    }))
}

// ===== Tier 2: User Detail =====

#[derive(serde::Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
struct RecentActivityEntry {
    id: Uuid,
    action: String,
    target_resource: Option<String>,
    created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct UserDetailResponse {
    id: Uuid,
    email: String,
    full_name: String,
    role: String,
    active: bool,
    storage_quota_bytes: Option<i64>,
    created_at: chrono::DateTime<chrono::Utc>,
    storage_used_bytes: i64,
    file_count: i64,
    folder_count: i64,
    shared_with_count: i64,
    last_login_at: Option<chrono::DateTime<chrono::Utc>>,
    recent_activity: Vec<RecentActivityEntry>,
    governance_total: i64,
    governance_pending: i64,
}

pub async fn user_detail(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let user_id = path.into_inner();

    let user: crate::models::user::User = sqlx::query_as::<_, crate::models::user::User>(
        "SELECT id, email, password_hash, full_name, role, active, storage_quota_bytes, created_at
         FROM users WHERE id = $1",
    )
    .bind(user_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(AppError::Database)?
    .ok_or(AppError::NotFound)?;

    let storage_used: i64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(size_bytes), 0) FROM files WHERE owner_id = $1 AND deleted_at IS NULL",
    )
    .bind(user_id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    let file_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM files WHERE owner_id = $1 AND deleted_at IS NULL AND is_folder = FALSE",
    )
    .bind(user_id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    let folder_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM files WHERE owner_id = $1 AND deleted_at IS NULL AND is_folder = TRUE",
    )
    .bind(user_id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    let shared_with_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM file_shares WHERE user_id = $1")
            .bind(user_id)
            .fetch_one(pool.get_ref())
            .await
            .map_err(AppError::Database)?;

    let last_login: Option<chrono::DateTime<chrono::Utc>> = sqlx::query_scalar(
        "SELECT created_at FROM audit_logs
         WHERE user_id = $1 AND action = 'LOGIN'
         ORDER BY created_at DESC
         LIMIT 1",
    )
    .bind(user_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(AppError::Database)?
    .flatten();

    let recent_activity: Vec<RecentActivityEntry> = sqlx::query_as(
        "SELECT id, action, target_resource, created_at
         FROM audit_logs
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 20",
    )
    .bind(user_id)
    .fetch_all(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    let governance_total: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM governance_requests WHERE requested_by = $1")
            .bind(user_id)
            .fetch_one(pool.get_ref())
            .await
            .map_err(AppError::Database)?;

    let governance_pending: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM governance_requests WHERE requested_by = $1 AND status = 'PENDING'",
    )
    .bind(user_id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    Ok(HttpResponse::Ok().json(UserDetailResponse {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        active: user.active,
        storage_quota_bytes: user.storage_quota_bytes,
        created_at: user.created_at,
        storage_used_bytes: storage_used,
        file_count,
        folder_count,
        shared_with_count,
        last_login_at: last_login,
        recent_activity,
        governance_total,
        governance_pending,
    }))
}

// ===== Tier 2: Bulk User Operations =====
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct BulkCreateUser {
    email: String,
    password: String,
    full_name: String,
    role: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct BulkUsersRequest {
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
        let hash = match password::hash_password(&u.password) {
            Ok(h) => h,
            Err(e) => {
                errors.push(format!("{}: password hash error: {}", u.email, e));
                continue;
            }
        };
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
pub(crate) struct BulkRoleUpdate {
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
    let mut tx = pool.begin().await.map_err(AppError::Database)?;
    for uid in &body.user_ids {
        let r = sqlx::query("UPDATE users SET role = $1 WHERE id = $2")
            .bind(&body.new_role)
            .bind(uid)
            .execute(&mut *tx)
            .await
            .map_err(AppError::Database)?;
        updated += r.rows_affected() as u32;
    }
    tx.commit().await.map_err(AppError::Database)?;
    Ok(HttpResponse::Ok().json(serde_json::json!({ "updated": updated })))
}

pub async fn admin_audit_logs(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    query: web::Query<crate::handlers::audit::AuditLogQuery>,
) -> Result<HttpResponse, AppError> {
    // Create an AuthUser with officer role to see all audit logs
    let admin_auth = crate::app_middleware::auth::AuthUser {
        id: Uuid::nil(),
        role: "officer".to_string(),
    };
    crate::handlers::audit::list_audit_logs(pool, admin_auth, query).await
}
