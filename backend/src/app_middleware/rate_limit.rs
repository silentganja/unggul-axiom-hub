// ─────────────────────────────────────────────────────────────────────────────
// Rate limiting middleware — Redis-backed sliding-window rate limiter.
//
// Provides:
// - A global API rate limiter (generous, per-IP)
// - Per-endpoint rate limit helpers for sensitive routes (login, forgot-password)
// ─────────────────────────────────────────────────────────────────────────────

use crate::errors::AppError;
use crate::utils::redis;
use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    Error, HttpResponse,
};
use futures_util::future::{ok, LocalBoxFuture, Ready};
use redis::aio::ConnectionManager;

// ── Rate limit configuration ─────────────────────────────────────────────────

/// Global API rate limit: 120 requests per minute per IP.
pub const GLOBAL_MAX_REQUESTS: u64 = 120;
pub const GLOBAL_WINDOW_SECS: u64 = 60;

/// Login endpoint rate limit: 5 attempts per minute per IP.
pub const LOGIN_MAX_REQUESTS: u64 = 5;
pub const LOGIN_WINDOW_SECS: u64 = 60;

/// Sensitive endpoints (forgot-password, magic-link): 3 per minute per IP.
pub const SENSITIVE_MAX_REQUESTS: u64 = 3;
pub const SENSITIVE_WINDOW_SECS: u64 = 60;

// ── Middleware ───────────────────────────────────────────────────────────────

/// Rate limiting middleware factory.
pub struct RateLimitMiddleware;

impl<S> Transform<S, ServiceRequest> for RateLimitMiddleware
where
    S: Service<ServiceRequest, Response = ServiceResponse, Error = Error> + 'static,
{
    type Response = ServiceResponse;
    type Error = Error;
    type InitError = ();
    type Transform = RateLimitService<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ok(RateLimitService { service })
    }
}

pub struct RateLimitService<S> {
    service: S,
}

impl<S> Service<ServiceRequest> for RateLimitService<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse, Error = Error> + 'static,
{
    type Response = ServiceResponse;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let path = req.path().to_string();
        let method = req.method().to_string();

        // Only rate-limit API routes
        if !path.starts_with("/api/") {
            let fut = self.service.call(req);
            return Box::pin(async move { fut.await });
        }

        // Extract client IP
        let ip = req
            .peer_addr()
            .map(|a| a.ip().to_string())
            .unwrap_or_else(|| "unknown".to_string());

        // Get Redis connection from app data
        let redis_data = req
            .app_data::<actix_web::web::Data<ConnectionManager>>()
            .cloned();

        let fut = self.service.call(req);

        Box::pin(async move {
            // If Redis is available, check rate limit
            if let Some(conn_data) = redis_data {
                let mut conn = conn_data.get_ref().clone();
                let allowed = redis::check_rate_limit(
                    &mut conn,
                    "global",
                    &ip,
                    GLOBAL_MAX_REQUESTS,
                    GLOBAL_WINDOW_SECS,
                )
                .await
                .unwrap_or(true); // Fail open — allow request if Redis is down

                if !allowed {
                    tracing::warn!(
                        ip = %ip,
                        path = %path,
                        method = %method,
                        "Global rate limit exceeded"
                    );
                    let body = serde_json::json!({
                        "error": "Too many requests. Please slow down."
                    });
                    return Ok(HttpResponse::TooManyRequests().json(body));
                }
            }

            fut.await
        })
    }
}

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
