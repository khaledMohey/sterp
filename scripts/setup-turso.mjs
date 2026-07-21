import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const url = (process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "").trim();
const authToken = (process.env.TURSO_AUTH_TOKEN || "").trim();

if (!url || url.startsWith("file:")) {
  console.log("[setup-turso] Skip — local SQLite.");
  process.exit(0);
}

if (!authToken) {
  console.warn("[setup-turso] TURSO_AUTH_TOKEN missing — skip (will create tables at runtime).");
  process.exit(0);
}

const sqlPath = join(__dirname, "..", "prisma", "turso-schema.sql");
const sql = readFileSync(sqlPath, "utf8");
const statements = sql
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && !s.startsWith("--"));

try {
  const client = createClient({ url, authToken });
  console.log(`[setup-turso] Applying ${statements.length} statements...`);
  for (const statement of statements) {
    try {
      await client.execute(statement);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/already exists/i.test(msg)) continue;
      throw err;
    }
  }
  console.log("[setup-turso] Done.");
} catch (err) {
  // Never fail CI/build hard — runtime ensure handles it
  console.warn("[setup-turso] Warning:", err instanceof Error ? err.message : err);
  process.exit(0);
}
