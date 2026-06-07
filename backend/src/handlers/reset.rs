// ─────────────────────────────────────────────────────────────────────────────
// Database Reset & Initialize — production-readiness wipe tool.
//
// This module provides a two-step, multi-guard destructive operation that
// purges all transactional data, test records, and log histories while
// preserving core system configuration and user accounts.
//
// Safety guardrails:
//   1. ALLOW_DATABASE_RESET env var must be "true" (hard-fail otherwise).
//   2. Admin must be the hardcoded super-admin (no delegated admin access).
//   3. One-time consent token with 5-minute expiry — admin types it back.
//   4. All DELETE operations run inside a single Postgres transaction.
//   5. Every wiped row is counted and returned for audit.
// ─────────────────────────────────────────────────────────────────────────────

use crate::app_middleware::admin::AdminUser;
use crate::errors::AppError;
use crate::AppConfig;
use actix_web::{web, HttpRequest, HttpResponse};
use rand_core::{OsRng, RngCore};
use serde::Serialize;
use sqlx::PgPool;
use std::sync::Mutex;
use std::time::{Duration, Instant};

// ── Reset token shared state ────────────────────────────────────────────────

pub struct ResetTokenState {
    pub token: String,
    pub expires_at: Instant,
}

/// Shared application state for the one-time consent token.
pub type ResetTokenStore = Mutex<Option<ResetTokenState>>;

const TOKEN_LIFETIME: Duration = Duration::from_secs(300); // 5 minutes

// ── Tables targeted for wipe ────────────────────────────────────────────────
//
// These tables hold transactional / user-generated / test data that should be
// purged before the first official production launch.
//
// ORDER MATTERS: child tables (with FKs referencing other wiped tables) must
// be deleted first to avoid FK violations.

const WIPE_TABLES: &[&str] = &[
    "file_shares",
    "governance_requests",
    "files",
    "audit_logs",
    "user_role_groups",
    "user_permissions",
    "password_resets",
    "magic_links",
    "webauthn_credentials",
];

/// Tables deliberately PRESERVED (documented for audit transparency):
///
///   users              — staff accounts
///   permissions        — 16 permission definitions
///   role_groups        — group names / descriptions
///   role_group_permissions — group → permission configs
///   custom_roles       — base role definitions
///   role_implicit_permissions — base role → permission grants
///   classifications    — tier definitions
///   classification_permissions — tier access rules
///   system_config      — UI theme, org name, etc.
///   _migrations        — schema version tracking

