import { NextResponse } from "next/server";
import { processEmailQueue } from "@/lib/email-queue";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return runEmailWorker(request);
}

export async function POST(request: Request) {
  return runEmailWorker(request);
}

async function runEmailWorker(request: Request) {
  const workerSecrets = [
    process.env.EMAIL_WORKER_SECRET,
    process.env.CRON_SECRET,
  ].filter(isPresent);

  if (workerSecrets.length === 0) {
    return NextResponse.json(
      { error: "Falta configurar EMAIL_WORKER_SECRET o CRON_SECRET." },
      { status: 503 },
    );
  }

  if (!isAuthorized(request, workerSecrets)) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 401 },
    );
  }

  let supabase;

  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Falta configurar Supabase para procesar la cola." },
      { status: 503 },
    );
  }

  const result = await processEmailQueue({ supabase });

  return NextResponse.json({ ok: true, ...result });
}

function isAuthorized(request: Request, workerSecrets: string[]) {
  const authorization = request.headers.get("authorization") ?? "";
  const bearerToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  const headerToken = request.headers.get("x-email-worker-secret");

  return (
    Boolean(bearerToken && workerSecrets.includes(bearerToken)) ||
    Boolean(headerToken && workerSecrets.includes(headerToken))
  );
}

function isPresent(value?: string): value is string {
  return Boolean(value);
}
