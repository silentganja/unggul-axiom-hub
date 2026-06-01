use crate::{
    app_middleware::{auth::AuthUser, rate_limit},
    errors::AppError,
    models::user::User,
    utils::{email, jwt, password, redis, redis::RedisClient},
};
use actix_web::{web, HttpResponse};
use rand_core::{OsRng, RngCore};
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;

fn generate_token() -> String {
    let mut bytes = [0u8; 32];
    OsRng.fill_bytes(&mut bytes);
    hex::encode(bytes)
}

// ── Token Refresh & Logout ───────────────────────────────────────────────────

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RefreshRequest {
    refresh_token: String,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct RefreshResponse {
    token: String,
    refresh_token: String,
}

pub async fn refresh(
    redis_client: web::Data<RedisClient>,
    body: web::Json<RefreshRequest>,
) -> Result<HttpResponse, AppError> {
    let result =
        redis::take_refresh_token_async(&redis_client, &body.refresh_token).await?;

    let Some((user_id, role)) = result else {
        tracing::warn!("Invalid or expired refresh token used");
        return Err(AppError::Unauthorized);
    };

    let user_uuid = Uuid::parse_str(&user_id).map_err(|_| AppError::Unauthorized)?;
    let access_token = jwt::generate_token(user_uuid, &role)?;
    let new_refresh_token = jwt::generate_refresh_token();

    redis::store_refresh_token_async(
        &redis_client,
        &new_refresh_token,
        &user_id,
        &role,
    ).await?;

    tracing::info!(user_id = %user_id, "Token refreshed");

    Ok(HttpResponse::Ok().json(RefreshResponse {
        token: access_token,
        refresh_token: new_refresh_token,
    }))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct LogoutRequest {
    refresh_token: Option<String>,
}

pub async fn logout(
    redis_client: web::Data<RedisClient>,
    user: AuthUser,
    body: web::Json<LogoutRequest>,
) -> Result<HttpResponse, AppError> {
    if let Some(ref rt) = body.refresh_token {
        let _ = redis::take_refresh_token_async(&redis_client, rt).await;
    }

    let _ = redis::revoke_user_tokens_async(&redis_client, &user.id.to_string()).await;

    tracing::info!(user_id = %user.id, "User logged out, tokens revoked");

    Ok(HttpResponse::Ok().json(serde_json::json!({ "status": "logged_out" })))
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

pub async fn forgot_password(
    pool: web::Data<PgPool>,
    redis_client: web::Data<RedisClient>,
    req: actix_web::HttpRequest,
    body: web::Json<ForgotPasswordRequest>,
) -> Result<HttpResponse, AppError> {
    let ip = req
        .peer_addr()
        .map(|a| a.ip().to_string())
        .unwrap_or_else(|| "unknown".to_string());
    rate_limit::check_sensitive_rate_limit(&redis_client, &ip).await?;

    let email_addr = body.email.trim().to_lowercase();
    if email_addr.is_empty() {
        return Err(AppError::BadRequest("email is required".into()));
    }

    let user: Option<User> = sqlx::query_as::<_, User>(
        "SELECT id, email, password_hash, full_name, role, active, created_at FROM users WHERE email = $1",
    )
    .bind(&email_addr)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    let Some(user) = user else {
        return Ok(HttpResponse::Ok().json(serde_json::json!({
            "message": "If an account with that email exists, a reset link has been sent."
        })));
    };

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

    email::send_password_reset(&user.email, &user.full_name, &token).await;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "If an account with that email exists, a reset link has been sent."
    })))
}

pub async fn reset_password(
    pool: web::Data<PgPool>,
    redis_client: web::Data<RedisClient>,
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

    let _ = redis::revoke_user_tokens_async(&redis_client, &user_id.to_string()).await;

    tracing::info!(user_id = %user_id, "Password reset completed, all sessions revoked");

    Ok(HttpResponse::Ok().json(serde_json::json!({ "message": "Password reset successfully" })))
}

// ── Magic Link ───────────────────────────────────────────────────────────────

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct MagicLinkRequest {
    email: String,
}

pub async fn request_magic_link(
    pool: web::Data<PgPool>,
    redis_client: web::Data<RedisClient>,
    req: actix_web::HttpRequest,
    body: web::Json<MagicLinkRequest>,
) -> Result<HttpResponse, AppError> {
    let ip = req
        .peer_addr()
        .map(|a| a.ip().to_string())
        .unwrap_or_else(|| "unknown".to_string());
    rate_limit::check_sensitive_rate_limit(&redis_client, &ip).await?;

    let email_addr = body.email.trim().to_lowercase();
    if email_addr.is_empty() {
        return Err(AppError::BadRequest("email is required".into()));
    }

    let user: Option<User> = sqlx::query_as::<_, User>(
        "SELECT id, email, password_hash, full_name, role, active, created_at FROM users WHERE email = $1",
    )
    .bind(&email_addr)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    if user.is_none() {
        return Ok(HttpResponse::Ok().json(serde_json::json!({
            "message": "If an account with that email exists, a magic link has been sent."
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

    email::send_magic_link(&user.email, &user.full_name, &token).await;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "If an account with that email exists, a magic link has been sent."
    })))
}

pub async fn verify_magic_link(
    pool: web::Data<PgPool>,
    redis_client: web::Data<RedisClient>,
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

    let access_token = jwt::generate_token(user_id, &role)?;
    let refresh_token = jwt::generate_refresh_token();

    redis::store_refresh_token_async(
        &redis_client,
        &refresh_token,
        &user_id.to_string(),
        &role,
    ).await?;

    tracing::info!(user_id = %user_id, "Magic link login");

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "token": access_token,
        "refreshToken": refresh_token
    })))
}

