import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCreatorAccessRecord } from "@/lib/creator-access";
import { enqueueEmailEvent } from "@/lib/email-queue";
import { estimateUsdAmount, normalizeCurrency } from "@/lib/exchange-rates";
import {
  getPublicCampaignPath,
  getPublicCampaignUrl,
} from "@/lib/public-campaign-url";
import { createAdminClient } from "@/lib/supabase/admin";

const creatorUpdateSchema = z.object({
  campaignSlug: z.string().min(1),
  accessCode: z.string().min(1),
  purchaseId: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  amount: z.string().min(1),
  currency: z.string().min(1),
  vendor: z.string().optional(),
  photoFileName: z.string().optional(),
  photoFilePath: z.string().optional(),
  invoiceFileName: z.string().optional(),
  invoiceFilePath: z.string().optional(),
});

export async function POST(request: Request) {
  const payload = creatorUpdateSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      { error: "Faltan datos para registrar la novedad." },
      { status: 400 },
    );
  }

  const update = payload.data;
  let accessRecord: Awaited<ReturnType<typeof getCreatorAccessRecord>>;

  try {
    accessRecord = await getCreatorAccessRecord(update.accessCode);
  } catch {
    return NextResponse.json(
      {
        error:
          "No pudimos recibir la novedad en este momento. Inténtalo de nuevo en unos minutos.",
      },
      { status: 503 },
    );
  }

  if (!accessRecord || accessRecord.campaign.slug !== update.campaignSlug) {
    return NextResponse.json(
      { error: "Este enlace no tiene acceso a la campaña." },
      { status: 403 },
    );
  }

  const supabase = createAdminClient();
  const photoFilePath = update.photoFilePath ?? update.photoFileName ?? "";
  const invoiceFilePath = update.invoiceFilePath ?? update.invoiceFileName ?? "";
  const numericAmount = Number(update.amount);
  const currency = normalizeCurrency(update.currency);

  if (!photoFilePath) {
    return NextResponse.json(
      { error: "La foto de la compra es obligatoria." },
      { status: 400 },
    );
  }

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return NextResponse.json(
      { error: "El monto de la compra no es válido." },
      { status: 400 },
    );
  }

  const usdEstimate = await estimateUsdAmount({
    amount: numericAmount,
    currency,
  });

  if ("error" in usdEstimate) {
    return NextResponse.json(
      { error: usdEstimate.error },
      { status: 422 },
    );
  }

  const purchaseDate = new Date().toISOString().slice(0, 10);
  const { data: purchase, error } = await supabase
    .from("purchases")
    .insert({
      ...(update.purchaseId ? { id: update.purchaseId } : {}),
      campaign_id: accessRecord.campaign.id,
      title: update.title,
      description: update.description || null,
      amount_original: numericAmount,
      amount_usd_estimated: usdEstimate.amount,
      conversion_notes: usdEstimate.conversionNotes,
      currency_original: currency,
      exchange_rate_date: usdEstimate.exchangeRateDate,
      exchange_rate_source: usdEstimate.exchangeRateSource,
      exchange_rate_used: usdEstimate.exchangeRateUsed,
      is_photo_public: true,
      purchase_date: purchaseDate,
      vendor: update.vendor || null,
      photo_file_path: photoFilePath,
      invoice_file_path: invoiceFilePath || null,
      submitted_by_creator_access_id: accessRecord.id,
      approved_at: new Date().toISOString(),
      status: "approved",
    })
    .select("id")
    .single();

  if (error || !purchase) {
    return NextResponse.json(
      { error: "No pudimos guardar la novedad." },
      { status: 500 },
    );
  }

  revalidatePath("/");
  revalidatePath(getPublicCampaignPath(accessRecord.campaign.slug));
  const impactEmailsQueued = await notifyVerifiedDonors({
    amount: update.amount,
    campaignId: accessRecord.campaign.id,
    campaignSlug: accessRecord.campaign.slug,
    campaignTitle: accessRecord.campaign.title,
    currency,
    description: update.description,
    purchaseDate,
    purchaseTitle: update.title,
    request,
    supabase,
  });

  return NextResponse.json({
    ok: true,
    impactEmailsQueued,
    purchaseId: purchase.id,
    status: "approved",
    message: "Novedad publicada en la campaña.",
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
      "https://vendonar.com",
  );
  const campaignUrl = getPublicCampaignUrl({
    siteUrl,
    slug: campaignSlug,
  });
  const results = await Promise.allSettled(
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

  return results.filter((result) => result.status === "fulfilled").length;
}
