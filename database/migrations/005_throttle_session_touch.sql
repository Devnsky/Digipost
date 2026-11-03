-- =====================================================================
-- DigiPost - Migration 005: Optimize Session Validation Concurrency
-- Throttles last_seen_at updates to once per minute to eliminate row lock contention
-- =====================================================================

BEGIN;

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
  -- 1. Read session without row-level write lock to allow non-blocking concurrent reads
  SELECT * INTO s FROM user_sessions WHERE refresh_token_hash = p_token_hash;
  IF NOT FOUND OR s.revoked_at IS NOT NULL OR s.expires_at <= now()
     OR s.last_seen_at + p_idle <= now() THEN
    RETURN;
  END IF;

  -- 2. Throttled update: only refresh last_seen_at if at least 1 minute has elapsed
  IF s.last_seen_at + interval '1 minute' <= now() THEN
    UPDATE user_sessions SET last_seen_at = now() WHERE id = s.id;
  END IF;

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

