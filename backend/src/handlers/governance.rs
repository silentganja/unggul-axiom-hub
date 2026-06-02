use crate::{
    app_middleware::auth::AuthUser,
    errors::AppError,
    models::governance::{
        CreateGovernanceRequest, GovernanceListResponse, GovernanceRequestResponse,
    },
    models::user,
};
use actix_web::{web, HttpRequest, HttpResponse};
use serde::{Deserialize, Serialize};
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

    if ![
        "FILE_LOCK",
        "FILE_UNLOCK",
        "CLASSIFICATION_UPGRADE",
        "CLASSIFICATION_DOWNGRADE",
        "FILE_MOVE",
        "FILE_DELETE",
    ]
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

    // Type-specific validations
    match req_type.as_str() {
        "FILE_DELETE" => {
            if body.target_file_id.is_none() {
                return Err(AppError::BadRequest(
                    "FILE_DELETE requires a target_file_id".into(),
                ));
            }
        }
        "FILE_MOVE" => {
            if body.target_file_id.is_none() {
                return Err(AppError::BadRequest(
                    "FILE_MOVE requires a target_file_id".into(),
                ));
            }
            let has_target_folder = body
                .metadata
                .as_ref()
                .and_then(|m| m.get("targetFolderId"))
                .and_then(|v| v.as_str())
                .map(|s| !s.is_empty())
                .unwrap_or(false);
            if !has_target_folder {
                return Err(AppError::BadRequest(
                    "FILE_MOVE requires targetFolderId in metadata".into(),
                ));
            }
        }
        _ => {}
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
            metadata, NULL::VARCHAR AS review_note, created_at, updated_at",
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

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ListGovernanceQuery {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub status: Option<String>,
    #[serde(alias = "type")]
    pub r#type: Option<String>,
}

/// List governance requests with pagination and optional filtering.
/// Admins see all; staff see only their own.
pub async fn list_requests(
    pool: web::Data<PgPool>,
    user: AuthUser,
    query: web::Query<ListGovernanceQuery>,
) -> Result<HttpResponse, AppError> {
    let page = query.page.unwrap_or(1).max(1);
    let per_page = query.per_page.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * per_page;

    // Validate status filter if provided
    if let Some(ref status) = query.status {
        if !["PENDING", "APPROVED", "REJECTED"].contains(&status.as_str()) {
            return Err(AppError::BadRequest(
                "Invalid status filter. Must be PENDING, APPROVED, or REJECTED".into(),
            ));
        }
    }

    // Validate type filter if provided
    if let Some(ref r#type) = query.r#type {
        if ![
            "FILE_LOCK",
            "FILE_UNLOCK",
            "CLASSIFICATION_UPGRADE",
            "CLASSIFICATION_DOWNGRADE",
            "FILE_MOVE",
            "FILE_DELETE",
        ]
        .contains(&r#type.as_str())
        {
            return Err(AppError::BadRequest("Invalid type filter".into()));
        }
    }

    // Build WHERE clauses using parameterized bind parameters
    let admin_mode = user::can_govern(&user.role);
    let mut param_idx = if admin_mode { 0u32 } else { 1u32 }; // $1 = user_id for non-admin

    let user_clause = if admin_mode {
        String::new()
    } else {
        "AND gr.requested_by = $1".to_string()
    };

    let status_clause = if query.status.is_some() {
        param_idx += 1;
        format!("AND gr.status = ${}", param_idx)
    } else {
        String::new()
    };

    let type_clause = if let Some(ref _type) = query.r#type {
        param_idx += 1;
        format!("AND gr.type = ${}", param_idx)
    } else {
        String::new()
    };

    let sql = format!(
        "SELECT
            gr.id, gr.type, gr.title, gr.description, gr.status,
            gr.requested_by,
            u1.full_name AS requested_by_name,
            u1.email     AS requested_by_email,
            gr.reviewed_by,
            u2.full_name AS reviewed_by_name,
            gr.target_file_id,
            f.name       AS target_file_name,
            gr.metadata, gr.review_note, gr.created_at, gr.updated_at
         FROM governance_requests gr
         JOIN users u1 ON u1.id = gr.requested_by
         LEFT JOIN users u2 ON u2.id = gr.reviewed_by
         LEFT JOIN files f ON f.id = gr.target_file_id
         WHERE 1=1
         {user_clause}
         {status_clause}
         {type_clause}
         ORDER BY
            CASE gr.status WHEN 'PENDING' THEN 0 ELSE 1 END,
            gr.created_at DESC
         LIMIT {per_page} OFFSET {offset}",
        user_clause = user_clause,
        status_clause = status_clause,
        type_clause = type_clause,
        per_page = per_page,
        offset = offset,
    );

    let count_sql = format!(
        "SELECT COUNT(*) FROM governance_requests gr
         WHERE 1=1
         {user_clause}
         {status_clause}
         {type_clause}",
        user_clause = user_clause,
        status_clause = status_clause,
        type_clause = type_clause,
    );

    // Build and bind queries based on admin_mode and filters
    let mut requests_query = sqlx::query_as::<_, GovernanceRequestResponse>(&sql);
    let mut count_query = sqlx::query_scalar::<_, i64>(&count_sql);

    if !admin_mode {
        requests_query = requests_query.bind(user.id);
        count_query = count_query.bind(user.id);
    }

    if let Some(ref status) = query.status {
        requests_query = requests_query.bind(status);
        count_query = count_query.bind(status);
    }

    if let Some(ref r#type) = query.r#type {
        requests_query = requests_query.bind(r#type);
        count_query = count_query.bind(r#type);
    }

    let requests: Vec<GovernanceRequestResponse> = requests_query
        .fetch_all(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

    let total: i64 = count_query
        .fetch_one(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

    let total_pages = if per_page > 0 {
        (total + per_page - 1) / per_page
    } else {
        0
    };

    Ok(HttpResponse::Ok().json(GovernanceListResponse {
        requests,
        total,
        page,
        per_page,
        total_pages,
    }))
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/governance/requests/{id}/approve
// ─────────────────────────────────────────────────────────────────────────────

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ReviewRequest {
    /// Optional note explaining the reason for approval or rejection.
    reason: Option<String>,
}

/// Approve a governance request and execute the associated action.
/// officer+ for standard requests, director+ for classification changes, chief can do everything.
pub async fn approve_request(
    pool: web::Data<PgPool>,
    user: AuthUser,
    req: HttpRequest,
    path: web::Path<Uuid>,
    body: web::Json<ReviewRequest>,
) -> Result<HttpResponse, AppError> {
    if !user::can_govern(&user.role) {
        return Err(AppError::Unauthorized);
    }

    let request_id = path.into_inner();

    // Fetch the pending request info (type, target_file_id, metadata, title) in one query
    let request_info: Option<(String, Option<Uuid>, Option<serde_json::Value>, String)> =
        sqlx::query_as(
            "SELECT type, target_file_id, metadata, title
             FROM governance_requests
             WHERE id = $1 AND status = 'PENDING'",
        )
        .bind(request_id)
        .fetch_optional(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

    let (req_type, target_file_id, metadata, req_title) = request_info.ok_or(AppError::NotFound)?;

    // Classification changes require director+ authority
    if matches!(
        req_type.as_str(),
        "CLASSIFICATION_UPGRADE" | "CLASSIFICATION_DOWNGRADE"
    ) && !user::can_govern_classified(&user.role)
    {
        return Err(AppError::Unauthorized);
    }

    // Execute the action on the target file
    if let Some(file_id) = target_file_id {
        match req_type.as_str() {
            "FILE_LOCK" => {
                sqlx::query(
                    "UPDATE files SET locked_by = (SELECT requested_by FROM governance_requests WHERE id = $1), locked_at = NOW(), lock_reason = $2 WHERE id = $3"
                )
                    .bind(request_id)
                    .bind(&req_title)
                    .bind(file_id)
                    .execute(pool.get_ref())
                    .await
                    .map_err(AppError::Database)?;
                // Emit FileLocked notification
                let file_name: String = sqlx::query_scalar("SELECT name FROM files WHERE id = $1")
                    .bind(file_id)
                    .fetch_optional(pool.get_ref())
                    .await
                    .map_err(AppError::Database)?
                    .unwrap_or_default();
                let locked_by_id: String = sqlx::query_scalar(
                    "SELECT requested_by::text FROM governance_requests WHERE id = $1",
                )
                .bind(request_id)
                .fetch_optional(pool.get_ref())
                .await
                .map_err(AppError::Database)?
                .unwrap_or_default();
                crate::handlers::notifications::emit_notification(
                    crate::models::notification::NotificationEvent::FileLocked {
                        file_id: file_id.to_string(),
                        file_name,
                        locked_by: locked_by_id,
                    },
                );
            }
            "FILE_UNLOCK" => {
                sqlx::query(
                    "UPDATE files SET locked_by = NULL, locked_at = NULL, lock_reason = NULL WHERE id = $1",
                )
                .bind(file_id)
                    .execute(pool.get_ref())
                    .await
                    .map_err(AppError::Database)?;
                // Emit FileUnlocked notification
                let file_name: String = sqlx::query_scalar("SELECT name FROM files WHERE id = $1")
                    .bind(file_id)
                    .fetch_optional(pool.get_ref())
                    .await
                    .map_err(AppError::Database)?
                    .unwrap_or_default();
                crate::handlers::notifications::emit_notification(
                    crate::models::notification::NotificationEvent::FileUnlocked {
                        file_id: file_id.to_string(),
                        file_name,
                    },
                );
            }
            "CLASSIFICATION_UPGRADE" | "CLASSIFICATION_DOWNGRADE" => {
                if let Some(ref meta) = metadata {
                    if let Some(new_class) = meta.get("newClassification").and_then(|v| v.as_str())
                    {
                        if !crate::models::file::VALID_CLASSIFICATIONS.contains(&new_class) {
                            return Err(AppError::BadRequest("Invalid classification".into()));
                        }

                        // Get current file classification to validate direction
                        let current_class: Option<String> =
                            sqlx::query_scalar("SELECT classification FROM files WHERE id = $1")
                                .bind(file_id)
                                .fetch_optional(pool.get_ref())
                                .await
                                .map_err(AppError::Database)?
                                .flatten();

                        if let Some(ref cur) = current_class {
                            let cur_idx = crate::models::file::VALID_CLASSIFICATIONS
                                .iter()
                                .position(|&c| c == cur.as_str());
                            let new_idx = crate::models::file::VALID_CLASSIFICATIONS
                                .iter()
                                .position(|&c| c == new_class);
                            if let (Some(ci), Some(ni)) = (cur_idx, new_idx) {
                                let is_upgrade = req_type.as_str() == "CLASSIFICATION_UPGRADE";
                                if is_upgrade && ci <= ni {
                                    return Err(AppError::BadRequest(format!(
                                        "Cannot upgrade: {} is not higher than {}",
                                        new_class, cur
                                    )));
                                }
                                if !is_upgrade && ci >= ni {
                                    return Err(AppError::BadRequest(format!(
                                        "Cannot downgrade: {} is not lower than {}",
                                        new_class, cur
                                    )));
                                }
                            }
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
            "FILE_MOVE" => {
                if let Some(ref meta) = metadata {
                    let has_target = meta
                        .get("targetFolderId")
                        .and_then(|v| v.as_str())
                        .is_some();
                    if !has_target {
                        return Err(AppError::BadRequest(
                            "FILE_MOVE requires targetFolderId in metadata".into(),
                        ));
                    }
                    if let Some(target_folder_id) =
                        meta.get("targetFolderId").and_then(|v| v.as_str())
                    {
                        if let Ok(folder_uuid) = uuid::Uuid::parse_str(target_folder_id) {
                            // Store original parent_id in metadata for undo support
                            let original_parent_id: Option<Uuid> =
                                sqlx::query_scalar("SELECT parent_id FROM files WHERE id = $1")
                                    .bind(file_id)
                                    .fetch_optional(pool.get_ref())
                                    .await
                                    .map_err(AppError::Database)?
                                    .flatten();

                            let mut updated_meta = meta.clone();
                            if let Some(orig_pid) = original_parent_id {
                                updated_meta["original_parent_id"] =
                                    serde_json::Value::String(orig_pid.to_string());
                            }

                            sqlx::query("UPDATE files SET parent_id = $1 WHERE id = $2")
                                .bind(folder_uuid)
                                .bind(file_id)
                                .execute(pool.get_ref())
                                .await
                                .map_err(AppError::Database)?;

                            // Update metadata with original parent for undo
                            if let Some(orig_pid) = original_parent_id {
                                let _ = sqlx::query(
                                    "UPDATE governance_requests SET metadata = $1 WHERE id = $2",
                                )
                                .bind(&updated_meta)
                                .bind(request_id)
                                .execute(pool.get_ref())
                                .await;
                            }
                        }
                    }
                }
            }
            "FILE_DELETE" => {
                sqlx::query("UPDATE files SET deleted_at = NOW() WHERE id = $1")
                    .bind(file_id)
                    .execute(pool.get_ref())
                    .await
                    .map_err(AppError::Database)?;
            }
            _ => {}
        }
    }

    // Mark as approved (with PENDING guard to prevent double-execution)
    let updated = sqlx::query(
        "UPDATE governance_requests SET status = 'APPROVED', reviewed_by = $1, review_note = $2, updated_at = NOW() WHERE id = $3 AND status = 'PENDING'",
    )
    .bind(user.id)
    .bind(&body.reason)
    .bind(request_id)
    .execute(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    if updated.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    // ── Audit log ──────────────────────────────────────────────────────────────
    let ip = req.peer_addr().map(|a| a.to_string()).unwrap_or_default();
    let _ = crate::handlers::files::write_audit_log_internal(
        pool.get_ref(),
        user.id,
        "GOVERNANCE_APPROVE",
        &request_id.to_string(),
        &ip,
    )
    .await;

    // ── Emit notification ──────────────────────────────────────────────────
    crate::handlers::notifications::emit_notification(
        crate::models::notification::NotificationEvent::GovernanceUpdate {
            request_id: request_id.to_string(),
            status: "APPROVED".into(),
            title: req_title.clone(),
        },
    );

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
    req: HttpRequest,
    path: web::Path<Uuid>,
    body: web::Json<ReviewRequest>,
) -> Result<HttpResponse, AppError> {
    if !user::can_govern(&user.role) {
        return Err(AppError::Unauthorized);
    }

    let request_id = path.into_inner();

    let updated = sqlx::query(
        "UPDATE governance_requests SET status = 'REJECTED', reviewed_by = $1, review_note = $2, updated_at = NOW()
         WHERE id = $3 AND status = 'PENDING'",
    )
    .bind(user.id)
    .bind(&body.reason)
    .bind(request_id)
    .execute(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    if updated.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    // ── Audit log ──────────────────────────────────────────────────────────────
    let ip = req.peer_addr().map(|a| a.to_string()).unwrap_or_default();
    let _ = crate::handlers::files::write_audit_log_internal(
        pool.get_ref(),
        user.id,
        "GOVERNANCE_REJECT",
        &request_id.to_string(),
        &ip,
    )
    .await;

    // ── Emit notification ──────────────────────────────────────────────────
    let req_title: Option<String> =
        sqlx::query_scalar("SELECT title FROM governance_requests WHERE id = $1")
            .bind(request_id)
            .fetch_optional(pool.get_ref())
            .await
            .map_err(AppError::Database)?
            .flatten();

    if let Some(ref title) = req_title {
        crate::handlers::notifications::emit_notification(
            crate::models::notification::NotificationEvent::GovernanceUpdate {
                request_id: request_id.to_string(),
                status: "REJECTED".into(),
                title: title.clone(),
            },
        );
    }

    tracing::info!(admin = %user.id, request_id = %request_id, "Governance request rejected");

    Ok(HttpResponse::Ok().json(serde_json::json!({ "status": "rejected" })))
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/governance/requests/batch-approve
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct BatchReviewRequest {
    ids: Vec<Uuid>,
    reason: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct BatchReviewResponse {
    processed: usize,
    succeeded: usize,
    failed: usize,
    errors: Vec<String>,
}

/// Batch-approve multiple governance requests.
/// officer+ can approve standard requests, director+ for classification changes.
pub async fn batch_approve(
    pool: web::Data<PgPool>,
    user: AuthUser,
    req: HttpRequest,
    body: web::Json<BatchReviewRequest>,
) -> Result<HttpResponse, AppError> {
    if !user::can_govern(&user.role) {
        return Err(AppError::Unauthorized);
    }

    let ip = req.peer_addr().map(|a| a.to_string()).unwrap_or_default();
    let mut processed = 0usize;
    let mut succeeded = 0usize;
    let mut failed = 0usize;
    let mut errors: Vec<String> = Vec::new();

    // Wrap the entire batch in a database transaction for atomicity
    let mut tx = pool.begin().await.map_err(AppError::Database)?;

    for request_id in &body.ids {
        processed += 1;

        // Fetch the pending request
        let req_type: Option<String> = match sqlx::query_scalar(
            "SELECT type FROM governance_requests WHERE id = $1 AND status = 'PENDING'",
        )
        .bind(request_id)
        .fetch_optional(&mut *tx)
        .await
        {
            Ok(Some(t)) => Some(t),
            Ok(None) => {
                errors.push(format!("{}: not found or not pending", request_id));
                failed += 1;
                continue;
            }
            Err(e) => {
                errors.push(format!("{}: {}", request_id, e));
                failed += 1;
                continue;
            }
        };

        let rt = match req_type {
            Some(t) => t,
            None => {
                failed += 1;
                continue;
            }
        };

        // Classification changes require director+ authority
        if matches!(
            rt.as_str(),
            "CLASSIFICATION_UPGRADE" | "CLASSIFICATION_DOWNGRADE"
        ) && !user::can_govern_classified(&user.role)
        {
            errors.push(format!(
                "{}: classification changes require director+ authority",
                request_id
            ));
            failed += 1;
            continue;
        }

        // Execute side effects
        let target_file_id: Option<Uuid> = match sqlx::query_scalar(
            "SELECT target_file_id FROM governance_requests WHERE id = $1",
        )
        .bind(request_id)
        .fetch_optional(&mut *tx)
        .await
        {
            Ok(v) => v.flatten(),
            Err(e) => {
                errors.push(format!("{}: {}", request_id, e));
                failed += 1;
                continue;
            }
        };

        if let Some(file_id) = target_file_id {
            let metadata: Option<serde_json::Value> =
                match sqlx::query_scalar("SELECT metadata FROM governance_requests WHERE id = $1")
                    .bind(request_id)
                    .fetch_optional(&mut *tx)
                    .await
                {
                    Ok(v) => v.flatten(),
                    Err(_) => None,
                };

            let title: Option<String> =
                match sqlx::query_scalar("SELECT title FROM governance_requests WHERE id = $1")
                    .bind(request_id)
                    .fetch_optional(&mut *tx)
                    .await
                {
                    Ok(v) => v.flatten(),
                    Err(_) => None,
                };

            match rt.as_str() {
                "FILE_LOCK" => {
                    if let Err(e) = sqlx::query(
                        "UPDATE files SET locked_by = (SELECT requested_by FROM governance_requests WHERE id = $1), locked_at = NOW(), lock_reason = $2 WHERE id = $3",
                    )
                    .bind(request_id)
                    .bind(title.as_deref())
                    .bind(file_id)
                    .execute(&mut *tx)
                    .await
                    {
                        errors.push(format!("{}: {}", request_id, e));
                        failed += 1;
                        continue;
                    }
                }
                "FILE_UNLOCK" => {
                    if let Err(e) = sqlx::query(
                        "UPDATE files SET locked_by = NULL, locked_at = NULL, lock_reason = NULL WHERE id = $1",
                    )
                    .bind(file_id)
                    .execute(&mut *tx)
                    .await
                    {
                        errors.push(format!("{}: {}", request_id, e));
                        failed += 1;
                        continue;
                    }
                }
                "CLASSIFICATION_UPGRADE" | "CLASSIFICATION_DOWNGRADE" => {
                    if let Some(ref meta) = metadata {
                        if let Some(new_class) = meta
                            .get("newClassification")
                            .and_then(|v| v.as_str())
                        {
                            if !crate::models::file::VALID_CLASSIFICATIONS.contains(&new_class) {
                                errors.push(format!("{}: invalid classification", request_id));
                                failed += 1;
                                continue;
                            }
                            if let Err(e) = sqlx::query(
                                "UPDATE files SET classification = $1 WHERE id = $2",
                            )
                                .bind(new_class)
                                .bind(file_id)
                                .execute(&mut *tx)
                                .await
                            {
                                errors.push(format!("{}: {}", request_id, e));
                                failed += 1;
                                continue;
                            }
                        }
                    }
                }
                "FILE_MOVE" => {
                    if let Some(ref meta) = metadata {
                        if let Some(target_folder_id) = meta
                            .get("targetFolderId")
                            .and_then(|v| v.as_str())
                        {
                            if let Ok(folder_uuid) = uuid::Uuid::parse_str(target_folder_id) {
                                if let Err(e) = sqlx::query(
                                    "UPDATE files SET parent_id = $1 WHERE id = $2",
                                )
                                    .bind(folder_uuid)
                                    .bind(file_id)
                                    .execute(&mut *tx)
                                    .await
                                {
                                    errors.push(format!("{}: {}", request_id, e));
                                    failed += 1;
                                    continue;
                                }
                            }
                        } else {
                            errors.push(format!(
                                "{}: FILE_MOVE requires targetFolderId in metadata",
                                request_id
                            ));
                            failed += 1;
                            continue;
                        }
                    } else {
                        errors.push(format!(
                            "{}: FILE_MOVE requires targetFolderId in metadata",
                            request_id
                        ));
                        failed += 1;
                        continue;
                    }
                }
                "FILE_DELETE" => {
                    if let Err(e) = sqlx::query("UPDATE files SET deleted_at = NOW() WHERE id = $1")
                        .bind(file_id)
                        .execute(&mut *tx)
                        .await
                    {
                        errors.push(format!("{}: {}", request_id, e));
                        failed += 1;
                        continue;
                    }
                }
                _ => {}
            }
        }

        // Mark as approved
        if let Err(e) = sqlx::query(
            "UPDATE governance_requests SET status = 'APPROVED', reviewed_by = $1, review_note = $2, updated_at = NOW() WHERE id = $3",
        )
        .bind(user.id)
        .bind(&body.reason)
        .bind(request_id)
        .execute(&mut *tx)
        .await
        {
            errors.push(format!("{}: {}", request_id, e));
            failed += 1;
            continue;
        }

        // Audit log
        let _ = crate::handlers::files::write_audit_log_internal(
            pool.get_ref(),
            user.id,
            "GOVERNANCE_BATCH_APPROVE",
            &request_id.to_string(),
            &ip,
        )
        .await;

        // Notification
        let req_title: Option<String> =
            match sqlx::query_scalar("SELECT title FROM governance_requests WHERE id = $1")
                .bind(request_id)
                .fetch_optional(pool.get_ref())
                .await
            {
                Ok(v) => v.flatten(),
                Err(_) => None,
            };
        if let Some(ref title) = req_title {
            crate::handlers::notifications::emit_notification(
                crate::models::notification::NotificationEvent::GovernanceUpdate {
                    request_id: request_id.to_string(),
                    status: "APPROVED".into(),
                    title: title.clone(),
                },
            );
        }

        succeeded += 1;
    }

    // Commit the transaction
    tx.commit().await.map_err(AppError::Database)?;

    tracing::info!(
        admin = %user.id,
        processed = %processed,
        succeeded = %succeeded,
        failed = %failed,
        "Batch governance approve completed"
    );

    Ok(HttpResponse::Ok().json(BatchReviewResponse {
        processed,
        succeeded,
        failed,
        errors,
    }))
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/governance/requests/batch-reject
// ─────────────────────────────────────────────────────────────────────────────

/// Batch-reject multiple governance requests. officer+ can reject.
pub async fn batch_reject(
    pool: web::Data<PgPool>,
    user: AuthUser,
    req: HttpRequest,
    body: web::Json<BatchReviewRequest>,
) -> Result<HttpResponse, AppError> {
    if !user::can_govern(&user.role) {
        return Err(AppError::Unauthorized);
    }

    let ip = req.peer_addr().map(|a| a.to_string()).unwrap_or_default();
    let mut processed = 0usize;
    let mut succeeded = 0usize;
    let mut failed = 0usize;
    let mut errors: Vec<String> = Vec::new();

    // Wrap the entire batch in a database transaction for atomicity
    let mut tx = pool.begin().await.map_err(AppError::Database)?;

    for request_id in &body.ids {
        processed += 1;

        match sqlx::query(
            "UPDATE governance_requests SET status = 'REJECTED', reviewed_by = $1, review_note = $2, updated_at = NOW()
             WHERE id = $3 AND status = 'PENDING'",
        )
        .bind(user.id)
        .bind(&body.reason)
        .bind(request_id)
        .execute(&mut *tx)
        .await
        {
            Ok(r) if r.rows_affected() > 0 => {}
            Ok(_) => {
                errors.push(format!("{}: not found or not pending", request_id));
                failed += 1;
                continue;
            }
            Err(e) => {
                errors.push(format!("{}: {}", request_id, e));
                failed += 1;
                continue;
            }
        }

        // Audit log (fire-and-forget, keep on pool)
        let _ = crate::handlers::files::write_audit_log_internal(
            pool.get_ref(),
            user.id,
            "GOVERNANCE_BATCH_REJECT",
            &request_id.to_string(),
            &ip,
        )
        .await;

        // Notification
        let req_title: Option<String> =
            match sqlx::query_scalar("SELECT title FROM governance_requests WHERE id = $1")
                .bind(request_id)
                .fetch_optional(&mut *tx)
                .await
            {
                Ok(v) => v.flatten(),
                Err(_) => None,
            };
        if let Some(ref title) = req_title {
            crate::handlers::notifications::emit_notification(
                crate::models::notification::NotificationEvent::GovernanceUpdate {
                    request_id: request_id.to_string(),
                    status: "REJECTED".into(),
                    title: title.clone(),
                },
            );
        }

        succeeded += 1;
    }

    // Commit the transaction
    tx.commit().await.map_err(AppError::Database)?;

    tracing::info!(
        admin = %user.id,
        processed = %processed,
        succeeded = %succeeded,
        failed = %failed,
        "Batch governance reject completed"
    );

    Ok(HttpResponse::Ok().json(BatchReviewResponse {
        processed,
        succeeded,
        failed,
        errors,
    }))
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/governance/requests/{id}/undo
// ─────────────────────────────────────────────────────────────────────────────

/// Undo a governance request.
/// - REJECTED: set back to PENDING
/// - APPROVED: create inverse request type and auto-approve it
pub async fn undo_request(
    pool: web::Data<PgPool>,
    user: AuthUser,
    req: HttpRequest,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    if !user::can_govern(&user.role) {
        return Err(AppError::Unauthorized);
    }

    let request_id = path.into_inner();

    // Fetch the existing request
    let existing: Option<GovernanceRequestResponse> =
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
            gr.metadata, gr.review_note, gr.created_at, gr.updated_at
         FROM governance_requests gr
         JOIN users u1 ON u1.id = gr.requested_by
         LEFT JOIN users u2 ON u2.id = gr.reviewed_by
         LEFT JOIN files f ON f.id = gr.target_file_id
         WHERE gr.id = $1",
        )
        .bind(request_id)
        .fetch_optional(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

    let existing = existing.ok_or(AppError::NotFound)?;

    // Prevent undoing requests without a target file (would create zombie auto-approved requests)
    if existing.target_file_id.is_none() {
        return Err(AppError::BadRequest(
            "Cannot undo a request without a target file".into(),
        ));
    }

    match existing.status.as_str() {
        "REJECTED" => {
            // Simply set back to PENDING
            sqlx::query(
                "UPDATE governance_requests SET status = 'PENDING', reviewed_by = NULL, updated_at = NOW() WHERE id = $1",
            )
            .bind(request_id)
            .execute(pool.get_ref())
            .await
            .map_err(AppError::Database)?;
        }
        "APPROVED" => {
            // Determine inverse type
            let inverse_type = match existing.r#type.as_str() {
                "FILE_LOCK" => "FILE_UNLOCK",
                "FILE_UNLOCK" => "FILE_LOCK",
                "CLASSIFICATION_UPGRADE" => "CLASSIFICATION_DOWNGRADE",
                "CLASSIFICATION_DOWNGRADE" => "CLASSIFICATION_UPGRADE",
                "FILE_MOVE" => "FILE_MOVE",
                "FILE_DELETE" => "FILE_DELETE",
                _ => return Err(AppError::BadRequest("Unknown request type".into())),
            };

            // Build inverse metadata
            let inverse_metadata = if matches!(
                existing.r#type.as_str(),
                "CLASSIFICATION_UPGRADE" | "CLASSIFICATION_DOWNGRADE"
            ) {
                // For classification changes, we need the current file classification
                let current_class: Option<String> = if let Some(file_id) = existing.target_file_id {
                    sqlx::query_scalar("SELECT classification FROM files WHERE id = $1")
                        .bind(file_id)
                        .fetch_optional(pool.get_ref())
                        .await
                        .map_err(AppError::Database)?
                } else {
                    None
                };
                current_class.map(|c| serde_json::json!({ "newClassification": c }))
            } else {
                existing.metadata.clone()
            };

            // Create a new inverse request and auto-approve it
            let new_request_id = Uuid::new_v4();

            sqlx::query(
                "INSERT INTO governance_requests (id, type, title, description, status, requested_by, reviewed_by, target_file_id, metadata, review_note)
                 VALUES ($1, $2, $3, $4, 'APPROVED', $5, $5, $6, $7, $8)",
            )
            .bind(new_request_id)
            .bind(inverse_type)
            .bind(format!("[Auto-reverse] {}", existing.title))
            .bind(existing.description)
            .bind(user.id)
            .bind(existing.target_file_id)
            .bind(&inverse_metadata)
            .bind(format!(
                "Auto-reversed: original request {} reversed by {}",
                request_id, user.id
            ))
            .execute(pool.get_ref())
            .await
            .map_err(AppError::Database)?;

            // Execute inverse side effects on the file
            if let Some(file_id) = existing.target_file_id {
                match inverse_type {
                    "FILE_LOCK" => {
                        sqlx::query(
                            "UPDATE files SET locked_by = (SELECT requested_by FROM governance_requests WHERE id = $1), locked_at = NOW(), lock_reason = $2 WHERE id = $3",
                        )
                        .bind(new_request_id)
                        .bind(&existing.title)
                        .bind(file_id)
                        .execute(pool.get_ref())
                        .await
                        .map_err(AppError::Database)?;
                    }
                    "FILE_UNLOCK" => {
                        sqlx::query(
                            "UPDATE files SET locked_by = NULL, locked_at = NULL, lock_reason = NULL WHERE id = $1",
                        )
                        .bind(file_id)
                        .execute(pool.get_ref())
                        .await
                        .map_err(AppError::Database)?;
                    }
                    "CLASSIFICATION_UPGRADE" | "CLASSIFICATION_DOWNGRADE" => {
                        if let Some(ref meta) = inverse_metadata {
                            if let Some(new_class) =
                                meta.get("newClassification").and_then(|v| v.as_str())
                            {
                                if crate::models::file::VALID_CLASSIFICATIONS.contains(&new_class) {
                                    sqlx::query(
                                        "UPDATE files SET classification = $1 WHERE id = $2",
                                    )
                                    .bind(new_class)
                                    .bind(file_id)
                                    .execute(pool.get_ref())
                                    .await
                                    .map_err(AppError::Database)?;
                                }
                            }
                        }
                    }
                    "FILE_DELETE" => {
                        sqlx::query("UPDATE files SET deleted_at = NULL WHERE id = $1")
                            .bind(file_id)
                            .execute(pool.get_ref())
                            .await
                            .map_err(AppError::Database)?;
                    }
                    "FILE_MOVE" => {
                        // Read original_parent_id from the APPROVED request's metadata
                        if let Some(ref meta) = existing.metadata {
                            if let Some(orig_pid_str) =
                                meta.get("original_parent_id").and_then(|v| v.as_str())
                            {
                                if let Ok(orig_pid) = uuid::Uuid::parse_str(orig_pid_str) {
                                    sqlx::query("UPDATE files SET parent_id = $1 WHERE id = $2")
                                        .bind(orig_pid)
                                        .bind(file_id)
                                        .execute(pool.get_ref())
                                        .await
                                        .map_err(AppError::Database)?;
                                }
                            }
                        }
                    }
                    _ => {}
                }
            }

            // Update original request review_note
            sqlx::query(
                "UPDATE governance_requests SET review_note = COALESCE(review_note, '') || ' [Undone: reversed by ' || $1::text || ']', updated_at = NOW() WHERE id = $2",
            )
            .bind(user.id.to_string())
            .bind(request_id)
            .execute(pool.get_ref())
            .await
            .map_err(AppError::Database)?;

            // Audit log
            let ip = req.peer_addr().map(|a| a.to_string()).unwrap_or_default();
            let _ = crate::handlers::files::write_audit_log_internal(
                pool.get_ref(),
                user.id,
                "GOVERNANCE_UNDO",
                &request_id.to_string(),
                &ip,
            )
            .await;
        }
        _ => {
            return Err(AppError::BadRequest(
                "Cannot undo a PENDING request. Cancel it instead.".into(),
            ));
        }
    }

    tracing::info!(
        admin = %user.id,
        request_id = %request_id,
        status = %existing.status,
        "Governance request undone"
    );

    Ok(HttpResponse::Ok().json(serde_json::json!({ "status": "undone" })))
}
