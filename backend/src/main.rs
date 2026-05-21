// ─────────────────────────────────────────────────────────────────────────────
// Unggul Axiom Backend — main.rs
// Phase 7–8: Core schema, Auth Engine & File System API
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
}

// ─── Handlers ───────────────────────────────────────────────────────────────

/// GET /health
/// Returns service liveness and database connectivity status.
#[get("/health")]
async fn health_check(pool: web::Data<sqlx::PgPool>) -> impl Responder {
    // Raw query — NO sqlx macros per engineering rules
    let db_ok = sqlx::query("SELECT 1 AS ok")
        .fetch_one(pool.get_ref())
        .await
        .is_ok();

    let status = if db_ok { "ok" } else { "degraded" };

    HttpResponse::Ok().json(HealthResponse {
        status,
        version: env!("CARGO_PKG_VERSION"),
        database: db_ok,
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
    // Raw sqlx — no compile-time macros per engineering rules.
    let pool = PgPoolOptions::new()
        .max_connections(20)
        .connect(&database_url)
        .await
        .expect("Failed to connect to PostgreSQL");

    info!("✓ Database connected");
    info!("✓ Starting Unggul Axiom Backend on {}:{}", host, port);

    // ── HTTP server ───────────────────────────────────────────────────────────
    let pool_data = web::Data::new(pool);
    let config_data = web::Data::new(config);

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
            .wrap(Logger::new(
                "%a \"%r\" %s %b \"%{Referer}i\" \"%{User-Agent}i\" %T",
            ))
            // ── Shared state ──────────────────────────────────────────────────
            .app_data(pool_data.clone())
            .app_data(config_data.clone())
            // ── Routes ────────────────────────────────────────────────────────
            .service(root)
            .service(health_check)
            // /api/auth
            .service(web::scope("/api/auth").route("/login", web::post().to(handlers::auth::login)))
            // /api/files  — all routes require a valid JWT (AuthUser extractor)
            .service(
                web::scope("/api/files")
                    // GET  /api/files[?parent_id=uuid]  — list directory contents
                    .route("", web::get().to(handlers::files::list_files))
                    // POST /api/files/folder             — create a new folder
                    .route("/folder", web::post().to(handlers::files::create_folder))
                    // POST /api/files/upload             — upload a file
                    .route("/upload", web::post().to(handlers::files::upload_file))
                    // PUT  /api/files/{id}/rename        — rename a file or folder
                    .route("/{id}/rename", web::put().to(handlers::files::rename_file))
                    // DELETE /api/files/{id}             — delete a file or folder
                    .route("/{id}", web::delete().to(handlers::files::delete_file)),
            )
    })
    .bind((host.as_str(), port))?
    .run()
    .await
}
