-- ═══════════════════════════════════════════════════════════════════════════════
-- 012: Soft-delete TTL Cleanup Policy
--
-- Expired trash files (deleted > 30 days ago) are permanently removed by the
-- background cleanup task in src/utils/cleanup.rs (runtime enforcement).
-- This file documents the policy only — no schema changes are needed.
--
-- The cleanup runs:
--   1. At application startup
--   2. Every hour via a tokio::spawn background task
--
-- Cleanup SQL (executed by cleanup.rs):
--   DELETE FROM files
--   WHERE deleted_at IS NOT NULL
--     AND deleted_at < NOW() - INTERVAL '30 days';
-- ═══════════════════════════════════════════════════════════════════════════════

-- This migration is documentation-only. The runtime cleanup is handled in Rust.
SELECT 1 AS cleanup_policy_documented;
