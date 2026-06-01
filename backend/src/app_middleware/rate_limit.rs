// ─────────────────────────────────────────────────────────────────────────────
// Rate limiting helpers — Redis-backed sliding-window rate limiter.
//
// These are handler-level checks for sensitive endpoints. For global API rate
// limiting, configure Nginx or your reverse proxy with `limit_req_zone`.
// ─────────────────────────────────────────────────────────────────────────────

use crate::errors::AppError;
use crate::utils::redis;
use redis::aio::ConnectionManager;

// ── Rate limit configuration ─────────────────────────────────────────────────

/// Login endpoint rate limit: 5 attempts per minute per IP.
pub const LOGIN_MAX_REQUESTS: u64 = 5;
pub const LOGIN_WINDOW_SECS: u64 = 60;

/// Sensitive endpoints (forgot-password, magic-link): 3 per minute per IP.
pub const SENSITIVE_MAX_REQUESTS: u64 = 3;
pub const SENSITIVE_WINDOW_SECS: u64 = 60;

// ── Convenience helpers for handlers ─────────────────────────────────────────

/// Check a stricter rate limit for login endpoints.
/// Call this at the start of handler functions that need tighter limits.
pub async fn check_login_rate_limit(
    conn: &mut ConnectionManager,
    ip: &str,
) -> Result<(), AppError> {
    let allowed = redis::check_rate_limit(conn, "login", ip, LOGIN_MAX_REQUESTS, LOGIN_WINDOW_SECS)
        .await
        .unwrap_or(true);

    if !allowed {
        tracing::warn!(ip = %ip, "Login rate limit exceeded");
        return Err(AppError::TooManyRequests);
    }

    Ok(())
}

/// Check a rate limit for sensitive email-generating endpoints.
pub async fn check_sensitive_rate_limit(
    conn: &mut ConnectionManager,
    ip: &str,
) -> Result<(), AppError> {
    let allowed = redis::check_rate_limit(
        conn,
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
