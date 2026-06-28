import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveAdminProfile } from "@/lib/admin-auth";
import { enqueueEmailEvent } from "@/lib/email-queue";
import {
  getPublicCampaignPath,
  getPublicCampaignUrl,
} from "@/lib/public-campaign-url";

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
  { params }: { params: Promise<{ purchaseId: string }> },
) {
  const { purchaseId } = await params;
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
  const { data: purchase } = await supabase
    .from("purchases")
    .select(
      "amount_original, amount_usd_estimated, campaign_id, currency_original, description, purchase_date, title",
    )
    .eq("id", purchaseId)
    .single();

  if (!purchase) {
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
          approved_at: new Date().toISOString(),
          approved_by: profile.user_id,
          conversion_notes: normalizeOptionalText(payload.data.conversionNotes),
          exchange_rate_date:
            normalizeOptionalText(payload.data.exchangeRateDate),
          exchange_rate_source: normalizeOptionalText(
            payload.data.exchangeRateSource,
          ),
          exchange_rate_used: exchangeRateUsed,
          is_photo_public: true,
          status: "approved",
        }
      : {
          rejected_at: new Date().toISOString(),
          rejected_by: profile.user_id,
          rejection_reason: "Rechazada desde panel admin",
          status: "rejected",
        };

  const { error } = await supabase
    .from("purchases")
    .update(update)
    .eq("id", purchaseId);

  revalidatePath("/admin");

  if (!error && payload.data.decision === "approve") {
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("slug, title")
      .eq("id", purchase.campaign_id)
      .single();

    if (campaign) {
      revalidatePath("/");
      revalidatePath(getPublicCampaignPath(campaign.slug));
      await notifyVerifiedDonors({
        amount: String(purchase.amount_original),
        campaignId: purchase.campaign_id,
        campaignSlug: campaign.slug,
        campaignTitle: campaign.title,
        currency: purchase.currency_original,
        description: purchase.description ?? undefined,
        purchaseDate: purchase.purchase_date,
        purchaseTitle: purchase.title,
        requestUrl,
        supabase,
      });
    }
  }

  return redirectToAdmin(
    requestUrl,
    error
      ? "error"
      : payload.data.decision === "approve"
        ? "purchase-approved"
        : "purchase-rejected",
  );
}

async function notifyVerifiedDonors({
  amount,
  campaignId,
  campaignSlug,
  campaignTitle,
  currency,
  description,
  purchaseDate,
  purchaseTitle,
  requestUrl,
  supabase,
}: {
  amount: string;
  campaignId: string;
  campaignSlug: string;
  campaignTitle: string;
  currency: string;
  description?: string;
  purchaseDate?: string | null;
  purchaseTitle: string;
  requestUrl: URL;
  supabase: Awaited<ReturnType<typeof requireActiveAdminProfile>>["supabase"];
}) {
  const { data: donors } = await supabase
    .from("donations")
    .select("donor_contact")
    .eq("status", "verified")
    .eq("campaign_id", campaignId)
    .not("donor_contact", "is", null);
  const uniqueEmails = Array.from(
    new Set(
      (donors ?? [])
        .map((donor) => String(donor.donor_contact ?? "").trim())
        .filter((contact) => contact.includes("@")),
    ),
  );
  const siteUrl = normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ?? requestUrl.origin,
  );
  const campaignUrl = getPublicCampaignUrl({
    siteUrl,
    slug: campaignSlug,
  });

  await Promise.allSettled(
    uniqueEmails.map((recipientEmail) =>
      enqueueEmailEvent(supabase, "purchase_impact", {
        amount,
        campaignTitle,
        campaignUrl,
        currency,
        description,
        purchaseDate,
        purchaseTitle,
        recipientEmail,
      }),
    ),
  );
}

function normalizeSiteUrl(value: string) {
  return value.replace(/\/+$/g, "");
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
