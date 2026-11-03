import fs from "fs";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import mammoth from "mammoth";
import { query } from "../../db";
import { AuthUser } from "../../middleware/auth";

export async function checkFileAccess(
  documentId: number,
  versionId: number,
  user: AuthUser,
) {
  // 1. Check document and authorization
  const docResult = await query(
    `SELECT d.* FROM documents d WHERE d.id = $1 AND d.deleted_at IS NULL`,
    [documentId],
  );

  if (docResult.rowCount === 0) {
    const error = new Error("Dokumen tidak ditemukan atau sudah dihapus.");
    (error as any).status = 404;
    throw error;
  }

  const doc = docResult.rows[0];
  const isApplicant = Number(doc.applicant_id) === user.id;
  const isChecker = Number(doc.checker_id) === user.id;

  const deptResult = await query(
    `SELECT 1 FROM document_departments dd
     JOIN departments dep ON dep.id = dd.department_id
     WHERE dd.document_id = $1 AND dep.manager_id = $2 AND dd.passed_checker = TRUE`,
    [documentId, user.id],
  );
  const isDeptManager = (deptResult.rowCount || 0) > 0;

  if (doc.status === "draft") {
    if (!isApplicant && !isChecker) {
      const error = new Error(
        "Anda tidak memiliki akses ke berkas dokumen ini.",
      );
      (error as any).status = 403;
      throw error;
    }
  } else {
    if (!isApplicant && !isChecker && !isDeptManager) {
      const error = new Error(
        "Anda tidak memiliki akses ke berkas dokumen ini.",
      );
      (error as any).status = 403;
      throw error;
    }
  }

  // 2. Fetch version record
  const verResult = await query(
    `SELECT * FROM document_versions WHERE document_id = $1 AND id = $2`,
    [documentId, versionId],
  );

  if (verResult.rowCount === 0) {
    const error = new Error("Versi berkas tidak ditemukan.");
    (error as any).status = 404;
    throw error;
  }

  const version = verResult.rows[0];
  if (!fs.existsSync(version.file_path)) {
    const error = new Error(
      "Berkas fisik tidak ditemukan di penyimpanan server.",
    );
    (error as any).status = 404;
    throw error;
  }

  return { document: doc, version };
}

export async function getStampedPdfBuffer(
  filePath: string,
  docStatus: string,
  docNumber: string,
) {
  const existingPdfBytes = fs.readFileSync(filePath);
  try {
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let stampText = "MENUNGGU PERSETUJUAN";
    let stampColor = rgb(0.85, 0.65, 0.1); // yellow / amber

    if (docStatus === "approved") {
      stampText = "APPROVED / DISETUJUI";
      stampColor = rgb(0.1, 0.65, 0.2); // green
    } else if (docStatus === "rejected") {
      stampText = "REJECTED / DITOLAK";
      stampColor = rgb(0.85, 0.15, 0.15); // red
    } else if (docStatus === "canceled") {
      stampText = "CANCELED / DIBATALKAN";
      stampColor = rgb(0.5, 0.5, 0.5); // gray
    }

    const stampDate = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    for (const page of pages) {
      const { width, height } = page.getSize();
      // Draw stamp banner on top right corner
      page.drawRectangle({
        x: width - 230,
        y: height - 55,
        width: 215,
        height: 40,
        borderColor: stampColor,
        borderWidth: 2,
        color: rgb(1, 1, 1),
        opacity: 0.95,
      });

      page.drawText(stampText, {
        x: width - 220,
        y: height - 35,
        size: 11,
        font,
        color: stampColor,
      });

      page.drawText(`${docNumber} • ${stampDate}`, {
        x: width - 220,
        y: height - 48,
        size: 8,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
    }

    return await pdfDoc.save();
  } catch (err) {
    console.warn("[PDF Stamping Warning]:", err);
    // Return original if stamping fails
    return existingPdfBytes;
  }
}

export async function convertDocxToHtml(filePath: string): Promise<string> {
  const result = await mammoth.convertToHtml({ path: filePath });
  return result.value;
}
