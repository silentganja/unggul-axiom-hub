use crate::{
    app_middleware::admin::AdminUser,
    errors::AppError,
    models::user::{User, UserProfile},
    utils::{jwt, password},
};
use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

// ── Hardcoded admin credentials ──────────────────────────────────────────────

const ADMIN_USERNAME: &str = "mirza";
const ADMIN_PASSWORD: &str = "396500Ja!";

// ── Request / Response shapes ────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct AdminLoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminLoginResponse {
    pub token: String,
    pub username: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateUserRequest {
    pub email: String,
    pub password: String,
    pub full_name: String,
    pub role: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateUserRequest {
    pub full_name: Option<String>,
    pub role: Option<String>,
    pub password: Option<String>, // Optional — only set if the admin wants to reset it
}

// ── POST /api/admin/login ────────────────────────────────────────────────────

pub async fn admin_login(body: web::Json<AdminLoginRequest>) -> Result<HttpResponse, AppError> {
    if body.username != ADMIN_USERNAME || body.password != ADMIN_PASSWORD {
        return Err(AppError::Unauthorized);
    }

    // Issue an admin-panel JWT with a reserved role that normal login never grants
    let token = jwt::generate_admin_token(&body.username)?;

    Ok(HttpResponse::Ok().json(AdminLoginResponse {
        token,
        username: body.username.clone(),
    }))
}

// ── GET /api/admin/users ─────────────────────────────────────────────────────

pub async fn list_users(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
) -> Result<HttpResponse, AppError> {
    let users: Vec<UserProfile> = sqlx::query_as::<_, User>(
        "SELECT id, email, password_hash, full_name, role, created_at
         FROM users
         ORDER BY created_at DESC",
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(AppError::Database)?
    .into_iter()
    .map(|u| u.into())
    .collect();

    Ok(HttpResponse::Ok().json(users))
}

// ── POST /api/admin/users ────────────────────────────────────────────────────

pub async fn create_user(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    body: web::Json<CreateUserRequest>,
) -> Result<HttpResponse, AppError> {
    let email = body.email.trim().to_lowercase();
    let full_name = body.full_name.trim().to_string();
    let role = body.role.trim().to_string();

    // Validate
    if email.is_empty() || body.password.is_empty() || full_name.is_empty() {
        return Err(AppError::BadRequest(
            "email, password, and full_name are required".into(),
        ));
    }

    if role != "admin" && role != "staff" {
        return Err(AppError::BadRequest(
            "role must be 'admin' or 'staff'".into(),
        ));
    }

    // Hash the password
    let password_hash = password::hash_password(&body.password)?;

    let user: User = sqlx::query_as::<_, User>(
        "INSERT INTO users (email, password_hash, full_name, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, password_hash, full_name, role, created_at",
    )
    .bind(&email)
    .bind(&password_hash)
    .bind(&full_name)
    .bind(&role)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| {
        // Check for unique violation on email
        if let sqlx::Error::Database(ref db_err) = e {
            if db_err.constraint() == Some("users_email_key") {
                return AppError::Conflict("A user with this email already exists".into());
            }
        }
        AppError::Database(e)
    })?;

    tracing::info!(
        admin = %ADMIN_USERNAME,
        user_id = %user.id,
        email = %email,
        role = %role,
        "Admin created new user"
    );

    let profile: UserProfile = user.into();
    Ok(HttpResponse::Created().json(profile))
}

// ── PUT /api/admin/users/{id} ────────────────────────────────────────────────

pub async fn update_user(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    path: web::Path<Uuid>,
    body: web::Json<UpdateUserRequest>,
) -> Result<HttpResponse, AppError> {
    let user_id = path.into_inner();

    // Fetch the existing user first
    let existing: Option<User> = sqlx::query_as::<_, User>(
        "SELECT id, email, password_hash, full_name, role, created_at
         FROM users WHERE id = $1",
    )
    .bind(user_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    let existing = existing.ok_or(AppError::NotFound)?;

    // Determine new values (fall back to existing)
    let new_full_name = body
        .full_name
        .as_deref()
        .map(|s| s.trim().to_string())
        .unwrap_or(existing.full_name);
    let new_role = body
        .role
        .as_deref()
        .map(|s| s.trim().to_string())
        .unwrap_or(existing.role);

    if new_role != "admin" && new_role != "staff" {
        return Err(AppError::BadRequest(
            "role must be 'admin' or 'staff'".into(),
        ));
    }

    // Hash new password if provided, otherwise keep existing
    let password_hash = if let Some(ref plain) = body.password {
        if plain.is_empty() {
            existing.password_hash
        } else {
            password::hash_password(plain)?
        }
    } else {
        existing.password_hash
    };

    let user: User = sqlx::query_as::<_, User>(
        "UPDATE users
         SET full_name = $1, role = $2, password_hash = $3
         WHERE id = $4
         RETURNING id, email, password_hash, full_name, role, created_at",
    )
    .bind(&new_full_name)
    .bind(&new_role)
    .bind(&password_hash)
    .bind(user_id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    tracing::info!(
        admin = %ADMIN_USERNAME,
        user_id = %user.id,
        "Admin updated user"
    );

    let profile: UserProfile = user.into();
    Ok(HttpResponse::Ok().json(profile))
}

// ── DELETE /api/admin/users/{id} ─────────────────────────────────────────────

pub async fn delete_user(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let user_id = path.into_inner();

    // Prevent admin from deleting themselves... well, the admin isn't a DB user,
    // but prevent deleting the last admin user as a safety guard.
    let admin_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users WHERE role = 'admin'")
        .fetch_one(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

    // Check if the target user is an admin and is the last one
    let target_role: Option<String> = sqlx::query_scalar("SELECT role FROM users WHERE id = $1")
        .bind(user_id)
        .fetch_optional(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

    if target_role.as_deref() == Some("admin") && admin_count <= 1 {
        return Err(AppError::Conflict(
            "Cannot delete the last admin user".into(),
        ));
    }

    let deleted = sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(user_id)
        .execute(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

    if deleted.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    tracing::info!(
        admin = %ADMIN_USERNAME,
        user_id = %user_id,
        "Admin deleted user"
    );

    Ok(HttpResponse::NoContent().finish())
}
