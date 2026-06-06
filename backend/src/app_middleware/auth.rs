use crate::{errors::AppError, utils::jwt, AppConfig};
use actix_web::{dev::Payload, web, FromRequest, HttpRequest};
use std::future::{ready, Ready};
use uuid::Uuid;

/// Authenticated user identity extracted from the JWT bearer token.
/// Inject this into any route handler that requires authentication.
///
/// # Example
/// ```rust
/// async fn protected(user: AuthUser) -> impl Responder {
///     format!("Hello, {} ({})", user.id, user.role)
/// }
/// ```
#[derive(Debug, Clone)]
pub struct AuthUser {
    pub id: Uuid,
    pub role: String,
}

// ── FromRequest impl ─────────────────────────────────────────────────────────

impl FromRequest for AuthUser {
    type Error = AppError;
    type Future = Ready<Result<Self, Self::Error>>;

    fn from_request(req: &HttpRequest, _: &mut Payload) -> Self::Future {
        ready(extract_auth_user(req))
    }
}

fn extract_auth_user(req: &HttpRequest) -> Result<AuthUser, AppError> {
    // Read the Authorization header
    let auth_header = req
        .headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .ok_or(AppError::Unauthorized)?;

    // Expect "Bearer <token>"
    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or(AppError::Unauthorized)?;

    // Read JWT secret from AppConfig (cached, not env::var on every call)
    let config = req
        .app_data::<web::Data<AppConfig>>()
        .ok_or(AppError::Unauthorized)?;

    // Decode & validate the JWT
    let claims = jwt::decode_token(&config.jwt_secret, token)?;

    let user_id = Uuid::parse_str(&claims.sub).map_err(|_| AppError::Unauthorized)?;

    Ok(AuthUser {
        id: user_id,
        role: claims.role,
    })
}
