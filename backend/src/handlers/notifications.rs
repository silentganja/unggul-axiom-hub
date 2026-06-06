use crate::{
    app_middleware::auth::AuthUser, errors::AppError, models::notification::NotificationEvent,
};
use actix_web::{web, HttpResponse};
use futures_util::StreamExt;
use std::collections::HashMap;
use std::sync::LazyLock;
use tokio::sync::broadcast;
use tokio_stream::wrappers::BroadcastStream;
use uuid::Uuid;

// ── Global broadcast channel ──────────────────────────────────────────────────

/// Capacity of the notification broadcast channel.
const CHANNEL_CAPACITY: usize = 1024;

/// Global broadcast sender — used by handlers to push events.
static NOTIFICATION_TX: LazyLock<broadcast::Sender<(Option<Uuid>, NotificationEvent)>> =
    LazyLock::new(|| {
        let (tx, _) = broadcast::channel(CHANNEL_CAPACITY);
        tx
    });

/// Get a sender handle for broadcasting events from handler code.
#[allow(dead_code)]
pub fn notification_sender() -> broadcast::Sender<(Option<Uuid>, NotificationEvent)> {
    NOTIFICATION_TX.clone()
}

/// Emit an event to all connected SSE clients.
///
/// If `target_user_id` is Some, the event is tagged for that specific user.
/// Clients filter on the tag so each user only sees their own events.
/// If `target_user_id` is None, the event is broadcast to all clients
/// (used for global admin notifications).
pub fn emit_notification_to(target_user_id: Option<Uuid>, event: NotificationEvent) {
    let _ = NOTIFICATION_TX.send((target_user_id, event));
}

/// Emit a notification targeted at a specific user.
#[allow(dead_code)]
pub fn emit_notification_to_user(user_id: Uuid, event: NotificationEvent) {
    emit_notification_to(Some(user_id), event);
}

/// Emit a broadcast notification (all connected clients receive it).
pub fn emit_notification(event: NotificationEvent) {
    emit_notification_to(None, event);
}

// ── SSE stream handler ───────────────────────────────────────────────────────

/// GET /api/notifications/stream
///
/// Opens a Server-Sent Events stream. The client receives real-time notifications
/// for governance updates, share events, file locks/unlocks, and uploads.
///
/// Authentication: supports both standard Bearer header (AuthUser extractor)
/// and a `?token=` query parameter for SSE-specific short-lived tokens.
/// The query-param path exists because the browser EventSource API does not
/// support custom headers. The token in the URL is a short-lived (5-minute)
/// SSE token, not the main access JWT.
pub async fn stream(
    user: AuthUser,
    _query: web::Query<HashMap<String, String>>,
) -> Result<HttpResponse, AppError> {
    let user_id = user.id;

    let rx = NOTIFICATION_TX.subscribe();
    let stream = BroadcastStream::new(rx).filter_map(move |result| {
        let user_id = user_id;
        async move {
            match result {
                Ok((target_user, event)) => {
                    // Filter: only deliver events targeted to this user, or broadcast events
                    match target_user {
                        Some(uid) if uid != user_id => return None,
                        _ => {}
                    }

                    let payload = serde_json::to_string(&event).unwrap_or_default();
                    Some(Ok::<_, actix_web::Error>(actix_web::web::Bytes::from(
                        format!("data: {}\n\n", payload),
                    )))
                }
                Err(tokio_stream::wrappers::errors::BroadcastStreamRecvError::Lagged(n)) => {
                    let payload = serde_json::json!({
                        "type": "stream_reset",
                        "message": format!("Missed {} events. Please refresh.", n)
                    })
                    .to_string();
                    Some(Ok::<_, actix_web::Error>(actix_web::web::Bytes::from(
                        format!("data: {}\n\n", payload),
                    )))
                }
            }
        }
    });

    let keepalive_stream = tokio_stream::wrappers::IntervalStream::new(tokio::time::interval(
        std::time::Duration::from_secs(15),
    ))
    .map(|_| Ok::<_, actix_web::Error>(actix_web::web::Bytes::from(": keepalive\n\n")));

    let merged_stream = futures_util::stream::select(stream, keepalive_stream);

    Ok(HttpResponse::Ok()
        .content_type("text/event-stream")
        .insert_header(("Cache-Control", "no-cache"))
        .insert_header(("Connection", "keep-alive"))
        .insert_header(("X-Accel-Buffering", "no"))
        .streaming(merged_stream))
}
