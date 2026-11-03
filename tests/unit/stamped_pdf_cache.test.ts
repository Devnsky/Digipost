import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getStampedCacheFilePath,
  getOrGenerateStampedPdf,
} from "../../apps/api/src/modules/files/files.service";
import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";

describe("Stamped PDF Caching Unit Tests", () => {
  const testDir = path.resolve(__dirname, "../../uploads/test-unit-pdf-cache");
  let testPdfPath: string;

  beforeEach(async () => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Buat berkas PDF valid minimal
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([400, 400]);
    const pdfBytes = await pdfDoc.save();

    testPdfPath = path.join(testDir, "test_document.pdf");
    fs.writeFileSync(testPdfPath, pdfBytes);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("getStampedCacheFilePath menghasilkan path cache yang konsisten berdasarkan status", () => {
    const cachePath = getStampedCacheFilePath(testPdfPath, "approved");
    expect(cachePath).toBe(path.join(testDir, "test_document.stamped.approved.pdf"));
  });

  it("getOrGenerateStampedPdf membuat cache berkas fisik di disk untuk status terminal (approved)", async () => {
    const cachePath = getStampedCacheFilePath(testPdfPath, "approved");
    expect(fs.existsSync(cachePath)).toBe(false);

    // Pemanggilan pertama: generate stempel
    const res1 = await getOrGenerateStampedPdf(testPdfPath, "approved", "IAC-26110001");
    expect(res1.buffer).toBeDefined();

    // Tunggu asynchronous file write ke disk selesai
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fs.existsSync(cachePath)).toBe(true);

    // Pemanggilan kedua: harus langsung mengembalikan path file cache tanpa re-stamping
    const res2 = await getOrGenerateStampedPdf(testPdfPath, "approved", "IAC-26110001");
    expect(res2.path).toBe(cachePath);
  });

  it("getOrGenerateStampedPdf TIDAK membuat cache permanen untuk status non-terminal (draft/pending)", async () => {
    const cachePath = getStampedCacheFilePath(testPdfPath, "pending");

    const res = await getOrGenerateStampedPdf(testPdfPath, "pending", "IAC-26110002");
    expect(res.buffer).toBeDefined();

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fs.existsSync(cachePath)).toBe(false);
  });

  it("getOrGenerateStampedPdf menerima tanggal keputusan resmi dokumen", async () => {
    const historicalDate = new Date("2025-12-31T08:00:00Z");
    const res = await getOrGenerateStampedPdf(
      testPdfPath,
      "approved",
      "IAC-25120099",
      historicalDate,
    );
    expect(res.buffer).toBeDefined();

    const pdfDoc = await PDFDocument.load(res.buffer!);
    expect(pdfDoc.getPageCount()).toBe(1);
  });
});

