-- =====================================================================
-- DigiPost - Migration 002: Add user role column and update session validation
-- =====================================================================

BEGIN;

-- 1. Add role column to users table if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(30) NOT NULL DEFAULT 'assistant';

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. Populate initial roles based on organization structure
-- Department managers -> 'dept_manager'
UPDATE users u
SET role = 'dept_manager'
WHERE EXISTS (
  SELECT 1 FROM departments d WHERE d.manager_id = u.id
);

-- Checkers (managers of direct subordinates who are not dept managers) -> 'checker'
UPDATE users u
SET role = 'checker'
WHERE role = 'assistant'
  AND EXISTS (
    SELECT 1 FROM users sub WHERE sub.manager_id = u.id
  );

-- 3. Replace fn_validate_session_by_token to return role column
DROP FUNCTION IF EXISTS fn_validate_session_by_token(TEXT, INTERVAL);

CREATE OR REPLACE FUNCTION fn_validate_session_by_token(
  p_token_hash TEXT,
  p_idle       INTERVAL DEFAULT '30 minutes'
) RETURNS TABLE (
  user_id              BIGINT,
  session_id           UUID,
  must_change_password BOOLEAN,
  employee_no          VARCHAR(30),
  full_name            VARCHAR(150),
  email                VARCHAR(190),
  username             VARCHAR(60),
  department_id        BIGINT,
  department_name      VARCHAR(150),
  manager_id           BIGINT,
  is_active            BOOLEAN,
  role                 VARCHAR(30)
) LANGUAGE plpgsql AS $$
DECLARE s user_sessions%ROWTYPE;
BEGIN
  SELECT * INTO s FROM user_sessions WHERE refresh_token_hash = p_token_hash FOR UPDATE;
  IF NOT FOUND OR s.revoked_at IS NOT NULL OR s.expires_at <= now()
     OR s.last_seen_at + p_idle <= now() THEN
    RETURN;
  END IF;

  UPDATE user_sessions SET last_seen_at = now() WHERE id = s.id;

  RETURN QUERY
  SELECT
    u.id,
    s.id,
    u.must_change_password,
    u.employee_no,
    u.full_name,
    u.email,
    u.username,
    u.department_id,
    d.name,
    u.manager_id,
    u.is_active,
    u.role
  FROM users u
  LEFT JOIN departments d ON d.id = u.department_id
  WHERE u.id = s.user_id AND u.is_active = TRUE;
END $$;

COMMIT;

