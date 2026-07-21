import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const url = (process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "").trim();
const authToken = (process.env.TURSO_AUTH_TOKEN || "").trim();

if (!url || url.startsWith("file:")) {
  console.log("[setup-turso] Skipping — no Turso URL (local SQLite mode).");
  process.exit(0);
}

if (!authToken) {
  console.error("[setup-turso] TURSO_AUTH_TOKEN is required.");
  process.exit(1);
}

const sqlPath = join(__dirname, "..", "prisma", "turso-schema.sql");
const sql = readFileSync(sqlPath, "utf8");

const statements = sql
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && !s.startsWith("--"));

const client = createClient({ url, authToken });

console.log(`[setup-turso] Applying ${statements.length} statements to Turso...`);

for (const statement of statements) {
  try {
    await client.execute(statement);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Ignore already-exists style errors
    if (/already exists/i.test(msg)) continue;
    console.error("[setup-turso] Failed:", statement.slice(0, 80), "…");
    console.error(msg);
    process.exit(1);
  }
}

console.log("[setup-turso] Schema ready.");
