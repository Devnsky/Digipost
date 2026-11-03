import { describe, it, expect } from "vitest";
import {
  formatNumber,
  formatDate,
  formatDateTime,
  getFirstName,
  formatFileSize,
} from "../../apps/web/src/lib/formatters";

describe("Web Formatters Unit Tests", () => {
  it("formatNumber memformat angka dengan leading zero untuk nilai < 10", () => {
    expect(formatNumber(0)).toBe("00");
    expect(formatNumber(7)).toBe("07");
    expect(formatNumber(10)).toBe("10");
    expect(formatNumber(42)).toBe("42");
    expect(formatNumber(undefined)).toBe("00");
  });

  it("getFirstName mengambil kata pertama dari nama lengkap pengguna", () => {
    expect(getFirstName("John Doe")).toBe("John");
    expect(getFirstName("Ahmad Fauzi Rahman")).toBe("Ahmad");
    expect(getFirstName("Sarah")).toBe("Sarah");
    expect(getFirstName("")).toBe("");
    expect(getFirstName(undefined)).toBe("");
  });

  it("formatFileSize mengonversi byte ke ukuran human-readable yang tepat", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(500)).toBe("500 B");
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(1048576)).toBe("1.0 MB");
    expect(formatFileSize(25 * 1024 * 1024)).toBe("25.0 MB");
  });

  it("formatDate dan formatDateTime menangani tanggal kosong secara aman", () => {
    expect(formatDate(undefined)).toBe("-");
    expect(formatDate("")).toBe("-");
    expect(formatDateTime(undefined)).toBe("-");
    expect(formatDateTime("")).toBe("-");
  });

  it("formatDate menghasilkan tanggal format Indonesia", () => {
    const formatted = formatDate("2026-05-15T08:00:00Z");
    expect(formatted).toContain("15");
    expect(formatted).toContain("2026");
  });
});
