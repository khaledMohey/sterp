-- Ordered for Turso/SQLite (no forward FK refs)

CREATE TABLE IF NOT EXISTS "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'قطعة',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "CashAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "balance" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PurchaseInvoice_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalesInvoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "PurchaseInvoiceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "purchasePrice" REAL NOT NULL,
    "sellPrice" REAL NOT NULL,
    CONSTRAINT "PurchaseInvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PurchaseInvoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PurchaseInvoiceItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "SalesInvoiceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unitPrice" REAL NOT NULL,
    "costTotal" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "SalesInvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "SalesInvoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SalesInvoiceItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PurchaseInstallment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PurchaseInvoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalesInstallment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "SalesInvoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Batch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Batch_purchaseInvoiceItemId_fkey" FOREIGN KEY ("purchaseInvoiceItemId") REFERENCES "PurchaseInvoiceItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "SalesBatchAllocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "salesItemId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "costPrice" REAL NOT NULL,
    CONSTRAINT "SalesBatchAllocation_salesItemId_fkey" FOREIGN KEY ("salesItemId") REFERENCES "SalesInvoiceItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SalesBatchAllocation_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CashTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CashAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Product_sku_key" ON "Product"("sku");
CREATE UNIQUE INDEX IF NOT EXISTS "Batch_purchaseInvoiceItemId_key" ON "Batch"("purchaseInvoiceItemId");
CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseInvoice_number_key" ON "PurchaseInvoice"("number");
CREATE UNIQUE INDEX IF NOT EXISTS "SalesInvoice_number_key" ON "SalesInvoice"("number");
CREATE UNIQUE INDEX IF NOT EXISTS "CashAccount_name_key" ON "CashAccount"("name");
