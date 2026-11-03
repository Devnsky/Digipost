import { query } from "../../../db";
import { AuthUser } from "../../../middleware/auth";

export interface DocumentFilterOptions {
  status?: string;
  search?: string;
  departmentId?: number;
  applicantDepartmentId?: number;
  dateFrom?: string;
  dateTo?: string;
  scope?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export async function listMyDocuments(
  user: AuthUser,
  options: DocumentFilterOptions,
) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, Math.min(100, options.limit || 10));
  const offset = (page - 1) * limit;

  const conditions: string[] = ["d.applicant_id = $1", "d.deleted_at IS NULL"];
  const params: any[] = [user.id];
  let paramIndex = 2;

  if (options.status && options.status !== "all") {
    conditions.push(`d.status = $${paramIndex}`);
    params.push(options.status);
    paramIndex++;
  }

  if (options.search) {
    conditions.push(
      `(d.document_number ILIKE $${paramIndex} OR d.title ILIKE $${paramIndex})`,
    );
    params.push(`%${options.search}%`);
    paramIndex++;
  }

  if (options.dateFrom) {
    conditions.push(`d.created_at >= $${paramIndex}`);
    params.push(options.dateFrom);
    paramIndex++;
  }

  if (options.dateTo) {
    conditions.push(`d.created_at <= $${paramIndex}`);
    params.push(options.dateTo);
    paramIndex++;
  }

  const whereClause = conditions.join(" AND ");

  const countQuery = `SELECT COUNT(*) FROM documents d WHERE ${whereClause}`;
  const countResult = await query(countQuery, params);
  const total = parseInt(countResult.rows[0].count, 10);

  const dataQuery = `
    SELECT
      d.id,
      d.document_number,
      d.title,
      d.description,
      d.status,
      d.review_stage,
      d.version,
      d.created_at,
      d.submitted_at,
      d.forwarded_at,
      d.decided_at,
      u.full_name as applicant_name,
      dep.name as applicant_department,
      chk.full_name as checker_name,
      (
        SELECT json_agg(json_build_object(
          'id', dep2.id,
          'code', dep2.code,
          'name', dep2.name,
          'decision', dd.decision,
          'passed_checker', dd.passed_checker
        ))
        FROM document_departments dd
        JOIN departments dep2 ON dep2.id = dd.department_id
        WHERE dd.document_id = d.id
      ) as departments
    FROM documents d
    JOIN users u ON u.id = d.applicant_id
    LEFT JOIN departments dep ON dep.id = u.department_id
    LEFT JOIN users chk ON chk.id = d.checker_id
    WHERE ${whereClause}
    ORDER BY d.created_at DESC, d.id DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  params.push(limit, offset);
  const dataResult = await query(dataQuery, params);

  return {
    items: dataResult.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function listCheckerQueue(
  user: AuthUser,
  options: DocumentFilterOptions,
) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, Math.min(100, options.limit || 10));
  const offset = (page - 1) * limit;

  const conditions: string[] = [
    "d.checker_id = $1",
    "d.status = 'draft'",
    "d.review_stage = 'checker'",
    "d.deleted_at IS NULL",
  ];
  const params: any[] = [user.id];
  let paramIndex = 2;

  if (options.search) {
    conditions.push(
      `(d.document_number ILIKE $${paramIndex} OR d.title ILIKE $${paramIndex})`,
    );
    params.push(`%${options.search}%`);
    paramIndex++;
  }

  const whereClause = conditions.join(" AND ");

  const countResult = await query(
    `SELECT COUNT(*) FROM documents d WHERE ${whereClause}`,
    params,
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const dataQuery = `
    SELECT
      d.id,
      d.document_number,
      d.title,
      d.description,
      d.status,
      d.review_stage,
      d.version,
      d.created_at,
      d.submitted_at,
      u.full_name as applicant_name,
      dep.name as applicant_department,
      (
        SELECT json_agg(json_build_object(
          'id', dep2.id,
          'code', dep2.code,
          'name', dep2.name
        ))
        FROM document_departments dd
        JOIN departments dep2 ON dep2.id = dd.department_id
        WHERE dd.document_id = d.id
      ) as departments
    FROM documents d
    JOIN users u ON u.id = d.applicant_id
    LEFT JOIN departments dep ON dep.id = u.department_id
    WHERE ${whereClause}
    ORDER BY d.submitted_at ASC, d.id ASC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  params.push(limit, offset);
  const dataResult = await query(dataQuery, params);

  return {
    items: dataResult.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function listDepartmentDocuments(
  user: AuthUser,
  options: DocumentFilterOptions,
) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, Math.min(100, options.limit || 10));
  const offset = (page - 1) * limit;

  const conditions: string[] = ["d.deleted_at IS NULL"];
  const params: any[] = [user.id];
  let paramIndex = 2;

  // Base scope authorization for Manager/Checker:
  // - Drafts: ONLY drafts awaiting user as checker (review_stage='checker' AND checker_id=user.id)
  // - Dept documents: documents forwarded to user's department (passed_checker=TRUE AND dep.manager_id=user.id)
  if (options.status === "draft") {
    conditions.push(
      `d.checker_id = $1 AND d.status = 'draft' AND d.review_stage = 'checker'`,
    );
  } else if (
    options.status &&
    ["pending", "approved", "rejected", "canceled"].includes(options.status)
  ) {
    conditions.push(`d.status = $${paramIndex}`);
    params.push(options.status);
    paramIndex++;
    conditions.push(
      `(
        d.checker_id = $1
        OR EXISTS (
          SELECT 1 FROM document_departments dd
          JOIN departments dep ON dep.id = dd.department_id
          WHERE dd.document_id = d.id
            AND dep.manager_id = $1
            AND dd.passed_checker = TRUE
        )
      )`,
    );
  } else {
    // All relevant documents for Manager (Checker queue + Dept Queue)
    conditions.push(
      `(
        (d.checker_id = $1 AND d.status = 'draft' AND d.review_stage = 'checker')
        OR
        (
          d.status IN ('pending', 'approved', 'rejected', 'canceled')
          AND (
            d.checker_id = $1
            OR EXISTS (
              SELECT 1 FROM document_departments dd
              JOIN departments dep ON dep.id = dd.department_id
              WHERE dd.document_id = d.id
                AND dep.manager_id = $1
                AND dd.passed_checker = TRUE
            )
          )
        )
      )`,
    );
  }

  // Filter: search by document number or title
  if (options.search) {
    conditions.push(
      `(d.document_number ILIKE $${paramIndex} OR d.title ILIKE $${paramIndex})`,
    );
    params.push(`%${options.search}%`);
    paramIndex++;
  }

  // Filter: date from
  if (options.dateFrom) {
    conditions.push(
      `DATE(COALESCE(d.submitted_at, d.created_at)) >= $${paramIndex}`,
    );
    params.push(options.dateFrom);
    paramIndex++;
  }

  // Filter: date to
  if (options.dateTo) {
    conditions.push(
      `DATE(COALESCE(d.submitted_at, d.created_at)) <= $${paramIndex}`,
    );
    params.push(options.dateTo);
    paramIndex++;
  }

  // Filter: applicant department id
  if (options.applicantDepartmentId) {
    conditions.push(`u.department_id = $${paramIndex}`);
    params.push(options.applicantDepartmentId);
    paramIndex++;
  }

  // Filter: explicit scope (checker vs department)
  if (options.scope === "checker") {
    conditions.push(
      `d.checker_id = $1 AND d.status = 'draft' AND d.review_stage = 'checker'`,
    );
  } else if (options.scope === "department") {
    conditions.push(
      `d.status IN ('pending', 'approved', 'rejected', 'canceled') AND (
        d.checker_id = $1
        OR EXISTS (
          SELECT 1 FROM document_departments dd
          JOIN departments dep ON dep.id = dd.department_id
          WHERE dd.document_id = d.id AND dep.manager_id = $1 AND dd.passed_checker = TRUE
        )
      )`,
    );
  }

  const whereClause = conditions.join(" AND ");

  const countResult = await query(
    `SELECT COUNT(*) FROM documents d
     JOIN users u ON u.id = d.applicant_id
     WHERE ${whereClause}`,
    params,
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const dataQuery = `
    SELECT
      d.id,
      d.document_number,
      d.title,
      d.description,
      d.status,
      d.review_stage,
      d.created_at,
      d.submitted_at,
      d.forwarded_at,
      d.decided_at,
      d.version,
      u.full_name as applicant_name,
      dep.name as applicant_department,
      dep.code as applicant_department_code,
      dep.id as applicant_department_id,
      (
        SELECT json_agg(json_build_object(
          'id', dep2.id,
          'code', dep2.code,
          'name', dep2.name,
          'decision', dd2.decision,
          'passed_checker', dd2.passed_checker
        ))
        FROM document_departments dd2
        JOIN departments dep2 ON dep2.id = dd2.department_id
        WHERE dd2.document_id = d.id
      ) as departments
    FROM documents d
    JOIN users u ON u.id = d.applicant_id
    LEFT JOIN departments dep ON dep.id = u.department_id
    WHERE ${whereClause}
    ORDER BY COALESCE(d.submitted_at, d.created_at) DESC, d.id DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  params.push(limit, offset);
  const dataResult = await query(dataQuery, params);

  return {
    items: dataResult.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getDocumentStats(user: AuthUser) {
  // My documents counts (for assistant)
  const myCountsResult = await query(
    `
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'draft') as draft,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'approved') as approved,
      COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
      COUNT(*) FILTER (WHERE status = 'canceled') as canceled
    FROM documents
    WHERE applicant_id = $1 AND deleted_at IS NULL
  `,
    [user.id],
  );

  // Checker queue count (drafts awaiting user as checker)
  const checkerCountResult = await query(
    `
    SELECT COUNT(*) as count
    FROM documents
    WHERE checker_id = $1 AND status = 'draft' AND review_stage = 'checker' AND deleted_at IS NULL
  `,
    [user.id],
  );

  // Dept documents counts (where user is checker OR dept manager, and passed_checker is true)
  const deptCountsResult = await query(
    `
    SELECT
      COUNT(DISTINCT d.id) as total,
      COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'pending') as pending,
      COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'approved') as approved,
      COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'rejected') as rejected,
      COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'canceled') as canceled
    FROM documents d
    LEFT JOIN document_departments dd ON dd.document_id = d.id AND dd.passed_checker = TRUE
    LEFT JOIN departments dep ON dep.id = dd.department_id AND dep.manager_id = $1
    WHERE (d.checker_id = $1 OR dep.manager_id = $1)
      AND d.status IN ('pending', 'approved', 'rejected', 'canceled')
      AND d.deleted_at IS NULL
  `,
    [user.id],
  );

  const checkerDraft = parseInt(checkerCountResult.rows[0].count, 10);
  const deptPending = parseInt(deptCountsResult.rows[0].pending || "0", 10);
  const deptApproved = parseInt(deptCountsResult.rows[0].approved || "0", 10);
  const deptRejected = parseInt(deptCountsResult.rows[0].rejected || "0", 10);
  const deptCanceled = parseInt(deptCountsResult.rows[0].canceled || "0", 10);
  const managerTotal =
    checkerDraft + deptPending + deptApproved + deptRejected + deptCanceled;

  return {
    myDocuments: myCountsResult.rows[0],
    checkerQueue: checkerDraft,
    deptDocuments: deptCountsResult.rows[0],
    managerStats: {
      total: managerTotal,
      draft: checkerDraft,
      pending: deptPending,
      approved: deptApproved,
      rejected: deptRejected,
      canceled: deptCanceled,
    },
    oldestPending: [],
  };
}

export async function getDocumentDetail(documentId: number, user: AuthUser) {
  // 1. Fetch document
  const docResult = await query(
    `
    SELECT
      d.*,
      app.department_id as applicant_department_id,
      app.full_name as applicant_name,
      app.email as applicant_email,
      app.employee_no as applicant_employee_no,
      app_dep.name as applicant_department_name,
      app_dep.code as applicant_department_code,
      chk.full_name as checker_name,
      chk.email as checker_email,
      chk_dep.name as checker_department_name
    FROM documents d
    JOIN users app ON app.id = d.applicant_id
    LEFT JOIN departments app_dep ON app_dep.id = app.department_id
    LEFT JOIN users chk ON chk.id = d.checker_id
    LEFT JOIN departments chk_dep ON chk_dep.id = chk.department_id
    WHERE d.id = $1 AND d.deleted_at IS NULL
  `,
    [documentId],
  );

  if (docResult.rowCount === 0) {
    const error = new Error("Dokumen tidak ditemukan atau sudah dihapus.");
    (error as any).status = 404;
    throw error;
  }

  const doc = docResult.rows[0];

  // 2. Fetch intended departments
  const deptsResult = await query(
    `
    SELECT
      dd.id as relation_id,
      dd.department_id,
      dep.code,
      dep.name,
      dep.manager_id,
      mgr.full_name as manager_name,
      dd.passed_checker,
      dd.decision,
      dd.decided_by,
      dec_user.full_name as decided_by_name,
      dd.decided_at,
      dd.added_by,
      add_user.full_name as added_by_name,
      dd.added_at
    FROM document_departments dd
    JOIN departments dep ON dep.id = dd.department_id
    LEFT JOIN users mgr ON mgr.id = dep.manager_id
    LEFT JOIN users dec_user ON dec_user.id = dd.decided_by
    LEFT JOIN users add_user ON add_user.id = dd.added_by
    WHERE dd.document_id = $1
    ORDER BY dd.id ASC
  `,
    [documentId],
  );

  const intendedDepartments = deptsResult.rows;

  // 3. Authorization check
  const isApplicant = Number(doc.applicant_id) === user.id;
  const isChecker = Number(doc.checker_id) === user.id;
  const isDeptManager = intendedDepartments.some(
    (d) => Number(d.manager_id) === user.id && d.passed_checker,
  );
  const isApplicantDeptManager =
    user.role === "dept_manager" &&
    Number(user.department_id) === Number(doc.applicant_department_id);

  // If document is in draft, only Applicant and Checker can see it
  if (doc.status === "draft") {
    if (!isApplicant && !isChecker) {
      const error = new Error(
        "Anda tidak memiliki hak akses untuk melihat dokumen ini.",
      );
      (error as any).status = 403;
      throw error;
    }
  } else {
    // If pending/approved/rejected/canceled: applicant, checker, target dept manager, or applicant's dept manager can see
    if (!isApplicant && !isChecker && !isDeptManager && !isApplicantDeptManager) {
      const error = new Error(
        "Anda tidak memiliki hak akses untuk melihat dokumen ini.",
      );
      (error as any).status = 403;
      throw error;
    }
  }

  // 4. Prepare parallel queries for versions, responses, decision history, and approval logs
  const versionsQuery = `
    SELECT
      v.id,
      v.version_no,
      v.file_name,
      v.mime_type,
      v.file_size,
      v.checksum,
      v.uploaded_at,
      u.full_name as uploaded_by_name
    FROM document_versions v
    JOIN users u ON u.id = v.uploaded_by
    WHERE v.document_id = $1
    ORDER BY v.version_no DESC
  `;

  let responsesQuery = `
    SELECT
      r.id,
      r.author_id,
      r.author_role,
      r.type,
      r.body,
      r.visible_to_dept,
      r.created_at,
      u.full_name as author_name,
      d.name as department_name
    FROM responses r
    JOIN users u ON u.id = r.author_id
    LEFT JOIN departments d ON d.id = r.department_id
    WHERE r.document_id = $1
  `;

  if (!isApplicant && !isChecker) {
    responsesQuery += " AND r.visible_to_dept = TRUE";
  }

  responsesQuery += " ORDER BY r.created_at ASC";

  const decisionHistoryQuery = `
    SELECT
      dh.id,
      dh.department_id,
      dep.name as department_name,
      dh.old_decision,
      dh.new_decision,
      dh.changed_at,
      u.full_name as actor_name
    FROM decision_history dh
    JOIN departments dep ON dep.id = dh.department_id
    JOIN users u ON u.id = dh.actor_id
    WHERE dh.document_id = $1
    ORDER BY dh.changed_at ASC
  `;

  const logsQuery = `
    SELECT
      al.id,
      al.action,
      al.from_status,
      al.to_status,
      al.note,
      al.created_at,
      u.full_name as actor_name
    FROM approval_logs al
    LEFT JOIN users u ON u.id = al.actor_id
    WHERE al.document_id = $1
    ORDER BY al.created_at ASC
  `;

  // Execute independent relational queries concurrently via Promise.all
  const [versionsResult, responsesResult, decisionHistoryResult, logsResult] =
    await Promise.all([
      query(versionsQuery, [documentId]),
      query(responsesQuery, [documentId]),
      query(decisionHistoryQuery, [documentId]),
      query(logsQuery, [documentId]),
    ]);

  // 8. Compute Allowed Actions
  const isAssistant = user.role === "assistant";
  const canEdit =
    isAssistant &&
    isApplicant &&
    doc.status === "draft" &&
    doc.review_stage === "applicant";
  const canSubmit =
    canEdit &&
    intendedDepartments.length >= 1 &&
    (versionsResult.rowCount || 0) > 0;
  const canDelete = isAssistant && isApplicant && doc.status === "draft";
  const canCancel = isAssistant && isApplicant && doc.status === "pending";
  const canCheckerDecide =
    isChecker && doc.status === "draft" && doc.review_stage === "checker";
  const userManagedDept = intendedDepartments.find(
    (d) => Number(d.manager_id) === user.id && d.passed_checker,
  );
  const canDeptDecide = doc.status === "pending" && !!userManagedDept;

  // Hanya Manager atau Checker dari departemen pemilik/pembuat dokumen yang boleh menambah departemen tujuan saat pending
  const isOwnerDeptManager =
    (user.role === "dept_manager" || isChecker) &&
    Number(user.department_id) === Number(doc.applicant_department_id);

  const canAddDept = doc.status === "pending" && isOwnerDeptManager;
  const canRespond =
    (doc.status === "pending" &&
      (isApplicant || isDeptManager || isOwnerDeptManager)) ||
    (doc.status === "draft" && doc.review_stage === "checker" && isChecker);
  const canPrint = ["pending", "approved", "rejected", "canceled"].includes(
    doc.status,
  );

  return {
    document: {
      ...doc,
      id: Number(doc.id),
      applicant_id: Number(doc.applicant_id),
      applicant_department_id: doc.applicant_department_id
        ? Number(doc.applicant_department_id)
        : null,
      checker_id: doc.checker_id ? Number(doc.checker_id) : null,
      version: Number(doc.version),
    },
    departments: intendedDepartments.map((d) => ({
      ...d,
      relation_id: Number(d.relation_id),
      department_id: Number(d.department_id),
      manager_id: Number(d.manager_id),
      decided_by: d.decided_by ? Number(d.decided_by) : null,
      added_by: d.added_by ? Number(d.added_by) : null,
    })),
    versions: versionsResult.rows,
    responses: responsesResult.rows,
    decisionHistory: decisionHistoryResult.rows,
    logs: logsResult.rows,
    allowedActions: {
      can_create: isAssistant,
      can_edit: canEdit,
      can_submit: canSubmit,
      can_delete: canDelete,
      can_cancel: canCancel,
      can_checker_decide: canCheckerDecide,
      can_dept_decide: canDeptDecide,
      managed_department_id: userManagedDept
        ? Number(userManagedDept.department_id)
        : null,
      can_add_dept: canAddDept,
      can_respond: canRespond,
      can_print: canPrint,
      is_checker_dept_conflict: isChecker && isDeptManager,
    },
  };
}