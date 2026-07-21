import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function isTursoUrl(url: string) {
  return url.startsWith("libsql://") || url.startsWith("https://");
}

function resolveTursoUrl() {
  const turso = (process.env.TURSO_DATABASE_URL || "").trim();
  const databaseUrl = (process.env.DATABASE_URL || "").trim();
  if (turso && isTursoUrl(turso)) return turso;
  if (databaseUrl && isTursoUrl(databaseUrl)) return databaseUrl;
  return "";
}

function createPrismaClient() {
  const tursoUrl = resolveTursoUrl();
  const authToken = (process.env.TURSO_AUTH_TOKEN || "").trim();

  // Prefer Turso when configured (runtime on Vercel)
  if (tursoUrl && authToken) {
    const adapter = new PrismaLibSQL({
      url: tursoUrl,
      authToken,
    });
    return new PrismaClient({ adapter });
  }

  // Local / build-time fallback — never throw here (breaks `next build` on Vercel)
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export function isTursoConfigured() {
  return Boolean(resolveTursoUrl() && process.env.TURSO_AUTH_TOKEN);
}
