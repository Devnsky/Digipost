import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { query } from "../db";
import { config } from "../config";

export interface AuthUser {
  id: number;
  session_id: string;
  employee_no: string;
  full_name: string;
  email: string;
  username: string;
  department_id: number;
  department_name: string;
  department_code?: string | null;
  manager_id: number | null;
  manager_name?: string | null;
  must_change_password: boolean;
  is_active: boolean;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      sessionToken?: string;
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    let token = req.cookies?.[config.sessionCookieName];

    // Fallback support for Authorization: Bearer <token>
    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.slice(7).trim();
    }

    if (!token) {
      res.status(401).json({
        error: "Sesi tidak ditemukan. Harap login terlebih dahulu.",
        code: "UNAUTHORIZED",
      });
      return;
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const result = await query<any>(
      `SELECT
         s.*,
         d.code as department_code,
         mgr.full_name as manager_name
       FROM fn_validate_session_by_token($1, ($2 || ' minutes')::interval) s
       LEFT JOIN departments d ON d.id = s.department_id
       LEFT JOIN users mgr ON mgr.id = s.manager_id`,
      [tokenHash, config.sessionIdleMinutes],
    );

    if (result.rowCount === 0) {
      // Clear cookie if present
      res.clearCookie(config.sessionCookieName, {
        httpOnly: true,
        secure: config.env === "production",
        sameSite: "lax",
      });
      res.status(401).json({
        error:
          "Sesi telah kedaluwarsa atau tidak valid. Silakan login kembali.",
        code: "SESSION_EXPIRED",
      });
      return;
    }

    req.user = {
      ...result.rows[0],
      id: Number((result.rows[0] as any).user_id ?? result.rows[0].id),
      department_id: Number(result.rows[0].department_id),
      department_name: result.rows[0].department_name,
      department_code: (result.rows[0] as any).department_code || null,
      manager_id: result.rows[0].manager_id
        ? Number(result.rows[0].manager_id)
        : null,
      manager_name: (result.rows[0] as any).manager_name || null,
      role: result.rows[0].role || "assistant",
    };
    req.sessionToken = token;

    next();
  } catch (err) {
    next(err);
  }
}

export function requirePasswordChanged(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.user?.must_change_password) {
    res.status(403).json({
      error:
        "Anda wajib mengubah password sementara sebelum dapat mengakses fitur aplikasi.",
      code: "MUST_CHANGE_PASSWORD",
    });
    return;
  }
  next();
}

export function requireRoles(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: "Sesi tidak ditemukan. Harap login terlebih dahulu.",
        code: "UNAUTHORIZED",
      });
      return;
    }
    const userRole = req.user.role || "assistant";
    if (userRole === "admin" || allowedRoles.includes(userRole)) {
      next();
      return;
    }
    res.status(403).json({
      error: `Akses ditolak. Fitur ini hanya dapat diakses oleh pengguna dengan peran: ${allowedRoles.join(", ")}.`,
      code: "FORBIDDEN",
    });
  };
}

export function requireAssistantRole(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({
      error: "Sesi tidak ditemukan. Harap login terlebih dahulu.",
      code: "UNAUTHORIZED",
    });
    return;
  }
  if (req.user.role !== "assistant") {
    res.status(403).json({
      error:
        "Akses ditolak. Fitur membuat dan mengelola pengajuan dokumen hanya tersedia untuk akun Assistant.",
      code: "FORBIDDEN_ROLE",
    });
    return;
  }
  next();
}
