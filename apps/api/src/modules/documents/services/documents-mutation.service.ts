import fs from "fs";
import path from "path";
import crypto from "crypto";
import { withTransaction } from "../../../db";
import { config } from "../../../config";
import { AuthUser } from "../../../middleware/auth";

export async function createDocument(
  user: AuthUser,
  title: string,
  description: string,
  departmentIds: number[],
  file: Express.Multer.File,
) {
  if (user.role !== "assistant") {
    const error = new Error(
      "Akses ditolak. Fitur membuat dan mengajukan dokumen hanya tersedia untuk peran Assistant.",
    );
    (error as any).status = 403;
    throw error;
  }
  let savedFilePath: string | null = null;
  try {
    return await withTransaction(async (client) => {
      // 1. Create document
      const docResult = await client.query(
        `
        INSERT INTO documents (title, description, applicant_id, status, review_stage, version)
        VALUES ($1, $2, $3, 'draft', 'applicant', 1)
        RETURNING id, document_number, version;
      `,
        [title.trim(), description?.trim() || null, user.id],
      );

      const docId = Number(docResult.rows[0].id);

      // 2. Save version file
      const checksum = crypto
        .createHash("sha256")
        .update(file.buffer)
        .digest("hex");
      const ext = path.extname(file.originalname) || ".bin";
      const storageFileName = `${crypto.randomUUID()}${ext}`;
      const storageFilePath = path.join(config.uploadDir, storageFileName);

      if (!fs.existsSync(config.uploadDir)) {
        fs.mkdirSync(config.uploadDir, { recursive: true });
      }
      fs.writeFileSync(storageFilePath, file.buffer);
      savedFilePath = storageFilePath;

      await client.query(
        `
        INSERT INTO document_versions (
          document_id, version_no, file_name, file_path, mime_type, file_size, checksum, uploaded_by
        )
        VALUES ($1, 1, $2, $3, $4, $5, $6, $7);
      `,
        [
          docId,
          file.originalname,
          storageFilePath,
          file.mimetype,
          file.size,
          checksum,
          user.id,
        ],
      );

      // 3. Add initial departments in a single batch query
      if (departmentIds.length > 0) {
        const valuePlaceholders = departmentIds
          .map((_, idx) => `($1, $${idx + 2}, $${departmentIds.length + 2})`)
          .join(", ");
        await client.query(
          `INSERT INTO document_departments (document_id, department_id, added_by) VALUES ${valuePlaceholders}`,
          [docId, ...departmentIds, user.id],
        );
      }

      // 4. Log creation
      await client.query(
        `
        INSERT INTO approval_logs (document_id, actor_id, action, from_status, to_status, note)
        VALUES ($1, $2, 'create', NULL, 'draft', 'Dokumen dibuat');
      `,
        [docId, user.id],
      );

      return {
        id: docId,
        document_number: docResult.rows[0].document_number,
        version: Number(docResult.rows[0].version),
      };
    });
  } catch (err) {
    if (savedFilePath && fs.existsSync(savedFilePath)) {
      try {
        fs.unlinkSync(savedFilePath);
      } catch (unlinkErr) {
        console.error(
          "[Cleanup Error] Failed to delete orphaned file:",
          unlinkErr,
        );
      }
    }
    throw err;
  }
}

export async function updateDocument(
  documentId: number,
  user: AuthUser,
  title: string,
  description: string,
  expectedVersion?: number,
) {
  if (user.role !== "assistant") {
    const error = new Error(
      "Akses ditolak. Fitur ini hanya tersedia untuk peran Assistant.",
    );
    (error as any).status = 403;
    throw error;
  }
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
    if (Number(doc.applicant_id) !== user.id) {
      const error = new Error("Hanya pembuat dokumen yang dapat mengedit.");
      (error as any).status = 403;
      throw error;
    }

    if (doc.status !== "draft" || doc.review_stage !== "applicant") {
      const error = new Error(
        "Dokumen hanya dapat diedit pada tahap draft-applicant.",
      );
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

    await client.query(
      `
      UPDATE documents
      SET title = $1, description = $2, version = version + 1, updated_at = now()
      WHERE id = $3;
    `,
      [title.trim(), description?.trim() || null, documentId],
    );

    return { message: "Dokumen berhasil diperbarui" };
  });
}

export async function addDepartmentDraft(
  documentId: number,
  departmentId: number,
  user: AuthUser,
  expectedVersion?: number,
) {
  if (user.role !== "assistant") {
    const error = new Error(
      "Akses ditolak. Fitur ini hanya tersedia untuk peran Assistant.",
    );
    (error as any).status = 403;
    throw error;
  }
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
    if (Number(doc.applicant_id) !== user.id) {
      const error = new Error(
        "Hanya pembuat dokumen yang dapat menambah departemen.",
      );
      (error as any).status = 403;
      throw error;
    }

    if (doc.status !== "draft" || doc.review_stage !== "applicant") {
      const error = new Error(
        "Penambahan departemen oleh Applicant hanya boleh saat draft-applicant.",
      );
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

    await client.query(
      `
      INSERT INTO document_departments (document_id, department_id, added_by)
      VALUES ($1, $2, $3)
      ON CONFLICT DO NOTHING;
    `,
      [documentId, departmentId, user.id],
    );

    await client.query(
      `
      UPDATE documents SET version = version + 1, updated_at = now() WHERE id = $1;
    `,
      [documentId],
    );

    return { message: "Departemen berhasil ditambahkan" };
  });
}

