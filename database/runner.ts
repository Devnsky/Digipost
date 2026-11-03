import { Pool } from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import argon2 from "argon2";

const envPaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, "../.env"),
];
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}
dotenv.config();

const connectionString = process.env.DATABASE_URL;

export async function getDbPool(customUrl?: string) {
  const url = customUrl || connectionString;
  if (!url || url.trim() === "") {
    console.error(
      "\n❌ [FATAL DATABASE ERROR] DATABASE_URL tidak ditemukan pada environment (.env)!\n" +
        "Harap setel variabel DATABASE_URL sebelum mengeksekusi migrasi atau seeding basis data.\n",
    );
    process.exit(1);
  }
  const isSslRequired =
    process.env.DATABASE_SSL === "true" ||
    process.env.PGSSLMODE === "require" ||
    url.includes("sslmode=require") ||
    url.includes("supabase.co") ||
    url.includes("neon.tech") ||
    url.includes("rds.amazonaws.com") ||
    url.includes("aivencloud.com");

  let ssl: any = undefined;
  if (isSslRequired) {
    if (process.env.DATABASE_SSL_ALLOW_SELF_SIGNED === "true") {
      ssl = { rejectUnauthorized: false };
    } else if (process.env.DATABASE_CA_CERT) {
      ssl = { rejectUnauthorized: true, ca: process.env.DATABASE_CA_CERT };
    } else if (
      process.env.DATABASE_CA_PATH &&
      fs.existsSync(process.env.DATABASE_CA_PATH)
    ) {
      ssl = {
        rejectUnauthorized: true,
        ca: fs.readFileSync(process.env.DATABASE_CA_PATH, "utf-8"),
      };
    } else {
      ssl = { rejectUnauthorized: true };
    }
  }

  return new Pool({
    connectionString: url,
    ssl,
  });
}

