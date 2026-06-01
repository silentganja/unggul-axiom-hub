-- ============================================================
-- Unggul Axiom Hub — Migration 009
-- Server-side favorites
-- ============================================================

CREATE TABLE IF NOT EXISTS favorites (
    user_id     UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    file_id     UUID         NOT NULL REFERENCES files (id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, file_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites (user_id);

INSERT INTO _migrations (version, description)
VALUES ('0009', 'Server-side favorites table')
ON CONFLICT (version) DO NOTHING;
