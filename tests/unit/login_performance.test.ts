import { describe, it, expect, vi, beforeEach } from "vitest";
import * as authService from "../../apps/api/src/modules/auth/auth.service";
import * as db from "../../apps/api/src/db";
import argon2 from "argon2";

vi.mock("../../apps/api/src/db", () => ({
  query: vi.fn(),
}));

describe("Login Performance & DoS Protection Unit Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("melewati eksekusi argon2.verify jika akun ditemukan namun sedang berstatus terkunci (locked_until > now)", async () => {
    const futureLockedTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const mockLockedUser = {
      id: 99,
      username: "user.locked",
      password_hash: "$argon2id$mockedhash",
      is_active: true,
      locked_until: futureLockedTime,
    };

    const queryMock = vi.mocked(db.query);
    // 1. SELECT user
    queryMock.mockResolvedValueOnce({
      rows: [mockLockedUser],
      rowCount: 1,
    } as any);

    // 2. sp_register_login_attempt returns 'locked'
    queryMock.mockResolvedValueOnce({
      rows: [{ result: "locked" }],
      rowCount: 1,
    } as any);

    const argonSpy = vi.spyOn(argon2, "verify");

    await expect(
      authService.login("user.locked", "Password123!"),
    ).rejects.toThrow("Username atau password salah.");

    // Verifikasi kritis: argon2.verify TIDAK dipanggil sama sekali untuk user terkunci
    expect(argonSpy).not.toHaveBeenCalled();
  });

  it("melewati eksekusi argon2.verify jika akun ditemukan namun berstatus nonaktif (is_active = FALSE)", async () => {
    const mockInactiveUser = {
      id: 98,
      username: "user.inactive",
      password_hash: "$argon2id$mockedhash",
      is_active: false,
      locked_until: null,
    };

    const queryMock = vi.mocked(db.query);
    queryMock.mockResolvedValueOnce({
      rows: [mockInactiveUser],
      rowCount: 1,
    } as any);

    queryMock.mockResolvedValueOnce({
      rows: [{ result: "inactive" }],
      rowCount: 1,
    } as any);

    const argonSpy = vi.spyOn(argon2, "verify");

    await expect(
      authService.login("user.inactive", "Password123!"),
    ).rejects.toThrow("Username atau password salah.");

    // Verifikasi kritis: argon2.verify TIDAK dipanggil sama sekali untuk user nonaktif
    expect(argonSpy).not.toHaveBeenCalled();
  });

  it("menjalankan argon2.verify jika akun berstatus aktif dan tidak terkunci", async () => {
    const mockActiveUser = {
      id: 1,
      username: "user.active",
      password_hash: "$argon2id$mockedhash",
      is_active: true,
      locked_until: null,
      employee_no: "EMP001",
      full_name: "User Active",
      email: "active@digipost.local",
      department_id: 1,
      department_name: "IT",
      must_change_password: false,
      role: "assistant",
    };

    const queryMock = vi.mocked(db.query);
    queryMock.mockResolvedValueOnce({
      rows: [mockActiveUser],
      rowCount: 1,
    } as any);

    queryMock.mockResolvedValueOnce({
      rows: [{ result: "ok" }],
      rowCount: 1,
    } as any);

    queryMock.mockResolvedValueOnce({
      rows: [{ session_id: "mock-session-uuid" }],
      rowCount: 1,
    } as any);

    const argonSpy = vi.spyOn(argon2, "verify").mockResolvedValueOnce(true);

    const res = await authService.login("user.active", "Password123!");
    expect(res.user.id).toBe(1);
    expect(argonSpy).toHaveBeenCalledWith("$argon2id$mockedhash", "Password123!");
  });
});