#[derive(Deserialize)]
pub(crate) struct MagicLinkVerify {
    token: String,
}

// ── WebAuthn / Passkey ───────────────────────────────────────────────────────

const WEBAUTHN_CHALLENGE_TTL: u64 = 300; // 5 minutes

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct WebauthnRegisterBeginResponse {
    challenge: String,
    rp_id: String,
    rp_name: String,
    user_id: String,
    user_name: String,
    user_display_name: String,
}

pub async fn webauthn_register_begin(
    redis_client: web::Data<RedisClient>,
    _user: AuthUser,
) -> Result<HttpResponse, AppError> {
    let mut challenge = [0u8; 32];
    OsRng.fill_bytes(&mut challenge);
    let challenge_b64 = base64_url(&challenge);

    let key = format!("webauthn:register:{}", _user.id);
    let _ = redis::redis_setex_async(&redis_client, &key, &challenge_b64, WEBAUTHN_CHALLENGE_TTL).await;

    Ok(HttpResponse::Ok().json(WebauthnRegisterBeginResponse {
        challenge: challenge_b64,
        rp_id: "localhost".into(),
        rp_name: "Unggul Axiom Hub".into(),
        user_id: base64_url(_user.id.as_bytes()),
        user_name: _user.id.to_string(),
        user_display_name: "User".into(),
    }))
}

pub async fn webauthn_register_complete(
    pool: web::Data<PgPool>,
    redis_client: web::Data<RedisClient>,
    user: AuthUser,
    body: web::Json<serde_json::Value>,
) -> Result<HttpResponse, AppError> {
    let client_challenge = body["response"]["clientDataJSON"]
        .as_str()
        .and_then(|json| {
            let decoded = base64_url_decode(json).ok()?;
            serde_json::from_slice::<serde_json::Value>(&decoded).ok()
        })
        .and_then(|v| v["challenge"].as_str().map(|s| s.to_string()));

    if let Some(ref chal) = client_challenge {
        let key = format!("webauthn:register:{}", user.id);
        let stored: Option<String> = redis::redis_get_async(&redis_client, &key).await.unwrap_or(None);

        if stored.as_ref() != Some(chal) {
            tracing::warn!(user_id = %user.id, "WebAuthn challenge mismatch");
            return Err(AppError::BadRequest("Challenge verification failed".into()));
        }

        let _ = redis::redis_del_async(&redis_client, &key).await;
    }

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

pub async fn webauthn_login_begin(
    redis_client: web::Data<RedisClient>,
) -> Result<HttpResponse, AppError> {
    let mut challenge = [0u8; 32];
    OsRng.fill_bytes(&mut challenge);
    let challenge_b64 = base64_url(&challenge);

    let session_id = generate_token();
    let key = format!("webauthn:login:{}", session_id);
    let _ = redis::redis_setex_async(&redis_client, &key, &challenge_b64, WEBAUTHN_CHALLENGE_TTL).await;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "challenge": challenge_b64,
        "rpId": "localhost",
        "sessionId": session_id
    })))
}

pub async fn webauthn_login_complete(
    pool: web::Data<PgPool>,
    redis_client: web::Data<RedisClient>,
    body: web::Json<serde_json::Value>,
) -> Result<HttpResponse, AppError> {
    let credential_id = body["id"]
        .as_str()
        .ok_or(AppError::BadRequest("Missing credential id".into()))?;

    let session_id = body["sessionId"]
        .as_str()
        .or_else(|| body.get("sessionId").and_then(|v| v.as_str()));

    if let Some(sid) = session_id {
        let key = format!("webauthn:login:{}", sid);

        let client_challenge = body["response"]["clientDataJSON"]
            .as_str()
            .and_then(|json| {
                let decoded = base64_url_decode(json).ok()?;
                serde_json::from_slice::<serde_json::Value>(&decoded).ok()
            })
            .and_then(|v| v["challenge"].as_str().map(|s| s.to_string()));

        if let Some(ref chal) = client_challenge {
            let stored: Option<String> =
                redis::redis_get_async(&redis_client, &key).await.unwrap_or(None);

            if stored.as_ref() != Some(chal) {
                tracing::warn!("WebAuthn login challenge mismatch");
                return Err(AppError::BadRequest("Challenge verification failed".into()));
            }

            let _ = redis::redis_del_async(&redis_client, &key).await;
        }
    }

    let row: Option<(Uuid, String)> = sqlx::query_as(
        "SELECT wc.user_id, u.role FROM webauthn_credentials wc JOIN users u ON u.id = wc.user_id WHERE wc.credential_id = $1",
    )
    .bind(credential_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    let (user_id, role) = row.ok_or(AppError::BadRequest("Unknown credential".into()))?;

    let access_token = jwt::generate_token(user_id, &role)?;
    let refresh_token = jwt::generate_refresh_token();

    redis::store_refresh_token_async(
        &redis_client,
        &refresh_token,
        &user_id.to_string(),
        &role,
    ).await?;

    tracing::info!(user_id = %user_id, "WebAuthn login");

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "token": access_token,
        "refreshToken": refresh_token
    })))
}

fn base64_url(data: &[u8]) -> String {
    use base64::Engine;
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(data)
}

fn base64_url_decode(input: &str) -> Result<Vec<u8>, String> {
    use base64::Engine;
    let b64 = input.replace('-', "+").replace('_', "/");
    let padded = match b64.len() % 4 {
        0 => b64,
        n => b64 + &"=".repeat(4 - n),
    };
    base64::engine::general_purpose::STANDARD
        .decode(&padded)
        .map_err(|e| e.to_string())
}
