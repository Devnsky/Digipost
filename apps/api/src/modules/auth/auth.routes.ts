import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as authService from "./auth.service";
import { authenticate } from "../../middleware/auth";
import { authRateLimiter } from "../../middleware/security";
import { config } from "../../config";

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1, "Username wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

const changePasswordSchema = z.object({
  old_password: z.string().min(1, "Password lama wajib diisi"),
  new_password: z.string().min(10, "Password baru minimal 10 karakter"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Format email tidak valid"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token reset wajib disertakan"),
  new_password: z.string().min(10, "Password baru minimal 10 karakter"),
});

// POST /api/auth/login
router.post(
  "/login",
  authRateLimiter(15, 15),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      const ip = (req.ip || req.socket.remoteAddress || "").replace(
        "::ffff:",
        "",
      );
      const userAgent = req.headers["user-agent"] || "";

      const { rawToken, user } = await authService.login(
        username,
        password,
        ip,
        userAgent,
      );

      res.cookie(config.sessionCookieName, rawToken, {
        httpOnly: true,
        secure: config.env === "production",
        sameSite: "lax",
        maxAge: config.sessionMaxHours * 60 * 60 * 1000,
        path: "/",
      });

      res.json({
        message: "Login berhasil",
        user,
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/auth/logout
router.post(
  "/logout",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.sessionToken) {
        await authService.logout(req.sessionToken);
      }
      res.clearCookie(config.sessionCookieName, {
        httpOnly: true,
        secure: config.env === "production",
        sameSite: "lax",
        path: "/",
      });
      res.json({ message: "Logout berhasil" });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/auth/me
router.get("/me", authenticate, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

// POST /api/auth/change-password
router.post(
  "/change-password",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { old_password, new_password } = changePasswordSchema.parse(
        req.body,
      );
      await authService.changePassword(
        req.user!.id,
        old_password,
        new_password,
      );

      res.clearCookie(config.sessionCookieName, {
        httpOnly: true,
        secure: config.env === "production",
        sameSite: "lax",
        path: "/",
      });

      res.json({
        message:
          "Password berhasil diubah. Seluruh sesi telah dicabut, silakan login kembali.",
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/auth/forgot-password
router.post(
  "/forgot-password",
  authRateLimiter(5, 15),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      await authService.forgotPassword(email);

      res.json({
        message:
          "Jika email terdaftar, instruksi reset password telah dikirimkan ke email Anda.",
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/auth/reset-password
router.post(
  "/reset-password",
  authRateLimiter(10, 15),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, new_password } = resetPasswordSchema.parse(req.body);
      await authService.resetPassword(token, new_password);

      res.json({
        message:
          "Password berhasil direset. Silakan login kembali dengan password baru.",
      });
    } catch (err) {
      next(err);
    }
  },
);

export const authRoutes = router;
