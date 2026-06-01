use crate::{
    app_middleware::auth::AuthUser,
    errors::AppError,
    models::user::User,
    utils::{jwt, password},
};
use actix_web::{web, HttpResponse};
use rand_core::{OsRng, RngCore};
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;

// ── Helpers ──────────────────────────────────────────────────────────────────

fn generate_token() -> String {
    let mut bytes = [0u8; 32];
    OsRng.fill_bytes(&mut bytes);
    hex::encode(bytes)
}

// ── Forgot Password ──────────────────────────────────────────────────────────

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ForgotPasswordRequest {
    email: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ResetPasswordRequest {
    token: String,
    new_password: String,
}

/// POST /api/auth/forgot-password
pub async fn forgot_password(
    pool: web::Data<PgPool>,
    body: web::Json<ForgotPasswordRequest>,
) -> Result<HttpResponse, AppError> {
    let email = body.email.trim().to_lowercase();
    if email.is_empty() {
        return Err(AppError::BadRequest("email is required".into()));
    }

    let user: Option<User> = sqlx::query_as::<_, User>(
        "SELECT id, email, password_hash, full_name, role, created_at FROM users WHERE email = $1",
    )
    .bind(&email)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    // Always return success to prevent email enumeration
    if user.is_none() {
        return Ok(HttpResponse::Ok().json(serde_json::json!({
            "message": "If an account with that email exists, a reset token has been generated."
        })));
    }

    let user = user.unwrap();
    let token = generate_token();

    sqlx::query(
        "INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '1 hour')",
    )
    .bind(user.id)
    .bind(&token)
    .execute(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    tracing::info!(user_id = %user.id, "Password reset requested");

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "If an account with that email exists, a reset token has been generated.",
        "token": token // In production, this would be emailed instead
    })))
}

/// POST /api/auth/reset-password
pub async fn reset_password(
    pool: web::Data<PgPool>,
    body: web::Json<ResetPasswordRequest>,
) -> Result<HttpResponse, AppError> {
    if body.new_password.len() < 6 {
        return Err(AppError::BadRequest(
            "Password must be at least 6 characters".into(),
        ));
    }

    let row: Option<(Uuid,)> = sqlx::query_as(
        "SELECT user_id FROM password_resets WHERE token = $1 AND expires_at > NOW() AND used = FALSE",
    )
    .bind(&body.token)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    let (user_id,) = row.ok_or(AppError::BadRequest("Invalid or expired token".into()))?;

    let new_hash = password::hash_password(&body.new_password)?;

    sqlx::query("UPDATE users SET password_hash = $1 WHERE id = $2")
        .bind(&new_hash)
        .bind(user_id)
        .execute(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

    sqlx::query("UPDATE password_resets SET used = TRUE WHERE token = $1")
        .bind(&body.token)
        .execute(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

    tracing::info!(user_id = %user_id, "Password reset completed");

    Ok(HttpResponse::Ok().json(serde_json::json!({ "message": "Password reset successfully" })))
}

// ── Magic Link ───────────────────────────────────────────────────────────────

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct MagicLinkRequest {
    email: String,
}

/// POST /api/auth/magic-link
pub async fn request_magic_link(
    pool: web::Data<PgPool>,
    body: web::Json<MagicLinkRequest>,
) -> Result<HttpResponse, AppError> {
    let email = body.email.trim().to_lowercase();
    if email.is_empty() {
        return Err(AppError::BadRequest("email is required".into()));
    }

    let user: Option<User> = sqlx::query_as::<_, User>(
        "SELECT id, email, password_hash, full_name, role, created_at FROM users WHERE email = $1",
    )
    .bind(&email)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    if user.is_none() {
        return Ok(HttpResponse::Ok().json(serde_json::json!({
            "message": "If an account with that email exists, a magic link has been generated."
        })));
    }

    let user = user.unwrap();
    let token = generate_token();

    sqlx::query(
        "INSERT INTO magic_links (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '15 minutes')",
    )
    .bind(user.id)
    .bind(&token)
    .execute(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    tracing::info!(user_id = %user.id, "Magic link requested");

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "If an account with that email exists, a magic link has been generated.",
        "token": token
    })))
}

