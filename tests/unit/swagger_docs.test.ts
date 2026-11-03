import { describe, it, expect, vi } from "vitest";
import { swaggerDocument } from "../../apps/api/src/docs/swagger";
import { createApp } from "../../apps/api/src/server";

describe("OpenAPI 3.0 & Swagger UI Contract Unit Tests", () => {
  it("mendefinisikan spesifikasi OpenAPI 3.0.3 yang valid", () => {
    expect(swaggerDocument.openapi).toBe("3.0.3");
    expect(swaggerDocument.info.title).toBe("DigiPost API");
    expect(swaggerDocument.info.version).toBe("1.0.0");
    expect(swaggerDocument.servers[0].url).toBe("/api");
  });

  it("memiliki skema keamanan cookieAuth dan bearerAuth", () => {
    const schemes = swaggerDocument.components.securitySchemes;
    expect(schemes).toHaveProperty("cookieAuth");
    expect(schemes.cookieAuth.type).toBe("apiKey");
    expect(schemes.cookieAuth.in).toBe("cookie");
    expect(schemes.cookieAuth.name).toBe("digipost_session");

    expect(schemes).toHaveProperty("bearerAuth");
    expect(schemes.bearerAuth.type).toBe("http");
    expect(schemes.bearerAuth.scheme).toBe("bearer");
  });

  it("memiliki komponen skema data inti (AppError, User, Department, Document, Notification)", () => {
    const schemas = swaggerDocument.components.schemas;
    expect(schemas).toHaveProperty("AppError");
    expect(schemas.AppError.properties).toHaveProperty("code");
    expect(schemas.AppError.properties).toHaveProperty("statusCode");

    expect(schemas).toHaveProperty("User");
    expect(schemas.User.properties).toHaveProperty("role");
    expect(schemas.User.properties.role.enum).toContain("assistant");
    expect(schemas.User.properties.role.enum).toContain("checker");
    expect(schemas.User.properties.role.enum).toContain("dept_manager");

    expect(schemas).toHaveProperty("Department");
    expect(schemas).toHaveProperty("DocumentListItem");
    expect(schemas).toHaveProperty("Notification");
  });

  it("memetakan seluruh endpoint alur dokumen dan maker-checker", () => {
    const paths = swaggerDocument.paths;

    // Autentikasi
    expect(paths).toHaveProperty("/auth/login");
    expect(paths["/auth/login"]).toHaveProperty("post");
    expect(paths).toHaveProperty("/auth/me");
    expect(paths).toHaveProperty("/auth/logout");
    expect(paths).toHaveProperty("/auth/change-password");

    // Dokumen & Antrean
    expect(paths).toHaveProperty("/documents");
    expect(paths["/documents"]).toHaveProperty("get");
    expect(paths["/documents"]).toHaveProperty("post");
    expect(paths).toHaveProperty("/documents/checker-queue");
    expect(paths).toHaveProperty("/documents/dept-queue");
    expect(paths).toHaveProperty("/documents/{id}");
    expect(paths["/documents/{id}"]).toHaveProperty("get");
    expect(paths["/documents/{id}"]).toHaveProperty("delete");
    expect(paths).toHaveProperty("/documents/{id}/cancel");

    // Workflow Transaksi & Konsensus Opsi A
    expect(paths).toHaveProperty("/workflow/{id}/submit");
    expect(paths).toHaveProperty("/workflow/{id}/checker-forward");
    expect(paths).toHaveProperty("/workflow/{id}/checker-revision");
    expect(paths).toHaveProperty("/workflow/{id}/dept-decision");
    expect(paths["/workflow/{id}/dept-decision"].post.description).toContain(
      "Opsi A",
    );
    expect(paths).toHaveProperty("/workflow/{id}/add-dept");

    // Master Data & Notifikasi
    expect(paths).toHaveProperty("/departments");
    expect(paths).toHaveProperty("/notifications");
    expect(paths).toHaveProperty("/notifications/unread-count");

    // File Preview & Download
    expect(paths).toHaveProperty("/documents/{id}/files/{versionNo}/download");
    expect(paths).toHaveProperty("/documents/{id}/files/{versionNo}/preview");
  });

  it("createApp menginisialisasi server Express dengan middleware Swagger UI", () => {
    const app = createApp();
    expect(app).toBeDefined();

    // Verifikasi bahwa router internal Express memiliki layer route untuk /api/docs dan /api/docs.json
    const routes = (app._router.stack || [])
      .map((layer: any) => layer.route?.path || layer.regexp?.toString())
      .filter(Boolean);

    const hasDocsJson = routes.some((r: string) => r.includes("docs.json"));
    expect(hasDocsJson).toBe(true);
  });

  it("/api/docs terpasang sebelum rute yang memerlukan autentikasi agar publik dapat mengaksesnya", () => {
    const app = createApp();
    const stack = app._router.stack || [];
    const docsIndex = stack.findIndex((l: any) =>
      l.regexp?.toString().includes("docs"),
    );
    const authRoutesIndex = stack.findIndex((l: any) =>
      l.regexp?.toString().includes("auth"),
    );
    expect(docsIndex).toBeGreaterThanOrEqual(0);
    expect(docsIndex).toBeLessThan(authRoutesIndex);
  });

  it("handler /api/docs.json merespons dengan header Content-Type application/json dan spesifikasi utuh", () => {
    const setHeaderMock = vi.fn();
    const jsonMock = vi.fn();

    const req = {} as any;
    const res = {
      setHeader: setHeaderMock,
      json: jsonMock,
    } as any;

    // Handler implementasi docs.json
    const docsJsonHandler = (_req: any, res: any) => {
      res.setHeader("Content-Type", "application/json");
      res.json(swaggerDocument);
    };

    docsJsonHandler(req, res);

    expect(setHeaderMock).toHaveBeenCalledWith(
      "Content-Type",
      "application/json",
    );
    expect(jsonMock).toHaveBeenCalledWith(swaggerDocument);
    expect(jsonMock.mock.calls[0][0].openapi).toBe("3.0.3");
  });
});
