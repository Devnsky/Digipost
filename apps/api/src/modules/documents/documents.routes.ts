import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { z } from "zod";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import * as docService from "./documents.service";
import {
  authenticate,
  requirePasswordChanged,
  requireRoles,
  requireAssistantRole,
} from "../../middleware/auth";
import { config } from "../../config";

import { validateFileMagicBytes } from "../files/file-validation";

const router = Router();

const createDocumentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Judul dokumen wajib diisi.")
    .max(200, "Judul dokumen maksimal 200 karakter."),
  description: z.string().trim().max(2000).optional().default(""),
  department_ids: z.preprocess((val) => {
    if (!val) return [];
    if (typeof val === "string") {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return val ? [val] : [];
      }
    }
    return val;
  }, z.array(z.coerce.number()).optional().default([])),
});

const updateDocumentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Judul dokumen wajib diisi.")
    .max(200, "Judul dokumen maksimal 200 karakter."),
  description: z.string().trim().max(2000).optional().default(""),
  expected_version: z.coerce.number().optional(),
});

const tempUploadDir = path.join(config.uploadDir, ".tmp");
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, tempUploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".bin";
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: config.maxFileSizeMb * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (
      allowedMimes.includes(file.mimetype) ||
      file.originalname.match(/\.(pdf|docx|doc)$/i)
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Format berkas tidak didukung. Harap unggah berkas PDF atau DOCX.",
        ),
      );
    }
  },
});

// All document routes require authentication and password changed
router.use(authenticate, requirePasswordChanged);

