import { NextResponse } from "next/server";
import { enqueueEmailEvent } from "@/lib/email-queue";
import { verifyPurchaseReviewToken } from "@/lib/review-token";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ purchaseId: string }> },
) {
  const { purchaseId } = await params;
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get("token") ?? "";
  const decision = requestUrl.searchParams.get("decision") ?? "";

  if (!verifyPurchaseReviewToken(token, purchaseId)) {
    return NextResponse.json(
      { error: "Este enlace de revisión no es válido o venció." },
      { status: 403 },
    );
  }

  if (decision === "approve") {
    return reviewPurchase(requestUrl, purchaseId, "approved");
  }

  if (decision === "reject") {
    return reviewPurchase(requestUrl, purchaseId, "rejected");
  }

  return NextResponse.json({ error: "Decisión inválida." }, { status: 400 });
}

async function reviewPurchase(
  requestUrl: URL,
  purchaseId: string,
  status: "approved" | "rejected",
) {
  const supabase = createAdminClient();
  const { data: purchase } = await supabase
    .from("purchases")
    .select(
      "amount_original, amount_usd_estimated, campaign_id, currency_original, description, purchase_date, status, title",
    )
    .eq("id", purchaseId)
    .single();

  if (!purchase) {
    return NextResponse.json(
      { error: "No encontramos la compra." },
      { status: 404 },
    );
  }

  if (status === "approved" && purchase.amount_usd_estimated === null) {
    return NextResponse.json(
      {
        error: "Esta compra necesita conversión manual a USD antes de aprobarse.",
      },
      { status: 422 },
    );
  }

  const update =
    status === "approved"
      ? {
          approved_at: new Date().toISOString(),
          is_photo_public: true,
          status,
        }
      : {
          rejected_at: new Date().toISOString(),
          rejection_reason: "Rechazada desde enlace de revisión",
          status,
        };

  const { error } = await supabase
    .from("purchases")
    .update(update)
    .eq("id", purchaseId);

  if (error) {
    return NextResponse.json(
      { error: "No se pudo actualizar la compra." },
      { status: 500 },
    );
  }

  const campaign = await getCampaign(supabase, purchase.campaign_id);

  if (status === "approved" && campaign) {
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

  const redirectUrl = new URL(
    campaign ? `/campanas/${campaign.slug}` : "/",
    requestUrl,
  );
  redirectUrl.searchParams.set("purchase", status);

  return NextResponse.redirect(redirectUrl, { status: 303 });
}

async function getCampaign(
  supabase: ReturnType<typeof createAdminClient>,
  campaignId: string,
) {
  const { data } = await supabase
    .from("campaigns")
    .select("slug, title")
    .eq("id", campaignId)
    .single();

  return data;
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
        .filter(Boolean),
    ),
  );
  const siteUrl = normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ?? requestUrl.origin,
  );
  const campaignUrl = new URL(`/campanas/${campaignSlug}`, siteUrl).toString();

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
