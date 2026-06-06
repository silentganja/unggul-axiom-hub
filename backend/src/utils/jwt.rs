use crate::errors::AppError;
use chrono::Utc;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use rand_core::{OsRng, RngCore};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ── Claims ───────────────────────────────────────────────────────────────────

/// JWT payload embedded in every access token.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    /// Subject - the user's UUID as a string.
    pub sub: String,
    /// User role ('chief' | 'director' | 'officer' | 'staff').
    pub role: String,
    /// Expiry - Unix timestamp (seconds).
    pub exp: usize,
}

// ── Token lifetimes ───────────────────────────────────────────────────────────

/// Access token lifetime: 1 hour.
pub const ACCESS_TOKEN_EXPIRY_MINUTES: i64 = 60;

/// Refresh token lifetime: 7 days.
const _REFRESH_TOKEN_EXPIRY_DAYS: i64 = 7;

/// Admin access token lifetime: 8 hours.
pub const ADMIN_TOKEN_EXPIRY_HOURS: i64 = 8;

/// Short-lived SSE token lifetime: 5 minutes.
#[allow(dead_code)]
pub const SSE_TOKEN_EXPIRY_MINUTES: i64 = 5;

// ── Public API ───────────────────────────────────────────────────────────────

/// Generate a signed HS256 access JWT (60-minute expiry).
/// Accepts `secret` as a parameter (caller provides cached AppConfig value).
pub fn generate_token(secret: &str, user_id: Uuid, role: &str) -> Result<String, AppError> {
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
/// Accepts `secret` as a parameter (caller provides cached AppConfig value).
/// Returns `AppError::Unauthorized` for any validation failure.
pub fn decode_token(secret: &str, token: &str) -> Result<Claims, AppError> {
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
pub fn generate_admin_token(secret: &str, username: &str) -> Result<String, AppError> {
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

/// Generate a short-lived JWT for SSE connections (5-minute expiry).
/// This token is passed as a query parameter and is scoped to notifications only.
#[allow(dead_code)]
pub fn generate_sse_token(secret: &str, user_id: Uuid) -> Result<String, AppError> {
    let exp =
        (Utc::now() + chrono::Duration::minutes(SSE_TOKEN_EXPIRY_MINUTES)).timestamp() as usize;

    let claims = Claims {
        sub: user_id.to_string(),
        role: "sse_subscriber".to_string(),
        exp,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(AppError::Jwt)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    const TEST_SECRET: &str = "test-secret-key-for-unit-tests-min-32";

    fn sample_user_id() -> Uuid {
        Uuid::parse_str("f47ac10b-58cc-4372-a567-0e02b2c3d479").unwrap()
    }

    #[test]
    fn generate_and_decode_token_roundtrip() {
        let user_id = sample_user_id();
        let role = "officer";

        let token =
            generate_token(TEST_SECRET, user_id, role).expect("token generation should succeed");
        let claims = decode_token(TEST_SECRET, &token).expect("decoding own token should succeed");

        assert_eq!(claims.sub, user_id.to_string());
        assert_eq!(claims.role, role);
    }

    #[test]
    fn decode_garbage_token() {
        let result = decode_token(TEST_SECRET, "this-is-not-a-valid-jwt");
        assert!(result.is_err(), "garbage token must fail");
    }

    #[test]
    fn decode_empty_token() {
        let result = decode_token(TEST_SECRET, "");
        assert!(result.is_err(), "empty token must fail");
    }

    #[test]
    fn decode_tampered_token() {
        let token = generate_token(TEST_SECRET, sample_user_id(), "staff").unwrap();
        // Append garbage to the payload segment
        let tampered = token.replace('.', ".tampered.");
        let result = decode_token(TEST_SECRET, &tampered);
        assert!(result.is_err(), "tampered token must fail");
    }

    #[test]
    fn refresh_token_is_hex() {
        let rt = generate_refresh_token();
        assert_eq!(rt.len(), 96, "48 random bytes = 96 hex chars");
        assert!(rt.chars().all(|c| c.is_ascii_hexdigit()), "must be hex");
    }

    #[test]
    fn refresh_tokens_are_unique() {
        let rt1 = generate_refresh_token();
        let rt2 = generate_refresh_token();
        let rt3 = generate_refresh_token();
        assert_ne!(rt1, rt2);
        assert_ne!(rt2, rt3);
        assert_ne!(rt1, rt3);
    }

    #[test]
    fn admin_token_has_admin_panel_role() {
        let token =
            generate_admin_token(TEST_SECRET, "superadmin").expect("admin token should succeed");
        let claims = decode_token(TEST_SECRET, &token).expect("admin token must decode");

        assert_eq!(claims.sub, "superadmin");
        assert_eq!(claims.role, "admin_panel");
    }

    #[test]
    fn token_has_expiry_in_future() {
        let token = generate_token(TEST_SECRET, sample_user_id(), "chief").unwrap();
        let claims = decode_token(TEST_SECRET, &token).unwrap();

        let now = Utc::now().timestamp() as usize;
        assert!(claims.exp > now, "expiry must be in the future");
        // Access tokens last 1 hour; allow small clock skew
        assert!(
            claims.exp <= now + 3600 + 5,
            "expiry must be within ~1 hour"
        );
    }

    #[test]
    fn different_user_ids_produce_different_tokens() {
        let uid1 = Uuid::new_v4();
        let uid2 = Uuid::new_v4();
        let t1 = generate_token(TEST_SECRET, uid1, "staff").unwrap();
        let t2 = generate_token(TEST_SECRET, uid2, "staff").unwrap();
        assert_ne!(t1, t2, "different subjects must yield different tokens");
    }

    #[test]
    fn decode_token_signed_with_different_key() {
        // Manually encode a token with a different key so we verify key isolation.
        let claims = Claims {
            sub: sample_user_id().to_string(),
            role: "officer".into(),
            exp: (Utc::now() + chrono::Duration::minutes(60)).timestamp() as usize,
        };

        let alien_token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(b"some-other-key-that-is-not-the-real-one"),
        )
        .expect("manual encoding should succeed");

        let result = decode_token(TEST_SECRET, &alien_token);
        assert!(
            result.is_err(),
            "token signed with a different key must be rejected"
        );
    }

    #[test]
    fn sse_token_has_short_lifetime() {
        let token = generate_sse_token(TEST_SECRET, sample_user_id()).unwrap();
        let claims = decode_token(TEST_SECRET, &token).unwrap();
        assert_eq!(claims.role, "sse_subscriber");
        let now = Utc::now().timestamp() as usize;
        assert!(
            claims.exp <= now + 300 + 5,
            "SSE token must expire within ~5 min"
        );
    }
}
