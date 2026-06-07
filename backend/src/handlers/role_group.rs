// ─────────────────────────────────────────────────────────────────────────────
// Role Builder handlers — admin CRUD for custom role groups, permissions,
// and user-group assignments.
// ─────────────────────────────────────────────────────────────────────────────

use crate::{
    app_middleware::admin::AdminUser,
    errors::AppError,
    models::role_group::{
        Permission, RoleGroup, RoleGroupDetail, RoleGroupSummary, UserRoleGroupEntry,
    },
};
use actix_web::{web, HttpRequest, HttpResponse};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

// ── Request / Response shapes ─────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRoleGroupRequest {
    pub name: String,
    #[serde(default)]
    pub description: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateRoleGroupRequest {
    pub name: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetPermissionsRequest {
    pub permission_ids: Vec<Uuid>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetUsersRequest {
    pub user_ids: Vec<Uuid>,
}

// ── GET /api/admin/permissions ────────────────────────────────────────────────

pub async fn list_permissions(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
) -> Result<HttpResponse, AppError> {
    let permissions: Vec<Permission> =
        sqlx::query_as("SELECT id, key, description FROM permissions ORDER BY key")
            .fetch_all(pool.get_ref())
            .await
            .map_err(AppError::Database)?;

    Ok(HttpResponse::Ok().json(permissions))
}

// ── GET /api/admin/role-groups ────────────────────────────────────────────────

pub async fn list_role_groups(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
) -> Result<HttpResponse, AppError> {
    let groups: Vec<RoleGroupSummary> = sqlx::query_as(
        "SELECT
            rg.id, rg.name, rg.description,
            COALESCE(pc.cnt, 0) AS permission_count,
            COALESCE(uc.cnt, 0) AS user_count,
            rg.created_by, rg.created_at, rg.updated_at
         FROM role_groups rg
         LEFT JOIN (
             SELECT role_group_id, COUNT(*) AS cnt
             FROM role_group_permissions
             GROUP BY role_group_id
         ) pc ON pc.role_group_id = rg.id
         LEFT JOIN (
             SELECT role_group_id, COUNT(*) AS cnt
             FROM user_role_groups
             GROUP BY role_group_id
         ) uc ON uc.role_group_id = rg.id
         ORDER BY rg.name",
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    Ok(HttpResponse::Ok().json(groups))
}

// ── POST /api/admin/role-groups ───────────────────────────────────────────────

pub async fn create_role_group(
    pool: web::Data<PgPool>,
    admin: AdminUser,
    req: HttpRequest,
    body: web::Json<CreateRoleGroupRequest>,
) -> Result<HttpResponse, AppError> {
    crate::app_middleware::admin::require_permission_or(
        &admin,
        pool.get_ref(),
        "role_groups:manage",
        "users:manage",
    )
    .await?;
    let name = body.name.trim().to_string();
    let description = body.description.trim().to_string();

    if name.is_empty() {
        return Err(AppError::BadRequest("Group name is required".into()));
    }
    if name.len() > 128 {
        return Err(AppError::BadRequest(
            "Group name must be 128 characters or less".into(),
        ));
    }
    if description.len() > 1024 {
        return Err(AppError::BadRequest(
            "Group description must be 1024 characters or less".into(),
        ));
    }

    let group: RoleGroup = sqlx::query_as(
        "INSERT INTO role_groups (name, description, created_by)
         VALUES ($1, $2, $3)
         RETURNING id, name, description, created_by, created_at, updated_at",
    )
    .bind(&name)
    .bind(&description)
    .bind(&admin.username)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| {
        if let sqlx::Error::Database(ref db_err) = e {
            if db_err.constraint() == Some("role_groups_name_key") {
                return AppError::Conflict("A role group with this name already exists".into());
            }
        }
        AppError::Database(e)
    })?;

    // Audit log
    let ip = req.peer_addr().map(|a| a.to_string()).unwrap_or_default();
    let _ = crate::handlers::files::write_audit_log_internal(
        pool.get_ref(),
        uuid::Uuid::nil(),
        "ROLE_GROUP_CREATE",
        &format!("{} ({})", group.id, name),
        &ip,
    )
    .await;

    tracing::info!(
        admin = %admin.username,
        group_id = %group.id,
        name = %name,
        "Admin created role group"
    );

    Ok(HttpResponse::Created().json(RoleGroupDetail {
        id: group.id,
        name: group.name,
        description: group.description,
        permissions: vec![],
        created_by: group.created_by,
        created_at: group.created_at,
        updated_at: group.updated_at,
    }))
}

// ── Helper: fetch a single role group or return NotFound ──────────────────────

async fn fetch_group(pool: &PgPool, group_id: Uuid) -> Result<RoleGroup, AppError> {
    sqlx::query_as::<_, RoleGroup>(
        "SELECT id, name, description, created_by, created_at, updated_at
         FROM role_groups WHERE id = $1",
    )
    .bind(group_id)
    .fetch_optional(pool)
    .await
    .map_err(AppError::Database)?
    .ok_or(AppError::NotFound)
}

// ── Helper: fetch permissions for a group ─────────────────────────────────────

async fn fetch_group_permissions(
    pool: &PgPool,
    group_id: Uuid,
) -> Result<Vec<Permission>, AppError> {
    sqlx::query_as(
        "SELECT p.id, p.key, p.description
         FROM permissions p
         JOIN role_group_permissions rgp ON rgp.permission_id = p.id
         WHERE rgp.role_group_id = $1
         ORDER BY p.key",
    )
    .bind(group_id)
    .fetch_all(pool)
    .await
    .map_err(AppError::Database)
}

// ── GET /api/admin/role-groups/{id} ───────────────────────────────────────────

pub async fn get_role_group(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let group_id = path.into_inner();
    let group = fetch_group(pool.get_ref(), group_id).await?;
    let permissions = fetch_group_permissions(pool.get_ref(), group_id).await?;

    Ok(HttpResponse::Ok().json(RoleGroupDetail {
        id: group.id,
        name: group.name,
        description: group.description,
        permissions,
        created_by: group.created_by,
        created_at: group.created_at,
        updated_at: group.updated_at,
    }))
}

// ── PUT /api/admin/role-groups/{id} ───────────────────────────────────────────

pub async fn update_role_group(
    pool: web::Data<PgPool>,
    admin: AdminUser,
    req: HttpRequest,
    path: web::Path<Uuid>,
    body: web::Json<UpdateRoleGroupRequest>,
) -> Result<HttpResponse, AppError> {
    crate::app_middleware::admin::require_permission_or(
        &admin,
        pool.get_ref(),
        "role_groups:manage",
        "users:manage",
    )
    .await?;
    let group_id = path.into_inner();
    let existing = fetch_group(pool.get_ref(), group_id).await?;

    if let Some(ref name) = body.name {
        let trimmed = name.trim();
        if trimmed.is_empty() {
            return Err(AppError::BadRequest("Group name is required".into()));
        }
        if trimmed.len() > 128 {
            return Err(AppError::BadRequest(
                "Group name must be 128 characters or less".into(),
            ));
        }
    }
    if let Some(ref desc) = body.description {
        if desc.trim().len() > 1024 {
            return Err(AppError::BadRequest(
                "Group description must be 1024 characters or less".into(),
            ));
        }
    }

    let new_name = body
        .name
        .as_deref()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or(existing.name);

    let new_description = body
        .description
        .as_deref()
        .map(|s| s.trim().to_string())
        .unwrap_or(existing.description);

    let group: RoleGroup = sqlx::query_as(
        "UPDATE role_groups
         SET name = $1, description = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING id, name, description, created_by, created_at, updated_at",
    )
    .bind(&new_name)
    .bind(&new_description)
    .bind(group_id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| {
        if let sqlx::Error::Database(ref db_err) = e {
            if db_err.constraint() == Some("role_groups_name_key") {
                return AppError::Conflict("A role group with this name already exists".into());
            }
        }
        AppError::Database(e)
    })?;

    let permissions = fetch_group_permissions(pool.get_ref(), group_id).await?;

    // Audit log
    let ip = req.peer_addr().map(|a| a.to_string()).unwrap_or_default();
    let _ = crate::handlers::files::write_audit_log_internal(
        pool.get_ref(),
        uuid::Uuid::nil(),
        "ROLE_GROUP_UPDATE",
        &format!("{} ({})", group.id, new_name),
        &ip,
    )
    .await;

    Ok(HttpResponse::Ok().json(RoleGroupDetail {
        id: group.id,
        name: group.name,
        description: group.description,
        permissions,
        created_by: group.created_by,
        created_at: group.created_at,
        updated_at: group.updated_at,
    }))
}

// ── DELETE /api/admin/role-groups/{id} ────────────────────────────────────────

pub async fn delete_role_group(
    pool: web::Data<PgPool>,
    admin: AdminUser,
    req: HttpRequest,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    crate::app_middleware::admin::require_permission_or(
        &admin,
        pool.get_ref(),
        "role_groups:manage",
        "users:manage",
    )
    .await?;
    let group_id = path.into_inner();

    // Verify the group exists before deleting
    let _existing = fetch_group(pool.get_ref(), group_id).await?;

    let deleted = sqlx::query("DELETE FROM role_groups WHERE id = $1")
        .bind(group_id)
        .execute(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

    if deleted.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    // Audit log
    let ip = req.peer_addr().map(|a| a.to_string()).unwrap_or_default();
    let _ = crate::handlers::files::write_audit_log_internal(
        pool.get_ref(),
        uuid::Uuid::nil(),
        "ROLE_GROUP_DELETE",
        &group_id.to_string(),
        &ip,
    )
    .await;

    tracing::info!(
        group_id = %group_id,
        "Admin deleted role group"
    );

    Ok(HttpResponse::NoContent().finish())
}

// ── POST /api/admin/role-groups/{id}/duplicate ────────────────────────────────
// Duplicate a role group with all its permissions (but not its users).

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DuplicateRoleGroupRequest {
    pub name: Option<String>,
}

pub async fn duplicate_role_group(
    pool: web::Data<PgPool>,
    admin: AdminUser,
    req: HttpRequest,
    path: web::Path<Uuid>,
    body: web::Json<DuplicateRoleGroupRequest>,
) -> Result<HttpResponse, AppError> {
    crate::app_middleware::admin::require_permission_or(
        &admin,
        pool.get_ref(),
        "role_groups:manage",
        "users:manage",
    )
    .await?;
    let source_id = path.into_inner();
    let source = fetch_group(pool.get_ref(), source_id).await?;
    let source_perms = fetch_group_permissions(pool.get_ref(), source_id).await?;

    let new_name = body
        .name
        .as_deref()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| format!("{} (copy)", source.name));

    if new_name.is_empty() {
        return Err(AppError::BadRequest("Group name is required".into()));
    }

    let group: RoleGroup = sqlx::query_as(
        "INSERT INTO role_groups (name, description, created_by)
         VALUES ($1, $2, $3)
         RETURNING id, name, description, created_by, created_at, updated_at",
    )
    .bind(&new_name)
    .bind(&source.description)
    .bind(&admin.username)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| {
        if let sqlx::Error::Database(ref db_err) = e {
            if db_err.constraint() == Some("role_groups_name_key") {
                return AppError::Conflict("A role group with this name already exists".into());
            }
        }
        AppError::Database(e)
    })?;

    // Copy permissions to the new group
    for perm in &source_perms {
        sqlx::query(
            "INSERT INTO role_group_permissions (role_group_id, permission_id)
             VALUES ($1, $2) ON CONFLICT DO NOTHING",
        )
        .bind(group.id)
        .bind(perm.id)
        .execute(pool.get_ref())
        .await
        .map_err(AppError::Database)?;
    }

    // Audit log
    let ip = req.peer_addr().map(|a| a.to_string()).unwrap_or_default();
    let _ = crate::handlers::files::write_audit_log_internal(
        pool.get_ref(),
        uuid::Uuid::nil(),
        "ROLE_GROUP_DUPLICATE",
        &format!("{} → {} ({})", source_id, group.id, new_name),
        &ip,
    )
    .await;

    let permissions = fetch_group_permissions(pool.get_ref(), group.id).await?;

    Ok(HttpResponse::Created().json(RoleGroupDetail {
        id: group.id,
        name: group.name,
        description: group.description,
        permissions,
        created_by: group.created_by,
        created_at: group.created_at,
        updated_at: group.updated_at,
    }))
}

// ── PUT /api/admin/role-groups/{id}/permissions ───────────────────────────────
// Replace-all: DELETE existing + INSERT new inside a transaction.

pub async fn set_group_permissions(
    pool: web::Data<PgPool>,
    admin: AdminUser,
    req: HttpRequest,
    path: web::Path<Uuid>,
    body: web::Json<SetPermissionsRequest>,
) -> Result<HttpResponse, AppError> {
    crate::app_middleware::admin::require_permission_or(
        &admin,
        pool.get_ref(),
        "role_groups:manage",
        "users:manage",
    )
    .await?;
    let group_id = path.into_inner();

    // Verify the group exists and snapshot current permissions for audit diff
    let existing = fetch_group(pool.get_ref(), group_id).await?;
    let existing_perms = fetch_group_permissions(pool.get_ref(), group_id).await?;

    // Validate all permission IDs exist
    if !body.permission_ids.is_empty() {
        let valid_count: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM permissions WHERE id = ANY($1)")
                .bind(&body.permission_ids)
                .fetch_one(pool.get_ref())
                .await
                .map_err(AppError::Database)?;

        if valid_count != body.permission_ids.len() as i64 {
            return Err(AppError::BadRequest(
                "One or more permission IDs are invalid".into(),
            ));
        }
    }

    // Transaction: replace all permissions
    let mut tx = pool.begin().await.map_err(AppError::Database)?;

    sqlx::query("DELETE FROM role_group_permissions WHERE role_group_id = $1")
        .bind(group_id)
        .execute(&mut *tx)
        .await
        .map_err(AppError::Database)?;

    for perm_id in &body.permission_ids {
        sqlx::query(
            "INSERT INTO role_group_permissions (role_group_id, permission_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING",
        )
        .bind(group_id)
        .bind(perm_id)
        .execute(&mut *tx)
        .await
        .map_err(AppError::Database)?;
    }

    tx.commit().await.map_err(AppError::Database)?;

    // Audit log with before/after permission diff
    let ip = req.peer_addr().map(|a| a.to_string()).unwrap_or_default();
    let before_keys: Vec<&str> = existing_perms.iter().map(|p| p.key.as_str()).collect();
    let after_keys: Vec<String> = if body.permission_ids.is_empty() {
        vec![]
    } else {
        sqlx::query_scalar("SELECT key FROM permissions WHERE id = ANY($1) ORDER BY key")
            .bind(&body.permission_ids)
            .fetch_all(pool.get_ref())
            .await
            .unwrap_or_default()
    };
    let diff = serde_json::json!({
        "group_id": group_id.to_string(),
        "group_name": existing.name,
        "before": before_keys,
        "after": after_keys,
    });
    let _ = crate::handlers::files::write_audit_log_internal(
        pool.get_ref(),
        uuid::Uuid::nil(),
        "ROLE_GROUP_PERMISSIONS",
        &diff.to_string(),
        &ip,
    )
    .await;

    // Return updated group detail
    let group = fetch_group(pool.get_ref(), group_id).await?;
    let permissions = fetch_group_permissions(pool.get_ref(), group_id).await?;

    Ok(HttpResponse::Ok().json(RoleGroupDetail {
        id: group.id,
        name: group.name,
        description: group.description,
        permissions,
        created_by: group.created_by,
        created_at: group.created_at,
        updated_at: group.updated_at,
    }))
}

// ── GET /api/admin/role-groups/{id}/users ─────────────────────────────────────

pub async fn list_group_users(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let group_id = path.into_inner();

    // Verify the group exists
    let _existing = fetch_group(pool.get_ref(), group_id).await?;

    let users: Vec<UserRoleGroupEntry> = sqlx::query_as(
        "SELECT u.id AS user_id, u.full_name, u.email, u.role
         FROM users u
         JOIN user_role_groups urg ON urg.user_id = u.id
         WHERE urg.role_group_id = $1
         ORDER BY u.full_name",
    )
    .bind(group_id)
    .fetch_all(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    Ok(HttpResponse::Ok().json(users))
}

// ── PUT /api/admin/role-groups/{id}/users ─────────────────────────────────────
// Replace-all: DELETE existing + INSERT new inside a transaction.

pub async fn set_group_users(
    pool: web::Data<PgPool>,
    admin: AdminUser,
    req: HttpRequest,
    path: web::Path<Uuid>,
    body: web::Json<SetUsersRequest>,
) -> Result<HttpResponse, AppError> {
    crate::app_middleware::admin::require_permission_or(
        &admin,
        pool.get_ref(),
        "role_groups:assign",
        "users:manage",
    )
    .await?;
    let group_id = path.into_inner();

    // Verify the group exists
    let _existing = fetch_group(pool.get_ref(), group_id).await?;

    // Validate all user IDs exist
    if !body.user_ids.is_empty() {
        let valid_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users WHERE id = ANY($1)")
            .bind(&body.user_ids)
            .fetch_one(pool.get_ref())
            .await
            .map_err(AppError::Database)?;

        if valid_count != body.user_ids.len() as i64 {
            return Err(AppError::BadRequest(
                "One or more user IDs are invalid".into(),
            ));
        }
    }

    // Transaction: replace all user assignments
    let mut tx = pool.begin().await.map_err(AppError::Database)?;

    sqlx::query("DELETE FROM user_role_groups WHERE role_group_id = $1")
        .bind(group_id)
        .execute(&mut *tx)
        .await
        .map_err(AppError::Database)?;

    for user_id in &body.user_ids {
        sqlx::query(
            "INSERT INTO user_role_groups (user_id, role_group_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING",
        )
        .bind(user_id)
        .bind(group_id)
        .execute(&mut *tx)
        .await
        .map_err(AppError::Database)?;
    }

    tx.commit().await.map_err(AppError::Database)?;

    // Audit log
    let ip = req.peer_addr().map(|a| a.to_string()).unwrap_or_default();
    let _ = crate::handlers::files::write_audit_log_internal(
        pool.get_ref(),
        uuid::Uuid::nil(),
        "ROLE_GROUP_USERS",
        &format!("{} ({} users)", group_id, body.user_ids.len()),
        &ip,
    )
    .await;

    Ok(HttpResponse::Ok().json(serde_json::json!({ "status": "ok" })))
}

// ── GET /api/admin/users/group-summaries ──────────────────────────────────────
// Returns { userId → group names[] } for all users. Efficient single query.

#[derive(Debug, serde::Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct UserGroupSummary {
    pub user_id: Uuid,
    pub group_name: String,
}

pub async fn list_user_group_summaries(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
) -> Result<HttpResponse, AppError> {
    let rows: Vec<UserGroupSummary> = sqlx::query_as(
        "SELECT u.id AS user_id, rg.name AS group_name
         FROM users u
         JOIN user_role_groups urg ON urg.user_id = u.id
         JOIN role_groups rg ON rg.id = urg.role_group_id
         ORDER BY u.id, rg.name",
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    // Group by user_id
    let mut map: std::collections::HashMap<Uuid, Vec<String>> = std::collections::HashMap::new();
    for row in rows {
        map.entry(row.user_id).or_default().push(row.group_name);
    }

    Ok(HttpResponse::Ok().json(map))
}

// ── GET /api/admin/users/{id}/groups ─────────────────────────────────────────
// Returns the role groups a specific user belongs to (reverse lookup).

#[derive(Debug, serde::Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct UserGroupEntry {
    pub id: Uuid,
    pub name: String,
    pub description: String,
}

pub async fn list_user_groups(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let user_id = path.into_inner();

    // Verify the user exists
    let user_exists: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)")
        .bind(user_id)
        .fetch_one(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

    if !user_exists {
        return Err(AppError::NotFound);
    }

    let groups: Vec<UserGroupEntry> = sqlx::query_as(
        "SELECT rg.id, rg.name, rg.description
         FROM role_groups rg
         JOIN user_role_groups urg ON urg.role_group_id = rg.id
         WHERE urg.user_id = $1
         ORDER BY rg.name",
    )
    .bind(user_id)
    .fetch_all(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    Ok(HttpResponse::Ok().json(groups))
}

// ═══════════════════════════════════════════════════════════════════════════════
// Permissions CRUD (create / update / delete individual permission definitions)
// ═══════════════════════════════════════════════════════════════════════════════

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePermissionRequest {
    pub key: String,
    pub description: String,
}

pub async fn create_permission(
    pool: web::Data<PgPool>,
    admin: AdminUser,
    req: HttpRequest,
    body: web::Json<CreatePermissionRequest>,
) -> Result<HttpResponse, AppError> {
    crate::app_middleware::admin::require_permission_or(
        &admin,
        pool.get_ref(),
        "permissions:manage",
        "users:manage",
    )
    .await?;

    let key = body.key.trim().to_lowercase().replace(' ', "_");
    let description = body.description.trim().to_string();

    if key.is_empty() || description.is_empty() {
        return Err(AppError::BadRequest(
            "key and description are required".into(),
        ));
    }
    if key.len() > 255 {
        return Err(AppError::BadRequest(
            "Permission key must be 255 characters or less".into(),
        ));
    }
    if description.len() > 1024 {
        return Err(AppError::BadRequest(
            "Permission description must be 1024 characters or less".into(),
        ));
    }

    let perm: Permission = sqlx::query_as(
        "INSERT INTO permissions (key, description) VALUES ($1, $2)
         RETURNING id, key, description",
    )
    .bind(&key)
    .bind(&description)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| {
        if let sqlx::Error::Database(ref db_err) = e {
            if db_err.constraint() == Some("permissions_key_key") {
                return AppError::Conflict("A permission with this key already exists".into());
            }
        }
        AppError::Database(e)
    })?;

    let ip = req.peer_addr().map(|a| a.to_string()).unwrap_or_default();
    let _ = crate::handlers::files::write_audit_log_internal(
        pool.get_ref(),
        uuid::Uuid::nil(),
        "PERMISSION_CREATE",
        &format!("{} ({})", perm.id, key),
        &ip,
    )
    .await;

    Ok(HttpResponse::Created().json(perm))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePermissionRequest {
    pub description: String,
}

pub async fn update_permission(
    pool: web::Data<PgPool>,
    admin: AdminUser,
    req: HttpRequest,
    path: web::Path<Uuid>,
    body: web::Json<UpdatePermissionRequest>,
) -> Result<HttpResponse, AppError> {
    crate::app_middleware::admin::require_permission_or(
        &admin,
        pool.get_ref(),
        "permissions:manage",
        "users:manage",
    )
    .await?;

    let perm_id = path.into_inner();
    let description = body.description.trim().to_string();

    if description.len() > 1024 {
        return Err(AppError::BadRequest(
            "Permission description must be 1024 characters or less".into(),
        ));
    }

    let perm: Permission = sqlx::query_as(
        "UPDATE permissions SET description = $1 WHERE id = $2
         RETURNING id, key, description",
    )
    .bind(&description)
    .bind(perm_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(AppError::Database)?
    .ok_or(AppError::NotFound)?;

    let ip = req.peer_addr().map(|a| a.to_string()).unwrap_or_default();
    let _ = crate::handlers::files::write_audit_log_internal(
        pool.get_ref(),
        uuid::Uuid::nil(),
        "PERMISSION_UPDATE",
        &perm_id.to_string(),
        &ip,
    )
    .await;

    Ok(HttpResponse::Ok().json(perm))
}

pub async fn delete_permission(
    pool: web::Data<PgPool>,
    admin: AdminUser,
    req: HttpRequest,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    crate::app_middleware::admin::require_permission_or(
        &admin,
        pool.get_ref(),
        "permissions:manage",
        "users:manage",
    )
    .await?;

    let perm_id = path.into_inner();

    let deleted = sqlx::query("DELETE FROM permissions WHERE id = $1")
        .bind(perm_id)
        .execute(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

    if deleted.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    let ip = req.peer_addr().map(|a| a.to_string()).unwrap_or_default();
    let _ = crate::handlers::files::write_audit_log_internal(
        pool.get_ref(),
        uuid::Uuid::nil(),
        "PERMISSION_DELETE",
        &perm_id.to_string(),
        &ip,
    )
    .await;

    Ok(HttpResponse::NoContent().finish())
}

// ── GET /api/admin/permissions/{id}/usage ────────────────────────────────────
// Returns where this permission is referenced, so admins can assess impact
// before deleting.

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PermissionUsage {
    role_groups: Vec<String>,
    custom_roles: Vec<String>,
    classification_rules: i64,
    user_overrides: i64,
}

pub async fn get_permission_usage(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let perm_id = path.into_inner();

    // Role groups that include this permission
    let role_groups: Vec<String> = sqlx::query_scalar(
        "SELECT rg.name FROM role_groups rg
         JOIN role_group_permissions rgp ON rgp.role_group_id = rg.id
         WHERE rgp.permission_id = $1
         ORDER BY rg.name",
    )
    .bind(perm_id)
    .fetch_all(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    // Custom roles with this implicit permission
    let custom_roles: Vec<String> = sqlx::query_scalar(
        "SELECT cr.role_key FROM custom_roles cr
         JOIN role_implicit_permissions rip ON rip.role_key = cr.role_key
         WHERE rip.permission_id = $1
         ORDER BY cr.role_key",
    )
    .bind(perm_id)
    .fetch_all(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    // Classification rules referencing this permission
    let classification_rules: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM classification_permissions WHERE permission_id = $1",
    )
    .bind(perm_id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    // Direct user overrides
    let user_overrides: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM user_permissions WHERE permission_id = $1")
            .bind(perm_id)
            .fetch_one(pool.get_ref())
            .await
            .map_err(AppError::Database)?;

    Ok(HttpResponse::Ok().json(PermissionUsage {
        role_groups,
        custom_roles,
        classification_rules,
        user_overrides,
    }))
}

// ═══════════════════════════════════════════════════════════════════════════════
// Custom Roles CRUD
// ═══════════════════════════════════════════════════════════════════════════════

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct CustomRoleEntry {
    pub role_key: String,
    pub label: String,
    pub level: i16,
}

pub async fn list_custom_roles(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
) -> Result<HttpResponse, AppError> {
    let roles: Vec<CustomRoleEntry> =
        sqlx::query_as("SELECT role_key, label, level FROM custom_roles ORDER BY level DESC")
            .fetch_all(pool.get_ref())
            .await
            .map_err(AppError::Database)?;
    Ok(HttpResponse::Ok().json(roles))
}

/// Public endpoint — no auth required. Returns a simple { roleKey: label } map.
/// Role labels are not sensitive; they only map internal keys to human-readable names.
pub async fn list_role_labels_public(pool: web::Data<PgPool>) -> Result<HttpResponse, AppError> {
    let roles: Vec<CustomRoleEntry> =
        sqlx::query_as("SELECT role_key, label, level FROM custom_roles ORDER BY level DESC")
            .fetch_all(pool.get_ref())
            .await
            .map_err(AppError::Database)?;
    let map: std::collections::HashMap<String, String> =
        roles.into_iter().map(|r| (r.role_key, r.label)).collect();
    Ok(HttpResponse::Ok().json(map))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCustomRoleRequest {
    pub role_key: String,
    pub label: String,
    #[serde(default = "default_role_level")]
    pub level: i16,
}

fn default_role_level() -> i16 {
    1
}

pub async fn create_custom_role(
    pool: web::Data<PgPool>,
    admin: AdminUser,
    req: HttpRequest,
    body: web::Json<CreateCustomRoleRequest>,
) -> Result<HttpResponse, AppError> {
    crate::app_middleware::admin::require_permission_or(
        &admin,
        pool.get_ref(),
        "role_groups:manage",
        "users:manage",
    )
    .await?;

    let role_key = body.role_key.trim().to_lowercase().replace(' ', "_");
    let label = body.label.trim().to_string();

    if role_key.is_empty() || label.is_empty() {
        return Err(AppError::BadRequest(
            "roleKey and label are required".into(),
        ));
    }
    if !(1..=10).contains(&body.level) {
        return Err(AppError::BadRequest(
            "Role level must be between 1 and 10".into(),
        ));
    }

    let role: CustomRoleEntry = sqlx::query_as(
        "INSERT INTO custom_roles (role_key, label, level) VALUES ($1, $2, $3)
         RETURNING role_key, label, level",
    )
    .bind(&role_key)
    .bind(&label)
    .bind(body.level)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| {
        if let sqlx::Error::Database(ref db_err) = e {
            if db_err.constraint() == Some("custom_roles_pkey") {
                return AppError::Conflict("A role with this key already exists".into());
            }
        }
        AppError::Database(e)
    })?;

    let ip = req.peer_addr().map(|a| a.to_string()).unwrap_or_default();
    let _ = crate::handlers::files::write_audit_log_internal(
        pool.get_ref(),
        uuid::Uuid::nil(),
        "CUSTOM_ROLE_CREATE",
        &role_key,
        &ip,
    )
    .await;

    Ok(HttpResponse::Created().json(role))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCustomRoleRequest {
    pub label: String,
}

pub async fn update_custom_role(
    pool: web::Data<PgPool>,
    admin: AdminUser,
    req: HttpRequest,
    path: web::Path<String>,
    body: web::Json<UpdateCustomRoleRequest>,
) -> Result<HttpResponse, AppError> {
    crate::app_middleware::admin::require_permission_or(
        &admin,
        pool.get_ref(),
        "role_groups:manage",
        "users:manage",
    )
    .await?;

    let role_key = path.into_inner();
    let label = body.label.trim().to_string();

    if label.is_empty() {
        return Err(AppError::BadRequest("label is required".into()));
    }

    let role: CustomRoleEntry = sqlx::query_as(
        "UPDATE custom_roles SET label = $1 WHERE role_key = $2
         RETURNING role_key, label, level",
    )
    .bind(&label)
    .bind(&role_key)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| match e {
        sqlx::Error::RowNotFound => AppError::NotFound,
        other => AppError::Database(other),
    })?;

    let ip = req.peer_addr().map(|a| a.to_string()).unwrap_or_default();
    let _ = crate::handlers::files::write_audit_log_internal(
        pool.get_ref(),
        uuid::Uuid::nil(),
        "CUSTOM_ROLE_UPDATE",
        &role_key,
        &ip,
    )
    .await;

    Ok(HttpResponse::Ok().json(role))
}

pub async fn delete_custom_role(
    pool: web::Data<PgPool>,
    admin: AdminUser,
    req: HttpRequest,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    crate::app_middleware::admin::require_permission_or(
        &admin,
        pool.get_ref(),
        "role_groups:manage",
        "users:manage",
    )
    .await?;

    let role_key = path.into_inner();

    if ["chief", "director", "officer", "staff"].contains(&role_key.as_str()) {
        return Err(AppError::BadRequest(
            "Cannot delete core base roles (chief, director, officer, staff)".into(),
        ));
    }

    let deleted = sqlx::query("DELETE FROM custom_roles WHERE role_key = $1")
        .bind(&role_key)
        .execute(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

    if deleted.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    let ip = req.peer_addr().map(|a| a.to_string()).unwrap_or_default();
    let _ = crate::handlers::files::write_audit_log_internal(
        pool.get_ref(),
        uuid::Uuid::nil(),
        "CUSTOM_ROLE_DELETE",
        &role_key,
        &ip,
    )
    .await;

    Ok(HttpResponse::NoContent().finish())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetRoleImplicitPermissionsRequest {
    pub permission_ids: Vec<Uuid>,
}

pub async fn get_role_implicit_permissions(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let role_key = path.into_inner();

    let exists: bool =
        sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM custom_roles WHERE role_key = $1)")
            .bind(&role_key)
            .fetch_one(pool.get_ref())
            .await
            .map_err(AppError::Database)?;
    if !exists {
        return Err(AppError::NotFound);
    }

    let perms: Vec<Permission> = sqlx::query_as(
        "SELECT p.id, p.key, p.description
         FROM permissions p
         JOIN role_implicit_permissions rip ON rip.permission_id = p.id
         WHERE rip.role_key = $1
         ORDER BY p.key",
    )
    .bind(&role_key)
    .fetch_all(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    Ok(HttpResponse::Ok().json(perms))
}

pub async fn set_role_implicit_permissions(
    pool: web::Data<PgPool>,
    admin: AdminUser,
    req: HttpRequest,
    path: web::Path<String>,
    body: web::Json<SetRoleImplicitPermissionsRequest>,
) -> Result<HttpResponse, AppError> {
    crate::app_middleware::admin::require_permission_or(
        &admin,
        pool.get_ref(),
        "role_groups:manage",
        "users:manage",
    )
    .await?;

    let role_key = path.into_inner();

    let exists: bool =
        sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM custom_roles WHERE role_key = $1)")
            .bind(&role_key)
            .fetch_one(pool.get_ref())
            .await
            .map_err(AppError::Database)?;
    if !exists {
        return Err(AppError::NotFound);
    }

    let mut tx = pool.begin().await.map_err(AppError::Database)?;

    sqlx::query("DELETE FROM role_implicit_permissions WHERE role_key = $1")
        .bind(&role_key)
        .execute(&mut *tx)
        .await
        .map_err(AppError::Database)?;

    for perm_id in &body.permission_ids {
        sqlx::query(
            "INSERT INTO role_implicit_permissions (role_key, permission_id)
             VALUES ($1, $2) ON CONFLICT DO NOTHING",
        )
        .bind(&role_key)
        .bind(perm_id)
        .execute(&mut *tx)
        .await
        .map_err(AppError::Database)?;
    }

    tx.commit().await.map_err(AppError::Database)?;

    let ip = req.peer_addr().map(|a| a.to_string()).unwrap_or_default();
    let _ = crate::handlers::files::write_audit_log_internal(
        pool.get_ref(),
        uuid::Uuid::nil(),
        "ROLE_IMPLICIT_PERMS",
        &format!("{} ({} perms)", role_key, body.permission_ids.len()),
        &ip,
    )
    .await;

    Ok(HttpResponse::Ok().json(serde_json::json!({ "status": "ok" })))
}

// ═══════════════════════════════════════════════════════════════════════════════
// Per-User Permission Assignment (direct grants outside of groups)
// ═══════════════════════════════════════════════════════════════════════════════

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetUserPermissionsRequest {
    pub permission_ids: Vec<Uuid>,
}

pub async fn list_user_permissions(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let user_id = path.into_inner();

    let perms: Vec<Permission> = sqlx::query_as(
        "SELECT p.id, p.key, p.description
         FROM permissions p
         JOIN user_permissions up ON up.permission_id = p.id
         WHERE up.user_id = $1
         ORDER BY p.key",
    )
    .bind(user_id)
    .fetch_all(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    Ok(HttpResponse::Ok().json(perms))
}

pub async fn set_user_permissions(
    pool: web::Data<PgPool>,
    admin: AdminUser,
    req: HttpRequest,
    path: web::Path<Uuid>,
    body: web::Json<SetUserPermissionsRequest>,
) -> Result<HttpResponse, AppError> {
    crate::app_middleware::admin::require_permission_or(
        &admin,
        pool.get_ref(),
        "role_groups:assign",
        "users:manage",
    )
    .await?;

    let user_id = path.into_inner();

    let mut tx = pool.begin().await.map_err(AppError::Database)?;

    sqlx::query("DELETE FROM user_permissions WHERE user_id = $1")
        .bind(user_id)
        .execute(&mut *tx)
        .await
        .map_err(AppError::Database)?;

    for perm_id in &body.permission_ids {
        sqlx::query(
            "INSERT INTO user_permissions (user_id, permission_id)
             VALUES ($1, $2) ON CONFLICT DO NOTHING",
        )
        .bind(user_id)
        .bind(perm_id)
        .execute(&mut *tx)
        .await
        .map_err(AppError::Database)?;
    }

    tx.commit().await.map_err(AppError::Database)?;

    let ip = req.peer_addr().map(|a| a.to_string()).unwrap_or_default();
    let _ = crate::handlers::files::write_audit_log_internal(
        pool.get_ref(),
        uuid::Uuid::nil(),
        "USER_PERMISSIONS_SET",
        &format!("{} ({} perms)", user_id, body.permission_ids.len()),
        &ip,
    )
    .await;

    Ok(HttpResponse::Ok().json(serde_json::json!({ "status": "ok" })))
}
