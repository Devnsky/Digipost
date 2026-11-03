import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { Pool } from "pg";
import { createApp } from "../../apps/api/src/server";
import { runMigrations, runSeed } from "../../database/runner";
import { testDatabaseUrl } from "../setup";

let pool: Pool;
let app: any;

describe("Auth & Session API Integration Tests", () => {
  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.DATABASE_URL = testDatabaseUrl;
    pool = new Pool({ connectionString: testDatabaseUrl });
    await runMigrations(pool);
    await runSeed(pool);
    app = createApp();
  });

  afterAll(async () => {
    await pool.end();
  });

  function getSessionCookie(res: any): string {
    const cookies = res.headers["set-cookie"] || [];
    return (
      cookies.find((c: string) => c.startsWith("digipost_session=")) || ""
    );
  }

  it("Login sukses menghasilkan cookie HttpOnly dan sesi valid", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "ani.assistant", password: "Password123!" });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.username).toBe("ani.assistant");
    expect(res.body.token).toBeUndefined();

    // Check Set-Cookie
    const sessionCookie = getSessionCookie(res);
    expect(sessionCookie).toBeTruthy();

    // Call /api/auth/me with the session cookie
    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Cookie", sessionCookie);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.username).toBe("ani.assistant");
  });

  it("Login dengan password salah memberikan pesan generik dan mencatat di login_attempts", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "ani.assistant", password: "WrongPassword999!" });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain("Username atau password salah");

    const logRes = await pool.query(
      `SELECT * FROM login_attempts WHERE username_input = 'ani.assistant' AND success = FALSE ORDER BY attempted_at DESC LIMIT 1`,
    );
    expect(logRes.rowCount).toBe(1);
    expect(logRes.rows[0].failure_reason).toBe("wrong_password");
  });

  it("Pengguna dengan must_change_password diblokir dari endpoint workflow", async () => {
    // Rudi Pemula has must_change_password = true
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ username: "rudi.new", password: "Password123!" });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.must_change_password).toBe(true);
    const cookie = getSessionCookie(loginRes);

    // Try accessing documents endpoint
    const docRes = await request(app)
      .get("/api/documents/my")
      .set("Cookie", cookie);

    expect(docRes.status).toBe(403);
    expect(docRes.body.code).toBe("MUST_CHANGE_PASSWORD");
  });

  it("Akun nonaktif ditolak login", async () => {
    // doni.inactive is inactive
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "doni.inactive", password: "Password123!" });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("ACCOUNT_INACTIVE");
  });

  it("Server mengabaikan klaim aktor palsu dari parameter request", async () => {
    // Login as ani.assistant (id: 7 in seed)
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ username: "ani.assistant", password: "Password123!" });

    const cookie = getSessionCookie(loginRes);

    // Try creating document passing a spoofed actor_id or applicant_id = 1 (Budi Manager)
    const createRes = await request(app)
      .post("/api/documents")
      .set("Cookie", cookie)
      .field("title", "Dokumen Uji Spoofing Aktor")
      .field("description", "Mencoba memalsukan identitas aktor")
      .field("applicant_id", "1") // Spoofed!
      .field("actor_id", "1") // Spoofed!
      .attach("file", Buffer.from("%PDF-1.4 sample"), "test_spoof.pdf");

    expect(createRes.status).toBe(201);
    const docId = createRes.body.document.id;

    // Check who was actually recorded as applicant_id in the database:
    const docInDb = (
      await pool.query("SELECT applicant_id FROM documents WHERE id = $1", [
        docId,
      ])
    ).rows[0];
    expect(Number(docInDb.applicant_id)).toBe(loginRes.body.user.id); // Must be Ani, NOT Budi!
  });

  it("Logout mencabut sesi aktif", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ username: "ani.assistant", password: "Password123!" });

    const cookie = getSessionCookie(loginRes);

    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookie);

    expect(logoutRes.status).toBe(200);

    // Call /me after logout should return 401
    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Cookie", cookie);

    expect(meRes.status).toBe(401);
  });
});
