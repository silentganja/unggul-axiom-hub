use crate::{
    app_middleware::auth::AuthUser,
    errors::AppError,
    models::governance::{CreateGovernanceRequest, GovernanceRequestResponse},
    models::user,
};
use actix_web::{web, HttpResponse};
use sqlx::PgPool;
use uuid::Uuid;

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/governance/requests
// ─────────────────────────────────────────────────────────────────────────────

/// Submit a new governance request (file lock, unlock, classification change).
pub async fn create_request(
    pool: web::Data<PgPool>,
    user: AuthUser,
    body: web::Json<CreateGovernanceRequest>,
) -> Result<HttpResponse, AppError> {
    let req_type = body.r#type.trim().to_string();
    let title = body.title.trim().to_string();

    if !["FILE_LOCK", "FILE_UNLOCK", "CLASSIFICATION_UPGRADE", "CLASSIFICATION_DOWNGRADE"]
        .contains(&req_type.as_str())
    {
        return Err(AppError::BadRequest("Invalid request type".into()));
    }
    if title.is_empty() {
        return Err(AppError::BadRequest("Title is required".into()));
    }

    // If a target file is specified, verify it exists and belongs to the user
    if let Some(file_id) = body.target_file_id {
        let file_exists: bool = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM files WHERE id = $1 AND owner_id = $2)",
        )
        .bind(file_id)
        .bind(user.id)
        .fetch_one(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

        if !file_exists {
            return Err(AppError::NotFound);
        }
    }

    let request: GovernanceRequestResponse = sqlx::query_as::<_, GovernanceRequestResponse>(
        "INSERT INTO governance_requests (type, title, description, requested_by, target_file_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING
            id, type, title, description, status,
            requested_by,
            (SELECT full_name FROM users WHERE id = $4) AS requested_by_name,
            (SELECT email    FROM users WHERE id = $4) AS requested_by_email,
            reviewed_by, NULL::VARCHAR AS reviewed_by_name,
            target_file_id,
            (SELECT name FROM files WHERE id = $5) AS target_file_name,
            metadata, created_at, updated_at",
    )
    .bind(&req_type)
    .bind(&title)
    .bind(&body.description)
    .bind(user.id)
    .bind(body.target_file_id)
    .bind(&body.metadata)
    .fetch_one(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    tracing::info!(
        user_id = %user.id,
        request_id = %request.id,
        req_type = %req_type,
        "Governance request submitted"
    );

    Ok(HttpResponse::Created().json(request))
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/governance/requests
// ─────────────────────────────────────────────────────────────────────────────

/// List governance requests. Admins see all; staff see only their own.
pub async fn list_requests(
    pool: web::Data<PgPool>,
    user: AuthUser,
) -> Result<HttpResponse, AppError> {
    let requests: Vec<GovernanceRequestResponse> = if user::can_govern(&user.role) {
        sqlx::query_as::<_, GovernanceRequestResponse>(
            "SELECT
                gr.id, gr.type, gr.title, gr.description, gr.status,
                gr.requested_by,
                u1.full_name AS requested_by_name,
                u1.email     AS requested_by_email,
                gr.reviewed_by,
                u2.full_name AS reviewed_by_name,
                gr.target_file_id,
                f.name       AS target_file_name,
                gr.metadata, gr.created_at, gr.updated_at
             FROM governance_requests gr
             JOIN users u1 ON u1.id = gr.requested_by
             LEFT JOIN users u2 ON u2.id = gr.reviewed_by
             LEFT JOIN files f ON f.id = gr.target_file_id
             ORDER BY
                CASE gr.status WHEN 'PENDING' THEN 0 ELSE 1 END,
                gr.created_at DESC
             LIMIT 500",
        )
        .fetch_all(pool.get_ref())
        .await
        .map_err(AppError::Database)?
    } else {
        sqlx::query_as::<_, GovernanceRequestResponse>(
            "SELECT
                gr.id, gr.type, gr.title, gr.description, gr.status,
                gr.requested_by,
                u1.full_name AS requested_by_name,
                u1.email     AS requested_by_email,
                gr.reviewed_by,
                u2.full_name AS reviewed_by_name,
                gr.target_file_id,
                f.name       AS target_file_name,
                gr.metadata, gr.created_at, gr.updated_at
             FROM governance_requests gr
             JOIN users u1 ON u1.id = gr.requested_by
             LEFT JOIN users u2 ON u2.id = gr.reviewed_by
             LEFT JOIN files f ON f.id = gr.target_file_id
             WHERE gr.requested_by = $1
             ORDER BY gr.created_at DESC
             LIMIT 500",
        )
        .bind(user.id)
        .fetch_all(pool.get_ref())
        .await
        .map_err(AppError::Database)?
    };

    Ok(HttpResponse::Ok().json(requests))
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/governance/requests/{id}/approve
// ─────────────────────────────────────────────────────────────────────────────

/// Approve a governance request and execute the associated action.
/// officer+ for standard requests, director+ for classification changes, chief can do everything.
pub async fn approve_request(
    pool: web::Data<PgPool>,
    user: AuthUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    if !user::can_govern(&user.role) {
        return Err(AppError::Unauthorized);
    }

    let request_id = path.into_inner();

    // Fetch the pending request
    let req_type: Option<String> =
        sqlx::query_scalar("SELECT type FROM governance_requests WHERE id = $1 AND status = 'PENDING'")
            .bind(request_id)
            .fetch_optional(pool.get_ref())
            .await
            .map_err(AppError::Database)?
            .ok_or(AppError::NotFound)?;

    let target_file_id: Option<Uuid> =
        sqlx::query_scalar("SELECT target_file_id FROM governance_requests WHERE id = $1")
            .bind(request_id)
            .fetch_optional(pool.get_ref())
            .await
            .map_err(AppError::Database)?
            .flatten();

    let metadata: Option<serde_json::Value> =
        sqlx::query_scalar("SELECT metadata FROM governance_requests WHERE id = $1")
            .bind(request_id)
            .fetch_optional(pool.get_ref())
            .await
            .map_err(AppError::Database)?
            .flatten();

    // Classification changes require director+ authority
    if (req_type == "CLASSIFICATION_UPGRADE" || req_type == "CLASSIFICATION_DOWNGRADE")
        && !user::can_govern_classified(&user.role)
    {
        return Err(AppError::Unauthorized);
    }

    // Execute the action on the target file
    if let Some(file_id) = target_file_id {
        match req_type.as_str() {
            "FILE_LOCK" => {
                sqlx::query("UPDATE files SET locked_by = requested_by, locked_at = NOW() FROM governance_requests WHERE files.id = $1 AND governance_requests.id = $2")
                    .bind(file_id)
                    .bind(request_id)
                    .execute(pool.get_ref())
                    .await
                    .map_err(AppError::Database)?;
            }
            "FILE_UNLOCK" => {
                sqlx::query("UPDATE files SET locked_by = NULL, locked_at = NULL WHERE id = $1")
                    .bind(file_id)
                    .execute(pool.get_ref())
                    .await
                    .map_err(AppError::Database)?;
            }
            "CLASSIFICATION_UPGRADE" | "CLASSIFICATION_DOWNGRADE" => {
                if let Some(ref meta) = metadata {
                    if let Some(new_class) = meta.get("newClassification").and_then(|v| v.as_str()) {
                        if !crate::models::file::VALID_CLASSIFICATIONS.contains(&new_class) {
                            return Err(AppError::BadRequest("Invalid classification".into()));
                        }
                        sqlx::query("UPDATE files SET classification = $1 WHERE id = $2")
                            .bind(new_class)
                            .bind(file_id)
                            .execute(pool.get_ref())
                            .await
                            .map_err(AppError::Database)?;
                    }
                }
            }
            _ => {}
        }
    }

    // Mark as approved
    sqlx::query(
        "UPDATE governance_requests SET status = 'APPROVED', reviewed_by = $1, updated_at = NOW() WHERE id = $2",
    )
    .bind(user.id)
    .bind(request_id)
    .execute(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    tracing::info!(admin = %user.id, request_id = %request_id, "Governance request approved");

    Ok(HttpResponse::Ok().json(serde_json::json!({ "status": "approved" })))
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/governance/requests/{id}/reject
// ─────────────────────────────────────────────────────────────────────────────

/// Reject a governance request. officer+ can reject.
pub async fn reject_request(
    pool: web::Data<PgPool>,
    user: AuthUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    if !user::can_govern(&user.role) {
        return Err(AppError::Unauthorized);
    }

    let request_id = path.into_inner();

    let updated = sqlx::query(
        "UPDATE governance_requests SET status = 'REJECTED', reviewed_by = $1, updated_at = NOW()
         WHERE id = $2 AND status = 'PENDING'",
    )
    .bind(user.id)
    .bind(request_id)
    .execute(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    if updated.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    tracing::info!(admin = %user.id, request_id = %request_id, "Governance request rejected");

    Ok(HttpResponse::Ok().json(serde_json::json!({ "status": "rejected" })))
}
