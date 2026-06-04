use crate::{
    app_middleware::auth::AuthUser, errors::AppError, models::notification::NotificationEvent,
};
use actix_web::HttpResponse;
use futures_util::StreamExt;
use std::sync::LazyLock;
use tokio::sync::broadcast;
use tokio_stream::wrappers::BroadcastStream;

// ── Global broadcast channel ──────────────────────────────────────────────────

/// Capacity of the notification broadcast channel.
const CHANNEL_CAPACITY: usize = 256;

/// Global broadcast sender - used by handlers to push events.
static NOTIFICATION_TX: LazyLock<broadcast::Sender<NotificationEvent>> = LazyLock::new(|| {
    let (tx, _) = broadcast::channel(CHANNEL_CAPACITY);
    tx
});

/// Get a sender handle for broadcasting events from handler code.
#[allow(dead_code)]
pub fn notification_sender() -> broadcast::Sender<NotificationEvent> {
    NOTIFICATION_TX.clone()
}

/// Emit an event to all connected SSE clients.
pub fn emit_notification(event: NotificationEvent) {
    let _ = NOTIFICATION_TX.send(event);
}

// ── SSE stream handler ───────────────────────────────────────────────────────

/// GET /api/notifications/stream
///
/// Opens a Server-Sent Events stream. The client receives real-time notifications
/// for governance updates, share events, file locks/unlocks, and uploads.
pub async fn stream(_user: AuthUser) -> Result<HttpResponse, AppError> {
    let rx = NOTIFICATION_TX.subscribe();
    let stream = BroadcastStream::new(rx)
        .filter_map(|result| async move { result.ok() })
        .map(|event| {
            let data = serde_json::to_string(&event).unwrap_or_default();
            Ok::<_, actix_web::Error>(actix_web::web::Bytes::from(format!("data: {}\n\n", data)))
        });

    Ok(HttpResponse::Ok()
        .content_type("text/event-stream")
        .insert_header(("Cache-Control", "no-cache"))
        .insert_header(("Connection", "keep-alive"))
        .insert_header(("X-Accel-Buffering", "no"))
        .streaming(stream))
}
