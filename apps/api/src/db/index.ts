import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import fs from "fs";
import { config } from "../config";

const isSslRequired =
  process.env.DATABASE_SSL === "true" ||
  process.env.PGSSLMODE === "require" ||
  config.databaseUrl.includes("sslmode=require") ||
  config.databaseUrl.includes("supabase.co") ||
  config.databaseUrl.includes("neon.tech") ||
  config.databaseUrl.includes("rds.amazonaws.com") ||
  config.databaseUrl.includes("aivencloud.com");

function getSslConfig() {
  if (!isSslRequired) return undefined;
  if (process.env.DATABASE_SSL_ALLOW_SELF_SIGNED === "true") {
    return { rejectUnauthorized: false };
  }
  if (process.env.DATABASE_CA_CERT) {
    return {
      rejectUnauthorized: true,
      ca: process.env.DATABASE_CA_CERT,
    };
  }
  if (
    process.env.DATABASE_CA_PATH &&
    fs.existsSync(process.env.DATABASE_CA_PATH)
  ) {
    return {
      rejectUnauthorized: true,
      ca: fs.readFileSync(process.env.DATABASE_CA_PATH, "utf-8"),
    };
  }
  return { rejectUnauthorized: true };
}

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: getSslConfig(),
});

// Prevent idle client drop or backend network partition from crashing the Node.js process
pool.on("error", (err) => {
  console.error("[PostgreSQL Pool Error]: Unexpected idle client error", err);
});

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[],
): Promise<QueryResult<T>> {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (config.env === "development" && duration > 500) {
    console.warn(`[Slow Query ${duration}ms] ${text.slice(0, 100)}`);
  }
  return res;
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackErr) {
      console.error(
        "[Database Transaction Error] Rollback failed:",
        rollbackErr,
      );
    }
    throw err;
  } finally {
    client.release();
  }
}
