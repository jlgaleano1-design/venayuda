import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getActiveAdminProfile } from "@/lib/admin-auth";
import { queueOrSendEmailEvent } from "@/lib/email-queue";
import { estimateUsdAmount, normalizeCurrency } from "@/lib/exchange-rates";
import {
  getPublicCampaignPath,
  getPublicCampaignUrl,
} from "@/lib/public-campaign-url";
import { createAdminClient } from "@/lib/supabase/admin";

const adminCampaignUpdateSchema = z.object({
  campaignId: z.string().uuid(),
  campaignSlug: z.string().min(1),
  purchaseId: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  amount: z.string().min(1),
  currency: z.string().min(1),
  vendor: z.string().optional(),
  photoFilePath: z.string().optional(),
  invoiceFilePath: z.string().optional(),
});

export async function POST(request: Request) {
  const { profile } = await getActiveAdminProfile();

  if (!profile) {
    return NextResponse.json(
      { error: "Necesitas entrar al panel admin." },
      { status: 401 },
    );
  }

  const payload = adminCampaignUpdateSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      { error: "Faltan datos para registrar el uso de fondos." },
      { status: 400 },
    );
  }

  const update = payload.data;
  const supabase = createAdminClient();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, slug, title")
    .eq("id", update.campaignId)
    .eq("slug", update.campaignSlug)
    .eq("status", "active")
    .maybeSingle();

  if (!campaign) {
    return NextResponse.json(
      { error: "No encontramos una campaña activa con esos datos." },
      { status: 404 },
    );
  }

  const photoFilePath = update.photoFilePath ?? "";
  const invoiceFilePath = update.invoiceFilePath ?? "";
  const numericAmount = Number(update.amount);
  const currency = normalizeCurrency(update.currency);

  if (!photoFilePath) {
    return NextResponse.json(
      { error: "La foto del uso de fondos es obligatoria." },
      { status: 400 },
    );
  }

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return NextResponse.json(
      { error: "El monto del uso de fondos no es válido." },
      { status: 400 },
    );
  }

  const usdEstimate = await estimateUsdAmount({
    amount: numericAmount,
    currency,
  });

  if ("error" in usdEstimate) {
    return NextResponse.json({ error: usdEstimate.error }, { status: 422 });
  }

  const purchaseDate = new Date().toISOString().slice(0, 10);
  const { data: purchase, error } = await supabase
    .from("purchases")
    .insert({
      ...(update.purchaseId ? { id: update.purchaseId } : {}),
      campaign_id: campaign.id,
      title: update.title,
      description: update.description || null,
      amount_original: numericAmount,
      amount_usd_estimated: usdEstimate.amount,
      conversion_notes: usdEstimate.conversionNotes,
      created_by: profile.user_id,
      currency_original: currency,
      exchange_rate_date: usdEstimate.exchangeRateDate,
      exchange_rate_source: usdEstimate.exchangeRateSource,
      exchange_rate_used: usdEstimate.exchangeRateUsed,
      invoice_file_path: invoiceFilePath || null,
      is_photo_public: true,
      photo_file_path: photoFilePath,
      purchase_date: purchaseDate,
      status: "approved",
      vendor: update.vendor || null,
      approved_at: new Date().toISOString(),
      approved_by: profile.user_id,
    })
    .select("id")
    .single();

  if (error || !purchase) {
    return NextResponse.json(
      { error: "No pudimos guardar el uso de fondos." },
      { status: 500 },
    );
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/admin/campanas/${campaign.id}`);
  revalidatePath(getPublicCampaignPath(campaign.slug));

  const impactEmailResult = await notifyVerifiedDonors({
    amount: update.amount,
    campaignId: campaign.id,
    campaignSlug: campaign.slug,
    campaignTitle: campaign.title,
    currency,
    description: update.description,
    purchaseDate,
    purchaseTitle: update.title,
    request,
    supabase,
  });

  return NextResponse.json({
    ok: true,
    impactEmailsQueued: impactEmailResult.queued,
    impactEmailsSent: impactEmailResult.sent,
    purchaseId: purchase.id,
    status: "approved",
    message: "Uso de fondos publicado.",
  });
}

function normalizeSiteUrl(value: string) {
  return value.replace(/\/+$/g, "");
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
  request,
  supabase,
}: {
  amount: string;
  campaignId: string;
  campaignSlug: string;
  campaignTitle: string;
  currency: string;
  description?: string;
  purchaseDate: string;
  purchaseTitle: string;
  request: Request;
  supabase: ReturnType<typeof createAdminClient>;
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
    process.env.NEXT_PUBLIC_SITE_URL ??
      request.headers.get("origin") ??
      "https://vendonar.org",
  );
  const campaignUrl = getPublicCampaignUrl({
    siteUrl,
    slug: campaignSlug,
  });
  const results = await Promise.allSettled(
    uniqueEmails.map((recipientEmail) =>
      queueOrSendEmailEvent(supabase, "purchase_impact", {
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

  return results.reduce(
    (summary, result) => {
      if (result.status !== "fulfilled") {
        return summary;
      }

      return {
        queued: summary.queued + (result.value.queued ? 1 : 0),
        sent: summary.sent + (result.value.sent ? 1 : 0),
      };
    },
    { queued: 0, sent: 0 },
  );
}