export async function runMigrations(pool: Pool) {
  console.log("--- Running Migrations ---");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    const migrationsDir = path.resolve(__dirname, "migrations");
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql") && !f.startsWith("srs_reference"))
      .sort();

    // Check if initial schema is already present in DB
    const checkTable = await client.query(`
      SELECT 1 FROM information_schema.tables WHERE table_name = 'documents'
    `);
    if (checkTable.rowCount && checkTable.rowCount > 0) {
      await client.query(`
        INSERT INTO schema_migrations (filename)
        VALUES ('001_initial_schema.sql')
        ON CONFLICT (filename) DO NOTHING;
      `);
    }

    for (const file of files) {
      const res = await client.query(
        "SELECT 1 FROM schema_migrations WHERE filename = $1",
        [file],
      );
      if (res.rowCount === 0) {
        console.log(`Applying migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (filename) VALUES ($1)",
          [file],
        );
        console.log(`Applied: ${file}`);
      } else {
        console.log(`Skipping already applied: ${file}`);
      }
    }
    await client.query("COMMIT");
    console.log("--- Migrations Finished Successfully ---");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", err);
    throw err;
  } finally {
    client.release();
  }
}

export async function runSeed(pool: Pool, options?: { force?: boolean }) {
  console.log("--- Running Development Seed ---");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check if data already exists to prevent accidental data loss
    const isTest = process.env.NODE_ENV === "test";
    const force = options?.force ?? (process.argv.includes("--force") || isTest);

    const checkTable = await client.query(`
      SELECT 1 FROM information_schema.tables WHERE table_name = 'users'
    `);
    if (checkTable.rowCount && checkTable.rowCount > 0) {
      const userCountRes = await client.query("SELECT COUNT(*) FROM users");
      const userCount = parseInt(userCountRes.rows[0].count, 10);
      if (userCount > 0 && !force) {
        console.log(
          `Basis data sudah memuat ${userCount} pengguna. Seeding dilewati untuk melindungi data (gunakan flag --force untuk mereset).`,
        );
        await client.query("COMMIT");
        return;
      }
    }

    // 1. Hash common password
    const passwordHash = await argon2.hash("Password123!", {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    console.log("Seeding departments and users...");

    // Clean existing seed data safely if needed
    await client.query(
      "TRUNCATE notifications, responses, decision_history, document_departments, document_versions, approval_logs, documents, password_reset_tokens, login_attempts, user_sessions CASCADE",
    );
    await client.query(
      "ALTER TABLE departments DROP CONSTRAINT IF EXISTS fk_dept_manager",
    );
    await client.query("TRUNCATE users, departments RESTART IDENTITY CASCADE");
    await client.query(
      "ALTER TABLE departments ADD CONSTRAINT fk_dept_manager FOREIGN KEY (manager_id) REFERENCES users(id)",
    );
    await client.query(
      "ALTER SEQUENCE IF EXISTS document_number_seq RESTART WITH 1",
    );

    // Insert Departments (manager_id will be updated after users)
    const deptsResult = await client.query(`
      INSERT INTO departments (code, name, is_active) VALUES
        ('IT', 'Information Technology', TRUE),
        ('HR', 'Human Resources', TRUE),
        ('FIN', 'Finance & Accounting', TRUE),
        ('OPS', 'Operations & Logistics', TRUE),
        ('MKT', 'Marketing & Communications', TRUE)
      RETURNING id, code;
    `);

    const deptMap: Record<string, number> = {};
    for (const row of deptsResult.rows) {
      deptMap[row.code] = Number(row.id);
    }

    // Insert Top Managers
    const mgrResult = await client.query(
      `
      INSERT INTO users (employee_no, full_name, email, department_id, manager_id, role, is_active, username, password_hash, must_change_password) VALUES
        ('EMP001', 'Budi Santoso (Manager IT)', 'budi.it@digipost.local', $1, NULL, 'dept_manager', TRUE, 'budi.manager', $6, FALSE),
        ('EMP002', 'Siti Rahma (Manager HR)', 'siti.hr@digipost.local', $2, NULL, 'dept_manager', TRUE, 'siti.hr', $6, FALSE),
        ('EMP003', 'Dewi Lestari (Manager Finance)', 'dewi.fin@digipost.local', $3, NULL, 'dept_manager', TRUE, 'dewi.fin', $6, FALSE),
        ('EMP004', 'Joko Widodo (Manager Ops)', 'joko.ops@digipost.local', $4, NULL, 'dept_manager', TRUE, 'joko.ops', $6, FALSE),
        ('EMP005', 'Maya Putri (Manager Marketing)', 'maya.mkt@digipost.local', $5, NULL, 'dept_manager', TRUE, 'maya.mkt', $6, FALSE)
      RETURNING id, username;
    `,
      [
        deptMap["IT"],
        deptMap["HR"],
        deptMap["FIN"],
        deptMap["OPS"],
        deptMap["MKT"],
        passwordHash,
      ],
    );

    const userMap: Record<string, number> = {};
    for (const row of mgrResult.rows) {
      userMap[row.username] = Number(row.id);
    }

    // Update departments manager_id
    await client.query(
      "UPDATE departments SET manager_id = $1 WHERE code = $2",
      [userMap["budi.manager"], "IT"],
    );
    await client.query(
      "UPDATE departments SET manager_id = $1 WHERE code = $2",
      [userMap["siti.hr"], "HR"],
    );
    await client.query(
      "UPDATE departments SET manager_id = $1 WHERE code = $2",
      [userMap["dewi.fin"], "FIN"],
    );
    await client.query(
      "UPDATE departments SET manager_id = $1 WHERE code = $2",
      [userMap["joko.ops"], "OPS"],
    );
    await client.query(
      "UPDATE departments SET manager_id = $1 WHERE code = $2",
      [userMap["maya.mkt"], "MKT"],
    );

    // Insert Middle Managers / Checkers & Assistants
    const staffResult = await client.query(
      `
      INSERT INTO users (employee_no, full_name, email, department_id, manager_id, role, is_active, username, password_hash, must_change_password) VALUES
        ('EMP006', 'Andi Pratama (Lead / Checker IT)', 'andi.checker@digipost.local', $1, $2, 'checker', TRUE, 'andi.checker', $4, FALSE),
        ('EMP007', 'Ani Wijaya (Assistant IT)', 'ani.assistant@digipost.local', $1, NULL, 'assistant', TRUE, 'ani.assistant', $4, FALSE),
        ('EMP008', 'Rina Kartika (Assistant HR)', 'rina.assistant@digipost.local', $3, $5, 'assistant', TRUE, 'rina.assistant', $4, FALSE),
        ('EMP009', 'Rudi Pemula (New User)', 'rudi.new@digipost.local', $1, $2, 'assistant', TRUE, 'rudi.new', $4, TRUE),
        ('EMP010', 'Doni Nonaktif (Inactive User)', 'doni.off@digipost.local', $1, $2, 'assistant', FALSE, 'doni.inactive', $4, FALSE)
      RETURNING id, username;
    `,
      [
        deptMap["IT"],
        userMap["budi.manager"],
        deptMap["HR"],
        passwordHash,
        userMap["siti.hr"],
      ],
    );

    for (const row of staffResult.rows) {
      userMap[row.username] = Number(row.id);
    }

    // Set ani.assistant's manager to andi.checker
    await client.query("UPDATE users SET manager_id = $1 WHERE id = $2", [
      userMap["andi.checker"],
      userMap["ani.assistant"],
    ]);

    console.log("Seeded users and departments successfully!");

    // Create Demo Documents in different stages
    const uploadsDir = path.resolve(
      process.env.UPLOAD_DIR || "./uploads/documents",
    );
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const samplePdfPath = path.join(uploadsDir, "sample_sop.pdf");
    if (!fs.existsSync(samplePdfPath)) {
      fs.writeFileSync(
        samplePdfPath,
        "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000095 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n162\n%%EOF",
      );
    }

    // Document 1: DRAFT (Applicant)
    const docDraft = await client.query(
      `
      INSERT INTO documents (title, description, applicant_id, status, review_stage, version)
      VALUES ('SOP Pengadaan Perangkat Keras 2026', 'Pengajuan standar operasional baru untuk inventaris IT.', $1, 'draft', 'applicant', 1)
      RETURNING id;
    `,
      [userMap["ani.assistant"]],
    );
    const docDraftId = docDraft.rows[0].id;

    await client.query(
      `
      INSERT INTO document_versions (document_id, version_no, file_name, file_path, mime_type, file_size, checksum, uploaded_by)
      VALUES ($1, 1, 'Draft_SOP_Hardware.pdf', $2, 'application/pdf', 214, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', $3);
    `,
      [docDraftId, samplePdfPath, userMap["ani.assistant"]],
    );

    await client.query(
      `
      INSERT INTO document_departments (document_id, department_id, added_by)
      VALUES ($1, $2, $3), ($1, $4, $3);
    `,
      [docDraftId, deptMap["HR"], userMap["ani.assistant"], deptMap["FIN"]],
    );

    // Document 2: DRAFT-CHECKER (Menunggu Pemeriksaan Atasan)
    const docChecker = await client.query(
      `
      INSERT INTO documents (title, description, applicant_id, checker_id, status, review_stage, submitted_at, version)
      VALUES ('Kebijakan Keamanan Jaringan dan Cloud', 'Pembaruan protokol firewall dan akses VPN kantor.', $1, $2, 'draft', 'checker', now(), 2)
      RETURNING id;
    `,
      [userMap["ani.assistant"], userMap["andi.checker"]],
    );
    const docCheckerId = docChecker.rows[0].id;

    await client.query(
      `
      INSERT INTO document_versions (document_id, version_no, file_name, file_path, mime_type, file_size, checksum, uploaded_by)
      VALUES ($1, 1, 'Security_Policy_v1.pdf', $2, 'application/pdf', 214, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', $3);
    `,
      [docCheckerId, samplePdfPath, userMap["ani.assistant"]],
    );

    await client.query(
      `
      INSERT INTO document_departments (document_id, department_id, added_by)
      VALUES ($1, $2, $3), ($1, $4, $3);
    `,
      [docCheckerId, deptMap["HR"], userMap["ani.assistant"], deptMap["FIN"]],
    );

    await client.query(
      `
      INSERT INTO approval_logs (document_id, actor_id, action, from_status, to_status)
      VALUES ($1, $2, 'submit', 'draft', 'draft');
    `,
      [docCheckerId, userMap["ani.assistant"]],
    );

    await client.query(
      `
      INSERT INTO notifications (recipient_id, document_id, event_type, message)
      VALUES ($1, $2, 'submitted', 'Dokumen diajukan untuk pemeriksaan');
    `,
      [userMap["andi.checker"], docCheckerId],
    );

    // Document 3: PENDING (Sedang ditinjau oleh HR & Finance)
    const docPending = await client.query(
      `
      INSERT INTO documents (title, description, applicant_id, checker_id, status, review_stage, submitted_at, forwarded_at, version)
      VALUES ('Proposal Anggaran Pelatihan SDM Q1', 'Rincian anggaran pelatihan AI & Data Engineering.', $1, $2, 'pending', NULL, now() - interval '2 days', now() - interval '1 day', 3)
      RETURNING id;
    `,
      [userMap["ani.assistant"], userMap["andi.checker"]],
    );
    const docPendingId = docPending.rows[0].id;

    await client.query(
      `
      INSERT INTO document_versions (document_id, version_no, file_name, file_path, mime_type, file_size, checksum, uploaded_by)
      VALUES ($1, 1, 'Training_Budget_Proposal.pdf', $2, 'application/pdf', 214, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', $3);
    `,
      [docPendingId, samplePdfPath, userMap["ani.assistant"]],
    );

    await client.query(
      `
      INSERT INTO document_departments (document_id, department_id, passed_checker, decision, decided_by, decided_at, added_by)
      VALUES
        ($1, $2, TRUE, 'approved', $3, now() - interval '4 hours', $4),
        ($1, $5, TRUE, NULL, NULL, NULL, $4);
    `,
      [
        docPendingId,
        deptMap["HR"],
        userMap["siti.hr"],
        userMap["ani.assistant"],
        deptMap["FIN"],
      ],
    );

    await client.query(
      `
      INSERT INTO decision_history (document_id, department_id, old_decision, new_decision, actor_id)
      VALUES ($1, $2, NULL, 'approved', $3);
    `,
      [docPendingId, deptMap["HR"], userMap["siti.hr"]],
    );

    await client.query(
      `
      INSERT INTO responses (document_id, author_id, author_role, department_id, type, body, visible_to_dept)
      VALUES
        ($1, $2, 'checker', NULL, 'comment', 'Dokumen sudah sesuai, mohon ditinjau HR dan Finance.', TRUE),
        ($1, $3, 'dept_manager', $4, 'comment', 'Departemen HR menyetujui program pelatihan ini.', TRUE);
    `,
      [
        docPendingId,
        userMap["andi.checker"],
        userMap["siti.hr"],
        deptMap["HR"],
      ],
    );

    await client.query(
      `
      INSERT INTO approval_logs (document_id, actor_id, action, from_status, to_status)
      VALUES
        ($1, $2, 'submit', 'draft', 'draft'),
        ($1, $3, 'checker_approve', 'draft', 'pending');
    `,
      [docPendingId, userMap["ani.assistant"], userMap["andi.checker"]],
    );

    await client.query(
      `
      INSERT INTO notifications (recipient_id, document_id, event_type, message)
      VALUES ($1, $2, 'forwarded', 'Dokumen diteruskan untuk persetujuan departemen Finance');
    `,
      [userMap["dewi.fin"], docPendingId],
    );

    // Document 4: APPROVED (Final)
    const docApproved = await client.query(
      `
      INSERT INTO documents (title, description, applicant_id, checker_id, status, review_stage, submitted_at, forwarded_at, version)
      VALUES ('Peremajaan Lisensi Perangkat Lunak 2026', 'Lisensi operating system dan developer tooling.', $1, $2, 'pending', NULL, now() - interval '5 days', now() - interval '4 days', 3)
      RETURNING id;
    `,
      [userMap["ani.assistant"], userMap["andi.checker"]],
    );
    const docApprovedId = docApproved.rows[0].id;

    await client.query(
      `
      INSERT INTO document_versions (document_id, version_no, file_name, file_path, mime_type, file_size, checksum, uploaded_by)
      VALUES ($1, 1, 'Software_Licenses_2026.pdf', $2, 'application/pdf', 214, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', $3);
    `,
      [docApprovedId, samplePdfPath, userMap["ani.assistant"]],
    );

    await client.query(
      `
      INSERT INTO document_departments (document_id, department_id, passed_checker, decision, decided_by, decided_at, added_by)
      VALUES
        ($1, $2, TRUE, 'approved', $3, now() - interval '2 days', $4),
        ($1, $5, TRUE, 'approved', $6, now() - interval '1 day', $4);
    `,
      [
        docApprovedId,
        deptMap["HR"],
        userMap["siti.hr"],
        userMap["ani.assistant"],
        deptMap["FIN"],
        userMap["dewi.fin"],
      ],
    );

    await client.query(
      `
      INSERT INTO decision_history (document_id, department_id, old_decision, new_decision, actor_id)
      VALUES
        ($1, $2, NULL, 'approved', $3),
        ($1, $4, NULL, 'approved', $5);
    `,
      [
        docApprovedId,
        deptMap["HR"],
        userMap["siti.hr"],
        deptMap["FIN"],
        userMap["dewi.fin"],
      ],
    );

    await client.query(
      `
      UPDATE documents
      SET status = 'approved', decided_at = now() - interval '1 day', version = 4
      WHERE id = $1;
    `,
      [docApprovedId],
    );

    await client.query(
      `
      INSERT INTO approval_logs (document_id, actor_id, action, from_status, to_status, note)
      VALUES ($1, NULL, 'aggregate', 'pending', 'approved', 'Semua departemen telah memutuskan');
    `,
      [docApprovedId],
    );

    // Document 5: REJECTED (Final)
    const docRejected = await client.query(
      `
      INSERT INTO documents (title, description, applicant_id, checker_id, status, review_stage, submitted_at, forwarded_at, version)
      VALUES ('Pengadaan Drone Patroli Gudang', 'Pengajuan pengadaan unit drone untuk keamanan gudang logistik.', $1, $2, 'pending', NULL, now() - interval '6 days', now() - interval '5 days', 3)
      RETURNING id;
    `,
      [userMap["ani.assistant"], userMap["andi.checker"]],
    );
    const docRejectedId = docRejected.rows[0].id;

    await client.query(
      `
      INSERT INTO document_versions (document_id, version_no, file_name, file_path, mime_type, file_size, checksum, uploaded_by)
      VALUES ($1, 1, 'Drone_Warehouse_Proposal.pdf', $2, 'application/pdf', 214, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', $3);
    `,
      [docRejectedId, samplePdfPath, userMap["ani.assistant"]],
    );

    await client.query(
      `
      INSERT INTO document_departments (document_id, department_id, passed_checker, decision, decided_by, decided_at, added_by)
      VALUES
        ($1, $2, TRUE, 'approved', $3, now() - interval '3 days', $4),
        ($1, $5, TRUE, 'rejected', $6, now() - interval '2 days', $4);
    `,
      [
        docRejectedId,
        deptMap["OPS"],
        userMap["joko.ops"],
        userMap["ani.assistant"],
        deptMap["FIN"],
        userMap["dewi.fin"],
      ],
    );

    await client.query(
      `
      INSERT INTO decision_history (document_id, department_id, old_decision, new_decision, actor_id)
      VALUES
        ($1, $2, NULL, 'approved', $3),
        ($1, $4, NULL, 'rejected', $5);
    `,
      [
        docRejectedId,
        deptMap["OPS"],
        userMap["joko.ops"],
        deptMap["FIN"],
        userMap["dewi.fin"],
      ],
    );

    await client.query(
      `
      UPDATE documents
      SET status = 'rejected', decided_at = now() - interval '2 days', version = 4
      WHERE id = $1;
    `,
      [docRejectedId],
    );

    await client.query(
      `
      INSERT INTO approval_logs (document_id, actor_id, action, from_status, to_status, note)
      VALUES ($1, NULL, 'aggregate', 'pending', 'rejected', 'Semua departemen telah memutuskan');
    `,
      [docRejectedId],
    );

    // Document 6: CANCELED (Final)
    const docCanceled = await client.query(
      `
      INSERT INTO documents (title, description, applicant_id, checker_id, status, review_stage, submitted_at, forwarded_at, version)
      VALUES ('Renovasi Ruang Server Tambahan', 'Rencana penambahan rak rackmount server.', $1, $2, 'pending', NULL, now() - interval '7 days', now() - interval '6 days', 2)
      RETURNING id;
    `,
      [userMap["ani.assistant"], userMap["andi.checker"]],
    );
    const docCanceledId = docCanceled.rows[0].id;

    await client.query(
      `
      INSERT INTO document_versions (document_id, version_no, file_name, file_path, mime_type, file_size, checksum, uploaded_by)
      VALUES ($1, 1, 'Server_Rack_Plan.pdf', $2, 'application/pdf', 214, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', $3);
    `,
      [docCanceledId, samplePdfPath, userMap["ani.assistant"]],
    );

    await client.query(
      `
      INSERT INTO document_departments (document_id, department_id, passed_checker, decision, added_by)
      VALUES ($1, $2, TRUE, NULL, $3);
    `,
      [docCanceledId, deptMap["OPS"], userMap["ani.assistant"]],
    );

    await client.query(
      `
      UPDATE documents
      SET status = 'canceled', decided_at = now() - interval '4 days', version = 3
      WHERE id = $1;
    `,
      [docCanceledId],
    );

    await client.query(
      `
      INSERT INTO approval_logs (document_id, actor_id, action, from_status, to_status)
      VALUES ($1, $2, 'cancel', 'pending', 'canceled');
    `,
      [docCanceledId, userMap["ani.assistant"]],
    );

    await client.query("COMMIT");
    console.log("--- Seed Completed Successfully! ---");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seed failed:", err);
    throw err;
  } finally {
    client.release();
  }
}

// CLI runner
async function main() {
  const cmd = process.argv[2];
  const pool = await getDbPool();
  try {
    if (cmd === "migrate") {
      await runMigrations(pool);
    } else if (cmd === "seed") {
      await runSeed(pool);
    } else {
      console.log("Usage: tsx database/runner.ts [migrate|seed] [--force]");
    }
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
