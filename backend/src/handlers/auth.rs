use crate::{
    app_middleware::{auth::AuthUser, rate_limit},
    errors::AppError,
    models::user::{User, UserProfile},
    utils::{jwt, password, redis::RedisClient},
};
use actix_web::{web, HttpRequest, HttpResponse};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

// ── Request / Response shapes ─────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginResponse {
    pub token: String,
    pub refresh_token: String,
    pub user: UserProfile,
}

// ── Handler ───────────────────────────────────────────────────────────────────

pub async fn login(
    pool: web::Data<PgPool>,
    redis_client: web::Data<RedisClient>,
    config: web::Data<crate::AppConfig>,
    req: HttpRequest,
    body: web::Json<LoginRequest>,
) -> Result<HttpResponse, AppError> {
    let ip = req
        .peer_addr()
        .map(|a| a.ip().to_string())
        .unwrap_or_else(|| "unknown".to_string());
    rate_limit::check_login_rate_limit(&redis_client, &ip).await?;

    let email = body.email.trim().to_lowercase();
    if email.is_empty() || body.password.is_empty() {
        return Err(AppError::BadRequest(
            "email and password are required".into(),
        ));
    }
    if email.len() > 255 {
        return Err(AppError::BadRequest("Email is too long".into()));
    }
    if body.password.len() > 128 {
        return Err(AppError::BadRequest("Password is too long".into()));
    }

    let user: Option<User> = sqlx::query_as::<_, User>(
        "SELECT id, email, password_hash, full_name, role, active, \
         storage_quota_bytes, avatar_data, department, supervisor_id, notification_prefs, created_at \
         FROM users WHERE email = $1 LIMIT 1",
    )
    .bind(&email)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    let user = user.ok_or(AppError::Unauthorized)?;

    if !user.active {
        tracing::warn!(email = %email, "Login attempt on deactivated account");
        return Err(AppError::Unauthorized);
    }

    let password_ok = password::verify_password(&body.password, &user.password_hash)?;

    if !password_ok {
        tracing::warn!(email = %email, ip = %ip, "Failed login attempt");
        return Err(AppError::Unauthorized);
    }

    let access_token = jwt::generate_token(&config.jwt_secret, user.id, &user.role)?;
    let refresh_token = jwt::generate_refresh_token();

    crate::utils::redis::store_refresh_token_async(
        &redis_client,
        &refresh_token,
        &user.id.to_string(),
        &user.role,
    )
    .await?;

    // ── Audit log: LOGIN ──────────────────────────────────────────────────────
    let _ = crate::handlers::files::write_audit_log_internal(
        pool.get_ref(),
        user.id,
        "LOGIN",
        &user.id.to_string(),
        &ip,
    )
    .await;

    // Track the session
    let token_prefix = refresh_token
        .get(..16)
        .unwrap_or(&refresh_token)
        .to_string();
    let user_agent = req
        .headers()
        .get("User-Agent")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("Unknown")
        .to_string();
    let _ = sqlx::query(
        "INSERT INTO user_sessions (user_id, token_prefix, device, ip) VALUES ($1, $2, $3, $4)",
    )
    .bind(user.id)
    .bind(&token_prefix)
    .bind(&user_agent)
    .bind(&ip)
    .execute(pool.get_ref())
    .await;

    tracing::info!(
        user_id = %user.id,
        role = %user.role,
        ip = %ip,
        "Successful login"
    );

    Ok(HttpResponse::Ok().json(LoginResponse {
        token: access_token,
        refresh_token,
        user: user.into(),
    }))
}

// ── GET /api/auth/me ─────────────────────────────────────────────────────────

