import { Router, Request, Response, NextFunction } from "express";
import * as notifService from "./notifications.service";
import { authenticate } from "../../middleware/auth";

const router = Router();
router.use(authenticate);

// GET /api/notifications
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isReadParam = req.query.is_read;
    const isRead =
      isReadParam === "true"
        ? true
        : isReadParam === "false"
          ? false
          : undefined;

    const filters = {
      isRead,
      eventType: req.query.event_type as string,
      page: parseInt(req.query.page as string, 10) || 1,
      limit: parseInt(req.query.limit as string, 10) || 15,
    };

    const result = await notifService.listNotifications(req.user!, filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/:id/read
router.patch(
  "/:id/read",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const result = await notifService.markAsRead(id, req.user!);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/notifications/read-all
router.patch(
  "/read-all",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await notifService.markAllAsRead(req.user!);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

export const notificationRoutes = router;
