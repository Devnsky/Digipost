import { Request, Response, NextFunction } from "express";
import { config } from "../config";
import { AppError } from "./errors";

// In-memory rate limiter per IP for sensitive auth routes
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();
const MAX_RATE_LIMIT_ENTRIES = 5000;

export function pruneRateLimitMap(
  now = Date.now(),
  maxEntries = MAX_RATE_LIMIT_ENTRIES,
): void {
  // 1. Evict expired entries
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetAt) {
      rateLimitMap.delete(key);
    }
  }
  // 2. FIFO eviction if map still at/over capacity (prevent unbounded memory DoS)
  while (rateLimitMap.size >= maxEntries) {
    const oldestKey = rateLimitMap.keys().next().value;
    if (oldestKey === undefined) break;
    rateLimitMap.delete(oldestKey);
  }
}

export function _getRateLimitMapSize(): number {
  return rateLimitMap.size;
}

export function _clearRateLimitMap(): void {
  rateLimitMap.clear();
}

// Periodic cleanup of expired rate limit entries every 10 minutes
if (typeof setInterval !== "undefined") {
  const cleanupTimer = setInterval(
    () => {
      pruneRateLimitMap(Date.now(), MAX_RATE_LIMIT_ENTRIES);
    },
    10 * 60 * 1000,
  );
  if (cleanupTimer.unref) {
    cleanupTimer.unref(); // Don't hold Node process open in tests
  }
}

export function authRateLimiter(maxAttempts = 15, windowMinutes = 15) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // In test environment, allow bypassing rate limit unless explicitly tested
    if (config.env === "test" && !req.headers["x-test-rate-limit"]) {
      return next();
    }

    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const routePrefix = `${req.baseUrl || ""}${req.path || ""}`;
    const key = routePrefix ? `${routePrefix}:${ip}` : ip;
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;

    const record = rateLimitMap.get(key);
    if (!record || now > record.resetAt) {
      if (rateLimitMap.size >= MAX_RATE_LIMIT_ENTRIES) {
        pruneRateLimitMap(now, MAX_RATE_LIMIT_ENTRIES);
      }
      rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    record.count += 1;
    if (record.count > maxAttempts) {
      res.status(429).json({
        error:
          "Terlalu banyak percobaan dari alamat IP ini. Silakan coba lagi beberapa saat.",
        code: "TOO_MANY_REQUESTS",
      });
      return;
    }

    next();
  };
}

// CSRF / Origin verification for cookie-authenticated mutating requests
export function csrfProtection(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Safe methods don't need CSRF check
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  // If using Bearer token authorization header, CSRF is not applicable
  if (req.headers.authorization?.startsWith("Bearer ")) {
    return next();
  }

  // If request has cookie, verify Sec-Fetch-Site or Origin / Referer
  if (req.cookies?.[config.sessionCookieName]) {
    const origin = req.headers.origin || req.headers.referer;
    const secFetchSite = req.headers["sec-fetch-site"];

    if (secFetchSite && secFetchSite === "cross-site") {
      res.status(403).json({
        error: "Permintaan lintas-asal (cross-site) ditolak demi keamanan.",
        code: "CSRF_BLOCKED",
      });
      return;
    }

    if (origin) {
      try {
        const originUrl = new URL(origin);
        const forwardedHost = req
          .get("x-forwarded-host")
          ?.split(",")[0]
          .trim();
        const requestHost = forwardedHost || req.get("host");

        // Allow same host (direct domain access or reverse proxy e.g. Dokploy/Traefik)
        if (requestHost && originUrl.host === requestHost) {
          return next();
        }

        const frontendUrl = new URL(config.frontendUrl);
        // Allow same host/port in local development
        if (
          config.env === "development" &&
          (originUrl.hostname === "localhost" ||
            originUrl.hostname === "127.0.0.1")
        ) {
          return next();
        }
        if (originUrl.origin === frontendUrl.origin) {
          return next();
        }
        res.status(403).json({
          error: "Permintaan dari asal yang tidak diizinkan.",
          code: "ORIGIN_MISMATCH",
        });
        return;
      } catch {
        // If malformed origin
        res.status(403).json({
          error: "Header asal tidak valid.",
          code: "INVALID_ORIGIN",
        });
        return;
      }
    } else if (config.env !== "test" && !secFetchSite) {
      res.status(403).json({
        error: "Header asal (Origin/Referer) wajib disertakan.",
        code: "CSRF_ORIGIN_REQUIRED",
      });
      return;
    }
  }

  next();
}