export async function removeDepartmentDraft(
  documentId: number,
  departmentId: number,
  user: AuthUser,
  expectedVersion?: number,
) {
  if (user.role !== "assistant") {
    const error = new Error(
      "Akses ditolak. Fitur ini hanya tersedia untuk peran Assistant.",
    );
    (error as any).status = 403;
    throw error;
  }
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
    if (Number(doc.applicant_id) !== user.id) {
      const error = new Error(
        "Hanya pembuat dokumen yang dapat menghapus departemen.",
      );
      (error as any).status = 403;
      throw error;
    }

    if (doc.status !== "draft" || doc.review_stage !== "applicant") {
      const error = new Error(
        "Penghapusan departemen hanya boleh saat draft-applicant.",
      );
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

    await client.query(
      `
      DELETE FROM document_departments
      WHERE document_id = $1 AND department_id = $2;
    `,
      [documentId, departmentId],
    );

    await client.query(
      `
      UPDATE documents SET version = version + 1, updated_at = now() WHERE id = $1;
    `,
      [documentId],
    );

    return { message: "Departemen berhasil dihapus" };
  });
}

export async function uploadNewVersion(
  documentId: number,
  user: AuthUser,
  file: Express.Multer.File,
  expectedVersion?: number,
) {
  if (user.role !== "assistant") {
    const error = new Error(
      "Akses ditolak. Fitur ini hanya tersedia untuk peran Assistant.",
    );
    (error as any).status = 403;
    throw error;
  }
  let savedFilePath: string | null = null;
  try {
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
      if (Number(doc.applicant_id) !== user.id) {
        const error = new Error(
          "Hanya pembuat dokumen yang dapat mengunggah versi baru.",
        );
        (error as any).status = 403;
        throw error;
      }

      if (doc.status !== "draft" || doc.review_stage !== "applicant") {
        const error = new Error(
          "Unggah file versi baru hanya boleh saat draft-applicant.",
        );
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

      // Get max version_no
      const maxVerRes = await client.query(
        `
        SELECT COALESCE(MAX(version_no), 0) as max_ver FROM document_versions WHERE document_id = $1
      `,
        [documentId],
      );
      const nextVersionNo = parseInt(maxVerRes.rows[0].max_ver, 10) + 1;

      const checksum = crypto
        .createHash("sha256")
        .update(file.buffer)
        .digest("hex");
      const ext = path.extname(file.originalname) || ".bin";
      const storageFileName = `${crypto.randomUUID()}${ext}`;
      const storageFilePath = path.join(config.uploadDir, storageFileName);

      if (!fs.existsSync(config.uploadDir)) {
        fs.mkdirSync(config.uploadDir, { recursive: true });
      }
      fs.writeFileSync(storageFilePath, file.buffer);
      savedFilePath = storageFilePath;

      await client.query(
        `
        INSERT INTO document_versions (
          document_id, version_no, file_name, file_path, mime_type, file_size, checksum, uploaded_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
      `,
        [
          documentId,
          nextVersionNo,
          file.originalname,
          storageFilePath,
          file.mimetype,
          file.size,
          checksum,
          user.id,
        ],
      );

      await client.query(
        `
        UPDATE documents SET version = version + 1, updated_at = now() WHERE id = $1;
      `,
        [documentId],
      );

      return { message: `Versi ${nextVersionNo} berhasil diunggah` };
    });
  } catch (err) {
    if (savedFilePath && fs.existsSync(savedFilePath)) {
      try {
        fs.unlinkSync(savedFilePath);
      } catch (unlinkErr) {
        console.error(
          "[Cleanup Error] Failed to delete orphaned file:",
          unlinkErr,
        );
      }
    }
    throw err;
  }
}

export async function submitDocument(
  documentId: number,
  user: AuthUser,
  expectedVersion?: number,
) {
  if (user.role !== "assistant") {
    const error = new Error(
      "Akses ditolak. Fitur ini hanya tersedia untuk peran Assistant.",
    );
    (error as any).status = 403;
    throw error;
  }
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

    // Call stored procedure
    await client.query(`SELECT sp_submit_document($1, $2)`, [
      documentId,
      user.id,
    ]);
    return {
      message: "Dokumen berhasil diajukan kepada atasan langsung (Checker)",
    };
  });
}

export async function deleteDocument(
  documentId: number,
  user: AuthUser,
  expectedVersion?: number,
) {
  if (user.role !== "assistant") {
    const error = new Error(
      "Akses ditolak. Fitur ini hanya tersedia untuk peran Assistant.",
    );
    (error as any).status = 403;
    throw error;
  }
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

    await client.query(`SELECT sp_delete_document($1, $2)`, [
      documentId,
      user.id,
    ]);
    return { message: "Dokumen draft berhasil dihapus" };
  });
}

export async function cancelDocument(
  documentId: number,
  user: AuthUser,
  expectedVersion?: number,
) {
  if (user.role !== "assistant") {
    const error = new Error(
      "Akses ditolak. Fitur ini hanya tersedia untuk peran Assistant.",
    );
    (error as any).status = 403;
    throw error;
  }
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

    await client.query(`SELECT sp_cancel_document($1, $2)`, [
      documentId,
      user.id,
    ]);
    return { message: "Dokumen berhasil dibatalkan (Canceled)" };
  });
}
