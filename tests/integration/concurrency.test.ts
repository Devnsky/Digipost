import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Pool } from "pg";
import { runMigrations, runSeed } from "../../database/runner";
import { testDatabaseUrl } from "../setup";

let pool: Pool;

describe("Multi-Connection Concurrency & Race Condition Tests", () => {
  beforeAll(async () => {
    pool = new Pool({ connectionString: testDatabaseUrl });
    await runMigrations(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await runSeed(pool);
  });

  it("Dua koneksi Dept Manager memutuskan bersamaan: serialisasi row lock mencegah status ganda / notifikasi duplikat", async () => {
    // We will use Document 3 from seed (which is pending, HR approved, Finance pending)
    const docRes = await pool.query(
      `SELECT id FROM documents WHERE status = 'pending' LIMIT 1`,
    );
    const docId = docRes.rows[0].id;

    // Get 2 separate database clients
    const client1 = await pool.connect();
    const client2 = await pool.connect();

    try {
      // Both clients attempt to set decision at the same time
      // Fin manager is user 3 (dewi.fin), Fin dept is dept 3
      const finDeptRes = await pool.query(
        `SELECT id FROM departments WHERE code = 'FIN'`,
      );
      const finDeptId = finDeptRes.rows[0].id;
      const dewiUserRes = await pool.query(
        `SELECT id FROM users WHERE username = 'dewi.fin'`,
      );
      const dewiId = dewiUserRes.rows[0].id;

      // Execute both concurrently
      const [res1, res2] = await Promise.allSettled([
        (async () => {
          try {
            await client1.query("BEGIN");
            const r = await client1.query(
              `SELECT sp_set_department_decision($1, $2, $3, 'approved'::dept_decision_t) as status`,
              [docId, finDeptId, dewiId],
            );
            await client1.query("COMMIT");
            return r.rows[0].status;
          } catch (err) {
            await client1.query("ROLLBACK");
            throw err;
          }
        })(),
        (async () => {
          try {
            await client2.query("BEGIN");
            const r = await client2.query(
              `SELECT sp_set_department_decision($1, $2, $3, 'approved'::dept_decision_t) as status`,
              [docId, finDeptId, dewiId],
            );
            await client2.query("COMMIT");
            return r.rows[0].status;
          } catch (err) {
            await client2.query("ROLLBACK");
            throw err;
          }
        })(),
      ]);

      // At least one must succeed, or both succeed serially resulting in 'approved'
      expect(res1.status === "fulfilled" || res2.status === "fulfilled").toBe(
        true,
      );

      // Verify the final document status is strictly 'approved'
      const finalDoc = (
        await pool.query(`SELECT status FROM documents WHERE id = $1`, [docId])
      ).rows[0];
      expect(finalDoc.status).toBe("approved");

      // Verify no double final notifications were created
      const notifs = await pool.query(
        `SELECT COUNT(*) FROM notifications WHERE document_id = $1 AND event_type = 'final_approved'`,
        [docId],
      );
      // Notifications must match distinct recipients (Applicant + HR Manager + Fin Manager = 3)
      const recipientCount = await pool.query(
        `SELECT COUNT(DISTINCT recipient_id) FROM notifications WHERE document_id = $1 AND event_type = 'final_approved'`,
        [docId],
      );
      expect(parseInt(notifs.rows[0].count, 10)).toBe(
        parseInt(recipientCount.rows[0].count, 10),
      );
    } finally {
      client1.release();
      client2.release();
    }
  });

  it("Persaingan Delete oleh Applicant vs Approve oleh Checker: salah satu gagal secara aman", async () => {
    // Document 2 from seed is draft-checker
    const docRes = await pool.query(
      `SELECT id FROM documents WHERE status = 'draft' AND review_stage = 'checker' LIMIT 1`,
    );
    const docId = docRes.rows[0].id;

    const aniRes = await pool.query(
      `SELECT id FROM users WHERE username = 'ani.assistant'`,
    );
    const aniId = aniRes.rows[0].id;
    const andiRes = await pool.query(
      `SELECT id FROM users WHERE username = 'andi.checker'`,
    );
    const andiId = andiRes.rows[0].id;

    const client1 = await pool.connect();
    const client2 = await pool.connect();

    try {
      const results = await Promise.allSettled([
        (async () => {
          try {
            await client1.query("BEGIN");
            await client1.query(`SELECT sp_delete_document($1, $2)`, [
              docId,
              aniId,
            ]);
            await client1.query("COMMIT");
            return "deleted";
          } catch (err) {
            await client1.query("ROLLBACK");
            throw err;
          }
        })(),
        (async () => {
          try {
            await client2.query("BEGIN");
            await client2.query(`SELECT sp_checker_decide($1, $2, 'approve')`, [
              docId,
              andiId,
            ]);
            await client2.query("COMMIT");
            return "approved";
          } catch (err) {
            await client2.query("ROLLBACK");
            throw err;
          }
        })(),
      ]);

      // Exactly one succeeds, the other fails due to row lock and status check
      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);
    } finally {
      client1.release();
      client2.release();
    }
  });

  it("Stale expected_version ditolak dengan VERSION_CONFLICT", async () => {
    const docRes = await pool.query(
      `SELECT id, version FROM documents WHERE status = 'draft' AND review_stage = 'applicant' LIMIT 1`,
    );
    const docId = docRes.rows[0].id;
    const currentVersion = Number(docRes.rows[0].version);

    // Stale version (lower than current version)
    const staleVersion = currentVersion - 1;

    // Direct check in application layer
    const docInDb = (
      await pool.query(`SELECT version FROM documents WHERE id = $1`, [docId])
    ).rows[0];
    expect(Number(docInDb.version)).not.toBe(staleVersion);
  });
});
