// ─────────────────────────────────────────────────────────────────────────────
// Unggul Axiom Backend — main.rs
// Phase 7–8: Core schema, Auth Engine & File System API
// Phase 9: Redis, Rate Limiting, Token Refresh, Email Service
// ─────────────────────────────────────────────────────────────────────────────

use actix_cors::Cors;
use actix_web::middleware::Logger;
use actix_web::{get, web, App, HttpResponse, HttpServer, Responder};
use sqlx::postgres::PgPoolOptions;
use std::env;
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

// ─── Module declarations ─────────────────────────────────────────────────────

mod app_middleware;
mod errors;
mod handlers;
mod models;
mod utils;

// Re-export auth extractor for convenience
pub use app_middleware::auth::AuthUser;

// ─── App configuration ───────────────────────────────────────────────────────

/// Shared application configuration injected as `web::Data<AppConfig>`.
/// Avoids repeated `env::var` calls inside hot handler paths.
#[derive(Clone)]
pub struct AppConfig {
    /// HS256 secret for JWT signing/verification.
    pub jwt_secret: String,
    /// Storage path for files.
    pub storage_path: String,
}

// ─── Response types ─────────────────────────────────────────────────────────

#[derive(serde::Serialize)]
struct HealthResponse {
    status: &'static str,
    version: &'static str,
    database: bool,
    redis: bool,
}

// ─── Handlers ───────────────────────────────────────────────────────────────

/// GET /health
/// Returns service liveness and database/redis connectivity status.
#[get("/health")]
async fn health_check(
    pool: web::Data<sqlx::PgPool>,
    redis_conn: web::Data<redis::aio::ConnectionManager>,
) -> impl Responder {
    let db_ok = sqlx::query("SELECT 1 AS ok")
        .fetch_one(pool.get_ref())
        .await
        .is_ok();

    let redis_ok = {
        let mut conn = redis_conn.get_ref().clone();
        redis::cmd("PING")
            .query_async::<_, String>(&mut conn)
            .await
            .is_ok()
    };

    let status = if db_ok && redis_ok { "ok" } else { "degraded" };

    HttpResponse::Ok().json(HealthResponse {
        status,
        version: env!("CARGO_PKG_VERSION"),
        database: db_ok,
        redis: redis_ok,
    })
}

/// GET /
/// Root — redirect hint for any stray clients.
#[get("/")]
async fn root() -> impl Responder {
    HttpResponse::Ok().body("Unggul Axiom Backend — v".to_owned() + env!("CARGO_PKG_VERSION"))
}

