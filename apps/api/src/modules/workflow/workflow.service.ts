import { withTransaction } from "../../db";
import { AuthUser } from "../../middleware/auth";
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  VersionConflictError,
} from "../../middleware/errors";

export async function checkerDecide(
  documentId: number,
  user: AuthUser,
  action: "approve" | "reject" | "revision",
  note?: string,
  expectedVersion?: number,
) {
  return await withTransaction(async (client) => {
    if (expectedVersion !== undefined) {
      const docCheck = await client.query(
        `SELECT version FROM documents WHERE id = $1 AND deleted_at IS NULL`,
        [documentId],
      );

      if (docCheck.rowCount === 0) {
        throw new NotFoundError("Dokumen tidak ditemukan.");
      }

      if (Number(docCheck.rows[0].version) !== expectedVersion) {
        throw new VersionConflictError(
          "Dokumen telah dimodifikasi oleh aksi lain.",
        );
      }
    }

    const result = await client.query(
      `SELECT sp_checker_decide($1, $2, $3, $4) as result`,
      [documentId, user.id, action, note?.trim() || null],
    );

    const resultingStatus = result.rows[0].result;
    return {
      message:
        action === "approve"
          ? "Dokumen berhasil disetujui dan diteruskan ke seluruh departemen terkait."
          : action === "reject"
            ? "Dokumen berhasil ditolak (final)."
            : "Dokumen berhasil dikembalikan kepada pembuat dokumen untuk direvisi.",
      status: resultingStatus,
    };
  });
}

export async function checkerComment(
  documentId: number,
  user: AuthUser,
  body: string,
) {
  if (!body || body.trim().length === 0) {
    throw new BadRequestError("Komentar tidak boleh kosong.");
  }

  return await withTransaction(async (client) => {
    await client.query(`SELECT sp_checker_comment($1, $2, $3)`, [
      documentId,
      user.id,
      body.trim(),
    ]);
    return { message: "Komentar Checker berhasil ditambahkan" };
  });
}

export async function setDepartmentDecision(
  documentId: number,
  departmentId: number,
  user: AuthUser,
  decision: "approved" | "rejected",
  expectedVersion?: number,
) {
  return await withTransaction(async (client) => {
    if (expectedVersion !== undefined) {
      const docCheck = await client.query(
        `SELECT version FROM documents WHERE id = $1 AND deleted_at IS NULL`,
        [documentId],
      );

      if (docCheck.rowCount === 0) {
        throw new NotFoundError("Dokumen tidak ditemukan.");
      }

      if (Number(docCheck.rows[0].version) !== expectedVersion) {
        throw new VersionConflictError(
          "Dokumen telah dimodifikasi oleh aksi lain.",
        );
      }
    }

    const result = await client.query(
      `SELECT sp_set_department_decision($1, $2, $3, $4::dept_decision_t) as result`,
      [documentId, departmentId, user.id, decision],
    );

    const resultingStatus = result.rows[0].result;
    return {
      message: `Keputusan departemen berhasil disimpan (${decision}). Status dokumen: ${resultingStatus}`,
      status: resultingStatus,
    };
  });
}

export async function addDepartmentPending(
  documentId: number,
  departmentId: number,
  user: AuthUser,
  expectedVersion?: number,
) {
  return await withTransaction(async (client) => {
    const docCheck = await client.query(
      `SELECT
         d.checker_id,
         d.status,
         d.version,
         app.department_id as applicant_department_id,
         app.manager_id as applicant_manager_id,
         adep.manager_id as applicant_dept_manager_id
       FROM documents d
       JOIN users app ON app.id = d.applicant_id
       LEFT JOIN departments adep ON adep.id = app.department_id
       WHERE d.id = $1 AND d.deleted_at IS NULL`,
      [documentId],
    );

    if (docCheck.rowCount === 0) {
      throw new NotFoundError("Dokumen tidak ditemukan.");
    }

    const doc = docCheck.rows[0];

    // Authorization: HANYA Checker atau Manajer dari Assistant yang mengajukan dokumen
    const isApplicantDeptManager =
      (doc.applicant_dept_manager_id !== null &&
        Number(doc.applicant_dept_manager_id) === user.id) ||
      (doc.applicant_manager_id !== null &&
        Number(doc.applicant_manager_id) === user.id);
    const isAssignedChecker =
      doc.checker_id !== null && Number(doc.checker_id) === user.id;

    if (!isApplicantDeptManager && !isAssignedChecker) {
      throw new ForbiddenError(
        "Akses ditolak. Hanya Checker atau Manajer dari pembuat dokumen yang berwenang menambahkan departemen tujuan saat status pending.",
      );
    }

    if (doc.status !== "pending") {
      throw new BadRequestError("Dokumen tidak berstatus pending.");
    }

    if (
      expectedVersion !== undefined &&
      Number(doc.version) !== expectedVersion
    ) {
      throw new VersionConflictError(
        "Dokumen telah dimodifikasi oleh aksi lain.",
      );
    }

    await client.query(`SELECT sp_add_department($1, $2, $3)`, [
      documentId,
      departmentId,
      user.id,
    ]);

    return {
      message: "Departemen baru berhasil ditambahkan ke alur persetujuan",
    };
  });
}

export async function deptResponse(
  documentId: number,
  departmentId: number,
  user: AuthUser,
  body: string,
) {
  if (!body || body.trim().length === 0) {
    throw new BadRequestError("Isi respon tidak boleh kosong.");
  }

  return await withTransaction(async (client) => {
    await client.query(`SELECT sp_dept_response($1, $2, $3, $4)`, [
      documentId,
      departmentId,
      user.id,
      body.trim(),
    ]);
    return { message: "Respon departemen berhasil dikirim" };
  });
}
