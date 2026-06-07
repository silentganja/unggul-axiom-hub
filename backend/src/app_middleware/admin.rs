use crate::{errors::AppError, models::user, AppConfig};
use actix_web::{dev::Payload, web, FromRequest, HttpRequest};
use sqlx::PgPool;
use std::pin::Pin;
use uuid::Uuid;

/// Admin panel identity extracted from the JWT bearer token.
///
/// Two auth paths are supported:
/// 1. Hardcoded admin login (`ADMIN_USERNAME`/`ADMIN_PASSWORD`) — issues a JWT
///    with `role = "admin_panel"`. This always works and grants full access.
/// 2. Regular user JWT + `admin:access` permission via a custom role group.
///    Allows delegated admin access without sharing the hardcoded credentials.
///    Specific actions inside the admin panel require additional permissions
///    (e.g. `users:manage`, `storage:manage`, `config:read`).
#[derive(Debug, Clone)]
pub struct AdminUser {
    /// Display name for audit logging — admin username or user email.
    pub username: String,
    /// The user's UUID when accessed via regular JWT + permission (Path 2).
    /// `None` for the hardcoded admin (Path 1).
    pub user_id: Option<Uuid>,
    /// The user's base role (only set for Path 2).
    pub role: Option<String>,
}

impl FromRequest for AdminUser {
    type Error = AppError;
    type Future = Pin<Box<dyn std::future::Future<Output = Result<Self, Self::Error>>>>;

    fn from_request(req: &HttpRequest, _: &mut Payload) -> Self::Future {
        let auth_header = req
            .headers()
            .get("Authorization")
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string());

        let pool = req
            .app_data::<web::Data<PgPool>>()
            .map(|d| d.get_ref().clone());

        let jwt_secret = req
            .app_data::<web::Data<AppConfig>>()
            .map(|c| c.jwt_secret.clone());

        Box::pin(async move {
            let token = auth_header
                .as_deref()
                .and_then(|h| h.strip_prefix("Bearer "))
                .ok_or(AppError::Unauthorized)?;

            let secret = jwt_secret.ok_or(AppError::Unauthorized)?;
            let claims = crate::utils::jwt::decode_token(&secret, token)?;

            // Path 1: Hardcoded admin token — full access, no further checks
            if claims.role == "admin_panel" {
                return Ok(AdminUser {
                    username: claims.sub,
                    user_id: None,
                    role: None,
                });
            }

            // Path 2: Regular user JWT — check for admin:access permission
            let pool = pool.ok_or(AppError::Unauthorized)?;

            let user_id = Uuid::parse_str(&claims.sub).map_err(|_| AppError::Unauthorized)?;

            let has_access =
                user::user_has_permission(&pool, user_id, &claims.role, "admin:access")
                    .await
                    .unwrap_or(false);

            if !has_access {
                return Err(AppError::Unauthorized);
            }

            // Fetch the user's email for audit display
            let row: Option<(String, String)> =
                sqlx::query_as("SELECT email, role FROM users WHERE id = $1")
                    .bind(user_id)
                    .fetch_optional(&pool)
                    .await
                    .map_err(|_| AppError::Unauthorized)?;

            let (email, user_role) = row.unwrap_or_else(|| (user_id.to_string(), "staff".into()));

            Ok(AdminUser {
                username: email,
                user_id: Some(user_id),
                role: Some(user_role),
            })
        })
    }
}

// ── Permission helpers for delegated admins ─────────────────────────────────

impl AdminUser {
    /// Returns `true` if this is the hardcoded admin (full access, no permission checks).
    pub fn is_super_admin(&self) -> bool {
        self.user_id.is_none()
    }

    /// Check whether this admin has a specific permission.
    /// Hardcoded admins always return `true`.
    /// Delegated admins check both base-role implicit grants and custom group permissions.
    pub async fn has_permission(&self, pool: &PgPool, permission_key: &str) -> bool {
        if self.is_super_admin() {
            return true;
        }
        let uid = match self.user_id {
            Some(id) => id,
            None => return true,
        };
        user::user_has_permission(
            pool,
            uid,
            self.role.as_deref().unwrap_or(""),
            permission_key,
        )
        .await
        .unwrap_or(false)
    }
}

/// Convenience: require a specific permission or return Unauthorized.
pub async fn require_permission(
    admin: &AdminUser,
    pool: &PgPool,
    permission_key: &str,
) -> Result<(), AppError> {
    if admin.has_permission(pool, permission_key).await {
        Ok(())
    } else {
        Err(AppError::Unauthorized)
    }
}

/// Require `primary` permission OR `fallback` permission.
/// Enables granular permissions (e.g. `role_groups:manage`) with backward
/// compatibility for the legacy umbrella permission (`users:manage`).
pub async fn require_permission_or(
    admin: &AdminUser,
    pool: &PgPool,
    primary: &str,
    fallback: &str,
) -> Result<(), AppError> {
    if admin.has_permission(pool, primary).await || admin.has_permission(pool, fallback).await {
        Ok(())
    } else {
        Err(AppError::Unauthorized)
    }
}
