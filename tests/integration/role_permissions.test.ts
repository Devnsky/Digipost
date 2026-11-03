import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { Pool } from "pg";
import { createApp } from "../../apps/api/src/server";
import { runMigrations, runSeed } from "../../database/runner";
import { testDatabaseUrl } from "../setup";

let pool: Pool;
let app: any;

describe("RBAC Permissions: Assistant Exclusivity for Document Creation & Submission", () => {
  let assistantCookie: string;
  let checkerCookie: string;
  let managerCookie: string;
  let _assistantId: number;
  let _checkerId: number;
  let _managerId: number;
  let hrDeptId: number;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    pool = new Pool({ connectionString: testDatabaseUrl });
    await runMigrations(pool);
    await runSeed(pool);
    app = createApp();

    // Login as ani.assistant (Assistant IT)
    const asstRes = await request(app)
      .post("/api/auth/login")
      .send({ username: "ani.assistant", password: "Password123!" });
    expect(asstRes.status).toBe(200);
    assistantCookie = asstRes.headers["set-cookie"][0];
    _assistantId = asstRes.body.user.id;

    // Login as andi.checker (Checker IT)
    const chkRes = await request(app)
      .post("/api/auth/login")
      .send({ username: "andi.checker", password: "Password123!" });
    expect(chkRes.status).toBe(200);
    checkerCookie = chkRes.headers["set-cookie"][0];
    _checkerId = chkRes.body.user.id;

    // Login as budi.manager (Dept Manager IT)
    const mgrRes = await request(app)
      .post("/api/auth/login")
      .send({ username: "budi.manager", password: "Password123!" });
    expect(mgrRes.status).toBe(200);
    managerCookie = mgrRes.headers["set-cookie"][0];
    _managerId = mgrRes.body.user.id;

    const deptRes = await pool.query(
      "SELECT id FROM departments WHERE code = 'HR'",
    );
    hrDeptId = deptRes.rows[0].id;
  });

  afterAll(async () => {
    await pool.end();
  });

  it("Assistant CAN create a new document draft", async () => {
    const res = await request(app)
      .post("/api/documents")
      .set("Cookie", assistantCookie)
      .field("title", "Dokumen Uji Assistant Role")
      .field("description", "Pengujian pembuatan dokumen khusus Assistant")
      .field("department_ids", JSON.stringify([hrDeptId]))
      .attach("file", Buffer.from("%PDF-1.4 sample content"), "test_asst.pdf");

    expect(res.status).toBe(201);
    expect(res.body.document).toBeDefined();
    expect(res.body.document.id).toBeDefined();
    expect(res.body.document.version).toBe(1);
  });

  it("Checker is REJECTED (403 Forbidden) when attempting to create a document draft", async () => {
    const res = await request(app)
      .post("/api/documents")
      .set("Cookie", checkerCookie)
      .field("title", "Dokumen Ilegal Checker")
      .field("description", "Checker tidak boleh membuat dokumen")
      .field("department_ids", JSON.stringify([hrDeptId]))
      .attach("file", Buffer.from("%PDF-1.4 sample content"), "test_chk.pdf");

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("FORBIDDEN_ROLE");
    expect(res.body.error).toMatch(/Assistant/i);
  });

  it("Dept Manager is REJECTED (403 Forbidden) when attempting to create a document draft", async () => {
    const res = await request(app)
      .post("/api/documents")
      .set("Cookie", managerCookie)
      .field("title", "Dokumen Ilegal Manager")
      .field("description", "Manager tidak boleh membuat dokumen")
      .field("department_ids", JSON.stringify([hrDeptId]))
      .attach("file", Buffer.from("%PDF-1.4 sample content"), "test_mgr.pdf");

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("FORBIDDEN_ROLE");
    expect(res.body.error).toMatch(/Assistant/i);
  });

  it("Manager is REJECTED (403 Forbidden) when attempting to submit any document draft", async () => {
    const createRes = await request(app)
      .post("/api/documents")
      .set("Cookie", assistantCookie)
      .field("title", "Dokumen Submit Guard Test")
      .field("department_ids", JSON.stringify([hrDeptId]))
      .attach("file", Buffer.from("%PDF-1.4 sample content"), "test_sub.pdf");
    const docId = createRes.body.document.id;

    // Manager attempts to submit
    const submitRes = await request(app)
      .post(`/api/documents/${docId}/submit`)
      .set("Cookie", managerCookie)
      .send({});

    expect(submitRes.status).toBe(403);
    expect(submitRes.body.code).toBe("FORBIDDEN_ROLE");
  });

  it("Manager is REJECTED (403 Forbidden) when attempting to delete any document draft", async () => {
    const createRes = await request(app)
      .post("/api/documents")
      .set("Cookie", assistantCookie)
      .field("title", "Dokumen Delete Guard Test")
      .field("department_ids", JSON.stringify([hrDeptId]))
      .attach("file", Buffer.from("%PDF-1.4 sample content"), "test_del.pdf");
    const docId = createRes.body.document.id;

    const delRes = await request(app)
      .delete(`/api/documents/${docId}`)
      .set("Cookie", managerCookie);

    expect(delRes.status).toBe(403);
    expect(delRes.body.code).toBe("FORBIDDEN_ROLE");
  });

  it("Manager is REJECTED (403 Forbidden) when attempting to cancel any pending document", async () => {
    const createRes = await request(app)
      .post("/api/documents")
      .set("Cookie", assistantCookie)
      .field("title", "Dokumen Cancel Guard Test")
      .field("department_ids", JSON.stringify([hrDeptId]))
      .attach("file", Buffer.from("%PDF-1.4 sample content"), "test_can.pdf");
    const docId = createRes.body.document.id;

    const cancelRes = await request(app)
      .post(`/api/documents/${docId}/cancel`)
      .set("Cookie", managerCookie)
      .send({ reason: "Batal oleh manager" });

    expect(cancelRes.status).toBe(403);
    expect(cancelRes.body.code).toBe("FORBIDDEN_ROLE");
  });

  it("Manager stats and department queue do NOT leak draft documents not assigned to them", async () => {
    // 1. Create a draft by assistant with review_stage = 'applicant'
    const draftRes = await request(app)
      .post("/api/documents")
      .set("Cookie", assistantCookie)
      .field("title", "Draft Rahasia Pemohon Belum Diajukan")
      .field("department_ids", JSON.stringify([hrDeptId]))
      .attach(
        "file",
        Buffer.from("%PDF-1.4 sample content"),
        "test_secret.pdf",
      );
    const unsubmittedId = draftRes.body.document.id;

    // 2. Query manager's department queue
    const queueRes = await request(app)
      .get("/api/documents/department-queue")
      .set("Cookie", managerCookie);

    expect(queueRes.status).toBe(200);
    const leakedDoc = queueRes.body.items.find(
      (d: any) => d.id === unsubmittedId,
    );
    expect(leakedDoc).toBeUndefined();

    // 3. Query manager stats
    const statsRes = await request(app)
      .get("/api/documents/stats")
      .set("Cookie", managerCookie);

    expect(statsRes.status).toBe(200);
    expect(statsRes.body.managerStats).toBeDefined();
  });
});
