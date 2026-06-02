-- ═══════════════════════════════════════════════════════════════════════════════
-- 014: Governance Review Note
--
-- Adds a review_note TEXT column to governance_requests for storing the
-- reviewer's reason when approving or rejecting a request.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE governance_requests ADD COLUMN IF NOT EXISTS review_note TEXT;
