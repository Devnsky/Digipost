import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Load .env from workspace root or current directory
const envPaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, "../../../../.env"),
  path.resolve(__dirname, "../../../.env"),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}
dotenv.config();

const env = process.env.NODE_ENV || "development";

// Helper for fatal configuration exit
function fatalConfigError(message: string): never {
  console.error(`\n❌ [FATAL CONFIG ERROR] ${message}\n`);
  if (env === "test") {
    throw new Error(message);
  }
  process.exit(1);
}

// 1. Validasi DATABASE_URL (Wajib untuk semua environment)
const rawDatabaseUrl =
  env === "test"
    ? process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
    : process.env.DATABASE_URL;

if (!rawDatabaseUrl || rawDatabaseUrl.trim() === "") {
  fatalConfigError(
    `${env === "test" ? "TEST_DATABASE_URL atau DATABASE_URL" : "DATABASE_URL"} wajib disetel pada environment (.env) dan tidak boleh kosong!`
  );
}
const databaseUrl: string = rawDatabaseUrl.trim();

// 2. Validasi COOKIE_SECRET (Wajib untuk semua environment)
const rawCookieSecret = process.env.COOKIE_SECRET;
if (!rawCookieSecret || rawCookieSecret.trim() === "") {
  fatalConfigError(
    "COOKIE_SECRET wajib disetel pada environment (.env) dan tidak boleh kosong!"
  );
}
const cookieSecret: string = rawCookieSecret.trim();

if (env === "production" && cookieSecret.length < 32) {
  fatalConfigError(
    "COOKIE_SECRET wajib memiliki panjang minimal 32 karakter pada lingkungan production demi keamanan enkripsi cookie!"
  );
}

// 3. Validasi FRONTEND_URL
let frontendUrl = process.env.FRONTEND_URL;
if (!frontendUrl || frontendUrl.trim() === "") {
  if (env === "production") {
    fatalConfigError(
      "FRONTEND_URL wajib disetel pada lingkungan production demi membatasi akses CORS!"
    );
  }
  frontendUrl = "http://localhost:5173";
}

export const config = {
  env,
  port: parseInt(process.env.PORT || "4000", 10),
  frontendUrl,
  databaseUrl,
  uploadDir: path.resolve(process.env.UPLOAD_DIR || "./uploads/documents"),
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || "25", 10),
  cookieSecret,
  sessionCookieName: process.env.SESSION_COOKIE_NAME || "digipost_session",
  sessionIdleMinutes: parseInt(process.env.SESSION_IDLE_MINUTES || "30", 10),
  sessionMaxHours: parseInt(process.env.SESSION_MAX_HOURS || "8", 10),
  smtp: {
    host: process.env.SMTP_HOST || "localhost",
    port: parseInt(process.env.SMTP_PORT || "1025", 10),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.EMAIL_FROM || "noreply@digipost.local",
  },
};
