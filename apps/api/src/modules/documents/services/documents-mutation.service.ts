import fs from "fs";
import path from "path";
import crypto from "crypto";
import { withTransaction } from "../../../db";
import { config } from "../../../config";
import { AuthUser } from "../../../middleware/auth";
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  VersionConflictError,
} from "../../../middleware/errors";

export async function computeFileChecksum(
  file: Express.Multer.File,
): Promise<string> {
  if (file.buffer) {
    return crypto.createHash("sha256").update(file.buffer).digest("hex");
  }
  if (file.path && fs.existsSync(file.path)) {
    return new Promise<string>((resolve, reject) => {
      const hash = crypto.createHash("sha256");
      const stream = fs.createReadStream(file.path);
      stream.on("data", (chunk) => hash.update(chunk));
      stream.on("end", () => resolve(hash.digest("hex")));
      stream.on("error", reject);
    });
  }
  throw new Error("Konten berkas tidak tersedia");
}

export async function persistUploadedFile(
  file: Express.Multer.File,
  storageFilePath: string,
): Promise<void> {
  const dir = path.dirname(storageFilePath);
  if (!fs.existsSync(dir)) {
    await fs.promises.mkdir(dir, { recursive: true });
  }

  if (file.path && fs.existsSync(file.path)) {
    try {
      await fs.promises.rename(file.path, storageFilePath);
    } catch {
      await fs.promises.copyFile(file.path, storageFilePath);
      try {
        await fs.promises.unlink(file.path);
      } catch {
        // ignore unlink error
      }
    }
  } else if (file.buffer) {
    await fs.promises.writeFile(storageFilePath, file.buffer);
  }
}

