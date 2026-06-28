import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getPublicCampaignPath } from "@/lib/public-campaign-url";
import { verifyDonationReviewToken } from "@/lib/review-token";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ donationId: string }> },
) {
  const { donationId } = await params;
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get("token") ?? "";
  const decision = requestUrl.searchParams.get("decision") ?? "";

  if (!verifyDonationReviewToken(token, donationId)) {
    return NextResponse.json(
      { error: "Este enlace de revisión no es válido o venció." },
      { status: 403 },
    );
  }

  if (decision === "approve") {
    return reviewDonation(requestUrl, donationId, "verified");
  }

  if (decision === "reject") {
    return reviewDonation(requestUrl, donationId, "rejected");
  }

  return NextResponse.json({ error: "Decisión inválida." }, { status: 400 });
}

async function reviewDonation(
  requestUrl: URL,
  donationId: string,
  status: "verified" | "rejected",
) {
  const supabase = createAdminClient();
  const { data: donation } = await supabase
    .from("donations")
    .select("amount_usd_estimated, campaign_id, status")
    .eq("id", donationId)
    .single();

  if (!donation) {
    return NextResponse.json(
      { error: "No encontramos la donación." },
      { status: 404 },
    );
  }

  if (status === "verified" && donation.amount_usd_estimated === null) {
    return NextResponse.json(
      {
        error:
          "Esta donación necesita conversión manual a USD antes de aprobarse.",
      },
      { status: 422 },
    );
  }

  if (donation.status === status) {
    return redirectToCampaign(requestUrl, donation.campaign_id, status);
  }

  const update =
    status === "verified"
      ? {
          status,
          verified_at: new Date().toISOString(),
        }
      : {
          rejected_at: new Date().toISOString(),
          rejection_reason: "Rechazada desde enlace de revisión",
          status,
        };

  const { error } = await supabase
    .from("donations")
    .update(update)
    .eq("id", donationId);

  if (error) {
    return NextResponse.json(
      { error: "No se pudo actualizar la donación." },
      { status: 500 },
    );
  }

  return redirectToCampaign(requestUrl, donation.campaign_id, status);
}

async function redirectToCampaign(
  requestUrl: URL,
  campaignId: string,
  status: "verified" | "rejected",
) {
  const supabase = createAdminClient();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("slug")
    .eq("id", campaignId)
    .single();
  const redirectUrl = new URL(
    campaign ? getPublicCampaignPath(campaign.slug) : "/",
    requestUrl,
  );
  redirectUrl.searchParams.set("donation", status);
  revalidatePath("/");

  if (campaign) {
    revalidatePath(getPublicCampaignPath(campaign.slug));
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}
