import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "";
    const hasToken = Boolean(process.env.TURSO_AUTH_TOKEN);
    await prisma.$queryRaw`SELECT 1`;
    const products = await prisma.product.count();
    return NextResponse.json({
      ok: true,
      db: url.startsWith("libsql")
        ? "turso"
        : url.startsWith("file:")
          ? "sqlite-file"
          : "unknown",
      hasToken,
      products,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        error: message,
        hasDatabaseUrl: Boolean(
          process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL
        ),
        hasToken: Boolean(process.env.TURSO_AUTH_TOKEN),
        vercel: process.env.VERCEL === "1",
      },
      { status: 500 }
    );
  }
}
