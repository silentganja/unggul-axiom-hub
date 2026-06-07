// ─────────────────────────────────────────────────────────────────────────────
// Classification Builder handlers — admin CRUD for dynamic classification
// tiers, their hierarchy levels, and permission-to-classification access rules.
// ─────────────────────────────────────────────────────────────────────────────

use crate::{
    app_middleware::admin::AdminUser,
    errors::AppError,
    models::{
        classification::{
            Classification, ClassificationAccessDetail, ClassificationPermission,
            ClassificationSummary,
        },
        role_group::Permission,
    },
};
use actix_web::{web, HttpResponse};
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;

// ── Request / Response shapes ─────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateClassificationRequest {
    pub key: String,
    pub label: String,
    #[serde(default)]
    pub level: i16,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub is_default: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateClassificationRequest {
    pub key: Option<String>,
    pub label: Option<String>,
    pub level: Option<i16>,
    pub description: Option<String>,
    pub is_default: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetClassificationPermissionsRequest {
    /// Permission IDs that grant read access to this classification.
    pub read_permission_ids: Vec<Uuid>,
    /// Permission IDs that grant write (assign/change-to) access.
    pub write_permission_ids: Vec<Uuid>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetDefaultClassificationRequest {
    pub classification_id: Uuid,
}

// ── GET /api/admin/classifications ────────────────────────────────────────────

pub async fn list_classifications(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
) -> Result<HttpResponse, AppError> {
    let classifications: Vec<ClassificationSummary> = sqlx::query_as(
        "SELECT
            c.id, c.key, c.label, c.level, c.description, c.is_default,
            c.created_at, c.updated_at,
            COALESCE(fc.cnt, 0) AS file_count
         FROM classifications c
         LEFT JOIN (
             SELECT classification, COUNT(*) AS cnt
             FROM files
             WHERE deleted_at IS NULL
             GROUP BY classification
         ) fc ON fc.classification = c.key
         ORDER BY c.level ASC",
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    Ok(HttpResponse::Ok().json(classifications))
}

// ── POST /api/admin/classifications ───────────────────────────────────────────

pub async fn create_classification(
    pool: web::Data<PgPool>,
    admin: AdminUser,
    body: web::Json<CreateClassificationRequest>,
) -> Result<HttpResponse, AppError> {
    crate::app_middleware::admin::require_permission(
        &admin,
        pool.get_ref(),
        "classifications:manage",
    )
    .await?;

    let key = body.key.trim().to_uppercase();
    if key.is_empty() || key.len() > 32 {
        return Err(AppError::BadRequest(
            "Key must be 1-32 characters".into(),
        ));
    }
    let label = body.label.trim().to_string();
    if label.is_empty() || label.len() > 64 {
        return Err(AppError::BadRequest(
            "Label must be 1-64 characters".into(),
        ));
    }

    // If this is the first classification or marked default, clear previous default
    if body.is_default {
        let _ = sqlx::query("UPDATE classifications SET is_default = FALSE WHERE is_default = TRUE")
            .execute(pool.get_ref())
            .await;
    }

    let classification: Classification = sqlx::query_as(
        "INSERT INTO classifications (key, label, level, description, is_default)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, key, label, level, description, is_default, created_at, updated_at",
    )
    .bind(&key)
    .bind(&label)
    .bind(body.level)
    .bind(body.description.trim().to_string())
    .bind(body.is_default)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| {
        if let sqlx::Error::Database(ref db_err) = e {
            if db_err.constraint() == Some("classifications_key_key") {
                return AppError::Conflict(
                    "A classification with this key already exists".into(),
                );
            }
        }
        AppError::Database(e)
    })?;

    tracing::info!(
        admin = %admin.username,
        classification_key = %key,
        level = %body.level,
        "Admin created classification"
    );

    Ok(HttpResponse::Created().json(classification))
}

// ── PUT /api/admin/classifications/{id} ───────────────────────────────────────

pub async fn update_classification(
    pool: web::Data<PgPool>,
    admin: AdminUser,
    path: web::Path<Uuid>,
    body: web::Json<UpdateClassificationRequest>,
) -> Result<HttpResponse, AppError> {
    crate::app_middleware::admin::require_permission(
        &admin,
        pool.get_ref(),
        "classifications:manage",
    )
    .await?;

    let id = path.into_inner();

    // Fetch existing
    let existing: Option<Classification> = sqlx::query_as(
        "SELECT id, key, label, level, description, is_default, created_at, updated_at
         FROM classifications WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    let existing = existing.ok_or(AppError::NotFound)?;

    let new_key = body
        .key
        .as_deref()
        .map(|s| s.trim().to_uppercase())
        .unwrap_or(existing.key.clone());

    if new_key.is_empty() || new_key.len() > 32 {
        return Err(AppError::BadRequest("Key must be 1-32 chars".into()));
    }

    let new_label = body
        .label
        .as_deref()
        .map(|s| s.trim().to_string())
        .unwrap_or(existing.label.clone());

    if new_label.is_empty() || new_label.len() > 64 {
        return Err(AppError::BadRequest("Label must be 1-64 chars".into()));
    }

    let new_level = body.level.unwrap_or(existing.level);
    let new_description = body
        .description
        .as_deref()
        .map(|s| s.trim().to_string())
        .unwrap_or(existing.description.clone());
    let new_is_default = body.is_default.unwrap_or(existing.is_default);

    // If setting this as default, clear previous default
    if new_is_default && !existing.is_default {
        let _ = sqlx::query("UPDATE classifications SET is_default = FALSE WHERE is_default = TRUE")
            .execute(pool.get_ref())
            .await;
    }

    // If key changed, update file references
    if new_key != existing.key {
        let _ = sqlx::query(
            "UPDATE files SET classification = $1 WHERE classification = $2",
        )
        .bind(&new_key)
        .bind(&existing.key)
        .execute(pool.get_ref())
        .await;
    }

    let classification: Classification = sqlx::query_as(
        "UPDATE classifications
         SET key = $1, label = $2, level = $3, description = $4, is_default = $5, updated_at = NOW()
         WHERE id = $6
         RETURNING id, key, label, level, description, is_default, created_at, updated_at",
    )
    .bind(&new_key)
    .bind(&new_label)
    .bind(new_level)
    .bind(&new_description)
    .bind(new_is_default)
    .bind(id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| {
        if let sqlx::Error::Database(ref db_err) = e {
            if db_err.constraint() == Some("classifications_key_key") {
                return AppError::Conflict(
                    "A classification with this key already exists".into(),
                );
            }
        }
        AppError::Database(e)
    })?;

    tracing::info!(
        admin = %admin.username,
        classification_id = %id,
        new_key = %new_key,
        "Admin updated classification"
    );

    Ok(HttpResponse::Ok().json(classification))
}

// ── DELETE /api/admin/classifications/{id} ────────────────────────────────────

pub async fn delete_classification(
    pool: web::Data<PgPool>,
    admin: AdminUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    crate::app_middleware::admin::require_permission(
        &admin,
        pool.get_ref(),
        "classifications:manage",
    )
    .await?;

    let id = path.into_inner();

    // Check if any files use this classification
    let existing: Option<(String,)> =
        sqlx::query_as("SELECT key FROM classifications WHERE id = $1")
            .bind(id)
            .fetch_optional(pool.get_ref())
            .await
            .map_err(AppError::Database)?;

    let (key,) = existing.ok_or(AppError::NotFound)?;

    let file_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM files WHERE classification = $1 AND deleted_at IS NULL",
    )
    .bind(&key)
    .fetch_one(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    if file_count > 0 {
        return Err(AppError::Conflict(format!(
            "Cannot delete classification '{}': {} file(s) are using it. Reclassify them first.",
            key, file_count
        )));
    }

    // Don't allow deleting the last classification
    let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM classifications")
        .fetch_one(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

    if total <= 1 {
        return Err(AppError::Conflict(
            "Cannot delete the last classification".into(),
        ));
    }

    sqlx::query("DELETE FROM classifications WHERE id = $1")
        .bind(id)
        .execute(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

    tracing::warn!(
        admin = %admin.username,
        classification_id = %id,
        classification_key = %key,
        "Admin deleted classification"
    );

    Ok(HttpResponse::NoContent().finish())
}

// ── GET /api/admin/classifications/{id}/permissions ───────────────────────────

pub async fn get_classification_permissions(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();

    // Get the classification key
    let key: Option<String> =
        sqlx::query_scalar("SELECT key FROM classifications WHERE id = $1")
            .bind(id)
            .fetch_optional(pool.get_ref())
            .await
            .map_err(AppError::Database)?;

    let key = key.ok_or(AppError::NotFound)?;

    // Read all junction rows in one query — ClassificationPermission is the
    // canonical row type for the classification_permissions table.
    let junctions: Vec<ClassificationPermission> = sqlx::query_as(
        "SELECT classification_id, permission_id, access_type
         FROM classification_permissions
         WHERE classification_id = $1
         ORDER BY access_type",
    )
    .bind(id)
    .fetch_all(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    // Collect unique permission IDs from junction rows
    let perm_ids: Vec<Uuid> = junctions.iter().map(|j| j.permission_id).collect();
    let read_ids: Vec<Uuid> = junctions
        .iter()
        .filter(|j| j.access_type == "read")
        .map(|j| j.permission_id)
        .collect();
    let write_ids: Vec<Uuid> = junctions
        .iter()
        .filter(|j| j.access_type == "write")
        .map(|j| j.permission_id)
        .collect();

    // Fetch all referenced permissions in one query
    let all_perms: Vec<Permission> = if perm_ids.is_empty() {
        vec![]
    } else {
        sqlx::query_as(
            "SELECT id, key, description FROM permissions WHERE id = ANY($1) ORDER BY key",
        )
        .bind(&perm_ids)
        .fetch_all(pool.get_ref())
        .await
        .map_err(AppError::Database)?
    };

    let read_permissions: Vec<Permission> = all_perms
        .iter()
        .filter(|p| read_ids.contains(&p.id))
        .cloned()
        .collect();
    let write_permissions: Vec<Permission> = all_perms
        .iter()
        .filter(|p| write_ids.contains(&p.id))
        .cloned()
        .collect();

    Ok(HttpResponse::Ok().json(ClassificationAccessDetail {
        classification_id: id,
        classification_key: key,
        read_permissions,
        write_permissions,
    }))
}

// ── PUT /api/admin/classifications/{id}/permissions ───────────────────────────

pub async fn set_classification_permissions(
    pool: web::Data<PgPool>,
    admin: AdminUser,
    path: web::Path<Uuid>,
    body: web::Json<SetClassificationPermissionsRequest>,
) -> Result<HttpResponse, AppError> {
    crate::app_middleware::admin::require_permission(
        &admin,
        pool.get_ref(),
        "classifications:manage",
    )
    .await?;

    let id = path.into_inner();

    // Verify classification exists
    let exists: bool =
        sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM classifications WHERE id = $1)")
            .bind(id)
            .fetch_one(pool.get_ref())
            .await
            .map_err(AppError::Database)?;

    if !exists {
        return Err(AppError::NotFound);
    }

    // Use a transaction for atomic replacement
    let mut tx = pool.begin().await.map_err(AppError::Database)?;

    // Clear existing permissions for this classification
    sqlx::query("DELETE FROM classification_permissions WHERE classification_id = $1")
        .bind(id)
        .execute(&mut *tx)
        .await
        .map_err(AppError::Database)?;

    // Insert read permissions
    for perm_id in &body.read_permission_ids {
        sqlx::query(
            "INSERT INTO classification_permissions (classification_id, permission_id, access_type)
             VALUES ($1, $2, 'read')
             ON CONFLICT DO NOTHING",
        )
        .bind(id)
        .bind(perm_id)
        .execute(&mut *tx)
        .await
        .map_err(AppError::Database)?;
    }

    // Insert write permissions
    for perm_id in &body.write_permission_ids {
        sqlx::query(
            "INSERT INTO classification_permissions (classification_id, permission_id, access_type)
             VALUES ($1, $2, 'write')
             ON CONFLICT DO NOTHING",
        )
        .bind(id)
        .bind(perm_id)
        .execute(&mut *tx)
        .await
        .map_err(AppError::Database)?;
    }

    tx.commit().await.map_err(AppError::Database)?;

    tracing::info!(
        admin = %admin.username,
        classification_id = %id,
        read_count = %body.read_permission_ids.len(),
        write_count = %body.write_permission_ids.len(),
        "Admin updated classification permissions"
    );

    Ok(HttpResponse::Ok().json(serde_json::json!({ "status": "ok" })))
}

// ── GET /api/admin/classifications/default ────────────────────────────────────

pub async fn get_default_classification(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
) -> Result<HttpResponse, AppError> {
    let default: Option<Classification> = sqlx::query_as(
        "SELECT id, key, label, level, description, is_default, created_at, updated_at
         FROM classifications WHERE is_default = TRUE LIMIT 1",
    )
    .fetch_optional(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    match default {
        Some(c) => Ok(HttpResponse::Ok().json(c)),
        None => {
            // Fall back to lowest-level classification
            let first: Option<Classification> = sqlx::query_as(
                "SELECT id, key, label, level, description, is_default, created_at, updated_at
                 FROM classifications ORDER BY level ASC LIMIT 1",
            )
            .fetch_optional(pool.get_ref())
            .await
            .map_err(AppError::Database)?;

            match first {
                Some(c) => Ok(HttpResponse::Ok().json(c)),
                None => Ok(HttpResponse::Ok().json(serde_json::json!({
                    "key": "TERBUKA",
                    "label": "Terbuka (Open)",
                    "level": 0,
                    "isDefault": true
                }))),
            }
        }
    }
}

// ── PUT /api/admin/classifications/default ────────────────────────────────────

pub async fn set_default_classification(
    pool: web::Data<PgPool>,
    admin: AdminUser,
    body: web::Json<SetDefaultClassificationRequest>,
) -> Result<HttpResponse, AppError> {
    crate::app_middleware::admin::require_permission(
        &admin,
        pool.get_ref(),
        "classifications:manage",
    )
    .await?;

    // Clear current default
    let _ = sqlx::query("UPDATE classifications SET is_default = FALSE WHERE is_default = TRUE")
        .execute(pool.get_ref())
        .await;

    // Set new default
    let updated = sqlx::query("UPDATE classifications SET is_default = TRUE, updated_at = NOW() WHERE id = $1")
        .bind(body.classification_id)
        .execute(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

    if updated.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    tracing::info!(
        admin = %admin.username,
        classification_id = %body.classification_id,
        "Admin changed default classification"
    );

    Ok(HttpResponse::Ok().json(serde_json::json!({ "status": "ok" })))
}
