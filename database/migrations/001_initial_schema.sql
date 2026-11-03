-- =====================================================================
-- DigiPost - Document Approval Workflow Schema (PostgreSQL 14+)
-- Maker-Checker (level 1) + Multi-Department Approval (level 2)
-- =====================================================================

BEGIN;

-- ---------- ENUM TYPES -----------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_status_t') THEN
    CREATE TYPE document_status_t AS ENUM ('draft','pending','approved','rejected','canceled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_stage_t') THEN
    CREATE TYPE review_stage_t AS ENUM ('applicant','checker');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dept_decision_t') THEN
    CREATE TYPE dept_decision_t AS ENUM ('approved','rejected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'response_type_t') THEN
    CREATE TYPE response_type_t AS ENUM ('comment','revision_request');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'author_role_t') THEN
    CREATE TYPE author_role_t AS ENUM ('checker','dept_manager');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notif_event_t') THEN
    CREATE TYPE notif_event_t AS ENUM (
      'submitted','checker_comment','revision_requested','checker_rejected',
      'forwarded','dept_response','dept_added','final_approved','final_rejected',
      'canceled','draft_deleted'
    );
  END IF;
END $$;

-- ---------- MASTER DATA ----------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
  id         BIGSERIAL PRIMARY KEY,
  code       VARCHAR(30)  NOT NULL UNIQUE,
  name       VARCHAR(150) NOT NULL,
  manager_id BIGINT,      -- FK ditambahkan setelah tabel users
  is_active  BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS users (
  id                   BIGSERIAL PRIMARY KEY,
  employee_no          VARCHAR(30)  NOT NULL UNIQUE,
  full_name            VARCHAR(150) NOT NULL,
  email                VARCHAR(190) NOT NULL UNIQUE,
  department_id        BIGINT REFERENCES departments(id),
  manager_id           BIGINT REFERENCES users(id), -- atasan langsung (= Checker)
  role                 VARCHAR(30)  NOT NULL DEFAULT 'assistant', -- assistant, checker, dept_manager, admin
  is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
  -- autentikasi
  username             VARCHAR(60)  NOT NULL,
  password_hash        VARCHAR(255) NOT NULL,       -- argon2id
  must_change_password BOOLEAN      NOT NULL DEFAULT FALSE,
  failed_login_count   INT          NOT NULL DEFAULT 0,
  locked_until         TIMESTAMPTZ,
  last_login_at        TIMESTAMPTZ,
  password_changed_at  TIMESTAMPTZ,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT ck_user_not_self_manager CHECK (manager_id IS NULL OR manager_id <> id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username ON users (lower(username));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_dept_manager'
  ) THEN
    ALTER TABLE departments ADD CONSTRAINT fk_dept_manager FOREIGN KEY (manager_id) REFERENCES users(id);
  END IF;
END $$;

-- ---------- AUTHENTICATION & SESSIONS --------------------------------
CREATE TABLE IF NOT EXISTS user_sessions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            BIGINT       NOT NULL REFERENCES users(id),
  refresh_token_hash VARCHAR(64)  NOT NULL UNIQUE,
  expires_at         TIMESTAMPTZ  NOT NULL,
  last_seen_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  revoked_at         TIMESTAMPTZ,
  ip_address         INET,
  user_agent         VARCHAR(300),
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_sess_user ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS ix_sess_token_hash ON user_sessions (refresh_token_hash);

CREATE TABLE IF NOT EXISTS login_attempts (
  id             BIGSERIAL PRIMARY KEY,
  attempted_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  username_input VARCHAR(100) NOT NULL,
  user_id        BIGINT REFERENCES users(id),
  success        BOOLEAN NOT NULL,
  failure_reason VARCHAR(40),
  ip_address     INET,
  user_agent     VARCHAR(300)
);

CREATE INDEX IF NOT EXISTS ix_login_user ON login_attempts (user_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS ix_login_ip   ON login_attempts (ip_address, attempted_at DESC);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id),
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_reset_user ON password_reset_tokens (user_id, expires_at);

-- ---------- CORE WORKFLOW --------------------------------------------
CREATE SEQUENCE IF NOT EXISTS document_number_seq START WITH 1;

CREATE TABLE IF NOT EXISTS documents (
  id              BIGSERIAL PRIMARY KEY,
  document_number VARCHAR(50) NOT NULL UNIQUE DEFAULT ('IAC-' || to_char(CURRENT_DATE, 'YYMM') || lpad(nextval('document_number_seq')::text, 4, '0')),
  title           VARCHAR(200) NOT NULL,
  description     TEXT,
  applicant_id    BIGINT NOT NULL REFERENCES users(id),
  checker_id      BIGINT REFERENCES users(id), -- snapshot atasan saat submit
  status          document_status_t NOT NULL DEFAULT 'draft',
  review_stage    review_stage_t DEFAULT 'applicant', -- hanya bermakna saat draft
  submitted_at    TIMESTAMPTZ, -- terakhir diajukan ke Checker
  forwarded_at    TIMESTAMPTZ, -- saat menjadi pending
  decided_at      TIMESTAMPTZ, -- saat status final
  version         INTEGER NOT NULL DEFAULT 1, -- optimistic lock
  deleted_at      TIMESTAMPTZ, -- soft delete
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_stage_only_when_draft CHECK ((status = 'draft') = (review_stage IS NOT NULL)),
  CONSTRAINT ck_checker_after_submit CHECK (submitted_at IS NULL OR checker_id IS NOT NULL),
  CONSTRAINT ck_soft_delete_draft_only CHECK (deleted_at IS NULL OR status = 'draft'),
  CONSTRAINT ck_final_has_decided_at CHECK (status NOT IN ('approved','rejected','canceled') OR decided_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS document_versions (
  id          BIGSERIAL PRIMARY KEY,
  document_id BIGINT NOT NULL REFERENCES documents(id),
  version_no  INTEGER NOT NULL,
  file_name   VARCHAR(255) NOT NULL,
  file_path   VARCHAR(500) NOT NULL,
  mime_type   VARCHAR(100),
  file_size   BIGINT,
  checksum    VARCHAR(64),
  uploaded_by BIGINT NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_doc_version UNIQUE (document_id, version_no)
);

CREATE TABLE IF NOT EXISTS document_departments (
  id             BIGSERIAL PRIMARY KEY,
  document_id    BIGINT NOT NULL REFERENCES documents(id),
  department_id  BIGINT NOT NULL REFERENCES departments(id),
  passed_checker BOOLEAN NOT NULL DEFAULT FALSE,
  decision       dept_decision_t, -- NULL = belum memutuskan
  decided_by     BIGINT REFERENCES users(id),
  decided_at     TIMESTAMPTZ,
  added_by       BIGINT NOT NULL REFERENCES users(id),
  added_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_doc_dept UNIQUE (document_id, department_id),
  CONSTRAINT ck_decision_meta CHECK (decision IS NULL OR (decided_by IS NOT NULL AND decided_at IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS decision_history (
  id            BIGSERIAL PRIMARY KEY,
  document_id   BIGINT NOT NULL,
  department_id BIGINT NOT NULL,
  old_decision  dept_decision_t,
  new_decision  dept_decision_t NOT NULL,
  actor_id      BIGINT NOT NULL REFERENCES users(id),
  changed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (document_id, department_id) REFERENCES document_departments (document_id, department_id)
);

CREATE TABLE IF NOT EXISTS responses (
  id              BIGSERIAL PRIMARY KEY,
  document_id     BIGINT NOT NULL REFERENCES documents(id),
  author_id       BIGINT NOT NULL REFERENCES users(id),
  author_role     author_role_t NOT NULL,
  department_id   BIGINT REFERENCES departments(id), -- terisi bila author = dept_manager
  type            response_type_t NOT NULL DEFAULT 'comment',
  body            TEXT NOT NULL,
  visible_to_dept BOOLEAN NOT NULL DEFAULT FALSE, -- komentar Checker: TRUE saat forward
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_dept_response_visible CHECK (author_role <> 'dept_manager' OR visible_to_dept)
);

CREATE TABLE IF NOT EXISTS notifications (
  id           BIGSERIAL PRIMARY KEY,
  recipient_id BIGINT NOT NULL REFERENCES users(id),
  document_id  BIGINT NOT NULL REFERENCES documents(id),
  event_type   notif_event_t NOT NULL,
  message      TEXT,
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS approval_logs (
  id          BIGSERIAL PRIMARY KEY,
  document_id BIGINT NOT NULL REFERENCES documents(id),
  actor_id    BIGINT REFERENCES users(id), -- NULL = sistem (agregasi)
  action      VARCHAR(40) NOT NULL,
  from_status document_status_t,
  to_status   document_status_t,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- INDEXES --------------------------------------------------
CREATE INDEX IF NOT EXISTS ix_doc_applicant   ON documents (applicant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_doc_checker     ON documents (checker_id, review_stage) WHERE deleted_at IS NULL AND status = 'draft';
CREATE INDEX IF NOT EXISTS ix_doc_pending_age ON documents (forwarded_at) WHERE deleted_at IS NULL AND status = 'pending';
CREATE INDEX IF NOT EXISTS ix_dd_dept         ON document_departments (department_id, decision);
CREATE INDEX IF NOT EXISTS ix_resp_doc        ON responses (document_id, created_at);
CREATE INDEX IF NOT EXISTS ix_notif_inbox     ON notifications (recipient_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_log_doc         ON approval_logs (document_id, created_at);

-- ---------- GUARD TRIGGERS -------------------------------------------
CREATE OR REPLACE FUNCTION trg_dd_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_status document_status_t;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.passed_checker THEN
      RAISE EXCEPTION 'Departemen yang sudah lolos Checker tidak dapat dihapus';
    END IF;
    SELECT status INTO v_status FROM documents WHERE id = OLD.document_id;
    IF v_status IN ('approved','rejected','canceled') THEN
      RAISE EXCEPTION 'Tidak dapat mengubah departemen pada dokumen yang sudah final';
    END IF;
    RETURN OLD;
  END IF;

  SELECT status INTO v_status FROM documents WHERE id = NEW.document_id;
  IF v_status IN ('approved','rejected','canceled') THEN
    RAISE EXCEPTION 'Tidak dapat mengubah departemen pada dokumen yang sudah final';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dd_guard_ins_del ON document_departments;
CREATE TRIGGER trg_dd_guard_ins_del
BEFORE INSERT OR DELETE ON document_departments
FOR EACH ROW EXECUTE FUNCTION trg_dd_guard();

DROP TRIGGER IF EXISTS trg_dd_guard_upd ON document_departments;
CREATE TRIGGER trg_dd_guard_upd
BEFORE UPDATE OF decision ON document_departments
FOR EACH ROW EXECUTE FUNCTION trg_dd_guard();

CREATE OR REPLACE FUNCTION trg_doc_terminal() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Izinkan soft delete hanya jika masih draft
  IF OLD.status IN ('approved','rejected','canceled') THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Dokumen berstatus % tidak dapat diubah statusnya', OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_doc_terminal_guard ON documents;
CREATE TRIGGER trg_doc_terminal_guard
BEFORE UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION trg_doc_terminal();

-- ---------- AGGREGATION EVALUATION (OPSI A) ---------------------------
CREATE OR REPLACE FUNCTION fn_evaluate_document(p_document_id BIGINT)
RETURNS document_status_t LANGUAGE plpgsql AS $$
DECLARE
  v_status   document_status_t;
  v_total    INT;
  v_waiting  INT;
  v_rejected INT;
  v_event    notif_event_t;
BEGIN
  SELECT status INTO v_status FROM documents WHERE id = p_document_id FOR UPDATE;
  IF v_status <> 'pending' THEN
    RETURN v_status;
  END IF;

  SELECT COUNT(*),
         COUNT(*) FILTER (WHERE decision IS NULL),
         COUNT(*) FILTER (WHERE decision = 'rejected')
  INTO v_total, v_waiting, v_rejected
  FROM document_departments
  WHERE document_id = p_document_id;

  IF v_total = 0 OR v_waiting > 0 THEN
    RETURN 'pending';
  END IF;

  IF v_rejected > 0 THEN
    v_status := 'rejected';
    v_event  := 'final_rejected';
  ELSE
    v_status := 'approved';
    v_event  := 'final_approved';
  END IF;

  UPDATE documents
  SET status = v_status, decided_at = now(), version = version + 1, updated_at = now()
  WHERE id = p_document_id;

  INSERT INTO approval_logs (document_id, actor_id, action, from_status, to_status, note)
  VALUES (p_document_id, NULL, 'aggregate', 'pending', v_status, 'Semua departemen telah memutuskan');

  -- Notifikasi ke Applicant + semua Dept Manager terkait (Checker TIDAK diberi tahu)
  INSERT INTO notifications (recipient_id, document_id, event_type)
  SELECT r, p_document_id, v_event::notif_event_t FROM (
    SELECT applicant_id AS r FROM documents WHERE id = p_document_id
    UNION
    SELECT dep.manager_id FROM document_departments dd
    JOIN departments dep ON dep.id = dd.department_id
    WHERE dd.document_id = p_document_id AND dep.manager_id IS NOT NULL
  ) x;

  RETURN v_status;
END $$;

-- ---------- APPLICANT ACTIONS ----------------------------------------
CREATE OR REPLACE FUNCTION sp_submit_document(p_document_id BIGINT, p_actor_id BIGINT)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  d documents%ROWTYPE;
  v_checker BIGINT;
BEGIN
  SELECT * INTO d FROM documents WHERE id = p_document_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dokumen tidak ditemukan';
  END IF;
  IF d.applicant_id <> p_actor_id THEN
    RAISE EXCEPTION 'Hanya Applicant pemilik yang boleh submit';
  END IF;
  IF d.status <> 'draft' OR d.review_stage <> 'applicant' THEN
    RAISE EXCEPTION 'Dokumen tidak berada pada tahap draft-applicant';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM document_departments WHERE document_id = d.id) THEN
    RAISE EXCEPTION 'Minimal satu intended department diperlukan';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM document_versions WHERE document_id = d.id) THEN
    RAISE EXCEPTION 'Dokumen belum memiliki file';
  END IF;

  -- Validasi Applicant bukan manager departemen tujuan (konflik kepentingan self-approval)
  IF EXISTS (
    SELECT 1 FROM document_departments dd
    JOIN departments dep ON dep.id = dd.department_id
    WHERE dd.document_id = d.id AND dep.manager_id = p_actor_id
  ) THEN
    RAISE EXCEPTION 'Pembuat dokumen tidak boleh menjadi manajer departemen tujuan dokumen';
  END IF;

  -- Validasi Checker langsung aktif
  SELECT manager_id INTO v_checker FROM users WHERE id = d.applicant_id AND is_active = TRUE;
  IF v_checker IS NULL THEN
    RAISE EXCEPTION 'Applicant tidak memiliki atasan langsung aktif';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = v_checker AND is_active = TRUE) THEN
    RAISE EXCEPTION 'Atasan langsung tidak aktif';
  END IF;

  UPDATE documents
  SET review_stage = 'checker', checker_id = v_checker,
      submitted_at = now(), version = version + 1, updated_at = now()
  WHERE id = d.id;

  INSERT INTO approval_logs (document_id, actor_id, action, from_status, to_status)
  VALUES (d.id, p_actor_id, 'submit', 'draft', 'draft');

  INSERT INTO notifications (recipient_id, document_id, event_type)
  VALUES (v_checker, d.id, 'submitted');
END $$;

CREATE OR REPLACE FUNCTION sp_delete_document(p_document_id BIGINT, p_actor_id BIGINT)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE d documents%ROWTYPE;
BEGIN
  SELECT * INTO d FROM documents WHERE id = p_document_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dokumen tidak ditemukan';
  END IF;
  IF d.applicant_id <> p_actor_id THEN
    RAISE EXCEPTION 'Hanya Applicant pemilik yang boleh menghapus';
  END IF;
  IF d.status <> 'draft' THEN
    RAISE EXCEPTION 'Hanya dokumen draft yang dapat dihapus';
  END IF;

  UPDATE documents
  SET deleted_at = now(), version = version + 1, updated_at = now()
  WHERE id = d.id;

  INSERT INTO approval_logs (document_id, actor_id, action, from_status, to_status)
  VALUES (d.id, p_actor_id, 'delete', 'draft', 'draft');

  IF d.submitted_at IS NOT NULL THEN
    -- Dokumen pernah masuk ke Checker, kirim notifikasi
    INSERT INTO notifications (recipient_id, document_id, event_type)
    VALUES (d.checker_id, d.id, 'draft_deleted');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION sp_cancel_document(p_document_id BIGINT, p_actor_id BIGINT)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE d documents%ROWTYPE;
BEGIN
  SELECT * INTO d FROM documents WHERE id = p_document_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dokumen tidak ditemukan';
  END IF;
  IF d.applicant_id <> p_actor_id THEN
    RAISE EXCEPTION 'Hanya Applicant pemilik yang boleh cancel';
  END IF;
  IF d.status <> 'pending' THEN
    RAISE EXCEPTION 'Cancel hanya untuk dokumen pending';
  END IF;

  UPDATE documents
  SET status = 'canceled', decided_at = now(), version = version + 1, updated_at = now()
  WHERE id = d.id;

  INSERT INTO approval_logs (document_id, actor_id, action, from_status, to_status)
  VALUES (d.id, p_actor_id, 'cancel', 'pending', 'canceled');

  INSERT INTO notifications (recipient_id, document_id, event_type)
  SELECT r, d.id, 'canceled'::notif_event_t FROM (
    SELECT d.checker_id AS r
    UNION
    SELECT dep.manager_id FROM document_departments dd
    JOIN departments dep ON dep.id = dd.department_id
    WHERE dd.document_id = d.id AND dep.manager_id IS NOT NULL
  ) x;
END $$;

-- ---------- CHECKER ACTIONS ------------------------------------------
CREATE OR REPLACE FUNCTION sp_checker_decide(
  p_document_id BIGINT,
  p_actor_id    BIGINT,
  p_action      TEXT,
  p_note        TEXT DEFAULT NULL
)
RETURNS document_status_t LANGUAGE plpgsql AS $$
DECLARE d documents%ROWTYPE;
BEGIN
  SELECT * INTO d FROM documents WHERE id = p_document_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dokumen tidak ditemukan atau sudah dihapus';
  END IF;
  IF d.checker_id IS DISTINCT FROM p_actor_id THEN
    RAISE EXCEPTION 'Bukan Checker dokumen ini';
  END IF;
  IF d.status <> 'draft' OR d.review_stage <> 'checker' THEN
    RAISE EXCEPTION 'Dokumen tidak sedang menunggu pemeriksaan Checker';
  END IF;

  IF p_action = 'approve' THEN
    -- Pastikan semua departemen tujuan memiliki manager yang aktif
    IF EXISTS (
      SELECT 1 FROM document_departments dd
      JOIN departments dep ON dep.id = dd.department_id
      LEFT JOIN users u ON u.id = dep.manager_id
      WHERE dd.document_id = d.id AND (dep.manager_id IS NULL OR u.id IS NULL OR NOT u.is_active)
    ) THEN
      RAISE EXCEPTION 'Ada departemen tujuan tanpa manager aktif';
    END IF;

    UPDATE document_departments
    SET passed_checker = TRUE
    WHERE document_id = d.id;

    UPDATE responses
    SET visible_to_dept = TRUE
    WHERE document_id = d.id AND author_role = 'checker' AND type = 'comment';

    UPDATE documents
    SET status = 'pending', review_stage = NULL, forwarded_at = now(),
        version = version + 1, updated_at = now()
    WHERE id = d.id;

    INSERT INTO approval_logs (document_id, actor_id, action, from_status, to_status)
    VALUES (d.id, p_actor_id, 'checker_approve', 'draft', 'pending');

    INSERT INTO notifications (recipient_id, document_id, event_type)
    SELECT DISTINCT dep.manager_id, d.id, 'forwarded'::notif_event_t
    FROM document_departments dd
    JOIN departments dep ON dep.id = dd.department_id
    WHERE dd.document_id = d.id AND dep.manager_id IS NOT NULL;

    RETURN 'pending';

  ELSIF p_action = 'reject' THEN
    UPDATE documents
    SET status = 'rejected', review_stage = NULL, decided_at = now(),
        version = version + 1, updated_at = now()
    WHERE id = d.id;

    INSERT INTO approval_logs (document_id, actor_id, action, from_status, to_status, note)
    VALUES (d.id, p_actor_id, 'checker_reject', 'draft', 'rejected', p_note);

    INSERT INTO notifications (recipient_id, document_id, event_type)
    VALUES (d.applicant_id, d.id, 'checker_rejected');

    RETURN 'rejected';

  ELSIF p_action = 'revision' THEN
    IF p_note IS NULL OR length(trim(p_note)) = 0 THEN
      RAISE EXCEPTION 'Catatan revisi wajib diisi';
    END IF;

    INSERT INTO responses (document_id, author_id, author_role, type, body, visible_to_dept)
    VALUES (d.id, p_actor_id, 'checker', 'revision_request', p_note, FALSE);

    UPDATE documents
    SET review_stage = 'applicant', version = version + 1, updated_at = now()
    WHERE id = d.id;

    INSERT INTO approval_logs (document_id, actor_id, action, from_status, to_status, note)
    VALUES (d.id, p_actor_id, 'request_revision', 'draft', 'draft', p_note);

    INSERT INTO notifications (recipient_id, document_id, event_type)
    VALUES (d.applicant_id, d.id, 'revision_requested');

    RETURN 'draft';
  END IF;

  RAISE EXCEPTION 'Aksi Checker tidak dikenal: %', p_action;
END $$;

CREATE OR REPLACE FUNCTION sp_checker_comment(
  p_document_id BIGINT,
  p_actor_id    BIGINT,
  p_body        TEXT
)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE d documents%ROWTYPE;
BEGIN
  IF p_body IS NULL OR length(trim(p_body)) = 0 THEN
    RAISE EXCEPTION 'Komentar tidak boleh kosong';
  END IF;

  SELECT * INTO d FROM documents WHERE id = p_document_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND OR d.checker_id IS DISTINCT FROM p_actor_id
     OR d.status <> 'draft' OR d.review_stage <> 'checker' THEN
    RAISE EXCEPTION 'Komentar Checker hanya pada tahap pemeriksaan';
  END IF;

  INSERT INTO responses (document_id, author_id, author_role, type, body, visible_to_dept)
  VALUES (d.id, p_actor_id, 'checker', 'comment', p_body, FALSE);

  INSERT INTO notifications (recipient_id, document_id, event_type)
  VALUES (d.applicant_id, d.id, 'checker_comment');
END $$;

-- ---------- DEPT MANAGER ACTIONS -------------------------------------
CREATE OR REPLACE FUNCTION sp_set_department_decision(
  p_document_id   BIGINT,
  p_department_id BIGINT,
  p_actor_id      BIGINT,
  p_decision      dept_decision_t
)
RETURNS document_status_t LANGUAGE plpgsql AS $$
DECLARE
  v_status document_status_t;
  v_old    dept_decision_t;
BEGIN
  SELECT status INTO v_status FROM documents
  WHERE id = p_document_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND OR v_status <> 'pending' THEN
    RAISE EXCEPTION 'Dokumen tidak berstatus pending';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM departments WHERE id = p_department_id AND manager_id = p_actor_id) THEN
    RAISE EXCEPTION 'Bukan manager departemen ini';
  END IF;

  SELECT decision INTO v_old FROM document_departments
  WHERE document_id = p_document_id AND department_id = p_department_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Departemen bukan tujuan dokumen ini';
  END IF;

  UPDATE document_departments
  SET decision = p_decision, decided_by = p_actor_id, decided_at = now()
  WHERE document_id = p_document_id AND department_id = p_department_id;

  INSERT INTO decision_history (document_id, department_id, old_decision, new_decision, actor_id)
  VALUES (p_document_id, p_department_id, v_old, p_decision, p_actor_id);

  -- Mutasi memperbarui version dokumen
  UPDATE documents SET version = version + 1, updated_at = now() WHERE id = p_document_id;

  -- Tanpa notifikasi (keputusan sementara); evaluasi agregasi dalam transaksi yang sama
  RETURN fn_evaluate_document(p_document_id);
END $$;

CREATE OR REPLACE FUNCTION sp_add_department(
  p_document_id   BIGINT,
  p_department_id BIGINT,
  p_actor_id      BIGINT
)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_status document_status_t;
  v_mgr    BIGINT;
BEGIN
  SELECT status INTO v_status FROM documents
  WHERE id = p_document_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND OR v_status <> 'pending' THEN
    RAISE EXCEPTION 'Dokumen tidak berstatus pending';
  END IF;

  -- HANYA Checker atau Manajer dari Assistant yang mengajukan dokumen
  IF NOT EXISTS (
    SELECT 1 FROM documents d2
    JOIN users app ON app.id = d2.applicant_id
    LEFT JOIN departments adep ON adep.id = app.department_id
    WHERE d2.id = p_document_id AND (
      d2.checker_id = p_actor_id OR
      app.manager_id = p_actor_id OR
      adep.manager_id = p_actor_id
    )
  ) THEN
    RAISE EXCEPTION 'Hanya Checker atau Manager dari pembuat dokumen yang boleh menambah departemen';
  END IF;

  SELECT manager_id INTO v_mgr FROM departments WHERE id = p_department_id AND is_active = TRUE;
  IF v_mgr IS NULL THEN
    RAISE EXCEPTION 'Departemen tanpa manager aktif';
  END IF;

  INSERT INTO document_departments (document_id, department_id, passed_checker, added_by)
  VALUES (p_document_id, p_department_id, TRUE, p_actor_id);

  UPDATE documents SET version = version + 1, updated_at = now() WHERE id = p_document_id;

  INSERT INTO approval_logs (document_id, actor_id, action, from_status, to_status)
  VALUES (p_document_id, p_actor_id, 'add_department', 'pending', 'pending');

  INSERT INTO notifications (recipient_id, document_id, event_type)
  VALUES (v_mgr, p_document_id, 'dept_added');

  -- Evaluasi agregasi
  PERFORM fn_evaluate_document(p_document_id);
END $$;

CREATE OR REPLACE FUNCTION sp_dept_response(
  p_document_id   BIGINT,
  p_department_id BIGINT,
  p_actor_id      BIGINT,
  p_body          TEXT
)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_status document_status_t;
  v_app    BIGINT;
BEGIN
  IF p_body IS NULL OR length(trim(p_body)) = 0 THEN
    RAISE EXCEPTION 'Isi response tidak boleh kosong';
  END IF;

  SELECT status, applicant_id INTO v_status, v_app FROM documents
  WHERE id = p_document_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND OR v_status <> 'pending' THEN
    RAISE EXCEPTION 'Dokumen tidak berstatus pending';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM departments WHERE id = p_department_id AND manager_id = p_actor_id) THEN
    RAISE EXCEPTION 'Bukan manager departemen ini';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM document_departments
    WHERE document_id = p_document_id AND department_id = p_department_id
  ) THEN
    RAISE EXCEPTION 'Departemen bukan tujuan dokumen ini';
  END IF;

  INSERT INTO responses (
    document_id, author_id, author_role, department_id, type, body, visible_to_dept
  )
  VALUES (
    p_document_id, p_actor_id, 'dept_manager', p_department_id, 'comment', p_body, TRUE
  );

  -- Notifikasi ke Applicant dan semua manager dept lain (bukan pengirim)
  INSERT INTO notifications (recipient_id, document_id, event_type)
  SELECT r, p_document_id, 'dept_response'::notif_event_t FROM (
    SELECT v_app AS r
    UNION
    SELECT dep.manager_id FROM document_departments dd
    JOIN departments dep ON dep.id = dd.department_id
    WHERE dd.document_id = p_document_id AND dep.manager_id IS NOT NULL AND dep.manager_id <> p_actor_id
  ) x;
END $$;

-- ---------- AUTHENTICATION PROCEDURES --------------------------------
CREATE OR REPLACE FUNCTION sp_register_login_attempt(
  p_username TEXT,
  p_success  BOOLEAN,
  p_ip       INET DEFAULT NULL,
  p_ua       TEXT DEFAULT NULL
)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  u       users%ROWTYPE;
  v_count INT;
BEGIN
  SELECT * INTO u FROM users WHERE lower(username) = lower(p_username) FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO login_attempts (username_input, user_id, success, failure_reason, ip_address, user_agent)
    VALUES (left(p_username, 100), NULL, FALSE, 'unknown_user', p_ip, left(p_ua, 300));
    RETURN 'failed';
  END IF;

  IF NOT u.is_active THEN
    INSERT INTO login_attempts (username_input, user_id, success, failure_reason, ip_address, user_agent)
    VALUES (left(p_username, 100), u.id, FALSE, 'inactive', p_ip, left(p_ua, 300));
    RETURN 'inactive';
  END IF;

  IF u.locked_until IS NOT NULL AND u.locked_until > now() THEN
    INSERT INTO login_attempts (username_input, user_id, success, failure_reason, ip_address, user_agent)
    VALUES (left(p_username, 100), u.id, FALSE, 'locked', p_ip, left(p_ua, 300));
    RETURN 'locked';
  END IF;

  IF p_success THEN
    UPDATE users
    SET failed_login_count = 0, locked_until = NULL, last_login_at = now()
    WHERE id = u.id;

    INSERT INTO login_attempts (username_input, user_id, success, ip_address, user_agent)
    VALUES (left(p_username, 100), u.id, TRUE, p_ip, left(p_ua, 300));

    RETURN 'ok';
  END IF;

  v_count := u.failed_login_count + 1;
  UPDATE users
  SET failed_login_count = v_count,
      locked_until = CASE WHEN v_count >= 5 THEN now() + interval '15 minutes' END
  WHERE id = u.id;

  INSERT INTO login_attempts (username_input, user_id, success, failure_reason, ip_address, user_agent)
  VALUES (left(p_username, 100), u.id, FALSE, 'wrong_password', p_ip, left(p_ua, 300));

  RETURN CASE WHEN v_count >= 5 THEN 'locked' ELSE 'failed' END;
END $$;

CREATE OR REPLACE FUNCTION sp_create_session(
  p_user_id            BIGINT,
  p_refresh_token_hash TEXT,
  p_ttl                INTERVAL DEFAULT interval '8 hours',
  p_ip                 INET DEFAULT NULL,
  p_ua                 TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND is_active = TRUE) THEN
    RAISE EXCEPTION 'Pengguna tidak aktif';
  END IF;

  INSERT INTO user_sessions (user_id, refresh_token_hash, expires_at, ip_address, user_agent)
  VALUES (p_user_id, p_refresh_token_hash, now() + p_ttl, p_ip, left(p_ua, 300))
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;

-- Validasi lifecycle sesi UUID (SRS backwards compatibility)
CREATE OR REPLACE FUNCTION fn_validate_session(
  p_session_id UUID,
  p_idle       INTERVAL DEFAULT interval '30 minutes'
)
RETURNS BIGINT LANGUAGE plpgsql AS $$
DECLARE s user_sessions%ROWTYPE;
BEGIN
  SELECT * INTO s FROM user_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND OR s.revoked_at IS NOT NULL OR s.expires_at <= now()
     OR s.last_seen_at + p_idle <= now() THEN
    RETURN NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = s.user_id AND is_active = TRUE) THEN
    RETURN NULL;
  END IF;

  UPDATE user_sessions SET last_seen_at = now() WHERE id = s.id;
  RETURN s.user_id;
END $$;

-- Validasi sesi server-side dengan cryptographic token hash (mencegah IDOR)
CREATE OR REPLACE FUNCTION fn_validate_session_by_token(
  p_token_hash TEXT,
  p_idle       INTERVAL DEFAULT interval '30 minutes'
)
RETURNS TABLE (
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

CREATE OR REPLACE FUNCTION sp_logout(p_session_id UUID) RETURNS VOID LANGUAGE sql AS $$
  UPDATE user_sessions SET revoked_at = now() WHERE id = p_session_id AND revoked_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION sp_logout_by_token(p_token_hash TEXT) RETURNS VOID LANGUAGE sql AS $$
  UPDATE user_sessions SET revoked_at = now() WHERE refresh_token_hash = p_token_hash AND revoked_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION sp_revoke_all_sessions(p_user_id BIGINT) RETURNS INT LANGUAGE plpgsql AS $$
DECLARE n INT;
BEGIN
  UPDATE user_sessions SET revoked_at = now() WHERE user_id = p_user_id AND revoked_at IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION sp_change_password(p_user_id BIGINT, p_new_hash TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE users
  SET password_hash = p_new_hash, must_change_password = FALSE,
      password_changed_at = now()
  WHERE id = p_user_id AND is_active = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pengguna tidak ditemukan atau tidak aktif';
  END IF;

  PERFORM sp_revoke_all_sessions(p_user_id);
END $$;

CREATE OR REPLACE FUNCTION sp_create_reset_token(
  p_user_id    BIGINT,
  p_token_hash TEXT,
  p_ttl        INTERVAL DEFAULT interval '30 minutes'
)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE password_reset_tokens SET used_at = now() WHERE user_id = p_user_id AND used_at IS NULL;
  INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
  VALUES (p_user_id, p_token_hash, now() + p_ttl);
END $$;

CREATE OR REPLACE FUNCTION sp_reset_password(p_token_hash TEXT, p_new_hash TEXT)
RETURNS BIGINT LANGUAGE plpgsql AS $$
DECLARE t password_reset_tokens%ROWTYPE;
BEGIN
  SELECT * INTO t FROM password_reset_tokens WHERE token_hash = p_token_hash FOR UPDATE;
  IF NOT FOUND OR t.used_at IS NOT NULL OR t.expires_at <= now() THEN
    RAISE EXCEPTION 'Token reset tidak valid atau sudah kedaluwarsa';
  END IF;

  UPDATE password_reset_tokens SET used_at = now() WHERE id = t.id;

  UPDATE users
  SET password_hash = p_new_hash, must_change_password = FALSE,
      password_changed_at = now(), failed_login_count = 0, locked_until = NULL
  WHERE id = t.user_id;

  PERFORM sp_revoke_all_sessions(t.user_id);
  RETURN t.user_id;
END $$;

-- ---------- DASHBOARD VIEW --------------------------------------------
CREATE OR REPLACE VIEW v_pending_documents AS
SELECT
  d.id,
  d.document_number,
  d.title,
  d.applicant_id,
  d.forwarded_at,
  now() - d.forwarded_at AS pending_age,
  COUNT(dd.id) AS total_dept,
  COUNT(dd.id) FILTER (WHERE dd.decision IS NULL) AS waiting_dept
FROM documents d
JOIN document_departments dd ON dd.document_id = d.id
WHERE d.status = 'pending' AND d.deleted_at IS NULL
GROUP BY d.id, d.document_number, d.title, d.applicant_id, d.forwarded_at
ORDER BY d.forwarded_at;

COMMIT;
