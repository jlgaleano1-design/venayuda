import { createHash, randomBytes } from "crypto";
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
  { params }: { params: Promise<{ campaignId: string }> },
) {
  const { campaignId } = await params;
  const requestUrl = new URL(request.url);
  const formData = await request.formData();
  const payload = reviewSchema.safeParse({
    decision: formData.get("decision"),
  });

  if (!payload.success) {
    return redirectToAdmin(requestUrl, "invalid");
  }

  const { profile, supabase } = await requireActiveAdminProfile();

  if (payload.data.decision === "reject") {
    const { error } = await supabase
      .from("campaigns")
      .update({
        reviewed_by: profile.user_id,
        status: "archived",
        verification_status: "rejected",
      })
      .eq("id", campaignId);

    revalidatePath("/admin");
    return redirectToAdmin(requestUrl, error ? "error" : "campaign-rejected");
  }

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("contact_info, id, slug, status, title")
    .eq("id", campaignId)
    .single();

  if (campaignError || !campaign) {
    return redirectToAdmin(requestUrl, "missing");
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
        reviewed_by: profile.user_id,
        status: "active",
        verification_status: "verified",
      })
      .eq("id", campaignId),
    campaign.status === "active"
      ? Promise.resolve({ error: null })
      : supabase.from("campaign_creator_access_links").insert({
          campaign_id: campaignId,
          created_by: profile.user_id,
          label: "Link privado del creador",
          recipient_contact: extractEmail(campaign.contact_info),
          token_hash: creatorAccessTokenHash,
        }),
  ]);

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath(`/campanas/${campaign.slug}`);

  const responsibleEmail = extractEmail(campaign.contact_info);

  if (!updateError && !accessError && responsibleEmail) {
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

    await enqueueEmailEvent(supabase, "campaign_approved", {
      campaignTitle: campaign.title,
      creatorAccessUrl,
      publicCampaignUrl,
      recipientEmail: responsibleEmail,
    });
  }

  return redirectToAdmin(
    requestUrl,
    updateError || accessError ? "error" : "campaign-approved",
  );
}

function extractEmail(contactInfo?: string | null) {
  return contactInfo?.match(/[^\s:]+@[^\s]+/)?.[0] ?? null;
}

function normalizeSiteUrl(value: string) {
  return value.replace(/\/+$/g, "");
}

function redirectToAdmin(requestUrl: URL, status: string) {
  const redirectUrl = new URL("/admin", requestUrl);
  redirectUrl.searchParams.set("review", status);

  return NextResponse.redirect(redirectUrl, { status: 303 });
}
