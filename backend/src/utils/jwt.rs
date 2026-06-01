use crate::errors::AppError;
use chrono::Utc;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use rand_core::{OsRng, RngCore};
use serde::{Deserialize, Serialize};
use std::env;
use uuid::Uuid;

// ── Claims ───────────────────────────────────────────────────────────────────

/// JWT payload embedded in every access token.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    /// Subject — the user's UUID as a string.
    pub sub: String,
    /// User role ('chief' | 'director' | 'officer' | 'staff').
    pub role: String,
    /// Expiry — Unix timestamp (seconds).
    pub exp: usize,
}

// ── Token lifetimes ───────────────────────────────────────────────────────────

/// Access token lifetime: 1 hour.
const ACCESS_TOKEN_EXPIRY_MINUTES: i64 = 60;

/// Refresh token lifetime: 7 days.
const _REFRESH_TOKEN_EXPIRY_DAYS: i64 = 7;

/// Admin access token lifetime: 8 hours.
const ADMIN_TOKEN_EXPIRY_HOURS: i64 = 8;

// ── Public API ───────────────────────────────────────────────────────────────

/// Generate a signed HS256 access JWT (15-minute expiry).
pub fn generate_token(user_id: Uuid, role: &str) -> Result<String, AppError> {
    let secret = jwt_secret();

    let exp =
        (Utc::now() + chrono::Duration::minutes(ACCESS_TOKEN_EXPIRY_MINUTES)).timestamp() as usize;

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

/// Generate a cryptographically random refresh token (opaque, not a JWT).
/// Stored in Redis with user info; validated on refresh.
pub fn generate_refresh_token() -> String {
    let mut bytes = [0u8; 48];
    OsRng.fill_bytes(&mut bytes);
    hex::encode(bytes)
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

/// Generate a signed HS256 JWT for the admin panel (hardcoded credentials).
/// Uses the same JWT_SECRET but embeds the reserved "admin_panel" role.
/// Admin tokens have a longer lifetime (8 hours) for operational convenience.
pub fn generate_admin_token(username: &str) -> Result<String, AppError> {
    let secret = jwt_secret();

    let exp = (Utc::now() + chrono::Duration::hours(ADMIN_TOKEN_EXPIRY_HOURS)).timestamp() as usize;

    let claims = Claims {
        sub: username.to_string(),
        role: "admin_panel".to_string(),
        exp,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(AppError::Jwt)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

fn jwt_secret() -> String {
    env::var("JWT_SECRET").expect("JWT_SECRET must be set")
}
