import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import fs from "fs";
import path from "path";
import { config } from "./config";
import { pool } from "./db";
import { authRoutes } from "./modules/auth/auth.routes";
import { documentRoutes } from "./modules/documents/documents.routes";
import { workflowRoutes } from "./modules/workflow/workflow.routes";
import { notificationRoutes } from "./modules/notifications/notifications.routes";
import { departmentRoutes } from "./modules/departments/departments.routes";
import { fileRoutes } from "./modules/files/files.routes";
import { csrfProtection, errorHandler } from "./middleware/security";

export function createApp() {
  const app = express();

  // Trust proxy for accurate req.ip & https detection across multi-hop reverse proxies (NPM / Traefik / Docker)
  const trustProxy = process.env.TRUST_PROXY
    ? process.env.TRUST_PROXY === "true"
      ? true
      : isNaN(Number(process.env.TRUST_PROXY))
        ? process.env.TRUST_PROXY
        : Number(process.env.TRUST_PROXY)
    : ["loopback", "linklocal", "uniquelocal"];
  app.set("trust proxy", trustProxy);

  // Security headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: false,
    }),
  );

  // CORS - Allow configured frontend URL and local development
  const devOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://localhost:4000",
  ];
  const allowedOrigins = new Set(
    config.env === "development" || config.env === "test"
      ? [config.frontendUrl, ...devOrigins]
      : [config.frontendUrl],
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin)) {
          return callback(null, true);
        }
        return callback(new Error("Akses ditolak oleh kebijakan CORS."));
      },
      credentials: true,
    }),
  );

  // Body and cookie parsing
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(cookieParser(config.cookieSecret));

  // Security checks
  app.use(csrfProtection);

  // Health check with active database probe
  app.get("/api/health", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({
        status: "ok",
        service: "digipost-api",
        environment: config.env,
        database: "connected",
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(503).json({
        status: "error",
        service: "digipost-api",
        environment: config.env,
        database: "disconnected",
        error: err.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Mount API modules
  app.use("/api/auth", authRoutes);
  app.use("/api/documents", documentRoutes);
  app.use("/api/workflow", workflowRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/departments", departmentRoutes);
  app.use("/api", fileRoutes);

  // Serve Frontend SPA in production / all-in-one container if dist directory exists
  const candidateStaticDirs = [
    process.env.STATIC_DIR,
    path.resolve(__dirname, "../../web/dist"),
    path.resolve(__dirname, "../../../apps/web/dist"),
    path.resolve(process.cwd(), "apps/web/dist"),
    path.resolve(process.cwd(), "public"),
  ].filter(Boolean) as string[];

  const staticDir = candidateStaticDirs.find(
    (dir) => fs.existsSync(dir) && fs.existsSync(path.join(dir, "index.html")),
  );

  if (staticDir) {
    app.use(express.static(staticDir));
    app.get("*", (req, res, next) => {
      // Don't intercept API routes with HTML
      if (req.path.startsWith("/api/")) {
        return next();
      }
      res.sendFile(path.join(staticDir, "index.html"));
    });
  }

  // 404 handler for unhandled API endpoints
  app.use((req, res) => {
    if (req.path.startsWith("/api/")) {
      res
        .status(404)
        .json({ error: "Endpoint tidak ditemukan.", code: "NOT_FOUND" });
      return;
    }
    if (staticDir) {
      res.sendFile(path.join(staticDir, "index.html"));
      return;
    }
    res
      .status(404)
      .json({ error: "Halaman tidak ditemukan.", code: "NOT_FOUND" });
  });

  // Global error handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();

if (process.env.NODE_ENV !== "test") {
  app.listen(config.port, () => {
    console.log(`===============================================`);
    console.log(` DigiPost API Server Running on port ${config.port}`);
    console.log(` Environment: ${config.env}`);
    console.log(` Health check: http://localhost:${config.port}/api/health`);
    console.log(`===============================================`);
  });
}
