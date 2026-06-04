use actix_web::HttpResponse;
use thiserror::Error;

/// Centralised application error type.
/// Each variant maps to a specific HTTP status code and a clean JSON body.
#[derive(Debug, Error)]
pub enum AppError {
    #[error("Unauthorized")]
    Unauthorized,

    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Not found")]
    NotFound,

    #[error("Conflict: {0}")]
    Conflict(String),

    #[error("Internal server error")]
    Internal(#[from] anyhow::Error),

    // Transparent wrappers so `?` works from common error sources
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("JWT error: {0}")]
    Jwt(#[from] jsonwebtoken::errors::Error),

    #[error("Too many requests")]
    TooManyRequests,

    #[error("Redis error: {0}")]
    Redis(String),
}

// ── Serialisable error body ──────────────────────────────────────────────────

#[derive(serde::Serialize)]
struct ErrorBody {
    error: String,
}

// ── ResponseError impl ───────────────────────────────────────────────────────

impl actix_web::ResponseError for AppError {
    fn error_response(&self) -> HttpResponse {
        use actix_web::http::StatusCode;

        // Never leak internal details to the client
        let (status, message) = match self {
            AppError::Unauthorized => (StatusCode::UNAUTHORIZED, "Unauthorized".to_string()),
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg.clone()),
            AppError::NotFound => (StatusCode::NOT_FOUND, "Not found".to_string()),
            AppError::Conflict(msg) => (StatusCode::CONFLICT, msg.clone()),
            AppError::Database(e) => {
                tracing::error!("Database error: {:?}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Internal server error".to_string(),
                )
            }
            AppError::Jwt(e) => {
                tracing::warn!("JWT error: {:?}", e);
                (StatusCode::UNAUTHORIZED, "Unauthorized".to_string())
            }
            AppError::Internal(e) => {
                tracing::error!("Internal error: {:?}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Internal server error".to_string(),
                )
            }
            AppError::TooManyRequests => (
                StatusCode::TOO_MANY_REQUESTS,
                "Too many requests. Please slow down.".to_string(),
            ),
            AppError::Redis(e) => {
                tracing::error!("Redis error: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Internal server error".to_string(),
                )
            }
        };

        HttpResponse::build(status).json(ErrorBody { error: message })
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::body::MessageBody;
    use actix_web::http::StatusCode;
    use actix_web::ResponseError;

    #[test]
    fn unauthorized_returns_401() {
        assert_eq!(
            AppError::Unauthorized.status_code(),
            StatusCode::UNAUTHORIZED
        );
    }

    #[test]
    fn bad_request_returns_400() {
        let err = AppError::BadRequest("name is required".into());
        assert_eq!(err.status_code(), StatusCode::BAD_REQUEST);
    }

    #[test]
    fn not_found_returns_404() {
        assert_eq!(AppError::NotFound.status_code(), StatusCode::NOT_FOUND);
    }

    #[test]
    fn conflict_returns_409() {
        let err = AppError::Conflict("duplicate entry".into());
        assert_eq!(err.status_code(), StatusCode::CONFLICT);
    }

    #[test]
    fn too_many_requests_returns_429() {
        assert_eq!(
            AppError::TooManyRequests.status_code(),
            StatusCode::TOO_MANY_REQUESTS
        );
    }

    #[test]
    fn database_error_returns_500() {
        let err = AppError::Internal(anyhow::anyhow!("simulated"));
        assert_eq!(err.status_code(), StatusCode::INTERNAL_SERVER_ERROR);
    }

    #[test]
    fn jwt_error_returns_401() {
        use jsonwebtoken::errors::Error as JwtError;
        use jsonwebtoken::errors::ErrorKind;
        let err = AppError::Jwt(JwtError::from(ErrorKind::ExpiredSignature));
        assert_eq!(err.status_code(), StatusCode::UNAUTHORIZED);
    }

    #[test]
    fn internal_error_hides_detail_in_body() {
        let err = AppError::Internal(anyhow::anyhow!("sensitive sql detail"));
        let resp = err.error_response();

        let body_bytes = resp.into_body().try_into_bytes().unwrap();
        let body_str = String::from_utf8_lossy(&body_bytes);

        assert!(
            !body_str.contains("sensitive sql detail"),
            "internal error must not leak detail"
        );
        assert!(
            body_str.contains("Internal server error"),
            "must show generic message"
        );
    }

    #[test]
    fn bad_request_includes_user_message() {
        let msg = "classification must be one of: RAHSIA, SULIT, TERHAD, TERBUKA";
        let err = AppError::BadRequest(msg.into());
        let resp = err.error_response();

        let body_bytes = resp.into_body().try_into_bytes().unwrap();
        let body_str = String::from_utf8_lossy(&body_bytes);
        assert!(
            body_str.contains(msg),
            "bad request body must include the validation message"
        );
    }

    #[test]
    fn error_response_is_json() {
        let err = AppError::NotFound;
        let resp = err.error_response();
        let content_type = resp
            .headers()
            .get("content-type")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("");
        assert!(
            content_type.contains("application/json"),
            "error must be JSON"
        );
    }
}
