import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveTursoConfig } from "@/lib/turso-config";
import { ensureTursoSchema } from "@/lib/ensure-schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const cfg = resolveTursoConfig();

  // Helpful during/after deploy
  if (process.env.VERCEL === "1" && !cfg.usingAdapter) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "على Vercel: TURSO_DATABASE_URL فاضي أو مش libsql:// — أضفه في Environment Variables لكل من Production و Preview، ثم Redeploy.",
        debug: {
          hasRawTurso: Boolean(cfg.rawTurso),
          rawTursoPrefix: cfg.rawTurso.slice(0, 40),
          hasRawDb: Boolean(cfg.rawDb),
          rawDbPrefix: cfg.rawDb.slice(0, 40),
          hasToken: Boolean(cfg.authToken),
          vercelEnv: process.env.VERCEL_ENV ?? null,
        },
      },
      { status: 500 }
    );
  }

  try {
    await ensureTursoSchema();
    await prisma.$queryRaw`SELECT 1`;
    const products = await prisma.product.count();

    return NextResponse.json({
      ok: true,
      db: cfg.usingAdapter ? "turso" : "sqlite-file",
      usingAdapter: cfg.usingAdapter,
      urlPrefix: cfg.url.slice(0, 40),
      products,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        error: message,
        debug: {
          hasRawTurso: Boolean(cfg.rawTurso),
          rawTursoPrefix: cfg.rawTurso.slice(0, 40),
          hasRawDb: Boolean(cfg.rawDb),
          rawDbPrefix: cfg.rawDb.slice(0, 40),
          resolvedUrlPrefix: cfg.url.slice(0, 40),
          hasToken: Boolean(cfg.authToken),
          usingAdapter: cfg.usingAdapter,
          vercelEnv: process.env.VERCEL_ENV ?? null,
        },
      },
      { status: 500 }
    );
  }
}
