// ─────────────────────────────────────────────────────────────────────────────
// Redis client — async connection pool (redis::aio, stable as of redis 0.25).
//
// The previous implementation wrapped a single synchronous connection behind a
// Mutex, serialising all Redis operations. This version uses async multiplexed
// connections with a small pool so Actix handlers never block on Redis I/O.
// ─────────────────────────────────────────────────────────────────────────────

use std::env;
use std::sync::Arc;
use tokio::sync::Semaphore;

/// Thin async Redis client wrapping a pool of multiplexed connections.
/// Connections are created lazily; the semaphore caps concurrency.
#[derive(Clone)]
pub struct RedisClient {
    client: redis::Client,
    /// Maximum concurrent Redis operations. Additional callers wait asynchronously.
    semaphore: Arc<Semaphore>,
}

impl RedisClient {
    /// Create a new Redis client. Connections are opened on demand.
    pub fn new() -> Self {
        let url = env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string());
        let client = redis::Client::open(url.as_str()).expect("Invalid REDIS_URL");

        // Derive concurrency from REDIS_POOL_SIZE env var or default to 16.
        let pool_size: usize = env::var("REDIS_POOL_SIZE")
            .unwrap_or_else(|_| "16".to_string())
            .parse()
            .unwrap_or(16);

        Self {
            client,
            semaphore: Arc::new(Semaphore::new(pool_size)),
        }
    }

    /// Acquire a semaphore permit and return a multiplexed async connection.
    /// The permit is held for the duration of the caller's operation.
    pub(crate) async fn get_conn(
        &self,
    ) -> Result<
        (
            tokio::sync::SemaphorePermit<'_>,
            redis::aio::MultiplexedConnection,
        ),
        crate::errors::AppError,
    > {
        let permit = self.semaphore.acquire().await.map_err(|e| {
            crate::errors::AppError::Redis(format!("Semaphore acquire failed: {}", e))
        })?;

        let conn = self
            .client
            .get_multiplexed_async_connection()
            .await
            .map_err(|e| crate::errors::AppError::Redis(e.to_string()))?;

        Ok((permit, conn))
    }
}

// ── Refresh token helpers ────────────────────────────────────────────────────

pub const REFRESH_TOKEN_TTL_SECS: u64 = 7 * 24 * 3600; // 7 days

/// Store a refresh token in Redis: `refresh:{token}` → JSON payload.
pub async fn store_refresh_token_async(
    client: &actix_web::web::Data<RedisClient>,
    token: &str,
    user_id: &str,
    role: &str,
) -> Result<(), crate::errors::AppError> {
    let key = format!("refresh:{}", token);
    let value = serde_json::json!({
        "user_id": user_id,
        "role": role,
    })
    .to_string();

    let (_permit, mut conn) = client.get_conn().await?;
    redis::cmd("SETEX")
        .arg(&key)
        .arg(REFRESH_TOKEN_TTL_SECS)
        .arg(&value)
        .query_async::<_, ()>(&mut conn)
        .await
        .map_err(|e| crate::errors::AppError::Redis(e.to_string()))
}

/// Retrieve and delete a refresh token (single-use rotation).
pub async fn take_refresh_token_async(
    client: &actix_web::web::Data<RedisClient>,
    token: &str,
) -> Result<Option<(String, String)>, crate::errors::AppError> {
    let key = format!("refresh:{}", token);

    let (_permit, mut conn) = client.get_conn().await?;
    let raw: Option<String> = redis::cmd("GET")
        .arg(&key)
        .query_async(&mut conn)
        .await
        .map_err(|e| crate::errors::AppError::Redis(e.to_string()))?;

    let Some(raw) = raw else {
        return Ok(None);
    };

    // Delete so it cannot be reused
    redis::cmd("DEL")
        .arg(&key)
        .query_async::<_, ()>(&mut conn)
        .await
        .map_err(|e| crate::errors::AppError::Redis(e.to_string()))?;

    let parsed: serde_json::Value = serde_json::from_str(&raw).unwrap_or(serde_json::Value::Null);
    let user_id = parsed["user_id"].as_str().unwrap_or("").to_string();
    let role = parsed["role"].as_str().unwrap_or("").to_string();

    if user_id.is_empty() {
        return Ok(None);
    }

    Ok(Some((user_id, role)))
}

/// Increment the token generation counter for a user (revokes all refresh tokens).
pub async fn revoke_user_tokens_async(
    client: &actix_web::web::Data<RedisClient>,
    user_id: &str,
) -> Result<(), crate::errors::AppError> {
    let key = format!("user_token_gen:{}", user_id);

    let (_permit, mut conn) = client.get_conn().await?;
    redis::cmd("INCR")
        .arg(&key)
        .query_async::<_, ()>(&mut conn)
        .await
        .map_err(|e| crate::errors::AppError::Redis(e.to_string()))
}

// ── Generic key-value helpers ────────────────────────────────────────────────

pub async fn redis_setex_async(
    client: &actix_web::web::Data<RedisClient>,
    key: &str,
    value: &str,
    ttl_secs: u64,
) -> Result<(), crate::errors::AppError> {
    let (_permit, mut conn) = client.get_conn().await?;
    redis::cmd("SETEX")
        .arg(key)
        .arg(ttl_secs)
        .arg(value)
        .query_async::<_, ()>(&mut conn)
        .await
        .map_err(|e| crate::errors::AppError::Redis(e.to_string()))
}

pub async fn redis_get_async(
    client: &actix_web::web::Data<RedisClient>,
    key: &str,
) -> Result<Option<String>, crate::errors::AppError> {
    let (_permit, mut conn) = client.get_conn().await?;
    redis::cmd("GET")
        .arg(key)
        .query_async(&mut conn)
        .await
        .map_err(|e| crate::errors::AppError::Redis(e.to_string()))
}

pub async fn redis_del_async(
    client: &actix_web::web::Data<RedisClient>,
    key: &str,
) -> Result<(), crate::errors::AppError> {
    let (_permit, mut conn) = client.get_conn().await?;
    redis::cmd("DEL")
        .arg(key)
        .query_async::<_, ()>(&mut conn)
        .await
        .map_err(|e| crate::errors::AppError::Redis(e.to_string()))
}

// ── Rate limiting ────────────────────────────────────────────────────────────

/// Sliding-window rate limit check using Redis sorted sets + Lua script.
/// Uses an async multiplexed connection (no Mutex contention).
pub async fn check_rate_limit_async(
    client: &actix_web::web::Data<RedisClient>,
    prefix: &str,
    identifier: &str,
    max_requests: u64,
    window_secs: u64,
) -> Result<bool, crate::errors::AppError> {
    let key = format!("rl:{}:{}", prefix, identifier);
    let now_ms = current_time_ms();

    let script = redis::Script::new(
        r#"
        local key    = KEYS[1]
        local now    = tonumber(ARGV[1])
        local window = tonumber(ARGV[2])
        local max_req = tonumber(ARGV[3])

        redis.call('ZREMRANGEBYSCORE', key, 0, now - window * 1000)

        local count = redis.call('ZCARD', key)

        if count >= max_req then
            return 0
        end

        redis.call('ZADD', key, now, now .. ':' .. count)
        redis.call('EXPIRE', key, window)
        return 1
        "#,
    );

    let (_permit, mut conn) = client.get_conn().await?;
    script
        .key(&key)
        .arg(now_ms)
        .arg(window_secs)
        .arg(max_requests)
        .invoke_async(&mut conn)
        .await
        .map_err(|e| crate::errors::AppError::Redis(e.to_string()))
}

pub fn current_time_ms() -> u64 {
    use std::time::SystemTime;
    SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
