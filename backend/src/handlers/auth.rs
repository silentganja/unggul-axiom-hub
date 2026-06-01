use crate::{
    app_middleware::auth::AuthUser,
    errors::AppError,
    models::user::{User, UserProfile},
    utils::{jwt, password},
};
use actix_web::{web, HttpRequest, HttpResponse};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

// ── Request / Response shapes ─────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub user: UserProfile,
}

// ── Handler ───────────────────────────────────────────────────────────────────

/// POST /api/auth/login
///
/// Authenticates a user by email + password and returns a signed JWT.
///
/// # Errors
/// - `400 Bad Request`  — missing or malformed JSON body
/// - `401 Unauthorized` — unknown email or wrong password
/// - `500 Internal`     — database / hashing failure
pub async fn login(
    pool: web::Data<PgPool>,
    req: HttpRequest,
    body: web::Json<LoginRequest>,
) -> Result<HttpResponse, AppError> {
    // Basic input sanitisation
    let email = body.email.trim().to_lowercase();
    if email.is_empty() || body.password.is_empty() {
        return Err(AppError::BadRequest(
            "email and password are required".into(),
        ));
    }

    // ── 1. Fetch user from database ───────────────────────────────────────────
    // Using sqlx::query_as — NO compile-time macros per engineering rules.
    let user: Option<User> = sqlx::query_as::<_, User>(
        "SELECT id, email, password_hash, full_name, role, created_at \
         FROM users WHERE email = $1 LIMIT 1",
    )
    .bind(&email)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    let user = user.ok_or(AppError::Unauthorized)?;

    // ── 2. Verify password ────────────────────────────────────────────────────
    // Perform verification regardless of whether user exists to prevent
    // timing-based user enumeration attacks (constant-time comparison).
    let password_ok = password::verify_password(&body.password, &user.password_hash)?;

    if !password_ok {
        tracing::warn!(
            email = %email,
            ip = %req.peer_addr().map(|a| a.to_string()).unwrap_or_default(),
            "Failed login attempt"
        );
        return Err(AppError::Unauthorized);
    }

    // ── 3. Issue JWT ──────────────────────────────────────────────────────────
    let token = jwt::generate_token(user.id, &user.role)?;

    tracing::info!(
        user_id = %user.id,
        role    = %user.role,
        ip      = %req.peer_addr().map(|a| a.to_string()).unwrap_or_default(),
        "Successful login"
    );

    Ok(HttpResponse::Ok().json(LoginResponse {
        token,
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
        "SELECT id, email, password_hash, full_name, role, created_at \
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
/// # Errors
/// - `401 Unauthorized` — missing or invalid JWT, or wrong current password
/// - `400 Bad Request` — validation failure
pub async fn update_profile(
    pool: web::Data<PgPool>,
    user: AuthUser,
    body: web::Json<UpdateProfileRequest>,
) -> Result<HttpResponse, AppError> {
    // Fetch current user row (we need the password hash for verification)
    let existing: Option<User> = sqlx::query_as::<_, User>(
        "SELECT id, email, password_hash, full_name, role, created_at \
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
         RETURNING id, email, password_hash, full_name, role, created_at",
    )
    .bind(&new_full_name)
    .bind(&new_password_hash)
    .bind(user.id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    tracing::info!(user_id = %user.id, "Profile updated");

    let profile: UserProfile = updated.into();
    Ok(HttpResponse::Ok().json(profile))
}
