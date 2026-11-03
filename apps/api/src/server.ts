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
import swaggerUi from "swagger-ui-express";
import { swaggerDocument } from "./docs/swagger";

export function createApp() {
  const app = express();

  // Trust proxy for accurate req.ip & https detection across reverse proxies (NPM / Traefik / Docker)
  // Default to RFC 1918 / loopback / link-local addresses to prevent client IP spoofing via X-Forwarded-For
  const defaultTrustedProxies = ["loopback", "linklocal", "uniquelocal"];
  let trustProxySetting: any = defaultTrustedProxies;

  if (process.env.TRUST_PROXY) {
    const rawTrust = process.env.TRUST_PROXY.trim();
    if (!isNaN(Number(rawTrust))) {
      trustProxySetting = Number(rawTrust);
    } else if (rawTrust.includes(",")) {
      trustProxySetting = rawTrust.split(",").map((s) => s.trim());
    } else if (rawTrust === "true") {
      if (config.env === "production") {
        console.warn(
          "⚠️ [SECURITY WARNING] TRUST_PROXY=true in production is vulnerable to IP spoofing. Falling back to local subnets (loopback, linklocal, uniquelocal).",
        );
        trustProxySetting = defaultTrustedProxies;
      } else {
        trustProxySetting = true;
      }
    } else if (rawTrust === "false") {
      trustProxySetting = false;
    } else {
      trustProxySetting = rawTrust;
    }
  }
  app.set("trust proxy", trustProxySetting);

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

  // OpenAPI 3.0 / Swagger UI documentation (Public access, no authentication required)
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, {
      customSiteTitle: "DigiPost API Documentation",
      customCss: ".swagger-ui .topbar { display: none }",
    }),
  );
  app.get("/api/docs.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.json(swaggerDocument);
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
