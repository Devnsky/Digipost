import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";
import os from "os";
import { testDatabaseUrl } from "../setup";

let pool: Pool;

describe("NFR-05: Benchmark Kinerja 100.000 Dokumen & Partial Indexing", () => {
  beforeAll(async () => {
    pool = new Pool({ connectionString: testDatabaseUrl });
  });

  afterAll(async () => {
    // Clean up benchmark documents
    await pool.query(`DELETE FROM documents WHERE title LIKE 'BENCHMARK_%'`);
    await pool.end();
  });

  it("Populasi 100.000 data dokumen dan uji performa query daftar kerja (<1 detik)", async () => {
    console.log("=== MEMULAI BENCHMARK NFR-05 ===");
    console.log(
      `Hardware: ${os.type()} ${os.arch()} - CPUs: ${os.cpus().length} - Memory: ${Math.round(os.totalmem() / (1024 * 1024 * 1024))} GB`,
    );

    // 1. Generate 100,000 documents via generate_series
    console.log("Menyisipkan 100.000 baris dokumen...");
    const startInsert = Date.now();
    await pool.query(`
      INSERT INTO documents (
        document_number, title, applicant_id, checker_id, status, review_stage, version, created_at, forwarded_at, decided_at
      )
      SELECT
        'IAC-BNCH-' || i,
        'BENCHMARK_' || i,
        (i % 5) + 1,
        (i % 3) + 1,
        CASE
          WHEN i % 5 = 0 THEN 'pending'::document_status_t
          WHEN i % 5 = 1 THEN 'approved'::document_status_t
          WHEN i % 5 = 2 THEN 'rejected'::document_status_t
          WHEN i % 5 = 3 THEN 'canceled'::document_status_t
          ELSE 'draft'::document_status_t
        END,
        CASE
          WHEN i % 5 = 4 THEN (CASE WHEN i % 2 = 0 THEN 'checker'::review_stage_t ELSE 'applicant'::review_stage_t END)
          ELSE NULL
        END,
        1,
        now() - (i || ' seconds')::interval,
        CASE WHEN i % 5 = 0 THEN now() - (i || ' seconds')::interval ELSE NULL END,
        CASE WHEN i % 5 IN (1, 2, 3) THEN now() - (i || ' seconds')::interval ELSE NULL END
      FROM generate_series(1, 100000) AS s(i);
    `);
    const insertDuration = Date.now() - startInsert;
    console.log(
      `Penyisipan 100.000 dokumen selesai dalam: ${insertDuration} ms`,
    );

    // 2. Run EXPLAIN ANALYZE on My Documents query (filtered by applicant and active)
    const startQuery1 = Date.now();
    const myDocPlan = await pool.query(`
      EXPLAIN ANALYZE
      SELECT id, document_number, title, status, created_at
      FROM documents
      WHERE applicant_id = 1 AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 15 OFFSET 0;
    `);
    const duration1 = Date.now() - startQuery1;
    console.log(`[My Documents Query Plan 100k docs]: ${duration1} ms`);
    console.log(myDocPlan.rows.map((r) => r["QUERY PLAN"]).join("\n"));

    // 3. Run EXPLAIN ANALYZE on Checker Queue query (partial index ix_doc_checker)
    const startQuery2 = Date.now();
    const checkerPlan = await pool.query(`
      EXPLAIN ANALYZE
      SELECT id, document_number, title, status, created_at
      FROM documents
      WHERE checker_id = 1 AND review_stage = 'checker' AND status = 'draft' AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 15 OFFSET 0;
    `);
    const duration2 = Date.now() - startQuery2;
    console.log(`[Checker Queue Query Plan 100k docs]: ${duration2} ms`);
    console.log(checkerPlan.rows.map((r) => r["QUERY PLAN"]).join("\n"));

    // 4. Run EXPLAIN ANALYZE on Pending Documents by Age (partial index ix_doc_pending_age)
    const startQuery3 = Date.now();
    const pendingAgePlan = await pool.query(`
      EXPLAIN ANALYZE
      SELECT id, document_number, title, forwarded_at
      FROM documents
      WHERE status = 'pending' AND deleted_at IS NULL
      ORDER BY forwarded_at ASC
      LIMIT 15 OFFSET 0;
    `);
    const duration3 = Date.now() - startQuery3;
    console.log(`[Pending Age Query Plan 100k docs]: ${duration3} ms`);
    console.log(pendingAgePlan.rows.map((r) => r["QUERY PLAN"]).join("\n"));

    // Verifikasi target SRS NFR-05: respons harus kurang dari 1.000 ms (< 1 detik)
    expect(duration1).toBeLessThan(1000);
    expect(duration2).toBeLessThan(1000);
    expect(duration3).toBeLessThan(1000);
    console.log(
      `=== BENCHMARK NFR-05 SELESAI DENGAN SUKSES: seluruh kueri respons < ${Math.max(duration1, duration2, duration3)} ms (< 1 detik) ===`,
    );
  }, 30000); // 30s timeout
});
