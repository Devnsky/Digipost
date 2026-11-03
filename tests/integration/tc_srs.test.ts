import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";
import argon2 from "argon2";
import crypto from "crypto";
import { testDatabaseUrl } from "../setup";

let pool: Pool;

describe("TC-01 s.d. TC-26: SRS Verifikasi Skema dan Alur Approval", () => {
  beforeAll(async () => {
    pool = new Pool({ connectionString: testDatabaseUrl });
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Reset test database to clean state
    await pool.query(
      "TRUNCATE notifications, responses, decision_history, document_departments, document_versions, approval_logs, documents, password_reset_tokens, login_attempts, user_sessions CASCADE",
    );
    await pool.query(
      "ALTER TABLE departments DROP CONSTRAINT IF EXISTS fk_dept_manager",
    );
    await pool.query("TRUNCATE users, departments RESTART IDENTITY CASCADE");
    await pool.query(
      "ALTER TABLE departments ADD CONSTRAINT fk_dept_manager FOREIGN KEY (manager_id) REFERENCES users(id)",
    );

    // Common password hash
    const passHash = await argon2.hash("Password123!", {
      type: argon2.argon2id,
    });

    // Insert departments
    await pool.query(`
      INSERT INTO departments (code, name) VALUES
        ('IT', 'Information Technology'),
        ('HR', 'Human Resources'),
        ('FIN', 'Finance');
    `);

    // Insert users:
    // 1: Top IT Manager (budi)
    // 2: HR Manager (siti)
    // 3: Finance Manager (dewi)
    // 4: Lead IT / Checker (andi) -> manager: budi (1)
    // 5: Staff IT / Assistant (ani) -> manager: andi (4)
    await pool.query(`
      INSERT INTO users (employee_no, full_name, email, department_id, manager_id, is_active, username, password_hash) VALUES
        ('EMP001', 'Budi Santoso', 'budi@test.local', 1, NULL, TRUE, 'budi', '${passHash}'),
        ('EMP002', 'Siti Rahma', 'siti@test.local', 2, NULL, TRUE, 'siti', '${passHash}'),
        ('EMP003', 'Dewi Lestari', 'dewi@test.local', 3, NULL, TRUE, 'dewi', '${passHash}'),
        ('EMP004', 'Andi Pratama', 'andi@test.local', 1, 1, TRUE, 'andi', '${passHash}'),
        ('EMP005', 'Ani Wijaya', 'ani@test.local', 1, 4, TRUE, 'ani', '${passHash}');
    `);

    // Update departments manager_id
    await pool.query("UPDATE departments SET manager_id = 1 WHERE code = $1", [
      "IT",
    ]);
    await pool.query("UPDATE departments SET manager_id = 2 WHERE code = $1", [
      "HR",
    ]);
    await pool.query("UPDATE departments SET manager_id = 3 WHERE code = $1", [
      "FIN",
    ]);
  });

  // Helper to create a draft document for Ani (id: 5)
  async function createDraftDoc(applicantId = 5, deptIds = [2, 3]) {
    const res = await pool.query(
      `
      INSERT INTO documents (title, applicant_id, status, review_stage, version)
      VALUES ('Proposal Dokumen Test', $1, 'draft', 'applicant', 1)
      RETURNING id, version;
    `,
      [applicantId],
    );
    const docId = res.rows[0].id;

    // Insert 1 version file
    await pool.query(
      `
      INSERT INTO document_versions (document_id, version_no, file_name, file_path, uploaded_by)
      VALUES ($1, 1, 'test.pdf', '/tmp/test.pdf', $2);
    `,
      [docId, applicantId],
    );

    // Insert intended departments
    for (const dId of deptIds) {
      await pool.query(
        `
        INSERT INTO document_departments (document_id, department_id, added_by)
        VALUES ($1, $2, $3);
      `,
        [docId, dId, applicantId],
      );
    }

    return docId;
  }

  // --- WORKFLOW TESTS (TC-01 s.d. TC-13) ---

  it("TC-01: Applicant submit; Checker komentar; Checker approve", async () => {
    const docId = await createDraftDoc();

    // Applicant submit
    await pool.query(`SELECT sp_submit_document($1, 5)`, [docId]);

    // Checker komentar
    await pool.query(
      `SELECT sp_checker_comment($1, 4, 'Catatan awal checker')`,
      [docId],
    );

    // Checker approve
    const approveRes = await pool.query(
      `SELECT sp_checker_decide($1, 4, 'approve') as result`,
      [docId],
    );
    expect(approveRes.rows[0].result).toBe("pending");

    const doc = (
      await pool.query(`SELECT * FROM documents WHERE id = $1`, [docId])
    ).rows[0];
    expect(doc.status).toBe("pending");
    expect(doc.review_stage).toBeNull();

    // Komentar checker harus visible_to_dept = TRUE
    const resp = (
      await pool.query(`SELECT * FROM responses WHERE document_id = $1`, [
        docId,
      ])
    ).rows[0];
    expect(resp.visible_to_dept).toBe(true);
  });

  it("TC-02: Checker mencoba reject setelah pending -> Ditolak", async () => {
    const docId = await createDraftDoc();
    await pool.query(`SELECT sp_submit_document($1, 5)`, [docId]);
    await pool.query(`SELECT sp_checker_decide($1, 4, 'approve')`, [docId]);

    // Checker tries to reject when document is already pending
    await expect(
      pool.query(`SELECT sp_checker_decide($1, 4, 'reject')`, [docId]),
    ).rejects.toThrow();
  });

  it("TC-03: Hapus dept ber-passed_checker -> Ditolak oleh trigger", async () => {
    const docId = await createDraftDoc();
    await pool.query(`SELECT sp_submit_document($1, 5)`, [docId]);
    await pool.query(`SELECT sp_checker_decide($1, 4, 'approve')`, [docId]);

    // Department now has passed_checker = true. Delete should fail.
    await expect(
      pool.query(
        `DELETE FROM document_departments WHERE document_id = $1 AND department_id = 2`,
        [docId],
      ),
    ).rejects.toThrow(
      /Departemen yang sudah lolos Checker tidak dapat dihapus/i,
    );
  });

  it("TC-04: 3 dept: HR approved, Fin rejected, IT belum -> Tetap pending (Opsi A)", async () => {
    const docId = await createDraftDoc(5, [1, 2, 3]); // IT(1), HR(2), FIN(3)
    await pool.query(`SELECT sp_submit_document($1, 5)`, [docId]);
    await pool.query(`SELECT sp_checker_decide($1, 4, 'approve')`, [docId]);

    // HR (siti: 2) approves
    await pool.query(
      `SELECT sp_set_department_decision($1, 2, 2, 'approved'::dept_decision_t)`,
      [docId],
    );

    // Fin (dewi: 3) rejects
    const resFin = await pool.query(
      `SELECT sp_set_department_decision($1, 3, 3, 'rejected'::dept_decision_t) as status`,
      [docId],
    );

    // Status remains pending because IT (dept 1) is still NULL!
    expect(resFin.rows[0].status).toBe("pending");
    const doc = (
      await pool.query(`SELECT status FROM documents WHERE id = $1`, [docId])
    ).rows[0];
    expect(doc.status).toBe("pending");
  });

  it("TC-05: Fin mengubah keputusan, IT approved (terakhir) -> Status approved; 4 baris decision_history; notifikasi ke Applicant dan 3 Dept Manager", async () => {
    const docId = await createDraftDoc(5, [1, 2, 3]);
    await pool.query(`SELECT sp_submit_document($1, 5)`, [docId]);
    await pool.query(`SELECT sp_checker_decide($1, 4, 'approve')`, [docId]);

    // 1. HR approves
    await pool.query(
      `SELECT sp_set_department_decision($1, 2, 2, 'approved'::dept_decision_t)`,
      [docId],
    );
    // 2. Fin rejects
    await pool.query(
      `SELECT sp_set_department_decision($1, 3, 3, 'rejected'::dept_decision_t)`,
      [docId],
    );
    // 3. Fin changes decision to approved
    await pool.query(
      `SELECT sp_set_department_decision($1, 3, 3, 'approved'::dept_decision_t)`,
      [docId],
    );
    // 4. IT (budi: 1) approves (last decision)
    const finalRes = await pool.query(
      `SELECT sp_set_department_decision($1, 1, 1, 'approved'::dept_decision_t) as status`,
      [docId],
    );

    expect(finalRes.rows[0].status).toBe("approved");

    // Check decision history count: 4 entries
    const histCount = await pool.query(
      `SELECT COUNT(*) FROM decision_history WHERE document_id = $1`,
      [docId],
    );
    expect(parseInt(histCount.rows[0].count, 10)).toBe(4);

    // Final notifications should go to Applicant (5) and 3 dept managers (1, 2, 3), total 4 recipients
    const notifs = await pool.query(
      `SELECT recipient_id, event_type FROM notifications WHERE document_id = $1 AND event_type = 'final_approved'`,
      [docId],
    );
    expect(notifs.rowCount).toBe(4);
    const recipients = notifs.rows.map((r) => Number(r.recipient_id)).sort();
    expect(recipients).toEqual([1, 2, 3, 5]);
  });

  it("TC-06: Tambah dept di pending; hitung notifikasi dept_added -> Tepat satu notifikasi", async () => {
    const docId = await createDraftDoc(5, [2]); // Only HR(2)
    await pool.query(`SELECT sp_submit_document($1, 5)`, [docId]);
    await pool.query(`SELECT sp_checker_decide($1, 4, 'approve')`, [docId]);

    // HR manager (siti: 2) adds Finance dept (3)
    await pool.query(`SELECT sp_add_department($1, 3, 2)`, [docId]);

    const notifs = await pool.query(
      `SELECT * FROM notifications WHERE document_id = $1 AND event_type = 'dept_added'`,
      [docId],
    );
    expect(notifs.rowCount).toBe(1);
    expect(Number(notifs.rows[0].recipient_id)).toBe(3); // Dewi (Finance Manager)
  });

  it("TC-07: Tambah dept dan ubah keputusan setelah final -> Ditolak keduanya", async () => {
    const docId = await createDraftDoc(5, [2]);
    await pool.query(`SELECT sp_submit_document($1, 5)`, [docId]);
    await pool.query(`SELECT sp_checker_decide($1, 4, 'approve')`, [docId]);

    // HR approves -> becomes final approved immediately
    await pool.query(
      `SELECT sp_set_department_decision($1, 2, 2, 'approved'::dept_decision_t)`,
      [docId],
    );

    // 1. Try to add department after final
    await expect(
      pool.query(`SELECT sp_add_department($1, 3, 2)`, [docId]),
    ).rejects.toThrow();

    // 2. Try to change decision after final
    await expect(
      pool.query(
        `SELECT sp_set_department_decision($1, 2, 2, 'rejected'::dept_decision_t)`,
        [docId],
      ),
    ).rejects.toThrow();
  });

  it("TC-08: Dokumen 1 dept: dept memutuskan rejected -> Status rejected (final)", async () => {
    const docId = await createDraftDoc(5, [2]);
    await pool.query(`SELECT sp_submit_document($1, 5)`, [docId]);
    await pool.query(`SELECT sp_checker_decide($1, 4, 'approve')`, [docId]);

    const res = await pool.query(
      `SELECT sp_set_department_decision($1, 2, 2, 'rejected'::dept_decision_t) as status`,
      [docId],
    );
    expect(res.rows[0].status).toBe("rejected");

    const doc = (
      await pool.query(`SELECT * FROM documents WHERE id = $1`, [docId])
    ).rows[0];
    expect(doc.status).toBe("rejected");
    expect(doc.decided_at).not.toBeNull();
  });

  it("TC-09: Request revision lalu submit ulang", async () => {
    const docId = await createDraftDoc();
    await pool.query(`SELECT sp_submit_document($1, 5)`, [docId]);

    // Checker requests revision
    const revRes = await pool.query(
      `SELECT sp_checker_decide($1, 4, 'revision', 'Tolong perbaiki format') as result`,
      [docId],
    );
    expect(revRes.rows[0].result).toBe("draft");

    let doc = (
      await pool.query(`SELECT * FROM documents WHERE id = $1`, [docId])
    ).rows[0];
    expect(doc.status).toBe("draft");
    expect(doc.review_stage).toBe("applicant");

    // Notif to applicant
    const notif = (
      await pool.query(
        `SELECT * FROM notifications WHERE document_id = $1 AND event_type = 'revision_requested'`,
        [docId],
      )
    ).rows[0];
    expect(Number(notif.recipient_id)).toBe(5);

    // Applicant re-submits
    await pool.query(`SELECT sp_submit_document($1, 5)`, [docId]);
    doc = (await pool.query(`SELECT * FROM documents WHERE id = $1`, [docId]))
      .rows[0];
    expect(doc.status).toBe("draft");
    expect(doc.review_stage).toBe("checker");
  });

  it("TC-10: Delete dokumen yang pernah disubmit -> Soft delete; notifikasi draft_deleted ke Checker", async () => {
    const docId = await createDraftDoc();
    await pool.query(`SELECT sp_submit_document($1, 5)`, [docId]);

    // Delete by applicant
    await pool.query(`SELECT sp_delete_document($1, 5)`, [docId]);

    const doc = (
      await pool.query(`SELECT * FROM documents WHERE id = $1`, [docId])
    ).rows[0];
    expect(doc.deleted_at).not.toBeNull();

    const notif = (
      await pool.query(
        `SELECT * FROM notifications WHERE document_id = $1 AND event_type = 'draft_deleted'`,
        [docId],
      )
    ).rows[0];
    expect(Number(notif.recipient_id)).toBe(4); // Andi (Checker)
  });

  it("TC-11: Cancel oleh non-pemilik -> Ditolak", async () => {
    const docId = await createDraftDoc();
    await pool.query(`SELECT sp_submit_document($1, 5)`, [docId]);
    await pool.query(`SELECT sp_checker_decide($1, 4, 'approve')`, [docId]);

    // Non-owner (e.g. user 1 or user 2) tries to cancel
    await expect(
      pool.query(`SELECT sp_cancel_document($1, 2)`, [docId]),
    ).rejects.toThrow(/Hanya Applicant pemilik yang boleh cancel/i);
  });

  it("TC-12: Cancel oleh pemilik saat pending -> Status canceled; notifikasi ke Checker dan dept", async () => {
    const docId = await createDraftDoc(5, [2, 3]);
    await pool.query(`SELECT sp_submit_document($1, 5)`, [docId]);
    await pool.query(`SELECT sp_checker_decide($1, 4, 'approve')`, [docId]);

    await pool.query(`SELECT sp_cancel_document($1, 5)`, [docId]);

    const doc = (
      await pool.query(`SELECT * FROM documents WHERE id = $1`, [docId])
    ).rows[0];
    expect(doc.status).toBe("canceled");
    expect(doc.decided_at).not.toBeNull();

    const notifs = await pool.query(
      `SELECT recipient_id FROM notifications WHERE document_id = $1 AND event_type = 'canceled'`,
      [docId],
    );
    const recipients = notifs.rows.map((r) => Number(r.recipient_id)).sort();
    // Checker (4), HR Mgr (2), FIN Mgr (3)
    expect(recipients).toEqual([2, 3, 4]);
  });

  it("TC-13: Notifikasi hasil final ke Checker -> 0 notifikasi final untuk Checker", async () => {
    const docId = await createDraftDoc(5, [2]);
    await pool.query(`SELECT sp_submit_document($1, 5)`, [docId]);
    await pool.query(`SELECT sp_checker_decide($1, 4, 'approve')`, [docId]);

    await pool.query(
      `SELECT sp_set_department_decision($1, 2, 2, 'approved'::dept_decision_t)`,
      [docId],
    );

    const checkerNotifs = await pool.query(
      `SELECT * FROM notifications WHERE document_id = $1 AND recipient_id = 4 AND event_type IN ('final_approved', 'final_rejected')`,
      [docId],
    );
    expect(checkerNotifs.rowCount).toBe(0);
  });

  // --- AUTHENTICATION TESTS (TC-14 s.d. TC-26) ---

  it("TC-14: Login berhasil -> Hasil ok, counter 0, last_login_at terisi", async () => {
    const res = await pool.query(
      `SELECT sp_register_login_attempt('budi', TRUE) as result`,
    );
    expect(res.rows[0].result).toBe("ok");

    const u = (
      await pool.query(
        `SELECT failed_login_count, last_login_at FROM users WHERE username = 'budi'`,
      )
    ).rows[0];
    expect(u.failed_login_count).toBe(0);
    expect(u.last_login_at).not.toBeNull();
  });

  it("TC-15: 4 kali gagal lalu sukses -> Counter kembali 0", async () => {
    for (let i = 0; i < 4; i++) {
      const res = await pool.query(
        `SELECT sp_register_login_attempt('budi', FALSE) as result`,
      );
      expect(res.rows[0].result).toBe("failed");
    }
    const mid = (
      await pool.query(
        `SELECT failed_login_count FROM users WHERE username = 'budi'`,
      )
    ).rows[0];
    expect(mid.failed_login_count).toBe(4);

    const successRes = await pool.query(
      `SELECT sp_register_login_attempt('budi', TRUE) as result`,
    );
    expect(successRes.rows[0].result).toBe("ok");

    const end = (
      await pool.query(
        `SELECT failed_login_count FROM users WHERE username = 'budi'`,
      )
    ).rows[0];
    expect(end.failed_login_count).toBe(0);
  });

  it("TC-16: 5 kali gagal, lalu login dengan password benar -> locked, password benar tetap ditolak", async () => {
    for (let i = 0; i < 4; i++) {
      await pool.query(`SELECT sp_register_login_attempt('budi', FALSE)`);
    }
    const fifth = await pool.query(
      `SELECT sp_register_login_attempt('budi', FALSE) as result`,
    );
    expect(fifth.rows[0].result).toBe("locked");

    // Try with correct password while locked
    const correctPassRes = await pool.query(
      `SELECT sp_register_login_attempt('budi', TRUE) as result`,
    );
    expect(correctPassRes.rows[0].result).toBe("locked");
  });

  it("TC-17: Masa kunci berakhir -> Login berhasil kembali", async () => {
    // Lock the user
    for (let i = 0; i < 5; i++) {
      await pool.query(`SELECT sp_register_login_attempt('budi', FALSE)`);
    }

    // Simulate lockout expiry
    await pool.query(
      `UPDATE users SET locked_until = now() - interval '1 second' WHERE username = 'budi'`,
    );

    const res = await pool.query(
      `SELECT sp_register_login_attempt('budi', TRUE) as result`,
    );
    expect(res.rows[0].result).toBe("ok");
  });

  it("TC-18: Username tidak dikenal -> failed, tercatat unknown_user", async () => {
    const res = await pool.query(
      `SELECT sp_register_login_attempt('unknown_ghost', FALSE) as result`,
    );
    expect(res.rows[0].result).toBe("failed");

    const log = (
      await pool.query(
        `SELECT * FROM login_attempts WHERE username_input = 'unknown_ghost'`,
      )
    ).rows[0];
    expect(log.failure_reason).toBe("unknown_user");
    expect(log.user_id).toBeNull();
  });

  it("TC-19: Akun nonaktif -> Hasil inactive", async () => {
    await pool.query(
      `UPDATE users SET is_active = FALSE WHERE username = 'budi'`,
    );
    const res = await pool.query(
      `SELECT sp_register_login_attempt('budi', TRUE) as result`,
    );
    expect(res.rows[0].result).toBe("inactive");
  });

  it("TC-20: Buat sesi, validasi, logout, validasi ulang", async () => {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const sessRes = await pool.query(
      `SELECT sp_create_session(1, $1) as session_id`,
      [tokenHash],
    );
    const sessionId = sessRes.rows[0].session_id;

    // Validate
    const valid = await pool.query(
      `SELECT fn_validate_session($1) as user_id`,
      [sessionId],
    );
    expect(Number(valid.rows[0].user_id)).toBe(1);

    // Logout
    await pool.query(`SELECT sp_logout($1)`, [sessionId]);

    // Validate again -> should be NULL
    const postLogout = await pool.query(
      `SELECT fn_validate_session($1) as user_id`,
      [sessionId],
    );
    expect(postLogout.rows[0].user_id).toBeNull();
  });

  it("TC-21: Idle > 30 menit; melewati expires_at -> Keduanya NULL", async () => {
    const rawToken1 = crypto.randomBytes(32).toString("hex");
    const tokenHash1 = crypto
      .createHash("sha256")
      .update(rawToken1)
      .digest("hex");
    const s1 = (
      await pool.query(`SELECT sp_create_session(1, $1) as session_id`, [
        tokenHash1,
      ])
    ).rows[0].session_id;

    // Simulate idle > 30 minutes
    await pool.query(
      `UPDATE user_sessions SET last_seen_at = now() - interval '31 minutes' WHERE id = $1`,
      [s1],
    );
    const idleCheck = await pool.query(
      `SELECT fn_validate_session($1) as user_id`,
      [s1],
    );
    expect(idleCheck.rows[0].user_id).toBeNull();

    // Expired past 8 hours
    const rawToken2 = crypto.randomBytes(32).toString("hex");
    const tokenHash2 = crypto
      .createHash("sha256")
      .update(rawToken2)
      .digest("hex");
    const s2 = (
      await pool.query(`SELECT sp_create_session(1, $1) as session_id`, [
        tokenHash2,
      ])
    ).rows[0].session_id;
    await pool.query(
      `UPDATE user_sessions SET expires_at = now() - interval '1 second' WHERE id = $1`,
      [s2],
    );
    const expireCheck = await pool.query(
      `SELECT fn_validate_session($1) as user_id`,
      [s2],
    );
    expect(expireCheck.rows[0].user_id).toBeNull();
  });

  it("TC-22: Ganti password -> Semua sesi dicabut, hash diperbarui, must_change_password=false", async () => {
    await pool.query(
      `UPDATE users SET must_change_password = TRUE WHERE id = 1`,
    );
    const tokenHash = crypto.createHash("sha256").update("sess1").digest("hex");
    await pool.query(`SELECT sp_create_session(1, $1)`, [tokenHash]);

    const newHash = await argon2.hash("NewPassword123!", {
      type: argon2.argon2id,
    });
    await pool.query(`SELECT sp_change_password(1, $1)`, [newHash]);

    const u = (
      await pool.query(
        `SELECT password_hash, must_change_password FROM users WHERE id = 1`,
      )
    ).rows[0];
    expect(u.password_hash).toBe(newHash);
    expect(u.must_change_password).toBe(false);

    // Sesi harus revoked
    const sess = (
      await pool.query(`SELECT revoked_at FROM user_sessions WHERE user_id = 1`)
    ).rows[0];
    expect(sess.revoked_at).not.toBeNull();
  });

  it("TC-23: Sesi milik pengguna nonaktif -> Tidak valid; create session ditolak", async () => {
    await pool.query(`UPDATE users SET is_active = FALSE WHERE id = 1`);
    const tokenHash = crypto
      .createHash("sha256")
      .update("sess_inactive")
      .digest("hex");

    await expect(
      pool.query(`SELECT sp_create_session(1, $1)`, [tokenHash]),
    ).rejects.toThrow(/Pengguna tidak aktif/i);
  });

  it("TC-24: Dua token reset; pakai token lama lalu token baru dua kali -> Token lama ditolak; token baru sekali pakai; unlock; sesi dicabut", async () => {
    // 1. User is locked
    for (let i = 0; i < 5; i++) {
      await pool.query(`SELECT sp_register_login_attempt('budi', FALSE)`);
    }

    const token1Hash = crypto
      .createHash("sha256")
      .update("token1")
      .digest("hex");
    const token2Hash = crypto
      .createHash("sha256")
      .update("token2")
      .digest("hex");

    // Create token 1
    await pool.query(`SELECT sp_create_reset_token(1, $1)`, [token1Hash]);
    // Create token 2 (should invalidate token 1)
    await pool.query(`SELECT sp_create_reset_token(1, $1)`, [token2Hash]);

    const newHash = await argon2.hash("BrandNewPass123!", {
      type: argon2.argon2id,
    });

    // Try using token 1 -> should fail
    await expect(
      pool.query(`SELECT sp_reset_password($1, $2)`, [token1Hash, newHash]),
    ).rejects.toThrow();

    // Use token 2 -> should succeed
    const res = await pool.query(
      `SELECT sp_reset_password($1, $2) as user_id`,
      [token2Hash, newHash],
    );
    expect(Number(res.rows[0].user_id)).toBe(1);

    // Try using token 2 second time -> should fail (sekali pakai)
    await expect(
      pool.query(`SELECT sp_reset_password($1, $2)`, [token2Hash, newHash]),
    ).rejects.toThrow();

    // User is unlocked
    const u = (
      await pool.query(
        `SELECT failed_login_count, locked_until FROM users WHERE id = 1`,
      )
    ).rows[0];
    expect(u.failed_login_count).toBe(0);
    expect(u.locked_until).toBeNull();
  });

  it("TC-25: Token reset kedaluwarsa -> Ditolak", async () => {
    const tokenHash = crypto
      .createHash("sha256")
      .update("expired_token")
      .digest("hex");
    await pool.query(`SELECT sp_create_reset_token(1, $1)`, [tokenHash]);
    await pool.query(
      `UPDATE password_reset_tokens SET expires_at = now() - interval '1 second' WHERE token_hash = $1`,
      [tokenHash],
    );

    const newHash = await argon2.hash("NewPass123!", { type: argon2.argon2id });
    await expect(
      pool.query(`SELECT sp_reset_password($1, $2)`, [tokenHash, newHash]),
    ).rejects.toThrow(/Token reset tidak valid atau sudah kedaluwarsa/i);
  });

  it("TC-26: Username duplikat berbeda huruf besar-kecil -> Ditolak oleh unique index", async () => {
    // 'budi' already exists. Inserting 'BUDI' or 'Budi' must fail.
    const passHash = await argon2.hash("Pass123456!", {
      type: argon2.argon2id,
    });
    await expect(
      pool.query(`
        INSERT INTO users (employee_no, full_name, email, username, password_hash)
        VALUES ('EMP999', 'Budi Duplicate', 'budi_dup@test.local', 'BUDI', '${passHash}')
      `),
    ).rejects.toThrow();
  });
});
