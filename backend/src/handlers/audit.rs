use crate::{app_middleware::auth::AuthUser, errors::AppError, models::user};
use actix_web::{web, HttpResponse};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

// ── Query parameters ─────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditLogQuery {
    pub user_id: Option<Uuid>,
    pub action: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub format: Option<String>,
}

// ── Response shapes ──────────────────────────────────────────────────────────

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct AuditLogEntry {
    pub id: Uuid,
    pub user_id: Option<Uuid>,
    pub action: String,
    pub target_resource: Option<String>,
    pub ip_address: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditLogListResponse {
    pub entries: Vec<AuditLogEntry>,
    pub total: i64,
    pub page: i64,
    pub per_page: i64,
    pub total_pages: i64,
}

// ── Handler ───────────────────────────────────────────────────────────────────

/// GET /api/audit
///
/// Returns audit log entries with optional filtering and pagination.
/// Admins see all entries; staff see only their own.
/// Supports `?format=csv` for CSV export.
///
/// # Errors
/// - `401 Unauthorized` — missing or invalid JWT
pub async fn list_audit_logs(
    pool: web::Data<PgPool>,
    user: AuthUser,
    query: web::Query<AuditLogQuery>,
) -> Result<HttpResponse, AppError> {
    let can_see_all = user::can_govern(&user.role); // officer+ see all logs

    let page = query.page.unwrap_or(1).max(1);
    let per_page = query.per_page.unwrap_or(50).clamp(1, 500);
    let offset = (page - 1) * per_page;

    // Build WHERE clauses
    let mut conditions: Vec<String> = Vec::new();
    let mut param_idx = 1u32;

    if !can_see_all {
        conditions.push(format!("user_id = ${}", param_idx));
        param_idx += 1;
    }

    if let Some(ref uid) = query.user_id {
        conditions.push(format!("user_id = ${}", param_idx));
        param_idx += 1;
    }

    if let Some(ref action) = query.action {
        conditions.push(format!("action = ${}", param_idx));
        param_idx += 1;
    }

    if let Some(ref date_from) = query.date_from {
        conditions.push(format!("created_at >= ${}::timestamp", param_idx));
        param_idx += 1;
    }

    if let Some(ref date_to) = query.date_to {
        conditions.push(format!("created_at <= ${}::timestamp", param_idx));
        param_idx += 1;
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let sql = format!(
        "SELECT id, user_id, action, target_resource, ip_address, created_at
         FROM audit_logs
         {}
         ORDER BY created_at DESC
         LIMIT {} OFFSET {}",
        where_clause, per_page, offset,
    );

    let count_sql = format!(
        "SELECT COUNT(*) FROM audit_logs {}",
        where_clause,
    );

    // Build the count query with bind parameters
    let mut count_query = sqlx::query_scalar::<_, i64>(&count_sql);
    let mut data_query = sqlx::query_as::<_, AuditLogEntry>(&sql);

    if !can_see_all {
        count_query = count_query.bind(user.id);
        data_query = data_query.bind(user.id);
    }

    if let Some(ref uid) = query.user_id {
        count_query = count_query.bind(uid);
        data_query = data_query.bind(uid);
    }

    if let Some(ref action) = query.action {
        count_query = count_query.bind(action);
        data_query = data_query.bind(action);
    }

    if let Some(ref date_from) = query.date_from {
        count_query = count_query.bind(date_from);
        data_query = data_query.bind(date_from);
    }

    if let Some(ref date_to) = query.date_to {
        count_query = count_query.bind(date_to);
        data_query = data_query.bind(date_to);
    }

    let entries: Vec<AuditLogEntry> = data_query
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

    // CSV export
    if query.format.as_deref() == Some("csv") {
        let mut csv = String::from("id,user_id,action,target_resource,ip_address,created_at\n");
        for e in &entries {
            csv.push_str(&format!(
                "{},{},{},{},{},{}\n",
                e.id,
                e.user_id.map(|u| u.to_string()).unwrap_or_default(),
                escape_csv(&e.action),
                e.target_resource.as_deref().map(escape_csv).unwrap_or_default(),
                e.ip_address.as_deref().map(escape_csv).unwrap_or_default(),
                e.created_at.format("%Y-%m-%dT%H:%M:%S%.3fZ"),
            ));
        }
        return Ok(HttpResponse::Ok()
            .content_type("text/csv; charset=utf-8")
            .insert_header(("Content-Disposition", "attachment; filename=\"audit_logs.csv\""))
            .body(csv));
    }

    Ok(HttpResponse::Ok().json(AuditLogListResponse {
        entries,
        total,
        page,
        per_page,
        total_pages,
    }))
}

/// Escape a value for CSV: wrap in quotes if it contains commas, quotes, or newlines.
fn escape_csv(s: &str) -> String {
    if s.contains(',') || s.contains('"') || s.contains('\n') {
        format!("\"{}\"", s.replace('"', "\"\""))
    } else {
        s.to_string()
    }
}
