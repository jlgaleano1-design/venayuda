import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const engagementEventSchema = z.object({
  eventType: z.enum(["campaign_view", "payment_method_copy"]),
  locale: z.enum(["es", "en"]).optional(),
  path: z.string().max(300).optional(),
  paymentMethodId: z.string().uuid().optional(),
  referrer: z.string().max(500).optional(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
}).refine(
  (event) =>
    event.eventType !== "payment_method_copy" || Boolean(event.paymentMethodId),
  {
    message: "El método de pago es obligatorio para este evento.",
    path: ["paymentMethodId"],
  },
);

export async function POST(request: Request) {
  const payload = engagementEventSchema.safeParse(await readRequestJson(request));

  if (!payload.success) {
    return NextResponse.json(
      { error: "Evento inválido." },
      { status: 400 },
    );
  }

  let supabase: ReturnType<typeof createAdminClient>;

  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "No pudimos registrar la actividad." },
      { status: 503 },
    );
  }

  const event = payload.data;
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id")
    .eq("slug", event.slug)
    .in("status", ["active", "paused", "completed"])
    .maybeSingle<{ id: string }>();

  if (!campaign) {
    return NextResponse.json({ ok: true });
  }

  if (event.paymentMethodId) {
    const { data: paymentMethod } = await supabase
      .from("campaign_payment_methods")
      .select("id")
      .eq("id", event.paymentMethodId)
      .eq("campaign_id", campaign.id)
      .eq("is_active", true)
      .maybeSingle<{ id: string }>();

    if (!paymentMethod) {
      return NextResponse.json({ ok: true });
    }
  }

  const { error } = await supabase.from("campaign_engagement_events").insert({
    campaign_id: campaign.id,
    daily_visitor_hash: createDailyVisitorHash(request, campaign.id),
    event_type: event.eventType,
    locale: event.locale ?? null,
    path: normalizePath(event.path),
    payment_method_id: event.paymentMethodId ?? null,
    referrer_host: getReferrerHost(event.referrer),
  });

  if (error && error.code !== "23505") {
    return NextResponse.json(
      { error: "No pudimos registrar la actividad." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

async function readRequestJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function createDailyVisitorHash(request: Request, campaignId: string) {
  const visitorSource = [
    getRequestIp(request),
    request.headers.get("user-agent") ?? "",
    campaignId,
    new Date().toISOString().slice(0, 10),
    process.env.CAMPAIGN_REVIEW_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
  ].join("|");

  return createHash("sha256").update(visitorSource).digest("hex");
}

function getRequestIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

function getReferrerHost(referrer?: string) {
  if (!referrer) {
    return null;
  }

  try {
    return new URL(referrer).host.slice(0, 120);
  } catch {
    return null;
  }
}

function normalizePath(path?: string) {
  if (!path || !path.startsWith("/")) {
    return null;
  }

  return path.slice(0, 300);
}
