import { describe, it, expect } from "vitest";
import {
  checkMagicHeader,
  isPdfMagicBytes,
  isDocxMagicBytes,
  isDocMagicBytes,
  validateFileMagicBytes,
} from "../../apps/api/src/modules/files/file-validation";
import { computeFileChecksum } from "../../apps/api/src/modules/documents/services/documents-mutation.service";
import crypto from "crypto";

describe("File Validation & Security Checksum Unit Tests", () => {
  it("mengenali header berkas PDF yang valid (%PDF-)", () => {
    const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e]);
    expect(isPdfMagicBytes(pdfBuffer)).toBe(true);
    expect(checkMagicHeader(pdfBuffer)).toBe(true);
  });

  it("mengenali header berkas DOCX yang valid (PK\\x03\\x04)", () => {
    const docxBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
    expect(isDocxMagicBytes(docxBuffer)).toBe(true);
    expect(checkMagicHeader(docxBuffer)).toBe(true);
  });

  it("mengenali header berkas DOC warisan (OLE2 0xD0, 0xCF, 0x11, 0xE0)", () => {
    const docBuffer = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1]);
    expect(isDocMagicBytes(docBuffer)).toBe(true);
    expect(checkMagicHeader(docBuffer)).toBe(true);
  });

  it("menolak berkas yang bukan dokumen yang diizinkan (misal file eksekusi MZ / 0x4D, 0x5A)", () => {
    const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);
    expect(checkMagicHeader(exeBuffer)).toBe(false);
  });

  it("menolak berkas teks biasa yang diubah logikanya menjadi .pdf", () => {
    const textBuffer = Buffer.from(
      "Hello world plain text masquerading as pdf",
    );
    expect(checkMagicHeader(textBuffer)).toBe(false);
  });

  it("menolak berkas yang berukuran kurang dari 4 byte", () => {
    const shortBuffer = Buffer.from([0x25, 0x50]);
    expect(checkMagicHeader(shortBuffer)).toBe(false);
  });

  it("validateFileMagicBytes mengenali file buffer yang valid", async () => {
    const mockFile: Express.Multer.File = {
      buffer: Buffer.from([0x25, 0x50, 0x44, 0x46]),
      fieldname: "file",
      originalname: "test.pdf",
      encoding: "7bit",
      mimetype: "application/pdf",
      size: 4,
      stream: null as any,
      destination: "",
      filename: "test.pdf",
      path: "",
    };
    const isValid = await validateFileMagicBytes(mockFile);
    expect(isValid).toBe(true);
  });

  it("computeFileChecksum menghasilkan hash SHA-256 yang akurat untuk buffer", async () => {
    const content = Buffer.from("Konten dokumen rahasia DigiPost");
    const expectedHash = crypto
      .createHash("sha256")
      .update(content)
      .digest("hex");

    const mockFile: Express.Multer.File = {
      buffer: content,
      fieldname: "file",
      originalname: "test.pdf",
      encoding: "7bit",
      mimetype: "application/pdf",
      size: content.length,
      stream: null as any,
      destination: "",
      filename: "test.pdf",
      path: "",
    };

    const checksum = await computeFileChecksum(mockFile);
    expect(checksum).toBe(expectedHash);
  });
});
