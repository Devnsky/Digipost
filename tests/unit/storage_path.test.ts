import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolveStorageFilePath } from "../../apps/api/src/modules/files/files.service";
import { config } from "../../apps/api/src/config";
import path from "path";
import fs from "fs";

describe("Storage Path Portability Unit Tests", () => {
  const tmpTestDir = path.resolve(__dirname, "../../uploads/test-unit-storage");

  beforeEach(() => {
    if (!fs.existsSync(tmpTestDir)) {
      fs.mkdirSync(tmpTestDir, { recursive: true });
    }
    vi.spyOn(config, "uploadDir", "get").mockReturnValue(tmpTestDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (fs.existsSync(tmpTestDir)) {
      fs.rmSync(tmpTestDir, { recursive: true, force: true });
    }
  });

  it("mengembalikan storedPath jika berkas langsung ditemukan di path tersebut (legacy absolute path)", () => {
    const existingFile = path.resolve(tmpTestDir, "legacy-doc.pdf");
    fs.writeFileSync(existingFile, "dummy content");

    const resolved = resolveStorageFilePath(existingFile);
    expect(resolved).toBe(existingFile);
  });

  it("mencari berkas di dalam config.uploadDir jika hanya diberikan filename relatif", () => {
    const fileName = "relative-file-xyz.pdf";
    const absoluteFile = path.resolve(tmpTestDir, fileName);
    fs.writeFileSync(absoluteFile, "dummy content in uploadDir");

    const resolved = resolveStorageFilePath(fileName);
    expect(resolved).toBe(absoluteFile);
  });

  it("mengembalikan path asli tanpa melempar exception jika berkas belum ada di disk", () => {
    const missingFile = "non-existent-file.pdf";
    const resolved = resolveStorageFilePath(missingFile);
    expect(resolved).toBe(missingFile);
  });
});
