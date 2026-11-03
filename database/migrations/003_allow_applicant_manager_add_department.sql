-- Migration 003: Allow Applicant's Department Manager or Assigned Checker to Add Target Departments
-- Extends sp_add_department authorization to allow the applicant's department manager or assigned checker in addition to existing target dept managers.

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

  -- Diizinkan: Dept Manager tujuan dokumen, Checker dokumen, ATAU Manager dari pembuat dokumen
  IF NOT EXISTS (
    SELECT 1 FROM document_departments dd
    JOIN departments dep ON dep.id = dd.department_id
    WHERE dd.document_id = p_document_id AND dep.manager_id = p_actor_id
  ) AND NOT EXISTS (
    SELECT 1 FROM documents d2
    JOIN users app ON app.id = d2.applicant_id
    LEFT JOIN departments adep ON adep.id = app.department_id
    WHERE d2.id = p_document_id AND (
      d2.checker_id = p_actor_id OR
      app.manager_id = p_actor_id OR
      adep.manager_id = p_actor_id
    )
  ) THEN
    RAISE EXCEPTION 'Hanya Dept Manager yang berwenang, Checker, atau Manager pemohon yang boleh menambah departemen';
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