// ── Response types ──────────────────────────────────────────────────────────

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ResetTokenResponse {
    token: String,
    expires_in_seconds: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ResetDatabaseResponse {
    wiped: WipeSummary,
    preserved: Vec<&'static str>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WipeSummary {
    tables: Vec<TableWipeResult>,
    total_rows_deleted: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TableWipeResult {
    table_name: String,
    rows_deleted: u64,
}

// ── Request types ───────────────────────────────────────────────────────────

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResetDatabaseRequest {
    pub token: String,
}

// ── GET /api/admin/reset-token ──────────────────────────────────────────────
//
// Generates a one-time 8-character alphanumeric token valid for 5 minutes.
// Only the hardcoded super-admin can request it.

pub async fn get_reset_token(
    config: web::Data<AppConfig>,
    admin: AdminUser,
    token_store: web::Data<ResetTokenStore>,
) -> Result<HttpResponse, AppError> {
    // Guard 1: env flag must be enabled
    if !config.allow_database_reset {
        return Err(AppError::Forbidden(
            "Database reset is not enabled on this deployment.".into(),
        ));
    }

    // Guard 2: only the hardcoded super-admin
    if !admin.is_super_admin() {
        return Err(AppError::Forbidden(
            "Only the hardcoded super-admin can initiate a database reset.".into(),
        ));
    }

    // Generate a fresh token — 4 random bytes → 8 hex chars, easy to type
    let mut bytes = [0u8; 4];
    OsRng.fill_bytes(&mut bytes);
    let token = hex::encode(bytes);

    let state = ResetTokenState {
        token: token.clone(),
        expires_at: Instant::now() + TOKEN_LIFETIME,
    };

    {
        let mut store = token_store
            .lock()
            .map_err(|_| AppError::Internal(anyhow::anyhow!("Reset token lock poisoned")))?;
        *store = Some(state);
    }

    tracing::warn!(
        admin = %admin.username,
        "Reset token generated — database wipe is now possible for the next 5 minutes"
    );

    Ok(HttpResponse::Ok().json(ResetTokenResponse {
        token,
        expires_in_seconds: TOKEN_LIFETIME.as_secs(),
    }))
}

// ── POST /api/admin/reset-database ─────────────────────────────────────────
//
// Executes the wipe. Requires the consent token from /reset-token.
// All DELETEs run inside a single transaction. If any table fails, the
// entire operation rolls back.

pub async fn reset_database(
    pool: web::Data<PgPool>,
    config: web::Data<AppConfig>,
    admin: AdminUser,
    req: HttpRequest,
    token_store: web::Data<ResetTokenStore>,
    body: web::Json<ResetDatabaseRequest>,
) -> Result<HttpResponse, AppError> {
    // Guard 1: env flag must be enabled
    if !config.allow_database_reset {
        return Err(AppError::Forbidden(
            "Database reset is not enabled on this deployment. \
             Set ALLOW_DATABASE_RESET=true to enable."
                .into(),
        ));
    }

    // Guard 2: only the hardcoded super-admin
    if !admin.is_super_admin() {
        return Err(AppError::Forbidden(
            "Only the hardcoded super-admin can execute a database reset.".into(),
        ));
    }

    // Guard 3: validate the consent token
    {
        let mut store = token_store
            .lock()
            .map_err(|_| AppError::Internal(anyhow::anyhow!("Reset token lock poisoned")))?;

        let valid = match store.as_ref() {
            Some(state) => state.token == body.token && Instant::now() < state.expires_at,
            None => false,
        };

        if !valid {
            // Consume the token on failure to prevent brute-forcing
            *store = None;
            return Err(AppError::BadRequest(
                "Invalid or expired consent token. Request a new token and try again.".into(),
            ));
        }

        // Consume the token — one-time use
        *store = None;
    }

    // ── Execute the wipe inside a single transaction ────────────────────────
    let mut tx = pool.begin().await.map_err(AppError::Database)?;

    let mut results: Vec<TableWipeResult> = Vec::with_capacity(WIPE_TABLES.len());
    let mut total_rows: u64 = 0;

    for table_name in WIPE_TABLES {
        // Use raw SQL with format! for the table name — all values in WIPE_TABLES
        // are compile-time constants, not user input. This is safe.
        let sql = format!("DELETE FROM {}", table_name);
        let result = sqlx::query(&sql).execute(&mut *tx).await.map_err(|e| {
            tracing::error!(table = %table_name, error = %e, "Database reset failed");
            AppError::Database(e)
        })?;

        let rows_deleted = result.rows_affected();
        total_rows += rows_deleted;

        results.push(TableWipeResult {
            table_name: (*table_name).to_string(),
            rows_deleted,
        });
    }

    tx.commit().await.map_err(AppError::Database)?;

    // ── Audit log (write outside the wiped transaction) ─────────────────────
    let ip = req.peer_addr().map(|a| a.to_string()).unwrap_or_default();

    let _ = crate::handlers::files::write_audit_log_internal(
        pool.get_ref(),
        uuid::Uuid::nil(),
        "DATABASE_RESET",
        &format!("{} rows wiped across {} tables", total_rows, results.len()),
        &ip,
    )
    .await;

    tracing::warn!(
        admin = %admin.username,
        total_rows = %total_rows,
        tables = %results.len(),
        "🗑 Database wipe executed — system is ready for production deployment"
    );

    Ok(HttpResponse::Ok().json(ResetDatabaseResponse {
        wiped: WipeSummary {
            tables: results,
            total_rows_deleted: total_rows,
        },
        preserved: vec![
            "users",
            "permissions",
            "role_groups",
            "role_group_permissions",
            "custom_roles",
            "role_implicit_permissions",
            "classifications",
            "classification_permissions",
            "system_config",
            "_migrations",
        ],
    }))
}
