import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { Pool } from "pg";
import { beforeAll, afterAll } from "vitest";
import { runMigrations } from "../database/runner";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

export const testUploadDir = path.resolve(__dirname, "../uploads/test-tmp");
process.env.UPLOAD_DIR = testUploadDir;

const rawTestDbUrl =
  process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

if (!rawTestDbUrl || rawTestDbUrl.trim() === "") {
  console.error(
    "\n❌ [FATAL TEST CONFIG ERROR] TEST_DATABASE_URL atau DATABASE_URL wajib disetel di .env untuk menjalankan tes integrasi!\n",
  );
  throw new Error(
    "TEST_DATABASE_URL atau DATABASE_URL wajib disetel di .env untuk menjalankan tes integrasi!",
  );
}

export const testDatabaseUrl: string = rawTestDbUrl.trim();

export const testPool = new Pool({
  connectionString: testDatabaseUrl,
});

beforeAll(async () => {
  if (!fs.existsSync(testUploadDir)) {
    fs.mkdirSync(testUploadDir, { recursive: true });
  }
  // Ensure schema is up to date on test database
  await runMigrations(testPool);
});

afterAll(async () => {
  await testPool.end();
  if (fs.existsSync(testUploadDir)) {
    fs.rmSync(testUploadDir, { recursive: true, force: true });
  }
});
