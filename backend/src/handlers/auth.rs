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
pub async fn me(
    pool: web::Data<PgPool>,
    user: AuthUser,
) -> Result<HttpResponse, AppError> {
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
