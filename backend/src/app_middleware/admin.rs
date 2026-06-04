use crate::errors::AppError;
use actix_web::{dev::Payload, FromRequest, HttpRequest};
use std::future::{ready, Ready};

/// Admin panel identity extracted from the admin JWT bearer token.
/// Only granted via the hardcoded admin login endpoint.
#[derive(Debug, Clone)]
pub struct AdminUser {
    // Stored for audit logging — not read directly by the extractor.
    #[allow(dead_code)]
    pub username: String,
}

impl FromRequest for AdminUser {
    type Error = AppError;
    type Future = Ready<Result<Self, Self::Error>>;

    fn from_request(req: &HttpRequest, _: &mut Payload) -> Self::Future {
        ready(extract_admin(req))
    }
}

fn extract_admin(req: &HttpRequest) -> Result<AdminUser, AppError> {
    let auth_header = req
        .headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .ok_or(AppError::Unauthorized)?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or(AppError::Unauthorized)?;

    let claims = crate::utils::jwt::decode_token(token)?;

    // Only tokens issued by the admin login endpoint carry this role
    if claims.role != "admin_panel" {
        return Err(AppError::Unauthorized);
    }

    Ok(AdminUser {
        username: claims.sub,
    })
}
