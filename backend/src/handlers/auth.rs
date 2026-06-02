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

    let access_token = jwt::generate_token(user.id, &user.role)?;
    let refresh_token = jwt::generate_refresh_token();

    crate::utils::redis::store_refresh_token_async(
        &redis_client,
        &refresh_token,
        &user.id.to_string(),
        &user.role,
    )
    .await?;

    // Track the session
    let token_prefix = refresh_token[..16].to_string();
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
    let profile: Option<UserProfile> = sqlx::query_as::<_, UserProfile>(
        "SELECT u.id, u.email, u.full_name, u.role, u.active, u.storage_quota_bytes, \
                u.avatar_data, u.department, u.notification_prefs, u.created_at, \
                (SELECT su.full_name FROM users su WHERE su.id = u.supervisor_id) AS supervisor_name \
         FROM users u WHERE u.id = $1 LIMIT 1",
    )
    .bind(user.id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    let profile = profile.ok_or(AppError::NotFound)?;

    Ok(HttpResponse::Ok().json(profile))
}

// ── PUT /api/auth/profile ───────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProfileRequest {
    pub full_name: Option<String>,
    pub current_password: Option<String>,
    pub new_password: Option<String>,
    pub department: Option<String>,
}

pub async fn update_profile(
    pool: web::Data<PgPool>,
    redis_client: web::Data<RedisClient>,
    user: AuthUser,
    body: web::Json<UpdateProfileRequest>,
) -> Result<HttpResponse, AppError> {
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

    let updated: User = sqlx::query_as::<_, User>(
        "UPDATE users SET full_name = $1, password_hash = $2, department = $3 WHERE id = $4
         RETURNING id, email, password_hash, full_name, role, active, \
                  storage_quota_bytes, avatar_data, department, supervisor_id, notification_prefs, created_at",
    )
    .bind(&new_full_name)
    .bind(&new_password_hash)
    .bind(&new_department)
    .bind(user.id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

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
    user: AuthUser,
    body: web::Json<AvatarUploadRequest>,
) -> Result<HttpResponse, AppError> {
    let data_url = body.avatar_data.trim();

    // Validate it looks like a data URL
    if !data_url.starts_with("data:") || !data_url.contains("base64,") {
        return Err(AppError::BadRequest("Invalid data URL format".into()));
    }

    // Extract the base64 payload
    let b64_part = data_url.split(',')
        .nth(1)
        .ok_or(AppError::BadRequest("Invalid data URL format".into()))?;

    // Decode and check size
    use base64::Engine;
    let decoded = base64::engine::general_purpose::STANDARD
        .decode(b64_part)
        .map_err(|_| AppError::BadRequest("Invalid base64 encoding".into()))?;

    if decoded.len() > 1_500_000 {
        return Err(AppError::BadRequest("Avatar image must be less than 1.5 MB".into()));
    }

    // Store the full data URL in the DB
    sqlx::query("UPDATE users SET avatar_data = $1 WHERE id = $2")
        .bind(data_url)
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

    tracing::info!(user_id = %user.id, "Avatar uploaded");
    Ok(HttpResponse::Ok().json(profile))
}

// ── DELETE /api/auth/avatar ──────────────────────────────────────────────────

pub async fn delete_avatar(
    pool: web::Data<PgPool>,
    user: AuthUser,
) -> Result<HttpResponse, AppError> {
    sqlx::query("UPDATE users SET avatar_data = NULL WHERE id = $1")
        .bind(user.id)
        .execute(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

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

// ── GET /api/auth/notification-prefs ────────────────────────────────────────

pub async fn get_notification_prefs(
    pool: web::Data<PgPool>,
    user: AuthUser,
) -> Result<HttpResponse, AppError> {
    let prefs: Option<serde_json::Value> = sqlx::query_scalar(
        "SELECT notification_prefs FROM users WHERE id = $1",
    )
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
