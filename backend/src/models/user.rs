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
    pub created_at: DateTime<Utc>,
}

impl From<User> for UserProfile {
    fn from(u: User) -> Self {
        UserProfile {
            id: u.id,
            email: u.email,
            full_name: u.full_name,
            role: u.role,
            created_at: u.created_at,
        }
    }
}
