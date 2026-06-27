import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveAdminProfile } from "@/lib/admin-auth";
import { enqueueEmailEvent } from "@/lib/email-queue";

const reviewSchema = z.object({
  decision: z.enum(["approve", "reject"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ purchaseId: string }> },
) {
  const { purchaseId } = await params;
  const requestUrl = new URL(request.url);
  const formData = await request.formData();
  const payload = reviewSchema.safeParse({
    decision: formData.get("decision"),
  });

  if (!payload.success) {
    return redirectToAdmin(requestUrl, "invalid");
  }

  const { profile, supabase } = await requireActiveAdminProfile();
  const { data: purchase } = await supabase
    .from("purchases")
    .select(
      "amount, campaign_id, currency, description, purchase_date, title",
    )
    .eq("id", purchaseId)
    .single();

  if (!purchase) {
    return redirectToAdmin(requestUrl, "missing");
  }

  if (payload.data.decision === "approve" && purchase.currency !== "USD") {
    return redirectToAdmin(requestUrl, "currency");
  }

  const update =
    payload.data.decision === "approve"
      ? {
          amount_usd: Number(purchase.amount),
          approved_at: new Date().toISOString(),
          approved_by: profile.user_id,
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
      revalidatePath(`/campanas/${campaign.slug}`);
      await notifyVerifiedDonors({
        amount: String(purchase.amount),
        campaignId: purchase.campaign_id,
        campaignSlug: campaign.slug,
        campaignTitle: campaign.title,
        currency: purchase.currency,
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

function redirectToAdmin(requestUrl: URL, status: string) {
  const redirectUrl = new URL("/admin", requestUrl);
  redirectUrl.searchParams.set("review", status);

  return NextResponse.redirect(redirectUrl, { status: 303 });
}
