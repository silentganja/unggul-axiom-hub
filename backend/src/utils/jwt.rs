use crate::errors::AppError;
use chrono::Utc;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::env;
use uuid::Uuid;

// ── Claims ───────────────────────────────────────────────────────────────────

/// JWT payload embedded in every access token.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    /// Subject — the user's UUID as a string.
    pub sub: String,
    /// User role ('admin' | 'staff').
    pub role: String,
    /// Expiry — Unix timestamp (seconds).
    pub exp: usize,
}

// ── Token lifetime ───────────────────────────────────────────────────────────

const TOKEN_EXPIRY_HOURS: i64 = 8;

// ── Public API ───────────────────────────────────────────────────────────────

/// Generate a signed HS256 JWT for the given user.
pub fn generate_token(user_id: Uuid, role: &str) -> Result<String, AppError> {
    let secret = jwt_secret();

    let exp = (Utc::now() + chrono::Duration::hours(TOKEN_EXPIRY_HOURS)).timestamp() as usize;

    let claims = Claims {
        sub: user_id.to_string(),
        role: role.to_string(),
        exp,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(AppError::Jwt)
}

/// Decode and validate a JWT, returning the embedded claims.
/// Returns `AppError::Unauthorized` for any validation failure.
pub fn decode_token(token: &str) -> Result<Claims, AppError> {
    let secret = jwt_secret();

    decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )
    .map(|data| data.claims)
    .map_err(|_| AppError::Unauthorized)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

fn jwt_secret() -> String {
    env::var("JWT_SECRET").expect("JWT_SECRET must be set")
}
