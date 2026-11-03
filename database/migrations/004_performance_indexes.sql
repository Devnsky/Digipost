-- =============================================================================
-- Migration 004: Performance & Scalability Indexes
-- Optimizing query execution plans for dashboard queries, department queues,
-- and audit trail retrieval.
-- =============================================================================

-- 1. Index on departments.manager_id to accelerate manager authorization checks and joins
CREATE INDEX IF NOT EXISTS ix_departments_manager
  ON departments (manager_id)
  WHERE is_active = TRUE;

-- 2. Composite index on documents(status, created_at DESC) for filtered list queries
CREATE INDEX IF NOT EXISTS ix_doc_status_created
  ON documents (status, created_at DESC)
  WHERE deleted_at IS NULL;

-- 3. B-Tree index on documents.document_number for fast ID lookups
CREATE INDEX IF NOT EXISTS ix_doc_number
  ON documents (document_number)
  WHERE deleted_at IS NULL;

-- 4. Composite index on document_departments(document_id, passed_checker) for department queue queries
CREATE INDEX IF NOT EXISTS ix_dd_passed_checker
  ON document_departments (document_id, passed_checker);

-- 5. Index on approval_logs(document_id, created_at ASC) for fast timeline audit trail generation
CREATE INDEX IF NOT EXISTS ix_logs_doc_created
  ON approval_logs (document_id, created_at ASC);

-- 6. Partial composite index on documents(applicant_id, created_at DESC) for "My Documents" query
CREATE INDEX IF NOT EXISTS ix_documents_applicant_active
  ON documents (applicant_id, created_at DESC)
  WHERE deleted_at IS NULL;


