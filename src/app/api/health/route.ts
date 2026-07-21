import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureTursoSchema } from "@/lib/ensure-schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const tursoUrl = (process.env.TURSO_DATABASE_URL || "").trim();
    const databaseUrl = (process.env.DATABASE_URL || "").trim();
    const hasToken = Boolean(process.env.TURSO_AUTH_TOKEN);

    await ensureTursoSchema();
    await prisma.$queryRaw`SELECT 1`;
    const products = await prisma.product.count();

    return NextResponse.json({
      ok: true,
      db: tursoUrl.startsWith("libsql")
        ? "turso"
        : databaseUrl.startsWith("file:")
          ? "sqlite-file"
          : "unknown",
      hasTursoUrl: Boolean(tursoUrl),
      hasToken,
      products,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        error: message,
        hasTursoUrl: Boolean(process.env.TURSO_DATABASE_URL),
        hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
        hasToken: Boolean(process.env.TURSO_AUTH_TOKEN),
        vercel: process.env.VERCEL === "1",
      },
      { status: 500 }
    );
  }
}