pub async fn me(pool: web::Data<PgPool>, user: AuthUser) -> Result<HttpResponse, AppError> {
    // Try the extended query (with optional profile columns from migrations 9018-9021).
    // If those columns don't exist yet, or the user is not found, fall back to the basic query.
    let extended = sqlx::query_as::<_, UserProfile>(
        "SELECT u.id, u.email, u.full_name, u.role, u.active, u.storage_quota_bytes, \
                COALESCE(u.avatar_data, '') AS avatar_data, \
                COALESCE(u.department, '') AS department, \
                COALESCE(u.notification_prefs, '{}'::jsonb) AS notification_prefs, \
                u.created_at, \
                (SELECT su.full_name FROM users su WHERE su.id = u.supervisor_id) AS supervisor_name \
         FROM users u WHERE u.id = $1 LIMIT 1",
    )
    .bind(user.id)
    .fetch_optional(pool.get_ref())
    .await;

    let profile: UserProfile = match extended {
        Ok(Some(p)) => p,
        Ok(None) => return Err(AppError::NotFound),
        Err(_) => {
            // Extended columns may not exist - fall back to basic query
            let basic = sqlx::query_as::<_, UserProfile>(
                "SELECT u.id, u.email, u.full_name, u.role, u.active, \
                        u.storage_quota_bytes, u.created_at, \
                        ''::text AS avatar_data, ''::text AS department, \
                        '{}'::jsonb AS notification_prefs, \
                        NULL::text AS supervisor_name \
                 FROM users u WHERE u.id = $1 LIMIT 1",
            )
            .bind(user.id)
            .fetch_optional(pool.get_ref())
            .await
            .map_err(AppError::Database)?;

            basic.ok_or(AppError::NotFound)?
        }
    };

    Ok(HttpResponse::Ok().json(profile))
}

// ── GET /api/auth/me/permissions ─────────────────────────────────────────────
// Returns the effective permission set for the current user — union of
// base-role implicit grants + all custom role-group permissions.

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct EffectivePermissionsResponse {
    /// All permission keys this user currently holds.
    permissions: Vec<String>,
    /// Groups the user belongs to (for debugging/transparency).
    groups: Vec<serde_json::Value>,
}

pub async fn me_permissions(
    pool: web::Data<PgPool>,
    user: AuthUser,
) -> Result<HttpResponse, AppError> {
    // Get the user's custom groups
    let groups: Vec<serde_json::Value> = sqlx::query_as::<_, (uuid::Uuid, String, String)>(
        "SELECT rg.id, rg.name, rg.description
         FROM role_groups rg
         JOIN user_role_groups urg ON urg.role_group_id = rg.id
         WHERE urg.user_id = $1
         ORDER BY rg.name",
    )
    .bind(user.id)
    .fetch_all(pool.get_ref())
    .await
    .map_err(AppError::Database)?
    .into_iter()
    .map(|(id, name, desc)| {
        serde_json::json!({
            "id": id,
            "name": name,
            "description": desc,
        })
    })
    .collect();

    // Collect all permission keys from custom groups
    let custom_keys: Vec<String> = sqlx::query_scalar(
        "SELECT DISTINCT p.key
         FROM permissions p
         JOIN role_group_permissions rgp ON rgp.permission_id = p.id
         JOIN user_role_groups urg ON urg.role_group_id = rgp.role_group_id
         WHERE urg.user_id = $1
         ORDER BY p.key",
    )
    .bind(user.id)
    .fetch_all(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    // Build the effective set: base role implicit + custom group permissions + direct
    let implicit = crate::models::user::implicit_permissions(pool.get_ref(), &user.role)
        .await
        .unwrap_or_default();
    let mut all_perms: std::collections::BTreeSet<String> = implicit.into_iter().collect();
    for k in custom_keys {
        all_perms.insert(k);
    }
    // Also include direct user_permissions
    let direct_keys: Vec<String> = sqlx::query_scalar(
        "SELECT p.key FROM permissions p
         JOIN user_permissions up ON up.permission_id = p.id
         WHERE up.user_id = $1",
    )
    .bind(user.id)
    .fetch_all(pool.get_ref())
    .await
    .map_err(AppError::Database)?;
    for k in direct_keys {
        all_perms.insert(k);
    }

    Ok(HttpResponse::Ok().json(EffectivePermissionsResponse {
        permissions: all_perms.into_iter().collect(),
        groups,
    }))
}

// ── PUT /api/auth/profile ───────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProfileRequest {
    pub full_name: Option<String>,
    pub current_password: Option<String>,
    pub new_password: Option<String>,
    pub department: Option<String>,
    /// `None` = don't change. `Some(None)` = clear. `Some(Some(id))` = set.
    #[serde(default, deserialize_with = "deserialize_optional_option")]
    pub supervisor_id: Option<Option<Uuid>>,
}

// Custom deserializer: treats missing field as None (don't change),
// null as Some(None) (clear), and a UUID string as Some(Some(id)) (set).
fn deserialize_optional_option<'de, D>(deserializer: D) -> Result<Option<Option<Uuid>>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum Helper {
        Null,
        Id(Uuid),
    }
    Ok(match Option::<Helper>::deserialize(deserializer)? {
        None => None,                           // field missing → don't change
        Some(Helper::Null) => Some(None),       // null → clear
        Some(Helper::Id(id)) => Some(Some(id)), // UUID → set
    })
}

