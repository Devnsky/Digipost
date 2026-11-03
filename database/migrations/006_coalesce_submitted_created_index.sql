-- =============================================================================
-- Migration 006: Department Queue Functional Index
-- Accelerates listDepartmentDocuments sorting & date range filtering on large datasets.
-- =============================================================================

CREATE INDEX IF NOT EXISTS ix_doc_coalesce_submitted_created
  ON documents (COALESCE(submitted_at, created_at) DESC)
  WHERE deleted_at IS NULL;

