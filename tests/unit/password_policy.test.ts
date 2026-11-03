import { describe, it, expect } from "vitest";
import { validatePasswordPolicy } from "../../apps/api/src/modules/auth/auth.service";

describe("Password Policy Unit Tests", () => {
  it("menolak password yang kurang dari 10 karakter", () => {
    const res = validatePasswordPolicy("Short1!", "user123");
    expect(res.valid).toBe(false);
    expect(res.message).toContain("minimal 10 karakter");
  });

  it("menolak password yang kosong atau undefined", () => {
    const res = validatePasswordPolicy("", "user123");
    expect(res.valid).toBe(false);
    expect(res.message).toContain("minimal 10 karakter");
  });

  it("menolak password yang hanya mengandung huruf tanpa angka", () => {
    const res = validatePasswordPolicy("OnlyLettersLongPassword", "user123");
    expect(res.valid).toBe(false);
    expect(res.message).toContain("mengandung huruf dan angka");
  });

  it("menolak password yang hanya mengandung angka tanpa huruf", () => {
    const res = validatePasswordPolicy("1234567890123", "user123");
    expect(res.valid).toBe(false);
    expect(res.message).toContain("mengandung huruf dan angka");
  });

  it("menolak password yang sama persis dengan username (case-insensitive)", () => {
    const res = validatePasswordPolicy("MySuperSecret123", "mysupersecret123");
    expect(res.valid).toBe(false);
    expect(res.message).toContain("tidak boleh sama dengan username");
  });

  it("menerima password yang memenuhi seluruh kriteria", () => {
    const res = validatePasswordPolicy("SecurePassword123", "assistant_user");
    expect(res.valid).toBe(true);
    expect(res.message).toBeUndefined();
  });
});
