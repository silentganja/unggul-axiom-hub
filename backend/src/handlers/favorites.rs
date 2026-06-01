use crate::{
    app_middleware::auth::AuthUser,
    errors::AppError,
    models::favorite::FavoriteFile,
};
use actix_web::{web, HttpResponse};
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;

// ── Request shapes ────────────────────────────────────────────────────────────

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AddFavoriteRequest {
    file_id: Uuid,
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/// GET /api/files/favorites
/// List all files the authenticated user has favorited.
pub async fn list_favorites(
    pool: web::Data<PgPool>,
    user: AuthUser,
) -> Result<HttpResponse, AppError> {
    let files: Vec<FavoriteFile> = sqlx::query_as(
        "SELECT f.id, f.parent_id, f.owner_id, f.name, f.is_folder,
                f.size_bytes, f.mime_type, f.classification,
                f.created_at, f.updated_at, fav.created_at AS favorited_at
         FROM favorites fav
         JOIN files f ON f.id = fav.file_id
         WHERE fav.user_id = $1 AND f.deleted_at IS NULL
         ORDER BY fav.created_at DESC
         LIMIT 500",
    )
    .bind(user.id)
    .fetch_all(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    Ok(HttpResponse::Ok().json(files))
}

/// POST /api/files/favorites
/// Add a file to the user's favorites.
pub async fn add_favorite(
    pool: web::Data<PgPool>,
    user: AuthUser,
    body: web::Json<AddFavoriteRequest>,
) -> Result<HttpResponse, AppError> {
    // Verify the file exists and user has access (owns it or shared with them)
    let file_exists: bool = sqlx::query_scalar(
        "SELECT EXISTS(
            SELECT 1 FROM files f
            LEFT JOIN file_shares fs ON fs.file_id = f.id AND fs.user_id = $1
            WHERE f.id = $2 AND f.deleted_at IS NULL
              AND (f.owner_id = $1 OR fs.user_id IS NOT NULL)
        )",
    )
    .bind(user.id)
    .bind(body.file_id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    if !file_exists {
        return Err(AppError::NotFound);
    }

    sqlx::query(
        "INSERT INTO favorites (user_id, file_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    )
    .bind(user.id)
    .bind(body.file_id)
    .execute(pool.get_ref())
    .await
    .map_err(AppError::Database)?;

    Ok(HttpResponse::Ok().json(serde_json::json!({ "status": "favorited" })))
}

/// DELETE /api/files/favorites/{file_id}
/// Remove a file from the user's favorites.
pub async fn remove_favorite(
    pool: web::Data<PgPool>,
    user: AuthUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let file_id = path.into_inner();

    sqlx::query("DELETE FROM favorites WHERE user_id = $1 AND file_id = $2")
        .bind(user.id)
        .bind(file_id)
        .execute(pool.get_ref())
        .await
        .map_err(AppError::Database)?;

    Ok(HttpResponse::Ok().json(serde_json::json!({ "status": "unfavorited" })))
}
