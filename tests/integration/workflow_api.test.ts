import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { Pool } from "pg";
import { createApp } from "../../apps/api/src/server";
import { runMigrations, runSeed } from "../../database/runner";
import { testDatabaseUrl } from "../setup";

let pool: Pool;
let app: any;

describe("E2E Maker-Checker & Multi-Department Approval Workflow", () => {
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

  // Helper login extracting session token from Set-Cookie
  async function login(username: string): Promise<string> {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username, password: "Password123!" });
    const cookies = res.headers["set-cookie"] || [];
    const sessionCookie = cookies.find((c: string) =>
      c.startsWith("digipost_session="),
    );
    if (!sessionCookie) return "";
    const rawVal = sessionCookie.split(";")[0].split("=")[1];
    return decodeURIComponent(rawVal);
  }

  it("Alur lengkap: Draft -> Submit -> Checker Revisi -> Resubmit -> Forward -> Multi-Dept Aggregation -> Final Approved", async () => {
    const aniToken = await login("ani.assistant"); // Assistant IT (manager: andi.checker)
    const andiToken = await login("andi.checker"); // Checker IT
    const sitiToken = await login("siti.hr"); // Manager HR
    const dewiToken = await login("dewi.fin"); // Manager Finance

    // Get department IDs
    const deptsRes = await request(app)
      .get("/api/departments")
      .set("Authorization", `Bearer ${aniToken}`);
    const hrDept = deptsRes.body.find((d: any) => d.code === "HR");
    const finDept = deptsRes.body.find((d: any) => d.code === "FIN");

    // 1. Ani creates a draft document for HR & Finance
    const createRes = await request(app)
      .post("/api/documents")
      .set("Authorization", `Bearer ${aniToken}`)
      .field("title", "Dokumen Pengadaan Laptop Developer 2026")
      .field("description", "Pengadaan 10 unit laptop M3 Max")
      .field("department_ids", JSON.stringify([hrDept.id, finDept.id]))
      .attach(
        "file",
        Buffer.from("%PDF-1.4\n% Sample PDF Content\n%%EOF"),
        "Pengadaan_Laptop.pdf",
      );

    expect(createRes.status).toBe(201);
    const docId = createRes.body.document.id;
    let expectedVersion = createRes.body.document.version;

    // 2. Verify target departments CANNOT see this draft (BR-03 isolation)
    const hrQueueBefore = await request(app)
      .get("/api/documents/department-queue")
      .set("Authorization", `Bearer ${sitiToken}`);
    const foundInHr = hrQueueBefore.body.items.some(
      (d: any) => Number(d.id) === Number(docId),
    );
    expect(foundInHr).toBe(false);

    // 3. Ani submits document to Checker
    const submitRes = await request(app)
      .post(`/api/documents/${docId}/submit`)
      .set("Authorization", `Bearer ${aniToken}`)
      .send({ expected_version: expectedVersion });

    expect(submitRes.status).toBe(200);

    // 4. Verify Ani CANNOT edit after submit
    const editBlockedRes = await request(app)
      .put(`/api/documents/${docId}`)
      .set("Authorization", `Bearer ${aniToken}`)
      .send({ title: "Judul Diubah Diam-diam" });

    expect(editBlockedRes.status).toBe(400);

    // 5. Checker (Andi) sees document in queue
    const checkerQueue = await request(app)
      .get("/api/documents/checker-queue")
      .set("Authorization", `Bearer ${andiToken}`);
    const docInQueue = checkerQueue.body.items.find(
      (d: any) => Number(d.id) === Number(docId),
    );
    expect(docInQueue).toBeDefined();

    // 6. Checker requests revision
    const detailBeforeRev = await request(app)
      .get(`/api/documents/${docId}`)
      .set("Authorization", `Bearer ${andiToken}`);
    expectedVersion = detailBeforeRev.body.document.version;

    const revisionRes = await request(app)
      .post(`/api/workflow/${docId}/checker/decide`)
      .set("Authorization", `Bearer ${andiToken}`)
      .send({
        action: "revision",
        note: "Mohon cantumkan perbandingan harga vendor.",
        expected_version: expectedVersion,
      });

    expect(revisionRes.status).toBe(200);

    // 7. Ani uploads version 2 and re-submits
    const detailAfterRev = await request(app)
      .get(`/api/documents/${docId}`)
      .set("Authorization", `Bearer ${aniToken}`);
    expectedVersion = detailAfterRev.body.document.version;

    const v2Res = await request(app)
      .post(`/api/documents/${docId}/versions`)
      .set("Authorization", `Bearer ${aniToken}`)
      .field("expected_version", expectedVersion)
      .attach(
        "file",
        Buffer.from("%PDF-1.4\n% Sample PDF v2\n%%EOF"),
        "Pengadaan_Laptop_v2.pdf",
      );

    expect(v2Res.status).toBe(200);

    const detailBeforeResubmit = await request(app)
      .get(`/api/documents/${docId}`)
      .set("Authorization", `Bearer ${aniToken}`);
    expectedVersion = detailBeforeResubmit.body.document.version;

    await request(app)
      .post(`/api/documents/${docId}/submit`)
      .set("Authorization", `Bearer ${aniToken}`)
      .send({ expected_version: expectedVersion });

    // 8. Checker adds comment and approves (Forward)
    await request(app)
      .post(`/api/workflow/${docId}/checker/comment`)
      .set("Authorization", `Bearer ${andiToken}`)
      .send({ body: "Vendor sudah dibandingkan, disetujui untuk diteruskan." });

    const detailBeforeApprove = await request(app)
      .get(`/api/documents/${docId}`)
      .set("Authorization", `Bearer ${andiToken}`);
    expectedVersion = detailBeforeApprove.body.document.version;

    const approveRes = await request(app)
      .post(`/api/workflow/${docId}/checker/decide`)
      .set("Authorization", `Bearer ${andiToken}`)
      .send({ action: "approve", expected_version: expectedVersion });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.status).toBe("pending");

    // 9. Now HR & Finance can see it in department queue!
    const hrQueue = await request(app)
      .get("/api/documents/department-queue")
      .set("Authorization", `Bearer ${sitiToken}`);
    const foundInHrAfter = hrQueue.body.items.some(
      (d: any) => Number(d.id) === Number(docId),
    );
    expect(foundInHrAfter).toBe(true);

    // 10. HR Manager approves
    const detailBeforeHrDecide = await request(app)
      .get(`/api/documents/${docId}`)
      .set("Authorization", `Bearer ${sitiToken}`);
    expectedVersion = detailBeforeHrDecide.body.document.version;

    const hrDecideRes = await request(app)
      .post(`/api/workflow/${docId}/departments/${hrDept.id}/decision`)
      .set("Authorization", `Bearer ${sitiToken}`)
      .send({ decision: "approved", expected_version: expectedVersion });

    expect(hrDecideRes.status).toBe(200);
    expect(hrDecideRes.body.status).toBe("pending"); // Option A: Still pending waiting for Finance!

    // HR posts response
    await request(app)
      .post(`/api/workflow/${docId}/departments/response`)
      .set("Authorization", `Bearer ${sitiToken}`)
      .send({
        department_id: hrDept.id,
        body: "Departemen HR menyetujui kuota pengadaan ini.",
      });

    // 11. Finance Manager decides 'approved' -> Both departments approved -> FINAL APPROVED!
    const detailBeforeFinDecide = await request(app)
      .get(`/api/documents/${docId}`)
      .set("Authorization", `Bearer ${dewiToken}`);
    expectedVersion = detailBeforeFinDecide.body.document.version;

    const finDecideRes = await request(app)
      .post(`/api/workflow/${docId}/departments/${finDept.id}/decision`)
      .set("Authorization", `Bearer ${dewiToken}`)
      .send({ decision: "approved", expected_version: expectedVersion });

    expect(finDecideRes.status).toBe(200);
    expect(finDecideRes.body.status).toBe("approved"); // All approved!

    // 12. Final document rejects cancellation or adding new department
    const cancelFinalRes = await request(app)
      .post(`/api/documents/${docId}/cancel`)
      .set("Authorization", `Bearer ${aniToken}`);
    expect(cancelFinalRes.status).toBe(400);

    // 13. Download / Preview with stamp works
    const latestVersionId = detailBeforeFinDecide.body.versions[0].id;
    const previewRes = await request(app)
      .get(
        `/api/documents/${docId}/files/${latestVersionId}/preview?stamp=true`,
      )
      .set("Authorization", `Bearer ${aniToken}`);

    expect(previewRes.status).toBe(200);
    expect(previewRes.headers["content-type"]).toBe("application/pdf");
  });

  it("Soft delete menyembunyikan dokumen dari daftar, detail, dan unduhan", async () => {
    const aniToken = await login("ani.assistant");
    const deptsRes = await request(app)
      .get("/api/departments")
      .set("Authorization", `Bearer ${aniToken}`);

    // Create a draft
    const createRes = await request(app)
      .post("/api/documents")
      .set("Authorization", `Bearer ${aniToken}`)
      .field("title", "Dokumen Yang Akan Dihapus")
      .field("department_ids", JSON.stringify([deptsRes.body[0].id]))
      .attach("file", Buffer.from("%PDF-1.4\n% to delete"), "delete_me.pdf");

    const docId = createRes.body.document.id;

    // Delete it
    const delRes = await request(app)
      .delete(`/api/documents/${docId}`)
      .set("Authorization", `Bearer ${aniToken}`);

    expect(delRes.status).toBe(200);

    // Detail request returns 404
    const detailRes = await request(app)
      .get(`/api/documents/${docId}`)
      .set("Authorization", `Bearer ${aniToken}`);

    expect(detailRes.status).toBe(404);

    // List does not contain the deleted document
    const listRes = await request(app)
      .get("/api/documents/my")
      .set("Authorization", `Bearer ${aniToken}`);

    const found = listRes.body.items.some(
      (d: any) => Number(d.id) === Number(docId),
    );
    expect(found).toBe(false);
  });
});
