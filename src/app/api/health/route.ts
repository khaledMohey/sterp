import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveTursoConfig } from "@/lib/turso-config";
import { ensureTursoSchema } from "@/lib/ensure-schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const cfg = resolveTursoConfig();

  try {
    if (!cfg.usingAdapter) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Turso adapter مش شغال. تأكد TURSO_DATABASE_URL يبدأ بـ libsql:// و TURSO_AUTH_TOKEN صحيح (من غير علامات اقتباس).",
          debug: {
            hasRawTurso: Boolean(cfg.rawTurso),
            rawTursoPrefix: cfg.rawTurso.slice(0, 20),
            hasRawDb: Boolean(cfg.rawDb),
            rawDbPrefix: cfg.rawDb.slice(0, 20),
            resolvedUrlPrefix: cfg.url.slice(0, 30),
            hasToken: Boolean(cfg.authToken),
            usingAdapter: cfg.usingAdapter,
          },
        },
        { status: 500 }
      );
    }

    await ensureTursoSchema();
    await prisma.$queryRaw`SELECT 1`;
    const products = await prisma.product.count();

    return NextResponse.json({
      ok: true,
      db: "turso",
      usingAdapter: true,
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
          rawTursoPrefix: cfg.rawTurso.slice(0, 30),
          hasRawDb: Boolean(cfg.rawDb),
          rawDbPrefix: cfg.rawDb.slice(0, 30),
          resolvedUrlPrefix: cfg.url.slice(0, 40),
          hasToken: Boolean(cfg.authToken),
          usingAdapter: cfg.usingAdapter,
          vercel: process.env.VERCEL === "1",
        },
      },
      { status: 500 }
    );
  }
}
