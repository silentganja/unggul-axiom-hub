use crate::{
    app_middleware::auth::AuthUser,
    app_middleware::rate_limit,
    errors::AppError,
    models::user::{User, UserProfile},
    utils::{jwt, password, redis},
};
use actix_web::{web, HttpRequest, HttpResponse};
use redis::aio::ConnectionManager;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

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

/// POST /api/auth/login
///
/// Authenticates a user by email + password, returns a short-lived access JWT
/// (15 minutes) and a long-lived opaque refresh token (7 days) for silent renewal.
///
/// Rate-limited to 5 attempts per minute per IP.
///
/// # Errors
/// - `400 Bad Request`  — missing or malformed JSON body
/// - `401 Unauthorized` — unknown email, wrong password, or deactivated account
/// - `429 Too Many`      — rate limit exceeded
/// - `500 Internal`     — database / hashing failure
pub async fn login(
    pool: web::Data<PgPool>,
    redis_conn: web::Data<ConnectionManager>,
    req: HttpRequest,
    body: web::Json<LoginRequest>,
) -> Result<HttpResponse, AppError> {
    // ── Rate limiting ───────────────────────────────────────────────────────────
    let ip = req
        .peer_addr()
        .map(|a| a.ip().to_string())
        .unwrap_or_else(|| "unknown".to_string());
    let mut conn = redis_conn.get_ref().clone();
    rate_limit::check_login_rate_limit(&mut conn, &ip).await?;

    // Basic input sanitisation
    let email = body.email.trim().to_lowercase();
    if email.is_empty() || body.password.is_empty() {
        return Err(AppError::BadRequest(
            "email and password are required".into(),
        ));
    }

    // ── 1. Fetch user from database ───────────────────────────────────────────
    let user: Option<User> = sqlx::query_as::<_, User>(
        "SELECT id, email, password_hash, full_name, role, active, created_at \
         FROM users WHERE email = $1 LIMIT 1",
    )
    .bind(&email)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    let user = user.ok_or(AppError::Unauthorized)?;

    // ── 1.5 Check account is active ──────────────────────────────────────────
    if !user.active {
        tracing::warn!(email = %email, "Login attempt on deactivated account");
        return Err(AppError::Unauthorized);
    }

    // ── 2. Verify password ────────────────────────────────────────────────────
    let password_ok = password::verify_password(&body.password, &user.password_hash)?;

    if !password_ok {
        tracing::warn!(
            email = %email,
            ip = %ip,
            "Failed login attempt"
        );
        return Err(AppError::Unauthorized);
    }

    // ── 3. Issue tokens ──────────────────────────────────────────────────────
    let access_token = jwt::generate_token(user.id, &user.role)?;
    let refresh_token = jwt::generate_refresh_token();

    // Store refresh token in Redis
    redis::store_refresh_token(
        &mut conn,
        &refresh_token,
        &user.id.to_string(),
        &user.role,
    )
    .await
    .map_err(|e| AppError::Redis(e.to_string()))?;

    tracing::info!(
        user_id = %user.id,
        role    = %user.role,
        ip      = %ip,
        "Successful login"
    );

    Ok(HttpResponse::Ok().json(LoginResponse {
        token: access_token,
        refresh_token,
        user: user.into(),
    }))
}

// ── GET /api/auth/me ─────────────────────────────────────────────────────────

/// Returns the currently authenticated user's profile.
/// Used by the frontend to validate tokens and hydrate the session.
///
/// # Errors
/// - `401 Unauthorized` — missing or invalid JWT
/// - `404 Not Found`    — user no longer exists in database
pub async fn me(pool: web::Data<PgPool>, user: AuthUser) -> Result<HttpResponse, AppError> {
    let profile: Option<UserProfile> = sqlx::query_as::<_, User>(
        "SELECT id, email, password_hash, full_name, role, active, created_at \
         FROM users WHERE id = $1 LIMIT 1",
    )
    .bind(user.id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(AppError::Database)?
    .map(|u| u.into());

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
}

/// Update the authenticated user's own profile.
/// - `full_name` — optional new display name
/// - `current_password` + `new_password` — both required to change password
///
/// When the password is changed, all existing refresh tokens are revoked.
///
/// # Errors
/// - `401 Unauthorized` — missing or invalid JWT, or wrong current password
/// - `400 Bad Request` — validation failure
pub async fn update_profile(
    pool: web::Data<PgPool>,
    redis_conn: web::Data<ConnectionManager>,
    user: AuthUser,
    body: web::Json<UpdateProfileRequest>,
) -> Result<HttpResponse, AppError> {
    // Fetch current user row (we need the password hash for verification)
    let existing: Option<User> = sqlx::query_as::<_, User>(
        "SELECT id, email, password_hash, full_name, role, active, created_at \
         FROM users WHERE id = $1 LIMIT 1",
    )
    .bind(user.id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    let existing = existing.ok_or(AppError::NotFound)?;

    // Determine new full name
    let new_full_name = body
        .full_name
        .as_deref()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or(existing.full_name);

    // Track whether password is changing (to revoke tokens)
    let mut password_changed = false;

    // Determine new password hash
    let new_password_hash = if let (Some(current), Some(new)) = (
        body.current_password.as_deref(),
        body.new_password.as_deref(),
    ) {
        if new.is_empty() {
            return Err(AppError::BadRequest(
                "new_password must not be empty".into(),
            ));
        }
        // Verify current password
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
        "UPDATE users SET full_name = $1, password_hash = $2 WHERE id = $3
         RETURNING id, email, password_hash, full_name, role, active, created_at",
    )
    .bind(&new_full_name)
    .bind(&new_password_hash)
    .bind(user.id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    // If password was changed, revoke all refresh tokens for this user
    if password_changed {
        let mut conn = redis_conn.get_ref().clone();
        let _ = redis::revoke_user_tokens(&mut conn, &user.id.to_string()).await;
        tracing::info!(user_id = %user.id, "All sessions revoked after password change");
    }

    tracing::info!(user_id = %user.id, "Profile updated");

    let profile: UserProfile = updated.into();
    Ok(HttpResponse::Ok().json(profile))
}
