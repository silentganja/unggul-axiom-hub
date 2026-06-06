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
pub const ACTION_MAX_REQUESTS: u64 = 30;
pub const ACTION_WINDOW_SECS: u64 = 60;

/// Extract the real client IP from the request.
///
/// Behind an Nginx reverse proxy, `peer_addr()` always returns 127.0.0.1 (the
/// proxy address), not the actual caller. Nginx forwards the original IP via
/// `X-Real-IP` (set with `proxy_set_header X-Real-IP $remote_addr`), so we
/// prefer that header. We fall back to `X-Forwarded-For` (first hop) and then
/// to `peer_addr()` only when running without a proxy (e.g. local dev).
pub fn extract_client_ip(req: &actix_web::HttpRequest) -> String {
    // Prefer X-Real-IP (single authoritative value set by Nginx)
    if let Some(real_ip) = req
        .headers()
        .get("X-Real-IP")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
    {
        return real_ip;
    }

    // Fall back to the first address in X-Forwarded-For
    if let Some(xff) = req
        .headers()
        .get("X-Forwarded-For")
        .and_then(|v| v.to_str().ok())
    {
        if let Some(first) = xff.split(',').next().map(|s| s.trim().to_string()) {
            if !first.is_empty() {
                return first;
            }
        }
    }

    // Last resort: direct peer address (correct in dev, wrong behind a proxy)
    req.peer_addr()
        .map(|a| a.ip().to_string())
        .unwrap_or_else(|| "unknown".to_string())
}

pub async fn check_login_rate_limit(
    client: &web::Data<RedisClient>,
    ip: &str,
) -> Result<(), AppError> {
    // Fail closed: if Redis is unavailable we deny rather than allow
    // unlimited attempts, which would defeat the purpose of the limiter.
    let allowed =
        redis::check_rate_limit_async(client, "login", ip, LOGIN_MAX_REQUESTS, LOGIN_WINDOW_SECS)
            .await
            .unwrap_or(false);

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
    .unwrap_or(false);

    if !allowed {
        tracing::warn!(ip = %ip, "Sensitive endpoint rate limit exceeded");
        return Err(AppError::TooManyRequests);
    }
    Ok(())
}

/// Rate limit for governance and file-mutation endpoints (30 req/min per IP).
pub async fn check_action_rate_limit(
    client: &web::Data<RedisClient>,
    ip: &str,
) -> Result<(), AppError> {
    let allowed = redis::check_rate_limit_async(
        client,
        "action",
        ip,
        ACTION_MAX_REQUESTS,
        ACTION_WINDOW_SECS,
    )
    .await
    .unwrap_or(false);

    if !allowed {
        tracing::warn!(ip = %ip, "Action rate limit exceeded");
        return Err(AppError::TooManyRequests);
    }
    Ok(())
}

/// Global rate limiting middleware (100 requests per 60 seconds per IP).
pub async fn global_rate_limit_middleware(
    req: actix_web::dev::ServiceRequest,
    next: actix_web::middleware::Next<impl actix_web::body::MessageBody + 'static>,
) -> Result<actix_web::dev::ServiceResponse<impl actix_web::body::MessageBody>, actix_web::Error> {
    let redis_client = match req.app_data::<web::Data<RedisClient>>() {
        Some(client) => client,
        None => return next.call(req).await,
    };

    // Extract the real client IP, not the proxy's address.
    let ip = {
        let headers = req.headers();

        let real_ip = headers
            .get("X-Real-IP")
            .and_then(|v| v.to_str().ok())
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());

        if let Some(ip) = real_ip {
            ip
        } else {
            headers
                .get("X-Forwarded-For")
                .and_then(|v| v.to_str().ok())
                .and_then(|xff| xff.split(',').next().map(|s| s.trim().to_string()))
                .filter(|s| !s.is_empty())
                .unwrap_or_else(|| {
                    req.peer_addr()
                        .map(|addr| addr.ip().to_string())
                        .unwrap_or_else(|| "unknown".to_string())
                })
        }
    };

    // Fail closed: if Redis is unavailable, block the request rather than
    // allowing unlimited traffic, which would leave the server unprotected.
    let allowed = redis::check_rate_limit_async(
        redis_client,
        "global",
        &ip,
        100, // global max requests
        60,  // global window seconds
    )
    .await
    .unwrap_or(false);

    if !allowed {
        tracing::warn!(ip = %ip, "Global rate limit exceeded");
        return Err(actix_web::error::ErrorTooManyRequests(
            "Global rate limit exceeded",
        ));
    }

    next.call(req).await
}
