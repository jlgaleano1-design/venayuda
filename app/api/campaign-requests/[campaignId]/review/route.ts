import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { enqueueEmailEvent } from "@/lib/email-queue";
import { verifyCampaignReviewToken } from "@/lib/review-token";
import { createAdminClient } from "@/lib/supabase/admin";

const reviewSchema = z.object({
  decision: z.enum(["approve", "reject"]),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  const { campaignId } = await params;
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get("token") ?? "";
  const decision = requestUrl.searchParams.get("decision") ?? "approve";

  if (!verifyCampaignReviewToken(token, campaignId)) {
    return NextResponse.json(
      { error: "Este enlace de confirmación no es válido o venció." },
      { status: 403 },
    );
  }

  if (decision !== "approve") {
    return redirectBack(requestUrl, campaignId, "invalid");
  }

  return approveCampaign(requestUrl, campaignId);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  const { campaignId } = await params;
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get("token") ?? "";

  if (!verifyCampaignReviewToken(token, campaignId)) {
    return NextResponse.json(
      { error: "Este enlace de confirmación no es válido o venció." },
      { status: 403 },
    );
  }

  const formData = await request.formData();
  const payload = reviewSchema.safeParse({
    decision: formData.get("decision"),
  });

  if (!payload.success) {
    return NextResponse.json(
      { error: "Decisión inválida." },
      { status: 400 },
    );
  }

  if (payload.data.decision === "reject") {
    return rejectCampaign(requestUrl, campaignId);
  }

  return approveCampaign(requestUrl, campaignId);
}

async function approveCampaign(requestUrl: URL, campaignId: string) {
  const supabase = createAdminClient();
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id, contact_info, slug, status, title")
    .eq("id", campaignId)
    .single();

  if (campaignError || !campaign) {
    return NextResponse.json(
      { error: "No encontramos la solicitud." },
      { status: 404 },
    );
  }

  if (campaign.status === "active") {
    return redirectToCampaign(requestUrl, campaign.slug, "published");
  }

  const creatorAccessToken = randomBytes(32).toString("base64url");
  const creatorAccessTokenHash = createHash("sha256")
    .update(creatorAccessToken)
    .digest("hex");

  const [{ error: updateError }, { error: accessError }] = await Promise.all([
    supabase
      .from("campaigns")
      .update({
        published_at: new Date().toISOString(),
        status: "active",
        verification_status: "verified",
      })
      .eq("id", campaignId),
    supabase.from("campaign_creator_access_links").insert({
      campaign_id: campaignId,
      label: "Link privado del creador",
      recipient_contact: extractEmail(campaign.contact_info),
      token_hash: creatorAccessTokenHash,
    }),
  ]);

  if (updateError || accessError) {
    return NextResponse.json(
      { error: "No se pudo publicar la campaña." },
      { status: 500 },
    );
  }

  const siteUrl = normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ?? requestUrl.origin,
  );
  const publicCampaignUrl = new URL(
    `/campanas/${campaign.slug}`,
    siteUrl,
  ).toString();
  const creatorAccessUrl = new URL(
    `/creador/${creatorAccessToken}`,
    siteUrl,
  ).toString();
  const responsibleEmail = extractEmail(campaign.contact_info);

  if (responsibleEmail) {
    try {
      await enqueueEmailEvent(supabase, "campaign_approved", {
        campaignTitle: campaign.title,
        creatorAccessUrl,
        publicCampaignUrl,
        recipientEmail: responsibleEmail,
      });
    } catch {
      // Publishing should remain valid even if email delivery needs retrying.
    }
  }

  return redirectToCampaign(requestUrl, campaign.slug, "published");
}

async function rejectCampaign(requestUrl: URL, campaignId: string) {
  const supabase = createAdminClient();
  await supabase
    .from("campaigns")
    .update({
      status: "archived",
      verification_status: "rejected",
    })
    .eq("id", campaignId);

  return redirectBack(requestUrl, campaignId, "rejected");
}

function extractEmail(contactInfo?: string | null) {
  return contactInfo?.match(/[^\s:]+@[^\s]+/)?.[0] ?? null;
}

function normalizeSiteUrl(value: string) {
  return value.replace(/\/+$/g, "");
}

function redirectBack(requestUrl: URL, campaignId: string, status: string) {
  const redirectUrl = new URL(`/revisar/campana/${campaignId}`, requestUrl);
  redirectUrl.searchParams.set("status", status);
  const token = requestUrl.searchParams.get("token");

  if (token) {
    redirectUrl.searchParams.set("token", token);
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}

function redirectToCampaign(requestUrl: URL, slug: string, status: string) {
  const redirectUrl = new URL(`/campanas/${slug}`, requestUrl);
  redirectUrl.searchParams.set("status", status);

  return NextResponse.redirect(redirectUrl, { status: 303 });
}