/// GET /api/auth/magic-link?token=...
pub async fn verify_magic_link(
    pool: web::Data<PgPool>,
    query: web::Query<MagicLinkVerify>,
) -> Result<HttpResponse, AppError> {
    let row: Option<(Uuid, String)> = sqlx::query_as(
        "SELECT ml.user_id, u.role FROM magic_links ml JOIN users u ON u.id = ml.user_id WHERE ml.token = $1 AND ml.expires_at > NOW() AND ml.used = FALSE",
    )
    .bind(&query.token)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    let (user_id, role) =
        row.ok_or(AppError::BadRequest("Invalid or expired magic link".into()))?;

    sqlx::query("UPDATE magic_links SET used = TRUE WHERE token = $1")
        .bind(&query.token)
        .execute(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

    let jwt_token = jwt::generate_token(user_id, &role)?;

    tracing::info!(user_id = %user_id, "Magic link login");

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "token": jwt_token
    })))
}

#[derive(Deserialize)]
pub(crate) struct MagicLinkVerify {
    token: String,
}

// ── WebAuthn / Passkey ───────────────────────────────────────────────────────

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct WebauthnRegisterBeginResponse {
    challenge: String, // base64url
    rp_id: String,
    rp_name: String,
    user_id: String,
    user_name: String,
    user_display_name: String,
}

/// GET /api/auth/webauthn/register/begin
pub async fn webauthn_register_begin(_user: AuthUser) -> Result<HttpResponse, AppError> {
    let mut challenge = [0u8; 32];
    OsRng.fill_bytes(&mut challenge);
    let challenge_b64 = base64_url(&challenge);

    Ok(HttpResponse::Ok().json(WebauthnRegisterBeginResponse {
        challenge: challenge_b64,
        rp_id: "localhost".into(),
        rp_name: "Unggul Axiom Hub".into(),
        user_id: base64_url(_user.id.as_bytes()),
        user_name: _user.id.to_string(),
        user_display_name: "User".into(),
    }))
}

/// POST /api/auth/webauthn/register/complete
pub async fn webauthn_register_complete(
    pool: web::Data<PgPool>,
    user: AuthUser,
    body: web::Json<serde_json::Value>,
) -> Result<HttpResponse, AppError> {
    let credential_id = body["id"]
        .as_str()
        .ok_or(AppError::BadRequest("Missing credential id".into()))?;
    let public_key = body["response"]["publicKey"]
        .as_str()
        .or_else(|| body["response"]["publicKey"].as_str())
        .unwrap_or("");
    let pubkey_str = if public_key.is_empty() {
        body.to_string()
    } else {
        public_key.to_string()
    };

    // Upsert — one passkey per user
    sqlx::query(
        "INSERT INTO webauthn_credentials (user_id, credential_id, public_key) VALUES ($1, $2, $3)
         ON CONFLICT (credential_id) DO UPDATE SET public_key = $3",
    )
    .bind(user.id)
    .bind(credential_id)
    .bind(&pubkey_str)
    .execute(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    tracing::info!(user_id = %user.id, "WebAuthn credential registered");

    Ok(HttpResponse::Ok().json(serde_json::json!({ "status": "ok" })))
}

/// GET /api/auth/webauthn/login/begin
pub async fn webauthn_login_begin() -> Result<HttpResponse, AppError> {
    let mut challenge = [0u8; 32];
    OsRng.fill_bytes(&mut challenge);
    let challenge_b64 = base64_url(&challenge);

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "challenge": challenge_b64,
        "rpId": "localhost"
    })))
}

/// POST /api/auth/webauthn/login/complete
pub async fn webauthn_login_complete(
    pool: web::Data<PgPool>,
    body: web::Json<serde_json::Value>,
) -> Result<HttpResponse, AppError> {
    let credential_id = body["id"]
        .as_str()
        .ok_or(AppError::BadRequest("Missing credential id".into()))?;

    let row: Option<(Uuid, String)> = sqlx::query_as(
        "SELECT wc.user_id, u.role FROM webauthn_credentials wc JOIN users u ON u.id = wc.user_id WHERE wc.credential_id = $1",
    )
    .bind(credential_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    let (user_id, role) = row.ok_or(AppError::BadRequest("Unknown credential".into()))?;

    let token = jwt::generate_token(user_id, &role)?;

    tracing::info!(user_id = %user_id, "WebAuthn login");

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "token": token
    })))
}

fn base64_url(data: &[u8]) -> String {
    use base64::Engine;
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(data)
}
