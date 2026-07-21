import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'قطعة',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "CashAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "balance" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "PurchaseInvoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" TEXT NOT NULL DEFAULT 'cash',
    "subtotal" REAL NOT NULL DEFAULT 0,
    "interestRate" REAL NOT NULL DEFAULT 0,
    "interestAmount" REAL NOT NULL DEFAULT 0,
    "downPayment" REAL NOT NULL DEFAULT 0,
    "installmentCount" INTEGER NOT NULL DEFAULT 0,
    "total" REAL NOT NULL,
    "paid" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "SalesInvoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" TEXT NOT NULL DEFAULT 'cash',
    "subtotal" REAL NOT NULL DEFAULT 0,
    "interestRate" REAL NOT NULL DEFAULT 0,
    "interestAmount" REAL NOT NULL DEFAULT 0,
    "downPayment" REAL NOT NULL DEFAULT 0,
    "installmentCount" INTEGER NOT NULL DEFAULT 0,
    "total" REAL NOT NULL,
    "costTotal" REAL NOT NULL DEFAULT 0,
    "paid" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "PurchaseInvoiceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "purchasePrice" REAL NOT NULL,
    "sellPrice" REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS "SalesInvoiceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unitPrice" REAL NOT NULL,
    "costTotal" REAL NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS "PurchaseInstallment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "paidAmount" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "SalesInstallment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "paidAmount" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "Batch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "remainingQty" REAL NOT NULL,
    "purchasePrice" REAL NOT NULL,
    "sellPrice" REAL NOT NULL,
    "purchaseDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purchaseInvoiceItemId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "SalesBatchAllocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "salesItemId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "costPrice" REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS "CashTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "notes" TEXT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Product_sku_key" ON "Product"("sku");
CREATE UNIQUE INDEX IF NOT EXISTS "Batch_purchaseInvoiceItemId_key" ON "Batch"("purchaseInvoiceItemId");
CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseInvoice_number_key" ON "PurchaseInvoice"("number");
CREATE UNIQUE INDEX IF NOT EXISTS "SalesInvoice_number_key" ON "SalesInvoice"("number");
CREATE UNIQUE INDEX IF NOT EXISTS "CashAccount_name_key" ON "CashAccount"("name");
`;

function resolveTurso() {
  const turso = (process.env.TURSO_DATABASE_URL || "").trim();
  const db = (process.env.DATABASE_URL || "").trim();
  const url =
    turso.startsWith("libsql://") || turso.startsWith("https://")
      ? turso
      : db.startsWith("libsql://") || db.startsWith("https://")
        ? db
        : "";
  const authToken = (process.env.TURSO_AUTH_TOKEN || "").trim();
  return { url, authToken };
}

const globalForSchema = globalThis as unknown as {
  tursoSchemaReady?: boolean;
  tursoSchemaPromise?: Promise<void>;
};

export async function ensureTursoSchema() {
  if (globalForSchema.tursoSchemaReady) return;
  if (globalForSchema.tursoSchemaPromise) {
    await globalForSchema.tursoSchemaPromise;
    return;
  }

  globalForSchema.tursoSchemaPromise = (async () => {
    const { url, authToken } = resolveTurso();
    if (!url || !authToken) return;

    const client = createClient({ url, authToken });

    try {
      await client.execute("SELECT 1 FROM Product LIMIT 1");
      globalForSchema.tursoSchemaReady = true;
      return;
    } catch {
      // table missing — apply schema
    }

    const statements = SCHEMA_SQL.split(";")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const statement of statements) {
      try {
        await client.execute(statement);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/already exists/i.test(msg)) continue;
        throw err;
      }
    }

    globalForSchema.tursoSchemaReady = true;
  })();

  try {
    await globalForSchema.tursoSchemaPromise;
  } finally {
    globalForSchema.tursoSchemaPromise = undefined;
  }
}

/** Optional local helper for CLI script */
export function readSchemaFile() {
  return readFileSync(join(process.cwd(), "prisma", "turso-schema.sql"), "utf8");
}
