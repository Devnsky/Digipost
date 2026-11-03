import { Router, Request, Response, NextFunction } from "express";
import fs from "fs";
import * as filesService from "./files.service";
import * as departmentsService from "../departments/departments.service";
import { authenticate } from "../../middleware/auth";

const router = Router();
router.use(authenticate);

// GET /api/departments - Master list for dropdowns (delegates to departmentsService)
router.get(
  "/departments",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const departments = await departmentsService.listActiveDepartments();
      res.json(departments);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/documents/:id/files/:versionId/download - Download original file
router.get(
  "/documents/:id/files/:versionId/download",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const docId = parseInt(req.params.id as string, 10);
      const verId = parseInt(req.params.versionId as string, 10);

      const { version } = await filesService.checkFileAccess(
        docId,
        verId,
        req.user!,
      );

      res.setHeader(
        "Content-Type",
        version.mime_type || "application/octet-stream",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(version.file_name)}"`,
      );
      fs.createReadStream(version.file_path).pipe(res);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/documents/:id/files/:versionId/preview - Preview file (inline PDF or DOCX html)
router.get(
  "/documents/:id/files/:versionId/preview",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const docId = parseInt(req.params.id as string, 10);
      const verId = parseInt(req.params.versionId as string, 10);
      const stamped = req.query.stamp === "true";

      const { document: doc, version } = await filesService.checkFileAccess(
        docId,
        verId,
        req.user!,
      );

      const ext = (version.file_name || "").split(".").pop()?.toLowerCase();

      if (ext === "pdf" || version.mime_type === "application/pdf") {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `inline; filename="${encodeURIComponent(version.file_name)}"`,
        );

        if (
          stamped ||
          ["approved", "rejected", "canceled"].includes(doc.status)
        ) {
          const stampedBytes = await filesService.getStampedPdfBuffer(
            version.file_path,
            doc.status,
            doc.document_number,
          );
          res.end(Buffer.from(stampedBytes));
        } else {
          fs.createReadStream(version.file_path).pipe(res);
        }
      } else if (ext === "docx" || ext === "doc") {
        try {
          const html = await filesService.convertDocxToHtml(version.file_path);
          res.setHeader("Content-Type", "application/json");
          res.json({
            type: "docx",
            fileName: version.file_name,
            html,
          });
        } catch (_err) {
          res.status(422).json({
            error:
              "Tidak dapat mengonversi pratinjau DOCX secara otomatis. Silakan unduh berkas untuk membukanya.",
            code: "PREVIEW_UNAVAILABLE",
          });
        }
      } else {
        res.status(415).json({
          error: "Tipe berkas tidak mendukung pratinjau langsung.",
          code: "UNSUPPORTED_MEDIA_TYPE",
        });
      }
    } catch (err) {
      next(err);
    }
  },
);

export const fileRoutes = router;