pub async fn update_profile(
    pool: web::Data<PgPool>,
    redis_client: web::Data<RedisClient>,
    user: AuthUser,
    body: web::Json<UpdateProfileRequest>,
) -> Result<HttpResponse, AppError> {
    if let Some(ref name) = body.full_name {
        if name.trim().len() > 255 {
            return Err(AppError::BadRequest(
                "Full name must be 255 characters or less".into(),
            ));
        }
    }
    if let Some(ref dept) = body.department {
        if dept.trim().len() > 255 {
            return Err(AppError::BadRequest(
                "Department must be 255 characters or less".into(),
            ));
        }
    }
    if let Some(ref pwd) = body.new_password {
        if pwd.len() > 128 {
            return Err(AppError::BadRequest(
                "New password must be 128 characters or less".into(),
            ));
        }
    }
    if let Some(ref pwd) = body.current_password {
        if pwd.len() > 128 {
            return Err(AppError::BadRequest(
                "Current password must be 128 characters or less".into(),
            ));
        }
    }

    let existing: Option<User> = sqlx::query_as::<_, User>(
        "SELECT id, email, password_hash, full_name, role, active, \
         storage_quota_bytes, avatar_data, department, supervisor_id, notification_prefs, created_at \
         FROM users WHERE id = $1 LIMIT 1",
    )
    .bind(user.id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    let existing = existing.ok_or(AppError::NotFound)?;

    let new_full_name = body
        .full_name
        .as_deref()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or(existing.full_name);

    let new_department = body
        .department
        .as_deref()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    // Supervisor: None = don't change, Some(None) = clear, Some(Some(id)) = set
    let new_supervisor = match body.supervisor_id {
        None => existing.supervisor_id,
        Some(None) => None,
        Some(Some(id)) => Some(id),
    };

    // Prevent self-reference
    if new_supervisor == Some(user.id) {
        return Err(AppError::BadRequest(
            "You cannot set yourself as your own supervisor".into(),
        ));
    }

    let mut password_changed = false;

    let new_password_hash = if let (Some(current), Some(new)) = (
        body.current_password.as_deref(),
        body.new_password.as_deref(),
    ) {
        if new.is_empty() {
            return Err(AppError::BadRequest(
                "new_password must not be empty".into(),
            ));
        }
        password::validate_password_strength(new)
            .map_err(|msg| AppError::BadRequest(msg.into()))?;
        let ok = password::verify_password(current, &existing.password_hash)?;
        if !ok {
            return Err(AppError::Unauthorized);
        }
        password_changed = true;
        password::hash_password(new)?
    } else if body.new_password.is_some() || body.current_password.is_some() {
        return Err(AppError::BadRequest(
            "Both current_password and new_password are required to change password".into(),
        ));
    } else {
        existing.password_hash
    };

    // Try extended UPDATE (with department + extended RETURNING).
    // If columns don't exist yet, fall back to basic UPDATE.
    let result = sqlx::query_as::<_, User>(
        "UPDATE users SET full_name = $1, password_hash = $2, department = $3, supervisor_id = $4 WHERE id = $5
         RETURNING id, email, password_hash, full_name, role, active, \
                  storage_quota_bytes, avatar_data, department, supervisor_id, notification_prefs, created_at",
    )
    .bind(&new_full_name)
    .bind(&new_password_hash)
    .bind(&new_department)
    .bind(new_supervisor)
    .bind(user.id)
    .fetch_one(pool.get_ref())
    .await;

    let updated: User = match result {
        Ok(u) => u,
        Err(_) => {
            // Fallback: basic columns only
            sqlx::query_as::<_, User>(
                "UPDATE users SET full_name = $1, password_hash = $2 WHERE id = $3
                 RETURNING id, email, password_hash, full_name, role, active, \
                          storage_quota_bytes, created_at",
            )
            .bind(&new_full_name)
            .bind(&new_password_hash)
            .bind(user.id)
            .fetch_one(pool.get_ref())
            .await
            .map_err(AppError::Database)?
        }
    };

    if password_changed {
        let _ = crate::utils::redis::revoke_user_tokens_async(&redis_client, &user.id.to_string())
            .await;
        tracing::info!(user_id = %user.id, "All sessions revoked after password change");
    }

    tracing::info!(user_id = %user.id, "Profile updated");

    let profile: UserProfile = updated.into();
    Ok(HttpResponse::Ok().json(profile))
}

// ── POST /api/auth/avatar ────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AvatarUploadRequest {
    pub avatar_data: String,
}