export async function createDocument(
  user: AuthUser,
  title: string,
  description: string,
  departmentIds: number[],
  file: Express.Multer.File,
) {
  if (user.role !== "assistant") {
    throw new ForbiddenError(
      "Akses ditolak. Fitur membuat dan mengajukan dokumen hanya tersedia untuk peran Assistant.",
    );
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
      const checksum = await computeFileChecksum(file);
      const ext = path.extname(file.originalname) || ".bin";
      const storageFileName = `${crypto.randomUUID()}${ext}`;
      const storageFilePath = path.join(config.uploadDir, storageFileName);

      await persistUploadedFile(file, storageFilePath);
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
          storageFileName,
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
    if (savedFilePath) {
      try {
        await fs.promises.unlink(savedFilePath);
      } catch (unlinkErr) {
        console.error(
          "[Cleanup Error] Failed to delete orphaned file:",
          unlinkErr,
        );
      }
    }
    if (file.path) {
      try {
        await fs.promises.unlink(file.path);
      } catch {
        // ignore
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
    throw new ForbiddenError(
      "Akses ditolak. Fitur ini hanya tersedia untuk peran Assistant.",
    );
  }
  return await withTransaction(async (client) => {
    const docCheck = await client.query(
      `SELECT * FROM documents WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [documentId],
    );

    if (docCheck.rowCount === 0) {
      throw new NotFoundError("Dokumen tidak ditemukan.");
    }

    const doc = docCheck.rows[0];
    if (Number(doc.applicant_id) !== user.id) {
      throw new ForbiddenError("Hanya pembuat dokumen yang dapat mengedit.");
    }

    if (doc.status !== "draft" || doc.review_stage !== "applicant") {
      throw new BadRequestError(
        "Dokumen hanya dapat diedit pada tahap draft-applicant.",
      );
    }

    if (
      expectedVersion !== undefined &&
      Number(doc.version) !== expectedVersion
    ) {
      throw new VersionConflictError(
        "Dokumen telah dimodifikasi oleh aksi lain.",
      );
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
    throw new ForbiddenError(
      "Akses ditolak. Fitur ini hanya tersedia untuk peran Assistant.",
    );
  }
  return await withTransaction(async (client) => {
    const docCheck = await client.query(
      `SELECT * FROM documents WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [documentId],
    );

    if (docCheck.rowCount === 0) {
      throw new NotFoundError("Dokumen tidak ditemukan.");
    }

    const doc = docCheck.rows[0];
    if (Number(doc.applicant_id) !== user.id) {
      throw new ForbiddenError(
        "Hanya pembuat dokumen yang dapat menambah departemen.",
      );
    }

    if (doc.status !== "draft" || doc.review_stage !== "applicant") {
      throw new BadRequestError(
        "Penambahan departemen oleh Applicant hanya boleh saat draft-applicant.",
      );
    }

    if (
      expectedVersion !== undefined &&
      Number(doc.version) !== expectedVersion
    ) {
      throw new VersionConflictError(
        "Dokumen telah dimodifikasi oleh aksi lain.",
      );
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
    throw new ForbiddenError(
      "Akses ditolak. Fitur ini hanya tersedia untuk peran Assistant.",
    );
  }
  return await withTransaction(async (client) => {
    const docCheck = await client.query(
      `SELECT * FROM documents WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [documentId],
    );

    if (docCheck.rowCount === 0) {
      throw new NotFoundError("Dokumen tidak ditemukan.");
    }

    const doc = docCheck.rows[0];
    if (Number(doc.applicant_id) !== user.id) {
      throw new ForbiddenError(
        "Hanya pembuat dokumen yang dapat menghapus departemen.",
      );
    }

    if (doc.status !== "draft" || doc.review_stage !== "applicant") {
      throw new BadRequestError(
        "Penghapusan departemen hanya boleh saat draft-applicant.",
      );
    }

    if (
      expectedVersion !== undefined &&
      Number(doc.version) !== expectedVersion
    ) {
      throw new VersionConflictError(
        "Dokumen telah dimodifikasi oleh aksi lain.",
      );
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
    throw new ForbiddenError(
      "Akses ditolak. Fitur ini hanya tersedia untuk peran Assistant.",
    );
  }
  let savedFilePath: string | null = null;
  try {
    return await withTransaction(async (client) => {
      const docCheck = await client.query(
        `SELECT * FROM documents WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
        [documentId],
      );

      if (docCheck.rowCount === 0) {
        throw new NotFoundError("Dokumen tidak ditemukan.");
      }

      const doc = docCheck.rows[0];
      if (Number(doc.applicant_id) !== user.id) {
        throw new ForbiddenError(
          "Hanya pembuat dokumen yang dapat mengunggah versi baru.",
        );
      }

      if (doc.status !== "draft" || doc.review_stage !== "applicant") {
        throw new BadRequestError(
          "Unggah file versi baru hanya boleh saat draft-applicant.",
        );
      }

      if (
        expectedVersion !== undefined &&
        Number(doc.version) !== expectedVersion
      ) {
        throw new VersionConflictError(
          "Dokumen telah dimodifikasi oleh aksi lain.",
        );
      }

      // Get max version_no
      const maxVerRes = await client.query(
        `
        SELECT COALESCE(MAX(version_no), 0) as max_ver FROM document_versions WHERE document_id = $1
      `,
        [documentId],
      );
      const nextVersionNo = parseInt(maxVerRes.rows[0].max_ver, 10) + 1;

      const checksum = await computeFileChecksum(file);
      const ext = path.extname(file.originalname) || ".bin";
      const storageFileName = `${crypto.randomUUID()}${ext}`;
      const storageFilePath = path.join(config.uploadDir, storageFileName);

      await persistUploadedFile(file, storageFilePath);
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
          storageFileName,
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
    if (savedFilePath) {
      try {
        await fs.promises.unlink(savedFilePath);
      } catch (unlinkErr) {
        console.error(
          "[Cleanup Error] Failed to delete orphaned file:",
          unlinkErr,
        );
      }
    }
    if (file.path) {
      try {
        await fs.promises.unlink(file.path);
      } catch {
        // ignore
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
    throw new ForbiddenError(
      "Akses ditolak. Fitur ini hanya tersedia untuk peran Assistant.",
    );
  }
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

    // Call stored procedure (stored procedure handles row locking & all validations atomically)
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
    throw new ForbiddenError(
      "Akses ditolak. Fitur ini hanya tersedia untuk peran Assistant.",
    );
  }
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
    throw new ForbiddenError(
      "Akses ditolak. Fitur ini hanya tersedia untuk peran Assistant.",
    );
  }
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

    await client.query(`SELECT sp_cancel_document($1, $2)`, [
      documentId,
      user.id,
    ]);
    return { message: "Dokumen berhasil dibatalkan (Canceled)" };
  });
}
