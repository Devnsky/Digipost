import { withTransaction } from "../../db";
import { AuthUser } from "../../middleware/auth";

export async function checkerDecide(
  documentId: number,
  user: AuthUser,
  action: "approve" | "reject" | "revision",
  note?: string,
  expectedVersion?: number,
) {
  return await withTransaction(async (client) => {
    const docCheck = await client.query(
      `SELECT * FROM documents WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [documentId],
    );

    if (docCheck.rowCount === 0) {
      const error = new Error("Dokumen tidak ditemukan.");
      (error as any).status = 404;
      throw error;
    }

    const doc = docCheck.rows[0];
    if (
      expectedVersion !== undefined &&
      Number(doc.version) !== expectedVersion
    ) {
      const error = new Error("Dokumen telah dimodifikasi oleh aksi lain.");
      (error as any).code = "VERSION_CONFLICT";
      (error as any).status = 409;
      throw error;
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
    const error = new Error("Komentar tidak boleh kosong.");
    (error as any).status = 400;
    throw error;
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
    const docCheck = await client.query(
      `SELECT * FROM documents WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [documentId],
    );

    if (docCheck.rowCount === 0) {
      const error = new Error("Dokumen tidak ditemukan.");
      (error as any).status = 404;
      throw error;
    }

    const doc = docCheck.rows[0];
    if (
      expectedVersion !== undefined &&
      Number(doc.version) !== expectedVersion
    ) {
      const error = new Error("Dokumen telah dimodifikasi oleh aksi lain.");
      (error as any).code = "VERSION_CONFLICT";
      (error as any).status = 409;
      throw error;
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
      `SELECT d.*, app.department_id as applicant_department_id
       FROM documents d
       JOIN users app ON app.id = d.applicant_id
       WHERE d.id = $1 AND d.deleted_at IS NULL FOR UPDATE`,
      [documentId],
    );

    if (docCheck.rowCount === 0) {
      const error = new Error("Dokumen tidak ditemukan.");
      (error as any).status = 404;
      throw error;
    }

    const doc = docCheck.rows[0];

    // Authorization: Hanya Manager / Checker dari departemen pemilik dokumen yang berhak menambah departemen tujuan
    const isOwnerDeptManager =
      (user.role === "dept_manager" || Number(doc.checker_id) === user.id) &&
      Number(user.department_id) === Number(doc.applicant_department_id);

    if (!isOwnerDeptManager) {
      const error = new Error(
        "Akses ditolak. Hanya Manajer dari departemen pemilik dokumen yang dapat menambahkan departemen tujuan.",
      );
      (error as any).status = 403;
      throw error;
    }

    if (doc.status !== "pending") {
      const error = new Error("Dokumen tidak berstatus pending.");
      (error as any).status = 400;
      throw error;
    }

    if (
      expectedVersion !== undefined &&
      Number(doc.version) !== expectedVersion
    ) {
      const error = new Error("Dokumen telah dimodifikasi oleh aksi lain.");
      (error as any).code = "VERSION_CONFLICT";
      (error as any).status = 409;
      throw error;
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
    const error = new Error("Isi respon tidak boleh kosong.");
    (error as any).status = 400;
    throw error;
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
