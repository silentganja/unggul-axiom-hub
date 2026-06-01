-- ============================================================
-- Unggul Axiom Hub — Migration 006
-- 4-Tier Role Hierarchy: chief > director > officer > staff
-- ============================================================

-- Drop old constraint and add expanded one
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('chief', 'director', 'officer', 'staff'));

-- Migration Record
INSERT INTO _migrations (version, description)
VALUES ('0006', '4-Tier role hierarchy: chief, director, officer, staff')
ON CONFLICT (version) DO NOTHING;
