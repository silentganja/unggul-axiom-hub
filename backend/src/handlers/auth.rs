use crate::{
    app_middleware::{auth::AuthUser, rate_limit},
    errors::AppError,
    models::user::{User, UserProfile},
    utils::{jwt, password, redis::RedisClient},
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
        "SELECT id, email, password_hash, full_name, role, active, created_at \
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

pub async fn update_profile(
    pool: web::Data<PgPool>,
    redis_client: web::Data<RedisClient>,
    user: AuthUser,
    body: web::Json<UpdateProfileRequest>,
) -> Result<HttpResponse, AppError> {
    let existing: Option<User> = sqlx::query_as::<_, User>(
        "SELECT id, email, password_hash, full_name, role, active, created_at \
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
        "UPDATE users SET full_name = $1, password_hash = $2 WHERE id = $3
         RETURNING id, email, password_hash, full_name, role, active, created_at",
    )
    .bind(&new_full_name)
    .bind(&new_password_hash)
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
