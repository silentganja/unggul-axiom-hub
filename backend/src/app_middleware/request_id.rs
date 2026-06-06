// ─────────────────────────────────────────────────────────────────────────────
// Request correlation ID middleware.
//
// Injects an X-Request-Id header into every response so operators can trace
// a request through Nginx → Actix → PostgreSQL → Redis in log aggregation.
// If the client sends X-Request-Id, it is forwarded; otherwise a new UUIDv4
// is generated.
// ─────────────────────────────────────────────────────────────────────────────

use actix_web::{
    body::MessageBody,
    dev::{ServiceRequest, ServiceResponse},
    middleware::Next,
    Error, HttpMessage,
};
use uuid::Uuid;

/// Middleware that ensures every request has an X-Request-Id correlation ID.
/// Also appends it to the response headers so the client can reference it.
pub async fn request_id_middleware(
    req: ServiceRequest,
    next: Next<impl MessageBody + 'static>,
) -> Result<ServiceResponse<impl MessageBody>, Error> {
    let req_id = req
        .headers()
        .get("x-request-id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(|| Uuid::new_v4().to_string());

    // Store in request extensions so handlers can access it
    req.extensions_mut().insert(RequestId(req_id.clone()));

    let mut res = next.call(req).await?;

    res.headers_mut().insert(
        actix_web::http::header::HeaderName::from_static("x-request-id"),
        req_id.parse().unwrap(),
    );

    Ok(res)
}

/// Extractable request ID for use in handlers.
#[derive(Debug, Clone)]
pub struct RequestId(pub String);