// ─── Main ────────────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() -> std::io::Result<()> {
    // Load .env (dev only; in prod env vars are injected by Docker/ECS)
    let _ = dotenvy::dotenv();

    // Tracing
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .with(tracing_subscriber::fmt::layer().compact())
        .init();

    // ── Config ───────────────────────────────────────────────────────────────
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let jwt_secret = env::var("JWT_SECRET").expect("JWT_SECRET must be set");
    let storage_path = env::var("STORAGE_PATH").unwrap_or_else(|_| "./uploads".to_string());
    let host = env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port: u16 = env::var("PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse()
        .expect("PORT must be a valid u16");

    // Ensure the storage directory exists on startup
    tokio::fs::create_dir_all(&storage_path)
        .await
        .expect("Failed to create storage directory");

    let config = AppConfig {
        jwt_secret,
        storage_path,
    };

    // ── Database pool ─────────────────────────────────────────────────────────
    let pool = PgPoolOptions::new()
        .max_connections(20)
        .connect(&database_url)
        .await
        .expect("Failed to connect to PostgreSQL");

    info!("✓ Database connected");

    // ── Auto-migrations — ensure schema is up to date ─────────────────────────
    utils::migrations::run_migrations(&pool).await;

    // ── Redis ─────────────────────────────────────────────────────────────────
    let redis_conn = utils::redis::connect().await;
    info!("✓ Redis connected");

    info!("✓ Starting Unggul Axiom Backend on {}:{}", host, port);

    // ── HTTP server ───────────────────────────────────────────────────────────
    let pool_data = web::Data::new(pool);
    let config_data = web::Data::new(config);
    let redis_data = web::Data::new(redis_conn);

    HttpServer::new(move || {
        // CORS — allow localhost in dev + hub subdomain in production
        let cors = Cors::default()
            .allowed_origin_fn(|origin, _| {
                let o = origin.as_bytes();
                o.starts_with(b"http://localhost")
                    || o.starts_with(b"https://localhost")
                    || o.starts_with(b"https://hub.unggulaxiom.com")
            })
            .allowed_methods(vec!["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
            .allowed_headers(vec![
                actix_web::http::header::AUTHORIZATION,
                actix_web::http::header::CONTENT_TYPE,
                actix_web::http::header::ACCEPT,
            ])
            .expose_headers(vec![actix_web::http::header::CONTENT_TYPE])
            .max_age(3600);

        App::new()
            // ── Middleware ────────────────────────────────────────────────────
            .wrap(cors)
            .wrap(app_middleware::rate_limit::RateLimitMiddleware)
            .wrap(Logger::new(
                "%a \"%r\" %s %b \"%{Referer}i\" \"%{User-Agent}i\" %T",
            ))
            // ── Shared state ──────────────────────────────────────────────────
            .app_data(pool_data.clone())
            .app_data(config_data.clone())
            .app_data(redis_data.clone())
            // ── Routes ────────────────────────────────────────────────────────
            .service(root)
            .service(health_check)
            // /api/admin — admin panel (login is public; CRUD requires AdminUser extractor)
            .service(
                web::scope("/api/admin")
                    .route("/login", web::post().to(handlers::admin::admin_login))
                    .route("/dashboard", web::get().to(handlers::admin::dashboard))
                    .route("/config", web::get().to(handlers::admin::get_config))
                    .route("/config", web::put().to(handlers::admin::update_config))
                    .route(
                        "/governance",
                        web::get().to(handlers::admin::admin_governance_list),
                    )
                    .route(
                        "/governance/{id}/force-approve",
                        web::post().to(handlers::admin::force_approve),
                    )
                    .route(
                        "/storage-breakdown",
                        web::get().to(handlers::admin::storage_breakdown),
                    )
                    .route(
                        "/users/bulk",
                        web::post().to(handlers::admin::bulk_create_users),
                    )
                    .route(
                        "/users/bulk-role",
                        web::put().to(handlers::admin::bulk_role_update),
                    )
                    .route("/users", web::get().to(handlers::admin::list_users))
                    .route("/users", web::post().to(handlers::admin::create_user))
                    .route(
                        "/users/{id}/files",
                        web::get().to(handlers::admin::user_files),
                    )
                    .route(
                        "/users/{id}/reset-password",
                        web::post().to(handlers::admin::reset_user_password),
                    )
                    .route(
                        "/users/{id}/toggle-active",
                        web::post().to(handlers::admin::toggle_user_active),
                    )
                    .route("/users/{id}", web::put().to(handlers::admin::update_user))
                    .route(
                        "/users/{id}",
                        web::delete().to(handlers::admin::delete_user),
                    )
                    .route(
                        "/files/{id}/force",
                        web::delete().to(handlers::admin::force_delete_file),
                    ),
            )
            // /api/auth
            .service(
                web::scope("/api/auth")
                    .route("/login", web::post().to(handlers::auth::login))
                    .route("/me", web::get().to(handlers::auth::me))
                    .route("/profile", web::put().to(handlers::auth::update_profile))
                    .route("/refresh", web::post().to(handlers::auth_extras::refresh))
                    .route("/logout", web::post().to(handlers::auth_extras::logout))
                    .route(
                        "/forgot-password",
                        web::post().to(handlers::auth_extras::forgot_password),
                    )
                    .route(
                        "/reset-password",
                        web::post().to(handlers::auth_extras::reset_password),
                    )
                    .route(
                        "/magic-link",
                        web::post().to(handlers::auth_extras::request_magic_link),
                    )
                    .route(
                        "/magic-link",
                        web::get().to(handlers::auth_extras::verify_magic_link),
                    )
                    .route(
                        "/webauthn/register/begin",
                        web::get().to(handlers::auth_extras::webauthn_register_begin),
                    )
                    .route(
                        "/webauthn/register/complete",
                        web::post().to(handlers::auth_extras::webauthn_register_complete),
                    )
                    .route(
                        "/webauthn/login/begin",
                        web::get().to(handlers::auth_extras::webauthn_login_begin),
                    )
                    .route(
                        "/webauthn/login/complete",
                        web::post().to(handlers::auth_extras::webauthn_login_complete),
                    ),
            )
            // /api/governance  — approval workflow (submit: any user, approve/reject: admin)
            .service(
                web::scope("/api/governance")
                    .route(
                        "/requests",
                        web::post().to(handlers::governance::create_request),
                    )
                    .route(
                        "/requests",
                        web::get().to(handlers::governance::list_requests),
                    )
                    .route(
                        "/requests/{id}/approve",
                        web::post().to(handlers::governance::approve_request),
                    )
                    .route(
                        "/requests/{id}/reject",
                        web::post().to(handlers::governance::reject_request),
                    ),
            )
            // /api/activity  — activity feed (audit + shares + governance)
            .service(
                web::scope("/api/activity")
                    .route("", web::get().to(handlers::files::activity_feed)),
            )
            // /api/audit  — all routes require a valid JWT (AuthUser extractor)
            .service(
                web::scope("/api/audit").route("", web::get().to(handlers::audit::list_audit_logs)),
            )
            // /api/notifications — SSE stream
            .service(
                web::scope("/api/notifications")
                    .route("/stream", web::get().to(handlers::notifications::stream)),
            )
            // /api/files  — all routes require a valid JWT (AuthUser extractor)
            .service(
                web::scope("/api/files")
                    .route("", web::get().to(handlers::files::list_files))
                    .route(
                        "/shared",
                        web::get().to(handlers::shares::list_shared_files),
                    )
                    .route("/quota", web::get().to(handlers::files::get_quota))
                    .route("/trash", web::get().to(handlers::files::list_trash))
                    .route("/move", web::post().to(handlers::files::move_files))
                    // Favorites
                    .route(
                        "/favorites",
                        web::get().to(handlers::favorites::list_favorites),
                    )
                    .route(
                        "/favorites",
                        web::post().to(handlers::favorites::add_favorite),
                    )
                    .route(
                        "/favorites/{file_id}",
                        web::delete().to(handlers::favorites::remove_favorite),
                    )
                    // File versions
                    .route(
                        "/{id}/versions",
                        web::get().to(handlers::file_versions::list_versions),
                    )
                    .route(
                        "/{id}/versions/{version_id}/restore",
                        web::post().to(handlers::file_versions::restore_version),
                    )
                    .route("/{id}", web::get().to(handlers::files::get_file))
                    .route("/folder", web::post().to(handlers::files::create_folder))
                    .route("/upload", web::post().to(handlers::files::upload_file))
                    .route("/{id}/share", web::post().to(handlers::shares::share_file))
                    .route(
                        "/{id}/shares",
                        web::get().to(handlers::shares::list_file_shares),
                    )
                    .route(
                        "/{id}/share/{uid}",
                        web::delete().to(handlers::shares::remove_share),
                    )
                    .route(
                        "/{id}/content",
                        web::get().to(handlers::files::get_file_content),
                    )
                    .route(
                        "/{id}/download",
                        web::get().to(handlers::files::download_file),
                    )
                    .route(
                        "/{id}/restore",
                        web::post().to(handlers::files::restore_file),
                    )
                    .route("/{id}/rename", web::put().to(handlers::files::rename_file))
                    .route(
                        "/{id}/permanent",
                        web::delete().to(handlers::files::permanent_delete),
                    )
                    .route("/{id}", web::delete().to(handlers::files::delete_file)),
            )
    })
    .bind((host.as_str(), port))?
    .run()
    .await
}
