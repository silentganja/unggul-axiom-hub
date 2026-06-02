-- ═══════════════════════════════════════════════════════════════════════════════
-- 013: Full-Text Search via tsvector
--
-- Adds a search_vector tsvector column to the files table with a GIN index
-- and an auto-update trigger. This enables fast full-text search on file names.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add tsvector column
ALTER TABLE files ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_files_search_vector ON files USING GIN (search_vector);

-- Auto-update trigger function
CREATE OR REPLACE FUNCTION files_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', COALESCE(NEW.name, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on INSERT or UPDATE of name
DROP TRIGGER IF EXISTS trg_files_search_vector ON files;
CREATE TRIGGER trg_files_search_vector
    BEFORE INSERT OR UPDATE OF name ON files
    FOR EACH ROW
    EXECUTE FUNCTION files_search_vector_update();

-- Backfill existing rows
UPDATE files SET search_vector = to_tsvector('english', COALESCE(name, ''))
WHERE search_vector IS NULL;
