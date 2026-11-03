import fs from "fs";

export function isPdfMagicBytes(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 4) return false;
  // %PDF- (0x25, 0x50, 0x44, 0x46)
  return (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  );
}

export function isDocxMagicBytes(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 4) return false;
  // PK\x03\x04 (0x50, 0x4B, 0x03, 0x04)
  return (
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  );
}

export function isDocMagicBytes(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 4) return false;
  // Legacy OLE2 DOC (0xD0, 0xCF, 0x11, 0xE0)
  return (
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0
  );
}

export function checkMagicHeader(buffer: Buffer): boolean {
  return (
    isPdfMagicBytes(buffer) ||
    isDocxMagicBytes(buffer) ||
    isDocMagicBytes(buffer)
  );
}

export async function validateFileMagicBytes(
  file: Express.Multer.File,
): Promise<boolean> {
  if (file.buffer && file.buffer.length >= 4) {
    return checkMagicHeader(file.buffer);
  }
  if (file.path && fs.existsSync(file.path)) {
    let fd: fs.promises.FileHandle | null = null;
    try {
      fd = await fs.promises.open(file.path, "r");
      const buf = Buffer.alloc(4);
      const { bytesRead } = await fd.read(buf, 0, 4, 0);
      if (bytesRead < 4) return false;
      return checkMagicHeader(buf);
    } catch {
      return false;
    } finally {
      if (fd) await fd.close();
    }
  }
  return false;
}