pub async fn upload_avatar(
    pool: web::Data<PgPool>,
    config: web::Data<crate::AppConfig>,
    user: AuthUser,
    body: web::Json<AvatarUploadRequest>,
) -> Result<HttpResponse, AppError> {
    let data_url = body.avatar_data.trim();

    // Validate it looks like a data URL
    if !data_url.starts_with("data:") || !data_url.contains("base64,") {
        return Err(AppError::BadRequest("Invalid data URL format".into()));
    }

    // Extract the base64 payload
    let b64_part = data_url
        .split(',')
        .nth(1)
        .ok_or(AppError::BadRequest("Invalid data URL format".into()))?;

    // Decode and check size
    use base64::Engine;
    let decoded = base64::engine::general_purpose::STANDARD
        .decode(b64_part)
        .map_err(|_| AppError::BadRequest("Invalid base64 encoding".into()))?;

    if decoded.len() > 1_500_000 {
        return Err(AppError::BadRequest(
            "Avatar image must be less than 1.5 MB".into(),
        ));
    }

    // Write decoded binary data to disk
    let avatar_dir = std::path::Path::new(&config.storage_path).join("avatars");
    if !avatar_dir.exists() {
        tokio::fs::create_dir_all(&avatar_dir)
            .await
            .map_err(|e| AppError::Internal(anyhow::Error::from(e)))?;
    }
    let avatar_file = avatar_dir.join(format!("{}.bin", user.id));
    tokio::fs::write(&avatar_file, &decoded)
        .await
        .map_err(|e| AppError::Internal(anyhow::Error::from(e)))?;

    let avatar_url = format!("/api/auth/avatar/{}", user.id);

    // Store the endpoint path in the DB
    sqlx::query("UPDATE users SET avatar_data = $1 WHERE id = $2")
        .bind(&avatar_url)
        .bind(user.id)
        .execute(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

    // Return the updated profile
    let profile: UserProfile = sqlx::query_as::<_, UserProfile>(
        "SELECT u.id, u.email, u.full_name, u.role, u.active, u.storage_quota_bytes, \
                u.avatar_data, u.department, u.notification_prefs, u.created_at, \
                (SELECT su.full_name FROM users su WHERE su.id = u.supervisor_id) AS supervisor_name \
         FROM users u WHERE u.id = $1",
    )
    .bind(user.id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    tracing::info!(user_id = %user.id, "Avatar uploaded to disk and database updated");
    Ok(HttpResponse::Ok().json(profile))
}

// ── DELETE /api/auth/avatar ──────────────────────────────────────────────────

pub async fn delete_avatar(
    pool: web::Data<PgPool>,
    config: web::Data<crate::AppConfig>,
    user: AuthUser,
) -> Result<HttpResponse, AppError> {
    sqlx::query("UPDATE users SET avatar_data = NULL WHERE id = $1")
        .bind(user.id)
        .execute(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

    // Delete avatar binary from disk
    let avatar_file = std::path::Path::new(&config.storage_path)
        .join("avatars")
        .join(format!("{}.bin", user.id));
    if avatar_file.exists() {
        let _ = tokio::fs::remove_file(avatar_file).await;
    }

    let profile: UserProfile = sqlx::query_as::<_, UserProfile>(
        "SELECT u.id, u.email, u.full_name, u.role, u.active, u.storage_quota_bytes, \
                u.avatar_data, u.department, u.notification_prefs, u.created_at, \
                (SELECT su.full_name FROM users su WHERE su.id = u.supervisor_id) AS supervisor_name \
         FROM users u WHERE u.id = $1",
    )
    .bind(user.id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    tracing::info!(user_id = %user.id, "Avatar deleted");
    Ok(HttpResponse::Ok().json(profile))
}

// ── GET /api/auth/avatar/{user_id} ───────────────────────────────────────────

fn detect_mime_type(bytes: &[u8]) -> &'static str {
    if bytes.starts_with(&[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) {
        "image/png"
    } else if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        "image/jpeg"
    } else if bytes.starts_with(&[0x47, 0x49, 0x46, 0x38]) {
        "image/gif"
    } else if bytes.starts_with(&[0x52, 0x49, 0x46, 0x46])
        && bytes.len() > 11
        && &bytes[8..12] == b"WEBP"
    {
        "image/webp"
    } else {
        "image/jpeg" // fallback
    }
}

pub async fn get_avatar(
    config: web::Data<crate::AppConfig>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let user_id = path.into_inner();
    let avatar_file = std::path::Path::new(&config.storage_path)
        .join("avatars")
        .join(format!("{}.bin", user_id));

    if !avatar_file.exists() {
        return Err(AppError::NotFound);
    }

    let bytes = tokio::fs::read(&avatar_file)
        .await
        .map_err(|e| AppError::Internal(anyhow::Error::from(e)))?;

    let mime = detect_mime_type(&bytes);

    Ok(HttpResponse::Ok().content_type(mime).body(bytes))
}

// ── GET /api/auth/notification-prefs ────────────────────────────────────────

pub async fn get_notification_prefs(
    pool: web::Data<PgPool>,
    user: AuthUser,
) -> Result<HttpResponse, AppError> {
    let prefs: Option<serde_json::Value> =
        sqlx::query_scalar("SELECT notification_prefs FROM users WHERE id = $1")
            .bind(user.id)
            .fetch_optional(pool.get_ref())
            .await
            .map_err(AppError::Database)?
            .flatten();

    Ok(HttpResponse::Ok().json(prefs.unwrap_or(serde_json::Value::Object(Default::default()))))
}

// ── PUT /api/auth/notification-prefs ────────────────────────────────────────

pub async fn update_notification_prefs(
    pool: web::Data<PgPool>,
    user: AuthUser,
    body: web::Json<serde_json::Value>,
) -> Result<HttpResponse, AppError> {
    if !body.is_object() {
        return Err(AppError::BadRequest("Expected a JSON object".into()));
    }

    sqlx::query("UPDATE users SET notification_prefs = $1 WHERE id = $2")
        .bind(&*body)
        .bind(user.id)
        .execute(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

    Ok(HttpResponse::Ok().json(body.into_inner()))
}

// ── GET /api/auth/colleagues ──────────────────────────────────────────────────
// Returns basic user info for supervisor/department selection in settings.

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ColleagueEntry {
    pub id: Uuid,
    pub full_name: String,
    pub role: String,
    pub department: Option<String>,
}

pub async fn list_colleagues(
    pool: web::Data<PgPool>,
    _user: AuthUser,
) -> Result<HttpResponse, AppError> {
    let colleagues: Vec<ColleagueEntry> =
        sqlx::query_as("SELECT id, full_name, role, department FROM users ORDER BY full_name")
            .fetch_all(pool.get_ref())
            .await
            .map_err(AppError::Database)?;

    Ok(HttpResponse::Ok().json(colleagues))
}

// ── GET /api/auth/team ───────────────────────────────────────────────────────
// Returns the current user's direct reports (users whose supervisor_id = current user).

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct TeamMember {
    pub id: Uuid,
    pub full_name: String,
    pub email: String,
    pub role: String,
    pub active: bool,
    pub department: Option<String>,
}

pub async fn my_team(pool: web::Data<PgPool>, user: AuthUser) -> Result<HttpResponse, AppError> {
    let members: Vec<TeamMember> = sqlx::query_as(
        "SELECT id, full_name, email, role, active, department
         FROM users
         WHERE supervisor_id = $1
         ORDER BY full_name",
    )
    .bind(user.id)
    .fetch_all(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    Ok(HttpResponse::Ok().json(members))
}

// ── GET /api/auth/sessions ──────────────────────────────────────────────────

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct UserSession {
    pub id: Uuid,
    pub device: String,
    pub ip: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub last_seen_at: chrono::DateTime<chrono::Utc>,
}

pub async fn list_sessions(
    pool: web::Data<PgPool>,
    user: AuthUser,
) -> Result<HttpResponse, AppError> {
    let sessions: Vec<UserSession> = sqlx::query_as(
        "SELECT id, device, ip, created_at, last_seen_at \
         FROM user_sessions WHERE user_id = $1 \
         ORDER BY last_seen_at DESC",
    )
    .bind(user.id)
    .fetch_all(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    Ok(HttpResponse::Ok().json(sessions))
}

// ── DELETE /api/auth/sessions/{id} ──────────────────────────────────────────

pub async fn delete_session(
    pool: web::Data<PgPool>,
    user: AuthUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let session_id = path.into_inner();

    let deleted = sqlx::query("DELETE FROM user_sessions WHERE id = $1 AND user_id = $2")
        .bind(session_id)
        .bind(user.id)
        .execute(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

    if deleted.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    tracing::info!(user_id = %user.id, session_id = %session_id, "Session deleted");
    Ok(HttpResponse::Ok().json(serde_json::json!({ "status": "deleted" })))
}
