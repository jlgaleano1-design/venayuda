import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveAdminProfile } from "@/lib/admin-auth";

const reviewSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  amountUsdEstimated: z.string().optional(),
  conversionNotes: z.string().optional(),
  exchangeRateDate: z.string().optional(),
  exchangeRateSource: z.string().optional(),
  exchangeRateUsed: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ donationId: string }> },
) {
  const { donationId } = await params;
  const requestUrl = new URL(request.url);
  const formData = await request.formData();
  const payload = reviewSchema.safeParse({
    amountUsdEstimated: getFormString(formData, "amountUsdEstimated"),
    conversionNotes: getFormString(formData, "conversionNotes"),
    decision: formData.get("decision"),
    exchangeRateDate: getFormString(formData, "exchangeRateDate"),
    exchangeRateSource: getFormString(formData, "exchangeRateSource"),
    exchangeRateUsed: getFormString(formData, "exchangeRateUsed"),
  });

  if (!payload.success) {
    return redirectToAdmin(requestUrl, "invalid");
  }

  const { profile, supabase } = await requireActiveAdminProfile();
  const { data: donation } = await supabase
    .from("donations")
    .select("amount_original, amount_usd_estimated, currency_original")
    .eq("id", donationId)
    .single();

  if (!donation) {
    return redirectToAdmin(requestUrl, "missing");
  }

  const amountUsdEstimated = parseOptionalPositiveNumber(
    payload.data.amountUsdEstimated,
  );
  const exchangeRateUsed = parseOptionalPositiveNumber(
    payload.data.exchangeRateUsed,
  );

  if (
    payload.data.decision === "approve" &&
    (amountUsdEstimated === undefined || amountUsdEstimated === null)
  ) {
    return redirectToAdmin(requestUrl, "currency");
  }

  if (exchangeRateUsed === null) {
    return redirectToAdmin(requestUrl, "invalid");
  }

  const update =
    payload.data.decision === "approve"
      ? {
          amount_usd_estimated: amountUsdEstimated,
          conversion_notes: normalizeOptionalText(payload.data.conversionNotes),
          exchange_rate_date:
            normalizeOptionalText(payload.data.exchangeRateDate),
          exchange_rate_source: normalizeOptionalText(
            payload.data.exchangeRateSource,
          ),
          exchange_rate_used: exchangeRateUsed,
          status: "verified",
          verified_at: new Date().toISOString(),
          verified_by: profile.user_id,
        }
      : {
          rejected_at: new Date().toISOString(),
          rejected_by: profile.user_id,
          rejection_reason: "Rechazada desde panel admin",
          status: "rejected",
        };

  const { error } = await supabase
    .from("donations")
    .update(update)
    .eq("id", donationId);

  revalidatePath("/admin");
  return redirectToAdmin(
    requestUrl,
    error
      ? "error"
      : payload.data.decision === "approve"
        ? "donation-approved"
        : "donation-rejected",
  );
}

function redirectToAdmin(requestUrl: URL, status: string) {
  const redirectUrl = new URL("/admin", requestUrl);
  redirectUrl.searchParams.set("review", status);

  return NextResponse.redirect(redirectUrl, { status: 303 });
}

function normalizeOptionalText(value?: string) {
  const normalized = value?.trim() ?? "";

  return normalized.length > 0 ? normalized : null;
}

function parseOptionalPositiveNumber(value?: string) {
  if (!value || value.trim().length === 0) {
    return undefined;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}

function getFormString(formData: FormData, name: string) {
  const value = formData.get(name);

  return typeof value === "string" ? value : undefined;
}
