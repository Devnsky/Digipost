import { describe, it, expect, vi } from "vitest";
import {
  AppError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
  BadRequestError,
  ConflictError,
  VersionConflictError,
} from "../../apps/api/src/middleware/errors";
import { errorHandler } from "../../apps/api/src/middleware/security";

describe("AppError Hierarchy & ErrorHandler Unit Tests", () => {
  it("AppError menginisialisasi properti error dengan benar", () => {
    const error = new AppError("Custom error message", 418, "TEAPOT");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error.message).toBe("Custom error message");
    expect(error.statusCode).toBe(418);
    expect(error.code).toBe("TEAPOT");
    expect(error.isOperational).toBe(true);
  });

  it("NotFoundError memiliki status 404 dan kode default NOT_FOUND", () => {
    const error = new NotFoundError("Dokumen 123 tidak ditemukan.");
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe("NOT_FOUND");
    expect(error.message).toBe("Dokumen 123 tidak ditemukan.");
  });

  it("ForbiddenError memiliki status 403 dan kode default FORBIDDEN", () => {
    const error = new ForbiddenError(
      "Hanya Assistant yang berhak membuat dokumen.",
    );
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe("FORBIDDEN");
  });

  it("UnauthorizedError memiliki status 401 dan kode default UNAUTHORIZED", () => {
    const error = new UnauthorizedError(
      "Sesi telah kedaluwarsa.",
      "SESSION_EXPIRED",
    );
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe("SESSION_EXPIRED");
  });

  it("BadRequestError memiliki status 400 dan kode default BAD_REQUEST", () => {
    const error = new BadRequestError("Komentar tidak boleh kosong.");
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe("BAD_REQUEST");
  });

  it("ConflictError & VersionConflictError memiliki status 409", () => {
    const conflict = new ConflictError("Data duplikat.");
    expect(conflict.statusCode).toBe(409);

    const versionConflict = new VersionConflictError();
    expect(versionConflict.statusCode).toBe(409);
    expect(versionConflict.code).toBe("VERSION_CONFLICT");
  });

  it("errorHandler middleware merespons dengan JSON terstruktur saat menerima AppError", () => {
    const notFound = new NotFoundError("Berkas tidak ditemukan.");

    const jsonMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    const req = {} as any;
    const res = { status: statusMock } as any;
    const next = vi.fn();

    errorHandler(notFound, req, res, next);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({
      error: "Berkas tidak ditemukan.",
      code: "NOT_FOUND",
    });
  });

  it("errorHandler middleware menyembunyikan rincian internal untuk unhandled error 500", () => {
    const internalErr = new Error(
      "Database network socket destroyed unexpectedly",
    );

    const jsonMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    const req = {} as any;
    const res = { status: statusMock } as any;
    const next = vi.fn();

    // Suppress console.error in test
    vi.spyOn(console, "error").mockImplementation(() => {});

    errorHandler(internalErr, req, res, next);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "INTERNAL_SERVER_ERROR",
      }),
    );
  });

  it("errorHandler middleware merespons 404 saat PostgreSQL exception P0001 menyatakan tidak ditemukan", () => {
    const pgErr = new Error("Dokumen tidak ditemukan");
    (pgErr as any).code = "P0001";

    const jsonMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    const req = {} as any;
    const res = { status: statusMock } as any;
    const next = vi.fn();

    errorHandler(pgErr, req, res, next);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({
      error: "Dokumen tidak ditemukan",
      code: "NOT_FOUND",
    });
  });

  it("errorHandler middleware merespons 400 saat PostgreSQL error 23503 (foreign_key_violation)", () => {
    const pgErr = new Error(
      "insert or update on table violates foreign key constraint",
    );
    (pgErr as any).code = "23503";

    const jsonMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    const req = {} as any;
    const res = { status: statusMock } as any;
    const next = vi.fn();

    errorHandler(pgErr, req, res, next);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      error: "Data referensi yang ditentukan tidak ditemukan atau tidak valid.",
      code: "FOREIGN_KEY_VIOLATION",
    });
  });
});