// GET /api/documents/my - My documents list
router.get("/my", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = {
      status: req.query.status as string,
      search: req.query.search as string,
      dateFrom: req.query.date_from as string,
      dateTo: req.query.date_to as string,
      page: parseInt(req.query.page as string, 10) || 1,
      limit: parseInt(req.query.limit as string, 10) || 10,
    };
    const result = await docService.listMyDocuments(req.user!, filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/documents/checker-queue - Checker inbox
router.get(
  "/checker-queue",
  requireRoles("checker", "dept_manager"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        search: req.query.search as string,
        page: parseInt(req.query.page as string, 10) || 1,
        limit: parseInt(req.query.limit as string, 10) || 10,
      };
      const result = await docService.listCheckerQueue(req.user!, filters);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/documents/department-queue - Dept manager documents list
router.get(
  "/department-queue",
  requireRoles("dept_manager", "checker"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        status: req.query.status as string,
        search: req.query.search as string,
        dateFrom: req.query.date_from as string,
        dateTo: req.query.date_to as string,
        applicantDepartmentId: req.query.applicant_department_id
          ? Number(req.query.applicant_department_id)
          : undefined,
        scope: req.query.scope as string,
        page: parseInt(req.query.page as string, 10) || 1,
        limit: parseInt(req.query.limit as string, 10) || 10,
      };
      const result = await docService.listDepartmentDocuments(
        req.user!,
        filters,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/documents/stats - Dashboard counts
router.get(
  "/stats",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await docService.getDocumentStats(req.user!);
      res.json(stats);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/documents/:documentNumber - Detail view
router.get(
  "/:documentNumber",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawDocNumber = req.params.documentNumber;
      if (typeof rawDocNumber !== "string" || !rawDocNumber.trim()) {
        res.status(400).json({ error: "Nomor dokumen tidak valid." });
        return;
      }
      const documentNumber = decodeURIComponent(rawDocNumber.trim());
      const result = await docService.getDocumentDetail(
        documentNumber,
        req.user!,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/documents - Create new document (Assistant only)
router.post(
  "/",
  requireAssistantRole,
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "Berkas dokumen wajib diunggah." });
        return;
      }

      const isValidSignature = await validateFileMagicBytes(req.file);
      if (!isValidSignature) {
        if (req.file.path && fs.existsSync(req.file.path)) {
          try {
            await fs.promises.unlink(req.file.path);
          } catch {
            // ignore
          }
        }
        res.status(400).json({
          error:
            "Format isi berkas tidak valid atau rusak. Harap unggah berkas PDF atau DOCX yang valid.",
          code: "INVALID_FILE_SIGNATURE",
        });
        return;
      }

      const { title, description, department_ids } = createDocumentSchema.parse(
        req.body,
      );

      const created = await docService.createDocument(
        req.user!,
        title,
        description,
        department_ids,
        req.file,
      );

      res.status(201).json({
        message: "Dokumen draft berhasil dibuat",
        document: created,
      });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/documents/:id - Edit draft metadata (Assistant only)
router.put(
  "/:id",
  requireAssistantRole,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const docId = parseInt(req.params.id as string, 10);
      const { title, description, expected_version } =
        updateDocumentSchema.parse(req.body);

      const result = await docService.updateDocument(
        docId,
        req.user!,
        title,
        description,
        expected_version !== undefined ? Number(expected_version) : undefined,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/documents/:id/versions - Upload new version (Assistant only)
router.post(
  "/:id/versions",
  requireAssistantRole,
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const docId = parseInt(req.params.id as string, 10);
      if (!req.file) {
        res.status(400).json({ error: "Berkas versi baru wajib diunggah." });
        return;
      }

      const isValidSignature = await validateFileMagicBytes(req.file);
      if (!isValidSignature) {
        if (req.file.path && fs.existsSync(req.file.path)) {
          try {
            await fs.promises.unlink(req.file.path);
          } catch {
            // ignore
          }
        }
        res.status(400).json({
          error:
            "Format isi berkas tidak valid atau rusak. Harap unggah berkas PDF atau DOCX yang valid.",
          code: "INVALID_FILE_SIGNATURE",
        });
        return;
      }

      const expectedVersion = req.body.expected_version
        ? Number(req.body.expected_version)
        : undefined;

      const result = await docService.uploadNewVersion(
        docId,
        req.user!,
        req.file,
        expectedVersion,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/documents/:id/departments - Add intended department in draft (Assistant only)
router.post(
  "/:id/departments",
  requireAssistantRole,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const docId = parseInt(req.params.id as string, 10);
      const deptId = parseInt(req.body.department_id, 10);
      const expectedVersion = req.body.expected_version
        ? Number(req.body.expected_version)
        : undefined;

      if (isNaN(deptId)) {
        res.status(400).json({ error: "ID Departemen tidak valid." });
        return;
      }

      const result = await docService.addDepartmentDraft(
        docId,
        deptId,
        req.user!,
        expectedVersion,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/documents/:id/departments/:deptId - Remove intended department in draft (Assistant only)
router.delete(
  "/:id/departments/:deptId",
  requireAssistantRole,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const docId = parseInt(req.params.id as string, 10);
      const deptId = parseInt(req.params.deptId as string, 10);
      const expectedVersion = req.query.expected_version
        ? Number(req.query.expected_version)
        : undefined;

      const result = await docService.removeDepartmentDraft(
        docId,
        deptId,
        req.user!,
        expectedVersion,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/documents/:id/submit - Submit draft to Checker (Assistant only)
router.post(
  "/:id/submit",
  requireAssistantRole,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const docId = parseInt(req.params.id as string, 10);
      const expectedVersion = req.body.expected_version
        ? Number(req.body.expected_version)
        : undefined;

      const result = await docService.submitDocument(
        docId,
        req.user!,
        expectedVersion,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/documents/:id - Soft delete draft (Assistant only)
router.delete(
  "/:id",
  requireAssistantRole,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const docId = parseInt(req.params.id as string, 10);
      const expectedVersion = req.query.expected_version
        ? Number(req.query.expected_version)
        : undefined;

      const result = await docService.deleteDocument(
        docId,
        req.user!,
        expectedVersion,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/documents/:id/cancel - Cancel pending document (Assistant only)
router.post(
  "/:id/cancel",
  requireAssistantRole,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const docId = parseInt(req.params.id as string, 10);
      const expectedVersion = req.body.expected_version
        ? Number(req.body.expected_version)
        : undefined;

      const result = await docService.cancelDocument(
        docId,
        req.user!,
        expectedVersion,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

export const documentRoutes = router;
