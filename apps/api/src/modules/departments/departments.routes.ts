import { Router, Request, Response, NextFunction } from "express";
import * as departmentsService from "./departments.service";
import { authenticate } from "../../middleware/auth";

const router = Router();
router.use(authenticate);

// GET /api/departments - Master list for dropdowns
router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const departments = await departmentsService.listActiveDepartments();
    res.json(departments);
  } catch (err) {
    next(err);
  }
});

export const departmentRoutes = router;
