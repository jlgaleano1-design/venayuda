import { NextResponse } from "next/server";
import { syncCollectionCentersFromSheet } from "@/lib/collection-centers";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return runCollectionCentersSync(request);
}

export async function POST(request: Request) {
  return runCollectionCentersSync(request);
}

async function runCollectionCentersSync(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: "Falta configurar CRON_SECRET." },
      { status: 503 },
    );
  }

  if (!isAuthorized(request, cronSecret)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  let supabase;

  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Falta configurar Supabase para sincronizar centros." },
      { status: 503 },
    );
  }

  try {
    const result = await syncCollectionCentersFromSheet({ supabase });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo sincronizar el sheet de centros de acopio.",
        ok: false,
      },
      { status: 500 },
    );
  }
}

function isAuthorized(request: Request, cronSecret: string) {
  const authorization = request.headers.get("authorization") ?? "";
  const bearerToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  const headerToken = request.headers.get("x-cron-secret");

  return bearerToken === cronSecret || headerToken === cronSecret;
}