// Global safe error handler
export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Handle typed application domain errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
    return;
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || "Terjadi kesalahan pada sistem.";

  // Handle Zod validation errors
  if (err.name === "ZodError" || err.constructor?.name === "ZodError") {
    res.status(400).json({
      error: err.errors?.[0]?.message || "Format input tidak valid.",
      code: "VALIDATION_ERROR",
      details: err.errors,
    });
    return;
  }

  // Handle Multer upload errors
  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({
        error: "Ukuran berkas melebihi batas maksimal yang diizinkan.",
        code: "FILE_TOO_LARGE",
      });
      return;
    }
    res.status(400).json({
      error: err.message || "Gagal mengunggah berkas.",
      code: "INVALID_FILE_UPLOAD",
    });
    return;
  }

  // Handle PostgreSQL data format / syntax exceptions
  if (err.code === "22P02") {
    res.status(400).json({
      error: "Format parameter masukan tidak valid.",
      code: "INVALID_INPUT_SYNTAX",
    });
    return;
  }

  if (err.code === "22007" || err.code === "22008") {
    res.status(400).json({
      error: "Format tanggal tidak valid.",
      code: "INVALID_DATETIME_FORMAT",
    });
    return;
  }

  // Handle PostgreSQL custom exceptions (RAISE EXCEPTION in PL/pgSQL)
  if (err.code === "P0001") {
    // If it's a concurrency conflict or terminal state conflict
    if (
      message.includes("optimistic") ||
      message.includes("version") ||
      message.includes("bersamaan")
    ) {
      res.status(409).json({
        error: message,
        code: "CONCURRENCY_CONFLICT",
        hint: "Data telah diperbarui oleh pengguna lain. Silakan muat ulang halaman.",
      });
      return;
    }
    // Resource not found in stored procedure
    if (message.includes("tidak ditemukan")) {
      res.status(404).json({
        error: message,
        code: "NOT_FOUND",
      });
      return;
    }
    // Business rule rejection
    res.status(400).json({
      error: message,
      code: "BUSINESS_RULE_VIOLATION",
    });
    return;
  }

  // Handle unique constraint violations
  if (err.code === "23505") {
    res.status(409).json({
      error: "Data duplikat telah ada pada sistem.",
      code: "DUPLICATE_ENTRY",
    });
    return;
  }

  // Handle foreign key constraint violations
  if (err.code === "23503") {
    res.status(400).json({
      error:
        "Data referensi yang ditentukan tidak ditemukan atau tidak valid.",
      code: "FOREIGN_KEY_VIOLATION",
    });
    return;
  }

  // Handle optimistic version conflict thrown in application code
  if (err.code === "VERSION_CONFLICT") {
    res.status(409).json({
      error: err.message || "Dokumen telah diubah oleh pihak lain.",
      code: "VERSION_CONFLICT",
      hint: "Silakan segarkan halaman untuk melihat versi terbaru.",
    });
    return;
  }

  // Generic 4xx error
  if (status >= 400 && status < 500) {
    res.status(status).json({
      error: message,
      code: err.code || "BAD_REQUEST",
    });
    return;
  }

  // Log 5xx errors server-side without leaking internals
  console.error("[Internal Server Error]", err);
  res.status(500).json({
    error:
      "Terjadi gangguan internal pada server. Tim teknis sedang menanganinya.",
    code: "INTERNAL_SERVER_ERROR",
  });
}
