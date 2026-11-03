import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { cleanOrphanedTempFiles } from "../../apps/api/src/modules/documents/documents.routes";
import { config } from "../../apps/api/src/config";

describe("Storage Housekeeping Unit Tests", () => {
  const tempDir = path.join(config.uploadDir, ".tmp");

  beforeEach(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean files created in test
    const files = fs.readdirSync(tempDir);
    for (const f of files) {
      if (f.startsWith("unit-test-")) {
        fs.unlinkSync(path.join(tempDir, f));
      }
    }
  });

  it("cleanOrphanedTempFiles menghapus berkas yang telah melewati batas usia", async () => {
    const expiredFile = path.join(tempDir, "unit-test-expired.bin");
    const freshFile = path.join(tempDir, "unit-test-fresh.bin");

    fs.writeFileSync(expiredFile, "dummy expired content");
    fs.writeFileSync(freshFile, "dummy fresh content");

    // Mundurkan waktu mtime expired file ke 3 jam yang lalu
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    fs.utimesSync(expiredFile, threeHoursAgo, threeHoursAgo);

    // Jalankan pembersihan dengan ambang batas 2 jam (2 * 60 * 60 * 1000 ms)
    const deletedCount = await cleanOrphanedTempFiles(2 * 60 * 60 * 1000);

    expect(deletedCount).toBeGreaterThanOrEqual(1);
    expect(fs.existsSync(expiredFile)).toBe(false);
    expect(fs.existsSync(freshFile)).toBe(true);
  });
});

