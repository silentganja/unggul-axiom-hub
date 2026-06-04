// ─────────────────────────────────────────────────────────────────────────────
// Rate limiting helpers - Redis-backed sliding-window rate limiter.
// ─────────────────────────────────────────────────────────────────────────────

use crate::errors::AppError;
use crate::utils::redis::{self, RedisClient};
use actix_web::web;

pub const LOGIN_MAX_REQUESTS: u64 = 5;
pub const LOGIN_WINDOW_SECS: u64 = 60;
pub const SENSITIVE_MAX_REQUESTS: u64 = 3;
pub const SENSITIVE_WINDOW_SECS: u64 = 60;

pub async fn check_login_rate_limit(
    client: &web::Data<RedisClient>,
    ip: &str,
) -> Result<(), AppError> {
    let allowed =
        redis::check_rate_limit_async(client, "login", ip, LOGIN_MAX_REQUESTS, LOGIN_WINDOW_SECS)
            .await
            .unwrap_or(true);

    if !allowed {
        tracing::warn!(ip = %ip, "Login rate limit exceeded");
        return Err(AppError::TooManyRequests);
    }
    Ok(())
}

pub async fn check_sensitive_rate_limit(
    client: &web::Data<RedisClient>,
    ip: &str,
) -> Result<(), AppError> {
    let allowed = redis::check_rate_limit_async(
        client,
        "sensitive",
        ip,
        SENSITIVE_MAX_REQUESTS,
        SENSITIVE_WINDOW_SECS,
    )
    .await
    .unwrap_or(true);

    if !allowed {
        tracing::warn!(ip = %ip, "Sensitive endpoint rate limit exceeded");
        return Err(AppError::TooManyRequests);
    }
    Ok(())
}
