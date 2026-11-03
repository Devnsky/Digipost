import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as workflowService from "./workflow.service";
import {
  authenticate,
  requirePasswordChanged,
  requireRoles,
} from "../../middleware/auth";

const router = Router();
router.use(authenticate, requirePasswordChanged);

const checkerDecideSchema = z.object({
  action: z.enum(["approve", "reject", "revision"]),
  note: z.string().optional(),
  expected_version: z.number().optional(),
});

const checkerCommentSchema = z.object({
  body: z.string().min(1, "Komentar tidak boleh kosong"),
});

const deptDecisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  expected_version: z.number().optional(),
});

const deptAddSchema = z.object({
  department_id: z.coerce.number(),
  expected_version: z.number().optional(),
});

const deptResponseSchema = z.object({
  department_id: z.coerce.number(),
  body: z.string().min(1, "Respon tidak boleh kosong"),
});

// POST /api/workflow/:id/checker/decide
router.post(
  "/:id/checker/decide",
  requireRoles("checker", "dept_manager"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const docId = parseInt(req.params.id as string, 10);
      const { action, note, expected_version } = checkerDecideSchema.parse(
        req.body,
      );

      const result = await workflowService.checkerDecide(
        docId,
        req.user!,
        action,
        note,
        expected_version,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/workflow/:id/checker/comment
router.post(
  "/:id/checker/comment",
  requireRoles("checker", "dept_manager"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const docId = parseInt(req.params.id as string, 10);
      const { body } = checkerCommentSchema.parse(req.body);

      const result = await workflowService.checkerComment(
        docId,
        req.user!,
        body,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/workflow/:id/departments/:deptId/decision
router.post(
  "/:id/departments/:deptId/decision",
  requireRoles("dept_manager"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const docId = parseInt(req.params.id as string, 10);
      const deptId = parseInt(req.params.deptId as string, 10);
      const { decision, expected_version } = deptDecisionSchema.parse(req.body);

      const result = await workflowService.setDepartmentDecision(
        docId,
        deptId,
        req.user!,
        decision,
        expected_version,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/workflow/:id/departments/add-pending
router.post(
  "/:id/departments/add-pending",
  requireRoles("dept_manager"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const docId = parseInt(req.params.id as string, 10);
      const { department_id, expected_version } = deptAddSchema.parse(req.body);

      const result = await workflowService.addDepartmentPending(
        docId,
        department_id,
        req.user!,
        expected_version,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/workflow/:id/departments/response
router.post(
  "/:id/departments/response",
  requireRoles("dept_manager"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const docId = parseInt(req.params.id as string, 10);
      const { department_id, body } = deptResponseSchema.parse(req.body);

      const result = await workflowService.deptResponse(
        docId,
        department_id,
        req.user!,
        body,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

export const workflowRoutes = router;
