import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { resolveTursoConfig } from "./turso-config";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const { url, authToken } = resolveTursoConfig();
  const onVercel = process.env.VERCEL === "1";

  if (url && authToken) {
    const adapter = new PrismaLibSQL({ url, authToken });
    return new PrismaClient({
      adapter,
      // Prevent Prisma from using DATABASE_URL=file:./dev.db on Vercel
      datasources: {
        db: { url },
      },
    });
  }

  if (onVercel) {
    throw new Error(
      `Turso غير مضبوط. TURSO_DATABASE_URL لازم شبه: libsql://xxxx.turso.io ` +
        `(الحالي: ${url || "فاضي"}) و TURSO_AUTH_TOKEN ${authToken ? "موجود" : "ناقص"}`
    );
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export { resolveTursoConfig } from "./turso-config";
