use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;

/// Database row returned by `SELECT ... FROM users WHERE ...`.
/// Used with `sqlx::query_as::<_, User>(...)` — no compile-time macros.
#[derive(Debug, sqlx::FromRow)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub password_hash: String,
    pub full_name: String,
    pub role: String,
    pub active: bool,
    #[sqlx(default)]
    pub storage_quota_bytes: Option<i64>,
    pub created_at: DateTime<Utc>,
}

/// Safe public projection of a user — never includes `password_hash`.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserProfile {
    pub id: Uuid,
    pub email: String,
    pub full_name: String,
    pub role: String,
    pub active: bool,
    pub storage_quota_bytes: Option<i64>,
    pub created_at: DateTime<Utc>,
}

// ── Role hierarchy ──────────────────────────────────────────────────────────

/// Returns the numeric authority level for a role (higher = more authority).
pub fn role_level(role: &str) -> u8 {
    match role {
        "chief" => 4,
        "director" => 3,
        "officer" => 2,
        "staff" => 1,
        _ => 0,
    }
}

/// Whether this role can approve governance requests.
pub fn can_govern(role: &str) -> bool {
    role_level(role) >= 2 // officer+
}

/// Whether this role can approve classification changes and lock overrides.
pub fn can_govern_classified(role: &str) -> bool {
    role_level(role) >= 3 // director+
}

/// Whether this role can manage users.
#[allow(dead_code)]
pub fn can_manage_users(role: &str) -> bool {
    role_level(role) >= 3 // director+
}

/// All valid roles (4-tier hierarchy).
pub const VALID_ROLES: &[&str] = &["chief", "director", "officer", "staff"];

impl From<User> for UserProfile {
    fn from(u: User) -> Self {
        UserProfile {
            id: u.id,
            email: u.email,
            full_name: u.full_name,
            role: u.role,
            active: u.active,
            created_at: u.created_at,
        }
    }
}
